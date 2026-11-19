import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { EncuentrosService } from '../../../core/services/encuentros.service';

@Component({
  selector: 'app-register-tecnico',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  template: `
    <div class="register-page">
      <div class="register-card">
        <!-- Logo Header -->
        <div class="card-header">
          <div class="shield-badge">
            <mat-icon>sports_soccer</mat-icon>
          </div>
          <h2>Registro de Técnico</h2>
          <p>Crea tu cuenta de técnico organizador para reservar canchas y armar tus encuentros.</p>
        </div>

        @if (registroExitoso()) {
          <div class="success-notice">
            <div class="success-icon-circle">
              <mat-icon>mark_email_read</mat-icon>
            </div>
            <h3>¡Registro Exitoso!</h3>
            <p>
              Tu solicitud ha sido enviada con éxito. Tu cuenta se encuentra en estado <strong>Pendiente de Aprobación</strong> y será revisada por un administrador.
            </p>
            <div class="success-actions">
              <a routerLink="/auth/login" mat-flat-button color="primary">
                Ir a Iniciar Sesión
              </a>
              <a routerLink="/" mat-stroked-button>
                Volver a la Cartelera
              </a>
            </div>
          </div>
        } @else {
          <!-- Formulario -->
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-col">
                <mat-label>Nombres</mat-label>
                <input matInput formControlName="nombres" placeholder="Ej. Roberto">
                @if (registerForm.get('nombres')?.touched && registerForm.get('nombres')?.invalid) {
                  <mat-error>Los nombres son requeridos</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-col">
                <mat-label>Apellidos</mat-label>
                <input matInput formControlName="apellidos" placeholder="Ej. Carlos Silva">
                @if (registerForm.get('apellidos')?.touched && registerForm.get('apellidos')?.invalid) {
                  <mat-error>Los apellidos son requeridos</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-col">
                <mat-label>Correo Electrónico</mat-label>
                <input matInput formControlName="email" type="email" placeholder="tecnico@correo.pe">
                @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
                  <mat-error>Ingresa un correo electrónico válido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-col">
                <mat-label>Teléfono de Contacto</mat-label>
                <input matInput formControlName="telefono" placeholder="Ej. 987654321">
                @if (registerForm.get('telefono')?.touched && registerForm.get('telefono')?.invalid) {
                  <mat-error>El teléfono es requerido</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-col">
                <mat-label>Contraseña</mat-label>
                <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password">
                <button type="button" mat-icon-button matSuffix (click)="hidePassword = !hidePassword">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
                  <mat-error>Mínimo 8 caracteres (mayúscula, minúscula y número)</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-col">
                <mat-label>Confirmar Contraseña</mat-label>
                <input matInput [type]="hideConfirm ? 'password' : 'text'" formControlName="confirmPassword">
                <button type="button" mat-icon-button matSuffix (click)="hideConfirm = !hideConfirm">
                  <mat-icon>{{ hideConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (registerForm.get('confirmPassword')?.touched && registerForm.get('confirmPassword')?.invalid) {
                  <mat-error>Las contraseñas no coinciden</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Términos -->
            <div class="terms-row">
              <mat-checkbox formControlName="terminos" color="primary">
                Acepto los términos y condiciones de FUTBOL S.A.
              </mat-checkbox>
            </div>

            <button mat-flat-button color="primary" type="submit" class="btn-submit" [disabled]="registerForm.invalid || guardando()">
              @if (guardando()) {
                <span>Enviando solicitud...</span>
              } @else {
                <span>Registrarme como Técnico</span>
              }
            </button>
          </form>

          <div class="card-footer">
            <span>¿Ya tienes una cuenta?</span>
            <a routerLink="/auth/login">Iniciar Sesión</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      min-height: 100vh;
      background: #0b1a30;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .register-card {
      background: #112340;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 2.5rem;
      max-width: 620px;
      width: 100%;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
    }
    .card-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .shield-badge {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0066ff, #0284c7);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      box-shadow: 0 4px 16px rgba(0, 102, 255, 0.4);
    }
    .card-header h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.5rem;
    }
    .card-header p {
      font-size: 0.95rem;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }
    .register-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .form-col {
      flex: 1;
      min-width: 240px;
    }
    .terms-row {
      margin: 0.5rem 0 1.5rem;
      color: #cbd5e1;
      font-size: 0.85rem;
    }
    .btn-submit {
      height: 48px !important;
      font-size: 1rem !important;
      font-weight: 700 !important;
      border-radius: 24px !important;
      background: #0066ff !important;
      color: white !important;
    }
    .card-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.9rem;
      color: #94a3b8;
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    .card-footer a {
      color: #38bdf8;
      font-weight: 600;
      text-decoration: none;
    }

    /* Success Notice */
    .success-notice {
      text-align: center;
      padding: 1.5rem 0;
    }
    .success-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .success-icon-circle mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
    .success-notice h3 {
      font-size: 1.6rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.75rem;
    }
    .success-notice p {
      color: #cbd5e1;
      font-size: 1rem;
      line-height: 1.6;
      max-width: 480px;
      margin: 0 auto 2rem;
    }
    .success-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
  `]
})
export class RegisterTecnicoComponent {
  private fb = inject(FormBuilder);
  private encuentrosService = inject(EncuentrosService);
  private snackBar = inject(MatSnackBar);

  hidePassword = true;
  hideConfirm = true;
  guardando = signal<boolean>(false);
  registroExitoso = signal<boolean>(false);

  registerForm: FormGroup = this.fb.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    terminos: [false, [Validators.requiredTrue]]
  }, {
    validators: (group) => {
      const pass = group.get('password')?.value;
      const confirm = group.get('confirmPassword')?.value;
      return pass === confirm ? null : { notMatching: true };
    }
  });

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.guardando.set(true);
    const formVal = this.registerForm.value;

    this.encuentrosService.registroTecnico({
      nombres: formVal.nombres,
      apellidos: formVal.apellidos,
      email: formVal.email,
      telefono: formVal.telefono,
      password: formVal.password,
      confirmPassword: formVal.confirmPassword
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.registroExitoso.set(true);
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err.error?.mensaje || err.error?.message || 'Error al completar el registro';
        this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
      }
    });
  }
}
