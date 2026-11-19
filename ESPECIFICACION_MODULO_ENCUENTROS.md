# ESPECIFICACIÓN TÉCNICA Y FUNCIONAL: MÓDULO "ENCUENTROS"

> **Documento destinado a un agente de desarrollo (Antigravity).**
> Objetivo: generar el módulo completo (base de datos, backend, frontend, permisos, validaciones y datos de prueba) a partir de este documento.
> Versión 2.0 · Zona horaria **America/Lima (UTC-5)** · Moneda **PEN (S/)** · Idioma de la interfaz: **español**.

---

## 0. INSTRUCCIONES PARA EL AGENTE

1. **Detecta primero el stack del proyecto existente** (lenguaje, framework, ORM, librería de UI, sistema de autenticación) y **respétalo**. Si el proyecto ya tiene un módulo de **Seguridad** (usuarios, roles, permisos), **intégrate a él** en lugar de crear uno paralelo. Si no existe stack, propón uno y justifícalo en un archivo `DECISIONES.md`.
2. Implementa **en el orden de la sección 17 (Plan de implementación)**. Al terminar cada fase, ejecuta las pruebas de la sección 16.
3. **Toda autorización se valida en el backend.** Ocultar botones en el frontend no es suficiente.
4. Todo texto visible al usuario va en **español**. Los nombres de tablas, campos y código van en **español snake_case** para BD y el estilo normal del lenguaje para el código, de forma consistente con lo que ya exista.
5. No inventes reglas de negocio. Si encuentras una ambigüedad, impleméntala como **parámetro configurable** (sección 14) y documéntala.
6. Entregables esperados: migraciones, modelos/entidades, servicios, controladores/endpoints, vistas/pantallas, validaciones, semillas (seeds) con datos de ejemplo, pruebas automatizadas y un `README_ENCUENTROS.md` con instrucciones de ejecución.

---

## 1. RESUMEN DEL MÓDULO

El módulo **Encuentros** permite:

- Que cualquier persona **vea** los encuentros publicados y la **disponibilidad** de canchas, sin poder reservar.
- Que una persona se **registre** y quede con perfil **Técnico en estado "Pendiente de aprobación"**; el **Admin** la aprueba desde el **módulo de Seguridad**.
- Que el **Técnico aprobado** inicie sesión y **solicite reservas** de canchas adjuntando el **comprobante de pago**; el **Admin** revisa y **aprueba o rechaza**.
- Que el Técnico **registre jugadores** (nombre, foto, estrellas) y **cree encuentros** sobre reservas aprobadas, con equipos, banner y **apuesta opcional (solo informativa)**.
- Que el Admin gestione un **calendario** de canchas y vea una **sección de alertas con semáforo** de reservas por vencer.

---

## 2. DECISIONES DE NEGOCIO CONFIRMADAS

| # | Decisión |
|---|---|
| D1 | La **apuesta es solo informativa**: la plataforma **no administra, retiene ni liquida dinero** de apuestas. Se muestra un aviso en pantalla. |
| D2 | **Pago de la reserva:** el técnico **adjunta un archivo de comprobante** al solicitar. El **Admin revisa el comprobante** y **aprueba o rechaza** la reserva. |
| D3 | Un **técnico puede tener varios encuentros** (uno por cada reserva aprobada suya). |
| D4 | Cada equipo debe tener **mínimo 4 y máximo 8 jugadores**. |
| D5 | Los **usuarios no técnicos (incluidos visitantes) pueden ver los encuentros publicados**. |
| D6 | **Toda solicitud de reserva del técnico requiere aprobación del Admin** (no hay aprobación automática). |
| D7 | **No existe plazo de pago**, pero hay una **sección de Alertas con semáforo**: **ROJO** = reservas por vencer en **2 días o menos**; **ÁMBAR** = por vencer en **3 días**. |
| D8 | En la **página principal pública** se muestran los encuentros. Para **realizar reservas o crear encuentros** la persona debe **registrarse**; el registro crea un usuario con **perfil Técnico en estado Pendiente**. |
| D9 | El **Admin aprueba (o rechaza) al nuevo usuario técnico** desde una **bandeja en el módulo de Seguridad**. Hasta ser aprobado, el usuario no puede reservar ni crear encuentros. |

### 2.1 Supuestos adoptados (confirmar o ajustar; todos son configurables)

| # | Supuesto | Cómo se maneja |
|---|---|---|
| S1 | "Vence" en las alertas significa **la fecha de la reserva solicitada se acerca sin haber sido aprobada** (estado *Pendiente*). Los días restantes = `fecha_reserva − hoy` (Lima). | Parámetros `ALERTA_ROJO_DIAS=2`, `ALERTA_AMBAR_DIAS=3`. |
| S2 | Una reserva *Pendiente* cuya fecha/hora ya pasó pasa automáticamente a estado **Vencida**. | Tarea programada (job) cada 15 min. |
| S3 | **Una reserva tiene como máximo un encuentro.** Un técnico tiene varios encuentros porque tiene varias reservas. | Parámetro `ENCUENTROS_POR_RESERVA_MAX=1`. |
| S4 | El comprobante es **obligatorio** cuando solicita el técnico y **opcional** cuando el Admin crea la reserva. | Parámetro `COMPROBANTE_OBLIGATORIO_TECNICO=true`. |
| S5 | La **cancelación/reprogramación** es permitida hasta X horas antes del inicio. | Parámetro `CANCELACION_HORAS_MIN=24`. |
| S6 | El **balance de equipos** por estrellas es informativo (no bloquea). | — |

---

## 3. ROLES Y PERMISOS

### 3.1 Roles

