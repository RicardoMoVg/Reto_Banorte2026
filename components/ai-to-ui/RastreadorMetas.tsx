'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BotonPin } from '@/components/dashboard/BotonPin';
import type { PropsBloque } from './tipos';

export interface RastreadorMetasProps extends PropsBloque {
  titulo: string;
  /** Porcentaje de avance de la meta, 0-100. */
  porcentaje: number;
}

/**
 * Bloque A2UI: progreso de una meta u hábito financiero.
 *
 * El agente transmite este componente ya renderizado al cliente (vía
 * streamUI/RSC) — el cliente nunca recibe JSON crudo que tenga que
 * interpretar. Cerrado y estilizado: el agente decide CUÁNDO usarlo y con
 * QUÉ props, nunca cómo se ve.
 */
export function RastreadorMetas({
  titulo,
  porcentaje,
  mensajeAgente,
  onPin,
  anclable = true,
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
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-tight text-neutral-900">
          {titulo}
        </h3>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold tabular-nums text-banorte">
            {pct}%
          </span>
          <BotonPin
            tipo="RastreadorMetas"
            datos={{ titulo, porcentaje: pct, mensajeAgente }}
            onPin={onPin}
            anclable={anclable}
          />
        </div>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className="h-full rounded-full bg-banorte"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        {mensajeAgente}
      </p>
    </motion.div>
  );
}
