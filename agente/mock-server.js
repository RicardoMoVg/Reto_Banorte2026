import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "MockServer-Financiero", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

//herramienta financiera
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "obtener_resumen_financiero",
        description: "Obtiene los productos financieros del usuario, incluyendo tarjetas de nómina, crédito y débito.",
        inputSchema: {
          type: "object",
          properties: {
            idUsuario: { type: "string" }
          },
          required: ["idUsuario"]
        }
      }
    ]
  };
});

//datos financieros de prueba
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "obtener_resumen_financiero") {
    
    const mockData = {
      usuario: "Juan Pérez",
      idUsuario: request.params.arguments.idUsuario,
      productos: [
        {
          tipo: "Nómina",
          terminacion: "1234",
          saldo_actual: 400.50,
          fin_Periodo: "30/09/2026",
          periodo: 9, 
          estado: "Activa"
        },
        {
          tipo: "Crédito",
          terminacion: "5678",
          limite_credito: 50000.00,
          deuda_actual: 12500.00,
          fecha_corte: "28/09/2026",
          periodo: 9,  
          estado: "Al corriente"
        },
        {
          tipo: "Débito",
          terminacion: "9012",
          saldo_actual: 3200.00,
          fin_Periodo: "30/09/2026",
          periodo: 9,  
          estado: "Activa"
        }
      ],
      movimientos_por_tarjeta: [
        { tarjeta: "Crédito", terminacion: "5678", monto: 8500.00 , fecha_mov: "10/09/2026", periodo: 9},
        { tarjeta: "Crédito", terminacion: "5678", monto: -2000.00 , fecha_mov: "8/09/2026", periodo: 9},
        { tarjeta: "Crédito", terminacion: "5678", monto: 6000.00 , fecha_mov: "6/09/2026", periodo: 9},
        { tarjeta: "Débito", terminacion: "9012", monto: -1800.00 , fecha_mov: "4/09/2026", periodo: 9},
        { tarjeta: "Débito", terminacion: "9012", monto: 5000.00 , fecha_mov: "2/09/2026", periodo: 9},
        { tarjeta: "Nómina", terminacion: "1234", monto: -5000.00 , fecha_mov: "2/09/2026", periodo: 9},
        { tarjeta: "Nómina", terminacion: "1234", monto: 5500.50 , fecha_mov: "31/08/2026", periodo: 8}
      ]
    };

    return {
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }]
    };
  }
  
  throw new Error("Herramienta no encontrada");
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mock Server Financiero listo y esperando conexiones...");
}

run().catch(console.error);