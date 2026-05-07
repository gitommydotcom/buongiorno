export default function Loading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="mb-6">
        <div className="flex items-center gap-2 px-1">
          <div className="h-3 w-32 animate-pulse rounded-full bg-fg/15" />
          <div className="ml-auto h-7 w-20 animate-pulse rounded-full bg-fg/10" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-fg/10" />
        </div>
      </header>

      <section className="card p-5">
        <div className="mb-3 h-3 w-40 animate-pulse rounded-full bg-fg/15" />
        <div className="space-y-2.5">
          <div className="h-3 w-[92%] animate-pulse rounded-full bg-fg/15" />
          <div className="h-3 w-[78%] animate-pulse rounded-full bg-fg/15 [animation-delay:120ms]" />
          <div className="h-3 w-[88%] animate-pulse rounded-full bg-fg/15 [animation-delay:240ms]" />
          <div className="h-3 w-[64%] animate-pulse rounded-full bg-fg/15 [animation-delay:360ms]" />
        </div>
      </section>

      <div className="card animate-pulse p-4 text-sm text-muted">Carico la giornata…</div>
      <div className="card animate-pulse p-4 text-sm text-muted">Carico notizie…</div>
    </div>
  );
}
