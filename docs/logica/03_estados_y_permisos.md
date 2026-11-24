# Fase 3: Máquinas de Estado, Transiciones y Permisos Lógicos

**Módulo:** Ciclo de Vida de Entidades, Transiciones de Estado y Control de Acceso (RBAC)  
**Fecha de Análisis:** 2026-11-24  
**Archivos Fuente Auditados:**
- `com.empresa.seguridad.domain.model.EstadoAprobacion`
- `com.empresa.seguridad.encuentros.domain.model.EstadoReserva`
- `com.empresa.seguridad.encuentros.domain.model.EstadoEncuentro`
- `com.empresa.seguridad.infrastructure.config.SecurityConfig`
- `com.empresa.seguridad.encuentros.application.service.ReservaService`
- `com.empresa.seguridad.encuentros.application.service.EncuentroService`
- `com.empresa.seguridad.encuentros.application.service.JugadorService`
- `com.empresa.seguridad.encuentros.application.service.TecnicoApprovalService`
- `com.empresa.seguridad.encuentros.application.service.EncuentrosScheduledTasks`
- `frontend/src/app/core/services/auth.service.ts`

---

## 1. Catálogo Completo de Estados

El sistema cuenta con tres máquinas de estado discretas codificadas mediante tipos enumerados Java (`enum`) mapeados a cadenas en las tablas relacionales:

### 1.1. `EstadoAprobacion` (Entidad: `User` — Usuarios y Técnicos)
Representa la etapa administrativa de habilitación de una cuenta, especialmente relevante para los Directores Técnicos (`ROLE_TECNICO`).

| Estado | Significado Lógico | Capacidades Operativas |
| :--- | :--- | :--- |
| **`PENDIENTE`** | Registro nuevo de técnico enviado y en espera de revisión por un Administrador. | Solo acceso a lectura de su perfil personal. Bloqueo total para solicitar reservas, crear jugadores u organizar partidos. |
| **`ACTIVO`** | Cuenta aprobada y con plena vigencia operativa. | Habilitación total para solicitar reservas, gestionar su plantel de jugadores y crear/publicar encuentros. |
| **`RECHAZADO`** | Solicitud de técnico desestimada por un administrador con motivo documentado. | Acceso restringido a la vista de perfil donde se le expone el motivo del rechazo. No puede operar. |
| **`SUSPENDIDO`** | Cuenta de técnico temporalmente inhabilitada por decisión administrativa disciplinaria o contractual. | Bloqueo estricto para solicitar reservas, reprogramar o crear convocatorias deportivas. |

---

### 1.2. `EstadoReserva` (Entidad: `Reserva` — Canchas Deportivas)
Gobierna la ocupación del recurso físico y la programación horaria de las canchas.

| Estado | Significado Lógico | Impacto en Disponibilidad y Cruces |
| :--- | :--- | :--- |
| **`PENDIENTE`** | Solicitud ingresada por un Director Técnico (o devuelta a revisión tras reprogramación). | **No bloquea** la disponibilidad pública ni genera bloqueo definitivo en la cancha. Admite solicitudes concurrentes sujetas a aprobación. |
| **`APROBADA`** | Reserva ratificada por un Administrador (o nacida directa de un Admin). | **Bloquea definitivamente** el intervalo de fecha y horas para esa cancha (`findOverlappingApprovedReservations`). Habilita la creación de un encuentro. |
| **`RECHAZADA`** | Solicitud desestimada por un administrador con motivo formal. | El horario queda libre. El técnico debe ingresar una nueva solicitud si desea otra fecha. |
| **`CANCELADA`** | Reserva anulada voluntariamente por el técnico (con $\ge 24\text{ h}$ de anticipación) o forzada por un Administrador. | El horario queda liberado. Desencadena la cancelación en cascada del encuentro asociado si existía. |
| **`VENCIDA`** | Marcada automáticamente por el daemon programado al constatar que la solicitud `PENDIENTE` no fue atendida antes de su hora de inicio. | El registro pasa a histórico inactivo sin afectar la disponibilidad. |
| **`FINALIZADA`** | Marcada automáticamente por el daemon programado tras concluir la hora de fin de una reserva `APROBADA`. | Histórico de partido concluido. |

---

### 1.3. `EstadoEncuentro` (Entidad: `Encuentro` — Convocatorias y Partidos)
Gobierna el flujo de preparación deportiva de los partidos.

