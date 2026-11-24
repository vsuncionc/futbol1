# Plan de Despliegue y Manual Técnico Operativo
## Metodología RUP — Fase de Transición (Transition)

**Proyecto:** Plataforma Integral de Gestión Deportiva ("FUTBOL S.A.")  
**Metodología:** RUP (Disciplina de Despliegue y Operaciones)  
**Versión:** 1.0.0  
**Fecha:** 2026-11-24  

---

## 1. Requisitos Previos de Entorno e Infraestructura

Para la puesta en marcha del sistema en servidores locales o ambientes de producción se requieren los siguientes componentes:

### 1.1. Software Base
- **Java Development Kit (JDK):** Versión 17 LTS (Amazon Corretto 17.0.11 o Eclipse Temurin 17).
- **Apache Maven:** Versión 3.9+ configurada en el `PATH` del sistema.
- **Node.js:** Versión 18.x LTS o 20.x LTS.
- **NPM:** Versión 9.x o 10.x (incluido con Node.js).
- **Angular CLI:** Versión 18+ instalada global o localmente en `frontend/node_modules/.bin`.
- **Navegador Web Moderno:** Google Chrome 120+, Microsoft Edge 120+ o Mozilla Firefox 120+.

### 1.2. Puertos y Recursos de Red
- **Puerto 8080 (TCP):** Dedicado para el servidor backend Spring Boot y endpoints de la API REST.
- **Puerto 4200 (TCP):** Dedicado para el servidor de desarrollo Angular o NGINX reverse proxy.
- **Consola H2 Web:** Expuesta bajo la ruta `/h2-console` (activa en perfiles de desarrollo y pruebas).

---

## 2. Configuración del Sistema (`application.yml`)

El archivo de configuración maestro del backend reside en `backend/src/main/resources/application.yml`:

```yaml
server:
  port: 8080
  servlet:
    context-path: /

spring:
  application:
    name: seguridad-auth-module

  servlet:
    multipart:
      enabled: true
      max-file-size: 10MB
      max-request-size: 25MB

  datasource:
    url: jdbc:h2:mem:seguridad_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL
    driver-class-name: org.h2.Driver
    username: sa
    password: ""

  h2:
    console:
      enabled: true
      path: /h2-console
      settings:
        web-allow-others: true

  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
    hibernate:
      ddl-auto: create-drop
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        jdbc:
          batch_size: 50
          order_inserts: true
          order_updates: true

  cache:
    type: caffeine
    cache-names:
      - user_authorities
      - system_config
    caffeine:
      spec: maximumSize=500,expireAfterWrite=30m

# Parámetros de Seguridad y Tokens JWT
application:
  security:
    jwt:
      secret-key: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
      access-token-expiration-ms: 900000        # 15 minutos
      refresh-token-expiration-ms: 604800000    # 7 días
      cookie-name: app_refresh_token
    brute-force:
      max-failed-attempts: 5                    # 5 fallos
      lock-duration-minutes: 15                 # 15 minutos de bloqueo
    rate-limit:
      max-attempts-per-minute: 10               # 10 req/min por IP
```

---

## 3. Procedimiento de Puesta en Marcha (Deployment Guide)

### 3.1. Inicialización del Backend (Spring Boot)
1. Abrir terminal PowerShell o Command Prompt en el directorio `backend`:
   ```powershell
   cd backend
   ```
2. Compilar y verificar empaquetado:
   ```powershell
   mvn clean compile -DskipTests
   ```
3. Ejecutar el servicio en modo desarrollo:
   ```powershell
   mvn spring-boot:run
   ```
4. El servidor estará escuchando en `http://localhost:8080/`. La carga de datos semilla (`DataInitializer`) creará automáticamente los usuarios base, roles, permisos y canchas predefinidas.

### 3.2. Inicialización del Frontend (Angular 18)
1. Abrir una segunda terminal en el directorio `frontend`:
   ```powershell
   cd frontend
   ```
2. Instalar dependencias si es la primera ejecución:
   ```powershell
   npm install
   ```
3. Iniciar el servidor de desarrollo con recarga en caliente:
   ```powershell
   npm start
   # O alternativamente: npx ng serve --port 4200 --open
   ```
4. La aplicación web se abrirá automáticamente en `http://localhost:4200/`.

---

## 4. Cuentas de Acceso y Credenciales Iniciales Semilla

El sistema incluye cuentas iniciales preconfiguradas con diferentes roles para pruebas y operación inmediata:

