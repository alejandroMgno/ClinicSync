from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import database, models, schemas, security
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/clinica", tags=["Módulo C: Operación Clínica"])

# --- SCHEMAS (MODELOS DE DATOS) ---

# 1. Schemas para Agenda (Tu código original)
class AppointmentAgendaResponse(BaseModel):
    id: int
    fecha_hora: datetime
    motivo: str
    estado: str
    patient_id: int
    doctor_id: int
    patient_name: str
    duracion_minutos: int = 60 

# 2. Schemas para Consulta Activa (NUEVOS)
class SoapDetail(BaseModel):
    subjetivo: str
    objetivo: str
    analisis: str
    plan: str

class ConsultationInput(BaseModel):
    subjetivo: str
    objetivo: str
    analisis: str
    plan: str
    signos_vitales: Dict[str, Any]
    receta_texto: str
    finalizar: bool
    nuevos_archivos: List[Dict[str, Any]] = [] # Lista de archivos en Base64

# --- ENDPOINTS EXISTENTES (AGENDA) ---

@router.get("/agenda", response_model=List[AppointmentAgendaResponse])
def obtener_agenda(
    start_date: str, 
    end_date: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) 
    except ValueError:
        raise HTTPException(400, "Formato de fecha inválido. Use YYYY-MM-DD")

    citas = db.query(models.Appointment).filter(
        models.Appointment.tenant_id == current_user.tenant_id,
        models.Appointment.fecha_hora >= start,
        models.Appointment.fecha_hora < end
    ).options(joinedload(models.Appointment.paciente)).all()

    resultado = []
    for c in citas:
        nombre_paciente = "Desconocido"
        if c.paciente:
            nombre_paciente = f"{c.paciente.nombre} {c.paciente.apellidos}"
        
        resultado.append({
            "id": c.id,
            "fecha_hora": c.fecha_hora,
            "motivo": c.motivo,
            "estado": c.estado,
            "patient_id": c.patient_id,
            "doctor_id": c.doctor_id,
            "patient_name": nombre_paciente,
            "duracion_minutos": c.duracion_minutos if c.duracion_minutos else 60
        })
    return resultado

