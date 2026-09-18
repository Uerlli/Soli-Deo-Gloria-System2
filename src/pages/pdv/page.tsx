import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BrandEmblem from "@/components/feature/BrandEmblem";
import OrderSystemModal from "@/pages/pdv/components/OrderSystemModal";
import {
  useCatalog,
  getStockStatus,
  type StockStatus,
} from "@/hooks/useCatalog";
import type { ComposerSeed } from "@/components/feature/OrderComposer";
import type { Product } from "@/types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const stockBadge: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: "Disponível", className: "bg-secondary-100 text-secondary-900" },
  low: { label: "Estoque baixo", className: "bg-accent-100 text-accent-900" },
  out: { label: "Esgotado", className: "bg-primary-100 text-primary-800" },
};

export default function PdvPage() {
  const { profile } = useAuth();
  const { products, categories, summary, loading, error, refetch } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");

  const [orderOpen, setOrderOpen] = useState(false);
  const [seed, setSeed] = useState<ComposerSeed | null>(null);
  const seedCounter = useRef(0);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(
    null
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "Todos" || product.category === category;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [products, query, category]);

  const handleSelectProduct = (product: Product) => {
    seedCounter.current += 1;
    setSeed({
      token: seedCounter.current,
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      stock: Number(product.current_stock),
    });
    setOrderOpen(true);
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="relative border-b border-background-300/60 bg-background-50 px-5 py-5 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.24em] text-primary-600">
              Ponto de venda
            </p>
            <h1 className="mt-1 font-heading text-2xl font-medium text-foreground-950">
              Olá, {profile?.name?.split(" ")[0] || "bem-vindo"}
            </h1>
            <p className="mt-1 text-sm capitalize text-foreground-500">{today}</p>
          </div>

          <div className="flex items-center gap-3">
            <BrandEmblem
              className="mt-1"
              heightClass="h-10 md:h-12"
              colorClass="text-foreground-950"
            />
            <button
              type="button"
              onClick={() => setOrderOpen(true)}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600"
            >
              <i className="ri-shopping-bag-3-line text-lg" />
              Sistema de Pedidos
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <div className="rounded-lg border border-background-300/70 bg-background-50 px-4 py-2.5">
            <p className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Produtos
            </p>
            <p className="numeric text-lg font-semibold text-foreground-950">
              {summary.total}
            </p>
          </div>
          <div className="rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-2.5">
            <p className="font-label text-[10px] uppercase tracking-wider text-secondary-800">
              Disponíveis
            </p>
            <p className="numeric text-lg font-semibold text-secondary-900">
              {summary.available}
            </p>
          </div>
          <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-2.5">
            <p className="font-label text-[10px] uppercase tracking-wider text-accent-800">
              Estoque baixo
            </p>
            <p className="numeric text-lg font-semibold text-accent-900">
              {summary.low}
            </p>
          </div>
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
            <p className="font-label text-[10px] uppercase tracking-wider text-primary-700">
              Esgotados
            </p>
            <p className="numeric text-lg font-semibold text-primary-800">
              {summary.out}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-foreground-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto…"
              className="h-10 w-full rounded-md border border-background-300 bg-background-50 pl-10 pr-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="flex flex-wrap gap-1 rounded-full bg-background-200/70 p-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={[
                  "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  category === item
                    ? "bg-primary-500 text-background-50"
                    : "text-foreground-600 hover:bg-background-100",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-2xl" />
            <p className="text-sm">Carregando catálogo…</p>
          </div>
        )}

        {!loading && error && (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-6 py-10 text-center">
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

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-2 rounded-lg border border-dashed border-background-300 px-6 py-14 text-center">
            <i className="ri-cup-line text-3xl text-foreground-300" />
            <p className="font-heading text-lg text-foreground-800">
              Nenhum produto encontrado
            </p>
            <p className="text-sm text-foreground-500">
              Ajuste a busca ou selecione outra categoria.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
              />
            ))}
          </div>
        )}

        <p className="mt-8 flex items-center gap-2 text-xs text-foreground-500">
          <i className="ri-information-line text-base" />
          Toque em qualquer produto para abrir o carrinho do Sistema de Pedidos com ele já
          adicionado. As vendas lançadas aqui são registradas como vendas reais.
        </p>
      </div>

      <OrderSystemModal
        open={orderOpen}
        seed={seed}
        onClose={() => setOrderOpen(false)}
        onDispatched={(message) => setToast({ text: message, tone: "success" })}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[60] animate-fade-up">
          <div
            className={[
              "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-background-50",
              toast.tone === "success" ? "bg-secondary-600" : "bg-primary-600",
            ].join(" ")}
          >
            <i className="ri-checkbox-circle-line text-lg" />
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (product: Product) => void;
}) {
  const status = getStockStatus(product);
  const badge = stockBadge[status];
  const isOut = status === "out";

  return (
    <article
      onClick={() => {
        if (!isOut) onSelect(product);
      }}
      className={[
        "group relative flex flex-col justify-between overflow-hidden rounded-lg border bg-background-50 p-4 transition-colors duration-150",
        isOut
          ? "cursor-not-allowed border-background-300/70 opacity-70"
          : "cursor-pointer border-background-300/70 hover:border-primary-300",
      ].join(" ")}
    >
      {isOut && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background-50/60">
          <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 font-label text-[10px] uppercase tracking-wider text-primary-700">
            Sem estoque
          </span>
        </div>
      )}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-heading text-base font-medium leading-snug text-foreground-950">
            {product.name}
          </h4>
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-label text-[10px] uppercase tracking-wider ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <p className="mt-1 font-label text-[10px] uppercase tracking-wider text-foreground-500">
          {product.category}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <span className="numeric font-heading text-xl font-semibold text-primary-600">
          {currency.format(Number(product.price))}
        </span>
        {!isOut && (
          <span className="flex items-center gap-1 text-xs font-medium text-foreground-500 transition-colors group-hover:text-primary-600">
            <i className="ri-add-circle-line text-base" />
            Adicionar
          </span>
        )}
      </div>
    </article>
  );
}