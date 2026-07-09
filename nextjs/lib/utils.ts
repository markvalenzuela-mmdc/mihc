import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDurationSeconds(value: number | null) {
  if (value === null) return "Not available";
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  return `${minutes}m ${value % 60}s`;
}

export function formatDurationMs(value: number | null) {
  if (value === null) return "Not available";
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
}
