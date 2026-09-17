import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoginAside from "@/pages/login/components/LoginAside";
import BrandLogo from "@/components/feature/BrandLogo";

interface LocationState {
  from?: string;
}

const DEMO_ACCOUNTS = [
  { label: "Administrador", username: "admin", password: "admin123" },
  { label: "Atendente", username: "atendente", password: "atendente123" },
];

export default function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate(state?.from ?? "/pdv", { replace: true });
    }
  }, [loading, session, navigate, state]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Informe seu usuário e sua senha.");
      return;
    }

    setSubmitting(true);
    const result = await signIn(username, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate(state?.from ?? "/pdv", { replace: true });
  };

  const fillDemo = (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full bg-background-50">
      <LoginAside />

      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-[380px] animate-fade-up">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <BrandLogo
              heightClass="h-16"
              colorClass="text-foreground-950"
              className="lg:hidden"
            />
            <h1 className="mt-6 font-heading text-2xl font-medium text-foreground-950 lg:mt-0">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-foreground-600">
              Acesse com suas credenciais para iniciar o expediente.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-username"
                className="mb-1.5 block font-label text-xs font-medium uppercase tracking-wider text-foreground-600"
              >
                Usuário
              </label>
              <div className="relative">
                <i className="ri-user-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-foreground-400" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="seu.usuario"
                  className="h-11 w-full rounded-md border border-background-300 bg-background-50 pl-10 pr-3 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block font-label text-xs font-medium uppercase tracking-wider text-foreground-600"
              >
                Senha
              </label>
              <div className="relative">
                <i className="ri-lock-2-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-foreground-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-md border border-background-300 bg-background-50 pl-10 pr-11 text-sm text-foreground-950 outline-none transition-colors placeholder:text-foreground-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-foreground-500 transition-colors hover:bg-background-100 hover:text-foreground-800"
                >
                  <i
                    className={`${showPassword ? "ri-eye-off-line" : "ri-eye-line"} text-base`}
                  />
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2.5 text-sm text-primary-800 animate-fade-in"
              >
                <i className="ri-error-warning-line mt-0.5 text-base" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary-500 font-medium text-background-50 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg" />
                  Entrando…
                </>
              ) : (
                <>
                  Entrar
                  <i className="ri-arrow-right-line text-lg" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-background-300/70 bg-background-100/70 p-4">
            <button
              type="button"
              onClick={() => setShowDemo((prev) => !prev)}
              className="flex w-full cursor-pointer items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 font-label text-[11px] font-medium uppercase tracking-wider text-foreground-600">
                <i className="ri-key-2-line text-base" />
                Acesso de demonstração
              </span>
              <i
                className={`${showDemo ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} text-lg text-foreground-500`}
              />
            </button>

            {showDemo && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.username}
                    type="button"
                    onClick={() => fillDemo(account.username, account.password)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-background-300/70 bg-background-50 px-3 py-2 text-left transition-colors hover:border-primary-300"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground-900">
                        {account.label}
                      </p>
                      <p className="truncate text-[11px] text-foreground-500">
                        @{account.username}
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-secondary-100 px-2.5 py-1 font-label text-[10px] uppercase tracking-wider text-secondary-900">
                      usar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}