import { notFound } from "next/navigation";
import { GuestForm } from "@/components/guests/guest-form";
import { getPublicGuestFormBusinessUnit } from "@/lib/supabase/business-units";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function WalkInGuestSlugPage({ params }: Props) {
  const { slug } = await params;
  const businessUnit = await getPublicGuestFormBusinessUnit(slug);

  if (!businessUnit) {
    notFound();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fdfaf7]">

      {/* ── Ambient background layers ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Warm gradient wash */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(255,140,50,0.10),transparent)]" />
        {/* Subtle corner glows */}
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-200/20 blur-[96px]" />
        <div className="absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-amber-200/20 blur-[80px]" />
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #78350f 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ── Centered content ── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">

        {/* ── Header above the card ── */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* Logo / brand mark */}
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 shadow-[0_8px_24px_rgba(249,115,22,0.35)]">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-zinc-900">
            Guest check-in
          </h1>

          {/* Business unit pill */}
          <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            <span className="text-[13px] font-medium text-zinc-600">
              {businessUnit.name}
              {businessUnit.code && (
                <span className="ml-1.5 text-zinc-400">· {businessUnit.code}</span>
              )}
            </span>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="w-full max-w-3xl!">
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/75 shadow-[0_32px_80px_rgba(50,25,0,0.11),0_2px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl">
           
            <div className="sm:px-3 sm:py-10">
              <GuestForm mode="public" publicBusinessUnit={businessUnit} />
            </div>
          </div>

          {/* ── Footer note ── */}
          <p className="mt-5 text-center text-[12px] text-zinc-400">
            Information submitted here is handled securely by{" "}
            <span className="text-zinc-500">{businessUnit.name}</span>.
          </p>
        </div>
      </div>
    </main>
  );
}