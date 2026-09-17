import { useEffect, useRef, useState } from "react";
import ModalShell from "@/pages/estoque/components/ModalShell";
import { currency } from "@/pages/estoque/utils";
import type { InventoryProduct, ProductSettingsInput } from "@/types/inventory";

interface StockSettingsModalProps {
  open: boolean;
  product: InventoryProduct | null;
  onClose: () => void;
  onSubmit: (input: ProductSettingsInput) => Promise<{ error: string | null }>;
}

function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export default function StockSettingsModal({
  open,
  product,
  onClose,
  onSubmit,
}: StockSettingsModalProps) {
  const [minimumStock, setMinimumStock] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const productRef = useRef(product);
  useEffect(() => {
    productRef.current = product;
  }, [product]);

  useEffect(() => {
    if (!open) return;
    const current = productRef.current;
    if (!current) return;
    setMinimumStock(String(Number(current.minimum_stock)));
    setUnitCost(String(Number(current.unit_cost)));
    setPrice(String(Number(current.price)));
    setFormError(null);
  }, [open, product?.id]);

  if (!product) return null;

  const handleSubmit = async () => {
    const min = toNumber(minimumStock);
    const cost = toNumber(unitCost);
    const salePrice = toNumber(price);

    if (!Number.isFinite(min) || min < 0) {
      setFormError("Limite mínimo inválido.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setFormError("Custo unitário inválido.");
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setFormError("Preço de venda inválido.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const { error } = await onSubmit({
      productId: product.id,
      minimumStock: min,
      unitCost: cost,
      price: salePrice,
    });
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    onClose();
  };

  const margin = (() => {
    const cost = toNumber(unitCost);
    const salePrice = toNumber(price);
    if (!Number.isFinite(cost) || !Number.isFinite(salePrice) || salePrice <= 0) return null;
    return ((salePrice - cost) / salePrice) * 100;
  })();

  return (
    <ModalShell
      open={open}
      title="Configurar produto"
      subtitle={product.name}
      icon="ri-settings-3-line"
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
            Salvar alterações
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Mínimo para alerta
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={minimumStock}
              onChange={(event) => setMinimumStock(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </label>
          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Custo unitário
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Preço de venda
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          />
        </label>

        {margin !== null && (
          <div className="flex items-center justify-between rounded-md bg-background-100 px-3 py-2.5 text-xs">
            <span className="text-foreground-600">Margem estimada por unidade</span>
            <span className="numeric font-semibold text-secondary-800">
              {margin.toFixed(1)}% · {currency.format(toNumber(price) - toNumber(unitCost))}
            </span>
          </div>
        )}

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