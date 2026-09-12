'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PinHandler } from './tipos';

/**
 * Puente cliente↔bloques A2UI.
 *
 * ¿Por qué un Context y no solo una prop? Porque los bloques generativos los
 * renderiza el AGENTE desde el Server Action (streamUI), y las funciones no
 * se pueden serializar a través del límite RSC — es imposible que el servidor
 * le pase `onPin` al componente.
 *
 * Como los bloques son Client Components, al hidratarse en el cliente sí
 * pueden leer un Context montado más arriba en el árbol (app/page.tsx). Así
 * el bloque nacido en el servidor termina hablando con el estado del cliente.
 *
 * Bonus: solo envolvemos la sección del chat con el Provider. Los widgets ya
 * anclados del dashboard quedan fuera, así que ni por contexto pueden
 * re-anclarse.
 */
const PinContext = createContext<PinHandler | null>(null);

export function PinProvider({
  onPin,
  children,
}: {
  onPin: PinHandler;
  children: ReactNode;
}) {
  return <PinContext.Provider value={onPin}>{children}</PinContext.Provider>;
}

/** Devuelve el handler de anclado, o null si no hay Provider arriba. */
export function usePin(): PinHandler | null {
  return useContext(PinContext);
}
