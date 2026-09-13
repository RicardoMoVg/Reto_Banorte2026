import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANCHO_MAXIMO, colores, espacio, tipografia } from '../../lib/ui/theme';

export interface PantallaProps {
  titulo: string;
  subtitulo?: string;
  /** Elemento opcional a la derecha del título (ej. una acción). */
  accion?: ReactNode;
  children: ReactNode;
}

/**
 * Marco común de toda ventana: safe area superior, encabezado y una
 * columna centrada con ancho máximo.
 *
 * El ancho máximo importa porque este mismo código corre en web vía
 * react-native-web: sin él, en un monitor la app se ve como una hoja de
 * cálculo estirada. En teléfono el límite nunca se alcanza.
 *
 * No incluye ScrollView a propósito — cada ventana decide si scrollea todo
 * (Inicio, Perfil) o si tiene una zona fija abajo (el chat, con su input).
 */
export function Pantalla({ titulo, subtitulo, accion, children }: PantallaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.raiz, { paddingTop: insets.top }]}>
      <View style={styles.columna}>
        <View style={styles.encabezado}>
          <View style={styles.encabezadoTexto}>
            <Text style={styles.titulo}>{titulo}</Text>
            {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
          </View>
          {accion}
        </View>

        <View style={styles.contenido}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.fondo },
  columna: { flex: 1, width: '100%', maxWidth: ANCHO_MAXIMO, alignSelf: 'center' },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espacio.md,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.lg,
    paddingBottom: espacio.md,
  },
  encabezadoTexto: { flexShrink: 1, gap: 2 },
  titulo: tipografia.titulo,
  subtitulo: tipografia.cuerpoSecundario,
  contenido: { flex: 1 },
});
