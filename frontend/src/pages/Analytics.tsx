import React, { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { BarChart2, Calendar, CheckSquare, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface WateringFreq {
  name: string;
  days: number;
}

interface HealthStatus {
  status: string;
  count: number;
}

interface WeeklyActivity {
  day: string;
  waterings: number;
  fertilizations: number;
}

interface UpcomingTask {
  id: number;
  plantName: string;
  taskType: string;
  dueDate: string;
  daysRemaining: number;
}

interface AnalyticsData {
  wateringFrequency: WateringFreq[];
  healthStatus: HealthStatus[];
  weeklyActivity: WeeklyActivity[];
  upcomingTasks: UpcomingTask[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/analytics");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch analytics data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center">
        <div className="text-center flex flex-col gap-3 items-center">
          <div className="w-8 h-8 rounded-full border-2 border-bio-emerald border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Loading analytics streams...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center">
        <span className="text-sm text-slate-500">Failed to load analytics. Ensure the backend is active.</span>
      </div>
    );
  }

  // Color mapping for Health PieChart
  const HEALTH_COLORS: { [key: string]: string } = {
    "Excellent": "#00ff66",
    "Good": "#10b981",
    "Needs Attention": "#fbbf24",
    "Critical": "#f87171"
  };

  // Filter out health statuses with count = 0 to avoid blank legend dots
  const activeHealthData = data.healthStatus.filter(h => h.count > 0);

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-xl border border-bio-card-border text-[11px] font-sans">
          <p className="font-bold text-white mb-1.5">{label}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-0.5" style={{ color: pld.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pld.color }} />
              <span className="text-slate-400 capitalize">{pld.name}:</span>
              <span className="font-extrabold">{pld.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-3">
            <BarChart2 className="w-7 h-7 text-bio-emerald" />
            BioByte Analytics
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Diagnostic care metrics, species benchmarks, and task scheduling queues.
          </p>
        </div>

        {/* Top Grid: Weekly activity & Health Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Weekly Activity LineChart */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-3xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-bio-emerald" />
                Weekly Care Activity
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">Logs of waterings and fertilizations over the past 7 days</p>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weeklyActivity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.05)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="waterings" 
                    name="waterings" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fertilizations" 
                    name="fertilizations" 
                    stroke="#fbbf24" 
                    strokeWidth={2} 
                    dot={{ strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Health Distribution PieChart */}
          <div className="lg:col-span-4 glass-panel p-6 rounded-3xl flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-bio-emerald" />
                Garden Health Ratio
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">Current proportion of plant health statuses</p>
            </div>

            <div className="h-44 w-full flex items-center justify-center">
              {activeHealthData.length === 0 ? (
                <span className="text-xs text-slate-500">No active plants registered</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                    >
                      {activeHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.status] || "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value, "Plants"]}
                      contentStyle={{
                        background: "rgba(10, 20, 15, 0.9)",
                        borderColor: "rgba(16, 185, 129, 0.2)",
                        borderRadius: "10px",
                        fontSize: "11px",
                        color: "#fff"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie Legend custom mapping */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[10px] border-t border-bio-card-border/10 pt-4">
              {data.healthStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: HEALTH_COLORS[item.status] }} />
                  <span className="text-slate-400">{item.status}:</span>
                  <span className="font-extrabold text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Grid: Watering Frequency Benchmarks & Upcoming Task Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Species Benchmarks BarChart */}
          <div className="lg:col-span-6 glass-panel p-6 rounded-3xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-bio-emerald" />
                Watering Intervals (Days)
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">Benchmarked watering frequency requirements by species</p>
            </div>
            
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.wateringFrequency} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="days" fill="#10b981" radius={[8, 8, 0, 0]}>
                    {data.wateringFrequency.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#10b981" : "#34d399"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Care Schedule Tasks */}
          <div className="lg:col-span-6 glass-panel p-6 rounded-3xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-bio-emerald" />
                Upcoming Task Queue
              </h3>
              <p className="text-xs text-slate-500 font-light mt-0.5">Chronological care schedule for the next few days</p>
            </div>

            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {data.upcomingTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No upcoming tasks registered. Gardens are all up to date!
                </div>
              ) : (
                data.upcomingTasks.slice(0, 5).map((task) => {
                  const isOverdue = task.daysRemaining < 0;
                  const isToday = task.daysRemaining === 0;
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`flex justify-between items-center px-4 py-3 rounded-xl border text-xs ${
                        isOverdue 
                          ? "bg-red-950/15 border-red-500/25" 
                          : isToday 
                            ? "bg-amber-950/15 border-amber-500/25" 
                            : "bg-bio-black/40 border-bio-card-border/10"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-white">{task.plantName}</span>
                        <span className="text-[10px] text-slate-400">{task.taskType}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-300">{task.dueDate}</span>
                        <p className={`text-[10px] font-extrabold mt-0.5 uppercase tracking-wide ${
                          isOverdue 
                            ? "text-red-400 animate-pulse" 
                            : isToday 
                              ? "text-amber-400" 
                              : "text-bio-light-emerald"
                        }`}>
                          {isOverdue 
                            ? `Overdue by ${Math.abs(task.daysRemaining)}d` 
                            : isToday 
                              ? "Due Today" 
                              : `${task.daysRemaining} days remaining`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
