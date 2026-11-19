import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { EncuentrosService } from '../../../core/services/encuentros.service';
import { AuthService } from '../../../core/services/auth.service';
import { Jugador, JugadorHistorial } from '../../../core/models/encuentros.models';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="jugadores-page">
      <!-- HEADER -->
      <div class="page-header">
        <div>
          <div class="breadcrumb">
            <span>Encuentros</span>
            <mat-icon>chevron_right</mat-icon>
            <span class="current">Jugadores</span>
          </div>
          <h1>Plantel de Jugadores</h1>
          <p class="subtitle">Registra, evalúa con estrellas (1 a 5) y administra el estado de tus jugadores</p>
        </div>
        <div class="header-actions">
          <button mat-flat-button color="primary" (click)="abrirDialogoNuevo()" [disabled]="authService.isTecnicoPendiente()">
            <mat-icon>person_add</mat-icon>
            <span>Nuevo Jugador</span>
          </button>
        </div>
      </div>

      <!-- ALERTA TÉCNICO PENDIENTE -->
      @if (authService.isTecnicoPendiente()) {
        <div class="alert-banner warning">
          <mat-icon>hourglass_top</mat-icon>
          <div>
            <strong>Cuenta en espera de aprobación:</strong>
            Su registro como técnico está en revisión por la administración. No podrá registrar ni modificar jugadores hasta ser activado.
          </div>
        </div>
      }

      <!-- FILTROS Y BÚSQUEDA -->
      <div class="filters-card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input type="text" [(ngModel)]="filtroTexto" placeholder="Buscar por nombre o apodo..." />
          @if (filtroTexto) {
            <button class="clear-btn" (click)="filtroTexto = ''">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <div class="select-filters">
          <select [(ngModel)]="filtroPosicion" class="filter-select">
            <option value="">Todas las posiciones</option>
            <option value="PORTERO">Portero</option>
            <option value="DEFENSA">Defensa</option>
            <option value="MEDIOCAMPISTA">Mediocampista</option>
            <option value="DELANTERO">Delantero</option>
          </select>

          <select [(ngModel)]="filtroEstrellas" class="filter-select">
            <option value="0">Todas las estrellas</option>
            <option value="5">5 estrellas ⭐⭐⭐⭐⭐</option>
            <option value="4">4 estrellas ⭐⭐⭐⭐</option>
            <option value="3">3 estrellas ⭐⭐⭐</option>
            <option value="2">2 estrellas ⭐⭐</option>
            <option value="1">1 estrella ⭐</option>
          </select>

          <select [(ngModel)]="filtroEstado" class="filter-select">
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVOS">Solo Activos</option>
            <option value="INACTIVOS">Solo Inactivos</option>
          </select>
        </div>

        <div class="stats-counter">
          <span>Total: <strong>{{ jugadoresFiltrados().length }}</strong> jugadores</span>
        </div>
      </div>

      <!-- ESTADO DE CARGA / VACÍO -->
      @if (cargando()) {
        <div class="loading-state">
          <mat-icon class="spin">sync</mat-icon>
          <span>Cargando plantel de jugadores...</span>
        </div>
      } @else if (jugadoresFiltrados().length === 0) {
        <div class="empty-state">
          <mat-icon>sports_soccer</mat-icon>
          <h3>No se encontraron jugadores</h3>
          <p>Ajusta los filtros o añade a tu primer jugador al plantel.</p>
          <button mat-stroked-button color="primary" (click)="abrirDialogoNuevo()" [disabled]="authService.isTecnicoPendiente()">
            <mat-icon>add</mat-icon> Agregar Jugador
          </button>
        </div>
      } @else {
        <!-- GRID DE TARJETAS DE JUGADORES -->
        <div class="jugadores-grid">
          @for (jugador of jugadoresFiltrados(); track jugador.id) {
            <div class="jugador-card" [class.inactive]="!jugador.activo">
              <!-- AVATAR Y FOTO -->
              <div class="jugador-photo-container">
                @if (jugador.fotoUrl && !imgErrores().has(jugador.id)) {
                  <img [src]="getFotoUrl(jugador.fotoUrl)" [alt]="jugador.nombre" class="jugador-photo" (error)="onImgError(jugador.id)" />
                } @else {
                  <div class="jugador-avatar-fallback" [ngClass]="getPosicionClass(jugador.posicion)">
                    {{ getInitials(jugador.nombre) }}
                  </div>
                }
                <span class="posicion-badge" [ngClass]="getPosicionClass(jugador.posicion)">
                  {{ jugador.posicion || 'JUGADOR' }}
                </span>
              </div>

              <!-- INFO DEL JUGADOR -->
              <div class="jugador-info">
                <div class="name-row">
                  <h3 class="jugador-name">{{ jugador.nombre }}</h3>
                  @if (jugador.apodo) {
                    <span class="jugador-apodo">"{{ jugador.apodo }}"</span>
                  }
                </div>

                <!-- SELECTOR INTERACTIVO DE ESTRELLAS (1 a 5) -->
                <div class="stars-container" matTooltip="Clic en una estrella para cambiar valoración">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button 
                      type="button"
                      class="star-btn" 
                      [class.filled]="star <= jugador.estrellas"
                      [disabled]="authService.isTecnicoPendiente()"
                      (click)="modificarEstrellas(jugador, star)">
                      <mat-icon>{{ star <= jugador.estrellas ? 'star' : 'star_border' }}</mat-icon>
                    </button>
                  }
                  <span class="stars-val">({{ jugador.estrellas }}/5)</span>
                </div>

                <div class="status-indicator">
                  <span class="status-dot" [class.active]="jugador.activo"></span>
                  <span class="status-text">{{ jugador.activo ? 'Activo' : 'Inactivo' }}</span>
                </div>
              </div>

              <!-- ACCIONES DE TARJETA -->
              <div class="jugador-actions">
                <button mat-icon-button (click)="verHistorial(jugador)" matTooltip="Ver historial de estrellas">
                  <mat-icon>history</mat-icon>
                </button>
                <button mat-icon-button (click)="abrirDialogoEdicion(jugador)" matTooltip="Editar jugador" [disabled]="authService.isTecnicoPendiente()">
                  <mat-icon>edit</mat-icon>
                </button>
                <button 
                  mat-icon-button 
                  [color]="jugador.activo ? 'warn' : 'primary'"
                  (click)="toggleActivo(jugador)" 
                  [matTooltip]="jugador.activo ? 'Desactivar jugador' : 'Activar jugador'"
                  [disabled]="authService.isTecnicoPendiente()">
                  <mat-icon>{{ jugador.activo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- DIÁLOGO / MODAL FORMULARIO JUGADOR -->
      @if (dialogoVisible()) {
        <div class="modal-backdrop">
          <div class="modal-box">
            <div class="modal-header">
              <h2>{{ modoEdicion() ? 'Editar Jugador' : 'Nuevo Jugador' }}</h2>
              <button class="icon-close" (click)="cerrarDialogo()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form [formGroup]="jugadorForm" (ngSubmit)="guardarJugador()" class="modal-body">
              <div class="form-group">
                <label>Nombre Completo <span class="required">*</span></label>
                <input type="text" formControlName="nombre" placeholder="Ej. Paolo Guerrero" class="form-control" />
                @if (jugadorForm.get('nombre')?.invalid && jugadorForm.get('nombre')?.touched) {
                  <span class="field-error">El nombre debe tener al menos 3 caracteres</span>
                }
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Apodo / Sobrenombre</label>
                  <input type="text" formControlName="apodo" placeholder="Ej. Depredador" class="form-control" />
                </div>

                <div class="form-group">
                  <label>Posición Táctica</label>
                  <select formControlName="posicion" class="form-control">
                    <option value="PORTERO">Portero</option>
                    <option value="DEFENSA">Defensa</option>
                    <option value="MEDIOCAMPISTA">Mediocampista</option>
                    <option value="DELANTERO">Delantero</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Nivel de Estrellas (1 - 5) <span class="required">*</span></label>
                <div class="star-rating-picker">
                  @for (s of [1, 2, 3, 4, 5]; track s) {
                    <button 
                      type="button" 
                      class="picker-star" 
                      [class.active]="s <= jugadorForm.get('estrellas')?.value"
                      (click)="jugadorForm.patchValue({ estrellas: s })">
                      <mat-icon>{{ s <= jugadorForm.get('estrellas')?.value ? 'star' : 'star_border' }}</mat-icon>
                    </button>
                  }
                  <span class="picker-label">{{ jugadorForm.get('estrellas')?.value }} de 5 estrellas</span>
                </div>
              </div>

              <div class="form-group">
                <label>Foto del Jugador (Opcional, máx 5MB)</label>
                <input type="file" accept="image/png, image/jpeg" (change)="onFotoSeleccionada($event)" class="file-input" />
                @if (previewFoto()) {
                  <div class="preview-box">
                    <img [src]="previewFoto()" alt="Vista previa" class="preview-img" />
                    <button type="button" class="remove-photo-btn" (click)="removerFoto()">Quitar foto</button>
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button type="button" mat-stroked-button (click)="cerrarDialogo()">Cancelar</button>
                <button type="submit" mat-flat-button color="primary" [disabled]="jugadorForm.invalid || guardando()">
                  {{ guardando() ? 'Guardando...' : (modoEdicion() ? 'Actualizar' : 'Guardar Jugador') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- DIÁLOGO / MODAL HISTORIAL DE ESTRELLAS -->
      @if (historialVisible()) {
        <div class="modal-backdrop">
          <div class="modal-box">
            <div class="modal-header">
              <h2>Historial de Estrellas: {{ jugadorSeleccionado()?.nombre }}</h2>
              <button class="icon-close" (click)="cerrarHistorial()">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="modal-body">
              @if (cargandoHistorial()) {
                <div class="loading-state">
                  <mat-icon class="spin">sync</mat-icon>
                  <span>Cargando registros...</span>
                </div>
              } @else if (historialItems().length === 0) {
                <div class="empty-state-sm">
                  <mat-icon>history_toggle_off</mat-icon>
                  <p>No hay cambios de estrellas registrados para este jugador.</p>
                </div>
              } @else {
                <div class="timeline">
                  @for (item of historialItems(); track item.id) {
                    <div class="timeline-item">
                      <div class="timeline-marker">
                        <mat-icon>star</mat-icon>
                      </div>
                      <div class="timeline-content">
                        <div class="timeline-header">
                          <span class="change-stars">
                            {{ item.estrellasAnterior }} ⭐ ➔ <strong>{{ item.estrellasNueva }} ⭐</strong>
                          </span>
                          <span class="change-date">{{ item.cambiadoEn | date:'dd/MM/yyyy HH:mm' }}</span>
                        </div>
                        <div class="timeline-author">
                          Modificado por: <strong>{{ item.cambiadoPorNombre }}</strong>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button type="button" mat-flat-button color="primary" (click)="cerrarHistorial()">Cerrar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .jugadores-page {
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
      align-items: center;
      padding: 0;
    }

    .select-filters {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.45rem 0.75rem;
      font-size: 0.85rem;
      color: #334155;
      outline: none;
      cursor: pointer;
    }

    .stats-counter {
      margin-left: auto;
      font-size: 0.85rem;
      color: #64748b;
    }

    /* GRID & CARDS */
    .jugadores-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 1.25rem;
    }

    .jugador-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .jugador-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    }

    .jugador-card.inactive {
      opacity: 0.65;
      background: #f8fafc;
      border-style: dashed;
    }

    .jugador-photo-container {
      position: relative;
      height: 140px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jugador-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .jugador-avatar-fallback {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    }

    .posicion-badge {
      position: absolute;
      bottom: 8px;
      right: 8px;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    /* POSICION COLORS */
    .pos-portero { background-color: #eab308; }
    .pos-defensa { background-color: #3b82f6; }
    .pos-medio { background-color: #10b981; }
    .pos-delantero { background-color: #ef4444; }

    .jugador-info {
      padding: 1rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .name-row {
      display: flex;
      flex-direction: column;
    }

    .jugador-name {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
    }

    .jugador-apodo {
      font-size: 0.8rem;
      color: #64748b;
      font-style: italic;
    }

    /* STARS INTERACTION */
    .stars-container {
      display: flex;
      align-items: center;
      gap: 2px;
      margin: 0.35rem 0;
    }

    .star-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      transition: transform 0.1s ease;
    }

    .star-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .star-btn.filled {
      color: #f59e0b;
    }

    .star-btn:hover {
      transform: scale(1.2);
    }

    .stars-val {
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      margin-left: 4px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: #64748b;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .status-dot.active {
      background: #22c55e;
    }

    .jugador-actions {
      border-top: 1px solid #f1f5f9;
      padding: 0.4rem 0.75rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.25rem;
      background: #fafafa;
    }

    /* MODAL */
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
      max-width: 500px;
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
      font-size: 1.2rem;
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
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
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
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-control {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 0.9rem;
      color: #1e293b;
      outline: none;
    }

    .form-control:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
    }

    .field-error {
      font-size: 0.75rem;
      color: #ef4444;
    }

    .star-rating-picker {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .picker-star {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #cbd5e1;
      display: flex;
    }

    .picker-star.active {
      color: #f59e0b;
    }

    .picker-star mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .picker-label {
      margin-left: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
    }

    .preview-box {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .preview-img {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
    }

    .remove-photo-btn {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    /* TIMELINE */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 360px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .timeline-item {
      display: flex;
      gap: 0.75rem;
    }

    .timeline-marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fef3c7;
      color: #d97706;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .timeline-marker mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .timeline-content {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem;
      flex: 1;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .change-stars {
      font-size: 0.9rem;
      color: #0f172a;
    }

    .change-date {
      font-size: 0.75rem;
      color: #64748b;
    }

    .timeline-author {
      font-size: 0.8rem;
      color: #475569;
    }

    .loading-state, .empty-state, .empty-state-sm {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: #64748b;
      text-align: center;
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
export class JugadoresComponent implements OnInit {
  private encuentrosService = inject(EncuentrosService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  jugadores = signal<Jugador[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Filtros
  filtroTexto = '';
  filtroPosicion = '';
  filtroEstrellas = '0';
  filtroEstado = 'TODOS';

  // Modal Jugador
  dialogoVisible = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  jugadorEnEdicionId: number | null = null;
  fotoArchivo: File | null = null;
  previewFoto = signal<string | null>(null);
  imgErrores = signal<Set<number>>(new Set());

  getFotoUrl(url?: string): string {
    return this.encuentrosService.getArchivoPublicoUrl(url);
  }

  onImgError(jugadorId: number): void {
    this.imgErrores.update(set => {
      const nuevo = new Set(set);
      nuevo.add(jugadorId);
      return nuevo;
    });
  }

  jugadorForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    apodo: [''],
    posicion: ['MEDIOCAMPISTA', Validators.required],
    estrellas: [3, [Validators.required, Validators.min(1), Validators.max(5)]]
  });

  // Modal Historial
  historialVisible = signal<boolean>(false);
  cargandoHistorial = signal<boolean>(false);
  jugadorSeleccionado = signal<Jugador | null>(null);
  historialItems = signal<JugadorHistorial[]>([]);

  jugadoresFiltrados = computed(() => {
    let list = this.jugadores();
    if (this.filtroTexto.trim()) {
      const q = this.filtroTexto.toLowerCase().trim();
      list = list.filter(j => 
        j.nombre.toLowerCase().includes(q) || 
        (j.apodo && j.apodo.toLowerCase().includes(q))
      );
    }
    if (this.filtroPosicion) {
      list = list.filter(j => j.posicion === this.filtroPosicion);
    }
    if (this.filtroEstrellas !== '0') {
      const stars = parseInt(this.filtroEstrellas, 10);
      list = list.filter(j => j.estrellas === stars);
    }
    if (this.filtroEstado === 'ACTIVOS') {
      list = list.filter(j => j.activo);
    } else if (this.filtroEstado === 'INACTIVOS') {
      list = list.filter(j => !j.activo);
    }
    return list;
  });

  ngOnInit(): void {
    this.cargarJugadores();
  }

  cargarJugadores(): void {
    this.cargando.set(true);
    this.encuentrosService.getMisJugadores().subscribe({
      next: (data) => {
        this.jugadores.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.snackBar.open('Error al cargar la lista de jugadores', 'Cerrar', { duration: 3000 });
        this.cargando.set(false);
      }
    });
  }

  abrirDialogoNuevo(): void {
    if (this.authService.isTecnicoPendiente()) return;
    this.modoEdicion.set(false);
    this.jugadorEnEdicionId = null;
    this.fotoArchivo = null;
    this.previewFoto.set(null);
    this.jugadorForm.reset({
      nombre: '',
      apodo: '',
      posicion: 'MEDIOCAMPISTA',
      estrellas: 3
    });
    this.dialogoVisible.set(true);
  }

  abrirDialogoEdicion(jugador: Jugador): void {
    if (this.authService.isTecnicoPendiente()) return;
    this.modoEdicion.set(true);
    this.jugadorEnEdicionId = jugador.id;
    this.fotoArchivo = null;
    this.previewFoto.set(this.getFotoUrl(jugador.fotoUrl) || null);
    this.jugadorForm.patchValue({
      nombre: jugador.nombre,
      apodo: jugador.apodo || '',
      posicion: jugador.posicion || 'MEDIOCAMPISTA',
      estrellas: jugador.estrellas
    });
    this.dialogoVisible.set(true);
  }

  cerrarDialogo(): void {
    this.dialogoVisible.set(false);
    this.jugadorEnEdicionId = null;
    this.fotoArchivo = null;
    this.previewFoto.set(null);
  }

  onFotoSeleccionada(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('La imagen no debe superar los 5MB', 'Cerrar', { duration: 3000 });
        return;
      }
      this.fotoArchivo = file;
      const reader = new FileReader();
      reader.onload = () => this.previewFoto.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removerFoto(): void {
    this.fotoArchivo = null;
    this.previewFoto.set(null);
  }

  guardarJugador(): void {
    if (this.jugadorForm.invalid) return;

    this.guardando.set(true);
    const formVal = this.jugadorForm.value;
    const formData = new FormData();
    formData.append('nombre', formVal.nombre);
    if (formVal.apodo) formData.append('apodo', formVal.apodo);
    formData.append('posicion', formVal.posicion);
    formData.append('estrellas', formVal.estrellas.toString());
    if (this.fotoArchivo) {
      formData.append('foto', this.fotoArchivo);
    }

    if (this.modoEdicion() && this.jugadorEnEdicionId) {
      this.encuentrosService.actualizarJugador(this.jugadorEnEdicionId, formData).subscribe({
        next: (jugadorActualizado) => {
          Swal.fire({
            icon: 'success',
            title: '¡Jugador Actualizado!',
            text: `${jugadorActualizado.nombre} ha sido actualizado correctamente.`,
            confirmButtonColor: '#0066ff'
          });
          this.jugadores.update(list => list.map(j => j.id === jugadorActualizado.id ? jugadorActualizado : j));
          this.cerrarDialogo();
          this.guardando.set(false);
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error al actualizar',
            text: err.error?.detail || err.error?.message || 'No se pudo actualizar el jugador.',
            confirmButtonColor: '#ef4444'
          });
          this.guardando.set(false);
        }
      });
    } else {
      this.encuentrosService.crearJugador(formData).subscribe({
        next: (nuevo) => {
          Swal.fire({
            icon: 'success',
            title: '¡Jugador Registrado!',
            text: `${nuevo.nombre} ha sido incorporado al plantel.`,
            confirmButtonColor: '#0066ff'
          });
          this.jugadores.update(list => [nuevo, ...list]);
          this.cerrarDialogo();
          this.guardando.set(false);
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error al registrar',
            text: err.error?.detail || err.error?.message || 'No se pudo registrar el jugador.',
            confirmButtonColor: '#ef4444'
          });
          this.guardando.set(false);
        }
      });
    }
  }

  modificarEstrellas(jugador: Jugador, nuevasEstrellas: number): void {
    if (this.authService.isTecnicoPendiente() || jugador.estrellas === nuevasEstrellas) return;

    Swal.fire({
      title: 'Cambiar Valoración de Estrellas',
      text: `¿Actualizar valoración de ${jugador.nombre} de ${jugador.estrellas} ⭐ a ${nuevasEstrellas} ⭐?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0066ff',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cambiar estrellas',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const formData = new FormData();
        formData.append('nombre', jugador.nombre);
        if (jugador.apodo) formData.append('apodo', jugador.apodo);
        if (jugador.posicion) formData.append('posicion', jugador.posicion);
        formData.append('estrellas', nuevasEstrellas.toString());

        this.encuentrosService.actualizarJugador(jugador.id, formData).subscribe({
          next: (actualizado) => {
            Swal.fire({
              icon: 'success',
              title: '¡Estrellas Actualizadas!',
              text: `${jugador.nombre} ahora tiene ${nuevasEstrellas} ⭐. El cambio quedó registrado en el historial.`,
              confirmButtonColor: '#0066ff',
              timer: 2000,
              showConfirmButton: false
            });
            this.jugadores.update(list => list.map(j => j.id === actualizado.id ? actualizado : j));
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error al cambiar estrellas',
              text: err.error?.message || 'No se pudo actualizar.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  toggleActivo(jugador: Jugador): void {
    if (this.authService.isTecnicoPendiente()) return;

    const nuevoEstado = !jugador.activo;
    const accion = nuevoEstado ? 'habilitar' : 'marcar como inactivo';

    Swal.fire({
      title: `¿Deseas ${accion} a ${jugador.nombre}?`,
      text: nuevoEstado ? 'El jugador volverá a estar disponible para convocar en encuentros.' : 'El jugador no aparecerá en las alineaciones mientras esté inactivo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: nuevoEstado ? '#10b981' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.encuentrosService.cambiarEstadoJugador(jugador.id, nuevoEstado).subscribe({
          next: (actualizado) => {
            Swal.fire({
              icon: 'success',
              title: nuevoEstado ? '¡Jugador Habilitado!' : 'Jugador Desactivado',
              text: `${actualizado.nombre} está ahora ${nuevoEstado ? 'activo' : 'inactivo'}.`,
              confirmButtonColor: '#0066ff',
              timer: 2000,
              showConfirmButton: false
            });
            this.jugadores.update(list => list.map(j => j.id === actualizado.id ? actualizado : j));
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err.error?.message || 'No se pudo cambiar el estado del jugador.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  verHistorial(jugador: Jugador): void {
    this.jugadorSeleccionado.set(jugador);
    this.historialVisible.set(true);
    this.cargandoHistorial.set(true);

    this.encuentrosService.getHistorialEstrellas(jugador.id).subscribe({
      next: (historial) => {
        this.historialItems.set(historial);
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.snackBar.open('Error al obtener historial', 'Cerrar', { duration: 3000 });
        this.cargandoHistorial.set(false);
      }
    });
  }

  cerrarHistorial(): void {
    this.historialVisible.set(false);
    this.jugadorSeleccionado.set(null);
    this.historialItems.set([]);
  }

  getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getPosicionClass(posicion?: string): string {
    switch (posicion) {
      case 'PORTERO': return 'pos-portero';
      case 'DEFENSA': return 'pos-defensa';
      case 'MEDIOCAMPISTA': return 'pos-medio';
      case 'DELANTERO': return 'pos-delantero';
      default: return 'pos-medio';
    }
  }
}
