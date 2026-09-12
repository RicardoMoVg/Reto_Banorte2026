'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BotonPin } from '@/components/dashboard/BotonPin';
import type { PropsBloque } from './tipos';

export interface CategoriaGasto {
  nombre: string;
  monto: number;
}

export interface ComparativoGastosProps extends PropsBloque {
  titulo: string;
  categorias: CategoriaGasto[];
}

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

/**
 * Bloque A2UI de prueba: barras horizontales de gasto por categoría.
 * Sin librería de gráficas — puro Tailwind, suficiente para validar el flujo.
 */
export function ComparativoGastos({
  titulo,
  categorias,
  mensajeAgente,
  onPin,
  anclable = true,
  className,
}: ComparativoGastosProps) {
  const maximo = Math.max(...categorias.map((c) => Math.abs(c.monto)), 1);

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
          tipo="ComparativoGastos"
          datos={{ titulo, categorias, mensajeAgente }}
          onPin={onPin}
          anclable={anclable}
        />
      </div>

      <div className="space-y-2.5">
        {categorias.map((c, i) => {
          const ancho = (Math.abs(c.monto) / maximo) * 100;
          return (
            <div key={c.nombre}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-neutral-600">
                  {c.nombre}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-900">
                  {formatoMXN.format(Math.abs(c.monto))}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <motion.div
                  className="h-full rounded-full bg-banorte"
                  initial={{ width: 0 }}
                  animate={{ width: `${ancho}%` }}
                  transition={{
                    duration: 0.5,
                    ease: 'easeOut',
                    delay: 0.1 + i * 0.06,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        {mensajeAgente}
      </p>
    </motion.div>
  );
}
