from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String, func
from typing import List, Optional
import database, models, schemas, security
import json
from datetime import datetime

router = APIRouter(prefix="/pacientes", tags=["Módulo B: Pacientes"])

# --- 1. CREAR PACIENTE ---
@router.post("/", response_model=schemas.PatientResponse)
def crear_paciente(
    paciente: schemas.PatientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    datos_json = json.dumps(paciente.datos_personales)
    nuevo = models.Patient(
        tenant_id=current_user.tenant_id,
        nombre=paciente.nombre,
        apellidos=paciente.apellidos,
        fecha_nacimiento=paciente.fecha_nacimiento,
        sexo=paciente.sexo,
        telefono_movil=paciente.telefono_movil,
        email=paciente.email,
        ocupacion=paciente.ocupacion,
        datos_personales=datos_json
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

# --- 2. BUSCADOR INTELIGENTE (MOVIDO AQUÍ PARA EVITAR CONFLICTO CON ID) ---
@router.get("/search", response_model=List[schemas.PatientResponse])
def buscar_paciente_rapido(
    query: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # Si no hay query, devolvemos lista vacía
    if not query or len(query.strip()) == 0:
        return [] 
    
    # Dividimos la búsqueda en palabras para buscar coincidencias parciales
    # Ejemplo: "Iker Alejandro" -> ["Iker", "Alejandro"]
    terminos = query.strip().split()
    
    filtros_and = []
    
    for termino in terminos:
        term = f"%{termino}%"
        # Cada palabra debe estar presente en al menos uno de estos campos
        # Usamos func.lower() para ignorar mayúsculas/minúsculas
        filtro_palabra = or_(
            func.lower(models.Patient.nombre).like(func.lower(term)),
            func.lower(models.Patient.apellidos).like(func.lower(term)),
            func.lower(models.Patient.email).like(func.lower(term)),
            models.Patient.telefono_movil.like(term),
            cast(models.Patient.id, String).like(term)
        )
        filtros_and.append(filtro_palabra)

    # Combinamos todos los filtros con AND
    return db.query(models.Patient).filter(
        models.Patient.tenant_id == current_user.tenant_id,
        models.Patient.deleted_at == None,
        and_(*filtros_and) 
    ).limit(10).all()

# --- 3. LISTAR ---
@router.get("/", response_model=List[schemas.PatientResponse])
def listar_pacientes(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return db.query(models.Patient).filter(
        models.Patient.tenant_id == current_user.tenant_id,
        models.Patient.deleted_at == None
    ).all()

# --- 4. OBTENER UNO (Ruta Dinámica) ---
@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def obtener_paciente(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.tenant_id == current_user.tenant_id,
        models.Patient.deleted_at == None
    ).first()
    if not paciente: raise HTTPException(404, "No encontrado")
    return paciente

# --- 5. ACTUALIZAR ---
@router.put("/{patient_id}", response_model=schemas.PatientResponse)
def actualizar_paciente(
    patient_id: int,
    datos: schemas.PatientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.tenant_id == current_user.tenant_id,
        models.Patient.deleted_at == None
    ).first()
    if not paciente: raise HTTPException(404, "No encontrado")

    paciente.nombre = datos.nombre
    paciente.apellidos = datos.apellidos
    paciente.telefono_movil = datos.telefono_movil
    paciente.email = datos.email
    paciente.fecha_nacimiento = datos.fecha_nacimiento
    paciente.sexo = datos.sexo
    paciente.ocupacion = datos.ocupacion
    paciente.datos_personales = json.dumps(datos.datos_personales)

    db.commit()
    db.refresh(paciente)
    return paciente

# --- 6. ELIMINAR ---
@router.delete("/{patient_id}", status_code=204)
def eliminar_paciente(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.tenant_id == current_user.tenant_id
    ).first()
    if not paciente: raise HTTPException(404, "No encontrado")
    
    paciente.deleted_at = datetime.now()
    db.commit()
    return None

# --- 7. HISTORIAL CITAS ---
@router.get("/{patient_id}/citas", response_model=List[schemas.AppointmentResponse])
def ver_historial_citas(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    paciente = db.query(models.Patient).filter(
        models.Patient.id == patient_id,
        models.Patient.tenant_id == current_user.tenant_id
    ).first()
    
    if not paciente: return []

    return db.query(models.Appointment).filter(
        models.Appointment.patient_id == patient_id,
        models.Appointment.deleted_at == None
    ).order_by(models.Appointment.fecha_hora.desc()).all()

# --- 8. HISTORIA CLÍNICA (NOM-004) ---
class HistoryItemResponse(schemas.BaseModel):
    id: int
    tipo: str
    clave: str
    valor: str
    observaciones: Optional[str] = None
    class Config:
        from_attributes = True

@router.get("/{patient_id}/historia-nom", response_model=List[HistoryItemResponse])
def ver_historia_clinica(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    return db.query(models.PatientMedicalHistory).filter(
        models.PatientMedicalHistory.patient_id == patient_id
    ).all()

@router.post("/{patient_id}/historia-nom")
def agregar_o_actualizar_antecedente(
    patient_id: int,
    item: schemas.PatientHistoryCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    paciente = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not paciente: raise HTTPException(404, "Paciente no encontrado")

    existente = db.query(models.PatientMedicalHistory).filter(
        models.PatientMedicalHistory.patient_id == patient_id,
        models.PatientMedicalHistory.clave == item.clave
    ).first()

    if existente:
        existente.valor = item.valor
        existente.tipo = item.tipo
        existente.observaciones = item.observaciones
        db.commit()
        return {"mensaje": "Actualizado"}
    else:
        nuevo = models.PatientMedicalHistory(
            patient_id=patient_id,
            tipo=item.tipo,
            clave=item.clave,
            valor=item.valor,
            observaciones=item.observaciones
        )
        db.add(nuevo)
        db.commit()
        return {"mensaje": "Registrado"}