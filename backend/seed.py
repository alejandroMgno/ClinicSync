from database import SessionLocal, engine
import models, security

# Conectar a la DB
db = SessionLocal()

def create_initial_data():
    print("🚀 Iniciando Semilla V5 (Estructura Final)...")

    # ----------------------------------------------------
    # 1. CREAR SUPER ADMIN (Dueño del SaaS)
    # ----------------------------------------------------
    super_email = "master@clinicsync.com"
    super_admin = db.query(models.User).filter(models.User.email == super_email).first()
    
    if not super_admin:
        print(f"   Creando Super Admin: {super_email}")
        hashed_pwd = security.get_password_hash("master123")
        
        god_user = models.User(
            tenant_id=None, # Super Admin no pertenece a ninguna clínica
            rol="super_admin", # <--- CAMBIO: 'rol' en español
            email=super_email,
            password_hash=hashed_pwd,
            nombre_completo="CEO ClinicSync",
            cedula_profesional="SAAS-001",
            porcentaje_comision_default=0.0
        )
        db.add(god_user)
        db.commit()
    else:
        print("   ✅ Super Admin ya existe.")

    # ----------------------------------------------------
    # 2. CREAR PRIMER TENANT (Clínica Demo)
    # ----------------------------------------------------
    rfc_demo = "DEN250101XYZ"
    tenant = db.query(models.Tenant).filter(models.Tenant.rfc == rfc_demo).first()
    
    if not tenant:
        print("   Creando Clínica Demo V5...")
        new_tenant = models.Tenant(
            nombre_comercial="Clínica Dental Premium",
            plan_suscripcion="pro",
            rfc=rfc_demo,
            config_ui_json='{"logo": "default.png"}',
            estado="activo"
        )
        db.add(new_tenant)
        db.commit()
        db.refresh(new_tenant)
        tenant_id = new_tenant.id
        
        # 3. CREAR ADMIN DE LA CLÍNICA
        print("   Creando Admin de la Clínica...")
        admin_email = "admin@premium.com"
        hashed_pwd_admin = security.get_password_hash("admin123")
        
        clinic_admin = models.User(
            tenant_id=tenant_id,
            rol="admin", # Admin de la clínica
            email=admin_email,
            password_hash=hashed_pwd_admin,
            nombre_completo="Dr. Roberto Dueño",
            cedula_profesional="DENT-999",
            porcentaje_comision_default=0.0
        )
        db.add(clinic_admin)
        db.commit()
    else:
        print("   ✅ Clínica Demo ya existe.")

    print("\n✅ ¡Sistema V5 Inicializado Correctamente!")

if __name__ == "__main__":
    create_initial_data()

#josea@clinicapro.com  josea123