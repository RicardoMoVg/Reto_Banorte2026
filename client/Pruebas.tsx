import { ScrollView, StatusBar, StyleSheet, Platform } from 'react-native';
import { GraficoBarras_H } from './components/GraphBar_H';
import { GraficoBarras_V } from './components/GraphBar_V';
import { GraphCircle } from './components/GraphCircle';
import { GraphSemiCircle } from './components/GraphSemiCircle';
import { GraphSpline } from './components/GraphSpline';
import { GridMovimientos } from './components/GridMovimientos';

const CATEGORIAS = [
  { nombre: 'Comida', monto: 1850 },
  { nombre: 'Diversión', monto: 420 },
  { nombre: 'Transporte', monto: 900 },
  { nombre: 'Renta', monto: 6500 },
];

const LIMITE_CREDITO = 20000;
const GASTOS_TARJETA = CATEGORIAS.reduce((acc, c) => acc + c.monto, 0);
const PAGADO_TARJETA = 4000;

const MOVIMIENTOS = [
  { numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-03', idUsuario: 'demo-user', monto: 1850, concepto: 'Supermercado La Comer' },
  { numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-06', idUsuario: 'demo-user', monto: 420, concepto: 'Cine' },
  { numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-12', idUsuario: 'demo-user', monto: 900, concepto: 'Gasolina' },
  { numeroTarjeta: '4000 1234 5678 4321', tipoTarjeta: 'crédito', fecha: '2026-09-14', idUsuario: 'demo-user', monto: 1200, concepto: 'Pago' },
  { numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-05', idUsuario: 'demo-user', monto: 15000, concepto: 'Depósito nómina' },
  { numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-08', idUsuario: 'demo-user', monto: -85, concepto: 'Café' },
  { numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-11', idUsuario: 'demo-user', monto: -219, concepto: 'Netflix' },
  { numeroTarjeta: '5200 3344 5566 2045', tipoTarjeta: 'débito', fecha: '2026-09-14', idUsuario: 'demo-user', monto: -1200, concepto: 'Transferencia' },
];

export default function Pruebas() {
  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <GraficoBarras_H
        titulo="Tus gastos de septiembre"
        mensajeAgente="La renta sigue siendo tu gasto más fuerte este mes."
        categorias={CATEGORIAS}
      />

      <GraficoBarras_V
        titulo="Tus gastos de septiembre"
        mensajeAgente="La renta sigue siendo tu gasto más fuerte este mes."
        categorias={CATEGORIAS}
      />

      <GraphCircle
        titulo="Tus gastos de septiembre"
        mensajeAgente="La renta concentra casi la mitad de tu gasto."
        categorias={CATEGORIAS}
      />

      <GraphSpline
        titulo="Evolución de tus gastos de septiembre"
        mensajeAgente="La tendencia de tus gastos va a la baja conforme avanza el mes."
        categorias={CATEGORIAS}
      />

      <GraphSemiCircle
        titulo="Tarjeta de crédito •• 4321"
        mensajeAgente={`Has pagado $${PAGADO_TARJETA.toLocaleString('es-MX')} de tu límite de $${LIMITE_CREDITO.toLocaleString('es-MX')}; tu deuda acumulada es $${GASTOS_TARJETA.toLocaleString('es-MX')}.`}
        valor={PAGADO_TARJETA}
        meta={LIMITE_CREDITO}
        marcador={GASTOS_TARJETA}
      />

      <GridMovimientos
        titulo="Todos los movimientos"
        mensajeAgente="Toca un movimiento para ver su detalle."
        movimientos={MOVIMIENTOS}
      />
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 16 : 16,
  },
  contenido: {
    padding: 16,
    gap: 12,
  },
});