import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getStockStatus, type StockStatus } from "@/hooks/useCatalog";
import type {
  InventoryConnection,
  InventoryProduct,
  NewProductInput,
  ProductSettingsInput,
  StockAlert,
  StockMovement,
  StockMovementInput,
} from "@/types/inventory";

const PRODUCT_COLUMNS_ADMIN =
  "id, name, category, unit, current_stock, minimum_stock, unit_cost, price, active, requires_preparation, created_at, updated_at";
const PRODUCT_COLUMNS_CATALOG =
  "id, name, category, unit, current_stock, minimum_stock, price, active, requires_preparation, created_at, updated_at";

interface InventorySummary {
  total: number;
  available: number;
  low: number;
  out: number;
  valuation: number;
}

interface UseInventoryResult {
  products: InventoryProduct[];
  movements: StockMovement[];
  categories: string[];
  summary: InventorySummary;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  connection: InventoryConnection;
  alerts: StockAlert[];
  operators: Record<string, string>;
  refetch: () => Promise<void>;
  statusOf: (product: InventoryProduct) => StockStatus;
  registerMovement: (input: StockMovementInput) => Promise<{ error: string | null }>;
  updateSettings: (input: ProductSettingsInput) => Promise<{ error: string | null }>;
  createProduct: (input: NewProductInput) => Promise<{ error: string | null }>;
  deactivateProduct: (productId: string) => Promise<{ error: string | null }>;
  dismissAlert: (id: string) => void;
}

function mapMovementError(message: string | undefined): string {
  const raw = message ?? "";
  if (raw.includes("not authorized")) {
    return "Sua sessão não tem permissão para esta operação.";
  }
  if (raw.includes("would not change stock")) {
    return "A quantidade informada não altera o saldo atual.";
  }
  if (raw.includes("quantity must be")) {
    return "Informe uma quantidade válida (diferente de zero).";
  }
  if (raw.includes("product not found")) {
    return "Produto não encontrado no catálogo.";
  }
  return "Não foi possível registrar a movimentação. Tente novamente.";
}

