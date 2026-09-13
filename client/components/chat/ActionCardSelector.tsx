import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAcciones } from '../../lib/a2ui/AccionesProvider';
import { conAlfa, textoSobre } from '../../lib/ui/contraste';
import { COLOR_INTENCION, colores, espacio, radio, tipografia } from '../../lib/ui/theme';
import { AcuseDeAccion } from './AcuseDeAccion';
import type { PropsDeAccion } from './tipos';

export interface OpcionSeleccionable {
  id: string;
  /** Etiqueta corta de la opción: "28 días", "Recomendado", "Semanal". */
  tituloOpcion: string;
  /** Qué implica elegirla, en una línea. */
  subtitulo?: string;
  /**
   * La cifra de la opción, YA FORMATEADA como texto por el servidor
   * ("+$412", "$1,850 al mes").
   *
   * Es string y no number a propósito: aquí caben rendimientos, comisiones
   * y límites con formatos distintos, y quien tiene el dato real decide
   * cómo se escribe. El modelo nunca la redacta — sale de una tool del MCP
   * (constitution.md 4.2).
   */
  valorDestacado?: string;
  /**
   * Advertencia de esta opción en particular, ej. el pago mínimo de una
   * tarjeta: se puede elegir, pero conviene saber qué cuesta.
   */
  advertencia?: string;
}

export interface ActionCardSelectorProps extends PropsDeAccion {
  titulo: string;
  opciones: OpcionSeleccionable[];
  /** Texto del botón. Por defecto "Aplicar". */
  textoAplicar?: string;
  /** Qué queda configurado al aplicar. Se muestra ya resuelta la tarjeta. */
  resultado: string;
  /**
   * Handler directo. Normalmente NO se pasa: los bloques nacen de un JSON
   * que llegó por la red y una función no se puede serializar, así que el
   * handler real llega por contexto (`lib/a2ui/AccionesProvider.tsx`).
   * Está aquí para montar el componente suelto en pruebas o en un catálogo
   * visual, sin provider alrededor.
   */
  onAplicar?: (opcionSeleccionada: string) => void;
  mensajeAgente: string;
}

/**
 * Plantilla universal de las Action Cards con opciones: un título, una
 * lista vertical de alternativas excluyentes y un botón que aplica la
 * elegida.
 *
 * Cubre los casos donde el agente no propone UNA cosa sino un abanico —
 * plazos de inversión, meses sin intereses, niveles de presupuesto,
 * coberturas de seguro, ritmos de aportación. En vez de un componente por
 * producto, el servidor manda las opciones ya resueltas y este las pinta.
 *
 * ## Decisiones de diseño que conviene no "arreglar" después
 *
 * - **La selección no se comunica solo con color.** La opción activa cambia
 *   borde, fondo, peso tipográfico y suma una palomita. Con color solamente,
 *   quien no distingue el rojo del gris no sabría qué eligió (WCAG 1.4.1).
 * - **Semántica de radio aunque no haya círculo.** El grupo es `radiogroup`
 *   y cada opción `radio` con su `checked`: sin eso, un lector de pantalla
 *   anuncia cinco botones sueltos y no "opción 2 de 3, seleccionada".
 * - **El borde mide siempre 2px.** Cambiar el grosor al seleccionar movería
 *   el contenido un pixel y la lista "brincaría" al elegir.
 * - **El botón nace deshabilitado.** Aplicar sin elegir no tiene un default
 *   seguro: en una tarjeta de "bloqueo de seguridad", adivinar es peor que
 *   no hacer nada.
 */
export function ActionCardSelector({
  idAccion,
  etiqueta,
  intencion = 'neutral',
  titulo,
  opciones,
  textoAplicar = 'Aplicar',
  resultado,
  onAplicar,
  mensajeAgente,
}: ActionCardSelectorProps) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const acciones = useAcciones();

  const color = COLOR_INTENCION[intencion];
  const estado = acciones?.estadoDe(idAccion) ?? 'pendiente';

  if (estado !== 'pendiente') {
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>{titulo}</Text>
        <AcuseDeAccion estado={estado} resultado={resultado} />
      </View>
    );
  }

  function aplicar() {
    if (!seleccionada) return;

    const opcion = opciones.find((o) => o.id === seleccionada);
    if (!opcion) return;

    if (onAplicar) {
      onAplicar(seleccionada);
      return;
    }

    // Al agente le llega qué eligió el usuario, en texto que él mismo
    // redactó — nunca una cifra (constitution.md 4.4).
    acciones?.responder(idAccion, 'aceptada', `${etiqueta}: ${opcion.tituloOpcion}`);
  }

  const puedeAplicar = seleccionada !== null;

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View
        style={styles.opciones}
        accessibilityRole="radiogroup"
        accessibilityLabel={titulo}
      >
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
              onPress={() => setSeleccionada(opcion.id)}
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

      <Text style={styles.mensaje}>{mensajeAgente}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={textoAplicar}
        accessibilityState={{ disabled: !puedeAplicar }}
        accessibilityHint={puedeAplicar ? undefined : 'Elige una opción para continuar'}
        onPress={aplicar}
        disabled={!puedeAplicar}
        style={({ pressed }) => [
          styles.aplicar,
          { backgroundColor: color, borderColor: color },
          !puedeAplicar && styles.aplicarInactivo,
          pressed && styles.presionado,
        ]}
      >
        <Text style={[styles.aplicarTexto, { color: textoSobre(color) }]}>{textoAplicar}</Text>
        <Ionicons name="arrow-forward" size={16} color={textoSobre(color)} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    padding: espacio.lg,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: colores.texto, lineHeight: 22 },

  opciones: { gap: espacio.sm, marginTop: espacio.lg },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    // Constante en los dos estados: si cambiara al seleccionar, la lista
    // se movería un pixel en cada toque.
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

  mensaje: { ...tipografia.pie, marginTop: espacio.md, color: colores.textoApoyo },

  aplicar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    marginTop: espacio.md,
    borderWidth: 1,
    borderRadius: radio.sm,
    paddingVertical: espacio.md,
  },
  aplicarInactivo: { opacity: 0.35 },
  aplicarTexto: { fontSize: 14, fontWeight: '700' },
  presionado: { opacity: 0.8 },
});
