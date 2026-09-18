import { useEffect, useState } from "react";
import type { PaymentMethod } from "@/types";
import type { Comanda } from "@/pages/comandas/utils";
import { COMANDA_STATUS_META, currency, formatClock } from "@/pages/comandas/utils";

interface ComandaDetailDrawerProps {
  open: boolean;
  comanda: Comanda | null;
  busy: boolean;
  onClose: () => void;
  onFinalize: (method: PaymentMethod) => void;
  onCancelComanda: () => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "cash", label: "Dinheiro", icon: "ri-money-dollar-circle-line" },
  { value: "pix", label: "Pix", icon: "ri-qr-code-line" },
  { value: "card", label: "Cartão", icon: "ri-bank-card-line" },
];

export default function ComandaDetailDrawer({
  open,
  comanda,
  busy,
  onClose,
  onFinalize,
  onCancelComanda,
}: ComandaDetailDrawerProps) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    if (open) {
      setMethod(null);
      setConfirmingCancel(false);
    }
  }, [open, comanda?.key]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !comanda) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground-950/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col animate-slide-left border-l border-background-300/60 bg-background-50">
        <header className="flex items-start justify-between gap-3 border-b border-background-300/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-800">
              <i className="ri-restaurant-2-line text-xl" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-medium leading-tight text-foreground-950">
                {comanda.label}
              </h2>
              <p className="mt-0.5 text-xs text-foreground-500">
                {comanda.orders.length} pedido{comanda.orders.length === 1 ? "" : "s"} ·{" "}
                {comanda.itemCount} item{comanda.itemCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground-500 transition-colors hover:bg-background-200 hover:text-foreground-800"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 scroll-thin">
          {comanda.orders.map((order) => {
            const meta = COMANDA_STATUS_META[order.status];
            return (
              <div
                key={order.id}
                className="rounded-lg border border-background-300/60 bg-background-50 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground-900">
                    <i className="ri-time-line text-base text-foreground-400" />
                    Rodada das {formatClock(order.created_at)}
                  </span>
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 font-label text-[10px] uppercase tracking-wider ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <ul className="mt-2.5 space-y-1.5">
                  {(order.items ?? []).map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <span className="numeric shrink-0 rounded bg-primary-100 px-1.5 text-xs font-bold leading-5 text-primary-700">
                        {item.quantity}x
                      </span>
                      <span className="flex-1 text-foreground-800">{item.product_name}</span>
                      <span className="numeric text-xs text-foreground-500">
                        {currency.format(Number(item.unit_price) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2.5 flex items-center justify-between border-t border-background-200/70 pt-2.5">
                  <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                    Subtotal
                  </span>
                  <span className="numeric text-sm font-semibold text-foreground-900">
                    {currency.format(Number(order.total_amount))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="space-y-3 border-t border-background-300/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Total da comanda
            </span>
            <span className="numeric font-heading text-xl font-semibold text-foreground-950">
              {currency.format(comanda.total)}
            </span>
          </div>

          <div>
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Forma de pagamento
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {METHODS.map((option) => {
                const active = method === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMethod(option.value)}
                    className={[
                      "flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-colors",
                      active
                        ? "border-primary-400 bg-primary-50"
                        : "border-background-300 bg-background-50 hover:bg-background-100",
                    ].join(" ")}
                  >
                    <i
                      className={`${option.icon} text-xl ${
                        active ? "text-primary-600" : "text-foreground-500"
                      }`}
                    />
                    <span className="text-xs font-medium text-foreground-900">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {confirmingCancel ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelComanda}
                disabled={busy}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                <i className="ri-close-circle-line" />
                Confirmar cancelamento
              </button>
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-4 py-2.5 text-sm text-foreground-600 transition-colors hover:bg-background-100"
              >
                Voltar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                title="Cancelar comanda"
                aria-label="Cancelar comanda"
                disabled={busy}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-background-300 text-foreground-500 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
              >
                <i className="ri-delete-bin-6-line text-lg" />
              </button>
              <button
                type="button"
                onClick={() => method && onFinalize(method)}
                disabled={busy || !method}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <i className="ri-loader-4-line animate-spin text-base" />
                ) : (
                  <i className="ri-check-double-line text-base" />
                )}
                Finalizar pedido
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}