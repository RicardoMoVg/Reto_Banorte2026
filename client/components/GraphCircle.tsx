import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface GraphCircleProps {
  titulo?: string;
  mensajeAgente?: string;
  categorias: Array<{
    nombre: string;
    monto: number;
    color?: string;
  }>;
}

const TAMANIO = 160;
const RADIO = 70;
const GROSOR = 3;
const MARGEN = 24;
const DIST = TAMANIO / 2;

const PALETA = ['#45b767', '#022a5a', '#EB0029', '#f59e0b', '#2563eb', '#a21caf'];

/**
 * Gráfica de pastel sin dependencias (View/Text/StyleSheet): cada rebanada se
 * dibuja como un "rayo" delgado rotado desde el centro del círculo. La leyenda
 * con los nombres de cada partición vive abajo, alineada a la derecha.
 */
export function GraphCircle({ titulo, mensajeAgente, categorias }: GraphCircleProps) {
  const entradas = (categorias ?? []).map((c, i) => ({
    ...c,
    monto: Math.max(0, c.monto),
    color: c.color ?? PALETA[i % PALETA.length],
  }));

  const total = entradas.reduce((acc, c) => acc + c.monto, 0);

  let acumulado = 0;
  const rebanadas = entradas.map((c) => {
    const angulo = total > 0 ? (c.monto / total) * 360 : 0;
    const rebanada = { ...c, angulo, desde: acumulado };
    acumulado += angulo;
    return rebanada;
  });

  const unicaRebanada = rebanadas.length === 1;

  return (
    <View style={styles.contenedor}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}

      {rebanadas.length === 0 ? (
        <Text style={styles.textoVacio}>No hay datos para mostrar el pastel.</Text>
      ) : (
        <View style={styles.graficoArea}>
          <View
            style={[
              styles.plotContenedor,
              { width: TAMANIO + MARGEN * 2, height: TAMANIO + MARGEN * 2 },
            ]}
          >
            <View
              style={[
                styles.circulo,
                {
                  left: MARGEN,
                  top: MARGEN,
                  width: TAMANIO,
                  height: TAMANIO,
                  borderRadius: TAMANIO / 2,
                },
              ]}
            >
              {unicaRebanada ? (
                <View
                  style={[
                    styles.circulo,
                    {
                      width: TAMANIO,
                      height: TAMANIO,
                      borderRadius: TAMANIO / 2,
                      backgroundColor: rebanadas[0].color,
                    },
                  ]}
                />
              ) : (
                rebanadas.map((r, indice) => {
                  const rayos = [];
                  for (let d = 0; d < r.angulo; d += 1) {
                    rayos.push(
                      <View
                        key={`${indice}-${d}`}
                        style={[
                          styles.pivote,
                          { transform: [{ rotate: `${r.desde + d - 90}deg` }] },
                        ]}
                      >
                        <View style={[styles.rayo, { backgroundColor: r.color }]} />
                      </View>,
                    );
                  }
                  return rayos;
                })
              )}
            </View>

            {rebanadas.map((r) => {
              const rad = ((r.desde + r.angulo / 2 - 90) * Math.PI) / 180;
              const cx = MARGEN + TAMANIO / 2 + Math.cos(rad) * DIST;
              const cy = MARGEN + TAMANIO / 2 + Math.sin(rad) * DIST;
              return (
                <Text
                  key={`valor-${r.nombre}`}
                  style={[styles.labelValor, { left: cx - 32, top: cy - 7 }]}
                >
                  {r.monto.toLocaleString('es-MX')}
                </Text>
              );
            })}
          </View>

          <View style={styles.leyenda}>
            {rebanadas.map((r) => (
              <View key={r.nombre} style={styles.filaLeyenda}>
                <View style={[styles.punto, { backgroundColor: r.color }]} />
                <Text style={styles.nombreLeyenda} numberOfLines={1}>
                  {r.nombre}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  graficoArea: {
    alignItems: 'center',
  },
  plotContenedor: {
    alignSelf: 'center',
  },
  circulo: {
    position: 'absolute',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  labelValor: {
    position: 'absolute',
    width: 64,
    fontSize: 9,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
  },
  rayo: {
    position: 'absolute',
    left: 0,
    top: -GROSOR / 2,
    width: RADIO,
    height: GROSOR,
    borderTopLeftRadius: GROSOR / 2,
    borderBottomLeftRadius: GROSOR / 2,
  },
  pivote: {
    position: 'absolute',
    left: TAMANIO / 2,
    top: TAMANIO / 2,
    width: 0,
    height: 0,
  },
  leyenda: {
    alignSelf: 'flex-end',
    marginTop: 12,
    alignItems: 'flex-end',
    gap: 6,
  },
  filaLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nombreLeyenda: {
    fontSize: 12,
    color: '#404040',
  },
});