# Fase 2: Reglas de Negocio y Validaciones — Módulo de Seguridad y Autenticación (IAM)

**Módulo:** Seguridad, Autenticación y Control de Acceso  
**Paquete Backend:** `com.empresa.seguridad`  
**Archivos Fuente Auditados:**
- `com.empresa.seguridad.application.service.AuthService`
- `com.empresa.seguridad.application.service.UserService`
- `com.empresa.seguridad.application.service.RefreshTokenService`
- `com.empresa.seguridad.application.service.RateLimiterService`
- `com.empresa.seguridad.application.service.AuditService`
- `com.empresa.seguridad.encuentros.application.service.TecnicoApprovalService`
- `com.empresa.seguridad.infrastructure.security.JwtService`
- `com.empresa.seguridad.infrastructure.web.AuthController`
- `com.empresa.seguridad.infrastructure.web.UserProfileController`
- `com.empresa.seguridad.infrastructure.web.AdminUserController`

---

## 1. Proceso: Inicio de Sesión (Login) y Emisión Dual-Token

### 1.1. Precondiciones
1. La dirección IP de origen no debe haber excedido la cuota del limitador de tasa (`RateLimiterService`): máximo 10 peticiones por minuto.
2. La cuenta de usuario debe existir en `users` y `enabled` debe ser `true`.
3. La cuenta no debe estar en periodo de bloqueo temporal (`account_non_locked = false` y `lock_time + 15 min > now`).

### 1.2. Validaciones de Entrada
- `email`: Obligatorio (`@NotBlank`), formato de correo electrónico estándar RFC 5322 (`@Email`). Se normaliza con `.toLowerCase().trim()`.
- `password`: Obligatoria (`@NotBlank`).

### 1.3. Reglas de Negocio y Flujo de Decisión
- **Regla RN-SEC-01 (Bloqueo Temporal por Intentos):**
  - Si `account_non_locked == false` y han transcurrido más de 15 minutos desde `lock_time`: el sistema ejecuta un desbloqueo automático en caliente (`accountNonLocked = true`, `failedLoginAttempts = 0`, `lockTime = null`).
  - Si han transcurrido menos de 15 minutos: se rechaza la petición lanzando `LockedException("La cuenta se encuentra temporalmente bloqueada por motivos de seguridad. Intente más tarde.")` y se audita `LOGIN_BLOCKED`.
- **Regla RN-SEC-02 (Verificación Criptográfica y Acumulación de Fallos):**
  - Validación mediante `authenticationManager.authenticate()` contrastando contraseña plana contra el hash BCrypt (factor de costo 12).
  - Ante fallo (`BadCredentialsException`):
    - Se incrementa `user.failedLoginAttempts` en 1.
    - Si `failedLoginAttempts >= 5`: se asigna `user.accountNonLocked = false` y `user.lockTime = LocalDateTime.now()`.
    - Se registra auditoría inmutable `LOGIN_FAILED`.
    - Se lanza `BadCredentialsException("Credenciales de acceso inválidas.")` (mensaje genérico que no revela si el error fue el correo o la contraseña).
- **Regla RN-SEC-03 (Generación de Tokens Duales):**
  - Si las credenciales son válidas, `failedLoginAttempts` se reinicia a `0` y `lockTime` se limpia.
  - Se genera un **Access Token JWT**:
    - Tiempo de vida: 15 minutos (900,000 ms).
    - Claims incluidos: `sub` (email), `userId`, `roles` (códigos `ROLE_*`), `permissions` (códigos de permiso granular).
  - Se genera un **Refresh Token Rotativo**:
    - Almacenado en tabla `refresh_tokens`.
    - Hash SHA-256 persistido en base de datos; token en claro emitido exclusivamente como cookie HTTP:
      - Nombre: `app_refresh_token`
      - Atributos: `HttpOnly = true`, `Secure = true`, `SameSite = "Strict"`, `Path = "/api/v1/auth"`.
      - Expiración: 7 días (604,800,000 ms).

### 1.4. Persistencia y Efectos Secundarios
1. `UPDATE users`: Actualiza `failed_login_attempts`, `account_non_locked`, `lock_time`.
2. `INSERT INTO refresh_tokens`: Registra id, user_id, token_hash, expires_at, ip_address, user_agent, created_at.
3. `INSERT INTO audit_logs`: Evento `LOGIN_SUCCESS` con IP, User-Agent y timestamp.
4. `Set-Cookie`: Cabecera HTTP enviada al cliente con la cookie segura.

