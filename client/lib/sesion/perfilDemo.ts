export interface Perfil {
  nombre: string;
  usuario: string;
  correo: string;
  /** ISO `AAAA-MM-DD`. Se guarda así y se formatea al pintar. */
  nacimiento: string;
  telefono: string;
  /** Lo fija el banco: se muestra, no se edita. */
  clienteDesde: string;
}

/**
 * Datos de ejemplo del titular.
 *
 * Son inventados y las pantallas que los muestran lo dicen en su propia cara
 * (la insignia de "Datos de ejemplo" en Perfil), no solo en este comentario.
 * Está permitido porque NINGUNO es un dato financiero: `constitution.md` 4.2
 * y 6 prohíben inventar montos, porcentajes y movimientos — esos solo pueden
 * venir del MCP a través de un bloque A2UI. Nombre, teléfono y fecha de
 * nacimiento no entran en esa categoría.
 *
 * Es la semilla del estado de `SesionProvider`, no la fuente que leen las
 * ventanas: el usuario puede editar su perfil y esos cambios viven en el
 * provider. Cuando exista auth de verdad, esto se reemplaza por lo que
 * regrese el backend y es el único archivo que se toca.
 */
export const PERFIL_DEMO: Perfil = {
  nombre: 'Ricardo Moreno',
  usuario: '@ricardo.moreno',
  correo: 'ricardo@banortech.mx',
  nacimiento: '1998-03-14',
  telefono: '+52 81 1234 5678',
  clienteDesde: 'Marzo 2021',
};

/**
 * Validación de FORMA de un correo, no de existencia. Vive aquí para que el
 * login y la edición de perfil no tengan dos regex que se desincronicen.
 */
export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Iniciales para el avatar, sin depender de tener una imagen del usuario. */
export function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Para saludar: "Ricardo", no "Ricardo Moreno". */
export function primerNombre(nombre: string) {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/**
 * Saludo según la hora del dispositivo. Los cortes (12 y 19) son los de uso
 * común en México, no los astronómicos.
 */
export function saludo(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora < 12) return 'Buenos días,';
  if (hora < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}

/**
 * ISO → "14 de marzo de 1998", para mostrar.
 *
 * Se parte la cadena a mano en vez de `new Date(iso)` porque el constructor
 * interpreta `AAAA-MM-DD` como UTC y, en husos al oeste (todo México), la
 * fecha se corre un día hacia atrás al pintarla en hora local.
 */
export function formatearFechaLarga(iso: string) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return iso;

  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(anio, mes - 1, dia));
}

/** ISO → "14/03/1998", el formato que se escribe en el campo. */
export function aFormatoCorto(iso: string) {
  const [anio, mes, dia] = iso.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '';
}

/**
 * "14/03/1998" → ISO, o `null` si no es una fecha real.
 *
 * Rechaza días que no existen (31/02) comparando contra la fecha
 * reconstruida: `new Date(1998, 1, 31)` cae en marzo, así que si el día
 * cambió, la entrada era inválida.
 */
export function aISO(corto: string): string | null {
  const partes = corto.split('/');
  if (partes.length !== 3) return null;

  const [dia, mes, anio] = partes.map(Number);
  if (!dia || !mes || !anio || String(anio).length !== 4) return null;

  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }

  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Años cumplidos a día de hoy. */
export function edad(iso: string, hoy = new Date()) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  let años = hoy.getFullYear() - anio;
  const cumpleEsteAnio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!cumpleEsteAnio) años -= 1;
  return años;
}

/** Inserta las diagonales mientras se escribe: "14031998" → "14/03/1998". */
export function mascaraFecha(texto: string) {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/**
 * Deja el teléfono en un formato consistente para mostrar:
 * "8112345678" → "+52 81 1234 5678".
 *
 * El agrupado no es 2-4-4 siempre: en México solo Monterrey (81),
 * Guadalajara (33) y el Valle de México (55/56) tienen lada de dos
 * dígitos; el resto la tiene de tres, y agruparlos igual produciría
 * números que se ven mal ("99 8123 4567" en vez de "998 123 4567").
 */
export function normalizarTelefono(texto: string) {
  const digitos = texto.replace(/\D/g, '');
  const nacional = digitos.length === 12 && digitos.startsWith('52') ? digitos.slice(2) : digitos;
  if (nacional.length !== 10) return texto.trim();

  const ladaDeDos = ['55', '56', '33', '81'].includes(nacional.slice(0, 2));
  return ladaDeDos
    ? `+52 ${nacional.slice(0, 2)} ${nacional.slice(2, 6)} ${nacional.slice(6)}`
    : `+52 ${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`;
}

/** 10 dígitos nacionales, con o sin lada internacional. */
export function telefonoValido(texto: string) {
  const digitos = texto.replace(/\D/g, '');
  return digitos.length === 10 || (digitos.length === 12 && digitos.startsWith('52'));
}
