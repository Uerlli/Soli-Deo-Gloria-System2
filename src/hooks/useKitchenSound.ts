import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "kds:sound";

/**
 * Som de alerta da cozinha usando a Web Audio API.
 *
 * O navegador só permite áudio após uma interação do usuário, então o áudio
 * fica bloqueado até alguém clicar em "Ativar som" — nesse clique o contexto
 * é criado/retomado e um beep de confirmação é tocado.
 */
export function useKitchenSound() {
  const [enabled, setEnabled] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) === "on");
    } catch {
      // Sem acesso ao storage — segue com o padrão (mudo).
    }
  }, []);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    return contextRef.current;
  }, []);

  const playChime = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [880, 1174.66];

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      const start = now + index * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    });
  }, [getContext]);

  const enable = useCallback(async () => {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // Ignora: o contexto será retomado na próxima tentativa.
      }
    }
    setEnabled(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "on");
    } catch {
      // Ignora falha de storage.
    }
    playChime();
  }, [getContext, playChime]);

  const disable = useCallback(() => {
    setEnabled(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "off");
    } catch {
      // Ignora falha de storage.
    }
  }, []);

  return { enabled, enable, disable, playChime };
}