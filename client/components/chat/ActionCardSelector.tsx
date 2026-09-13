import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAcciones } from '../../lib/a2ui/AccionesProvider';
import { useTableroOpcional } from '../../lib/a2ui/TableroProvider';
import { textoSobre } from '../../lib/ui/contraste';
import {
  COLOR_INTENCION,
  colores,
  espacio,
  radio,
  tipografia,
  type Intencion,
} from '../../lib/ui/theme';
import { AcuseDeAccion } from './AcuseDeAccion';
import { ListaOpciones, type OpcionSeleccionable } from './elementos';
import type { PropsDeAccion } from './tipos';

export type { OpcionSeleccionable };

/**
 * Lo que viaja al dashboard cuando el usuario aplica una opción: la
 * "metamorfosis" de una tarjeta de decisión a un widget de compromiso.
 *
 * Va TIPADO y no como `any` a propósito. Es el contrato entre esta tarjeta
 * y el tablero, y el tablero acabará persistiéndolo en Postgres
 * (`dashboard_widgets`): si la forma es `any`, el día que alguien cambie un
 * campo aquí nada avisa y el widget se rompe en silencio. Un handler
 * declarado `(d: any) => void` sigue siendo asignable a esta prop, así que
 * tipar no le cierra la puerta a nadie.
 *
 * Ojo con `valorDestacado`: es un string ya formateado por el servidor, no
 * un número. Esta tarjeta nunca calcula ni reformatea cifras
 * (`constitution.md` 4.2) — solo las pasa tal cual las recibió.
 */
export interface DatosDashboard {
  /** Id de la acción que originó el compromiso. Evita anclarlo dos veces. */
  idAccion: string;
  /** Cómo nombrar el compromiso dentro de una frase, sin cifras. */
  etiqueta: string;
  /** Título de la tarjeta que lo propuso. */
  titulo: string;
  intencion: Intencion;
  /** La opción elegida, resumida. */
  opcion: {
    id: string;
    tituloOpcion: string;
    subtitulo?: string;
    valorDestacado?: string;
  };
  /** ISO del momento en que se aplicó. */
  fechaISO: string;
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
  /**
   * Se dispara al aplicar, con el resumen de lo elegido, para que la app
   * ancle el compromiso como widget en Inicio ("metamorfosis al
   * dashboard").
   *
   * Es opcional y tiene un camino por defecto: sin él, la tarjeta ancla
   * ella misma vía `<TableroProvider>`. La prop existe para cuando la app
   * quiera decidir otra cosa (mandarlo al backend, pedir confirmación
   * extra, no anclar nada). Si se pasa, gana sobre el anclado automático:
   * no tendría sentido que la app tomara el control y además se anclara
   * por su cuenta.
   */
  onSuccessPin?: (datosDashboard: DatosDashboard) => void;
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
  onSuccessPin,
  mensajeAgente,
}: ActionCardSelectorProps) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const acciones = useAcciones();
  const tablero = useTableroOpcional();

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

    // 1. Resolver la tarjeta. Esto pasa SIEMPRE, con o sin handlers: es lo
    //    que la deja en estado resuelto y le avisa al agente.
    if (onAplicar) {
      onAplicar(seleccionada);
    } else {
      // Al agente le llega qué eligió el usuario, en texto que él mismo
      // redactó — nunca una cifra (constitution.md 4.4).
      acciones?.responder(idAccion, 'aceptada', `${etiqueta}: ${opcion.tituloOpcion}`);
    }

    // 2. Metamorfosis al dashboard: el compromiso se vuelve un widget.
    const datosDashboard: DatosDashboard = {
      idAccion,
      etiqueta,
      titulo,
      intencion,
      opcion: {
        id: opcion.id,
        tituloOpcion: opcion.tituloOpcion,
        subtitulo: opcion.subtitulo,
        valorDestacado: opcion.valorDestacado,
      },
      fechaISO: new Date().toISOString(),
    };

    if (onSuccessPin) {
      onSuccessPin(datosDashboard);
      return;
    }

    // Sin handler, la tarjeta ancla sola si hay tablero alrededor. Misma
    // lógica que `onAplicar` con AccionesProvider: la prop es el override,
    // el contexto es el camino normal — un componente que nace de un JSON
    // de red no puede recibir funciones.
    tablero?.anclar({
      id: `compromiso-${idAccion}`,
      nombre: 'WidgetCompromiso',
      props: {
        titulo,
        opcion: opcion.tituloOpcion,
        detalle: opcion.subtitulo,
        valor: opcion.valorDestacado,
        intencion,
        fechaISO: datosDashboard.fechaISO,
        mensajeAgente: resultado,
      },
    });
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
