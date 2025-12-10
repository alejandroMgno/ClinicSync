from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database, models, security

router = APIRouter(prefix="/configuracion", tags=["Módulo Configuración"])

# Schema para actualizar datos de la clínica
class ClinicSettingsUpdate(BaseModel):
    nombre_comercial: str
    razon_social: str
    rfc: str
    direccion_fiscal: str
    telefono_contacto: str

# --- ENDPOINTS ---

@router.get("/mi-clinica")
def ver_mi_clinica(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Obtiene los datos de la clínica del usuario actual."""
    if not current_user.tenant_id:
        raise HTTPException(400, detail="Usuario no asociado a una clínica")
        
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    return tenant

@router.put("/mi-clinica")
def actualizar_mi_clinica(
    datos: ClinicSettingsUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Actualiza los datos fiscales y de contacto."""
    if current_user.rol != "admin":
        raise HTTPException(403, detail="Solo el Administrador puede editar la configuración")
    
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    
    tenant.nombre_comercial = datos.nombre_comercial
    tenant.razon_social = datos.razon_social
    tenant.rfc = datos.rfc
    tenant.direccion_fiscal = datos.direccion_fiscal
    tenant.telefono_contacto = datos.telefono_contacto
    
    db.commit()
    db.refresh(tenant)
    return {"mensaje": "Configuración actualizada correctamente", "data": tenant}