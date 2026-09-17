import type { InventoryProduct } from "@/types/inventory";
import type { StockStatus } from "@/hooks/useCatalog";
import { currency, formatStock } from "@/pages/estoque/utils";

interface InventoryTableProps {
  products: InventoryProduct[];
  isAdmin: boolean;
  statusOf: (product: InventoryProduct) => StockStatus;
  busyId: string | null;
  onQuickAdd: (product: InventoryProduct) => void;
  onQuickRemove: (product: InventoryProduct) => void;
  onSettings: (product: InventoryProduct) => void;
  onHistory: (product: InventoryProduct) => void;
}

const STATUS_BADGE: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: "Disponível", className: "bg-secondary-100 text-secondary-900" },
  low: { label: "Estoque baixo", className: "bg-accent-100 text-accent-900" },
  out: { label: "Esgotado", className: "bg-primary-100 text-primary-800" },
};

export default function InventoryTable({
  products,
  isAdmin,
  statusOf,
  busyId,
  onQuickAdd,
  onQuickRemove,
  onSettings,
  onHistory,
}: InventoryTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-background-300/60 bg-background-50">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-background-300/60 bg-background-100/60">
              <th className="px-4 py-3 font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Produto
              </th>
              {isAdmin && (
                <th className="px-4 py-3 font-label text-[10px] uppercase tracking-wider text-foreground-500">
                  Custo un.
                </th>
              )}
              <th className="px-4 py-3 font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Preço venda
              </th>
              <th className="px-4 py-3 text-center font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Qtd. atual
              </th>
              <th className="px-4 py-3 text-center font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Mín. alerta
              </th>
              <th className="px-4 py-3 font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Status
              </th>
              <th className="px-4 py-3 text-right font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const status = statusOf(product);
              const badge = STATUS_BADGE[status];
              const isBusy = busyId === product.id;
              const alertQty = status !== "ok";

              return (
                <tr
                  key={product.id}
                  className="border-b border-background-200/70 transition-colors last:border-b-0 hover:bg-background-100/50"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-foreground-950">
                      {product.name}
                    </p>
                    <p className="mt-0.5 font-label text-[10px] uppercase tracking-wider text-foreground-500">
                      {product.category}
                    </p>
                  </td>

                  {isAdmin && (
                    <td className="numeric px-4 py-3 text-sm text-foreground-700">
                      {currency.format(Number(product.unit_cost))}
                    </td>
                  )}

                  <td className="numeric px-4 py-3 text-sm font-medium text-foreground-800">
                    {currency.format(Number(product.price))}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={[
                        "numeric inline-flex items-center gap-1.5 text-lg font-bold",
                        status === "out"
                          ? "text-primary-700"
                          : status === "low"
                            ? "text-accent-800"
                            : "text-foreground-950",
                      ].join(" ")}
                    >
                      {alertQty && (
                        <i
                          className={
                            status === "out"
                              ? "ri-error-warning-line text-base"
                              : "ri-alert-line text-base"
                          }
                        />
                      )}
                      {Number(product.current_stock)}
                    </span>
                    <span className="ml-1 text-[10px] uppercase tracking-wider text-foreground-400">
                      {product.unit}
                    </span>
                  </td>

                  <td className="numeric px-4 py-3 text-center text-sm text-foreground-600">
                    {Number(product.minimum_stock)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 font-label text-[10px] uppercase tracking-wider ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onQuickAdd(product)}
                        disabled={isBusy}
                        title="Entrada rápida de mercadoria"
                        aria-label="Entrada rápida"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-secondary-200 bg-secondary-50 text-secondary-800 transition-colors hover:bg-secondary-100 disabled:opacity-50"
                      >
                        <i className="ri-add-line text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickRemove(product)}
                        disabled={isBusy}
                        title="Baixa rápida (perda/consumo)"
                        aria-label="Baixa rápida"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-primary-200 bg-primary-50 text-primary-700 transition-colors hover:bg-primary-100 disabled:opacity-50"
                      >
                        <i className="ri-subtract-line text-base" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => onSettings(product)}
                          disabled={isBusy}
                          title="Ajustar mínimo, custo e preço"
                          aria-label="Configurações do produto"
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-background-300 bg-background-50 text-foreground-600 transition-colors hover:bg-background-200 disabled:opacity-50"
                        >
                          <i className="ri-settings-3-line text-base" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onHistory(product)}
                        title="Ver histórico deste item"
                        aria-label="Histórico do item"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-background-300 bg-background-50 text-foreground-600 transition-colors hover:bg-background-200"
                      >
                        <i className="ri-eye-line text-base" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}