# Fase 4: Auditoría de Lógica Implícita, Hardcode y Casos Borde

**Módulo:** Auditoría Crítica de Arquitectura y Lógica de Negocio  
**Repositorio:** `d:\MI_ESPACIO_IA\09\futbol1`  
**Fecha de Auditoría:** 2026-11-24  
**Objetivo:** Identificar reglas implícitas, constantes mágicas, inconsistencias entre capas, comportamiento en casos límite y artefactos de código muerto.

---

## 1. Reglas Implícitas y Valores Hardcodeados

A continuación se listan las constantes fijas, umbrales y configuraciones escritas de forma estática en el código sin parametrización externa o con acoplamiento de entorno:

### 1.1. Zona Horaria Estática
- **Ubicación:** `ReservaService.java` (Línea 34)
  ```java
  public static final ZoneId ZONE_LIMA = ZoneId.of("America/Lima");
  ```
- **Riesgo / Impacto:** La aplicación asume rígidamente la hora de Lima (UTC-5) para todas las validaciones de fecha actual, cancelaciones y cron. Si el servidor o los usuarios operan en otra zona geográfica sin sincronización de zona horaria del cliente, los cálculos de "horarios en el pasado" y semáforos generarán falsos rechazos.

### 1.2. Representación Especial de Medianoche (`23:59`)
- **Ubicación:** `ReservaService.java` (Líneas 475, 481, 494)
  ```java
  boolean esFinDeDia = (horaFin.getHour() == 23 && horaFin.getMinute() == 59);
  if (esFinDeDia) {
      minutos += 1; // 23:59 cuenta como 24:00 (hora completa)
  }
  ```
- **Riesgo / Impacto:** Debido a que el tipo `LocalTime` de Java no admite la representación de `24:00:00` (el reloj salta a `00:00:00` del día siguiente), se implementó un artificio implícito donde `23:59` se interpreta como hora entera de cierre de jornada. Cualquier cliente que intente enviar `00:00` como fin de día fallará por la validación `!horaFin.isAfter(horaInicio)`.

### 1.3. URL Base del Servidor Backend Hardcodeada
- **Ubicación:** `EncuentroService.java` (Línea 383), `auth.service.ts` (Líneas 14, 15), `encuentros.service.ts` (Línea 18)
  ```java
  return "http://localhost:8080/api/v1/publico/archivos/" + clean;
  ```
- **Riesgo / Impacto:** Al concatenar el esquema y host fijo `http://localhost:8080`, si la aplicación se despliega en producción (por ejemplo bajo un dominio HTTPS o un contenedor Docker), los enlaces generados para banners y fotos resolverán al host local del navegador cliente en vez del servidor de producción.

### 1.4. Paleta Cromática Fija en Snake Draft
- **Ubicación:** `EncuentroService.java` (Línea 253)
  ```java
  String[] colores = new String[]{"#0066FF", "#DC2626", "#16A34A", "#CA8A04"};
  ```
- **Riesgo / Impacto:** Los colores sugeridos para los equipos son códigos hexadecimales fijos (Azul, Rojo, Verde, Ámbar). Si se solicitan más de 4 equipos, los colores se repiten cíclicamente vía operador módulo (`i % colores.length`).

### 1.5. Hash Dummy BCrypt para Anti-Enumeración
- **Ubicación:** `AuthService.java` (Línea 221)
  ```java
  passwordEncoder.matches("dummy_pass_123456", "$2a$12$e8Y57zMh6lD2Z9fU2G2CGeZpYIkg.E5f71K6JkYgI/K7K8z8kEhyq");
  ```
- **Evaluación:** Es una práctica de seguridad positiva (mitiga ataques de temporización al computar 4,096 rondas de BCrypt idénticas cuando el usuario no existe), pero el hash estático debe estar protegido de optimizaciones de compilador.

---

## 2. Inconsistencias Lógicas Detectadas

### 2.1. Discrepancia en Tamaño Máximo de Archivos (`ParametroService` vs `FileStorageService`)
- **Evidencia:**
  - En `ParametroService.java` (Líneas 31-33), la tabla de parámetros define:
    - `FOTO_JUGADOR_MAX_MB` = **2 MB**
    - `BANNER_MAX_MB` = **3 MB**
    - `COMPROBANTE_MAX_MB` = **5 MB**
  - Sin embargo, en `FileStorageService.java` (Líneas 45 y 50), las validaciones reales están hardcodeadas a 5 MB:
    ```java
    public String storeFotoJugador(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024L, "Foto del jugador");
        return store(file, jugadoresLocation, "jugadores");
    }
    public String storeBanner(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, 5 * 1024 * 1024L, "Banner");
        return store(file, bannersLocation, "banners");
    }
    ```
- **Consecuencia Lógica:** Los parámetros dinámicos de tamaño en `ParametroService` no son consultados en tiempo de ejecución por `FileStorageService`, volviéndose inoperantes si un administrador intenta reducir el tamaño de fotos de jugadores o banners desde la configuración.

