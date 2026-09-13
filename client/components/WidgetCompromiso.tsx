import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { conAlfa } from '../lib/ui/contraste';
import { COLOR_INTENCION, colores, espacio, radio, tipografia, type Intencion } from '../lib/ui/theme';

export interface WidgetCompromisoProps {
  /** Título de la tarjeta que propuso el compromiso. */
  titulo: string;
  /** La opción que el usuario eligió, tal cual la mostró la tarjeta. */
  opcion: string;
  /** Detalle de esa opción ("CAT 32.4%", "5% abajo de tu promedio"). */
  detalle?: string;
  /** La cifra, ya formateada por el servidor. Nunca la redacta el modelo. */
  valor?: string;
  intencion?: Intencion;
  /** ISO del momento en que se aceptó. */
  fechaISO?: string;
  mensajeAgente?: string;
}

/**
 * El compromiso que el usuario aceptó, ya fijado en su pantalla de Inicio.
 *
 * Es el destino de la "metamorfosis": una tarjeta de acción vive en el
 * chat, pide decidir y se resuelve; lo que queda de ella —qué se eligió y
 * cuándo— se convierte en esto, que sí tiene sentido tener siempre a la
 * vista.
 *
 * Por eso NO reproduce la tarjeta original: las otras opciones, los botones
 * y la pregunta ya no aplican una vez decidido. Mostrarlas invitaría a
 * "volver a elegir" algo que el usuario ya cerró.
 *
 * Las cifras vienen como string ya formateado desde el servidor
 * (`constitution.md` 4.2): este componente no calcula ni formatea montos.
 */
function WidgetCompromisoBase({
  titulo,
  opcion,
  detalle,
  valor,
  intencion = 'neutral',
  fechaISO,
  mensajeAgente,
}: WidgetCompromisoProps) {
  const color = COLOR_INTENCION[intencion];

  return (
    <View style={styles.card}>
      <View style={styles.encabezado}>
        <View style={[styles.insignia, { backgroundColor: conAlfa(color, 0.12) }]}>
          <Ionicons name="checkmark-circle" size={13} color={color} />
          <Text style={[styles.insigniaTexto, { color }]}>Activo</Text>
        </View>
        {fechaISO ? <Text style={styles.fecha}>{formatearFecha(fechaISO)}</Text> : null}
      </View>

      <Text style={styles.titulo} numberOfLines={2}>
        {titulo}
      </Text>

      <View style={styles.elegido}>
        <View style={styles.elegidoTexto}>
          <Text style={styles.opcion} numberOfLines={1}>
            {opcion}
          </Text>
          {detalle ? (
            <Text style={styles.detalle} numberOfLines={1}>
              {detalle}
            </Text>
          ) : null}
        </View>
        {valor ? (
          <Text style={[styles.valor, { color }]} numberOfLines={1}>
            {valor}
          </Text>
        ) : null}
      </View>

      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}
    </View>
  );
}

/** "14 de marzo" — el año sobra en un compromiso reciente. */
function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(fecha);
}

/** Memoizado por la misma razón que los demás bloques: `mensajes` cambia
 *  muchas veces por respuesta y estas tarjetas no dependen de eso. */
export const WidgetCompromiso = memo(WidgetCompromisoBase);

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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.sm,
    marginBottom: espacio.sm,
  },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    borderRadius: radio.completo,
    paddingHorizontal: espacio.sm,
    paddingVertical: 3,
  },
  insigniaTexto: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fecha: { ...tipografia.pie, fontSize: 11 },
  titulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  elegido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    marginTop: espacio.md,
    borderRadius: radio.sm,
    backgroundColor: colores.superficieSutil,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  elegidoTexto: { flexShrink: 1, gap: 2 },
  opcion: { fontSize: 14, fontWeight: '600', color: colores.texto },
  detalle: { ...tipografia.pie },
  valor: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  mensaje: { ...tipografia.pie, marginTop: espacio.md },
});
