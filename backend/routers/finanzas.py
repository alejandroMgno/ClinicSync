from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy import func
import database, models, schemas, security

router = APIRouter(prefix="/finanzas", tags=["Módulos D y E: Finanzas y Caja"])

# --- SCHEMAS ---
class BudgetPendingResponse(BaseModel):
    id: int
    monto_total: float
    estado: str
    fecha_creacion: datetime
    patient_id: int
    patient_name: str

class BudgetItemFullResponse(BaseModel):
    service_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    nombre_servicio: Optional[str] = None

class BudgetFullResponse(BaseModel):
    id: int
    monto_total: float
    estado: str
    fecha_creacion: datetime
    patient_id: int
    items: List[BudgetItemFullResponse]

class ReporteVentaItem(BaseModel):
    fecha: datetime
    paciente: str
    concepto: str # Aquí irá el detalle de lo vendido
    metodo_pago: str
    monto: float

class CorteCajaRequest(BaseModel):
    monto_inicial: float 
    monto_final_real: float 

class CorteCajaResponse(BaseModel):
    fecha: datetime
    monto_sistema: float
    monto_real: float
    diferencia: float
    estado: str

class CorteCajaHistoryItem(BaseModel):
    id: int
    fecha: datetime
    monto_inicial: float
    monto_sistema: float
    monto_real: float
    diferencia: float
    usuario: str

