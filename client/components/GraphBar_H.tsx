import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 1. Tipado estricto de los props que esperas recibir del Agente
export interface GraficoBarrasProps {
  titulo?: string; // Opcional, por si el agente no lo manda
  mensajeAgente?: string;
  categorias: Array<{
    nombre: string;
    monto: number;
    color?: string; // Opcional
  }>;
}

export function GraficoBarras_H({ titulo, mensajeAgente, categorias }: GraficoBarrasProps) {
  // 2. Validación de seguridad: Si no hay categorías, no intentamos mapear
  if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.textoVacio}>No hay datos para mostrar el comparativo de gastos.</Text>
      </View>
    );
  }

  // 3. Encontrar el monto mayor para calcular los anchos proporcionales (100%)
  const montoMaximo = Math.max(...categorias.map((c) => c.monto));

  return (
    <View style={styles.contenedor}>
      {/* Encabezado Opcional */}
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensajeAgente ? <Text style={styles.mensaje}>{mensajeAgente}</Text> : null}

      {/* Contenedor de las barras */}
      <View style={styles.graficoContainer}>
        {categorias.map((categoria, index) => {
          // Cálculo seguro del ancho (evitar división por 0)
          const porcentajeAncho = montoMaximo > 0 ? (categoria.monto / montoMaximo) * 100 : 0;
          
          return (
            <View key={`barra-${index}`} style={styles.filaBarra}>
              
              {/* Nombre de la categoría */}
              <Text style={styles.labelCategoria} numberOfLines={1}>
                {categoria.nombre}
              </Text>
              
              {/* Pista visual (la barra en sí) */}
              <View style={styles.pistaFondo}>
                <View 
                  style={[
                    styles.barraRelleno, 
                    { 
                      width: `${porcentajeAncho}%`,
                      // Si el agente manda un color lo usamos, si no, verde Banorte
                      backgroundColor: categoria.color ?? '#45b767'
                    }
                  ]} 
                />
              </View>

              {/* Monto al final */}
              <Text style={styles.labelMonto}>
                ${categoria.monto.toLocaleString('es-MX')}
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
    gap: 12,
  },
  filaBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelCategoria: {
    width: 80, // Ancho fijo para alinear las barras
    fontSize: 12,
    color: '#404040',
  },
  pistaFondo: {
    flex: 1, // Toma todo el espacio disponible en medio
    height: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 6,
  },
  labelMonto: {
    width: 60, // Ancho fijo para alinear el texto de la derecha
    fontSize: 12,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'right',
  },
});