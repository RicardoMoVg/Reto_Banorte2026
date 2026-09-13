/**
 * Precio simulado por instrumento -- NO es un precio de mercado real, es
 * una función determinista del tiempo (nada se guarda ni se programa):
 * el mismo id + la misma fecha siempre regresan el mismo precio, así que
 * se puede "graficar el pasado" sin haber tenido un historial guardado.
 *
 * Fórmula: oscilación tipo seno alrededor de `precio_base`, con amplitud
 * según el `riesgo` del instrumento (más riesgo = se mueve más) y una fase
 * distinta por instrumento (derivada de su id) para que no todos se muevan
 * exactamente igual ni sincronizados.
 */

const AMPLITUD_POR_RIESGO: Record<string, number> = {
  bajo: 0.005,
  medio: 0.02,
  alto: 0.05,
};

const PERIODO_SEGUNDOS = 300; // una oscilación completa cada 5 minutos

function semillaDeId(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000;
  }
  return hash;
}

export function precioSimulado(
  precioBase: number,
  riesgo: string,
  instrumentoId: string,
  fecha: Date = new Date(),
): number {
  const amplitud = AMPLITUD_POR_RIESGO[riesgo] ?? 0.02;
  const fase = semillaDeId(instrumentoId);
  const segundos = fecha.getTime() / 1000;
  const variacion = amplitud * Math.sin(segundos / PERIODO_SEGUNDOS + fase);

  return Math.round(precioBase * (1 + variacion) * 10000) / 10000;
}
