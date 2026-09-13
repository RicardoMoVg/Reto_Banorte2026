import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface GraphSplineProps {
  titulo?: string;
  mensajeAgente?: string;
  categorias: Array<{
    nombre: string;
    monto: number;
    color?: string;
  }>;
}

const ANCHO_PLOT = 280;
const ALTO_PLOT = 120;
const PAD_X = 10;
const PAD_SUPERIOR = 14;
const PAD_INFERIOR = 16;
const GROSOR = 2;
const PASOS = 12;

interface Punto {
  x: number;
  y: number;
  nombre: string;
  monto: number;
  color: string;
}

interface Trazo {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function puntoCatmullRom(p0: Punto, p1: Punto, p2: Punto, p3: Punto, t: number): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function construirCurva(puntos: Punto[]): Trazo[] {
  const trazos: Trazo[] = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[Math.max(0, i - 1)];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[Math.min(puntos.length - 1, i + 2)];

    let previoX = p1.x;
    let previoY = p1.y;
    for (let s = 1; s <= PASOS; s++) {
      const p = puntoCatmullRom(p0, p1, p2, p3, s / PASOS);
      trazos.push({ x1: previoX, y1: previoY, x2: p.x, y2: p.y });
      previoX = p.x;
      previoY = p.y;
    }
  }
  return trazos;
}

export function GraphSpline({ titulo, mensajeAgente, categorias }: GraphSplineProps) {
  if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.textoVacio}>No hay datos para mostrar la tendencia.</Text>
      </View>
    );
  }

  const colorLinea = categorias[0].color ?? '#45b767';
  const montos = categorias.map((c) => c.monto);
  const montoMaximo = Math.max(...montos);
  const montoMinimo = Math.min(...montos);
  const rango = Math.max(montoMaximo - montoMinimo, 1);

  const puntos: Punto[] = categorias.map((c, i) => {
    const x = categorias.length > 1 ? PAD_X + (i / (categorias.length - 1)) * (ANCHO_PLOT - PAD_X * 2) : ANCHO_PLOT / 2;
    const y = PAD_SUPERIOR + (1 - (c.monto - montoMinimo) / rango) * (ALTO_PLOT - PAD_SUPERIOR - PAD_INFERIOR);
    return { x, y, nombre: c.nombre, monto: c.monto, color: c.color ?? colorLinea };
  });

  const curva = construirCurva(puntos);

  return (
    <View style={styles.contenedor}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}

      <View style={styles.plot}>
        {curva.map((t, i) => {
          const dx = t.x2 - t.x1;
          const dy = t.y2 - t.y1;
          const largo = Math.sqrt(dx * dx + dy * dy);
          const angulo = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <View
              key={`trazo-${i}`}
              style={[
                styles.pivote,
                {
                  left: (t.x1 + t.x2) / 2,
                  top: (t.y1 + t.y2) / 2,
                  transform: [{ rotate: `${angulo}deg` }],
                },
              ]}
            >
              <View
                style={[
                  styles.rayo,
                  {
                    left: -largo / 2 - GROSOR / 2,
                    width: largo + GROSOR,
                    backgroundColor: colorLinea,
                  },
                ]}
              />
            </View>
          );
        })}

        {puntos.map((p, i) => (
          <View key={`punto-${i}`}>
            <Text style={[styles.labelMonto, { left: p.x - 30, top: p.y - 16 }]}>
              {p.monto.toLocaleString('es-MX')}
            </Text>
            <View style={[styles.punto, { left: p.x - 4, top: p.y - 4, backgroundColor: p.color }]} />
            <Text style={[styles.labelCategoria, { left: p.x - 40, top: ALTO_PLOT - 14 }]} numberOfLines={1}>
              {p.nombre}
            </Text>
          </View>
        ))}
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
  plot: {
    width: ANCHO_PLOT,
    height: ALTO_PLOT,
    alignSelf: 'center',
  },
  pivote: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  rayo: {
    position: 'absolute',
    top: -GROSOR / 2,
    height: GROSOR,
    borderRadius: GROSOR / 2,
  },
  punto: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labelMonto: {
    position: 'absolute',
    width: 60,
    fontSize: 9,
    fontWeight: '600',
    color: '#525252',
    textAlign: 'center',
  },
  labelCategoria: {
    position: 'absolute',
    width: 80,
    fontSize: 10,
    color: '#404040',
    textAlign: 'center',
  },
});