import { tool } from 'ai';
import {
  getMetasUsuario,
  getSaldoUsuario,
  getTransaccionesRecientes,
  crearMeta,
  aportarAMeta,
  archivarMeta,
  crearAportacionProgramada,
  cancelarAportacionProgramada,
  getCuentasUsuario,
  crearTransaccion,
  actualizarPerfilInversion,
  comprarPosicion,
  venderPosicion,
  getTarjetasCredito,
  crearCompraTarjeta,
  diferirAMsi,
  crearSolicitudCredito,
  cancelarSolicitudCredito,
  crearContactoPago,
  desactivarContactoPago,
  getContactosPago,
  crearTransferencia,
  cancelarTransferencia,
  cotizarPoliza,
  activarPoliza,
  cancelarPoliza,
  crearSiniestro,
  crearDiagnosticoFinanciero,
  crearHabitoFinanciero,
  actualizarRachaHabito,
  desactivarHabito,
} from '@/lib/mcp/mcp-client';
import {
  schemaProgresoMeta,
  schemaSaldo,
  schemaTransacciones,
  schemaComparativoGastos,
  schemaCrearMeta,
  schemaAportarAMeta,
  schemaArchivarMeta,
  schemaCrearAportacionProgramada,
  schemaCancelarAportacionProgramada,
  schemaCrearTransaccion,
  schemaActualizarPerfilInversion,
  schemaComprarPosicion,
  schemaVenderPosicion,
  schemaCrearCompraTarjeta,
  schemaDiferirAMsi,
  schemaCrearSolicitudCredito,
  schemaCancelarSolicitudCredito,
  schemaCrearContactoPago,
  schemaDesactivarContactoPago,
  schemaCrearTransferencia,
  schemaCancelarTransferencia,
  schemaCotizarPoliza,
  schemaActivarPoliza,
  schemaCancelarPoliza,
  schemaCrearSiniestro,
  schemaCrearDiagnosticoFinanciero,
  schemaCrearHabitoFinanciero,
  schemaActualizarRachaHabito,
  schemaDesactivarHabito,
} from './a2ui-schemas';

/**
 * Catálogo de tools del A2UI-lite (API JSON, /app/api/agent/route.ts).
 *
 * Cada tool usa la API plana de "ai" y su `execute` regresa JSON, nunca
 * JSX — el cliente (client/) decide cómo pintarlo con su propio catálogo
 * de componentes nativos. Llama al MCP real: el modelo nunca inventa
 * datos, solo elige qué mostrar y redacta el mensaje de contexto.
 */