### 2.2. Discrepancia en Políticas de Complejidad de Contraseña
- **Evidencia:**
  - `RegisterRequest` (Registro Público en `AuthDtos.java` Líneas 38-42):
    - Exige obligatoriamente: Dígito, Minúscula, Mayúscula y **Carácter Especial**:
      `^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!._-]).*$`
  - `RegisterTecnicoRequest` (Registro Técnico en `AuthDtos.java` Líneas 93-96):
    - Exige únicamente: Dígito, Minúscula y Mayúscula (sin exigir carácter especial):
      `^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$`
- **Consecuencia Lógica:** Existe una asimetría en la robustez mínima de claves requerida para un usuario estándar respecto a un Director Técnico.

---

## 3. Comportamiento en Casos Borde

### 3.1. Concurrencia en Aprobación de Reservas Cruce (Race Conditions)
- **Escenario:** Dos administradores abren simultáneamente dos solicitudes pendientes ($R_A$ y $R_B$) para la misma cancha deportiva en el mismo horario.
- **Respuesta de la Lógica:**
  - Ambas solicitudes inician en estado `PENDIENTE`.
  - El primer administrador ejecuta `aprobarReserva(A)`: la transacción valida que no hay reservas `APROBADA` y persiste $A$ con éxito.
  - El segundo administrador ejecuta `aprobarReserva(B)`: su consulta `findOverlappingApprovedReservations` lee el registro $A$ ya confirmado y arroja `IllegalStateException("Conflicto de horario...")`.
- **Riesgo:** Si ambas transacciones se ejecutan en paralelo estricto en milisegundos idénticos bajo niveles de aislamiento `READ_COMMITTED` estándar, ambas lecturas podrían salir limpias antes del commit.
- **Recomendación:** Incorporar bloqueo pesimista (`PESSIMISTIC_WRITE`) en la consulta de cruces o una restricción de exclusión a nivel de base de datos (`EXCLUDE USING gist`).

### 3.2. División por Cero en Métricas de Equipos
- **Escenario:** Convocatoria enviada a balanceo con lista de jugadores vacía (`jugadorIds = []`).
- **Respuesta de la Lógica:**
  - En `EncuentroService.java` Línea 259:
    ```java
    double promedio = jList.isEmpty() ? 0.0 : ((double) totalEstrellas / jList.size());
    ```
  - En `EncuentroService.java` Línea 389:
    ```java
    double promedio = eq.getJugadores().isEmpty() ? 0.0 : ((double) totalEstrellas / eq.getJugadores().size());
    ```
- **Evaluación:** El caso borde de división por cero está **correctamente protegido** mediante operador ternario defensivo devolviendo `0.0`.

### 3.3. Intentos de Desborde en Snake Draft
- **Escenario:** Se convocan 30 jugadores para un encuentro con 2 equipos (máximo 8 jugadores por equipo = 16 cupos totales).
- **Respuesta de la Lógica:**
  - En `EncuentroService.java` (Líneas 215-235), el bucle `while (equiposJugadores.get(idxEquipo).size() >= maxPorEquipo)` intenta buscar un equipo con cupo libre.
  - Si ambos equipos alcanzan 8 jugadores, los 14 jugadores restantes no se asignan a ningún equipo.
  - El proceso concluye sin romperse en memoria, pero los jugadores sobrantes quedan excluidos de la sugerencia sin emitir error al usuario.

---

## 4. Código Muerto y Artefactos Huérfanos

### 4.1. Artefacto Compilado `.class` en Árbol de Código Fuente
- **Ubicación Física:** `backend/src/main/java/com/empresa/seguridad/encuentros/application/service/ReservaService.class`
- **Diagnóstico:** Un archivo `.class` compilado fue accidentalmente versionado dentro de la carpeta de código fuente Java (`src/main/java`) en lugar de `target/classes`.
- **Riesgo:** Genera confusión en IDEs y herramientas de análisis estático. Debe removerse del árbol de fuentes Git.

### 4.2. Redundancia en Transiciones de Estado de Encuentros
- **Ubicación:** `EncuentrosScheduledTasks.java` (Líneas 68-75)
  ```java
  List<Encuentro> enJuego = encuentroRepository.findByEstado(EstadoEncuentro.EN_JUEGO);
  for (Encuentro e : enJuego) {
      Reserva r = e.getReserva();
      if (r.getFecha().isBefore(hoy) || (r.getFecha().isEqual(hoy) && !ahora.isBefore(r.getHoraFin()))) {
          e.setEstado(EstadoEncuentro.FINALIZADO);
          encuentroRepository.save(e);
      }
  }
  ```
- **Diagnóstico:** Las líneas 56-65 ya evalúan los encuentros `PUBLICADO` y si la reserva ya concluyó (`horaFin <= ahora`) los transicionan directamente a `FINALIZADO` sin pasar por `EN_JUEGO`. El segundo bloque de `enJuego` es únicamente útil si el cron se ejecutó en la ventana intermedia del partido. La lógica es funcionalmente coherente pero ligeramente redundante.