export function useInventory(): UseInventoryResult {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [operators, setOperators] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<InventoryConnection>("connecting");
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  const pendingAlertsRef = useRef<{ productId: string; newStock: number }[]>([]);
  const debounceRef = useRef<number | null>(null);

  const fetchProducts = useCallback(async () => {
    setError(null);
    try {
      const table = isAdmin ? "products" : "products_catalog";
      const columns = isAdmin ? PRODUCT_COLUMNS_ADMIN : PRODUCT_COLUMNS_CATALOG;

      const { data, error: fetchError } = await supabase
        .from(table)
        .select(columns)
        .eq("active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) {
        setError("Não foi possível carregar o estoque.");
        return;
      }

      const list = (data ?? []).map((row) => {
        const record = row as Record<string, unknown>;
        return {
          id: String(record.id),
          name: String(record.name),
          category: String(record.category),
          unit: String(record.unit ?? "unidade"),
          current_stock: Number(record.current_stock ?? 0),
          minimum_stock: Number(record.minimum_stock ?? 0),
          price: Number(record.price ?? 0),
          unit_cost: isAdmin ? Number(record.unit_cost ?? 0) : 0,
          requires_preparation: Boolean(record.requires_preparation ?? true),
          active: Boolean(record.active ?? true),
          created_at: String(record.created_at ?? ""),
          updated_at: String(record.updated_at ?? ""),
        } satisfies InventoryProduct;
      });

      setProducts(list);

      // Resolve os alertas de venda pendentes usando o saldo já atualizado.
      const pending = pendingAlertsRef.current;
      if (pending.length > 0) {
        pendingAlertsRef.current = [];
        const raised: StockAlert[] = [];
        pending.forEach((item) => {
          const product = list.find((p) => p.id === item.productId);
          if (!product) return;
          const status = getStockStatus(product);
          if (status === "low" || status === "out") {
            raised.push({
              id: `${item.productId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
              productName: product.name,
              status,
            });
          }
        });
        if (raised.length > 0) {
          setAlerts((prev) => [...prev, ...raised]);
        }
      }
    } catch {
      setError("Não foi possível carregar o estoque.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchMovements = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);

      if (fetchError) return;
      setMovements((data as StockMovement[]) ?? []);
    } catch {
      // Silencioso: o extrato é complementar à tela principal.
    }
  }, []);

  const fetchOperators = useCallback(async () => {
    if (!isAdmin) {
      if (profile) {
        setOperators((prev) => ({ ...prev, [profile.id]: profile.name }));
      }
      return;
    }
    try {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, name");
      if (fetchError) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        const record = row as { id: string; name: string | null };
        map[record.id] = record.name ?? "Operador";
      });
      setOperators(map);
    } catch {
      // Silencioso.
    }
  }, [isAdmin, profile]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchMovements(), fetchOperators()]);
  }, [fetchProducts, fetchMovements, fetchOperators]);

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

  // Canal em tempo real: produtos alterados (admin) e extrato (todos os papéis).
  useEffect(() => {
    const channel = supabase
      .channel("inventory_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        () => scheduleRefetch()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stock_movements" },
        (payload) => {
          const row = payload.new as StockMovement;
          if (row?.movement_type === "SALE_DEDUCTION") {
            pendingAlertsRef.current.push({
              productId: row.product_id,
              newStock: Number(row.new_stock ?? 0),
            });
          }
          scheduleRefetch();
        }
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

  // Rede de segurança: re-sincroniza caso algum evento se perca.
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

  const registerMovement = useCallback(
    async (input: StockMovementInput) => {
      try {
        const { error: rpcError } = await supabase.rpc("register_stock_movement", {
          p_product_id: input.productId,
          p_type: input.type,
          p_quantity: input.quantity,
          p_reason: input.reason ?? null,
          p_notes: input.notes ?? null,
          p_unit_cost: input.unitCost ?? null,
        });

        if (rpcError) {
          return { error: mapMovementError(rpcError.message) };
        }
        await refresh();
        return { error: null };
      } catch {
        return { error: "Não foi possível registrar a movimentação." };
      }
    },
    [refresh]
  );

  const updateSettings = useCallback(
    async (input: ProductSettingsInput) => {
      try {
        const { error: rpcError } = await supabase.rpc("update_product_settings", {
          p_product_id: input.productId,
          p_minimum_stock: input.minimumStock ?? null,
          p_unit_cost: input.unitCost ?? null,
          p_price: input.price ?? null,
          p_requires_preparation: input.requiresPreparation ?? null,
        });

        if (rpcError) {
          return { error: mapMovementError(rpcError.message) };
        }
        await refresh();
        return { error: null };
      } catch {
        return { error: "Não foi possível salvar as configurações." };
      }
    },
    [refresh]
  );

  const createProduct = useCallback(
    async (input: NewProductInput) => {
      try {
        const { error: rpcError } = await supabase.rpc("create_product", {
          p_payload: {
            name: input.name,
            category: input.category,
            unit: input.unit,
            initial_stock: input.initialStock,
            unit_cost: input.unitCost,
            price: input.price,
            minimum_stock: input.minimumStock,
            requires_preparation: input.requiresPreparation,
          },
        });

        if (rpcError) {
          if (rpcError.message?.includes("not authorized")) {
            return { error: "Apenas administradores podem cadastrar produtos." };
          }
          if (rpcError.message?.includes("name is required")) {
            return { error: "Informe o nome do produto." };
          }
          return { error: "Não foi possível cadastrar o produto. Tente novamente." };
        }
        await refresh();
        return { error: null };
      } catch {
        return { error: "Não foi possível cadastrar o produto." };
      }
    },
    [refresh]
  );

  const deactivateProduct = useCallback(
    async (productId: string) => {
      try {
        const { error: rpcError } = await supabase.rpc("deactivate_product", {
          p_product_id: productId,
        });

        if (rpcError) {
          if (rpcError.message?.includes("not authorized")) {
            return { error: "Apenas administradores podem excluir produtos." };
          }
          if (rpcError.message?.includes("product not found")) {
            return { error: "Produto não encontrado no catálogo." };
          }
          return { error: "Não foi possível excluir o produto." };
        }
        await refresh();
        return { error: null };
      } catch {
        return { error: "Não foi possível excluir o produto." };
      }
    },
    [refresh]
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ["Todas", ...unique];
  }, [products]);

  const summary = useMemo<InventorySummary>(() => {
    let available = 0;
    let low = 0;
    let out = 0;
    let valuation = 0;
    products.forEach((product) => {
      const status = getStockStatus(product);
      if (status === "ok") available += 1;
      else if (status === "low") low += 1;
      else out += 1;
      valuation += Number(product.current_stock) * Number(product.unit_cost);
    });
    return {
      total: products.length,
      available,
      low,
      out,
      valuation,
    };
  }, [products]);

  const statusOf = useCallback(
    (product: InventoryProduct) => getStockStatus(product),
    []
  );

  return {
    products,
    movements,
    categories,
    summary,
    loading,
    error,
    isAdmin,
    connection,
    alerts,
    operators,
    refetch: refresh,
    statusOf,
    registerMovement,
    updateSettings,
    createProduct,
    deactivateProduct,
    dismissAlert,
  };
}