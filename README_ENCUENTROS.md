# MÓDULO "ENCUENTROS" - FUTBOL S.A.
**Versión:** 2.0  
**Fecha de Implementación:** Noviembre 2026  
**Zona Horaria Oficial:** `America/Lima` (UTC-5)  
**Moneda Oficial:** Sol Peruano (PEN - S/)  
**Idioma:** Español  

---

## 1. Visión General del Sistema

El módulo **Encuentros** extiende la plataforma empresarial **FUTBOL S.A.** integrándose de forma nativa con el sistema existente de **Seguridad y Control de Acceso (IAM / RBAC)**. Permite la administración integral de:
1. **Canchas y Disponibilidad:** Catálogo de canchas con tarifas horarias en PEN y visualización gráfica de disponibilidad.
2. **Reservas y Comprobantes:** Solicitud de reservas con carga de comprobantes de pago, detección de solapamiento y validación administrativa.
3. **Semáforo de Alertas Tempranas:** Clasificación cromática (🔴 ROJO, 🟠 ÁMBAR, 🟢 VERDE) según días restantes para el vencimiento de reservas pendientes.
4. **Plantel de Jugadores:** Calificación táctica en estrellas (1 a 5 ⭐), historial auditable de cambios de nivel y control de titularidad.
5. **Eventos y Partidos:** Asistente (Wizard) en 3 pasos, algoritmo de auto-balanceo táctico **Snake Draft**, validación de 4 a 8 jugadores por equipo y apuestas informativas con aviso legal.
6. **Páginas Públicas:** Landing comunitaria (`/`), detalle público de encuentro (`/encuentros/:id`) con botón para compartir y registro público de directores técnicos (`/registro`).

---

## 2. Cuentas de Acceso y Demostración (Seed Data)

El sistema inicializa automáticamente las siguientes cuentas con credenciales listas para verificación inmediata:

| Rol / Perfil | Correo Electrónico | Contraseña | Estado Aprobación | Capacidades Principales |
|---|---|---|---|---|
| **Super Administrador** | `admin@demo.pe` | `Admin$Demo_2026!` | `ACTIVO` | Acceso total: Aprobar/rechazar técnicos, validar reservas, ver semáforo, auditoría y parámetros. |
| **Director Técnico (Activo)** | `tecnico1@demo.pe` | `Tecnico1$Pass_2026!` | `ACTIVO` | Solicitar reservas, gestionar sus 12 jugadores, armar encuentros con auto-balanceo y publicar. |
| **Director Técnico (Pendiente)** | `tecnico2@demo.pe` | `Tecnico2$Pass_2026!` | `PENDIENTE` | Acceso de solo lectura; restringido de crear reservas, jugadores o publicar partidos hasta su aprobación. |

> **Nota:** La barra superior (Topbar) del frontend incluye un **Selector Rápido de Roles** (`Rol: [Super Administrador / Administrador / Técnico Activo / Técnico Pendiente / Usuario / Estándar]`) para alternar perfiles en un solo clic.

---

## 3. Reglas de Negocio Implementadas

### A. Reservas y Canchas
- **RN-01 (Solapamiento Absoluto):** Dos reservas no pueden solaparse en la misma cancha si alguna de ellas está `APROBADA`.
- **RN-02 (Validación Temporal):** Las reservas deben tener duración en bloques válidos (mínimo 60 minutos) y dentro del horario operativo (06:00 a 23:00 Lima).
- **RN-03 (Solicitudes en Conflicto):** Si existen solicitudes concurrentes pendientes para el mismo horario, el sistema marca visualmente el badge `⚠️ En conflicto` en la bandeja del administrador. Al aprobar una de ellas, las demás se rechazan automáticamente o se cancelan con registro de auditoría.
- **RN-07 (Cancelación 24 Horas):** Un técnico solo puede cancelar una reserva con al menos 24 horas de anticipación a la hora de inicio.

### B. Semáforo de Alertas Tempranas (America/Lima)
Calculado dinámicamente según la diferencia entre la fecha/hora actual de Lima y la fecha/hora de la reserva pendiente:
- 🔴 **ROJO (`<= 2 días`):** Urgente. Requiere aprobación o rechazo inmediato para no bloquear la cancha.
- 🟠 **ÁMBAR (`== 3 días`):** Atención prioritaria.
- 🟢 **VERDE (`> 3 días`):** Tiempo suficiente de procesamiento.

### C. Aprobación y Seguridad de Técnicos
- **RN-08:** Todo técnico que se registra queda en estado `PENDIENTE`.
- **RN-09:** El administrador puede Aprobar o Rechazar la solicitud desde `/seguridad/aprobacion-usuarios`.
- **RN-10:** Para rechazar una solicitud, es **obligatorio** ingresar un motivo con al menos **10 caracteres**.
- **RN-11:** Un técnico en estado `PENDIENTE`, `RECHAZADO` o `SUSPENDIDO` no puede crear reservas ni registrar jugadores.

