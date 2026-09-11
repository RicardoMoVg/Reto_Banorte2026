'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface RastreadorMetasProps {
  titulo: string;
  /** Porcentaje de avance de la meta, 0-100. */
  porcentaje: number;
  /** Mensaje breve del agente sobre este avance (ej. "¡Vas muy bien este mes!"). */
  mensajeAgente: string;
  className?: string;
}

/**
 * Bloque A2UI: el agente transmite este componente ya renderizado al
 * cliente (vía streamUI/RSC) — el cliente nunca recibe JSON crudo que tenga
 * que interpretar y dibujar. Cerrado y estilizado: el agente solo decide
 * CUÁNDO usarlo y con QUÉ props, nunca cómo se ve.
 */
export function RastreadorMetas({
  titulo,
  porcentaje,
  mensajeAgente,
  className,
}: RastreadorMetasProps) {
  const pct = Math.min(100, Math.max(0, porcentaje));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{titulo}</h3>
        <span className="text-sm font-bold text-banorte">{pct}%</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className="h-full rounded-full bg-banorte"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        />
      </div>

      <p className="mt-2 text-xs text-neutral-500">{mensajeAgente}</p>
    </motion.div>
  );
}
