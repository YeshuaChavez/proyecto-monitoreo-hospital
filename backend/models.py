"""
Modelos SQLAlchemy → tablas MySQL

Tablas:
  suero    — peso + bomba + estado_suero   (cada 1s, topic lecturas)
  vitales  — fc + spo2 + estado_vitales    (cada 10s, topic vitales, siempre promediado)
  alertas  — eventos críticos generados por el backend
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, String, DateTime, Text
from database import Base


class Suero(Base):
    __tablename__ = "suero"

    id           = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp    = Column(DateTime, default=datetime.utcnow, index=True)
    peso         = Column(Float,   nullable=False)
    bomba        = Column(Boolean, default=False)
    estado_suero = Column(String(20), nullable=True)  # NORMAL/ALERTA/CRITICO/RECARGANDO

    def to_dict(self):
        return {
            "id":           self.id,
            "timestamp":    self.timestamp.isoformat() if self.timestamp else None,
            "time":         self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "peso":         round(self.peso, 1) if self.peso is not None else 0,
            "bomba":        self.bomba or False,
            "estado_suero": self.estado_suero or "NORMAL",
        }


class Vitales(Base):
    __tablename__ = "vitales"

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp      = Column(DateTime, default=datetime.utcnow, index=True)
    fc             = Column(Integer, nullable=False)   # promedio confirmado (bpm)
    spo2           = Column(Integer, nullable=False)   # promedio confirmado (%)
    estado_vitales = Column(String(20), nullable=True) # NORMAL/HIPOXIA/TAQUICARDIA/BRADICARDIA

    def to_dict(self):
        return {
            "id":             self.id,
            "timestamp":      self.timestamp.isoformat() if self.timestamp else None,
            "time":           self.timestamp.strftime("%H:%M:%S") if self.timestamp else "--",
            "fc":             self.fc   or 0,
            "spo2":           self.spo2 or 0,
            "estado_vitales": self.estado_vitales or "MIDIENDO",
        }


class Alerta(Base):
    __tablename__ = "alertas"

    id        = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    tipo      = Column(String(30))   # FC_ALTA | FC_BAJA | SPO2_BAJA | SUERO_BAJO | SUERO_CRITICO | BOMBA_ON
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