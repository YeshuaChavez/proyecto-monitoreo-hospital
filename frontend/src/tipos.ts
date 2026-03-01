// ── Tablas separadas de la BD ─────────────────────────────────

export interface DatosSuero {
  id:           number;
  timestamp:    string;
  time:         string;
  paciente_id?: number;
  peso:         number;
  bomba:        boolean;
  estado_suero: string;
}

export interface DatosVitales {
  id:             number;
  timestamp:      string;
  time:           string;
  paciente_id?:   number;
  fc:             number;
  spo2:           number;
  estado_vitales: string;
}

// Estado combinado en tiempo real — sin timestamp (no es registro de BD)
export interface EstadoLive {
  peso:           number;
  bomba:          boolean;
  estado_suero:   string;
  fc:             number;
  spo2:           number;
  estado_vitales: string;
}

// ── Alertas ───────────────────────────────────────────────────
export interface Alerta {
  id:           number;
  timestamp:    string;
  time:         string;
  paciente_id?: number;
  tipo:         string;
  mensaje:      string;
  valor:        number | null;
  activa:       boolean;
}

// ── Paciente de la BD ─────────────────────────────────────────
export interface PacienteDB {
  id:                 number;
  nombre:             string;
  apellido:           string;
  codigo?:            string;
  doctor?:            string;   // nombre resuelto por el backend
  doctor_id?:         number;   // FK → usuarios (para dropdown al editar)
  grupo_sanguineo?:   string;
  fecha_nacimiento?:  string;
  fecha_ingreso?:     string;
  direccion?:         string;
  contacto_nombre?:   string;
  contacto_telefono?: string;
  contacto_relacion?: string;
  activo?:            boolean;
}

// ── Usuarios Login ─────────────────────────────────────────────
export interface UsuarioLogin {
  id:      number;
  usuario: string;
  nombre:  string;
  rol:     string;
}

// ── Helpers ───────────────────────────────────────────────────
export type EstadoVital = "ok" | "warn" | "critical";