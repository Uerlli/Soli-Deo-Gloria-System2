import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";

export type StockStatus = "out" | "low" | "ok";

export function getStockStatus(product: Product): StockStatus {
  if (Number(product.current_stock) <= 0) return "out";
  if (Number(product.current_stock) <= Number(product.minimum_stock)) return "low";
  return "ok";
}

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("products_catalog")
        .select(
          "id, name, category, unit, current_stock, minimum_stock, price, active, created_at, updated_at"
        )
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (fetchError) {
        setError("Não foi possível carregar os produtos.");
        return;
      }
      setProducts((data as Product[]) ?? []);
    } catch {
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ["Todos", ...unique];
  }, [products]);

  const summary = useMemo(() => {
    let available = 0;
    let low = 0;
    let out = 0;
    products.forEach((product) => {
      const status = getStockStatus(product);
      if (status === "ok") available += 1;
      else if (status === "low") low += 1;
      else out += 1;
    });
    return { total: products.length, available, low, out };
  }, [products]);

  return {
    products,
    categories,
    summary,
    loading,
    error,
    refetch: fetchProducts,
  };
}