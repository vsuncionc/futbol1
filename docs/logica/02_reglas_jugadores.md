# Fase 2: Reglas de Negocio y Validaciones — Módulo de Jugadores y Plantel

**Módulo:** Jugadores, Plantel y Calificación de Estrellas  
**Paquete Backend:** `com.empresa.seguridad.encuentros`  
**Archivos Fuente Auditados:**
- `com.empresa.seguridad.encuentros.application.service.JugadorService`
- `com.empresa.seguridad.encuentros.application.service.FileStorageService`
- `com.empresa.seguridad.encuentros.application.service.AuditoriaEncuentrosService`
- `com.empresa.seguridad.encuentros.domain.model.Jugador`
- `com.empresa.seguridad.encuentros.domain.model.JugadorHistorialEstrellas`
- `com.empresa.seguridad.encuentros.domain.repository.JugadorRepository`
- `com.empresa.seguridad.encuentros.domain.repository.JugadorHistorialEstrellasRepository`
- `com.empresa.seguridad.encuentros.infrastructure.web.JugadorController`

---

## 1. Proceso: Alta de Jugadores en el Plantel

### 1.1. Precondiciones
1. El usuario solicitante debe ser un Director Técnico con estado `ACTIVO` o un Administrador (`ROLE_ADMIN`, `ROLE_SUPER_ADMIN`). Si el técnico está en estado `PENDIENTE`, `SUSPENDIDO` o `RECHAZADO`, se deniega el registro mediante `SecurityException`.
2. El técnico es el propietario del registro de sus jugadores (asociación estricta a `tecnico_id`).

### 1.2. Validaciones de Entrada
- `nombre`: Obligatorio (`@NotBlank`). Se aplica sanitización con `.trim()`.
- `estrellas`: Número entero en el rango cerrado $[1, 5]$. Si `req.estrellas() < 1 || req.estrellas() > 5`, se rechaza con `IllegalArgumentException("Las estrellas deben estar entre 1 y 5.")`.
- `apodo`: Opcional; si está presente se sanea con `.trim()`.
- `posicion`: Opcional; se normaliza a minúsculas (`.toLowerCase()`). Valores típicos esperados: `delantero`, `mediocampista`, `defensa`, `arquero`.
- `foto`: Opcional. Si se adjunta archivo, se valida mediante `FileStorageService.storeFotoJugador`:
  - Formatos admitidos: `image/jpeg`, `image/png`, `image/webp`.
  - Tamaño máximo: 5 MB (`ALLOWED_IMAGE_TYPES`, 5 MB).
  - Si el formato no coincide, lanza `IllegalArgumentException("Formato no permitido para Foto del jugador")`.

### 1.3. Reglas de Negocio
- **Regla RN-JUG-01 (Advertencia de Homónimos):**
  - Si el técnico ya posee un jugador registrado con el mismo nombre (insensible a mayúsculas/minúsculas):
    ```java
    if (jugadorRepository.existsByTecnicoIdAndNombreIgnoreCase(tecnico.getId(), req.nombre().trim())) {
        log.warn("El técnico {} ya tiene registrado un jugador con el nombre: {}", tecnico.getEmail(), req.nombre());
    }
    ```
  - La lógica no bloquea la creación (permite homónimos reales), pero emite advertencia de trazabilidad.
- **Regla RN-JUG-02 (Estado Inicial y Miniatura):**
  - Todo jugador se crea con `activo = true` por defecto.
  - La URL de la foto y la miniatura (`fotoUrl`, `fotoMiniaturaUrl`) apuntan a la ruta relativa `jugadores/{UUID}.{ext}`, servida públicamente para facilitar el renderizado de tarjetas y alineaciones.

### 1.4. Persistencia y Efectos Secundarios
1. `INSERT INTO jugadores`: id, tecnico_id, nombre, apodo, posicion, foto_url, foto_miniatura_url, estrellas, activo, creado_en.
2. `INSERT INTO auditoria_encuentros`: Evento `CREAR_JUGADOR`.

---

## 2. Proceso: Modificación de Jugador y Auditoría de Estrellas

*Método:* `JugadorService.actualizarJugador(Long id, JugadorCreateRequest req, MultipartFile foto, User usuario)`

### 2.1. Reglas de Propiedad
- Un Director Técnico solo puede modificar a los jugadores de su propio plantel (`jugador.tecnico.id == usuario.id`).
- Un Administrador puede modificar jugadores de cualquier técnico.
- Si no se cumple: lanza `SecurityException("No tienes permiso para gestionar este jugador.")`.

### 2.2. Regla RN-JUG-03 (Historial Inmutable de Calificación de Estrellas):
- Cuando el valor de estrellas nuevo difiere del registrado en la base de datos (`jugador.getEstrellas() != req.estrellas()`):
  1. Se construye un registro inmutable en `JugadorHistorialEstrellas`:
     - `jugador`: Referencia a la entidad.
     - `estrellasAnterior`: Calificación previa ($1 \dots 5$).
     - `estrellasNueva`: Nueva calificación ($1 \dots 5$).
     - `cambiadoPor`: Usuario responsable del cambio (Técnico o Admin).
     - `cambiadoEn`: Marca temporal exacta (`LocalDateTime.now()`).
  2. Se persiste en la tabla `jugador_historial_estrellas`.
  3. Se actualiza el atributo `jugador.estrellas = req.estrellas()`.
- Este mecanismo previene manipulaciones arbitrarias del balanceo de partidos al auditar cualquier alteración de nivel deportivo.

### 2.3. Actualización de Foto
- Si se envía un nuevo archivo de foto válido, se almacena el nuevo archivo físico en `uploads/jugadores/` y se actualizan los punteros `fotoUrl` y `fotoMiniaturaUrl`.

---

## 3. Proceso: Baja Lógica de Jugadores

*Método:* `JugadorService.eliminarJugador(Long id, User usuario)`

### 3.1. Regla RN-JUG-04 (Baja Lógica vs Destrucción Física)
- El sistema **nunca ejecuta un `DELETE` físico en la tabla `jugadores`**:
  ```java
  jugador.setActivo(false);
  jugadorRepository.save(jugador);
  ```
- **Justificación de Negocio:** Preservar la integridad histórica de todos los encuentros, estadísticas, planillas y alineaciones pasadas en las que haya participado el jugador (`equipo_jugadores`).
- Un jugador con `activo == false` queda excluido de la selección para nuevos encuentros y no puede asignarse en balanceos.
