import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { anclarWidget as anclarWidgetApi, desanclarWidget as desanclarWidgetApi, getDashboard } from '../api/rest';
import { useSesion } from '../sesion/SesionProvider';

/** Qué tanto ocupa un widget a lo ancho del tablero. */
export type AnchoBloque = 'completo' | 'medio';
/** De qué lado queda un widget de medio ancho. Un `completo` no tiene lado. */
export type LadoBloque = 'izquierda' | 'derecha';

export interface BloqueAnclado {
  /** Id del mensaje del chat del que salió. Evita anclarlo dos veces. */
  id: string;
  nombre: string;
  props: Record<string, unknown>;
  /**
   * La RECETA para regenerarlo: qué tool volver a ejecutar y con qué
   * argumentos. Hoy no se usa para pintar (se pinta con `props`), pero es
   * lo que `constitution.md` 3.2 manda guardar y lo que espera la tabla
   * `dashboard_widgets` de Postgres.
   *
   * Guardar la receta y no el número congelado es lo que hace que mañana
   * el tablero muestre el saldo de mañana y no el de hoy. Falta el paso
   * que cierra el ciclo: un endpoint que ejecute una tool sin pasar por el
   * LLM, para rehidratar al abrir la app.
   */
  tool?: string;
  parametros?: Record<string, unknown>;
  /**
   * Layout. Vive junto al bloque y no dentro de `props` a propósito: es
   * chrome del TABLERO, no del bloque. Ningún componente A2UI sabe (ni
   * debe saber) qué tan ancho se está pintando — igual que ninguno sabe
   * que existe un botón de "quitar" encima.
   *
   * Cuando `dashboard_widgets` se conecte (constitution.md 3.2), estos dos
   * campos son parte de la fila, al lado de la receta.
   */
  ancho?: AnchoBloque;
  lado?: LadoBloque;
}

/** Cómo se mueve un widget dentro de la columna. */
export type Movimiento = 'arriba' | 'abajo' | 'inicio' | 'final';

/**
 * Un ajuste de layout resuelto, tal como llega del bloque `AjusteTablero`
 * que manda el agente (`server/lib/ai/a2ui-tools.ts` → `acomodarTablero`).
 */
export interface AjusteDeBloque {
  id: string;
  mover?: Movimiento;
  ancho?: AnchoBloque;
  lado?: LadoBloque;
}

/**
 * Lo que se le reporta al agente sobre el tablero en cada request.
 *
 * Deliberadamente NO incluye `props`: ahí viven los montos, y mandárselos
 * al modelo para que "acomode" sería meterle cifras al contexto sin
 * necesidad (constitution.md 4.2). Con el id y el título le alcanza para
 * entender "sube mis gastos".
 */
export interface ResumenWidget {
  id: string;
  nombre: string;
  titulo: string;
  posicion: number;
  ancho: AnchoBloque;
  lado: LadoBloque;
}

interface ContextoTablero {
  bloques: BloqueAnclado[];
  anclado: (id: string) => boolean;
  anclar: (bloque: BloqueAnclado) => void;
  desanclar: (id: string) => void;
  /** Cambia de lugar un widget. Lo usa tanto la UI como el agente. */
  mover: (id: string, movimiento: Movimiento) => void;
  /** Cambia su ancho y, si es de medio ancho, de qué lado queda. */
  redimensionar: (id: string, ancho: AnchoBloque, lado?: LadoBloque) => void;
  /**
   * Aplica de golpe los ajustes que mandó el agente. Idempotente por
   * `idAjuste`: ver el comentario de `aplicados` abajo.
   */
  aplicarAjuste: (idAjuste: string, ajustes: AjusteDeBloque[]) => void;
  /** El tablero como se lo describimos al agente. */
  resumen: () => ResumenWidget[];
}

const TableroContext = createContext<ContextoTablero | null>(null);

/** El título con el que el usuario reconoce un widget al hablar de él. */
function tituloDe(bloque: BloqueAnclado) {
  const props = bloque.props;
  const candidato = props.titulo ?? props.etiqueta ?? props.mensaje;
  return typeof candidato === 'string' && candidato.trim() !== '' ? candidato : bloque.nombre;
}

