# check_rutas.py
from fastapi import FastAPI
from fastapi.routing import APIRoute
# IMPORTANTE: Cambia 'main' por el nombre de tu archivo principal si es distinto
from main import app 

print("\n--- LISTA DE RUTAS REGISTRADAS ---")
found = False
for route in app.routes:
    if isinstance(route, APIRoute):
        # Filtramos solo las de citas para ver si aparece
        if "citas" in route.path:
            print(f"Ruta: {route.path}  --> Métodos: {route.methods}")
            if "paciente/{patient_id}" in route.path:
                found = True

print("----------------------------------")
if found:
    print("✅ LA RUTA EXISTE. El problema es el puerto o la base de datos.")
else:
    print("❌ LA RUTA NO EXISTE. El servidor no está cargando el código nuevo.")