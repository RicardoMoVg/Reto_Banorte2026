import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTableroOpcional, type AjusteDeBloque } from '../lib/a2ui/TableroProvider';
import { colores, espacio, radio, tipografia } from '../lib/ui/theme';

export interface AjusteTableroProps {
  /**
   * Id de ESTE reacomodo, generado por la tool (nunca por el modelo). Es
   * la llave con la que el tablero recuerda que ya se aplicó: el bloque se
   * queda en el historial del chat y su efecto se vuelve a montar cada vez
   * que el panel se abre.
   */
  idAjuste: string;
  /** Qué mover y cómo. Ya validado contra el tablero real en el servidor. */
  ajustes: AjusteDeBloque[];
  /** Qué le pasó a cada widget, redactado por el servidor. */
  resumen: { titulo: string; cambio: string }[];
  mensajeAgente: string;
}

/**
 * Acuse de un reacomodo del tablero, y quien lo aplica.
 *
 * Es el bloque que devuelve la tool `acomodarTablero`. Se pinta como
 * cualquier otro bloque A2UI, pero además tiene un efecto: al montarse
 * aplica los ajustes sobre `<TableroProvider>`.
 *
 * **Por qué así y no con un evento nuevo del protocolo:** el tablero vive
 * en el cliente (el servidor es stateless, `constitution.md` 3.1) y el
 * protocolo solo tiene cuatro tipos de evento, que no se amplían sin
 * actualizar la constitución (4.1). Mandar el reacomodo como un `surface`
 * normal lo deja pasar por el mismo catálogo y el mismo renderer que todo
 * lo demás — el cliente sigue decidiendo qué hacer con el JSON que le
 * llega, que es justo el punto de A2UI.
 *
 * Si se monta fuera del provider (una pantalla de pruebas), no aplica
 * nada y se pinta como un acuse de solo lectura.
 */
function AjusteTableroBase({ idAjuste, ajustes, resumen, mensajeAgente }: AjusteTableroProps) {
  const tablero = useTableroOpcional();

  useEffect(() => {
    // `aplicarAjuste` es idempotente por `idAjuste`, así que no importa
    // cuántas veces se remonte este bloque: el widget sube una posición,
    // no una por cada repintado.
    tablero?.aplicarAjuste(idAjuste, ajustes);
  }, [tablero, idAjuste, ajustes]);

  return (
    <View style={styles.card}>
      <View style={styles.encabezado}>
        <Ionicons name="grid-outline" size={16} color={colores.marca} />
        <Text style={styles.titulo}>Tablero acomodado</Text>
      </View>

      <View style={styles.lista}>
        {resumen.map((r, i) => (
          <View key={`${r.titulo}-${i}`} style={styles.fila}>
            <Ionicons name="checkmark-circle" size={14} color={colores.positivo} />
            <Text style={styles.filaTexto} numberOfLines={2}>
              <Text style={styles.filaNombre}>{r.titulo}</Text>: {r.cambio}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.mensaje}>{mensajeAgente}</Text>
    </View>
  );
}

export const AjusteTablero = memo(AjusteTableroBase);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    padding: espacio.lg,
    gap: espacio.sm,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  titulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  lista: { gap: espacio.xs },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.sm },
  filaTexto: { ...tipografia.pie, flexShrink: 1, color: colores.textoSecundario },
  filaNombre: { fontWeight: '700', color: colores.texto },
  mensaje: { ...tipografia.pie },
});
