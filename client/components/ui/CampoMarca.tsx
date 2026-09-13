import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { ReactNode, Ref } from 'react';
import { colores, espacio, radio, vidrio } from '../../lib/ui/theme';

export interface CampoMarcaProps extends TextInputProps {
  etiqueta: string;
  /** Control opcional dentro del campo, a la derecha (ej. mostrar/ocultar). */
  accesorio?: ReactNode;
  /** Mensaje de validación. Con esto puesto, el campo se marca en rojo. */
  error?: string;
  ref?: Ref<TextInput>;
}

/**
 * Campo de texto de las ventanas de marca (las del degradado).
 *
 * Solo funciona dentro de `<PantallaMarca>`: usa la paleta `vidrio`, que se
 * apoya en el degradado de fondo para tener contraste.
 *
 * El error no se comunica solo con color — lleva icono y texto — porque el
 * color por sí solo deja fuera a quien no lo distingue (WCAG 1.4.1).
 *
 * `ref` va como prop normal: en React 19 ya no hace falta forwardRef.
 */
export function CampoMarca({ etiqueta, accesorio, error, ref, ...props }: CampoMarcaProps) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View style={[styles.caja, !!error && styles.cajaError]}>
        <TextInput
          ref={ref}
          accessibilityLabel={etiqueta.replace(':', '')}
          aria-invalid={!!error}
          placeholderTextColor={vidrio.textoTenue}
          selectionColor={colores.acento}
          style={styles.input}
          {...props}
        />
        {accesorio}
      </View>

      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={13} color={colores.alerta} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: espacio.sm },
  etiqueta: { fontSize: 13, fontWeight: '600', color: colores.textoInverso },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: vidrio.campoBorde,
    backgroundColor: vidrio.campo,
    paddingHorizontal: espacio.md,
  },
  cajaError: { borderColor: colores.alerta },
  input: {
    flex: 1,
    paddingVertical: espacio.md,
    fontSize: 14,
    color: colores.textoInverso,
    // En web el navegador pinta un anillo de foco encimado con el borde de
    // la caja. Se separa y se tiñe de menta en vez de apagarlo: quitarlo
    // dejaría sin indicador visible a quien navega con teclado.
    outlineColor: colores.acento,
    outlineOffset: 2,
  },
  error: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  errorTexto: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: colores.textoInverso },
});
