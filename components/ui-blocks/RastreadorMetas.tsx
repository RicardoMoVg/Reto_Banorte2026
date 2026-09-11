'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface RastreadorMetasProps {
  titulo: string;
  /** Porcentaje de avance de la meta, 0-100. */
  porcentaje: number;
  montoActual?: number;
  montoObjetivo?: number;
  className?: string;
}

/**
 * Bloque de LEGO: barra de progreso gamificada para una meta u hábito financiero.
 * Cerrado y estilizado — el agente de IA solo decide CUÁNDO renderizarlo y con
 * QUÉ props, nunca cómo se ve.
 */
export function RastreadorMetas({
  titulo,
  porcentaje,
  montoActual,
  montoObjetivo,
  className,
}: RastreadorMetasProps) {
  const pct = Math.min(100, Math.max(0, porcentaje));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'w-full max-w-md rounded-xl border border-mosaico-100 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-mosaico-900">{titulo}</h3>
        <span className="text-sm font-medium text-mosaico-600">{pct}%</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-mosaico-50">
        <motion.div
          className="h-full rounded-full bg-mosaico-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        />
      </div>

      {montoActual !== undefined && montoObjetivo !== undefined && (
        <p className="mt-2 text-xs text-mosaico-900/60">
          ${montoActual.toLocaleString('es-MX')} de $
          {montoObjetivo.toLocaleString('es-MX')}
        </p>
      )}
    </motion.div>
  );
}