- **Visitante**: sin sesión.
- **Técnico**: usuario registrado con perfil técnico. Estados de cuenta: `PENDIENTE`, `ACTIVO`, `RECHAZADO`, `SUSPENDIDO`. **Solo `ACTIVO` puede operar.**
- **Admin**: administrador del sistema.

> Un usuario registrado y **no aprobado** (`PENDIENTE`) puede iniciar sesión solo para ver un mensaje "Tu cuenta está pendiente de aprobación" y puede ver contenido público; **no** puede ejecutar acciones de escritura del módulo.

### 3.2 Matriz de permisos

| Acción | Visitante | Técnico PENDIENTE | Técnico ACTIVO | Admin |
|---|:--:|:--:|:--:|:--:|
| Ver página principal con encuentros publicados | ✔ | ✔ | ✔ | ✔ |
| Ver detalle de encuentro publicado | ✔ | ✔ | ✔ | ✔ |
| Ver disponibilidad de canchas (solo lectura, anónima) | ✔ | ✔ | ✔ | ✔ |
| Registrarse | ✔ | — | — | — |
| Solicitar reserva (con comprobante) | ✘ | ✘ | ✔ | ✔ (crea directo) |
| Ver y cancelar **sus** reservas | ✘ | ✘ | ✔ | ✔ (todas) |
| Crear reserva y asignarla a un técnico | ✘ | ✘ | ✘ | ✔ |
| Aprobar / rechazar solicitudes de reserva | ✘ | ✘ | ✘ | ✔ |
| Calendario administrativo completo | ✘ | ✘ | ✘ | ✔ |
| Sección de Alertas (semáforo) | ✘ | ✘ | ✘ | ✔ |
| CRUD de **sus** jugadores | ✘ | ✘ | ✔ | ✔ (todos) |
| Crear / editar / publicar **sus** encuentros | ✘ | ✘ | ✔ | ✔ (todos) |
| Aprobar / rechazar / suspender usuarios técnicos (Seguridad) | ✘ | ✘ | ✘ | ✔ |
| Administrar canchas y parámetros | ✘ | ✘ | ✘ | ✔ |

**Regla de propiedad:** un técnico solo puede leer/modificar registros donde `tecnico_id = su id`. Probar explícitamente acceso a recursos ajenos (debe responder 403/404).

---

## 4. ESTRUCTURA DEL MENÚ

```
Encuentros
 ├── Reservas      (calendario, mis reservas, solicitudes [admin], alertas [admin])
 ├── Jugadores     (lista, alta, edición)
 └── Eventos       (lista de encuentros, creación, detalle)

Seguridad  (módulo existente o nuevo)
 └── Aprobación de usuarios   (bandeja de técnicos pendientes)  [solo Admin]
```

Visibilidad del menú:
- **Visitante / público**: página principal con encuentros + calendario de disponibilidad (solo lectura). Botones "Registrarse" / "Iniciar sesión".
- **Técnico ACTIVO**: Encuentros > Reservas, Jugadores, Eventos.
- **Admin**: todo lo anterior más Alertas, Solicitudes pendientes (con contador) y Seguridad > Aprobación de usuarios (con contador).

---

## 5. PÁGINA PRINCIPAL PÚBLICA

Ruta: `/` (o la raíz pública existente).

Contenido:
1. **Encabezado** con logo, botones *Iniciar sesión* y *Registrarse* (si no hay sesión), o nombre de usuario y menú (si hay sesión).
2. **Sección "Próximos encuentros"**: tarjetas con **banner**, nombre, fecha, hora, cancha, equipos (nombres), estrellas totales por equipo y, si existe, **monto de apuesta** con la etiqueta "Apuesta informativa".
3. **Sección "Disponibilidad de canchas"**: calendario de solo lectura con bloques *Libre / Ocupado* (sin datos del técnico).
4. **Llamado a la acción**: "¿Quieres organizar un encuentro? Regístrate como técnico" → `/registro`.
5. Cada tarjeta lleva a `/encuentros/{id}` (detalle público: banner, equipos, jugadores con foto y estrellas, horario, cancha).
6. Filtros: por fecha, por cancha. Paginación o carga progresiva.
7. Solo se listan encuentros en estado **PUBLICADO** o **EN_JUEGO** (y opcionalmente **FINALIZADO** en una pestaña "Pasados").

Si un visitante pulsa "Reservar" o "Crear encuentro": redirigir a login/registro con mensaje "Debes registrarte como técnico para reservar".

---

## 6. REGISTRO Y APROBACIÓN DE USUARIOS TÉCNICOS

### 6.1 Registro (`/registro`)

Campos: nombres*, apellidos*, correo* (único), teléfono*, contraseña* (mín. 8, mayúscula, minúscula, número), confirmación*, aceptación de términos*.

Flujo:
1. El usuario completa el formulario.
2. El sistema crea el usuario con **rol = TÉCNICO** y **estado = PENDIENTE**.
3. Mensaje: "Registro exitoso. Tu cuenta será revisada por un administrador. Te avisaremos por correo."
4. Se genera una **notificación al Admin** y se incrementa el contador de la bandeja en Seguridad.

### 6.2 Bandeja de aprobación (Seguridad > Aprobación de usuarios)

Tabla: nombre, correo, teléfono, fecha de registro, estado. Acciones por fila:
- **Aprobar** → estado `ACTIVO`, se registra `aprobado_por` y `fecha_decision`, se notifica al usuario.
- **Rechazar** → pide **motivo obligatorio** (mín. 10 caracteres) → estado `RECHAZADO`, se notifica con el motivo.
- **Suspender / Reactivar** para usuarios ya activos.
- Filtros por estado y búsqueda por nombre/correo.

