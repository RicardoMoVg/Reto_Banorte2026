import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAcciones } from '../lib/a2ui/AccionesProvider';
import { colores, espacio, radio, tipografia } from '../lib/ui/theme';

/**
 * Qué idea representa el botón. El agente manda el NOMBRE de la idea, no
 * un icono ni un color: con qué glifo se dibuja lo decide el cliente, que
 * es el dueño del diseño (`constitution.md` 4.4 — por referencia, nunca
 * por valor).
 */
export type IconoAcceso = 'transferir' | 'persona' | 'saldo' | 'grafica' | 'meta' | 'tarjeta' | 'rayo';

const ICONOS: Record<IconoAcceso, keyof typeof Ionicons.glyphMap> = {
  transferir: 'swap-horizontal',
  persona: 'person-outline',
  saldo: 'wallet-outline',
  grafica: 'bar-chart-outline',
  meta: 'flag-outline',
  tarjeta: 'card-outline',
  rayo: 'flash-outline',
};

export interface AccesoRapidoProps {
  /** Texto del botón, ej. "Transferir a Ana". */
  titulo: string;
  /** Línea de contexto, ej. "$500 a Ana". */
  subtitulo?: string;
  icono?: IconoAcceso;
  /**
   * La frase que se le manda al agente al tocarlo, redactada como si la
   * escribiera el usuario ("Transfiere $500 a Ana."). La arma el servidor
   * con datos ya validados — el botón no la interpreta ni la modifica, y
   * mucho menos habla con el backend por su cuenta.
   */
  peticion: string;
  mensajeAgente: string;
}

/**
 * Botón de acceso rápido: un atajo de un toque que el usuario fija en su
 * Inicio ("ponme un botón para transferirle a mi mamá").
 *
 * **Qué hace al tocarse:** manda `peticion` a la conversación y abre el
 * chat. El agente responde con la tarjeta de confirmación de siempre y el
 * dinero se mueve hasta que el usuario la confirma. Un atajo ahorra el
 * tecleo, no el "sí" — ver `lanzar()` en `lib/a2ui/AccionesProvider.tsx`.
 *
 * Es un bloque informativo (vive en el tablero, no solo en el chat), pero
 * como los de acción necesita un callback que no se puede serializar, así
 * que lo toma del contexto. Sigue sin hacer red ni saber nada de
 * `server/`: solo llama a `lanzar()`.
 */
function AccesoRapidoBase({ titulo, subtitulo, icono = 'rayo', peticion, mensajeAgente }: AccesoRapidoProps) {
  const acciones = useAcciones();

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={subtitulo ? `${titulo}. ${subtitulo}` : titulo}
        accessibilityState={{ disabled: !acciones }}
        disabled={!acciones}
        onPress={() => acciones?.lanzar(peticion)}
        style={({ pressed }) => [styles.boton, pressed && styles.presionado, !acciones && styles.inactivo]}
      >
        <View style={styles.icono}>
          <Ionicons name={ICONOS[icono] ?? ICONOS.rayo} size={20} color={colores.textoSobreAcento} />
        </View>

        <View style={styles.textos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={styles.subtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colores.textoTenue} />
      </Pressable>

      <Text style={styles.mensaje}>{mensajeAgente}</Text>
    </View>
  );
}

/** Memoizado como los demás bloques: `mensajes` cambia muchas veces por
 *  respuesta y este botón no depende de eso. */
export const AccesoRapido = memo(AccesoRapidoBase);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
    padding: espacio.lg,
    gap: espacio.sm,
  },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.sm,
    backgroundColor: colores.marcaSuave,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.md,
  },
  /**
   * El círculo va en menta (`acento`) y su icono en `textoSobreAcento`: es
   * el único color legible encima (8.6:1). Blanco sobre menta da 1.5:1 y
   * reprueba WCAG AA — ver el comentario de la paleta en theme.ts.
   */
  icono: {
    width: 36,
    height: 36,
    borderRadius: radio.completo,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, flexShrink: 1, gap: 2 },
  titulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  subtitulo: { ...tipografia.pie },
  presionado: { opacity: 0.75 },
  inactivo: { opacity: 0.5 },
  mensaje: { ...tipografia.pie },
});
