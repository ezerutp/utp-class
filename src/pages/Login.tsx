import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { decodeJwt } from '../lib/jwt';
import { Button } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { EASE_OUT } from '../lib/motion';

const GRAB_SNIPPET = `(function(){const o=XMLHttpRequest.prototype.setRequestHeader;XMLHttpRequest.prototype.setRequestHeader=function(k,v){if(/^authorization$/i.test(k)&&/Bearer /.test(v)){const t=v.replace(/^Bearer /,'');copy(t);console.log('%c✓ Token copiado al portapapeles','color:#16a34a;font-weight:bold');}return o.apply(this,arguments)};console.log('%cListo. Haz clic en cualquier curso o menu y el token se copiara.','color:#e2001a');})();`;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [refresh, setRefresh] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const t = token.trim().replace(/^Bearer\s+/i, '');
    try {
      const c = decodeJwt(t);
      if (!c.email) throw new Error('El token no contiene email.');
      login(t, refresh.trim() || undefined);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof Error
          ? `Token inválido: ${err.message}`
          : 'No se pudo leer el token. Verifica que lo copiaste completo.',
      );
    }
  };

  const field =
    'w-full rounded-xl border border-[var(--border-strong)] bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-brand-500 transition resize-none';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* halo de marca de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60rem 40rem at 50% -10%, rgba(226,0,26,0.10), transparent 60%)',
        }}
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.form
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        onSubmit={submit}
        className="w-full max-w-[460px] rounded-3xl border border-[var(--border)] bg-surface p-8 card-shadow-lg"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-600 font-black text-white">
            U
          </span>
          <span className="text-lg font-bold tracking-tight">
            UTP<span className="text-brand-600"> class</span>
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight">Conecta tu sesión</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          Inicia sesión en <strong className="font-semibold text-fg">class.utp.edu.pe</strong> y pega
          aquí tu token de acceso para ver tus cursos.
        </p>

        <label className="mb-1.5 mt-6 block text-[13px] font-semibold" htmlFor="tok">
          Access token
        </label>
        <textarea
          id="tok"
          rows={4}
          className={field}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUI…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          spellCheck={false}
        />

        <label className="mb-1.5 mt-4 block text-[13px] font-semibold" htmlFor="rt">
          Refresh token{' '}
          <span className="font-normal text-fg-faint">· opcional, renueva sin volver a pegar</span>
        </label>
        <textarea
          id="rt"
          rows={2}
          className={field}
          placeholder="opcional"
          value={refresh}
          onChange={(e) => setRefresh(e.target.value)}
          spellCheck={false}
        />

        {error && <p className="mt-3 text-[13px] font-medium text-brand-600">{error}</p>}

        <Button type="submit" disabled={!token.trim()} className="mt-6 w-full">
          Entrar
        </Button>

        <details className="group mt-5 text-[13px]">
          <summary className="cursor-pointer font-semibold text-brand-600 marker:content-none">
            ¿Cómo obtengo mi token? ↓
          </summary>
          <div className="mt-3 space-y-3 text-fg-muted">
            <p>
              <strong className="text-fg">Un clic:</strong> en{' '}
              <code className="rounded bg-surface-2 px-1.5 py-0.5">class.utp.edu.pe</code> ya logueado,
              abre la consola (F12 → Console), pega esto y presiona Enter. Luego haz clic en cualquier
              curso: el token se copia solo.
            </p>
            <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-200">
              {GRAB_SNIPPET}
            </pre>
            <p>
              <strong className="text-fg">Manual:</strong> F12 → pestaña <em>Network</em> → filtra por{' '}
              <code className="rounded bg-surface-2 px-1.5 py-0.5">api-pao</code> → clic en una
              petición → copia el valor de <code className="rounded bg-surface-2 px-1.5 py-0.5">authorization</code>{' '}
              (lo que va después de <code>Bearer</code>).
            </p>
          </div>
        </details>
      </motion.form>
    </div>
  );
}
