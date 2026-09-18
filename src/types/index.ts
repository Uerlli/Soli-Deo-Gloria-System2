export type UserRole = "admin" | "attendant";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  price: number;
  active: boolean;
  requires_preparation: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = "cash" | "pix" | "card";

export type SaleStatus = "pending" | "paid" | "cancelled";

/** Ciclo de vida de um pedido no balcão de preparo (KDS). */
export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  /** Item já entregue ao cliente (usado para os itens de entrega imediata). */
  delivered: boolean;
  /** Item cancelado individualmente dentro do pedido. */
  cancelled: boolean;
  /** true = passa pela fila de preparo; false = entrega imediata no caixa. */
  requires_preparation: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  external_id: string | null;
  order_number: string | null;
  table_identifier: string | null;
  customer_name: string | null;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  source: string;
  payment_method: PaymentMethod | null;
  /** true = pedido pertence a uma comanda que acumula rodadas. */
  create_comanda: boolean;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

/** Item enviado no payload de ingestão (webhook ou simulador). */
export interface OrderIngestItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string | null;
}

/** Payload normalizado aceito pela função `ingest_order`. */
export interface OrderIngestPayload {
  external_id?: string | null;
  order_number?: string | null;
  table_identifier?: string | null;
  customer_name?: string | null;
  status?: OrderStatus;
  total_amount?: number;
  notes?: string | null;
  source?: string;
  payment_method?: PaymentMethod | null;
  create_comanda?: boolean;
  items: OrderIngestItem[];
}