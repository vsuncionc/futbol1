# Fase 2: Reglas de Negocio y Validaciones — Módulo de Canchas y Reservas

**Módulo:** Canchas, Reservas y Disponibilidad  
**Paquete Backend:** `com.empresa.seguridad.encuentros`  
**Archivos Fuente Auditados:**
- `com.empresa.seguridad.encuentros.application.service.ReservaService`
- `com.empresa.seguridad.encuentros.application.service.CanchaService`
- `com.empresa.seguridad.encuentros.application.service.ParametroService`
- `com.empresa.seguridad.encuentros.application.service.EncuentrosScheduledTasks`
- `com.empresa.seguridad.encuentros.application.service.FileStorageService`
- `com.empresa.seguridad.encuentros.application.service.NotificacionService`
- `com.empresa.seguridad.encuentros.application.service.AuditoriaEncuentrosService`
- `com.empresa.seguridad.encuentros.domain.repository.ReservaRepository`
- `com.empresa.seguridad.encuentros.domain.repository.CanchaRepository`
- `com.empresa.seguridad.encuentros.infrastructure.web.ReservaController`
- `com.empresa.seguridad.encuentros.infrastructure.web.CanchaController`

---

## 1. Proceso: Solicitud de Reserva de Cancha

### 1.1. Precondiciones
1. La cancha (`canchaId`) debe existir en la base de datos y su campo `activa` debe ser `true`. Si está inactiva, se lanza `IllegalArgumentException("La cancha seleccionada no se encuentra activa")`.
2. El usuario solicitante debe poseer estado de aprobación `ACTIVO`. Si es un técnico en estado `PENDIENTE`, `SUSPENDIDO` o `RECHAZADO`, se bloquea la solicitud:
   - `PENDIENTE` $\rightarrow$ `SecurityException("Tu cuenta se encuentra en estado 'PENDIENTE'. Solo los técnicos aprobados y activos pueden solicitar reservas.")`.
   - `SUSPENDIDO` $\rightarrow$ `SecurityException("Tu cuenta se encuentra en estado 'SUSPENDIDO'. No puedes solicitar reservas.")`.
   - `RECHAZADO` $\rightarrow$ `SecurityException("Tu cuenta se encuentra en estado 'RECHAZADO' por un administrador.")`.
   - *Excepción:* Los usuarios con rol `ROLE_ADMIN` o `ROLE_SUPER_ADMIN` omiten esta restricción.

### 1.2. Validaciones de Entrada
- `fecha`, `horaInicio`, `horaFin`: Campos estrictamente obligatorios (`@NotNull`).
- **Regla RN-RES-01 (Prohibición de Reservas en el Pasado):**
  - Con zona horaria fijada a Lima (`America/Lima`):
    ```java
    fecha.isBefore(hoy) || (fecha.isEqual(hoy) && horaInicio.isBefore(ahora))
    ```
    Si se cumple: lanza `IllegalArgumentException("No se pueden solicitar reservas para fechas u horas en el pasado.")`.
- **Regla RN-RES-02 (Secuencia Horaria):**
  - `horaFin` debe ser estrictamente posterior a `horaInicio` (`!horaFin.isAfter(horaInicio)` $\rightarrow$ `IllegalArgumentException("La hora de fin debe ser posterior a la hora de inicio.")`).
- **Regla RN-RES-03 (Horas Enteras y Duración Válida):**
  - Solo se permiten horas en punto (minutos en `00`), permitiendo como único caso especial las `23:59` para representar el cierre a la medianoche (24:00):
    ```java
    boolean esFinDeDia = (horaFin.getHour() == 23 && horaFin.getMinute() == 59);
    if (horaInicio.getMinute() != 0 || (horaFin.getMinute() != 0 && !esFinDeDia)) {
        throw new IllegalArgumentException("Las reservas solo se permiten en horas enteras (ej. 08:00, 09:00).");
    }
    ```
  - La duración en minutos (ajustando $+1$ minuto en caso de `23:59`) debe ser un múltiplo exacto de 60 minutos y situarse entre los parámetros dinámicos:
    - Mínimo: `RESERVA_DURACION_MIN_H` (por defecto 1 hora).
    - Máximo: `RESERVA_DURACION_MAX_H` (por defecto 24 horas).
    - Error disparado: `IllegalArgumentException("La duración debe ser de horas enteras entre 1 y 24 horas.")`.
- **Regla RN-RES-04 (Comprobante de Pago / Voucher):**
  - Si el parámetro `COMPROBANTE_OBLIGATORIO_TECNICO == true` y quien solicita es un Director Técnico (no Admin): el archivo `comprobante` es obligatorio.
  - Validación de archivo: Máximo 5 MB (`COMPROBANTE_MAX_MB`), formatos aceptados: `image/jpeg`, `image/png`, `application/pdf`.

### 1.3. Reglas de Negocio y Fórmulas de Cálculo
- **Cálculo de Horas:**
  $$\text{horas} = \frac{\text{minutos\_duración}}{60.0}$$