export function buildA2uiTools(userId: string) {
  return {
    mostrarProgresoMeta: tool({
      description:
        'Muestra visualmente el progreso de una meta de ahorro o hábito ' +
        'financiero del usuario. Úsala siempre que pregunte por su avance, ' +
        'en vez de describir el porcentaje en texto.',
      parameters: schemaProgresoMeta,
      execute: async ({ metaId, mensajeAgente }) => {
        const metas = await getMetasUsuario(userId);
        // Si el modelo manda un metaId que no existe (a veces inventa un id
        // "plausible" en vez de dejarlo vacío), no truena: cae a la meta con
        // menor avance, igual que cuando no se especifica ninguno.
        const meta = (metaId && metas.find((m) => m.id === metaId)) || metas[0];

        if (!meta) {
          return { error: 'El usuario no tiene metas registradas.' };
        }

        return {
          tipo: 'RastreadorMetas' as const,
          props: {
            titulo: meta.titulo,
            porcentaje: meta.porcentaje,
            mensajeAgente,
          },
        };
      },
    }),

    mostrarSaldo: tool({
      description:
        'Muestra un monto financiero destacado: saldo disponible, total ' +
        'gastado en el mes, dinero ahorrado, etc.',
      parameters: schemaSaldo,
      execute: async ({ titulo, mensajeAgente }) => {
        const saldo = await getSaldoUsuario(userId);

        return {
          tipo: 'TarjetaSaldo' as const,
          props: {
            titulo,
            monto: saldo,
            mensajeAgente,
          },
        };
      },
    }),

    mostrarTransacciones: tool({
      description:
        'Muestra una lista de movimientos recientes del usuario. Úsala ' +
        'cuando pregunte en qué gastó, sus últimos cargos o sus ingresos.',
      parameters: schemaTransacciones,
      execute: async ({ titulo, limite, categoria, mensajeAgente }) => {
        const transacciones = await getTransaccionesRecientes(userId, {
          limite: limite ?? 10,
          categoria,
        });

        return {
          tipo: 'ListaTransacciones' as const,
          props: {
            titulo,
            transacciones: transacciones.map((t) => ({
              descripcion: t.descripcion,
              monto: t.monto,
              categoria: t.categoria,
            })),
            mensajeAgente,
          },
        };
      },
    }),

    mostrarComparativoGastos: tool({
      description:
        'Muestra una gráfica de barras comparando cuánto gastó el usuario ' +
        'por categoría. Úsala cuando pregunte en qué se le va el dinero o ' +
        'pida comparar categorías.',
      parameters: schemaComparativoGastos,
      execute: async ({ titulo, mensajeAgente }) => {
        // No existe una tool de MCP para "gasto por categoría" — se
        // agrega aquí en JS a partir de las transacciones, en vez de
        // agregar una tabla/query nueva en mcp-server/ (ver plan, Paso 3c).
        const transacciones = await getTransaccionesRecientes(userId, { limite: 100 });

        const porCategoria = new Map<string, number>();
        for (const t of transacciones) {
          if (t.monto >= 0) continue; // solo gastos, no ingresos
          const categoria = t.categoria || 'otros';
          porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + Math.abs(t.monto));
        }

        const categorias = Array.from(porCategoria.entries())
          .map(([nombre, monto]) => ({ nombre, monto }))
          .sort((a, b) => b.monto - a.monto)
          .slice(0, 6);

        return {
          tipo: 'ComparativoGastos' as const,
          props: { titulo, categorias, mensajeAgente },
        };
      },
    }),

    // ============================================================
    // Tools de ESCRITURA -- el modelo ya puede ejecutar acciones, no solo
    // mostrar datos. Cada una llama a mcp-client.ts (nunca inventa el
    // resultado) y regresa Confirmacion salvo que exista un componente más
    // específico (metas reusan RastreadorMetas, crearTransaccion reusa
    // TarjetaSaldo). Los errores de negocio se regresan como `{error}` sin
    // `tipo` -- route.ts ya los convierte en texto plano.
    // ============================================================

    crearMeta: tool({
      description: 'Crea una nueva meta de ahorro para el usuario. Úsala cuando pida armar una meta nueva.',
      parameters: schemaCrearMeta,
      execute: async ({ titulo, montoObjetivo, montoInicial, mensajeAgente }) => {
        const meta = await crearMeta(userId, titulo, montoObjetivo, montoInicial);
        return {
          tipo: 'RastreadorMetas' as const,
          props: { titulo: meta.titulo, porcentaje: meta.porcentaje, mensajeAgente },
        };
      },
    }),

    aportarAMeta: tool({
      description: 'Aporta dinero a una meta de ahorro activa del usuario. Úsala cuando pida abonar/meter dinero a una meta.',
      parameters: schemaAportarAMeta,
      execute: async ({ metaId, monto, mensajeAgente }) => {
        const metas = await getMetasUsuario(userId);
        // A diferencia de mostrarProgresoMeta (solo lectura), aquí un
        // metaId que no existe SÍ debe truncar en error -- es dinero
        // moviéndose de verdad, no se vale adivinar en silencio a cuál
        // meta cayó.
        let meta;
        if (metaId) {
          meta = metas.find((m) => m.id === metaId);
          if (!meta) return { error: `No se encontró una meta activa con id "${metaId}".` };
        } else {
          meta = metas[0];
          if (!meta) return { error: 'El usuario no tiene metas registradas.' };
        }

        const resultado = await aportarAMeta(userId, meta.id, monto);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'RastreadorMetas' as const,
          props: { titulo: resultado.titulo, porcentaje: resultado.porcentaje, mensajeAgente },
        };
      },
    }),

    archivarMeta: tool({
      description: 'Archiva una meta del usuario (deja de contar, no se borra su historial). Solo si lo pide explícitamente.',
      parameters: schemaArchivarMeta,
      execute: async ({ metaId, mensajeAgente }) => {
        const resultado = await archivarMeta(userId, metaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Meta archivada', mensaje: resultado.titulo, exito: true, mensajeAgente },
        };
      },
    }),

    crearAportacionProgramada: tool({
      description:
        'Crea un plan de aportación periódica hacia una meta (ej. "$634/mes por 6 meses"). No ejecuta ' +
        'aportaciones, solo guarda el compromiso.',
      parameters: schemaCrearAportacionProgramada,
      execute: async ({ metaId, monto, periodicidad, fechaInicio, mensajeAgente }) => {
        const resultado = await crearAportacionProgramada(userId, metaId, monto, periodicidad, fechaInicio);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Plan de aportación creado',
            mensaje: `$${monto} ${periodicidad}, a partir de ${fechaInicio}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    cancelarAportacionProgramada: tool({
      description: 'Cancela un plan de aportación programada activo.',
      parameters: schemaCancelarAportacionProgramada,
      execute: async ({ aportacionId, mensajeAgente }) => {
        const resultado = await cancelarAportacionProgramada(userId, aportacionId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Plan cancelado', mensaje: 'Se canceló el plan de aportación.', exito: true, mensajeAgente },
        };
      },
    }),

    crearTransaccion: tool({
      description: 'Registra un movimiento (gasto o ingreso) en una cuenta del usuario. Úsala cuando pida registrar/anotar un gasto o ingreso.',
      parameters: schemaCrearTransaccion,
      execute: async ({ cuentaId, descripcion, monto, categoria, mensajeAgente }) => {
        const cuentas = await getCuentasUsuario(userId);
        let cuenta;
        if (cuentaId) {
          cuenta = cuentas.find((c) => c.id === cuentaId);
          if (!cuenta) return { error: `No se encontró una cuenta con id "${cuentaId}".` };
        } else {
          cuenta = cuentas[0];
          if (!cuenta) return { error: 'El usuario no tiene cuentas registradas.' };
        }

        const resultado = await crearTransaccion(userId, cuenta.id, descripcion, monto, categoria);
        if ('error' in resultado) return { error: resultado.error };

        const saldo = await getSaldoUsuario(userId);
        return {
          tipo: 'TarjetaSaldo' as const,
          props: { titulo: 'Saldo disponible', monto: saldo, mensajeAgente },
        };
      },
    }),

    actualizarPerfilInversion: tool({
      description: 'Actualiza el perfil de inversión del usuario (tolerancia al riesgo y horizonte).',
      parameters: schemaActualizarPerfilInversion,
      execute: async ({ toleranciaRiesgo, horizonteAnios, mensajeAgente }) => {
        await actualizarPerfilInversion(userId, toleranciaRiesgo, horizonteAnios);

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Perfil actualizado',
            mensaje: `Tolerancia ${toleranciaRiesgo}, horizonte ${horizonteAnios} años.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    comprarPosicion: tool({
      description: 'Compra un instrumento de inversión para el usuario (de un id ya consultado en el catálogo).',
      parameters: schemaComprarPosicion,
      execute: async ({ instrumentoId, cantidad, precioCompra, mensajeAgente }) => {
        await comprarPosicion(userId, instrumentoId, cantidad, precioCompra);

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Compra realizada',
            mensaje: `${cantidad} unidades a $${precioCompra}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    venderPosicion: tool({
      description: 'Vende una posición de inversión del usuario, total o parcialmente.',
      parameters: schemaVenderPosicion,
      execute: async ({ posicionId, cantidad, mensajeAgente }) => {
        const resultado = await venderPosicion(userId, posicionId, cantidad);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Venta realizada',
            mensaje: resultado.activa ? 'Venta parcial registrada.' : 'Posición vendida por completo.',
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    crearCompraTarjeta: tool({
      description: 'Registra un cargo (compra) en una tarjeta de crédito del usuario.',
      parameters: schemaCrearCompraTarjeta,
      execute: async ({ tarjetaId, descripcion, monto, mensajeAgente }) => {
        const tarjetas = await getTarjetasCredito(userId);
        let tarjeta;
        if (tarjetaId) {
          tarjeta = tarjetas.find((t) => t.id === tarjetaId);
          if (!tarjeta) return { error: `No se encontró una tarjeta con id "${tarjetaId}".` };
        } else {
          tarjeta = tarjetas[0];
          if (!tarjeta) return { error: 'El usuario no tiene tarjetas de crédito registradas.' };
        }

        const resultado = await crearCompraTarjeta(userId, tarjeta.id, descripcion, monto);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Compra registrada', mensaje: `${descripcion}: $${monto}.`, exito: true, mensajeAgente },
        };
      },
    }),

    diferirAMsi: tool({
      description: 'Difiere una compra ya hecha en tarjeta de crédito a meses sin intereses (MSI).',
      parameters: schemaDiferirAMsi,
      execute: async ({ compraId, mesesMsi, mensajeAgente }) => {
        const resultado = await diferirAMsi(userId, compraId, mesesMsi);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Compra diferida',
            mensaje: `Diferida a ${mesesMsi} meses sin intereses.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    crearSolicitudCredito: tool({
      description: 'Crea una solicitud de crédito para el usuario.',
      parameters: schemaCrearSolicitudCredito,
      execute: async ({ tipo, montoSolicitado, mensajeAgente }) => {
        await crearSolicitudCredito(userId, tipo, montoSolicitado);

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Solicitud enviada',
            mensaje: `Crédito ${tipo} por $${montoSolicitado}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    cancelarSolicitudCredito: tool({
      description: 'Cancela una solicitud de crédito pendiente.',
      parameters: schemaCancelarSolicitudCredito,
      execute: async ({ solicitudId, mensajeAgente }) => {
        const resultado = await cancelarSolicitudCredito(userId, solicitudId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Solicitud cancelada', mensaje: 'Se canceló la solicitud.', exito: true, mensajeAgente },
        };
      },
    }),

    crearContactoPago: tool({
      description: 'Guarda un nuevo contacto de pago para el usuario.',
      parameters: schemaCrearContactoPago,
      execute: async ({ nombre, clabe, mensajeAgente }) => {
        await crearContactoPago(userId, nombre, clabe);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Contacto guardado', mensaje: nombre, exito: true, mensajeAgente },
        };
      },
    }),

    desactivarContactoPago: tool({
      description: 'Desactiva un contacto de pago guardado.',
      parameters: schemaDesactivarContactoPago,
      execute: async ({ contactoId, mensajeAgente }) => {
        const resultado = await desactivarContactoPago(userId, contactoId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Contacto desactivado', mensaje: resultado.nombre, exito: true, mensajeAgente },
        };
      },
    }),

    crearTransferencia: tool({
      description:
        'Transfiere dinero del usuario a uno de sus contactos de pago guardados. Úsala cuando pida ' +
        'transferirle/mandarle dinero a alguien por nombre.',
      parameters: schemaCrearTransferencia,
      execute: async ({ nombreContacto, monto, concepto, mensajeAgente }) => {
        const contactos = await getContactosPago(userId, { nombre: nombreContacto });

        if (contactos.length === 0) {
          return { error: `No se encontró ningún contacto guardado que coincida con "${nombreContacto}".` };
        }
        if (contactos.length > 1) {
          return {
            error: `Hay más de un contacto que coincide con "${nombreContacto}": ${contactos
              .map((c) => c.nombre)
              .join(', ')}. Pide que aclare a cuál.`,
          };
        }

        const resultado = await crearTransferencia(userId, contactos[0].id, monto, concepto);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Transferencia realizada',
            mensaje: `$${monto} a ${contactos[0].nombre}.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    cancelarTransferencia: tool({
      description: 'Cancela una transferencia que sigue pendiente.',
      parameters: schemaCancelarTransferencia,
      execute: async ({ transferenciaId, mensajeAgente }) => {
        const resultado = await cancelarTransferencia(userId, transferenciaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Transferencia cancelada', mensaje: 'Se canceló la transferencia.', exito: true, mensajeAgente },
        };
      },
    }),

    cotizarPoliza: tool({
      description: 'Genera una cotización de seguro para el usuario.',
      parameters: schemaCotizarPoliza,
      execute: async ({ tipo, cobertura, primaMensual, vigenciaFin, mensajeAgente }) => {
        await cotizarPoliza(userId, tipo, cobertura, primaMensual, vigenciaFin);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Cotización generada', mensaje: `${tipo}: $${primaMensual}/mes.`, exito: true, mensajeAgente },
        };
      },
    }),

    activarPoliza: tool({
      description: 'Activa una póliza de seguro que estaba cotizada.',
      parameters: schemaActivarPoliza,
      execute: async ({ polizaId, mensajeAgente }) => {
        const resultado = await activarPoliza(userId, polizaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Póliza activada', mensaje: resultado.cobertura, exito: true, mensajeAgente },
        };
      },
    }),

    cancelarPoliza: tool({
      description: 'Cancela una póliza de seguro (cotizada o activa).',
      parameters: schemaCancelarPoliza,
      execute: async ({ polizaId, mensajeAgente }) => {
        const resultado = await cancelarPoliza(userId, polizaId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Póliza cancelada', mensaje: resultado.cobertura, exito: true, mensajeAgente },
        };
      },
    }),

    crearSiniestro: tool({
      description: 'Reporta un siniestro/reclamo sobre una póliza de seguro activa.',
      parameters: schemaCrearSiniestro,
      execute: async ({ polizaId, descripcion, montoReclamado, mensajeAgente }) => {
        const resultado = await crearSiniestro(userId, polizaId, descripcion, montoReclamado);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Siniestro reportado', mensaje: descripcion, exito: true, mensajeAgente },
        };
      },
    }),

    crearDiagnosticoFinanciero: tool({
      description: 'Registra un nuevo diagnóstico financiero (puntaje 0-100) para el usuario.',
      parameters: schemaCrearDiagnosticoFinanciero,
      execute: async ({ puntaje, mensajeAgente }) => {
        await crearDiagnosticoFinanciero(userId, puntaje);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Diagnóstico registrado', mensaje: `Puntaje: ${puntaje}/100.`, exito: true, mensajeAgente },
        };
      },
    }),

    crearHabitoFinanciero: tool({
      description: 'Registra un nuevo hábito financiero que el usuario quiere seguir.',
      parameters: schemaCrearHabitoFinanciero,
      execute: async ({ habito, mensajeAgente }) => {
        await crearHabitoFinanciero(userId, habito);

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Hábito creado', mensaje: habito, exito: true, mensajeAgente },
        };
      },
    }),

    actualizarRachaHabito: tool({
      description: 'Suma o resetea los días de racha de un hábito financiero activo.',
      parameters: schemaActualizarRachaHabito,
      execute: async ({ habitoId, dias, mensajeAgente }) => {
        const resultado = await actualizarRachaHabito(userId, habitoId, dias);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: {
            titulo: 'Racha actualizada',
            mensaje: `${resultado.habito}: ${resultado.rachaDias} días.`,
            exito: true,
            mensajeAgente,
          },
        };
      },
    }),

    desactivarHabito: tool({
      description: 'Desactiva un hábito financiero.',
      parameters: schemaDesactivarHabito,
      execute: async ({ habitoId, mensajeAgente }) => {
        const resultado = await desactivarHabito(userId, habitoId);
        if ('error' in resultado) return { error: resultado.error };

        return {
          tipo: 'Confirmacion' as const,
          props: { titulo: 'Hábito desactivado', mensaje: resultado.habito, exito: true, mensajeAgente },
        };
      },
    }),
  };
}
