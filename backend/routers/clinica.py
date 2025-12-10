from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import database, models, schemas, security
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/clinica", tags=["Módulo C: Operación Clínica"])

# --- SCHEMAS ---
class SoapDetail(BaseModel):
    subjetivo: str
    objetivo: str
    analisis: str
    plan: str
    signos_vitales: Dict[str, Any]

class AppointmentFullDetail(BaseModel):
    id: int
    fecha_hora: datetime
    motivo: str
    estado: str
    doctor_nombre: str
    nota_medica: Optional[SoapDetail] = None 
    receta: Optional[str] = None

class ConsultaInput(BaseModel):
    subjetivo: str
    objetivo: str
    analisis: str
    plan: str
    signos_vitales: Dict[str, Any]
    receta_texto: Optional[str] = ""
    finalizar: bool = True

class AppointmentAgendaResponse(BaseModel):
    id: int
    fecha_hora: datetime
    motivo: str
    estado: str
    patient_id: int
    doctor_id: int
    patient_name: str
    duracion_minutos: int = 60

# --- CITAS ---
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
    if not paciente: raise HTTPException(404, "Paciente no encontrado")

    nueva_cita = models.Appointment(
        tenant_id=current_user.tenant_id,
        patient_id=cita.patient_id,
        doctor_id=cita.doctor_id,
        fecha_hora=cita.fecha_hora,
        motivo=cita.motivo,
        estado="Agendada"
    )
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    return nueva_cita

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

# --- NUEVO: CANCELAR CITA ---
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

# --- AGENDA GLOBAL (CON AUTOCURACIÓN) ---
@router.get("/agenda", response_model=List[AppointmentAgendaResponse])
def ver_agenda_global(
    start_date: str,
    end_date: str, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except: raise HTTPException(400, "Formato inválido")

    # LOGICA DE LIMPIEZA: Marcar como "No asistió" si pasaron 4 horas y sigue Agendada
    limite_tiempo = datetime.now() - timedelta(hours=4)
    
    # Actualizar citas viejas
    db.query(models.Appointment).filter(
        models.Appointment.tenant_id == current_user.tenant_id,
        models.Appointment.estado == "Agendada",
        models.Appointment.fecha_hora < limite_tiempo,
        models.Appointment.deleted_at == None
    ).update({models.Appointment.estado: "No asistió"}, synchronize_session=False)
    
    db.commit()

    # Obtener agenda actualizada
    citas = db.query(models.Appointment).options(joinedload(models.Appointment.paciente)).filter(
        models.Appointment.tenant_id == current_user.tenant_id,
        models.Appointment.fecha_hora >= start,
        models.Appointment.fecha_hora <= end,
        models.Appointment.deleted_at == None
    ).all()
    
    resultado = []
    for c in citas:
        nombre = "Desconocido"
        if c.paciente:
            nombre = f"{c.paciente.nombre} {c.paciente.apellidos}"
            
        resultado.append(AppointmentAgendaResponse(
            id=c.id,
            fecha_hora=c.fecha_hora,
            motivo=c.motivo,
            estado=c.estado,
            patient_id=c.patient_id,
            doctor_id=c.doctor_id,
            patient_name=nombre,
            duracion_minutos=c.duracion_minutos
        ))
    
    return resultado

# --- GUARDAR CONSULTA ---
@router.post("/citas/{appointment_id}/nota-soap")
def guardar_consulta_completa(
    appointment_id: int,
    datos: ConsultaInput,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not cita: raise HTTPException(404, "No encontrada")

    soap_json = json.dumps({"subjetivo": datos.subjetivo, "objetivo": datos.objetivo, "analisis": datos.analisis, "plan": datos.plan})
    signos_json = json.dumps(datos.signos_vitales)

    existing_note = db.query(models.ClinicalNote).filter(models.ClinicalNote.appointment_id == appointment_id).first()
    
    if existing_note:
        existing_note.soap_data = soap_json
        existing_note.signos_vitales = signos_json
    else:
        db.add(models.ClinicalNote(appointment_id=appointment_id, soap_data=soap_json, signos_vitales=signos_json))
    
    if datos.receta_texto is not None:
        receta_db = db.query(models.Prescription).filter(models.Prescription.appointment_id == appointment_id).first()
        if receta_db:
            receta_db.texto_medicamentos = datos.receta_texto
        else:
            if len(datos.receta_texto.strip()) > 0:
                db.add(models.Prescription(appointment_id=appointment_id, texto_medicamentos=datos.receta_texto))

    if datos.finalizar:
        cita.estado = "Finalizada"
    else:
        if cita.estado == "Agendada":
            cita.estado = "En proceso"

    db.commit()
    return {"mensaje": "Guardado"}

# --- VER DETALLE ---
@router.get("/citas/{appointment_id}/completa", response_model=AppointmentFullDetail)
def ver_detalle_cita_completo(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not cita: raise HTTPException(404, "No encontrada")

    doctor = db.query(models.User).filter(models.User.id == cita.doctor_id).first()
    doc_name = doctor.nombre_completo if doctor else "Desconocido"

    nota_obj = None
    if cita.clinical_record:
        try:
            soap_dict = json.loads(cita.clinical_record.soap_data)
            signos_dict = json.loads(cita.clinical_record.signos_vitales)
            nota_obj = SoapDetail(
                subjetivo=soap_dict.get("subjetivo", ""),
                objetivo=soap_dict.get("objetivo", ""),
                analisis=soap_dict.get("analisis", ""),
                plan=soap_dict.get("plan", ""),
                signos_vitales=signos_dict
            )
        except: pass

    receta_db = db.query(models.Prescription).filter(models.Prescription.appointment_id == cita.id).first()
    texto_receta = receta_db.texto_medicamentos if receta_db else None

    return {
        "id": cita.id,
        "fecha_hora": cita.fecha_hora,
        "motivo": cita.motivo,
        "estado": cita.estado,
        "doctor_nombre": doc_name,
        "nota_medica": nota_obj,
        "receta": texto_receta
    }

# --- OTROS ---
@router.post("/pacientes/{patient_id}/odontograma")
def actualizar_odontograma(
    patient_id: int,
    chart: schemas.DentalChartCreate,
    appointment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    for item in chart.cambios:
        db.add(models.DentalChart(patient_id=patient_id, diente=item.diente, cara=item.cara, estado=item.estado, appointment_id=appointment_id))
    db.commit()
    return {"mensaje": "Odontograma actualizado"}

@router.get("/citas/{appointment_id}/datos-impresion")
def obtener_datos_impresion(
    appointment_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not cita: raise HTTPException(404, "Cita no encontrada")

    doctor = db.query(models.User).filter(models.User.id == cita.doctor_id).first()
    clinica = db.query(models.Tenant).filter(models.Tenant.id == cita.tenant_id).first()
    paciente = db.query(models.Patient).filter(models.Patient.id == cita.patient_id).first()

    return {
        "doctor": {
            "nombre": doctor.nombre_completo if doctor else "Dr.",
            "cedula": getattr(doctor, 'cedula_profesional', ''),
            "universidad": getattr(doctor, 'universidad', ''),
            "especialidad": getattr(doctor, 'especialidad', '')
        },
        "clinica": {
            "nombre": clinica.nombre_comercial if clinica else "",
            "direccion": getattr(clinica, 'direccion_fiscal', ''),
            "telefono": getattr(clinica, 'telefono_contacto', '')
        },
        "paciente": {
            "nombre": f"{paciente.nombre} {paciente.apellidos}" if paciente else "",
            "id": paciente.id if paciente else 0
        }
    }