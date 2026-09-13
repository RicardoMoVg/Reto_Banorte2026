import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

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
}

interface ContextoTablero {
  bloques: BloqueAnclado[];
  anclado: (id: string) => boolean;
  anclar: (bloque: BloqueAnclado) => void;
  desanclar: (id: string) => void;
}

const TableroContext = createContext<ContextoTablero | null>(null);

/**
 * Los bloques que el usuario decidió fijar en su pantalla de Inicio.
 *
 * **Por qué existe:** antes Inicio mostraba los últimos bloques de la
 * conversación automáticamente. Eso mezclaba dos cosas distintas —
 * preguntar algo de pasada y querer tenerlo siempre a la vista — y hacía
 * que cualquier consulta ensuciara el tablero. Ahora el tablero es
 * explícito: solo tiene lo que el usuario aceptó agregar.
 *
 * ⚠️ Vive en memoria: se pierde al recargar. El destino es la tabla
 * `dashboard_widgets` (ya existe en Postgres con la forma correcta), pero
 * `mcp-server/` todavía no expone tools para leerla ni escribirla. Cuando
 * existan, `anclar`/`desanclar` las llaman y este provider se hidrata al
 * arrancar; las ventanas no cambian.
 */
export function TableroProvider({ children }: { children: ReactNode }) {
  const [bloques, setBloques] = useState<BloqueAnclado[]>([]);

  const anclar = useCallback((bloque: BloqueAnclado) => {
    setBloques((previo) =>
      // Sin esta guarda, tocar dos veces "Agregar" duplica la tarjeta.
      previo.some((b) => b.id === bloque.id) ? previo : [bloque, ...previo],
    );
  }, []);

  const desanclar = useCallback((id: string) => {
    setBloques((previo) => previo.filter((b) => b.id !== id));
  }, []);

  const valor = useMemo<ContextoTablero>(
    () => ({
      bloques,
      anclado: (id: string) => bloques.some((b) => b.id === id),
      anclar,
      desanclar,
    }),
    [bloques, anclar, desanclar],
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
