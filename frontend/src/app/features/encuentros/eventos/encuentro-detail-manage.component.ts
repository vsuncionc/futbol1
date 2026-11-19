import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  selector: 'app-encuentro-detail-manage',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="detail-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <a routerLink="/encuentros/eventos">Eventos</a>
            <mat-icon>chevron_right</mat-icon>
            <span class="current">{{ encuentro()?.nombre || 'Detalle' }}</span>
          </div>
          <div class="title-row">
            <h1>{{ encuentro()?.nombre || 'Cargando encuentro...' }}</h1>
            @if (encuentro()) {
              <span class="estado-badge" [ngClass]="getEstadoClass(encuentro()!.estado)">
                {{ encuentro()!.estado }}
              </span>
            }
          </div>
        </div>

        @if (encuentro()) {
          <div class="header-actions">
            <!-- COPIAR LINK PÚBLICO -->
            <button mat-stroked-button (click)="copiarLinkPublico()">
              <mat-icon>share</mat-icon>
              <span>Compartir</span>
            </button>

            <!-- ACCIÓN PUBLICAR -->
            @if (encuentro()!.estado === 'BORRADOR') {
              <button 
                mat-flat-button 
                color="primary" 
                (click)="publicar()" 
                [disabled]="authService.isTecnicoPendiente()">
                <mat-icon>publish</mat-icon>
                <span>Publicar Encuentro</span>
              </button>
            }

            <!-- ACCIÓN CANCELAR -->
            @if (encuentro()!.estado !== 'CANCELADO' && encuentro()!.estado !== 'FINALIZADO') {
              <button 
                mat-stroked-button 
                color="warn" 
                (click)="cancelar()" 
                [disabled]="authService.isTecnicoPendiente()">
                <mat-icon>cancel</mat-icon>
                <span>Cancelar</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- ESTADOS DE CARGA -->
      @if (cargando()) {
        <div class="loading-state">
          <mat-icon class="spin">sync</mat-icon>
          <span>Cargando detalles del encuentro...</span>
        </div>
      } @else if (errorMensaje()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ errorMensaje() }}</span>
        </div>
      } @else if (encuentro()) {
        <!-- BANNER DE ENCUENTRO -->
        @if (encuentro()!.bannerUrl) {
          <div class="banner-wrapper">
            <img [src]="encuentrosService.getArchivoPublicoUrl(encuentro()!.bannerUrl)" alt="Banner del partido" class="banner-img" />
          </div>
        }

        <!-- DETALLES DE RESERVA Y CANCHA -->
        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-icon-box">
              <mat-icon>stadium</mat-icon>
            </div>
            <div class="meta-content">
              <span class="meta-label">Cancha</span>
              <strong class="meta-value">{{ encuentro()!.canchaNombre }}</strong>
              <span class="meta-sub">{{ encuentro()!.canchaTipo }}</span>
            </div>
          </div>

          <div class="meta-card">
            <div class="meta-icon-box">
              <mat-icon>calendar_today</mat-icon>
            </div>
            <div class="meta-content">
              <span class="meta-label">Fecha y Horario</span>
              <strong class="meta-value">{{ encuentro()!.fecha | date:'fullDate':'UTC':'es-PE' }}</strong>
              <span class="meta-sub">{{ encuentro()!.horaInicio }} - {{ encuentro()!.horaFin }}</span>
            </div>
          </div>

          <div class="meta-card">
            <div class="meta-icon-box">
              <mat-icon>sports</mat-icon>
            </div>
            <div class="meta-content">
              <span class="meta-label">Organizador</span>
              <strong class="meta-value">{{ encuentro()!.tecnicoNombre }}</strong>
              <span class="meta-sub">Técnico a cargo</span>
            </div>
          </div>

          @if (encuentro()!.apuestaMonto) {
            <div class="meta-card highlight">
              <div class="meta-icon-box green">
                <mat-icon>paid</mat-icon>
              </div>
              <div class="meta-content">
                <span class="meta-label">Apuesta Informativa</span>
                <strong class="meta-value green">S/ {{ encuentro()!.apuestaMonto | number:'1.2-2' }}</strong>
                <span class="meta-sub">Por jugador acordado</span>
              </div>
            </div>
          }
        </div>

        <!-- DISCLAIMER DE APUESTA RN-19 -->
        @if (encuentro()!.apuestaMonto) {
          <div class="disclaimer-alert">
            <mat-icon>info</mat-icon>
            <span>
              <strong>Aviso Legal de Apuesta Informativa:</strong> La plataforma FUTBOL S.A. no retiene, custodia ni administra fondos ni apuestas. Este valor es estrictamente referencial y coordinado de forma privada entre los jugadores participantes.
            </span>
          </div>
        }

        <!-- SECCIÓN DE EQUIPOS -->
        <div class="teams-section">
          <h2>Equipos y Planteles</h2>
          <div class="teams-grid">
            @for (equipo of encuentro()!.equipos; track equipo.id || equipo.nombre) {
              <div class="team-panel">
                <div class="team-panel-header" [style.border-top-color]="equipo.color || '#3b82f6'">
                  <div class="team-panel-title">
                    <span class="color-dot" [style.background-color]="equipo.color || '#3b82f6'"></span>
                    <h3>{{ equipo.nombre }}</h3>
                  </div>
                  <div class="team-panel-stats">
                    <span class="count-tag">{{ equipo.jugadores.length }} jugadores</span>
                    <span class="stars-tag">{{ equipo.promedioEstrellas | number:'1.1-1' }} ⭐</span>
                  </div>
                </div>

                <div class="roster-list">
                  @for (j of equipo.jugadores; track j.id) {
                    <div class="roster-row">
                      <div class="player-avatar" [ngClass]="getPosClass(j.posicion)">
                        {{ getInitials(j.nombre) }}
                      </div>
                      <div class="player-details">
                        <span class="player-name">{{ j.nombre }}</span>
                        @if (j.apodo) {
                          <span class="player-apodo">"{{ j.apodo }}"</span>
                        }
                      </div>
                      <span class="pos-badge" [ngClass]="getPosClass(j.posicion)">
                        {{ j.posicion || 'JUG' }}
                      </span>
                      <div class="player-stars">
                        <span>{{ j.estrellas }} ⭐</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-page {
      padding: 1.5rem;
      max-width: 1100px;
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

    .breadcrumb a {
      color: #0284c7;
      text-decoration: none;
    }

    .breadcrumb .current {
      color: #0f172a;
      font-weight: 600;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .estado-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .st-borrador { background: #f1f5f9; color: #475569; }
    .st-publicado { background: #dcfce7; color: #15803d; }
    .st-en-juego { background: #dbeafe; color: #1d4ed8; }
    .st-finalizado { background: #e2e8f0; color: #64748b; }
    .st-cancelado { background: #fee2e2; color: #b91c1c; }

    .banner-wrapper {
      width: 100%;
      height: 240px;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .banner-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .meta-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .meta-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #eff6ff;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .meta-icon-box.green {
      background: #ecfdf5;
      color: #059669;
    }

    .meta-content {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
    }

    .meta-value {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .meta-value.green {
      color: #059669;
    }

    .meta-sub {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .disclaimer-alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }

    .disclaimer-alert mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    /* TEAMS SECTION */
    .teams-section {
      margin-top: 1.5rem;
    }

    .teams-section h2 {
      margin: 0 0 1rem;
      font-size: 1.3rem;
      font-weight: 700;
      color: #0f172a;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .team-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 4px solid #3b82f6;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }

    .team-panel-header {
      padding: 0.85rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .team-panel-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .team-panel-title h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .team-panel-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .count-tag {
      font-size: 0.8rem;
      color: #64748b;
    }

    .stars-tag {
      background: #fef3c7;
      color: #b45309;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
    }

    .roster-list {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .roster-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.4rem 0.5rem;
      border-radius: 6px;
      background: #f8fafc;
      border: 1px solid #f1f5f9;
    }

    .player-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pos-portero { background-color: #eab308; }
    .pos-defensa { background-color: #3b82f6; }
    .pos-medio { background-color: #10b981; }
    .pos-delantero { background-color: #ef4444; }

    .player-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .player-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #0f172a;
    }

    .player-apodo {
      font-size: 0.75rem;
      color: #64748b;
      font-style: italic;
    }

    .pos-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #ffffff;
      text-transform: uppercase;
    }

    .player-stars {
      font-size: 0.8rem;
      font-weight: 700;
      color: #b45309;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #64748b;
      gap: 0.75rem;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 1rem;
      border-radius: 8px;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .teams-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EncuentroDetailManageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  public encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  encuentro = signal<Encuentro | null>(null);
  cargando = signal<boolean>(false);
  errorMensaje = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.cargarEncuentro(parseInt(idParam, 10));
    }
  }

  cargarEncuentro(id: number): void {
    this.cargando.set(true);
    this.encuentrosService.getEncuentroPorId(id).subscribe({
      next: (data) => {
        this.encuentro.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.errorMensaje.set(err.error?.message || 'No se pudo cargar el encuentro.');
        this.cargando.set(false);
      }
    });
  }

  copiarLinkPublico(): void {
    if (!this.encuentro()) return;
    const url = `${window.location.origin}/publico/encuentros/${this.encuentro()!.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.snackBar.open('¡Enlace público copiado al portapapeles!', 'Cerrar', { duration: 2500 });
    });
  }

  publicar(): void {
    if (!this.encuentro() || this.authService.isTecnicoPendiente()) return;

    Swal.fire({
      title: '¿Publicar este Encuentro?',
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p><b>🏆 Partido:</b> ${this.encuentro()!.nombre}</p>
          <p><b>🏟️ Cancha:</b> ${this.encuentro()!.canchaNombre}</p>
          <p><b>📅 Fecha:</b> ${this.encuentro()!.fecha} (${this.encuentro()!.horaInicio.slice(0,5)} - ${this.encuentro()!.horaFin.slice(0,5)})</p>
          <p>El partido quedará visible al público de forma inmediata.</p>
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

        this.encuentrosService.publicarEncuentro(this.encuentro()!.id).subscribe({
          next: (actualizado) => {
            this.encuentro.set(actualizado);
            Swal.fire({
              icon: 'success',
              title: '¡Encuentro Publicado!',
              text: 'El encuentro ha sido publicado y ya es visible al público.',
              confirmButtonColor: '#0066ff'
            });
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

  cancelar(): void {
    if (!this.encuentro() || this.authService.isTecnicoPendiente()) return;

    Swal.fire({
      title: '¿Cancelar este Encuentro Deportivo?',
      text: 'Esta acción cancelará el evento y notificará a los participantes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cancelar encuentro',
      cancelButtonText: 'Volver'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Cancelando encuentro...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        this.encuentrosService.cancelarEncuentro(this.encuentro()!.id).subscribe({
          next: (actualizado) => {
            this.encuentro.set(actualizado);
            Swal.fire({
              icon: 'success',
              title: 'Encuentro Cancelado',
              text: 'El evento ha sido cancelado.',
              confirmButtonColor: '#0066ff'
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al cancelar',
              text: err.error?.message || 'No se pudo cancelar el encuentro.',
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

  getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getPosClass(posicion?: string): string {
    switch (posicion) {
      case 'PORTERO': return 'pos-portero';
      case 'DEFENSA': return 'pos-defensa';
      case 'MEDIOCAMPISTA': return 'pos-medio';
      case 'DELANTERO': return 'pos-delantero';
      default: return 'pos-medio';
    }
  }
}
