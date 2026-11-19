import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { MainLayoutComponent } from './core/layout/main-layout.component';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  // 1. Páginas Públicas
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/register-tecnico/register-tecnico.component').then(m => m.RegisterTecnicoComponent)
  },
  {
    path: 'publico/encuentros/:id',
    loadComponent: () => import('./features/public/encuentro-detail/encuentro-detail.component').then(m => m.EncuentroDetailComponent)
  },

  // 2. Rutas de Autenticación
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },

  // 3. Panel Principal con Sidebar "FUTBOL S.A." y RBAC estricto
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        canActivate: [() => inject(AuthService).canAccessDashboard() ? true : inject(Router).parseUrl('/perfil')],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'perfil',
        canActivate: [() => inject(AuthService).canAccessProfile() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },

      // --- MÓDULO SEGURIDAD ---
      {
        path: 'usuarios',
        canActivate: [() => inject(AuthService).canAccessUsers() ? true : inject(Router).parseUrl('/perfil')],
        loadComponent: () => import('./features/users/user-management.component').then(m => m.UserManagementComponent)
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [() => inject(AuthService).canAccessUsers() ? true : inject(Router).parseUrl('/perfil')],
        loadComponent: () => import('./features/users/user-register.component').then(m => m.UserRegisterComponent)
      },
      {
        path: 'roles',
        canActivate: [() => inject(AuthService).canAccessRoles() ? true : inject(Router).parseUrl('/perfil')],
        loadComponent: () => import('./features/roles/role-management.component').then(m => m.RoleManagementComponent)
      },
      {
        path: 'reportes',
        canActivate: [() => inject(AuthService).canAccessReports() ? true : inject(Router).parseUrl('/perfil')],
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'configuracion',
        canActivate: [() => inject(AuthService).canAccessConfig() ? true : inject(Router).parseUrl('/dashboard')],
        loadComponent: () => import('./features/config/config.component').then(m => m.ConfigComponent)
      },
      {
        path: 'seguridad/aprobacion-usuarios',
        canActivate: [() => inject(AuthService).canAccessTecnicosApproval() ? true : inject(Router).parseUrl('/dashboard')],
        loadComponent: () => import('./features/admin/aprobacion-tecnicos.component').then(m => m.AprobacionTecnicosComponent)
      },

      // --- MÓDULO ENCUENTROS ---
      {
        path: 'encuentros/reservas',
        canActivate: [() => inject(AuthService).canAccessReservas() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/reservas/reservas-calendario.component').then(m => m.ReservasCalendarioComponent)
      },
      {
        path: 'encuentros/reservas/mias',
        canActivate: [() => inject(AuthService).canAccessReservas() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/reservas/mis-reservas.component').then(m => m.MisReservasComponent)
      },
      {
        path: 'encuentros/reservas/solicitudes',
        canActivate: [() => inject(AuthService).canAccessDashboard() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/reservas/solicitudes-admin.component').then(m => m.SolicitudesAdminComponent)
      },
      {
        path: 'encuentros/reservas/alertas',
        canActivate: [() => inject(AuthService).canAccessDashboard() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/reservas/alertas-semaforo.component').then(m => m.AlertasSemaforoComponent)
      },
      {
        path: 'encuentros/jugadores',
        canActivate: [() => inject(AuthService).canAccessJugadores() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/jugadores/jugadores.component').then(m => m.JugadoresComponent)
      },
      {
        path: 'encuentros/eventos',
        canActivate: [() => inject(AuthService).canAccessEventos() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/eventos/eventos-list.component').then(m => m.EventosListComponent)
      },
      {
        path: 'encuentros/eventos/nuevo',
        canActivate: [() => inject(AuthService).isTecnicoActivo() || inject(AuthService).isSuperAdmin() ? true : inject(Router).parseUrl('/encuentros/eventos')],
        loadComponent: () => import('./features/encuentros/eventos/encuentro-wizard.component').then(m => m.EncuentroWizardComponent)
      },
      {
        path: 'encuentros/eventos/:id',
        canActivate: [() => inject(AuthService).canAccessEventos() ? true : inject(Router).parseUrl('/sin-acceso')],
        loadComponent: () => import('./features/encuentros/eventos/encuentro-detail-manage.component').then(m => m.EncuentroDetailManageComponent)
      },

      {
        path: 'sin-acceso',
        loadComponent: () => import('./features/auth/no-access/no-access.component').then(m => m.NoAccessComponent)
      }
    ]
  },

  // Redirección de compatibilidad para enlaces directos /encuentros/:id hacia /publico/encuentros/:id
  {
    path: 'encuentros/:id',
    redirectTo: 'publico/encuentros/:id'
  },

  {
    path: '**',
    redirectTo: ''
  }
];
