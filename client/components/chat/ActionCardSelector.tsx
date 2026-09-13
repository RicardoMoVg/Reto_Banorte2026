import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAcciones } from '../../lib/a2ui/AccionesProvider';
import { textoSobre } from '../../lib/ui/contraste';
import { COLOR_INTENCION, colores, espacio, radio, tipografia } from '../../lib/ui/theme';
import { AcuseDeAccion } from './AcuseDeAccion';
import { ListaOpciones, type OpcionSeleccionable } from './elementos';
import type { PropsDeAccion } from './tipos';

export type { OpcionSeleccionable };

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

      <View style={styles.opciones}>
        <ListaOpciones
          opciones={opciones}
          color={color}
          seleccionada={seleccionada}
          onSeleccionar={setSeleccionada}
          etiquetaGrupo={titulo}
        />
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

  opciones: { marginTop: espacio.lg },

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
