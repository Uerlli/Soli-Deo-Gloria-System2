import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog, getStockStatus } from "@/hooks/useCatalog";
import { supabase } from "@/lib/supabase";
import type { OrderIngestPayload } from "@/types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export interface ComposerSeed {
  token: number;
  productId: string;
  name: string;
  price: number;
  stock: number;
}

interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  notes: string;
}

interface OrderComposerProps {
  open: boolean;
  /** Origem gravada no pedido: "pdv" (venda real) ou "simulator" (teste). */
  source: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  submitIcon?: string;
  /** Mostra o saldo do item na listagem (usado pelo simulador do Balcão). */
  showStock?: boolean;
  seed?: ComposerSeed | null;
  onClose: () => void;
  onDispatched: (message: string) => void;
}

function addToCart(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((item) => item.productId === line.productId);
  if (existing) {
    const max = line.stock > 0 ? line.stock : existing.quantity + 1;
    return lines.map((item) =>
      item.productId === line.productId
        ? { ...item, quantity: Math.min(item.quantity + 1, max) }
        : item
    );
  }
  return [...lines, { ...line, quantity: 1 }];
}

export default function OrderComposer({
  open,
  source,
  eyebrow,
  title,
  subtitle,
  submitLabel,
  submitIcon = "ri-send-plane-fill",
  showStock = false,
  seed,
  onClose,
  onDispatched,
}: OrderComposerProps) {
  const { products, categories, loading } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableIdentifier, setTableIdentifier] = useState("Mesa 01");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lastSeedToken = useRef<number | null>(null);

  // Produto clicado na grade do PDV entra direto no carrinho.
  useEffect(() => {
    if (!seed) return;
    if (lastSeedToken.current === seed.token) return;
    lastSeedToken.current = seed.token;
    setFormError(null);
    setCart((prev) =>
      addToCart(prev, {
        productId: seed.productId,
        name: seed.name,
        price: seed.price,
        quantity: 1,
        stock: seed.stock,
        notes: "",
      })
    );
  }, [seed]);

  useEffect(() => {
    if (open) {
      setFormError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        category === "Todos" || product.category === category;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [products, query, category]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );

  const addProduct = (productId: string, name: string, price: number, stock: number) => {
    setFormError(null);
    setCart((prev) =>
      addToCart(prev, { productId, name, price, quantity: 1, stock, notes: "" })
    );
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.productId !== productId) return line;
          const max = line.stock > 0 ? line.stock : Infinity;
          return { ...line, quantity: Math.min(Math.max(line.quantity + delta, 0), max) };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const setLineNotes = (productId: string, value: string) => {
    setCart((prev) =>
      prev.map((line) =>
        line.productId === productId ? { ...line, notes: value } : line
      )
    );
  };

  const reset = () => {
    setCart([]);
    setCustomerName("");
    setNotes("");
    setTableIdentifier("Mesa 01");
    setFormError(null);
  };

  const handleDispatch = async () => {
    if (cart.length === 0) {
      setFormError("Adicione ao menos um item para registrar o pedido.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload: OrderIngestPayload = {
      external_id: `${source.toUpperCase()}-${Date.now()}`,
      order_number: String(Math.floor(100 + Math.random() * 900)),
      table_identifier: tableIdentifier.trim() || null,
      customer_name: customerName.trim() || null,
      notes: notes.trim() || null,
      total_amount: Number(total.toFixed(2)),
      source,
      items: cart.map((line) => ({
        product_id: line.productId,
        product_name: line.name,
        quantity: line.quantity,
        unit_price: Number(line.price.toFixed(2)),
        notes: line.notes.trim() || null,
      })),
    };

    try {
      const { data, error } = await supabase.rpc("ingest_order", {
        p_payload: payload,
      });

      if (error) {
        setFormError(
          error.message?.includes("not authorized")
            ? "Sua sessão não tem permissão para lançar pedidos."
            : "Não foi possível enviar o pedido."
        );
        return;
      }

      const status = (data as { status?: string } | null)?.status;
      reset();
      onDispatched(
        status === "duplicate"
          ? "Este pedido já havia sido lançado."
          : source === "simulator"
            ? "Pedido da maquininha enviado para o balcão!"
            : "Pedido registrado com sucesso!"
      );
      onClose();
    } catch {
      setFormError("Não foi possível enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-foreground-950/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-lg bg-background-50 sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 border-b border-background-300/60 px-5 py-4">
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.22em] text-primary-600">
              {eyebrow}
            </p>
            <h2 className="mt-0.5 font-heading text-xl font-medium text-foreground-950">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-foreground-500">{subtitle}</p>
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

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <section className="flex min-h-0 flex-col border-b border-background-300/60 lg:border-b-0 lg:border-r">
            <div className="space-y-3 px-5 py-4">
              <div className="relative">
                <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-foreground-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar item do cardápio…"
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
                      "cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 scroll-thin">
              {loading && (
                <div className="flex items-center gap-2 py-8 text-sm text-foreground-500">
                  <i className="ri-loader-4-line animate-spin" />
                  Carregando cardápio…
                </div>
              )}

              {!loading && filtered.length === 0 && (
                <p className="py-8 text-sm text-foreground-500">
                  Nenhum item encontrado.
                </p>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filtered.map((product) => {
                  const status = getStockStatus(product);
                  const isOut = status === "out";
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOut}
                      onClick={() =>
                        addProduct(
                          product.id,
                          product.name,
                          Number(product.price),
                          Number(product.current_stock)
                        )
                      }
                      className={[
                        "flex flex-col items-start rounded-md border bg-background-50 px-3 py-2.5 text-left transition-colors",
                        isOut
                          ? "cursor-not-allowed border-background-300/70 opacity-60"
                          : "cursor-pointer border-background-300/70 hover:border-primary-300 hover:bg-primary-50/40",
                      ].join(" ")}
                    >
                      <span className="text-sm font-medium leading-snug text-foreground-950">
                        {product.name}
                      </span>
                      <span className="mt-1 flex w-full items-center justify-between">
                        <span className="numeric text-sm font-semibold text-primary-600">
                          {currency.format(Number(product.price))}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-foreground-400">
                          {isOut
                            ? "Esgotado"
                            : showStock
                              ? `${product.current_stock} ${product.unit}`
                              : "Disponível"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col">
            <div className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                    Mesa / Comanda
                  </span>
                  <input
                    type="text"
                    value={tableIdentifier}
                    onChange={(event) => setTableIdentifier(event.target.value)}
                    placeholder="Mesa 04"
                    className="mt-1 h-10 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                  />
                </label>
                <label className="block">
                  <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                    Cliente (opcional)
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Nome"
                    className="mt-1 h-10 w-full rounded-md border border-background-300 bg-background-50 px-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                  />
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-background-200/70 px-5 py-4 scroll-thin">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-background-300 px-4 py-10 text-center">
                  <i className="ri-shopping-bag-3-line text-2xl text-foreground-300" />
                  <p className="text-sm text-foreground-500">
                    Toque nos itens do cardápio para montar o pedido.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.map((line) => (
                    <li
                      key={line.productId}
                      className="rounded-md border border-background-300/70 bg-background-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-foreground-950">
                          {line.name}
                        </p>
                        <span className="numeric text-sm font-semibold text-foreground-800">
                          {currency.format(line.price * line.quantity)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-md border border-background-300 p-0.5">
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.productId, -1)}
                            aria-label="Diminuir"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-foreground-600 transition-colors hover:bg-background-200"
                          >
                            <i className="ri-subtract-line" />
                          </button>
                          <span className="numeric w-8 text-center text-sm font-semibold text-foreground-950">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(line.productId, 1)}
                            aria-label="Aumentar"
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-foreground-600 transition-colors hover:bg-background-200"
                          >
                            <i className="ri-add-line" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.productId, -line.quantity)}
                          className="cursor-pointer text-xs text-foreground-500 transition-colors hover:text-primary-600"
                        >
                          Remover
                        </button>
                      </div>
                      <input
                        type="text"
                        value={line.notes}
                        onChange={(event) =>
                          setLineNotes(line.productId, event.target.value)
                        }
                        placeholder="Observação do item (ex: sem açúcar)"
                        className="mt-2 h-9 w-full rounded-md border border-background-300 bg-background-50 px-3 text-xs text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-background-300/60 px-5 py-4">
              <label className="block">
                <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                  Observações gerais
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value.slice(0, 300))}
                  rows={2}
                  placeholder="Ex: levar tudo junto na bandeja"
                  className="mt-1 w-full resize-none rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                />
              </label>

              <div className="flex items-center justify-between">
                <span className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
                  Total do pedido
                </span>
                <span className="numeric font-heading text-xl font-semibold text-foreground-950">
                  {currency.format(total)}
                </span>
              </div>

              {formError && (
                <p className="flex items-center gap-1.5 rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-800">
                  <i className="ri-error-warning-line" />
                  {formError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  disabled={submitting || cart.length === 0}
                  className="cursor-pointer whitespace-nowrap rounded-md border border-background-300 px-4 py-2.5 text-sm text-foreground-600 transition-colors hover:bg-background-100 disabled:opacity-50"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => void handleDispatch()}
                  disabled={submitting || cart.length === 0}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <i className="ri-loader-4-line animate-spin text-base" />
                  ) : (
                    <i className={`${submitIcon} text-base`} />
                  )}
                  {submitLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}