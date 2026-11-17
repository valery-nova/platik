import { adminConfigured } from "@/lib/admin/auth";
import { login } from "./actions";

export const instant = false;
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = adminConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-marfil px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-petroleo/10 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-menta-700">PLATIK Founder</p>
        <h1 className="mt-2 text-2xl font-bold text-petroleo">Acceso administrativo</h1>
        {!configured ? (
          <p className="mt-4 rounded-xl bg-lavanda-50 px-4 py-3 text-sm text-tinta-suave">
            El acceso Founder está pendiente de configuración. Define{" "}
            <code>ADMIN_FOUNDER_EMAIL</code>, <code>ADMIN_FOUNDER_PASSWORD</code> y{" "}
            <code>ADMIN_SESSION_SECRET</code> en las variables de entorno del servidor.
          </p>
        ) : (
          <form action={login} className="mt-5 space-y-4">
            {error === "locked" ? (
              <p className="rounded-xl bg-lavanda-50 px-3.5 py-2.5 text-sm text-lavanda-600">
                Demasiados intentos. Espera unos minutos y vuelve a intentarlo.
              </p>
            ) : error ? (
              <p className="rounded-xl bg-coral-50 px-3.5 py-2.5 text-sm text-coral-600">
                Credenciales incorrectas.
              </p>
            ) : null}
            <label className="block text-sm font-medium text-tinta">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="mt-1 w-full rounded-xl border border-petroleo/15 px-3 py-2 text-sm outline-none focus:border-menta-500"
              />
            </label>
            <label className="block text-sm font-medium text-tinta">
              Contraseña
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-petroleo/15 px-3 py-2 text-sm outline-none focus:border-menta-500"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-petroleo px-4 py-2.5 text-sm font-semibold text-white hover:bg-petroleo-800"
            >
              Entrar
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
