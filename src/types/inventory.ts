import type { Product } from "@/types";

/** Motivos de movimentação de estoque registrados no extrato. */
export type StockMovementType =
  | "ENTRY"
  | "SALE_DEDUCTION"
  | "WASTE"
  | "INTERNAL_CONSUMPTION"
  | "ADJUSTMENT"
  | "ORDER_CANCELLATION";

/** Linha do livro-razão de estoque (extrato auditável). */
export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost: number | null;
  reason: string | null;
  notes: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
}

/** Produto do catálogo enriquecido com o custo unitário (admin). */
export interface InventoryProduct extends Product {
  unit_cost: number;
}

/** Entrada aceita pela RPC `register_stock_movement`. */
export interface StockMovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
  unitCost?: number | null;
}

/** Ajuste de limites/custos aceito pela RPC `update_product_settings`. */
export interface ProductSettingsInput {
  productId: string;
  minimumStock?: number;
  unitCost?: number;
  price?: number;
  requiresPreparation?: boolean;
}

/** Entrada aceita pela RPC `create_product` (somente admin). */
export interface NewProductInput {
  name: string;
  category: string;
  unit: string;
  initialStock: number;
  unitCost: number;
  price: number;
  minimumStock: number;
  requiresPreparation: boolean;
}

export type InventoryConnection = "connecting" | "live" | "reconnecting";

/** Alerta emitido quando uma venda derruba o saldo para baixo/esgotado. */
export interface StockAlert {
  id: string;
  productName: string;
  status: "low" | "out";
}