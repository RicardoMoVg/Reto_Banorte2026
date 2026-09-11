'use client';

import { useChat } from 'ai/react';
import { RastreadorMetas } from '@/components/ui-blocks';

/**
 * El "ensamblador": recorre las tool-invocations que devolvió el modelo y,
 * por cada una, elige el bloque de LEGO correspondiente del catálogo.
 * Agregar un bloque nuevo = agregar un `case` aquí + su tool en route.ts.
 */
function BloqueDesdeToolInvocation({
  toolName,
  state,
  result,
}: {
  toolName: string;
  state: 'partial-call' | 'call' | 'result';
  result?: any;
}) {
  if (state !== 'result') {
    // Aquí es donde Framer Motion puede lucirse con un skeleton/spinner
    // mientras el MCP responde.
    return (
      <div className="h-20 w-full max-w-md animate-pulse rounded-xl bg-mosaico-50" />
    );
  }

  switch (toolName) {
    case 'mostrarRastreadorMeta':
      return (
        <RastreadorMetas
          titulo={result.titulo}
          porcentaje={result.porcentaje}
          montoActual={result.montoActual}
          montoObjetivo={result.montoObjetivo}
        />
      );
    default:
      return null;
  }
}

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-bold text-mosaico-900">Mosaico</h1>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {m.role === 'user' ? (
              <p className="text-sm font-medium text-mosaico-900/80">{m.content}</p>
            ) : (
              <>
                {m.content && <p className="text-sm text-mosaico-900">{m.content}</p>}
                {m.toolInvocations?.map((ti) => (
                  <BloqueDesdeToolInvocation
                    key={ti.toolCallId}
                    toolName={ti.toolName}
                    state={ti.state}
                    result={'result' in ti ? ti.result : undefined}
                  />
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-mosaico-100 px-3 py-2 text-sm outline-none focus:border-mosaico-500"
          value={input}
          placeholder="¿Cómo voy con mis metas?"
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="rounded-lg bg-mosaico-500 px-4 py-2 text-sm font-medium text-white hover:bg-mosaico-600"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}
