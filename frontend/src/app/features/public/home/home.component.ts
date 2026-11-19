import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cancha, DisponibilidadSlot, Encuentro } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  template: `
    <div class="landing-page">
      <!-- HEADER NAVBAR PÚBLICO -->
      <header class="public-navbar">
        <div class="container nav-content">
          <div class="brand" routerLink="/">
            <div class="logo-shield">
              <mat-icon>sports_soccer</mat-icon>
            </div>
            <span class="brand-text">FUTBOL S.A.</span>
          </div>

          <div class="nav-actions">
            @if (authService.isAuthenticated()) {
              <a routerLink="/dashboard" mat-flat-button color="primary">
                <mat-icon>dashboard</mat-icon>
                <span>Ir al Panel</span>
              </a>
            } @else {
              <a routerLink="/auth/login" mat-stroked-button class="btn-login">
                <mat-icon>login</mat-icon>
                <span>Iniciar Sesión</span>
              </a>
              <a routerLink="/registro" mat-flat-button color="primary" class="btn-register">
                <mat-icon>how_to_reg</mat-icon>
                <span>Registrarse</span>
              </a>
            }
          </div>
        </div>
      </header>

      <!-- HERO SECTION -->
      <section class="hero-section">
        <div class="container hero-content">
          <div class="hero-badge">⚽ Plataforma Oficial de Encuentros</div>
          <h1 class="hero-title">Vive la Pasión del Fútbol Aficionado</h1>
          <p class="hero-subtitle">
            Descubre los próximos encuentros, consulta la disponibilidad de canchas en tiempo real y regístrate como técnico para organizar tus propios partidos.
          </p>
          <div class="hero-buttons">
            <button mat-flat-button color="primary" class="btn-cta-hero" (click)="onActionReservar()">
              <mat-icon>event_available</mat-icon>
              <span>Organizar un Encuentro</span>
            </button>
            <a href="#disponibilidad" mat-stroked-button class="btn-secondary-hero">
              <mat-icon>calendar_month</mat-icon>
              <span>Ver Canchas Libres</span>
            </a>
          </div>
        </div>
      </section>

      <!-- SECCIÓN: PRÓXIMOS ENCUENTROS -->
      <section class="section-encuentros" id="encuentros">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-tag">Cartelera Semanal</span>
              <h2 class="section-title">Próximos Encuentros</h2>
            </div>

            <!-- Filtros -->
            <div class="filters-row">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Filtrar por Cancha</mat-label>
                <mat-select [(ngModel)]="filtroCancha" (selectionChange)="cargarEncuentros()">
                  <mat-option [value]="null">Todas las Canchas</mat-option>
                  @for (c of canchas(); track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }} ({{ c.tipo }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Grid de Encuentros -->
          @if (cargandoEncuentros()) {
            <div class="loading-state">
              <mat-icon class="spin-icon">sync</mat-icon>
              <span>Cargando encuentros publicados...</span>
            </div>
          } @else if (encuentros().length === 0) {
            <div class="empty-state">
              <mat-icon>sports_soccer</mat-icon>
              <h3>No hay encuentros programados</h3>
              <p>Sé el primero en organizar un partido en nuestras canchas.</p>
              <button mat-flat-button color="primary" (click)="onActionReservar()">
                Crear Encuentro
              </button>
            </div>
          } @else {
            <div class="encuentros-grid">
              @for (e of encuentros(); track e.id) {
                <div class="encuentro-card" (click)="verDetalle(e.id)">
                  <!-- Banner del Encuentro -->
                  <div class="card-banner">
                    <div class="banner-gradient"></div>
                    <div class="banner-status-badge">
                      <span class="live-dot"></span>
                      <span>{{ e.estado }}</span>
                    </div>
                    @if (e.apuestaMonto) {
                      <div class="banner-bet-badge" title="La plataforma no administra dinero">
                        <mat-icon>payments</mat-icon>
                        <span>Apuesta Informativa: S/ {{ e.apuestaMonto }}</span>
                      </div>
                    }
                  </div>

                  <!-- Cuerpo de la tarjeta -->
                  <div class="card-body">
                    <h3 class="encuentro-title">{{ e.nombre }}</h3>

                    <div class="meta-row">
                      <div class="meta-item">
                        <mat-icon>calendar_today</mat-icon>
                        <span>{{ e.fecha }}</span>
                      </div>
                      <div class="meta-item">
                        <mat-icon>schedule</mat-icon>
                        <span>{{ e.horaInicio.slice(0,5) }} - {{ e.horaFin.slice(0,5) }}</span>
                      </div>
                      <div class="meta-item pitch-badge">
                        <mat-icon>stadium</mat-icon>
                        <span>{{ e.canchaNombre }}</span>
                      </div>
                    </div>

                    <!-- Duelo de Equipos -->
                    <div class="versus-container">
                      @if (e.equipos && e.equipos.length >= 2) {
                        <div class="team-block team-left">
                          <span class="team-badge-circle" [style.background-color]="e.equipos[0].color || '#0066FF'"></span>
                          <span class="team-name">{{ e.equipos[0].nombre }}</span>
                          <div class="stars-count">
                            <mat-icon class="star-icon">star</mat-icon>
                            <span>{{ e.equipos[0].totalEstrellas }}★ ({{ e.equipos[0].jugadores.length }} jug.)</span>
                          </div>
                        </div>

                        <div class="vs-badge">VS</div>

                        <div class="team-block team-right">
                          <span class="team-badge-circle" [style.background-color]="e.equipos[1].color || '#DC2626'"></span>
                          <span class="team-name">{{ e.equipos[1].nombre }}</span>
                          <div class="stars-count">
                            <mat-icon class="star-icon">star</mat-icon>
                            <span>{{ e.equipos[1].totalEstrellas }}★ ({{ e.equipos[1].jugadores.length }} jug.)</span>
                          </div>
                        </div>
                      }
                    </div>

                    @if (e.apuestaMonto) {
                      <div class="disclaimer-text">
                        ℹ️ Apuesta informativa: la plataforma no administra dinero.
                      </div>
                    }

                    <div class="card-footer">
                      <span class="view-link">Ver detalles y alineaciones →</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- SECCIÓN: DISPONIBILIDAD DE CANCHAS -->
      <section class="section-disponibilidad" id="disponibilidad">
        <div class="container">
          <div class="section-header">
            <div>
              <span class="section-tag">Estado de Canchas</span>
              <h2 class="section-title">Disponibilidad de Canchas</h2>
              <p class="section-desc">Horarios libres y ocupados en nuestras instalaciones (vista anónima en tiempo real).</p>
            </div>
          </div>

          <div class="canchas-status-grid">
            @for (c of canchas(); track c.id) {
              <div class="cancha-card">
                <div class="cancha-card-header">
                  <div class="cancha-icon-circle">
                    <mat-icon>stadium</mat-icon>
                  </div>
                  <div>
                    <h3 class="cancha-name">{{ c.nombre }}</h3>
                    <span class="cancha-type">{{ c.tipo }} · S/ {{ c.tarifaHora }} / hora</span>
                  </div>
                </div>

                <div class="cancha-body">
                  <div class="availability-badge-block">
                    <mat-icon style="color: #16a34a;">check_circle</mat-icon>
                    <span>Disponible para reservas hoy y próximos días</span>
                  </div>
                  <p class="cancha-desc">Césped sintético de alta tecnología con iluminación LED profesional y vestuarios.</p>
                </div>

                <div class="cancha-footer">
                  <button mat-stroked-button color="primary" class="w-100" (click)="onActionReservar()">
                    <mat-icon>add_circle_outline</mat-icon>
                    <span>Solicitar Reserva</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- BANNER CTA REGISTRO TÉCNICO -->
      <section class="cta-banner-section">
        <div class="container">
          <div class="cta-card">
            <div class="cta-text">
              <h2>¿Quieres organizar tus propios encuentros?</h2>
              <p>Regístrate como técnico, reserva canchas con tu comprobante y arma tus equipos con jugadores personalizados.</p>
            </div>
            <div class="cta-action">
              <a routerLink="/registro" mat-flat-button class="btn-cta-large">
                <mat-icon>person_add</mat-icon>
                <span>Registrarme como Técnico</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="public-footer">
        <div class="container footer-content">
          <div class="footer-brand">
            <span class="brand-title">FUTBOL S.A.</span>
            <p>Módulo Empresarial de Gestión de Encuentros Deportivos. Lima, Perú.</p>
          </div>
          <div class="footer-links">
            <span>Zona horaria: America/Lima (UTC-5)</span>
            <span>Moneda: PEN (S/)</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-page {
      background: #0b1a30;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .public-navbar {
      background: rgba(11, 26, 48, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 0.85rem 0;
    }
    .nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }
    .logo-shield {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #0066ff, #0284c7);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(0, 102, 255, 0.4);
    }
    .brand-text {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      background: linear-gradient(to right, #ffffff, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .btn-login {
      color: #e2e8f0 !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    /* Hero */
    .hero-section {
      padding: 4.5rem 0 3.5rem;
      background: radial-gradient(circle at 50% 20%, rgba(0, 102, 255, 0.25) 0%, transparent 70%);
      text-align: center;
    }
    .hero-content {
      max-width: 780px;
    }
    .hero-badge {
      display: inline-block;
      padding: 0.35rem 1rem;
      background: rgba(0, 102, 255, 0.18);
      border: 1px solid rgba(0, 102, 255, 0.4);
      border-radius: 30px;
      color: #60a5fa;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .hero-title {
      font-size: 2.75rem;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 1rem;
      color: #ffffff;
    }
    .hero-subtitle {
      font-size: 1.1rem;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 2rem;
    }
    .hero-buttons {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .btn-cta-hero {
      background: #0066ff !important;
      color: #ffffff !important;
      padding: 0 1.75rem !important;
      height: 48px !important;
      font-size: 1rem !important;
      border-radius: 24px !important;
      box-shadow: 0 4px 16px rgba(0, 102, 255, 0.4);
    }
    .btn-secondary-hero {
      color: #e2e8f0 !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
      height: 48px !important;
      border-radius: 24px !important;
    }

    /* Section Styles */
    .section-encuentros, .section-disponibilidad {
      padding: 3.5rem 0;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .section-tag {
      color: #38bdf8;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-title {
      font-size: 2rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0.25rem 0 0;
    }
    .section-desc {
      color: #94a3b8;
      margin: 0.25rem 0 0;
      font-size: 0.95rem;
    }

    /* Encuentros Grid */
    .encuentros-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.75rem;
    }
    .encuentro-card {
      background: #112340;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .encuentro-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
      border-color: rgba(0, 102, 255, 0.4);
    }
    .card-banner {
      height: 140px;
      background: linear-gradient(135deg, #0f2b48, #0066ff);
      position: relative;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .banner-status-badge {
      align-self: flex-start;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      color: #4ade80;
      padding: 0.25rem 0.65rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
    }
    .banner-bet-badge {
      align-self: flex-start;
      background: rgba(202, 138, 4, 0.9);
      color: white;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .banner-bet-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .card-body {
      padding: 1.25rem;
    }
    .encuentro-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 0.85rem;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .meta-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #38bdf8;
    }
    .pitch-badge {
      background: rgba(255, 255, 255, 0.06);
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      color: #e2e8f0;
    }

    /* Versus Block */
    .versus-container {
      background: rgba(0, 0, 0, 0.25);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .team-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .team-left {
      align-items: flex-start;
      text-align: left;
    }
    .team-right {
      align-items: flex-end;
      text-align: right;
    }
    .team-badge-circle {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .team-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
    }
    .stars-count {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.8rem;
      color: #fbbf24;
    }
    .star-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .vs-badge {
      font-size: 0.75rem;
      font-weight: 800;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      margin: 0 0.5rem;
    }
    .disclaimer-text {
      font-size: 0.75rem;
      color: #cbd5e1;
      background: rgba(202, 138, 4, 0.15);
      border-left: 3px solid #ca8a04;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
    .card-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 0.85rem;
      display: flex;
      justify-content: flex-end;
    }
    .view-link {
      font-size: 0.85rem;
      color: #38bdf8;
      font-weight: 600;
    }

    /* Canchas Status */
    .canchas-status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .cancha-card {
      background: #112340;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cancha-card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .cancha-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(0, 102, 255, 0.2);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cancha-name {
      margin: 0;
      font-size: 1.25rem;
      color: #ffffff;
      font-weight: 700;
    }
    .cancha-type {
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .availability-badge-block {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #4ade80;
      margin-bottom: 0.75rem;
    }
    .cancha-desc {
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
    }
    .cancha-footer {
      margin-top: 1.25rem;
    }
    .w-100 {
      width: 100%;
    }

    /* CTA Banner */
    .cta-banner-section {
      padding: 3rem 0;
    }
    .cta-card {
      background: linear-gradient(135deg, #0066ff, #0284c7);
      border-radius: 20px;
      padding: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      flex-wrap: wrap;
      box-shadow: 0 12px 32px rgba(0, 102, 255, 0.35);
    }
    .cta-text h2 {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      color: white;
    }
    .cta-text p {
      margin: 0;
      font-size: 1.05rem;
      color: rgba(255, 255, 255, 0.9);
      max-width: 600px;
    }
    .btn-cta-large {
      background: #ffffff !important;
      color: #0066ff !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      height: 48px !important;
      padding: 0 1.5rem !important;
      border-radius: 24px !important;
    }

    /* Footer */
    .public-footer {
      margin-top: auto;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2rem 0;
      background: #071224;
      font-size: 0.85rem;
      color: #64748b;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .footer-brand .brand-title {
      font-weight: 800;
      color: #94a3b8;
    }
    .footer-brand p {
      margin: 0.25rem 0 0;
    }
    .footer-links {
      display: flex;
      gap: 1.5rem;
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 3rem 1rem;
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
export class HomeComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private router = inject(Router);

  encuentros = signal<Encuentro[]>([]);
  canchas = signal<Cancha[]>([]);
  cargandoEncuentros = signal<boolean>(true);
  filtroCancha: number | null = null;

  ngOnInit(): void {
    this.cargarCanchas();
    this.cargarEncuentros();
  }

  cargarCanchas(): void {
    this.encuentrosService.getCanchas().subscribe({
      next: (data) => this.canchas.set(data),
      error: () => {}
    });
  }

  cargarEncuentros(): void {
    this.cargandoEncuentros.set(true);
    this.encuentrosService.getEncuentrosPublicos(this.filtroCancha || undefined).subscribe({
      next: (data) => {
        this.encuentros.set(data);
        this.cargandoEncuentros.set(false);
      },
      error: () => this.cargandoEncuentros.set(false)
    });
  }

  verDetalle(id: number): void {
    this.router.navigate(['/publico/encuentros', id]);
  }

  onActionReservar(): void {
    if (this.authService.isAuthenticated()) {
      if (this.authService.isTecnico()) {
        this.router.navigate(['/encuentros/reservas/mias']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.router.navigate(['/registro']);
    }
  }
}
