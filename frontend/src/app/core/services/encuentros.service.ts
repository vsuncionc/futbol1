import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import {
  Cancha,
  Reserva,
  AlertaResumen,
  DisponibilidadSlot,
  Jugador,
  JugadorHistorial,
  Encuentro,
  SugerenciaEquipo,
  TecnicoPendiente,
  NotificacionItem,
  ParametroSistema
} from '../models/encuentros.models';

@Injectable({
  providedIn: 'root'
})
export class EncuentrosService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly BASE_URL = 'http://localhost:8080/api/v1';

  // ==================== ESTADO REACTIVO PARA EL MENÚ LATERAL ====================
  readonly conteoReservasPendientes = signal<number>(0);
  readonly conteoTecnicosPendientes = signal<number>(0);

  /**
   * Refresca las cantidades de solicitudes y técnicos pendientes mostradas en el menú.
   * Se ejecuta automáticamente tras cualquier aprobación, rechazo o cancelación.
   */
  actualizarConteosMenu(): void {
    if (!this.authService.isAuthenticated()) {
      this.conteoReservasPendientes.set(0);
      this.conteoTecnicosPendientes.set(0);
      return;
    }

    if (this.authService.canAccessDashboard()) {
      this.getSolicitudesPendientes().subscribe({
        next: (solicitudes) => {
          this.conteoReservasPendientes.set(solicitudes ? solicitudes.length : 0);
        },
        error: () => {}
      });
    } else {
      this.conteoReservasPendientes.set(0);
    }

    if (this.authService.canAccessTecnicosApproval()) {
      this.getConteoTecnicosPendientes().subscribe({
        next: (res) => {
          this.conteoTecnicosPendientes.set(res?.pendientes ?? 0);
        },
        error: () => {}
      });
    } else {
      this.conteoTecnicosPendientes.set(0);
    }
  }

  // ==================== PÚBLICO ====================
  getEncuentrosPublicos(canchaId?: number, fecha?: string): Observable<Encuentro[]> {
    let params = new HttpParams();
    if (canchaId) params = params.set('canchaId', canchaId.toString());
    if (fecha) params = params.set('fecha', fecha);
    return this.http.get<Encuentro[]>(`${this.BASE_URL}/publico/encuentros`, { params });
  }

  getEncuentrosPasados(): Observable<Encuentro[]> {
    return this.http.get<Encuentro[]>(`${this.BASE_URL}/publico/encuentros/pasados`);
  }

  getEncuentroPublicoDetalle(id: number): Observable<Encuentro> {
    return this.http.get<Encuentro>(`${this.BASE_URL}/publico/encuentros/${id}`);
  }

  getDisponibilidadPublica(canchaId?: number, desde?: string, hasta?: string): Observable<DisponibilidadSlot[]> {
    let params = new HttpParams();
    if (canchaId) params = params.set('canchaId', canchaId.toString());
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<DisponibilidadSlot[]>(`${this.BASE_URL}/publico/disponibilidad`, { params });
  }

  getCanchas(): Observable<Cancha[]> {
    return this.http.get<Cancha[]>(`${this.BASE_URL}/canchas`);
  }

  actualizarTarifaCancha(canchaId: number, tarifaHora: number): Observable<Cancha> {
    return this.http.put<Cancha>(`${this.BASE_URL}/canchas/${canchaId}/tarifa`, { tarifaHora });
  }

  registroTecnico(datos: any): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.BASE_URL}/publico/registro-tecnico`, datos);
  }

  // ==================== RESERVAS ====================
  getMisReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.BASE_URL}/reservas`);
  }

  getReservaPorId(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.BASE_URL}/reservas/${id}`);
  }

  solicitarReserva(formData: FormData): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.BASE_URL}/reservas`, formData).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  actualizarComprobante(reservaId: number, file: File): Observable<Reserva> {
    const formData = new FormData();
    formData.append('comprobante', file);
    return this.http.put<Reserva>(`${this.BASE_URL}/reservas/${reservaId}/comprobante`, formData);
  }

  getComprobanteUrl(reservaId: number): string {
    return `${this.BASE_URL}/reservas/${reservaId}/comprobante`;
  }

  getArchivoPublicoUrl(pathRelativo?: string | null): string {
    if (!pathRelativo) return '';
    if (pathRelativo.startsWith('http://') || pathRelativo.startsWith('https://') || pathRelativo.startsWith('data:')) {
      return pathRelativo;
    }
    const cleanPath = pathRelativo.startsWith('/') ? pathRelativo.substring(1) : pathRelativo;
    return `${this.BASE_URL}/publico/archivos/${cleanPath}`;
  }

  aprobarReserva(id: number): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.BASE_URL}/reservas/${id}/aprobar`, {}).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  rechazarReserva(id: number, motivo: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.BASE_URL}/reservas/${id}/rechazar`, { motivo }).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  cancelarReserva(id: number, motivo?: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.BASE_URL}/reservas/${id}/cancelar`, { motivo }).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  reprogramarReserva(id: number, datos: { fecha: string; horaInicio: string; horaFin: string }): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.BASE_URL}/reservas/${id}/reprogramar`, datos);
  }

  getSolicitudesPendientes(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.BASE_URL}/reservas/solicitudes`);
  }

  getAlertasSemaforo(): Observable<AlertaResumen> {
    return this.http.get<AlertaResumen>(`${this.BASE_URL}/reservas/alertas`);
  }

  verificarDisponibilidad(canchaId: number, fecha: string, horaInicio: string, horaFin: string, excluirReservaId?: number): Observable<{ disponible: boolean; mensaje: string }> {
    let params = new HttpParams()
      .set('canchaId', canchaId.toString())
      .set('fecha', fecha)
      .set('horaInicio', horaInicio)
      .set('horaFin', horaFin);
    if (excluirReservaId) params = params.set('excluirReservaId', excluirReservaId.toString());
    return this.http.get<{ disponible: boolean; mensaje: string }>(`${this.BASE_URL}/reservas/verificar-disponibilidad`, { params });
  }

  getCalendario(desde?: string, hasta?: string, canchaId?: number, estado?: string, tecnicoId?: string): Observable<Reserva[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (canchaId) params = params.set('canchaId', canchaId.toString());
    if (estado) params = params.set('estado', estado);
    if (tecnicoId) params = params.set('tecnicoId', tecnicoId);
    return this.http.get<Reserva[]>(`${this.BASE_URL}/reservas/calendario`, { params });
  }

  // ==================== JUGADORES ====================
  getMisJugadores(): Observable<Jugador[]> {
    return this.http.get<Jugador[]>(`${this.BASE_URL}/jugadores`);
  }

  getMisJugadoresActivos(): Observable<Jugador[]> {
    return this.http.get<Jugador[]>(`${this.BASE_URL}/jugadores/activos`);
  }

  crearJugador(formData: FormData): Observable<Jugador> {
    return this.http.post<Jugador>(`${this.BASE_URL}/jugadores`, formData);
  }

  actualizarJugador(id: number, formData: FormData): Observable<Jugador> {
    return this.http.put<Jugador>(`${this.BASE_URL}/jugadores/${id}`, formData);
  }

  cambiarEstadoJugador(id: number, activo: boolean): Observable<Jugador> {
    const params = new HttpParams().set('activo', activo.toString());
    return this.http.patch<Jugador>(`${this.BASE_URL}/jugadores/${id}/estado`, {}, { params });
  }

  getHistorialEstrellas(jugadorId: number): Observable<JugadorHistorial[]> {
    return this.http.get<JugadorHistorial[]>(`${this.BASE_URL}/jugadores/${jugadorId}/historial`);
  }

  // ==================== EVENTOS (ENCUENTROS) ====================
  getMisEncuentros(): Observable<Encuentro[]> {
    return this.http.get<Encuentro[]>(`${this.BASE_URL}/encuentros`);
  }

  getReservasDisponiblesParaEncuentro(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.BASE_URL}/encuentros/reservas-disponibles`);
  }

  crearEncuentro(formData: FormData): Observable<Encuentro> {
    return this.http.post<Encuentro>(`${this.BASE_URL}/encuentros`, formData);
  }

  getEncuentroPorId(id: number): Observable<Encuentro> {
    return this.http.get<Encuentro>(`${this.BASE_URL}/encuentros/${id}`);
  }

  actualizarEncuentro(id: number, formData: FormData): Observable<Encuentro> {
    return this.http.put<Encuentro>(`${this.BASE_URL}/encuentros/${id}`, formData);
  }

  actualizarEquipos(id: number, datos: { equipos: any[] }): Observable<Encuentro> {
    return this.http.put<Encuentro>(`${this.BASE_URL}/encuentros/${id}/equipos`, datos);
  }

  balancearEquipos(jugadorIds: number[], numEquipos: number): Observable<SugerenciaEquipo[]> {
    return this.http.post<SugerenciaEquipo[]>(`${this.BASE_URL}/encuentros/balancear`, { jugadorIds, numEquipos });
  }

  publicarEncuentro(id: number): Observable<Encuentro> {
    return this.http.patch<Encuentro>(`${this.BASE_URL}/encuentros/${id}/publicar`, {});
  }

  cancelarEncuentro(id: number): Observable<Encuentro> {
    return this.http.patch<Encuentro>(`${this.BASE_URL}/encuentros/${id}/cancelar`, {});
  }

  // ==================== SEGURIDAD (APROBACIÓN TÉCNICOS) ====================
  getTecnicos(estado?: string): Observable<TecnicoPendiente[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.http.get<TecnicoPendiente[]>(`${this.BASE_URL}/seguridad/usuarios`, { params });
  }

  aprobarTecnico(id: string): Observable<TecnicoPendiente> {
    return this.http.patch<TecnicoPendiente>(`${this.BASE_URL}/seguridad/usuarios/${id}/aprobar`, {}).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  rechazarTecnico(id: string, motivo: string): Observable<TecnicoPendiente> {
    return this.http.patch<TecnicoPendiente>(`${this.BASE_URL}/seguridad/usuarios/${id}/rechazar`, { motivo }).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  suspenderTecnico(id: string): Observable<TecnicoPendiente> {
    return this.http.patch<TecnicoPendiente>(`${this.BASE_URL}/seguridad/usuarios/${id}/suspender`, {}).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  reactivarTecnico(id: string): Observable<TecnicoPendiente> {
    return this.http.patch<TecnicoPendiente>(`${this.BASE_URL}/seguridad/usuarios/${id}/reactivar`, {}).pipe(
      tap(() => this.actualizarConteosMenu())
    );
  }

  getConteoTecnicosPendientes(): Observable<{ pendientes: number }> {
    return this.http.get<{ pendientes: number }>(`${this.BASE_URL}/seguridad/usuarios/pendientes/conteo`);
  }

  // ==================== NOTIFICACIONES ====================
  getMisNotificaciones(): Observable<NotificacionItem[]> {
    return this.http.get<NotificacionItem[]>(`${this.BASE_URL}/notificaciones`);
  }

  marcarNotificacionLeida(id: number): Observable<void> {
    return this.http.patch<void>(`${this.BASE_URL}/notificaciones/${id}/leida`, {});
  }

  getConteoNotificacionesNoLeidas(): Observable<{ noLeidas: number }> {
    return this.http.get<{ noLeidas: number }>(`${this.BASE_URL}/notificaciones/no-leidas/conteo`);
  }

  // ==================== PARÁMETROS ====================
  getParametros(): Observable<ParametroSistema[]> {
    return this.http.get<ParametroSistema[]>(`${this.BASE_URL}/parametros`);
  }

  actualizarParametro(clave: string, valor: string): Observable<ParametroSistema> {
    return this.http.put<ParametroSistema>(`${this.BASE_URL}/parametros/${clave}`, { valor });
  }
}
