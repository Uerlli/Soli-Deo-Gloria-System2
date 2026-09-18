import { useEffect, useMemo, useRef, useState } from "react";
import OrderCard from "@/pages/balcao/components/OrderCard";
import SimulateOrderModal from "@/pages/balcao/components/SimulateOrderModal";
import PaymentPromptModal from "@/pages/balcao/components/PaymentPromptModal";
import { useKdsOrders, type KdsConnection } from "@/hooks/useKdsOrders";
import { useKitchenSound } from "@/hooks/useKitchenSound";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_META } from "@/pages/balcao/utils";
import type { Order, OrderStatus, PaymentMethod } from "@/types";

interface ColumnDef {
  status: OrderStatus;
  title: string;
  hint: string;
  dot: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: "PENDING",
    title: "Aguardando",
    hint: "Novos pedidos da maquininha",
    dot: "bg-accent-500",
  },
  {
    status: "PREPARING",
    title: "Em preparo",
    hint: "Sendo produzidos agora",
    dot: "bg-primary-500",
  },
  {
    status: "READY",
    title: "Prontos para entrega",
    hint: "Aguardando retirada no balcão",
    dot: "bg-secondary-500",
  },
];

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

export default function BalcaoPage() {
  const { isAdmin } = useAuth();
  const {
    orders,
    loading,
    error,
    connection,
    deliveredToday,
    newOrderSignal,
    refetch,
    updateOrderStatus,
    cancelOrder,
    cancelOrderItem,
    setItemDelivered,
  } = useKdsOrders();

  const { enabled, enable, disable, playChime } = useKitchenSound();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(
    null
  );

  const enabledRef = useRef(false);
  const firstSignal = useRef(true);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (firstSignal.current) {
      firstSignal.current = false;
      return;
    }
    if (enabledRef.current) {
      playChime();
    }
  }, [newOrderSignal, playChime]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const columnsWithOrders = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        orders: orders.filter((order) => order.status === column.status),
      })),
    [orders]
  );

  const counts = useMemo(() => {
    const base = { PENDING: 0, PREPARING: 0, READY: 0 };
    orders.forEach((order) => {
      if (order.status === "PENDING") base.PENDING += 1;
      else if (order.status === "PREPARING") base.PREPARING += 1;
      else if (order.status === "READY") base.READY += 1;
    });
    return base;
  }, [orders]);

  const handleAdvance = async (order: Order) => {
    const next = STATUS_META[order.status].next;
    if (!next) return;
    // A entrega exige a forma de pagamento antes de concluir o pedido.
    if (next === "DELIVERED") {
      setPaymentOrder(order);
      return;
    }
    setBusyId(order.id);
    const { error: updateError } = await updateOrderStatus(order.id, next);
    setBusyId(null);
    if (updateError) {
      setToast({ text: updateError, tone: "error" });
    }
  };

  const handleConfirmPayment = async (method: PaymentMethod) => {
    if (!paymentOrder) return;
    setPaymentBusy(true);
    const { error: updateError } = await updateOrderStatus(
      paymentOrder.id,
      "DELIVERED",
      method
    );
    setPaymentBusy(false);
    if (updateError) {
      setToast({ text: updateError, tone: "error" });
      return;
    }
    setPaymentOrder(null);
    setToast({ text: "Pedido entregue e pagamento registrado.", tone: "success" });
  };

  const handleCancel = async (order: Order) => {
    setBusyId(order.id);
    const { error: cancelError } = await cancelOrder(order.id);
    setBusyId(null);
    setToast(
      cancelError
        ? { text: cancelError, tone: "error" }
        : { text: "Pedido cancelado e estoque devolvido.", tone: "success" }
    );
  };

  const handleCancelItem = async (order: Order, itemId: string) => {
    setBusyId(order.id);
    const { error: cancelError } = await cancelOrderItem(order.id, itemId);
    setBusyId(null);
    setToast(
      cancelError
        ? { text: cancelError, tone: "error" }
        : { text: "Item cancelado e devolvido ao estoque.", tone: "success" }
    );
  };

  const handleToggleDelivered = async (itemId: string, delivered: boolean) => {
    const { error: deliverError } = await setItemDelivered(itemId, delivered);
    if (deliverError) {
      setToast({ text: deliverError, tone: "error" });
    }
  };

  const toggleSound = () => {
    if (enabled) {
      disable();
      setToast({ text: "Alertas sonoros desativados.", tone: "success" });
    } else {
      void enable();
      setToast({ text: "Alertas sonoros ativados.", tone: "success" });
    }
  };

  const connectionMeta = CONNECTION_META[connection];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-background-300/60 bg-background-50 px-5 py-5 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <i className="ri-fire-line text-2xl" />
            </span>
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-primary-600">
                Central de preparo
              </p>
              <h1 className="mt-0.5 font-heading text-2xl font-medium text-foreground-950">
                Balcão de Preparo
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-foreground-500">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label text-[10px] uppercase tracking-wider ${connectionMeta.className}`}
                >
                  <i className={`${connectionMeta.icon} text-sm`} />
                  {connectionMeta.label}
                </span>
                Pedidos da Moderninha Smart 2 em tempo real
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className={[
                "flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-3.5 py-2.5 text-sm font-medium transition-colors",
                enabled
                  ? "border-secondary-300 bg-secondary-100 text-secondary-900 hover:bg-secondary-200"
                  : "border-background-300 bg-background-50 text-foreground-600 hover:bg-background-100",
              ].join(" ")}
            >
              <i
                className={enabled ? "ri-volume-up-line text-lg" : "ri-volume-mute-line text-lg"}
              />
              {enabled ? "Som ativado" : "Ativar som"}
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setSimulateOpen(true)}
                className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-accent-300 bg-accent-50 px-4 py-2.5 text-sm font-medium text-accent-900 transition-colors hover:bg-accent-100"
              >
                <i className="ri-flask-line text-lg" />
                Simular pedido da maquininha
                <span className="rounded-full bg-accent-200 px-2 py-0.5 font-label text-[9px] uppercase tracking-wider text-accent-900">
                  teste
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CounterCard
            label="Aguardando"
            value={counts.PENDING}
            icon="ri-time-line"
            tone="accent"
          />
          <CounterCard
            label="Em preparo"
            value={counts.PREPARING}
            icon="ri-fire-line"
            tone="primary"
          />
          <CounterCard
            label="Prontos"
            value={counts.READY}
            icon="ri-checkbox-circle-line"
            tone="secondary"
          />
          <CounterCard
            label="Entregues hoje"
            value={deliveredToday}
            icon="ri-hand-coin-line"
            tone="neutral"
          />
        </div>
      </header>

      <div className="flex-1 px-5 py-6 md:px-8">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-2xl" />
            <p className="text-sm">Carregando a fila de preparo…</p>
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

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {columnsWithOrders.map((column) => (
              <section
                key={column.status}
                className="flex flex-col rounded-lg border border-background-300/60 bg-background-200/40"
              >
                <header className="flex items-center justify-between gap-2 border-b border-background-300/60 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                    <div>
                      <h2 className="font-heading text-base font-medium text-foreground-950">
                        {column.title}
                      </h2>
                      <p className="text-[11px] text-foreground-500">{column.hint}</p>
                    </div>
                  </div>
                  <span className="numeric rounded-full bg-background-50 px-2.5 py-1 text-sm font-semibold text-foreground-800">
                    {column.orders.length}
                  </span>
                </header>

                <div className="flex flex-col gap-3 p-3">
                  {column.orders.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-background-300 px-4 py-10 text-center">
                      <i className="ri-inbox-line text-2xl text-foreground-300" />
                      <p className="text-xs text-foreground-500">
                        Nenhum pedido nesta etapa.
                      </p>
                    </div>
                  )}

                  {column.orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      nowMs={nowMs}
                      busy={busyId === order.id}
                      onAdvance={(target) => void handleAdvance(target)}
                      onCancel={(target) => void handleCancel(target)}
                      onCancelItem={(target, itemId) => void handleCancelItem(target, itemId)}
                      onToggleDelivered={(itemId, delivered) =>
                        void handleToggleDelivered(itemId, delivered)
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 flex items-start gap-2 text-xs text-foreground-500">
          <i className="ri-information-line mt-0.5 text-base" />
          <span>
            A fila é alimentada automaticamente quando a Moderninha Smart 2 finaliza uma
            conta. Pedidos com apenas itens de entrega imediata já entram em “Prontos para
            entrega”. Itens com botão “Entregue” podem ser liberados direto no caixa.
          </span>
        </p>
      </div>

      <SimulateOrderModal
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        onDispatched={(message) => setToast({ text: message, tone: "success" })}
      />

      <PaymentPromptModal
        open={paymentOrder !== null}
        order={paymentOrder}
        busy={paymentBusy}
        onClose={() => setPaymentOrder(null)}
        onConfirm={(method) => void handleConfirmPayment(method)}
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

function CounterCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "accent" | "primary" | "secondary" | "neutral";
}) {
  const tones = {
    accent: "border-accent-200 bg-accent-50 text-accent-900",
    primary: "border-primary-200 bg-primary-50 text-primary-900",
    secondary: "border-secondary-200 bg-secondary-50 text-secondary-900",
    neutral: "border-background-300/70 bg-background-50 text-foreground-800",
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${tones[tone]}`}>
      <i className={`${icon} text-xl`} />
      <div>
        <p className="font-label text-[10px] uppercase tracking-wider opacity-80">
          {label}
        </p>
        <p className="numeric text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}