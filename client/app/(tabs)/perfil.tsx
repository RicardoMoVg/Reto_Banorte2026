import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import { useAgent } from '../../lib/a2ui/AgentProvider';
import { formatearFechaLarga, iniciales } from '../../lib/sesion/perfilDemo';
import { useSesion } from '../../lib/sesion/SesionProvider';
import { colores, espacio, radio, vidrio } from '../../lib/ui/theme';

export default function Perfil() {
  const { mensajes, apiUrl, limpiar } = useAgent();
  const { perfil, cerrarSesion } = useSesion();
  const insets = useSafeAreaInsets();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const version = Constants.expoConfig?.version ?? '—';
  const plataforma = Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android';

  /**
   * Al salir se borra también la conversación: vive solo en memoria de este
   * dispositivo (constitution.md 3.1) y dejarla montada para quien entre
   * después sería filtrar el chat de una sesión a otra.
   */
  function handleCerrarSesion() {
    setMenuAbierto(false);
    limpiar();
    cerrarSesion();
  }

  function handleLimpiar() {
    setMenuAbierto(false);
    limpiar();
  }

  if (!perfil) return null;

  return (
    <PantallaMarca
      titulo="Perfil"
      accion={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          // `aria-expanded` y no `accessibilityState={{expanded}}`:
          // react-native-web 0.21 ya no traduce el segundo a ARIA, y RN
          // acepta los props `aria-*` en nativo desde 0.71.
          aria-expanded={menuAbierto}
          hitSlop={espacio.sm}
          onPress={() => setMenuAbierto((v) => !v)}
          style={({ pressed }) => [styles.botonMenu, pressed && styles.presionado]}
        >
          <Ionicons
            name={menuAbierto ? 'close' : 'menu'}
            size={20}
            color={colores.textoInverso}
          />
        </Pressable>
      }
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales(perfil.nombre)}</Text>
          </View>
          <Text style={styles.heroNombre}>{perfil.nombre}</Text>
          <Text style={styles.heroCorreo} numberOfLines={1}>
            {perfil.correo}
          </Text>

          <View style={styles.insignia}>
            <Ionicons name="flask-outline" size={12} color={colores.acento} />
            <Text style={styles.insigniaTexto}>Datos de ejemplo</Text>
          </View>
        </View>

        <Seccion titulo="Tus datos">
          <Dato icono="person-outline" etiqueta="Nombre completo" valor={perfil.nombre} />
          <Dato icono="at-outline" etiqueta="Usuario" valor={perfil.usuario} />
          <Dato icono="mail-outline" etiqueta="Correo electrónico" valor={perfil.correo} />
          <Dato
            icono="calendar-outline"
            etiqueta="Fecha de nacimiento"
            valor={formatearFechaLarga(perfil.nacimiento)}
          />
          <Dato icono="call-outline" etiqueta="Teléfono" valor={perfil.telefono} />
          <Dato icono="ribbon-outline" etiqueta="Cliente desde" valor={perfil.clienteDesde} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
            onPress={() => router.push('/editar-perfil')}
            style={({ pressed }) => [styles.editar, pressed && styles.presionado]}
          >
            <Ionicons name="create-outline" size={18} color={colores.textoSobreAcento} />
            <Text style={styles.editarTexto}>Editar perfil</Text>
          </Pressable>
        </Seccion>

        <Seccion titulo="Cuenta y app">
          <Dato icono="key-outline" etiqueta="Autenticación" valor="Demo local" />
          <Dato icono="server-outline" etiqueta="Usuario en el backend" valor="demo-user" />
          <Dato icono="sparkles-outline" etiqueta="Asistente" valor="Mosaico" />
          <Dato icono="globe-outline" etiqueta="API del agente" valor={apiUrl} />
          <Dato icono="phone-portrait-outline" etiqueta="Plataforma" valor={plataforma} />
          <Dato icono="pricetag-outline" etiqueta="Versión" valor={version} />
          <Dato
            icono="chatbubble-ellipses-outline"
            etiqueta="Mensajes en memoria"
            valor={String(mensajes.length)}
          />
        </Seccion>

        <Text style={styles.nota}>
          El login no valida nada contra un servidor y tu contraseña no se guarda. La conversación
          vive solo en este dispositivo y se borra al recargar. Si la API del agente no es la
          correcta, no basta con editar el .env: hay que reiniciar Expo, porque lee las variables
          una sola vez al arrancar.
        </Text>
      </ScrollView>

      {menuAbierto ? (
        <>
          {/* Capa para cerrar tocando fuera. Va antes del menú para quedar debajo. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            style={styles.telon}
            onPress={() => setMenuAbierto(false)}
          />
          <View style={styles.menu}>
            <OpcionMenu
              icono="trash-outline"
              texto="Limpiar conversación"
              onPress={handleLimpiar}
              deshabilitado={mensajes.length === 0}
            />
            <OpcionMenu icono="log-out-outline" texto="Cerrar sesión" onPress={handleCerrarSesion} />
          </View>
        </>
      ) : null}
    </PantallaMarca>
  );
}

/** Grupo de filas con su encabezado. */
function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      <View style={styles.filas}>{children}</View>
    </View>
  );
}

/** Fila de dato: icono + etiqueta + valor, sobre la superficie de vidrio. */
function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  valor: string;
}) {
  return (
    <View style={styles.fila} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Ionicons name={icono} size={18} color={colores.acento} />
      <View style={styles.filaTexto}>
        <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
        <Text style={styles.filaValor} numberOfLines={1}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

function OpcionMenu({
  icono,
  texto,
  onPress,
  deshabilitado = false,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: deshabilitado }}
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        styles.opcion,
        pressed && styles.presionado,
        deshabilitado && styles.opcionInactiva,
      ]}
    >
      <Ionicons name={icono} size={16} color={colores.texto} />
      <Text style={styles.opcionTexto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espacio.lg, gap: espacio.xl },

  hero: { alignItems: 'center', gap: espacio.xs, paddingTop: espacio.lg },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: radio.completo,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.md,
  },
  avatarTexto: { fontSize: 34, fontWeight: '700', color: colores.marca },
  heroNombre: { fontSize: 20, fontWeight: '700', color: colores.textoInverso },
  heroCorreo: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' },
  insignia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    marginTop: espacio.sm,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: vidrio.borde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  insigniaTexto: { fontSize: 11, fontWeight: '600', color: colores.acento },

  seccion: { gap: espacio.sm },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: espacio.xs,
  },
  filas: { gap: espacio.sm },
  /**
   * El relleno azulado (`vidrio.campo`) no es decorativo: oscurece el tramo
   * medio del degradado, que es donde el blanco perdería contraste si las
   * filas fueran del vidrio claro.
   */
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  filaTexto: { flex: 1, gap: 2 },
  filaEtiqueta: { fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' },
  /** Única vía de entrada a app/editar-perfil.tsx, por eso va junto a los datos. */
  editar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    marginTop: espacio.xs,
    borderRadius: radio.md,
    backgroundColor: colores.acento,
    paddingVertical: espacio.md,
  },
  editarTexto: { fontSize: 14, fontWeight: '700', color: colores.textoSobreAcento },
  filaValor: { fontSize: 14, fontWeight: '600', color: colores.textoInverso },

  nota: {
    fontSize: 11,
    lineHeight: 16,
    color: vidrio.textoTenue,
    paddingHorizontal: espacio.xs,
  },

  botonMenu: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.borde,
  },
  presionado: { opacity: 0.7 },

  // `StyleSheet.absoluteFillObject` ya no existe en los tipos de RN 0.86.
  telon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  menu: {
    position: 'absolute',
    top: espacio.sm,
    right: espacio.lg,
    minWidth: 220,
    borderRadius: radio.md,
    backgroundColor: colores.superficie,
    paddingVertical: espacio.xs,
    // Sombra para despegarlo del degradado (elevation cubre Android).
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  opcionInactiva: { opacity: 0.4 },
  opcionTexto: { fontSize: 13, fontWeight: '500', color: colores.texto },
});