---

## 7. SUBMÓDULO RESERVAS

### 7.1 Funcionalidades

**Públicas (solo lectura)**
- Calendario de disponibilidad por cancha: bloques *Libre/Ocupado*. Filtros por cancha y tipo.

**Técnico ACTIVO**
- **Solicitar reserva**: cancha, fecha, hora inicio, hora fin, **comprobante de pago (archivo)**. Monto calculado automáticamente = `tarifa_hora × horas`.
- **Mis reservas**: lista con filtros por estado y fecha; ver motivo de rechazo; cancelar según regla; adjuntar o reemplazar comprobante mientras esté *Pendiente*.

**Admin**
- **Calendario administrativo** (mes / semana / día) con código de color por estado y filtros (cancha, técnico, estado). Clic en espacio libre → crear reserva con datos precargados. Clic en bloque → detalle y acciones.
- **Bandeja de solicitudes**: lista de reservas *Pendiente* con visor del comprobante (imagen/PDF en modal). Acciones **Aprobar** y **Rechazar** (motivo obligatorio).
- **Crear reserva** directamente y **asignarla a un técnico** (queda **Aprobada**).
- **Alertas con semáforo** (sección 8).
- Editar, cancelar y reprogramar cualquier reserva.

### 7.2 Estados de la reserva

`PENDIENTE` → `APROBADA` → `FINALIZADA`
`PENDIENTE` → `RECHAZADA`
`PENDIENTE` → `VENCIDA` (automático si la fecha/hora pasa sin decisión)
`PENDIENTE | APROBADA` → `CANCELADA`

Transiciones válidas únicamente las listadas. Cualquier otra debe devolver error 409.

### 7.3 Datos de la reserva

cancha, fecha, hora_inicio, hora_fin, monto (S/), técnico responsable, estado, comprobante (archivo), motivo_rechazo, quién la creó, quién decidió y cuándo.

### 7.4 Reglas

- **RN-01** No puede haber dos reservas **APROBADAS** que se crucen en la misma cancha. Validar en servicio **y** con restricción en BD (índice de exclusión).
- **RN-02** Al **aprobar**, revalidar cruces dentro de una transacción con bloqueo.
- **RN-03** Al aprobar una reserva, las demás *Pendientes* que se crucen con ella quedan **marcadas "En conflicto"** en la bandeja (campo calculado) para que el Admin las rechace con motivo "Horario ocupado". **No** se rechazan automáticamente.
- **RN-04** No se permiten reservas en el pasado.
- **RN-05** Duración mínima y máxima configurables (por defecto 1 h a 3 h); bloques en múltiplos de 30 min.
- **RN-06** Una solicitud del técnico **siempre** nace *Pendiente*. La reserva creada por el Admin nace *Aprobada*.
- **RN-07** El técnico solo puede cancelar si faltan al menos `CANCELACION_HORAS_MIN` horas. El Admin puede siempre.
- **RN-08** Al cancelar una reserva, el encuentro asociado (si existe) pasa a **CANCELADO** y se notifica.
- **RN-09** Comprobante: JPG, PNG o PDF, máximo 5 MB.

---

## 8. SECCIÓN DE ALERTAS (SEMÁFORO) — SOLO ADMIN

Ruta sugerida: `Encuentros > Reservas > Alertas`, y un **widget resumen** en el panel del Admin.

**Qué se evalúa:** reservas en estado **PENDIENTE** (ver supuesto S1).

**Cálculo:** `dias_restantes = fecha_reserva − fecha_actual (Lima)` en días calendario.

| Color | Condición | Texto de la etiqueta |
|---|---|---|
| 🔴 **ROJO** | `dias_restantes <= 2` (incluye hoy y mañana) | "Vence en X día(s)" / "Vence hoy" |
| 🟠 **ÁMBAR** | `dias_restantes == 3` | "Vence en 3 días" |
| 🟢 **VERDE** (opcional, desactivable) | `dias_restantes > 3` | "Sin urgencia" |

Los umbrales vienen de parámetros (`ALERTA_ROJO_DIAS`, `ALERTA_AMBAR_DIAS`).

**Pantalla:**
- Tarjetas resumen arriba: cantidad en rojo, ámbar y verde (clic filtra).
- Tabla ordenada por `dias_restantes` ascendente: semáforo (círculo de color + texto, **no depender solo del color** por accesibilidad), técnico, cancha, fecha, horario, monto, botón **Ver comprobante**, botones **Aprobar / Rechazar**.
- Actualización automática al cargar y cada 5 minutos (o por consulta manual con botón "Actualizar").
- Contador de rojas visible como **badge** en el menú.

**Endpoint:** `GET /api/reservas/alertas` devuelve cada reserva con `dias_restantes` y `semaforo` (`ROJO|AMBAR|VERDE`).

---

## 9. SUBMÓDULO JUGADORES

### 9.1 Funcionalidades (Técnico ACTIVO; el Admin ve y edita todos)

- Listado en tarjetas/tabla: foto, nombre, estrellas, posición, estado. Búsqueda por nombre y filtro por estrellas.
- **Alta**: nombre*, apodo, posición (portero, defensa, medio, delantero; opcional), **estrellas 1–5***, **foto***, activo.
- **Edición**. Si cambian las estrellas se guarda historial.
- **Desactivar/Activar**. Un jugador que ya participó en un encuentro **no se elimina físicamente**.
- Un técnico solo ve **sus** jugadores.

### 9.2 Reglas

