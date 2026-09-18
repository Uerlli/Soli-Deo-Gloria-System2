import { useEffect, useMemo, useState } from "react";
import ComandaCard from "@/pages/comandas/components/ComandaCard";
import ComandaDetailDrawer from "@/pages/comandas/components/ComandaDetailDrawer";
import { buildComandas, currency, type Comanda } from "@/pages/comandas/utils";
import { useKdsOrders, type KdsConnection } from "@/hooks/useKdsOrders";
import type { PaymentMethod } from "@/types";

const CONNECTION_META: Record<
  KdsConnection,
  { label: string; icon: string; className: string }
> = {
  live: {
    label: "Conectado ao vivo",
    icon: "ri-live-line",
    className: "bg-secondary-100 text-secondary-900",
  },
  reconnecting: {
    label: "Reconectando…",
    icon: "ri-refresh-line",
    className: "bg-accent-100 text-accent-900",
  },
  connecting: {
    label: "Conectando…",
    icon: "ri-loader-4-line animate-spin",
    className: "bg-background-200 text-foreground-600",
  },
};

export default function ComandasPage() {
  const { orders, loading, error, connection, refetch, finalizeOrders, cancelOrder } =
    useKdsOrders();

  const [selected, setSelected] = useState<Comanda | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(
    null
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const comandas = useMemo(() => buildComandas(orders), [orders]);

  // Mantém a gaveta sincronizada quando o pedido é atualizado ao vivo.
  useEffect(() => {
    if (!selected) return;
    const fresh = comandas.find((comanda) => comanda.key === selected.key) ?? null;
    setSelected(fresh);
  }, [comandas]);

  const openTotal = useMemo(
    () => comandas.reduce((sum, comanda) => sum + comanda.total, 0),
    [comandas]
  );

  const handleFinalize = async (method: PaymentMethod) => {
    if (!selected) return;
    setBusy(true);
    const { error: finalizeError } = await finalizeOrders(
      selected.orders.map((order) => order.id),
      method
    );
    setBusy(false);
    if (finalizeError) {
      setToast({ text: finalizeError, tone: "error" });
      return;
    }
    setSelected(null);
    setToast({ text: "Comanda finalizada e pagamento registrado.", tone: "success" });
  };

  const handleCancelComanda = async () => {
    if (!selected) return;
    setBusy(true);
    let failure: string | null = null;
    for (const order of selected.orders) {
      const { error: cancelError } = await cancelOrder(order.id);
      if (cancelError) failure = cancelError;
    }
    setBusy(false);
    if (failure) {
      setToast({ text: failure, tone: "error" });
      return;
    }
    setSelected(null);
    setToast({ text: "Comanda cancelada e estoque devolvido.", tone: "success" });
  };

  const connectionMeta = CONNECTION_META[connection];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-background-300/60 bg-background-50 px-5 py-5 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-800">
              <i className="ri-restaurant-2-line text-2xl" />
            </span>
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-primary-600">
                Consumo no salão
              </p>
              <h1 className="mt-0.5 font-heading text-2xl font-medium text-foreground-950">
                Comandas
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-500">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label text-[10px] uppercase tracking-wider ${connectionMeta.className}`}
                >
                  <i className={`${connectionMeta.icon} text-sm`} />
                  {connectionMeta.label}
                </span>
                Pedidos agrupados por mesa, com total acumulado
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-background-300/70 bg-background-50 px-4 py-2.5">
              <p className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Comandas abertas
              </p>
              <p className="numeric text-lg font-semibold text-foreground-950">
                {comandas.length}
              </p>
            </div>
            <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
              <p className="font-label text-[10px] uppercase tracking-wider text-primary-700">
                Em aberto
              </p>
              <p className="numeric text-lg font-semibold text-primary-800">
                {currency.format(openTotal)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 md:px-8">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-2xl" />
            <p className="text-sm">Carregando comandas…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-6 py-10 text-center">
            <i className="ri-plug-line text-2xl text-primary-700" />
            <p className="text-sm text-primary-800">{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-1 cursor-pointer whitespace-nowrap rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && comandas.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-background-300 px-6 py-16 text-center">
            <i className="ri-inbox-line text-3xl text-foreground-300" />
            <p className="font-heading text-lg text-foreground-800">
              Nenhuma comanda aberta
            </p>
            <p className="text-sm text-foreground-500">
              Assim que um pedido for lançado no PDV ou pela Moderninha, a mesa aparece aqui.
            </p>
          </div>
        )}

        {!loading && !error && comandas.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {comandas.map((comanda) => (
              <ComandaCard key={comanda.key} comanda={comanda} onOpen={setSelected} />
            ))}
          </div>
        )}

        <p className="mt-8 flex items-start gap-2 text-xs text-foreground-500">
          <i className="ri-information-line mt-0.5 text-base" />
          <span>
            Várias rodadas da mesma mesa entram na mesma comanda e o total é somado. Ao
            finalizar, escolha a forma de pagamento para fechar o caixa do dia.
          </span>
        </p>
      </div>

      <ComandaDetailDrawer
        open={selected !== null}
        comanda={selected}
        busy={busy}
        onClose={() => setSelected(null)}
        onFinalize={(method) => void handleFinalize(method)}
        onCancelComanda={() => void handleCancelComanda()}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[60] animate-fade-up">
          <div
            className={[
              "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-background-50",
              toast.tone === "success" ? "bg-secondary-600" : "bg-primary-600",
            ].join(" ")}
          >
            <i
              className={
                toast.tone === "success"
                  ? "ri-checkbox-circle-line text-lg"
                  : "ri-error-warning-line text-lg"
              }
            />
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}