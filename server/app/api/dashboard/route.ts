import { buildA2uiTools } from '@/lib/ai/a2ui-tools';
import { requireUsuario } from '@/lib/auth/supabase';
import { getDashboardWidgets, anclarWidget } from '@/lib/mcp/mcp-client';
import { CORS_HEADERS, jsonResponse } from '@/lib/http/cors';

export const runtime = 'nodejs';

export function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * Rehidratación del dashboard (constitution.md 3.2): por cada widget que el
 * usuario ancló, re-ejecuta su `tool` de `a2ui-tools.ts` DIRECTO -- sin
 * pasar por el modelo -- con la receta guardada (`parametros`). Nunca se
 * guardó el valor ya resuelto, así que esto siempre trae el dato fresco.
 *
 * Un widget cuya tool ya no exista, o cuya `execute` regrese `{error}`
 * (ej. la meta que referenciaba se archivó), se omite en vez de tronar
 * toda la respuesta -- el resto del tablero sigue viendo lo suyo.
 */
export async function GET(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const widgets = await getDashboardWidgets(auth.id);
  const tools = buildA2uiTools(auth.id) as unknown as Record<
    string,
    { execute: (args: unknown, opciones: { toolCallId: string; messages: unknown[] }) => Promise<unknown> }
  >;

  const resueltos = await Promise.all(
    widgets.map(async (w) => {
      const tool = tools[w.tool];
      if (!tool) return null;

      try {
        const resultado = (await tool.execute(w.parametros, {
          toolCallId: `rehidratar-${w.id}`,
          messages: [],
        })) as { tipo?: string; props?: unknown; error?: string } | null;

        if (!resultado || !resultado.tipo) return null;

        return {
          id: w.id,
          nombre: resultado.tipo,
          props: resultado.props,
          tool: w.tool,
          parametros: w.parametros,
          mensajeAgente: w.mensajeAgente,
          orden: w.orden,
          ancho: w.ancho,
          lado: w.lado,
        };
      } catch {
        return null;
      }
    }),
  );

  return jsonResponse({ widgets: resueltos.filter((w) => w !== null) });
}

export async function POST(req: Request) {
  const auth = await requireUsuario(req);
  if (auth instanceof Response) return auth;

  const { id, componente, tool, parametros, mensajeAgente, ancho, lado } = (await req.json()) as {
    id?: string;
    componente?: string;
    tool?: string;
    parametros?: Record<string, unknown>;
    mensajeAgente?: string;
    ancho?: 'completo' | 'medio';
    lado?: 'izquierda' | 'derecha';
  };

  if (!id || !componente || !tool) {
    return jsonResponse({ error: 'id, componente y tool son requeridos.' }, { status: 400 });
  }

  const resultado = await anclarWidget(auth.id, id, componente, tool, parametros ?? {}, mensajeAgente, ancho, lado);

  if ('error' in resultado) {
    return jsonResponse({ error: resultado.error }, { status: 400 });
  }

  return jsonResponse({ widget: resultado }, { status: 201 });
}