- **RN-10** Estrellas entre 1 y 5 (entero).
- **RN-11** Foto: JPG, PNG o WebP, máx. 2 MB; recorte cuadrado y miniatura (200×200).
- **RN-12** Advertir (no bloquear) si el técnico ya tiene un jugador con el mismo nombre.

---

## 10. SUBMÓDULO EVENTOS (ENCUENTROS)

### 10.1 Funcionalidades

- **Lista** de encuentros (técnico: los suyos; Admin: todos) con filtros por estado y fecha.
- **Asistente de creación en 3 pasos:**
  1. **Reserva y datos**: elegir **reserva APROBADA, futura y sin encuentro** del técnico; nombre del encuentro*; **banner*** (JPG/PNG/WebP, máx. 3 MB, relación 16:9 con recorte); **monto de apuesta (opcional)**.
  2. **Equipos y jugadores**: crear 2 o más equipos (nombre, color); asignar jugadores activos del técnico; ver suma y promedio de estrellas por equipo; botón **Balancear automáticamente**.
  3. **Resumen y publicación**: vista previa del banner/tarjeta; *Guardar borrador* o *Publicar*.
- **Detalle público** (para todos): banner, nombre, fecha, hora, cancha, equipos con jugadores (foto y estrellas), apuesta informativa.
- **Editar** en Borrador; en Publicado solo se permiten cambios de jugadores hasta `EDICION_HORAS_MIN` horas antes (configurable, por defecto 2 h).
- **Cancelar** encuentro.
- Un técnico puede tener **varios encuentros** (uno por reserva aprobada).

### 10.2 Estados del encuentro

`BORRADOR` → `PUBLICADO` → `EN_JUEGO` → `FINALIZADO`
`BORRADOR | PUBLICADO` → `CANCELADO` (también automático si la reserva se cancela)

`EN_JUEGO` y `FINALIZADO` se actualizan automáticamente por la hora de la reserva (job programado).

### 10.3 Reglas

- **RN-13** Solo se crea encuentro desde una reserva **APROBADA**.
- **RN-14** Una reserva tiene como máximo **un** encuentro.
- **RN-15** Mínimo **2 equipos**.
- **RN-16** Cada equipo debe tener **entre 4 y 8 jugadores** (validar al **publicar**; en Borrador se permite incompleto pero se muestra advertencia). Máximo 8 se valida siempre.
- **RN-17** Un jugador no puede estar en dos equipos del mismo encuentro.
- **RN-18** Solo jugadores **activos** y **propios** del técnico.
- **RN-19** Apuesta opcional: si se informa, debe ser > 0, máximo 2 decimales. Siempre se muestra con la etiqueta "Apuesta informativa: la plataforma no administra dinero".
- **RN-20** Para **publicar**: ≥2 equipos válidos, banner cargado, reserva vigente y aprobada.
- **RN-21** Fecha, hora y cancha del encuentro se heredan de la reserva y **no se editan** desde el encuentro.
- **RN-22** Balance: se muestra suma y promedio de estrellas por equipo; la diferencia es informativa.

### 10.3.1 Algoritmo de balanceo automático

Entrada: lista de jugadores seleccionados con estrellas, N equipos. Ordenar por estrellas descendente y repartir con estrategia *snake draft* (A,B,B,A,A,B…) respetando el máximo de 8 por equipo; luego intentar intercambios que reduzcan la diferencia de estrellas totales. Mostrar el resultado como **sugerencia editable**.

---

## 11. MODELO DE DATOS (PostgreSQL de referencia; adaptar al ORM del proyecto)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Usuarios técnicos: si ya existe tabla de usuarios, AGREGAR estos campos en lugar de crear una nueva.
-- usuario: id, nombres, apellidos, correo (único), telefono, password_hash, rol ('ADMIN'|'TECNICO'),
--          estado ('PENDIENTE'|'ACTIVO'|'RECHAZADO'|'SUSPENDIDO'), motivo_rechazo, aprobado_por, fecha_decision, creado_en