@router.post("/citas", response_model=schemas.AppointmentResponse)
def agendar_cita(
    cita: schemas.AppointmentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    paciente = db.query(models.Patient).filter(
        models.Patient.id == cita.patient_id,
        models.Patient.tenant_id == current_user.tenant_id
    ).first()
    
    if not paciente: 
        raise HTTPException(404, "Paciente no encontrado")

    nueva_cita = models.Appointment(
        tenant_id=current_user.tenant_id,
        patient_id=cita.patient_id,
        doctor_id=cita.doctor_id,
        fecha_hora=cita.fecha_hora,
        motivo=cita.motivo,
        duracion_minutos=cita.duracion_minutos,
        estado="Agendada"
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    return nueva_cita

# --- ENDPOINTS NUEVOS (PARA CONSULTATION.JSX) ---

@router.get("/citas/{cita_id}/datos-impresion")
def obtener_datos_impresion(
    cita_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Obtiene los datos formateados para el encabezado de la receta médica.
    """
    cita = db.query(models.Appointment).filter(models.Appointment.id == cita_id).first()
    if not cita: raise HTTPException(404, "Cita no encontrada")
    
    doctor = db.query(models.User).filter(models.User.id == cita.doctor_id).first()
    paciente = db.query(models.Patient).filter(models.Patient.id == cita.patient_id).first()
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()

    return {
        "doctor": {
            "nombre": doctor.nombre_completo if doctor else "Dr. No Asignado",
            "cedula": doctor.cedula_profesional if doctor else "",
            "universidad": doctor.universidad if doctor else "",
            "especialidad": doctor.especialidad if doctor else ""
        },
        "clinica": {
            "nombre": tenant.nombre_comercial if tenant else "Clínica",
            "direccion": tenant.direccion_fiscal if tenant else "",
            "telefono": tenant.telefono_contacto if tenant else ""
        },
        "paciente": {
            "nombre": f"{paciente.nombre} {paciente.apellidos}" if paciente else "Desconocido",
            "id": paciente.id if paciente else 0
        }
    }

@router.get("/citas/{cita_id}/completa")
def obtener_consulta_completa(
    cita_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Carga el estado actual de la consulta (Nota SOAP, Receta, Archivos)
    para poder continuar donde se dejó.
    """
    nota = db.query(models.ClinicalNote).filter(models.ClinicalNote.appointment_id == cita_id).first()
    receta = db.query(models.Prescription).filter(models.Prescription.appointment_id == cita_id).first()
    archivos = db.query(models.AppointmentFile).filter(models.AppointmentFile.appointment_id == cita_id).all()
    
    soap_data = { "subjetivo": "", "objetivo": "", "analisis": "", "plan": "" }
    
    if nota and nota.soap_data:
        try:
            soap_data = json.loads(nota.soap_data)
        except:
            pass # Si falla el parseo, enviamos vacio

    return {
        "nota_medica": soap_data,
        "receta": receta.texto_medicamentos if receta else "",
        "archivos": [{"id": f.id, "nombre": f.nombre_archivo, "url": f.url_archivo} for f in archivos]
    }

@router.post("/citas/{cita_id}/nota-soap")
def guardar_progreso_soap(
    cita_id: int,
    data: ConsultationInput,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Guarda o actualiza la nota médica, la receta y sube archivos nuevos.
    Si finalizar=True, cambia el estado de la cita.
    """
    
    # 1. Guardar/Actualizar Nota SOAP
    nota = db.query(models.ClinicalNote).filter(models.ClinicalNote.appointment_id == cita_id).first()
    
    soap_json = json.dumps({
        "subjetivo": data.subjetivo,
        "objetivo": data.objetivo,
        "analisis": data.analisis,
        "plan": data.plan
    })
    
    signos_json = json.dumps(data.signos_vitales)

    if nota:
        nota.soap_data = soap_json
        nota.signos_vitales = signos_json
    else:
        new_nota = models.ClinicalNote(
            appointment_id=cita_id,
            soap_data=soap_json,
            signos_vitales=signos_json
        )
        db.add(new_nota)

    # 2. Guardar Receta
    receta = db.query(models.Prescription).filter(models.Prescription.appointment_id == cita_id).first()
    if receta:
        receta.texto_medicamentos = data.receta_texto
    else:
        new_receta = models.Prescription(appointment_id=cita_id, texto_medicamentos=data.receta_texto)
        db.add(new_receta)

    # 3. Guardar Archivos (Imágenes)
    # Nota: Aquí guardamos la metadata. En un entorno real, guardarías el base64 en disco o S3.
    # Para este ejemplo, simulamos guardar la URL apuntando a un endpoint de archivos.
    for archivo in data.nuevos_archivos:
        # Aquí deberías decodificar el base64 y guardar el archivo físico
        # archivo['data'] contiene el string base64
        
        nuevo_archivo = models.AppointmentFile(
            appointment_id=cita_id,
            nombre_archivo=archivo['nombre'],
            tipo_mime=archivo['tipo'],
            url_archivo="http://placehold.it/200x200" # Placeholder, aquí iría la URL real tras guardar
        )
        db.add(nuevo_archivo)

    # 4. Finalizar Cita
    if data.finalizar:
        cita = db.query(models.Appointment).filter(models.Appointment.id == cita_id).first()
        if cita:
            cita.estado = "Finalizada"

    db.commit()
    return {"status": "success"}

# --- UTILERÍAS DE ESTADO (TU CÓDIGO ORIGINAL) ---

@router.put("/citas/{appointment_id}/iniciar")
def iniciar_consulta(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not cita: raise HTTPException(404, "Cita no encontrada")
    cita.estado = "En proceso" 
    db.commit()
    return {"mensaje": "Consulta iniciada", "estado": "En proceso"}

@router.put("/citas/{appointment_id}/cancelar")
def cancelar_cita(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not cita: raise HTTPException(404, "Cita no encontrada")
    
    cita.estado = "Cancelada"
    db.commit()
    return {"mensaje": "Cita cancelada"}
@router.get("/pacientes/{patient_id}/historial-clinico-completo")
def historial_clinico_completo(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Este endpoint une Citas + Notas + Recetas en un solo listado 
    para el historial del paciente.
    """
    return db.query(models.Appointment).options(
        joinedload(models.Appointment.clinical_record),
        joinedload(models.Appointment.clinical_record)
    ).filter(
        models.Appointment.patient_id == patient_id,
        models.Appointment.estado == "Finalizada"
    ).order_by(models.Appointment.fecha_hora.desc()).all()