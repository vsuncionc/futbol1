import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { Cancha, Reserva } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-solicitudes-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="solicitudes-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <span class="page-tag">Administración de Canchas</span>
          <h1 class="page-title">Bandeja de Solicitudes de Reserva</h1>
          <p class="page-desc">Revisa los comprobantes de pago de los técnicos, detecta conflictos y aprueba o rechaza solicitudes.</p>
        </div>

        <button mat-stroked-button (click)="cargarSolicitudes()" class="btn-refresh" matTooltip="Refrescar datos desde el servidor">
          <mat-icon>refresh</mat-icon>
          <span>Actualizar Bandeja</span>
        </button>
      </div>

      <!-- PANEL DE FILTROS Y BÚSQUEDA -->
      <div class="filters-card">
        <!-- Fila 1: Buscador de texto, selector de Cancha, Ordenamiento y Limpiar -->
        <div class="filters-main-row">
          <div class="search-box">
            <mat-icon>search</mat-icon>
            <input 
              type="text" 
              [value]="filtroTexto()" 
              (input)="filtroTexto.set($any($event.target).value)" 
              placeholder="Buscar por técnico, email, cancha (ej. Cancha 1, F5) o fecha..." 
            />
            @if (filtroTexto()) {
              <button type="button" class="clear-btn" (click)="filtroTexto.set('')" matTooltip="Borrar texto">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <div class="select-wrapper">
            <mat-icon class="select-icon">stadium</mat-icon>
            <select [value]="filtroCancha()" (change)="filtroCancha.set($any($event.target).value)" class="filter-select">
              <option value="TODAS">Todas las canchas</option>
              @for (c of canchas(); track c.id) {
                <option [value]="c.nombre">{{ c.nombre }} ({{ c.tipo }})</option>
              }
            </select>
          </div>

          <div class="select-wrapper">
            <mat-icon class="select-icon">sort</mat-icon>
            <select [value]="ordenSeleccionado()" (change)="ordenSeleccionado.set($any($event.target).value)" class="filter-select">
              <option value="fecha_asc">Fecha: Próximas primero</option>
              <option value="fecha_desc">Fecha: Más lejanas primero</option>
              <option value="tecnico_asc">Técnico: A - Z</option>
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

        <!-- Fila 2: Chips interactivos de Estado / Conflicto / Comprobante -->
        <div class="filter-chips-row">
          <button 
            type="button" 
            class="state-chip" 
            [class.active]="filtroConflicto() === 'TODOS'" 
            (click)="filtroConflicto.set('TODOS')">
            Todas
            <span class="chip-count">{{ conteoFiltros().TODOS }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-conflicto" 
            [class.active]="filtroConflicto() === 'CON_CONFLICTO'" 
            (click)="filtroConflicto.set('CON_CONFLICTO')">
            ⚠️ En Conflicto
            <span class="chip-count">{{ conteoFiltros().CON_CONFLICTO }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-sin-conflicto" 
            [class.active]="filtroConflicto() === 'SIN_CONFLICTO'" 
            (click)="filtroConflicto.set('SIN_CONFLICTO')">
            ✓ Sin Conflicto
            <span class="chip-count">{{ conteoFiltros().SIN_CONFLICTO }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-comprobante" 
            [class.active]="filtroConflicto() === 'CON_COMPROBANTE'" 
            (click)="filtroConflicto.set('CON_COMPROBANTE')">
            📄 Con Comprobante
            <span class="chip-count">{{ conteoFiltros().CON_COMPROBANTE }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-sin-comprobante" 
            [class.active]="filtroConflicto() === 'SIN_COMPROBANTE'" 
            (click)="filtroConflicto.set('SIN_COMPROBANTE')">
            Sin Comprobante
            <span class="chip-count">{{ conteoFiltros().SIN_COMPROBANTE }}</span>
          </button>
        </div>

        <!-- Fila 3: Filtro por Rango de Fecha y Presets -->
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
            Mostrando <strong>{{ solicitudesFiltradas().length }}</strong> de <strong>{{ solicitudes().length }}</strong> solicitudes
          </div>
        </div>
      </div>

      <!-- CONTENIDO DE LA BANDEJA -->
      @if (cargando()) {
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <span>Cargando solicitudes pendientes...</span>
        </div>
      } @else if (solicitudes().length === 0) {
        <div class="empty-state">
          <mat-icon>task_alt</mat-icon>
          <h3>¡No hay solicitudes pendientes!</h3>
          <p>Todas las reservas solicitadas por los técnicos han sido procesadas.</p>
        </div>
      } @else if (solicitudesFiltradas().length === 0) {
        <div class="no-results-state">
          <div class="no-results-icon">
            <mat-icon>search_off</mat-icon>
          </div>
          <h3>No se encontraron solicitudes</h3>
          <p>Ninguna solicitud coincide con los filtros aplicados (búsqueda, cancha, estado de conflicto o rango de fechas).</p>
          <button mat-stroked-button color="primary" (click)="limpiarFiltros()">
            <mat-icon>refresh</mat-icon>
            <span>Restablecer Filtros</span>
          </button>
        </div>
      } @else {
        <div class="table-container">
          <table class="solicitudes-table">
            <thead>
              <tr>
                <th>Técnico Solicitante</th>
                <th>Cancha</th>
                <th>Fecha y Horario</th>
                <th>Monto</th>
                <th>Comprobante</th>
                <th>Estado / Conflicto</th>
                <th class="text-right">Acciones de Decisión</th>
              </tr>
            </thead>
            <tbody>
              @for (s of solicitudesFiltradas(); track s.id) {
                <tr [class.row-conflicto]="s.enConflicto">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar">{{ s.tecnicoNombre.charAt(0) }}</div>
                      <div>
                        <strong>{{ s.tecnicoNombre }}</strong>
                        <div class="subtext">{{ s.tecnicoEmail }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{{ s.canchaNombre }}</strong>
                    <div class="subtext">{{ s.canchaTipo }}</div>
                  </td>
                  <td>
                    <div>{{ s.fecha }}</div>
                    <div class="subtext">{{ s.horaInicio.slice(0,5) }} - {{ s.horaFin.slice(0,5) }}</div>
                  </td>
                  <td>
                    <span class="monto-badge">S/ {{ s.monto }}</span>
                  </td>
                  <td>
                    @if (s.comprobanteUrl) {
                      <button mat-stroked-button color="primary" class="btn-sm" (click)="verComprobante(s)">
                        <mat-icon>receipt</mat-icon>
                        <span>Ver Archivo</span>
                      </button>
                    } @else {
                      <span class="no-file-text">Sin comprobante</span>
                    }
                  </td>
                  <td>
                    @if (s.enConflicto) {
                      <span class="conflict-badge" title="Coincide en horario con una reserva ya aprobada">
                        ⚠️ En Conflicto
                      </span>
                    } @else {
                      <span class="chip-pendiente">Pendiente</span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="actions-group">
                      <button mat-flat-button class="btn-approve" (click)="aprobarSolicitud(s)">
                        <mat-icon>check</mat-icon>
                        <span>Aprobar</span>
                      </button>
                      <button mat-stroked-button color="warn" class="btn-reject" (click)="abrirModalRechazo(s)">
                        <mat-icon>close</mat-icon>
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- MODAL VISOR COMPROBANTE -->
      @if (reservaParaComprobante()) {
        <div class="modal-backdrop" (click)="reservaParaComprobante.set(null)">
          <div class="modal-card modal-comprobante" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Comprobante de Pago - Reserva #{{ reservaParaComprobante()!.id }}</h2>
              <button mat-icon-button (click)="reservaParaComprobante.set(null)">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="comprobante-preview-box">
              <img [src]="getComprobanteLink(reservaParaComprobante()!.id)" alt="Comprobante" class="preview-img">
            </div>

            <div class="modal-actions">
              <a [href]="getComprobanteLink(reservaParaComprobante()!.id)" target="_blank" mat-stroked-button>
                <mat-icon>open_in_new</mat-icon>
                <span>Abrir en Pestaña Nueva</span>
              </a>
              <button mat-flat-button color="primary" (click)="reservaParaComprobante.set(null)">Cerrar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .solicitudes-page {
      padding: 1.5rem;
      max-width: 1250px;
      margin: 0 auto;
      font-family: 'Inter', system-ui, sans-serif;
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
    .btn-refresh {
      border-radius: 10px !important;
      height: 40px !important;
      font-weight: 600 !important;
      color: #0f172a !important;
    }

    /* FILTERS CARD */
    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
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
      min-width: 280px;
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
    .state-chip.chip-conflicto.active { background: #dc2626; border-color: #dc2626; color: #fff; }
    .state-chip.chip-sin-conflicto.active { background: #16a34a; border-color: #16a34a; color: #fff; }
    .state-chip.chip-comprobante.active { background: #0284c7; border-color: #0284c7; color: #fff; }
    .state-chip.chip-sin-comprobante.active { background: #64748b; border-color: #64748b; color: #fff; }

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

    /* TABLA */
    .table-container {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow-x: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .solicitudes-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }
    .solicitudes-table th {
      background: #f8fafc;
      padding: 1rem 1.25rem;
      color: #475569;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
    }
    .solicitudes-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .row-conflicto {
      background: #fffbeb !important;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #0284c7;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }
    .subtext {
      font-size: 0.8rem;
      color: #64748b;
    }
    .monto-badge {
      font-weight: 700;
      color: #16a34a;
    }
    .conflict-badge {
      background: #fee2e2;
      color: #991b1b;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid #fca5a5;
    }
    .chip-pendiente {
      background: #fef08a;
      color: #854d0e;
      padding: 0.25rem 0.65rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .no-file-text {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.8rem;
    }
    .text-right {
      text-align: right;
    }
    .actions-group {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .btn-approve {
      background: #16a34a !important;
      color: white !important;
      font-weight: 700 !important;
      border-radius: 8px !important;
      height: 34px !important;
      font-size: 0.8rem !important;
    }
    .btn-reject {
      border-radius: 8px !important;
      height: 34px !important;
      font-size: 0.8rem !important;
    }
    .btn-sm {
      border-radius: 8px !important;
      height: 32px !important;
      font-size: 0.8rem !important;
    }

    /* ESTADOS */
    .loading-state, .empty-state, .no-results-state {
      text-align: center; padding: 4rem 1rem; color: #64748b;
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
    .spin-icon { animation: spin 1.5s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .modal-card {
      background: white; border-radius: 20px; max-width: 500px; width: 100%;
      padding: 2rem; box-shadow: 0 20px 48px rgba(0,0,0,0.25);
    }
    .modal-comprobante {
      max-width: 680px;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;
    }
    .modal-header h2 { margin: 0; font-size: 1.3rem; font-weight: 800; color: #0f172a; }
    .comprobante-preview-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      max-height: 480px;
      overflow: auto;
      margin-bottom: 1.5rem;
    }
    .preview-img {
      max-width: 100%;
      max-height: 450px;
      object-fit: contain;
      border-radius: 8px;
    }
    .modal-actions {
      display: flex; justify-content: flex-end; gap: 0.75rem;
    }
  `]
})
export class SolicitudesAdminComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);

  solicitudes = signal<Reserva[]>([]);
  canchas = signal<Cancha[]>([]);
  cargando = signal<boolean>(true);

  // FILTROS REACTIVOS
  filtroTexto = signal<string>('');
  filtroCancha = signal<string>('TODAS');
  filtroConflicto = signal<string>('TODOS');
  filtroFechaDesde = signal<string>('');
  filtroFechaHasta = signal<string>('');
  ordenSeleccionado = signal<string>('fecha_asc');

  reservaParaComprobante = signal<Reserva | null>(null);

  // Conteo reactivo para los chips
  conteoFiltros = computed(() => {
    const list = this.solicitudes();
    return {
      TODOS: list.length,
      CON_CONFLICTO: list.filter(s => s.enConflicto).length,
      SIN_CONFLICTO: list.filter(s => !s.enConflicto).length,
      CON_COMPROBANTE: list.filter(s => !!s.comprobanteUrl).length,
      SIN_COMPROBANTE: list.filter(s => !s.comprobanteUrl).length
    };
  });

  // Indicador de filtros activos
  hayFiltrosActivos = computed(() => {
    return this.filtroTexto().trim() !== '' ||
      this.filtroCancha() !== 'TODAS' ||
      this.filtroConflicto() !== 'TODOS' ||
      this.filtroFechaDesde() !== '' ||
      this.filtroFechaHasta() !== '' ||
      this.ordenSeleccionado() !== 'fecha_asc';
  });

  // Lista filtrada y ordenada reactivamente
  solicitudesFiltradas = computed(() => {
    let list = this.solicitudes();

    // 1. Filtro de búsqueda por texto
    const query = this.filtroTexto().trim().toLowerCase();
    if (query) {
      list = list.filter(s => 
        (s.tecnicoNombre && s.tecnicoNombre.toLowerCase().includes(query)) ||
        (s.tecnicoEmail && s.tecnicoEmail.toLowerCase().includes(query)) ||
        (s.canchaNombre && s.canchaNombre.toLowerCase().includes(query)) ||
        (s.canchaTipo && s.canchaTipo.toLowerCase().includes(query)) ||
        (s.fecha && s.fecha.includes(query)) ||
        (s.monto && s.monto.toString().includes(query))
      );
    }

    // 2. Filtro por Cancha
    const cancha = this.filtroCancha();
    if (cancha !== 'TODAS') {
      list = list.filter(s => s.canchaNombre === cancha);
    }

    // 3. Filtro por Conflicto / Comprobante
    const conf = this.filtroConflicto();
    if (conf === 'CON_CONFLICTO') {
      list = list.filter(s => s.enConflicto);
    } else if (conf === 'SIN_CONFLICTO') {
      list = list.filter(s => !s.enConflicto);
    } else if (conf === 'CON_COMPROBANTE') {
      list = list.filter(s => !!s.comprobanteUrl);
    } else if (conf === 'SIN_COMPROBANTE') {
      list = list.filter(s => !s.comprobanteUrl);
    }

    // 4. Filtro por Fecha Desde
    const desde = this.filtroFechaDesde();
    if (desde) {
      list = list.filter(s => s.fecha >= desde);
    }

    // 5. Filtro por Fecha Hasta
    const hasta = this.filtroFechaHasta();
    if (hasta) {
      list = list.filter(s => s.fecha <= hasta);
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
      } else if (orden === 'tecnico_asc') {
        return a.tecnicoNombre.localeCompare(b.tecnicoNombre);
      } else if (orden === 'monto_desc') {
        return (b.monto || 0) - (a.monto || 0);
      } else if (orden === 'monto_asc') {
        return (a.monto || 0) - (b.monto || 0);
      }
      return 0;
    });
  });

  ngOnInit(): void {
    this.cargarSolicitudes();
    this.cargarCanchas();
  }

  cargarSolicitudes(): void {
    this.cargando.set(true);
    this.encuentrosService.getSolicitudesPendientes().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
        this.encuentrosService.conteoReservasPendientes.set(data.length);
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
    this.filtroCancha.set('TODAS');
    this.filtroConflicto.set('TODOS');
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.ordenSeleccionado.set('fecha_asc');
  }

  verComprobante(reserva: Reserva): void {
    this.reservaParaComprobante.set(reserva);
  }

  getComprobanteLink(id: number): string {
    return this.encuentrosService.getComprobanteUrl(id);
  }

  aprobarSolicitud(reserva: Reserva): void {
    Swal.fire({
      title: '¿Aprobar esta reserva?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p><b>🏟️ Cancha:</b> ${reserva.canchaNombre} (${reserva.canchaTipo})</p>
          <p><b>📅 Fecha:</b> ${reserva.fecha}</p>
          <p><b>⏰ Horario:</b> ${reserva.horaInicio.slice(0,5)} - ${reserva.horaFin.slice(0,5)}</p>
          <p><b>👤 Técnico:</b> ${reserva.tecnicoNombre}</p>
          <p><b>💰 Monto:</b> S/ ${reserva.monto.toFixed(2)}</p>
          ${reserva.enConflicto ? '<p style="color: #ef4444; font-weight: bold;">⚠️ Al aprobar esta reserva, se rechazarán automáticamente las solicitudes en conflicto.</p>' : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, aprobar reserva',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Aprobando reserva...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        this.encuentrosService.aprobarReserva(reserva.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: '¡Reserva Aprobada!',
              text: `La reserva para ${reserva.tecnicoNombre} ha sido confirmada y la cancha ha quedado bloqueada.`,
              confirmButtonColor: '#10b981'
            });
            this.cargarSolicitudes();
            this.encuentrosService.actualizarConteosMenu();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al aprobar',
              text: err.error?.message || 'No se pudo aprobar la reserva.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  abrirModalRechazo(reserva: Reserva): void {
    Swal.fire({
      title: 'Rechazar Solicitud de Reserva',
      text: `Indica el motivo de rechazo para ${reserva.tecnicoNombre} (mínimo 10 caracteres):`,
      input: 'textarea',
      inputPlaceholder: 'Ej. El comprobante de pago no coincide con el monto o no es legible...',
      inputAttributes: {
        'aria-label': 'Motivo de rechazo'
      },
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Rechazar Reserva',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || value.trim().length < 10) {
          return 'Debes ingresar un motivo de al menos 10 caracteres.';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: 'Rechazando reserva...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        this.encuentrosService.rechazarReserva(reserva.id, result.value.trim()).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Reserva Rechazada',
              text: 'La reserva ha sido rechazada y se notificó al técnico solicitante.',
              confirmButtonColor: '#0066ff'
            });
            this.cargarSolicitudes();
            this.encuentrosService.actualizarConteosMenu();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al rechazar',
              text: err.error?.message || 'No se pudo rechazar la reserva.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }
}
