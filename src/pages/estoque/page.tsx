import { useEffect, useMemo, useState } from "react";
import InventoryKPIHeader from "@/pages/estoque/components/InventoryKPIHeader";
import InventoryTable from "@/pages/estoque/components/InventoryTable";
import RestockModal from "@/pages/estoque/components/RestockModal";
import StockWasteModal from "@/pages/estoque/components/StockWasteModal";
import StockSettingsModal from "@/pages/estoque/components/StockSettingsModal";
import StockHistoryDrawer from "@/pages/estoque/components/StockHistoryDrawer";
import { useInventory } from "@/hooks/useInventory";
import type {
  InventoryConnection,
  InventoryProduct,
  NewProductInput,
  ProductSettingsInput,
  StockMovementInput,
} from "@/types/inventory";

type StatusFilter = "all" | "low" | "out";

const CONNECTION_META: Record<
  InventoryConnection,
  { label: string; icon: string; className: string }
> = {
  live: {
    label: "Sincronizado ao vivo",
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

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "low", label: "Apenas estoque baixo" },
  { value: "out", label: "Apenas esgotados" },
];

export default function EstoquePage() {
  const {
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
    refetch,
    statusOf,
    registerMovement,
    updateSettings,
    createProduct,
    deactivateProduct,
    dismissAlert,
  } = useInventory();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [restock, setRestock] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });
  const [waste, setWaste] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });
  const [settings, setSettings] = useState<{
    open: boolean;
    product: InventoryProduct | null;
  }>({ open: false, product: null });
  const [history, setHistory] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });

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
      const matchesCategory = category === "Todas" || product.category === category;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      const status = statusOf(product);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "low" && status === "low") ||
        (statusFilter === "out" && status === "out");
      return matchesCategory && matchesTerm && matchesStatus;
    });
  }, [products, query, category, statusFilter, statusOf]);

  const handleRestock = async (input: StockMovementInput) => {
    setBusyId(input.productId);
    const result = await registerMovement(input);
    setBusyId(null);
    if (!result.error) {
      setToast({ text: "Entrada de mercadoria registrada.", tone: "success" });
    }
    return result;
  };

  const handleWaste = async (input: StockMovementInput) => {
    setBusyId(input.productId);
    const result = await registerMovement(input);
    setBusyId(null);
    if (!result.error) {
      setToast({ text: "Baixa registrada no extrato.", tone: "success" });
    }
    return result;
  };

  const handleSettings = async (input: ProductSettingsInput) => {
    setBusyId(input.productId);
    const result = await updateSettings(input);
    setBusyId(null);
    if (!result.error) {
      setToast({ text: "Configurações do produto atualizadas.", tone: "success" });
    }
    return result;
  };

  const handleCreateProduct = async (input: NewProductInput) => {
    const result = await createProduct(input);
    if (!result.error) {
      setToast({ text: "Produto cadastrado com sucesso.", tone: "success" });
    }
    return result;
  };

  const handleDeleteProduct = async () => {
    if (!settings.product) return { error: "Produto não encontrado." };
    const result = await deactivateProduct(settings.product.id);
    if (!result.error) {
      setToast({ text: "Produto removido do catálogo.", tone: "success" });
    }
    return result;
  };

  const connectionMeta = CONNECTION_META[connection];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-background-300/60 bg-background-50 px-5 py-5 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-800">
              <i className="ri-archive-2-line text-2xl" />
            </span>
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-primary-600">
                Gestão de insumos
              </p>
              <h1 className="mt-0.5 font-heading text-2xl font-medium text-foreground-950">
                Estoque &amp; Insumos
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-500">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label text-[10px] uppercase tracking-wider ${connectionMeta.className}`}
                >
                  <i className={`${connectionMeta.icon} text-sm`} />
                  {connectionMeta.label}
                </span>
                Entradas, baixas e vendas da Moderninha em tempo real
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-background-300 bg-background-50 px-3.5 py-2.5 text-sm font-medium text-foreground-600 transition-colors hover:bg-background-100"
            >
              <i className="ri-refresh-line text-lg" />
              Atualizar
            </button>
            {isAdmin && (
              <span className="hidden items-center gap-2 whitespace-nowrap rounded-md border border-background-300 bg-background-50 px-3.5 py-2.5 text-sm font-medium text-foreground-500 lg:flex">
                <i className="ri-shield-check-line text-lg" />
                Modo administrador
              </span>
            )}
            <button
              type="button"
              onClick={() => setWaste({ open: true, productId: null })}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-primary-300 bg-primary-50 px-3.5 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
            >
              <i className="ri-delete-bin-6-line text-lg" />
              Registrar perda / baixa
            </button>
            <button
              type="button"
              onClick={() => setRestock({ open: true, productId: null })}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600"
            >
              <i className="ri-add-circle-line text-lg" />
              Entrada de mercadoria
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 px-5 py-6 md:px-8">
        <InventoryKPIHeader summary={summary} isAdmin={isAdmin} />

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const isOut = alert.status === "out";
              return (
                <div
                  key={alert.id}
                  className={[
                    "flex items-center gap-3 rounded-lg border px-4 py-3 animate-fade-up",
                    isOut
                      ? "border-primary-200 bg-primary-50"
                      : "border-accent-200 bg-accent-50",
                  ].join(" ")}
                >
                  <i
                    className={`${
                      isOut ? "ri-error-warning-line text-primary-700" : "ri-alert-line text-accent-800"
                    } text-xl`}
                  />
                  <p className="flex-1 text-sm text-foreground-800">
                    Atenção: <strong>{alert.productName}</strong>{" "}
                    {isOut
                      ? "acaba de esgotar via venda no balcão!"
                      : "atingiu o estoque baixo via venda no balcão!"}
                  </p>
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    aria-label="Dispensar alerta"
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground-500 transition-colors hover:bg-background-200"
                  >
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-foreground-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar produto ou categoria…"
              className="h-10 w-full rounded-md border border-background-300 bg-background-50 pl-10 pr-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex flex-wrap gap-1 rounded-full bg-background-200/70 p-1">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={[
                    "cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === option.value
                      ? "bg-foreground-950 text-background-50"
                      : "text-foreground-600 hover:bg-background-100",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setHistory({ open: true, productId: null })}
              className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-background-300 bg-background-50 px-3.5 py-2.5 text-sm font-medium text-foreground-600 transition-colors hover:bg-background-100"
            >
              <i className="ri-history-line text-lg" />
              Extrato de movimentações
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-2xl" />
            <p className="text-sm">Carregando o estoque…</p>
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

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-background-300 px-6 py-14 text-center">
            <i className="ri-inbox-line text-3xl text-foreground-300" />
            <p className="font-heading text-lg text-foreground-800">
              Nenhum item encontrado
            </p>
            <p className="text-sm text-foreground-500">
              Ajuste a busca, a categoria ou o filtro de status.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <InventoryTable
            products={filtered}
            isAdmin={isAdmin}
            statusOf={statusOf}
            busyId={busyId}
            onQuickAdd={(product) => setRestock({ open: true, productId: product.id })}
            onQuickRemove={(product) => setWaste({ open: true, productId: product.id })}
            onSettings={(product) => setSettings({ open: true, product })}
            onHistory={(product) => setHistory({ open: true, productId: product.id })}
          />
        )}

        <p className="flex items-start gap-2 text-xs text-foreground-500">
          <i className="ri-information-line mt-0.5 text-base" />
          <span>
            Cada venda finalizada na Moderninha Smart 2 dá baixa automática no estoque e é
            registrada no extrato. Baixas que derrubam o saldo abaixo do mínimo disparam o
            alerta acima, em tempo real.
          </span>
        </p>
      </div>

      <RestockModal
        open={restock.open}
        productId={restock.productId}
        products={products}
        isAdmin={isAdmin}
        onClose={() => setRestock({ open: false, productId: null })}
        onSubmit={handleRestock}
        onCreate={handleCreateProduct}
      />

      <StockWasteModal
        open={waste.open}
        productId={waste.productId}
        products={products}
        onClose={() => setWaste({ open: false, productId: null })}
        onSubmit={handleWaste}
      />

      <StockSettingsModal
        open={settings.open}
        product={settings.product}
        isAdmin={isAdmin}
        onClose={() => setSettings({ open: false, product: null })}
        onSubmit={handleSettings}
        onDelete={handleDeleteProduct}
      />

      <StockHistoryDrawer
        open={history.open}
        movements={movements}
        products={products}
        operators={operators}
        filterProductId={history.productId}
        onClose={() => setHistory({ open: false, productId: null })}
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