/**
 * Tokens de diseño de Banortech — la única fuente de verdad de color,
 * espaciado, radio y tipografía del cliente.
 *
 * Por qué existe: `components/` (los bloques A2UI) y `app/` (las ventanas)
 * los escriben personas distintas en ramas distintas (ver constitution.md
 * sección 5). Si cada quien hardcodea sus hex, la UI generada por el agente
 * se ve como un injerto dentro de la app. Importando de aquí, un bloque
 * nuevo hereda el look sin coordinar nada.
 */

export const colores = {
  /**
   * Azul profundo de la marca. Es el color primario sobre superficies
   * CLARAS: texto de acciones, iconos activos, relleno de botones sobre
   * blanco.
   */
  marca: '#060761',
  /**
   * Menta de la marca. Es el relleno de la acción principal sobre fondos
   * OSCUROS (el degradado del login) y el acento de progreso.
   *
   * Nunca lleva texto blanco encima: blanco sobre menta da 1.5:1 de
   * contraste, muy por debajo del mínimo de 4.5:1 de WCAG AA. El único
   * color legible encima es `textoSobreAcento` (8.6:1).
   */
  acento: '#41FFA7',
  /** Tinte del acento, para fondos de burbujas/estados activos. */
  marcaSuave: '#E6FFF3',
  /** Único color aprobado para texto/iconos encima de `acento`. */
  textoSobreAcento: '#060761',

  texto: '#171717',
  textoSecundario: '#525252',
  /** Texto de apoyo (notas, mensajeAgente). 4.7:1 sobre blanco: pasa AA. */
  textoApoyo: '#737373',
  /**
   * Gris decorativo: placeholders, iconos, bordes de estado vacío. Da 2.5:1
   * sobre blanco, así que NO se usa para texto que haya que leer — para eso
   * está `textoApoyo`.
   */
  textoTenue: '#A3A3A3',
  textoInverso: '#FFFFFF',

  /** Fondo de la app. Las tarjetas van en `superficie` para despegarse. */
  fondo: '#FAFAFA',
  superficie: '#FFFFFF',
  superficieSutil: '#F5F5F5',

  borde: '#E5E5E5',
  bordeSutil: '#F0F0F0',

  positivo: '#059669',
  /**
   * Rosa de alerta para el degradado (bordes e iconos de campo inválido).
   * NO se usa para el texto del error: sobre el tramo medio del degradado
   * se queda en ~3:1, por debajo del 4.5:1 que pide WCAG AA para texto. El
   * mensaje va en blanco y el color solo acompaña — el error igual se
   * comunica con icono y texto, nunca solo por color (WCAG 1.4.1).
   */
  alerta: '#FFC1C9',
} as const;

/**
 * Fondo de las pantallas de marca (login y, más adelante, onboarding):
 * menta arriba, azul profundo abajo.
 *
 * El stop de en medio (#238384) es exactamente la interpolación entre los
 * dos extremos — está escrito explícito solo para poder sesgar dónde cae
 * con `ubicacionesDegradado`, no para meter un tercer color a la paleta.
 */
export const degradadoMarca = ['#41FFA7', '#238384', '#060761'] as const;

/** Sesga el degradado: el tercio inferior queda ya en azul sólido. */
export const ubicacionesDegradado = [0, 0.55, 1] as const;

/**
 * Superficie translúcida sobre el degradado ("glassmorphism").
 *
 * Es color con alpha, no desenfoque real: `expo-blur` daría el efecto
 * completo pero es otra dependencia nativa y en Android su soporte sigue
 * siendo irregular. Sobre un degradado de este contraste la diferencia se
 * nota poco, así que no se justifica todavía.
 */
export const vidrio = {
  fondo: 'rgba(255, 255, 255, 0.10)',
  borde: 'rgba(255, 255, 255, 0.22)',
  /** Campos de formulario: más oscuros que la tarjeta, como en el diseño. */
  campo: 'rgba(6, 7, 97, 0.28)',
  campoBorde: 'rgba(255, 255, 255, 0.18)',
  /** Placeholder/texto de apoyo sobre el degradado. */
  textoTenue: 'rgba(255, 255, 255, 0.55)',
} as const;

/**
 * Intención semántica de una acción transaccional: qué está en juego, no
 * cómo se ve. El agente la elige al proponer la acción y la UI la traduce
 * a color — así el modelo decide el SIGNIFICADO y el cliente sigue siendo
 * el dueño del diseño, que es el punto de A2UI (constitution.md 2).
 */
export type Intencion = 'alerta' | 'ahorro' | 'inversion' | 'neutral';

/**
 * Color del botón de ejecución por intención.
 *
 * Estos colores NO son la paleta de marca (`colores.marca` / `acento`):
 * son señales semánticas, del mismo tipo que `colores.positivo`. La marca
 * sigue viviendo en el resto de la tarjeta — encabezado, tipografía,
 * superficies — y solo el botón principal se tiñe, para que el rojo de
 * alerta signifique "cuidado" y no "cambiamos de marca".
 *
 * ⚠️ No fijes el color del texto encima a mano: `#10B981` con blanco da
 * 2.54:1 y reprueba WCAG AA. Usa `textoSobre()` de `contraste.ts`, que lo
 * calcula por luminancia.
 */
export const COLOR_INTENCION: Record<Intencion, string> = {
  /** Riesgo o urgencia: fraude, cargo desconocido, adeudo por vencer. */
  alerta: '#EB0029',
  /** Progreso hacia una meta: apartar, domiciliar un ahorro. */
  ahorro: '#10B981',
  /** Compromiso a plazo con rendimiento o riesgo de mercado. */
  inversion: '#1D4ED8',
  /** Trámite sin carga emocional: cambiar un dato, activar un aviso. */
  neutral: '#374151',
};

/** Escala de 4pt. Usar siempre estos, no números sueltos. */
export const espacio = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  completo: 999,
} as const;

export const tipografia = {
  titulo: { fontSize: 22, fontWeight: '700', color: colores.texto },
  subtitulo: { fontSize: 16, fontWeight: '700', color: colores.texto },
  etiqueta: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoSecundario,
  },
  cuerpo: { fontSize: 14, color: colores.texto },
  cuerpoSecundario: { fontSize: 13, color: colores.textoSecundario, lineHeight: 18 },
  pie: { fontSize: 12, color: colores.textoApoyo, lineHeight: 16 },
} as const;

/**
 * Ancho máximo de contenido. En web (react-native-web) la ventana puede ser
 * de 1920px y una tarjeta estirada a todo lo ancho se ve rota; en teléfono
 * este valor nunca se alcanza, así que no cambia nada ahí.
 */
export const ANCHO_MAXIMO = 480;

/** Ancho máximo de un formulario centrado (login). Más angosto que una
 *  pantalla de contenido: un campo de 480px de ancho se ve mal en web. */
export const ANCHO_FORMULARIO = 380;