| Correo Electrónico | Contraseña Inicial | Rol Asignado | Estado Aprobación | Capacidades / Menús Habilitados |
| :--- | :--- | :--- | :---: | :--- |
| `admin@empresa.com` | `Admin$Tr0ng_2026!` | `ROLE_SUPER_ADMIN` | `ACTIVO` | Acceso irrestricto: Dashboard, Mi Perfil, Seguridad (Usuarios, Roles, Reportes, Configuración/Tarifas Canchas), Encuentros (Calendario, Solicitudes, Alertas Semáforo, Jugadores). |
| `tecnico1@empresa.com` | `Tecnico$Tr0ng_2026!` | `ROLE_TECNICO` | `ACTIVO` | Acceso a Mi Perfil, Encuentros (Calendario de Canchas, Mis Reservas, Convocatorias/Eventos, Plantel de Jugadores). |
| `tecnico2@empresa.com` | `Tecnico$Tr0ng_2026!` | `ROLE_TECNICO` | `PENDIENTE` | Acceso limitado a Mi Perfil. Permite probar el flujo de aprobación administrativa desde la cuenta de Super Admin. |
| `user@empresa.com` | `User$Tr0ng_2026!` | `ROLE_USER` | `ACTIVO` | Acceso exclusivo a Mi Perfil personal y exploración de la cartelera pública. |

---

## 5. Gestión del Almacenamiento Físico de Archivos (`uploads/`)

El sistema almacena automáticamente los archivos binarios subidos en una estructura de carpetas normalizada dentro de la raíz del proyecto:

```
futbol1/
└── uploads/
    ├── avatars/        # Fotos de perfil de usuarios (públicas)
    ├── banners/        # Banners publicitarios de encuentros (públicos)
    ├── comprobantes/   # Vouchers de pago de reservas (privados / protegidos)
    └── jugadores/      # Fotos de futbolistas del plantel (públicas)
```

### Reglas de Mantenimiento de Archivos:
- **Respaldo Periódico:** En entornos de producción, el directorio `uploads/` debe incluirse en la política de copias de seguridad incrementales nocturnas.
- **Acceso Directo:** Las carpetas `avatars`, `banners` y `jugadores` se sirven públicamente a través del controlador `PublicoController` (`GET /api/v1/publico/archivos/{folder}/{filename}`).
- **Protección de Vouchers:** La carpeta `comprobantes` no es accesible mediante endpoints públicos anónimos para proteger la privacidad financiera de los técnicos.

---

## 6. Monitoreo, Soporte y Diagnóstico de Incidencias

### 6.1. Consola de Base de Datos H2
- **URL de Acceso:** `http://localhost:8080/h2-console`
- **JDBC URL:** `jdbc:h2:mem:seguridad_db`
- **User Name:** `sa`
- **Password:** *(Vacío)*
- Permite ejecutar consultas SQL interactivas para verificar transacciones, comprobantes o bitácoras forenses.

### 6.2. Matriz de Diagnóstico Rápido de Errores

| Síntoma / Código HTTP | Causa Raíz Probable | Procedimiento de Resolución |
| :--- | :--- | :--- |
| **HTTP 429 Too Many Requests** | La IP excedió 10 peticiones/minuto en endpoints de autenticación. | Esperar 60 segundos para el vaciado del Token Bucket en memoria de `RateLimiterService`. |
| **HTTP 423 Locked** | Cuenta bloqueada tras 5 intentos fallidos consecutivos de login. | Esperar 15 minutos para el desbloqueo automático o ingresar con `admin@empresa.com` a `/usuarios` y hacer clic en el botón de desbloqueo/reseteo administrativo. |
| **HTTP 409 Conflict en Reserva** | Existe una reserva aprobada solapada en ese horario. | Seleccionar otro horario o cancha disponible. Si es administrador, revisar el panel de semáforos para resolver el conflicto. |
| **HTTP 403 Forbidden al Crear Reserva** | La cuenta del técnico está en estado `PENDIENTE` o `SUSPENDIDO`. | Ingresar con `admin@empresa.com` a `/seguridad/aprobacion-tecnicos` y aprobar el expediente del técnico postulante. |
| **Error al Subir Foto / Voucher** | Archivo no soportado o superior a 5 MB. | Verificar que el archivo sea JPG, PNG, WEBP o PDF (comprobantes) y no sobrepase los 5 MB permitidos. |
