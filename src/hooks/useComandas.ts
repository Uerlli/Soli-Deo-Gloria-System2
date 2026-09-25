import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, PaymentMethod } from "@/types";
import { COMANDA_ORDER_SELECT } from "@/pages/comandas/utils";
import type { KdsConnection } from "@/hooks/useKdsOrders";

interface UseComandasResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  connection: KdsConnection;
  refetch: () => Promise<void>;
  finalizeOrders: (
    orderIds: string[],
    paymentMethod: PaymentMethod
  ) => Promise<{ error: string | null }>;
  cancelOrder: (orderId: string) => Promise<{ error: string | null }>;
}

/**
 * Comandas abertas.
 *
 * Uma comanda permanece aberta enquanto tiver algum pedido não finalizado —
 * inclusive os já entregues individualmente no balcão. Ela só sai da lista
 * quando o pagamento é registrado ("Finalizar pedido"), ou seja, quando
 * `payment_method` deixa de ser nulo. Pedidos cancelados não entram.
 */
export function useComandas(): UseComandasResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<KdsConnection>("connecting");

  const debounceRef = useRef<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(COMANDA_ORDER_SELECT)
        .eq("create_comanda", true)
        .neq("status", "CANCELLED")
        .is("payment_method", null)
        .not("customer_name", "is", null)
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError("Não foi possível carregar as comandas.");
        return;
      }
      setOrders((data as unknown as Order[]) ?? []);
    } catch {
      setError("Não foi possível carregar as comandas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void fetchOrders();
    }, 350);
  }, [fetchOrders]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("comandas-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        scheduleRefetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => scheduleRefetch()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnection("live");
          void fetchOrders();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnection("reconnecting");
        } else if (status === "CLOSED") {
          setConnection("reconnecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, scheduleRefetch]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchOrders();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [fetchOrders]);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    []
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

        void fetchOrders();
        return { error: null };
      } catch {
        setOrders(snapshot);
        return { error: "Não foi possível finalizar a comanda." };
      }
    },
    [orders, fetchOrders]
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

        void fetchOrders();
        return { error: null };
      } catch {
        setOrders(snapshot);
        return { error: "Não foi possível cancelar o pedido." };
      }
    },
    [orders, fetchOrders]
  );

  return {
    orders,
    loading,
    error,
    connection,
    refetch: fetchOrders,
    finalizeOrders,
    cancelOrder,
  };
}