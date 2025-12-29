from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Text, DateTime, Boolean, DECIMAL
from sqlalchemy.orm import relationship
from database import Base
import datetime

# Utility Mixin para borrado lógico
class SoftDeleteMixin:
    deleted_at = Column(DateTime, nullable=True)

# --- MÓDULO A: SAAS Y USUARIOS ---
class Tenant(Base, SoftDeleteMixin):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    nombre_comercial = Column(String(100))
    plan_suscripcion = Column(String(20))
    rfc = Column(String(20))
    razon_social = Column(String(100)) 
    direccion_fiscal = Column(String(200))
    telefono_contacto = Column(String(20))
    config_ui_json = Column(Text)
    estado = Column(String(20))
    whatsapp_enabled = Column(Boolean, default=False)
    whatsapp_number = Column(String(20))
    doctor_phone = Column(String(20))
    hora_reporte_diario = Column(String(5), default="08:00")

    users = relationship("User", back_populates="tenant")
    patients = relationship("Patient", back_populates="tenant")
    servicios = relationship("ServiceCatalog", back_populates="tenant")
    inventario = relationship("InventoryItem", back_populates="tenant")

class User(Base, SoftDeleteMixin):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    rol = Column(String(20))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    nombre_completo = Column(String(100))
    cedula_profesional = Column(String(50), nullable=True)
    universidad = Column(String(150), nullable=True)
    especialidad = Column(String(100), nullable=True)
    porcentaje_comision_default = Column(DECIMAL(10, 2), default=0.0)
    
    tenant = relationship("Tenant", back_populates="users")
    cortes_caja = relationship("CashCut", back_populates="usuario")
    movimientos_inventario = relationship("InventoryMovement", back_populates="usuario")

class Branch(Base, SoftDeleteMixin):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    nombre = Column(String(100))
    direccion = Column(String(200))

# --- MÓDULO B: PACIENTES ---
class Patient(Base, SoftDeleteMixin):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    nombre = Column(String(100))
    apellidos = Column(String(100))
    fecha_nacimiento = Column(Date)
    sexo = Column(String(10))
    telefono_movil = Column(String(20))
    email = Column(String(100))
    ocupacion = Column(String(100))
    datos_personales = Column(Text)
    saldo_actual = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.now)

    tenant = relationship("Tenant", back_populates="patients")
    citas = relationship("Appointment", back_populates="paciente")
    transacciones = relationship("Transaction", back_populates="paciente")
    presupuestos = relationship("Budget", back_populates="paciente")

class PatientMedicalHistory(Base):
    __tablename__ = "patient_medical_history"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    tipo = Column(String(50))
    clave = Column(String(50))
    valor = Column(String(200))
    observaciones = Column(Text)

class PatientFile(Base):
    __tablename__ = "patient_files"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    url_archivo = Column(String(255))
    tipo = Column(String(50))

# --- MÓDULO C: CLÍNICA Y CITAS ---
class Appointment(Base, SoftDeleteMixin):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    fecha_hora = Column(DateTime)
    estado = Column(String(20))
    motivo = Column(String(255))
    duracion_minutos = Column(Integer, default=60)

    paciente = relationship("Patient", back_populates="citas")
    clinical_record = relationship("ClinicalNote", back_populates="cita", uselist=False)
    archivos = relationship("AppointmentFile", back_populates="cita")

class AppointmentFile(Base):
    __tablename__ = "appointment_files"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    nombre_archivo = Column(String(150))
    tipo_mime = Column(String(50))
    url_archivo = Column(String(500)) 
    created_at = Column(DateTime, default=datetime.datetime.now)
    cita = relationship("Appointment", back_populates="archivos")

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    soap_data = Column(Text)
    signos_vitales = Column(Text)
    cita = relationship("Appointment", back_populates="clinical_record")

class DentalChart(Base):
    __tablename__ = "dental_charts"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    diente = Column(Integer)
    cara = Column(String(20))
    estado = Column(String(20))
    appointment_id = Column(Integer, ForeignKey("appointments.id"))

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    texto_medicamentos = Column(Text)
    pdf_url = Column(String(255))

# --- MÓDULO D: INVENTARIO ---
class ServiceCatalog(Base, SoftDeleteMixin):
    __tablename__ = "services_catalog"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    codigo = Column(String(50))
    nombre = Column(String(100))
    precio = Column(Float)
    costo = Column(Float)
    categoria = Column(String(50))
    activo = Column(Boolean, default=True)
    tenant = relationship("Tenant", back_populates="servicios")

