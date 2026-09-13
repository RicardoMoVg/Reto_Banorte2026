import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Estado del panel de chat de Mosaico.
 *
 * Antes el chat era una ruta `/chat` con `presentation: 'modal'` — cubría
 * toda la pantalla. Ahora es un panel flotante dentro de `(tabs)/_layout.tsx`
 * que se desliza desde abajo y ocupa ~70 % de la altura, dejando ver el
 * dashboard detrás. Este contexto comparte el toggle con el botón flotante,
 * los chips de Inicio y cualquier otro punto de entrada.
 */

interface ChatPanelCtx {
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  toggle: () => void;
}

const Ctx = createContext<ChatPanelCtx>({
  abierto: false,
  abrir: () => {},
  cerrar: () => {},
  toggle: () => {},
});

export function useChatPanel() {
  return useContext(Ctx);
}

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Ctx.Provider
      value={{
        abierto,
        abrir: () => setAbierto(true),
        cerrar: () => setAbierto(false),
        toggle: () => setAbierto((v) => !v),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
