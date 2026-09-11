'use client';

import { useState } from 'react';
import { useActions, useUIState } from '@ai-sdk/rsc';
import type { AI } from './acciones/ai';

export default function Page() {
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useUIState<typeof AI>();
  const { enviarMensaje } = useActions<typeof AI>();

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
        display: <p className="text-sm font-medium text-neutral-800">{value}</p>,
      },
    ]);

    // 2) Llamamos al Server Action — devuelve un nodo de React (texto o
    //    bloque A2UI) que se agrega tal cual al historial.
    const respuesta = await enviarMensaje(value);
    setConversation((prev) => [...prev, respuesta]);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-bold text-neutral-900">Mosaico</h1>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {conversation.map((m) => (
          <div key={m.id}>{m.display}</div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-banorte"
          value={input}
          placeholder="¿Cómo voy con mis metas?"
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-banorte px-4 py-2 text-sm font-medium text-white hover:bg-banorte-600"
        >
          Enviar
        </button>
      </form>
    </main>
  );
}
