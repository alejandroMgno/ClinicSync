from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import database, models, security

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])

# --- ESQUEMA ROBUSTO ---
# Acepta tanto la versión simple como la completa
class TenantCreate(BaseModel):
    nombre_comercial: str
    plan_suscripcion: str
    rfc: str
    admin_email: str
    admin_nombre: str
    admin_password: str
    
    # Campos opcionales (si el frontend los manda, bien; si no, usamos defaults)
    razon_social: Optional[str] = None
    direccion_fiscal: Optional[str] = None

@router.post("/clinicas", status_code=status.HTTP_201_CREATED)
def crear_clinica_v5(
    datos: TenantCreate, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "super_admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")

    # Lógica de Defaults Inteligentes
    razon_final = datos.razon_social if datos.razon_social else datos.nombre_comercial
    direccion_final = datos.direccion_fiscal if datos.direccion_fiscal else "Dirección Pendiente"

    # 1. Crear Tenant
    nuevo_tenant = models.Tenant(
        nombre_comercial=datos.nombre_comercial,
        plan_suscripcion=datos.plan_suscripcion,
        rfc=datos.rfc,
        razon_social=razon_final,
        direccion_fiscal=direccion_final, # <--- Usamos el nombre correcto de la BD
        config_ui_json='{"logo": null}',
        estado="activo"
    )
    db.add(nuevo_tenant)
    db.commit()
    db.refresh(nuevo_tenant)

    # 2. Crear Admin
    hashed_pwd = security.get_password_hash(datos.admin_password)
    admin_clinica = models.User(
        tenant_id=nuevo_tenant.id,
        rol="admin",
        email=datos.admin_email,
        password_hash=hashed_pwd,
        nombre_completo=datos.admin_nombre,
        cedula_profesional="PENDIENTE",
        porcentaje_comision_default=0.0
    )
    db.add(admin_clinica)
    db.commit()

    return {"mensaje": "Clínica creada", "tenant_id": nuevo_tenant.id}

@router.get("/clinicas")
def listar_clinicas(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "super_admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    return db.query(models.Tenant).all()

@router.get("/clinicas/{tenant_id}/usuarios")
def ver_usuarios_por_clinica(
    tenant_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "super_admin":
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    
    # Buscamos usuarios que pertenezcan a ese ID
    users = db.query(models.User).filter(models.User.tenant_id == tenant_id).all()
    return users