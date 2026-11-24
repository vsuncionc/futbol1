import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cancha, Reserva } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="reservas-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <span class="page-tag">Módulo Encuentros</span>
          <h1 class="page-title">Mis Reservas</h1>
          <p class="page-desc">Consulta el estado de tus reservas de canchas y solicita nuevos horarios con tu comprobante.</p>
        </div>

        <a routerLink="/encuentros/reservas" mat-flat-button color="primary" class="btn-nueva">
          <mat-icon>calendar_month</mat-icon>
          <span>Calendario y Nueva Reserva</span>
        </a>
      </div>

      <!-- ALERTA SI ESTÁ PENDIENTE DE APROBACIÓN -->
      @if (authService.isTecnicoPendiente()) {
        <div class="pending-warning-box">
          <mat-icon>hourglass_top</mat-icon>
          <div>
            <strong>Cuenta en espera de aprobación</strong>
            <p>Tu perfil de técnico está en revisión por un administrador. No podrás solicitar reservas ni registrar jugadores hasta ser aprobado.</p>
          </div>
        </div>
      }

      <!-- PANEL DE FILTROS Y BÚSQUEDA -->
      <div class="filters-card">
        <!-- Fila principal: Búsqueda por texto, selector de Cancha y Ordenamiento -->
        <div class="filters-main-row">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input 
              type="text" 
              [value]="filtroTexto()" 
              (input)="filtroTexto.set($any($event.target).value)" 
              placeholder="Buscar por técnico, cancha (ej. Cancha 1, F5), fecha o estado..." 
            />
            @if (filtroTexto()) {
              <button type="button" class="clear-btn" (click)="filtroTexto.set('')" matTooltip="Limpiar texto">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <div class="select-wrapper">
            <mat-icon class="select-icon">stadium</mat-icon>
            <select [value]="filtroCanchaId() ?? 0" (change)="onCanchaChange($any($event.target).value)" class="filter-select">
              <option [value]="0">Todas las canchas</option>
              @for (c of canchas(); track c.id) {
                <option [value]="c.id">{{ c.nombre }} ({{ c.tipo }})</option>
              }
            </select>
          </div>

          <div class="select-wrapper">
            <mat-icon class="select-icon">sort</mat-icon>
            <select [value]="ordenSeleccionado()" (change)="ordenSeleccionado.set($any($event.target).value)" class="filter-select">
              <option value="fecha_asc">Fecha: Próximas primero</option>
              <option value="fecha_desc">Fecha: Más lejanas primero</option>
              <option value="monto_desc">Monto: Mayor a menor</option>
              <option value="monto_asc">Monto: Menor a mayor</option>
            </select>
          </div>

          @if (hayFiltrosActivos()) {
            <button type="button" class="btn-clear-all" (click)="limpiarFiltros()" matTooltip="Restablecer todos los filtros">
              <mat-icon>filter_alt_off</mat-icon>
              <span>Limpiar Filtros</span>
            </button>
          }
        </div>

        <!-- Fila de Chips interactivos de Estado con conteo -->
        <div class="filter-chips-row">
          <button 
            type="button" 
            class="state-chip" 
            [class.active]="filtroEstado() === 'TODOS'" 
            (click)="filtroEstado.set('TODOS')">
            Todos
            <span class="chip-count">{{ conteoPorEstado().TODOS }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-pendiente" 
            [class.active]="filtroEstado() === 'PENDIENTE'" 
            (click)="filtroEstado.set('PENDIENTE')">
            Pendientes
            <span class="chip-count">{{ conteoPorEstado().PENDIENTE }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-aprobada" 
            [class.active]="filtroEstado() === 'APROBADA'" 
            (click)="filtroEstado.set('APROBADA')">
            Aprobadas
            <span class="chip-count">{{ conteoPorEstado().APROBADA }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-rechazada" 
            [class.active]="filtroEstado() === 'RECHAZADA'" 
            (click)="filtroEstado.set('RECHAZADA')">
            Rechazadas
            <span class="chip-count">{{ conteoPorEstado().RECHAZADA }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-cancelada" 
            [class.active]="filtroEstado() === 'CANCELADA'" 
            (click)="filtroEstado.set('CANCELADA')">
            Canceladas
            <span class="chip-count">{{ conteoPorEstado().CANCELADA }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-finalizada" 
            [class.active]="filtroEstado() === 'FINALIZADA'" 
            (click)="filtroEstado.set('FINALIZADA')">
            Finalizadas
            <span class="chip-count">{{ conteoPorEstado().FINALIZADA }}</span>
          </button>
        </div>

        <!-- Fila de Rango de Fecha y accesos directos -->
        <div class="date-filter-row">
          <div class="date-inputs">
            <div class="date-group">
              <label>Desde:</label>
              <input 
                type="date" 
                [value]="filtroFechaDesde()" 
                (input)="filtroFechaDesde.set($any($event.target).value)" 
                class="date-input" 
              />
            </div>
            <div class="date-group">
              <label>Hasta:</label>
              <input 
                type="date" 
                [value]="filtroFechaHasta()" 
                (input)="filtroFechaHasta.set($any($event.target).value)" 
                class="date-input" 
              />
            </div>
          </div>

          <div class="preset-buttons">
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('todas')">Todas las fechas</button>
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('proximas')">Próximas</button>
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('hoy')">Hoy</button>
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('mes')">Este Mes</button>
          </div>

          <div class="stats-counter">
            Mostrando <strong>{{ reservasFiltradas().length }}</strong> de <strong>{{ reservas().length }}</strong> reservas
          </div>
        </div>
      </div>

      <!-- LISTA DE RESERVAS -->
      @if (cargando()) {
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <span>Cargando tus reservas...</span>
        </div>
      } @else if (reservas().length === 0) {
        <div class="empty-state">
          <mat-icon>event_busy</mat-icon>
          <h3>Aún no tienes reservas solicitadas</h3>
          <p>Solicita una cancha adjuntando tu comprobante de pago para comenzar a organizar encuentros.</p>
          <a routerLink="/encuentros/reservas" mat-flat-button color="primary">
            <mat-icon>calendar_month</mat-icon>
            <span>Ver Calendario y Reservar Cancha</span>
          </a>
        </div>
      } @else if (reservasFiltradas().length === 0) {
        <div class="no-results-state">
          <div class="no-results-icon">
            <mat-icon>search_off</mat-icon>
          </div>
          <h3>No se encontraron reservas</h3>
          <p>Ninguna reserva coincide con los filtros aplicados (búsqueda, estado, cancha o rango de fechas).</p>
          <button mat-stroked-button color="primary" (click)="limpiarFiltros()">
            <mat-icon>refresh</mat-icon>
            <span>Restablecer Filtros</span>
          </button>
        </div>
      } @else {
        <div class="reservas-grid">
          @for (r of reservasFiltradas(); track r.id) {
            <div class="reserva-card" [class.border-rechazada]="r.estado === 'RECHAZADA'">
              <div class="reserva-header">
                <div class="pitch-info">
                  <div class="pitch-icon">
                    <mat-icon>stadium</mat-icon>
                  </div>
                  <div>
                    <h3 class="pitch-title">{{ r.canchaNombre }}</h3>
                    <span class="pitch-type">{{ r.canchaTipo }} · S/ {{ r.monto }}</span>
                  </div>
                </div>

                <span class="status-chip" [ngClass]="'chip-' + r.estado.toLowerCase()">
                  {{ r.estado }}
                </span>
              </div>

              <div class="reserva-meta">
                <div class="meta-row tecnico-row">
                  <mat-icon>person</mat-icon>
                  <span>Técnico: <strong>{{ r.tecnicoNombre || 'Sin asignar' }}</strong></span>
                </div>
                <div class="meta-row">
                  <mat-icon>calendar_today</mat-icon>
                  <span>Fecha: <strong>{{ r.fecha }}</strong></span>
                </div>
                <div class="meta-row">
                  <mat-icon>schedule</mat-icon>
                  <span>Horario: <strong>{{ r.horaInicio.slice(0,5) }} - {{ r.horaFin.slice(0,5) }}</strong></span>
                </div>
                @if (r.comprobanteUrl) {
                  <div class="meta-row">
                    <mat-icon>receipt_long</mat-icon>
                    <a [href]="getComprobanteLink(r.id)" target="_blank" class="receipt-link">
                      Ver Comprobante Adjunto
                    </a>
                  </div>
                }
              </div>

              <!-- Motivo de rechazo si aplica -->
              @if (r.estado === 'RECHAZADA' && r.motivoRechazo) {
                <div class="rejection-box">
                  <mat-icon>info</mat-icon>
                  <span><strong>Motivo de rechazo:</strong> {{ r.motivoRechazo }}</span>
                </div>
              }

              <!-- Footer de acciones -->
              <div class="card-footer">
                @if (r.estado === 'APROBADA') {
                  <a routerLink="/encuentros/eventos/nuevo" mat-flat-button color="primary" class="btn-sm">
                    <mat-icon>add</mat-icon>
                    <span>Crear Encuentro</span>
                  </a>
                }

                @if (r.estado === 'PENDIENTE' || r.estado === 'APROBADA') {
                  <button mat-stroked-button color="warn" class="btn-sm" (click)="cancelarReserva(r.id)">
                    <mat-icon>cancel</mat-icon>
                    <span>Cancelar</span>
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- MODAL SOLICITUD DE RESERVA -->
      @if (mostrarModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Solicitar Nueva Reserva</h2>
              <button mat-icon-button (click)="cerrarModal()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="solicitudForm" (ngSubmit)="enviarSolicitud()" class="modal-form">
              <mat-form-field appearance="outline">
                <mat-label>Selecciona la Cancha</mat-label>
                <mat-select formControlName="canchaId" (selectionChange)="actualizarMontoEstimado()">
                  @for (c of canchas(); track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }} ({{ c.tipo }} - S/ {{ c.tarifaHora }}/h)</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Fecha de Reserva</mat-label>
                <input matInput type="date" formControlName="fecha">
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline" class="form-col">
                  <mat-label>Hora de Inicio</mat-label>
                  <mat-select formControlName="horaInicio" (selectionChange)="actualizarMontoEstimado()">
                    @for (h of horariosDisponibles; track h) {
                      <mat-option [value]="h">{{ h }}</mat-option>
                    }
                  </mat-select>
                  <mat-icon matIconSuffix>schedule</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="form-col">
                  <mat-label>Hora de Fin</mat-label>
                  <mat-select formControlName="horaFin" (selectionChange)="actualizarMontoEstimado()">
                    @for (h of horariosDisponibles; track h) {
                      <mat-option [value]="h">{{ h }}</mat-option>
                    }
                  </mat-select>
                  <mat-icon matIconSuffix>schedule</mat-icon>
                </mat-form-field>
              </div>

              <!-- Monto calculado dinámicamente -->
              <div class="amount-card">
                <div class="amount-label">Monto Total a Pagar:</div>
                <div class="amount-value">S/ {{ montoEstimado() }}</div>
              </div>

              <!-- Archivo de comprobante -->
              <div class="file-upload-block">
                <label class="file-label">Comprobante de Pago (JPG, PNG o PDF - Máx 5MB) (Opcional)</label>
                <input type="file" (change)="onFileSelected($event)" accept=".jpg,.jpeg,.png,.pdf" class="file-input">
                @if (selectedFileName()) {
                  <div class="selected-file-info">
                    <mat-icon>attach_file</mat-icon>
                    <span>{{ selectedFileName() }}</span>
                  </div>
                }
              </div>

              <div class="modal-actions">
                <button mat-stroked-button type="button" (click)="cerrarModal()">Cancelar</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="solicitudForm.invalid || enviando()">
                  @if (enviando()) {
                    <span>Enviando solicitud...</span>
                  } @else {
                    <span>Enviar Solicitud</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reservas-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-tag {
      font-size: 0.8rem;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0.25rem 0;
    }
    .page-desc {
      color: #64748b;
      margin: 0;
      font-size: 0.95rem;
    }
    .btn-nueva {
      border-radius: 20px !important;
      height: 44px !important;
      padding: 0 1.25rem !important;
      font-weight: 700 !important;
      background: #0066ff !important;
      color: #ffffff !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
    }

    .pending-warning-box {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      color: #92400e;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .pending-warning-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #d97706;
    }
    .pending-warning-box p {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
    }

    /* FILTERS CARD */
    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .filters-main-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.45rem 0.85rem;
      flex: 1;
      min-width: 260px;
      transition: all 0.2s ease;
    }
    .search-box:focus-within {
      background: #ffffff;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
    }
    .search-box mat-icon {
      color: #94a3b8;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
      color: #0f172a;
    }

    .clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      display: flex;
      align-items: center;
      padding: 0;
    }
    .clear-btn:hover {
      color: #ef4444;
    }

    .select-wrapper {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.4rem 0.75rem;
      transition: all 0.2s ease;
    }
    .select-wrapper:focus-within {
      background: #ffffff;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
    }
    .select-icon {
      color: #64748b;
      font-size: 19px;
      width: 19px;
      height: 19px;
    }
    .filter-select {
      background: transparent;
      border: none;
      font-size: 0.85rem;
      color: #334155;
      font-weight: 500;
      outline: none;
      cursor: pointer;
    }

    .btn-clear-all {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 0.45rem 0.85rem;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-clear-all:hover {
      background: #fee2e2;
      border-color: #f87171;
    }
    .btn-clear-all mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* FILA DE CHIPS */
    .filter-chips-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding-top: 0.25rem;
      border-top: 1px solid #f1f5f9;
    }
    .state-chip {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .state-chip:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .state-chip.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
    }
    .state-chip.active .chip-count {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }
    .chip-count {
      background: #e2e8f0;
      color: #475569;
      border-radius: 10px;
      padding: 0.1rem 0.45rem;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .state-chip.chip-pendiente.active { background: #d97706; border-color: #d97706; color: #fff; }
    .state-chip.chip-aprobada.active { background: #16a34a; border-color: #16a34a; color: #fff; }
    .state-chip.chip-rechazada.active { background: #dc2626; border-color: #dc2626; color: #fff; }
    .state-chip.chip-cancelada.active { background: #64748b; border-color: #64748b; color: #fff; }
    .state-chip.chip-finalizada.active { background: #4f46e5; border-color: #4f46e5; color: #fff; }

    /* FILA DE FECHAS */
    .date-filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }
    .date-inputs {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .date-group {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: #64748b;
    }
    .date-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.35rem 0.6rem;
      font-size: 0.82rem;
      color: #1e293b;
      outline: none;
    }
    .date-input:focus {
      border-color: #0284c7;
      background: #fff;
    }

    .preset-buttons {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .preset-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .preset-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .stats-counter {
      font-size: 0.85rem;
      color: #64748b;
      margin-left: auto;
    }

    /* GRID & CARDS */
    .reservas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .reserva-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .reserva-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
    }
    .border-rechazada {
      border-color: #fca5a5;
    }
    .reserva-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
    }
    .pitch-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .pitch-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pitch-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .pitch-type {
      font-size: 0.85rem;
      color: #64748b;
    }
    .status-chip {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .chip-pendiente { background: #fef08a; color: #854d0e; }
    .chip-aprobada { background: #bbf7d0; color: #166534; }
    .chip-rechazada { background: #fecaca; color: #991b1b; }
    .chip-cancelada { background: #e2e8f0; color: #475569; }
    .chip-vencida { background: #fed7aa; color: #9a3412; }
    .chip-finalizada { background: #e0e7ff; color: #3730a3; }

    .reserva-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      color: #475569;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tecnico-row {
      color: #334155;
      font-weight: 500;
    }
    .tecnico-row mat-icon {
      color: #0284c7 !important;
    }
    .tecnico-row strong {
      color: #0f172a;
    }
    .meta-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #64748b;
    }
    .receipt-link {
      color: #0284c7;
      text-decoration: underline;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .rejection-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 0.75rem;
      color: #991b1b;
      font-size: 0.85rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .rejection-box mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #ef4444;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      border-top: 1px solid #f1f5f9;
      padding-top: 1rem;
    }
    .btn-sm {
      border-radius: 8px !important;
      height: 36px !important;
      font-size: 0.85rem !important;
      font-weight: 600 !important;
    }

    /* ESTADOS VACÍOS */
    .loading-state, .empty-state, .no-results-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #64748b;
    }
    .no-results-state {
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
      padding: 3rem 1.5rem;
      max-width: 500px;
      margin: 2rem auto;
    }
    .no-results-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
    }
    .no-results-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .no-results-state h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.5rem;
    }
    .no-results-state p {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0 0 1.25rem;
    }
    .spin-icon {
      animation: spin 1.5s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-card {
      background: white;
      border-radius: 20px;
      max-width: 520px;
      width: 100%;
      padding: 2rem;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.25);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .modal-header h2 {
      margin: 0;
      font-size: 1.4rem;
      font-weight: 800;
      color: #0f172a;
    }
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-col {
      flex: 1;
    }
    .amount-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .amount-label {
      font-weight: 700;
      color: #166534;
      font-size: 0.95rem;
    }
    .amount-value {
      font-size: 1.4rem;
      font-weight: 800;
      color: #15803d;
    }
    .file-upload-block {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      background: #f8fafc;
    }
    .file-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.5rem;
    }
    .file-input {
      width: 100%;
      font-size: 0.85rem;
    }
    .selected-file-info {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: #0284c7;
      margin-top: 0.5rem;
      font-weight: 600;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
    }
  `]
})
export class MisReservasComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  reservas = signal<Reserva[]>([]);
  canchas = signal<Cancha[]>([]);
  cargando = signal<boolean>(true);
  mostrarModal = signal<boolean>(false);
  enviando = signal<boolean>(false);
  montoEstimado = signal<number>(0);

  // FILTROS REACTIVOS CON SIGNALS
  filtroTexto = signal<string>('');
  filtroEstado = signal<string>('TODOS');
  filtroCanchaId = signal<number | null>(null);
  filtroFechaDesde = signal<string>('');
  filtroFechaHasta = signal<string>('');
  ordenSeleccionado = signal<string>('fecha_asc');

  comprobanteFile = signal<File | null>(null);
  selectedFileName = signal<string | null>(null);

  horariosDisponibles: string[] = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  solicitudForm: FormGroup = this.fb.group({
    canchaId: [null, [Validators.required]],
    fecha: ['', [Validators.required]],
    horaInicio: ['19:00', [Validators.required]],
    horaFin: ['20:00', [Validators.required]]
  });

  // Conteo reactivo por estado para los chips
  conteoPorEstado = computed(() => {
    const list = this.reservas();
    return {
      TODOS: list.length,
      PENDIENTE: list.filter(r => r.estado === 'PENDIENTE').length,
      APROBADA: list.filter(r => r.estado === 'APROBADA').length,
      RECHAZADA: list.filter(r => r.estado === 'RECHAZADA').length,
      CANCELADA: list.filter(r => r.estado === 'CANCELADA').length,
      FINALIZADA: list.filter(r => r.estado === 'FINALIZADA' || r.estado === 'VENCIDA').length
    };
  });

  // Indicador de filtros activos
  hayFiltrosActivos = computed(() => {
    return this.filtroTexto().trim() !== '' ||
      this.filtroEstado() !== 'TODOS' ||
      (this.filtroCanchaId() !== null && this.filtroCanchaId() !== 0) ||
      this.filtroFechaDesde() !== '' ||
      this.filtroFechaHasta() !== '' ||
      this.ordenSeleccionado() !== 'fecha_asc';
  });

  // Lista filtrada y ordenada reactivamente
  reservasFiltradas = computed(() => {
    let list = this.reservas();

    // 1. Filtro de búsqueda por texto (técnico, cancha, tipo, fecha, estado)
    const query = this.filtroTexto().trim().toLowerCase();
    if (query) {
      list = list.filter(r => 
        (r.tecnicoNombre && r.tecnicoNombre.toLowerCase().includes(query)) ||
        (r.tecnicoEmail && r.tecnicoEmail.toLowerCase().includes(query)) ||
        (r.canchaNombre && r.canchaNombre.toLowerCase().includes(query)) ||
        (r.canchaTipo && r.canchaTipo.toLowerCase().includes(query)) ||
        (r.estado && r.estado.toLowerCase().includes(query)) ||
        (r.fecha && r.fecha.includes(query))
      );
    }

    // 2. Filtro por estado
    const estado = this.filtroEstado();
    if (estado !== 'TODOS') {
      if (estado === 'FINALIZADA') {
        list = list.filter(r => r.estado === 'FINALIZADA' || r.estado === 'VENCIDA');
      } else {
        list = list.filter(r => r.estado === estado);
      }
    }

    // 3. Filtro por cancha
    const canchaId = this.filtroCanchaId();
    if (canchaId !== null && canchaId !== 0) {
      list = list.filter(r => r.canchaId === canchaId);
    }

    // 4. Filtro por fecha desde
    const desde = this.filtroFechaDesde();
    if (desde) {
      list = list.filter(r => r.fecha >= desde);
    }

    // 5. Filtro por fecha hasta
    const hasta = this.filtroFechaHasta();
    if (hasta) {
      list = list.filter(r => r.fecha <= hasta);
    }

    // 6. Ordenamiento
    const orden = this.ordenSeleccionado();
    return [...list].sort((a, b) => {
      if (orden === 'fecha_asc') {
        const comp = a.fecha.localeCompare(b.fecha);
        return comp !== 0 ? comp : a.horaInicio.localeCompare(b.horaInicio);
      } else if (orden === 'fecha_desc') {
        const comp = b.fecha.localeCompare(a.fecha);
        return comp !== 0 ? comp : b.horaInicio.localeCompare(a.horaInicio);
      } else if (orden === 'monto_desc') {
        return (b.monto || 0) - (a.monto || 0);
      } else if (orden === 'monto_asc') {
        return (a.monto || 0) - (b.monto || 0);
      }
      return 0;
    });
  });

  ngOnInit(): void {
    this.cargarReservas();
    this.cargarCanchas();
  }

  cargarReservas(): void {
    this.cargando.set(true);
    this.encuentrosService.getMisReservas().subscribe({
      next: (data) => {
        this.reservas.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  cargarCanchas(): void {
    this.encuentrosService.getCanchas().subscribe({
      next: (data) => this.canchas.set(data)
    });
  }

  onCanchaChange(val: any): void {
    const id = Number(val);
    this.filtroCanchaId.set(id > 0 ? id : null);
  }

  aplicarPresetFecha(tipo: 'todas' | 'proximas' | 'hoy' | 'mes'): void {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    if (tipo === 'todas') {
      this.filtroFechaDesde.set('');
      this.filtroFechaHasta.set('');
    } else if (tipo === 'hoy') {
      this.filtroFechaDesde.set(hoyStr);
      this.filtroFechaHasta.set(hoyStr);
    } else if (tipo === 'proximas') {
      this.filtroFechaDesde.set(hoyStr);
      this.filtroFechaHasta.set('');
    } else if (tipo === 'mes') {
      const y = hoy.getFullYear();
      const m = String(hoy.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, hoy.getMonth() + 1, 0).getDate();
      this.filtroFechaDesde.set(`${y}-${m}-01`);
      this.filtroFechaHasta.set(`${y}-${m}-${lastDay}`);
    }
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroEstado.set('TODOS');
    this.filtroCanchaId.set(null);
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.ordenSeleccionado.set('fecha_asc');
  }

  abrirModalSolicitar(): void {
    this.mostrarModal.set(true);
    this.actualizarMontoEstimado();
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.comprobanteFile.set(null);
    this.selectedFileName.set(null);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.comprobanteFile.set(file);
      this.selectedFileName.set(file.name);
    }
  }

  actualizarMontoEstimado(): void {
    const canchaId = this.solicitudForm.get('canchaId')?.value;
    const inicio = this.solicitudForm.get('horaInicio')?.value;
    const fin = this.solicitudForm.get('horaFin')?.value;

    if (!canchaId || !inicio || !fin) {
      this.montoEstimado.set(0);
      return;
    }

    const cancha = this.canchas().find(c => c.id === canchaId);
    if (!cancha) return;

    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);

    if (mins > 0) {
      const horas = mins / 60;
      this.montoEstimado.set(Math.round(cancha.tarifaHora * horas * 100) / 100);
    } else {
      this.montoEstimado.set(0);
    }
  }

  enviarSolicitud(): void {
    if (this.solicitudForm.invalid) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor completa todos los campos del formulario.',
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    this.enviando.set(true);
    const formVal = this.solicitudForm.value;

    const formData = new FormData();
    formData.append('canchaId', formVal.canchaId);
    formData.append('fecha', formVal.fecha);
    formData.append('horaInicio', formVal.horaInicio);
    formData.append('horaFin', formVal.horaFin);
    if (this.comprobanteFile()) {
      formData.append('comprobante', this.comprobanteFile()!);
    }

    this.encuentrosService.solicitarReserva(formData).subscribe({
      next: () => {
        this.enviando.set(false);
        this.cerrarModal();
        this.cargarReservas();
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud Enviada!',
          text: 'Tu solicitud de reserva ha sido enviada con éxito.',
          confirmButtonColor: '#0066ff'
        });
      },
      error: (err) => {
        this.enviando.set(false);
        const msg = err.error?.message || err.error?.mensaje || 'Error al solicitar la reserva';
        Swal.fire({
          icon: 'error',
          title: 'Error al solicitar',
          text: msg,
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  cancelarReserva(id: number): void {
    Swal.fire({
      title: '¿Deseas cancelar esta reserva?',
      text: 'Recuerda que solo puedes cancelar con al menos 24 horas de anticipación.',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo de cancelación (opcional)...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cancelar reserva',
      cancelButtonText: 'Volver'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Cancelando reserva...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        this.encuentrosService.cancelarReserva(id, result.value || 'Cancelada por el técnico').subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Reserva Cancelada',
              text: 'La reserva ha sido cancelada correctamente.',
              confirmButtonColor: '#0066ff'
            });
            this.cargarReservas();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al cancelar',
              text: err.error?.message || 'No se pudo cancelar la reserva.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  getComprobanteLink(id: number): string {
    return this.encuentrosService.getComprobanteUrl(id);
  }
}
