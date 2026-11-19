import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';

export interface RoleItem {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole?: boolean;
}

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ],
  template: `
    <!-- ENCABEZADO VISTA -->
    <div class="view-header">
      <h1>
        <mat-icon>person_add</mat-icon>
        <span>Registrar Usuario</span>
      </h1>
      <p>Completa la información del nuevo usuario y asigna su rol en el sistema</p>
    </div>

    <!-- TARJETA FORMULARIO -->
    <div class="white-panel-card" style="max-width: 780px;">
      <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
        <!-- Correo Electrónico * -->
        <div style="margin-bottom: 1.25rem;">
          <label style="display: block; font-size: 0.9rem; font-weight: 600; color: #1e293b; margin-bottom: 0.4rem;">
            Correo electrónico <span style="color: #ef4444;">*</span>
          </label>
          <mat-form-field appearance="outline" style="width: 100%;">
            <input matInput type="email" formControlName="email" placeholder="nuevo@empresa.com">
            @if (userForm.get('email')?.touched && userForm.get('email')?.hasError('required')) {
              <mat-error>El correo es obligatorio.</mat-error>
            }
            @if (userForm.get('email')?.touched && userForm.get('email')?.hasError('email')) {
              <mat-error>Formato de correo inválido.</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Nombre Completo * -->
        <div style="margin-bottom: 1.25rem;">
          <label style="display: block; font-size: 0.9rem; font-weight: 600; color: #1e293b; margin-bottom: 0.4rem;">
            Nombre completo <span style="color: #ef4444;">*</span>
          </label>
          <mat-form-field appearance="outline" style="width: 100%;">
            <input matInput formControlName="fullName" placeholder="Ana García López">
            @if (userForm.get('fullName')?.touched && userForm.get('fullName')?.hasError('required')) {
              <mat-error>El nombre es obligatorio.</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Fila: Rol * y Estado -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: center; margin-bottom: 1.75rem;">
          <div>
            <label style="display: block; font-size: 0.9rem; font-weight: 600; color: #1e293b; margin-bottom: 0.4rem;">
              Rol <span style="color: #ef4444;">*</span>
            </label>
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-select formControlName="role">
                @for (rol of rolesDisponibles(); track rol.code) {
                  <mat-option [value]="rol.code">
                    {{ rol.name }} ({{ rol.code }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div>
            <label style="display: block; font-size: 0.9rem; font-weight: 600; color: #1e293b; margin-bottom: 0.75rem;">
              Estado
            </label>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <mat-slide-toggle formControlName="enabled" color="primary">
                <span style="font-size: 0.9rem; font-weight: 600;" [style.color]="userForm.get('enabled')?.value ? '#16a34a' : '#dc2626'">
                  {{ userForm.get('enabled')?.value ? 'Activo' : 'Inactivo' }}
                </span>
              </mat-slide-toggle>
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div style="display: flex; gap: 1rem; align-items: center;">
          <button mat-flat-button class="btn-primary-blue" type="submit" [disabled]="userForm.invalid || isSubmitting()">
            @if (isSubmitting()) {
              <mat-spinner diameter="20" style="margin-right: 8px; display: inline-block;"></mat-spinner>
            } @else {
              <mat-icon style="margin-right: 4px;">how_to_reg</mat-icon>
            }
            <span>Registrar Usuario</span>
          </button>

          <button mat-stroked-button class="btn-secondary-outline" type="button" routerLink="/usuarios">
            <mat-icon style="margin-right: 4px;">close</mat-icon>
            <span>Cancelar</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class UserRegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient);

  readonly isSubmitting = signal(false);

  // Lista de todos los roles habilitados en el sistema
  readonly rolesDisponibles = signal<RoleItem[]>([
    { code: 'ROLE_SUPER_ADMIN', name: 'Super Administrador' },
    { code: 'ROLE_ADMIN', name: 'Administrador' },
    { code: 'ROLE_TECNICO', name: 'Técnico' },
    { code: 'ROLE_ANALISTA', name: 'Analista' },
    { code: 'ROLE_EDITOR', name: 'Editor' },
    { code: 'ROLE_VISUALIZADOR', name: 'Visualizador' },
    { code: 'ROLE_USER', name: 'Usuario' },
    { code: 'ROLE_STANDARD', name: 'Usuario Estándar' }
  ]);

  userForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    role: ['ROLE_ANALISTA', [Validators.required]],
    enabled: [true]
  });

  ngOnInit(): void {
    this.cargarRoles();
  }

  cargarRoles(): void {
    this.http.get<RoleItem[]>('http://localhost:8080/api/v1/admin/roles').subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.rolesDisponibles.set(data);
          // Si el rol actual no está en la lista recibida, fijar el primero
          const currentRole = this.userForm.get('role')?.value;
          if (!data.some(r => r.code === currentRole)) {
            this.userForm.patchValue({ role: data[0].code });
          }
        }
      },
      error: () => { }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.userForm.value;

    // Registra al usuario a través del endpoint de administración con su rol correspondiente
    this.http.post('http://localhost:8080/api/v1/admin/users', {
      fullName: val.fullName,
      email: val.email,
      roleCode: val.role,
      enabled: val.enabled
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        Swal.fire({
          icon: 'success',
          title: '¡Usuario Registrado!',
          text: `El usuario '${val.fullName}' ha sido creado exitosamente con el rol seleccionado.`,
          confirmButtonColor: '#0066ff',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.router.navigate(['/usuarios']);
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errMsg = err.error?.message || 'No fue posible registrar el usuario.';
        Swal.fire({
          icon: 'error',
          title: 'Error al registrar',
          text: errMsg,
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }
}