/**
 * Reordena la lista moviendo `id` una posición (o hasta un extremo).
 *
 * Devuelve la MISMA lista si no hay nada que mover (el widget ya está hasta
 * arriba, o el id no existe): así React no repinta el tablero por un
 * "acomodo" que no acomodó nada.
 */
function moverEnLista(lista: BloqueAnclado[], id: string, movimiento: Movimiento) {
  const desde = lista.findIndex((b) => b.id === id);
  if (desde < 0) return lista;

  const destino =
    movimiento === 'arriba'
      ? desde - 1
      : movimiento === 'abajo'
        ? desde + 1
        : movimiento === 'inicio'
          ? 0
          : lista.length - 1;

  const hasta = Math.max(0, Math.min(lista.length - 1, destino));
  if (hasta === desde) return lista;

  const copia = lista.slice();
  const [bloque] = copia.splice(desde, 1);
  copia.splice(hasta, 0, bloque);
  return copia;
}

/**
 * Los bloques que el usuario decidió fijar en su pantalla de Inicio.
 *
 * **Por qué existe:** antes Inicio mostraba los últimos bloques de la
 * conversación automáticamente. Eso mezclaba dos cosas distintas —
 * preguntar algo de pasada y querer tenerlo siempre a la vista — y hacía
 * que cualquier consulta ensuciara el tablero. Ahora el tablero es
 * explícito: solo tiene lo que el usuario aceptó agregar.
 *
 * **Quién lo edita:** el usuario (quitando bloques) y el AGENTE (moviendo
 * y redimensionando, vía el bloque `AjusteTablero`). El agente nunca toca
 * este estado directo: manda un bloque como cualquier otro y el
 * componente lo aplica al montarse — el servidor sigue sin saber nada del
 * estado del cliente, que es lo que exige `constitution.md` 3.1.
 *
 * Se hidrata desde `dashboard_widgets` (vía `GET /api/dashboard`) al abrir
 * sesión: el servidor vuelve a ejecutar la tool de cada widget -- nunca
 * regresa el valor que se guardó al anclar (constitution.md 3.2, "receta,
 * no snapshot"). `anclar`/`desanclar` persisten ahí mismo, best-effort: si
 * el POST falla, el widget se queda en memoria para esta sesión igual que
 * antes, simplemente no sobrevive a un recargo.
 *
 * `mover`/`redimensionar`/`aplicarAjuste` siguen solo en memoria: layout no
 * tiene endpoint propio todavía.
 */
