import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AlertaReserva, AlertaResumen, Cancha } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-alertas-semaforo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="alertas-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <span class="page-tag">Sistema de Alertas Tempranas</span>
          <h1 class="page-title">Semáforo de Reservas por Vencer</h1>
          <p class="page-desc">Monitoreo preventivo de solicitudes de reserva próximas a la fecha de juego sin resolución administrativa.</p>
        </div>

        <button mat-stroked-button (click)="cargarAlertas()" class="btn-refresh" matTooltip="Recalcular semáforo en tiempo real">
          <mat-icon>sync</mat-icon>
          <span>Actualizar Alertas</span>
        </button>
      </div>

      <!-- KPI RESUMEN SEMÁFORO (INTERACTIVOS) -->
      <div class="kpi-grid">
        <!-- Tarjeta Roja -->
        <div 
          class="kpi-card card-roja" 
          [class.selected]="filtroColor() === 'ROJO'" 
          (click)="toggleFiltro('ROJO')"
          matTooltip="Filtrar reservas críticas (≤ 2 días)">
          <div class="kpi-top">
            <span class="semaforo-dot dot-rojo"></span>
            <span class="kpi-badge badge-rojo">Urgente (≤ 2 días)</span>
          </div>
          <div class="kpi-value">{{ resumen()?.totalRojas || 0 }}</div>
          <div class="kpi-label">Reservas Críticas / Vencen Hoy o Mañana</div>
        </div>

        <!-- Tarjeta Ámbar -->
        <div 
          class="kpi-card card-ambar" 
          [class.selected]="filtroColor() === 'AMBAR'" 
          (click)="toggleFiltro('AMBAR')"
          matTooltip="Filtrar reservas próximas a vencer (3 días)">
          <div class="kpi-top">
            <span class="semaforo-dot dot-ambar"></span>
            <span class="kpi-badge badge-ambar">Atención (3 días)</span>
          </div>
          <div class="kpi-value">{{ resumen()?.totalAmbar || 0 }}</div>
          <div class="kpi-label">Reservas Próximas a vencer</div>
        </div>

        <!-- Tarjeta Verde -->
        <div 
          class="kpi-card card-verde" 
          [class.selected]="filtroColor() === 'VERDE'" 
          (click)="toggleFiltro('VERDE')"
          matTooltip="Filtrar reservas con tiempo suficiente (> 3 días)">
          <div class="kpi-top">
            <span class="semaforo-dot dot-verde"></span>
            <span class="kpi-badge badge-verde">Sin Urgencia (> 3 días)</span>
          </div>
          <div class="kpi-value">{{ resumen()?.totalVerdes || 0 }}</div>
          <div class="kpi-label">Reservas con tiempo suficiente</div>
        </div>
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
              placeholder="Buscar por técnico, cancha (ej. Cancha 1, F5), fecha o urgencia..." 
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
              <option value="urgencia_desc">Urgencia: Críticas primero (Rojo ➔ Verde)</option>
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

        <!-- Fila 2: Chips interactivos de Nivel de Semáforo y Comprobante -->
        <div class="filter-chips-row">
          <button 
            type="button" 
            class="state-chip" 
            [class.active]="filtroColor() === null && filtroComprobante() === 'TODOS'" 
            (click)="filtroColor.set(null); filtroComprobante.set('TODOS')">
            Todas las alertas
            <span class="chip-count">{{ conteoFiltros().TODOS }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-rojo" 
            [class.active]="filtroColor() === 'ROJO'" 
            (click)="toggleFiltro('ROJO')">
            🔴 Urgente (≤ 2 días)
            <span class="chip-count">{{ conteoFiltros().ROJO }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-ambar" 
            [class.active]="filtroColor() === 'AMBAR'" 
            (click)="toggleFiltro('AMBAR')">
            🟡 Atención (3 días)
            <span class="chip-count">{{ conteoFiltros().AMBAR }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-verde" 
            [class.active]="filtroColor() === 'VERDE'" 
            (click)="toggleFiltro('VERDE')">
            🟢 Sin Urgencia (> 3 días)
            <span class="chip-count">{{ conteoFiltros().VERDE }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-comprobante" 
            [class.active]="filtroComprobante() === 'CON_COMPROBANTE'" 
            (click)="toggleComprobante('CON_COMPROBANTE')">
            📄 Con Comprobante
            <span class="chip-count">{{ conteoFiltros().CON_COMPROBANTE }}</span>
          </button>

          <button 
            type="button" 
            class="state-chip chip-sin-comprobante" 
            [class.active]="filtroComprobante() === 'SIN_COMPROBANTE'" 
            (click)="toggleComprobante('SIN_COMPROBANTE')">
            Sin Comprobante
            <span class="chip-count">{{ conteoFiltros().SIN_COMPROBANTE }}</span>
          </button>
        </div>

        <!-- Fila 3: Filtro por Rango de Fecha y Accesos Rápidos -->
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
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('hoy')">Hoy</button>
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('proximas')">Próximas</button>
            <button type="button" class="preset-btn" (click)="aplicarPresetFecha('mes')">Este Mes</button>
          </div>

          <div class="stats-counter">
            Mostrando <strong>{{ alertasFiltradas().length }}</strong> de <strong>{{ totalAlertas() }}</strong> alertas
          </div>
        </div>
      </div>

      <!-- TABLA DE ALERTAS -->
      @if (cargando()) {
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <span>Calculando semáforo en tiempo real...</span>
        </div>
      } @else if (totalAlertas() === 0) {
        <div class="empty-state">
          <mat-icon>check_circle</mat-icon>
          <h3>Sin alertas pendientes</h3>
          <p>No hay solicitudes pendientes en este momento.</p>
        </div>
      } @else if (alertasFiltradas().length === 0) {
        <div class="no-results-state">
          <div class="no-results-icon">
            <mat-icon>search_off</mat-icon>
          </div>
          <h3>No se encontraron alertas</h3>
          <p>Ninguna solicitud coincide con los criterios de filtrado seleccionados.</p>
          <button mat-stroked-button color="primary" (click)="limpiarFiltros()">
            <mat-icon>refresh</mat-icon>
            <span>Restablecer Filtros</span>
          </button>
        </div>
      } @else {
        <div class="table-container">
          <table class="alertas-table">
            <thead>
              <tr>
                <th>Nivel de Urgencia</th>
                <th>Técnico Solicitante</th>
                <th>Cancha</th>
                <th>Fecha de Juego</th>
                <th>Horario</th>
                <th>Monto</th>
                <th>Comprobante</th>
                <th class="text-right">Acción Rápida</th>
              </tr>
            </thead>
            <tbody>
              @for (a of alertasFiltradas(); track a.id) {
                <tr [class.tr-critica]="a.semaforo === 'ROJO'">
                  <td>
                    <div class="urgency-pill" [ngClass]="'urgency-' + a.semaforo.toLowerCase()">
                      <span class="semaforo-dot" [ngClass]="'dot-' + a.semaforo.toLowerCase()"></span>
                      <span class="urgency-text">{{ a.textoSemaforo }}</span>
                    </div>
                  </td>
                  <td>
                    <strong>{{ a.tecnicoNombre }}</strong>
                  </td>
                  <td>
                    <span>{{ a.canchaNombre }}</span>
                  </td>
                  <td>
                    <strong>{{ a.fecha }}</strong>
                    <div class="days-text">
                      @if (a.diasRestantes <= 0) {
                        <span class="vence-hoy">¡Vence Hoy!</span>
                      } @else {
                        <span>Faltan {{ a.diasRestantes }} día(s)</span>
                      }
                    </div>
                  </td>
                  <td>{{ a.horaInicio.slice(0,5) }} - {{ a.horaFin.slice(0,5) }}</td>
                  <td><strong>S/ {{ a.monto }}</strong></td>
                  <td>
                    @if (a.comprobanteUrl) {
                      <a [href]="getComprobanteLink(a.id)" target="_blank" mat-stroked-button class="btn-xs">
                        <mat-icon>receipt</mat-icon>
                        <span>Ver</span>
                      </a>
                    } @else {
                      <span class="subtext">Sin archivo</span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="actions-row">
                      <button mat-flat-button class="btn-approve-sm" (click)="aprobarReserva(a.id)" matTooltip="Aprobar de inmediato">
                        <mat-icon>check</mat-icon>
                        <span>Aprobar</span>
                      </button>
                      <button mat-stroked-button color="warn" class="btn-reject-sm" (click)="abrirModalRechazo(a)" matTooltip="Rechazar solicitud">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .alertas-page {
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
      color: #dc2626;
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

    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 18px;
      padding: 1.25rem 1.5rem;
      cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
    }
    .kpi-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .semaforo-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-rojo { background: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
    .dot-ambar { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.6); }
    .dot-verde { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.6); }

    .kpi-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 10px;
    }
    .badge-rojo { background: #fee2e2; color: #991b1b; }
    .badge-ambar { background: #fef3c7; color: #92400e; }
    .badge-verde { background: #dcfce7; color: #166534; }

    .kpi-value {
      font-size: 2.25rem;
      font-weight: 800;
      margin-bottom: 0.25rem;
    }
    .card-roja .kpi-value { color: #dc2626; }
    .card-ambar .kpi-value { color: #d97706; }
    .card-verde .kpi-value { color: #16a34a; }

    .kpi-label {
      font-size: 0.85rem;
      color: #64748b;
      font-weight: 600;
    }
    .card-roja.selected { border-color: #dc2626; background: #fff5f5; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15); }
    .card-ambar.selected { border-color: #d97706; background: #fffbeb; box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15); }
    .card-verde.selected { border-color: #16a34a; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15); }

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
    .state-chip.chip-rojo.active { background: #dc2626; border-color: #dc2626; color: #fff; }
    .state-chip.chip-ambar.active { background: #d97706; border-color: #d97706; color: #fff; }
    .state-chip.chip-verde.active { background: #16a34a; border-color: #16a34a; color: #fff; }
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

    /* Table */
    .table-container {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow-x: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }
    .alertas-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }
    .alertas-table th {
      background: #f8fafc;
      padding: 1rem 1.25rem;
      color: #475569;
      font-weight: 700;
      border-bottom: 1px solid #e2e8f0;
    }
    .alertas-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .tr-critica {
      background: #fffafa;
    }
    .urgency-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .urgency-rojo { background: #fee2e2; color: #991b1b; }
    .urgency-ambar { background: #fef3c7; color: #92400e; }
    .urgency-verde { background: #dcfce7; color: #166534; }

    .days-text {
      font-size: 0.75rem;
      color: #64748b;
    }
    .vence-hoy {
      color: #dc2626;
      font-weight: 800;
    }
    .btn-xs {
      height: 30px !important;
      font-size: 0.75rem !important;
      padding: 0 8px !important;
      border-radius: 6px !important;
    }
    .btn-approve-sm {
      background: #16a34a !important;
      color: white !important;
      height: 32px !important;
      font-size: 0.8rem !important;
      font-weight: 700 !important;
      border-radius: 6px !important;
    }
    .btn-reject-sm {
      height: 32px !important;
      min-width: 36px !important;
      padding: 0 !important;
      border-radius: 6px !important;
    }
    .actions-row {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }
    .text-right { text-align: right; }
    .subtext { font-size: 0.8rem; color: #94a3b8; }

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
  `]
})
export class AlertasSemaforoComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);

  resumen = signal<AlertaResumen | null>(null);
  canchas = signal<Cancha[]>([]);
  cargando = signal<boolean>(true);

  // FILTROS REACTIVOS
  filtroTexto = signal<string>('');
  filtroColor = signal<string | null>(null);
  filtroCancha = signal<string>('TODAS');
  filtroComprobante = signal<string>('TODOS');
  filtroFechaDesde = signal<string>('');
  filtroFechaHasta = signal<string>('');
  ordenSeleccionado = signal<string>('urgencia_desc');

  // Total de alertas
  totalAlertas = computed(() => this.resumen()?.alertas.length || 0);

  // Conteo reactivo para los chips
  conteoFiltros = computed(() => {
    const list = this.resumen()?.alertas || [];
    return {
      TODOS: list.length,
      ROJO: list.filter(a => a.semaforo === 'ROJO').length,
      AMBAR: list.filter(a => a.semaforo === 'AMBAR').length,
      VERDE: list.filter(a => a.semaforo === 'VERDE').length,
      CON_COMPROBANTE: list.filter(a => !!a.comprobanteUrl).length,
      SIN_COMPROBANTE: list.filter(a => !a.comprobanteUrl).length
    };
  });

  // Indicador de filtros activos
  hayFiltrosActivos = computed(() => {
    return this.filtroTexto().trim() !== '' ||
      this.filtroColor() !== null ||
      this.filtroCancha() !== 'TODAS' ||
      this.filtroComprobante() !== 'TODOS' ||
      this.filtroFechaDesde() !== '' ||
      this.filtroFechaHasta() !== '' ||
      this.ordenSeleccionado() !== 'urgencia_desc';
  });

  // Lista de alertas filtradas y ordenadas
  alertasFiltradas = computed(() => {
    let list = this.resumen()?.alertas || [];

    // 1. Filtro texto
    const query = this.filtroTexto().trim().toLowerCase();
    if (query) {
      list = list.filter(a => 
        (a.tecnicoNombre && a.tecnicoNombre.toLowerCase().includes(query)) ||
        (a.canchaNombre && a.canchaNombre.toLowerCase().includes(query)) ||
        (a.fecha && a.fecha.includes(query)) ||
        (a.textoSemaforo && a.textoSemaforo.toLowerCase().includes(query)) ||
        (a.monto && a.monto.toString().includes(query))
      );
    }

    // 2. Filtro semáforo / color (sincronizado con KPI cards y chips)
    const color = this.filtroColor();
    if (color) {
      list = list.filter(a => a.semaforo === color);
    }

    // 3. Filtro cancha
    const cancha = this.filtroCancha();
    if (cancha !== 'TODAS') {
      list = list.filter(a => a.canchaNombre === cancha);
    }

    // 4. Filtro comprobante
    const comp = this.filtroComprobante();
    if (comp === 'CON_COMPROBANTE') {
      list = list.filter(a => !!a.comprobanteUrl);
    } else if (comp === 'SIN_COMPROBANTE') {
      list = list.filter(a => !a.comprobanteUrl);
    }

    // 5. Rango de fechas
    const desde = this.filtroFechaDesde();
    if (desde) {
      list = list.filter(a => a.fecha >= desde);
    }
    const hasta = this.filtroFechaHasta();
    if (hasta) {
      list = list.filter(a => a.fecha <= hasta);
    }

    // 6. Ordenamiento
    const orden = this.ordenSeleccionado();
    const semaforoWeight: Record<string, number> = { 'ROJO': 3, 'AMBAR': 2, 'VERDE': 1 };

    return [...list].sort((a, b) => {
      if (orden === 'urgencia_desc') {
        const wA = semaforoWeight[a.semaforo] || 0;
        const wB = semaforoWeight[b.semaforo] || 0;
        if (wA !== wB) return wB - wA;
        return a.diasRestantes - b.diasRestantes;
      } else if (orden === 'fecha_asc') {
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
    this.cargarAlertas();
    this.cargarCanchas();
  }

  cargarAlertas(): void {
    this.cargando.set(true);
    this.encuentrosService.getAlertasSemaforo().subscribe({
      next: (data) => {
        this.resumen.set(data);
        this.cargando.set(false);
        this.encuentrosService.actualizarConteosMenu();
      },
      error: () => this.cargando.set(false)
    });
  }

  cargarCanchas(): void {
    this.encuentrosService.getCanchas().subscribe({
      next: (data) => this.canchas.set(data)
    });
  }

  toggleFiltro(color: string): void {
    this.filtroColor.set(this.filtroColor() === color ? null : color);
  }

  toggleComprobante(tipo: string): void {
    this.filtroComprobante.set(this.filtroComprobante() === tipo ? 'TODOS' : tipo);
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
    this.filtroColor.set(null);
    this.filtroCancha.set('TODAS');
    this.filtroComprobante.set('TODOS');
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.ordenSeleccionado.set('urgencia_desc');
  }

  aprobarReserva(id: number): void {
    Swal.fire({
      title: '¿Aprobar esta reserva urgente?',
      text: 'La reserva será confirmada inmediatamente y la cancha quedará bloqueada.',
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

        this.encuentrosService.aprobarReserva(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: '¡Reserva Aprobada!',
              text: 'La reserva ha sido aprobada exitosamente.',
              confirmButtonColor: '#10b981'
            });
            this.cargarAlertas();
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

  abrirModalRechazo(a: AlertaReserva): void {
    Swal.fire({
      title: 'Rechazar Reserva',
      text: `Indica el motivo de rechazo para la reserva de ${a.tecnicoNombre} (mínimo 10 caracteres):`,
      input: 'textarea',
      inputPlaceholder: 'Ingresa el motivo detallado...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Rechazar Reserva',
      cancelButtonText: 'Cancelar',
      inputValidator: (val) => {
        if (!val || val.trim().length < 10) {
          return 'El motivo debe tener al menos 10 caracteres.';
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

        this.encuentrosService.rechazarReserva(a.id, result.value.trim()).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Reserva Rechazada',
              text: 'La reserva ha sido rechazada.',
              confirmButtonColor: '#0066ff'
            });
            this.cargarAlertas();
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

  getComprobanteLink(id: number): string {
    return this.encuentrosService.getComprobanteUrl(id);
  }
}
