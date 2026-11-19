import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../core/services/encuentros.service';
import { TecnicoPendiente, EstadoAprobacion } from '../../core/models/encuentros.models';

@Component({
  selector: 'app-aprobacion-tecnicos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="aprobacion-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <span>Seguridad</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="current">Aprobación de Técnicos</span>
          </div>
          <h1>Bandeja de Aprobación de Técnicos</h1>
          <p class="subtitle">Evalúa solicitudes de registro de directores técnicos y gestiona su estado en el sistema</p>
        </div>
      </div>

      <!-- KPI METRIC CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card amber" (click)="filtroEstado = 'PENDIENTE'">
          <div class="kpi-icon-box amber">
            <mat-icon>hourglass_top</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Pendientes de Aprobación</span>
            <span class="kpi-num">{{ totalPendientes() }}</span>
            <span class="kpi-sub">Requieren acción inmediata</span>
          </div>
        </div>

        <div class="kpi-card green" (click)="filtroEstado = 'ACTIVO'">
          <div class="kpi-icon-box green">
            <mat-icon>verified_user</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Técnicos Activos</span>
            <span class="kpi-num">{{ totalActivos() }}</span>
            <span class="kpi-sub">Habilitados para operar</span>
          </div>
        </div>

        <div class="kpi-card red" (click)="filtroEstado = 'RECHAZADO'">
          <div class="kpi-icon-box red">
            <mat-icon>person_off</mat-icon>
          </div>
          <div class="kpi-content">
            <span class="kpi-label">Rechazados / Suspendidos</span>
            <span class="kpi-num">{{ totalInactivos() }}</span>
            <span class="kpi-sub">Acceso denegado</span>
          </div>
        </div>
      </div>

      <!-- FILTROS Y BÚSQUEDA -->
      <div class="filters-card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="filtroTexto" placeholder="Buscar por nombre, email o teléfono..." />
          @if (filtroTexto) {
            <button class="clear-btn" (click)="filtroTexto = ''">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <div class="tabs-container">
          @for (tab of estadosTab; track tab.key) {
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="filtroEstado === tab.key"
              (click)="filtroEstado = tab.key">
              <span>{{ tab.label }}</span>
              @if (tab.key === 'PENDIENTE' && totalPendientes() > 0) {
                <span class="badge-count">{{ totalPendientes() }}</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- ESTADOS DE VISTA -->
      @if (cargando()) {
        <div class="loading-state">
          <mat-icon class="spin">sync</mat-icon>
          <span>Cargando solicitudes de técnicos...</span>
        </div>
      } @else if (tecnicosFiltrados().length === 0) {
        <div class="empty-state">
          <mat-icon>how_to_reg</mat-icon>
          <h3>No se encontraron registros</h3>
          <p>No hay técnicos registrados que coincidan con los criterios seleccionados.</p>
        </div>
      } @else {
        <!-- TABLA DE SOLICITUDES -->
        <div class="table-container">
          <table class="tecnicos-table">
            <thead>
              <tr>
                <th>Técnico Solicitante</th>
                <th>Contacto</th>
                <th>Fecha de Solicitud</th>
                <th>Estado Actual</th>
                <th>Detalle de Decisión</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (tec of tecnicosFiltrados(); track tec.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar">
                        {{ getInitials(tec.nombres) }}
                      </div>
                      <div class="user-details">
                        <span class="user-fullname">{{ tec.nombres }}</span>
                        <span class="user-id">ID: {{ tec.id.slice(0, 8) }}...</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="contact-cell">
                      <span><mat-icon>mail</mat-icon> {{ tec.email }}</span>
                      <span><mat-icon>phone</mat-icon> {{ tec.telefono || 'Sin teléfono' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="date-cell">{{ tec.fechaRegistro | date:'dd/MM/yyyy HH:mm' }}</span>
                  </td>
                  <td>
                    <span class="status-pill" [ngClass]="getEstadoClass(tec.estado)">
                      {{ tec.estado }}
                    </span>
                  </td>
                  <td>
                    @if (tec.motivoRechazo) {
                      <div class="rejection-box" matTooltip="{{ tec.motivoRechazo }}">
                        <mat-icon>error_outline</mat-icon>
                        <span>{{ tec.motivoRechazo }}</span>
                      </div>
                    } @else if (tec.fechaDecision) {
                      <span class="decision-date">Evaluado el {{ tec.fechaDecision | date:'dd/MM/yyyy' }}</span>
                    } @else {
                      <span class="pending-text">Pendiente de evaluación</span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="actions-wrapper">
                      @if (tec.estado === 'PENDIENTE') {
                        <button 
                          mat-flat-button 
                          color="primary" 
                          class="action-btn-sm" 
                          (click)="aprobar(tec)">
                          <mat-icon>check</mat-icon> Aprobar
                        </button>
                        <button 
                          mat-stroked-button 
                          color="warn" 
                          class="action-btn-sm" 
                          (click)="abrirModalRechazo(tec)">
                          <mat-icon>close</mat-icon> Rechazar
                        </button>
                      } @else if (tec.estado === 'ACTIVO') {
                        <button 
                          mat-stroked-button 
                          color="warn" 
                          class="action-btn-sm" 
                          (click)="suspender(tec)">
                          <mat-icon>block</mat-icon> Suspender
                        </button>
                      } @else if (tec.estado === 'SUSPENDIDO' || tec.estado === 'RECHAZADO') {
                        <button 
                          mat-stroked-button 
                          color="primary" 
                          class="action-btn-sm" 
                          (click)="reactivar(tec)">
                          <mat-icon>refresh</mat-icon> Reactivar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- MODAL DE RECHAZO CON MOTIVO OBLIGATORIO (RN-06) -->
      @if (modalRechazoVisible()) {
        <div class="modal-backdrop">
          <div class="modal-box">
            <div class="modal-header">
              <h2>Rechazar Solicitud de Técnico</h2>
              <button class="icon-close" (click)="cerrarModalRechazo()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="modal-body">
              <p class="modal-desc">
                Indique el motivo por el cual se rechaza la solicitud de <strong>{{ tecnicoSeleccionado()?.nombres }}</strong>.
                Este motivo quedará registrado en auditoría y será notificado al usuario.
              </p>

              <div class="form-group">
                <label>Motivo del Rechazo <span class="required">* (mínimo 10 caracteres)</span></label>
                <textarea 
                  [(ngModel)]="motivoRechazo" 
                  rows="4" 
                  placeholder="Ej. La información de contacto no es válida o no cumple con las políticas de la plataforma..."
                  class="form-control-ta">
                </textarea>
                <div class="char-count" [class.valid]="motivoRechazo.trim().length >= 10">
                  {{ motivoRechazo.trim().length }} / 10 caracteres requeridos
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button mat-stroked-button (click)="cerrarModalRechazo()">Cancelar</button>
              <button 
                mat-flat-button 
                color="warn" 
                [disabled]="motivoRechazo.trim().length < 10 || procesando()"
                (click)="confirmarRechazo()">
                {{ procesando() ? 'Rechazando...' : 'Confirmar Rechazo' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .aprobacion-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .breadcrumb .current {
      color: #0284c7;
      font-weight: 600;
    }

    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-size: 0.95rem;
    }

    /* KPI GRID */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      transition: all 0.15s ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.06);
    }

    .kpi-card.amber { border-left: 4px solid #f59e0b; }
    .kpi-card.green { border-left: 4px solid #10b981; }
    .kpi-card.red { border-left: 4px solid #ef4444; }

    .kpi-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .kpi-icon-box.amber { background: #fef3c7; color: #d97706; }
    .kpi-icon-box.green { background: #dcfce7; color: #15803d; }
    .kpi-icon-box.red { background: #fee2e2; color: #b91c1c; }

    .kpi-content {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
    }

    .kpi-num {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }

    .kpi-sub {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* FILTERS CARD */
    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.4rem 0.75rem;
      flex: 1;
      min-width: 260px;
    }

    .search-box input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 0.9rem;
      color: #1e293b;
    }

    .clear-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      display: flex;
    }

    .tabs-container {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .tab-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 0.4rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      background: #e2e8f0;
    }

    .tab-btn.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .badge-count {
      background: #ef4444;
      color: #ffffff;
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      border-radius: 10px;
      font-weight: 700;
    }

    /* TABLE */
    .table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .tecnicos-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }

    .tecnicos-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .tecnicos-table td {
      padding: 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }

    .tecnicos-table tr:hover {
      background: #fcfcfd;
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
      color: #ffffff;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-fullname {
      font-weight: 700;
      color: #0f172a;
    }

    .user-id {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: #64748b;
    }

    .contact-cell span {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .contact-cell mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #94a3b8;
    }

    .date-cell {
      white-space: nowrap;
      color: #64748b;
    }

    .status-pill {
      padding: 0.25rem 0.6rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      display: inline-block;
    }

    .st-pendiente { background: #fef3c7; color: #b45309; }
    .st-activo { background: #dcfce7; color: #15803d; }
    .st-rechazado { background: #fee2e2; color: #b91c1c; }
    .st-suspendido { background: #e2e8f0; color: #475569; }

    .rejection-box {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #b91c1c;
      font-size: 0.8rem;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rejection-box mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .decision-date {
      font-size: 0.8rem;
      color: #64748b;
    }

    .pending-text {
      font-size: 0.8rem;
      color: #d97706;
      font-style: italic;
    }

    .text-right {
      text-align: right;
    }

    .actions-wrapper {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
    }

    .action-btn-sm {
      font-size: 0.75rem !important;
      height: 30px !important;
      padding: 0 8px !important;
      line-height: 30px !important;
    }

    .action-btn-sm mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 2px;
    }

    /* MODAL RECHAZO */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-box {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }

    .icon-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      display: flex;
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-desc {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.4;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .required {
      color: #ef4444;
      font-weight: 400;
      font-size: 0.75rem;
    }

    .form-control-ta {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.6rem 0.75rem;
      font-size: 0.9rem;
      color: #1e293b;
      outline: none;
      resize: vertical;
    }

    .form-control-ta:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
    }

    .char-count {
      font-size: 0.75rem;
      color: #ef4444;
      text-align: right;
    }

    .char-count.valid {
      color: #15803d;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #fafafa;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #64748b;
      gap: 0.75rem;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #94a3b8;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AprobacionTecnicosComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  private snackBar = inject(MatSnackBar);

  tecnicos = signal<TecnicoPendiente[]>([]);
  cargando = signal<boolean>(false);
  procesando = signal<boolean>(false);

  filtroTexto = '';
  filtroEstado = 'PENDIENTE';

  estadosTab = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'PENDIENTE', label: 'Pendientes' },
    { key: 'ACTIVO', label: 'Activos' },
    { key: 'RECHAZADO', label: 'Rechazados' },
    { key: 'SUSPENDIDO', label: 'Suspendidos' }
  ];

  // Modal Rechazo
  modalRechazoVisible = signal<boolean>(false);
  tecnicoSeleccionado = signal<TecnicoPendiente | null>(null);
  motivoRechazo = '';

  totalPendientes = computed(() => this.tecnicos().filter(t => t.estado === 'PENDIENTE').length);
  totalActivos = computed(() => this.tecnicos().filter(t => t.estado === 'ACTIVO').length);
  totalInactivos = computed(() => this.tecnicos().filter(t => t.estado === 'RECHAZADO' || t.estado === 'SUSPENDIDO').length);

  tecnicosFiltrados = computed(() => {
    let list = this.tecnicos();
    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.toLowerCase().trim();
      list = list.filter(t => 
        t.nombres.toLowerCase().includes(q) || 
        t.email.toLowerCase().includes(q) || 
        (t.telefono && t.telefono.includes(q))
      );
    }
    if (this.filtroEstado !== 'TODOS') {
      list = list.filter(t => t.estado === this.filtroEstado);
    }
    return list;
  });

  ngOnInit(): void {
    this.cargarTecnicos();
  }

  cargarTecnicos(): void {
    this.cargando.set(true);
    this.encuentrosService.getTecnicos().subscribe({
      next: (data) => {
        this.tecnicos.set(data);
        const pendientes = data.filter(t => t.estado === 'PENDIENTE').length;
        this.encuentrosService.conteoTecnicosPendientes.set(pendientes);
        this.cargando.set(false);
      },
      error: () => {
        this.snackBar.open('Error al consultar técnicos', 'Cerrar', { duration: 3000 });
        this.cargando.set(false);
      }
    });
  }

  aprobar(tec: TecnicoPendiente): void {
    Swal.fire({
      title: '¿Aprobar al Técnico?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p><b>👤 Nombre:</b> ${tec.nombres}</p>
          <p><b>✉️ Correo:</b> ${tec.email}</p>
          <p><b>📞 Teléfono:</b> ${tec.telefono || 'Sin registrar'}</p>
          <p style="color:#10b981; font-weight:bold;">El usuario quedará en estado ACTIVO y podrá solicitar canchas y registrar jugadores.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, aprobar técnico',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Aprobando técnico...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        this.encuentrosService.aprobarTecnico(tec.id).subscribe({
          next: (actualizado) => {
            Swal.fire({
              icon: 'success',
              title: '¡Técnico Aprobado!',
              text: `${actualizado.nombres} ha sido habilitado exitosamente.`,
              confirmButtonColor: '#10b981'
            });
            this.actualizarLista(actualizado);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al aprobar',
              text: err.error?.message || 'No se pudo aprobar el técnico.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  abrirModalRechazo(tec: TecnicoPendiente): void {
    this.tecnicoSeleccionado.set(tec);
    this.motivoRechazo = '';
    this.modalRechazoVisible.set(true);
  }

  cerrarModalRechazo(): void {
    this.modalRechazoVisible.set(false);
    this.tecnicoSeleccionado.set(null);
    this.motivoRechazo = '';
  }

  confirmarRechazo(): void {
    if (!this.tecnicoSeleccionado() || this.motivoRechazo.trim().length < 10) return;

    this.procesando.set(true);
    this.encuentrosService.rechazarTecnico(this.tecnicoSeleccionado()!.id, this.motivoRechazo.trim()).subscribe({
      next: (actualizado) => {
        Swal.fire({
          icon: 'success',
          title: 'Solicitud Rechazada',
          text: `La solicitud de ${actualizado.nombres} ha sido rechazada.`,
          confirmButtonColor: '#0066ff'
        });
        this.actualizarLista(actualizado);
        this.cerrarModalRechazo();
        this.procesando.set(false);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al rechazar',
          text: err.error?.message || 'No se pudo rechazar la solicitud.',
          confirmButtonColor: '#ef4444'
        });
        this.procesando.set(false);
      }
    });
  }

  suspender(tec: TecnicoPendiente): void {
    Swal.fire({
      title: `¿Suspender al técnico ${tec.nombres}?`,
      text: 'El técnico no podrá crear nuevas reservas ni partidos mientras esté suspendido.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, suspender',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.encuentrosService.suspenderTecnico(tec.id).subscribe({
          next: (actualizado) => {
            Swal.fire({
              icon: 'success',
              title: 'Técnico Suspendido',
              text: `${actualizado.nombres} ha sido suspendido.`,
              confirmButtonColor: '#0066ff'
            });
            this.actualizarLista(actualizado);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al suspender',
              text: err.error?.message || 'No se pudo suspender.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  reactivar(tec: TecnicoPendiente): void {
    Swal.fire({
      title: `¿Reactivar al técnico ${tec.nombres}?`,
      text: 'El técnico volverá a estar ACTIVO con todas sus funciones habilitadas.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.encuentrosService.reactivarTecnico(tec.id).subscribe({
          next: (actualizado) => {
            Swal.fire({
              icon: 'success',
              title: 'Técnico Reactivado',
              text: `${actualizado.nombres} está nuevamente activo.`,
              confirmButtonColor: '#10b981'
            });
            this.actualizarLista(actualizado);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al reactivar',
              text: err.error?.message || 'No se pudo reactivar.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  private actualizarLista(actualizado: TecnicoPendiente): void {
    this.tecnicos.update(list => {
      const updated = list.map(t => t.id === actualizado.id ? actualizado : t);
      const pendientes = updated.filter(t => t.estado === 'PENDIENTE').length;
      this.encuentrosService.conteoTecnicosPendientes.set(pendientes);
      return updated;
    });
    this.encuentrosService.actualizarConteosMenu();
  }

  getEstadoClass(estado: EstadoAprobacion): string {
    switch (estado) {
      case 'PENDIENTE': return 'st-pendiente';
      case 'ACTIVO': return 'st-activo';
      case 'RECHAZADO': return 'st-rechazado';
      case 'SUSPENDIDO': return 'st-suspendido';
      default: return 'st-pendiente';
    }
  }

  getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