export function TableroProvider({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const [bloques, setBloques] = useState<BloqueAnclado[]>([]);

  /**
   * Ids de ajustes ya aplicados.
   *
   * El bloque `AjusteTablero` se queda en el historial del chat, así que su
   * efecto se vuelve a montar cada vez que el panel se abre o la lista se
   * repinta. Sin esta guarda, abrir el chat tres veces subía el mismo
   * widget tres posiciones. Va en un ref y se revisa de forma síncrona
   * (no dentro del updater de `setState`, que en StrictMode corre dos
   * veces).
   */
  const aplicados = useRef<Set<string>>(new Set());

  /** Espejo de `bloques` para poder leerlos sin depender del render. */
  const bloquesRef = useRef<BloqueAnclado[]>([]);
  bloquesRef.current = bloques;

  // Rehidratación al iniciar sesión (constitution.md 3.2): sin sesión no hay
  // `usuarioId` con qué pedir el tablero, así que se limpia en vez de dejar
  // el de la sesión anterior. Best-effort -- si el fetch falla, el usuario
  // simplemente arranca con el tablero vacío en vez de trabado.
  useEffect(() => {
    if (!sesion) {
      setBloques([]);
      return;
    }
    let vigente = true;
    getDashboard()
      .then(({ widgets }) => {
        if (!vigente) return;
        setBloques(
          widgets.map((w) => ({
            id: w.id,
            nombre: w.nombre,
            props: w.props,
            tool: w.tool,
            parametros: w.parametros,
            ancho: w.ancho,
            lado: w.lado,
          })),
        );
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [sesion]);

  const anclar = useCallback((bloque: BloqueAnclado) => {
    setBloques((previo) =>
      // Sin esta guarda, tocar dos veces "Agregar" duplica la tarjeta.
      previo.some((b) => b.id === bloque.id)
        ? previo
        : [{ ancho: 'completo' as const, lado: 'izquierda' as const, ...bloque }, ...previo],
    );

    // Best-effort: solo hay receta que guardar si el bloque vino de una
    // tool (ver el comentario de `tool`/`parametros` arriba). Si el POST
    // falla, el widget se queda anclado igual para esta sesión.
    if (bloque.tool) {
      const mensajeAgente = typeof bloque.props.mensajeAgente === 'string' ? bloque.props.mensajeAgente : undefined;
      anclarWidgetApi({
        id: bloque.id,
        componente: bloque.nombre,
        tool: bloque.tool,
        parametros: bloque.parametros ?? {},
        mensajeAgente,
        ancho: bloque.ancho ?? 'completo',
        lado: bloque.lado ?? 'izquierda',
      }).catch(() => {});
    }
  }, []);

  const desanclar = useCallback((id: string) => {
    setBloques((previo) => previo.filter((b) => b.id !== id));
    desanclarWidgetApi(id).catch(() => {});
  }, []);

  const mover = useCallback((id: string, movimiento: Movimiento) => {
    setBloques((previo) => moverEnLista(previo, id, movimiento));
  }, []);

  const redimensionar = useCallback((id: string, ancho: AnchoBloque, lado?: LadoBloque) => {
    setBloques((previo) =>
      previo.map((b) =>
        b.id === id
          ? {
              ...b,
              ancho,
              // Un widget de fila completa no tiene lado: se queda con el
              // que traía para que volver a "medio" lo regrese a donde
              // estaba, pero el layout lo ignora mientras sea "completo".
              lado: lado ?? b.lado ?? 'izquierda',
            }
          : b,
      ),
    );
  }, []);

  const aplicarAjuste = useCallback((idAjuste: string, ajustes: AjusteDeBloque[]) => {
    if (aplicados.current.has(idAjuste)) return;
    aplicados.current.add(idAjuste);

    setBloques((previo) =>
      ajustes.reduce((lista, ajuste) => {
        let siguiente = ajuste.mover ? moverEnLista(lista, ajuste.id, ajuste.mover) : lista;

        if (ajuste.ancho || ajuste.lado) {
          siguiente = siguiente.map((b) =>
            b.id === ajuste.id
              ? {
                  ...b,
                  ancho: ajuste.ancho ?? b.ancho ?? 'completo',
                  lado: ajuste.lado ?? b.lado ?? 'izquierda',
                }
              : b,
          );
        }

        return siguiente;
      }, previo),
    );
  }, []);

  const resumen = useCallback(
    () =>
      bloquesRef.current.map<ResumenWidget>((b, i) => ({
        id: b.id,
        nombre: b.nombre,
        titulo: tituloDe(b),
        posicion: i + 1,
        ancho: b.ancho ?? 'completo',
        lado: b.lado ?? 'izquierda',
      })),
    [],
  );

  const valor = useMemo<ContextoTablero>(
    () => ({
      bloques,
      anclado: (id: string) => bloques.some((b) => b.id === id),
      anclar,
      desanclar,
      mover,
      redimensionar,
      aplicarAjuste,
      resumen,
    }),
    [bloques, anclar, desanclar, mover, redimensionar, aplicarAjuste, resumen],
  );

  return <TableroContext.Provider value={valor}>{children}</TableroContext.Provider>;
}

/**
 * Igual que `useTablero`, pero devuelve `null` fuera del provider en vez
 * de reventar. Para componentes que se pueden montar sueltos (una pantalla
 * de pruebas, un catálogo visual) y que solo quieren anclar SI se puede.
 */
export function useTableroOpcional(): ContextoTablero | null {
  return useContext(TableroContext);
}

export function useTablero(): ContextoTablero {
  const contexto = useContext(TableroContext);
  if (!contexto) {
    throw new Error('useTablero() se usó fuera de <TableroProvider> (ver app/_layout.tsx).');
  }
  return contexto;
}
