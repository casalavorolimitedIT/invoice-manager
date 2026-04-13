import { redirectIfAuthenticated } from "@/lib/redirect/redirectIfAuthenticated";
import Image from "next/image";

const authHighlights = [
  {
    label: "Invoices",
    value: "Create and send faster",
  },
  {
    label: "Clients",
    value: "Keep details organized",
  },
  {
    label: "Brand",
    value: "Stay consistent everywhere",
  },
];

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated();
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,105,0,0.18),_transparent_28%),linear-gradient(180deg,_#fffdfb_0%,_#fff6ee_46%,_#fffaf7_100%)] px-1 py-6 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[10%] h-40 w-40 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute bottom-[12%] right-[8%] h-56 w-56 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute right-[26%] top-[18%] h-px w-48 rotate-[-18deg] bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/70 bg-white/45 shadow-[0_30px_120px_rgba(65,38,8,0.12)] backdrop-blur-xl lg:grid-cols-[1.08fr_minmax(440px,0.92fr)]">
        <section className="relative hidden min-h-full overflow-hidden border-r border-white/60 px-8 py-8 lg:flex lg:flex-col lg:justify-between xl:px-12 xl:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.72),_transparent_28%),linear-gradient(145deg,_rgba(255,122,26,0.16),_rgba(255,244,232,0.92)_50%,_rgba(255,255,255,0.9)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/60 to-transparent" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-[0_14px_36px_rgba(255,105,0,0.18)] backdrop-blur">
              <Image
                src="/casalogo2.png"
                alt="Invoice Manage logo"
                width={34}
                height={34}
                className="h-8 w-8 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-600">
                Invoice Manage
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Premium invoicing workspace.
              </p>
            </div>
          </div>

          <div className="relative z-10 max-w-xl space-y-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-white/70 px-4 py-2 text-xs font-medium text-orange-700 shadow-sm backdrop-blur-sm">
                Premium invoicing workspace
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold tracking-[-0.06em] text-zinc-950 xl:text-6xl">
                Built for polished invoices.
              </h1>
              <p className="max-w-xl text-base leading-7 text-zinc-600 xl:text-lg">
                Manage clients, branding, and billing in one place.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {authHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/70 bg-white/72 p-4 shadow-[0_18px_40px_rgba(30,21,9,0.08)] backdrop-blur-sm"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-600">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-zinc-700">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="rounded-[28px] border border-white/75 bg-zinc-950 px-6 py-6 text-white shadow-[0_24px_60px_rgba(24,18,9,0.22)]">
              <p className="text-xs uppercase tracking-[0.28em] text-orange-300">
                Invoice Manage
              </p>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                Clean invoices. Faster workflow.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                One place for billing and branding
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-white/75 bg-white/78 p-5 shadow-[0_20px_50px_rgba(24,18,9,0.08)] backdrop-blur-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Simple setup
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">
                  Sign in and keep working.
                </p>
              </div>
              <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
                For teams that want invoices to look professional.
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-full items-center justify-center px-4 py-8 sm:px-8 lg:px-10 xl:px-14">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.56)_0%,_rgba(255,255,255,0.78)_100%)] lg:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(255,250,246,0.9)_48%,_rgba(255,245,238,0.82)_100%)]" />
          <div className="absolute inset-x-6 top-6 rounded-3xl border border-white/70 bg-white/55 px-5 py-4 shadow-[0_18px_40px_rgba(28,17,8,0.08)] backdrop-blur-sm lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white">
                <Image
                  src="/casalogo2.png"
                  alt="Invoice Manage logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  priority
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-600">
                  Invoice Manage
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Premium invoicing workspace.
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-24 flex w-full justify-center lg:mt-0">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
