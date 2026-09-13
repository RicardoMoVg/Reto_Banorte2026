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
import { useTablero, type BloqueAnclado } from '../../lib/a2ui/TableroProvider';
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
 * Una fila del tablero: o un widget a todo lo ancho, o hasta dos de medio
 * ancho, cada uno en su lado.
 */
type Fila =
  | { tipo: 'completa'; bloque: BloqueAnclado }
  | { tipo: 'mitades'; izquierda?: BloqueAnclado; derecha?: BloqueAnclado };

/**
 * Reparte los bloques en filas respetando el ancho y el lado que pidió el
 * usuario (vía el agente — ver `acomodarTablero`).
 *
 * Las reglas, en orden: un bloque de ancho completo se queda solo en su
 * fila; uno de medio ancho entra en la fila anterior SI esa fila es de
 * mitades y su lado está libre; si no, abre una fila nueva. Por eso un
 * único widget "a la derecha" se ve pegado a la derecha con el hueco a su
 * izquierda: el lado se respeta aunque no haya con quién compartir fila,
 * que es justo lo que el usuario pidió al decir "ponlo a la derecha".
 */
function enFilas(bloques: BloqueAnclado[]): Fila[] {
  const filas: Fila[] = [];

  for (const bloque of bloques) {
    if ((bloque.ancho ?? 'completo') === 'completo') {
      filas.push({ tipo: 'completa', bloque });
      continue;
    }

    const lado = bloque.lado ?? 'izquierda';
    const ultima = filas[filas.length - 1];

    if (ultima?.tipo === 'mitades' && !ultima[lado]) {
      ultima[lado] = bloque;
    } else {
      filas.push({ tipo: 'mitades', [lado]: bloque });
    }
  }

  return filas;
}

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
        {/* KPI por defecto */}
        <Tarjeta>
          <View style={styles.kpiContainer}>
            <Text style={styles.kpiEtiqueta}>Saldo disponible</Text>
            <Text style={styles.kpiMonto}>$13,496.00</Text>
            <Text style={styles.kpiCuenta}>Débito •• 2045</Text>
          </View>
        </Tarjeta>

        {/* Preguntas frecuentes */}
        <View style={styles.seccion}>
          <Text style={styles.etiquetaSeccion}>Preguntas frecuentes</Text>
          <View style={styles.chips}>
            {SUGERENCIAS.map((s) => (
              <Chip key={s} texto={s} onPress={() => preguntar(s)} />
            ))}
          </View>
        </View>

        {/* Bloques dinámicos anclados, en el acomodo que pidió el usuario */}
        {bloques.length > 0 && (
          <View style={styles.bloques}>
            {enFilas(bloques).map((fila, i) =>
              fila.tipo === 'completa' ? (
                <BloqueDelTablero key={fila.bloque.id} bloque={fila.bloque} alQuitar={desanclar} />
              ) : (
                <View key={`fila-${i}`} style={styles.filaMitades}>
                  <View style={styles.mitad}>
                    {fila.izquierda ? (
                      <BloqueDelTablero bloque={fila.izquierda} alQuitar={desanclar} />
                    ) : null}
                  </View>
                  <View style={styles.mitad}>
                    {fila.derecha ? (
                      <BloqueDelTablero bloque={fila.derecha} alQuitar={desanclar} />
                    ) : null}
                  </View>
                </View>
              ),
            )}
          </View>
        )}

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

/**
 * Un widget dentro del tablero: el bloque A2UI más el chrome del tablero
 * (hoy, el botón de quitar).
 *
 * Vive aquí y no dentro del bloque porque ningún bloque A2UI tiene que
 * saber que existe un tablero — el mismo componente se pinta igual en la
 * conversación, donde no se puede quitar nada.
 */
function BloqueDelTablero({
  bloque,
  alQuitar,
}: {
  bloque: BloqueAnclado;
  alQuitar: (id: string) => void;
}) {
  return (
    <View>
      <SurfaceRenderer
        mensaje={{
          id: bloque.id,
          tipo: 'surface',
          rol: 'asistente',
          nombre: bloque.nombre,
          props: bloque.props,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${bloque.nombre} del inicio`}
        onPress={() => alQuitar(bloque.id)}
        style={({ pressed }) => [styles.quitar, pressed && styles.presionado]}
      >
        <Ionicons name="close" size={16} color={colores.textoApoyo} />
      </Pressable>
    </View>
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
  /**
   * Fila de dos mitades. El hueco de un lado vacío se conserva (la <View>
   * de la mitad se pinta aunque no tenga bloque) para que un widget
   * "a la derecha" se vea a la derecha y no centrado.
   */
  filaMitades: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.md },
  mitad: { flex: 1, minWidth: 0 },
  /**
   * Quitar del tablero: chrome del tablero, no del bloque. Ningún bloque
   * A2UI tiene que saber que existe un tablero.
   *
   * Va DEBAJO de la tarjeta y no encimada en una esquina: superpuesto
   * chocaba con el contenido del bloque (la fecha del WidgetCompromiso
   * quedaba tapada), y el tablero no puede saber qué hay en cada esquina
   * de un bloque que no conoce. Debajo nunca colisiona, sin importar qué
   * bloque sea.
   */
  quitar: {
    position: 'absolute',
    top: espacio.md,
    right: espacio.md,
    width: 28,
    height: 28,
    borderRadius: radio.completo,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  kpiContainer: { paddingVertical: espacio.sm },
  kpiEtiqueta: { fontSize: 13, color: colores.textoApoyo, marginBottom: 2 },
  kpiMonto: { fontSize: 32, fontWeight: '800', color: colores.texto, letterSpacing: -0.5 },
  kpiCuenta: { fontSize: 13, fontWeight: '500', color: colores.textoSecundario, marginTop: espacio.xs },

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
    // `boxShadow` en vez de los `shadow*` sueltos: react-native-web los
    // marca como deprecados, y aqui SI hay reemplazo tipado en RN 0.86
    // (a diferencia de textShadow, que todavia no lo tiene). `elevation`
    // se queda para la arquitectura vieja de Android, donde boxShadow aun
    // no aplica.
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.25)',
    elevation: 8,
  },
  panelTitulo: { ...tipografia.cuerpo, fontWeight: '700' },
  panelTexto: tipografia.pie,
});
