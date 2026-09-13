import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';

export interface EstadoVacioProps {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descripcion: string;
  /** Acción opcional (normalmente un <Boton />). */
  children?: ReactNode;
}

/**
 * Placeholder honesto para una sección sin contenido todavía.
 *
 * Existe por una razón de la constitución, no solo estética: mientras no
 * esté decidido de dónde salen los datos del tablero, la alternativa sería
 * pintar cifras de ejemplo — y `constitution.md` 4.2/6 prohíbe mostrar
 * cualquier número financiero que no venga del MCP. Un estado vacío que
 * explica qué hacer es correcto; un mockup con datos inventados, no.
 */
export function EstadoVacio({ icono, titulo, descripcion, children }: EstadoVacioProps) {
  return (
    <View style={styles.contenedor}>
      <Ionicons name={icono} size={28} color={colores.textoTenue} />
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>{descripcion}</Text>
      {children ? <View style={styles.accion}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    borderRadius: radio.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.xxl,
  },
  titulo: { ...tipografia.cuerpo, fontWeight: '600' },
  descripcion: { ...tipografia.pie, textAlign: 'center', maxWidth: 280 },
  accion: { marginTop: espacio.sm },
});
