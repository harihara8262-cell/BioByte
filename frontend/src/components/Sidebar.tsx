import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Scan, 
  Leaf, 
  Calendar, 
  Bell, 
  BarChart2, 
  Settings,
  Flame,
  Users
} from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [notifCount, setNotifCount] = useState(0);

  // Fetch notification count
  const fetchNotifCount = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifCount(data.length);
      }
    } catch (err) {
      console.error("Failed to fetch notification count", err);
    }
  };

  useEffect(() => {
    fetchNotifCount();
    // Poll every 10 seconds for updates
    const interval = setInterval(fetchNotifCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { id: "myplants", label: "Dashboard", icon: LayoutDashboard },
    { id: "scanner", label: "AI Scanner", icon: Scan },
    { id: "allplants", label: "My Plants", icon: Leaf },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { 
      id: "notifications", 
      label: "Notifications", 
      icon: Bell, 
      badge: notifCount > 0 ? notifCount : undefined 
    },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "community", label: "Community", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 h-screen glass-panel border-r border-bio-card-border flex flex-col justify-between py-6 px-4 shrink-0 z-10 font-sans">
      <div className="flex flex-col gap-8">
        {/* Brand / Logo */}
        <div 
          onClick={() => setActiveTab("home")} 
          className="flex items-center gap-3 px-3 cursor-pointer group"
        >
          <div className="p-2 bg-gradient-to-tr from-bio-emerald to-bio-light-emerald rounded-xl shadow-neon-emerald">
            <Flame className="w-6 h-6 text-bio-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider font-sans text-white group-hover:text-bio-light-emerald transition-colors">
              Bio<span className="text-bio-emerald">Byte</span>
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-emerald-500/60 font-semibold">
              AI Plant Engine
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  isActive 
                    ? "text-bio-light-emerald font-semibold" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-emerald-950/20"
                }`}
              >
                {/* Active Glow Accent */}
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-gradient-to-r from-bio-emerald/10 to-transparent border-l-2 border-bio-emerald rounded-r-none rounded-l-md"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <div className="flex items-center gap-3 z-10">
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${
                    isActive ? "text-bio-emerald scale-110" : "group-hover:scale-105"
                  }`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="z-10 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-3 border-t border-bio-card-border/30 pt-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-bio-glow-green animate-ping" />
          <span className="text-xs text-slate-500">FastAPI Server Connected</span>
        </div>
        <span className="text-[10px] text-slate-600">BioByte v1.1.0</span>
      </div>
    </div>
  );
}
