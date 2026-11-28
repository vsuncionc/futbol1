import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cancha, DisponibilidadSlot, Encuentro } from '../../../core/models/encuentros.models';

export interface DiaCalendario {
  fecha: Date;
  fechaStr: string;
  nombreDia: string;
  diaNumero: number;
  mesNombre: string;
  esHoy: boolean;
  esSeleccionado: boolean;
  totalEncuentros: number;
}

export interface SlotHorarioView {
  horaInicio: string;
  horaFin: string;
  canchaId: number;
  canchaNombre: string;
  canchaTipo: string;
  tarifaHora: number;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'ENCUENTRO';
  encuentro?: Encuentro;
}

export interface HeroSlide {
  id: number;
  imagen: string;
}

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
    MatInputModule,
    MatTooltipModule
  ],
  template: `
    <div class="landing-page">
      <!-- HEADER NAVBAR DEPORTIVO ESTILO CLUB/LIGA -->
      <header class="public-navbar">
        <div class="container nav-content">
          <div class="brand" routerLink="/">
            <div class="logo-shield">
              <mat-icon>sports_soccer</mat-icon>
            </div>
            <div class="brand-text-col">
              <span class="brand-text">FUTBOL S.A.</span>
              <span class="brand-sub">PORTAL DEPORTIVO OFICIAL</span>
            </div>
          </div>

          <!-- Enlaces de Navegación Rápida -->
          <nav class="nav-links d-none-mobile">
            <a href="#hero" class="nav-link active">INICIO</a>
            <a href="#encuentros" class="nav-link">TORNEOS Y COPAS</a>
            <a href="#canchas" class="nav-link">CANCHAS</a>
            <a href="#calendario-deportivo" class="nav-link nav-link-highlight">
              <mat-icon class="pulse-icon">calendar_month</mat-icon>
              <span>CALENDARIO SEMANAL</span>
            </a>
            <a href="#reglamento" class="nav-link">REGLAMENTO</a>
          </nav>

          <div class="nav-actions">
            @if (authService.isAuthenticated()) {
              <a routerLink="/dashboard" mat-flat-button class="btn-panel-top">
                <mat-icon>dashboard</mat-icon>
                <span>Ir al Panel</span>
              </a>
            } @else {
              <a routerLink="/auth/login" mat-stroked-button class="btn-login-top">
                <mat-icon>login</mat-icon>
                <span>Iniciar Sesión</span>
              </a>
              <a routerLink="/registro" mat-flat-button class="btn-register-top">
                <mat-icon>how_to_reg</mat-icon>
                <span>Registrarse</span>
              </a>
            }
          </div>
        </div>
      </header>

      <!-- HERO SECTION DEPORTIVO DE ALTO IMPACTO CON SLIDER DE FÚTBOL -->
      <section class="hero-section" id="hero" (mouseenter)="pausarSlider()" (mouseleave)="reanudarSlider()">
        <!-- SLIDER TRACK DE IMÁGENES DE FÚTBOL (SOLO FOTOS) -->
        <div class="hero-slider-container">
          @for (s of slides; track s.id; let idx = $index) {
            <div class="hero-slide-item" [class.active]="currentSlideIndex() === idx">
              <!-- Imagen de Fútbol de Alta Calidad -->
              <div class="hero-slide-bg" [style.background-image]="'url(' + s.imagen + ')'"></div>
              <div class="hero-slide-overlay"></div>
            </div>
          }

          <!-- Controles de Navegación del Slider: Flechas Prev / Next -->
          <button class="slider-arrow arrow-left" type="button" (click)="anteriorSlide()" aria-label="Foto anterior" matTooltip="Foto anterior">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button class="slider-arrow arrow-right" type="button" (click)="siguienteSlide()" aria-label="Foto siguiente" matTooltip="Siguiente foto">
            <mat-icon>chevron_right</mat-icon>
          </button>

          <!-- Paginación de Puntos (Dots ● ○ ○) -->
          <div class="slider-dots-nav">
            @for (s of slides; track s.id; let idx = $index) {
              <button type="button" 
                      class="slider-dot" 
                      [class.active]="currentSlideIndex() === idx" 
                      (click)="irASlide(idx)" 
                      [attr.aria-label]="'Ir a foto ' + (idx + 1)">
                <span class="dot-inner"></span>
              </button>
            }
          </div>
        </div>

        <!-- Stats Deportivos Rápidos en la base del Slider -->
        <div class="hero-stats-wrapper">
          <div class="container">
            <div class="hero-stats-row">
              <div class="stat-card">
                <div class="stat-icon-wrap">
                  <mat-icon>stadium</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-value">3 Canchas</span>
                  <span class="stat-label">F5 · F7 · F11 Sintético Pro</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-wrap">
                  <mat-icon>stars</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-value">Nivel 1 - 5★</span>
                  <span class="stat-label">Equipos Balanceados</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-wrap">
                  <mat-icon>payments</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-value">Bolsa Transparente</span>
                  <span class="stat-label">Apuesta Informativa</span>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon-wrap">
                  <mat-icon>schedule</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-value">08:00 - 23:30</span>
                  <span class="stat-label">Iluminación LED Nocturna</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SECCIÓN: CARTELERA DE ENCUENTROS Y TORNEOS -->
      <section class="section-encuentros" id="encuentros">
        <div class="container">
          <div class="section-topbar">
            <div class="section-headings">
              <div class="tag-row">
                <span class="sports-tag">🏆 CARTELERA OFICIAL</span>
                <span class="live-counter">{{ encuentros().length }} Partido(s) Programado(s)</span>
              </div>
              <h2 class="section-title">Próximos Encuentros y Torneos</h2>
              <p class="section-desc">Sigue los partidos estelares, consulta las alineaciones de los técnicos y asiste a los encuentros.</p>
            </div>

            <!-- Filtros de la Cartelera -->
            <div class="filters-bar">
              <mat-form-field appearance="outline" class="cancha-filter-select">
                <mat-label>Filtrar por Cancha</mat-label>
                <mat-select [(ngModel)]="filtroCancha" (selectionChange)="cargarEncuentros()">
                  <mat-option [value]="null">🏟️ Todas las Canchas</mat-option>
                  @for (c of canchas(); track c.id) {
                    <mat-option [value]="c.id">{{ c.nombre }} ({{ c.tipo }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Grid de Encuentros Deportivos -->
          @if (cargandoEncuentros()) {
            <div class="loading-state">
              <mat-icon class="spin-icon">sync</mat-icon>
              <span>Cargando encuentros y alineaciones en vivo...</span>
            </div>
          } @else if (encuentros().length === 0) {
            <div class="empty-state-sports">
              <div class="empty-icon-circle">
                <mat-icon>sports_soccer</mat-icon>
              </div>
              <h3>No hay partidos en esta cancha actualmente</h3>
              <p>Sé el primer técnico en crear un encuentro deportivo y desafiar a otros equipos.</p>
              <button mat-flat-button class="btn-cta-gold" (click)="onActionReservar()">
                <mat-icon>add_circle_outline</mat-icon>
                <span>Crear Primer Encuentro</span>
              </button>
            </div>
          } @else {
            <div class="encuentros-sports-grid">
              @for (e of encuentros(); track e.id) {
                <div class="sports-match-card" (click)="verDetalle(e.id)">
                  <!-- Encabezado de la Tarjeta del Encuentro -->
                  <div class="match-card-top">
                    <div class="match-category-pill">
                      <mat-icon>military_tech</mat-icon>
                      <span>COPA / ENCUENTRO OFICIAL</span>
                    </div>

                    <div class="match-status-badge">
                      <span class="pulse-dot-green"></span>
                      <span>{{ e.estado }}</span>
                    </div>
                  </div>

                  <!-- Título del Encuentro -->
                  <h3 class="match-name">{{ e.nombre }}</h3>

                  <!-- Metadata: Fecha, Hora y Cancha -->
                  <div class="match-meta-pills">
                    <div class="meta-pill">
                      <mat-icon>calendar_today</mat-icon>
                      <span>{{ e.fecha }}</span>
                    </div>
                    <div class="meta-pill">
                      <mat-icon>schedule</mat-icon>
                      <span>{{ e.horaInicio.slice(0,5) }} - {{ e.horaFin.slice(0,5) }}</span>
                    </div>
                    <div class="meta-pill pitch-pill">
                      <mat-icon>stadium</mat-icon>
                      <span>{{ e.canchaNombre }} ({{ e.canchaTipo }})</span>
                    </div>
                  </div>

                  <!-- Duelo de Equipos (VERSUS BOX) -->
                  <div class="versus-arena">
                    @if (e.equipos && e.equipos.length >= 2) {
                      <!-- Equipo 1 -->
                      <div class="team-side team-one">
                        <div class="team-jersey-wrap" [style.border-color]="e.equipos[0].color || '#dc2626'">
                          <div class="team-jersey" [style.background-color]="e.equipos[0].color || '#dc2626'">
                            <mat-icon>shield</mat-icon>
                          </div>
                        </div>
                        <span class="team-title">{{ e.equipos[0].nombre }}</span>
                        <div class="team-stars-rating">
                          <mat-icon class="star-icon">star</mat-icon>
                          <span>{{ e.equipos[0].totalEstrellas }}★</span>
                          <span class="player-count">({{ e.equipos[0].jugadores.length }} jug.)</span>
                        </div>
                      </div>

                      <!-- Insignia VS Central -->
                      <div class="vs-emblem">
                        <span class="vs-text">VS</span>
                      </div>

                      <!-- Equipo 2 -->
                      <div class="team-side team-two">
                        <div class="team-jersey-wrap" [style.border-color]="e.equipos[1].color || '#0066ff'">
                          <div class="team-jersey" [style.background-color]="e.equipos[1].color || '#0066ff'">
                            <mat-icon>shield</mat-icon>
                          </div>
                        </div>
                        <span class="team-title">{{ e.equipos[1].nombre }}</span>
                        <div class="team-stars-rating">
                          <mat-icon class="star-icon">star</mat-icon>
                          <span>{{ e.equipos[1].totalEstrellas }}★</span>
                          <span class="player-count">({{ e.equipos[1].jugadores.length }} jug.)</span>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Apuesta Informativa / Bolsa -->
                  @if (e.apuestaMonto) {
                    <div class="bet-info-banner">
                      <div class="bet-badge">
                        <mat-icon>payments</mat-icon>
                        <span>Bolsa Informativa: S/ {{ e.apuestaMonto }}</span>
                      </div>
                      <span class="bet-notice">Acuerdo amistoso entre técnicos</span>
                    </div>
                  }

                  <!-- Pie con Botón de Acción -->
                  <div class="match-card-footer">
                    <span class="organizer-name">Técnico: {{ e.tecnicoNombre || 'Organizador' }}</span>
                    <button class="btn-view-match" type="button">
                      <span>Ver Ficha y Alineación</span>
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- SECCIÓN: NUESTRAS CANCHAS DEPORTIVAS -->
      <section class="section-canchas" id="canchas">
        <div class="container">
          <div class="section-topbar">
            <div>
              <span class="sports-tag">⚽ NUESTRAS INSTALACIONES</span>
              <h2 class="section-title">Canchas Deportivas Reglamentarias</h2>
              <p class="section-desc">Césped sintético monofilamento de última generación, iluminación LED nocturna y vestuarios completos.</p>
            </div>
          </div>

          <div class="canchas-showcase-grid">
            @for (c of canchas(); track c.id) {
              <div class="cancha-showcase-card">
                <div class="cancha-header-strip">
                  <div class="cancha-type-chip">{{ c.tipo }}</div>
                  <div class="cancha-status-live">
                    <span class="dot-green"></span>
                    <span>Disponible</span>
                  </div>
                </div>

                <div class="cancha-icon-banner">
                  <mat-icon>stadium</mat-icon>
                </div>

                <div class="cancha-info-content">
                  <h3 class="cancha-title">{{ c.nombre }}</h3>
                  <p class="cancha-features">
                    @if (c.tipo === 'F5') {
                      Ideal para Fútbol 5 (5 vs 5) · Dimensiones 20m x 30m · Balón #4 oficial
                    } @else if (c.tipo === 'F7') {
                      Fútbol 7 (7 vs 7) · Dimensiones 30m x 50m · Arcos reglamentarios
                    } @else {
                      Fútbol 11 Profesional (11 vs 11) · Medidas oficiales y tribuna
                    }
                  </p>

                  <div class="cancha-pricing-box">
                    <span class="price-currency">S/</span>
                    <span class="price-value">{{ c.tarifaHora }}</span>
                    <span class="price-unit">/ hora</span>
                  </div>
                </div>

                <div class="cancha-action-strip">
                  <button mat-stroked-button class="btn-check-slots" (click)="filtrarCalendarioPorCancha(c.id)">
                    <mat-icon>event</mat-icon>
                    <span>Ver Horarios en Calendario</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- ========================================================================= -->
      <!-- SECCIÓN DESTACADA: CALENDARIO DEPORTIVO SEMANAL EN LA PARTE DE ABAJO      -->
      <!-- ========================================================================= -->
      <section class="section-calendario-bottom" id="calendario-deportivo">
        <div class="calendar-ambient-light"></div>
        <div class="container">
          <!-- Encabezado del Calendario -->
          <div class="calendar-hero-header">
            <div class="calendar-badge">
              <mat-icon>calendar_month</mat-icon>
              <span>PROGRAMACIÓN OFICIAL EN TIEMPO REAL</span>
            </div>
            <h2 class="calendar-main-title">
              Calendario Semanal de <span class="text-accent">Canchas y Encuentros</span>
            </h2>
            <p class="calendar-main-desc">
              Selecciona un día de la semana para explorar los horarios libres para reserva y los partidos oficiales programados en cada cancha.
            </p>
          </div>

          <!-- Panel Principal del Calendario -->
          <div class="calendar-glass-panel">
            
            <!-- Barra Superior: Controles de Navegación de Semana -->
            <div class="calendar-controls-bar">
              <div class="week-nav-group">
                <button mat-stroked-button class="btn-week-nav" (click)="semanaAnterior()" matTooltip="Ver semana anterior">
                  <mat-icon>chevron_left</mat-icon>
                  <span class="d-none-mobile">Semana Anterior</span>
                </button>

                <button mat-flat-button class="btn-today-pill" (click)="irAHoy()">
                  <mat-icon>today</mat-icon>
                  <span>Ir a Hoy</span>
                </button>

                <button mat-stroked-button class="btn-week-nav" (click)="semanaSiguiente()" matTooltip="Ver semana siguiente">
                  <span class="d-none-mobile">Semana Siguiente</span>
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </div>

              <!-- Selector / Filtro de Cancha en el Calendario -->
              <div class="calendar-cancha-pills">
                <button type="button" 
                        class="cancha-pill" 
                        [class.active]="filtroCanchaCalendario() === null"
                        (click)="setFiltroCanchaCalendario(null)">
                  <mat-icon>apps</mat-icon>
                  <span>Todas las Canchas</span>
                </button>

                @for (c of canchas(); track c.id) {
                  <button type="button" 
                          class="cancha-pill" 
                          [class.active]="filtroCanchaCalendario() === c.id"
                          (click)="setFiltroCanchaCalendario(c.id)">
                    <mat-icon>sports_soccer</mat-icon>
                    <span>{{ c.nombre }} ({{ c.tipo }})</span>
                  </button>
                }
              </div>
            </div>

            <!-- Carrusel / Cinta Semanal de Días (7 Días) -->
            <div class="week-days-carousel">
              @for (dia of diasSemana(); track dia.fechaStr) {
                <div class="day-card-btn" 
                     [class.selected]="dia.esSeleccionado" 
                     [class.is-today]="dia.esHoy"
                     (click)="seleccionarDia(dia.fechaStr)">
                  @if (dia.esHoy) {
                    <span class="today-tag">HOY</span>
                  }
                  <span class="day-name">{{ dia.nombreDia }}</span>
                  <span class="day-number">{{ dia.diaNumero }}</span>
                  <span class="day-month">{{ dia.mesNombre }}</span>

                  @if (dia.totalEncuentros > 0) {
                    <div class="day-events-indicator" matTooltip="Partidos programados este día">
                      <span class="dot-event"></span>
                      <span>{{ dia.totalEncuentros }} Partido(s)</span>
                    </div>
                  } @else {
                    <div class="day-free-indicator">
                      <span>Canchas Libres</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Cabecera del Día Seleccionado y Estadísticas del Día -->
            <div class="selected-day-banner">
              <div class="day-banner-left">
                <mat-icon class="calendar-day-icon">event_available</mat-icon>
                <div>
                  <h3 class="day-banner-title">
                    Horarios para el {{ formatFechaLarga(fechaSeleccionada()) }}
                  </h3>
                  <span class="day-banner-sub">
                    Estado en tiempo real de disponibilidad y programación oficial
                  </span>
                </div>
              </div>

              <!-- Leyenda de Colores del Calendario -->
              <div class="calendar-legend-bar">
                <div class="legend-item">
                  <span class="legend-dot dot-free"></span>
                  <span>Libre (Reserva inmediata)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot dot-match"></span>
                  <span>Partido / Torneo Oficial</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot dot-busy"></span>
                  <span>Horario Ocupado</span>
                </div>
              </div>
            </div>

            <!-- Grilla / Timeline de Horarios del Día -->
            <div class="schedule-slots-container">
              @if (cargandoDisponibilidad()) {
                <div class="loading-state">
                  <mat-icon class="spin-icon">sync</mat-icon>
                  <span>Consultando horarios y partidos del día...</span>
                </div>
              } @else if (slotsCalculados().length === 0) {
                <div class="empty-state-slots">
                  <mat-icon>event_busy</mat-icon>
                  <p>No hay canchas registradas para mostrar horarios.</p>
                </div>
              } @else {
                <div class="slots-timeline-grid">
                  @for (slot of slotsCalculados(); track slot.canchaId + slot.horaInicio) {
                    <div class="slot-card" [class.slot-free]="slot.estado === 'DISPONIBLE'" [class.slot-match]="slot.estado === 'ENCUENTRO'" [class.slot-occupied]="slot.estado === 'OCUPADO'">
                      <!-- Horario -->
                      <div class="slot-time-col">
                        <mat-icon>schedule</mat-icon>
                        <span class="time-range">{{ slot.horaInicio }} - {{ slot.horaFin }}</span>
                      </div>

                      <!-- Información de la Cancha -->
                      <div class="slot-pitch-col">
                        <div class="pitch-badge-mini">{{ slot.canchaTipo }}</div>
                        <span class="pitch-title">{{ slot.canchaNombre }}</span>
                      </div>

                      <!-- Estado / Detalles del Encuentro -->
                      <div class="slot-content-col">
                        @if (slot.estado === 'ENCUENTRO' && slot.encuentro) {
                          <div class="slot-match-details">
                            <div class="match-mini-tag">
                              <mat-icon>military_tech</mat-icon>
                              <span>ENCUENTRO PROGRAMADO</span>
                            </div>
                            <h4 class="slot-match-title">{{ slot.encuentro.nombre }}</h4>
                            @if (slot.encuentro.equipos && slot.encuentro.equipos.length >= 2) {
                              <div class="slot-teams-versus">
                                <span class="team-dot" [style.background-color]="slot.encuentro.equipos[0].color || '#dc2626'"></span>
                                <span class="t-name">{{ slot.encuentro.equipos[0].nombre }}</span>
                                <span class="vs-mini">VS</span>
                                <span class="team-dot" [style.background-color]="slot.encuentro.equipos[1].color || '#0066ff'"></span>
                                <span class="t-name">{{ slot.encuentro.equipos[1].nombre }}</span>
                              </div>
                            }
                          </div>
                        } @else if (slot.estado === 'OCUPADO') {
                          <div class="slot-busy-details">
                            <span class="busy-badge">RESERVADO</span>
                            <span class="busy-desc">Uso particular / entrenamiento de equipo</span>
                          </div>
                        } @else {
                          <div class="slot-free-details">
                            <span class="free-badge">✓ DISPONIBLE</span>
                            <span class="free-desc">Tarifa: S/ {{ slot.tarifaHora }} / hora · Incluye iluminación LED</span>
                          </div>
                        }
                      </div>

                      <!-- Acción -->
                      <div class="slot-action-col">
                        @if (slot.estado === 'ENCUENTRO' && slot.encuentro) {
                          <button mat-flat-button class="btn-slot-match" (click)="verDetalle(slot.encuentro.id)">
                            <mat-icon>visibility</mat-icon>
                            <span>Ver Partido</span>
                          </button>
                        } @else if (slot.estado === 'DISPONIBLE') {
                          <button mat-flat-button class="btn-slot-reserve" (click)="solicitarHorarioEspecifico(slot)">
                            <mat-icon>add_circle</mat-icon>
                            <span>Solicitar Horario</span>
                          </button>
                        } @else {
                          <button mat-stroked-button disabled class="btn-slot-disabled">
                            <mat-icon>lock</mat-icon>
                            <span>Ocupado</span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Banner CTA Rápido debajo del Calendario -->
            <div class="calendar-bottom-cta">
              <div class="cta-left">
                <mat-icon class="trophy-gold">emoji_events</mat-icon>
                <div>
                  <h4>¿Deseas armar tu propio torneo o alquilar un horario fijo?</h4>
                  <p>Inscríbete como técnico en la plataforma o contáctanos para reservas corporativas.</p>
                </div>
              </div>
              <div class="cta-right">
                <button mat-flat-button class="btn-cta-gold" (click)="onActionReservar()">
                  <mat-icon>event_available</mat-icon>
                  <span>Solicitar Reserva Ahora</span>
                </button>
                <a routerLink="/registro" mat-stroked-button class="btn-cta-outline-white">
                  <mat-icon>person_add</mat-icon>
                  <span>Registrarme como Técnico</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- SECCIÓN: REGLAMENTO Y CONDICIONES RÁPIDAS -->
      <section class="section-rules" id="reglamento">
        <div class="container">
          <div class="rules-card">
            <div class="rules-header">
              <mat-icon>gavel</mat-icon>
              <h3>Normas y Reglamento para Encuentros Deportivos</h3>
            </div>
            <div class="rules-grid">
              <div class="rule-box">
                <div class="rule-num">1</div>
                <div>
                  <strong>Calzado Adecuado</strong>
                  <p>Obligatorio el uso de chimpunes de césped sintético (multitaco / goma). Prohibido pupos de metal.</p>
                </div>
              </div>
              <div class="rule-box">
                <div class="rule-num">2</div>
                <div>
                  <strong>Puntualidad</strong>
                  <p>Los equipos deben estar presentes 15 minutos antes de la hora fijada para el calentamiento y validación.</p>
                </div>
              </div>
              <div class="rule-box">
                <div class="rule-num">3</div>
                <div>
                  <strong>Comprobante de Reserva</strong>
                  <p>Las reservas se confirman mediante la aprobación administrativa del comprobante bancario adjunto.</p>
                </div>
              </div>
              <div class="rule-box">
                <div class="rule-num">4</div>
                <div>
                  <strong>Juego Limpio</strong>
                  <p>Se promueve el respeto entre técnicos, jugadores y árbitros. Sanción inmediata ante conductas antideportivas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FOOTER DEPORTIVO -->
      <footer class="public-footer">
        <div class="container footer-content">
          <div class="footer-brand-col">
            <div class="footer-brand">
              <div class="logo-shield-small">
                <mat-icon>sports_soccer</mat-icon>
              </div>
              <span class="brand-title">FUTBOL S.A.</span>
            </div>
            <p class="footer-desc">
              Plataforma líder en gestión de canchas deportivas, partidos amistosos y torneos oficiales. Lima, Perú.
            </p>
          </div>

          <div class="footer-links-col">
            <h4>Enlaces Rápidos</h4>
            <a href="#hero">Inicio</a>
            <a href="#encuentros">Torneos y Copas</a>
            <a href="#canchas">Nuestras Canchas</a>
            <a href="#calendario-deportivo">Calendario Semanal</a>
            <a routerLink="/auth/login">Acceso de Técnicos</a>
          </div>

          <div class="footer-info-col">
            <h4>Horario de Atención</h4>
            <p>Lunes a Domingo: 08:00 AM - 11:30 PM</p>
            <p>Zona Horaria: America/Lima (UTC-5)</p>
            <p>Moneda Oficial: Soles Peruanos (S/)</p>
          </div>
        </div>

        <div class="footer-bottom-line">
          <div class="container footer-bottom-inner">
            <span>© 2026 FUTBOL S.A. Todos los derechos reservados.</span>
            <span>Desarrollado para alta competencia deportiva.</span>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    /* =========================================================================
       ESTILOS GLOBALES DE LA LANDING DEPORTIVA (INSPIRADO EN ENTORNO DE ESTADIO)
       ========================================================================= */
    .landing-page {
      background: #080f1d;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-x: hidden;
    }

    .container {
      max-width: 1240px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }

    .text-accent {
      color: #38bdf8;
      background: linear-gradient(135deg, #38bdf8, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* ==================== NAVBAR ==================== */
    .public-navbar {
      background: rgba(7, 13, 24, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(56, 189, 248, 0.15);
      position: sticky;
      top: 0;
      z-index: 200;
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
      gap: 0.85rem;
      cursor: pointer;
      text-decoration: none;
    }

    .logo-shield {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #0284c7, #2563eb, #10b981);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 0 18px rgba(14, 165, 233, 0.5);
    }

    .brand-text-col {
      display: flex;
      flex-direction: column;
    }

    .brand-text {
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: 0.06em;
      color: #ffffff;
      line-height: 1.1;
    }

    .brand-sub {
      font-size: 0.65rem;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.15em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.75rem;
    }

    .nav-link {
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      letter-spacing: 0.05em;
      transition: color 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .nav-link:hover, .nav-link.active {
      color: #38bdf8;
    }

    .nav-link-highlight {
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 0.35rem 0.85rem;
      border-radius: 20px;
      color: #38bdf8 !important;
    }

    .nav-link-highlight:hover {
      background: rgba(14, 165, 233, 0.28);
      border-color: #38bdf8;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .btn-panel-top {
      background: linear-gradient(135deg, #0284c7, #2563eb) !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      border-radius: 20px !important;
      padding: 0 1.25rem !important;
      white-space: nowrap !important;
      height: 40px !important;
    }

    .btn-login-top {
      background-color: rgba(255, 255, 255, 0.08) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.35) !important;
      border-radius: 20px !important;
      font-weight: 600 !important;
      padding: 0 1.15rem !important;
      height: 40px !important;
      white-space: nowrap !important;
      transition: all 0.2s ease !important;
    }

    .btn-login-top:hover {
      background-color: rgba(255, 255, 255, 0.18) !important;
      border-color: #ffffff !important;
      color: #ffffff !important;
      transform: translateY(-1px) !important;
    }

    .btn-register-top {
      background: #10b981 !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      border-radius: 20px !important;
      padding: 0 1.15rem !important;
      height: 40px !important;
      white-space: nowrap !important;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }

    /* ==================== HERO SECTION CON SLIDER DE FÚTBOL (SOLO FOTOS) ==================== */
    .hero-section {
      position: relative;
      background: #080f1d;
      border-bottom: 3px solid #10b981;
      overflow: hidden;
    }

    .hero-slider-container {
      position: relative;
      width: 100%;
      height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #070d18;
    }

    .hero-slide-item {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 1s cubic-bezier(0.4, 0, 0.2, 1);
      transform: scale(1.03);
      z-index: 1;
    }

    .hero-slide-item.active {
      opacity: 1;
      visibility: visible;
      transform: scale(1);
      z-index: 2;
    }

    .hero-slide-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      filter: brightness(0.98) saturate(1.15) contrast(1.05);
      transition: transform 6s ease-out;
    }

    .hero-slide-item.active .hero-slide-bg {
      transform: scale(1.04);
    }

    .hero-slide-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(8, 15, 29, 0.4) 0%, transparent 20%, transparent 75%, rgba(8, 15, 29, 0.9) 100%);
      pointer-events: none;
    }

    /* FLECHAS DE NAVEGACIÓN DEL SLIDER */
    .slider-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 25;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(10px);
      border: 1.5px solid rgba(56, 189, 248, 0.4);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.6);
    }

    .slider-arrow mat-icon {
      font-size: 32px !important;
      width: 32px !important;
      height: 32px !important;
    }

    .slider-arrow:hover {
      background: rgba(14, 165, 233, 0.95);
      border-color: #38bdf8;
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.9);
      transform: translateY(-50%) scale(1.12);
    }

    .arrow-left {
      left: 28px;
    }

    .arrow-right {
      right: 28px;
    }

    /* PAGINACIÓN DE PUNTOS (DOTS ● ○ ○) */
    .slider-dots-nav {
      position: absolute;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 25;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(7, 13, 24, 0.65);
      padding: 8px 20px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(10px);
    }

    .slider-dot {
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dot-inner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transition: all 0.3s ease;
      display: block;
    }

    .slider-dot:hover .dot-inner {
      background: rgba(255, 255, 255, 0.85);
    }

    .slider-dot.active .dot-inner {
      width: 30px;
      border-radius: 9999px;
      background: linear-gradient(90deg, #38bdf8, #34d399);
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.9);
    }

    /* STATS EN LA BASE DEL HERO */
    .hero-stats-wrapper {
      position: relative;
      z-index: 20;
      background: #080f1d;
      padding: 1.5rem 0 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .hero-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-align: left;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(56, 189, 248, 0.35);
    }

    .stat-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-value {
      display: block;
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
    }

    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* ==================== CARTELERA DE ENCUENTROS ==================== */
    .section-encuentros, .section-canchas {
      padding: 4.5rem 0;
    }

    .section-topbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .tag-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .sports-tag {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      border: 1px solid rgba(234, 179, 8, 0.3);
      padding: 0.2rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    .live-counter {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .section-title {
      font-size: 2.25rem;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 0.5rem;
      letter-spacing: -0.01em;
    }

    .section-desc {
      color: #94a3b8;
      font-size: 1rem;
      margin: 0;
      max-width: 650px;
    }

    .filters-bar {
      min-width: 240px;
    }

    .cancha-filter-select {
      width: 100%;
    }

    .encuentros-sports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 2rem;
    }

    .sports-match-card {
      background: #0f1c30;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      position: relative;
      overflow: hidden;
    }

    .sports-match-card:hover {
      transform: translateY(-6px);
      border-color: #38bdf8;
      box-shadow: 0 16px 36px rgba(14, 165, 233, 0.25);
    }

    .match-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .match-category-pill {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      padding: 0.25rem 0.6rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 800;
    }

    .match-category-pill mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .match-status-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      padding: 0.25rem 0.6rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .match-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 1rem;
    }

    .match-meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .meta-pill {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #cbd5e1;
    }

    .meta-pill mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #38bdf8;
    }

    .pitch-pill {
      background: rgba(14, 165, 233, 0.12);
      color: #38bdf8;
      font-weight: 700;
    }

    /* Duelo de Equipos (Arena) */
    .versus-arena {
      background: #091322;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .team-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.35rem;
    }

    .team-jersey-wrap {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      margin-bottom: 0.25rem;
    }

    .team-jersey {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }

    .team-jersey mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .team-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
    }

    .team-stars-rating {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.8rem;
      color: #facc15;
      font-weight: 700;
    }

    .star-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .player-count {
      color: #94a3b8;
      font-size: 0.75rem;
      margin-left: 0.25rem;
    }

    .vs-emblem {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.75rem;
      color: #94a3b8;
      margin: 0 0.75rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    }

    .bet-info-banner {
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid rgba(234, 179, 8, 0.25);
      border-radius: 10px;
      padding: 0.5rem 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .bet-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: #facc15;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .bet-badge mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .bet-notice {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .match-card-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .organizer-name {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .btn-view-match {
      background: none;
      border: none;
      color: #38bdf8;
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      padding: 0;
    }

    .btn-view-match mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
    }

    .sports-match-card:hover .btn-view-match mat-icon {
      transform: translateX(4px);
    }

    /* ==================== NUESTRAS CANCHAS ==================== */
    .canchas-showcase-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
    }

    .cancha-showcase-card {
      background: #0f1c30;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .cancha-header-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .cancha-type-chip {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      padding: 0.25rem 0.75rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }

    .cancha-status-live {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #34d399;
      font-weight: 700;
    }

    .dot-green {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 6px #34d399;
    }

    .cancha-icon-banner {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .cancha-icon-banner mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .cancha-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.5rem;
    }

    .cancha-features {
      font-size: 0.9rem;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }

    .cancha-pricing-box {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
    }

    .price-currency {
      font-size: 1.1rem;
      font-weight: 700;
      color: #38bdf8;
    }

    .price-value {
      font-size: 2.2rem;
      font-weight: 900;
      color: #ffffff;
    }

    .price-unit {
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .btn-check-slots {
      width: 100%;
      color: #38bdf8 !important;
      border-color: rgba(56, 189, 248, 0.3) !important;
      border-radius: 12px !important;
      font-weight: 700 !important;
      height: 44px !important;
    }

    .btn-check-slots:hover {
      background: rgba(14, 165, 233, 0.15) !important;
      border-color: #38bdf8 !important;
    }

    /* =========================================================================
       SECCIÓN DESTACADA: CALENDARIO DEPORTIVO SEMANAL EN LA PARTE DE ABAJO
       ========================================================================= */
    .section-calendario-bottom {
      position: relative;
      padding: 5rem 0 5.5rem;
      background: #060c17;
      border-top: 3px solid #38bdf8;
      overflow: hidden;
    }

    .calendar-ambient-light {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1000px;
      height: 400px;
      background: radial-gradient(ellipse, rgba(14, 165, 233, 0.18) 0%, transparent 70%);
      filter: blur(60px);
      pointer-events: none;
    }

    .calendar-hero-header {
      text-align: center;
      max-width: 820px;
      margin: 0 auto 3rem;
      position: relative;
      z-index: 10;
    }

    .calendar-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 0.4rem 1.25rem;
      border-radius: 30px;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-bottom: 1.25rem;
    }

    .calendar-main-title {
      font-size: 2.75rem;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 1rem;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }

    .calendar-main-desc {
      font-size: 1.1rem;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }

    /* Panel Vidriado del Calendario */
    .calendar-glass-panel {
      position: relative;
      z-index: 10;
      background: rgba(15, 25, 45, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 24px;
      padding: 2rem;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }

    /* Barra Superior de Controles */
    .calendar-controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .week-nav-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .btn-week-nav {
      background: rgba(15, 23, 42, 0.9) !important;
      --mdc-outlined-button-container-color: rgba(15, 23, 42, 0.9) !important;
      color: #ffffff !important;
      border: 1.5px solid rgba(56, 189, 248, 0.35) !important;
      border-radius: 24px !important;
      font-weight: 700 !important;
      font-size: 0.88rem !important;
      height: 42px !important;
      padding: 0 1.15rem !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.45rem !important;
      backdrop-filter: blur(8px) !important;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35) !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .btn-week-nav mat-icon {
      color: #38bdf8 !important;
      font-size: 22px !important;
      width: 22px !important;
      height: 22px !important;
      transition: transform 0.2s ease !important;
    }

    .btn-week-nav:hover {
      background: rgba(14, 165, 233, 0.25) !important;
      border-color: #38bdf8 !important;
      color: #38bdf8 !important;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.45), 0 4px 12px rgba(0, 0, 0, 0.4) !important;
      transform: translateY(-2px) !important;
    }

    .btn-week-nav:first-child:hover mat-icon {
      transform: translateX(-3px);
    }

    .btn-week-nav:last-child:hover mat-icon {
      transform: translateX(3px);
    }

    .btn-week-nav:active {
      transform: translateY(0) scale(0.97) !important;
    }

    .btn-today-pill {
      background: linear-gradient(135deg, #0284c7, #2563eb) !important;
      color: #ffffff !important;
      border: 1px solid rgba(56, 189, 248, 0.4) !important;
      border-radius: 24px !important;
      font-weight: 800 !important;
      font-size: 0.88rem !important;
      height: 42px !important;
      padding: 0 1.25rem !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.45) !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    .btn-today-pill mat-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
      color: #ffffff !important;
    }

    .btn-today-pill:hover {
      background: linear-gradient(135deg, #0369a1, #1d4ed8) !important;
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.65) !important;
      transform: translateY(-2px) !important;
    }

    .btn-today-pill:active {
      transform: translateY(0) scale(0.97) !important;
    }

    /* Filtro de Canchas en Pastillas */
    .calendar-cancha-pills {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .cancha-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 0.45rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .cancha-pill mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #38bdf8;
    }

    .cancha-pill:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #38bdf8;
    }

    .cancha-pill.active {
      background: #0284c7;
      border-color: #38bdf8;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);
    }

    .cancha-pill.active mat-icon {
      color: #ffffff;
    }

    /* Cinta Semanal de Días (7 Días) */
    .week-days-carousel {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .day-card-btn {
      background: rgba(11, 22, 40, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.15rem 0.75rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.22s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .day-card-btn:hover {
      transform: translateY(-4px);
      border-color: rgba(56, 189, 248, 0.5);
      background: rgba(14, 165, 233, 0.1);
    }

    .day-card-btn.selected {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.35), rgba(37, 99, 235, 0.25));
      border: 2px solid #38bdf8;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.45);
      transform: translateY(-4px);
    }

    .day-card-btn.is-today {
      border-top: 3px solid #facc15;
    }

    .today-tag {
      position: absolute;
      top: 6px;
      background: #facc15;
      color: #0f172a;
      font-size: 0.65rem;
      font-weight: 900;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .day-name {
      font-size: 0.8rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.4rem;
    }

    .day-number {
      font-size: 1.85rem;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
      margin: 0.25rem 0;
    }

    .day-month {
      font-size: 0.75rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .day-events-indicator {
      margin-top: 0.65rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      padding: 0.2rem 0.5rem;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 800;
    }

    .dot-event {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #facc15;
      box-shadow: 0 0 6px #facc15;
    }

    .day-free-indicator {
      margin-top: 0.65rem;
      font-size: 0.7rem;
      color: #34d399;
      font-weight: 700;
    }

    /* Cabecera del Día Seleccionado */
    .selected-day-banner {
      background: #0a1628;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .day-banner-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .calendar-day-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #38bdf8;
    }

    .day-banner-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.25rem;
    }

    .day-banner-sub {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .calendar-legend-bar {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: #cbd5e1;
      font-weight: 600;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-free {
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
    }

    .dot-match {
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
    }

    .dot-busy {
      background: #64748b;
    }

    /* ==================== TIMELINE DE HORARIOS ==================== */
    .slots-timeline-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .slot-card {
      background: #0d1b30;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      display: grid;
      grid-template-columns: 180px 180px 1fr 180px;
      align-items: center;
      gap: 1.5rem;
      transition: all 0.2s ease;
    }

    .slot-card:hover {
      background: #11223c;
    }

    .slot-card.slot-match {
      border: 2px solid #0284c7;
      background: linear-gradient(90deg, rgba(2, 132, 199, 0.2), #0d1b30);
      box-shadow: 0 4px 18px rgba(2, 132, 199, 0.25);
    }

    .slot-card.slot-free {
      border-left: 4px solid #34d399;
    }

    .slot-card.slot-occupied {
      opacity: 0.75;
      border-left: 4px solid #64748b;
    }

    .slot-time-col {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #ffffff;
      font-weight: 800;
      font-size: 1.05rem;
    }

    .slot-time-col mat-icon {
      color: #38bdf8;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .slot-pitch-col {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .pitch-badge-mini {
      background: #0284c7;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }

    .pitch-title {
      font-weight: 700;
      color: #ffffff;
      font-size: 0.95rem;
    }

    .slot-content-col {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .slot-match-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .match-mini-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      color: #38bdf8;
      font-weight: 800;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    .match-mini-tag mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .slot-match-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }

    .slot-teams-versus {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: #cbd5e1;
    }

    .team-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }

    .vs-mini {
      color: #facc15;
      font-weight: 900;
      font-size: 0.75rem;
      margin: 0 0.25rem;
    }

    .slot-free-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .free-badge {
      color: #34d399;
      font-weight: 800;
      font-size: 0.85rem;
    }

    .free-desc {
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .slot-busy-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .busy-badge {
      color: #94a3b8;
      font-weight: 800;
      font-size: 0.85rem;
    }

    .busy-desc {
      color: #64748b;
      font-size: 0.85rem;
    }

    .slot-action-col {
      display: flex;
      justify-content: flex-end;
    }

    .btn-slot-match {
      background: #0284c7 !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      border-radius: 12px !important;
      font-size: 0.85rem !important;
      height: 40px !important;
    }

    .btn-slot-reserve {
      background: #10b981 !important;
      color: #ffffff !important;
      font-weight: 800 !important;
      border-radius: 12px !important;
      font-size: 0.85rem !important;
      height: 40px !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-slot-reserve:hover {
      background: #059669 !important;
    }

    .btn-slot-disabled {
      color: #64748b !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      border-radius: 12px !important;
      font-size: 0.85rem !important;
      height: 40px !important;
    }

    /* Banner CTA debajo del Calendario */
    .calendar-bottom-cta {
      background: linear-gradient(135deg, #0b1f3b, #03346e);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 18px;
      padding: 1.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    .cta-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .trophy-gold {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #facc15;
    }

    .cta-left h4 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.25rem;
    }

    .cta-left p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
    }

    .cta-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn-cta-outline-white {
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.3) !important;
      font-weight: 700 !important;
      border-radius: 20px !important;
      height: 46px !important;
    }

    /* ==================== REGLAMENTO ==================== */
    .section-rules {
      padding: 3.5rem 0;
      background: #080f1d;
    }

    .rules-card {
      background: #0f1c30;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 2.25rem;
    }

    .rules-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .rules-header mat-icon {
      color: #facc15;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .rules-header h3 {
      font-size: 1.45rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }

    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .rule-box {
      display: flex;
      gap: 1rem;
    }

    .rule-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #0284c7;
      color: #ffffff;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .rule-box strong {
      display: block;
      color: #ffffff;
      font-size: 0.95rem;
      margin-bottom: 0.25rem;
    }

    .rule-box p {
      color: #94a3b8;
      font-size: 0.85rem;
      margin: 0;
      line-height: 1.45;
    }

    /* ==================== FOOTER ==================== */
    .public-footer {
      margin-top: auto;
      background: #040810;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 3.5rem;
    }

    .footer-content {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 3rem;
      padding-bottom: 3rem;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .logo-shield-small {
      width: 32px;
      height: 32px;
      background: #0284c7;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .footer-brand .brand-title {
      font-size: 1.35rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.05em;
    }

    .footer-desc {
      color: #64748b;
      font-size: 0.9rem;
      line-height: 1.6;
      max-width: 400px;
    }

    .footer-links-col, .footer-info-col {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .footer-links-col h4, .footer-info-col h4 {
      color: #ffffff;
      font-size: 1rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .footer-links-col a {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.2s ease;
    }

    .footer-links-col a:hover {
      color: #38bdf8;
    }

    .footer-info-col p {
      color: #94a3b8;
      font-size: 0.85rem;
      margin: 0;
    }

    .footer-bottom-line {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1.5rem 0;
      font-size: 0.8rem;
      color: #475569;
    }

    .footer-bottom-inner {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
    }

    /* Estados de Carga y Vacíos */
    .loading-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spin-icon {
      animation: spin 1.5s linear infinite;
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #38bdf8;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .empty-state-sports, .empty-state-slots {
      text-align: center;
      padding: 3.5rem 1rem;
      color: #94a3b8;
    }

    .empty-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }

    .empty-icon-circle mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    /* Responsive */
    @media (max-width: 992px) {
      .d-none-mobile {
        display: none !important;
      }

      .hero-slider-container {
        height: 380px;
      }

      .week-days-carousel {
        grid-template-columns: repeat(4, 1fr);
      }

      .slot-card {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .slot-action-col {
        justify-content: flex-start;
      }

      .footer-content {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
    }

    @media (max-width: 600px) {
      .hero-slider-container {
        height: 250px;
      }

      .slider-arrow {
        width: 38px;
        height: 38px;
      }

      .arrow-left {
        left: 10px;
      }

      .arrow-right {
        right: 10px;
      }

      .week-days-carousel {
        grid-template-columns: repeat(2, 1fr);
      }

      .calendar-controls-bar {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private router = inject(Router);

  // Slider de Imágenes de Fútbol (Solo Fotos)
  currentSlideIndex = signal<number>(0);
  private autoSlideTimer: any = null;

  readonly slides: HeroSlide[] = [
    { id: 1, imagen: 'assets/slider-futbol-1.jpg' },
    { id: 2, imagen: 'assets/slider-futbol-2.jpg' },
    { id: 3, imagen: 'assets/slider-futbol-3.jpg' },
    { id: 4, imagen: 'assets/slider-futbol-4.jpg' }
  ];

  encuentros = signal<Encuentro[]>([]);
  canchas = signal<Cancha[]>([]);
  disponibilidad = signal<DisponibilidadSlot[]>([]);
  cargandoEncuentros = signal<boolean>(true);
  cargandoDisponibilidad = signal<boolean>(false);

  filtroCancha: number | null = null;
  filtroCanchaCalendario = signal<number | null>(null);

  offsetSemana = signal<number>(0);
  fechaSeleccionada = signal<string>(this.obtenerHoyStr());
  diasSemana = signal<DiaCalendario[]>([]);

  // Horarios canónicos para el timeline del día (intervalos de juego)
  readonly bloquesHorarios: Array<{ inicio: string; fin: string }> = [
    { inicio: '08:00', fin: '09:30' },
    { inicio: '09:30', fin: '11:00' },
    { inicio: '11:00', fin: '12:30' },
    { inicio: '12:30', fin: '14:00' },
    { inicio: '14:00', fin: '15:30' },
    { inicio: '15:30', fin: '17:00' },
    { inicio: '17:00', fin: '18:30' },
    { inicio: '18:30', fin: '20:00' },
    { inicio: '19:30', fin: '21:30' },
    { inicio: '20:00', fin: '21:30' },
    { inicio: '21:30', fin: '23:00' }
  ];

  // Computado: Genera los slots horarios detallados para el día y cancha seleccionados
  slotsCalculados = computed<SlotHorarioView[]>(() => {
    const fecha = this.fechaSeleccionada();
    const cFiltro = this.filtroCanchaCalendario();
    const canchasList = this.canchas().filter(c => cFiltro === null || c.id === cFiltro);
    const encuentrosList = this.encuentros().filter(e => e.fecha === fecha);
    const dispList = this.disponibilidad().filter(d => d.fecha === fecha);

    const resultados: SlotHorarioView[] = [];

    // Por cada cancha y bloque horario
    for (const c of canchasList) {
      for (const b of this.bloquesHorarios) {
        // 1. ¿Existe un Encuentro publicado en esta fecha, cancha y horario coincidente?
        const matchFound = encuentrosList.find(e => 
          e.canchaId === c.id && 
          this.horasCoinciden(e.horaInicio, e.horaFin, b.inicio, b.fin)
        );

        if (matchFound) {
          resultados.push({
            horaInicio: b.inicio,
            horaFin: b.fin,
            canchaId: c.id,
            canchaNombre: c.nombre,
            canchaTipo: c.tipo,
            tarifaHora: c.tarifaHora,
            estado: 'ENCUENTRO',
            encuentro: matchFound
          });
          continue;
        }

        // 2. ¿Existe una Reserva / Bloqueo en Disponibilidad?
        const dispFound = dispList.find(d => 
          d.canchaId === c.id && 
          this.horasCoinciden(d.horaInicio, d.horaFin, b.inicio, b.fin) &&
          d.estado === 'OCUPADO'
        );

        if (dispFound) {
          resultados.push({
            horaInicio: b.inicio,
            horaFin: b.fin,
            canchaId: c.id,
            canchaNombre: c.nombre,
            canchaTipo: c.tipo,
            tarifaHora: c.tarifaHora,
            estado: 'OCUPADO'
          });
          continue;
        }

        // 3. De lo contrario, está DISPONIBLE
        resultados.push({
          horaInicio: b.inicio,
          horaFin: b.fin,
          canchaId: c.id,
          canchaNombre: c.nombre,
          canchaTipo: c.tipo,
          tarifaHora: c.tarifaHora,
          estado: 'DISPONIBLE'
        });
      }
    }

    return resultados;
  });

  ngOnInit(): void {
    this.cargarCanchas();
    this.cargarEncuentros();
    this.generarDiasSemana(0);
    this.cargarDisponibilidad();
    this.iniciarAutoSlider();
  }

  ngOnDestroy(): void {
    this.detenerAutoSlider();
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
        this.actualizarContadoresEnDias();
      },
      error: () => this.cargandoEncuentros.set(false)
    });
  }

  cargarDisponibilidad(): void {
    this.cargandoDisponibilidad.set(true);
    const cId = this.filtroCanchaCalendario() || undefined;
    this.encuentrosService.getDisponibilidadPublica(cId).subscribe({
      next: (data) => {
        this.disponibilidad.set(data);
        this.cargandoDisponibilidad.set(false);
      },
      error: () => this.cargandoDisponibilidad.set(false)
    });
  }

  setFiltroCanchaCalendario(canchaId: number | null): void {
    this.filtroCanchaCalendario.set(canchaId);
    this.cargarDisponibilidad();
  }

  filtrarCalendarioPorCancha(canchaId: number): void {
    this.setFiltroCanchaCalendario(canchaId);
    const el = document.getElementById('calendario-deportivo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ==================== GESTIÓN DE DÍAS DEL CALENDARIO ====================
  generarDiasSemana(offsetWeeks: number): void {
    const nombresDias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const nombresMeses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];

    const hoy = new Date();
    const hoyStr = this.formatearFechaISO(hoy);

    // Calcular lunes de la semana correspondiente
    const currentDay = hoy.getDay(); // 0 domingo, 1 lunes...
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const baseMonday = new Date(hoy);
    baseMonday.setDate(hoy.getDate() + diffToMonday + (offsetWeeks * 7));

    const semana: DiaCalendario[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      const fStr = this.formatearFechaISO(d);

      semana.push({
        fecha: d,
        fechaStr: fStr,
        nombreDia: nombresDias[d.getDay()],
        diaNumero: d.getDate(),
        mesNombre: nombresMeses[d.getMonth()],
        esHoy: fStr === hoyStr,
        esSeleccionado: fStr === this.fechaSeleccionada(),
        totalEncuentros: 0
      });
    }

    this.diasSemana.set(semana);
    this.actualizarContadoresEnDias();
  }

  seleccionarDia(fechaStr: string): void {
    this.fechaSeleccionada.set(fechaStr);
    const actualizados = this.diasSemana().map(d => ({
      ...d,
      esSeleccionado: d.fechaStr === fechaStr
    }));
    this.diasSemana.set(actualizados);
  }

  semanaAnterior(): void {
    this.offsetSemana.update(v => v - 1);
    this.generarDiasSemana(this.offsetSemana());
    // Seleccionar primer día de la nueva semana
    if (this.diasSemana().length > 0) {
      this.seleccionarDia(this.diasSemana()[0].fechaStr);
    }
  }

  semanaSiguiente(): void {
    this.offsetSemana.update(v => v + 1);
    this.generarDiasSemana(this.offsetSemana());
    if (this.diasSemana().length > 0) {
      this.seleccionarDia(this.diasSemana()[0].fechaStr);
    }
  }

  irAHoy(): void {
    this.offsetSemana.set(0);
    this.generarDiasSemana(0);
    this.seleccionarDia(this.obtenerHoyStr());
  }

  private actualizarContadoresEnDias(): void {
    const encList = this.encuentros();
    const actualizados = this.diasSemana().map(d => {
      const count = encList.filter(e => e.fecha === d.fechaStr).length;
      return { ...d, totalEncuentros: count };
    });
    this.diasSemana.set(actualizados);
  }

  private horasCoinciden(hIni1: string, hFin1: string, hIni2: string, hFin2: string): boolean {
    const toMins = (h: string) => {
      const parts = h.slice(0, 5).split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    };
    const ini1 = toMins(hIni1);
    const fin1 = toMins(hFin1);
    const ini2 = toMins(hIni2);
    const fin2 = toMins(hFin2);

    return Math.max(ini1, ini2) < Math.min(fin1, fin2);
  }

  obtenerHoyStr(): string {
    return this.formatearFechaISO(new Date());
  }

  formatearFechaISO(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatFechaLarga(fechaStr: string): string {
    if (!fechaStr) return '';
    const parts = fechaStr.split('-');
    if (parts.length < 3) return fechaStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    const nombresDiasCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const nombresMesesCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return `${nombresDiasCompletos[d.getDay()]} ${day} de ${nombresMesesCompletos[month]} de ${year}`;
  }

  verDetalle(id: number): void {
    this.router.navigate(['/publico/encuentros', id]);
  }

  solicitarHorarioEspecifico(slot: SlotHorarioView): void {
    if (this.authService.isAuthenticated()) {
      if (this.authService.isTecnico()) {
        this.router.navigate(['/encuentros/reservas/mias']);
      } else {
        this.router.navigate(['/encuentros/reservas']);
      }
    } else {
      this.router.navigate(['/registro']);
    }
  }

  onActionReservar(): void {
    if (this.authService.isAuthenticated()) {
      if (this.authService.isTecnico()) {
        this.router.navigate(['/encuentros/reservas/mias']);
      } else {
        this.router.navigate(['/encuentros/reservas']);
      }
    } else {
      this.router.navigate(['/registro']);
    }
  }

  // ==================== MÉTODOS DE CONTROL DEL SLIDER ====================
  iniciarAutoSlider(): void {
    this.detenerAutoSlider();
    this.autoSlideTimer = setInterval(() => {
      this.siguienteSlide();
    }, 5000);
  }

  detenerAutoSlider(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  siguienteSlide(): void {
    this.currentSlideIndex.update(idx => (idx + 1) % this.slides.length);
  }

  anteriorSlide(): void {
    this.currentSlideIndex.update(idx => (idx - 1 + this.slides.length) % this.slides.length);
  }

  irASlide(index: number): void {
    this.currentSlideIndex.set(index);
    this.iniciarAutoSlider();
  }

  pausarSlider(): void {
    this.detenerAutoSlider();
  }

  reanudarSlider(): void {
    this.iniciarAutoSlider();
  }

  ejecutarAccion(accion: string): void {
    if (accion === 'reservar') {
      this.onActionReservar();
    } else if (accion === 'calendario') {
      const el = document.getElementById('calendario-deportivo');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (accion === 'canchas') {
      const el = document.getElementById('canchas');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (accion === 'encuentros') {
      const el = document.getElementById('encuentros');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (accion === 'registro') {
      this.router.navigate(['/registro']);
    }
  }
}
