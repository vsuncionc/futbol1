import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  styles: [`
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `],
  template: `
    <!-- ENCABEZADO VISTA -->
    <div class="view-header">
      <h1>
        <mat-icon>person</mat-icon>
        <span>Mi Perfil</span>
      </h1>
      <p>Gestiona tu información y cambia tu contraseña</p>
    </div>

    <!-- GRID DE PERFIL: TARJETA FOTO + TARJETA FORMULARIO -->
    <div style="display: grid; grid-template-columns: 280px 1fr; gap: 1.75rem; align-items: start;">
      
      <!-- TARJETA IZQUIERDA: AVATAR Y DATOS BÁSICOS -->
      <div class="white-panel-card" style="text-align: center; padding: 2.25rem 1.5rem;">
        
        <!-- CÍRCULO AVATAR CON IMAGEN O INICIALES -->
        <div style="width: 110px; height: 110px; border-radius: 50%; background: #0066ff; color: #ffffff; font-size: 2.2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; box-shadow: 0 4px 14px rgba(0, 102, 255, 0.25); overflow: hidden; position: relative; border: 3px solid #ffffff;">
          @if (avatarUrl()) {
            <img [src]="avatarUrl()" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">
          } @else {
            {{ userInitials() }}
          }

          @if (isUploading()) {
            <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; color: white;">
              <mat-icon style="animation: spin 1s linear infinite; font-size: 32px; width: 32px; height: 32px;">refresh</mat-icon>
            </div>
          }
        </div>

        <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 0.35rem 0;">
          {{ authService.currentUser()?.fullName || profileForm.get('fullName')?.value }}
        </h3>
        <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 1.5rem 0;">
          {{ authService.currentUser()?.email || profileForm.get('email')?.value }}
        </p>

        <!-- Input de archivo oculto -->
        <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/png, image/jpeg, image/webp" style="display: none;">

        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          <button mat-stroked-button class="btn-secondary-outline" style="width: 100%; border-radius: 8px; font-weight: 600;" (click)="fileInput.click()" [disabled]="isUploading()">
            <mat-icon style="font-size: 18px; width: 18px; height: 18px; margin-right: 6px;">photo_camera</mat-icon>
            <span>{{ isUploading() ? 'Subiendo foto...' : 'Cambiar Foto' }}</span>
          </button>

          @if (authService.currentUser()?.avatarUrl) {
            <button mat-button style="color: #ef4444; width: 100%; font-size: 0.85rem; border-radius: 8px;" (click)="onRemovePhoto()" [disabled]="isUploading()">
              <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">delete_outline</mat-icon>
              <span>Quitar Foto</span>
            </button>
          }
        </div>
      </div>

      <!-- TARJETA DERECHA: FORMULARIO DE DETALLES -->
      <div class="white-panel-card" style="padding: 2rem;">
        @if (updateSuccess()) {
          <div class="alert-box success" style="margin-bottom: 1.25rem;">
            <mat-icon>check_circle</mat-icon>
            <span>Perfil actualizado exitosamente.</span>
          </div>
        }

        <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()">
          <!-- Nombre Completo -->
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.88rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
              Nombre completo
            </label>
            <mat-form-field appearance="outline" style="width: 100%;">
              <input matInput formControlName="fullName">
            </mat-form-field>
          </div>

          <!-- Correo Electrónico -->
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-size: 0.88rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
              Correo electrónico
            </label>
            <mat-form-field appearance="outline" style="width: 100%;">
              <input matInput type="email" formControlName="email">
            </mat-form-field>
          </div>

          <!-- Rol -->
          <div style="margin-bottom: 2rem;">
            <label style="display: block; font-size: 0.88rem; font-weight: 600; color: #334155; margin-bottom: 0.4rem;">
              Rol
            </label>
            <mat-form-field appearance="outline" style="width: 100%;">
              <input matInput formControlName="role" readonly>
            </mat-form-field>
          </div>

          <!-- Fila de Botones: Actualizar Perfil y Cambiar Contraseña -->
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button mat-flat-button class="btn-primary-blue" type="submit">
              <mat-icon style="margin-right: 4px;">check</mat-icon>
              <span>Actualizar Perfil</span>
            </button>

            <button mat-flat-button type="button" routerLink="/auth/reset-password" 
                    style="background: #f3e8ff; color: #7e22ce; border-radius: 8px; font-weight: 600; padding: 0 1.25rem; height: 44px;">
              <mat-icon style="margin-right: 4px;">lock</mat-icon>
              <span>Cambiar Contraseña</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  `
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly updateSuccess = signal(false);
  readonly isUploading = signal(false);

  readonly avatarUrl = computed(() => {
    const url = this.authService.currentUser()?.avatarUrl;
    return this.authService.getAvatarUrl(url);
  });

  readonly userInitials = computed(() => {
    const name = this.authService.currentUser()?.fullName || this.profileForm.get('fullName')?.value || 'Usuario';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly userRoleName = computed(() => {
    if (this.authService.isSuperAdmin()) return 'Super Administrador';
    if (this.authService.isAdmin()) return 'Administrador';
    if (this.authService.isTecnico()) return 'Director Técnico';
    return 'Usuario';
  });

  profileForm: FormGroup = this.fb.group({
    fullName: [this.authService.currentUser()?.fullName || 'Super Administrador', [Validators.required]],
    email: [this.authService.currentUser()?.email || 'admin@empresa.com', [Validators.required, Validators.email]],
    role: [this.userRoleName()]
  });

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (user) => {
        if (user) {
          this.profileForm.patchValue({
            fullName: user.fullName,
            email: user.email,
            role: this.userRoleName()
          });
        }
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato no permitido',
        text: 'Por favor selecciona una imagen válida en formato JPG, PNG o WEBP.',
        confirmButtonColor: '#0066ff'
      });
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo muy grande',
        text: 'La imagen excede el límite permitido de 5 MB.',
        confirmButtonColor: '#0066ff'
      });
      input.value = '';
      return;
    }

    this.isUploading.set(true);
    this.authService.uploadProfilePhoto(file).subscribe({
      next: () => {
        this.isUploading.set(false);
        input.value = '';
        Swal.fire({
          icon: 'success',
          title: '¡Foto actualizada!',
          text: 'Tu foto de perfil se ha guardado correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.isUploading.set(false);
        input.value = '';
        Swal.fire({
          icon: 'error',
          title: 'Error al subir foto',
          text: err.error?.message || 'No se pudo subir la foto de perfil. Inténtalo de nuevo.',
          confirmButtonColor: '#0066ff'
        });
      }
    });
  }

  onRemovePhoto(): void {
    Swal.fire({
      title: '¿Quitar foto de perfil?',
      text: 'Se restablecerá tu avatar con tus iniciales.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isUploading.set(true);
        this.authService.removeProfilePhoto().subscribe({
          next: () => {
            this.isUploading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Foto eliminada',
              text: 'Se ha restablecido tu avatar por defecto.',
              timer: 1800,
              showConfirmButton: false
            });
          },
          error: (err) => {
            this.isUploading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err.error?.message || 'No se pudo quitar la foto.',
              confirmButtonColor: '#0066ff'
            });
          }
        });
      }
    });
  }

  onUpdateProfile(): void {
    if (this.profileForm.invalid) return;
    this.updateSuccess.set(true);
    setTimeout(() => this.updateSuccess.set(false), 3000);
  }
}
