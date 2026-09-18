import type { Order, OrderStatus } from "@/types";
import { normalizeName } from "@/lib/text";

export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export interface Comanda {
  key: string;
  label: string;
  orders: Order[];
  total: number;
  itemCount: number;
  latestAt: string;
}

export const COMANDA_STATUS_META: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PENDING: { label: "Aguardando", className: "bg-accent-100 text-accent-900" },
  PREPARING: { label: "Em preparo", className: "bg-primary-100 text-primary-800" },
  READY: { label: "Pronto", className: "bg-secondary-100 text-secondary-900" },
  DELIVERED: { label: "Entregue", className: "bg-background-200 text-foreground-700" },
  CANCELLED: { label: "Cancelado", className: "bg-background-200 text-foreground-500" },
};

export function buildComandas(orders: Order[]): Comanda[] {
  const map = new Map<string, { label: string; list: Order[] }>();

  orders
    .filter((order) => order.create_comanda && order.customer_name?.trim())
    .forEach((order) => {
      const name = (order.customer_name ?? "").trim();
      const key = normalizeName(name);
      const entry = map.get(key) ?? { label: name, list: [] };
      entry.list.push(order);
      map.set(key, entry);
    });

  const comandas = Array.from(map.entries()).map(([key, entry]) => {
    const sorted = [...entry.list].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const total = sorted.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const itemCount = sorted.reduce(
      (sum, order) =>
        sum +
        (order.items ?? [])
          .filter((item) => !item.cancelled)
          .reduce((qty, item) => qty + item.quantity, 0),
      0
    );
    const latestAt = sorted.reduce(
      (acc, order) => (order.updated_at > acc ? order.updated_at : acc),
      sorted[0].updated_at
    );

    return {
      key,
      label: entry.label,
      orders: sorted,
      total,
      itemCount,
      latestAt,
    };
  });

  comandas.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  return comandas;
}

export function formatClock(value: string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}