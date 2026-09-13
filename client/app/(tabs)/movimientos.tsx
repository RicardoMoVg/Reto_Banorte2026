import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
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
import { PantallaMarca } from '../../components/ui/PantallaMarca';
import { colores, espacio, radio, tipografia, vidrio } from '../../lib/ui/theme';

/* ─── Tipos ─────────────────────────────────────────────────────────── */

interface Movimiento {
  id: string;
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

const MOVIMIENTOS_DEMO: Movimiento[] = [
  { id: 'm1', numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-14', monto: -1200, concepto: 'Pago de servicios', icono: 'receipt-outline' },
  { id: 'm2', numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-14', monto: -1200, concepto: 'Transferencia a terceros', icono: 'swap-horizontal-outline' },
  { id: 'm3', numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-12', monto: -900, concepto: 'Gasolina', icono: 'car-outline' },
  { id: 'm4', numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-11', monto: -219, concepto: 'Netflix', icono: 'tv-outline' },
  { id: 'm5', numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-08', monto: -85, concepto: 'Café El Urbano', icono: 'cafe-outline' },
  { id: 'm6', numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-06', monto: -420, concepto: 'Cine', icono: 'film-outline' },
  { id: 'm7', numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-05', monto: 15000, concepto: 'Depósito nómina', icono: 'briefcase-outline' },
  { id: 'm8', numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-03', monto: -1850, concepto: 'Supermercado La Comer', icono: 'cart-outline' },
];

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
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(anio, mes - 1, dia));
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
  const [seleccionado, setSeleccionado] = useState<Movimiento | null>(null);

  /* Animación del bottom sheet (slide-up). */
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const SHEET_HEIGHT = 380;

  function abrirSheet(m: Movimiento) {
    setSeleccionado(m);
    Animated.spring(sheetAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }

  function cerrarSheet() {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
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

  const movimientosFiltrados = MOVIMIENTOS_DEMO.filter((m) => {
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
            {formatearFecha(item.fecha)} · •• {item.numeroTarjeta.slice(-4)}
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
            <Ionicons name="document-text-outline" size={32} color={vidrio.textoTenue} />
            <Text style={styles.vacioTexto}>No hay movimientos con este filtro</Text>
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
                    {formatearFecha(seleccionado.fecha)} · •• {seleccionado.numeroTarjeta.slice(-4)} · {seleccionado.tipoTarjeta}
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
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
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
