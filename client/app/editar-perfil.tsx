import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampoMarca } from '../components/ui/CampoMarca';
import { PantallaMarca } from '../components/ui/PantallaMarca';
import { useSesion } from '../lib/sesion/SesionProvider';
import { ErrorApi } from '../lib/api/rest';
import {
  aFormatoCorto,
  aISO,
  edad,
  formatearMesAnio,
  iniciales,
  mascaraFecha,
  normalizarTelefono,
  telefonoValido,
} from '../lib/sesion/perfilDemo';
import { colores, espacio, radio, vidrio } from '../lib/ui/theme';

/** Un mensaje por campo; vacío = campo válido. */
type Errores = Partial<Record<'nombre' | 'usuario' | 'nacimiento' | 'telefono', string>>;

const EDAD_MINIMA = 18;

/**
 * Ventana de edición del perfil.
 *
 * Vive fuera de `(tabs)/` a propósito: no es un destino del tab bar, solo se
 * llega por el botón "Editar perfil" de la ventana de Perfil, y se sale
 * guardando o con la flecha de regreso. Igual está protegida por sesión
 * (ver el `<Stack.Protected>` de `app/_layout.tsx`).
 *
 * El formulario trabaja sobre una copia local y solo escribe al provider al
 * guardar — así la flecha de regreso descarta de verdad, sin necesidad de
 * deshacer nada.
 */
