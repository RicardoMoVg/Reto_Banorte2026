'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePin } from './pin-context';

export interface BotonPinProps {
  /** Nombre del bloque, tal cual lo espera el switch del dashboard. */
  tipo: string;
  /**
   * Props del bloque. Es EXACTAMENTE lo que se guarda y con lo que se
   * rehidrata el widget en el dashboard, así que debe bastar para
   * reconstruir el componente sin nada más.
   */
  datos: any;
  /**
   * Handler directo. Normalmente no se pasa: los bloques los renderiza el
   * agente desde el Server Action y las funciones no cruzan el límite RSC,
   * así que el handler llega por PinContext.
   */
  onPin?: (tipoComponente: string, datos: any) => void;
  /** false = modo dashboard (ya anclado): no se renderiza nada. */
  anclable?: boolean;
  className?: string;
}

/**
 * Botón de anclado compartido por todos los bloques A2UI. Se rinde solo si
 * hay un handler disponible (prop o contexto) y el bloque es anclable.
 */
export function BotonPin({
  tipo,
  datos,
  onPin,
  anclable = true,
  className,
}: BotonPinProps) {
  const pinDesdeContexto = usePin();
  const pin = onPin ?? pinDesdeContexto;
  const [anclado, setAnclado] = useState(false);

  if (!anclable || !pin) return null;

  function handleClick() {
    if (anclado) return;
    pin(tipo, datos);
    setAnclado(true);
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={anclado}
      whileTap={{ scale: 0.94 }}
      aria-label={anclado ? 'Anclado al dashboard' : 'Anclar al dashboard'}
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors',
        anclado
          ? 'cursor-default border-banorte/25 bg-banorte/10 text-banorte'
          : 'border-neutral-200 text-neutral-400 hover:border-banorte/30 hover:bg-banorte/5 hover:text-banorte',
        className,
      )}
    >
      {anclado ? (
        <Check className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <Pin className="h-3 w-3" strokeWidth={2.5} />
      )}
      {anclado ? 'Anclado' : 'Anclar'}
    </motion.button>
  );
}
