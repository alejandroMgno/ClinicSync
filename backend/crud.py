from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
import json

# --- CRUD DE PACIENTES ---

def get_patients(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Patient).filter(models.Patient.tenant_id == tenant_id).offset(skip).limit(limit).all()

def create_patient(db: Session, patient: schemas.PatientCreate, tenant_id: int):
    # Convertimos el diccionario de datos_personales a string para SQLite
    datos_json = json.dumps(patient.datos_personales) if patient.datos_personales else "{}"
    
    db_patient = models.Patient(
        tenant_id=tenant_id,
        nombre=patient.nombre,
        apellidos=patient.apellidos,
        fecha_nacimiento=patient.fecha_nacimiento,
        sexo=patient.sexo,
        telefono_movil=patient.telefono_movil,
        email=patient.email,
        ocupacion=patient.ocupacion,
        datos_personales=datos_json,
        saldo_actual=0.0
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

# --- CRUD DE CITAS ---

def create_appointment(db: Session, appointment: schemas.AppointmentCreate, tenant_id: int):
    db_appointment = models.Appointment(
        tenant_id=tenant_id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        fecha_hora=appointment.fecha_hora,
        motivo=appointment.motivo,
        duracion_minutos=appointment.duracion_minutos,
        estado="Pendiente"
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def get_appointments(db: Session, tenant_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Appointment).filter(models.Appointment.tenant_id == tenant_id).order_by(models.Appointment.fecha_hora.asc()).offset(skip).limit(limit).all()