| Estado | Significado Lógico | Visibilidad y Restricciones |
| :--- | :--- | :--- |
| **`BORRADOR`** | Encuentro inicial creado sobre una reserva aprobada. | Privado para el técnico. Permite agregar jugadores, configurar equipos y correr el balanceo automático. Oculto en cartelera pública. |
| **`PUBLICADO`** | Encuentro con alineaciones válidas (entre 4 y 8 jugadores por equipo) confirmado por el técnico. | Expuesto en cartelera pública (`/home` y calendario). Solo admite modificación de jugadores hasta 2 horas antes del inicio del juego. |
| **`EN_JUEGO`** | Marcado automáticamente por el daemon cron al coincidir la fecha con hoy y la hora actual entre `horaInicio` y `horaFin`. | Indicador en vivo de partido en disputa. No permite modificaciones de equipos. |
| **`FINALIZADO`** | Partido concluido cronológicamente tras superar la `horaFin` de la reserva. | Histórico deportivo consolidado. |
| **`CANCELADO`** | Encuentro suspendido explícitamente por el técnico o abortado automáticamente por cancelación de la reserva base. | No se disputa; marcado para trazabilidad. |

---

## 2. Matriz de Transiciones de Estado

### 2.1. Matriz de Transiciones: `User` (`EstadoAprobacion`)

| Entidad | Estado Origen | Acción / Evento | Condiciones para Permitir el Cambio | Estado Destino | Efectos Secundarios |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **User** | `[Nuevo]` | `Registro Técnico` | Formulario válido (`registerTecnico`) | `PENDIENTE` | Inserta usuario con rol `ROLE_TECNICO`. Audita `TECNICO_REGISTERED`. |
| **User** | `[Nuevo]` | `Registro Público` | Parámetro `ALLOW_PUBLIC_REGISTRATION == true` | `ACTIVO` | Inserta usuario con rol `ROLE_USER`. Audita `USER_REGISTERED`. |
| **User** | `PENDIENTE` | `Aprobar Técnico` | Rol Admin (`ROLE_ADMIN` o `ROLE_SUPER_ADMIN`) | `ACTIVO` | Setea `aprobadoPor`, `fechaDecision`. Notifica al técnico (`TECNICO_APROBADO`). Audita evento. |
| **User** | `PENDIENTE` | `Rechazar Técnico` | Rol Admin y motivo $\ge 10$ caracteres | `RECHAZADO` | Setea `motivoRechazo`, `fechaDecision`. Notifica motivo al técnico (`TECNICO_RECHAZADO`). |
| **User** | `ACTIVO` | `Suspender Técnico` | Rol Admin | `SUSPENDIDO` | Setea `fechaDecision`. Bloquea nuevas solicitudes del técnico. |
| **User** | `SUSPENDIDO` | `Reactivar Técnico` | Rol Admin | `ACTIVO` | Setea `fechaDecision`. Restablece facultades de reserva. |

---

### 2.2. Matriz de Transiciones: `Reserva` (`EstadoReserva`)

| Entidad | Estado Origen | Acción / Evento | Condiciones para Permitir el Cambio | Estado Destino | Efectos Secundarios |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **Reserva** | `[Nueva]` | `Solicitar (Técnico)` | Técnico `ACTIVO`, horas enteras (1-24h), no pasado | `PENDIENTE` | Genera voucher (si aplica), calcula monto, notifica a los administradores (`NUEVA_RESERVA`). |
| **Reserva** | `[Nueva]` | `Crear Directa (Admin)` | Rol Admin, horas enteras, sin cruces con otra `APROBADA` | `APROBADA` | Bloquea el horario de inmediato. Setea `decididaPor = admin`. |
| **Reserva** | `PENDIENTE` | `Aprobar Reserva` | Rol Admin y sin cruces (`findOverlappingApprovedReservations` vacío) | `APROBADA` | Setea `fechaDecision`, notifica al técnico (`RESERVA_APROBADA`) con enlace a creación de encuentro. |
| **Reserva** | `PENDIENTE` | `Rechazar Reserva` | Rol Admin y motivo no vacío | `RECHAZADA` | Setea `motivoRechazo`, `fechaDecision`, notifica al técnico (`RESERVA_RECHAZADA`). |
| **Reserva** | `PENDIENTE` | `Cancelar Reserva` | Titular de la reserva o Admin | `CANCELADA` | Registra motivo de cancelación. Libera solicitud. |
| **Reserva** | `APROBADA` | `Cancelar Reserva` | Admin (en cualquier momento) o Técnico titular con $\ge 24\text{ h}$ de anticipación (`inicio - ahora >= 24h`) | `CANCELADA` | **Cascada Lógica:** Si tenía un encuentro asociado, cancela automáticamente el encuentro (`EstadoEncuentro.CANCELADO`) y notifica al técnico. Libera la cancha. |
| **Reserva** | `PENDIENTE` | `Reprogramar` | Titular o Admin, sin cruces en nuevo horario | `PENDIENTE` | Recalcula horas y monto total. Si lo hace el técnico, permanece en `PENDIENTE` para nueva aprobación. |
| **Reserva** | `APROBADA` | `Reprogramar` | Titular o Admin, sin cruces en nuevo horario | `PENDIENTE` (Técnico)<br>`APROBADA` (Admin) | Si la reprograma el técnico, revierte de `APROBADA` a `PENDIENTE` exigiendo re-evaluación. |
| **Reserva** | `PENDIENTE` | `Cron Transición Auto` | Hora de inicio ya transcurrida (`fecha < hoy || fecha == hoy && horaInicio < ahora`) | `VENCIDA` | Ejecutado por `EncuentrosScheduledTasks` cada 15 min. Registro pasa a histórico. |
| **Reserva** | `APROBADA` | `Cron Transición Auto` | Hora de fin ya transcurrida (`fecha < hoy || fecha == hoy && horaFin < ahora`) | `FINALIZADA` | Ejecutado por `EncuentrosScheduledTasks` cada 15 min. Consolidado histórico. |

