import OrderComposer from "@/components/feature/OrderComposer";

interface SimulateOrderModalProps {
  open: boolean;
  onClose: () => void;
  onDispatched: (message: string) => void;
}

/**
 * Ferramenta de teste do Balcão. Continua gravando os pedidos com a etiqueta
 * "simulator" (teste), sem sujar as vendas reais feitas pelo PDV.
 */
export default function SimulateOrderModal({
  open,
  onClose,
  onDispatched,
}: SimulateOrderModalProps) {
  return (
    <OrderComposer
      open={open}
      source="simulator"
      eyebrow="Ferramenta de teste"
      title="Simular venda da Moderninha Smart 2"
      subtitle="Monte uma comanda como a maquininha enviaria e veja o balcão reagir ao vivo."
      submitLabel="Disparar simulação"
      showStock
      onClose={onClose}
      onDispatched={onDispatched}
    />
  );
}