export interface Lectura {
  id: number;
  timestamp: string;
  fc: number;
  spo2: number;
  peso: number;
  bomba: boolean;
  estado_suero: string;
  estado_vitales: string | null;
  topic?: string;
}

export interface Alerta {
  id: number;
  msg: string;
  type: "ok" | "warn" | "critical";
}

export type EstadoVital = "ok" | "warn" | "critical";

export interface PacienteInfo {
  nombre: string;
  apellido: string;
  id: string;
  cama: string;
  doctor: string;
  grupoSanguineo: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  direccion: string;
  contactoNombre: string;
  contactoTelefono: string;
  contactoRelacion: string;
  temperatura: string;
  presionArterial: string;
}