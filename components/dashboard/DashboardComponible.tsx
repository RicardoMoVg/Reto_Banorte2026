'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, X } from 'lucide-react';
import {
  ComparativoGastos,
  ListaTransacciones,
  RastreadorMetas,
  TarjetaSaldo,
} from '@/components/generative';
import type { WidgetAnclado } from './tipos';

/**
 * Motor de renderizado del Dashboard Componible.
 *
 * Rehidrata cada widget a partir de su JSON (`tipo` + `datos`). Es el espejo
 * del catálogo de lib/ai/bloques.tsx: por cada bloque que el agente pueda
 * generar, aquí debe existir su `case` para poder reconstruirlo.
 *
 * `datos` es literalmente el objeto de props del bloque (así se guardó desde
 * <BotonPin />), por eso se puede hacer spread directo. Todos van con
 * `anclable={false}`: ya están anclados.
 */
function renderWidget(widget: WidgetAnclado) {
  const props = { ...widget.datos, anclable: false, className: 'max-w-none' };

  switch (widget.tipo) {
    case 'RastreadorMetas':
      return <RastreadorMetas {...props} />;
    case 'TarjetaSaldo':
      return <TarjetaSaldo {...props} />;
    case 'ListaTransacciones':
      return <ListaTransacciones {...props} />;
    case 'ComparativoGastos':
      return <ComparativoGastos {...props} />;
    default:
      return null;
  }
}

export function DashboardComponible({
  widgets,
  onDesanclar,
}: {
  widgets: WidgetAnclado[];
  onDesanclar: (id: string) => void;
}) {
  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 py-12 text-center">
        <LayoutDashboard className="h-6 w-6 text-neutral-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-neutral-500">
          Tu dashboard está vacío
        </p>
        <p className="max-w-xs text-xs leading-relaxed text-neutral-400">
          Pregúntale al asistente por tus metas y presiona{' '}
          <span className="font-medium text-neutral-500">Anclar</span> en
          cualquier bloque para guardarlo aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AnimatePresence mode="popLayout">
        {widgets.map((widget) => (
          <motion.div
            key={widget.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="group relative"
          >
            {renderWidget(widget)}

            {/* Desanclar: chrome del dashboard, no del bloque. Así ningún
                componente generativo tiene que saber que existe. */}
            <button
              type="button"
              onClick={() => onDesanclar(widget.id)}
              aria-label="Quitar del dashboard"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 opacity-0 shadow-sm transition-all hover:border-banorte/30 hover:text-banorte focus:opacity-100 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