# --- 1. CATÁLOGO ---
@router.post("/catalogo", status_code=201)
def crear_servicio(
    servicio: schemas.ServiceCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "admin": raise HTTPException(403, detail="Solo Admin")
    nuevo = models.ServiceCatalog(
        tenant_id=current_user.tenant_id,
        codigo=servicio.codigo,
        nombre=servicio.nombre,
        precio=servicio.precio,   
        costo=servicio.costo,     
        categoria=servicio.categoria
    )
    db.add(nuevo)
    db.commit()
    return {"mensaje": "Servicio creado"}

@router.get("/catalogo", response_model=List[schemas.ServiceResponse])
def ver_catalogo(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    return db.query(models.ServiceCatalog).filter(models.ServiceCatalog.tenant_id == current_user.tenant_id, models.ServiceCatalog.activo == True).all()

# --- 2. PRESUPUESTOS ---
@router.post("/presupuestos", response_model=schemas.BudgetResponse)
def crear_presupuesto(datos: schemas.BudgetCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    nuevo_budget = models.Budget(
        tenant_id=current_user.tenant_id,
        patient_id=datos.patient_id,
        doctor_id=current_user.id,
        estado="borrador",
        monto_total=0.0
    )
    db.add(nuevo_budget)
    db.commit()
    db.refresh(nuevo_budget)

    total = 0.0
    for item in datos.items:
        srv = db.query(models.ServiceCatalog).filter(models.ServiceCatalog.id == item.service_id).first()
        if srv:
            sub = srv.precio * item.cantidad 
            total += sub
            db.add(models.BudgetItem(
                budget_id=nuevo_budget.id,
                service_id=srv.id,
                cantidad=item.cantidad,
                precio_unitario=srv.precio, 
                subtotal=sub
            ))
    
    nuevo_budget.monto_total = total
    db.commit()
    db.refresh(nuevo_budget)
    return nuevo_budget

@router.put("/presupuestos/{budget_id}/aprobar")
def aprobar_presupuesto(budget_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    presupuesto = db.query(models.Budget).filter(models.Budget.id == budget_id).first()
    if not presupuesto: raise HTTPException(404, detail="No encontrado")
    
    presupuesto.estado = "aprobado"
    paciente = db.query(models.Patient).filter(models.Patient.id == presupuesto.patient_id).first()
    if paciente: paciente.saldo_actual += presupuesto.monto_total
    
    db.commit()
    return {"mensaje": "Presupuesto aprobado"}

@router.put("/presupuestos/{budget_id}/rechazar")
def rechazar_presupuesto(
    budget_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    presupuesto = db.query(models.Budget).filter(models.Budget.id == budget_id).first()
    if not presupuesto: raise HTTPException(404, detail="No encontrado")
    
    presupuesto.estado = "rechazado"
    db.commit()
    return {"mensaje": "Presupuesto rechazado"}

@router.get("/presupuestos/paciente/{patient_id}", response_model=List[BudgetFullResponse])
def ver_presupuestos_paciente(patient_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    budgets = db.query(models.Budget).filter(models.Budget.patient_id == patient_id, models.Budget.tenant_id == current_user.tenant_id).order_by(models.Budget.fecha_creacion.desc()).all()
    result = []
    for b in budgets:
        items_list = []
        for item in b.items:
            srv = db.query(models.ServiceCatalog).filter(models.ServiceCatalog.id == item.service_id).first()
            items_list.append(BudgetItemFullResponse(
                service_id=item.service_id,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=item.subtotal,
                nombre_servicio=srv.nombre if srv else "Eliminado"
            ))
        result.append(BudgetFullResponse(
            id=b.id,
            monto_total=b.monto_total,
            estado=b.estado,
            fecha_creacion=b.fecha_creacion,
            patient_id=b.patient_id,
            items=items_list
        ))
    return result

# --- 3. CAJA Y COBROS ---
@router.get("/caja/pendientes", response_model=List[BudgetPendingResponse])
def ver_cuentas_por_cobrar(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    budgets = db.query(models.Budget).options(joinedload(models.Budget.paciente)).filter(models.Budget.tenant_id == current_user.tenant_id, models.Budget.estado == "aprobado").all()
    return [{"id": b.id, "monto_total": b.monto_total, "estado": b.estado, "fecha_creacion": b.fecha_creacion, "patient_id": b.patient_id, "patient_name": f"{b.paciente.nombre} {b.paciente.apellidos}" if b.paciente else "Desconocido"} for b in budgets]

@router.post("/caja/cobrar")
def cobrar_presupuesto(pago: schemas.PaymentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    budget = db.query(models.Budget).filter(models.Budget.id == pago.budget_id).first()
    if not budget or budget.estado != "aprobado": raise HTTPException(400, detail="Invalido")

    trx = models.Transaction(
        tenant_id=current_user.tenant_id,
        patient_id=budget.patient_id,
        budget_id=budget.id, # <--- GUARDAMOS EL ID DEL PRESUPUESTO
        monto=budget.monto_total,
        tipo="ingreso",
        metodo_pago=pago.metodo_pago,
        estado="pagado"
    )
    db.add(trx)
    
    budget.estado = "pagado"
    paciente = db.query(models.Patient).filter(models.Patient.id == budget.patient_id).first()
    if paciente: 
        paciente.saldo_actual -= budget.monto_total
        if paciente.saldo_actual < 0: paciente.saldo_actual = 0.0

    doc = db.query(models.User).filter(models.User.id == budget.doctor_id).first()
    if doc and doc.porcentaje_comision_default > 0:
        comision = float(budget.monto_total) * float(doc.porcentaje_comision_default)
        nomina = models.DoctorCommission(doctor_id=doc.id, transaction_id=trx.id, monto_comision=comision, estado_pago="pendiente")
        db.add(nomina)

    db.commit()
    return {"mensaje": "Cobro registrado"}

# --- 4. REPORTES Y CORTE (ACTUALIZADO CON DETALLE) ---
@router.get("/reporte-ventas", response_model=List[ReporteVentaItem])
def reporte_ventas(
    start_date: str, 
    end_date: str,   
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except: raise HTTPException(400, "Fecha inválida")

    # Traemos transacciones con sus relaciones (paciente, presupuesto -> items -> servicio)
    ventas = db.query(models.Transaction).options(
        joinedload(models.Transaction.paciente),
        joinedload(models.Transaction.presupuesto).joinedload(models.Budget.items).joinedload(models.BudgetItem.servicio)
    ).filter(
        models.Transaction.tenant_id == current_user.tenant_id,
        models.Transaction.tipo == "ingreso",
        models.Transaction.created_at >= start,
        models.Transaction.created_at <= end
    ).order_by(models.Transaction.created_at.desc()).all()

    reporte = []
    for v in ventas:
        nombre_paciente = "General"
        if v.paciente: nombre_paciente = f"{v.paciente.nombre} {v.paciente.apellidos}"
        
        # Construir string de concepto detallado
        concepto_detalle = "Pago General"
        if v.presupuesto and v.presupuesto.items:
            items_nombres = []
            for item in v.presupuesto.items:
                nombre_srv = item.servicio.nombre if item.servicio else "Servicio"
                items_nombres.append(f"{nombre_srv} (x{item.cantidad})")
            concepto_detalle = ", ".join(items_nombres)
        elif v.appointment_id:
            concepto_detalle = f"Consulta #{v.appointment_id}"

        reporte.append({
            "fecha": v.created_at,
            "paciente": nombre_paciente,
            "concepto": concepto_detalle, # <--- AQUÍ VA EL DETALLE
            "metodo_pago": v.metodo_pago,
            "monto": v.monto
        })
    return reporte

@router.post("/caja/corte", response_model=CorteCajaResponse)
def realizar_corte_z(datos: CorteCajaRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    caja = db.query(models.CashRegister).filter(models.CashRegister.tenant_id == current_user.tenant_id).first()
    if not caja:
        caja = models.CashRegister(tenant_id=current_user.tenant_id, nombre="Caja Principal", saldo=0.0, estado="abierta")
        db.add(caja)
        db.commit()
        db.refresh(caja)

    hoy_inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    total_ventas = db.query(func.sum(models.Transaction.monto)).filter(
        models.Transaction.tenant_id == current_user.tenant_id,
        models.Transaction.tipo == "ingreso",
        models.Transaction.created_at >= hoy_inicio
    ).scalar() or 0.0

    monto_sistema = float(total_ventas) + datos.monto_inicial
    diferencia = datos.monto_final_real - monto_sistema
    estado = "Cuadrado"
    if diferencia > 0: estado = "Sobrante"
    if diferencia < 0: estado = "Faltante"

    nuevo_corte = models.CashCut(
        register_id=caja.id, usuario_id=current_user.id, monto_inicial=datos.monto_inicial,
        monto_sistema=monto_sistema, monto_final=datos.monto_final_real, diferencia=diferencia, fecha=datetime.now()
    )
    db.add(nuevo_corte)
    db.commit()
    
    return { "fecha": nuevo_corte.fecha, "monto_sistema": monto_sistema, "monto_real": datos.monto_final_real, "diferencia": diferencia, "estado": estado }

@router.get("/caja/cortes", response_model=List[CorteCajaHistoryItem])
def historial_cortes(start_date: str, end_date: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except: raise HTTPException(400, "Fecha inválida")

    cortes = db.query(models.CashCut).join(models.CashRegister).options(joinedload(models.CashCut.usuario)).filter(
        models.CashRegister.tenant_id == current_user.tenant_id,
        models.CashCut.fecha >= start,
        models.CashCut.fecha <= end
    ).order_by(models.CashCut.fecha.desc()).all()

    return [CorteCajaHistoryItem(id=c.id, fecha=c.fecha, monto_inicial=c.monto_inicial, monto_sistema=c.monto_sistema, monto_real=c.monto_final, diferencia=c.diferencia, usuario=c.usuario.nombre_completo if c.usuario else "Sistema") for c in cortes]

    # --- 5. ORTODONCIA Y PLANES DE PAGO (NUEVO MÓDULO) ---

@router.post("/planes", response_model=schemas.PaymentPlanResponse)
def crear_plan_financiamiento(
    datos: schemas.PaymentPlanCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # 1. Validar que el paciente exista
    paciente = db.query(models.Patient).filter(models.Patient.id == datos.patient_id).first()
    if not paciente: raise HTTPException(404, detail="Paciente no encontrado")

    # 2. Crear el Plan Padre (La carpeta del crédito)
    nuevo_plan = models.PaymentPlan(
        tenant_id=current_user.tenant_id,
        patient_id=datos.patient_id,
        budget_id=datos.budget_id,
        monto_total=datos.monto_total,
        saldo_pendiente=datos.monto_total,
        plazo_meses=datos.plazo_meses,
        dia_corte=datos.dia_corte,
        estado="ACTIVO"
    )
    db.add(nuevo_plan)
    db.commit()
    db.refresh(nuevo_plan)

    # 3. Generar las Mensualidades (El calendario de pagos)
    monto_mensual = datos.monto_total / datos.plazo_meses
    fecha_base = datetime.now()
    
    # Lógica inteligente: Si hoy es día 20 y el corte es el 5, el primer pago es el PRÓXIMO mes.
    # Si hoy es día 2 y el corte es el 5, el primer pago es ESTE mes.
    mes_inicio = 1 if fecha_base.day > datos.dia_corte else 0

    for i in range(datos.plazo_meses):
        # Cálculo de fechas (Aproximación segura para meses)
        mes_pago = (fecha_base.month + mes_inicio + i) 
        anio_pago = fecha_base.year + ((mes_pago - 1) // 12)
        mes_real = ((mes_pago - 1) % 12) + 1
        
        # Ajuste para meses cortos (febrero, etc.)
        dia_final = datos.dia_corte
        if dia_final > 28 and mes_real == 2: dia_final = 28
        elif dia_final == 31 and mes_real in [4, 6, 9, 11]: dia_final = 30
        
        try:
            vencimiento = datetime(anio_pago, mes_real, dia_final).date()
        except ValueError:
            vencimiento = datetime(anio_pago, mes_real, 1).date() # Fallback seguro

        cuota = models.PaymentInstallment(
            payment_plan_id=nuevo_plan.id,
            numero_pago=i + 1,
            fecha_vencimiento=vencimiento,
            monto=monto_mensual,
            estado="PENDIENTE"
        )
        db.add(cuota)
    
    db.commit()
    db.refresh(nuevo_plan)
    return nuevo_plan

@router.get("/planes/paciente/{patient_id}", response_model=List[schemas.PaymentPlanResponse])
def ver_planes_paciente(
    patient_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    # Traemos el plan Y sus mensualidades
    return db.query(models.PaymentPlan).options(
        joinedload(models.PaymentPlan.mensualidades)
    ).filter(
        models.PaymentPlan.patient_id == patient_id, 
        models.PaymentPlan.tenant_id == current_user.tenant_id
    ).all()

@router.post("/planes/pagar/{installment_id}")
def pagar_mensualidad(
    installment_id: int, 
    metodo_pago: str = Query(..., description="Efectivo, Tarjeta, Transferencia"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # 1. Buscar la mensualidad
    cuota = db.query(models.PaymentInstallment).filter(models.PaymentInstallment.id == installment_id).first()
    if not cuota: raise HTTPException(404, detail="Mensualidad no encontrada")
    
    if cuota.estado == "PAGADO": raise HTTPException(400, detail="Esta mensualidad ya fue pagada")

    # 2. Marcar como pagada
    cuota.estado = "PAGADO"
    cuota.fecha_pago = datetime.now()
    
    # 3. Actualizar la deuda total del plan
    plan = db.query(models.PaymentPlan).filter(models.PaymentPlan.id == cuota.payment_plan_id).first()
    if plan:
        plan.saldo_pendiente -= cuota.monto
        # Tolerancia de decimales
        if plan.saldo_pendiente < 1.0: 
            plan.saldo_pendiente = 0
            plan.estado = "FINALIZADO"
        else:
            plan.estado = "ACTIVO"

    # 4. Registrar el dinero en CAJA (Importante para el corte del día)
    trx = models.Transaction(
        tenant_id=current_user.tenant_id,
        patient_id=plan.patient_id,
        monto=cuota.monto,
        tipo="ingreso",
        metodo_pago=metodo_pago,
        estado="pagado",
        budget_id=plan.budget_id # Ligamos al presupuesto original si existe
    )
    db.add(trx)
    db.flush() # Generamos el ID de la transacción para usarlo abajo

    # 5. Generar COMISIÓN MÉDICA (Si el plan tiene un doctor asociado)
    if plan.budget_id:
        budget = db.query(models.Budget).filter(models.Budget.id == plan.budget_id).first()
        if budget and budget.doctor_id:
            doctor = db.query(models.User).filter(models.User.id == budget.doctor_id).first()
            if doctor and doctor.porcentaje_comision_default > 0:
                comision = float(cuota.monto) * float(doctor.porcentaje_comision_default)
                nomina = models.DoctorCommission(
                    doctor_id=doctor.id, 
                    transaction_id=trx.id, 
                    monto_comision=comision, 
                    estado_pago="pendiente"
                )
                db.add(nomina)
    
    db.commit()
    return {"mensaje": "Pago registrado correctamente", "saldo_restante": plan.saldo_pendiente, "estado_plan": plan.estado}