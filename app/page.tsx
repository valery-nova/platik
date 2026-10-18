import Image from "next/image";
import Link from "next/link";
import { YearNote } from "@/components/year-note";
import {
  ArrowRight,
  BarChart3,
  Coins,
  MessageCircle,
  PiggyBank,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const PASOS = [
  {
    mascota: "/brand/mascot_analiza.png",
    titulo: "Analiza y piensa",
    texto: "Registra tus ingresos y gastos; PLATIK convierte tus datos en respuestas claras.",
  },
  {
    mascota: "/brand/mascot_explica.png",
    titulo: "Explica y guía",
    texto: "Tus números, en lenguaje sencillo: márgenes, categorías y evolución mes a mes.",
  },
  {
    mascota: "/brand/mascot_celebra.png",
    titulo: "Celebra tus metas",
    texto: "Define metas de ahorro —incluso en dólares digitales— y mira tu progreso.",
  },
];

const BENEFICIOS = [
  {
    icon: Wallet,
    titulo: "Control real de tu dinero",
    texto: "Ingresos, costos y gastos en un solo lugar, sin hojas de cálculo.",
  },
  {
    icon: BarChart3,
    titulo: "Números que se entienden",
    texto: "Ganancia neta, margen y distribución explicados sin contabilidad.",
  },
  {
    icon: PiggyBank,
    titulo: "Metas de ahorro",
    texto: "Reserva para tu negocio con seguimiento visual de cada meta.",
  },
  {
    icon: Coins,
    titulo: "Ahorro en dólares digitales",
    texto: "Conoce cómo USDC y la red Stellar pueden proteger tu esfuerzo.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-marfil">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-petroleo/8 bg-marfil/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Image
            src="/brand/logo_horizontal.png"
            alt="PLATIK"
            width={150}
            height={42}
            className="h-9 w-auto"
            priority
          />
          <Link
            href="/panel"
            className="inline-flex items-center gap-2 rounded-xl bg-petroleo px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-petroleo-800"
          >
            Entrar al panel
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-menta/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-lavanda/20 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <div className="anim-fade-up">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-menta-100 px-3.5 py-1.5 text-xs font-semibold text-menta-700">
              <ShieldCheck size={14} />
              Hecho para emprendedores de Bolivia
            </span>
            <h1 className="text-4xl font-bold leading-tight text-petroleo sm:text-5xl">
              Entiende tu dinero.
              <br />
              Decide mejor.
              <br />
              <span className="text-menta-600">Haz crecer tu negocio.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-tinta-suave">
              PLATIK es tu copiloto financiero: convierte tus ingresos y gastos en
              explicaciones claras, metas de ahorro y decisiones fáciles — sin
              saber contabilidad.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/panel"
                className="inline-flex items-center gap-2 rounded-2xl bg-petroleo px-6 py-3.5 font-semibold text-white shadow-lg shadow-petroleo/20 transition-transform hover:-translate-y-0.5 hover:bg-petroleo-800"
              >
                Probar la demostración
                <ArrowRight size={18} />
              </Link>
              <span className="text-sm text-tinta-suave">
                Sin registro · datos de ejemplo
              </span>
            </div>
          </div>
          <div className="anim-fade-up relative flex justify-center [animation-delay:120ms]">
            <Image
              src="/brand/mascot_main.png"
              alt="Ajolote, mascota oficial de PLATIK"
              width={420}
              height={342}
              className="anim-float h-auto w-full max-w-sm object-contain drop-shadow-xl"
              priority
            />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-2xl border border-petroleo/10 bg-white px-5 py-3 text-center shadow-lg">
              <p className="text-sm font-medium text-petroleo">
                Tu aliado en cada paso
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-petroleo sm:text-3xl">
          Así de simple funciona
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-tinta-suave">
          Tres pasos para pasar de números sueltos a decisiones claras.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PASOS.map((paso, i) => (
            <div
              key={paso.titulo}
              className="anim-fade-up rounded-3xl border border-petroleo/8 bg-white p-6 text-center shadow-[0_1px_3px_rgba(11,61,59,0.06)]"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Image
                src={paso.mascota}
                alt=""
                width={150}
                height={150}
                className="mx-auto h-32 w-auto object-contain"
              />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-menta-600">
                Paso {i + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-petroleo">
                {paso.titulo}
              </h3>
              <p className="mt-2 text-sm text-tinta-suave">{paso.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios + vista previa */}
      <section className="bg-white/60 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-petroleo sm:text-3xl">
                Finanzas claras. Decisiones inteligentes.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {BENEFICIOS.map((b) => (
                  <div
                    key={b.titulo}
                    className="rounded-2xl border border-petroleo/8 bg-white p-5"
                  >
                    <div className="mb-3 inline-flex rounded-xl bg-menta-100 p-2.5 text-menta-700">
                      <b.icon size={20} />
                    </div>
                    <h3 className="font-semibold text-petroleo">{b.titulo}</h3>
                    <p className="mt-1.5 text-sm text-tinta-suave">{b.texto}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Vista previa del panel */}
            <div className="rounded-3xl border border-petroleo/10 bg-gradient-to-b from-petroleo to-petroleo-800 p-5 shadow-xl">
              <p className="mb-4 text-sm font-medium text-menta-100">
                Vista previa del panel
              </p>
              <div className="rounded-2xl bg-marfil p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-tinta-suave">Ganancia neta · mes</p>
                    <p className="text-2xl font-bold text-petroleo">Bs 3.240,00</p>
                  </div>
                  <span className="rounded-full bg-menta-100 px-3 py-1 text-xs font-semibold text-menta-700">
                    Margen 30%
                  </span>
                </div>
                <div className="mt-5 flex h-28 items-end gap-2">
                  {[45, 60, 52, 78, 66, 90].map((h, i) => (
                    <div key={i} className="flex-1">
                      <div
                        className="rounded-t-lg bg-menta"
                        style={{ height: `${h * 0.85}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-menta-50 py-2">
                    <p className="font-semibold text-menta-700">Ingresos</p>
                  </div>
                  <div className="rounded-xl bg-coral-50 py-2">
                    <p className="font-semibold text-coral-600">Gastos</p>
                  </div>
                  <div className="rounded-xl bg-lavanda-50 py-2">
                    <p className="font-semibold text-lavanda-600">Metas</p>
                  </div>
                </div>
              </div>
              <Link
                href="/panel"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-menta hover:underline"
              >
                Explorar con datos de demostración
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Ahorro en dólares digitales */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-petroleo via-petroleo-800 to-petroleo-600 p-8 text-white sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <span className="mb-4 inline-block rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-menta">
                Próximamente · USDC + Stellar
              </span>
              <h2 className="text-2xl font-bold sm:text-3xl">
                Ahorra en dólares digitales
              </h2>
              <p className="mt-4 max-w-xl text-white/80">
                PLATIK te prepara para conectar tus metas de ahorro con USDC en la
                red Stellar: una forma de reservar valor en dólares digitales sin
                complicaciones. En esta versión, las metas son registros internos
                de demostración — todavía no representan fondos en una blockchain.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-menta" />
                  BOB para tu día a día, USD y USDC para tus metas.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-menta" />
                  Sin promesas de rentabilidad: tú decides cuánto reservar.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-menta" />
                  Integración verificable en Stellar Testnet en la fase final.
                </li>
              </ul>
            </div>
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-3xl bg-white/10">
              <Coins size={64} className="text-menta" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-menta/30 bg-menta-50 px-6 py-14 text-center">
          <Image
            src="/brand/mascot_celebra.png"
            alt=""
            width={140}
            height={140}
            className="h-28 w-auto object-contain"
          />
          <h2 className="max-w-xl text-2xl font-bold text-petroleo sm:text-3xl">
            Empieza hoy: ahorra hoy, construye mañana.
          </h2>
          <Link
            href="/panel"
            className="inline-flex items-center gap-2 rounded-2xl bg-petroleo px-7 py-3.5 font-semibold text-white shadow-lg shadow-petroleo/20 transition-transform hover:-translate-y-0.5"
          >
            Entrar a mi panel
            <ArrowRight size={18} />
          </Link>
          <p className="text-sm text-tinta-suave">
            <MessageCircle size={14} className="mr-1 inline" />
            El copiloto con IA llega en la siguiente fase.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-petroleo/8 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Image
            src="/brand/logo_full.png"
            alt="PLATIK — Tu copiloto financiero con IA"
            width={200}
            height={81}
            className="h-14 w-auto"
          />
          <YearNote />
        </div>
      </footer>
    </div>
  );
}
