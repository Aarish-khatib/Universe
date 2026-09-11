/* ============================================================
   discovery-notification.ts  v1
   First-discovery notification queue.
   Generates cinematic "you found something" events that the
   HUD renders as beautiful toast-style notifications.
   Pure logic, no React/Three dependency.
   ============================================================ */

export const DISCOVERY_NOTIFICATION_VERSION = 1;

export type NotificationTier =
  | "common"      // Normal star system
  | "notable"     // Interesting but not rare
  | "rare"        // Anomalous, beautiful, special
  | "legendary";  // Life candidate, extreme anomaly

export interface DiscoveryNotification {
  id: string;
  tier: NotificationTier;
  icon: string;
  headline: string;
  subtext: string;
  entityId: string;
  entityKind: string;
  anomalyClasses: readonly string[];
  createdAt: number;
  expiresAt: number;
  isRead: boolean;
}

export type NotificationEvent =
  | { type: "queued"; notification: DiscoveryNotification }
  | { type: "dismissed"; id: string }
  | { type: "read"; id: string };

export type NotificationListener = (event: NotificationEvent) => void;

function uid(): string {
  return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const TIER_DURATION_MS: Record<NotificationTier, number> = {
  common: 3_000,
  notable: 5_000,
  rare: 8_000,
  legendary: 12_000,
};

export function tierForAnomalyScore(score: number, classes: readonly string[]): NotificationTier {
  if (classes.includes("life-candidate")) return "legendary";
  if (score > 0.7 || classes.includes("trinary-star") || classes.includes("ocean-world")) return "rare";
  if (score > 0.4 || classes.includes("binary-star") || classes.includes("lava-world")) return "notable";
  return "common";
}

const TIER_ICONS: Record<NotificationTier, string> = {
  common: "✦",
  notable: "★",
  rare: "⚡",
  legendary: "🌿",
};

export function buildNotification(params: {
  entityId: string;
  entityName: string;
  entityKind: string;
  anomalyScore: number;
  anomalyLabel: string;
  anomalyClasses: readonly string[];
  isFirstDiscovery: boolean;
}): DiscoveryNotification | null {
  const { entityId, entityName, entityKind, anomalyScore, anomalyLabel, anomalyClasses, isFirstDiscovery } = params;

  // Only notify on first discovery, or for rare+
  const tier = tierForAnomalyScore(anomalyScore, anomalyClasses);
  if (!isFirstDiscovery && tier === "common") return null;

  const icon = TIER_ICONS[tier];
  const now = Date.now();

  let headline: string;
  let subtext: string;

  if (tier === "legendary") {
    headline = `${icon} Remarkable Discovery`;
    subtext = `${entityName} — ${anomalyLabel}`;
  } else if (tier === "rare") {
    headline = `${icon} Unusual System`;
    subtext = `${entityName} — ${anomalyLabel}`;
  } else if (tier === "notable") {
    headline = `${icon} ${anomalyLabel}`;
    subtext = entityName;
  } else {
    headline = isFirstDiscovery ? `New ${entityKind} discovered` : `${icon} ${entityName}`;
    subtext = isFirstDiscovery ? entityName : "";
  }

  return {
    id: uid(),
    tier,
    icon,
    headline,
    subtext,
    entityId,
    entityKind,
    anomalyClasses,
    createdAt: now,
    expiresAt: now + TIER_DURATION_MS[tier],
    isRead: false,
  };
}

export class DiscoveryNotificationQueue {
  private readonly queue: DiscoveryNotification[] = [];
  private readonly listeners = new Set<NotificationListener>();
  private readonly maxQueue = 8;

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: NotificationEvent): void {
    for (const l of this.listeners) { try { l(event); } catch { /* */ } }
  }

  push(notification: DiscoveryNotification): void {
    if (this.queue.length >= this.maxQueue) {
      this.queue.shift(); // Drop oldest
    }
    this.queue.push(notification);
    this.emit({ type: "queued", notification });
  }

  dismiss(id: string): void {
    const idx = this.queue.findIndex(n => n.id === id);
    if (idx >= 0) {
      this.queue.splice(idx, 1);
      this.emit({ type: "dismissed", id });
    }
  }

  markRead(id: string): void {
    const n = this.queue.find(q => q.id === id);
    if (n && !n.isRead) {
      n.isRead = true;
      this.emit({ type: "read", id });
    }
  }

  purgeExpired(): void {
    const now = Date.now();
    const toRemove = this.queue.filter(n => n.expiresAt < now).map(n => n.id);
    for (const id of toRemove) this.dismiss(id);
  }

  getActive(): readonly DiscoveryNotification[] {
    this.purgeExpired();
    return [...this.queue];
  }

  get unreadCount(): number {
    return this.queue.filter(n => !n.isRead).length;
  }

  get hasLegendary(): boolean {
    return this.queue.some(n => n.tier === "legendary");
  }
}
