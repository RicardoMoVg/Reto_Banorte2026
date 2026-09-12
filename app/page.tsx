'use client';

import { useCallback, useState } from 'react';
import { useActions, useUIState } from '@ai-sdk/rsc';
import { SendHorizontal } from 'lucide-react';
import { DashboardComponible } from '@/components/dashboard/DashboardComponible';
import { PinProvider } from '@/components/dashboard/pin-context';
import type { WidgetAnclado } from '@/components/dashboard/tipos';
import type { AI } from './acciones/ai';

export default function Page() {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useUIState<typeof AI>();
  const { enviarMensaje } = useActions<typeof AI>();

  // Widgets que el usuario ancló desde el chat. Guardamos JSON plano
  // (tipo + datos), NO nodos de React — ver components/dashboard/tipos.ts.
  const [widgetsAnclados, setWidgetsAnclados] = useState<WidgetAnclado[]>([]);

  /**
   * Recibe el anclado desde cualquier bloque A2UI (vía PinContext) y lo
   * agrega al dashboard.
   */
  const handlePinWidget = useCallback((tipo: string, datos: any) => {
    setWidgetsAnclados((prev) => {
      // Evita duplicados: mismo tipo + mismo título ya anclado.
      const yaExiste = prev.some(
        (w) => w.tipo === tipo && w.datos?.titulo === datos?.titulo,
      );
      if (yaExiste) return prev;

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          tipo,
          datos,
          ancladoEn: new Date().toISOString(),
        },
      ];
    });

    // TODO(MCP): persistir el widget anclado en la base de datos.
    // Hoy el dashboard vive solo en memoria y se pierde al recargar.
    // Aquí irá la petición al backend, algo como:
    //
    //   await fetch('/api/dashboard/anclar', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ userId, tipo, datos }),
    //   });
    //
    // Ese endpoint llamará a lib/mcp/mcp-client.ts, que a su vez invocará
    // una tool nueva del servidor MCP (`anclar_widget`) haciendo el INSERT
    // en una tabla `dashboard_widgets (id, usuario_id, tipo, datos jsonb)`.
    // Al cargar la página, un `get_dashboard` rehidrata `widgetsAnclados`.
  }, []);

  /** Quita un widget del dashboard. */
  const handleUnpinWidget = useCallback((id: string) => {
    setWidgetsAnclados((prev) => prev.filter((w) => w.id !== id));

    // TODO(MCP): borrar también en la base de datos —
    //   await fetch(`/api/dashboard/anclar/${id}`, { method: 'DELETE' });
    // que llamará a la tool `desanclar_widget` del servidor MCP.
    // Ojo al conectar esto: conviene borrado optimista (como aquí) + revertir
    // el estado si el fetch falla, para que la UI no se sienta lenta.
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim()) return;

    const value = input;
    setInput('');

    // 1) Pintamos el mensaje del usuario de inmediato (optimista).
    setConversation((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        display: (
          <p className="ml-auto w-fit max-w-[85%] rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
            {value}
          </p>
        ),
      },
    ]);

    // 2) Llamamos al Server Action — devuelve un nodo de React (texto o
    //    bloque A2UI) que se agrega tal cual al historial.
    const respuesta = await enviarMensaje(value);
    setConversation((prev) => [...prev, respuesta]);
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1.15fr_1fr]">
      {/* ─── Sección A · Dashboard Personalizado ─────────────────────── */}
      <section className="flex flex-col gap-4">
        <header className="flex items-baseline justify-between border-b border-neutral-100 pb-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-900">
              Mi Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500">
              Los bloques que ancles desde el asistente viven aquí.
            </p>
          </div>
          {widgetsAnclados.length > 0 && (
            <span className="text-xs font-medium tabular-nums text-neutral-400">
              {widgetsAnclados.length}{' '}
              {widgetsAnclados.length === 1 ? 'bloque' : 'bloques'}
            </span>
          )}
        </header>

        <DashboardComponible
          widgets={widgetsAnclados}
          onDesanclar={handleUnpinWidget}
        />
      </section>

      {/* ─── Sección B · Asistente Inteligente ───────────────────────── */}
      <section className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm lg:sticky lg:top-6">
        <header className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-banorte" />
          <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
            Asistente Mosaico
          </h2>
        </header>

        {/* El PinProvider envuelve SOLO el chat: los bloques generados por
            el agente encuentran el handler, y los del dashboard no. */}
        <PinProvider onPin={handlePinWidget}>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {conversation.length === 0 && (
              <p className="text-xs leading-relaxed text-neutral-400">
                Pregúntame por ejemplo: «¿Cómo voy con mi fondo de
                emergencia?»
              </p>
            )}
            {conversation.map((m) => (
              <div key={m.id}>{m.display}</div>
            ))}
          </div>
        </PinProvider>

        <form
          onSubmit={handleSubmit}
          className="flex gap-2 border-t border-neutral-100 p-3"
        >
          <input
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-banorte"
            value={input}
            placeholder="¿Cómo voy con mis metas?"
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex items-center justify-center rounded-lg bg-banorte px-3 py-2 text-white transition-colors hover:bg-banorte-600 disabled:cursor-not-allowed disabled:bg-neutral-200"
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
