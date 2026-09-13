import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EstadoVacio } from '../../components/ui/EstadoVacio';
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import {
  actualizarEstadoTarjeta,
  getTarjetas,
  obtenerCvv,
  type TarjetaCreditoApi,
  type TarjetaDebitoApi,
} from '../../lib/api/rest';
import { colores, espacio, radio, vidrio } from '../../lib/ui/theme';

type TipoTarjeta = 'crédito' | 'débito';

/** Forma común para pintar crédito y débito con el mismo `<Tarjeta>` -- difieren en si traen límite/saldo. */
interface DatoTarjeta {
  id: string;
  tipoApi: 'credito' | 'debito';
  tipo: TipoTarjeta;
  alias: string;
  marca: string;
  ultimos4: string;
  vencimiento: string;
  activa: boolean;
}

function aDatoCredito(t: TarjetaCreditoApi): DatoTarjeta {
  return {
    id: t.id,
    tipoApi: 'credito',
    tipo: 'crédito',
    alias: t.alias,
    marca: t.marca ?? '—',
    ultimos4: t.ultimos4 ?? '····',
    vencimiento: t.vencimiento ?? '—',
    activa: t.activa,
  };
}

function aDatoDebito(t: TarjetaDebitoApi): DatoTarjeta {
  return {
    id: t.id,
    tipoApi: 'debito',
    tipo: 'débito',
    alias: t.alias,
    marca: t.marca ?? '—',
    ultimos4: t.ultimos4 ?? '····',
    vencimiento: t.vencimiento ?? '—',
    activa: t.activa,
  };
}

/**
 * Pantalla de Tarjetas (Billetera).
 *
 * Conectada de verdad a Postgres (crédito y débito, vía `GET /api/tarjetas`)
 * -- antes vivía aquí como `TARJETAS_DEMO`/`CVV_DEMO` hardcodeados. El
 * CVV se genera al momento en cada consulta (`POST /api/tarjetas/cvv`):
 * nunca se guarda, así que sí cambia entre una consulta y la siguiente,
 * a diferencia del valor estático de antes.
 */