- **Cálculo de Monto Total a Pagar:**
  $$\text{monto} = \text{cancha.tarifaHora} \times \text{horas} \quad (\text{redondeo } \text{HALF\_UP a 2 decimales})$$
- **Determinación del Estado Inicial:**
  - Si el creador es **Administrador** (`ROLE_ADMIN` o `ROLE_SUPER_ADMIN`):
    - El estado inicial es **`APROBADA`**.
    - Se ejecuta de inmediato la validación de solapamiento en BD:
      ```java
      List<Reserva> cruces = reservaRepository.findOverlappingApprovedReservations(
          cancha.getId(), req.fecha(), req.horaInicio(), req.horaFin(), null);
      if (!cruces.isEmpty()) {
          throw new IllegalStateException("Existe un cruce con otra reserva ya aprobada en este horario.");
      }
      ```
    - Se autoasignan `decididaPor = admin` y `fechaDecision = now()`.
  - Si el creador es **Director Técnico**:
    - El estado inicial es **`PENDIENTE`**.
    - No bloquea el horario de forma definitiva, permitiendo solicitudes concurrentes sujetas a aprobación.

### 1.4. Persistencia y Efectos Secundarios
1. Si se adjuntó voucher: se guarda en `uploads/comprobantes/{UUID}.{ext}` vía `FileStorageService`.
2. `INSERT INTO reservas`: Registra cancha_id, tecnico_id, fecha, hora_inicio, hora_fin, monto, estado (`PENDIENTE`/`APROBADA`), comprobante_url, creada_por, creada_en.
3. Si el creador fue un Técnico: se dispara `notificacionService.notificarAdmins()` con tipo `NUEVA_RESERVA`.
4. `INSERT INTO auditoria_encuentros`: Evento `CREAR_RESERVA`.

---

## 2. Proceso: Aprobación de Reservas

*Clase / Método:* `ReservaService.aprobarReserva(Long reservaId, User admin)`

### 2.1. Precondiciones
1. La reserva debe existir en base de datos.
2. El estado actual de la reserva debe ser **`PENDIENTE`**. Si ya fue aprobada, rechazada o cancelada, lanza `IllegalStateException("Solo se pueden aprobar reservas en estado PENDIENTE.")`.
3. El usuario ejecutor debe poseer rol `ROLE_ADMIN` o `ROLE_SUPER_ADMIN`.

### 2.2. Validación Crítica Anti-Cruces (Concurrencia y Consistencia)
- **Consulta JPQL en `ReservaRepository`:**
  ```sql
  SELECT r FROM Reserva r
  WHERE r.cancha.id = :canchaId
    AND r.fecha = :fecha
    AND r.estado = 'APROBADA'
    AND (:excluirId IS NULL OR r.id != :excluirId)
    AND (r.horaInicio < :horaFin AND r.horaFin > :horaInicio)
  ```
- **Condición Lógica:** Dos intervalos $[I_1, F_1)$ y $[I_2, F_2)$ se solapan si y solo si:
  $$I_1 < F_2 \quad \land \quad F_1 > I_2$$
- Si `cruces` contiene al menos un registro:
  - Se aborta la operación lanzando `IllegalStateException("Conflicto de horario: Ya existe una reserva aprobada para la misma cancha en este horario.")`.
  - No se modifica el registro.

### 2.3. Efectos de la Aprobación Exitosa
1. `reserva.estado = EstadoReserva.APROBADA`.
2. `reserva.decididaPor = admin`.
3. `reserva.fechaDecision = LocalDateTime.now(America/Lima)`.
4. `reserva.motivoRechazo = null`.
5. Se envía notificación push interna al Director Técnico titular (`RESERVA_APROBADA`):
   - Mensaje: `"Tu reserva para [Cancha] el [Fecha] ([Inicio] - [Fin]) ha sido aprobada."`
   - Enlace directo a: `/encuentros/eventos/nuevo`.
6. Registro en `auditoria_encuentros` con acción `APROBAR_RESERVA`.

---

## 3. Proceso: Rechazo de Reservas

*Clase / Método:* `ReservaService.rechazarReserva(Long reservaId, String motivo, User admin)`

### 3.1. Validaciones
- La reserva debe estar en estado `PENDIENTE`.
- `motivo`: Obligatorio, no nulo ni vacío (`motivo == null || motivo.trim().isEmpty()` $\rightarrow$ `IllegalArgumentException("El motivo de rechazo es obligatorio.")`).

### 3.2. Efectos
1. `reserva.estado = EstadoReserva.RECHAZADA`.
2. `reserva.motivoRechazo = motivo.trim()`.
3. `reserva.decididaPor = admin`.
4. `reserva.fechaDecision = LocalDateTime.now(America/Lima)`.
5. Notificación al técnico titular (`RESERVA_RECHAZADA`) con el motivo ingresado.
6. Registro de auditoría `RECHAZAR_RESERVA`.

---

## 4. Proceso: Cancelación de Reservas y Cascada Lógica

*Clase / Método:* `ReservaService.cancelarReserva(Long reservaId, String motivo, User usuario)`

