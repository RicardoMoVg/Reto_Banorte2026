import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { conAlfa } from '../../lib/ui/contraste';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';

/**
 * Vocabulario de piezas con las que el agente arma una tarjeta de acción.
 *
 * ## La idea de LEGO, y su límite
 *
 * En vez de una tool por tarjeta ya armada, el agente elige QUÉ piezas
 * necesita y en qué orden. Lo importante es que esto sigue siendo dato
 * declarativo dentro de `props`: no cambia el protocolo (`constitution.md`
 * 4.1 sigue intacto, es un `surface` con `{tipo, props}`) y no se parece a
 * mandar JSX, que es lo que la sección 6 prohíbe.
 *
 * Tres reglas que mantienen esto como LEGO y no como un lenguaje:
 *
 * 1. **Un solo nivel.** Las piezas no anidan piezas. En cuanto se permite
 *    recursión, el JSON se vuelve un árbol de render y el cliente deja de
 *    ser dueño del diseño.
 * 2. **Enum cerrado.** El modelo escoge de esta lista; no puede inventar
 *    una pieza. Si hace falta una nueva, se agrega aquí y en el schema de
 *    `server/`, en ese orden.
 * 3. **Los valores son strings ya formateados por el servidor.** El modelo
 *    elige la pieza y redacta las etiquetas; las cifras las inyecta el
 *    código desde el MCP (`constitution.md` 4.2 y 4.4).
 */

export interface OpcionSeleccionable {
  id: string;
  /** Etiqueta corta: "28 días", "Recomendado", "12 meses". */
  tituloOpcion: string;
  /** Qué implica elegirla, en una línea. */
  subtitulo?: string;
  /** La cifra de la opción, ya formateada por el servidor ("+$412"). */
  valorDestacado?: string;
  /** Algo que conviene saber antes de elegir ESTA opción. */
  advertencia?: string;
}

export interface RenglonTabla {
  celdas: string[];
  /** 0-100. Con esto, el renglón pinta una barra de avance. */
  avance?: number;
}

export type ElementoContenido =
  /** Una cifra grande con su etiqueta. Para el dato que manda en la tarjeta. */
  | { elemento: 'destacado'; etiqueta: string; valor: string; nota?: string }
  /** Pares etiqueta/valor. Para "qué vas a aceptar". */
  | { elemento: 'resumen'; filas: { etiqueta: string; valor: string }[] }
  /** Tabla con encabezados. Para proyecciones y calendarios. */
  | { elemento: 'tabla'; columnas: string[]; renglones: RenglonTabla[] }
  /** Alternativas excluyentes. Si hay una, la tarjeta exige elegir. */
  | { elemento: 'opciones'; opciones: OpcionSeleccionable[] }
  /** Una línea de contexto o de advertencia. */
  | { elemento: 'nota'; texto: string; tono?: 'info' | 'advertencia' };

