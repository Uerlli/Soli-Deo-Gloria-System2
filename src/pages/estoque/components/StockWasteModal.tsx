import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "@/pages/estoque/components/ModalShell";
import { WASTE_REASONS, formatStock, type WasteReasonValue } from "@/pages/estoque/utils";
import type {
  InventoryProduct,
  StockMovementInput,
  StockMovementType,
} from "@/types/inventory";

interface StockWasteModalProps {
  open: boolean;
  productId: string | null;
  products: InventoryProduct[];
  onClose: () => void;
  onSubmit: (input: StockMovementInput) => Promise<{ error: string | null }>;
}

function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

const REASON_REASON_TEXT: Record<WasteReasonValue, string> = {
  WASTE: "Avaria / Quebra",
  EXPIRED: "Validade vencida",
  INTERNAL_CONSUMPTION: "Consumo da casa / equipe",
  ADJUSTMENT: "Ajuste de inventário",
};

export default function StockWasteModal({
  open,
  productId,
  products,
  onClose,
  onSubmit,
}: StockWasteModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState<WasteReasonValue>("WASTE");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    if (!open) return;
    const list = productsRef.current;
    setSelectedId(productId ?? list[0]?.id ?? "");
    setReason("WASTE");
    setDirection("out");
    setQuantity("");
    setNotes("");
    setFormError(null);
  }, [open, productId]);

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, InventoryProduct[]>();
    products.forEach((product) => {
      const list = map.get(product.category) ?? [];
      list.push(product);
      map.set(product.category, list);
    });
    return Array.from(map.entries());
  }, [products]);

  const isAdjustment = reason === "ADJUSTMENT";

  const previewBalance = useMemo(() => {
    if (!selected || !quantity) return null;
    const qty = toNumber(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const signed = isAdjustment && direction === "in" ? qty : -qty;
    return Math.max(0, Number(selected.current_stock) + signed);
  }, [selected, quantity, isAdjustment, direction]);

  const handleSubmit = async () => {
    if (!selected) {
      setFormError("Selecione um produto.");
      return;
    }
    const qty = toNumber(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Informe uma quantidade maior que zero.");
      return;
    }

    let type: StockMovementType = "WASTE";
    let signedQty = qty;
    if (reason === "INTERNAL_CONSUMPTION") {
      type = "INTERNAL_CONSUMPTION";
    } else if (reason === "ADJUSTMENT") {
      type = "ADJUSTMENT";
      signedQty = direction === "in" ? qty : -qty;
    }

    setSubmitting(true);
    setFormError(null);
    const { error } = await onSubmit({
      productId: selected.id,
      type,
      quantity: signedQty,
      reason: REASON_REASON_TEXT[reason],
      notes: notes.trim() || null,
      unitCost: null,
    });
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    onClose();
  };

  return (
    <ModalShell
      open={open}
      title="Registrar perda / baixa"
      subtitle="Lance avarias, validade vencida, consumo interno ou ajustes"
      icon="ri-delete-bin-6-line"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-4 py-2.5 text-sm text-foreground-600 transition-colors hover:bg-background-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <i className="ri-loader-4-line animate-spin text-base" />
            ) : (
              <i className="ri-check-line text-base" />
            )}
            Registrar baixa
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Produto
          </span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-1 h-11 w-full cursor-pointer rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          >
            {grouped.map(([category, list]) => (
              <optgroup key={category} label={category}>
                {list.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {selected && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-background-100 px-3 py-2 text-xs text-foreground-600">
            <span>
              Saldo atual:{" "}
              <strong className="text-foreground-900">
                {formatStock(Number(selected.current_stock), selected.unit)}
              </strong>
            </span>
            {previewBalance !== null && (
              <span className="text-primary-700">
                Novo saldo: <strong>{formatStock(previewBalance, selected.unit)}</strong>
              </span>
            )}
          </div>
        )}

        <div>
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Motivo da baixa
          </span>
          <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {WASTE_REASONS.map((option) => {
              const active = reason === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReason(option.value)}
                  className={[
                    "cursor-pointer rounded-md border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary-400 bg-primary-50"
                      : "border-background-300 bg-background-50 hover:bg-background-100",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={[
                        "flex h-4 w-4 items-center justify-center rounded-full border",
                        active ? "border-primary-500" : "border-background-400",
                      ].join(" ")}
                    >
                      {active && <span className="h-2 w-2 rounded-full bg-primary-500" />}
                    </span>
                    <span className="text-sm font-medium text-foreground-900">
                      {option.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block pl-6 text-[11px] text-foreground-500">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isAdjustment && (
          <div>
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Direção do ajuste
            </span>
            <div className="mt-1.5 inline-flex rounded-full bg-background-200/70 p-1">
              <button
                type="button"
                onClick={() => setDirection("out")}
                className={[
                  "cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  direction === "out"
                    ? "bg-primary-500 text-background-50"
                    : "text-foreground-600 hover:bg-background-100",
                ].join(" ")}
              >
                Reduzir saldo
              </button>
              <button
                type="button"
                onClick={() => setDirection("in")}
                className={[
                  "cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  direction === "in"
                    ? "bg-secondary-500 text-background-50"
                    : "text-foreground-600 hover:bg-background-100",
                ].join(" ")}
              >
                Aumentar saldo
              </button>
            </div>
          </div>
        )}

        <label className="block">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Quantidade
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Ex: 3"
            className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          />
        </label>

        <label className="block">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Observações detalhadas
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 300))}
            rows={2}
            placeholder="Ex: pacote de leite rasgado no transporte"
            className="mt-1 w-full resize-none rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          />
        </label>

        {formError && (
          <p className="flex items-center gap-1.5 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800">
            <i className="ri-error-warning-line" />
            {formError}
          </p>
        )}
      </div>
    </ModalShell>
  );
}