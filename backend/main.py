from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # <--- ESTA LÍNEA ES LA QUE FALTABA
import models
from database import engine
# Importamos todos los módulos del sistema
from routers import auth, superadmin, usuarios, pacientes, clinica, finanzas ,inventario, configuracion

# Crear las tablas en la BD (si no existen)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ClinicSync Enterprise V5.0", version="5.0 - GOLD MASTER")

# --- CONFIGURACIÓN DE CORS (VITAL PARA EL FRONTEND) ---
origins = [
    "http://localhost:5173", # Puerto de Vite (React)
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permitir todos los métodos (GET, POST, PUT, DELETE)
    allow_headers=["*"], # Permitir todos los headers (Tokens, JSON)
)
# ------------------------------------------------------

# --- ACTIVAR ROUTERS (CEREBROS DEL SISTEMA) ---
app.include_router(auth.router)
app.include_router(superadmin.router)
app.include_router(usuarios.router)
app.include_router(pacientes.router)
app.include_router(clinica.router)
app.include_router(finanzas.router)
app.include_router(inventario.router)
app.include_router(configuracion.router)

@app.get("/")
def root():
    return {"Sistema": "ClinicSync Enterprise", "Status": "Ready for Production 🚀"}