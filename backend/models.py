"""
Modelos SQLAlchemy → tablas MySQL
"""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    usuario  = Column(String(50), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    nombre   = Column(String(100), nullable=False)
    rol      = Column(String(50), nullable=False)
    activo   = Column(Boolean, default=True)

    pacientes = relationship("Paciente", back_populates="doctor")

    def to_dict(self):
        return {
            "id":      self.id,
            "usuario": self.usuario,
            "nombre":  self.nombre,
            "rol":     self.rol,
        }


class Paciente(Base):
    __tablename__ = "pacientes"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    nombre            = Column(String(100), nullable=False)
    apellido          = Column(String(100), nullable=False)
    codigo            = Column(String(20),  nullable=True)
    doctor_id         = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    grupo_sanguineo   = Column(String(5),   nullable=True)
    fecha_nacimiento  = Column(String(20),  nullable=True)
    fecha_ingreso     = Column(String(20),  nullable=True)
    direccion         = Column(String(200), nullable=True)
    contacto_nombre   = Column(String(100), nullable=True)
    contacto_telefono = Column(String(20),  nullable=True)
    contacto_relacion = Column(String(50),  nullable=True)
    activo            = Column(Boolean, default=True)

    doctor = relationship("Usuario", back_populates="pacientes", lazy="joined")

    def to_dict(self):
        return {
            "id":                self.id,
            "nombre":            self.nombre,
            "apellido":          self.apellido,
            "codigo":            self.codigo,
            "doctor":            self.doctor.nombre if self.doctor else "",
            "doctor_id":         self.doctor_id,
            "grupo_sanguineo":   self.grupo_sanguineo   or "",
            "fecha_nacimiento":  self.fecha_nacimiento  or "",
            "fecha_ingreso":     self.fecha_ingreso      or "",
            "direccion":         self.direccion          or "",
            "contacto_nombre":   self.contacto_nombre    or "",
            "contacto_telefono": self.contacto_telefono  or "",
            "contacto_relacion": self.contacto_relacion  or "",
            "activo":            self.activo,
        }

class Suero(Base):
    __tablename__ = "suero"

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp      = Column(DateTime, default=datetime.utcnow, index=True)
    paciente_id    = Column(Integer, ForeignKey("pacientes.id"), nullable=True, index=True)
    peso           = Column(Float,   nullable=False)
    bomba          = Column(Boolean, default=False)
    estado_suero   = Column(String(20), nullable=True)
    origen_comando = Column(String(20), nullable=True)

    def to_dict(self):
        return {
            "id":             self.id,
            "timestamp":      self.timestamp.isoformat() if self.timestamp else None,
            "time":           self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "paciente_id":    self.paciente_id,
            "peso":           round(self.peso, 1) if self.peso is not None else 0,
            "bomba":          self.bomba or False,
            "estado_suero":   self.estado_suero or "NORMAL",
            "origen_comando": self.origen_comando,
        }


class Vitales(Base):
    __tablename__ = "vitales"

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp      = Column(DateTime, default=datetime.utcnow, index=True)
    paciente_id    = Column(Integer, ForeignKey("pacientes.id"), nullable=True, index=True)
    fc             = Column(Integer, nullable=False)
    spo2           = Column(Integer, nullable=False)
    estado_vitales = Column(String(20), nullable=True)

    def to_dict(self):
        return {
            "id":             self.id,
            "timestamp":      self.timestamp.isoformat() if self.timestamp else None,
            "time":           self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "paciente_id":    self.paciente_id,
            "fc":             self.fc   or 0,
            "spo2":           self.spo2 or 0,
            "estado_vitales": self.estado_vitales or "MIDIENDO",
        }


class Alerta(Base):
    __tablename__ = "alertas"

    id          = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp   = Column(DateTime, default=datetime.utcnow, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=True, index=True)
    tipo        = Column(String(30))
    mensaje     = Column(Text)
    valor       = Column(Float, nullable=True)
    activa      = Column(Boolean, default=True)

    def to_dict(self):
        return {
            "id":          self.id,
            "timestamp":   self.timestamp.isoformat() if self.timestamp else None,
            "time":        self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "paciente_id": self.paciente_id,
            "tipo":        self.tipo,
            "mensaje":     self.mensaje,
            "valor":       self.valor,
            "activa":      self.activa,
        }


class Config(Base):
    __tablename__ = "config"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    paciente_id  = Column(Integer, ForeignKey("pacientes.id"), nullable=True, index=True)  # ← nuevo
    peso_alerta  = Column(Float, default=150.0)
    peso_critico = Column(Float, default=100.0)
    updated_at   = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":           self.id,
            "paciente_id":  self.paciente_id,
            "peso_alerta":  self.peso_alerta,
            "peso_critico": self.peso_critico,
            "updated_at":   self.updated_at.isoformat() if self.updated_at else None,
        }