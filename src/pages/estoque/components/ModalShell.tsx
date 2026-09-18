import { useEffect, type ReactNode } from "react";

interface ModalShellProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  sizeClass?: string;
  /** Ação opcional exibida ao lado do título (ex.: botão "+"). */
  titleAction?: ReactNode;
}

export default function ModalShell({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  sizeClass = "max-w-lg",
  titleAction,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-foreground-950/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative flex max-h-[92vh] w-full ${sizeClass} flex-col overflow-hidden rounded-t-lg bg-background-50 sm:rounded-lg`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-background-300/60 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <i className={`${icon} text-xl`} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-medium leading-tight text-foreground-950">
                  {title}
                </h2>
                {titleAction}
              </div>
              {subtitle && (
                <p className="mt-0.5 text-xs text-foreground-500">{subtitle}</p>
              )}
            </div>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scroll-thin">
          {children}
        </div>

        <footer className="border-t border-background-300/60 px-5 py-4">
          {footer}
        </footer>
      </div>
    </div>
  );
}