import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useAgent } from '../../lib/a2ui/AgentProvider';
import { colores, espacio, radio } from '../../lib/ui/theme';

/**
 * Botón flotante que abre la conversación con Mosaico.
 *
 * Se monta una sola vez en `app/(tabs)/_layout.tsx`, encima del navegador
 * de pestañas, así que aparece en TODAS las ventanas — es el equivalente a
 * la burbuja persistente de Messenger. Antes vivía dentro de Inicio y solo
 * existía ahí; desde que el chat es modal, tiene que poder invocarse desde
 * donde estés, porque ya no hay una pestaña a la que ir.
 *
 * Cambia a un icono de espera mientras el agente responde: si el usuario
 * cerró el modal a media respuesta, esto le dice que sigue trabajando.
 */
export function BotonMosaico() {
  const { cargando } = useAgent();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir conversación con Mosaico"
      onPress={() => router.push('/chat')}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
    >
      <Ionicons
        name={cargando ? 'ellipsis-horizontal' : 'sparkles'}
        size={24}
        color={colores.textoSobreAcento}
      />
    </Pressable>
  );
}

/** Alto del tab bar, para que el botón no quede encima de las pestañas. */
const ALTO_TAB_BAR = 64;

const styles = StyleSheet.create({
  boton: {
    position: 'absolute',
    right: espacio.lg,
    bottom: ALTO_TAB_BAR + espacio.lg,
    width: 60,
    height: 60,
    borderRadius: radio.completo,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  presionado: { opacity: 0.8 },
});
