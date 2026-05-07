import { Hero } from "@/components/Hero";
import { Section } from "@/components/Section";
import { Timeline } from "@/components/Timeline";
import { RemindersCard } from "@/components/RemindersCard";
import { NewsCard } from "@/components/NewsCard";
import { MailSummary } from "@/components/MailSummary";
import { DayHeader } from "@/components/DayHeader";

export default function TodayPage() {
  return (
    <div className="space-y-6">
      <DayHeader />

      <Hero />

      <Section title="La tua giornata">
        <Timeline />
      </Section>

      <Section title="Da ricordare">
        <RemindersCard />
      </Section>

      <Section title="Mail">
        <MailSummary />
      </Section>

      <Section title="Notizie">
        <NewsCard />
      </Section>
    </div>
  );
}
