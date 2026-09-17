import type { StockMovementType } from "@/types/inventory";

export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export interface MovementMeta {
  label: string;
  icon: string;
  tag: string;
  /** "in" aumenta o saldo, "out" reduz. */
  direction: "in" | "out";
}

export const MOVEMENT_META: Record<StockMovementType, MovementMeta> = {
  ENTRY: {
    label: "Entrada",
    icon: "ri-add-circle-line",
    tag: "bg-secondary-100 text-secondary-900",
    direction: "in",
  },
  SALE_DEDUCTION: {
    label: "Venda",
    icon: "ri-shopping-bag-3-line",
    tag: "bg-foreground-100 text-foreground-800",
    direction: "out",
  },
  WASTE: {
    label: "Perda / Avaria",
    icon: "ri-delete-bin-6-line",
    tag: "bg-primary-100 text-primary-800",
    direction: "out",
  },
  INTERNAL_CONSUMPTION: {
    label: "Consumo interno",
    icon: "ri-cup-line",
    tag: "bg-accent-100 text-accent-900",
    direction: "out",
  },
  ADJUSTMENT: {
    label: "Ajuste",
    icon: "ri-equalizer-line",
    tag: "bg-background-200 text-foreground-700",
    direction: "out",
  },
};

/** Motivos de descarte disponíveis no modal de perdas. */
export const WASTE_REASONS = [
  { value: "WASTE", label: "Avaria / Quebra", hint: "Produto danificado no manuseio" },
  { value: "EXPIRED", label: "Validade vencida", hint: "Fora do prazo de consumo" },
  {
    value: "INTERNAL_CONSUMPTION",
    label: "Consumo da casa / equipe",
    hint: "Uso interno autorizado",
  },
  {
    value: "ADJUSTMENT",
    label: "Ajuste de inventário",
    hint: "Correção de contagem física",
  },
] as const;

export type WasteReasonValue = (typeof WASTE_REASONS)[number]["value"];

export function formatStock(value: number, unit: string): string {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${formatted} ${unit}${value === 1 ? "" : "s"}`;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}