import React, { useEffect, useState } from "react";
import { 
  Sun, 
  Thermometer, 
  Droplets, 
  Cpu, 
  ArrowUpRight, 
  Info,
  Calendar,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

interface PlantTemplate {
  id: number;
  name: string;
  watering_days: number;
  light: string;
  humidity: string;
  temperature: string;
  fertilizer: string;
}

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [templates, setTemplates] = useState<PlantTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlants: 0,
    waterOverdue: 0,
    excellentHealth: 0
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/plants");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/my-plants");
        if (res.ok) {
          const myPlants = await res.json();
          const overdue = myPlants.filter((p: any) => p.water_overdue).length;
          const excellent = myPlants.filter((p: any) => p.health_status.toLowerCase() === "excellent").length;
          setStats({
            totalPlants: myPlants.length,
            waterOverdue: overdue,
            excellentHealth: excellent
          });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
    fetchStats();
  }, []);

  const systemMetrics = [
    { label: "Nursery Soil Temp", value: "23.4°C", icon: Thermometer, color: "text-bio-emerald", desc: "Optimal bounds 18-28°C" },
    { label: "Ambient Humidity", value: "62%", icon: Droplets, color: "text-blue-400", desc: "Ideal for tropical growth" },
    { label: "AI Engine Status", value: "Active", icon: Cpu, color: "text-bio-glow-green animate-pulse", desc: "YOLOv8 online" },
    { label: "Daily Sunlight Average", value: "6.2 Hrs", icon: Sun, color: "text-amber-400", desc: "Partial to full conditions" }
  ];

  const tips = [
    "Pruning mint stems from the top encourages horizontal branching and yields a much bushier plant.",
    "Overwatering Money Plants causes leaves to turn yellow. Let the top 2 inches of soil dry completely.",
    "Always water Rose Plants directly at the root level; wet foliage breeds black spots fungus.",
    "Hibiscus needs a potassium-rich feed and full sunlight to bloom its large, vibrant flowers."
  ];

  const [activeTip, setActiveTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              Welcome back, Botanist
            </h2>
            <p className="text-sm text-slate-400 font-light">
              Here is your BioByte smart nursery diagnostics and database telemetry.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("scanner")}
              className="px-5 py-2.5 bg-gradient-to-r from-bio-emerald to-emerald-600 hover:from-emerald-500 hover:to-bio-light-emerald text-bio-black text-xs font-bold rounded-xl flex items-center gap-2 shadow-neon-emerald transition-all hover:scale-[1.02]"
            >
              Analyze Leaf
            </button>
            <button
              onClick={() => setActiveTab("allplants")}
              className="px-5 py-2.5 border border-bio-card-border hover:border-bio-emerald/30 bg-bio-card-bg/20 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-all"
            >
              Manage Garden
            </button>
          </div>
        </div>

        {/* Dynamic Tip of the Day Strip */}
        <div className="glass-panel px-6 py-4 rounded-2xl flex items-center justify-between border-bio-emerald/20 bg-bio-emerald/[0.02] overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bio-emerald/10 text-bio-light-emerald rounded-lg">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-bio-emerald">Botanist Tip</span>
              <p className="text-xs text-slate-300 font-light mt-0.5 transition-opacity duration-500">
                {tips[activeTip]}
              </p>
            </div>
          </div>
        </div>

        {/* Telemetry Sensor Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {systemMetrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col gap-2 border-bio-card-border/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-bio-emerald/5 rounded-full blur-2xl group-hover:bg-bio-emerald/10 transition-colors" />
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</span>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div className="flex flex-col mt-2">
                  <span className="text-2xl font-black text-white">{m.value}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{m.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Registered Database Species Templates */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <div className="flex justify-between items-end border-b border-bio-card-border/20 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-bio-emerald" />
                Plant Database Library
              </h3>
              <span className="text-xs text-slate-500 font-light">{templates.length} species registered</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-panel h-36 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {templates.map((t) => (
                  <div 
                    key={t.id}
                    className="glass-panel p-5 rounded-2xl border-bio-card-border/10 hover:border-bio-emerald/20 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-extrabold text-white group-hover:text-bio-light-emerald transition-colors text-base">
                          {t.name}
                        </h4>
                        <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border border-bio-emerald/20 bg-bio-emerald/5 text-bio-light-emerald">
                          Water every {t.watering_days}d
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 mt-4 text-[11px] text-slate-400 font-light">
                        <div className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span className="line-clamp-1">{t.light}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-bio-emerald" />
                          <span>{t.temperature}°C</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-bio-card-border/10 pt-3 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Feed: {t.fertilizer}</span>
                      <button 
                        onClick={() => {
                          setActiveTab("scanner");
                        }} 
                        className="text-bio-light-emerald flex items-center gap-0.5 hover:underline font-semibold"
                      >
                        Scan matching leaf
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Mini Care Summary & Quick Actions */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Quick Stats Panel */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Garden Telemetry</h3>
              
              <div className="flex flex-col gap-4">
                {/* Stat 1 */}
                <div className="flex justify-between items-center border-b border-bio-card-border/10 pb-3">
                  <span className="text-xs text-slate-400 font-light">Total Plants Monitored</span>
                  <span className="text-base font-bold text-white">{stats.totalPlants}</span>
                </div>
                {/* Stat 2 */}
                <div className="flex justify-between items-center border-b border-bio-card-border/10 pb-3">
                  <span className="text-xs text-slate-400 font-light">Water Alert Count</span>
                  <span className={`text-base font-bold ${stats.waterOverdue > 0 ? "text-amber-400 glow-text" : "text-white"}`}>
                    {stats.waterOverdue}
                  </span>
                </div>
                {/* Stat 3 */}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-light">Excellent Health Index</span>
                  <span className="text-base font-bold text-bio-glow-green">{stats.excellentHealth}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("allplants")}
                className="w-full py-3 bg-bio-emerald/10 hover:bg-bio-emerald/20 border border-bio-emerald/30 text-bio-light-emerald font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
              >
                <ArrowUpRight className="w-4 h-4 text-bio-light-emerald" />
                Open Diagnostics
              </button>
            </div>

            {/* Quick Scanner shortcut */}
            <div className="glass-panel p-6 rounded-3xl border-bio-emerald/20 bg-gradient-to-br from-bio-dark-green/30 to-transparent flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-bio-light-emerald animate-pulse" />
                YOLOv8 Computer Vision
              </h3>
              <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                Identify Money Plants, Roses, Mint, and Hibiscus instantly with 98% accuracy.
              </p>
              <button
                onClick={() => setActiveTab("scanner")}
                className="w-full py-3 bg-gradient-to-r from-bio-emerald to-emerald-600 text-bio-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-neon-emerald hover:scale-[1.01] transition-transform"
              >
                Launch Scanner Mode
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
