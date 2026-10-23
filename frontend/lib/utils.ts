import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRM(value: number | null | undefined): string {
  if (value == null) return "—";
  return `RM${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}
