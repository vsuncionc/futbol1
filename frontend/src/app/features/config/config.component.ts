import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { EncuentrosService } from '../../core/services/encuentros.service';
import { SystemConfig } from '../../core/models/auth.models';
import { Cancha } from '../../core/models/encuentros.models';

interface CanchaEditable extends Cancha {
  nuevaTarifa: number;
  guardando: boolean;
}

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <!-- ENCABEZADO VISTA -->
    <div class="view-header">
      <h1>
        <mat-icon>settings</mat-icon>
        <span>Configuración del Sistema</span>
      </h1>
      <p>Políticas de seguridad, tarifas de canchas y parámetros globales de FUTBOL S.A.</p>
    </div>

    @if (alertMessage()) {
      <div class="alert-box success" style="margin-bottom: 1.5rem;">
        <mat-icon>check_circle</mat-icon>
        <span>{{ alertMessage() }}</span>
      </div>
    }

    <div style="display: flex; flex-direction: column; gap: 1.75rem; max-width: 960px;">
      
      <!-- SECCIÓN: PRECIO DE LA CANCHA (GESTIÓN DE TARIFAS DEPORTIVAS) -->
      <div class="white-panel-card" style="border-left: 4px solid #10b981;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 42px; height: 42px; border-radius: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              <mat-icon style="font-size: 24px; width: 24px; height: 24px;">sports_soccer</mat-icon>
            </div>
            <div>
              <h3 style="font-size: 1.22rem; font-weight: 800; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>Precio de la Cancha</span>
                <span style="font-size: 0.74rem; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 12px; font-weight: 700;">
                  Tarifas por Hora
                </span>
              </h3>
              <p style="font-size: 0.86rem; color: #64748b; margin: 0.2rem 0 0 0;">
                Establece y actualiza las tarifas de alquiler por hora para cada cancha deportiva de FUTBOL S.A.
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.6rem;">
            @if (cargandoCanchas()) {
              <div style="display: flex; align-items: center; gap: 0.4rem; color: #64748b; font-size: 0.82rem;">
                <mat-spinner diameter="16"></mat-spinner>
                <span>Cargando...</span>
              </div>
            }
            <button 
              type="button" 
              mat-stroked-button 
              (click)="loadCanchas()" 
              [disabled]="cargandoCanchas()"
              style="height: 36px; border-radius: 8px; font-size: 0.84rem; color: #334155;">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px; margin-right: 4px;">refresh</mat-icon>
              <span>Refrescar</span>
            </button>
          </div>
        </div>

        <!-- LISTADO DE CANCHAS -->
        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          @if (canchasEditables().length === 0 && !cargandoCanchas()) {
            <div style="text-align: center; padding: 2rem; color: #64748b;">
              <mat-icon style="font-size: 36px; width: 36px; height: 36px; opacity: 0.4;">sports_soccer</mat-icon>
              <p style="margin: 0.5rem 0 0 0;">No se encontraron canchas registradas.</p>
            </div>
          }

          @for (c of canchasEditables(); track c.id) {
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 1rem; transition: all 0.2s ease;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div [ngStyle]="{
                  'background': c.tipo === 'F5' ? '#eff6ff' : c.tipo === 'F7' ? '#f0fdf4' : '#faf5ff',
                  'color': c.tipo === 'F5' ? '#2563eb' : c.tipo === 'F7' ? '#16a34a' : '#9333ea',
                  'border': '1px solid ' + (c.tipo === 'F5' ? '#bfdbfe' : c.tipo === 'F7' ? '#bbf7d0' : '#e9d5ff')
                }" style="width: 44px; height: 44px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;">
                  <span>{{ c.tipo }}</span>
                </div>

                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong style="color: #0f172a; font-size: 1.05rem;">{{ c.nombre }}</strong>
                    <span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 10px; font-weight: 700; background: #e2e8f0; color: #475569;">
                      {{ c.tipo === 'F5' ? 'Fútbol 5' : c.tipo === 'F7' ? 'Fútbol 7' : 'Fútbol 11' }}
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; font-size: 0.82rem;">
                    <span style="color: #64748b;">Precio actual en sistema:</span>
                    <strong style="color: #059669; font-size: 0.92rem;">S/ {{ c.tarifaHora | number:'1.2-2' }} por hora</strong>
                  </div>
                </div>
              </div>

              <!-- CONTROLES DE EDICIÓN DE PRECIO -->
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="display: flex; align-items: center; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0.35rem 0.65rem; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                  <span style="font-weight: 800; color: #059669; margin-right: 0.35rem; font-size: 1rem;">S/</span>
                  <input 
                    type="number" 
                    [(ngModel)]="c.nuevaTarifa" 
                    min="1" 
                    step="5"
                    style="width: 95px; border: none; outline: none; font-size: 1.05rem; font-weight: 700; color: #0f172a; text-align: right;"
                    placeholder="0.00" />
                  <span style="font-size: 0.75rem; color: #64748b; margin-left: 0.35rem; font-weight: 600;">/hora</span>
                </div>

                <button 
                  type="button" 
                  mat-flat-button 
                  (click)="guardarTarifaCancha(c)"
                  [disabled]="c.guardando || c.nuevaTarifa <= 0 || c.nuevaTarifa === c.tarifaHora"
                  [ngStyle]="{
                    'background': c.nuevaTarifa !== c.tarifaHora ? '#10b981' : '#e2e8f0',
                    'color': c.nuevaTarifa !== c.tarifaHora ? '#ffffff' : '#94a3b8'
                  }"
                  style="min-width: 125px; height: 40px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                  @if (c.guardando) {
                    <mat-spinner diameter="16" style="display: inline-block;"></mat-spinner>
                    <span>Guardando...</span>
                  } @else {
                    <span style="display: inline-flex; align-items: center; gap: 4px;">
                      <mat-icon style="font-size: 18px; width: 18px; height: 18px;">save</mat-icon>
                      <span>{{ c.nuevaTarifa !== c.tarifaHora ? 'Fijar Precio' : 'Guardado' }}</span>
                    </span>
                  }
                </button>
              </div>
            </div>
          }
        </div>

        <!-- NOTA INFORMATIVA -->
        <div style="margin-top: 1.25rem; padding: 0.75rem 1rem; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; display: flex; align-items: center; gap: 0.65rem;">
          <mat-icon style="color: #059669; font-size: 20px; width: 20px; height: 20px;">check_circle</mat-icon>
          <span style="font-size: 0.82rem; color: #065f46; line-height: 1.4;">
            <b>Impacto inmediato:</b> Al actualizar el precio de una cancha, el nuevo costo por hora se refleja al instante en el cálculo de montos de las reservas y en el catálogo público de FUTBOL S.A.
          </span>
        </div>
      </div>

      <!-- CARD 2: POLÍTICAS DE REGISTRO Y ACCESO PÚBLICO -->
      <div class="white-panel-card">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
            <mat-icon style="font-size: 20px; width: 20px; height: 20px;">person_add</mat-icon>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">
              Políticas de Registro y Acceso
            </h3>
            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">Control de admisión de nuevos colaboradores</p>
          </div>
        </div>

        <!-- Toggle: Autorregistro Público -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid #f1f5f9;">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem;">Permitir Autorregistro Público de Usuarios</strong>
            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.85rem;">
              Si está deshabilitado, los usuarios no pueden crearse cuentas desde la pantalla de login (solo mediante alta administrativa).
            </p>
          </div>
          <mat-slide-toggle 
            [checked]="isRegistrationOpen()" 
            (change)="toggleRegistration($event.checked)" 
            color="primary">
            {{ isRegistrationOpen() ? 'HABILITADO' : 'DESHABILITADO' }}
          </mat-slide-toggle>
        </div>

        <!-- Rol por Defecto -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 0;">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem;">Rol Asignado por Defecto al Registrarse</strong>
            <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.85rem;">
              Rol con privilegios mínimos atribuido automáticamente en nuevos registros.
            </p>
          </div>
          <span class="badge-role user" style="font-size: 0.85rem; font-weight: 700;">
            ROLE_USER (Usuario Estándar)
          </span>
        </div>
      </div>

      <!-- CARD 3: POLÍTICAS DE FUERZA BRUTA Y BLOQUEO DE CUENTAS -->
      <div class="white-panel-card">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center;">
            <mat-icon style="font-size: 20px; width: 20px; height: 20px;">lock_clock</mat-icon>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">
              Seguridad Defensiva y Protección contra Fuerza Bruta
            </h3>
            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">Umbrales de bloqueo de cuentas y limitadores de tasa</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.25rem;">
          <div>
            <label style="display: block; font-size: 0.88rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
              Intentos Fallidos Consecutivos Máximos
            </label>
            <mat-form-field appearance="outline" style="width: 100%;">
              <input matInput type="number" [(ngModel)]="maxFailedAttempts" min="3" max="10">
            </mat-form-field>
          </div>

          <div>
            <label style="display: block; font-size: 0.88rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
              Duración del Bloqueo Temporal (Minutos)
            </label>
            <mat-form-field appearance="outline" style="width: 100%;">
              <input matInput type="number" [(ngModel)]="lockDurationMinutes" min="5" max="60">
            </mat-form-field>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button mat-flat-button class="btn-primary-blue" (click)="saveSecurityPolicies()" [disabled]="isSavingPolicies()">
            @if (isSavingPolicies()) {
              <mat-spinner diameter="18" style="margin-right: 8px; display: inline-block;"></mat-spinner>
            }
            <span>Guardar Parámetros de Bloqueo</span>
          </button>
        </div>
      </div>

      <!-- CARD 4: CRIPTOGRAFÍA Y SESIONES -->
      <div class="white-panel-card">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: #f3e8ff; color: #7e22ce; display: flex; align-items: center; justify-content: center;">
            <mat-icon style="font-size: 20px; width: 20px; height: 20px;">vpn_key</mat-icon>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">
              Criptografía y Sesiones Activas
            </h3>
            <p style="font-size: 0.85rem; color: #64748b; margin: 0;">Configuración de tokens, cookies y algoritmos</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Algoritmo Hash</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-top: 0.25rem;">BCrypt (Costo 12)</div>
            <div style="font-size: 0.75rem; color: #16a34a; margin-top: 0.2rem;">4,096 rondas criptográficas</div>
          </div>

          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Access Token TTL</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-top: 0.25rem;">15 Minutos</div>
            <div style="font-size: 0.75rem; color: #0284c7; margin-top: 0.2rem;">HMAC-SHA512 en memoria</div>
          </div>

          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Refresh Token</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-top: 0.25rem;">7 Días</div>
            <div style="font-size: 0.75rem; color: #15803d; margin-top: 0.2rem;">HttpOnly; SameSite=Strict</div>
          </div>

          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase;">Rotación de Tokens</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #16a34a; margin-top: 0.25rem;">Habilitada</div>
            <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">Detección anti-robo</div>
          </div>
        </div>
      </div>

      <!-- CARD 5: MOTOR DE BASE DE DATOS Y CONSOLA H2 -->
      <div class="white-panel-card">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center;">
              <mat-icon style="font-size: 20px; width: 20px; height: 20px;">dns</mat-icon>
            </div>
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0;">
                Base de Datos H2 Database
              </h3>
              <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
                Instancia en memoria: <code>jdbc:h2:mem:seguridad_db</code> (Modo PostgreSQL)
              </p>
            </div>
          </div>

          <a href="http://localhost:8080/h2-console" target="_blank" mat-stroked-button class="btn-secondary-outline">
            <mat-icon style="margin-right: 4px;">open_in_new</mat-icon>
            <span>Abrir Consola Web H2</span>
          </a>
        </div>
      </div>

    </div>
  `
})
export class ConfigComponent implements OnInit {
  private http = inject(HttpClient);
  public authService = inject(AuthService);
  private encuentrosService = inject(EncuentrosService);

  private readonly API_URL = 'http://localhost:8080/api/v1/admin/config';

  readonly isRegistrationOpen = signal(true);
  readonly maxFailedAttempts = signal(5);
  readonly lockDurationMinutes = signal(15);
  readonly isSavingPolicies = signal(false);
  readonly alertMessage = signal<string | null>(null);

  // Canchas y Precios
  readonly canchasEditables = signal<CanchaEditable[]>([]);
  readonly cargandoCanchas = signal<boolean>(false);

  ngOnInit(): void {
    this.loadConfigs();
    this.loadCanchas();
  }

  loadConfigs(): void {
    this.http.get<SystemConfig[]>(this.API_URL).subscribe({
      next: (configs) => {
        const reg = configs.find(x => x.key === 'ALLOW_PUBLIC_REGISTRATION');
        if (reg) this.isRegistrationOpen.set(reg.value === 'true');

        const max = configs.find(x => x.key === 'MAX_FAILED_LOGIN_ATTEMPTS');
        if (max) this.maxFailedAttempts.set(parseInt(max.value, 10));

        const lock = configs.find(x => x.key === 'ACCOUNT_LOCK_DURATION_MINUTES');
        if (lock) this.lockDurationMinutes.set(parseInt(lock.value, 10));
      },
      error: () => {}
    });
  }

  loadCanchas(): void {
    this.cargandoCanchas.set(true);
    this.encuentrosService.getCanchas().subscribe({
      next: (data) => {
        const editables: CanchaEditable[] = (data || []).map(c => ({
          ...c,
          nuevaTarifa: c.tarifaHora,
          guardando: false
        }));
        this.canchasEditables.set(editables);
        this.cargandoCanchas.set(false);
      },
      error: () => {
        this.cargandoCanchas.set(false);
      }
    });
  }

  guardarTarifaCancha(c: CanchaEditable): void {
    if (!c.nuevaTarifa || c.nuevaTarifa <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Precio Inválido',
        text: 'Por favor ingresa un precio por hora mayor a cero.',
        confirmButtonColor: '#0066ff'
      });
      return;
    }

    c.guardando = true;
    this.encuentrosService.actualizarTarifaCancha(c.id, c.nuevaTarifa).subscribe({
      next: (actualizada) => {
        c.guardando = false;
        c.tarifaHora = actualizada.tarifaHora;
        c.nuevaTarifa = actualizada.tarifaHora;
        Swal.fire({
          icon: 'success',
          title: '¡Precio Actualizado!',
          html: `La tarifa de <b>${c.nombre}</b> se estableció en <b style="color:#10b981;">S/ ${c.tarifaHora.toFixed(2)} / hora</b>.`,
          confirmButtonColor: '#0066ff',
          timer: 2500
        });
      },
      error: (err) => {
        c.guardando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al fijar precio',
          text: err.error?.detail || err.error?.message || 'No se pudo actualizar el precio de la cancha.',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  toggleRegistration(enabled: boolean): void {
    this.http.put(`${this.API_URL}/ALLOW_PUBLIC_REGISTRATION`, {
      value: enabled.toString()
    }).subscribe({
      next: () => {
        this.isRegistrationOpen.set(enabled);
        this.authService.isRegistrationEnabled.set(enabled);
        Swal.fire({
          title: '¡Política Actualizada!',
          text: `El autorregistro público ahora está ${enabled ? 'HABILITADO' : 'DESHABILITADO'}.`,
          icon: 'success',
          confirmButtonColor: '#0066ff',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  saveSecurityPolicies(): void {
    this.isSavingPolicies.set(true);

    const updateMax = this.http.put(`${this.API_URL}/MAX_FAILED_LOGIN_ATTEMPTS`, {
      value: this.maxFailedAttempts().toString()
    });

    const updateLock = this.http.put(`${this.API_URL}/ACCOUNT_LOCK_DURATION_MINUTES`, {
      value: this.lockDurationMinutes().toString()
    });

    updateMax.subscribe({
      next: () => {
        updateLock.subscribe({
          next: () => {
            this.isSavingPolicies.set(false);
            Swal.fire({
              title: '¡Políticas Guardadas!',
              text: 'Las políticas de fuerza bruta y bloqueo han sido actualizadas.',
              icon: 'success',
              confirmButtonColor: '#0066ff',
              confirmButtonText: 'Aceptar'
            });
          },
          error: () => this.isSavingPolicies.set(false)
        });
      },
      error: () => this.isSavingPolicies.set(false)
        });
  }

  private showAlert(msg: string): void {
    this.alertMessage.set(msg);
    setTimeout(() => this.alertMessage.set(null), 3500);
  }
}
