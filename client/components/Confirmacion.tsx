import { StyleSheet, Text, View } from 'react-native';

export interface ConfirmacionProps {
  titulo: string;
  mensaje: string;
  /** true = acción completada (verde); false = neutral/informativo, no es un error (los errores nunca llegan a un componente, ver route.ts). */
  exito: boolean;
  mensajeAgente: string;
}

/**
 * Resultado genérico de una acción de escritura (crear/aportar/cancelar/
 * etc.) que no tiene un componente propio más específico -- ver
 * constitution.md 4.3. Los errores de negocio nunca llegan aquí: se
 * devuelven como `{error}` desde la tool y el backend los manda como texto
 * plano (route.ts), no como surface.
 */
export function Confirmacion({ titulo, mensaje, exito, mensajeAgente }: ConfirmacionProps) {
  return (
    <View style={[styles.card, exito ? styles.cardExito : styles.cardNeutral]}>
      <View style={styles.header}>
        <View style={[styles.icono, exito ? styles.iconoExito : styles.iconoNeutral]}>
          <Text style={styles.iconoTexto}>{exito ? '✓' : 'i'}</Text>
        </View>
        <Text style={styles.titulo}>{titulo}</Text>
      </View>

      <Text style={styles.mensaje}>{mensaje}</Text>
      <Text style={styles.mensajeAgente}>{mensajeAgente}</Text>
    </View>
  );
}

const BANORTE = '#EB0029';
const VERDE = '#16a34a';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  cardExito: { borderColor: '#bbf7d0' },
  cardNeutral: { borderColor: '#e5e5e5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  icono: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoExito: { backgroundColor: VERDE },
  iconoNeutral: { backgroundColor: BANORTE },
  iconoTexto: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  titulo: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: '#171717' },
  mensaje: { fontSize: 13, color: '#171717', marginBottom: 6 },
  mensajeAgente: { fontSize: 12, lineHeight: 16, color: '#737373' },
});
