import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAcciones } from '../../lib/a2ui/AccionesProvider';
import { textoSobre } from '../../lib/ui/contraste';
import { COLOR_INTENCION, colores, espacio, radio, tipografia } from '../../lib/ui/theme';
import { AcuseDeAccion } from './AcuseDeAccion';
import { Elemento, type ElementoContenido } from './elementos';
import { PieDeAccion } from './PieDeAccion';
import type { PropsDeAccion } from './tipos';

export interface TarjetaAccionProps extends PropsDeAccion {
  titulo: string;
  /**
   * Las piezas que arma el agente, en el orden en que se pintan. Vocabulario
   * cerrado en `elementos.tsx` — el modelo escoge de ahí, no inventa.
   */
  contenido: ElementoContenido[];
  /** Texto del botón principal. Por defecto "Aceptar" o "Aplicar". */
  textoAccion?: string;
  /** Qué queda configurado al aceptar. Se muestra ya resuelta la tarjeta. */
  resultado: string;
  mensajeAgente: string;
}

/**
 * Tarjeta de acción componible: el agente decide de qué piezas se arma.
 *
 * Es la pieza que faltaba para la idea de LEGO. Las otras tres tarjetas
 * (`PropuestaAhorro`, `ConfirmarAccion`, `ActionCardSelector`) tienen una
 * composición fija y siguen siendo útiles cuando el layout es siempre el
 * mismo; esta sirve para todo lo demás sin escribir un componente por caso.
 *
 * **La composición define la interacción, no una prop aparte.** Si el
 * agente incluyó una pieza `opciones`, la tarjeta exige elegir una y
 * muestra un solo botón de aplicar; si no la incluyó, no hay nada que
 * elegir y van los dos botones de aceptar/rechazar. Derivarlo del contenido
 * evita el estado imposible de "modo selección sin opciones".
 */
export function TarjetaAccion({
  idAccion,
  etiqueta,
  intencion = 'neutral',
  titulo,
  contenido,
  textoAccion,
  resultado,
  mensajeAgente,
}: TarjetaAccionProps) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const acciones = useAcciones();

  const color = COLOR_INTENCION[intencion];
  const estado = acciones?.estadoDe(idAccion) ?? 'pendiente';

  const piezaOpciones = contenido.find((c) => c.elemento === 'opciones');
  const exigeElegir = piezaOpciones !== undefined;

  if (estado !== 'pendiente') {
    return (
      <View style={styles.card}>
        <Text style={styles.titulo}>{titulo}</Text>
        <AcuseDeAccion estado={estado} resultado={resultado} />
      </View>
    );
  }

  function aplicar() {
    if (!seleccionada || piezaOpciones?.elemento !== 'opciones') return;

    const opcion = piezaOpciones.opciones.find((o) => o.id === seleccionada);
    if (!opcion) return;

    // Al agente le llega qué eligió el usuario, en texto que él mismo
    // redactó — nunca una cifra (constitution.md 4.4).
    acciones?.responder(idAccion, 'aceptada', `${etiqueta}: ${opcion.tituloOpcion}`);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>

      <View style={styles.piezas}>
        {contenido.map((pieza, i) => (
          <Elemento
            key={`${pieza.elemento}-${i}`}
            contenido={pieza}
            color={color}
            seleccionada={seleccionada}
            onSeleccionar={setSeleccionada}
          />
        ))}
      </View>

      <Text style={styles.mensaje}>{mensajeAgente}</Text>

      {exigeElegir ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={textoAccion ?? 'Aplicar'}
          accessibilityState={{ disabled: !seleccionada }}
          accessibilityHint={seleccionada ? undefined : 'Elige una opción para continuar'}
          onPress={aplicar}
          disabled={!seleccionada}
          style={({ pressed }) => [
            styles.aplicar,
            { backgroundColor: color, borderColor: color },
            !seleccionada && styles.inactivo,
            pressed && styles.presionado,
          ]}
        >
          <Text style={[styles.aplicarTexto, { color: textoSobre(color) }]}>
            {textoAccion ?? 'Aplicar'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={textoSobre(color)} />
        </Pressable>
      ) : (
        <PieDeAccion
          idAccion={idAccion}
          etiqueta={etiqueta}
          intencion={intencion}
          textoAceptar={textoAccion}
          resultado={resultado}
        />
      )}
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
  piezas: { gap: espacio.lg, marginTop: espacio.lg },
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
  inactivo: { opacity: 0.35 },
  aplicarTexto: { fontSize: 14, fontWeight: '700' },
  presionado: { opacity: 0.8 },
});