### 1.5. Manejo de Excepciones y Rollback
- `LockedException` $\rightarrow$ HTTP 423 Locked.
- `BadCredentialsException` $\rightarrow$ HTTP 401 Unauthorized.
- `RateLimiterService` devuelve `false` $\rightarrow$ HTTP 429 Too Many Requests.
- La transacción `@Transactional` asegura que la actualización del contador de fallos se confirme independientemente del fallo de autenticación de Spring Security.

---

## 2. Proceso: Rotación y Detección de Robo de Refresh Tokens

### 2.1. Precondiciones
- Presencia de la cookie `app_refresh_token` en la petición entrante.

### 2.2. Validaciones de Entrada
- El token en claro extraído de la cookie no debe ser nulo ni estar en blanco.

### 2.3. Reglas de Negocio
- **Regla RN-SEC-04 (Detección de Reutilización / Token Replay Attack):**
  - Si el token presentado ya fue marcado como revocado (`revoked = true`) o ya fue reemplazado (`replaced_by_token != null`):
    - Se asume compromiso de sesión (robo del token).
    - Efecto defensivo inmediato: el sistema revoca **todos los tokens activos de ese usuario** (`revokeAllUserTokens`).
    - Lanza `SecurityException("Detección de reutilización de refresh token. Todas las sesiones han sido revocadas.")`.
- **Regla RN-SEC-05 (Expiración de Refresh Token):**
  - Si `expires_at < LocalDateTime.now()`: lanza `BadCredentialsException("El refresh token ha expirado.")`.
- **Regla RN-SEC-06 (Rotación Uno a Uno):**
  - El token entrante se marca como `revoked = true` y se enlaza con el ID del nuevo token generado.
  - Se genera un nuevo par de Access Token (15 min) y Refresh Token (7 días).

### 2.4. Persistencia
1. `UPDATE refresh_tokens`: Marca el token anterior como revocado.
2. `INSERT INTO refresh_tokens`: Inserta el nuevo token rotativo.
3. `Set-Cookie`: Reemplaza la cookie en la respuesta HTTP.

---

## 3. Proceso: Registro de Usuarios (Público vs Directores Técnicos)

### 3.1. Registro Público de Usuarios (`ROLE_USER`)
- **Precondición:** Parámetro dinámico en BD `system_configurations` con clave `ALLOW_PUBLIC_REGISTRATION == "true"`.
- **Validaciones:**
  - `fullName`: Entre 3 y 120 caracteres.
  - `email`: Formato válido, no duplicado en `users`.
  - `password`: Entre 8 y 64 caracteres, expresión regular: al menos 1 dígito, 1 minúscula, 1 mayúscula, 1 carácter especial (`[@#$%^&+=!._-]`).
- **Reglas:**
  - Si `ALLOW_PUBLIC_REGISTRATION == false`: lanza `IllegalStateException("El registro público de usuarios se encuentra deshabilitado por el administrador.")`.
  - Si el correo ya existe: lanza `IllegalArgumentException("No es posible completar el registro con los datos suministrados.")` (mensaje defensivo).
  - Estado asignado: `enabled = true`, `accountNonLocked = true`, `estadoAprobacion = ACTIVO`.
  - Rol asignado: `ROLE_USER`.

### 3.2. Registro de Directores Técnicos (`ROLE_TECNICO`)
- **Precondiciones:** Ninguna (formulario público especializado).
- **Validaciones:**
  - `nombres` y `apellidos`: Obligatorios. `fullName` = `nombres + " " + apellidos`.
  - `telefono`: Obligatorio (`@NotBlank`).
  - `email`: Formato válido y no registrado previamente en `users`.
  - `password` y `confirmPassword`: Coincidencia obligatoria (`!password.equals(confirmPassword)` $\rightarrow$ `IllegalArgumentException("Las contraseñas no coinciden")`).
  - Contraseña: Mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula, 1 dígito (`^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$`).
- **Reglas de Negocio:**
  - Se asigna automáticamente el rol `ROLE_TECNICO`.
  - **Estado de Aprobación Inicial:** `estadoAprobacion = EstadoAprobacion.PENDIENTE`.
  - El técnico **no puede crear reservas ni registrar jugadores** hasta que un Administrador apruebe su expediente.
- **Efectos:**
  - `INSERT INTO users`: Registra al técnico con estado `PENDIENTE`.
  - `INSERT INTO audit_logs`: Evento `TECNICO_REGISTERED`.

