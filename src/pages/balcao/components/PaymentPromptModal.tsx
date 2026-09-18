import { useEffect, useState } from "react";
import type { Order, PaymentMethod } from "@/types";
import { currency } from "@/pages/balcao/utils";

interface PaymentPromptModalProps {
  open: boolean;
  order: Order | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}

const METHODS: { value: PaymentMethod; label: string; icon: string; hint: string }[] = [
  { value: "cash", label: "Dinheiro", icon: "ri-money-dollar-circle-line", hint: "Espécie" },
  { value: "pix", label: "Pix", icon: "ri-qr-code-line", hint: "Transferência" },
  { value: "card", label: "Cartão", icon: "ri-bank-card-line", hint: "Crédito / débito" },
];

export default function PaymentPromptModal({
  open,
  order,
  busy,
  onClose,
  onConfirm,
}: PaymentPromptModalProps) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (open) setMethod(null);
  }, [open]);

  if (!open || !order) return null;

  const identifier =
    order.table_identifier?.trim() ||
    (order.order_number ? `Comanda ${order.order_number}` : null) ||
    order.customer_name ||
    "Pedido";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-foreground-950/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-t-lg bg-background-50 sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-background-300/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-800">
              <i className="ri-hand-coin-line text-xl" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-medium leading-tight text-foreground-950">
                Como o cliente pagou?
              </h2>
              <p className="mt-0.5 text-xs text-foreground-500">
                {identifier} · total {currency.format(Number(order.total_amount))}
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

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((option) => {
              const active = method === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMethod(option.value)}
                  className={[
                    "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-3 transition-colors",
                    active
                      ? "border-primary-400 bg-primary-50"
                      : "border-background-300 bg-background-50 hover:bg-background-100",
                  ].join(" ")}
                >
                  <i
                    className={`${option.icon} text-2xl ${
                      active ? "text-primary-600" : "text-foreground-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground-900">
                    {option.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-foreground-400">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-4 py-2.5 text-sm text-foreground-600 transition-colors hover:bg-background-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => method && onConfirm(method)}
              disabled={busy || !method}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <i className="ri-loader-4-line animate-spin text-base" />
              ) : (
                <i className="ri-check-double-line text-base" />
              )}
              Confirmar entrega
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}