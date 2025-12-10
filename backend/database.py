from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Usamos SQLite por ahora para desarrollo rápido (creará un archivo local)
SQLALCHEMY_DATABASE_URL = "sqlite:///./clinicsync.db"
# Para MySQL en el futuro, solo cambiaremos la línea de arriba.

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()