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
  onCancelItem: (order: Order, itemId: string) => void;
  onToggleDelivered: (itemId: string, delivered: boolean) => void;
}

export default function OrderCard({
  order,
  nowMs,
  busy,
  onAdvance,
  onCancel,
  onCancelItem,
  onToggleDelivered,
}: OrderCardProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);

  const urgency = getUrgency(order.created_at, nowMs);
  const urgencyMeta = URGENCY_META[urgency];
  const statusMeta = STATUS_META[order.status];

  const identifier =
    order.customer_name?.trim() ||
    (order.order_number ? `Pedido ${order.order_number}` : null) ||
    "Pedido";

  const allItems = order.items ?? [];
  const items = allItems.filter((item) => !item.cancelled);
  const cancelledCount = allItems.length - items.length;

  return (
    <article
      className={[
        "group relative flex flex-col overflow-hidden rounded-lg border bg-background-50 animate-fade-up",
        urgencyMeta.card,
      ].join(" ")}
    >
      <span className={`h-1.5 w-full ${urgencyMeta.bar}`} />

      <header className="flex items-start justify-between gap-3 px-4 pb-3 pt-3.5">
        <div className="min-w-0">
          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-foreground-500">
            Cliente
          </p>
          <h4 className="mt-0.5 truncate font-heading text-lg font-medium leading-tight text-foreground-950">
            {identifier}
          </h4>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-500">
            <span>Recebido às {formatOrderTime(order.created_at)}</span>
            {order.source === "simulator" && (
              <span className="rounded-full bg-accent-100 px-2 py-0.5 font-label text-[9px] uppercase tracking-wider text-accent-900">
                teste
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {order.create_comanda && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2.5 py-0.5 font-label text-[10px] uppercase tracking-wider text-secondary-900">
              <i className="ri-restaurant-2-line text-xs" />
              comanda
            </span>
          )}
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
          {items.map((item) => {
            const isImmediate = item.requires_preparation === false;
            const confirming = confirmItemId === item.id;
            return (
              <li
                key={item.id}
                className="rounded-md border border-background-200/70 bg-background-50 p-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={[
                      "numeric shrink-0 rounded-md px-2 py-0.5 text-sm font-bold leading-6",
                      item.delivered
                        ? "bg-background-200 text-foreground-500"
                        : "bg-primary-100 text-primary-700",
                    ].join(" ")}
                  >
                    {item.quantity}x
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        "text-sm font-medium leading-6",
                        item.delivered
                          ? "text-foreground-400 line-through"
                          : "text-foreground-950",
                      ].join(" ")}
                    >
                      {item.product_name}
                    </p>
                    {item.notes && (
                      <p className="mt-0.5 flex items-start gap-1 text-xs leading-snug text-accent-800">
                        <i className="ri-speak-line mt-0.5 text-sm" />
                        <span>{item.notes}</span>
                      </p>
                    )}
                    {isImmediate && !item.delivered && (
                      <span className="mt-0.5 inline-flex items-center gap-1 font-label text-[10px] uppercase tracking-wider text-secondary-800">
                        <i className="ri-flashlight-line" />
                        entrega imediata
                      </span>
                    )}
                  </div>
                  <span className="numeric shrink-0 text-xs leading-6 text-foreground-500">
                    {currency.format(Number(item.unit_price) * item.quantity)}
                  </span>
                </div>

                {confirming ? (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmItemId(null);
                        onCancelItem(order, item.id);
                      }}
                      disabled={busy}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-background-50 transition-colors hover:bg-primary-700 disabled:opacity-60"
                    >
                      <i className="ri-close-circle-line" />
                      Cancelar item e devolver ao estoque
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmItemId(null)}
                      className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-3 py-1.5 text-xs text-foreground-600 transition-colors hover:bg-background-100"
                    >
                      Voltar
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {isImmediate && (
                      <button
                        type="button"
                        onClick={() => onToggleDelivered(item.id, !item.delivered)}
                        className={[
                          "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          item.delivered
                            ? "border-background-300 bg-background-100 text-foreground-600 hover:bg-background-200"
                            : "border-secondary-300 bg-secondary-100 text-secondary-900 hover:bg-secondary-200",
                        ].join(" ")}
                      >
                        <i
                          className={
                            item.delivered
                              ? "ri-arrow-go-back-line text-sm"
                              : "ri-checkbox-circle-line text-sm"
                          }
                        />
                        {item.delivered ? "Desfazer" : "Entregue"}
                      </button>
                    )}
                    {!item.delivered && (
                      <button
                        type="button"
                        onClick={() => setConfirmItemId(item.id)}
                        disabled={busy}
                        title="Cancelar item"
                        aria-label="Cancelar item"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-background-300 text-foreground-500 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
                      >
                        <i className="ri-close-line text-sm" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}

          {items.length === 0 && (
            <li className="text-xs text-foreground-500">
              Nenhum item ativo neste pedido.
            </li>
          )}
        </ul>

        {cancelledCount > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-foreground-400">
            <i className="ri-information-line" />
            {cancelledCount} item{cancelledCount === 1 ? "" : "s"} cancelado
            {cancelledCount === 1 ? "" : "s"}
          </p>
        )}

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
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-background-300 text-foreground-500 transition-all hover:border-primary-300 hover:text-primary-600 disabled:opacity-60 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            >
              <i className="ri-delete-bin-6-line text-lg" />
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}