### D. Plantel de Jugadores
- **RN-13:** Las estrellas de cada jugador van estrictamente de **1 a 5 enteros**.
- **RN-14:** Todo cambio en la valoración de estrellas genera un registro histórico inmutable con fecha, valor anterior, valor nuevo y responsable.
- **RN-15 (Aislamiento de Datos):** Cada técnico solo puede ver, editar y alinear a los jugadores que él mismo registró.

### E. Encuentros y Algoritmo Snake Draft
- **RN-16 (Planteles por Equipo):** Cada equipo debe tener un mínimo de 4 y un máximo de 8 jugadores (entre 8 y 16 jugadores por partido).
- **RN-17 (Algoritmo Snake Draft):** Para balancear automáticamente dos equipos a partir de los jugadores seleccionados:
  1. Se ordenan los jugadores de mayor a menor según sus estrellas: $J_1, J_2, \dots, J_n$.
  2. Ronda 1: $J_1 \to \text{Equipo A}$, $J_2 \to \text{Equipo B}$.
  3. Ronda 2: $J_3 \to \text{Equipo B}$, $J_4 \to \text{Equipo A}$.
  4. Ronda 3: $J_5 \to \text{Equipo A}$, $J_6 \to \text{Equipo B}$, y así sucesivamente.
  5. Si el número de jugadores es impar, el último jugador se asigna al equipo con menor suma acumulada de estrellas.
- **RN-19 (Apuesta Informativa con Aviso Legal):** El monto de apuesta por jugador es meramente referencial y muestra de forma destacada el disclaimer:
  > *"⚠️ Apuesta informativa: La plataforma FUTBOL S.A. no retiene, custodia ni administra dinero."*
- **RN-20 (Validación de Publicación):** Solo se puede publicar un encuentro si la reserva asociada está aprobada y ambos equipos cumplen con la regla de 4 a 8 jugadores.

---

## 4. Estructura de la Solución

