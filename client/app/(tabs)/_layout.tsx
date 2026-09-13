import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BotonMosaico } from '../../components/ui/BotonMosaico';
import { ChatFlotante } from '../../components/ui/ChatFlotante';
import { colores, espacio, vidrio } from '../../lib/ui/theme';

/**
 * Las cuatro ventanas permanentes de la app.
 *
 * Mosaico NO es pestaña: es un panel flotante estilo Messenger que se
 * desliza desde abajo cubriendo ~72 % de la pantalla, dejando visible la
 * barra de pestañas y una franja del dashboard. Se invoca con
 * <BotonMosaico /> y se cierra tocando fuera, la X del panel o el propio
 * botón flotante.
 *
 * Orden del tab bar: Inicio → Tarjetas → Movimientos → Perfil.
 *
 * `headerShown: false` porque cada ventana pinta su propio encabezado con
 * <Pantalla /> o <PantallaMarca />.
 *
 * La barra va en azul sólido para todas las ventanas — es el mismo elemento
 * persistente y cambiarle el color al navegar entre pestañas se ve como un
 * parpadeo.
 */
export default function LayoutTabs() {
  // El <ChatPanelProvider> vive en app/_layout.tsx, no aquí: el estado del
  // panel lo necesitan también providers de la raíz (ver el comentario de
  // orden en ese archivo).
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colores.acento,
          tabBarInactiveTintColor: vidrio.textoTenue,
          tabBarStyle: {
            backgroundColor: colores.marca,
            borderTopColor: 'transparent',
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -espacio.xs },
          sceneStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="tarjetas"
          options={{
            title: 'Tarjetas',
            tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="movimientos"
          options={{
            title: 'Movimientos',
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* Panel flotante del chat — se anima sobre las pestañas */}
      <ChatFlotante />

      {/* FAB — se oculta sola cuando el panel está abierto */}
      <BotonMosaico />
    </View>
  );
}
