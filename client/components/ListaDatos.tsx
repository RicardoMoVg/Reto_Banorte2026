import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, tipografia } from '../lib/ui/theme';

export interface RenglonDato {
  /** Lo que identifica al renglón: un nombre, un alias, un instrumento. */
  principal: string;
  /** Contexto en una línea: fecha, tipo, riesgo, periodicidad. */
  secundario?: string;
  /**
   * La cifra, YA FORMATEADA como texto por el servidor. Es string y no
   * number porque aquí caben montos, porcentajes y rachas de días con
   * formatos distintos, y quien tiene el dato real decide cómo se escribe
   * (`constitution.md` 4.2).
   */
  valor?: string;
  /**
   * Estado del renglón ("activa", "pendiente", "cancelada"). Se pinta como
   * etiqueta y decide el color: pendiente y cancelada NO se ven igual que
   * activa, porque en una lista de movimientos esa diferencia es el dato
   * más importante.
   */
  estatus?: string;
}

export interface ListaDatosProps {
  titulo: string;
  items: RenglonDato[];
  /** Qué decir cuando el usuario no tiene nada de esto todavía. */
  vacio?: string;
  mensajeAgente: string;
}

/** Estados que significan "esto no está surtiendo efecto". */
const APAGADOS = ['cancelada', 'cancelado', 'inactiva', 'inactivo', 'fallida', 'rechazado'];
const PENDIENTES = ['pendiente', 'cotizada', 'en revisión', 'en revision'];

/**
 * Lista genérica de cosas que el usuario tiene contratadas, guardadas o
 * registradas: contactos de pago, transferencias, tarjetas, posiciones de
 * inversión, pólizas, solicitudes de crédito, aportaciones programadas,
 * hábitos.
 *
 * Es UN componente para ocho dominios, no ocho componentes. Todos esos
 * datos comparten la misma forma —algo que identifica, un detalle, una
 * cifra y a veces un estado— así que una sola tool (`mostrarListado`) los
 * alimenta a todos. Es el patrón de componentes genéricos de
 * `constitution.md` 4.4: el modelo elige QUÉ listar, el código pone los
 * valores.
 *
 * Existe porque el agente sabía *crear* transferencias, contactos y
 * pólizas, pero no sabía *mostrarlos*: contestaba "no tengo acceso a tus
 * contactos" teniendo los datos en la base.
 */
function ListaDatosBase({ titulo, items, vacio, mensajeAgente }: ListaDatosProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{titulo}</Text>

      {items.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="file-tray-outline" size={18} color={colores.textoTenue} />
          <Text style={styles.vacioTexto}>{vacio ?? 'Todavía no tienes nada aquí.'}</Text>
        </View>
      ) : (
        <View style={styles.lista}>
          {items.map((item, i) => (
            <View key={`${item.principal}-${i}`} style={styles.fila}>
              <View style={styles.filaTexto}>
                <Text style={styles.principal} numberOfLines={1}>
                  {item.principal}
                </Text>
                {item.secundario ? (
                  <Text style={styles.secundario} numberOfLines={1}>
                    {item.secundario}
                  </Text>
                ) : null}
              </View>

              <View style={styles.filaDerecha}>
                {item.valor ? (
                  <Text style={styles.valor} numberOfLines={1}>
                    {item.valor}
                  </Text>
                ) : null}
                {item.estatus ? <Etiqueta estatus={item.estatus} /> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.mensaje}>{mensajeAgente}</Text>
    </View>
  );
}

function Etiqueta({ estatus }: { estatus: string }) {
  const normalizado = estatus.toLowerCase();
  const apagado = APAGADOS.includes(normalizado);
  const pendiente = PENDIENTES.includes(normalizado);

  return (
    <View
      style={[styles.etiqueta, apagado && styles.etiquetaApagada, pendiente && styles.etiquetaPendiente]}
    >
      <Text
        style={[
          styles.etiquetaTexto,
          apagado && styles.etiquetaTextoApagado,
          pendiente && styles.etiquetaTextoPendiente,
        ]}
      >
        {estatus}
      </Text>
    </View>
  );
}

/** Memoizado como los demás bloques: `mensajes` cambia muchas veces por
 *  respuesta y estas listas no dependen de eso. */
export const ListaDatos = memo(ListaDatosBase);

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
  titulo: { fontSize: 14, fontWeight: '700', color: colores.texto, marginBottom: espacio.sm },

  vacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingVertical: espacio.md,
  },
  vacioTexto: { ...tipografia.pie, flexShrink: 1 },

  lista: { borderTopWidth: 1, borderTopColor: colores.bordeSutil },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    paddingVertical: espacio.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.bordeSutil,
  },
  filaTexto: { flexShrink: 1, gap: 2 },
  principal: { fontSize: 13, fontWeight: '600', color: colores.texto },
  secundario: { ...tipografia.pie },
  filaDerecha: { alignItems: 'flex-end', gap: espacio.xs },
  valor: { fontSize: 13, fontWeight: '700', color: colores.texto },

  etiqueta: {
    borderRadius: radio.completo,
    backgroundColor: colores.marcaSuave,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
  },
  etiquetaApagada: { backgroundColor: colores.superficieSutil },
  etiquetaPendiente: { backgroundColor: 'rgba(235, 138, 0, 0.12)' },
  etiquetaTexto: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colores.marca,
  },
  etiquetaTextoApagado: { color: colores.textoApoyo },
  etiquetaTextoPendiente: { color: '#B45309' },

  mensaje: { ...tipografia.pie, marginTop: espacio.md },
});
