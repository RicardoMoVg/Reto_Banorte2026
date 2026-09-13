'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BotonPin } from '@/components/dashboard/BotonPin';
import type { PropsBloque } from './tipos';

export interface Transaccion {
  descripcion: string;
  /** Negativo = gasto, positivo = ingreso. */
  monto: number;
  categoria?: string;
}

export interface ListaTransaccionesProps extends PropsBloque {
  titulo: string;
  transacciones: Transaccion[];
}

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/**
 * Bloque A2UI de prueba: lista compacta de movimientos.
 */
export function ListaTransacciones({
  titulo,
  transacciones,
  mensajeAgente,
  onPin,
  anclable = true,
  className,
}: ListaTransaccionesProps) {
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
        <h3 className="text-sm font-semibold leading-tight text-neutral-900">
          {titulo}
        </h3>
        <BotonPin
          tipo="ListaTransacciones"
          datos={{ titulo, transacciones, mensajeAgente }}
          onPin={onPin}
          anclable={anclable}
        />
      </div>

      <ul className="divide-y divide-neutral-100">
        {transacciones.map((t, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-neutral-800">
                {t.descripcion}
              </p>
              {t.categoria && (
                <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                  {t.categoria}
                </p>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 text-sm font-semibold tabular-nums',
                t.monto >= 0 ? 'text-emerald-600' : 'text-neutral-900',
              )}
            >
              {t.monto >= 0 ? '+' : ''}
              {formatoMXN.format(t.monto)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        {mensajeAgente}
      </p>
    </motion.div>
  );
}
