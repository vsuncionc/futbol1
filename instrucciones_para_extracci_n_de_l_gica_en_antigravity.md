# Guía de Extracción de Lógica de Funcionamiento

**Instrucciones para el Agente (Antigravity):**
Ejecuta las siguientes 4 fases de forma secuencial sobre este repositorio. Tu objetivo es mapear **exclusivamente la lógica real de funcionamiento del sistema** (reglas de negocio, validaciones, flujos de decisión, cálculos, estados, transacciones y procesos backend/BD), ignorando detalles visuales (HTML/CSS/estilos), infraestructura y redacción de manuales de usuario.

Guarda todos los entregables dentro de la carpeta `docs/logica/`. No inventes reglas; basa cada hallazgo en el código fuente real citando siempre el archivo, clase, método o procedimiento exacto. Si algo no es concluyente, márcalo como `[POR VERIFICAR]`.

## Fase 1: Mapa General de Lógica del Sistema

Recorre el repositorio completo e identifica dónde reside la lógica central (servicios, controladores, dominio, stored procedures, triggers, jobs/batch y validadores).

Crea el archivo `docs/logica/01_mapa_logica_sistema.md` con:

1. **Inventario de Procesos Lógicos**: agrupados por módulo o paquete, indicando qué hace cada proceso, qué evento o invocación lo dispara y qué entidades/tablas afecta.
2. **Flujos Lógicos End-to-End**: secuencia exacta de pasos desde la entrada de datos hasta la persistencia o emisión de respuestas/eventos.
3. **Dependencias Lógicas**: llamadas entre módulos, servicios externos, triggers o procesos batch encadenados.

## Fase 2: Extracción Detallada de Reglas de Negocio y Validaciones

Para cada módulo o proceso crítico identificado en la Fase 1, analiza en profundidad sus servicios, validadores, queries, procedimientos almacenados y manejo de excepciones.

Genera un archivo `docs/logica/02_reglas_<nombre_modulo>.md` por cada módulo principal documentando:

1. **Precondiciones**: estado previo requerido en los datos o en el contexto de ejecución para que el proceso pueda correr.
2. **Validaciones de Entrada**: obligatoriedad, formato, rangos, unicidad y cruces contra base de datos (indicando exactamente qué condición dispara qué error).
3. **Reglas de Negocio y Cálculos**: fórmulas, transformaciones de datos, asignaciones condicionales (`if/else`, `switch`, `CASE`), filtros y criterios de selección.
4. **Persistencia y Efectos Secundarios**: registros insertados, actualizados o eliminados (en orden transaccional), auditoría generada y procesos posteriores disparados.
5. **Manejo de Excepciones y Rollbacks**: comportamiento lógico ante fallos parciales, datos inconsistentes o errores de integración.

## Fase 3: Máquinas de Estado, Transiciones y Permisos Lógicos

Inspecciona el código relacionado con el ciclo de vida de las entidades y los controles de autorización funcional (guards, middlewares, anotaciones de seguridad, filtros `WHERE` y validaciones en servicio).

Crea el archivo `docs/logica/03_estados_y_permisos.md` con:

1. **Catálogo de Estados**: todos los estados encontrados en enums, constantes, tablas catálogo o valores fijos, con su significado lógico.
2. **Matriz de Transiciones de Estado**: tabla con `[Entidad] | [Estado Origen] | [Acción / Evento] | [Condiciones para permitir el cambio] | [Estado Destino] | [Efectos secundarios]`.
3. **Reglas de Autorización Funcional**: qué rol, perfil o condición de propiedad del dato permite ejecutar cada operación.
4. **Transiciones Inválidas**: qué ocurre lógicamente si se intenta ejecutar una acción fuera de estado o sin permisos.

## Fase 4: Auditoría de Lógica Implícita, Hardcode y Casos Borde

Realiza una revisión crítica de la lógica implementada en el repositorio para detectar riesgos funcionales ocultos.

Crea el archivo `docs/logica/04_auditoria_logica.md` reportando:

1. **Reglas Implícitas y Valores Hardcodeados**: constantes mágicas, IDs fijos, fechas límite, umbrales, exclusiones o condiciones especiales escritas directo en código o queries.
2. **Inconsistencias Lógicas**: discrepancias entre validaciones de entrada (frontend/DTO) y validaciones de negocio (servicio/BD), o reglas duplicadas con distinta condición.
3. **Comportamiento en Casos Borde**: respuesta exacta de la lógica ante valores nulos, listas vacías, registros duplicados, concurrencia, reprocesos o divisiones por cero.
4. **Código Muerto o Flujos Inalcanzables**: ramas condicionales o métodos que ya no se invocan o nunca se cumplen.