---

## 4. Proceso: Flujo de Aprobación Administrativa de Técnicos

*Clase Responsable:* `TecnicoApprovalService`

### 4.1. Aprobación (`aprobarTecnico`)
- **Precondición:** Usuario autenticado debe ser Administrador (`ROLE_ADMIN` o `ROLE_SUPER_ADMIN`).
- **Efecto:**
  - `user.estadoAprobacion = EstadoAprobacion.ACTIVO`
  - `user.aprobadoPor = admin.getId()`
  - `user.fechaDecision = LocalDateTime.now()`
  - `user.motivoRechazo = null`
  - Notificación interna generada (`TECNICO_APROBADO`): "¡Felicidades! Tu cuenta de Técnico ha sido aprobada...".
  - Auditoría registrada en `auditoria_encuentros`: "TECNICO_APROBADO".

### 4.2. Rechazo (`rechazarTecnico`)
- **Precondición:** Motivo de rechazo obligatorio con longitud $\ge 10$ caracteres. Si no se cumple, lanza `IllegalArgumentException("El motivo de rechazo es obligatorio y debe tener al menos 10 caracteres")`.
- **Efecto:**
  - `user.estadoAprobacion = EstadoAprobacion.RECHAZADO`
  - `user.motivoRechazo = motivo.trim()`
  - `user.fechaDecision = LocalDateTime.now()`
  - Notificación al usuario: "Tu solicitud de cuenta de Técnico ha sido rechazada. Motivo: ...".

### 4.3. Suspensión y Reactivación
- `suspenderTecnico`: Asigna `EstadoAprobacion.SUSPENDIDO`. Impide solicitar nuevas reservas o crear encuentros.
- `reactivarTecnico`: Asigna `EstadoAprobacion.ACTIVO`.

---

## 5. Proceso: Recuperación y Reseteo de Contraseñas

### 5.1. Solicitud de Enlace de Recuperación (`forgotPassword`)
- **Regla RN-SEC-07 (Protección Timing-Safe / Anti-Enumeración):**
  - Si el correo existe: crea registro en `password_reset_tokens` (validez de 15 minutos mediante `UUID.randomUUID().toString()`) y envía correo asíncrono con `emailService.sendPasswordResetEmail()`.
  - Si el correo **NO existe**: el sistema ejecuta deliberadamente un cálculo dummy de BCrypt:
    ```java
    passwordEncoder.matches("dummy_pass_123456", "$2a$12$e8Y57zMh6lD2Z9fU2G2CGeZpYIkg.E5f71K6JkYgI/K7K8z8kEhyq");
    ```
    Esto garantiza que el tiempo de respuesta HTTP sea idéntico en ambos casos, impidiendo que atacantes deduzcan qué correos están registrados.

### 5.2. Ejecución de Reseteo (`resetPassword`)
- **Validaciones:**
  - Token existente en `password_reset_tokens`, con `used == false` y `expires_at > LocalDateTime.now()`.
  - Nueva contraseña cumple política de complejidad.
- **Efectos:**
  - Actualiza hash BCrypt en `users`.
  - Actualiza `password_changed_at = LocalDateTime.now()`.
  - Desbloquea la cuenta (`account_non_locked = true`, `failed_login_attempts = 0`).
  - Marca el token como usado (`used = true`).
  - **Revocación de Sesiones:** Ejecuta `refreshTokenService.revokeAllUserTokens(user)`, desconectando cualquier sesión previa en todos los dispositivos.

---

## 6. Proceso: Foto de Perfil

*Clase Responsable:* `UserService`, `FileStorageService`, `UserProfileController`

### 6.1. Subida de Foto (`updateProfilePhoto`)
- **Validaciones:**
  - Archivo no nulo y no vacío.
  - Tamaño $\le 5\text{ MB}$ ($5 \times 1024 \times 1024$ bytes).
  - Tipos MIME permitidos: `image/jpeg`, `image/png`, `image/webp`.
- **Efectos:**
  - Guarda archivo en `uploads/avatars/{UUID}.{ext}`.
  - Actualiza `users.avatar_url = "/api/v1/publico/archivos/avatars/{UUID}.{ext}"`.
  - Retorna `UserSummaryDto` con la nueva URL para refresco de UI inmediata.

### 6.2. Eliminación de Foto (`removeProfilePhoto`)
- Establece `users.avatar_url = null`.
- Retorna el perfil actualizado; el frontend conmuta automáticamente a iniciales de texto.