/** Renderiza una pieza. El orden lo decide quien arma el arreglo. */
export function Elemento({
  contenido,
  color,
  seleccionada,
  onSeleccionar,
}: {
  contenido: ElementoContenido;
  /** Color de la intención de la tarjeta. */
  color: string;
  seleccionada?: string | null;
  onSeleccionar?: (id: string) => void;
}) {
  switch (contenido.elemento) {
    case 'destacado':
      return (
        <View style={styles.destacado}>
          <Text style={styles.destacadoEtiqueta}>{contenido.etiqueta}</Text>
          <Text style={[styles.destacadoValor, { color }]}>{contenido.valor}</Text>
          {contenido.nota ? <Text style={styles.destacadoNota}>{contenido.nota}</Text> : null}
        </View>
      );

    case 'resumen':
      return (
        <View style={styles.resumen}>
          {contenido.filas.map((f) => (
            <View key={f.etiqueta} style={styles.filaResumen}>
              <Text style={styles.filaEtiqueta} numberOfLines={1}>
                {f.etiqueta}
              </Text>
              <Text style={styles.filaValor} numberOfLines={1}>
                {f.valor}
              </Text>
            </View>
          ))}
        </View>
      );

    case 'tabla':
      return (
        <View>
          <View style={styles.tablaEncabezado}>
            {contenido.columnas.map((c, i) => (
              <Text key={c} style={[styles.celdaEncabezado, i > 0 && styles.celdaDerecha]}>
                {c}
              </Text>
            ))}
          </View>

          {contenido.renglones.map((r) => (
            <View key={r.celdas.join('|')} style={styles.renglon}>
              {r.celdas.map((celda, i) => (
                <Text
                  key={i}
                  style={[styles.celda, i > 0 && styles.celdaDerecha, i > 0 && styles.celdaFuerte]}
                  numberOfLines={1}
                >
                  {celda}
                </Text>
              ))}
              {typeof r.avance === 'number' ? (
                <View style={styles.pista}>
                  <View
                    style={[
                      styles.relleno,
                      { width: `${Math.min(100, Math.max(0, r.avance))}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      );

    case 'opciones':
      return (
        <ListaOpciones
          opciones={contenido.opciones}
          color={color}
          seleccionada={seleccionada ?? null}
          onSeleccionar={onSeleccionar ?? (() => {})}
        />
      );

    case 'nota':
      return (
        <View style={styles.nota}>
          <Ionicons
            name={contenido.tono === 'advertencia' ? 'alert-circle-outline' : 'information-circle-outline'}
            size={15}
            color={colores.textoApoyo}
          />
          <Text style={styles.notaTexto}>{contenido.texto}</Text>
        </View>
      );
  }
}

/**
 * Lista de alternativas excluyentes.
 *
 * Se exporta aparte porque la usan la tarjeta componible y
 * `ActionCardSelector`: una sola implementación del comportamiento de
 * radio, no dos que se separen con el tiempo.
 *
 * Decisiones que conviene no "arreglar" después:
 * - **La selección no se comunica solo con color** (borde, fondo, peso y
 *   palomita). Con color solamente, quien no lo distingue no sabría qué
 *   eligió (WCAG 1.4.1).
 * - **Semántica de radio aunque no haya círculo**: sin `radiogroup`/`radio`
 *   un lector de pantalla anuncia botones sueltos, no "opción 2 de 3".
 * - **El borde mide siempre 2px**: si cambiara al seleccionar, la lista
 *   brincaría un pixel en cada toque.
 */
export function ListaOpciones({
  opciones,
  color,
  seleccionada,
  onSeleccionar,
  etiquetaGrupo,
}: {
  opciones: OpcionSeleccionable[];
  color: string;
  seleccionada: string | null;
  onSeleccionar: (id: string) => void;
  etiquetaGrupo?: string;
}) {
  return (
    <View style={styles.opciones} accessibilityRole="radiogroup" accessibilityLabel={etiquetaGrupo}>
      {opciones.map((opcion) => {
        const activa = opcion.id === seleccionada;

        return (
          <Pressable
            key={opcion.id}
            accessibilityRole="radio"
            // `aria-checked` y no `accessibilityState={{checked}}`:
            // react-native-web 0.21 no traduce el segundo a ARIA, y RN
            // acepta los props `aria-*` en nativo desde 0.71.
            aria-checked={activa}
            accessibilityLabel={[opcion.tituloOpcion, opcion.subtitulo, opcion.valorDestacado]
              .filter(Boolean)
              .join('. ')}
            onPress={() => onSeleccionar(opcion.id)}
            style={({ pressed }) => [
              styles.opcion,
              activa
                ? { borderColor: color, backgroundColor: conAlfa(color, 0.08) }
                : styles.opcionInactiva,
              pressed && !activa && styles.opcionPresionada,
            ]}
          >
            <View style={styles.opcionTexto}>
              <View style={styles.opcionTitulo}>
                {activa ? <Ionicons name="checkmark-circle" size={16} color={color} /> : null}
                <Text style={[styles.tituloOpcion, activa && { color }]} numberOfLines={1}>
                  {opcion.tituloOpcion}
                </Text>
              </View>

              {opcion.subtitulo ? (
                <Text style={styles.subtitulo} numberOfLines={2}>
                  {opcion.subtitulo}
                </Text>
              ) : null}

              {opcion.advertencia ? (
                <View style={styles.advertencia}>
                  <Ionicons name="alert-circle-outline" size={13} color={colores.textoApoyo} />
                  <Text style={styles.advertenciaTexto} numberOfLines={2}>
                    {opcion.advertencia}
                  </Text>
                </View>
              ) : null}
            </View>

            {opcion.valorDestacado ? (
              <Text style={[styles.valor, activa && { color }]} numberOfLines={1}>
                {opcion.valorDestacado}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  destacado: {
    borderRadius: radio.sm,
    backgroundColor: colores.superficieSutil,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  destacadoEtiqueta: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoApoyo,
  },
  destacadoValor: { fontSize: 24, fontWeight: '700' },
  destacadoNota: { ...tipografia.pie, marginTop: 2 },

  resumen: {
    borderRadius: radio.sm,
    backgroundColor: colores.superficieSutil,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    paddingVertical: espacio.sm,
  },
  filaEtiqueta: { flexShrink: 1, fontSize: 12, color: colores.textoSecundario },
  filaValor: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colores.texto },

  tablaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingBottom: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  celdaEncabezado: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colores.textoApoyo,
  },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espacio.sm,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSutil,
  },
  celda: { flex: 1, fontSize: 12, color: colores.textoSecundario },
  celdaDerecha: { textAlign: 'right' },
  celdaFuerte: { fontWeight: '600', color: colores.texto },
  pista: {
    width: '100%',
    height: 6,
    borderRadius: radio.completo,
    backgroundColor: colores.marcaSuave,
    overflow: 'hidden',
  },
  relleno: { height: '100%', borderRadius: radio.completo },

  opciones: { gap: espacio.sm },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    borderWidth: 2,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  opcionInactiva: { borderColor: colores.borde, backgroundColor: colores.superficie },
  opcionPresionada: { backgroundColor: colores.superficieSutil },
  opcionTexto: { flexShrink: 1, gap: 2 },
  opcionTitulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  tituloOpcion: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colores.texto },
  subtitulo: { ...tipografia.pie, color: colores.textoApoyo },
  advertencia: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, marginTop: 2 },
  advertenciaTexto: { flexShrink: 1, fontSize: 11, lineHeight: 15, color: colores.textoApoyo },
  valor: { fontSize: 15, fontWeight: '700', color: colores.texto, textAlign: 'right' },

  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.sm },
  notaTexto: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: colores.textoSecundario },
});
