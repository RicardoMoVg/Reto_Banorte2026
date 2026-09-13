import { z } from 'zod';

/**
 * Schemas del catálogo A2UI-lite (API JSON para el cliente client/).
 *
 * Cada schema es el "data schema" de un item del catálogo — define qué
 * puede/debe elegir el modelo (nunca datos crudos, esos vienen del MCP).
 */
export const schemaProgresoMeta = z.object({
  agregarAInicio: z
    .boolean()
    .optional()
    .describe(
      'true SOLO si el usuario pidio que este componente quede fijo en su pantalla de inicio ' +
        '("ponlo en mi inicio", "quiero verlo siempre", "agregalo a mi tablero"). ' +
        'Una consulta normal ("cuanto gaste?") va SIN esto: el bloque se queda en la ' +
        'conversacion. No lo pongas por tu cuenta -- marcarlo hace que la app le pregunte al ' +
        'usuario si lo agrega, y preguntarle cuando no lo pidio es ruido.',
    ),
  metaId: z
    .string()
    .optional()
    .describe(
      'Id de la meta a mostrar. Si no se especifica, se usa la meta con menor avance.',
    ),
  mensajeAgente: z
    .string()
    .describe('Mensaje breve (una línea) y motivador sobre este avance.'),
});

export const schemaSaldo = z.object({
  agregarAInicio: z
    .boolean()
    .optional()
    .describe(
      'true SOLO si el usuario pidio que este componente quede fijo en su pantalla de inicio ' +
        '("ponlo en mi inicio", "quiero verlo siempre", "agregalo a mi tablero"). ' +
        'Una consulta normal ("cuanto gaste?") va SIN esto: el bloque se queda en la ' +
        'conversacion. No lo pongas por tu cuenta -- marcarlo hace que la app le pregunte al ' +
        'usuario si lo agrega, y preguntarle cuando no lo pidio es ruido.',
    ),
  titulo: z
    .string()
    .describe('Qué representa el monto, ej. "Saldo disponible", "Total del mes".'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

export const schemaTransacciones = z.object({
  agregarAInicio: z
    .boolean()
    .optional()
    .describe(
      'true SOLO si el usuario pidio que este componente quede fijo en su pantalla de inicio ' +
        '("ponlo en mi inicio", "quiero verlo siempre", "agregalo a mi tablero"). ' +
        'Una consulta normal ("cuanto gaste?") va SIN esto: el bloque se queda en la ' +
        'conversacion. No lo pongas por tu cuenta -- marcarlo hace que la app le pregunte al ' +
        'usuario si lo agrega, y preguntarle cuando no lo pidio es ruido.',
    ),
  titulo: z
    .string()
    .describe('Encabezado de la lista, ej. "Últimos movimientos".'),
  limite: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .describe('Cuántos movimientos mostrar. Si no se especifica, se usan 10.'),
  categoria: z
    .string()
    .optional()
    .describe(
      'Filtra solo movimientos de esta categoría, ej. "comida", "suscripciones". Si no se especifica, se muestran todas.',
    ),
  busqueda: z
    .string()
    .optional()
    .describe(
      'Texto para quedarse SOLO con los movimientos que lo mencionen (en su descripción o su ' +
        'categoría). Úsalo cuando el usuario pida UNO en concreto y no la lista entera: ' +
        '"muéstrame solo el cargo de Spotify", "enséñame el pago de la luz". Va el texto tal como ' +
        'lo dijo el usuario — el filtrado lo hace el código, tú nunca escribes el monto. ' +
        'Si además quieres UN solo renglón, manda `limite: 1`.',
    ),
  mensajeAgente: z.string().describe('Observación breve, una línea.'),
});

export const schemaComparativoGastos = z.object({
  agregarAInicio: z
    .boolean()
    .optional()
    .describe(
      'true SOLO si el usuario pidio que este componente quede fijo en su pantalla de inicio ' +
        '("ponlo en mi inicio", "quiero verlo siempre", "agregalo a mi tablero"). ' +
        'Una consulta normal ("cuanto gaste?") va SIN esto: el bloque se queda en la ' +
        'conversacion. No lo pongas por tu cuenta -- marcarlo hace que la app le pregunte al ' +
        'usuario si lo agrega, y preguntarle cuando no lo pidio es ruido.',
    ),
  titulo: z
    .string()
    .describe('Encabezado, ej. "Tus gastos de septiembre".'),
  mensajeAgente: z
    .string()
    .describe('Insight breve sobre el patrón de gasto, una línea.'),
});

/* ------------------------------------------------------------------ *
 * Bloques de ACCIÓN (client/components/chat/)
 *
 * Se distinguen de los de arriba en que el usuario los acepta o rechaza y
 * su respuesta vuelve al agente. Reglas extra para sus schemas:
 *
 * - `etiqueta` es el texto con el que el cliente le avisa al agente de la
 *   decisión ("Acepto <etiqueta>."), así que debe encajar en esa frase y
 *   NO puede traer cifras — el modelo nunca retranscribe un monto
 *   (constitution.md 4.4).
 * - `idAccion` no está aquí a propósito: lo genera la tool, no el modelo.
 * ------------------------------------------------------------------ */

export const schemaPropuestaAhorro = z.object({
  intencion: z
    .enum(['alerta', 'ahorro', 'inversion', 'neutral'])
    .describe(
      'Qué está en juego, NO un color — el cliente lo traduce a su paleta. ' +
        '"alerta": riesgo o urgencia (posible fraude, cargo desconocido, adeudo por vencer). ' +
        '"ahorro": avance hacia una meta (apartar dinero, domiciliar un ahorro). ' +
        '"inversion": compromiso a plazo con rendimiento o riesgo de mercado. ' +
        '"neutral": trámite sin carga emocional (cambiar un dato, activar un aviso). ' +
        'Ante la duda usa "neutral": teñir de rojo algo que no es urgente desgasta la señal.',
    ),
  metaId: z
    .string()
    .optional()
    .describe('Id de la meta para la que se arma el plan. Si se omite, se usa la de menor avance.'),
  plazoMeses: z
    .number()
    .int()
    .min(2)
    .max(24)
    .describe('En cuántos meses se quiere alcanzar la meta. Elige algo realista, 6 o 12 si el usuario no dijo.'),
  titulo: z.string().describe('Encabezado de la propuesta, ej. "Plan para tu fondo de emergencia".'),
  etiqueta: z
    .string()
    .describe(
      'Cómo nombrar esta propuesta dentro de una frase, SIN cifras. ' +
        'Ej. "el plan de ahorro para tu fondo de emergencia" — el cliente lo usa así: "Acepto <etiqueta>."',
    ),
  mensajeAgente: z
    .string()
    .describe('Una línea que explique por qué propones este plan. Sin repetir los números de la tabla.'),
});

export const schemaConfirmarAccion = z.object({
  intencion: z
    .enum(['alerta', 'ahorro', 'inversion', 'neutral'])
    .describe(
      'Qué está en juego, NO un color — el cliente lo traduce a su paleta. ' +
        '"alerta": riesgo o urgencia (posible fraude, cargo desconocido, adeudo por vencer). ' +
        '"ahorro": avance hacia una meta (apartar dinero, domiciliar un ahorro). ' +
        '"inversion": compromiso a plazo con rendimiento o riesgo de mercado. ' +
        '"neutral": trámite sin carga emocional (cambiar un dato, activar un aviso). ' +
        'Ante la duda usa "neutral": teñir de rojo algo que no es urgente desgasta la señal.',
    ),
  titulo: z.string().describe('Qué se va a hacer, ej. "Activar alerta de gastos en comida".'),
  campos: z
    .array(
      z.object({
        idDato: z
          .string()
          .describe(
            'Referencia al dato real, NUNCA el valor. Válidos: "saldo", "meta.actual", ' +
              '"meta.objetivo", "meta.faltante" (la meta de menor avance), o con id explícito: ' +
              '"meta:<id>.actual", "meta:<id>.objetivo", "meta:<id>.faltante".',
          ),
        etiqueta: z.string().describe('Cómo se llama esa fila, ej. "Saldo disponible hoy".'),
      }),
    )
    .max(5)
    .describe('Resumen de lo que el usuario está por aceptar. Si no aplica ningún dato, manda lista vacía.'),
  textoAceptar: z
    .string()
    .optional()
    .describe('Texto del botón afirmativo, ej. "Activar alerta". Por defecto "Aceptar".'),
  resultado: z
    .string()
    .describe('Qué queda configurado al aceptar, en una línea. Se muestra después de aceptar.'),
  advertencia: z
    .string()
    .optional()
    .describe('Algo que convenga saber ANTES de aceptar. Omítelo si no hay nada relevante.'),
  etiqueta: z
    .string()
    .describe('Cómo nombrar esta acción dentro de la frase "Acepto <etiqueta>." SIN cifras.'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

/**
 * Schemas de tools de ESCRITURA (acciones, no solo mostrar). El modelo elige
 * ids por referencia (nunca inventa el valor detrás) y relaya valores que el
 * usuario pidió explícitamente (montos, fechas, descripciones) -- eso no es
 * "inventar un dato financiero" (constitution.md 4.2), es instrucción del
 * usuario. Todas comparten `mensajeAgente` (contrato 4.3).
 */

// --- Metas ---

export const schemaCrearMeta = z.object({
  titulo: z.string().describe('Nombre de la meta, ej. "Fondo de emergencia".'),
  montoObjetivo: z.number().positive().describe('Monto a alcanzar.'),
  montoInicial: z.number().min(0).optional().describe('Con cuánto arranca, si ya tenía algo ahorrado.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaAportarAMeta = z.object({
  metaId: z
    .string()
    .optional()
    .describe('Id de la meta a la que se aporta. Si no se especifica, se usa la meta con menor avance.'),
  monto: z.number().positive().describe('Cantidad a aportar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaArchivarMeta = z.object({
  metaId: z.string().describe('Id de la meta a archivar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Aportaciones programadas ---

export const schemaCrearAportacionProgramada = z.object({
  metaId: z.string().describe('Id de la meta a la que aplica el plan.'),
  monto: z.number().positive().describe('Monto de cada aportación.'),
  periodicidad: z.enum(['semanal', 'quincenal', 'mensual']),
  fechaInicio: z.string().describe('Fecha de la primera aportación (ISO 8601, ej. "2026-10-01").'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarAportacionProgramada = z.object({
  aportacionId: z.string().describe('Id del plan de aportación a cancelar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Banca personal ---

export const schemaCrearTransaccion = z.object({
  cuentaId: z
    .string()
    .optional()
    .describe('Id de la cuenta donde registrar el movimiento. Si no se especifica, se usa la primera cuenta del usuario.'),
  descripcion: z.string().describe('Descripción del movimiento, ej. "Café Starbucks".'),
  monto: z.number().describe('Monto con signo: negativo para gasto, positivo para ingreso.'),
  categoria: z.string().optional().describe('Categoría del movimiento, ej. "comida".'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Inversiones ---

export const schemaMostrarInstrumentos = z.object({
  tipo: z.enum(['accion', 'fondo', 'cetes', 'etf', 'divisa']).optional().describe('Filtra por tipo de instrumento.'),
  riesgo: z.enum(['bajo', 'medio', 'alto']).optional().describe('Filtra por nivel de riesgo.'),
  titulo: z.string().describe('Encabezado, ej. "Instrumentos disponibles".'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaActualizarPerfilInversion = z.object({
  toleranciaRiesgo: z.enum(['conservador', 'moderado', 'agresivo']),
  horizonteAnios: z.number().int().positive(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaComprarPosicion = z.object({
  instrumentoId: z.string().describe('Id del instrumento a comprar (de una consulta previa al catálogo).'),
  cantidad: z.number().positive().describe('Cantidad de unidades a comprar.'),
  precioCompra: z.number().positive().describe('Precio por unidad al que se compra.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaVenderPosicion = z.object({
  posicionId: z.string().describe('Id de la posición a vender.'),
  cantidad: z.number().positive().optional().describe('Cantidad a vender. Si no se especifica, se vende toda la posición.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaHistorialPrecio = z.object({
  instrumentoId: z.string().describe('Id del instrumento cuyo precio se quiere graficar.'),
  horasHaciaAtras: z
    .number()
    .positive()
    .max(24 * 30)
    .optional()
    .describe('Cuántas horas hacia atrás mostrar, ej. 24 para "el último día", 168 para "la última semana". Si no se especifica, se usan 24.'),
  titulo: z.string().describe('Encabezado de la gráfica, ej. "Tendencia del dólar".'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Crédito ---

export const schemaCrearCompraTarjeta = z.object({
  tarjetaId: z
    .string()
    .optional()
    .describe('Id de la tarjeta donde se hizo el cargo. Si no se especifica, se usa la primera tarjeta del usuario.'),
  descripcion: z.string().describe('Descripción de la compra.'),
  monto: z.number().positive(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaDiferirAMsi = z.object({
  compraId: z.string().describe('Id de la compra a diferir.'),
  mesesMsi: z.number().int().positive().describe('A cuántos meses se difiere, ej. 12.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearSolicitudCredito = z.object({
  tipo: z.enum(['personal', 'hipotecario', 'automotriz', 'tarjeta']),
  montoSolicitado: z.number().positive(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarSolicitudCredito = z.object({
  solicitudId: z.string().describe('Id de la solicitud a cancelar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Pagos ---

export const schemaCrearContactoPago = z.object({
  nombre: z.string().describe('Nombre del contacto.'),
  clabe: z.string().optional().describe('CLABE interbancaria, si se conoce.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaDesactivarContactoPago = z.object({
  contactoId: z.string().describe('Id del contacto a desactivar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearTransferencia = z.object({
  nombreContacto: z
    .string()
    .describe('Nombre (o parte del nombre) del contacto guardado al que se transfiere -- nunca un monto ni un id inventado.'),
  monto: z.number().positive(),
  concepto: z.string().optional(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarTransferencia = z.object({
  transferenciaId: z.string().describe('Id de la transferencia a cancelar (solo si sigue pendiente).'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Seguros ---

export const schemaCotizarPoliza = z.object({
  tipo: z.enum(['auto', 'vida', 'gmm', 'hogar']),
  cobertura: z.string().describe('Descripción de la cobertura, ej. "Cobertura amplia".'),
  primaMensual: z.number().positive(),
  vigenciaFin: z.string().describe('Fecha de fin de vigencia (ISO 8601, ej. "2027-06-30").'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaActivarPoliza = z.object({
  polizaId: z.string().describe('Id de la póliza cotizada a activar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCancelarPoliza = z.object({
  polizaId: z.string().describe('Id de la póliza a cancelar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearSiniestro = z.object({
  polizaId: z.string().describe('Id de la póliza activa sobre la que se reporta.'),
  descripcion: z.string().describe('Descripción de lo ocurrido.'),
  montoReclamado: z.number().positive().optional(),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

// --- Educación financiera ---

export const schemaCrearDiagnosticoFinanciero = z.object({
  puntaje: z.number().int().min(0).max(100),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaCrearHabitoFinanciero = z.object({
  habito: z.string().describe('Descripción del hábito, ej. "Ahorro automático semanal".'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaActualizarRachaHabito = z.object({
  habitoId: z.string().describe('Id del hábito.'),
  dias: z.number().int().describe('Días a sumar a la racha (negativo para resetear).'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

export const schemaDesactivarHabito = z.object({
  habitoId: z.string().describe('Id del hábito a desactivar.'),
  mensajeAgente: z.string().describe('Mensaje breve, una línea.'),
});

/**
 * Tarjeta de acción COMPONIBLE: el modelo arma la tarjeta con piezas en vez
 * de pedir una ya hecha (la idea de LEGO). El vocabulario de piezas es el
 * de `client/components/chat/elementos.tsx` — si se agrega una allá, se
 * agrega aquí, en ese orden.
 *
 * Por qué el arreglo es PLANO con campos opcionales y no una unión
 * discriminada de Zod: las uniones anidadas se le atragantan al
 * function-calling de los modelos y terminan en JSON inválido. Un objeto
 * con `elemento` + campos opcionales produce el mismo resultado y el
 * `execute` valida qué campos aplican a cada pieza.
 *
 * Las cifras NO viajan aquí. El modelo elige piezas y referencias
 * (`idDato`, `fuente`); el código hace el lookup contra el MCP e inyecta
 * los valores (constitution.md 4.4).
 */
export const schemaTarjetaAccion = z.object({
  intencion: z
    .enum(['alerta', 'ahorro', 'inversion', 'neutral'])
    .describe(
      'Qué está en juego, NO un color. "alerta": riesgo o urgencia. "ahorro": avance hacia una meta. ' +
        '"inversion": compromiso a plazo. "neutral": trámite. Ante la duda, "neutral".',
    ),
  titulo: z
    .string()
    .describe(
      'Encabezado de la tarjeta, SIN cifras: "Reestructura tu saldo", no ' +
        '"Reestructura tus $18,400". Si el monto debe verse, pídelo como pieza "destacado" — ' +
        'ahí lo inyecta el código desde el MCP en vez de que tú lo escribas.',
    ),
  contenido: z
    .array(
      z.object({
        elemento: z
          .enum(['destacado', 'resumen', 'tabla', 'opciones', 'nota'])
          .describe(
            '"destacado": una cifra grande. "resumen": pares etiqueta/valor. ' +
              '"tabla": comparativo de varias filas. "opciones": alternativas que el usuario elige ' +
              '(si incluyes esta, la tarjeta pedirá elegir una). "nota": una línea de contexto.',
          ),
        idDato: z
          .string()
          .optional()
          .describe(
            'Solo para "destacado". Referencia al dato real, NUNCA el valor. Válidos: "saldo", ' +
              '"meta.actual", "meta.objetivo", "meta.faltante", "tarjeta.saldo", "tarjeta.limite", ' +
              '"tarjeta.disponible", o con id: "meta:<id>.actual".',
          ),
        etiqueta: z.string().optional().describe('Solo para "destacado": cómo se llama esa cifra.'),
        campos: z
          .array(z.object({ idDato: z.string(), etiqueta: z.string() }))
          .optional()
          .describe('Solo para "resumen": las filas, cada una referenciando un idDato válido.'),
        fuente: z
          .enum([
            'planes-pago',
            'instrumentos',
            'metas',
            'polizas',
            'limites-presupuesto',
            'pagos-tarjeta',
          ])
          .optional()
          .describe(
            'Solo para "opciones" y "tabla": de dónde salen las filas. ' +
              '"planes-pago": plazos para reestructurar TODO el saldo de la tarjeta. ' +
              '"instrumentos": opciones de inversión con su rendimiento. ' +
              '"metas": metas de ahorro del usuario. ' +
              '"polizas": seguros contratados y cotizados. ' +
              '"limites-presupuesto": límites sugeridos para una categoría de gasto ' +
              '(requiere `parametro` con la categoría, ej. "comida"). ' +
              '"pagos-tarjeta": cuánto pagar de la tarjeta este mes y qué intereses genera cada opción.',
          ),
        parametro: z
          .string()
          .optional()
          .describe(
            'Dato extra que necesita la fuente. Hoy solo lo usa "limites-presupuesto": ' +
              'la categoría de gasto, ej. "comida", "transporte", "suscripciones".',
          ),
        texto: z.string().optional().describe('Solo para "nota": la línea de texto.'),
        tono: z.enum(['info', 'advertencia']).optional().describe('Solo para "nota".'),
      }),
    )
    .min(1)
    .max(5)
    .describe('Las piezas, en el orden en que se pintan. Arma lo mínimo que responda la pregunta.'),
  textoAccion: z
    .string()
    .optional()
    .describe('Texto del botón, ej. "Aplicar plan", "Invertir". Por defecto "Aceptar"/"Aplicar".'),
  resultado: z.string().describe('Qué queda configurado al aceptar, en una línea.'),
  etiqueta: z
    .string()
    .describe('Cómo nombrar esta acción en la frase "Acepto <etiqueta>." SIN cifras.'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

/**
 * Grafica generica: el modelo elige la FORMA del grafico, no el codigo.
 *
 * Las cinco graficas del catalogo comparten la misma forma de props
 * ({titulo, mensajeAgente, categorias}), asi que una sola tool las
 * alimenta a todas -- el patron de constitution.md 4.4. Sin esto, pedir
 * "una grafica de pie" devolvia barras, porque barras era lo unico
 * registrado.
 */
export const schemaGrafica = z.object({
  componente: z
    .enum(['GraficaPay', 'GraficaDona', 'GraficaBarras', 'GraficaBarrasH', 'GraficaLineas'])
    .describe(
      'Que forma de grafico usar. "GraficaPay": pastel/pie, para ver proporciones de un total. ' +
        '"GraficaDona": dona/semicirculo. "GraficaBarras": barras verticales, para comparar. ' +
        '"GraficaBarrasH": barras horizontales, mejor con nombres largos. ' +
        '"GraficaLineas": linea, para tendencia. Respeta lo que pida el usuario: si dice ' +
        '"pie" o "pastel" usa GraficaPay, si dice "barras" usa GraficaBarras.',
    ),
  titulo: z.string().describe('Encabezado del grafico, ej. "Tus gastos de septiembre".'),
  agregarAInicio: z
    .boolean()
    .optional()
    .describe(
      'true SOLO si el usuario pidio que quede fijo en su pantalla de inicio ' +
        '("agregalo a mi dashboard", "ponlo en mi inicio").',
    ),
  mensajeAgente: z.string().describe('Insight breve sobre lo que se ve, una linea.'),
});

/**
 * Listado generico de lo que el usuario tiene contratado o guardado.
 *
 * Una sola tool para ocho dominios: todos comparten la misma forma de
 * renglon (algo que identifica, un detalle, una cifra, a veces un estado),
 * asi que no hace falta un componente ni una tool por dominio -- patron de
 * constitution.md 4.4. El modelo elige QUE listar; el codigo pone los
 * valores desde el MCP.
 */
export const schemaListado = z.object({
  fuente: z
    .enum([
      'contactos',
      'transferencias',
      'tarjetas',
      'portafolio',
      'polizas',
      'solicitudes',
      'aportaciones',
      'habitos',
      'metas',
      'cuentas',
      'compras-tarjeta',
      'siniestros',
      'diagnostico',
      'perfil-inversion',
    ])
    .describe(
      'Que listar. "contactos": contactos de pago guardados. "transferencias": historial de ' +
        'envios y cobros. "tarjetas": tarjetas de credito con limite y saldo. "portafolio": ' +
        'posiciones de inversion. "polizas": seguros contratados y cotizados. "solicitudes": ' +
        'solicitudes de credito y su estatus. "aportaciones": planes de aportacion programada a ' +
        'metas. "habitos": habitos financieros y su racha. "metas": TODAS las metas de ahorro del ' +
        'usuario (para una sola meta usa mostrarProgresoMeta). "cuentas": cuentas bancarias y su ' +
        'saldo. "compras-tarjeta": compras hechas con tarjeta de credito, a meses o de contado. ' +
        '"siniestros": reclamaciones de seguro y su estatus. "diagnostico": el ultimo diagnostico ' +
        'financiero registrado. "perfil-inversion": tolerancia al riesgo y horizonte de inversion.',
    ),
  titulo: z.string().describe('Encabezado de la lista, ej. "Tus contactos guardados".'),
  filtro: z
    .string()
    .optional()
    .describe(
      'Texto para quedarse SOLO con los renglones que lo mencionen (nombre, concepto, alias, ' +
        'estatus). Es como se responde "muestrame SOLO la transferencia a Juan" o "la de la renta": ' +
        'mandas fuente "transferencias" y filtro "Juan". Va el texto que dijo el usuario; el ' +
        'filtrado lo hace el codigo contra el dato real del MCP.',
    ),
  limite: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .describe(
      'Cuantos renglones mostrar, ya filtrados. Manda 1 cuando el usuario pida UN solo dato ' +
        '("solo la ultima transferencia", "nada mas mi tarjeta principal").',
    ),
  agregarAInicio: z
    .boolean()
    .optional()
    .describe('true SOLO si el usuario pidio que quede fijo en su pantalla de inicio.'),
  mensajeAgente: z.string().describe('Observacion breve sobre la lista, una linea.'),
});

/* ------------------------------------------------------------------ *
 * Layout del tablero y accesos rapidos
 *
 * Estas dos NO traen dato financiero: una acomoda widgets que el usuario
 * ya habia fijado, la otra crea un boton. Aun asi siguen la misma regla de
 * `constitution.md` 4.4 -- el modelo elige POR REFERENCIA (el id del
 * widget, el nombre del contacto), nunca por valor.
 * ------------------------------------------------------------------ */

/**
 * Reacomodo del tablero de Inicio.
 *
 * El servidor no guarda el tablero (vive en el cliente, ver
 * `client/lib/a2ui/TableroProvider.tsx`): la lista de widgets llega en cada
 * request y esta tool solo valida contra ella. Por eso el modelo referencia
 * widgets por el `id` que le dieron, no por uno que invente.
 */
export const schemaAcomodarTablero = z.object({
  ajustes: z
    .array(
      z.object({
        id: z
          .string()
          .describe(
            'Cual widget mover. Se vale cualquiera de las tres formas que trae la lista ' +
              '"Tablero actual" del contexto: su numero de posicion ("2"), su id, o su titulo ' +
              '("Saldo disponible"). El numero es el mas seguro -- copiar un id largo se presta ' +
              'a equivocarse de widget. Lo que NO se vale es inventar una referencia que no este ' +
              'en esa lista.',
          ),
        mover: z
          .enum(['arriba', 'abajo', 'inicio', 'final'])
          .optional()
          .describe(
            'Como cambiar su lugar en la columna. "arriba"/"abajo": una posicion. ' +
              '"inicio": hasta arriba del tablero. "final": hasta abajo.',
          ),
        ancho: z
          .enum(['completo', 'medio'])
          .optional()
          .describe(
            'Que tanto ocupa a lo ancho. "completo": toda la fila (es el tamano por defecto). ' +
              '"medio": la mitad, para que quepan dos widgets lado a lado. Usa "medio" cuando el ' +
              'usuario lo pida mas chico o lo quiera a un lado.',
          ),
        lado: z
          .enum(['izquierda', 'derecha'])
          .optional()
          .describe(
            'De que lado queda cuando es "medio". Solo aplica con ancho "medio": un widget ' +
              'completo ocupa la fila entera y no tiene lado. Si el usuario dice "hazlo mas ' +
              'chico a la derecha", manda ancho "medio" Y lado "derecha".',
          ),
      }),
    )
    .min(1)
    .max(5)
    .describe('Un ajuste por widget que se mueve. Solo los que cambian, no todo el tablero.'),
  mensajeAgente: z.string().describe('Confirmacion breve de lo que acomodaste, una linea.'),
});

/**
 * Boton de acceso rapido: un atajo de un toque que el usuario fija en su
 * Inicio ("ponme un boton para transferirle a mi mama").
 *
 * El boton NO mueve dinero al tocarse: dispara la peticion en la
 * conversacion y el usuario confirma en la tarjeta de siempre. Ver
 * `client/components/AccesoRapido.tsx`.
 */
export const schemaAccesoRapido = z.object({
  accion: z
    .enum(['transferencia', 'consulta'])
    .describe(
      '"transferencia": el boton prepara un envio a un contacto guardado (manda ' +
        '`nombreContacto`, y `monto` si el usuario dijo cuanto). ' +
        '"consulta": el boton le vuelve a preguntar algo al asistente (manda `pregunta`).',
    ),
  nombreContacto: z
    .string()
    .optional()
    .describe(
      'Solo para "transferencia": nombre (o parte) del contacto guardado. Se valida contra los ' +
        'contactos reales -- si no existe, guardalo antes con `crearContactoPago`.',
    ),
  monto: z
    .number()
    .positive()
    .optional()
    .describe(
      'Solo para "transferencia": cuanto va a enviar el boton, si el usuario ya lo dijo ' +
        '("un boton para mandarle 500 a Ana"). Dejalo vacio si no dijo cantidad: el boton ' +
        'entonces pregunta el monto al tocarse.',
    ),
  concepto: z.string().optional().describe('Solo para "transferencia": el concepto, si lo dijo.'),
  pregunta: z
    .string()
    .optional()
    .describe(
      'Solo para "consulta": la pregunta que el boton le manda al asistente, redactada como si ' +
        'la escribiera el usuario, ej. "¿cual es mi saldo disponible?".',
    ),
  titulo: z
    .string()
    .describe('Texto del boton, corto y en imperativo, ej. "Transferir a Ana", "Ver mi saldo".'),
  icono: z
    .enum(['transferir', 'persona', 'saldo', 'grafica', 'meta', 'tarjeta', 'rayo'])
    .optional()
    .describe(
      'Que icono le queda. Mandas el NOMBRE de la idea, no el icono: el cliente decide con que ' +
        'lo dibuja. Por defecto "rayo".',
    ),
  mensajeAgente: z.string().describe('Contexto breve sobre el atajo, una linea.'),
});