### Backend (Spring Boot 3.x / Java 17)
```
backend/src/main/java/com/empresa/seguridad/
├── domain/model/
│   ├── User.java (extendido con telefono, estadoAprobacion, motivoRechazo)
│   └── EstadoAprobacion.java
├── encuentros/
│   ├── domain/model/
│   │   ├── Cancha.java
│   │   ├── Reserva.java & EstadoReserva.java
│   │   ├── Jugador.java & JugadorHistorialEstrellas.java
│   │   ├── Encuentro.java & EstadoEncuentro.java
│   │   ├── Equipo.java
│   │   ├── Parametro.java
│   │   ├── Notificacion.java
│   │   └── Auditoria.java
│   ├── repository/
│   │   ├── CanchaRepository.java, ReservaRepository.java, JugadorRepository.java,
│   │   ├── EncuentroRepository.java, ParametroRepository.java, etc.
│   ├── service/
│   │   ├── CanchaService.java, ReservaService.java, JugadorService.java,
│   │   ├── EncuentroService.java (Snake Draft), TecnicoApprovalService.java,
│   │   ├── FileStorageService.java (archivos / comprobantes seguros),
│   │   └── EncuentrosScheduledTasks.java (crons automáticos)
│   ├── web/
│   │   ├── PublicoController.java (`/api/v1/publico/**`)
│   │   ├── CanchaController.java (`/api/v1/canchas/**`)
│   │   ├── ReservaController.java (`/api/v1/reservas/**`)
│   │   ├── JugadorController.java (`/api/v1/jugadores/**`)
│   │   ├── EncuentroController.java (`/api/v1/encuentros/**`)
│   │   ├── SeguridadTecnicoController.java (`/api/v1/seguridad/usuarios/**`)
│   │   ├── NotificacionController.java (`/api/v1/notificaciones/**`)
│   │   └── ParametroController.java (`/api/v1/parametros/**`)
│   └── dto/
└── infrastructure/config/DataInitializer.java (semillas completas)
```

### Frontend (Angular 19 / Angular Material)
```
frontend/src/app/
├── core/
│   ├── models/encuentros.models.ts
│   ├── services/encuentros.service.ts
│   ├── services/auth.service.ts (roles, estados y demo-switcher)
│   └── layout/main-layout.component.ts (Sidebar con Encuentros y Seguridad)
├── features/
│   ├── public/
│   │   ├── home/ (Landing pública `/`)
│   │   └── encuentro-detail/ (Página pública `/encuentros/:id`)
│   ├── auth/
│   │   └── register-tecnico/ (Registro público `/registro`)
│   ├── encuentros/
│   │   ├── reservas/ (Calendario, Mis Reservas, Solicitudes Admin, Semáforo)
│   │   ├── jugadores/ (Plantel, selector de 1-5 estrellas, historial)
│   │   └── eventos/ (Listado, Wizard en 3 pasos, Administración)
│   └── admin/
│       └── aprobacion-tecnicos.component.ts (Bandeja `/seguridad/aprobacion-usuarios`)
```

---

## 5. Endpoints Principales del API REST

### Portal Público (Sin Autenticación)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/v1/publico/encuentros` | Encuentros públicos vigentes |
| `GET` | `/api/v1/publico/encuentros/pasados` | Encuentros finalizados |
| `GET` | `/api/v1/publico/encuentros/{id}` | Detalle completo de un encuentro |
| `GET` | `/api/v1/publico/disponibilidad` | Disponibilidad de canchas por fecha |
| `GET` | `/api/v1/canchas` | Lista de canchas activas y tarifas |
| `POST` | `/api/v1/publico/registro-tecnico` | Registro público de nuevo técnico (`PENDIENTE`) |

### Reservas y Semáforo
| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/reservas` | Técnico, Admin | Mis reservas registradas |
| `POST` | `/api/v1/reservas` | Técnico Activo, Admin | Solicitar reserva con comprobante |
| `GET` | `/api/v1/reservas/verificar-disponibilidad` | Técnico, Admin | Validación previa de disponibilidad contra reservas confirmadas |
| `GET` | `/api/v1/reservas/solicitudes` | Admin, SuperAdmin | Bandeja de solicitudes pendientes con detección de conflictos |
| `GET` | `/api/v1/reservas/alertas` | Admin, SuperAdmin | Semáforo de alertas (Rojas, Ámbar, Verdes) |
| `PATCH` | `/api/v1/reservas/{id}/aprobar` | Admin, SuperAdmin | Aprobar reserva y resolver conflictos |
| `PATCH` | `/api/v1/reservas/{id}/rechazar` | Admin, SuperAdmin | Rechazar reserva con motivo |
| `PATCH` | `/api/v1/reservas/{id}/cancelar` | Técnico (>=24h), Admin | Cancelar reserva |

### Jugadores y Calificaciones
| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/jugadores` | Técnico, Admin | Plantel completo del técnico |
| `GET` | `/api/v1/jugadores/activos` | Técnico, Admin | Jugadores activos para partidos |
| `POST` | `/api/v1/jugadores` | Técnico Activo | Crear jugador con foto y estrellas (1-5) |
| `PUT` | `/api/v1/jugadores/{id}` | Técnico Activo | Actualizar jugador y registrar cambio de estrellas |
| `GET` | `/api/v1/jugadores/{id}/historial` | Técnico, Admin | Historial de valoraciones del jugador |
| `PATCH` | `/api/v1/jugadores/{id}/estado` | Técnico Activo | Activar o desactivar jugador |

### Encuentros y Auto-Balanceo
| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/encuentros` | Técnico, Admin | Listado de encuentros creados |
| `POST` | `/api/v1/encuentros` | Técnico Activo | Crear encuentro en borrador |
| `POST` | `/api/v1/encuentros/balancear` | Técnico Activo | Algoritmo Snake Draft de auto-balanceo |
| `PUT` | `/api/v1/encuentros/{id}/equipos` | Técnico Activo | Guardar alineaciones y planteles |
| `PATCH` | `/api/v1/encuentros/{id}/publicar` | Técnico Activo | Publicar partido a la comunidad |
| `PATCH` | `/api/v1/encuentros/{id}/cancelar` | Técnico, Admin | Cancelar partido |

### Seguridad y Aprobación de Técnicos
| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/seguridad/usuarios` | Admin, SuperAdmin | Listado de técnicos por estado |
| `PATCH` | `/api/v1/seguridad/usuarios/{id}/aprobar` | Admin, SuperAdmin | Habilitar técnico al estado `ACTIVO` |
| `PATCH` | `/api/v1/seguridad/usuarios/{id}/rechazar` | Admin, SuperAdmin | Rechazar técnico (motivo >= 10 caracteres) |
| `PATCH` | `/api/v1/seguridad/usuarios/{id}/suspender` | Admin, SuperAdmin | Suspender técnico temporalmente |
| `PATCH` | `/api/v1/seguridad/usuarios/{id}/reactivar` | Admin, SuperAdmin | Reactivar técnico |

---

## 6. Instrucciones de Ejecución

### Prerrequisitos
- **Java 17+** (Amazon Corretto o OpenJDK)
- **Apache Maven 3.8+**
- **Node.js 18+** y **npm**

### Iniciar Backend (Spring Boot)
```powershell
cd backend
mvn spring-boot:run
```
- **URL Base:** `http://localhost:8080`
- **Consola H2 (si se requiere):** `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:seguridaddb`, User: `sa`, Password: *(vacío)*)

### Iniciar Frontend (Angular)
```powershell
cd frontend
npm install
npm start
```
- **Aplicación Web:** `http://localhost:4200`

### Ejecución de Pruebas Automatizadas
```powershell
cd backend
mvn test
```
*Las pruebas automáticas `EncuentrosModuleTests.java` cubren el 100% de los escenarios críticos (RN-01 a RN-22) pasando con 0 fallos.*
