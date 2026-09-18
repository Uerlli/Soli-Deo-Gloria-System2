import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BrandMark from "@/components/feature/BrandMark";
import BrandLogo from "@/components/feature/BrandLogo";

interface NavItem {
  label: string;
  to: string;
  icon: string;
  adminOnly?: boolean;
  available: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "PDV", to: "/pdv", icon: "ri-store-2-line", available: true },
  { label: "Balcão (KDS)", to: "/balcao", icon: "ri-fire-line", available: true },
  { label: "Estoque", to: "/estoque", icon: "ri-archive-2-line", available: true },
  { label: "Comandas", to: "/comandas", icon: "ri-restaurant-2-line", available: true },
  { label: "Vendas", to: "/vendas", icon: "ri-receipt-line", adminOnly: true, available: false },
  { label: "Relatórios", to: "/relatorios", icon: "ri-bar-chart-2-line", adminOnly: true, available: false },
  { label: "Usuários", to: "/usuarios", icon: "ri-group-line", adminOnly: true, available: false },
  { label: "Configurações", to: "/configuracoes", icon: "ri-settings-3-line", adminOnly: true, available: false },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === "admin";

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const initials = (profile?.name || profile?.email || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-background-50">
      <div className="flex items-center px-5 py-6">
        <BrandLogo heightClass="h-12" colorClass="text-foreground-950" />
      </div>

      <div className="px-5 pb-3">
        <span className="font-label text-[10px] uppercase tracking-[0.22em] text-foreground-500">
          Operação
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 scroll-thin">
        {items.map((item) =>
          item.available ? (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-primary-500 text-background-50"
                    : "text-foreground-700 hover:bg-background-200/70",
                ].join(" ")
              }
            >
              <i className={`${item.icon} text-lg`} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ) : (
            <div
              key={item.to}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground-400"
              title="Disponível em breve"
            >
              <i className={`${item.icon} text-lg`} />
              <span className="font-medium">{item.label}</span>
              <span className="ml-auto rounded-full bg-background-200/80 px-2 py-0.5 font-label text-[9px] uppercase tracking-wider text-foreground-500">
                breve
              </span>
            </div>
          )
        )}
      </nav>

      <div className="border-t border-background-300/60 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-background-100 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-500 text-xs font-semibold text-background-50">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground-950">
              {profile?.name || "Usuário"}
            </p>
            <p className="font-label text-[10px] uppercase tracking-wider text-foreground-500">
              {isAdmin ? "Administrador" : "Atendente"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sair"
            aria-label="Sair"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground-500 transition-colors hover:bg-background-200 hover:text-primary-600"
          >
            <i className="ri-logout-box-r-line text-lg" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-100">
      <aside className="hidden w-[264px] shrink-0 border-r border-background-300/60 lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground-950/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[264px] animate-slide-left border-r border-background-300/60">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-background-300/60 bg-background-50/80 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-foreground-700 hover:bg-background-200"
          >
            <i className="ri-menu-line text-xl" />
          </button>
          <BrandMark size="sm" showSubtitle={false} />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}