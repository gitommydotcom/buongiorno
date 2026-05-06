import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-4">
      <header className="mb-2 animate-fade-in">
        <p className="text-xs uppercase tracking-widest text-muted">configura la tua app</p>
        <h1 className="font-serif text-3xl font-semibold leading-tight">Impostazioni</h1>
      </header>
      <SettingsForm initial={settings} />

      <div className="card p-4 text-sm">
        <h3 className="mb-2 font-semibold">Integrazioni</h3>
        <ul className="space-y-1 text-muted">
          <li>
            Apple Calendar/Promemoria: configurato via env vars
            <code className="mx-1 rounded bg-bg px-1.5 py-0.5 text-xs">ICLOUD_USERNAME</code>
            +
            <code className="mx-1 rounded bg-bg px-1.5 py-0.5 text-xs">ICLOUD_APP_PASSWORD</code>
          </li>
          <li>
            Gmail: <a className="text-accent underline" href="/api/gmail/auth">collega o ricollega</a>
          </li>
          <li>Groq AI: configurato via <code className="mx-1 rounded bg-bg px-1.5 py-0.5 text-xs">GROQ_API_KEY</code></li>
          <li>TomTom traffico: configurato via <code className="mx-1 rounded bg-bg px-1.5 py-0.5 text-xs">TOMTOM_API_KEY</code></li>
        </ul>
      </div>
    </div>
  );
}
