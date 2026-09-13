import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '../../components/ui/Boton';
import { Chip } from '../../components/ui/Chip';
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import { Tarjeta } from '../../components/ui/Tarjeta';
import { esBloqueDeAccion } from '../../components/chat/tipos';
import { SurfaceRenderer } from '../../lib/a2ui/SurfaceRenderer';
import type { Mensaje } from '../../lib/a2ui/types';
import { useAgent } from '../../lib/a2ui/AgentProvider';
import { primerNombre, saludo } from '../../lib/sesion/perfilDemo';
import { useSesion } from '../../lib/sesion/SesionProvider';
import { colores, espacio, radio, tipografia, vidrio } from '../../lib/ui/theme';

/**
 * Preguntas que el agente sí puede responder con un bloque A2UI (una por
 * cada tool de server/lib/ai/a2ui-tools.ts). Son texto que se le manda al
 * agente tal cual — no atajos a una pantalla — así que el flujo siempre
 * pasa por el LLM y el dato sigue saliendo del MCP.
 */
const SUGERENCIAS = [
  '¿Cómo voy con mi fondo de emergencia?',
  '¿Cuál es mi saldo disponible?',
  '¿En qué gasté últimamente?',
  '¿En qué se me va el dinero?',
];

/** Cuántos bloques caben en el tablero antes de empezar a tirar los viejos. */
const MAX_BLOQUES = 4;

/**
 * Ventana de Inicio: el tablero.
 *
 * Es el lienzo de los bloques A2UI — el usuario lo "edita" hablándole al
 * agente, no arrastrando widgets: cada pregunta produce un bloque y el
 * bloque aterriza aquí. Por eso el botón flotante lleva a la conversación
 * en vez de abrir un catálogo de componentes.
 *
 * Va sobre <PantallaMarca> (el degradado) y los bloques se ven como
 * tarjetas blancas encima. Eso funciona porque cada bloque trae su propio
 * fondo opaco; lo que NO se puede poner aquí es texto suelto en los colores
 * claros de `tipografia` — sobre el degradado hay que usar blanco.
 */
