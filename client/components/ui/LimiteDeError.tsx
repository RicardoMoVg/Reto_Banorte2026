import Ionicons from '@expo/vector-icons/Ionicons';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, tipografia } from '../../lib/ui/theme';

interface Props {
  children: ReactNode;
  /** Qué se estaba pintando. Aparece en el aviso solo en desarrollo. */
  nombre?: string;
}

interface Estado {
  error: Error | null;
}

/**
 * Aísla un fallo de render para que no se lleve la pantalla completa.
 *
 * Existe por una grieta concreta del protocolo: los `props` de un bloque
 * llegan por la red como JSON y NADIE valida su forma. Zod valida lo que
 * el modelo le manda a la tool, no lo que la tool devuelve; el catálogo es
 * `Record<string, ComponentType<any>>`, o sea que TypeScript tampoco
 * protege. Un `calendario` que llegue como `null` en vez de arreglo tira
 * un `.map of null` y, sin este límite, se lleva el chat entero — el
 * usuario pierde la conversación por una tarjeta mal formada.
 *
 * Tiene que ser una clase: `componentDidCatch` no tiene equivalente en
 * hooks, es de las pocas cosas que React todavía no expone así.
 *
 * Va por bloque, no en la raíz. En la raíz salvaría la app pero igual
 * dejaría la pantalla en blanco; por bloque, la conversación sigue viva y
 * solo esa tarjeta se reemplaza por el aviso.
 */
export class LimiteDeError extends Component<Props, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // En producción esto iría a un reporter; hoy no hay ninguno, y tragarse
    // el error en silencio haría el bug imposible de encontrar.
    if (__DEV__) {
      console.error(
        `[LimiteDeError] "${this.props.nombre ?? 'bloque'}" falló al renderizar:`,
        error,
        info.componentStack,
      );
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.aviso}>
        <Ionicons name="warning-outline" size={18} color={colores.textoApoyo} />
        <View style={styles.texto}>
          <Text style={styles.titulo}>No se pudo mostrar este bloque</Text>
          <Text style={styles.detalle}>
            {__DEV__
              ? `${this.props.nombre ?? 'Bloque'}: ${this.state.error.message}`
              : 'El resto de tu conversación sigue disponible.'}
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.md,
    width: '100%',
    maxWidth: 420,
    borderRadius: radio.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colores.borde,
    backgroundColor: colores.superficieSutil,
    padding: espacio.lg,
  },
  texto: { flexShrink: 1, gap: 2 },
  titulo: { ...tipografia.cuerpo, fontWeight: '600' },
  detalle: { ...tipografia.pie },
});
