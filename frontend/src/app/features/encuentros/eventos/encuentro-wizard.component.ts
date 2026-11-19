import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Reserva, Jugador, SugerenciaEquipo } from '../../../core/models/encuentros.models';

interface TeamDraft {
  nombre: string;
  color: string;
  jugadores: Jugador[];
}

@Component({
  selector: 'app-encuentro-wizard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatStepperModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="wizard-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <a routerLink="/encuentros/eventos">Eventos</a>
            <mat-icon>chevron_right</mat-icon>
            <span class="current">Nuevo Encuentro</span>
          </div>
          <h1>Organizar Encuentro Deportivo</h1>
          <p class="subtitle">Asistente en 3 pasos para configurar cancha, equipos balanceados y publicación</p>
        </div>
      </div>

      <!-- STEPPER PROGRESS TABS -->
      <div class="stepper-nav">
        <div class="step-nav-item" [class.active]="pasoActual() === 1" [class.completed]="pasoActual() > 1" (click)="irAlPaso(1)">
          <div class="step-num">1</div>
          <div class="step-text">
            <span class="step-title">Paso 1</span>
            <span class="step-desc">Cancha y Datos</span>
          </div>
        </div>
        <div class="step-separator"></div>
        <div class="step-nav-item" [class.active]="pasoActual() === 2" [class.completed]="pasoActual() > 2" (click)="paso1Valido() && irAlPaso(2)">
          <div class="step-num">2</div>
          <div class="step-text">
            <span class="step-title">Paso 2</span>
            <span class="step-desc">Equipos y Balance</span>
          </div>
        </div>
        <div class="step-separator"></div>
        <div class="step-nav-item" [class.active]="pasoActual() === 3" (click)="paso1Valido() && paso2Valido() && irAlPaso(3)">
          <div class="step-num">3</div>
          <div class="step-text">
            <span class="step-title">Paso 3</span>
            <span class="step-desc">Confirmación</span>
          </div>
        </div>
      </div>

      <!-- CONTENIDO DEL PASO 1 -->
      @if (pasoActual() === 1) {
        <div class="step-content card-box">
          <h2>1. Información Básica y Selección de Cancha</h2>
          <p class="section-hint">Selecciona una de tus reservas aprobadas y define el nombre del partido.</p>

          <form [formGroup]="infoForm" class="step-form">
            <!-- SELECCIÓN DE RESERVA -->
            <div class="form-group">
              <label>Reserva Aprobada Disponible <span class="required">*</span></label>
              @if (cargandoReservas()) {
                <div class="loading-inline">
                  <mat-icon class="spin">sync</mat-icon> Buscando reservas aprobadas...
                </div>
              } @else if (reservasDisponibles().length === 0) {
                <div class="warning-box">
                  <mat-icon>event_busy</mat-icon>
                  <div>
                    <strong>No tienes reservas aprobadas disponibles para crear un nuevo encuentro.</strong>
                    <p>Primero debes tener una reserva en estado APROBADA que no esté asignada a otro partido.</p>
                    <a routerLink="/encuentros/reservas/mias" class="link-btn">Ir a Mis Reservas</a>
                  </div>
                </div>
              } @else {
                <div class="reservas-picker">
                  @for (res of reservasDisponibles(); track res.id) {
                    <div 
                      class="reserva-option" 
                      [class.selected]="infoForm.get('reservaId')?.value === res.id"
                      (click)="seleccionarReserva(res)">
                      <div class="radio-circle">
                        <div class="inner-dot"></div>
                      </div>
                      <div class="reserva-meta">
                        <div class="cancha-title">
                          <mat-icon>stadium</mat-icon>
                          <strong>{{ res.canchaNombre }}</strong>
                          <span class="badge-tipo">{{ res.canchaTipo }}</span>
                        </div>
                        <div class="reserva-time">
                          <span>📅 {{ res.fecha }}</span>
                          <span>⏰ {{ res.horaInicio }} - {{ res.horaFin }}</span>
                          <span>💰 S/ {{ res.monto | number:'1.2-2' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- TÍTULO DEL ENCUENTRO -->
            <div class="form-group">
              <label>Nombre del Encuentro <span class="required">*</span></label>
              <input type="text" formControlName="nombre" placeholder="Ej. Clásico de los Jueves - Fecha 4" class="form-control" />
              @if (infoForm.get('nombre')?.invalid && infoForm.get('nombre')?.touched) {
                <span class="error-text">El nombre debe tener al menos 3 caracteres</span>
              }
            </div>

            <!-- APUESTA INFORMATIVA -->
            <div class="form-group">
              <label>Apuesta Informativa por Jugador (Opcional, en S/)</label>
              <div class="input-with-icon">
                <span class="currency-prefix">S/</span>
                <input type="number" formControlName="apuestaMonto" placeholder="0.00" class="form-control" min="0" step="1" />
              </div>

              <!-- DISCLAIMER RN-19 -->
              <div class="disclaimer-banner">
                <mat-icon>info</mat-icon>
                <span><strong>Aviso de Apuesta Informativa:</strong> La plataforma FUTBOL S.A. no retiene, custodia ni administra dinero. Este valor es un registro meramente referencial acordado entre los participantes.</span>
              </div>
            </div>

            <!-- BANNER DEL ENCUENTRO -->
            <div class="form-group">
              <label>Banner o Portada del Partido (Opcional, máx 5MB)</label>
              <input type="file" accept="image/png, image/jpeg, image/webp" (change)="onBannerSelected($event)" class="file-input" />
              @if (previewBanner()) {
                <div class="banner-preview">
                  <img [src]="previewBanner()" alt="Vista previa del banner" />
                  <button type="button" class="remove-btn" (click)="previewBanner.set(null); bannerFile = null;">Quitar imagen</button>
                </div>
              }
            </div>

            <div class="step-actions">
              <button type="button" mat-flat-button color="primary" [disabled]="!paso1Valido()" (click)="irAlPaso(2)">
                Siguiente: Equipos y Jugadores <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </form>
        </div>
      }

      <!-- CONTENIDO DEL PASO 2 -->
      @if (pasoActual() === 2) {
        <div class="step-content card-box">
          <div class="step-header-row">
            <div>
              <h2>2. Configuración de Equipos y Jugadores</h2>
              <p class="section-hint">Cada equipo debe contar con un mínimo de 4 y máximo de 8 jugadores (Regla RN-16).</p>
            </div>
            <button 
              type="button"
              mat-flat-button 
              color="accent" 
              class="balance-btn" 
              (click)="balancearAutomaticamente()"
              [disabled]="cargandoBalanceo() || plantelCompleto().length < 8">
              <mat-icon class="spin-icon" [class.spinning]="cargandoBalanceo()">auto_awesome</mat-icon>
              <span>Selección Automática (Snake Draft)</span>
            </button>
          </div>

          <!-- KPI DE BALANCE -->
          <div class="balance-summary-bar">
            <div class="kpi-box">
              <span class="kpi-label">Total Jugadores Convocados</span>
              <span class="kpi-value" [class.valid]="totalJugadoresSeleccionados() >= 8 && totalJugadoresSeleccionados() <= 16">
                {{ totalJugadoresSeleccionados() }} / 16
              </span>
              <span class="kpi-hint">Requerido: 8 a 16 total</span>
            </div>

            <div class="kpi-box">
              <span class="kpi-label">Diferencia de Estrellas</span>
              <span class="kpi-value" [class.balanced]="diferenciaEstrellas() <= 0.5">
                Δ {{ diferenciaEstrellas() | number:'1.1-1' }} ⭐
              </span>
              <span class="kpi-hint">{{ diferenciaEstrellas() <= 0.5 ? '¡Excelente balance!' : 'Se sugiere auto-balancear' }}</span>
            </div>
          </div>

          <!-- COMPARATIVA DE EQUIPOS (LADO A LADO) -->
          <div class="teams-container">
            <!-- EQUIPO A -->
            <div class="team-card">
              <div class="team-card-header" [style.border-top-color]="equipoA.color">
                <div class="team-meta">
                  <input type="text" [(ngModel)]="equipoA.nombre" class="team-name-input" />
                  <input type="color" [(ngModel)]="equipoA.color" class="color-picker" title="Color del uniforme" />
                </div>
                <div class="team-stats">
                  <span>{{ equipoA.jugadores.length }} jugadores</span>
                  <span class="stars-badge">{{ calcularPromedio(equipoA.jugadores) | number:'1.1-1' }} ⭐</span>
                </div>
              </div>

              <div class="team-body">
                @if (equipoA.jugadores.length === 0) {
                  <div class="team-empty">Sin jugadores asignados</div>
                }
                @for (j of equipoA.jugadores; track j.id) {
                  <div class="roster-item">
                    <span class="roster-pos" [ngClass]="getPosClass(j.posicion)">{{ j.posicion?.slice(0,3) || 'JUG' }}</span>
                    <span class="roster-name">{{ j.nombre }}</span>
                    <span class="roster-stars">{{ j.estrellas }} ⭐</span>
                    <div class="roster-controls">
                      <button type="button" class="ctrl-btn" matTooltip="Pasar a Equipo B" (click)="moverJugador(j, equipoA, equipoB)">
                        <mat-icon>arrow_forward</mat-icon>
                      </button>
                      <button type="button" class="ctrl-btn remove" matTooltip="Desconvocar" (click)="desconvocar(j, equipoA)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>

              <div class="team-card-footer">
                <span [class.text-warn]="equipoA.jugadores.length < 4 || equipoA.jugadores.length > 8">
                  {{ equipoA.jugadores.length }} de 4-8 requeridos
                </span>
              </div>
            </div>

            <!-- EQUIPO B -->
            <div class="team-card">
              <div class="team-card-header" [style.border-top-color]="equipoB.color">
                <div class="team-meta">
                  <input type="text" [(ngModel)]="equipoB.nombre" class="team-name-input" />
                  <input type="color" [(ngModel)]="equipoB.color" class="color-picker" title="Color del uniforme" />
                </div>
                <div class="team-stats">
                  <span>{{ equipoB.jugadores.length }} jugadores</span>
                  <span class="stars-badge">{{ calcularPromedio(equipoB.jugadores) | number:'1.1-1' }} ⭐</span>
                </div>
              </div>

              <div class="team-body">
                @if (equipoB.jugadores.length === 0) {
                  <div class="team-empty">Sin jugadores asignados</div>
                }
                @for (j of equipoB.jugadores; track j.id) {
                  <div class="roster-item">
                    <span class="roster-pos" [ngClass]="getPosClass(j.posicion)">{{ j.posicion?.slice(0,3) || 'JUG' }}</span>
                    <span class="roster-name">{{ j.nombre }}</span>
                    <span class="roster-stars">{{ j.estrellas }} ⭐</span>
                    <div class="roster-controls">
                      <button type="button" class="ctrl-btn" matTooltip="Pasar a Equipo A" (click)="moverJugador(j, equipoB, equipoA)">
                        <mat-icon>arrow_back</mat-icon>
                      </button>
                      <button type="button" class="ctrl-btn remove" matTooltip="Desconvocar" (click)="desconvocar(j, equipoB)">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>

              <div class="team-card-footer">
                <span [class.text-warn]="equipoB.jugadores.length < 4 || equipoB.jugadores.length > 8">
                  {{ equipoB.jugadores.length }} de 4-8 requeridos
                </span>
              </div>
            </div>
          </div>

          <!-- BANCA DE JUGADORES DISPONIBLES NO ASIGNADOS -->
          <div class="bench-section">
            <div class="bench-header-row">
              <div>
                <h3>Banca de Jugadores Disponibles ({{ jugadoresEnBanca().length }})</h3>
                <p class="bench-hint">Haz clic en el equipo al que deseas asignar cada jugador:</p>
              </div>
              <button 
                type="button" 
                mat-flat-button 
                color="primary" 
                class="auto-select-btn" 
                (click)="balancearAutomaticamente()"
                [disabled]="cargandoBalanceo() || plantelCompleto().length < 8">
                <mat-icon class="spin-icon" [class.spinning]="cargandoBalanceo()">auto_awesome</mat-icon>
                <span>Selección Automática por Estrellas</span>
              </button>
            </div>

            @if (jugadoresEnBanca().length === 0) {
              <div class="bench-empty-box">
                <mat-icon>sports_soccer</mat-icon>
                <div class="bench-empty-text">
                  <strong>Todos los jugadores disponibles han sido convocados</strong>
                  <p>Si deseas cambiar jugadores, desconvoca a uno con la cruz [✕] o utiliza la Selección Automática.</p>
                </div>
              </div>
            } @else {
              <div class="bench-grid">
                @for (j of jugadoresEnBanca(); track j.id) {
                  <div class="bench-card">
                    <div class="bench-info">
                      <span class="bench-pos" [ngClass]="getPosClass(j.posicion)">{{ j.posicion?.slice(0,3) || 'JUG' }}</span>
                      <strong class="bench-name">{{ j.nombre }}</strong>
                      <span class="bench-stars">{{ j.estrellas }} ⭐</span>
                    </div>
                    <div class="bench-buttons">
                      <button type="button" class="add-to-btn a" (click)="asignarAEquipo(j, equipoA)">
                        + {{ equipoA.nombre }}
                      </button>
                      <button type="button" class="add-to-btn b" (click)="asignarAEquipo(j, equipoB)">
                        + {{ equipoB.nombre }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="step-actions space-between">
            <button type="button" mat-stroked-button (click)="irAlPaso(1)">
              <mat-icon>arrow_back</mat-icon> Volver a Datos
            </button>
            <button type="button" mat-flat-button color="primary" [disabled]="!paso2Valido()" (click)="irAlPaso(3)">
              Siguiente: Revisar y Publicar <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        </div>
      }

      <!-- CONTENIDO DEL PASO 3 -->
      @if (pasoActual() === 3) {
        <div class="step-content card-box">
          <h2>3. Resumen y Confirmación</h2>
          <p class="section-hint">Revisa los detalles del encuentro deportivo antes de guardarlo o publicarlo a la comunidad.</p>

          <div class="summary-card">
            <div class="summary-header">
              <div>
                <span class="summary-cancha">{{ reservaSeleccionada()?.canchaNombre }} ({{ reservaSeleccionada()?.canchaTipo }})</span>
                <h3 class="summary-title">{{ infoForm.get('nombre')?.value }}</h3>
                <div class="summary-date">
                  📅 {{ reservaSeleccionada()?.fecha }} • ⏰ {{ reservaSeleccionada()?.horaInicio }} - {{ reservaSeleccionada()?.horaFin }}
                </div>
              </div>
              @if (infoForm.get('apuestaMonto')?.value) {
                <div class="summary-bet">
                  <mat-icon>paid</mat-icon>
                  <span>Apuesta Informativa: S/ {{ infoForm.get('apuestaMonto')?.value | number:'1.2-2' }}</span>
                </div>
              }
            </div>

            <!-- TEAMS DISPLAY EN RESUMEN -->
            <div class="summary-matchup">
              <!-- EQUIPO A -->
              <div class="summary-team">
                <div class="summary-team-bar" [style.background-color]="equipoA.color"></div>
                <h4>{{ equipoA.nombre }}</h4>
                <div class="team-stat-line">
                  <span>{{ equipoA.jugadores.length }} Jugadores</span>
                  <span>Promedio: <strong>{{ calcularPromedio(equipoA.jugadores) | number:'1.1-1' }} ⭐</strong></span>
                </div>
                <ul class="summary-roster">
                  @for (j of equipoA.jugadores; track j.id) {
                    <li>{{ j.nombre }} ({{ j.posicion }}) - {{ j.estrellas }} ⭐</li>
                  }
                </ul>
              </div>

              <div class="summary-vs">
                <span class="vs-circle">VS</span>
                <span class="balance-indicator">Δ {{ diferenciaEstrellas() | number:'1.1-1' }} ⭐</span>
              </div>

              <!-- EQUIPO B -->
              <div class="summary-team">
                <div class="summary-team-bar" [style.background-color]="equipoB.color"></div>
                <h4>{{ equipoB.nombre }}</h4>
                <div class="team-stat-line">
                  <span>{{ equipoB.jugadores.length }} Jugadores</span>
                  <span>Promedio: <strong>{{ calcularPromedio(equipoB.jugadores) | number:'1.1-1' }} ⭐</strong></span>
                </div>
                <ul class="summary-roster">
                  @for (j of equipoB.jugadores; track j.id) {
                    <li>{{ j.nombre }} ({{ j.posicion }}) - {{ j.estrellas }} ⭐</li>
                  }
                </ul>
              </div>
            </div>
          </div>

          <div class="final-actions">
            <button type="button" mat-stroked-button (click)="irAlPaso(2)">
              <mat-icon>arrow_back</mat-icon> Modificar Equipos
            </button>
            <div class="action-buttons-right">
              <button 
                type="button" 
                mat-stroked-button 
                color="primary" 
                [disabled]="guardando()" 
                (click)="finalizar(false)">
                <mat-icon>save</mat-icon> Guardar como Borrador
              </button>
              <button 
                type="button" 
                mat-flat-button 
                color="primary" 
                [disabled]="guardando() || !paso2Valido()" 
                (click)="finalizar(true)">
                <mat-icon>publish</mat-icon> Publicar Encuentro
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wizard-page {
      padding: 1.5rem;
      max-width: 1100px;
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

    .breadcrumb a {
      color: #0284c7;
      text-decoration: none;
    }

    .breadcrumb .current {
      font-weight: 600;
      color: #0f172a;
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

    /* STEPPER NAV */
    .stepper-nav {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.75rem 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .step-nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s ease;
    }

    .step-nav-item.active {
      opacity: 1;
    }

    .step-nav-item.completed {
      opacity: 0.85;
    }

    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .step-nav-item.active .step-num {
      background: #0284c7;
      color: #ffffff;
    }

    .step-nav-item.completed .step-num {
      background: #10b981;
      color: #ffffff;
    }

    .step-text {
      display: flex;
      flex-direction: column;
    }

    .step-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
    }

    .step-desc {
      font-size: 0.75rem;
      color: #64748b;
    }

    .step-separator {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      margin: 0 1.25rem;
    }

    /* CARD BOX */
    .card-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }

    .card-box h2 {
      margin: 0 0 0.25rem;
      font-size: 1.3rem;
      font-weight: 700;
      color: #0f172a;
    }

    .section-hint {
      margin: 0 0 1.5rem;
      font-size: 0.9rem;
      color: #64748b;
    }

    .step-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }

    .balance-btn {
      background: #059669 !important;
      color: #ffffff !important;
      font-weight: 600;
      height: 40px;
    }

    .spin-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* FORMS */
    .step-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .required {
      color: #ef4444;
    }

    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      font-size: 0.9rem;
      color: #1e293b;
      outline: none;
    }

    .form-control:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    }

    .input-with-icon {
      display: flex;
      align-items: center;
      position: relative;
    }

    .currency-prefix {
      position: absolute;
      left: 12px;
      font-weight: 700;
      color: #64748b;
    }

    .input-with-icon .form-control {
      padding-left: 36px;
      width: 100%;
    }

    .disclaimer-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      font-size: 0.8rem;
      margin-top: 0.4rem;
    }

    .disclaimer-banner mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* RESERVAS PICKER */
    .reservas-picker {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.85rem;
    }

    .reserva-option {
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .reserva-option:hover {
      border-color: #93c5fd;
      background: #f8fafc;
    }

    .reserva-option.selected {
      border-color: #0284c7;
      background: #f0f9ff;
    }

    .radio-circle {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .reserva-option.selected .radio-circle {
      border-color: #0284c7;
    }

    .inner-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: transparent;
    }

    .reserva-option.selected .inner-dot {
      background: #0284c7;
    }

    .cancha-title {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #0f172a;
    }

    .cancha-title mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #0284c7;
    }

    .badge-tipo {
      background: #e2e8f0;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
    }

    .reserva-time {
      display: flex;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
      flex-wrap: wrap;
    }

    .banner-preview {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .banner-preview img {
      max-width: 200px;
      height: 100px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }

    .remove-btn {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .step-actions.space-between {
      justify-content: space-between;
    }

    /* STEP 2: KPI BAR */
    .balance-summary-bar {
      display: flex;
      gap: 1.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.25rem;
    }

    .kpi-box {
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .kpi-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
    }

    .kpi-value.valid, .kpi-value.balanced {
      color: #15803d;
    }

    .kpi-hint {
      font-size: 0.75rem;
      color: #64748b;
    }

    /* TEAMS CONTAINER */
    .teams-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .team-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-top: 4px solid #3b82f6;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .team-card-header {
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .team-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .team-name-input {
      font-weight: 700;
      font-size: 1rem;
      border: 1px solid transparent;
      background: transparent;
      outline: none;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }

    .team-name-input:hover, .team-name-input:focus {
      border-color: #cbd5e1;
      background: #ffffff;
    }

    .color-picker {
      width: 28px;
      height: 28px;
      border: none;
      cursor: pointer;
      border-radius: 4px;
      padding: 0;
    }

    .team-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #64748b;
    }

    .stars-badge {
      background: #fef3c7;
      color: #b45309;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
    }

    .team-body {
      padding: 0.75rem;
      min-height: 220px;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .team-empty {
      color: #94a3b8;
      font-size: 0.85rem;
      text-align: center;
      margin: auto;
    }

    .roster-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.4rem 0.6rem;
    }

    .roster-pos {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      color: #ffffff;
    }

    .pos-portero { background-color: #eab308; }
    .pos-defensa { background-color: #3b82f6; }
    .pos-medio { background-color: #10b981; }
    .pos-delantero { background-color: #ef4444; }

    .roster-name {
      flex: 1;
      font-size: 0.85rem;
      font-weight: 600;
      color: #1e293b;
    }

    .roster-stars {
      font-size: 0.75rem;
      color: #b45309;
      font-weight: 600;
    }

    .roster-controls {
      display: flex;
      gap: 2px;
    }

    .ctrl-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 2px;
      display: flex;
    }

    .ctrl-btn.remove:hover {
      color: #ef4444;
    }

    .ctrl-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .team-card-footer {
      padding: 0.5rem 1rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 0.75rem;
      color: #64748b;
      text-align: right;
    }

    .text-warn {
      color: #ef4444;
      font-weight: 700;
    }

    /* BENCH SECTION */
    .bench-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .bench-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.85rem;
    }

    .auto-select-btn {
      background: #2563eb !important;
      color: #ffffff !important;
      font-weight: 600;
      border-radius: 20px;
      padding: 0 1.25rem;
      height: 38px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    .auto-select-btn:hover {
      background: #1d4ed8 !important;
    }

    .bench-empty-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f0fdf4;
      border: 1px dashed #86efac;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      color: #166534;
    }

    .bench-empty-box mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #16a34a;
    }

    .bench-empty-text strong {
      display: block;
      font-size: 0.9rem;
      color: #14532d;
    }

    .bench-empty-text p {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: #166534;
    }

    .bench-section h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }

    .bench-hint {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: #64748b;
    }

    .bench-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.6rem;
    }

    .bench-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .bench-info {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .bench-pos {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      color: #ffffff;
    }

    .bench-name {
      font-size: 0.8rem;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bench-stars {
      font-size: 0.75rem;
      color: #b45309;
      font-weight: 600;
    }

    .bench-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
    }

    .add-to-btn {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 4px;
      padding: 0.25rem 0.4rem;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .add-to-btn.a:hover {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
    }

    .add-to-btn.b:hover {
      background: #f0fdf4;
      border-color: #22c55e;
      color: #15803d;
    }

    /* STEP 3: SUMMARY */
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .summary-cancha {
      font-size: 0.8rem;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-title {
      margin: 0.2rem 0;
      font-size: 1.4rem;
      font-weight: 800;
      color: #0f172a;
    }

    .summary-date {
      font-size: 0.85rem;
      color: #64748b;
    }

    .summary-bet {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 0.4rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .summary-matchup {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .summary-team {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      padding: 1rem;
      position: relative;
    }

    .summary-team-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .summary-team h4 {
      margin: 0.25rem 0;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .team-stat-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 0.75rem;
    }

    .summary-roster {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.8rem;
      color: #334155;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-vs {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding-top: 2rem;
    }

    .vs-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.9rem;
    }

    .balance-indicator {
      font-size: 0.75rem;
      font-weight: 700;
      color: #15803d;
      background: #dcfce7;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
    }

    .final-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.5rem;
      gap: 1rem;
    }

    .action-buttons-right {
      display: flex;
      gap: 0.75rem;
    }

    .warning-box {
      display: flex;
      gap: 0.75rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      border-radius: 8px;
      padding: 1rem;
      font-size: 0.9rem;
    }

    .warning-box mat-icon {
      color: #d97706;
    }

    .link-btn {
      display: inline-block;
      margin-top: 0.5rem;
      color: #0284c7;
      font-weight: 600;
      text-decoration: underline;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .spin {
      animation: spin 1s linear infinite;
    }
  `]
})
export class EncuentroWizardComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  pasoActual = signal<number>(1);
  cargandoReservas = signal<boolean>(false);
  cargandoBalanceo = signal<boolean>(false);
  guardando = signal<boolean>(false);

  reservasDisponibles = signal<Reserva[]>([]);
  reservaSeleccionada = signal<Reserva | null>(null);
  plantelCompleto = signal<Jugador[]>([]);

  bannerFile: File | null = null;
  previewBanner = signal<string | null>(null);

  // Form Paso 1
  infoForm: FormGroup = this.fb.group({
    reservaId: [null, Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    apuestaMonto: [null, [Validators.min(0)]]
  });

  // Equipos Paso 2
  equipoA: TeamDraft = {
    nombre: 'Equipo Azul',
    color: '#2563eb',
    jugadores: []
  };

  equipoB: TeamDraft = {
    nombre: 'Equipo Blanco',
    color: '#0f172a',
    jugadores: []
  };

  // Versión reactiva para forzar re-evaluación instantánea de computed signals y estado de banca
  equiposVersion = signal<number>(0);

  totalJugadoresSeleccionados = computed(() => {
    this.equiposVersion();
    return this.equipoA.jugadores.length + this.equipoB.jugadores.length;
  });

  diferenciaEstrellas = computed(() => {
    this.equiposVersion();
    const avgA = this.calcularPromedio(this.equipoA.jugadores);
    const avgB = this.calcularPromedio(this.equipoB.jugadores);
    return Math.abs(avgA - avgB);
  });

  // Los jugadores asignados a Equipo A o Equipo B NO deben aparecer en la banca
  jugadoresEnBanca = computed(() => {
    this.equiposVersion();
    const idsAsignados = new Set([
      ...this.equipoA.jugadores.map(j => j.id),
      ...this.equipoB.jugadores.map(j => j.id)
    ]);
    return this.plantelCompleto().filter(j => !idsAsignados.has(j.id));
  });

  ngOnInit(): void {
    this.cargarReservasDisponibles();
    this.cargarPlantel();
  }

  cargarReservasDisponibles(): void {
    this.cargandoReservas.set(true);
    this.encuentrosService.getReservasDisponiblesParaEncuentro().subscribe({
      next: (reservas) => {
        this.reservasDisponibles.set(reservas);
        this.cargandoReservas.set(false);
      },
      error: () => {
        this.snackBar.open('Error al consultar reservas disponibles', 'Cerrar', { duration: 3000 });
        this.cargandoReservas.set(false);
      }
    });
  }

  cargarPlantel(): void {
    this.encuentrosService.getMisJugadoresActivos().subscribe({
      next: (jugadores) => {
        this.plantelCompleto.set(jugadores);
      },
      error: () => {
        this.snackBar.open('Error al cargar jugadores activos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  seleccionarReserva(res: Reserva): void {
    this.reservaSeleccionada.set(res);
    this.infoForm.patchValue({ reservaId: res.id });
    if (!this.infoForm.get('nombre')?.value) {
      this.infoForm.patchValue({ nombre: `Partido en ${res.canchaNombre} (${res.fecha})` });
    }
  }

  onBannerSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('El banner no debe superar los 5MB', 'Cerrar', { duration: 3000 });
        return;
      }
      this.bannerFile = file;
      const reader = new FileReader();
      reader.onload = () => this.previewBanner.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  paso1Valido(): boolean {
    return this.infoForm.valid && this.reservaSeleccionada() !== null;
  }

  paso2Valido(): boolean {
    // RN-16: 4 a 8 jugadores por equipo
    this.equiposVersion();
    const countA = this.equipoA.jugadores.length;
    const countB = this.equipoB.jugadores.length;
    return countA >= 4 && countA <= 8 && countB >= 4 && countB <= 8;
  }

  irAlPaso(paso: number): void {
    if (paso === 2 && !this.paso1Valido()) return;
    if (paso === 3 && (!this.paso1Valido() || !this.paso2Valido())) return;
    this.pasoActual.set(paso);
  }

  asignarAEquipo(jugador: Jugador, destino: TeamDraft): void {
    if (destino.jugadores.length >= 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: `El equipo ${destino.nombre} ya tiene el máximo permitido de 8 jugadores (Regla RN-16).`,
        confirmButtonColor: '#0066ff'
      });
      return;
    }
    // Evitar que el jugador ya esté en alguno de los equipos
    if (this.equipoA.jugadores.some(j => j.id === jugador.id) || this.equipoB.jugadores.some(j => j.id === jugador.id)) {
      return;
    }
    destino.jugadores = [...destino.jugadores, jugador];
    this.equiposVersion.update(v => v + 1);
  }

  moverJugador(jugador: Jugador, origen: TeamDraft, destino: TeamDraft): void {
    if (destino.jugadores.length >= 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: `El equipo ${destino.nombre} ya tiene el máximo permitido de 8 jugadores (Regla RN-16).`,
        confirmButtonColor: '#0066ff'
      });
      return;
    }
    origen.jugadores = origen.jugadores.filter(j => j.id !== jugador.id);
    if (!destino.jugadores.some(j => j.id === jugador.id)) {
      destino.jugadores = [...destino.jugadores, jugador];
    }
    this.equiposVersion.update(v => v + 1);
  }

  desconvocar(jugador: Jugador, equipo: TeamDraft): void {
    equipo.jugadores = equipo.jugadores.filter(j => j.id !== jugador.id);
    this.equiposVersion.update(v => v + 1);
  }

  balancearAutomaticamente(): void {
    const plantel = this.plantelCompleto();
    if (!plantel || plantel.length < 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Plantel insuficiente',
        text: `Se requieren al menos 8 jugadores activos en tu plantel para formar dos equipos de 4 a 8 jugadores (Regla RN-16). Actualmente tienes ${plantel?.length || 0} jugador(es) disponible(s).`,
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    const convocadosIds = [
      ...this.equipoA.jugadores.map(j => j.id),
      ...this.equipoB.jugadores.map(j => j.id)
    ];

    if (convocadosIds.length >= 8) {
      const maxPlantelPar = Math.min(16, plantel.length - (plantel.length % 2));
      Swal.fire({
        title: 'Selección y Balance de Equipos',
        text: '¿Cómo deseas realizar la distribución equitativa por nivel de estrellas?',
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: '#0066ff',
        denyButtonColor: '#059669',
        cancelButtonColor: '#64748b',
        confirmButtonText: `Distribuir Todo el Plantel (${maxPlantelPar} jug.)`,
        denyButtonText: `Rebalancear Solo Convocados (${convocadosIds.length} jug.)`,
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarBalanceoSnakeDraft(plantel.map(j => j.id));
        } else if (result.isDenied) {
          this.ejecutarBalanceoSnakeDraft(convocadosIds);
        }
      });
    } else {
      this.ejecutarBalanceoSnakeDraft(plantel.map(j => j.id));
    }
  }

  private ejecutarBalanceoSnakeDraft(candidatosIds: number[]): void {
    // Calculamos el número par de jugadores a convocar (mínimo 8, máximo 16)
    let totalAConvocados = Math.min(16, candidatosIds.length);
    if (totalAConvocados % 2 !== 0) {
      totalAConvocados -= 1; // Para que ambos equipos tengan exactamente igual número de jugadores
    }

    // Filtrar los objetos de jugadores para ordenar por estrellas de mayor a menor
    const candidatos = this.plantelCompleto().filter(j => candidatosIds.includes(j.id));
    candidatos.sort((a, b) => b.estrellas - a.estrellas);
    const seleccionados = candidatos.slice(0, totalAConvocados);
    const idsParaBalancear = seleccionados.map(j => j.id);

    this.cargandoBalanceo.set(true);
    this.encuentrosService.balancearEquipos(idsParaBalancear, 2).subscribe({
      next: (sugerencias: SugerenciaEquipo[]) => {
        if (sugerencias && sugerencias.length >= 2) {
          this.equipoA.jugadores = [...sugerencias[0].jugadores];
          this.equipoB.jugadores = [...sugerencias[1].jugadores];
          this.equiposVersion.update(v => v + 1);

          const avgA = this.calcularPromedio(this.equipoA.jugadores);
          const avgB = this.calcularPromedio(this.equipoB.jugadores);
          const diff = Math.abs(avgA - avgB).toFixed(1);

          Swal.fire({
            icon: 'success',
            title: '¡Equipos Balanceados Exitosamente!',
            html: `
              <div style="text-align: left; font-size: 0.95rem;">
                <p>Se distribuyeron <b>${idsParaBalancear.length} jugadores</b> equitativamente por nivel de estrellas (Snake Draft):</p>
                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 10px 0;">
                  <p style="margin: 4px 0;">🔵 <b>${this.equipoA.nombre}:</b> ${this.equipoA.jugadores.length} jugadores • Promedio: <b>${avgA} ⭐</b></p>
                  <p style="margin: 4px 0;">⚪ <b>${this.equipoB.nombre}:</b> ${this.equipoB.jugadores.length} jugadores • Promedio: <b>${avgB} ⭐</b></p>
                  <p style="margin: 6px 0 0; color: #16a34a; font-weight: bold;">Diferencia de nivel: Δ ${diff} ⭐</p>
                </div>
                ${this.jugadoresEnBanca().length > 0 
                  ? `<p style="font-size: 0.85rem; color: #64748b;">${this.jugadoresEnBanca().length} jugador(es) permanecen disponibles en la banca.</p>` 
                  : '<p style="font-size: 0.85rem; color: #16a34a; font-weight: 600;">✓ Todos los jugadores disponibles están convocados.</p>'}
              </div>
            `,
            confirmButtonColor: '#0066ff'
          });
        }
        this.cargandoBalanceo.set(false);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error de Balanceo',
          text: err.error?.message || 'No se pudo completar el auto-balanceo',
          confirmButtonColor: '#0066ff'
        });
        this.cargandoBalanceo.set(false);
      }
    });
  }

  calcularPromedio(jugadores: Jugador[]): number {
    if (!jugadores || jugadores.length === 0) return 0;
    const sum = jugadores.reduce((acc, j) => acc + j.estrellas, 0);
    return Math.round((sum / jugadores.length) * 10) / 10;
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

  finalizar(publicar: boolean): void {
    if (this.guardando()) return;

    const accionTexto = publicar ? 'Publicar Encuentro' : 'Guardar como Borrador';
    Swal.fire({
      title: `¿Confirmar ${accionTexto}?`,
      html: `
        <div style="text-align: left; font-size: 0.95rem; line-height: 1.6;">
          <p><b>🏆 Título:</b> ${this.infoForm.get('nombre')?.value}</p>
          <p><b>🏟️ Cancha:</b> ${this.reservaSeleccionada()?.canchaNombre} (${this.reservaSeleccionada()?.fecha})</p>
          <p><b>👥 Equipos:</b> ${this.equipoA.nombre} (${this.equipoA.jugadores.length} jug.) vs ${this.equipoB.nombre} (${this.equipoB.jugadores.length} jug.)</p>
          ${publicar ? '<p style="color:#10b981; font-weight:bold;">El partido quedará visible al público de inmediato.</p>' : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0066ff',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Sí, ${publicar ? 'publicar' : 'guardar'}`,
      cancelButtonText: 'Revisar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.guardando.set(true);

        Swal.fire({
          title: publicar ? 'Publicando encuentro...' : 'Guardando borrador...',
          didOpen: () => Swal.showLoading(),
          allowOutsideClick: false
        });

        const fVal = this.infoForm.value;
        const formData = new FormData();
        formData.append('reservaId', fVal.reservaId.toString());
        formData.append('nombre', fVal.nombre);
        if (fVal.apuestaMonto) {
          formData.append('apuestaMonto', fVal.apuestaMonto.toString());
        }
        if (this.bannerFile) {
          formData.append('banner', this.bannerFile);
        }

        // 1. Crear el encuentro
        this.encuentrosService.crearEncuentro(formData).subscribe({
          next: (encuentroCreado) => {
            // 2. Asignar los equipos y jugadores
            const equiposData = [
              {
                nombre: this.equipoA.nombre,
                color: this.equipoA.color,
                jugadorIds: this.equipoA.jugadores.map(j => j.id)
              },
              {
                nombre: this.equipoB.nombre,
                color: this.equipoB.color,
                jugadorIds: this.equipoB.jugadores.map(j => j.id)
              }
            ];

            this.encuentrosService.actualizarEquipos(encuentroCreado.id, { equipos: equiposData }).subscribe({
              next: () => {
                if (publicar) {
                  // 3. Publicar si fue solicitado
                  this.encuentrosService.publicarEncuentro(encuentroCreado.id).subscribe({
                    next: () => {
                      Swal.fire({
                        icon: 'success',
                        title: '¡Encuentro Publicado!',
                        text: 'El encuentro deportivo ha sido publicado exitosamente.',
                        confirmButtonColor: '#0066ff'
                      }).then(() => {
                        this.router.navigate(['/encuentros/eventos', encuentroCreado.id]);
                      });
                      this.guardando.set(false);
                    },
                    error: (err) => {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Guardado como borrador',
                        text: 'El encuentro se guardó, pero no se pudo publicar: ' + (err.error?.message || ''),
                        confirmButtonColor: '#0066ff'
                      }).then(() => {
                        this.router.navigate(['/encuentros/eventos', encuentroCreado.id]);
                      });
                      this.guardando.set(false);
                    }
                  });
                } else {
                  Swal.fire({
                    icon: 'success',
                    title: 'Borrador Guardado',
                    text: 'El encuentro se guardó como borrador correctamente.',
                    confirmButtonColor: '#0066ff'
                  }).then(() => {
                    this.router.navigate(['/encuentros/eventos', encuentroCreado.id]);
                  });
                  this.guardando.set(false);
                }
              },
              error: (err) => {
                Swal.fire({
                  icon: 'error',
                  title: 'Error al asignar equipos',
                  text: err.error?.message || 'No se pudieron guardar los equipos.',
                  confirmButtonColor: '#ef4444'
                });
                this.guardando.set(false);
              }
            });
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al crear encuentro',
              text: err.error?.message || 'No se pudo crear el encuentro.',
              confirmButtonColor: '#ef4444'
            });
            this.guardando.set(false);
          }
        });
      }
    });
  }
}
