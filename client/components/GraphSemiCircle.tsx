import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface GraphSemiCircleProps {
  titulo?: string;
  mensajeAgente?: string;
  valor: number;
  meta: number;
  marcador?: number;
  color?: string;
}

const CENTRO_X = 130;
const CENTRO_Y = 100;
const RADIO = 74;
const GROSOR = 3;
const GROSOR_MARCADOR = 4;
const COLOR_DEFECTO = '#38BDF8';
const COLOR_MARCADOR = '#EB0029';

export function GraphSemiCircle({ titulo, mensajeAgente, valor, meta, marcador, color }: GraphSemiCircleProps) {
  const v = Math.max(0, valor || 0);
  const m = Math.max(0, meta || 0);

  if (m <= 0) {
    return (
      <View style={styles.contenedor}>
        {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
        {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}
        <Text style={styles.textoVacio}>No hay dato para mostrar el avance.</Text>
      </View>
    );
  }

  const fill = Math.min(1, v / m);
  const gradosFill = Math.round(fill * 180);
  const colorArco = color ?? COLOR_DEFECTO;

  const marcadorC = marcador != null ? Math.min(1, Math.max(0, marcador / m)) : null;
  const gradosMarcador = marcadorC != null ? -180 + marcadorC * 180 : null;

  const rayos = [];
  for (let d = 0; d < 180; d += 1) {
    const activo = d < gradosFill;
    rayos.push(
      <View
        key={`grado-${d}`}
        style={[styles.pivote, { transform: [{ rotate: `${-180 + d}deg` }] }]}
      >
        <View style={[styles.rayo, { backgroundColor: activo ? colorArco : '#eef4f8' }]} />
      </View>,
    );
  }

  let marcadorRay = null;
  let etiquetaMarcador = null;
  if (marcador != null && gradosMarcador != null) {
    marcadorRay = (
      <View style={[styles.pivote, { transform: [{ rotate: `${gradosMarcador}deg` }] }]}>
        <View style={[styles.rayoMarcador, { backgroundColor: COLOR_MARCADOR }]} />
      </View>
    );

    const rad = (gradosMarcador * Math.PI) / 180;
    const lx = CENTRO_X + Math.cos(rad) * (RADIO + 10);
    const ly = CENTRO_Y + Math.sin(rad) * (RADIO + 12);
    etiquetaMarcador = (
      <Text style={[styles.etiquetaMarcador, { left: lx - 45, top: ly - 8 }]}>
        Deuda ${marcador.toLocaleString('es-MX')}
      </Text>
    );
  }

  return (
    <View style={styles.contenedor}>
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}

      <View style={styles.plot}>
        <View
          style={[
            styles.base,
            { left: CENTRO_X - RADIO, top: CENTRO_Y - GROSOR_MARCADOR / 2, width: RADIO * 2 },
          ]}
        />
        {rayos}
        {marcadorRay}
        {etiquetaMarcador}

        <Text style={[styles.sub, { left: CENTRO_X - 60, top: 58 }]}>
          ${v.toLocaleString('es-MX')} de ${m.toLocaleString('es-MX')}
        </Text>
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
    width: CENTRO_X * 2,
    height: CENTRO_Y + 10,
    alignSelf: 'center',
  },
  pivote: {
    position: 'absolute',
    left: CENTRO_X,
    top: CENTRO_Y,
    width: 0,
    height: 0,
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
  rayoMarcador: {
    position: 'absolute',
    left: 0,
    top: -GROSOR_MARCADOR / 2,
    width: RADIO + 2,
    height: GROSOR_MARCADOR,
    borderRadius: GROSOR_MARCADOR / 2,
  },
  base: {
    position: 'absolute',
    height: GROSOR_MARCADOR,
    borderRadius: GROSOR_MARCADOR / 2,
    backgroundColor: '#d5dde5',
  },
  sub: {
    position: 'absolute',
    width: 120,
    fontSize: 11,
    color: '#525252',
    textAlign: 'center',
  },
  etiquetaMarcador: {
    position: 'absolute',
    width: 90,
    fontSize: 10,
    fontWeight: '600',
    color: COLOR_MARCADOR,
    textAlign: 'center',
  },
});