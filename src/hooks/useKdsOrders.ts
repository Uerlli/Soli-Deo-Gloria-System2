import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus, PaymentMethod } from "@/types";

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
];

export type KdsConnection = "connecting" | "live" | "reconnecting";

const ORDER_SELECT =
  "id, external_id, order_number, table_identifier, customer_name, status, total_amount, notes, source, payment_method, create_comanda, created_at, updated_at, items:order_items(id, order_id, product_id, product_name, quantity, unit_price, notes, delivered, cancelled, requires_preparation, created_at)";

interface UseKdsOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  connection: KdsConnection;
  deliveredToday: number;
  /** Incrementa a cada novo pedido recebido ao vivo (dispara o som). */
  newOrderSignal: number;
  refetch: () => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    paymentMethod?: PaymentMethod | null
  ) => Promise<{ error: string | null }>;
  cancelOrder: (orderId: string) => Promise<{ error: string | null }>;
  cancelOrderItem: (
    orderId: string,
    itemId: string
  ) => Promise<{ error: string | null }>;
  setItemDelivered: (
    itemId: string,
    delivered: boolean
  ) => Promise<{ error: string | null }>;
  finalizeOrders: (
    orderIds: string[],
    paymentMethod: PaymentMethod
  ) => Promise<{ error: string | null }>;
}

export function useKdsOrders(): UseKdsOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<KdsConnection>("connecting");
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [newOrderSignal, setNewOrderSignal] = useState(0);

  const debounceRef = useRef<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .in("status", ACTIVE_ORDER_STATUSES)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError("Não foi possível carregar os pedidos.");
        return;
      }
      setOrders((data as unknown as Order[]) ?? []);
    } catch {
      setError("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeliveredToday = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    try {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "DELIVERED")
        .gte("created_at", start.toISOString());
      setDeliveredToday(count ?? 0);
    } catch {
      // Silencioso: contador auxiliar não deve travar a tela.
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchDeliveredToday()]);
  }, [fetchOrders, fetchDeliveredToday]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void refresh();
    }, 350);
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Canal em tempo real: escuta pedidos e itens, com reconexão automática.
  useEffect(() => {
    const channel = supabase
      .channel("kds-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          setNewOrderSignal((value) => value + 1);
          scheduleRefetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => scheduleRefetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => scheduleRefetch()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnection("live");
          void refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("reconnecting");
        } else if (status === "CLOSED") {
          setConnection("reconnecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, scheduleRefetch]);

  // Rede de segurança: re-sincroniza periodicamente caso algum evento se perca.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      paymentMethod?: PaymentMethod | null
    ) => {
      const snapshot = orders;
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status, payment_method: paymentMethod ?? order.payment_method }
            : order
        )
      );

      const patch: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (paymentMethod) {
        patch.payment_method = paymentMethod;
      }

      try {
        const { error: updateError } = await supabase
          .from("orders")
          .update(patch)
          .eq("id", orderId);

        if (updateError) {
          setOrders(snapshot);
          return { error: "Não foi possível atualizar o pedido." };
        }

        if (status === "DELIVERED" || status === "CANCELLED") {
          setOrders((prev) => prev.filter((order) => order.id !== orderId));
          void refresh();
        }
        return { error: null };
      } catch {
        setOrders(snapshot);
        return { error: "Não foi possível atualizar o pedido." };
      }
    },
    [orders, refresh]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const snapshot = orders;
      setOrders((prev) => prev.filter((order) => order.id !== orderId));

      try {
        const { error: rpcError } = await supabase.rpc("cancel_order", {
          p_order_id: orderId,
        });

        if (rpcError) {
          setOrders(snapshot);
          if (rpcError.message?.includes("cannot be cancelled")) {
            return { error: "Este pedido não pode mais ser cancelado." };
          }
          if (rpcError.message?.includes("not authorized")) {
            return { error: "Sua sessão não tem permissão para cancelar pedidos." };
          }
          return { error: "Não foi possível cancelar o pedido." };
        }

        void refresh();
        return { error: null };
      } catch {
        setOrders(snapshot);
        return { error: "Não foi possível cancelar o pedido." };
      }
    },
    [orders, refresh]
  );

  const cancelOrderItem = useCallback(
    async (orderId: string, itemId: string) => {
      try {
        const { data, error: rpcError } = await supabase.rpc("cancel_order_item", {
          p_order_id: orderId,
          p_item_id: itemId,
        });

        if (rpcError) {
          if (rpcError.message?.includes("already delivered")) {
            return { error: "Este item já foi entregue e não volta ao estoque." };
          }
          if (rpcError.message?.includes("cannot be cancelled")) {
            return { error: "Este pedido não pode mais ser alterado." };
          }
          if (rpcError.message?.includes("not authorized")) {
            return { error: "Sua sessão não tem permissão para cancelar itens." };
          }
          return { error: "Não foi possível cancelar o item." };
        }

        const newStatus = (data as { order_status?: string } | null)?.order_status;
        if (newStatus === "CANCELLED" || newStatus === "DELIVERED") {
          setOrders((prev) => prev.filter((order) => order.id !== orderId));
        }
        void refresh();
        return { error: null };
      } catch {
        return { error: "Não foi possível cancelar o item." };
      }
    },
    [refresh]
  );

  const setItemDelivered = useCallback(
    async (itemId: string, delivered: boolean) => {
      const snapshot = orders;
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: (order.items ?? []).map((item) =>
            item.id === itemId ? { ...item, delivered } : item
          ),
        }))
      );

      try {
        const { error: rpcError } = await supabase.rpc("set_order_item_delivered", {
          p_item_id: itemId,
          p_delivered: delivered,
        });

        if (rpcError) {
          setOrders(snapshot);
          return { error: "Não foi possível atualizar o item." };
        }
        return { error: null };
      } catch {
        setOrders(snapshot);
        return { error: "Não foi possível atualizar o item." };
      }
    },
    [orders]
  );

  const finalizeOrders = useCallback(
    async (orderIds: string[], paymentMethod: PaymentMethod) => {
      if (orderIds.length === 0) {
        return { error: null };
      }
      const snapshot = orders;
      const idSet = new Set(orderIds);
      setOrders((prev) => prev.filter((order) => !idSet.has(order.id)));

      try {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            status: "DELIVERED",
            payment_method: paymentMethod,
            updated_at: new Date().toISOString(),
          })
          .in("id", orderIds);

        if (updateError) {
          setOrders(snapshot);
          return { error: "Não foi possível finalizar a comanda." };
        }

        void refresh();
        return { error: null };
      } catch {
        setOrders(snapshot);
        return { error: "Não foi possível finalizar a comanda." };
      }
    },
    [orders, refresh]
  );

  return {
    orders,
    loading,
    error,
    connection,
    deliveredToday,
    newOrderSignal,
    refetch: refresh,
    updateOrderStatus,
    cancelOrder,
    cancelOrderItem,
    setItemDelivered,
    finalizeOrders,
  };
}