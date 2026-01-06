from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas, security

# Definimos el router.
# IMPORTANTE: Al incluir esto en main.py, el prefix ya suele ser "/citas" o "/api/citas".
# Asegúrate que aquí definimos el prefijo base si no lo haces en main.
router = APIRouter(
    prefix="/citas",
    tags=["Agenda y Citas"]
)

# --- RUTA QUE TE FALTABA (SOLUCIÓN AL ERROR 404) ---
@router.get("/paciente/{patient_id}", response_model=List[schemas.AppointmentResponse])
def ver_citas_paciente(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Obtiene todas las citas de un paciente específico (ID 1, por ejemplo).
    Ruta final esperada: GET /citas/paciente/1
    """
    # 1. Validar que el paciente existe en este tenant
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.tenant_id == current_user.tenant_id
    ).first()

    if not paciente:
        # Nota: Si el paciente no existe, devolvemos 404 pero con mensaje en ESPAÑOL
        raise HTTPException(status_code=404, detail="Paciente no encontrado en esta clínica")

    # 2. Buscar sus citas
    citas = db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id,
        models.Appointment.tenant_id == current_user.tenant_id
    ).order_by(models.Appointment.fecha_hora.desc()).all()
    
    return citas

# --- RESTO DE TUS RUTAS (YA EXISTENTES) ---

@router.post("/", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED)
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
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    db_appointment = models.Appointment(
        tenant_id=current_user.tenant_id,
        patient_id=cita.patient_id,
        doctor_id=cita.doctor_id,
        fecha_hora=cita.fecha_hora,
        motivo=cita.motivo,
        duracion_minutos=cita.duracion_minutos, # Aseguramos pasar este campo
        estado="programada" # Corregido a minúsculas para consistencia
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

@router.get("/", response_model=List[schemas.AppointmentResponse])
def ver_agenda(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return db.query(models.Appointment).filter(
        models.Appointment.tenant_id == current_user.tenant_id
    ).order_by(models.Appointment.fecha_hora.asc()).offset(skip).limit(limit).all()

@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_cita(
    appointment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.tenant_id == current_user.tenant_id
    ).first()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    db.delete(cita)
    db.commit()
    return None

class EstadoUpdate(schemas.BaseModel): # Usamos schemas.BaseModel o pydantic.BaseModel
    estado: str

@router.put("/{cita_id}/status")
def actualizar_estado_cita(
    cita_id: int,
    obj: EstadoUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    cita = db.query(models.Appointment).filter(
        models.Appointment.id == cita_id,
        models.Appointment.tenant_id == current_user.tenant_id
    ).first()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    cita.estado = obj.estado
    db.commit()
    return {"status": "updated", "nuevo_estado": cita.estado}