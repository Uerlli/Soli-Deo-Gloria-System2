import { useState } from "react";
import type { Order } from "@/types";
import {
  STATUS_META,
  URGENCY_META,
  currency,
  formatElapsed,
  formatOrderTime,
  getUrgency,
} from "@/pages/balcao/utils";

interface OrderCardProps {
  order: Order;
  nowMs: number;
  busy: boolean;
  onAdvance: (order: Order) => void;
  onCancel: (order: Order) => void;
}

export default function OrderCard({
  order,
  nowMs,
  busy,
  onAdvance,
  onCancel,
}: OrderCardProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const urgency = getUrgency(order.created_at, nowMs);
  const urgencyMeta = URGENCY_META[urgency];
  const statusMeta = STATUS_META[order.status];

  const isTakeaway = !order.table_identifier && !!order.customer_name;
  const identifier =
    order.table_identifier?.trim() ||
    (order.order_number ? `Comanda ${order.order_number}` : null) ||
    (isTakeaway ? order.customer_name : null) ||
    "Pedido";

  const items = order.items ?? [];

  return (
    <article
      className={[
        "relative flex flex-col overflow-hidden rounded-lg border bg-background-50 animate-fade-up",
        urgencyMeta.card,
      ].join(" ")}
    >
      <span className={`h-1.5 w-full ${urgencyMeta.bar}`} />

      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-foreground-500">
            {order.table_identifier ? "Mesa / Comanda" : "Identificação"}
          </p>
          <h4 className="mt-0.5 truncate font-heading text-lg font-medium leading-tight text-foreground-950">
            {identifier}
          </h4>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-500">
            <span>Recebido às {formatOrderTime(order.created_at)}</span>
            {order.customer_name && order.table_identifier && (
              <span className="text-foreground-600">· {order.customer_name}</span>
            )}
            {order.source === "simulator" && <span>· simulado</span>}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`numeric flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyMeta.badge} ${
              urgency === "late" ? "animate-pulse" : ""
            }`}
          >
            <i className="ri-timer-line text-sm" />
            {formatElapsed(order.created_at, nowMs)}
          </span>
          <span className="font-label text-[9px] uppercase tracking-wider text-foreground-400">
            {urgencyMeta.label}
          </span>
        </div>
      </header>

      <div className="border-t border-background-200/70 px-4 py-3">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <div className="flex items-start gap-2.5">
                <span className="numeric shrink-0 rounded-md bg-primary-100 px-2 py-0.5 text-sm font-bold leading-6 text-primary-700">
                  {item.quantity}x
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-6 text-foreground-950">
                    {item.product_name}
                  </p>
                  {item.notes && (
                    <p className="mt-0.5 flex items-start gap-1 text-xs leading-snug text-accent-800">
                      <i className="ri-speak-line mt-0.5 text-sm" />
                      <span>{item.notes}</span>
                    </p>
                  )}
                </div>
                <span className="numeric shrink-0 text-xs leading-6 text-foreground-500">
                  {currency.format(Number(item.unit_price) * item.quantity)}
                </span>
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-xs text-foreground-500">
              Nenhum item detalhado.
            </li>
          )}
        </ul>

        {order.notes && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-accent-200 bg-accent-50 px-3 py-2">
            <i className="ri-alert-line mt-0.5 text-sm text-accent-700" />
            <p className="text-xs font-medium leading-snug text-accent-900">
              {order.notes}
            </p>
          </div>
        )}
      </div>

      <footer className="mt-auto space-y-2 border-t border-background-200/70 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Total
          </span>
          <span className="numeric font-heading text-base font-semibold text-foreground-950">
            {currency.format(Number(order.total_amount))}
          </span>
        </div>

        {confirmingCancel ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmingCancel(false);
                onCancel(order);
              }}
              disabled={busy}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-background-50 transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              <i className="ri-close-circle-line" />
              Confirmar cancelamento
            </button>
            <button
              type="button"
              onClick={() => setConfirmingCancel(false)}
              className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-3 py-2 text-sm text-foreground-600 transition-colors hover:bg-background-100"
            >
              Voltar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {statusMeta.next && (
              <button
                type="button"
                onClick={() => onAdvance(order)}
                disabled={busy}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-foreground-950 px-3 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-foreground-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className={`${statusMeta.actionIcon} text-lg`} />
                {statusMeta.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              title="Cancelar pedido"
              aria-label="Cancelar pedido"
              disabled={busy}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-background-300 text-foreground-500 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
            >
              <i className="ri-delete-bin-6-line text-lg" />
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}