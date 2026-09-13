import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';

export interface TarjetaProps {
  /** Encabezado opcional de la tarjeta. */
  titulo?: string;
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Contenedor base de cualquier bloque de contenido. Es la primitiva de la
 * que cuelga el look de toda la app: borde de 1px, radio 12, fondo blanco.
 *
 * Ojo: los cuatro bloques A2UI existentes (TarjetaSaldo, RastreadorMetas,
 * ListaTransacciones, ComparativoGastos) todavía traen ese estilo copiado
 * a mano en su propio StyleSheet — se dejaron intactos a propósito para no
 * chocar con las ramas que los están tocando en paralelo (constitution.md
 * sección 5). Migrarlos a esta primitiva es trabajo pendiente.
 */
export function Tarjeta({ titulo, children, style }: TarjetaProps) {
  return (
    <View style={[styles.tarjeta, style]}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    width: '100%',
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    padding: espacio.lg,
  },
  titulo: {
    ...tipografia.subtitulo,
    fontSize: 14,
    marginBottom: espacio.md,
  },
});