export default function Tarjetas() {
  const insets = useSafeAreaInsets();
  const [tarjetas, setTarjetas] = useState<DatoTarjeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cvv, setCvv] = useState<Record<string, string>>({});
  const [cargandoCvv, setCargandoCvv] = useState<Record<string, boolean>>({});
  const [cargandoEstado, setCargandoEstado] = useState<Record<string, boolean>>({});
  const [errorPorTarjeta, setErrorPorTarjeta] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { credito, debito } = await getTarjetas();
      setTarjetas([...credito.map(aDatoCredito), ...debito.map(aDatoDebito)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus tarjetas.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function toggleActiva(t: DatoTarjeta) {
    setCargandoEstado((prev) => ({ ...prev, [t.id]: true }));
    setErrorPorTarjeta((prev) => ({ ...prev, [t.id]: '' }));
    try {
      const resultado = await actualizarEstadoTarjeta(t.id, t.tipoApi, !t.activa);
      setTarjetas((prev) => prev.map((x) => (x.id === t.id ? { ...x, activa: resultado.activa } : x)));
    } catch (e) {
      setErrorPorTarjeta((prev) => ({
        ...prev,
        [t.id]: e instanceof Error ? e.message : 'No se pudo actualizar la tarjeta.',
      }));
    } finally {
      setCargandoEstado((prev) => ({ ...prev, [t.id]: false }));
    }
  }

  async function toggleCvv(t: DatoTarjeta) {
    // Ya visible: solo se oculta, no hace falta pedir uno nuevo.
    if (cvv[t.id]) {
      setCvv((prev) => {
        const { [t.id]: _quitado, ...resto } = prev;
        return resto;
      });
      return;
    }

    setCargandoCvv((prev) => ({ ...prev, [t.id]: true }));
    setErrorPorTarjeta((prev) => ({ ...prev, [t.id]: '' }));
    try {
      const { cvv: nuevo } = await obtenerCvv(t.id, t.tipoApi);
      setCvv((prev) => ({ ...prev, [t.id]: nuevo }));
    } catch (e) {
      setErrorPorTarjeta((prev) => ({
        ...prev,
        [t.id]: e instanceof Error ? e.message : 'No se pudo obtener el CVV.',
      }));
    } finally {
      setCargandoCvv((prev) => ({ ...prev, [t.id]: false }));
    }
  }

  return (
    <PantallaMarca titulo="Tarjetas">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {cargando ? (
          <View style={styles.centro}>
            <ActivityIndicator color={colores.textoInverso} />
            <Text style={styles.centroTexto}>Cargando tus tarjetas…</Text>
          </View>
        ) : error ? (
          <View style={styles.centro}>
            <Ionicons name="cloud-offline-outline" size={32} color={vidrio.textoTenue} />
            <Text style={styles.centroTexto}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
              onPress={cargar}
              style={({ pressed }) => [styles.reintentar, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="refresh" size={14} color={colores.textoInverso} />
              <Text style={styles.reintentarTexto}>Reintentar</Text>
            </Pressable>
          </View>
        ) : tarjetas.length === 0 ? (
          <EstadoVacio
            icono="card-outline"
            titulo="Sin tarjetas"
            descripcion="Todavía no tienes ninguna tarjeta registrada."
          />
        ) : (
          tarjetas.map((t) => (
            <View key={t.id} style={styles.tarjeta}>
              {/* — Encabezado de la tarjeta — */}
              <View style={styles.encabezado}>
                <View style={styles.marcaRow}>
                  <Ionicons
                    name={t.tipo === 'crédito' ? 'card-outline' : 'wallet-outline'}
                    size={20}
                    color={colores.acento}
                  />
                  <Text style={styles.marcaTexto}>{t.marca}</Text>
                </View>
                <View style={styles.tipoBadge}>
                  <Text style={styles.tipoTexto}>{t.tipo}</Text>
                </View>
              </View>

              {/* — Número — */}
              <Text style={styles.numero}>•••• •••• •••• {t.ultimos4}</Text>

              {/* — Vencimiento — */}
              <View style={styles.fila}>
                <Text style={styles.etiqueta}>Vencimiento</Text>
                <Text style={styles.valor}>{t.vencimiento}</Text>
              </View>

              {/* — CVV dinámico — */}
              <View style={styles.fila}>
                <Text style={styles.etiqueta}>CVV</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={cvv[t.id] ? 'Ocultar CVV' : 'Mostrar CVV'}
                  onPress={() => toggleCvv(t)}
                  disabled={cargandoCvv[t.id]}
                  style={({ pressed }) => [styles.cvvBoton, pressed && styles.presionado]}
                >
                  {cargandoCvv[t.id] ? (
                    <ActivityIndicator size="small" color={colores.acento} />
                  ) : (
                    <Text style={styles.cvvTexto}>{cvv[t.id] ?? '•••'}</Text>
                  )}
                  <Ionicons
                    name={cvv[t.id] ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={colores.acento}
                  />
                </Pressable>
              </View>

              {/* — Switch encender/apagar plástico — */}
              <View style={[styles.fila, styles.switchFila]}>
                <View style={styles.switchInfo}>
                  <Ionicons
                    name={t.activa ? 'shield-checkmark-outline' : 'shield-outline'}
                    size={18}
                    color={t.activa ? colores.positivo : colores.textoTenue}
                  />
                  <Text style={[styles.switchTexto, !t.activa && styles.inactiva]}>
                    Plástico {t.activa ? 'activo' : 'apagado'}
                  </Text>
                </View>
                {cargandoEstado[t.id] ? (
                  <ActivityIndicator size="small" color={colores.acento} />
                ) : (
                  <Switch
                    value={t.activa}
                    onValueChange={() => toggleActiva(t)}
                    trackColor={{ false: '#767577', true: colores.acento }}
                    thumbColor={colores.superficie}
                    accessibilityLabel={`${t.activa ? 'Apagar' : 'Encender'} tarjeta •• ${t.ultimos4}`}
                  />
                )}
              </View>

              {errorPorTarjeta[t.id] ? (
                <Text style={styles.errorTarjeta}>{errorPorTarjeta[t.id]}</Text>
              ) : null}
            </View>
          ))
        )}

        {tarjetas.length > 0 ? (
          <Text style={styles.nota}>
            El CVV se genera al momento en cada consulta: nunca se guarda, así que cambia entre una
            consulta y la siguiente.
          </Text>
        ) : null}
      </ScrollView>
    </PantallaMarca>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: espacio.lg, gap: espacio.lg },

  centro: { alignItems: 'center', justifyContent: 'center', gap: espacio.sm, paddingTop: espacio.xxl },
  centroTexto: { fontSize: 13, color: vidrio.textoTenue, textAlign: 'center' },
  reintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    marginTop: espacio.xs,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: vidrio.borde,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  reintentarTexto: { fontSize: 12, fontWeight: '600', color: colores.textoInverso },

  tarjeta: {
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    padding: espacio.lg,
    gap: espacio.md,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marcaRow: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  marcaTexto: { fontSize: 16, fontWeight: '700', color: colores.textoInverso },

  tipoBadge: {
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: vidrio.borde,
    backgroundColor: vidrio.fondo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  tipoTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: colores.acento,
    textTransform: 'capitalize',
  },

  numero: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    color: colores.textoInverso,
    paddingVertical: espacio.sm,
  },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espacio.xs,
  },
  etiqueta: { fontSize: 12, color: vidrio.textoTenue },
  valor: { fontSize: 14, fontWeight: '600', color: colores.textoInverso },

  cvvBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.borde,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
    minWidth: 64,
    justifyContent: 'center',
  },
  cvvTexto: { fontSize: 14, fontWeight: '700', color: colores.textoInverso },
  presionado: { opacity: 0.7 },

  switchFila: {
    borderTopWidth: 1,
    borderTopColor: vidrio.borde,
    paddingTop: espacio.md,
    marginTop: espacio.xs,
  },
  switchInfo: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  switchTexto: { fontSize: 13, fontWeight: '600', color: colores.textoInverso },
  inactiva: { color: vidrio.textoTenue },

  errorTarjeta: { fontSize: 11, lineHeight: 15, color: '#ffb4b4' },

  nota: {
    fontSize: 11,
    lineHeight: 16,
    color: vidrio.textoTenue,
    paddingHorizontal: espacio.xs,
  },
});