---

### 2.3. Matriz de Transiciones: `Encuentro` (`EstadoEncuentro`)

| Entidad | Estado Origen | Acción / Evento | Condiciones para Permitir el Cambio | Estado Destino | Efectos Secundarios |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **Encuentro** | `[Nuevo]` | `Crear Encuentro` | Reserva titular en estado `APROBADA` y sin encuentro previo | `BORRADOR` | Inserta encuentro vinculado 1:1 a la reserva. |
| **Encuentro** | `BORRADOR` | `Publicar Encuentro` | Reserva vigente, $\ge 2$ equipos, cada equipo con entre 4 y 8 jugadores (`EQUIPO_MIN/MAX_JUGADORES`) | `PUBLICADO` | Setea `publicadoEn = now()`. Se expone inmediatamente en la cartelera pública de partidos confirmados. |
| **Encuentro** | `BORRADOR` | `Cancelar Encuentro` | Técnico titular o Admin | `CANCELADO` | Marca encuentro como suspendido. |
| **Encuentro** | `PUBLICADO` | `Cancelar Encuentro` | Técnico titular o Admin | `CANCELADO` | Retira de cartelera pública. |
| **Encuentro** | `BORRADOR` o `PUBLICADO` | `Cascada por Cancelación de Reserva` | Cancelación de la reserva base asociada | `CANCELADO` | Transición refleja provocada por `ReservaService.cancelarReserva()`. Notifica al técnico titular. |
| **Encuentro** | `PUBLICADO` | `Cron Transición Auto` | `fecha == hoy && horaInicio <= ahora < horaFin` | `EN_JUEGO` | El cron detecta inicio del partido en cancha. Marca partido en disputa. |
| **Encuentro** | `PUBLICADO` o `EN_JUEGO` | `Cron Transición Auto` | `fecha < hoy || (fecha == hoy && ahora >= horaFin)` | `FINALIZADO` | El cron detecta fin del partido. Se consolida el resultado. |

---

## 3. Matriz de Autorización Funcional (RBAC)

El sistema opera bajo un modelo de control de acceso basado en roles canónicos complementado con reglas de propiedad del dato (*Ownership Enforcement*):

