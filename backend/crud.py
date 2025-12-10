from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas

def get_patient_by_email(db: Session, email: str) -> Optional[models.Patient]:
    """
    Busca un paciente por su correo electrónico.
    Útil para validar duplicados antes de crear.
    """
    return db.query(models.Patient).filter(models.Patient.email == email).first()

def get_patient_by_id(db: Session, patient_id: int) -> Optional[models.Patient]:
    """
    Busca un paciente por su ID primario.
    Retorna None si no existe.
    """
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

def get_patients(db: Session, skip: int = 0, limit: int = 100) -> List[models.Patient]:
    """
    Obtiene una lista paginada de pacientes.
    Skip: Cuántos saltar (offset)
    Limit: Máximo a traer
    """
    return db.query(models.Patient).offset(skip).limit(limit).all()

def create_patient(db: Session, patient: schemas.PatientCreate) -> models.Patient:
    """
    Crea un nuevo registro de paciente en la base de datos.
    """
    db_patient = models.Patient(
        nombre_completo=patient.nombre_completo,
        telefono=patient.telefono,
        email=patient.email,
        direccion=patient.direccion,
        historia_clinica_data="{}" # Se inicializa vacío
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


# --- CRUD DE CITAS ---

def create_appointment(db: Session, appointment: schemas.AppointmentCreate):
    db_appointment = models.Appointment(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        fecha_hora=appointment.fecha_hora,
        motivo=appointment.motivo,
        estado="Pendiente" # Estado inicial por defecto
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def get_appointments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Appointment).order_by(models.Appointment.fecha_hora.asc()).offset(skip).limit(limit).all()