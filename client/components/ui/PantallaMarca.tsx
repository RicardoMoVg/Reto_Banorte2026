import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ANCHO_MAXIMO,
  colores,
  degradadoMarca,
  espacio,
  tipografia,
  ubicacionesDegradado,
} from '../../lib/ui/theme';

export interface PantallaMarcaProps {
  /** Título de la barra superior. Sin título no se pinta la barra. */
  titulo?: string;
  /** Control a la derecha de la barra (ej. el botón de menú). */
  accion?: ReactNode;
  /** Con esto, la barra muestra una flecha de regreso a la izquierda. */
  alVolver?: () => void;
  /** Ancho máximo de la columna de contenido (la barra siempre va de borde a borde). */
  ancho?: number;
  children: ReactNode;
}

/**
 * Marco de las ventanas de marca: degradado menta→azul, safe area y barra
 * superior opcional. Es la contraparte oscura de `<Pantalla />`, que sirve
 * para las ventanas de contenido claro (Inicio, Mosaico).
 *
 * Existe porque el degradado ya lo usan dos pantallas (login y perfil) y
 * mantener dos copias del mismo `LinearGradient` es justo lo que
 * `lib/ui/theme.ts` intenta evitar.
 *
 * No trae ScrollView a propósito: cada ventana decide si scrollea y con qué
 * `contentContainerStyle` (el login centra verticalmente, el perfil no).
 */
export function PantallaMarca({
  titulo,
  accion,
  alVolver,
  ancho = ANCHO_MAXIMO,
  children,
}: PantallaMarcaProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={degradadoMarca}
      locations={ubicacionesDegradado}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.fondo}
    >
      <StatusBar style="light" />

      {titulo ? (
        <View style={[styles.barra, { paddingTop: insets.top + espacio.sm }]}>
          <View style={[styles.barraColumna, { maxWidth: ancho }]}>
            <View style={styles.barraIzquierda}>
              {alVolver ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  hitSlop={espacio.md}
                  onPress={alVolver}
                  style={({ pressed }) => [styles.volver, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="chevron-back" size={22} color={colores.textoInverso} />
                </Pressable>
              ) : null}
              <Text style={styles.barraTitulo}>{titulo}</Text>
            </View>
            {accion}
          </View>
        </View>
      ) : null}

      <View style={[styles.contenido, !titulo && { paddingTop: insets.top }]}>
        <View style={[styles.columna, { maxWidth: ancho }]}>{children}</View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  /**
   * La barra va en azul sólido, no translúcida: encima del menta del tope
   * del degradado, el texto blanco de una barra translúcida quedaría en
   * ~1.5:1. Con el azul sólido el título llega a 16:1.
   */
  barra: {
    width: '100%',
    backgroundColor: colores.marca,
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.md,
  },
  barraColumna: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.md,
    minHeight: 36,
  },
  barraIzquierda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    flexShrink: 1,
  },
  volver: { marginLeft: -espacio.sm },
  barraTitulo: {
    ...tipografia.subtitulo,
    color: colores.textoInverso,
    flexShrink: 1,
  },
  contenido: { flex: 1 },
  columna: { flex: 1, width: '100%', alignSelf: 'center' },
});
