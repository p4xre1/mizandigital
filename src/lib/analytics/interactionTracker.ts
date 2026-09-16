/**
 * Interaction tracker — lightweight analytics for quiz, reactions, saves
 * Sends to Supabase page_views or a custom endpoint if available
 */

type EventType = "quiz_start" | "quiz_complete" | "reaction" | "save" | "report" | "payment_click" | "page_view";

interface TrackEvent {
  type: EventType;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
  at: string;
}

const QUEUE_KEY = "mizan:analytics:queue:v1";
const FLUSH_INTERVAL = 10000;
let queue: TrackEvent[] = [];

function readQueue(): TrackEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
  } catch {}
}

export function track(type: EventType, meta: Omit<TrackEvent, "type" | "at"> = {}) {
  const event: TrackEvent = { type, at: new Date().toISOString(), ...meta };
  queue.push(event);
  writeQueue();

  // Also try to send via navigator.sendBeacon if available
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(event)], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
    } catch {}
  }
}

export function trackQuizStart(mode: string, label: string) {
  track("quiz_start", { target_type: "quiz", target_id: mode, metadata: { label } });
}

export function trackQuizComplete(mode: string, score: number, xp: number) {
  track("quiz_complete", { target_type: "quiz", target_id: mode, metadata: { score, xp } });
}

export function trackReaction(targetType: string, targetId: string, reactionType: string) {
  track("reaction", { target_type: targetType, target_id: targetId, metadata: { reactionType } });
}

export function trackSave(targetType: string, targetId: string) {
  track("save", { target_type: targetType, target_id: targetId });
}

export function trackPaymentClick(packageSlug: string) {
  track("payment_click", { target_type: "credit_package", target_id: packageSlug });
}

// Periodic flush
if (typeof window !== "undefined") {
  queue = readQueue();
  setInterval(async () => {
    if (queue.length === 0) return;
    const toSend = [...queue];
    queue = [];
    writeQueue();
    try {
      await fetch("/api/analytics/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: toSend }),
      });
    } catch {
      // Re-queue on failure
      queue = [...toSend, ...queue].slice(-100);
      writeQueue();
    }
  }, FLUSH_INTERVAL);
}
