# AGENTS.md — mcp-server/

Sigue las reglas de `../constitution.md` (sección 2, la pieza "MCP"). Esto
de aquí son detalles internos propios de `mcp-server/`.

## Qué es y qué NO es este paquete

Es la única fuente de datos financieros reales. Expone tools MCP puras
(`get_metas`, `get_transacciones`, `get_saldo`) sobre Postgres, habladas por
stdio. **No sabe nada de IA, de prompts, de React ni de qué componente va a
usar cada dato** — eso vive en `server/`. Si te encuentras escribiendo algo
relacionado a props de UI o al modelo aquí, es la señal de que va en el
paquete equivocado.

## Dónde va cada cosa

- `src/server.ts` — el `McpServer` y sus `server.tool(...)`. Cada tool: un
  nombre, un schema Zod de entrada, y una query a Postgres.
- `src/db.ts` — el `Pool` de `pg`. Una sola instancia, no crear pools nuevos
  por tool.
- `src/schema.sql` — el esquema. Cambios aquí son cambios de contrato de
  datos — piensa si de verdad hace falta una tabla/columna nueva o si el
  dato se puede derivar en JS del lado de `server/` (ver más abajo).
- `src/seed.ts` — aplica `schema.sql` + inserta datos demo. Actualízalo
  junto con cualquier cambio de esquema.

## Cuándo SÍ agregar una tool nueva aquí (y cuándo no)

Agrega una tool nueva (`get_algo`) cuando el dato requiere una query nueva
contra Postgres que no se puede armar agregando/transformando datos que ya
regresan las tools existentes.

**No** agregues una tool nueva solo para una agregación puntual que se
puede calcular en JS a partir de datos que ya existen (ejemplo real: "gasto
por categoría" se resuelve en `server/lib/ai/a2ui-tools.ts` agregando el
resultado de `get_transacciones` en vez de crear un `get_gastos_por_categoria`
aquí). Si esa agregación se vuelve costosa o se repite en varios lugares,
ese es el momento de moverla a una tool/query real aquí.

## Reglas de las tools

- Todo input pasa por un schema Zod (`z.object({...})`) — nunca reciban
  SQL crudo ni strings sin validar del modelo.
- El resultado se regresa como `{ content: [{ type: 'text', text:
  JSON.stringify(rows) }] }` — así lo espera `server/lib/mcp/mcp-client.ts`.
- Nunca representes montos como texto formateado (`"$1,234"`) — regresa
  números crudos; el formateo (`Intl.NumberFormat`) es trabajo de
  `client/`.

## Modo de desarrollo sin Postgres

No hace falta correr este paquete para desarrollar — sin `DATABASE_URL` en
`server/.env`, `mcp-client.ts` usa mocks en memoria automáticamente. Solo
levanta esto (`npm run seed`, `npm run dev`) si vas a trabajar la capa de
datos real o a probar el spawn real del proceso MCP.
