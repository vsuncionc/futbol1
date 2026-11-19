export interface Cancha {
  id: number;
  nombre: string;
  tipo: string;
  tarifaHora: number;
  activa: boolean;
}

export type EstadoReserva = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA' | 'VENCIDA' | 'FINALIZADA';
export type EstadoEncuentro = 'BORRADOR' | 'PUBLICADO' | 'EN_JUEGO' | 'FINALIZADO' | 'CANCELADO';
export type EstadoAprobacion = 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO' | 'SUSPENDIDO';

export interface Reserva {
  id: number;
  canchaId: number;
  canchaNombre: string;
  canchaTipo: string;
  tecnicoId: string;
  tecnicoNombre: string;
  tecnicoEmail: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  monto: number;
  estado: EstadoReserva;
  comprobanteUrl?: string;
  comprobanteTipo?: string;
  motivoRechazo?: string;
  motivoCancelacion?: string;
  enConflicto?: boolean;
  creadaEn: string;
  actualizadaEn: string;
}

export interface AlertaReserva {
  id: number;
  tecnicoId: string;
  tecnicoNombre: string;
  canchaId: number;
  canchaNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  monto: number;
  diasRestantes: number;
  semaforo: 'ROJO' | 'AMBAR' | 'VERDE';
  textoSemaforo: string;
  comprobanteUrl?: string;
  enConflicto: boolean;
}

export interface AlertaResumen {
  totalRojas: number;
  totalAmbar: number;
  totalVerdes: number;
  alertas: AlertaReserva[];
}

export interface DisponibilidadSlot {
  canchaId: number;
  canchaNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
}

export interface Jugador {
  id: number;
  tecnicoId: string;
  nombre: string;
  apodo?: string;
  posicion?: string;
  fotoUrl?: string;
  fotoMiniaturaUrl?: string;
  estrellas: number;
  activo: boolean;
  creadoEn: string;
}

export interface JugadorHistorial {
  id: number;
  estrellasAnterior: number;
  estrellasNueva: number;
  cambiadoPorNombre: string;
  cambiadoEn: string;
}

export interface Equipo {
  id?: number;
  nombre: string;
  color: string;
  totalEstrellas: number;
  promedioEstrellas: number;
  jugadores: Jugador[];
}

export interface Encuentro {
  id: number;
  reservaId: number;
  canchaId: number;
  canchaNombre: string;
  canchaTipo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tecnicoId: string;
  tecnicoNombre: string;
  nombre: string;
  bannerUrl?: string;
  apuestaMonto?: number;
  estado: EstadoEncuentro;
  creadoEn: string;
  publicadoEn?: string;
  equipos: Equipo[];
}

export interface SugerenciaEquipo {
  nombre: string;
  color: string;
  totalEstrellas: number;
  promedioEstrellas: number;
  jugadores: Jugador[];
}

export interface TecnicoPendiente {
  id: string;
  nombres: string;
  email: string;
  telefono: string;
  fechaRegistro: string;
  estado: EstadoAprobacion;
  motivoRechazo?: string;
  fechaDecision?: string;
}

export interface NotificacionItem {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace?: string;
  leida: boolean;
  creadaEn: string;
}

export interface ParametroSistema {
  clave: string;
  valor: string;
  descripcion: string;
}
