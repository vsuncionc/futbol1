/**
 * =========================================================================================
 * SISTEMA EMPRESARIAL MULTI-MÓDULO (FUTBOL S.A., INVENTARIO, VENTAS, LOGÍSTICA)
 * Arquitectura: Google Apps Script + Google Sheets (Back-end) + HTML/CSS/JS (Front-end)
 * Archivo: Code.gs
 * =========================================================================================
 */

// Configuración general del Spreadsheet Activo
const CONFIG = {
  APP_NAME: 'Sistema Empresarial & Deportivo Futbol S.A.',
  VERSION: '2.0.0',
  COLOR_HEADER: '#0f172a',    // Azul marino oscuro corporativo
  COLOR_HEADER_TEXT: '#ffffff',
  COLOR_ZEBRA: '#f8fafc'
};

/**
 * Punto de entrada HTTP para la Web App (HTML5 SPA)
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appName = CONFIG.APP_NAME;
  template.version = CONFIG.VERSION;
  
  return template.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Función utilitaria para importar sub-archivos HTML/CSS en plantillas
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Definición canónica de entidades y columnas de la base de datos (Google Sheets)
 */
const SCHEMA_DEFINITION = {
  FUTBOL_RESERVAS: {
    nombreHoja: 'FUTBOL_RESERVAS',
    columnas: ['ID', 'Fecha_Juego', 'Cancha', 'Horario', 'Tecnico_Solicitante', 'Monto_Soles', 'Estado', 'Comprobante_URL', 'Fecha_Registro'],
    datosMuestra: [
      ['RES-1001', '2026-11-24', 'Cancha 1 (F5)', '19:00 - 20:30', 'Roberto Carlos', 120, 'APROBADA', 'https://drive.google.com/sample1', new Date().toISOString().slice(0, 10)],
      ['RES-1002', '2026-11-25', 'Cancha 2 (F7)', '20:00 - 21:30', 'Zinedine Zidane', 180, 'PENDIENTE', 'https://drive.google.com/sample2', new Date().toISOString().slice(0, 10)],
      ['RES-1003', '2026-11-26', 'Cancha 3 (F11)', '18:00 - 20:00', 'Pep Guardiola', 350, 'APROBADA', 'https://drive.google.com/sample3', new Date().toISOString().slice(0, 10)]
    ]
  },
  FUTBOL_ENCUENTROS: {
    nombreHoja: 'FUTBOL_ENCUENTROS',
    columnas: ['ID', 'Nombre_Encuentro', 'Fecha', 'Horario', 'Cancha', 'Equipo_Local', 'Equipo_Visita', 'Bolsa_Soles', 'Estado', 'Arbitro'],
    datosMuestra: [
      ['ENC-2001', 'Gran Clásico Amistoso', '2026-11-25', '20:00 - 21:30', 'Cancha 1 (F5)', 'Los Galácticos (5★)', 'La Máquina FC (4★)', 100, 'PUBLICADO', 'Oficial FPF'],
      ['ENC-2002', 'Copa Relámpago Apertura', '2026-11-28', '19:00 - 21:00', 'Cancha 2 (F7)', 'Técnicos Unidos (4★)', 'Real Lima (5★)', 250, 'EN_CURSO', 'Víctor Carrillo']
    ]
  },
  INVENTARIO: {
    nombreHoja: 'INVENTARIO',
    columnas: ['ID_SKU', 'Nombre_Producto', 'Categoria', 'Stock_Actual', 'Stock_Minimo', 'Precio_Unitario', 'Ubicacion_Almacen', 'Estado'],
    datosMuestra: [
      ['INV-001', 'Balón Oficial #4 Multitaco', 'Implementos', 24, 10, 85.00, 'Almacén Central - Rack A1', 'DISPONIBLE'],
      ['INV-002', 'Chalecos de Entrenamiento (Set x10)', 'Indumentaria', 8, 5, 120.00, 'Almacén Central - Rack B2', 'DISPONIBLE'],
      ['INV-003', 'Red de Arco Fútbol 7 Pro', 'Equipamiento', 3, 4, 210.00, 'Depósito Técnico', 'STOCK_CRITICO'],
      ['INV-004', 'Bebida Rehidratante 500ml', 'Bebidas', 150, 40, 4.50, 'Cafetería / Frigobar', 'DISPONIBLE']
    ]
  },
  VENTAS: {
    nombreHoja: 'VENTAS',
    columnas: ['ID_Venta', 'Fecha', 'Cliente', 'Tipo_Comprobante', 'Detalle_Items', 'Subtotal', 'IGV', 'Total', 'Metodo_Pago', 'Vendedor'],
    datosMuestra: [
      ['VNT-5001', '2026-11-23', 'Club Los Amigos FC', 'BOLETA', 'Alquiler Cancha F5 + 10 Bebidas', 165.00, 29.70, 194.70, 'YAPE', 'Cajero 1'],
      ['VNT-5002', '2026-11-23', 'Torneo Empresas', 'FACTURA', 'Alquiler Cancha F11 2 Horas', 700.00, 126.00, 826.00, 'TRANSFERENCIA', 'Administrador']
    ]
  },
  LOGISTICA: {
    nombreHoja: 'LOGISTICA',
    columnas: ['ID_Guia', 'Fecha_Despacho', 'Origen', 'Destino', 'Proveedor_Transporte', 'Estado_Envio', 'Responsable', 'Observaciones'],
    datosMuestra: [
      ['LOG-9001', '2026-11-22', 'Proveedor Grass Perú SAC', 'Sede Central Canchas', 'Transportes Rápidos', 'ENTREGADO', 'Luis Almacén', 'Rollos de césped sintético monofilamento'],
      ['LOG-9002', '2026-11-23', 'Distribuidora Deportiva', 'Camerinos / Botiquín', 'Courier Urbano', 'EN_TRANSITO', 'Carlos Médico', 'Hielo químico, vendas y balones']
    ]
  }
};

