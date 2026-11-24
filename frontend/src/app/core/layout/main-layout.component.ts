import { Component, OnInit, OnDestroy, HostListener, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { EncuentrosService } from '../services/encuentros.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="app-layout" [class.sidebar-collapsed]="isSidebarCollapsed()">
      <!-- BACKDROP PARA MÓVIL / PANTALLAS REDUCIDAS -->
      @if (isMobileOpen()) {
        <div class="sidebar-backdrop" (click)="closeMobileSidebar()"></div>
      }

      <!-- SIDEBAR IZQUIERDO: FUTBOL S.A. -->
      <aside class="app-sidebar" 
             [class.collapsed]="isSidebarCollapsed()" 
             [class.mobile-open]="isMobileOpen()">
        <!-- Logo y Nombre -->
        <div class="sidebar-brand">
          <div class="shield-badge">
            <mat-icon>sports_soccer</mat-icon>
          </div>
          <h2 class="brand-title">FUTBOL S.A.</h2>
          @if (isMobileView()) {
            <button mat-icon-button type="button" class="btn-close-mobile-sidebar" (click)="closeMobileSidebar()" matTooltip="Cerrar menú">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>

        <!-- Menú de Navegación Vertical Condicionado por Rol -->
        <nav class="sidebar-nav">
          <!-- 1. Dashboard: Super Administrador y Administrador -->
          @if (authService.canAccessDashboard()) {
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
              <mat-icon>home</mat-icon>
              <span>Dashboard</span>
            </a>
          }

          <!-- 2. Mi Perfil -->
          @if (authService.canAccessProfile()) {
            <a routerLink="/perfil" routerLinkActive="active" class="nav-item">
              <mat-icon>person</mat-icon>
              <span>Mi Perfil</span>
            </a>
          }

          <!-- 3. Módulo ENCUENTROS: Desplegable con Submenú -->
          @if (authService.canAccessEncuentrosMenu()) {
            <div class="nav-group">
              <button type="button" class="nav-item nav-group-trigger" 
                      [class.child-active]="isEncuentrosRouteActive()" 
                      (click)="toggleEncuentrosMenu()">
                <div style="display: flex; align-items: center; gap: 0.85rem;">
                  <mat-icon>sports</mat-icon>
                  <span>Encuentros</span>
                </div>
                <mat-icon class="chevron-icon" [class.rotated]="isEncuentrosMenuOpen()">
                  expand_more
                </mat-icon>
              </button>

              @if (isEncuentrosMenuOpen()) {
                <div class="submenu-container">
                  <!-- A. Calendario de Reservas -->
                  <a routerLink="/encuentros/reservas" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="subnav-item">
                    <mat-icon>calendar_month</mat-icon>
                    <span>Calendario Canchas</span>
                  </a>

                  <!-- B. Mis Reservas (Técnico / Admin) -->
                  <a routerLink="/encuentros/reservas/mias" routerLinkActive="active" class="subnav-item">
                    <mat-icon>event_available</mat-icon>
                    <span>Mis Reservas</span>
                  </a>

                  <!-- C. Solicitudes de Canchas (Exclusivo Administrador) -->
                  @if (authService.canAccessDashboard()) {
                    <a routerLink="/encuentros/reservas/solicitudes" routerLinkActive="active" class="subnav-item">
                      <mat-icon>rule</mat-icon>
                      <span style="flex: 1;">Solicitudes Canchas</span>
                      @if (conteoReservasPendientes() > 0) {
                        <span class="sidebar-counter-badge">{{ conteoReservasPendientes() }}</span>
                      }
                    </a>

                    <!-- D. Alertas Semáforo -->
                    <a routerLink="/encuentros/reservas/alertas" routerLinkActive="active" class="subnav-item">
                      <mat-icon>traffic</mat-icon>
                      <span>Alertas Semáforo</span>
                    </a>
                  }

                  <!-- E. Plantel de Jugadores -->
                  <a routerLink="/encuentros/jugadores" routerLinkActive="active" class="subnav-item">
                    <mat-icon>groups</mat-icon>
                    <span>Jugadores</span>
                  </a>

                  <!-- F. Eventos / Partidos -->
                  <a routerLink="/encuentros/eventos" routerLinkActive="active" class="subnav-item">
                    <mat-icon>emoji_events</mat-icon>
                    <span>Eventos Deportivos</span>
                  </a>
                </div>
              }
            </div>
          }

          <!-- 4. Seguridad: Módulo desplegable con Submenú -->
          @if (authService.canAccessSecurityMenu()) {
            <div class="nav-group">
              <!-- Botón / Disparador Acordeón Seguridad -->
              <button type="button" class="nav-item nav-group-trigger" 
                      [class.child-active]="isSecurityRouteActive()" 
                      (click)="toggleSecurityMenu()">
                <div style="display: flex; align-items: center; gap: 0.85rem;">
                  <mat-icon>shield</mat-icon>
                  <span>Seguridad</span>
                </div>
                <mat-icon class="chevron-icon" [class.rotated]="isSecurityMenuOpen()">
                  expand_more
                </mat-icon>
              </button>

              <!-- Submenú con las opciones de Seguridad -->
              @if (isSecurityMenuOpen()) {
                <div class="submenu-container">
                  <!-- A. Aprobación de Técnicos (Admin / SuperAdmin) -->
                  @if (authService.canAccessTecnicosApproval()) {
                    <a routerLink="/seguridad/aprobacion-usuarios" routerLinkActive="active" class="subnav-item">
                      <mat-icon>how_to_reg</mat-icon>
                      <span style="flex: 1;">Aprobación Técnicos</span>
                      @if (conteoTecnicosPendientes() > 0) {
                        <span class="sidebar-counter-badge">{{ conteoTecnicosPendientes() }}</span>
                      }
                    </a>
                  }

                  <!-- B. Usuarios: Super Administrador y Administrador -->
                  @if (authService.canAccessUsers()) {
                    <a routerLink="/usuarios" routerLinkActive="active" class="subnav-item">
                      <mat-icon>people</mat-icon>
                      <span>Usuarios</span>
                    </a>
                  }

                  <!-- C. Roles y Permisos: Super Administrador y Administrador -->
                  @if (authService.canAccessRoles()) {
                    <a routerLink="/roles" routerLinkActive="active" class="subnav-item">
                      <mat-icon>security</mat-icon>
                      <span>Roles y Permisos</span>
                    </a>
                  }

                  <!-- D. Reportes: Super Administrador y Administrador -->
                  @if (authService.canAccessReports()) {
                    <a routerLink="/reportes" routerLinkActive="active" class="subnav-item">
                      <mat-icon>bar_chart</mat-icon>
                      <span>Reportes</span>
                    </a>
                  }

                  <!-- E. Configuración: EXCLUSIVO Super Administrador -->
                  @if (authService.canAccessConfig()) {
                    <a routerLink="/configuracion" routerLinkActive="active" class="subnav-item">
                      <mat-icon>settings</mat-icon>
                      <span>Configuración</span>
                    </a>
                  }
                </div>
              }
            </div>
          }

          <!-- Acceso Directo a Landing Pública -->
          <div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.75rem;">
            <a routerLink="/" target="_blank" class="nav-item public-portal-item">
              <mat-icon style="color: #38bdf8;">public</mat-icon>
              <span style="color: #e2e8f0;">Portal Público</span>
              <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-left: auto; color: #94a3b8;">open_in_new</mat-icon>
            </a>
          </div>

          <!-- Usuario Estándar: Ningún acceso a opciones del menú -->
          @if (authService.hasNoMenuAccess()) {
            <div style="padding: 1.5rem 1rem; color: #94a3b8; font-size: 0.85rem; text-align: center; border: 1px dashed rgba(255,255,255,0.18); border-radius: 8px; margin: 1rem 0.75rem; background: rgba(0,0,0,0.15);">
              <mat-icon style="font-size: 28px; width: 28px; height: 28px; margin-bottom: 0.5rem; opacity: 0.7; color: #f87171;">block</mat-icon>
              <div style="font-weight: 600; color: #f1f5f9; margin-bottom: 0.25rem;">Sin Módulos</div>
              <div style="font-size: 0.75rem; line-height: 1.35; color: #cbd5e1;">El perfil <strong>Usuario Estándar</strong> no tiene acceso a las opciones del menú.</div>
            </div>
          }
        </nav>

        <!-- Botón Inferior Cerrar Sesión -->
        <div class="sidebar-footer">
          <button class="logout-btn" (click)="onLogout()">
            <mat-icon>logout</mat-icon>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- ÁREA PRINCIPAL -->
      <div class="app-main-content">
        <!-- TOPBAR SUPERIOR -->
        <header class="app-topbar">
          <div class="topbar-left">
            <button mat-icon-button type="button" 
                    class="btn-toggle-sidebar" 
                    (click)="toggleSidebar()" 
                    [matTooltip]="isSidebarCollapsed() && !isMobileView() ? 'Expandir menú lateral' : 'Contraer menú lateral'" 
                    aria-label="Alternar menú lateral">
              <mat-icon>{{ isSidebarCollapsed() && !isMobileView() ? 'menu' : 'menu_open' }}</mat-icon>
            </button>
          </div>

          <div class="topbar-right" style="display: flex; align-items: center; gap: 1rem;">
            <!-- Selector de Rol para Validación de Accesos RUP -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.8rem; font-weight: 600; color: #64748b;">Rol:</span>
              <button mat-stroked-button [matMenuTriggerFor]="roleMenu" style="border-radius: 20px; height: 32px; font-size: 0.8rem; font-weight: 600; padding: 0 12px; color: #0284c7; border-color: #bae6fd; background: #f0f9ff;">
                <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-right: 4px;">shield</mat-icon>
                <span>{{ activeRoleLabel() }}</span>
                <mat-icon style="font-size: 16px; width: 16px; height: 16px; margin-left: 2px;">arrow_drop_down</mat-icon>
              </button>

              <mat-menu #roleMenu="matMenu">
                <button mat-menu-item (click)="switchRole('SUPER_ADMIN')">
                  <mat-icon style="color: #0284c7;">admin_panel_settings</mat-icon>
                  <span>Super Administrador</span>
                </button>
                <button mat-menu-item (click)="switchRole('ADMIN')">
                  <mat-icon style="color: #0369a1;">manage_accounts</mat-icon>
                  <span>Administrador</span>
                </button>
                <button mat-menu-item (click)="switchRole('TECNICO_ACTIVO')">
                  <mat-icon style="color: #16a34a;">sports</mat-icon>
                  <span>Técnico (Activo)</span>
                </button>
                <button mat-menu-item (click)="switchRole('TECNICO_PENDIENTE')">
                  <mat-icon style="color: #d97706;">hourglass_top</mat-icon>
                  <span>Técnico (Pendiente)</span>
                </button>
                <button mat-menu-item (click)="switchRole('USER')">
                  <mat-icon style="color: #64748b;">person</mat-icon>
                  <span>Usuario (Mi Perfil)</span>
                </button>
                <button mat-menu-item (click)="switchRole('STANDARD')">
                  <mat-icon style="color: #ef4444;">block</mat-icon>
                  <span>Usuario Estándar (Sin acceso)</span>
                </button>
              </mat-menu>
            </div>

            <!-- Perfil del Usuario -->
            <div class="user-pill" [matMenuTriggerFor]="userMenu">
              <div class="avatar-circle">
                @if (userAvatarUrl()) {
                  <img [src]="userAvatarUrl()" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                } @else {
                  {{ userInitials() }}
                }
              </div>
              <span class="user-name">{{ userName() }}</span>
              <mat-icon style="font-size: 18px; width: 18px; height: 18px; color: #64748b;">keyboard_arrow_down</mat-icon>
            </div>

            <mat-menu #userMenu="matMenu">
              @if (authService.canAccessProfile()) {
                <button mat-menu-item routerLink="/perfil">
                  <mat-icon>account_circle</mat-icon>
                  <span>Mi Perfil</span>
                </button>
              }
              <button mat-menu-item (click)="onLogout()">
                <mat-icon color="warn">exit_to_app</mat-icon>
                <span>Cerrar Sesión</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <!-- CONTENIDO DE LAS VISTAS -->
        <main class="app-body">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-counter-badge {
      background: #ef4444;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: 10px;
      margin-left: 0.5rem;
    }

    .public-portal-item:hover {
      background: rgba(56, 189, 248, 0.12) !important;
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  public authService = inject(AuthService);
  private encuentrosService = inject(EncuentrosService);
  private router = inject(Router);

  readonly isSecurityMenuOpen = signal<boolean>(true);
  readonly isEncuentrosMenuOpen = signal<boolean>(true);

  // Control de estado de menú lateral (Desktop y Móvil)
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isMobileOpen = signal<boolean>(false);

  // Señales reactivas sincronizadas en tiempo real desde el servicio
  readonly conteoTecnicosPendientes = this.encuentrosService.conteoTecnicosPendientes;
  readonly conteoReservasPendientes = this.encuentrosService.conteoReservasPendientes;

  private navSub?: Subscription;
  private intervalId?: any;

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.cargarConteos();
      }
    });
  }

  ngOnInit(): void {
    // Restaurar preferencia guardada en Desktop
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true' && !this.isMobileView()) {
        this.isSidebarCollapsed.set(true);
      }
    }

    if (this.authService.isAuthenticated()) {
      this.cargarConteos();
    }

    // Actualizar conteos cada vez que el usuario navega entre pantallas
    this.navSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.authService.isAuthenticated()) {
        this.cargarConteos();
      }
      // En móvil cerrar el menú desplegado al cambiar de ruta
      if (this.isMobileView()) {
        this.isMobileOpen.set(false);
      }
    });

    // Sondeo de respaldo periódico cada 15 segundos
    this.intervalId = setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.cargarConteos();
      }
    }, 15000);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.isMobileView() && this.isMobileOpen()) {
      this.isMobileOpen.set(false);
    }
  }

  isMobileView(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 992;
  }

  toggleSidebar(): void {
    if (this.isMobileView()) {
      this.isMobileOpen.update(v => !v);
    } else {
      this.isSidebarCollapsed.update(v => {
        const next = !v;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('sidebar_collapsed', String(next));
        }
        return next;
      });
    }
  }

  closeMobileSidebar(): void {
    this.isMobileOpen.set(false);
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cargarConteos(): void {
    this.encuentrosService.actualizarConteosMenu();
  }

  toggleSecurityMenu(): void {
    this.isSecurityMenuOpen.update(v => !v);
  }

  toggleEncuentrosMenu(): void {
    this.isEncuentrosMenuOpen.update(v => !v);
  }

  isSecurityRouteActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/usuarios') || 
           url.startsWith('/roles') || 
           url.startsWith('/reportes') || 
           url.startsWith('/configuracion') ||
           url.startsWith('/seguridad');
  }

  isEncuentrosRouteActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/encuentros');
  }

  switchRole(role: 'SUPER_ADMIN' | 'ADMIN' | 'TECNICO_ACTIVO' | 'TECNICO_PENDIENTE' | 'USER' | 'STANDARD'): void {
    this.authService.switchActiveRoleForDemo(role);
    setTimeout(() => this.cargarConteos(), 300);
  }

  activeRoleLabel(): string {
    if (this.authService.isSuperAdmin()) return 'Super Administrador';
    if (this.authService.userRoles().includes('ROLE_ADMIN')) return 'Administrador';
    if (this.authService.isTecnicoActivo()) return 'Técnico (Activo)';
    if (this.authService.isTecnicoPendiente()) return 'Técnico (Pendiente)';
    if (this.authService.isUser()) return 'Usuario';
    if (this.authService.isStandardUser() || this.authService.hasNoMenuAccess()) return 'Usuario Estándar';
    return 'Usuario';
  }

  userName(): string {
    return this.authService.currentUser()?.fullName || 'Usuario';
  }

  userAvatarUrl(): string {
    const url = this.authService.currentUser()?.avatarUrl;
    return this.authService.getAvatarUrl(url);
  }

  userInitials(): string {
    const name = this.userName().trim();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
