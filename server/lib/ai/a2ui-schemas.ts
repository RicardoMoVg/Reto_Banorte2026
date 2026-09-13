import { z } from 'zod';

/**
 * Schemas del catálogo A2UI-lite (API JSON para el cliente client/).
 *
 * Cada schema es el "data schema" de un item del catálogo — define qué
 * puede/debe elegir el modelo (nunca datos crudos, esos vienen del MCP).
 */
export const schemaProgresoMeta = z.object({
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
  titulo: z
    .string()
    .describe('Qué representa el monto, ej. "Saldo disponible", "Total del mes".'),
  mensajeAgente: z.string().describe('Contexto breve, una línea.'),
});

export const schemaTransacciones = z.object({
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
  mensajeAgente: z.string().describe('Observación breve, una línea.'),
});

export const schemaComparativoGastos = z.object({
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
          .enum(['planes-pago', 'instrumentos', 'metas'])
          .optional()
          .describe(
            'Solo para "opciones" y "tabla": de dónde salen las filas. "planes-pago": plazos de ' +
              'reestructura de la tarjeta. "instrumentos": opciones de inversión. "metas": metas de ahorro.',
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
