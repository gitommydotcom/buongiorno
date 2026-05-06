"use client";
import { useEffect, useState } from "react";
import type { TrafficIncident } from "@/lib/traffic";
import { TriangleAlert } from "lucide-react";

export function TrafficCard() {
  const [items, setItems] = useState<TrafficIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/traffic")
      .then((r) => r.json())
      .then((d) => setItems(d.incidents ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (items.length === 0) {
    return (
      <div className="card p-4 text-sm text-muted">Nessun evento sulla viabilità nelle vicinanze.</div>
    );
  }

  return (
    <div className="card divide-y divide-border overflow-hidden">
      {items.slice(0, 6).map((t) => (
        <div key={t.id} className="flex gap-3 p-3 text-sm">
          <TriangleAlert
            size={16}
            className={t.severity >= 3 ? "text-danger mt-0.5 shrink-0" : "text-warn mt-0.5 shrink-0"}
          />
          <div className="min-w-0 flex-1">
            <div className="capitalize">{t.category} · <span className="text-muted">{t.description}</span></div>
            {(t.from || t.to) && (
              <div className="mt-0.5 text-xs text-muted">
                {t.from}{t.to ? ` → ${t.to}` : ""}
              </div>
            )}
            {t.delaySeconds && t.delaySeconds > 60 && (
              <div className="mt-0.5 text-xs text-warn">+{Math.round(t.delaySeconds / 60)} min ritardo</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
