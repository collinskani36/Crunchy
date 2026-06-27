import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return `KES ${amount.toFixed(2)}`;
}

// Helper to generate a random gradient based on string
export function getGradientFromString(str: string): string {
  const gradients = [
    'from-rose-400/20 to-orange-400/20',
    'from-blue-400/20 to-purple-400/20',
    'from-green-400/20 to-emerald-400/20',
    'from-yellow-400/20 to-amber-400/20',
    'from-indigo-400/20 to-pink-400/20',
    'from-cyan-400/20 to-blue-400/20',
  ];
  const index = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}