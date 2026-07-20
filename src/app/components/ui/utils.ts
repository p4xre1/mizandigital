import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple class names conditionally and resolves Tailwind CSS class conflicts.
 *
 * Uses `clsx` to join conditional class definitions and `tailwind-merge`
 * to safely resolve duplicate or conflicting Tailwind classes.
 *
 * @param inputs - Variadic list of class values (strings, objects, arrays, or falsy values)
 * @returns Merged and resolved class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
