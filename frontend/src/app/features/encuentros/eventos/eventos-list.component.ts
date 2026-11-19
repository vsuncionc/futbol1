import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Encuentro, EstadoEncuentro } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-eventos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="eventos-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <span>Encuentros</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="current">Eventos</span>
          </div>
          <h1>Encuentros Deportivos</h1>
          <p class="subtitle">Gestiona partidos, distribución de equipos balanceados y publicaciones</p>
        </div>
        <div class="header-actions">
          <button 
            mat-flat-button 
            color="primary" 
            routerLink="/encuentros/eventos/nuevo"
            [disabled]="authService.isTecnicoPendiente()">
            <mat-icon>add_circle</mat-icon>
            <span>Crear Encuentro</span>
          </button>
        </div>
      </div>

      <!-- ALERTA TÉCNICO PENDIENTE -->
      @if (authService.isTecnicoPendiente()) {
        <div class="alert-banner warning">
          <mat-icon>hourglass_top</mat-icon>
          <div>
            <strong>Cuenta en espera de aprobación:</strong>
            Su usuario técnico aún no ha sido aprobado por el administrador. No puede crear ni publicar encuentros.
          </div>
        </div>
      }

      <!-- FILTROS Y ESTADÍSTICAS -->
      <div class="filters-card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="filtroTexto" placeholder="Buscar por título o cancha..." />
          @if (filtroTexto) {
            <button class="clear-btn" (click)="filtroTexto = ''">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <div class="estado-chips">
          @for (opc of estadosFiltro; track opc.key) {
            <button 
              type="button" 
              class="chip-btn" 
              [class.active]="filtroEstado === opc.key"
              (click)="filtroEstado = opc.key">
              {{ opc.label }}
            </button>
          }
        </div>

        <div class="counter-badge">
          Total: <strong>{{ encuentrosFiltrados().length }}</strong>
        </div>
      </div>

      <!-- ESTADOS DE VISTA -->
      @if (cargando()) {
        <div class="state-container">
          <mat-icon class="spin">sync</mat-icon>
          <span>Cargando encuentros deportivos...</span>
        </div>
      } @else if (encuentrosFiltrados().length === 0) {
        <div class="empty-state">
          <div class="empty-icon-circle">
            <mat-icon>sports_soccer</mat-icon>
          </div>
          <h3>No se encontraron encuentros</h3>
          <p>No hay partidos registrados que coincidan con los filtros actuales.</p>
          <button 
            mat-flat-button 
            color="primary" 
            routerLink="/encuentros/eventos/nuevo" 
            [disabled]="authService.isTecnicoPendiente()">
            <mat-icon>add</mat-icon> Organizar Primer Encuentro
          </button>
        </div>
      } @else {
        <!-- LISTA DE ENCUENTROS -->
        <div class="encuentros-grid">
          @for (encuentro of encuentrosFiltrados(); track encuentro.id) {
            <div class="encuentro-card">
              <!-- CABECERA DE LA TARJETA -->
              <div class="card-top">
                <div class="cancha-badge">
                  <mat-icon>stadium</mat-icon>
                  <span>{{ encuentro.canchaNombre }}</span>
                </div>
                <span class="estado-badge" [ngClass]="getEstadoClass(encuentro.estado)">
                  {{ encuentro.estado }}
                </span>
              </div>

              <!-- TÍTULO Y FECHA -->
              <div class="card-main">
                <h3 class="encuentro-title">{{ encuentro.nombre }}</h3>
                <div class="date-row">
                  <mat-icon>calendar_today</mat-icon>
                  <span>{{ encuentro.fecha | date:'fullDate':'UTC':'es-PE' }}</span>
                  <span class="dot-sep">•</span>
                  <mat-icon>schedule</mat-icon>
                  <span>{{ encuentro.horaInicio }} - {{ encuentro.horaFin }}</span>
                </div>

                <!-- PREVIEW DE EQUIPOS -->
                @if (encuentro.equipos && encuentro.equipos.length > 0) {
                  <div class="teams-versus">
                    @for (eq of encuentro.equipos; track eq.id || eq.nombre; let last = $last) {
                      <div class="team-pill">
                        <div class="team-color-dot" [style.background-color]="eq.color || '#3b82f6'"></div>
                        <div class="team-info">
                          <span class="team-name">{{ eq.nombre }}</span>
                          <span class="team-stars">
                            {{ eq.jugadores.length }} jug. • {{ eq.promedioEstrellas | number:'1.1-1' }} ⭐
                          </span>
                        </div>
                      </div>
                      @if (!last) {
                        <span class="vs-text">VS</span>
                      }
                    }
                  </div>
                }

                <!-- APUESTA INFORMATIVA -->
                @if (encuentro.apuestaMonto) {
                  <div class="bet-info-pill">
                    <mat-icon>paid</mat-icon>
                    <span>Apuesta informativa: <strong>S/ {{ encuentro.apuestaMonto | number:'1.2-2' }}</strong> por jugador</span>
                    <mat-icon class="help-icon" matTooltip="Apuesta informativa: la plataforma no administra dinero">info</mat-icon>
                  </div>
                }
              </div>

              <!-- PIE DE TARJETA CON ACCIONES -->
              <div class="card-footer">
                <div class="footer-left">
                  <a [routerLink]="['/publico/encuentros', encuentro.id]" target="_blank" class="public-link">
                    <mat-icon>open_in_new</mat-icon> Ver página pública
                  </a>
                </div>

                <div class="footer-actions">
                  @if (encuentro.estado === 'BORRADOR') {
                    <button 
                      mat-flat-button 
                      color="primary" 
                      class="btn-sm" 
                      (click)="publicar(encuentro)"
                      [disabled]="authService.isTecnicoPendiente()">
                      <mat-icon>publish</mat-icon> Publicar
                    </button>
                  }
                  <button mat-stroked-button class="btn-sm" [routerLink]="['/encuentros/eventos', encuentro.id]">
                    <mat-icon>visibility</mat-icon> Administrar
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .eventos-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
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

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }

    .alert-banner.warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }

    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
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
      min-width: 240px;
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

    .estado-chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .chip-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip-btn:hover {
      background: #e2e8f0;
    }

    .chip-btn.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .counter-badge {
      margin-left: auto;
      font-size: 0.85rem;
      color: #64748b;
    }

    /* GRID DE ENCUENTROS */
    .encuentros-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .encuentro-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      overflow: hidden;
    }

    .encuentro-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
    }

    .cancha-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #0f172a;
    }

    .cancha-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0284c7;
    }

    .estado-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .st-borrador { background: #f1f5f9; color: #475569; }
    .st-publicado { background: #dcfce7; color: #15803d; }
    .st-en-juego { background: #dbeafe; color: #1d4ed8; animation: pulse 2s infinite; }
    .st-finalizado { background: #e2e8f0; color: #64748b; }
    .st-cancelado { background: #fee2e2; color: #b91c1c; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .card-main {
      padding: 1.25rem 1rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .encuentro-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: #64748b;
      flex-wrap: wrap;
    }

    .date-row mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .dot-sep {
      margin: 0 0.25rem;
    }

    /* TEAMS VERSUS */
    .teams-versus {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 0.5rem;
    }

    .team-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .team-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
    }

    .team-info {
      display: flex;
      flex-direction: column;
    }

    .team-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
    }

    .team-stars {
      font-size: 0.75rem;
      color: #64748b;
    }

    .vs-text {
      font-size: 0.75rem;
      font-weight: 800;
      color: #94a3b8;
    }

    .bet-info-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      border-radius: 6px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
    }

    .bet-info-pill mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .help-icon {
      margin-left: auto;
      cursor: help;
      color: #059669;
    }

    .card-footer {
      border-top: 1px solid #f1f5f9;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      gap: 0.5rem;
    }

    .public-link {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }

    .public-link mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .public-link:hover {
      text-decoration: underline;
    }

    .footer-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-sm {
      font-size: 0.8rem;
      height: 32px;
      padding: 0 10px;
    }

    .state-container, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: #64748b;
      text-align: center;
      gap: 0.75rem;
    }

    .empty-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
    }

    .empty-icon-circle mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class EventosListComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  encuentros = signal<Encuentro[]>([]);
  cargando = signal<boolean>(false);

  filtroTexto = '';
  filtroEstado = 'TODOS';

  estadosFiltro = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'BORRADOR', label: 'Borrador' },
    { key: 'PUBLICADO', label: 'Publicado' },
    { key: 'EN_JUEGO', label: 'En Juego' },
    { key: 'FINALIZADO', label: 'Finalizado' },
    { key: 'CANCELADO', label: 'Cancelado' }
  ];

  encuentrosFiltrados = computed(() => {
    let list = this.encuentros();
    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.toLowerCase().trim();
      list = list.filter(e => 
        e.nombre.toLowerCase().includes(q) || 
        e.canchaNombre.toLowerCase().includes(q)
      );
    }
    if (this.filtroEstado !== 'TODOS') {
      list = list.filter(e => e.estado === this.filtroEstado);
    }
    return list;
  });

  ngOnInit(): void {
    this.cargarEncuentros();
  }

  cargarEncuentros(): void {
    this.cargando.set(true);
    this.encuentrosService.getMisEncuentros().subscribe({
      next: (data) => {
        this.encuentros.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.snackBar.open('Error al cargar la lista de encuentros', 'Cerrar', { duration: 3000 });
        this.cargando.set(false);
      }
    });
  }

  publicar(encuentro: Encuentro): void {
    if (this.authService.isTecnicoPendiente()) return;

    Swal.fire({
      title: '¿Publicar este Encuentro?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p><b>🏆 Partido:</b> ${encuentro.nombre}</p>
          <p><b>🏟️ Cancha:</b> ${encuentro.canchaNombre}</p>
          <p><b>📅 Fecha:</b> ${encuentro.fecha} (${encuentro.horaInicio.slice(0,5)} - ${encuentro.horaFin.slice(0,5)})</p>
          <p>Al publicar, el partido se hará visible públicamente en el portal comunitario.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0066ff',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, publicar ahora',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Publicando encuentro...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        this.encuentrosService.publicarEncuentro(encuentro.id).subscribe({
          next: (actualizado) => {
            Swal.fire({
              icon: 'success',
              title: '¡Encuentro Publicado!',
              text: `"${actualizado.nombre}" ahora es visible en la página pública y en el portal.`,
              confirmButtonColor: '#0066ff'
            });
            this.encuentros.update(list => list.map(e => e.id === actualizado.id ? actualizado : e));
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al publicar',
              text: err.error?.message || 'No se pudo publicar el encuentro.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  getEstadoClass(estado: EstadoEncuentro): string {
    switch (estado) {
      case 'BORRADOR': return 'st-borrador';
      case 'PUBLICADO': return 'st-publicado';
      case 'EN_JUEGO': return 'st-en-juego';
      case 'FINALIZADO': return 'st-finalizado';
      case 'CANCELADO': return 'st-cancelado';
      default: return 'st-borrador';
    }
  }
}
