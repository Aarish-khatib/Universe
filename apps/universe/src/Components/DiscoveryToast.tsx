/* ============================================================
   DiscoveryToast.tsx  v1
   Cinematic first-discovery toast notifications.
   Subscribes to DiscoveryNotificationQueue and renders
   beautiful animated toasts at bottom-right of HUD.
   ============================================================ */

import { useEffect, useState, useCallback } from "react";
import type { DiscoveryNotification, DiscoveryNotificationQueue, NotificationTier } from "@known-universe/engine";

const TIER_STYLES: Record<NotificationTier, { border: string; glow: string; bg: string; headlineColor: string }> = {
  common:    { border: "rgba(120,160,220,0.25)", glow: "none", bg: "rgba(8,14,28,0.92)", headlineColor: "#a8c8e8" },
  notable:   { border: "rgba(200,170,80,0.40)",  glow: "0 0 20px rgba(200,170,80,0.15)", bg: "rgba(10,14,24,0.94)", headlineColor: "#d4b840" },
  rare:      { border: "rgba(100,180,255,0.50)",  glow: "0 0 30px rgba(80,150,255,0.20)", bg: "rgba(6,12,28,0.96)", headlineColor: "#6ec8ff" },
  legendary: { border: "rgba(80,220,120,0.60)",   glow: "0 0 40px rgba(60,200,100,0.30)", bg: "rgba(4,14,10,0.97)", headlineColor: "#4cdf78" },
};

interface ToastItemProps {
  notification: DiscoveryNotification;
  onDismiss: (id: string) => void;
  onFlyTo?: (entityId: string) => void;
  index: number;
}

function ToastItem({ notification, onDismiss, onFlyTo, index }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const remaining = notification.expiresAt - Date.now();
    const t2 = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(notification.id), 400);
    }, Math.max(remaining - 400, 500));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [notification.id, notification.expiresAt, onDismiss]);

  const style = TIER_STYLES[notification.tier];
  const opacity = leaving ? 0 : visible ? 1 : 0;
  const translateY = leaving ? 8 : visible ? 0 : 16;

  return (
    <div
      onClick={() => {
        if (onFlyTo) onFlyTo(notification.entityId);
        setLeaving(true);
        setTimeout(() => onDismiss(notification.id), 400);
      }}
      style={{
        position: "relative",
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 14px",
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        boxShadow: style.glow,
        cursor: "pointer",
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: "opacity 0.35s ease, transform 0.35s ease",
        maxWidth: 300,
        userSelect: "none",
        marginBottom: index > 0 ? 8 : 0,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>{notification.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600,
          color: style.headlineColor,
          letterSpacing: "0.02em",
          marginBottom: notification.subtext ? 2 : 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {notification.headline}
        </div>
        {notification.subtext && (
          <div style={{ fontSize: 11, color: "#8899aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {notification.subtext}
          </div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); setLeaving(true); setTimeout(() => onDismiss(notification.id), 400); }}
        style={{ background: "none", border: "none", color: "#445566", cursor: "pointer", fontSize: 11, padding: "0 0 0 4px", lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

export interface DiscoveryToastProps {
  queue: DiscoveryNotificationQueue;
  onFlyTo?: (entityId: string) => void;
  maxVisible?: number;
}

export function DiscoveryToast({ queue, onFlyTo, maxVisible = 4 }: DiscoveryToastProps) {
  const [notifications, setNotifications] = useState<DiscoveryNotification[]>([]);

  useEffect(() => {
    const update = () => setNotifications([...queue.getActive()]);
    update();
    const unsub = queue.subscribe(() => update());
    const interval = setInterval(update, 1000); // purge expired
    return () => { unsub(); clearInterval(interval); };
  }, [queue]);

  const handleDismiss = useCallback((id: string) => {
    queue.dismiss(id);
    setNotifications([...queue.getActive()]);
  }, [queue]);

  const visible = notifications.slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 80,
      right: 16,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 0,
      zIndex: 950,
      fontFamily: "'Inter', 'SF Pro', sans-serif",
      pointerEvents: "auto",
    }}>
      {visible.map((n, i) => (
        <ToastItem
          key={n.id}
          notification={n}
          onDismiss={handleDismiss}
          onFlyTo={onFlyTo}
          index={i}
        />
      ))}
    </div>
  );
}

export default DiscoveryToast;
