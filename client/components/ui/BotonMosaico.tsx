import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';
import { useAgent } from '../../lib/a2ui/AgentProvider';
import { useChatPanel } from '../../lib/ui/ChatPanelProvider';
import { colores, espacio, radio } from '../../lib/ui/theme';

/**
 * Botón flotante que abre/cierra la conversación con Mosaico.
 *
 * Se monta una sola vez en `app/(tabs)/_layout.tsx`, encima del navegador
 * de pestañas y del ChatFlotante, así que aparece en TODAS las ventanas.
 *
 * Antes navegaba a `/chat`; ahora hace toggle del panel flotante vía
 * `useChatPanel()`. El botón se oculta cuando el panel está abierto para
 * no estorbar — el panel tiene su propia X para cerrarse, y al cerrar el
 * botón vuelve a aparecer.
 *
 * Cambia a un icono de espera mientras el agente responde: si el usuario
 * cerró el panel a media respuesta, esto le dice que sigue trabajando.
 */
export function BotonMosaico() {
  const { cargando } = useAgent();
  const { abierto, toggle } = useChatPanel();

  // Cuando el panel está abierto el botón no se renderiza: el panel tiene
  // su propio botón de cierre y la burbuja flotante estorbaría el input.
  if (abierto) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir conversación con Mosaico"
      onPress={toggle}
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
