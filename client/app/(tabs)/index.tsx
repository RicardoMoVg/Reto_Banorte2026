import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '../../components/ui/Boton';
import { Chip } from '../../components/ui/Chip';
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import { Tarjeta } from '../../components/ui/Tarjeta';
import { SurfaceRenderer } from '../../lib/a2ui/SurfaceRenderer';
import { useAgent } from '../../lib/a2ui/AgentProvider';
import { useTablero } from '../../lib/a2ui/TableroProvider';
import { primerNombre, saludo } from '../../lib/sesion/perfilDemo';
import { useSesion } from '../../lib/sesion/SesionProvider';
import { useChatPanel } from '../../lib/ui/ChatPanelProvider';
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

/**
 * Ventana de Inicio: el tablero.
 *
 * Es el lienzo de los bloques A2UI — el usuario lo "edita" hablándole al
 * agente, no arrastrando widgets: cada pregunta produce un bloque y el
 * bloque aterriza aquí. El botón que abre esa conversación es global y
 * vive en `(tabs)/_layout.tsx`, no aquí: desde que el chat es modal hace
 * falta poder invocarlo desde cualquier ventana.
 *
 * Va sobre <PantallaMarca> (el degradado) y los bloques se ven como
 * tarjetas blancas encima. Eso funciona porque cada bloque trae su propio
 * fondo opaco; lo que NO se puede poner aquí es texto suelto en los colores
 * claros de `tipografia` — sobre el degradado hay que usar blanco.
 */
export default function Inicio() {
  const { enviar } = useAgent();
  const { perfil } = useSesion();
  const { abrir: abrirChat } = useChatPanel();
  const insets = useSafeAreaInsets();
  const [avisos, setAvisos] = useState(false);

  /**
   * Lo que el usuario decidió fijar aquí, más reciente primero.
   *
   * Ya NO son "los últimos bloques del chat": eso mezclaba preguntar algo
   * de pasada con quererlo siempre a la vista, y cualquier consulta
   * ensuciaba el tablero. Ahora el agente PROPONE (marca el bloque cuando
   * el usuario pidió agregarlo) y el usuario CONFIRMA desde la
   * conversación; aquí solo llega lo aceptado.
   */
  const { bloques, desanclar } = useTablero();

  function preguntar(texto: string) {
    enviar(texto);
    abrirChat();
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
                Pídele a Mosaico que agregue algo aquí — «pon mis gastos del mes en mi inicio»
                — y cuando lo proponga, lo aceptas y se queda fijo.
              </Text>
              <Boton
                titulo="Hablar con Mosaico"
                onPress={abrirChat}
                style={styles.vacioBoton}
              />
            </View>
          </Tarjeta>
        ) : (
          <View style={styles.bloques}>
            {bloques.map((b) => (
              <View key={b.id}>
                <SurfaceRenderer
                  mensaje={{ id: b.id, tipo: 'surface', rol: 'asistente', nombre: b.nombre, props: b.props }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${b.nombre} del inicio`}
                  hitSlop={espacio.sm}
                  onPress={() => desanclar(b.id)}
                  style={({ pressed }) => [styles.quitar, pressed && styles.presionado]}
                >
                  <Ionicons name="close" size={14} color={colores.marca} />
                </Pressable>
              </View>
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
          Lo que fijas aquí vive en este dispositivo y se pierde al recargar: todavía no se
          guarda en tu cuenta.
        </Text>
      </ScrollView>

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
  /** Quitar del tablero: chrome del tablero, no del bloque. Ningún bloque
   *  A2UI tiene que saber que existe un tablero. */
  quitar: {
    position: 'absolute',
    top: -espacio.sm,
    right: -espacio.sm,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },

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
