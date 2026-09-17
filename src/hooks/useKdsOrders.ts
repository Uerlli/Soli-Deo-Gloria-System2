import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/types";

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PREPARING",
  "READY",
];

export type KdsConnection = "connecting" | "live" | "reconnecting";

const ORDER_SELECT =
  "id, external_id, order_number, table_identifier, customer_name, status, total_amount, notes, source, created_at, updated_at, items:order_items(id, order_id, product_id, product_name, quantity, unit_price, notes, created_at)";

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
    status: OrderStatus
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
    async (orderId: string, status: OrderStatus) => {
      const snapshot = orders;
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status } : order))
      );

      try {
        const { error: updateError } = await supabase
          .from("orders")
          .update({ status, updated_at: new Date().toISOString() })
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

  return {
    orders,
    loading,
    error,
    connection,
    deliveredToday,
    newOrderSignal,
    refetch: refresh,
    updateOrderStatus,
  };
}