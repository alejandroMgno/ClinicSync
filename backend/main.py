from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

# --- AQUÍ ESTABA EL ERROR: FALTABA IMPORTAR 'citas' ---
# Importamos todos los módulos del sistema
from routers import (
    auth, 
    superadmin, 
    usuarios, 
    pacientes, 
    clinica, 
    finanzas, 
    inventario, 
    configuracion,
    citas  # <--- ¡ESTA ES LA IMPORTACIÓN NUEVA!
)

# Crear las tablas en la BD (si no existen)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ClinicSync Enterprise V5.0", version="5.0 - GOLD MASTER")

# --- CONFIGURACIÓN DE CORS ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ACTIVAR ROUTERS ---
app.include_router(auth.router)
app.include_router(superadmin.router)
app.include_router(usuarios.router)
app.include_router(pacientes.router)
app.include_router(clinica.router)
app.include_router(finanzas.router)
app.include_router(inventario.router)
app.include_router(configuracion.router)

# --- ¡ACTIVAMOS EL CEREBRO DE CITAS NUEVO! ---
app.include_router(citas.router) 

@app.get("/")
def root():
    return {"Sistema": "ClinicSync Enterprise", "Status": "Ready for Production 🚀"}