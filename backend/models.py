"""
Modelos SQLAlchemy → tablas MySQL

Tablas:
  lecturas  — datos del sensor cada ~1 segundo
  alertas   — eventos críticos generados por el backend
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, String, DateTime, Text
from database import Base


class Lectura(Base):
    __tablename__ = "lecturas"

    id        = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Sensores
    fc        = Column(Integer,  nullable=True)   # Frecuencia cardíaca (bpm)
    spo2      = Column(Integer,  nullable=True)   # Saturación O2 (%)
    peso      = Column(Float,    nullable=True)   # Peso suero (g)

    # Bomba
    bomba     = Column(Boolean,  default=False)   # True = activa

    # Estados calculados en ESP32
    estado_suero  = Column(String(20), nullable=True)   # NORMAL/ALERTA/CRITICO/RECARGANDO
    estado_vitales = Column(String(20), nullable=True)  # NORMAL/HIPOXIA/TAQUICARDIA/BRADICARDIA

    # Topic origen
    topic     = Column(String(50), nullable=True)

    def to_dict(self):
        return {
            "id":              self.id,
            "timestamp":       self.timestamp.isoformat() if self.timestamp else None,
            "time":            self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "fc":              self.fc   or 0,
            "spo2":            self.spo2 or 0,
            "peso":            round(self.peso, 1) if self.peso else 0,
            "bomba":           self.bomba or False,
            "estado_suero":    self.estado_suero or "NORMAL",
            "estado_vitales":  self.estado_vitales or "MIDIENDO",
        }


class Alerta(Base):
    __tablename__ = "alertas"

    id        = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    tipo      = Column(String(30))    # FC_ALTA | FC_BAJA | SPO2_BAJA | SUERO_BAJO | SUERO_CRITICO | BOMBA_ON
    mensaje   = Column(Text)
    valor     = Column(Float, nullable=True)
    activa    = Column(Boolean, default=True)

    def to_dict(self):
        return {
            "id":        self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "time":      self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "tipo":      self.tipo,
            "mensaje":   self.mensaje,
            "valor":     self.valor,
            "activa":    self.activa,
        }
