"""
Conexión a MySQL via SQLAlchemy.
Railway inyecta DATABASE_URL automáticamente al añadir el plugin MySQL.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Railway inyecta: mysql://user:pass@host:port/dbname
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# SQLAlchemy necesita el prefijo "mysql+pymysql://"
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,        # reconecta si MySQL cerró la conexión
    pool_recycle=3600,         # recicla conexiones cada 1h
    pool_size=5,
    max_overflow=10,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    """Crea las tablas si no existen."""
    from models import Lectura, Alerta   # import aquí para evitar circular
    Base.metadata.create_all(bind=engine)
    print("✅ Base de datos inicializada")
