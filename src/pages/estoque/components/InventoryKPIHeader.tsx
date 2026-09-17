import { currency } from "@/pages/estoque/utils";

interface KpiSummary {
  total: number;
  available: number;
  low: number;
  out: number;
  valuation: number;
}

interface InventoryKPIHeaderProps {
  summary: KpiSummary;
  isAdmin: boolean;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  tone: "neutral" | "secondary" | "accent" | "primary";
}

const TONES: Record<KpiCardProps["tone"], { wrap: string; icon: string; value: string }> = {
  neutral: {
    wrap: "border-background-300/70 bg-background-50",
    icon: "bg-background-200 text-foreground-700",
    value: "text-foreground-950",
  },
  secondary: {
    wrap: "border-secondary-200 bg-secondary-50",
    icon: "bg-secondary-100 text-secondary-800",
    value: "text-secondary-900",
  },
  accent: {
    wrap: "border-accent-200 bg-accent-50",
    icon: "bg-accent-100 text-accent-800",
    value: "text-accent-900",
  },
  primary: {
    wrap: "border-primary-200 bg-primary-50",
    icon: "bg-primary-100 text-primary-700",
    value: "text-primary-800",
  },
};

function KpiCard({ label, value, hint, icon, tone }: KpiCardProps) {
  const styles = TONES[tone];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3.5 ${styles.wrap}`}>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
      >
        <i className={`${icon} text-xl`} />
      </span>
      <div className="min-w-0">
        <p className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
          {label}
        </p>
        <p className={`numeric mt-0.5 text-2xl font-semibold leading-tight ${styles.value}`}>
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-foreground-500">{hint}</p>
      </div>
    </div>
  );
}

export default function InventoryKPIHeader({ summary, isAdmin }: InventoryKPIHeaderProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
        isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"
      }`}
    >
      <KpiCard
        label="Produtos registrados"
        value={summary.total}
        hint="Itens ativos no catálogo"
        icon="ri-archive-2-line"
        tone="neutral"
      />
      <KpiCard
        label="Estoque regular"
        value={summary.available}
        hint="Acima do mínimo de segurança"
        icon="ri-checkbox-circle-line"
        tone="secondary"
      />
      <KpiCard
        label="Estoque baixo"
        value={summary.low}
        hint="Atingiram o limite mínimo"
        icon="ri-alert-line"
        tone="accent"
      />
      <KpiCard
        label="Esgotados"
        value={summary.out}
        hint="Saldo zerado no momento"
        icon="ri-error-warning-line"
        tone="primary"
      />
      {isAdmin && (
        <KpiCard
          label="Valor em estoque"
          value={currency.format(summary.valuation)}
          hint="Custo médio × saldo atual"
          icon="ri-money-dollar-circle-line"
          tone="neutral"
        />
      )}
    </div>
  );
}