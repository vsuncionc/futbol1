import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { Encuentro } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-encuentro-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatCardModule
  ],
  template: `
    <div class="detail-page">
      <!-- Topbar Simple -->
      <header class="detail-navbar">
        <div class="container nav-content">
          <a routerLink="/" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            <span>Volver a la cartelera</span>
          </a>
          <span class="brand-badge">FUTBOL S.A.</span>
        </div>
      </header>

      @if (cargando()) {
        <div class="container loading-box">
          <mat-icon class="spin-icon">sync</mat-icon>
          <span>Cargando detalle del encuentro...</span>
        </div>
      } @else if (!encuentro()) {
        <div class="container empty-box">
          <mat-icon>error_outline</mat-icon>
          <h2>Encuentro no encontrado</h2>
          <a routerLink="/" mat-flat-button color="primary">Ir al inicio</a>
        </div>
      } @else {
        <div class="container main-detail">
          <!-- Banner Hero -->
          <div class="match-hero">
            <div class="hero-header">
              <span class="state-pill">{{ encuentro()!.estado }}</span>
              <div class="pitch-pill">
                <mat-icon>stadium</mat-icon>
                <span>{{ encuentro()!.canchaNombre }} ({{ encuentro()!.canchaTipo }})</span>
              </div>
            </div>

            <h1 class="match-title">{{ encuentro()!.nombre }}</h1>

            <div class="match-meta-bar">
              <div class="meta-item">
                <mat-icon>calendar_today</mat-icon>
                <span>{{ encuentro()!.fecha }}</span>
              </div>
              <div class="meta-item">
                <mat-icon>schedule</mat-icon>
                <span>{{ encuentro()!.horaInicio.slice(0,5) }} - {{ encuentro()!.horaFin.slice(0,5) }}</span>
              </div>
              <div class="meta-item">
                <mat-icon>person</mat-icon>
                <span>Organizador: {{ encuentro()!.tecnicoNombre }}</span>
              </div>
            </div>

            @if (encuentro()!.apuestaMonto) {
              <div class="bet-alert-box">
                <mat-icon>payments</mat-icon>
                <div>
                  <strong>Monto en disputa: S/ {{ encuentro()!.apuestaMonto }}</strong>
                  <div class="disclaimer-subtext">
                    ⚠️ Apuesta informativa: La plataforma no administra, retiene ni liquida dinero de apuestas.
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Duelo de Equipos y Jugadores -->
          <div class="teams-grid">
            @for (equipo of encuentro()!.equipos; track equipo.nombre) {
              <div class="team-column">
                <div class="team-header-card" [style.border-top-color]="equipo.color || '#0066FF'">
                  <div class="team-badge-circle" [style.background-color]="equipo.color || '#0066FF'"></div>
                  <h2 class="team-name">{{ equipo.nombre }}</h2>
                  <div class="team-stats">
                    <span class="star-badge">★ {{ equipo.totalEstrellas }} estrellas</span>
                    <span class="avg-badge">Promedio: {{ equipo.promedioEstrellas }}</span>
                    <span class="count-badge">{{ equipo.jugadores.length }} jugadores</span>
                  </div>
                </div>

                <!-- Lista de Jugadores -->
                <div class="players-list">
                  @for (j of equipo.jugadores; track j.id) {
                    <div class="player-card">
                      <div class="player-avatar" [style.background-color]="equipo.color || '#0066FF'">
                        {{ j.nombre.charAt(0) }}
                      </div>
                      <div class="player-info">
                        <div class="player-name-row">
                          <span class="p-name">{{ j.nombre }}</span>
                          @if (j.apodo) {
                            <span class="p-apodo">"{{ j.apodo }}"</span>
                          }
                        </div>
                        <div class="player-subrow">
                          <span class="p-pos">{{ j.posicion || 'Polifuncional' }}</span>
                          <span class="p-stars">
                            @for (s of [1,2,3,4,5]; track s) {
                              <mat-icon class="mini-star" [class.active-star]="s <= j.estrellas">star</mat-icon>
                            }
                          </span>
                        </div>
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
      background: #0b1a30;
      color: #f8fafc;
      min-height: 100vh;
      font-family: 'Inter', system-ui, sans-serif;
      padding-bottom: 4rem;
    }
    .container {
      max-width: 1050px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .detail-navbar {
      background: rgba(17, 35, 64, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1rem 0;
      margin-bottom: 2rem;
    }
    .nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .back-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .brand-badge {
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .match-hero {
      background: linear-gradient(135deg, #112340, #1e3a68);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 2.25rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }
    .hero-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .state-pill {
      background: #16a34a;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
    }
    .pitch-pill {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #38bdf8;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .pitch-pill mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .match-title {
      font-size: 2.25rem;
      font-weight: 800;
      margin: 0 0 1rem;
      color: #ffffff;
    }
    .match-meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      color: #cbd5e1;
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .meta-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #38bdf8;
    }
    .bet-alert-box {
      background: rgba(202, 138, 4, 0.2);
      border: 1px solid #ca8a04;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      color: #fef08a;
    }
    .bet-alert-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #facc15;
    }
    .disclaimer-subtext {
      font-size: 0.75rem;
      color: #fef9c3;
      margin-top: 0.2rem;
    }

    /* Teams Grid */
    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
    }
    .team-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .team-header-card {
      background: #112340;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 4px solid #0066FF;
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .team-badge-circle {
      width: 14px;
      height: 14px;
      border-radius: 50%;
    }
    .team-name {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
      color: #ffffff;
    }
    .team-stats {
      display: flex;
      gap: 0.65rem;
      font-size: 0.8rem;
    }
    .star-badge {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-weight: 700;
    }
    .avg-badge, .count-badge {
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }

    /* Players */
    .players-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .player-card {
      background: #112340;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .player-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
      color: white;
    }
    .player-info {
      flex: 1;
    }
    .player-name-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.2rem;
    }
    .p-name {
      font-weight: 700;
      color: #ffffff;
      font-size: 0.95rem;
    }
    .p-apodo {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.85rem;
    }
    .player-subrow {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .p-pos {
      color: #38bdf8;
      font-size: 0.75rem;
      text-transform: capitalize;
    }
    .p-stars {
      display: flex;
      align-items: center;
    }
    .mini-star {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: rgba(255, 255, 255, 0.2);
    }
    .active-star {
      color: #fbbf24;
    }

    .loading-box, .empty-box {
      text-align: center;
      padding: 5rem 1rem;
      color: #94a3b8;
    }
    .spin-icon {
      animation: spin 1.5s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class EncuentroDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private encuentrosService = inject(EncuentrosService);

  encuentro = signal<Encuentro | null>(null);
  cargando = signal<boolean>(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.cargarDetalle(id);
    } else {
      this.cargando.set(false);
    }
  }

  cargarDetalle(id: number): void {
    this.encuentrosService.getEncuentroPublicoDetalle(id).subscribe({
      next: (data) => {
        this.encuentro.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }
}
