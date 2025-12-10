from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import database, models, security

router = APIRouter(prefix="/usuarios", tags=["RRHH (Usuarios de Clínica)"])

# --- SCHEMAS ---
class UserCreateV5(BaseModel):
    nombre_completo: str
    email: EmailStr
    password: str
    rol: str # admin, dentista, staff
    cedula: Optional[str] = None
    universidad: Optional[str] = None
    especialidad: Optional[str] = None
    comision_default: float = 0.0

class UserUpdate(BaseModel):
    nombre_completo: str
    email: EmailStr
    rol: str
    cedula: Optional[str] = None
    comision_default: float = 0.0
    # Password es opcional en update para no sobrescribir si no se envía
    password: Optional[str] = None 

class UserResponse(BaseModel):
    id: int
    nombre_completo: str
    email: str
    rol: str
    cedula_profesional: Optional[str]
    porcentaje_comision_default: float
    class Config:
        from_attributes = True

# --- ENDPOINTS ---

@router.get("/", response_model=List[UserResponse])
def listar_personal(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Lista todos los usuarios activos de la clínica."""
    return db.query(models.User).filter(
        models.User.tenant_id == current_user.tenant_id,
        models.User.deleted_at == None
    ).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def contratar_personal(
    usuario: UserCreateV5,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo Admin puede crear usuarios.")

    # Validar límite del plan (Opcional: Si quieres estricto, descomenta la lógica de conteo)
    
    hashed_pwd = security.get_password_hash(usuario.password)
    nuevo_user = models.User(
        tenant_id=current_user.tenant_id,
        rol=usuario.rol,
        email=usuario.email,
        password_hash=hashed_pwd,
        nombre_completo=usuario.nombre_completo,
        cedula_profesional=usuario.cedula,
        universidad=usuario.universidad,
        especialidad=usuario.especialidad,
        porcentaje_comision_default=usuario.comision_default
    )
    db.add(nuevo_user)
    db.commit()
    return {"mensaje": "Usuario creado exitosamente"}

@router.put("/{user_id}")
def editar_usuario(
    user_id: int,
    datos: UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "admin": raise HTTPException(403, "Solo Admin.")

    empleado = db.query(models.User).filter(models.User.id == user_id, models.User.tenant_id == current_user.tenant_id).first()
    if not empleado: raise HTTPException(404, "Usuario no encontrado")

    empleado.nombre_completo = datos.nombre_completo
    empleado.email = datos.email
    empleado.rol = datos.rol
    empleado.cedula_profesional = datos.cedula
    empleado.porcentaje_comision_default = datos.comision_default
    
    if datos.password and len(datos.password) > 0:
        empleado.password_hash = security.get_password_hash(datos.password)

    db.commit()
    return {"mensaje": "Usuario actualizado"}

@router.delete("/{user_id}")
def despedir_usuario(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "admin": raise HTTPException(403, "Solo Admin.")
    if user_id == current_user.id: raise HTTPException(400, "No puedes eliminarte a ti mismo.")

    empleado = db.query(models.User).filter(models.User.id == user_id, models.User.tenant_id == current_user.tenant_id).first()
    if not empleado: raise HTTPException(404, "Usuario no encontrado")

    # Soft Delete
    from datetime import datetime
    empleado.deleted_at = datetime.now()
    
    db.commit()
    return {"mensaje": "Usuario eliminado"}