CREATE TABLE cancha (
  id              BIGSERIAL PRIMARY KEY,
  nombre          VARCHAR(80)  NOT NULL UNIQUE,
  tipo            VARCHAR(20)  NOT NULL,          -- 'F5','F7','F11', etc.
  tarifa_hora     NUMERIC(10,2) NOT NULL CHECK (tarifa_hora >= 0),
  activa          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE reserva (
  id               BIGSERIAL PRIMARY KEY,
  cancha_id        BIGINT NOT NULL REFERENCES cancha(id),
  tecnico_id       BIGINT NOT NULL REFERENCES usuario(id),
  fecha            DATE   NOT NULL,
  hora_inicio      TIME   NOT NULL,
  hora_fin         TIME   NOT NULL,
  monto            NUMERIC(10,2) NOT NULL CHECK (monto >= 0),
  estado           VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE'
                   CHECK (estado IN ('PENDIENTE','APROBADA','RECHAZADA','CANCELADA','VENCIDA','FINALIZADA')),
  comprobante_url  TEXT,
  comprobante_tipo VARCHAR(20),
  motivo_rechazo   TEXT,
  motivo_cancelacion TEXT,
  creada_por       BIGINT NOT NULL REFERENCES usuario(id),
  decidida_por     BIGINT REFERENCES usuario(id),
  fecha_decision   TIMESTAMPTZ,
  creada_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  rango            TSRANGE GENERATED ALWAYS AS (tsrange(fecha + hora_inicio, fecha + hora_fin)) STORED,
  CHECK (hora_fin > hora_inicio)
);
-- Garantiza RN-01: sin cruces entre reservas APROBADAS de la misma cancha
ALTER TABLE reserva ADD CONSTRAINT reserva_sin_cruce
  EXCLUDE USING gist (cancha_id WITH =, rango WITH &&) WHERE (estado = 'APROBADA');
CREATE INDEX idx_reserva_estado_fecha ON reserva (estado, fecha);
CREATE INDEX idx_reserva_tecnico ON reserva (tecnico_id);

CREATE TABLE bloqueo_horario (            -- opcional (mantenimiento)
  id BIGSERIAL PRIMARY KEY,
  cancha_id BIGINT NOT NULL REFERENCES cancha(id),
  inicio TIMESTAMP NOT NULL, fin TIMESTAMP NOT NULL, motivo TEXT,
  CHECK (fin > inicio)
);

CREATE TABLE jugador (
  id            BIGSERIAL PRIMARY KEY,
  tecnico_id    BIGINT NOT NULL REFERENCES usuario(id),
  nombre        VARCHAR(100) NOT NULL,
  apodo         VARCHAR(50),
  posicion      VARCHAR(20),
  foto_url      TEXT NOT NULL,
  foto_miniatura_url TEXT,
  estrellas     SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jugador_tecnico ON jugador (tecnico_id);

CREATE TABLE jugador_historial_estrellas (
  id BIGSERIAL PRIMARY KEY,
  jugador_id BIGINT NOT NULL REFERENCES jugador(id),
  estrellas_anterior SMALLINT NOT NULL, estrellas_nueva SMALLINT NOT NULL,
  cambiado_por BIGINT NOT NULL REFERENCES usuario(id),
  cambiado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE encuentro (
  id             BIGSERIAL PRIMARY KEY,
  reserva_id     BIGINT NOT NULL UNIQUE REFERENCES reserva(id),   -- RN-14
  tecnico_id     BIGINT NOT NULL REFERENCES usuario(id),
  nombre         VARCHAR(120) NOT NULL,
  banner_url     TEXT,
  apuesta_monto  NUMERIC(10,2) CHECK (apuesta_monto IS NULL OR apuesta_monto > 0),
  estado         VARCHAR(12) NOT NULL DEFAULT 'BORRADOR'
                 CHECK (estado IN ('BORRADOR','PUBLICADO','EN_JUEGO','FINALIZADO','CANCELADO')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado_en   TIMESTAMPTZ
);
CREATE INDEX idx_encuentro_estado ON encuentro (estado);

CREATE TABLE equipo (
  id           BIGSERIAL PRIMARY KEY,
  encuentro_id BIGINT NOT NULL REFERENCES encuentro(id) ON DELETE CASCADE,
  nombre       VARCHAR(60) NOT NULL,
  color        VARCHAR(7)
);

CREATE TABLE equipo_jugador (
  equipo_id    BIGINT NOT NULL REFERENCES equipo(id) ON DELETE CASCADE,
  jugador_id   BIGINT NOT NULL REFERENCES jugador(id),
  encuentro_id BIGINT NOT NULL REFERENCES encuentro(id) ON DELETE CASCADE,
  PRIMARY KEY (equipo_id, jugador_id),
  UNIQUE (encuentro_id, jugador_id)                                -- RN-17
);

CREATE TABLE notificacion (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id),
  tipo VARCHAR(40) NOT NULL, titulo VARCHAR(150) NOT NULL, mensaje TEXT,
  enlace TEXT, leida BOOLEAN NOT NULL DEFAULT FALSE,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auditoria (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT REFERENCES usuario(id),
  entidad VARCHAR(40) NOT NULL, entidad_id BIGINT NOT NULL,
  accion VARCHAR(40) NOT NULL, detalle JSONB,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE parametro (
  clave VARCHAR(60) PRIMARY KEY, valor VARCHAR(200) NOT NULL, descripcion TEXT
);
```

**Validaciones de equipo (4–8):** el máximo de 8 se valida al agregar un jugador; el mínimo de 4 al **publicar**. Implementar en el servicio (no solo en BD).

---

## 12. API REST (rutas sugeridas; adaptar al framework)

Todas las respuestas de error con formato `{ "codigo": "...", "mensaje": "..." }` y códigos HTTP correctos (400, 401, 403, 404, 409, 422).

### Públicas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/publico/encuentros` | Encuentros PUBLICADO/EN_JUEGO (paginado, filtros fecha/cancha) |
| GET | `/api/publico/encuentros/{id}` | Detalle público con equipos y jugadores |
| GET | `/api/publico/disponibilidad?cancha=&desde=&hasta=` | Bloques Libre/Ocupado sin datos personales |
| GET | `/api/canchas` | Lista de canchas activas con tarifa |
| POST | `/api/auth/registro` | Registro (crea TÉCNICO en PENDIENTE) |
| POST | `/api/auth/login` | Inicio de sesión |

### Reservas
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/reservas` | Técnico ACTIVO / Admin | Técnico: crea PENDIENTE con comprobante (multipart). Admin: crea APROBADA y asigna `tecnico_id` |
| GET | `/api/reservas` | Técnico / Admin | Propias (técnico) o todas con filtros (admin) |
| GET | `/api/reservas/{id}` | Dueño / Admin | Detalle |
| PUT | `/api/reservas/{id}/comprobante` | Dueño | Reemplaza comprobante mientras sea PENDIENTE |
| PATCH | `/api/reservas/{id}/aprobar` | Admin | Aprueba (transacción + revalidación) |
| PATCH | `/api/reservas/{id}/rechazar` | Admin | Rechaza con `motivo` obligatorio |
| PATCH | `/api/reservas/{id}/cancelar` | Dueño / Admin | Cancela con `motivo` |
| PATCH | `/api/reservas/{id}/reprogramar` | Dueño / Admin | Cambia fecha/horario (revalida cruces; vuelve a PENDIENTE si lo hace el técnico) |
| GET | `/api/reservas/solicitudes` | Admin | Bandeja de PENDIENTES con indicador `en_conflicto` |
| GET | `/api/reservas/alertas` | Admin | Semáforo (sección 8) |
| GET | `/api/reservas/calendario?desde=&hasta=&cancha=&estado=&tecnico=` | Admin | Eventos para el calendario |

### Jugadores
| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/jugadores` | Lista propia / alta (multipart con foto) |
| GET/PUT | `/api/jugadores/{id}` | Detalle / edición |
| PATCH | `/api/jugadores/{id}/estado` | Activar / desactivar |

### Encuentros
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/encuentros` | Propios (técnico) / todos (admin) |
| GET | `/api/encuentros/reservas-disponibles` | Reservas aprobadas, futuras y sin encuentro del técnico |
| POST | `/api/encuentros` | Crea BORRADOR desde `reserva_id` (multipart con banner) |
| PUT | `/api/encuentros/{id}` | Edita nombre, banner, apuesta |
| PUT | `/api/encuentros/{id}/equipos` | Reemplaza equipos y jugadores (valida 4–8, sin duplicados) |
| POST | `/api/encuentros/{id}/balancear` | Devuelve sugerencia de equipos balanceados |
| PATCH | `/api/encuentros/{id}/publicar` | Valida reglas y publica |
| PATCH | `/api/encuentros/{id}/cancelar` | Cancela |

### Seguridad (aprobación de usuarios)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/seguridad/usuarios?estado=PENDIENTE` | Bandeja de técnicos |
| PATCH | `/api/seguridad/usuarios/{id}/aprobar` | Estado → ACTIVO |
| PATCH | `/api/seguridad/usuarios/{id}/rechazar` | Estado → RECHAZADO con motivo |
| PATCH | `/api/seguridad/usuarios/{id}/suspender` | Estado → SUSPENDIDO |
| PATCH | `/api/seguridad/usuarios/{id}/reactivar` | Estado → ACTIVO |

### Notificaciones y parámetros
`GET /api/notificaciones`, `PATCH /api/notificaciones/{id}/leida`, `GET/PUT /api/parametros` (solo Admin).

---

## 13. PANTALLAS (frontend)

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Página principal: encuentros + disponibilidad | Público |
| `/encuentros/:id` | Detalle público del encuentro | Público |
| `/registro`, `/login` | Registro e inicio de sesión | Público |
| `/encuentros/reservas` | Calendario (público de solo lectura; para técnico/admin con acciones) | Según rol |
| `/encuentros/reservas/mias` | Mis reservas + formulario de solicitud con comprobante | Técnico |
| `/encuentros/reservas/solicitudes` | Bandeja de solicitudes con visor de comprobante | Admin |
| `/encuentros/reservas/alertas` | Semáforo de alertas | Admin |
| `/encuentros/jugadores` | Lista y formulario de jugadores | Técnico / Admin |
| `/encuentros/eventos` | Lista de encuentros | Técnico / Admin |
| `/encuentros/eventos/nuevo` | Asistente de 3 pasos | Técnico / Admin |
| `/encuentros/eventos/:id` | Detalle / edición | Técnico / Admin |
| `/seguridad/aprobacion-usuarios` | Bandeja de técnicos pendientes | Admin |

### 13.1 Requisitos de UI

- **Diseño responsivo, móvil primero** (el técnico usará celular).
- **Calendario**: vistas mes/semana/día; colores por estado: Pendiente (amarillo), Aprobada (verde), Finalizada (azul), Cancelada/Rechazada/Vencida (gris, ocultas por defecto). Usar librería de calendario ya presente en el proyecto o FullCalendar equivalente.
- **Selector de estrellas** interactivo 1–5 con teclado accesible.
- **Subida de archivos** con vista previa, validación de tipo/tamaño y barra de progreso.
- **Recorte de imagen** para foto (1:1) y banner (16:9).
- **Selector de jugadores** para equipos: dos paneles (disponibles / equipo) con arrastrar y soltar y alternativa por clic; contador "n/8" por equipo y suma de estrellas.
- **Semáforo** con círculo de color **y texto** (accesibilidad).
- Estados vacíos, cargas (skeleton) y mensajes de error claros.
- Insignias con contadores en el menú: solicitudes pendientes, alertas rojas, usuarios por aprobar.

### 13.2 Wireframes de referencia

```
Menú:                         Alertas (Admin):
 Encuentros                   ┌ 🔴 Rojas: 2   🟠 Ámbar: 1   🟢 Verde: 4 ┐
  • Reservas (3)              ├──────────────────────────────────────────┤
  • Jugadores                 │ 🔴 Vence hoy │ J.Pérez │ Cancha 1 │ 18/11 │ [Ver comp.][✔][✘]│
  • Eventos                   │ 🔴 1 día     │ M.Ruiz  │ Cancha 2 │ 19/11 │ ...              │
 Seguridad                    │ 🟠 3 días    │ L.Díaz  │ Cancha 1 │ 21/11 │ ...              │
  • Aprobación usuarios (2)   └──────────────────────────────────────────┘

Equipos (paso 2):
 Disponibles        │ Equipo Rojo  ★18  (6/8)   │ Equipo Azul ★17 (6/8)
 ○ Carlos ★5        │ ● Luis ★3                 │ ● ...
 [Balancear auto]   │ aviso si <4 o >8          │
```

---

## 14. PARÁMETROS CONFIGURABLES (tabla `parametro`)

| Clave | Valor por defecto | Descripción |
|---|---|---|
| `ALERTA_ROJO_DIAS` | 2 | Umbral de semáforo rojo |
| `ALERTA_AMBAR_DIAS` | 3 | Umbral de semáforo ámbar |
| `EQUIPO_MIN_JUGADORES` | 4 | Mínimo por equipo (se valida al publicar) |
| `EQUIPO_MAX_JUGADORES` | 8 | Máximo por equipo |
| `RESERVA_DURACION_MIN_H` | 1 | Duración mínima |
| `RESERVA_DURACION_MAX_H` | 3 | Duración máxima |
| `CANCELACION_HORAS_MIN` | 24 | Horas antes del inicio para cancelar (técnico) |
| `EDICION_HORAS_MIN` | 2 | Horas antes para editar jugadores de un encuentro publicado |
| `COMPROBANTE_OBLIGATORIO_TECNICO` | true | Obliga comprobante en solicitud del técnico |
| `COMPROBANTE_MAX_MB` | 5 | Tamaño máximo del comprobante |
| `FOTO_JUGADOR_MAX_MB` | 2 | Tamaño máximo de foto |
| `BANNER_MAX_MB` | 3 | Tamaño máximo de banner |
| `ENCUENTROS_POR_RESERVA_MAX` | 1 | Encuentros por reserva |
| `MOSTRAR_SEMAFORO_VERDE` | true | Mostrar reservas sin urgencia |

---

## 15. NOTIFICACIONES, TAREAS PROGRAMADAS Y AUDITORÍA

### 15.1 Notificaciones (en plataforma; correo si hay servicio SMTP configurado)

| Evento | Destinatario | Contenido |
|---|---|---|
| Nuevo registro de técnico | Admin | Datos del usuario y enlace a la bandeja |
| Usuario aprobado / rechazado | Técnico | Resultado y motivo si aplica |
| Nueva solicitud de reserva | Admin | Técnico, cancha, fecha, horario, enlace |
| Reserva aprobada / rechazada | Técnico | Resultado, motivo si aplica, enlace para crear encuentro |
| Reserva cancelada | Técnico y Admin | Motivo y encuentro afectado |
| Reserva en rojo (2 días o menos) | Admin | Resumen diario de rojas (opcional) |
| Recordatorio de encuentro | Técnico | 24 h y 2 h antes |

### 15.2 Tareas programadas (jobs)

1. **Cada 15 min**: marcar reservas *PENDIENTE* con fecha/hora pasada como **VENCIDA**.
2. **Cada 15 min**: reservas *APROBADA* con hora fin pasada → **FINALIZADA**; encuentros *PUBLICADO* en su horario → **EN_JUEGO** → **FINALIZADO**.
3. **Diario 08:00 (Lima)**: generar notificación resumen de alertas rojas al Admin.

### 15.3 Auditoría

Registrar en `auditoria`: registro/aprobación/rechazo/suspensión de usuarios, creación/aprobación/rechazo/cancelación/reprogramación de reservas, cambios de estrellas, publicación/cancelación de encuentros. Incluir usuario, fecha y detalle (antes/después).

---

## 16. PRUEBAS DE ACEPTACIÓN (el agente debe automatizarlas)

```gherkin
Escenario: Visitante ve encuentros pero no reserva
  Dado que no he iniciado sesión
  Cuando entro a la página principal
  Entonces veo los encuentros PUBLICADOS y la disponibilidad
  Y al intentar reservar soy dirigido a registro/login

Escenario: Registro crea técnico pendiente
  Cuando me registro con datos válidos
  Entonces mi usuario queda con rol TÉCNICO y estado PENDIENTE
  Y el Admin ve mi solicitud en Seguridad > Aprobación de usuarios
  Y no puedo solicitar reservas hasta ser aprobado

Escenario: Admin aprueba técnico
  Dado un técnico PENDIENTE
  Cuando el Admin lo aprueba
  Entonces su estado es ACTIVO y recibe notificación

Escenario: Solicitud con comprobante
  Dado un técnico ACTIVO
  Cuando solicita una reserva adjuntando un comprobante PDF de 1 MB
  Entonces la reserva queda PENDIENTE con el monto calculado
  Y sin comprobante el sistema rechaza la solicitud con error de validación

Escenario: Aprobación revalida cruces
  Dadas dos solicitudes PENDIENTES que se cruzan en la misma cancha
  Cuando el Admin aprueba la primera
  Entonces la segunda se marca "en conflicto"
  Y intentar aprobarla devuelve 409

Escenario: Rechazo exige motivo
  Cuando el Admin rechaza sin motivo
  Entonces el sistema devuelve error 422

Escenario: Semáforo
  Dadas reservas PENDIENTES con fechas a 0, 2, 3 y 5 días
  Entonces las de 0 y 2 días son ROJO, la de 3 días es ÁMBAR y la de 5 días es VERDE

Escenario: Equipos 4 a 8 jugadores
  Cuando intento publicar un encuentro con un equipo de 3 jugadores
  Entonces el sistema lo impide indicando el mínimo de 4
  Y no permite agregar un noveno jugador a un equipo

Escenario: Jugador en dos equipos
  Cuando asigno el mismo jugador a dos equipos del mismo encuentro
  Entonces el sistema lo rechaza

Escenario: Aislamiento entre técnicos
  Dado un técnico A y un técnico B
  Cuando A solicita jugadores, reservas o encuentros de B por ID
  Entonces recibe 403 o 404

Escenario: Encuentros múltiples
  Dado un técnico con tres reservas aprobadas
  Entonces puede crear un encuentro por cada una (tres en total)
  Y no puede crear dos encuentros sobre la misma reserva

Escenario: Cancelar reserva cancela encuentro
  Dado un encuentro PUBLICADO sobre una reserva APROBADA
  Cuando se cancela la reserva
  Entonces el encuentro pasa a CANCELADO y se notifica

Escenario: Apuesta informativa
  Cuando un encuentro tiene apuesta
  Entonces en la vista pública aparece con la etiqueta "Apuesta informativa"
  Y el sistema no registra pagos ni liquidaciones de apuestas

Escenario: Concurrencia
  Cuando el Admin aprueba simultáneamente dos reservas cruzadas
  Entonces solo una queda APROBADA (la restricción de BD lo garantiza)
```

Cobertura mínima esperada: reglas RN-01 a RN-22, permisos por rol y transiciones de estado válidas/inválidas.

---

## 17. PLAN DE IMPLEMENTACIÓN (orden obligatorio)

| Fase | Entregable | Incluye |
|---|---|---|
| **1. Base** | Migraciones, modelos, parámetros, seeds, servicio de archivos | Tablas de la sección 11; 3 canchas de ejemplo; 1 Admin; 2 técnicos (uno ACTIVO, uno PENDIENTE) |
| **2. Registro y Seguridad** | Registro público, login, estados de cuenta, bandeja de aprobación | Secciones 6 y permisos de 3 |
| **3. Reservas** | Calendario público y admin, solicitud con comprobante, bandeja, aprobar/rechazar, crear por admin, cancelar/reprogramar | Sección 7 |
| **4. Alertas** | Semáforo, widget, badges, jobs | Secciones 8 y 15 |
| **5. Jugadores** | CRUD con foto y estrellas, historial | Sección 9 |
| **6. Eventos** | Asistente, equipos 4–8, banner, apuesta informativa, publicación, balanceo | Sección 10 |
| **7. Pública** | Página principal, detalle de encuentro | Sección 5 |
| **8. Cierre** | Notificaciones, auditoría, pruebas, README | Secciones 15 y 16 |

---

## 18. REQUISITOS NO FUNCIONALES

- **Seguridad:** autenticación con tokens/sesión seguros; hash de contraseñas (bcrypt/argon2); protección CSRF/XSS; validación de archivos por tipo real (MIME/firma) y tamaño en servidor; nombres de archivo aleatorios; los comprobantes **no son públicos** (solo dueño y Admin, con URL firmada o control de acceso); límite de intentos de login; prevención de acceso a datos ajenos (IDOR).
- **Privacidad:** la vista pública no expone datos de contacto del técnico ni comprobantes. Las fotos de jugadores solo se muestran en encuentros publicados.
- **Rendimiento:** calendario con un mes de datos en menos de 2 s; paginación en listados; índices según sección 11.
- **Almacenamiento:** archivos en almacenamiento externo o carpeta configurada; imágenes comprimidas y con miniaturas.
- **Zona horaria:** guardar con zona horaria y mostrar en America/Lima; las comparaciones de "hoy" para el semáforo usan fecha de Lima.
- **Accesibilidad:** contraste suficiente, navegación por teclado en calendario y selector de estrellas, semáforo con texto además del color.
- **Observabilidad:** logs de errores y auditoría de acciones críticas.
- **Calidad:** pruebas unitarias de servicios y reglas, pruebas de integración de API y pruebas de permisos por rol.

---

## 19. CRITERIOS DE FINALIZACIÓN (Definition of Done)

1. Todas las pantallas de la sección 13 funcionan en móvil y escritorio.
2. Todas las reglas RN-01 a RN-22 y decisiones D1 a D9 están implementadas.
3. Las pruebas de la sección 16 pasan.
4. La restricción de no cruce de reservas aprobadas está garantizada en base de datos.
5. Un técnico **PENDIENTE** no puede ejecutar ninguna acción de escritura.
6. El semáforo respeta los umbrales configurables (rojo ≤ 2 días, ámbar = 3 días por defecto).
7. Los equipos respetan 4–8 jugadores y ningún jugador está en dos equipos del mismo encuentro.
8. La apuesta se muestra siempre como informativa y no genera movimientos de dinero.
9. Existe `README_ENCUENTROS.md` con pasos de instalación, variables de entorno, migraciones, seeds y credenciales de prueba.

---

## 20. DATOS DE PRUEBA (seeds)

- **Canchas**: "Cancha 1" (F5, S/ 80), "Cancha 2" (F7, S/ 120), "Cancha 3" (F11, S/ 200).
- **Usuarios**: `admin@demo.pe` (ADMIN, ACTIVO), `tecnico1@demo.pe` (TÉCNICO, ACTIVO), `tecnico2@demo.pe` (TÉCNICO, PENDIENTE).
- **Jugadores**: 12 para `tecnico1` con estrellas variadas (1 a 5) y fotos de ejemplo.
- **Reservas**: una por cada color de semáforo (hoy, +2, +3, +5 días en PENDIENTE), una APROBADA futura sin encuentro, una RECHAZADA con motivo.
- **Encuentro**: uno PUBLICADO con 2 equipos de 6 jugadores y banner de ejemplo, para poblar la página principal.

---

## 21. PREGUNTAS PENDIENTES (no bloquean el desarrollo; hay valores por defecto)

1. Confirmar la interpretación de "vencimiento" del semáforo (supuesto S1: reservas pendientes cuya fecha se acerca).
2. Confirmar si un técnico puede tener más de un encuentro **sobre la misma reserva** (por defecto: no, un encuentro por reserva).
3. Confirmar canal de notificación externo deseado (correo, WhatsApp) además de la notificación en plataforma.
4. Confirmar si habrá tipos de cancha adicionales y si el mínimo/máximo de jugadores varía por tipo.
