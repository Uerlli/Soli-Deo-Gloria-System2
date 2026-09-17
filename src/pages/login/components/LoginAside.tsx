import BrandLogo from "@/components/feature/BrandLogo";

export default function LoginAside() {
  return (
    <div className="relative hidden w-1/2 overflow-hidden lg:block">
      <img
        src="https://readdy.ai/api/search-image?query=Moody%20atmospheric%20specialty%20coffee%20bar%20interior%20with%20warm%20terracotta%20and%20deep%20espresso%20brown%20tones%2C%20stylized%20artistic%20editorial%20photography%2C%20soft%20directional%20window%20light%2C%20pour-over%20station%20and%20ceramic%20cups%20on%20a%20wooden%20counter%2C%20dark%20rich%20background%20with%20strong%20contrast%2C%20minimal%20elegant%20composition&width=1200&height=1600&seq=login-coffee-2026&orientation=portrait"
        alt="Interior do Café Soli Deo Gloria"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground-950/70 via-foreground-950/55 to-foreground-950/80" />

      <div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
        <div className="flex items-center gap-2 text-background-100">
          <i className="ri-cup-line text-xl" />
          <span className="font-label text-[10px] uppercase tracking-[0.3em]">
            Sistema interno
          </span>
        </div>

        <div className="max-w-md">
          <BrandLogo heightClass="h-24" colorClass="text-background-50" />
          <div className="mt-6 h-px w-16 bg-primary-400" />
          <p className="mt-6 font-body text-sm leading-relaxed text-background-200">
            Gestão de vendas, estoque e operação diária do balcão — simples para
            quem atende, precisa para quem administra.
          </p>
        </div>

        <div className="flex items-center gap-6 font-label text-[10px] uppercase tracking-[0.24em] text-background-200">
          <span className="flex items-center gap-2">
            <i className="ri-flashlight-line text-sm" /> Rápido no balcão
          </span>
          <span className="flex items-center gap-2">
            <i className="ri-shield-check-line text-sm" /> Acesso por papel
          </span>
        </div>
      </div>
    </div>
  );
}