### 4.1. Precondiciones y Reglas de Propiedad
- Si el usuario **no es Admin**: debe ser el titular de la reserva (`reserva.tecnico.id == usuario.id`). De lo contrario: `SecurityException("No tienes permiso para cancelar esta reserva.")`.
- La reserva solo puede cancelarse si está en estado `PENDIENTE` o `APROBADA`.

### 4.2. Regla RN-RES-05 (Ventana Mínima de Cancelación para Técnicos):
- Si el usuario es Técnico (no Admin):
  - Se consulta el parámetro `CANCELACION_HORAS_MIN` (por defecto 24 horas).
  - Cálculo temporal:
    $$\Delta t = \text{ChronoUnit.HOURS.between}(\text{ahora}, \text{inicioReserva})$$
  - Si $\Delta t < \text{horasMinimas}$: lanza `IllegalStateException("Solo puedes cancelar con al menos 24 horas de anticipación.")`.

### 4.3. Cascada Lógica sobre Encuentros (Regla RN-RES-06)
- Si la reserva cancelada tenía un encuentro asociado registrado (`encuentroRepository.findByReservaId(reservaId)`):
  - Si el encuentro no estaba `CANCELADO` ni `FINALIZADO`:
    - El encuentro cambia automáticamente a **`EstadoEncuentro.CANCELADO`**.
    - Se envía notificación al técnico: `"El encuentro '[Nombre]' fue cancelado debido a la cancelación de su reserva."`.

---

## 5. Proceso: Reprogramación de Reservas

*Clase / Método:* `ReservaService.reprogramarReserva(Long reservaId, ReprogramarReservaRequest req, User usuario)`

### 5.1. Reglas
1. Valida propiedad de la reserva o rol Administrador.
2. Revalida que la nueva fecha y horas cumplan las reglas de no pasado y horas enteras.
3. Valida ausencia de cruces con otras reservas aprobadas excluyendo la propia reserva (`excluirId = reservaId`).
4. Recalcula monto total en función de la tarifa de la cancha y las nuevas horas.
5. **Reversión de Estado:** Si la reprogramación la ejecuta el Director Técnico, la reserva vuelve automáticamente al estado **`PENDIENTE`** para exigir nueva aprobación administrativa.

---

## 6. Proceso: Motor del Semáforo de Alertas

*Clase / Método:* `ReservaService.getAlertasSemaforo()`

### 6.1. Algoritmo de Categorización
Para cada reserva en estado `PENDIENTE`, calcula:
$$\text{diasRestantes} = \text{ChronoUnit.DAYS.between}(\text{hoy}, \text{r.fecha})$$

| Nivel de Alerta | Condición Lógica | Etiqueta / Texto Mostrado | Acción Sugerida |
| :--- | :--- | :--- | :--- |
| **ROJO (Crítico)** | $\text{diasRestantes} \le \text{ALERTA\_ROJO\_DIAS}$ (por defecto $\le 2$) | $\le 0 \rightarrow$ "Vence hoy"<br>$1 \rightarrow$ "Vence en 1 día"<br>$2 \rightarrow$ "Vence en 2 días" | Prioridad máxima en bandeja de solicitudes |
| **ÁMBAR (Atención)** | $\text{diasRestantes} == \text{ALERTA\_AMBAR\_DIAS}$ (por defecto 3) | "Vence en 3 días" | Revisión preventiva |
| **VERDE (Normal)** | $\text{diasRestantes} > 3$ | "Sin urgencia (X días)" | Visible si `MOSTRAR_SEMAFORO_VERDE == true` |

### 6.2. Detección de Conflicto en Alertas
- Para cada reserva evaluada, el método invoca `tieneCruces(r)`.
- Si existen cruces con reservas ya aprobadas, marca `enConflicto = true`, permitiendo al administrador priorizar la resolución o rechazo del conflicto.

---

## 7. Procesos Batch Automáticos (Scheduled Tasks)

*Clase Responsable:* `EncuentrosScheduledTasks`

### 7.1. Transiciones Automáticas de Estado (Cada 15 minutos)
- **Reservas PENDIENTES Vencidas:**
  - Condición: `fecha < hoy || (fecha == hoy && horaInicio < ahora)`.
  - Transición: `PENDIENTE` $\rightarrow$ **`VENCIDA`**.
- **Reservas APROBADAS Finalizadas:**
  - Condición: `fecha < hoy || (fecha == hoy && horaFin < ahora)`.
  - Transición: `APROBADA` $\rightarrow$ **`FINALIZADA`**.

### 7.2. Notificación Diaria Matutina (Cron: `0 0 8 * * ?` en `America/Lima`)
- A las 08:00 AM hora de Lima, evalúa el resumen de alertas.
- Si `totalRojas > 0`: envía alerta administrativa masiva (`ALERTA_SEMAFORO_ROJO`):
  `"Existen [N] solicitudes de reserva en semáforo ROJO pendientes de revisión."` vinculada a `/encuentros/reservas/alertas`.
