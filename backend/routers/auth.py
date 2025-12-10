from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import database, models, security
from datetime import timedelta

router = APIRouter(tags=["Autenticación"])

@router.post("/token", summary="Login para obtener Token JWT")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db) # Asegúrate de tener get_db en database.py o importarlo
):
    """
    Ingresa email (en el campo username) y contraseña.
    Devuelve un Access Token si las credenciales son correctas.
    """
    # 1. Buscar usuario por email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Validar usuario y contraseña
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (Email o Password erróneo)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Generar Token
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.rol, "tenant_id": user.tenant_id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}