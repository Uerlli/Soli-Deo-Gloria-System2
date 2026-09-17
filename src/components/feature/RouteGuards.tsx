import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BrandMark from "@/components/feature/BrandMark";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background-100">
        <BrandMark size="md" />
        <div className="flex items-center gap-2 text-sm text-foreground-500">
          <i className="ri-loader-4-line animate-spin text-lg" />
          Carregando o sistema…
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: "admin" | "attendant";
  children: ReactNode;
}) {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400" />
      </div>
    );
  }

  if (role === "admin" && profile.role !== "admin") {
    return <Navigate to="/pdv" replace />;
  }

  return <>{children}</>;
}