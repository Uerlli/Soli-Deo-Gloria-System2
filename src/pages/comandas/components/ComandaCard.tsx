import type { Comanda } from "@/pages/comandas/utils";
import { COMANDA_STATUS_META, currency, formatClock } from "@/pages/comandas/utils";

interface ComandaCardProps {
  comanda: Comanda;
  onOpen: (comanda: Comanda) => void;
}

export default function ComandaCard({ comanda, onOpen }: ComandaCardProps) {
  const statusCount = new Map<string, number>();
  comanda.orders.forEach((order) => {
    const meta = COMANDA_STATUS_META[order.status];
    statusCount.set(meta.label, (statusCount.get(meta.label) ?? 0) + 1);
  });

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-background-300/60 bg-background-50 transition-colors duration-150 hover:border-primary-300">
      <header className="flex items-start justify-between gap-3 border-b border-background-200/70 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-800">
            <i className="ri-restaurant-2-line text-xl" />
          </span>
          <div>
            <h3 className="font-heading text-lg font-medium leading-tight text-foreground-950">
              {comanda.label}
            </h3>
            <p className="mt-0.5 text-xs text-foreground-500">
              {comanda.orders.length} pedido{comanda.orders.length === 1 ? "" : "s"} ·{" "}
              {comanda.itemCount} item{comanda.itemCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <span className="numeric shrink-0 rounded-full bg-background-100 px-2.5 py-1 text-xs font-semibold text-foreground-700">
          {formatClock(comanda.latestAt)}
        </span>
      </header>

      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {Array.from(statusCount.entries()).map(([label, count]) => {
          const meta = Object.values(COMANDA_STATUS_META).find(
            (item) => item.label === label
          );
          return (
            <span
              key={label}
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 font-label text-[10px] uppercase tracking-wider ${
                meta?.className ?? "bg-background-200 text-foreground-700"
              }`}
            >
              {count} {label}
            </span>
          );
        })}
      </div>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-background-200/70 px-4 py-3">
        <div>
          <p className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
            Total acumulado
          </p>
          <p className="numeric font-heading text-lg font-semibold text-foreground-950">
            {currency.format(comanda.total)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(comanda)}
          className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600"
        >
          <i className="ri-file-list-3-line text-lg" />
          Abrir comanda
        </button>
      </footer>
    </article>
  );
}