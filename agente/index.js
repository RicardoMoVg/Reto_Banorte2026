import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function ejecutarAgente() {
  console.log("Iniciando Agente...");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["mock-server.js"]
  });

  const mcpClient = new Client(
    { name: "Agente-UI-Builder", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  console.log("Conectando al servidor MCP...");
  await mcpClient.connect(transport);
  console.log("¡Conectado al servidor MCP!");

  const { tools } = await mcpClient.listTools();
  console.log("Herramientas encontradas en el servidor:", tools.map(t => t.name));

  console.log("\nSolicitando datos al servidor para construir la UI...");
  
  const resultado = await mcpClient.callTool({
    name: "obtener_resumen_financiero",
    arguments: { idUsuario: "123" }
  });

  const datosCrudos = resultado.content[0].text;
  
  // console.log("\n--- Datos recibidos del MCP ---");
  // console.log(datosCrudos);
  // console.log("\nEnviando datos a Gemini para analizar y generar el A2UI...");
  const preguntaUsuario = "Me puedes decir como han estados los movimientos de mi tarjeta de credito, y que me recomiendas para un mejor uso";

  console.log(`\nSimulando pregunta del usuario: "${preguntaUsuario}"`);
  console.log("\nEnviando datos y pregunta a Gemini...");
  
const promptDelSistema = `
Eres un Asesor Financiero de IA avanzado y un experto en visualización de datos.

DATOS DEL USUARIO:
${datosCrudos}

CATÁLOGO DE GRÁFICOS DISPONIBLES (A2UI):
Como motor de UI, solo puedes utilizar los siguientes tipos de gráficos en tu layout. Debes analizar la intención del usuario y elegir el que mejor responda a su solicitud:

1. "BarChart": Úsalo para comparar volúmenes estáticos, como comparar el límite de crédito vs la deuda, o comparar gastos entre distintas categorías.
2. "ScatterPlot": Úsalo para mostrar la dispersión de movimientos (ej. relación entre el monto de los gastos y el día del mes) para detectar patrones o anomalías.
3. "CommentaryChart": Úsalo cuando necesites mostrar una métrica clave pero acompañada de una anotación o advertencia importante (ej. "Límite de crédito a punto de superarse").
4. "Tracking": Úsalo para mostrar el progreso hacia una meta o el consumo de un límite (ej. qué porcentaje de la línea de crédito se ha utilizado).
5. "SplineGraph": Úsalo para mostrar tendencias suaves en el tiempo (líneas curvas), como la evolución del saldo de la cuenta de nómina a lo largo de los periodos.
6. "CircularBarChart": Úsalo como alternativa al gráfico de pastel tradicional para mostrar distribuciones proporcionales de una forma más moderna (ej. distribución de los gastos totales por tarjeta).

Tu tarea es responder a la PREGUNTA DEL USUARIO y seleccionar el/los gráficos del CATÁLOGO que mejor ilustren tu respuesta.

REGLA ESTRICTA: 
Debes devolver ÚNICAMENTE un objeto JSON válido, sin texto adicional fuera del JSON ni formato markdown.
{
  "explicacion_texto": "Tu respuesta conversacional a la pregunta del usuario aquí",
  "a2ui_layout": {
     "tipo_componente": "DashboardFinanciero",
     "graficos": [ ... ]
  }
}
`;

const promptFinal = `
${promptDelSistema}

PREGUNTA DEL USUARIO:
${preguntaUsuario}
`;

try {
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: promptFinal,
  });

  const textoRespuesta = response.text.trim();
  
  const respuestaHibrida = JSON.parse(textoRespuesta);
  
  console.log('\n=======================================');
  console.log('🤖 AGENTE FINANCIERO (En la misma ventana)');
  console.log('=======================================');
  
  console.log(`\n💬 MENSAJE DE LA IA:\n"${respuestaHibrida.explicacion_texto}"`);

  console.log(`\n📊 COMPONENTES A2UI (Para renderizar los gráficos):`);
  console.log(JSON.stringify(respuestaHibrida.a2ui_layout, null, 2));
  console.log('=======================================\n');
  
} catch (error) {
   console.error('Error procesando la respuesta. Asegúrate de que Gemini devolvió un JSON válido:', error);
}
  
  await transport.close();
}

ejecutarAgente().catch(console.error);