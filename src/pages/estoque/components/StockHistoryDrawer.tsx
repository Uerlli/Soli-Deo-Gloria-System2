import { useEffect, useMemo } from "react";
import { MOVEMENT_META, formatDateTime, formatRelative } from "@/pages/estoque/utils";
import type { InventoryProduct, StockMovement } from "@/types/inventory";

interface StockHistoryDrawerProps {
  open: boolean;
  movements: StockMovement[];
  products: InventoryProduct[];
  operators: Record<string, string>;
  filterProductId: string | null;
  onClose: () => void;
}

export default function StockHistoryDrawer({
  open,
  movements,
  products,
  operators,
  filterProductId,
  onClose,
}: StockHistoryDrawerProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const productNames = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((product) => {
      map[product.id] = product.name;
    });
    return map;
  }, [products]);

  const filtered = useMemo(
    () =>
      filterProductId
        ? movements.filter((movement) => movement.product_id === filterProductId)
        : movements,
    [movements, filterProductId]
  );

  const title = filterProductId
    ? productNames[filterProductId] ?? "Produto"
    : "Extrato de movimentações";

  if (!open) return null;

  const operatorLabel = (movement: StockMovement) => {
    if (!movement.created_by) return "Maquininha (automático)";
    return operators[movement.created_by] ?? "Operador";
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground-950/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative flex h-full w-full max-w-2xl flex-col animate-slide-left border-l border-background-300/60 bg-background-50">
        <header className="flex items-start justify-between gap-3 border-b border-background-300/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground-100 text-foreground-700">
              <i className="ri-history-line text-xl" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-medium leading-tight text-foreground-950">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-foreground-500">
                {filtered.length} movimentaç{filtered.length === 1 ? "ão" : "ões"}{" "}
                registrada{filtered.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-foreground-500 transition-colors hover:bg-background-200 hover:text-foreground-800"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scroll-thin">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-background-300 px-6 py-16 text-center">
              <i className="ri-file-list-3-line text-3xl text-foreground-300" />
              <p className="font-heading text-base text-foreground-800">
                Nenhuma movimentação ainda
              </p>
              <p className="text-sm text-foreground-500">
                As entradas, vendas e baixas aparecem aqui automaticamente.
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {filtered.map((movement) => {
              const meta = MOVEMENT_META[movement.movement_type];
              const isIn = meta.direction === "in";
              return (
                <li
                  key={movement.id}
                  className="rounded-lg border border-background-300/60 bg-background-50 p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-label text-[10px] uppercase tracking-wider ${meta.tag}`}
                        >
                          <i className={`${meta.icon} text-xs`} />
                          {meta.label}
                        </span>
                        {!filterProductId && (
                          <span className="truncate text-sm font-semibold text-foreground-950">
                            {productNames[movement.product_id] ?? "Produto"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-500">
                        <span>{formatDateTime(movement.created_at)}</span>
                        <span className="text-foreground-300">·</span>
                        <span>{formatRelative(movement.created_at)}</span>
                        <span className="text-foreground-300">·</span>
                        <span className="flex items-center gap-1">
                          <i className="ri-user-line text-sm" />
                          {operatorLabel(movement)}
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`numeric text-base font-bold ${
                          isIn ? "text-secondary-700" : "text-primary-700"
                        }`}
                      >
                        {isIn ? "+" : "−"}
                        {Number(movement.quantity)}
                      </p>
                      <p className="numeric mt-0.5 text-[11px] text-foreground-500">
                        {Number(movement.previous_stock)} → {Number(movement.new_stock)}
                      </p>
                    </div>
                  </div>

                  {(movement.reason || movement.notes) && (
                    <div className="mt-2.5 border-t border-background-200/70 pt-2.5">
                      {movement.reason && (
                        <p className="text-xs font-medium text-foreground-800">
                          {movement.reason}
                        </p>
                      )}
                      {movement.notes && (
                        <p className="mt-0.5 text-xs text-foreground-500">
                          {movement.notes}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}