/**
 * =========================================================================================
 * FUNCION REQUERIDA: INICIALIZAR AUTOMÁTICAMENTE HOJAS Y COLUMNAS
 * Crea las hojas que falten, formatea los encabezados corporativos, congela filas y
 * añade registros de muestra con protección de concurrencia.
 * =========================================================================================
 */
function inicializarHojasYColumnas() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Evitar colisiones simultáneas
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const resultados = [];

    for (const clave in SCHEMA_DEFINITION) {
      const def = SCHEMA_DEFINITION[clave];
      let sheet = ss.getSheetByName(def.nombreHoja);
      let esNueva = false;

      if (!sheet) {
        sheet = ss.insertSheet(def.nombreHoja);
        esNueva = true;
      }

      // Configurar Encabezados si está vacía
      if (sheet.getLastRow() === 0) {
        // 1. Escribir Encabezados
        const headerRange = sheet.getRange(1, 1, 1, def.columnas.length);
        headerRange.setValues([def.columnas]);

        // 2. Formato estético profesional de encabezados
        headerRange
          .setBackground(CONFIG.COLOR_HEADER)
          .setFontColor(CONFIG.COLOR_HEADER_TEXT)
          .setFontWeight('bold')
          .setFontFamily('Roboto')
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle');

        sheet.setRowHeight(1, 38);
        sheet.setFrozenRows(1);

        // 3. Insertar datos de muestra
        if (def.datosMuestra && def.datosMuestra.length > 0) {
          const dataRange = sheet.getRange(2, 1, def.datosMuestra.length, def.columnas.length);
          dataRange.setValues(def.datosMuestra);
          dataRange.setFontFamily('Roboto').setFontSize(10).setVerticalAlignment('middle');
        }

        // 4. Auto-ajustar ancho de columnas
        for (let c = 1; c <= def.columnas.length; c++) {
          sheet.autoResizeColumn(c);
        }

        resultados.push(`Hoja "${def.nombreHoja}" creada con ${def.columnas.length} columnas y datos iniciales.`);
      } else {
        resultados.push(`Hoja "${def.nombreHoja}" ya existe con datos.`);
      }
    }

    return {
      success: true,
      mensaje: 'Base de datos en Google Sheets inicializada correctamente.',
      detalles: resultados
    };

  } catch (err) {
    return {
      success: false,
      mensaje: 'Error al inicializar hojas: ' + err.message
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * =========================================================================================
 * API DISPATCHER / CONTROLADOR CRUD GENERALIZADO
 * =========================================================================================
 */
function apiDispatcher(payload) {
  try {
    const { entidad, accion, datos, id } = payload;
    
    if (!SCHEMA_DEFINITION[entidad]) {
      throw new Error(`Entidad no válida o no registrada: ${entidad}`);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SCHEMA_DEFINITION[entidad].nombreHoja);

    if (!sheet) {
      throw new Error(`La hoja "${entidad}" aún no existe. Por favor ejecute la inicialización del sistema.`);
    }

    switch (accion) {
      case 'LISTAR':
        return { success: true, datos: sheetToObjects(sheet) };
      
      case 'OBTENER_POR_ID':
        const registros = sheetToObjects(sheet);
        const encontrado = registros.find(r => String(r.ID || r.ID_SKU || r.ID_Venta || r.ID_Guia) === String(id));
        return { success: true, datos: encontrado || null };

      case 'CREAR':
        return crearRegistro(sheet, SCHEMA_DEFINITION[entidad].columnas, datos);

      case 'ACTUALIZAR':
        return actualizarRegistro(sheet, SCHEMA_DEFINITION[entidad].columnas, id, datos);

      case 'ELIMINAR':
        return eliminarRegistro(sheet, id);

      case 'RESUMEN_METRICAS':
        return obtenerMetricasGenerales(ss);

      default:
        throw new Error(`Acción desconocida: ${accion}`);
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Convierte el contenido de una hoja de Sheets en un array de Objetos JSON usando la fila 1 como keys
 */
function sheetToObjects(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return rows.map((row, index) => {
    const obj = { _fila: index + 2 };
    headers.forEach((header, colIndex) => {
      let val = row[colIndex];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * Inserta un nuevo registro con ID automático
 */
function crearRegistro(sheet, columnas, datos) {
  const lastRow = sheet.getLastRow();
  const idCol = columnas[0];
  
  // Generar ID si no viene provisto
  if (!datos[idCol]) {
    const prefijo = sheet.getName().slice(0, 3).toUpperCase();
    datos[idCol] = `${prefijo}-${1000 + lastRow}`;
  }

  const filaNueva = columnas.map(col => datos[col] !== undefined ? datos[col] : '');
  sheet.appendRow(filaNueva);

  return {
    success: true,
    mensaje: 'Registro guardado exitosamente.',
    id: datos[idCol]
  };
}

/**
 * Actualiza un registro existente buscando por su ID en la columna 1
 */
function actualizarRegistro(sheet, columnas, id, datos) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error('No hay datos para actualizar.');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const index = ids.indexOf(String(id));

  if (index === -1) {
    throw new Error(`Registro con ID "${id}" no encontrado.`);
  }

  const filaTarget = index + 2;
  const filaExistente = sheet.getRange(filaTarget, 1, 1, columnas.length).getValues()[0];

  const filaActualizada = columnas.map((col, idx) => {
    return datos[col] !== undefined ? datos[col] : filaExistente[idx];
  });

  sheet.getRange(filaTarget, 1, 1, columnas.length).setValues([filaActualizada]);

  return {
    success: true,
    mensaje: `Registro ${id} actualizado correctamente.`
  };
}

/**
 * Elimina una fila por su ID
 */
function eliminarRegistro(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error('No hay datos para eliminar.');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const index = ids.indexOf(String(id));

  if (index === -1) {
    throw new Error(`Registro con ID "${id}" no encontrado.`);
  }

  sheet.deleteRow(index + 2);

  return {
    success: true,
    mensaje: `Registro ${id} eliminado con éxito.`
  };
}

/**
 * Retorna estadísticas consolidadas para el Dashboard
 */
function obtenerMetricasGenerales(ss) {
  const shReservas = ss.getSheetByName('FUTBOL_RESERVAS');
  const shInventario = ss.getSheetByName('INVENTARIO');
  const shVentas = ss.getSheetByName('VENTAS');
  const shLogistica = ss.getSheetByName('LOGISTICA');

  return {
    success: true,
    metricas: {
      totalReservas: shReservas ? Math.max(0, shReservas.getLastRow() - 1) : 0,
      totalInventario: shInventario ? Math.max(0, shInventario.getLastRow() - 1) : 0,
      totalVentas: shVentas ? Math.max(0, shVentas.getLastRow() - 1) : 0,
      totalLogistica: shLogistica ? Math.max(0, shLogistica.getLastRow() - 1) : 0
    }
  };
}
