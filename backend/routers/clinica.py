from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import database, models, schemas, security
import json
from datetime import datetime, timedelta

router = APIRouter(prefix="/clinica", tags=["Módulo C: Operación Clínica"])

# --- SCHEMAS INTERNOS O REUTILIZADOS ---
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

class AppointmentAgendaResponse(BaseModel):
    id: int
    fecha_hora: datetime
    motivo: str
    estado: str
    patient_id: int
    doctor_id: int
    patient_name: str
    duracion_minutos: int = 60 

# --- ENDPOINTS DE CITAS ---

@router.get("/agenda", response_model=List[AppointmentAgendaResponse])
def obtener_agenda(
    start_date: str, 
    end_date: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Obtiene las citas en un rango de fechas.
    Formato esperado fecha: YYYY-MM-DD
    """
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) 
    except ValueError:
        raise HTTPException(400, "Formato de fecha inválido. Use YYYY-MM-DD")

    # USO CORRECTO 1: 'models.Appointment' (Clase) y 'models.Appointment.paciente' (Relación)
    citas = db.query(models.Appointment).filter(
        models.Appointment.tenant_id == current_user.tenant_id,
        models.Appointment.fecha_hora >= start,
        models.Appointment.fecha_hora < end
    ).options(joinedload(models.Appointment.paciente)).all()

    resultado = []
    for c in citas:
        nombre_paciente = "Desconocido"
        # USO CORRECTO 2: 'c.paciente' (Acceso al objeto relacionado)
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
    # 1. Validar paciente
    # USO CORRECTO 3: 'models.Patient' (Clase con P mayúscula para buscar en la tabla)
    paciente = db.query(models.Patient).filter(
        models.Patient.id == cita.patient_id,
        models.Patient.tenant_id == current_user.tenant_id
    ).first()
    
    if not paciente: 
        raise HTTPException(404, "Paciente no encontrado")

    # 2. Crear la cita
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