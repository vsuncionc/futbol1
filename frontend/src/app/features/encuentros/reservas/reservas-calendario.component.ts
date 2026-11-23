import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cancha, Reserva } from '../../../core/models/encuentros.models';

interface DiaSemana {
  fecha: Date;
  fechaStr: string;
  nombreDia: string;
  numeroDia: number;
  esHoy: boolean;
}

interface MiniDia {
  fecha: Date;
  diaNum: number;
  fechaStr: string;
  esMesActual: boolean;
  esHoy: boolean;
  esSeleccionado: boolean;
}

@Component({
  selector: 'app-reservas-calendario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <div class="calendar-layout">
      <!-- 1. TOPBAR GOOGLE CALENDAR STYLE -->
      <header class="cal-topbar">
        <div class="topbar-left">
          <div class="logo-group clickable" 
               (click)="toggleSidebarLateral()" 
               matTooltip="Clic para mostrar u ocultar el panel lateral" 
               role="button" 
               tabindex="0">
            <div class="cal-icon-badge">
              <mat-icon>calendar_today</mat-icon>
            </div>
            <h1 class="cal-title">Calendario de Canchas</h1>
          </div>

          <button type="button" class="btn-today" (click)="irAHoy()">
            Hoy
          </button>

          <div class="nav-arrows">
            <button type="button" class="arrow-btn" (click)="semanaAnterior()" matTooltip="Semana anterior">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <button type="button" class="arrow-btn" (click)="semanaSiguiente()" matTooltip="Semana siguiente">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>

          <h2 class="current-date-title">{{ tituloMesAno() }}</h2>
        </div>

        <div class="topbar-right">
          <div class="view-selector">
            <button type="button" class="view-btn active">Semana</button>
          </div>

          <button 
            type="button" 
            class="btn-create-top" 
            (click)="abrirModalNuevaReserva()">
            <mat-icon>add</mat-icon>
            <span>Solicitar Reserva</span>
          </button>
        </div>
      </header>

      <!-- 2. CUERPO PRINCIPAL (SIDEBAR IZQUIERDA + GRILLA SEMANAL) -->
      <div class="cal-main-area">
        <!-- SIDEBAR IZQUIERDO -->
        <aside class="cal-sidebar" [class.collapsed]="!mostrarSidebarLateral()">
          <!-- BOTÓN CREAR FLOTANTE ESTILO GOOGLE CALENDAR -->
          <button 
            type="button" 
            class="google-create-btn" 
            (click)="abrirModalNuevaReserva()">
            <div class="plus-icon-box">
              <mat-icon>add</mat-icon>
            </div>
            <span class="btn-text">Nueva Reserva</span>
          </button>

          <!-- MINI CALENDARIO INTERACTIVO -->
          <div class="mini-calendar-card">
            <div class="mini-header">
              <span class="mini-month-label">{{ tituloMiniMes() }}</span>
              <div class="mini-nav">
                <button type="button" class="mini-nav-btn" (click)="mesMiniAnterior()">
                  <mat-icon>chevron_left</mat-icon>
                </button>
                <button type="button" class="mini-nav-btn" (click)="mesMiniSiguiente()">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>
            </div>

            <div class="mini-days-header">
              <span>D</span>
              <span>L</span>
              <span>M</span>
              <span>M</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
            </div>

            <div class="mini-days-grid">
              @for (dia of miniDias(); track dia.fechaStr) {
                <button 
                  type="button" 
                  class="mini-day-cell"
                  [class.other-month]="!dia.esMesActual"
                  [class.is-today]="dia.esHoy"
                  [class.is-selected]="dia.esSeleccionado"
                  (click)="seleccionarDiaMini(dia.fecha)">
                  {{ dia.diaNum }}
                </button>
              }
            </div>
          </div>

          <!-- FILTROS POR CANCHA (MIS CANCHAS) -->
          <div class="canchas-filter-section">
            <div class="filter-header">
              <span class="filter-title">Canchas Deportivas</span>
              <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #64748b;">expand_more</mat-icon>
            </div>

            <div class="canchas-list">
              @for (c of canchas(); track c.id) {
                <label class="cancha-checkbox-label">
                  <input 
                    type="checkbox" 
                    [checked]="canchasActivasIds().has(c.id)" 
                    (change)="toggleCanchaFiltro(c.id)" />
                  <span class="cancha-color-square" [style.background-color]="getCanchaColor(c.id)"></span>
                  <span class="cancha-name">{{ c.nombre }} ({{ c.tipo }})</span>
                </label>
              }
            </div>
          </div>

          <!-- LEYENDA DE ESTADOS -->
          <div class="legend-section">
            <span class="filter-title">Estado de Reserva</span>
            <div class="legend-items">
              <div class="legend-row">
                <span class="legend-dot status-aprobada"></span>
                <span>Confirmada (Aprobada)</span>
              </div>
              <div class="legend-row">
                <span class="legend-dot status-pendiente"></span>
                <span>Pendiente de Aprobación</span>
              </div>
              <div class="legend-row">
                <span class="legend-dot status-finalizada"></span>
                <span>Finalizada</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- 3. GRILLA SEMANAL DE HORARIOS -->
        <main class="cal-grid-container" #gridContainer>
          <!-- CABECERA DE DÍAS (COLUMNAS) -->
          <div class="grid-days-header">
            <div class="time-axis-spacer">
              <span class="tz-label">GMT-05</span>
            </div>

            @for (dia of diasSemana(); track dia.fechaStr) {
              <div class="day-col-header" [class.is-today]="dia.esHoy">
                <span class="day-name">{{ dia.nombreDia }}</span>
                <div class="day-number-bubble" [class.bubble-today]="dia.esHoy">
                  {{ dia.numeroDia }}
                </div>
              </div>
            }
          </div>

          <!-- CUERPO DE HORARIOS CON LÍNEAS HORIZONTALES Y COLUMNAS -->
          <div class="grid-scrollable-body">
            <!-- COLUMNA DE EJES DE TIEMPO (7 AM a 11 PM) -->
            <div class="time-axis-col">
              @for (hora of horasDelDia; track hora.valor) {
                <div class="time-label-slot">
                  <span class="time-label-text">{{ hora.label }}</span>
                </div>
              }
            </div>

            <!-- GRILLA DE LAS 7 COLUMNAS DE DÍAS -->
            <div class="day-columns-container">
              <!-- LÍNEAS HORIZONTALES DE CADA HORA -->
              @for (hora of horasDelDia; track hora.valor) {
                <div class="grid-hour-row"></div>
              }

              <!-- COLUMNA DE CADA DÍA CON SUS EVENTOS -->
              @for (dia of diasSemana(); track dia.fechaStr) {
                <div class="day-schedule-col" (click)="onColumnaClick($event, dia.fechaStr)">
                  <!-- LÍNEA ROJA DE HORA ACTUAL (SI ES HOY) -->
                  @if (dia.esHoy && lineaHoraActualTop() !== null) {
                    <div class="current-time-line" [style.top.px]="lineaHoraActualTop()">
                      <div class="current-time-dot"></div>
                    </div>
                  }

                  <!-- BLOQUES DE EVENTOS (RESERVAS) -->
                  @for (res of getReservasParaDia(dia.fechaStr); track res.id) {
                    <div 
                      class="cal-event-block"
                      [style.top.px]="calcularTop(res.horaInicio)"
                      [style.height.px]="calcularHeight(res.horaInicio, res.horaFin)"
                      [style.background-color]="getEventBackgroundColor(res)"
                      [style.border-left-color]="getEventBorderColor(res)"
                      (click)="onEventoClick($event, res)"
                      [matTooltip]="res.canchaNombre + ': ' + res.horaInicio.slice(0,5) + ' - ' + res.horaFin.slice(0,5) + ' (' + res.estado + ')'">
                      <div class="event-title-row">
                        <span class="event-title">{{ res.canchaNombre }}</span>
                        <span class="event-status-tag" [class.tag-conf]="res.estado === 'APROBADA'">
                          {{ res.estado === 'APROBADA' ? '✓ Confirmada' : '⏳ Pendiente' }}
                        </span>
                      </div>
                      <div class="event-time-row">
                        <mat-icon class="ev-clock-icon">schedule</mat-icon>
                        <span>{{ formatHora12(res.horaInicio) }} - {{ formatHora12(res.horaFin) }}</span>
                      </div>
                      <div class="event-author-row">
                        <mat-icon class="ev-user-icon">person</mat-icon>
                        <span class="ev-tecnico">{{ res.tecnicoNombre }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </main>
      </div>

      <!-- 4. MODAL PARA AGREGAR RESERVA CON VERIFICACIÓN PREVIA -->
      @if (modalVisible()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title-box">
                <div class="modal-icon-circle">
                  <mat-icon>stadium</mat-icon>
                </div>
                <div>
                  <h3 class="modal-title">Solicitar Reserva de Cancha</h3>
                  <p class="modal-sub">Elige la cancha, fecha y horario. Se verificará en tiempo real la disponibilidad con reservas confirmadas.</p>
                </div>
              </div>
              <button type="button" class="modal-close-btn" (click)="cerrarModal()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="reservaForm" (ngSubmit)="enviarSolicitudReserva()" class="modal-body">
              <!-- SELECCIÓN DE CANCHA -->
              <div class="form-group">
                <label class="form-label">Cancha Deportiva <span class="req">*</span></label>
                <select formControlName="canchaId" class="form-control" (change)="onDatosReservaCambiaron()">
                  <option [ngValue]="null" disabled>Selecciona una cancha</option>
                  @for (c of canchas(); track c.id) {
                    <option [ngValue]="c.id">
                      {{ c.nombre }} ({{ c.tipo }}) — S/ {{ c.tarifaHora | number:'1.2-2' }}/hora
                    </option>
                  }
                </select>
              </div>

              <!-- FECHA Y HORARIOS -->
              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label">Fecha <span class="req">*</span></label>
                  <input 
                    type="date" 
                    formControlName="fecha" 
                    [min]="fechaMinimaStr" 
                    class="form-control" 
                    (change)="onDatosReservaCambiaron()" />
                </div>

                <div class="form-group">
                  <label class="form-label">Hora Inicio <span class="req">*</span></label>
                  <select formControlName="horaInicio" class="form-control" (change)="onHoraInicioCambio()">
                    @for (h of opcionesHorasInicio; track h) {
                      <option [value]="h">{{ h }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Hora Fin <span class="req">*</span></label>
                  <select formControlName="horaFin" class="form-control" (change)="onDatosReservaCambiaron()">
                    @for (h of opcionesHorasFin(); track h) {
                      <option [value]="h">{{ h }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- BANNER DE VERIFICACIÓN PREVIA SOBRE RESERVAS CONFIRMADAS -->
              <div class="verification-area">
                @if (verificandoDisponibilidad()) {
                  <div class="alert-box checking">
                    <mat-icon class="spin-icon">sync</mat-icon>
                    <span>Verificando disponibilidad de la cancha...</span>
                  </div>
                } @else if (esFechaHoraPasada()) {
                  <div class="alert-box error">
                    <mat-icon>schedule</mat-icon>
                    <div>
                      <strong>Horario en el Pasado</strong>
                      <p>No se pueden solicitar reservas para fechas u horas pasadas.</p>
                      <span class="alert-hint">Por favor selecciona un horario a partir de este momento.</span>
                    </div>
                  </div>
                } @else if (duracionInvalida()) {
                  <div class="alert-box error">
                    <mat-icon>warning</mat-icon>
                    <div>
                      <strong>Duración No Permitida</strong>
                      <p>{{ duracionInvalida() }}</p>
                      <span class="alert-hint">Las reservas deben ser de entre 1 y 3 horas en bloques de 30 min.</span>
                    </div>
                  </div>
                } @else if (conflictoConfirmado()) {
                  <div class="alert-box error">
                    <mat-icon>error</mat-icon>
                    <div>
                      <strong>Cancha NO Disponible (Cruce con Reserva Confirmada)</strong>
                      <p>
                        La <b>{{ conflictoConfirmado()!.canchaNombre }}</b> ya se encuentra <b>CONFIRMADA</b> el día <b>{{ conflictoConfirmado()!.fecha }}</b> de <b>{{ conflictoConfirmado()!.horaInicio.slice(0,5) }} a {{ conflictoConfirmado()!.horaFin.slice(0,5) }}</b> (Técnico: {{ conflictoConfirmado()!.tecnicoNombre }}).
                      </p>
                      <span class="alert-hint">Por favor selecciona otro horario o cancha disponible.</span>
                    </div>
                  </div>
                } @else if (canchaSeleccionadaValida()) {
                  <div class="alert-box success">
                    <mat-icon>check_circle</mat-icon>
                    <div>
                      <strong>¡Cancha Disponible!</strong>
                      <p>No existen reservas confirmadas en este horario para la cancha seleccionada.</p>
                    </div>
                  </div>
                }
              </div>

              <!-- RESUMEN DE MONTO Y DURACIÓN -->
              <div class="monto-summary-card">
                <div class="monto-left">
                  <span class="monto-label">Duración calculada:</span>
                  <strong class="monto-val">{{ duracionHorasCalculada() }} hora(s)</strong>
                </div>
                <div class="monto-right">
                  <span class="monto-label">Monto estimado a pagar:</span>
                  <strong class="monto-total">S/ {{ montoEstimado() | number:'1.2-2' }}</strong>
                </div>
              </div>

              <!-- COMPROBANTE DE PAGO (OPCIONAL) -->
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <label class="form-label">Comprobante de Pago (Voucher)</label>
                  <span style="font-size: 0.78rem; color: #64748b; font-weight: 600;">(Opcional)</span>
                </div>
                <div class="file-upload-box">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, application/pdf" 
                    (change)="onComprobanteSeleccionado($event)" 
                    id="comprobanteInput" 
                    class="file-input-hidden" />
                  <label for="comprobanteInput" class="file-upload-label">
                    <mat-icon>cloud_upload</mat-icon>
                    <span>{{ archivoComprobante ? archivoComprobante.name : 'Haz clic para adjuntar comprobante opcional (PNG, JPG, PDF máx 5MB)' }}</span>
                  </label>
                </div>
                @if (previewComprobante()) {
                  <div class="preview-img-box">
                    <img [src]="previewComprobante()" alt="Comprobante" />
                    <button type="button" class="btn-remove-file" (click)="removerComprobante()">Quitar</button>
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-secondary" (click)="cerrarModal()">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  class="btn-primary" 
                  [disabled]="guardando()">
                  <mat-icon>send</mat-icon>
                  <span>{{ guardando() ? 'Enviando...' : 'Confirmar y Solicitar Reserva' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .calendar-layout {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      background: #ffffff;
      overflow: hidden;
      font-family: 'Roboto', 'Segoe UI', -apple-system, sans-serif;
    }

    /* TOPBAR GOOGLE CALENDAR */
    .cal-topbar {
      height: 60px;
      padding: 0 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      z-index: 10;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .logo-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .logo-group.clickable {
      cursor: pointer;
      user-select: none;
      padding: 0.25rem 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;

      &:hover {
        background: #f1f5f9;

        .cal-icon-badge {
          transform: scale(1.06);
          box-shadow: 0 4px 10px rgba(0, 102, 255, 0.3);
        }
      }

      &:active {
        transform: scale(0.98);
      }
    }

    .cal-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #0066ff;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
    }

    .cal-icon-badge mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .cal-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .btn-today {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 0.45rem 1.1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-today:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .nav-arrows {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .arrow-btn {
      background: none;
      border: none;
      cursor: pointer;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      transition: background 0.15s ease;
    }

    .arrow-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .current-date-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      text-transform: capitalize;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .view-selector {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
    }

    .view-btn {
      background: #ffffff;
      border: none;
      padding: 0.4rem 0.85rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
    }

    .view-btn.active {
      background: #eff6ff;
      color: #0066ff;
    }

    .btn-create-top {
      display: none;
    }

    @media (max-width: 900px) {
      .btn-create-top {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        background: #0066ff;
        color: #ffffff;
        border: none;
        border-radius: 20px;
        padding: 0.45rem 1rem;
        font-weight: 600;
        cursor: pointer;
      }
    }

    /* CALENDAR MAIN AREA */
    .cal-main-area {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* SIDEBAR */
    .cal-sidebar {
      width: 256px;
      min-width: 256px;
      border-right: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      overflow-y: auto;
      transition: all 0.2s ease;

      &.collapsed {
        display: none !important;
      }
    }

    /* BOTÓN GOOGLE CREATE */
    .google-create-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      padding: 0.6rem 1.25rem 0.6rem 0.75rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06);
      cursor: pointer;
      transition: all 0.2s ease;
      width: fit-content;
    }

    .google-create-btn:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: #f8fafc;
      transform: translateY(-1px);
    }

    .google-create-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .plus-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #eff6ff;
      color: #0066ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .plus-icon-box mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .btn-text {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1e293b;
    }

    /* MINI CALENDAR */
    .mini-calendar-card {
      user-select: none;
    }

    .mini-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .mini-month-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
      text-transform: capitalize;
    }

    .mini-nav {
      display: flex;
      gap: 2px;
    }

    .mini-nav-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .mini-nav-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .mini-nav-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .mini-days-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      margin-bottom: 0.35rem;
    }

    .mini-days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    .mini-day-cell {
      background: none;
      border: none;
      height: 28px;
      width: 28px;
      margin: auto;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 500;
      color: #334155;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.1s ease;
    }

    .mini-day-cell:hover {
      background: #f1f5f9;
    }

    .mini-day-cell.other-month {
      color: #cbd5e1;
    }

    .mini-day-cell.is-today {
      background: #dbeafe;
      color: #0066ff;
      font-weight: 700;
    }

    .mini-day-cell.is-selected {
      background: #0066ff !important;
      color: #ffffff !important;
      font-weight: 700;
    }

    /* FILTROS POR CANCHA */
    .filter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.6rem;
    }

    .filter-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
    }

    .canchas-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cancha-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      color: #334155;
      cursor: pointer;
    }

    .cancha-color-square {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .legend-section {
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: 0.5rem;
      font-size: 0.78rem;
      color: #64748b;
    }

    .legend-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-aprobada { background: #10b981; }
    .status-pendiente { background: #f59e0b; }
    .status-finalizada { background: #3b82f6; }

    /* GRILLA SEMANAL */
    .cal-grid-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #ffffff;
    }

    .grid-days-header {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      padding-right: 17px; /* Compensar scrollbar */
      z-index: 5;
    }

    .time-axis-spacer {
      width: 64px;
      min-width: 64px;
      border-right: 1px solid #e2e8f0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 0.5rem;
    }

    .tz-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
    }

    .day-col-header {
      flex: 1;
      text-align: center;
      padding: 0.6rem 0.25rem;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
    }

    .day-name {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .day-number-bubble {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      font-weight: 600;
      color: #1e293b;
      transition: all 0.15s ease;
    }

    .bubble-today {
      background: #0066ff !important;
      color: #ffffff !important;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(0, 102, 255, 0.35);
    }

    /* SCROLLABLE GRID BODY */
    .grid-scrollable-body {
      flex: 1;
      overflow-y: scroll;
      display: flex;
      position: relative;
    }

    .time-axis-col {
      width: 64px;
      min-width: 64px;
      border-right: 1px solid #e2e8f0;
      background: #ffffff;
      user-select: none;
    }

    .time-label-slot {
      height: 60px;
      position: relative;
    }

    .time-label-text {
      position: absolute;
      top: -9px;
      right: 8px;
      font-size: 0.72rem;
      font-weight: 500;
      color: #64748b;
    }

    .day-columns-container {
      flex: 1;
      display: flex;
      position: relative;
      background: #ffffff;
      height: 1020px; /* 17 horas * 60px */
    }

    .grid-hour-row {
      position: absolute;
      left: 0;
      right: 0;
      height: 60px;
      border-bottom: 1px solid #f1f5f9;
      pointer-events: none;
    }

    /* Repetir líneas horizontales */
    @for $i from 0 through 16 {
      .grid-hour-row:nth-child(#{$i + 1}) {
        top: #{$i * 60}px;
      }
    }

    .day-schedule-col {
      flex: 1;
      border-right: 1px solid #e2e8f0;
      position: relative;
      height: 100%;
      cursor: pointer;
    }

    .day-schedule-col:hover {
      background: rgba(0, 102, 255, 0.015);
    }

    /* CURRENT TIME RED LINE */
    .current-time-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #ea4335;
      z-index: 8;
      pointer-events: none;
    }

    .current-time-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ea4335;
      position: absolute;
      left: -5px;
      top: -4px;
    }

    /* EVENT BLOCK */
    .cal-event-block {
      position: absolute;
      left: 4px;
      right: 4px;
      border-radius: 6px;
      padding: 0.4rem 0.5rem;
      color: #ffffff;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      border-left: 4px solid #ffffff;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      cursor: pointer;
      z-index: 6;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
    }

    .cal-event-block:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
      z-index: 9;
    }

    .event-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
    }

    .event-title {
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-status-tag {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      background: rgba(0,0,0,0.2);
      white-space: nowrap;
    }

    .event-status-tag.tag-conf {
      background: rgba(255,255,255,0.3);
    }

    .event-time-row, .event-author-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      opacity: 0.95;
    }

    .ev-clock-icon, .ev-user-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
    }

    .ev-tecnico {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* MODAL FORMULARIO */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalPop {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #0066ff;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-title {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: #0f172a;
    }

    .modal-sub {
      margin: 0.15rem 0 0;
      font-size: 0.78rem;
      color: #64748b;
    }

    .modal-close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      display: flex;
      padding: 4px;
      border-radius: 50%;
    }

    .modal-close-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .req {
      color: #ef4444;
    }

    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.55rem 0.75rem;
      font-size: 0.9rem;
      color: #1e293b;
      outline: none;
      background: #ffffff;
      transition: border-color 0.15s ease;
    }

    .form-control:focus {
      border-color: #0066ff;
      box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.15);
    }

    .form-grid-3 {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 0.75rem;
    }

    /* VERIFICATION BANNER */
    .verification-area {
      margin: 0.25rem 0;
    }

    .alert-box {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .alert-box.checking {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #475569;
      align-items: center;
    }

    .alert-box.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert-box.error mat-icon {
      color: #dc2626;
      flex-shrink: 0;
    }

    .alert-box.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .alert-box.success mat-icon {
      color: #16a34a;
      flex-shrink: 0;
    }

    .alert-hint {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: underline;
    }

    /* MONTO CARD */
    .monto-summary-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .monto-left, .monto-right {
      display: flex;
      flex-direction: column;
    }

    .monto-label {
      font-size: 0.75rem;
      color: #64748b;
    }

    .monto-val {
      font-size: 0.95rem;
      color: #1e293b;
    }

    .monto-total {
      font-size: 1.2rem;
      color: #16a34a;
      font-weight: 800;
    }

    /* FILE UPLOAD */
    .file-input-hidden {
      display: none;
    }

    .file-upload-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      color: #0066ff;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .file-upload-label:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }

    .preview-img-box {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .preview-img-box img {
      max-height: 60px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    .btn-remove-file {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }

    .btn-secondary {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.6rem 1.25rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #f1f5f9;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #0066ff;
      border: none;
      border-radius: 6px;
      padding: 0.6rem 1.5rem;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 102, 255, 0.3);
      transition: all 0.15s ease;
    }

    .btn-primary:hover {
      background: #0052cc;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class ReservasCalendarioComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Control de visibilidad del panel lateral (Nueva Reserva, Mini Calendario, Filtros)
  readonly mostrarSidebarLateral = signal<boolean>(true);

  toggleSidebarLateral(): void {
    this.mostrarSidebarLateral.update(v => !v);
  }

  // Fecha pivote para la navegación (inicia en hoy)
  fechaPivote = signal<Date>(new Date());
  fechaMiniPivote = signal<Date>(new Date());

  canchas = signal<Cancha[]>([]);
  todasLasReservas = signal<Reserva[]>([]);
  cargando = signal<boolean>(false);

  // Filtros de canchas activas (Set de IDs)
  canchasActivasIds = signal<Set<number>>(new Set([1, 2, 3]));

  // Horas operativas del calendario: 7:00 a 23:00
  horasDelDia = [
    { valor: 7, label: '7 AM' },
    { valor: 8, label: '8 AM' },
    { valor: 9, label: '9 AM' },
    { valor: 10, label: '10 AM' },
    { valor: 11, label: '11 AM' },
    { valor: 12, label: '12 PM' },
    { valor: 13, label: '1 PM' },
    { valor: 14, label: '2 PM' },
    { valor: 15, label: '3 PM' },
    { valor: 16, label: '4 PM' },
    { valor: 17, label: '5 PM' },
    { valor: 18, label: '6 PM' },
    { valor: 19, label: '7 PM' },
    { valor: 20, label: '8 PM' },
    { valor: 21, label: '9 PM' },
    { valor: 22, label: '10 PM' },
    { valor: 23, label: '11 PM' }
  ];

  // Opciones de selector de horas (en bloques de 30 min)
  opcionesHorasInicio = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  fechaMinimaStr = this.formatDateIso(new Date());

  // Opciones dinámicas de hora fin según la hora de inicio seleccionada (1h a 3h en pasos de 30m)
  opcionesHorasFin = computed(() => {
    const ini = this.reservaForm?.get('horaInicio')?.value || '19:00';
    const parts = ini.split(':');
    const iniMins = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    const validEnds: string[] = [];
    for (let dur = 60; dur <= 180; dur += 30) {
      const endMins = iniMins + dur;
      if (endMins <= 23 * 60 + 30) {
        const h = Math.floor(endMins / 60);
        const m = endMins % 60;
        validEnds.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return validEnds.length > 0 ? validEnds : ['20:30', '21:00', '21:30', '22:00'];
  });

  // Modal State
  modalVisible = signal<boolean>(false);
  guardando = signal<boolean>(false);
  verificandoDisponibilidad = signal<boolean>(false);
  conflictoConfirmado = signal<Reserva | null>(null);
  esFechaHoraPasada = signal<boolean>(false);
  duracionInvalida = signal<string | null>(null);

  archivoComprobante: File | null = null;
  previewComprobante = signal<string | null>(null);

  reservaForm: FormGroup = this.fb.group({
    canchaId: [null, Validators.required],
    fecha: [this.fechaMinimaStr, Validators.required],
    horaInicio: ['19:00', Validators.required],
    horaFin: ['20:30', Validators.required]
  });

  // Cálculo de los 7 días de la semana visible
  diasSemana = computed(() => {
    const pivote = this.fechaPivote();
    // Obtener el Domingo o Lunes de la semana
    const curr = new Date(pivote);
    const day = curr.getDay(); // 0 = Domingo
    const diff = curr.getDate() - day; // Domingo de esta semana
    const sunday = new Date(curr.setDate(diff));

    const dias: DiaSemana[] = [];
    const nombres = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const hoyStr = this.formatDateIso(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const str = this.formatDateIso(d);
      dias.push({
        fecha: d,
        fechaStr: str,
        nombreDia: nombres[i],
        numeroDia: d.getDate(),
        esHoy: str === hoyStr
      });
    }
    return dias;
  });

  // Título del mes y año en la cabecera
  tituloMesAno = computed(() => {
    const d = this.fechaPivote();
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  });

  tituloMiniMes = computed(() => {
    const d = this.fechaMiniPivote();
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[d.getMonth()]} ${d.getFullYear()}`;
  });

  // Generador de días para el mini calendario (7x6 semanas)
  miniDias = computed(() => {
    const pivote = this.fechaMiniPivote();
    const year = pivote.getFullYear();
    const month = pivote.getMonth();

    const primerDiaMes = new Date(year, month, 1);
    const primerDiaSemana = primerDiaMes.getDay(); // 0 a 6

    const fechaInicio = new Date(primerDiaMes);
    fechaInicio.setDate(fechaInicio.getDate() - primerDiaSemana);

    const dias: MiniDia[] = [];
    const hoyStr = this.formatDateIso(new Date());
    const selStr = this.formatDateIso(this.fechaPivote());

    for (let i = 0; i < 42; i++) {
      const d = new Date(fechaInicio);
      d.setDate(fechaInicio.getDate() + i);
      const dStr = this.formatDateIso(d);

      dias.push({
        fecha: d,
        diaNum: d.getDate(),
        fechaStr: dStr,
        esMesActual: d.getMonth() === month,
        esHoy: dStr === hoyStr,
        esSeleccionado: dStr === selStr
      });
    }
    return dias;
  });

  // Posición en px de la línea roja de la hora actual
  lineaHoraActualTop = computed(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < 7 || h >= 24) return null;
    return (h - 7) * 60 + m;
  });

  canchaSeleccionadaValida = computed(() => {
    const cId = this.reservaForm.get('canchaId')?.value;
    return cId !== null && cId !== undefined;
  });

  duracionHorasCalculada = computed(() => {
    const ini = this.reservaForm.get('horaInicio')?.value;
    const fin = this.reservaForm.get('horaFin')?.value;
    if (!ini || !fin) return 1.5;
    const durMins = this.timeToMinutes(fin) - this.timeToMinutes(ini);
    return Math.max(0, Math.round((durMins / 60) * 10) / 10);
  });

  montoEstimado = computed(() => {
    const cId = this.reservaForm.get('canchaId')?.value;
    if (!cId) return 0;
    const cancha = this.canchas().find(c => c.id === cId);
    if (!cancha) return 0;
    return cancha.tarifaHora * this.duracionHorasCalculada();
  });

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.cargarCanchas();
        this.cargarReservas();
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.cargarCanchas();
      this.cargarReservas();
    }
  }

  cargarCanchas(): void {
    if (!this.authService.isAuthenticated()) return;
    this.encuentrosService.getCanchas().subscribe({
      next: (data) => {
        this.canchas.set(data);
        if (data.length > 0) {
          this.canchasActivasIds.set(new Set(data.map(c => c.id)));
          if (!this.reservaForm.get('canchaId')?.value) {
            this.reservaForm.patchValue({ canchaId: data[0].id });
          }
        }
      },
      error: () => {}
    });
  }

  cargarReservas(): void {
    if (!this.authService.isAuthenticated()) return;
    this.cargando.set(true);
    this.encuentrosService.getCalendario().subscribe({
      next: (data) => {
        this.todasLasReservas.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  // Navegación de semana
  irAHoy(): void {
    const hoy = new Date();
    this.fechaPivote.set(hoy);
    this.fechaMiniPivote.set(new Date(hoy));
  }

  semanaAnterior(): void {
    const curr = new Date(this.fechaPivote());
    curr.setDate(curr.getDate() - 7);
    this.fechaPivote.set(curr);
    this.fechaMiniPivote.set(new Date(curr));
  }

  semanaSiguiente(): void {
    const curr = new Date(this.fechaPivote());
    curr.setDate(curr.getDate() + 7);
    this.fechaPivote.set(curr);
    this.fechaMiniPivote.set(new Date(curr));
  }

  // Navegación mini calendar
  mesMiniAnterior(): void {
    const curr = new Date(this.fechaMiniPivote());
    curr.setMonth(curr.getMonth() - 1);
    this.fechaMiniPivote.set(curr);
  }

  mesMiniSiguiente(): void {
    const curr = new Date(this.fechaMiniPivote());
    curr.setMonth(curr.getMonth() + 1);
    this.fechaMiniPivote.set(curr);
  }

  seleccionarDiaMini(fecha: Date): void {
    this.fechaPivote.set(new Date(fecha));
    this.fechaMiniPivote.set(new Date(fecha));
  }

  toggleCanchaFiltro(canchaId: number): void {
    this.canchasActivasIds.update(set => {
      const nuevo = new Set(set);
      if (nuevo.has(canchaId)) {
        nuevo.delete(canchaId);
      } else {
        nuevo.add(canchaId);
      }
      return nuevo;
    });
  }

  // Filtrado de eventos para la grilla
  getReservasParaDia(fechaStr: string): Reserva[] {
    const activas = this.canchasActivasIds();
    return this.todasLasReservas().filter(r => 
      r.fecha === fechaStr && 
      activas.has(r.canchaId) &&
      r.estado !== 'RECHAZADA' && 
      r.estado !== 'CANCELADA'
    );
  }

  // Cálculos de posición en píxeles (7 AM = 0px, 60px por hora)
  calcularTop(horaInicio: string): number {
    const parts = horaInicio.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return Math.max(0, (h - 7) * 60 + m);
  }

  calcularHeight(horaInicio: string, horaFin: string): number {
    const durMins = this.timeToMinutes(horaFin) - this.timeToMinutes(horaInicio);
    return Math.max(28, durMins - 2);
  }

  getCanchaColor(canchaId: number): string {
    switch (canchaId) {
      case 1: return '#0284c7'; // Azul Cancha 1
      case 2: return '#10b981'; // Verde Cancha 2
      case 3: return '#8b5cf6'; // Morado Cancha 3
      default: return '#0066ff';
    }
  }

  getEventBackgroundColor(res: Reserva): string {
    if (res.estado === 'PENDIENTE') {
      return '#d97706'; // Ámbar si es pendiente
    }
    return this.getCanchaColor(res.canchaId);
  }

  getEventBorderColor(res: Reserva): string {
    if (res.estado === 'PENDIENTE') {
      return '#b45309';
    }
    return '#ffffff';
  }

  formatHora12(hora24: string): string {
    const parts = hora24.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  // Interacción al hacer clic en un espacio vacío de la grilla
  onColumnaClick(event: MouseEvent, fechaStr: string): void {
    // Si hizo clic en un evento existente, no abrir modal nuevo
    if ((event.target as HTMLElement).closest('.cal-event-block')) {
      return;
    }

    if (this.authService.isTecnicoPendiente()) {
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta Pendiente de Aprobación',
        text: 'Tu usuario técnico está en revisión por un administrador. No puedes solicitar reservas hasta ser activado.',
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    // Calcular la hora clicada según la posición Y relativa
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const horaCalculada = Math.floor(offsetY / 60) + 7;
    const horaClamped = Math.min(Math.max(horaCalculada, 7), 21);

    const horaIni = `${horaClamped.toString().padStart(2, '0')}:00`;
    const horaFin = `${(horaClamped + 1).toString().padStart(2, '0')}:30`;

    this.abrirModalNuevaReserva(fechaStr, horaIni, horaFin);
  }

  // Interacción al hacer clic en un evento existente
  onEventoClick(event: MouseEvent, res: Reserva): void {
    event.stopPropagation();

    const esAprobada = res.estado === 'APROBADA';
    const statusColor = esAprobada ? '#10b981' : '#f59e0b';

    Swal.fire({
      title: `<div style="display:flex; align-items:center; gap:8px; justify-content:center;">
                <span style="font-size: 1.4rem;">🏟️</span>
                <span>${res.canchaNombre}</span>
              </div>`,
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.8; padding: 0.5rem 0.25rem;">
          <p style="margin: 0.2rem 0;"><b>📅 Fecha:</b> ${res.fecha}</p>
          <p style="margin: 0.2rem 0;"><b>⏰ Horario:</b> ${this.formatHora12(res.horaInicio)} - ${this.formatHora12(res.horaFin)}</p>
          <p style="margin: 0.2rem 0;"><b>👤 Técnico:</b> ${res.tecnicoNombre}</p>
          <p style="margin: 0.2rem 0;"><b>💰 Monto:</b> S/ ${res.monto.toFixed(2)}</p>
          <p style="margin: 0.2rem 0;">
            <b>📌 Estado:</b> 
            <span style="background: ${statusColor}; color: #ffffff; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 0.75rem;">
              ${res.estado}
            </span>
          </p>
          ${res.enConflicto ? `<p style="color: #ef4444; font-weight: 700;">⚠️ Solicitud en conflicto con otra reserva</p>` : ''}
        </div>
      `,
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      cancelButtonColor: '#64748b',
      showConfirmButton: false
    });
  }

  // APERTURA DE MODAL Y VERIFICACIÓN PREVIA
  abrirModalNuevaReserva(fechaDefault?: string, horaIniDefault?: string, horaFinDefault?: string): void {
    if (this.authService.isTecnicoPendiente()) {
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta Pendiente de Aprobación',
        text: 'Tu usuario técnico está en revisión por un administrador. No puedes solicitar reservas hasta ser activado.',
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    const canchasList = this.canchas();
    const canchaIdInicial = canchasList.length > 0 ? canchasList[0].id : 1;

    const now = new Date();
    const hoyStr = this.formatDateIso(now);
    let f = fechaDefault || hoyStr;

    // Calcular hora de inicio predeterminada válida (no en el pasado)
    let hIni = horaIniDefault;
    if (!hIni) {
      if (f === hoyStr) {
        const nextHour = now.getHours() + 1;
        if (nextHour >= 22) {
          const manana = new Date(now);
          manana.setDate(manana.getDate() + 1);
          f = this.formatDateIso(manana);
          hIni = '10:00';
        } else {
          const hourToUse = Math.max(nextHour, 8);
          hIni = `${hourToUse.toString().padStart(2, '0')}:00`;
        }
      } else {
        hIni = '19:00';
      }
    }

    // Calcular horaFin inicial (+1.5h)
    let hFin = horaFinDefault;
    if (!hFin) {
      const iniMins = this.timeToMinutes(hIni);
      const finMins = iniMins + 90;
      const h = Math.floor(finMins / 60);
      const m = finMins % 60;
      hFin = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    this.reservaForm.reset({
      canchaId: canchaIdInicial,
      fecha: f,
      horaInicio: hIni,
      horaFin: hFin
    });

    this.archivoComprobante = null;
    this.previewComprobante.set(null);
    this.esFechaHoraPasada.set(false);
    this.duracionInvalida.set(null);
    this.conflictoConfirmado.set(null);
    this.modalVisible.set(true);

    this.verificarDisponibilidadPrevia();
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.conflictoConfirmado.set(null);
    this.esFechaHoraPasada.set(false);
    this.duracionInvalida.set(null);
    this.archivoComprobante = null;
    this.previewComprobante.set(null);
  }

  onHoraInicioCambio(): void {
    const ini = this.reservaForm.get('horaInicio')?.value;
    if (ini) {
      const validEnds = this.opcionesHorasFin();
      const currentFin = this.reservaForm.get('horaFin')?.value;
      if (!validEnds.includes(currentFin)) {
        const nuevoFin = validEnds.length > 1 ? validEnds[1] : (validEnds[0] || '20:30');
        this.reservaForm.patchValue({ horaFin: nuevoFin }, { emitEvent: false });
      }
    }
    this.verificarDisponibilidadPrevia();
  }

  onDatosReservaCambiaron(): void {
    this.verificarDisponibilidadPrevia();
  }

  // VERIFICACIÓN PREVIA: Verifica horario pasado, duración (1h a 3h) y cruce con reservas confirmadas (APROBADA)
  verificarDisponibilidadPrevia(): void {
    const cId = this.reservaForm.get('canchaId')?.value;
    const fecha = this.reservaForm.get('fecha')?.value;
    const hIni = this.reservaForm.get('horaInicio')?.value;
    const hFin = this.reservaForm.get('horaFin')?.value;

    if (!cId || !fecha || !hIni || !hFin) {
      this.conflictoConfirmado.set(null);
      this.esFechaHoraPasada.set(false);
      this.duracionInvalida.set(null);
      return;
    }

    const iniMins = this.timeToMinutes(hIni);
    const finMins = this.timeToMinutes(hFin);

    // 1. Validar fecha y hora en el pasado
    const now = new Date();
    const hoyStr = this.formatDateIso(now);
    const ahoraMins = now.getHours() * 60 + now.getMinutes();

    if (fecha < hoyStr || (fecha === hoyStr && iniMins <= ahoraMins)) {
      this.esFechaHoraPasada.set(true);
      this.duracionInvalida.set(null);
      this.conflictoConfirmado.set(null);
      return;
    } else {
      this.esFechaHoraPasada.set(false);
    }

    // 2. Validar duración entre 1h (60 min) y 3h (180 min)
    const durMins = finMins - iniMins;
    if (durMins < 60 || durMins > 180) {
      this.duracionInvalida.set(
        durMins <= 0
          ? 'La hora de fin debe ser posterior a la hora de inicio.'
          : durMins < 60
            ? 'La duración mínima de reserva es de 1 hora.'
            : 'La duración máxima de reserva es de 3 horas.'
      );
      this.conflictoConfirmado.set(null);
      return;
    } else {
      this.duracionInvalida.set(null);
    }

    this.verificandoDisponibilidad.set(true);

    // 3. Verificación local inmediata sobre reservas confirmadas (APROBADA)
    const cruceLocal = this.todasLasReservas().find(r => 
      r.canchaId === cId &&
      r.fecha === fecha &&
      r.estado === 'APROBADA' && // VERIFICACIÓN ESTRICTA SOBRE CONFIRMADAS
      !(finMins <= this.timeToMinutes(r.horaInicio) || iniMins >= this.timeToMinutes(r.horaFin))
    );

    if (cruceLocal) {
      this.conflictoConfirmado.set(cruceLocal);
      this.verificandoDisponibilidad.set(false);
      return;
    }

    // 4. Doble verificación mediante API backend
    this.encuentrosService.verificarDisponibilidad(cId, fecha, hIni, hFin).subscribe({
      next: (res) => {
        if (!res.disponible) {
          const canchaObj = this.canchas().find(c => c.id === cId);
          const fakeConflicto: Reserva = {
            id: 0,
            canchaId: cId,
            canchaNombre: canchaObj ? canchaObj.nombre : 'Cancha',
            canchaTipo: '',
            tecnicoId: '',
            tecnicoNombre: 'Reserva Confirmada Previa',
            tecnicoEmail: '',
            fecha,
            horaInicio: hIni,
            horaFin: hFin,
            monto: 0,
            estado: 'APROBADA',
            creadaEn: '',
            actualizadaEn: ''
          };
          this.conflictoConfirmado.set(fakeConflicto);
        } else {
          this.conflictoConfirmado.set(null);
        }
        this.verificandoDisponibilidad.set(false);
      },
      error: () => {
        this.verificandoDisponibilidad.set(false);
      }
    });
  }

  onComprobanteSeleccionado(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'warning',
          title: 'Archivo muy grande',
          text: 'El comprobante de pago no debe superar los 5MB.',
          confirmButtonColor: '#0066ff'
        });
        return;
      }

      this.archivoComprobante = file;

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => this.previewComprobante.set(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        this.previewComprobante.set(null);
      }
    }
  }

  removerComprobante(): void {
    this.archivoComprobante = null;
    this.previewComprobante.set(null);
  }

  // ENVÍO DE FORMULARIO USANDO SWEETALERT2
  enviarSolicitudReserva(): void {
    if (this.reservaForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos Incompletos',
        text: 'Por favor selecciona la cancha, fecha y horas requeridas.',
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    if (this.esFechaHoraPasada()) {
      Swal.fire({
        icon: 'warning',
        title: 'Horario en el Pasado',
        text: 'No se pueden solicitar reservas para fechas u horas pasadas. Elige un horario a partir de este momento.',
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    if (this.duracionInvalida()) {
      Swal.fire({
        icon: 'warning',
        title: 'Duración no permitida',
        text: this.duracionInvalida()!,
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    // Si existe conflicto confirmado
    if (this.conflictoConfirmado()) {
      const conf = this.conflictoConfirmado()!;
      Swal.fire({
        icon: 'error',
        title: 'Horario Ocupado',
        html: `La cancha <b>${conf.canchaNombre}</b> ya cuenta con una reserva confirmada el <b>${conf.fecha}</b> de <b>${conf.horaInicio.slice(0,5)} a ${conf.horaFin.slice(0,5)}</b>.<br><br>Por favor selecciona otro horario o cancha disponible.`,
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const fVal = this.reservaForm.value;
    const cancha = this.canchas().find(c => c.id === fVal.canchaId);
    const monto = this.montoEstimado();
    const duracion = this.duracionHorasCalculada();
    const nombreVoucher = this.archivoComprobante ? this.archivoComprobante.name : 'Sin comprobante (Opcional)';

    // Diálogo de confirmación SweetAlert2
    Swal.fire({
      title: '¿Confirmar Solicitud de Reserva?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.7; padding: 0.5rem 0.25rem;">
          <p style="margin: 0.25rem 0;"><b>🏟️ Cancha:</b> ${cancha?.nombre || 'Cancha'} (${cancha?.tipo})</p>
          <p style="margin: 0.25rem 0;"><b>📅 Fecha:</b> ${fVal.fecha}</p>
          <p style="margin: 0.25rem 0;"><b>⏰ Horario:</b> ${this.formatHora12(fVal.horaInicio)} a ${this.formatHora12(fVal.horaFin)} (${duracion} h)</p>
          <p style="margin: 0.25rem 0;"><b>💰 Monto Estimado:</b> <span style="color:#16a34a; font-weight:800; font-size:1.1rem;">S/ ${monto.toFixed(2)}</span></p>
          <p style="margin: 0.25rem 0;"><b>📎 Voucher:</b> ${nombreVoucher}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0066ff',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, registrar reserva',
      cancelButtonText: 'Revisar datos'
    }).then((result) => {
      if (result.isConfirmed) {
        this.guardando.set(true);

        Swal.fire({
          title: 'Registrando reserva...',
          text: 'Enviando solicitud al servidor...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const formData = new FormData();
        formData.append('canchaId', fVal.canchaId.toString());
        formData.append('fecha', fVal.fecha);
        formData.append('horaInicio', fVal.horaInicio);
        formData.append('horaFin', fVal.horaFin);
        if (this.archivoComprobante) {
          formData.append('comprobante', this.archivoComprobante);
        }

        this.encuentrosService.solicitarReserva(formData).subscribe({
          next: (nueva) => {
            this.guardando.set(false);
            this.cerrarModal();
            this.cargarReservas();

            Swal.fire({
              icon: 'success',
              title: '¡Reserva Registrada con Éxito!',
              html: `Tu reserva para la <b>${nueva.canchaNombre}</b> ha sido registrada exitosamente.<br><b>Fecha:</b> ${nueva.fecha}<br><b>Horario:</b> ${nueva.horaInicio.slice(0,5)} a ${nueva.horaFin.slice(0,5)}<br><b>Estado:</b> ${nueva.estado}`,
              confirmButtonColor: '#0066ff'
            });
          },
          error: (err) => {
            this.guardando.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error al procesar reserva',
              text: err.error?.message || err.message || 'No se pudo registrar la reserva. Revisa los datos ingresados.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  // Helpers
  private formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private timeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
}