export default function Inicio() {
  const { mensajes, cargando, enviar } = useAgent();
  const { perfil } = useSesion();
  const insets = useSafeAreaInsets();
  const [avisos, setAvisos] = useState(false);

  /**
   * Los bloques que el agente ya generó en esta sesión, más reciente primero.
   *
   * Esto NO es todavía el dashboard anclado de constitution.md 3.2: ahí el
   * usuario elige qué fijar y se guarda la *receta* para regenerarlo
   * (tool + parámetros) en Postgres, nunca el número ya resuelto. Mientras
   * eso no exista, mostrar los últimos bloques de la sesión es correcto —
   * son resultados vivos de esta misma corrida, no un snapshot viejo.
   */
  // El predicado va tipado (`m is ...`) para que TypeScript sepa que lo que
  // queda son surfaces; con un booleano pelón pierde el estrechamiento.
  const bloques = mensajes
    .filter(
      (m): m is Extract<Mensaje, { tipo: 'surface' }> =>
        m.tipo === 'surface' && !esBloqueDeAccion(m.nombre),
    )
    .slice(-MAX_BLOQUES)
    .reverse();

  function preguntar(texto: string) {
    enviar(texto);
    router.push('/chat');
  }

  return (
    <PantallaMarca>
      <View style={styles.encabezado}>
        <View style={styles.saludo}>
          <Text style={styles.saludoTexto}>{saludo()}</Text>
          <Text style={styles.saludoNombre}>{primerNombre(perfil?.nombre ?? '')}.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={avisos ? 'Cerrar avisos' : 'Ver avisos'}
          aria-expanded={avisos}
          hitSlop={espacio.sm}
          onPress={() => setAvisos((v) => !v)}
          style={({ pressed }) => [styles.campana, pressed && styles.presionado]}
        >
          <Ionicons
            name={avisos ? 'close-outline' : 'notifications-outline'}
            size={22}
            color={colores.textoInverso}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {bloques.length === 0 ? (
          <Tarjeta>
            <View style={styles.vacio}>
              <Ionicons name="grid-outline" size={26} color={colores.marca} />
              <Text style={styles.vacioTitulo}>Tu tablero está vacío</Text>
              <Text style={styles.vacioTexto}>
                Todo lo que aparece aquí lo arma el agente con datos reales de tu cuenta. Pídele
                algo y el bloque se queda en esta vista.
              </Text>
              <Boton
                titulo="Hablar con Mosaico"
                onPress={() => router.push('/chat')}
                style={styles.vacioBoton}
              />
            </View>
          </Tarjeta>
        ) : (
          <View style={styles.bloques}>
            {bloques.map((m) => (
              <SurfaceRenderer key={m.id} mensaje={m} />
            ))}
          </View>
        )}

        <View style={styles.seccion}>
          <Text style={styles.etiquetaSeccion}>Prueba preguntando</Text>
          <View style={styles.chips}>
            {SUGERENCIAS.map((s) => (
              <Chip key={s} texto={s} onPress={() => preguntar(s)} />
            ))}
          </View>
        </View>

        <Text style={styles.nota}>
          El tablero muestra los últimos {MAX_BLOQUES} bloques de esta sesión y se vacía al
          recargar. Anclarlos para que sobrevivan es el siguiente paso.
        </Text>
      </ScrollView>

      {/* Botón flotante: la vía rápida al agente, que es como se edita esta
          vista. Va sobre el scroll, no dentro, para que no se vaya con él. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Preguntar a Mosaico"
        onPress={() => router.push('/chat')}
        style={({ pressed }) => [styles.flotante, pressed && styles.presionado]}
      >
        <Ionicons
          name={cargando ? 'ellipsis-horizontal' : 'sparkles'}
          size={24}
          color={colores.textoSobreAcento}
        />
      </Pressable>

      {avisos ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar avisos"
            style={styles.telon}
            onPress={() => setAvisos(false)}
          />
          <View style={styles.panelAvisos}>
            <Text style={styles.panelTitulo}>Sin avisos nuevos</Text>
            <Text style={styles.panelTexto}>
              Las alertas de tu cuenta van a llegar aquí cuando el agente pueda vigilarlas. Hoy
              todavía no hay nada que mostrar.
            </Text>
          </View>
        </>
      ) : null}
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espacio.md,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.lg,
    paddingBottom: espacio.lg,
  },
  saludo: { flexShrink: 1 },
  /**
   * Blanco sobre el menta del tope del degradado da ~1.5:1. La sombra es lo
   * que lo hace legible, igual que el logotipo del login.
   */
  saludoTexto: {
    fontSize: 22,
    fontWeight: '700',
    color: colores.textoInverso,
    textShadowColor: 'rgba(6, 7, 97, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  saludoNombre: {
    fontSize: 22,
    fontWeight: '700',
    color: colores.textoInverso,
    textShadowColor: 'rgba(6, 7, 97, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  campana: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.completo,
  },
  presionado: { opacity: 0.7 },

  scroll: { paddingHorizontal: espacio.lg, gap: espacio.xl },
  bloques: { gap: espacio.md },

  vacio: { alignItems: 'center', gap: espacio.sm, paddingVertical: espacio.sm },
  vacioTitulo: { ...tipografia.cuerpo, fontWeight: '700', marginTop: espacio.xs },
  vacioTexto: { ...tipografia.cuerpoSecundario, textAlign: 'center' },
  vacioBoton: { marginTop: espacio.md, alignSelf: 'stretch' },

  seccion: { gap: espacio.md },
  etiquetaSeccion: {
    ...tipografia.etiqueta,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },

  nota: { fontSize: 11, lineHeight: 16, color: vidrio.textoTenue },

  flotante: {
    position: 'absolute',
    right: espacio.lg,
    bottom: espacio.lg,
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

  telon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  panelAvisos: {
    position: 'absolute',
    top: espacio.xxl + espacio.md,
    right: espacio.lg,
    maxWidth: 280,
    gap: espacio.xs,
    borderRadius: radio.md,
    backgroundColor: colores.superficie,
    padding: espacio.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  panelTitulo: { ...tipografia.cuerpo, fontWeight: '700' },
  panelTexto: tipografia.pie,
});
