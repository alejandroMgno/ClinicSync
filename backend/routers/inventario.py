from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import database, models, security

router = APIRouter(prefix="/inventario", tags=["Módulo D: Inventarios"])

# --- SCHEMAS ---
class ItemCreate(BaseModel):
    nombre: str
    sku: str
    unidad: str 
    stock_inicial: int = 0
    costo: float = 0.0 

class ItemUpdate(BaseModel): # <--- SCHEMA PARA EDICIÓN
    nombre: str
    sku: str
    unidad: str
    costo: float

class StockMovementRequest(BaseModel):
    cantidad: int
    tipo: str 
    motivo: str = "Ajuste manual"

class ItemResponse(BaseModel):
    id: int
    nombre: str
    sku: str
    unidad: str
    stock: int
    costo: float 
    class Config:
        from_attributes = True

class MovementResponse(BaseModel):
    id: int
    fecha: datetime
    tipo: str
    cantidad: int
    item_nombre: str
    sku: str
    usuario_nombre: str # <--- NUEVO CAMPO
    
# --- ENDPOINTS ---

@router.post("/items", status_code=201)
def crear_item(
    item: ItemCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol not in ["admin", "dentista", "medico"]: 
        raise HTTPException(403, "No tienes permisos")

    existe = db.query(models.InventoryItem).filter(
        models.InventoryItem.sku == item.sku, 
        models.InventoryItem.tenant_id == current_user.tenant_id
    ).first()
    if existe: raise HTTPException(400, "El código SKU ya existe")

    nuevo = models.InventoryItem(
        tenant_id=current_user.tenant_id,
        nombre=item.nombre,
        sku=item.sku,
        unidad=item.unidad,
        stock=item.stock_inicial,
        costo=item.costo
    )
    db.add(nuevo)
    db.commit()
    
    if item.stock_inicial > 0:
        db.refresh(nuevo)
        kardex = models.InventoryMovement(
            item_id=nuevo.id,
            user_id=current_user.id, # Registramos al creador
            tipo="entrada",
            cantidad=item.stock_inicial,
            fecha=datetime.now()
        )
        db.add(kardex)
        db.commit()

    return {"mensaje": "Producto creado"}

@router.get("/items", response_model=List[ItemResponse])
def ver_inventario(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(security.get_current_user)
):
    return db.query(models.InventoryItem).filter(
        models.InventoryItem.tenant_id == current_user.tenant_id,
        models.InventoryItem.deleted_at == None
    ).all()


# --- NUEVO: EDITAR ITEM ---
@router.put("/items/{item_id}")
def actualizar_item(
    item_id: int,
    datos: ItemUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol not in ["admin", "dentista"]: 
        raise HTTPException(403, "No tienes permisos para editar")
        
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id,
        models.InventoryItem.tenant_id == current_user.tenant_id
    ).first()
    
    if not item: raise HTTPException(404, "Item no encontrado")
    
    item.nombre = datos.nombre
    item.sku = datos.sku
    item.unidad = datos.unidad
    item.costo = datos.costo
    
    db.commit()
    return {"mensaje": "Producto actualizado"}

# --- NUEVO: ELIMINAR ITEM ---
@router.delete("/items/{item_id}")
def eliminar_item(
    item_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.rol != "admin": 
        raise HTTPException(403, "Solo Admin puede eliminar")
        
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id,
        models.InventoryItem.tenant_id == current_user.tenant_id
    ).first()
    
    if not item: raise HTTPException(404, "Item no encontrado")
    
    item.deleted_at = datetime.now() # Soft Delete
    db.commit()
    return {"mensaje": "Producto eliminado"}

@router.put("/items/{item_id}/movimiento")
def registrar_movimiento(
    item_id: int,
    mov: StockMovementRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id,
        models.InventoryItem.tenant_id == current_user.tenant_id
    ).first()
    
    if not item: raise HTTPException(404, "Item no encontrado")

    if mov.tipo == 'entrada':
        item.stock += mov.cantidad
    elif mov.tipo == 'salida':
        if item.stock < mov.cantidad:
            raise HTTPException(400, f"Stock insuficiente. Tienes {item.stock}")
        item.stock -= mov.cantidad

    kardex = models.InventoryMovement(
        item_id=item.id,
        user_id=current_user.id, # <--- REGISTRAMOS QUIÉN FUE
        tipo=mov.tipo,
        cantidad=mov.cantidad,
        fecha=datetime.now()
    )
    db.add(kardex)
    db.commit()
    
    return {"mensaje": "Stock actualizado", "nuevo_stock": item.stock}

@router.get("/movimientos", response_model=List[MovementResponse])
def ver_historial_movimientos(
    limit: int = 50,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    movimientos = db.query(models.InventoryMovement).join(models.InventoryItem).options(
        joinedload(models.InventoryMovement.usuario) # Cargamos usuario
    ).filter(
        models.InventoryItem.tenant_id == current_user.tenant_id
    ).order_by(models.InventoryMovement.fecha.desc()).limit(limit).all()

    resultado = []
    for m in movimientos:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == m.item_id).first()
        # Obtenemos nombre de usuario de forma segura
        nombre_usuario = m.usuario.nombre_completo if m.usuario else "Sistema"

        resultado.append({
            "id": m.id,
            "fecha": m.fecha,
            "tipo": m.tipo,
            "cantidad": m.cantidad,
            "item_nombre": item.nombre if item else "Desconocido",
            "sku": item.sku if item else "-",
            "usuario_nombre": nombre_usuario # <--- ENVIAMOS NOMBRE
        })
    
    return resultado