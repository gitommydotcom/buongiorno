import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";
import { Timeline } from "@/components/Timeline";
import { RemindersCard } from "@/components/RemindersCard";
import { NewsCard } from "@/components/NewsCard";
import { MailCard } from "@/components/MailCard";
import { DayHeader } from "@/components/DayHeader";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <DayHeader />

      <Hero />

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
    </div>
  );
}
