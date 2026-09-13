import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTransacciones, type TransaccionApi } from '../../lib/api/rest';
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import { colores, espacio, radio, tipografia, vidrio } from '../../lib/ui/theme';

/* ─── Tipos ─────────────────────────────────────────────────────────── */

interface Movimiento {
  id: string;
  /**
   * Contexto del movimiento. Hoy es la categoria: la base no guarda numero
   * de tarjeta ni liga el movimiento con una, asi que mostrar "•• 4321"
   * seria inventarlo.
   */
  numeroTarjeta: string;
  tipoTarjeta: string;
  fecha: string;
  concepto: string;
  monto: number;
  /** Icono semántico de la categoría. */
  icono: keyof typeof Ionicons.glyphMap;
}

interface QuickAction {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  /** Ruta de expo-router a la que navega el botón. */
  ruta: string;
}

/* ─── Datos demo ────────────────────────────────────────────────────── */

/**
 * Icono por categoria. El dato real trae `categoria` (comida, transporte,
 * transferencia...), no un icono: el icono es decision de UI, asi que se
 * mapea aqui y no se le pide al servidor.
 */
const ICONO_CATEGORIA: Record<string, keyof typeof Ionicons.glyphMap> = {
  comida: 'restaurant-outline',
  transporte: 'car-outline',
  suscripciones: 'tv-outline',
  transferencia: 'swap-horizontal-outline',
  ingreso: 'arrow-down-circle-outline',
  servicios: 'receipt-outline',
  entretenimiento: 'film-outline',
  salud: 'medkit-outline',
};

/** Convierte lo que devuelve la API a lo que pinta esta pantalla. */
function aMovimiento(t: TransaccionApi): Movimiento {
  return {
    id: t.id,
    // La base no guarda numero de tarjeta ni relaciona el movimiento con
    // una: se muestra la categoria, que si es un dato real y ademas dice
    // mas que "•• 4321".
    numeroTarjeta: t.categoria ?? 'sin categoria',
    tipoTarjeta: t.categoria ?? '',
    fecha: t.fecha,
    concepto: t.descripcion,
    monto: t.monto,
    icono: ICONO_CATEGORIA[t.categoria?.toLowerCase()] ?? 'ellipse-outline',
  };
}

const ACCIONES_RAPIDAS: QuickAction[] = [
  { icono: 'swap-horizontal-outline', texto: 'Transferir', ruta: '/transferir' },
  { icono: 'card-outline', texto: 'Pagar Servicios', ruta: '/pagar-servicios' },
  { icono: 'phone-portrait-outline', texto: 'Retiro sin Tarjeta', ruta: '/retiro-sin-tarjeta' },
  { icono: 'flash-outline', texto: 'DiMo', ruta: '/dimo' },
];

/** Opciones que aparecen en el bottom sheet al tocar un movimiento. */
const OPCIONES_MOVIMIENTO: { icono: keyof typeof Ionicons.glyphMap; texto: string }[] = [
  { icono: 'document-text-outline', texto: 'Ver comprobante' },
  { icono: 'people-outline', texto: 'Dividir cuenta' },
  { icono: 'alert-circle-outline', texto: 'Desconocer cargo' },
];

/**
 * El driver nativo de animaciones no existe en web: ahi RN avisa que se
 * cae a animacion por JS. Se activa solo en nativo, que es donde si
 * aporta (saca la animacion del hilo de JS) -- en web el resultado visual
 * es el mismo, nomas sin la advertencia en consola.
 */
const USAR_DRIVER_NATIVO = Platform.OS !== 'web';

type Filtro = 'todos' | 'ingresos' | 'egresos';

const FILTROS: { clave: Filtro; etiqueta: string }[] = [
  { clave: 'todos', etiqueta: 'Todos' },
  { clave: 'ingresos', etiqueta: 'Ingresos' },
  { clave: 'egresos', etiqueta: 'Egresos' },
];

/* ─── Utilidades ────────────────────────────────────────────────────── */

