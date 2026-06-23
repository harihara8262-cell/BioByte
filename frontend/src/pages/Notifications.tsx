import React, { useEffect, useState } from "react";
import { 
  Bell, 
  Droplet, 
  Sparkles, 
  AlertTriangle, 
  Info,
  CheckCircle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlantNotification {
  id: number;
  plant_id: number;
  type: "watering_overdue" | "watering_reminder" | "fertilizer_overdue" | "fertilizer_reminder" | string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info" | string;
  timestamp: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<PlantNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleWater = async (plantId: number, notifId: number) => {
    setActioningId(notifId);
    try {
      const res = await fetch(`http://localhost:8000/api/my-plants/${plantId}/water`, {
        method: "POST",
      });
      if (res.ok) {
        // Refetch notifications to clear completed one
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to execute water action", err);
    } finally {
      setActioningId(null);
    }
  };

  const handleFertilize = async (plantId: number, notifId: number) => {
    setActioningId(notifId);
    try {
      const res = await fetch(`http://localhost:8000/api/my-plants/${plantId}/fertilize`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to execute fertilize action", err);
    } finally {
      setActioningId(null);
    }
  };

  // Severity UI Styles
  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return {
          border: "border-red-500/25",
          bg: "bg-red-950/15",
          iconBg: "bg-red-500/10 text-red-400",
          accent: "text-red-400"
        };
      case "warning":
        return {
          border: "border-amber-500/25",
          bg: "bg-amber-950/15",
          iconBg: "bg-amber-500/10 text-amber-400",
          accent: "text-amber-400"
        };
      case "info":
      default:
        return {
          border: "border-bio-card-border/20",
          bg: "bg-bio-black/40",
          iconBg: "bg-bio-emerald/10 text-bio-light-emerald",
          accent: "text-bio-light-emerald"
        };
    }
  };

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5 border-b border-bio-card-border/20 pb-5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-3">
            <Bell className="w-7 h-7 text-bio-emerald" />
            Alerts & Notifications
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Stay updated with critical watering tasks and nutrient requirements.
          </p>
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="glass-panel h-24 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-panel p-16 rounded-3xl text-center flex flex-col items-center justify-center gap-5 border-bio-card-border/10">
            <div className="p-4 bg-bio-emerald/10 text-bio-glow-green rounded-full shadow-[0_0_15px_rgba(0,255,102,0.1)]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1 max-w-xs">
              <h3 className="text-lg font-bold text-white">All Plants Hydrated!</h3>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                There are no pending watering or fertilizing reminders. Your greenhouse is in excellent condition!
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {notifications.map((n) => {
                const styles = getSeverityStyles(n.severity);
                const isWater = n.type.includes("watering");
                const isFert = n.type.includes("fertilizer");
                const isActioning = actioningId === n.id;
                
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`glass-panel p-5 rounded-2xl border ${styles.border} ${styles.bg} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Left icon badge */}
                      <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>
                        {n.severity === "critical" ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : isWater ? (
                          <Droplet className="w-5 h-5" />
                        ) : isFert ? (
                          <Sparkles className="w-5 h-5" />
                        ) : (
                          <Info className="w-5 h-5" />
                        )}
                      </div>

                      {/* Content text */}
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs font-extrabold uppercase tracking-wide ${styles.accent}`}>
                          {n.title}
                        </span>
                        <p className="text-sm font-semibold text-white">{n.message}</p>
                        <span className="text-[10px] text-slate-500 font-light">
                          Due date: {new Date(n.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Actions button */}
                    <div className="shrink-0 w-full sm:w-auto">
                      {isWater ? (
                        <button
                          onClick={() => handleWater(n.plant_id, n.id)}
                          disabled={isActioning}
                          className="w-full sm:w-auto px-5 py-2.5 bg-bio-emerald text-bio-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-neon-emerald hover:scale-[1.01] transition-all"
                        >
                          {isActioning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Droplet className="w-3.5 h-3.5 text-bio-black" />
                          )}
                          <span>Water Now</span>
                        </button>
                      ) : isFert ? (
                        <button
                          onClick={() => handleFertilize(n.plant_id, n.id)}
                          disabled={isActioning}
                          className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 text-bio-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.01] transition-all"
                        >
                          {isActioning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-bio-black" />
                          )}
                          <span>Feed Now</span>
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
