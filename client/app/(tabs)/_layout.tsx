import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { BotonMosaico } from '../../components/ui/BotonMosaico';
import { colores, espacio, vidrio } from '../../lib/ui/theme';

/**
 * Las dos ventanas permanentes de la app.
 *
 * Mosaico ya NO es pestaña: se abre como modal encima de donde estés (ver
 * app/chat.tsx), y se invoca con <BotonMosaico />, que se monta aquí para
 * quedar sobre las dos pantallas. Una conversación no es un destino al que
 * uno "va" y se queda: se abre, se resuelve algo y se cierra.
 *
 * Las tres ventanas de la app. El orden del tab bar es el orden de uso
 * esperado: se entra a Inicio, se pregunta en Mosaico, Perfil es ocasional.
 *
 * `headerShown: false` porque cada ventana pinta su propio encabezado con
 * <Pantalla /> o <PantallaMarca /> — así el título vive con el contenido y
 * no depende de la librería de navegación.
 *
 * La barra va en azul sólido para las tres ventanas, no solo para las de
 * degradado: es el mismo elemento persistente y cambiarle el color al
 * navegar entre pestañas se ve como un parpadeo.
 */
export default function LayoutTabs() {
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
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      </Tabs>

      <BotonMosaico />
    </View>
  );
}
