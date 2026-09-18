import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "@/pages/estoque/components/ModalShell";
import { currency, formatStock } from "@/pages/estoque/utils";
import type {
  InventoryProduct,
  NewProductInput,
  StockMovementInput,
} from "@/types/inventory";

interface RestockModalProps {
  open: boolean;
  productId: string | null;
  products: InventoryProduct[];
  isAdmin: boolean;
  onClose: () => void;
  onSubmit: (input: StockMovementInput) => Promise<{ error: string | null }>;
  onCreate: (input: NewProductInput) => Promise<{ error: string | null }>;
}

type Mode = "entry" | "new";

const UNIT_SUGGESTIONS = ["unidade", "kg", "g", "litro", "ml", "caixa", "pacote", "fatia"];

function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export default function RestockModal({
  open,
  productId,
  products,
  isAdmin,
  onClose,
  onSubmit,
  onCreate,
}: RestockModalProps) {
  const [mode, setMode] = useState<Mode>("entry");

  // Campos da entrada de mercadoria (produtos já cadastrados).
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [lotCost, setLotCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  // Campos do cadastro de produto novo.
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("unidade");
  const [newInitial, setNewInitial] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newMinimum, setNewMinimum] = useState("");
  const [newImmediate, setNewImmediate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    if (!open) return;
    const list = productsRef.current;
    setMode("entry");
    setSelectedId(productId ?? list[0]?.id ?? "");
    setQuantity("");
    setLotCost("");
    setSupplier("");
    setNotes("");
    setNewName("");
    setNewCategory("");
    setNewUnit("unidade");
    setNewInitial("");
    setNewCost("");
    setNewPrice("");
    setNewMinimum("");
    setNewImmediate(false);
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

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category)));
    return unique.filter(Boolean);
  }, [products]);

  const previewBalance = useMemo(() => {
    if (!selected || !quantity) return null;
    const qty = toNumber(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return Number(selected.current_stock) + qty;
  }, [selected, quantity]);

  const handleSubmitEntry = async () => {
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

  const handleSubmitNew = async () => {
    if (!newName.trim()) {
      setFormError("Informe o nome do produto.");
      return;
    }
    const initial = newInitial.trim() ? toNumber(newInitial) : 0;
    const cost = newCost.trim() ? toNumber(newCost) : 0;
    const salePrice = newPrice.trim() ? toNumber(newPrice) : 0;
    const minimum = newMinimum.trim() ? toNumber(newMinimum) : 0;

    if (!Number.isFinite(initial) || initial < 0) {
      setFormError("Quantidade inicial inválida.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setFormError("Custo inválido.");
      return;
    }
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      setFormError("Preço de venda inválido.");
      return;
    }
    if (!Number.isFinite(minimum) || minimum < 0) {
      setFormError("Estoque mínimo de alerta inválido.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    const { error } = await onCreate({
      name: newName.trim(),
      category: newCategory.trim() || "Outros",
      unit: newUnit.trim() || "unidade",
      initialStock: initial,
      unitCost: cost,
      price: salePrice,
      minimumStock: minimum,
      requiresPreparation: !newImmediate,
    });
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }
    onClose();
  };

  const isEntry = mode === "entry";

  const titleAction =
    isAdmin && isEntry ? (
      <button
        type="button"
        onClick={() => {
          setMode("new");
          setFormError(null);
        }}
        title="Cadastrar novo produto"
        aria-label="Cadastrar novo produto"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary-500 text-background-50 transition-colors hover:bg-primary-600"
      >
        <i className="ri-add-line text-sm" />
      </button>
    ) : isAdmin && !isEntry ? (
      <button
        type="button"
        onClick={() => {
          setMode("entry");
          setFormError(null);
        }}
        className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-background-300 px-2.5 py-0.5 text-[11px] font-medium text-foreground-600 transition-colors hover:bg-background-100"
      >
        <i className="ri-arrow-left-line text-sm" />
        Voltar à entrada
      </button>
    ) : null;

  return (
    <ModalShell
      open={open}
      title={isEntry ? "Entrada de mercadoria" : "Cadastrar novo produto"}
      subtitle={
        isEntry
          ? "Registre um novo lote recebido do fornecedor"
          : "Crie um item do zero com custo, preço e estoque inicial"
      }
      icon={isEntry ? "ri-add-circle-line" : "ri-price-tag-3-line"}
      onClose={onClose}
      titleAction={titleAction}
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
            onClick={() => void (isEntry ? handleSubmitEntry() : handleSubmitNew())}
            disabled={submitting}
            className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <i className="ri-loader-4-line animate-spin text-base" />
            ) : (
              <i className="ri-check-line text-base" />
            )}
            {isEntry ? "Lançar entrada" : "Cadastrar produto"}
          </button>
        </div>
      }
    >
      {isEntry ? (
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
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2.5 text-xs text-secondary-900">
            <i className="ri-information-line mt-0.5 text-base" />
            <span>
              O produto é criado já cadastrado no catálogo. A quantidade inicial entra como
              saldo e o lançamento fica registrado no extrato.
            </span>
          </div>

          <label className="block">
            <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              Nome do produto
            </span>
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ex: Leite de Aveia 1L"
              className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Categoria
              </span>
              <input
                type="text"
                list="restock-category-options"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Ex: Bebidas"
                className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
              <datalist id="restock-category-options">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Unidade de medida
              </span>
              <input
                type="text"
                list="restock-unit-options"
                value={newUnit}
                onChange={(event) => setNewUnit(event.target.value)}
                placeholder="Ex: unidade, kg, litro"
                className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
              <datalist id="restock-unit-options">
                {UNIT_SUGGESTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Quantidade inicial
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newInitial}
                onChange={(event) => setNewInitial(event.target.value)}
                placeholder="Ex: 24"
                className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
            </label>
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Estoque mínimo de alerta
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={newMinimum}
                onChange={(event) => setNewMinimum(event.target.value)}
                placeholder="Ex: 5"
                className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Custo unitário
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newCost}
                onChange={(event) => setNewCost(event.target.value)}
                placeholder="Ex: 4.50"
                className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
            </label>
            <label className="block">
              <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                Preço de venda
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value)}
                placeholder="Ex: 12.00"
                className="mt-1 h-11 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setNewImmediate((value) => !value)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md border border-background-300 bg-background-50 px-3 py-2.5 text-left transition-colors hover:bg-background-100"
          >
            <span>
              <span className="block text-sm font-medium text-foreground-900">
                Entrega imediata no caixa
              </span>
              <span className="block text-[11px] text-foreground-500">
                Marcado (sim): pode ser entregue na hora. Desmarcado (não): entra na fila de
                preparo do Balcão.
              </span>
            </span>
            <span
              className={[
                "flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
                newImmediate ? "bg-primary-500" : "bg-background-300",
              ].join(" ")}
            >
              <span
                className={[
                  "h-5 w-5 rounded-full bg-background-50 transition-transform",
                  newImmediate ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </span>
          </button>

          {formError && (
            <p className="flex items-center gap-1.5 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800">
              <i className="ri-error-warning-line" />
              {formError}
            </p>
          )}
        </div>
      )}
    </ModalShell>
  );
}