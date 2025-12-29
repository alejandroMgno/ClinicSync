from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any, Dict
from datetime import date, datetime
import json

# --- USUARIOS ---
class UserBase(BaseModel):
    email: EmailStr
    rol: str

class UserCreate(UserBase):
    password: str
    nombre_completo: str
    tenant_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    nombre_completo: str
    is_active: bool = True
    class Config:
        from_attributes = True

# --- PACIENTES ---
class PatientBase(BaseModel):
    nombre: str
    apellidos: str
    telefono_movil: str
    email: Optional[str] = None
    fecha_nacimiento: date
    sexo: str
    ocupacion: Optional[str] = None
    datos_personales: Optional[Dict[str, Any]] = {}

class PatientCreate(PatientBase):
    pass

class PatientHistoryCreate(BaseModel):
    tipo: str
    clave: str
    valor: str
    observaciones: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    saldo_actual: float
    created_at: datetime

    # --- EL FIX MÁGICO ---
    # Este validador convierte el String de la BD en el Diccionario que espera el Frontend
    @field_validator('datos_personales', mode='before')
    @classmethod
    def parse_datos_personales(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except ValueError:
                return {}
        return v

    class Config:
        from_attributes = True

# --- OPERACIÓN CLÍNICA ---
class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    fecha_hora: datetime
    motivo: str

class AppointmentResponse(BaseModel):
    id: int
    fecha_hora: datetime
    estado: str
    motivo: str
    patient_id: int
    doctor_id: int
    class Config:
        from_attributes = True

class ClinicalNoteCreate(BaseModel):
    subjetivo: str
    objetivo: str
    analisis: str
    plan: str
    signos_vitales: Dict[str, Any]

class DentalChartItem(BaseModel):
    diente: int
    cara: str
    estado: str

class DentalChartCreate(BaseModel):
    cambios: List[DentalChartItem]

# --- FINANZAS (MÓDULO D y E) ---

# 1. Servicios
class ServiceCreate(BaseModel):
    codigo: str
    nombre: str
    precio: float
    costo: float
    categoria: str

class ServiceResponse(ServiceCreate):
    id: int
    class Config:
        from_attributes = True

# 2. Presupuestos
class BudgetItemCreate(BaseModel):
    service_id: int
    cantidad: int = 1

class BudgetCreate(BaseModel):
    patient_id: int
    items: List[BudgetItemCreate]

class BudgetItemResponse(BaseModel):
    service_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    class Config:
        from_attributes = True

class BudgetResponse(BaseModel):
    id: int
    monto_total: float
    estado: str
    fecha_creacion: datetime
    items: List[BudgetItemResponse] = []
    class Config:
        from_attributes = True

# 3. Pagos
class PaymentCreate(BaseModel):
    budget_id: int
    metodo_pago: str

class InstallmentResponse(BaseModel):
    id: int
    numero_pago: int
    fecha_vencimiento: date
    monto: float
    estado: str
    fecha_pago: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PaymentPlanCreate(BaseModel):
    patient_id: int
    budget_id: Optional[int] = None
    monto_total: float
    plazo_meses: int
    dia_corte: int

class PaymentPlanResponse(BaseModel):
    id: int
    patient_id: int
    monto_total: float
    saldo_pendiente: float
    estado: str
    mensualidades: List[InstallmentResponse] = []
    
    class Config:
        from_attributes = True

# --- CITAS ---
class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    fecha_hora: datetime
    motivo: str
    duracion_minutos: Optional[int] = 60 # <--- CAMPO CLAVE

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    estado: str
    tenant_id: int
    
    class Config:
        from_attributes = True