import type { OrderStatus } from "@/types";

export type Urgency = "fresh" | "warning" | "late";

export interface StatusMeta {
  label: string;
  icon: string;
  actionLabel: string;
  actionIcon: string;
  next: OrderStatus | null;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING: {
    label: "Aguardando",
    icon: "ri-time-line",
    actionLabel: "Iniciar preparo",
    actionIcon: "ri-play-circle-line",
    next: "PREPARING",
  },
  PREPARING: {
    label: "Em preparo",
    icon: "ri-fire-line",
    actionLabel: "Concluir / Pronto",
    actionIcon: "ri-check-double-line",
    next: "READY",
  },
  READY: {
    label: "Pronto",
    icon: "ri-checkbox-circle-line",
    actionLabel: "Entregar ao cliente",
    actionIcon: "ri-hand-coin-line",
    next: "DELIVERED",
  },
  DELIVERED: {
    label: "Entregue",
    icon: "ri-archive-2-line",
    actionLabel: "",
    actionIcon: "",
    next: null,
  },
  CANCELLED: {
    label: "Cancelado",
    icon: "ri-close-circle-line",
    actionLabel: "",
    actionIcon: "",
    next: null,
  },
};

export interface UrgencyMeta {
  label: string;
  bar: string;
  badge: string;
  card: string;
}

export const URGENCY_META: Record<Urgency, UrgencyMeta> = {
  fresh: {
    label: "No prazo",
    bar: "bg-secondary-400",
    badge: "bg-secondary-100 text-secondary-900",
    card: "border-background-300/70",
  },
  warning: {
    label: "Atenção",
    bar: "bg-accent-400",
    badge: "bg-accent-100 text-accent-900",
    card: "border-accent-300",
  },
  late: {
    label: "Atrasado",
    bar: "bg-primary-500",
    badge: "bg-primary-100 text-primary-800",
    card: "border-primary-400",
  },
};

const WARNING_MINUTES = 5;
const LATE_MINUTES = 15;

/** Classifica o pedido pelo tempo de espera (5 / 15 minutos). */
export function getUrgency(createdAt: string, nowMs: number): Urgency {
  const elapsedMinutes = (nowMs - new Date(createdAt).getTime()) / 60000;
  if (elapsedMinutes >= LATE_MINUTES) return "late";
  if (elapsedMinutes >= WARNING_MINUTES) return "warning";
  return "fresh";
}

/** Tempo decorrido desde a criação, ex: "12min 04s" ou "1h 03min". */
export function formatElapsed(createdAt: string, nowMs: number): string {
  const diff = Math.max(0, nowMs - new Date(createdAt).getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes}min ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export function formatOrderTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});