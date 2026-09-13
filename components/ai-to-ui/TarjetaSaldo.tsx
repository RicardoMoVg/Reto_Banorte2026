'use client';

import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BotonPin } from '@/components/dashboard/BotonPin';
import type { PropsBloque } from './tipos';

export interface TarjetaSaldoProps extends PropsBloque {
  titulo: string;
  /** Monto en pesos. Puede ser negativo. */
  monto: number;
}

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/**
 * Bloque A2UI de prueba: un dato financiero grande y legible (saldo,
 * total del mes, disponible, etc.).
 */
export function TarjetaSaldo({
  titulo,
  monto,
  mensajeAgente,
  onPin,
  anclable = true,
  className,
}: TarjetaSaldoProps) {
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
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-banorte" strokeWidth={2} />
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {titulo}
          </h3>
        </div>
        <BotonPin
          tipo="TarjetaSaldo"
          datos={{ titulo, monto, mensajeAgente }}
          onPin={onPin}
          anclable={anclable}
        />
      </div>

      <p className="text-2xl font-bold tabular-nums tracking-tight text-neutral-900">
        {formatoMXN.format(monto)}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        {mensajeAgente}
      </p>
    </motion.div>
  );
}
