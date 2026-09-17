import { Link } from "react-router-dom";
import BrandMark from "@/components/feature/BrandMark";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center px-6 py-16 text-center">
      <BrandMark size="sm" showSubtitle={false} />
      <p className="mt-6 font-heading text-5xl font-medium text-foreground-950">404</p>
      <p className="mt-3 max-w-sm text-sm text-foreground-600">
        Esta página não existe — ou ainda não faz parte do sistema.
      </p>
      <Link
        to="/pdv"
        className="mt-6 inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-primary-500 px-4 py-2.5 text-sm font-medium text-background-50 transition-colors hover:bg-primary-600"
      >
        <i className="ri-arrow-left-line text-base" />
        Voltar ao PDV
      </Link>
    </div>
  );
}