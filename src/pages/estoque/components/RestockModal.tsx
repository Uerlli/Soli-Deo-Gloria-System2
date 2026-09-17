import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "@/pages/estoque/components/ModalShell";
import { currency, formatStock } from "@/pages/estoque/utils";
import type { InventoryProduct, StockMovementInput } from "@/types/inventory";

interface RestockModalProps {
  open: boolean;
  productId: string | null;
  products: InventoryProduct[];
  onClose: () => void;
  onSubmit: (input: StockMovementInput) => Promise<{ error: string | null }>;
}

function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export default function RestockModal({
  open,
  productId,
  products,
  onClose,
  onSubmit,
}: RestockModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lotCost, setLotCost] = useState("");
  const [supplier, setSupplier] = useState("");
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
    setQuantity("");
    setLotCost("");
    setSupplier("");
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

  const previewBalance = useMemo(() => {
    if (!selected || !quantity) return null;
    const qty = toNumber(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return Number(selected.current_stock) + qty;
  }, [selected, quantity]);

  const handleSubmit = async () => {
    if (!selected) {
      setFormError("Selecione um produto para dar entrada.");
      return;
    }
    const qty = toNumber(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError("Informe uma quantidade maior que zero.");
      return;
    }
    const lot = lotCost.trim() ? toNumber(lotCost) : null;
    if (lot !== null && (!Number.isFinite(lot) || lot < 0)) {
      setFormError("Custo do lote inválido.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const { error } = await onSubmit({
      productId: selected.id,
      type: "ENTRY",
      quantity: qty,
      reason: supplier.trim() || "Entrada de mercadoria",
      notes: notes.trim() || null,
      unitCost: lot,
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
      title="Entrada de mercadoria"
      subtitle="Registre um novo lote recebido do fornecedor"
      icon="ri-add-circle-line"
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
            Lançar entrada
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
            <span>
              Venda:{" "}
              <strong className="text-foreground-900">
                {currency.format(Number(selected.price))}
              </strong>
            </span>
            {previewBalance !== null && (
              <span className="text-secondary-800">
                Novo saldo: <strong>{formatStock(previewBalance, selected.unit)}</strong>
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Quantidade adicionada
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Ex: 24"
              className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </label>
          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Custo unitário do lote (opcional)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={lotCost}
              onChange={(event) => setLotCost(event.target.value)}
              placeholder="Ex: 4.50"
              className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Origem / Fornecedor
          </span>
          <input
            type="text"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
            placeholder="Ex: Nota Fiscal #4509 - Distribuidora Silva"
            className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          />
        </label>

        <label className="block">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Observações
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 300))}
            rows={2}
            placeholder="Ex: lote com validade até 12/2026"
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