| Operación / Endpoint | Rol Requerido (Spring Security) | Condición de Propiedad del Dato | Comportamiento Defensivo ante Incumplimiento |
| :--- | :--- | :--- | :--- |
| **Login / Logout / Refresh** | Público | Ninguna | `BadCredentialsException` (401), Token Replay (Revocación total) |
| **Registro de Técnico** | Público | Ninguna | `IllegalArgumentException` (400) si correo o datos duplicados |
| **Mi Perfil (`GET /me`, `PUT /foto`, `DELETE /foto`)** | Autenticado | Usuario del token | `401 Unauthorized` si token inválido |
| **Cambio de Contraseña Personal** | Autenticado | Usuario del token + Contraseña actual válida | `BadCredentialsException` (401) si contraseña actual incorrecta |
| **Gestión Usuarios (`/api/v1/admin/users/**`)** | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Administrador | `CustomAccessDeniedHandler` $\rightarrow$ 403 Forbidden |
| **Configuración (`/api/v1/admin/config/**`)** | `ROLE_SUPER_ADMIN` | Exclusivo Super Administrador | 403 Forbidden |
| **Fijar Tarifa Cancha (`PUT /canchas/{id}/tarifa`)** | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Administrador | 403 Forbidden |
| **Aprobar / Rechazar Técnicos** | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Administrador | 403 Forbidden |
| **Solicitar Reserva Cancha** | `ROLE_TECNICO`, `ROLE_ADMIN` | Técnico en estado `ACTIVO` (o Admin) | `SecurityException` $\rightarrow$ 403 Forbidden ("Tu cuenta está PENDIENTE...") |
| **Aprobar / Rechazar Reserva** | `ROLE_ADMIN`, `ROLE_SUPER_ADMIN` | Administrador | 403 Forbidden |
| **Cancelar Reserva Propia** | `ROLE_TECNICO`, `ROLE_ADMIN` | Admin libre / Técnico solo su reserva con $\ge 24\text{ h}$ de anticipación | `SecurityException` si ajena; `IllegalStateException` si $< 24\text{ h}$ |
| **Crear / Modificar Jugador** | `ROLE_TECNICO`, `ROLE_ADMIN` | Técnico activo; técnico dueño del jugador | `SecurityException` si se intenta modificar un jugador ajeno |
| **Crear Encuentro** | `ROLE_TECNICO`, `ROLE_ADMIN` | Técnico dueño de la reserva aprobada | `SecurityException` si la reserva pertenece a otro técnico |
| **Editar Alineaciones de Encuentro** | `ROLE_TECNICO`, `ROLE_ADMIN` | Técnico dueño del encuentro + $\ge 2\text{ h}$ antes si está publicado | `IllegalStateException` si falta $< 2\text{ h}$ para el inicio |
| **Publicar Encuentro** | `ROLE_TECNICO`, `ROLE_ADMIN` | Técnico dueño del encuentro + reserva no expirada | `IllegalStateException` si equipos $< 4$ jugadores o reserva expirada |

---

## 4. Transiciones Inválidas y Manejo de Errores

| Entidad | Estado Actual | Intento de Acción | Regla Transgredida | Excepción Disparada | Respuesta HTTP |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **Reserva** | `APROBADA` | Aprobar nuevamente | No está en estado `PENDIENTE` | `IllegalStateException("Solo se pueden aprobar reservas en estado PENDIENTE.")` | 409 Conflict |
| **Reserva** | `RECHAZADA` | Aprobar o Rechazar | No está en estado `PENDIENTE` | `IllegalStateException("Solo se pueden rechazar reservas en estado PENDIENTE.")` | 409 Conflict |
| **Reserva** | `CANCELADA` | Aprobar o Reprogramar | Registro terminal cancelado | `IllegalStateException` | 409 Conflict |
| **Reserva** | `PENDIENTE` | Cancelar con $< 24\text{ h}$ | Parámetro `CANCELACION_HORAS_MIN` | `IllegalStateException("Solo puedes cancelar con al menos 24 horas de anticipación.")` | 409 Conflict |
| **Reserva** | `PENDIENTE` | Aprobar habiendo cruce | Cruce con reserva `APROBADA` | `IllegalStateException("Conflicto de horario: Ya existe una reserva aprobada...")` | 409 Conflict |
| **Encuentro** | `BORRADOR` | Publicar con $< 4$ jugadores | Parámetro `EQUIPO_MIN_JUGADORES` | `IllegalStateException("Cada equipo debe tener entre 4 y 8 jugadores para publicar.")` | 409 Conflict |
| **Encuentro** | `BORRADOR` | Publicar sobre reserva vencida | Reserva expirada en fecha u hora | `IllegalStateException("La reserva ya ha finalizado.")` | 409 Conflict |
| **Encuentro** | `PUBLICADO` | Editar equipos con $< 2\text{ h}$ | Parámetro `EDICION_HORAS_MIN` | `IllegalStateException("Solo se permite editar jugadores hasta 2 horas antes...")` | 409 Conflict |
| **Encuentro** | `BORRADOR` | Asignar jugador duplicado | Regla de unicidad inter-equipos | `IllegalArgumentException("El jugador con ID X está asignado a más de un equipo.")` | 400 Bad Request |
| **Encuentro** | `BORRADOR` | Asignar jugador inactivo | Regla de aptitud física | `IllegalArgumentException("El jugador X está inactivo.")` | 400 Bad Request |
| **Encuentro** | `BORRADOR` | Asignar jugador ajeno | Regla de titularidad de plantel | `SecurityException("El jugador X no pertenece a este técnico.")` | 403 Forbidden |
