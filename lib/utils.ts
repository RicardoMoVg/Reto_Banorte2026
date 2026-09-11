import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Helper estándar de shadcn/ui para combinar clases de Tailwind sin colisiones.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
