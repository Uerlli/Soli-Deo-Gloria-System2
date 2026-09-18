import OrderComposer, { type ComposerSeed } from "@/components/feature/OrderComposer";

interface OrderSystemModalProps {
  open: boolean;
  seed: ComposerSeed | null;
  onClose: () => void;
  onDispatched: (message: string) => void;
}

/**
 * Sistema de Pedidos do PDV. Mesmo carrinho do simulador do Balcão, porém
 * grava os pedidos com a etiqueta "pdv" (venda real).
 */
export default function OrderSystemModal({
  open,
  seed,
  onClose,
  onDispatched,
}: OrderSystemModalProps) {
  return (
    <OrderComposer
      open={open}
      source="pdv"
      eyebrow="Venda no balcão"
      title="Sistema de Pedidos"
      subtitle="Monte o pedido, informe a mesa e envie para o preparo. Registrado como venda real."
      submitLabel="Lançar pedido"
      seed={seed}
      onClose={onClose}
      onDispatched={onDispatched}
    />
  );
}