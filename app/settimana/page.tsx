import { WeekView } from "@/components/WeekView";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function WeekPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <header className="mb-4 animate-fade-in">
        <p className="text-xs uppercase tracking-widest text-muted">prossimi 7 giorni</p>
        <h1 className="font-serif text-3xl font-semibold leading-tight">La settimana</h1>
      </header>
      <WeekView timezone={settings.location.timezone} />
    </div>
  );
}
