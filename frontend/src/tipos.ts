// ── Tablas separadas de la BD ─────────────────────────────────

export interface DatosSuero {
  id:           number;
  timestamp:    string;
  time:         string;
  peso:         number;
  bomba:        boolean;
  estado_suero: string;
}

export interface DatosVitales {
  id:             number;
  timestamp:      string;
  time:           string;
  fc:             number;
  spo2:           number;
  estado_vitales: string;
}

// Estado combinado que usa el dashboard para mostrar todo junto
export interface EstadoLive {
  peso:           number;
  bomba:          boolean;
  estado_suero:   string;
  fc:             number;
  spo2:           number;
  estado_vitales: string;
  timestamp:      string;
}

// ── Alertas ───────────────────────────────────────────────────
export interface Alerta {
  id:        number;
  timestamp: string;
  time:      string;
  tipo:      string;   // FC_ALTA | FC_BAJA | SPO2_BAJA | SUERO_BAJO | SUERO_CRITICO | BOMBA_ON
  mensaje:   string;
  valor:     number | null;
  activa:    boolean;
}

// ── Paciente ──────────────────────────────────────────────────
export interface PacienteInfo {
  nombre:           string;
  apellido:         string;
  id:               string;
  cama:             string;
  doctor:           string;
  grupoSanguineo:   string;
  fechaNacimiento:  string;
  fechaIngreso:     string;
  direccion:        string;
  contactoNombre:   string;
  contactoTelefono: string;
  contactoRelacion: string;
  temperatura:      string;
  presionArterial:  string;
}

// ── Helpers ───────────────────────────────────────────────────
export type EstadoVital = "ok" | "warn" | "critical";