import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccionesProvider } from '../lib/a2ui/AccionesProvider';
import { AgentProvider } from '../lib/a2ui/AgentProvider';
import { TableroProvider } from '../lib/a2ui/TableroProvider';
import { SesionProvider, useSesion } from '../lib/sesion/SesionProvider';
import { ChatPanelProvider } from '../lib/ui/ChatPanelProvider';
import { colores } from '../lib/ui/theme';

/**
 * Layout raíz de expo-router. Es el reemplazo de la vieja App.tsx: aquí
 * viven los providers que toda la app necesita, no UI.
 *
 * <AgentProvider> va arriba del navegador a propósito — así la conversación
 * con el agente es una sola para toda la app y sobrevive al cambio de
 * pestaña (ver lib/a2ui/AgentProvider.tsx).
 *
 * El orden de los cuatro NO es libre, cada uno depende del de arriba:
 *
 * 1. <ChatPanelProvider> — solo estado del panel (abierto/cerrado). Va
 *    hasta arriba porque lo necesitan tanto el panel (que vive en el
 *    layout de tabs) como <AccionesProvider>, que abre el chat cuando se
 *    toca un acceso rápido desde el tablero. Estaba dentro de `(tabs)/`:
 *    ahí un provider de más arriba no lo podía leer.
 * 2. <TableroProvider> — qué widgets fijó el usuario en Inicio. Va ARRIBA
 *    de <AgentProvider> porque el agente recibe ese tablero en cada
 *    request para poder acomodarlo (`acomodarTablero`).
 * 3. <AgentProvider> — la conversación.
 * 4. <AccionesProvider> — el puente de los bloques al agente; usa el
 *    `enviar` de arriba y el `abrir` del panel.
 */
export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <SesionProvider>
        <ChatPanelProvider>
          <TableroProvider>
            <AgentProvider>
              <AccionesProvider>
                <StatusBar style="dark" />
                <Navegador />
              </AccionesProvider>
            </AgentProvider>
          </TableroProvider>
        </ChatPanelProvider>
      </SesionProvider>
    </SafeAreaProvider>
  );
}

/**
 * Rutas protegidas por sesión.
 *
 * `<Stack.Protected guard>` es el mecanismo de expo-router para esto: una
 * pantalla con el guard en false simplemente no existe para el navegador, y
 * si el usuario intenta llegar a ella (o deja de cumplirse el guard estando
 * dentro) lo manda a la ruta ancla. Por eso no hace falta el patrón viejo
 * de `useEffect` + `router.replace`, que alcanzaba a pintar un frame de la
 * pantalla protegida antes de redirigir.
 *
 * Va en un componente aparte de LayoutRaiz porque `useSesion()` solo se
 * puede llamar DENTRO del <SesionProvider>, no en el mismo componente que
 * lo monta.
 */
function Navegador() {
  const { sesion } = useSesion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="editar-perfil" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="transferir" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="pagar-servicios" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="retiro-sin-tarjeta" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="dimo" options={{ animation: 'slide_from_right' }} />
        {/* Modal: se desliza encima de la pestaña actual y al cerrarse
            devuelve al usuario justo ahí, como un chat de Messenger. */}
        <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
