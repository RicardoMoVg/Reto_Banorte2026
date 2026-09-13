import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface GraficoBarrasVerticalProps {
  titulo?: string;
  mensajeAgente?: string;
  categorias: Array<{
    nombre: string;
    monto: number;
    color?: string;
  }>;
}

export function GraficoBarras_V({ titulo, mensajeAgente, categorias }: GraficoBarrasVerticalProps) {
  if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.textoVacio}>No hay datos para mostrar el comparativo de gastos.</Text>
      </View>
    );
  }

  const montoMaximo = Math.max(...categorias.map((c) => c.monto));

  return (
    <View style={styles.contenedor}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}

      <View style={styles.graficoContainer}>
        {categorias.map((categoria, index) => {
          const porcentajeAltura = montoMaximo > 0 ? (categoria.monto / montoMaximo) * 100 : 0;

          return (
            <View key={`barra-${index}`} style={styles.columna}>
              <Text style={styles.labelMonto}>{categoria.monto.toLocaleString('es-MX')}</Text>

              <View style={styles.pistaFondo}>
                <View
                  style={[
                    styles.barraRelleno,
                    {
                      height: `${porcentajeAltura}%`,
                      // Colores intercalados: si el agente manda un color lo usamos,
                      // si no, alternamos entre verde y azul banorte
                      backgroundColor: categoria.color ?? (index % 2 === 0 ? '#45b767' : '#022a5a'),
                    },
                  ]}
                />
              </View>

              <Text style={styles.labelCategoria} numberOfLines={1}>
                {categoria.nombre}
              </Text>
            </View>
          );
        })}
      </View>
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
    marginBottom: 16,
    fontStyle: 'italic',
  },
  textoVacio: {
    fontSize: 13,
    color: '#a3a3a3',
    textAlign: 'center',
    padding: 10,
  },
  graficoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  columna: {
    flex: 1,
    alignItems: 'center',
  },
  labelMonto: {
    fontSize: 10,
    fontWeight: '600',
    color: '#525252',
    marginBottom: 4,
  },
  pistaFondo: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barraRelleno: {
    width: '100%',
    borderRadius: 6,
  },
  labelCategoria: {
    width: '100%',
    fontSize: 11,
    color: '#404040',
    textAlign: 'center',
    marginTop: 6,
  },
});