export default function EditarPerfil() {
  const { perfil, actualizarPerfil } = useSesion();
  const insets = useSafeAreaInsets();

  const refUsuario = useRef<TextInput>(null);
  const refNacimiento = useRef<TextInput>(null);
  const refTelefono = useRef<TextInput>(null);

  const [nombre, setNombre] = useState(perfil?.nombre ?? '');
  const [usuario, setUsuario] = useState(perfil?.usuario ?? '');
  const [nacimiento, setNacimiento] = useState(aFormatoCorto(perfil?.nacimiento ?? ''));
  const [telefono, setTelefono] = useState(perfil?.telefono ?? '');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGuardado, setErrorGuardado] = useState('');
  const [guardando, setGuardando] = useState(false);

  // El guard de app/_layout.tsx hace que esto no pase en la práctica, pero
  // sin la comprobación el resto del componente tendría que usar `perfil?.`
  // en todos lados.
  if (!perfil) return null;

  const cambio =
    nombre !== perfil.nombre ||
    usuario !== (perfil.usuario ?? '') ||
    nacimiento !== aFormatoCorto(perfil.nacimiento ?? '') ||
    telefono !== (perfil.telefono ?? '');

  function validar(): Errores {
    const e: Errores = {};

    if (nombre.trim().length < 3) e.nombre = 'Escribe tu nombre completo.';
    if (usuario.trim().replace('@', '').length < 3) e.usuario = 'Mínimo 3 caracteres.';

    const iso = aISO(nacimiento);
    if (!iso) {
      // Cubre los dos casos que `aISO` rechaza: mal formato (12/98) y fecha
      // con formato válido pero inexistente (31/02). Decir solo "usa el
      // formato" sería falso en el segundo.
      e.nacimiento = 'Escribe una fecha real, en formato DD/MM/AAAA.';
    } else if (edad(iso) < EDAD_MINIMA) {
      e.nacimiento = `Debes tener al menos ${EDAD_MINIMA} años.`;
    } else if (edad(iso) > 120) {
      e.nacimiento = 'Revisa el año.';
    }

    if (!telefonoValido(telefono)) e.telefono = 'Debe tener 10 dígitos.';

    return e;
  }

  async function handleGuardar() {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setErrorGuardado('');
    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre: nombre.trim(),
        // Se normaliza la arroba para que no haya "@@ricardo" ni "ricardo".
        usuario: `@${usuario.trim().replace(/^@+/, '')}`,
        nacimiento: aISO(nacimiento)!,
        telefono: normalizarTelefono(telefono),
      });
      router.back();
    } catch (err) {
      setErrorGuardado(err instanceof ErrorApi ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PantallaMarca titulo="Editar perfil" alVolver={() => router.back()}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + espacio.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarZona}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{iniciales(nombre || '?')}</Text>
            </View>
            <Text style={styles.avatarNota}>
              Las iniciales se toman de tu nombre. Subir una foto llega cuando haya dónde
              guardarla.
            </Text>
          </View>

          <View style={styles.formulario}>
            <CampoMarca
              etiqueta="Nombre completo:"
              value={nombre}
              onChangeText={setNombre}
              error={errores.nombre}
              placeholder="Tu nombre"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => refUsuario.current?.focus()}
            />

            <CampoMarca
              ref={refUsuario}
              etiqueta="Usuario:"
              value={usuario}
              onChangeText={setUsuario}
              error={errores.usuario}
              placeholder="@tuusuario"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => refNacimiento.current?.focus()}
            />

            <CampoMarca
              ref={refNacimiento}
              etiqueta="Fecha de nacimiento:"
              value={nacimiento}
              // La máscara evita tener que traer un date picker nativo solo
              // para este campo: se escriben los dígitos y las diagonales
              // aparecen solas.
              onChangeText={(t) => setNacimiento(mascaraFecha(t))}
              error={errores.nacimiento}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="next"
              onSubmitEditing={() => refTelefono.current?.focus()}
            />

            <CampoMarca
              ref={refTelefono}
              etiqueta="Teléfono:"
              value={telefono}
              onChangeText={setTelefono}
              error={errores.telefono}
              placeholder="+52 81 1234 5678"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              onSubmitEditing={handleGuardar}
            />

            <View style={styles.fijo}>
              <Ionicons name="lock-closed-outline" size={16} color={vidrio.textoTenue} />
              <Text style={styles.fijoTexto}>
                {perfil.correo} — el correo lo administra tu cuenta, no se edita aquí.
              </Text>
            </View>

            <View style={styles.fijo}>
              <Ionicons name="lock-closed-outline" size={16} color={vidrio.textoTenue} />
              <Text style={styles.fijoTexto}>
                Cliente desde {formatearMesAnio(perfil.clienteDesde)} — lo fija el banco, no se
                puede editar.
              </Text>
            </View>
          </View>

          {errorGuardado ? <Text style={styles.error}>{errorGuardado}</Text> : null}

          <View style={styles.acciones}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios"
              accessibilityState={{ disabled: !cambio || guardando }}
              onPress={handleGuardar}
              disabled={!cambio || guardando}
              style={({ pressed }) => [
                styles.guardar,
                pressed && styles.presionado,
                (!cambio || guardando) && styles.inactivo,
              ]}
            >
              <Text style={styles.guardarTexto}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.cancelar, pressed && styles.presionado]}
            >
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>

          <Text style={styles.nota}>
            Nombre, usuario, teléfono y fecha de nacimiento se guardan en Postgres al presionar
            "Guardar cambios".
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: espacio.lg, gap: espacio.xl },

  avatarZona: { alignItems: 'center', gap: espacio.md, paddingTop: espacio.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radio.completo,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 28, fontWeight: '700', color: colores.marca },
  avatarNota: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: vidrio.textoTenue,
    maxWidth: 260,
  },

  formulario: { gap: espacio.lg },

  fijo: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  fijoTexto: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: vidrio.textoTenue },

  error: { fontSize: 12, lineHeight: 16, textAlign: 'center', color: '#ffb4b4' },

  acciones: { gap: espacio.md },
  guardar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.md,
    backgroundColor: colores.acento,
    paddingVertical: espacio.md,
  },
  guardarTexto: { fontSize: 15, fontWeight: '700', color: colores.textoSobreAcento },
  inactivo: { opacity: 0.4 },
  cancelar: { alignItems: 'center', justifyContent: 'center', paddingVertical: espacio.sm },
  cancelarTexto: { fontSize: 13, fontWeight: '600', color: colores.textoInverso },
  presionado: { opacity: 0.8 },

  nota: { fontSize: 11, lineHeight: 16, textAlign: 'center', color: vidrio.textoTenue },
});
