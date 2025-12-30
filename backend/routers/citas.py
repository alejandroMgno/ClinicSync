from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import database, schemas, crud, models, security

router = APIRouter(
    prefix="/citas",
    tags=["Agenda y Citas"]
)
class EstadoUpdate(BaseModel):
    estado: str

# --- RUTAS PROTEGIDAS ---

@router.post("/", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED)
def agendar_cita(
    cita: schemas.AppointmentCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user) # <--- EL GUARDIA
):
    """
    Agenda una cita vinculada a la clínica del usuario actual.
    """
    # 1. Validar que el paciente existe Y pertenece a MI clínica
    # (No queremos agendar cita a un paciente de la competencia)
    paciente = db.query(models.Patient).filter(
        models.Patient.id == cita.patient_id,
        models.Patient.tenant_id == current_user.tenant_id
    ).first()
    
    if not paciente:
        raise HTTPException(
            status_code=404, 
            detail="Paciente no encontrado en esta clínica."
        )

    # 2. Crear la cita inyectando el tenant_id
    db_appointment = models.Appointment(
        tenant_id=current_user.tenant_id, # <--- ¡AQUÍ ESTÁ LA CLAVE SAAS!
        patient_id=cita.patient_id,
        doctor_id=cita.doctor_id,
        fecha_hora=cita.fecha_hora,
        motivo=cita.motivo,
        estado="Pendiente"
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
    current_user: models.User = Depends(security.get_current_user) # <--- EL GUARDIA
):
    """
    Ver solo las citas de MI clínica.
    """
    return db.query(models.Appointment).filter(
        models.Appointment.tenant_id == current_user.tenant_id
    ).order_by(models.Appointment.fecha_hora.asc()).offset(skip).limit(limit).all()

@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_cita(
    appointment_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Cancelar cita. Solo Admin puede borrar, Staff solo podría cambiar estado (lógica futura).
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar citas.")

    # Buscar la cita asegurando que sea de MI clínica
    cita = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.tenant_id == current_user.tenant_id
    ).first()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    db.delete(cita)
    db.commit()
    return None

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