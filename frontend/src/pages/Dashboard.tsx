import React, { useEffect, useState } from "react";
import { 
  Sun, 
  Thermometer, 
  Droplets, 
  Cpu, 
  ArrowUpRight, 
  Info,
  Sparkles,
  ChevronRight,
  CloudRain,
  AlertTriangle,
  Users
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

interface WeatherData {
  temperature: number;
  humidity: number;
  rain_probability: number;
  sunlight_intensity: string;
  forecast: string;
  recommendation: string;
}

interface AlertItem {
  id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
}

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ setActiveTab }: DashboardProps) {
  const [templates, setTemplates] = useState<PlantTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeatherData] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState({
    totalPlants: 0,
    waterOverdue: 0,
    excellentHealth: 0
  });

  const fetchData = async () => {
    try {
      // 1. Fetch plant templates
      const templatesRes = await fetch("http://localhost:8000/api/plants");
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data);
      }

      // 2. Fetch active garden stats
      const myPlantsRes = await fetch("http://localhost:8000/api/my-plants");
      if (myPlantsRes.ok) {
        const myPlants = await myPlantsRes.json();
        const overdue = myPlants.filter((p: any) => p.water_overdue).length;
        const excellent = myPlants.filter((p: any) => p.health_status.toLowerCase() === "excellent").length;
        setStats({
          totalPlants: myPlants.length,
          waterOverdue: overdue,
          excellentHealth: excellent
        });
      }

      // 3. Fetch Weather AI Engine
      const weatherRes = await fetch("http://localhost:8000/api/weather");
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        setWeatherData(weatherData);
      }

      // 4. Fetch Alerts / Notifications
      const alertsRes = await fetch("http://localhost:8000/api/notifications");
      if (alertsRes.ok) {
        const notifs = await alertsRes.json();
        // Filter only weather alerts or disease alerts
        const systemAlerts = notifs.filter(
          (n: any) => n.type === "weather_alert" || n.type === "disease_alert"
        );
        setAlerts(systemAlerts);
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const systemMetrics = [
    { label: "Nursery Soil Temp", value: "23.4°C", icon: Thermometer, color: "text-bio-emerald", desc: "Optimal bounds 18-28°C" },
    { label: "Ambient Humidity", value: weather ? `${weather.humidity}%` : "60%", icon: Droplets, color: "text-blue-450", desc: "Ideal for tropical growth" },
    { label: "AI Engine Status", value: "Active", icon: Cpu, color: "text-bio-glow-green animate-pulse", desc: "ByteAI & Weather AI active" },
    { label: "Daily Sunlight Average", value: weather ? weather.sunlight_intensity : "High", icon: Sun, color: "text-amber-450", desc: "Optimal solar exposure" }
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
              Telemetry indicators, active sensor feeds, and Weather AI engine updates.
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

        {/* Top: Weather AI Engine & Active Alert Banners */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Weather AI Widget */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-3xl flex flex-col gap-4 relative overflow-hidden group border-bio-emerald/30 bg-gradient-to-tr from-bio-dark-green/20 to-transparent">
            <div className="absolute top-0 right-0 w-32 h-32 bg-bio-emerald/5 rounded-full blur-3xl" />
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest bg-bio-emerald/10 text-bio-light-emerald px-2 py-0.5 rounded-full border border-bio-emerald/20">
                  Live Feed
                </span>
                <h3 className="text-base font-extrabold text-white mt-1.5 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  Weather AI Engine
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {weather ? weather.forecast : "Scattered Clouds"}
              </span>
            </div>

            {weather && (
              <div className="grid grid-cols-3 gap-4 border-y border-bio-card-border/10 py-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Temperature</span>
                  <span className="text-lg font-black text-white mt-0.5">{weather.temperature}°C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Humidity</span>
                  <span className="text-lg font-black text-white mt-0.5">{weather.humidity}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Rain Prob.</span>
                  <span className="text-lg font-black text-bio-light-emerald mt-0.5 flex items-center gap-1">
                    <CloudRain className="w-4 h-4" />
                    {weather.rain_probability}%
                  </span>
                </div>
              </div>
            )}

            {weather && (
              <div className="text-[11px] text-slate-300 font-light bg-bio-black/40 border border-bio-card-border/15 p-3 rounded-xl leading-relaxed mt-1">
                <span className="font-bold text-bio-light-emerald">AI Care Directive:</span> {weather.recommendation}
              </div>
            )}
          </div>

          {/* Active Alerts Panel */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-3xl flex flex-col gap-4 relative">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Active System Alerts
              </h3>
              <p className="text-[10px] text-slate-500 font-light mt-0.5">Critical atmospheric or disease threats detected</p>
            </div>

            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 mt-2">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-light">
                  Nursery environments are healthy. No active threat banners.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-xl border flex gap-2 items-start text-xs ${
                      alert.severity === "critical" 
                        ? "bg-red-950/15 border-red-500/25 text-red-400" 
                        : "bg-amber-950/15 border-amber-500/25 text-amber-400"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">{alert.title}</span>
                      <span className="text-[10px] text-slate-400 leading-normal">{alert.message}</span>
                    </div>
                  </div>
                ))
              )}
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

          {/* Right Column: Mini Care Summary & Community Forum Link */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Quick Stats Panel */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Garden Telemetry</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-bio-card-border/10 pb-3">
                  <span className="text-xs text-slate-400 font-light">Total Plants Monitored</span>
                  <span className="text-base font-bold text-white">{stats.totalPlants}</span>
                </div>
                <div className="flex justify-between items-center border-b border-bio-card-border/10 pb-3">
                  <span className="text-xs text-slate-400 font-light">Water Alert Count</span>
                  <span className={`text-base font-bold ${stats.waterOverdue > 0 ? "text-amber-400 glow-text" : "text-white"}`}>
                    {stats.waterOverdue}
                  </span>
                </div>
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

            {/* Quick Community Network Connection */}
            <div className="glass-panel p-6 rounded-3xl border-bio-card-border/15 bg-gradient-to-br from-bio-dark-green/10 to-transparent flex flex-col gap-4 relative overflow-hidden">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-bio-light-emerald" />
                Community Network
              </h3>
              <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                Connect with professional greenkeepers, rate care advice, and review foliar disease treatments.
              </p>
              <button
                onClick={() => setActiveTab("community")}
                className="w-full py-3 bg-gradient-to-r from-bio-emerald to-emerald-600 text-bio-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-neon-emerald hover:scale-[1.01] transition-transform animate-pulse"
              >
                Enter Community Forum
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
