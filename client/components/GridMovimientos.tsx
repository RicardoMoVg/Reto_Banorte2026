import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';

export interface Movimiento {
  numeroTarjeta: string;
  tipoTarjeta: string;
  fecha: string;
  idUsuario: string;
  monto: number;
  concepto: string;
}

export interface GridMovimientosProps {
  titulo?: string;
  mensajeAgente?: string;
  movimientos: Movimiento[];
}

const MAX_ALTO = 240;

function formatoMonto(n: number): string {
  return `${n < 0 ? '-' : '+'}$${Math.abs(n).toLocaleString('es-MX')}`;
}

function formatoFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function GridMovimientos({ titulo, mensajeAgente, movimientos }: GridMovimientosProps) {
  const [seleccionado, setSeleccionado] = useState<Movimiento | null>(null);

  if (!movimientos || !Array.isArray(movimientos) || movimientos.length === 0) {
    return (
      <View style={styles.contenedor}>
        {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
        {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}
        <Text style={styles.textoVacio}>No hay movimientos para mostrar.</Text>
      </View>
    );
  }

  const ordenados = [...movimientos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return (
    <View style={styles.contenedor}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}

      <ScrollView
        style={styles.scroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {ordenados.map((m, indice) => (
          <Pressable
            key={`mov-${indice}`}
            style={({ pressed }) => [styles.fila, pressed && styles.filaPresionada]}
            onPress={() => setSeleccionado(m)}
          >
            <View style={styles.filaInfo}>
              <Text style={styles.concepto} numberOfLines={1}>
                {m.concepto}
              </Text>
              <Text style={styles.tarjeta} numberOfLines={1}>
                {m.numeroTarjeta.slice(-4)} · {m.tipoTarjeta}
              </Text>
            </View>
            <Text style={[styles.monto, { color: m.monto >= 0 ? '#059669' : '#171717' }]}>
              {formatoMonto(m.monto)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Modal
        visible={seleccionado !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSeleccionado(null)}
      >
        <Pressable style={styles.fondoModal} onPress={() => setSeleccionado(null)}>
          {seleccionado ? (
            <Pressable style={styles.tarjetaModal}>
              <Text style={styles.tituloModal}>Movimiento</Text>

              <View style={styles.filaDetalle}>
                <Text style={styles.etiquetaDetalle}>Concepto</Text>
                <Text style={styles.valorDetalle}>{seleccionado.concepto}</Text>
              </View>
              <View style={styles.filaDetalle}>
                <Text style={styles.etiquetaDetalle}>Importe</Text>
                <Text
                  style={[
                    styles.valorDetalle,
                    { color: seleccionado.monto >= 0 ? '#059669' : '#171717' },
                  ]}
                >
                  {formatoMonto(seleccionado.monto)}
                </Text>
              </View>
              <View style={styles.filaDetalle}>
                <Text style={styles.etiquetaDetalle}>Tipo de tarjeta</Text>
                <Text style={styles.valorDetalle}>{seleccionado.tipoTarjeta}</Text>
              </View>
              <View style={styles.filaDetalle}>
                <Text style={styles.etiquetaDetalle}>Tarjeta</Text>
                <Text style={styles.valorDetalle}>•• {seleccionado.numeroTarjeta.slice(-4)}</Text>
              </View>
              <View style={styles.filaDetalle}>
                <Text style={styles.etiquetaDetalle}>Fecha</Text>
                <Text style={styles.valorDetalle}>{formatoFecha(seleccionado.fecha)}</Text>
              </View>
              <View style={styles.filaDetalle}>
                <Text style={styles.etiquetaDetalle}>Usuario</Text>
                <Text style={styles.valorDetalle}>{seleccionado.idUsuario}</Text>
              </View>

              <Pressable style={styles.botonCerrar} onPress={() => setSeleccionado(null)}>
                <Text style={styles.textoCerrar}>Cerrar</Text>
              </Pressable>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginVertical: 4,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 4,
  },
  mensaje: {
    fontSize: 13,
    color: '#525252',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textoVacio: {
    fontSize: 13,
    color: '#a3a3a3',
    textAlign: 'center',
    padding: 10,
  },
  scroll: {
    flexGrow: 0,
    maxHeight: MAX_ALTO,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filaPresionada: {
    backgroundColor: '#f9fafb',
  },
  filaInfo: {
    flex: 1,
    gap: 2,
  },
  concepto: {
    fontSize: 13,
    fontWeight: '500',
    color: '#171717',
  },
  tarjeta: {
    fontSize: 11,
    color: '#a3a3a3',
  },
  monto: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tarjetaModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  tituloModal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 12,
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  etiquetaDetalle: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  valorDetalle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'right',
  },
  botonCerrar: {
    marginTop: 16,
    backgroundColor: '#022a5a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoCerrar: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});