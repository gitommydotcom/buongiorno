import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";
import { Timeline } from "@/components/Timeline";
import { RemindersCard } from "@/components/RemindersCard";
import { WeatherCard } from "@/components/WeatherCard";
import { TrafficCard } from "@/components/TrafficCard";
import { NewsCard } from "@/components/NewsCard";
import { MailCard } from "@/components/MailCard";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const settings = await getSettings();
  const userName = process.env.USER_NAME || "tu";

  return (
    <div className="space-y-6">
      <Hero userName={userName} />

      <Section title="Meteo" hint={settings.location.name}>
        <WeatherCard />
      </Section>

      <Section title="La tua giornata">
        <Timeline timezone={settings.location.timezone} />
      </Section>

      <Section title="Da ricordare">
        <RemindersCard />
      </Section>

      <Section title="Mail importanti">
        <MailCard />
      </Section>

      <Section title="Notizie">
        <NewsCard />
      </Section>

      <Section title="Traffico" hint={settings.location.name}>
        <TrafficCard />
      </Section>
    </div>
  );
}