function formatearMonto(monto: number) {
  const abs = Math.abs(monto);
  const signo = monto >= 0 ? '+' : '−';
  return `${signo}$${abs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

function formatearFecha(iso: string) {
  // Postgres devuelve el timestamp completo ("2026-09-13T09:31:57.160Z"),
  // no "AAAA-MM-DD": partir por guiones dejaba el dia en NaN y se pintaba
  // el ISO crudo en pantalla.
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fecha);
}

/* ─── Subcomponentes ────────────────────────────────────────────────── */

/** Botón circular del carrusel de acciones rápidas. */
function QuickActionIcon({ icono, texto, ruta }: QuickAction) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={() => router.push(ruta as any)}
      style={({ pressed }) => [styles.qaBoton, pressed && styles.presionado]}
    >
      <View style={styles.qaCirculo}>
        <Ionicons name={icono} size={22} color={colores.textoInverso} />
      </View>
      <Text style={styles.qaTexto} numberOfLines={2}>
        {texto}
      </Text>
    </Pressable>
  );
}

/** Opción individual dentro del bottom sheet. */
function OpcionSheet({
  icono,
  texto,
  onPress,
  peligro = false,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  texto: string;
  onPress: () => void;
  peligro?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={onPress}
      style={({ pressed }) => [styles.sheetOpcion, pressed && styles.presionado]}
    >
      <View style={[styles.sheetIcono, peligro && styles.sheetIconoPeligro]}>
        <Ionicons
          name={icono}
          size={18}
          color={peligro ? '#EB0029' : colores.acento}
        />
      </View>
      <Text style={[styles.sheetTexto, peligro && styles.sheetTextoPeligro]}>{texto}</Text>
      <Ionicons name="chevron-forward" size={16} color={vidrio.textoTenue} />
    </Pressable>
  );
}

/* ─── Pantalla principal ────────────────────────────────────────────── */

/**
 * Pantalla de Movimientos (Historial).
 *
 * Lista cronológica con acciones rápidas, barra de herramientas y bottom
 * sheet de opciones por transacción. Aspecto de banca electrónica realista.
 */
export default function Movimientos() {
  const insets = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Los movimientos salen del endpoint REST, no de una constante.
   *
   * Va por REST y no por el agente a proposito: una pantalla tradicional
   * no debe depender del LLM para listar movimientos (constitution.md
   * 3.3). El endpoint reusa las mismas funciones de MCP que usa el chat.
   */
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { transacciones } = await getTransacciones({ limite: 50 });
      setMovimientos(transacciones.map(aMovimiento));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus movimientos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);
  const [seleccionado, setSeleccionado] = useState<Movimiento | null>(null);

  /* Animación del bottom sheet (slide-up). */
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const SHEET_HEIGHT = 380;

  function abrirSheet(m: Movimiento) {
    setSeleccionado(m);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: USAR_DRIVER_NATIVO,
      damping: 20,
      stiffness: 200,
    }).start();
  }

  function cerrarSheet() {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: USAR_DRIVER_NATIVO,
    }).start(() => setSeleccionado(null));
  }

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  const overlayOpacity = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const movimientosFiltrados = movimientos.filter((m) => {
    if (filtro === 'ingresos') return m.monto >= 0;
    if (filtro === 'egresos') return m.monto < 0;
    return true;
  });

  /* ── Render de cada fila ── */

  function renderItem({ item }: { item: Movimiento }) {
    const esIngreso = item.monto >= 0;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.concepto}, ${formatearMonto(item.monto)}`}
        onPress={() => abrirSheet(item)}
        style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
      >
        <View style={[styles.iconoFila, esIngreso && styles.iconoIngreso]}>
          <Ionicons
            name={item.icono}
            size={18}
            color={esIngreso ? colores.positivo : 'rgba(235, 0, 41, 0.85)'}
          />
        </View>

        <View style={styles.textoFila}>
          <Text style={styles.concepto} numberOfLines={1}>{item.concepto}</Text>
          <Text style={styles.fecha}>
            {formatearFecha(item.fecha)} · {item.numeroTarjeta}
          </Text>
        </View>

        <View style={styles.montoCol}>
          <Text style={[styles.monto, esIngreso && styles.montoPositivo]}>
            {formatearMonto(item.monto)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={vidrio.textoTenue} />
        </View>
      </Pressable>
    );
  }

  /* ── Header de la FlatList (acciones rápidas + toolbar) ── */

  function ListHeader() {
    return (
      <>
        {/* ── Carrusel de acciones rápidas ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.qaScroll}
        >
          {ACCIONES_RAPIDAS.map((a) => (
            <QuickActionIcon key={a.texto} {...a} />
          ))}
        </ScrollView>

        {/* ── Barra de herramientas: filtros + iconos ── */}
        <View style={styles.toolbar}>
          <View style={styles.filtros}>
            {FILTROS.map((f) => (
              <Pressable
                key={f.clave}
                accessibilityRole="button"
                accessibilityLabel={f.etiqueta}
                accessibilityState={{ selected: filtro === f.clave }}
                onPress={() => setFiltro(f.clave)}
                style={[styles.filtro, filtro === f.clave && styles.filtroActivo]}
              >
                <Text style={[styles.filtroTexto, filtro === f.clave && styles.filtroTextoActivo]}>
                  {f.etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.toolbarIconos}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Buscar movimiento"
              onPress={() => console.log('TODO: buscar')}
              style={({ pressed }) => [styles.toolbarBtn, pressed && styles.presionado]}
            >
              <Ionicons name="search-outline" size={18} color={colores.textoInverso} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Descargar estado de cuenta"
              onPress={() => console.log('TODO: descargar estado de cuenta')}
              style={({ pressed }) => [styles.toolbarBtn, pressed && styles.presionado]}
            >
              <Ionicons name="download-outline" size={18} color={colores.textoInverso} />
            </Pressable>
          </View>
        </View>

        {/* Separador visual */}
        <View style={styles.toolbarBorde} />
      </>
    );
  }

  /* ── Render principal ── */

  return (
    <PantallaMarca titulo="Movimientos">
      <FlatList
        data={movimientosFiltrados}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[styles.lista, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={
          <View style={styles.vacio}>
            {cargando ? (
              <>
                <ActivityIndicator color={colores.textoInverso} />
                <Text style={styles.vacioTexto}>Cargando tus movimientos…</Text>
              </>
            ) : error ? (
              <>
                <Ionicons name="cloud-offline-outline" size={32} color={vidrio.textoTenue} />
                {/* Se muestra el error del servidor, no un "algo salió mal":
                    si falta configuracion o el backend no esta arriba, el
                    mensaje lo dice y ahorra el viaje al log. */}
                <Text style={styles.vacioTexto}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reintentar"
                  onPress={cargar}
                  style={({ pressed }) => [styles.reintentar, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="refresh" size={14} color={colores.textoInverso} />
                  <Text style={styles.reintentarTexto}>Reintentar</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Ionicons name="document-text-outline" size={32} color={vidrio.textoTenue} />
                <Text style={styles.vacioTexto}>No hay movimientos con este filtro</Text>
              </>
            )}
          </View>
        }
      />

      {/* ── Bottom Sheet (overlay + panel) ── */}
      <Modal
        visible={seleccionado !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={cerrarSheet}
      >
        {/* Overlay */}
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar opciones"
            style={{ flex: 1 }}
            onPress={cerrarSheet}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { height: SHEET_HEIGHT, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.sheetHandleZone}>
            <View style={styles.sheetHandle} />
          </View>

          {seleccionado && (
            <>
              {/* Resumen del movimiento */}
              <View style={styles.sheetHeader}>
                <View style={[
                  styles.sheetHeaderIcono,
                  seleccionado.monto >= 0 && styles.iconoIngreso,
                ]}>
                  <Ionicons
                    name={seleccionado.icono}
                    size={22}
                    color={seleccionado.monto >= 0 ? colores.positivo : 'rgba(235, 0, 41, 0.85)'}
                  />
                </View>
                <View style={styles.sheetHeaderTexto}>
                  <Text style={styles.sheetConcepto}>{seleccionado.concepto}</Text>
                  <Text style={styles.sheetFecha}>
                    {formatearFecha(seleccionado.fecha)} · {seleccionado.numeroTarjeta}
                  </Text>
                </View>
                <Text style={[
                  styles.sheetMonto,
                  seleccionado.monto >= 0 && styles.montoPositivo,
                ]}>
                  {formatearMonto(seleccionado.monto)}
                </Text>
              </View>

              <View style={styles.sheetDivider} />

              {/* Opciones */}
              {OPCIONES_MOVIMIENTO.map((op, i) => (
                <OpcionSheet
                  key={op.texto}
                  icono={op.icono}
                  texto={op.texto}
                  peligro={i === OPCIONES_MOVIMIENTO.length - 1}
                  onPress={() => {
                    // TODO: implementar cada acción
                    console.log(`${op.texto} para: ${seleccionado.concepto}`);
                    cerrarSheet();
                  }}
                />
              ))}

              {/* Cancelar */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={cerrarSheet}
                style={({ pressed }) => [styles.sheetCancelar, pressed && styles.presionado]}
              >
                <Text style={styles.sheetCancelarTexto}>Cancelar</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </Modal>
    </PantallaMarca>
  );
}

/* ─── Estilos ───────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  /* ── Acciones rápidas ── */
  qaScroll: {
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.sm,
    paddingBottom: espacio.lg,
    gap: espacio.lg,
  },
  qaBoton: { alignItems: 'center', width: 72 },
  qaCirculo: {
    width: 52,
    height: 52,
    borderRadius: radio.completo,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.xs,
  },
  qaTexto: {
    fontSize: 10,
    fontWeight: '600',
    color: colores.textoInverso,
    textAlign: 'center',
    lineHeight: 13,
  },

  /* ── Toolbar (filtros + iconos) ── */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.sm,
  },
  filtros: { flexDirection: 'row', gap: espacio.sm },
  filtro: {
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: espacio.md + 2,
    paddingVertical: espacio.xs + 2,
  },
  filtroActivo: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: 'rgba(255, 255, 255, 0.9)' },
  filtroTexto: { fontSize: 11, fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)' },
  filtroTextoActivo: { color: colores.marca },
  toolbarIconos: { flexDirection: 'row', gap: espacio.sm },
  toolbarBtn: {
    width: 34,
    height: 34,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBorde: {
    height: 1,
    backgroundColor: vidrio.borde,
    marginHorizontal: espacio.lg,
    marginBottom: espacio.xs,
  },

  /* ── Lista de movimientos ── */
  lista: { paddingTop: espacio.xs },
  presionado: { opacity: 0.7 },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },
  filaPresionada: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },

  iconoFila: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    backgroundColor: 'rgba(235, 0, 41, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoIngreso: { backgroundColor: 'rgba(5, 150, 105, 0.10)' },

  textoFila: { flex: 1, gap: 2 },
  concepto: { fontSize: 14, fontWeight: '600', color: colores.textoInverso },
  fecha: { fontSize: 11, color: vidrio.textoTenue },

  montoCol: { alignItems: 'flex-end', gap: 2 },
  monto: { fontSize: 14, fontWeight: '700', color: '#EB0029' },
  montoPositivo: { color: colores.positivo },

  separador: {
    height: 1,
    backgroundColor: vidrio.borde,
    marginHorizontal: espacio.lg,
  },

  vacio: { alignItems: 'center', gap: espacio.md, paddingVertical: espacio.xxl },
  reintentar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    marginTop: espacio.md,
    borderRadius: radio.completo,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
  },
  reintentarTexto: { fontSize: 12, fontWeight: '600', color: colores.textoInverso },
  vacioTexto: { fontSize: 13, color: vidrio.textoTenue },

  /* ── Bottom Sheet ── */
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colores.superficie,
    borderTopLeftRadius: radio.lg + 8,
    borderTopRightRadius: radio.lg + 8,
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.xl,
    // Ver la nota en BotonMosaico: los `shadow*` estan deprecados en
    // react-native-web y boxShadow si tiene tipo en RN 0.86.
    boxShadow: '0px -8px 24px rgba(0, 0, 0, 0.25)',
    elevation: 16,
  },
  sheetHandleZone: { alignItems: 'center', paddingVertical: espacio.md },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: radio.completo,
    backgroundColor: colores.bordeSutil,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingBottom: espacio.md,
  },
  sheetHeaderIcono: {
    width: 44,
    height: 44,
    borderRadius: radio.md,
    backgroundColor: 'rgba(235, 0, 41, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHeaderTexto: { flex: 1, gap: 2 },
  sheetConcepto: { fontSize: 15, fontWeight: '700', color: colores.texto },
  sheetFecha: { fontSize: 11, color: colores.textoApoyo },
  sheetMonto: { fontSize: 16, fontWeight: '800', color: '#EB0029' },

  sheetDivider: {
    height: 1,
    backgroundColor: colores.bordeSutil,
    marginVertical: espacio.sm,
  },

  sheetOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: espacio.md,
  },
  sheetIcono: {
    width: 36,
    height: 36,
    borderRadius: radio.completo,
    backgroundColor: 'rgba(65, 255, 167, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconoPeligro: { backgroundColor: 'rgba(235, 0, 41, 0.08)' },
  sheetTexto: { flex: 1, fontSize: 14, fontWeight: '600', color: colores.texto },
  sheetTextoPeligro: { color: '#EB0029' },

  sheetCancelar: {
    marginTop: espacio.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingVertical: espacio.md,
    alignItems: 'center',
  },
  sheetCancelarTexto: { fontSize: 14, fontWeight: '600', color: colores.textoSecundario },
});
