import { useEffect, useRef, useState } from "react";
import ModalShell from "@/pages/estoque/components/ModalShell";
import { currency } from "@/pages/estoque/utils";
import type { InventoryProduct, ProductSettingsInput } from "@/types/inventory";

interface StockSettingsModalProps {
  open: boolean;
  product: InventoryProduct | null;
  isAdmin: boolean;
  onClose: () => void;
  onSubmit: (input: ProductSettingsInput) => Promise<{ error: string | null }>;
  onDelete: () => Promise<{ error: string | null }>;
}

function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export default function StockSettingsModal({
  open,
  product,
  isAdmin,
  onClose,
  onSubmit,
  onDelete,
}: StockSettingsModalProps) {
  const [minimumStock, setMinimumStock] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [price, setPrice] = useState("");
  const [immediate, setImmediate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    setImmediate(!current.requires_preparation);
    setFormError(null);
    setConfirmingDelete(false);
    setDeleting(false);
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
      requiresPreparation: !immediate,
    });
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setFormError(null);
    const { error } = await onDelete();
    setDeleting(false);
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

        <button
          type="button"
          onClick={() => setImmediate((value) => !value)}
          className="flex w-full cursor-pointer items-center justify-between rounded-md border border-background-300 bg-background-50 px-3 py-2.5 text-left transition-colors hover:bg-background-100"
        >
          <span>
            <span className="block text-sm font-medium text-foreground-900">
              Entrega imediata no caixa
            </span>
            <span className="block text-[11px] text-foreground-500">
              Marcado (sim): pode ser entregue na hora, sem passar pela fila. Desmarcado (não):
              entra na fila de preparo do Balcão.
            </span>
          </span>
          <span
            className={[
              "flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
              immediate ? "bg-primary-500" : "bg-background-300",
            ].join(" ")}
          >
            <span
              className={[
                "h-5 w-5 rounded-full bg-background-50 transition-transform",
                immediate ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </span>
        </button>

        {isAdmin && (
          <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-3">
            <p className="font-label text-[10px] uppercase tracking-wider text-primary-700">
              Excluir do catálogo
            </p>
            <p className="mt-1 text-[11px] leading-snug text-foreground-600">
              Esconde o produto do PDV e do Balcão sem apagar o histórico de pedidos
              antigos que já o utilizam.
            </p>
            {confirmingDelete ? (
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary-600 px-3 py-2 text-xs font-medium text-background-50 transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? (
                    <i className="ri-loader-4-line animate-spin text-sm" />
                  ) : (
                    <i className="ri-delete-bin-6-line text-sm" />
                  )}
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-3 py-2 text-xs text-foreground-600 transition-colors hover:bg-background-100 disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mt-2.5 flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-primary-300 bg-background-50 px-3 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                <i className="ri-delete-bin-6-line text-sm" />
                Excluir do catálogo
              </button>
            )}
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