class InventoryItem(Base, SoftDeleteMixin):
    __tablename__ = "inventory_items"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    nombre = Column(String(100))
    sku = Column(String(50))
    stock = Column(Integer)
    unidad = Column(String(20))
    costo = Column(Float, default=0.0)
    tenant = relationship("Tenant", back_populates="inventario")

class ServiceMaterial(Base):
    __tablename__ = "service_materials"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services_catalog.id"))
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    cantidad = Column(Integer)

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    tipo = Column(String(20))
    cantidad = Column(Integer)
    fecha = Column(DateTime, default=datetime.datetime.now)
    usuario = relationship("User", back_populates="movimientos_inventario")

# --- MÓDULO E: FINANZAS Y PRESUPUESTOS ---
class Budget(Base, SoftDeleteMixin):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    fecha_creacion = Column(DateTime, default=datetime.datetime.now)
    monto_total = Column(Float)
    estado = Column(String(20), default="borrador")
    items = relationship("BudgetItem", back_populates="presupuesto")
    paciente = relationship("Patient", back_populates="presupuestos")

class BudgetItem(Base):
    __tablename__ = "budget_items"
    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id"))
    service_id = Column(Integer, ForeignKey("services_catalog.id"))
    cantidad = Column(Integer, default=1)
    precio_unitario = Column(Float)
    subtotal = Column(Float)
    presupuesto = relationship("Budget", back_populates="items")
    servicio = relationship("ServiceCatalog")

class CashRegister(Base):
    __tablename__ = "cash_registers"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    nombre = Column(String(50))
    saldo = Column(Float, default=0.0)
    estado = Column(String(20))

class CashCut(Base):
    __tablename__ = "cash_cuts"
    id = Column(Integer, primary_key=True, index=True)
    register_id = Column(Integer, ForeignKey("cash_registers.id"))
    usuario_id = Column(Integer, ForeignKey("users.id"))
    fecha = Column(DateTime, default=datetime.datetime.now)
    monto_inicial = Column(Float)
    monto_sistema = Column(Float)
    monto_final = Column(Float)
    diferencia = Column(Float)
    usuario = relationship("User", back_populates="cortes_caja")

class Transaction(Base, SoftDeleteMixin):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    budget_id = Column(Integer, ForeignKey("budgets.id"), nullable=True)
    monto = Column(Float)
    metodo_pago = Column(String(50))
    estado = Column(String(20))
    tipo = Column(String(20))
    created_at = Column(DateTime, default=datetime.datetime.now)
    paciente = relationship("Patient", back_populates="transacciones")
    presupuesto = relationship("Budget")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    uuid_sat = Column(String(100))
    xml_url = Column(String(255))

# --- MÓDULO F: FINANCIAMIENTO (ORTODONCIA) ---
# (Versión final consolidada)
class PaymentPlan(Base, SoftDeleteMixin):
    __tablename__ = "payment_plans"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    budget_id = Column(Integer, ForeignKey("budgets.id"), nullable=True)
    
    monto_total = Column(Float)
    saldo_pendiente = Column(Float)
    plazo_meses = Column(Integer)
    dia_corte = Column(Integer)
    estado = Column(String(20), default="ACTIVO")
    
    created_at = Column(DateTime, default=datetime.datetime.now)

    tenant = relationship("Tenant")
    paciente = relationship("Patient")
    presupuesto = relationship("Budget")
    mensualidades = relationship("PaymentInstallment", back_populates="plan", cascade="all, delete-orphan")

class PaymentInstallment(Base):
    __tablename__ = "payment_installments"
    id = Column(Integer, primary_key=True, index=True)
    payment_plan_id = Column(Integer, ForeignKey("payment_plans.id"))
    
    numero_pago = Column(Integer)
    fecha_vencimiento = Column(Date)
    monto = Column(Float)
    estado = Column(String(20), default="PENDIENTE")
    fecha_pago = Column(DateTime, nullable=True)
    
    plan = relationship("PaymentPlan", back_populates="mensualidades")

class DoctorCommission(Base):
    __tablename__ = "doctor_commissions"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    monto_comision = Column(Float)
    estado_pago = Column(String(20))