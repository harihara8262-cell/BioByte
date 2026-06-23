import React, { useEffect, useState } from "react";
import { 
  Droplet, 
  Sparkles, 
  FileText, 
  Trash2, 
  Sun, 
  Thermometer, 
  Wind, 
  Activity, 
  MessageSquare,
  AlertCircle,
  Plus,
  Loader2,
  Calendar,
  ShieldAlert,
  Dna,
  Heart,
  TrendingUp,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PlantTemplate {
  id: number;
  name: string;
  watering_days: number;
  light: string;
  humidity: string;
  temperature: string;
  fertilizer: string;
}

interface UserPlant {
  id: number;
  plant_id: number;
  custom_name: string;
  health_status: string;
  last_watered: string;
  last_fertilized: string;
  added_at: string;
  image_url: string | null;
  notes: string | null;
  health_score: number;
  disease_detected: string;
  height_cm: number;
  growth_stage: string;
  age_days: number;
  plant: PlantTemplate;
  water_days_remaining: number;
  fertilize_days_remaining: number;
  water_overdue: boolean;
  fertilize_overdue: boolean;
  next_watering: string;
  next_fertilizing: string;
}

interface EmergencyProtocol {
  condition: string;
  recovery_steps: string[];
  treatment_recommendation: string;
}

interface MyPlantsProps {
  setActiveTab: (tab: string) => void;
}

export default function MyPlants({ setActiveTab }: MyPlantsProps) {
  const [plants, setPlants] = useState<UserPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Note dialog state
  const [activeNotePlant, setActiveNotePlant] = useState<UserPlant | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Emergency dialog state
  const [emergencyPlant, setEmergencyPlant] = useState<UserPlant | null>(null);
  const [emergencyData, setEmergencyData] = useState<EmergencyProtocol | null>(null);
  const [loadingEmergency, setLoadingEmergency] = useState(false);

  // Toggle for Digital Twin sub-view in card
  const [twinViewMap, setTwinViewMap] = useState<{ [id: number]: boolean }>({});

  const fetchPlants = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/my-plants");
      if (!res.ok) throw new Error("Could not fetch user plants.");
      const data = await res.json();
      setPlants(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleWater = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/my-plants/${id}/water`, {
        method: "POST",
      });
      if (res.ok) {
        fetchPlants();
        // If emergency dialog is open, refresh
        if (emergencyPlant && emergencyPlant.id === id) {
          setEmergencyPlant(null);
        }
      }
    } catch (err) {
      console.error("Failed to water plant", err);
    }
  };

  const handleFertilize = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/my-plants/${id}/fertilize`, {
        method: "POST",
      });
      if (res.ok) {
        fetchPlants();
      }
    } catch (err) {
      console.error("Failed to fertilize plant", err);
    }
  };

  const handleOpenNoteModal = (plant: UserPlant) => {
    setActiveNotePlant(plant);
    setNoteText(plant.notes || "");
  };

  const handleSaveNote = async () => {
    if (!activeNotePlant) return;
    setSavingNote(true);

    try {
      const formData = new FormData();
      formData.append("notes", noteText);

      const res = await fetch(`http://localhost:8000/api/my-plants/${activeNotePlant.id}/notes`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setActiveNotePlant(null);
        fetchPlants();
      }
    } catch (err) {
      console.error("Failed to save note", err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleOpenEmergency = async (plant: UserPlant) => {
    setEmergencyPlant(plant);
    setLoadingEmergency(true);
    try {
      const res = await fetch(`http://localhost:8000/api/my-plants/${plant.id}/emergency`);
      if (res.ok) {
        const data = await res.json();
        setEmergencyData(data);
      }
    } catch (err) {
      console.error("Failed to fetch emergency recovery", err);
    } finally {
      setLoadingEmergency(false);
    }
  };

  const handleDeletePlant = async (id: number) => {
    if (!confirm("Are you sure you want to remove this plant from your gardens?")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/my-plants/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPlants();
      }
    } catch (err) {
      console.error("Failed to delete plant", err);
    }
  };

  const toggleTwinView = (id: number) => {
    setTwinViewMap((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper colors for health status
  const getHealthBadgeStyles = (status: string, score: number) => {
    if (score < 50 || status.toLowerCase() === "critical") {
      return "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.15)]";
    }
    if (score < 75 || status.toLowerCase() === "needs attention") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (status.toLowerCase() === "excellent" || score >= 85) {
      return "bg-bio-glow-green/10 text-bio-glow-green border-bio-glow-green/20 shadow-[0_0_10px_rgba(0,255,102,0.15)]";
    }
    return "bg-bio-emerald/10 text-bio-light-emerald border-bio-emerald/20";
  };

  const calculateWaterProgress = (p: UserPlant) => {
    const totalDays = p.plant.watering_days;
    const remaining = p.water_days_remaining;
    if (p.water_overdue) return 0;
    
    const percentage = Math.max(0, Math.min(100, (remaining / totalDays) * 100));
    return percentage;
  };

  // Summary Metrics
  const totalCount = plants.length;
  const overdueCount = plants.filter((p) => p.water_overdue).length;
  const criticalCount = plants.filter((p) => p.health_score < 70 || p.health_status.toLowerCase() === "critical").length;

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              Greenhouse Garden
            </h2>
            <p className="text-sm text-slate-400 font-light">
              Evaluate real-time condition, monitor virtual Digital Twins, and apply recovery care treatments.
            </p>
          </div>
          
          <button
            onClick={() => setActiveTab("scanner")}
            className="px-5 py-3 bg-gradient-to-r from-bio-emerald to-emerald-600 hover:from-emerald-500 hover:to-bio-light-emerald text-bio-black font-bold rounded-xl flex items-center gap-2 shadow-neon-emerald transition-all duration-300 hover:scale-[1.02]"
          >
            <Plus className="w-5 h-5 text-bio-black" />
            <span>Scan Foliage</span>
          </button>
        </div>

        {/* Analytics Top Strip Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Plants</span>
              <span className="text-3xl font-extrabold text-white">{totalCount}</span>
            </div>
            <div className="p-3 bg-bio-emerald/10 text-bio-emerald rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Watering Alerts</span>
              <span className={`text-3xl font-extrabold ${overdueCount > 0 ? "text-amber-400 glow-text" : "text-white"}`}>
                {overdueCount} {overdueCount > 0 ? "Due" : "Ok"}
              </span>
            </div>
            <div className={`p-3 rounded-xl ${overdueCount > 0 ? "bg-amber-500/10 text-amber-400" : "bg-slate-800/10 text-slate-500"}`}>
              <Droplet className="w-6 h-6" />
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Threat Alerts</span>
              <span className={`text-3xl font-extrabold ${criticalCount > 0 ? "text-red-400 glow-text animate-pulse" : "text-white"}`}>
                {criticalCount}
              </span>
            </div>
            <div className={`p-3 rounded-xl ${criticalCount > 0 ? "bg-red-500/10 text-red-400" : "bg-slate-800/10 text-slate-500"}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-panel h-[425px] rounded-3xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && plants.length === 0 && (
          <div className="glass-panel p-16 rounded-3xl text-center flex flex-col items-center justify-center gap-5 border-bio-card-border/10">
            <div className="p-4 bg-slate-800/10 text-slate-500 rounded-2xl">
              <Activity className="w-10 h-10" />
            </div>
            <div className="flex flex-col gap-1.5 max-w-sm">
              <h3 className="text-xl font-bold text-slate-300">Your Garden is Empty</h3>
              <p className="text-sm text-slate-500 font-light">
                Use the AI scanner or click the button above to analyze and register your first houseplant!
              </p>
            </div>
            <button
              onClick={() => setActiveTab("scanner")}
              className="px-6 py-3 border border-bio-emerald/30 hover:border-bio-emerald bg-bio-emerald/5 hover:bg-bio-emerald/10 text-bio-light-emerald font-semibold rounded-xl transition-all"
            >
              Scan a Plant
            </button>
          </div>
        )}

        {/* Plants Grid */}
        {!loading && plants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plants.map((p) => {
              const waterProgress = calculateWaterProgress(p);
              const isTwinOpen = twinViewMap[p.id] || false;
              const isCritical = p.health_score < 70 || p.health_status.toLowerCase() === "critical";
              
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-panel rounded-3xl overflow-hidden flex flex-col justify-between relative group hover:shadow-neon-emerald transition-all duration-300 ${
                    isCritical ? "border-red-500/30 bg-red-950/[0.02]" : "border-bio-card-border/15"
                  }`}
                >
                  {/* Delete Button */}
                  <button 
                    onClick={() => handleDeletePlant(p.id)}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/60 backdrop-blur-md rounded-xl text-slate-400 hover:text-red-400 border border-bio-card-border/10 hover:border-red-500/20 transition-all"
                    title="Remove plant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div>
                    {/* Plant Image Area */}
                    <div className="h-44 w-full relative overflow-hidden bg-gradient-to-br from-bio-dark-green to-bio-black border-b border-bio-card-border/10">
                      {p.image_url ? (
                        <img 
                          src={`http://localhost:8000${p.image_url}`} 
                          alt={p.custom_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-bio-emerald/30">
                          <Wind className="w-16 h-16 animate-float-slow" />
                        </div>
                      )}
                      
                      {/* Health Status Badge overlay */}
                      <span className={`absolute bottom-3 left-4 border px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md ${getHealthBadgeStyles(p.health_status, p.health_score)}`}>
                        {p.health_status} ({p.health_score}%)
                      </span>

                      {/* 🚨 EMERGENCY MODE FLAG */}
                      {isCritical && (
                        <div className="absolute top-4 left-4 bg-red-600 text-white font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-md shadow-lg animate-pulse">
                          🚨 Emergency Mode
                        </div>
                      )}
                    </div>

                    {/* Toggle Sub-tabs: Telemetry vs Digital Twin */}
                    <div className="flex border-b border-bio-card-border/10 text-[10px] uppercase font-bold tracking-wider">
                      <button
                        onClick={() => setTwinViewMap({ ...twinViewMap, [p.id]: false })}
                        className={`flex-1 py-2.5 border-b-2 text-center transition-all ${
                          !isTwinOpen ? "border-bio-emerald text-bio-light-emerald" : "border-transparent text-slate-500"
                        }`}
                      >
                        Telemetry
                      </button>
                      <button
                        onClick={() => setTwinViewMap({ ...twinViewMap, [p.id]: true })}
                        className={`flex-1 py-2.5 border-b-2 text-center transition-all flex items-center justify-center gap-1 ${
                          isTwinOpen ? "border-bio-emerald text-bio-light-emerald" : "border-transparent text-slate-500"
                        }`}
                      >
                        <Dna className="w-3.5 h-3.5" />
                        Digital Twin
                      </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="p-6 flex flex-col gap-4 min-h-[190px] justify-between">
                      
                      {/* View 1: Telemetry (Default) */}
                      {!isTwinOpen && (
                        <div className="flex flex-col gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-bio-light-emerald transition-colors line-clamp-1">
                              {p.custom_name}
                            </h3>
                            <p className="text-xs text-slate-400 italic mt-0.5">{p.plant.name}</p>
                          </div>

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-3 text-xs border-y border-bio-card-border/10 py-3.5">
                            <div className="flex items-center gap-2">
                              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="text-slate-300 line-clamp-1">{p.plant.light}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Thermometer className="w-4 h-4 text-bio-emerald shrink-0" />
                              <span className="text-slate-300">{p.plant.temperature}°C</span>
                            </div>
                            <div className="flex items-center gap-2 col-span-2">
                              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-slate-300 font-light truncate">Feed: {p.plant.fertilizer}</span>
                            </div>
                          </div>

                          {/* Water Status and Progress */}
                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                                <Droplet className={`w-3.5 h-3.5 ${p.water_overdue ? "text-red-400" : "text-bio-emerald"}`} />
                                Water Status
                              </span>
                              <span className={`font-bold ${p.water_overdue ? "text-red-400 animate-pulse font-extrabold" : "text-slate-200"}`}>
                                {p.water_overdue 
                                  ? `Overdue by ${Math.abs(p.water_days_remaining)}d` 
                                  : `Due in ${p.water_days_remaining}d`}
                              </span>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-bio-card-border/10">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  p.water_overdue 
                                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" 
                                    : "bg-gradient-to-r from-bio-emerald to-bio-light-emerald shadow-neon-emerald"
                                }`}
                                style={{ width: `${p.water_overdue ? 100 : waterProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* View 2: Digital Twin Simulation Panel */}
                      {isTwinOpen && (
                        <div className="flex flex-col gap-3 font-sans">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Dna className="w-3.5 h-3.5 text-bio-light-emerald" />
                              Virtual Plant Twin
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-bio-emerald/10 text-bio-light-emerald border border-bio-emerald/20">
                              Stage: {p.growth_stage}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-2 bg-bio-black/40 border border-bio-card-border/10 p-3.5 rounded-2xl text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Virtual Age</span>
                              <span className="font-extrabold text-white">{p.age_days} Days</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-slate-500 font-medium">Simulated Height</span>
                              <span className="font-extrabold text-bio-light-emerald">{p.height_cm} cm</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 mt-2 text-[11px] text-slate-400">
                            <div className="flex justify-between border-b border-bio-card-border/5 pb-1">
                              <span>Leaf Disease Code:</span>
                              <span className={`font-bold ${p.disease_detected === "None - Healthy" ? "text-bio-glow-green" : "text-amber-400 animate-pulse"}`}>
                                {p.disease_detected}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cellular Water Charge:</span>
                              <span className="font-bold text-white">{waterProgress.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes / Emergency Quick trigger */}
                      <div className="mt-2.5">
                        {isCritical ? (
                          <button
                            onClick={() => handleOpenEmergency(p)}
                            className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/30 border border-red-500/30 text-red-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:scale-[1.01] transition-transform animate-pulse"
                          >
                            <ShieldAlert className="w-4 h-4 text-red-400" />
                            Emergency Recovery Protocol
                          </button>
                        ) : p.notes ? (
                          <div className="p-3 bg-bio-black/40 border border-bio-card-border/10 rounded-xl flex gap-2 items-start text-[11px] text-slate-400 leading-normal line-clamp-2">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                            <p>{p.notes}</p>
                          </div>
                        ) : null}
                      </div>

                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-6 pb-6 pt-2 grid grid-cols-3 gap-2 border-t border-bio-card-border/10 bg-bio-emerald/[0.01]">
                    <button
                      onClick={() => handleWater(p.id)}
                      className="py-2.5 bg-bio-emerald/10 hover:bg-bio-emerald/20 border border-bio-emerald/20 hover:border-bio-emerald/40 text-bio-light-emerald font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Droplet className="w-3.5 h-3.5 text-bio-emerald" />
                      <span>Water</span>
                    </button>
                    
                    <button
                      onClick={() => handleFertilize(p.id)}
                      className="py-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 text-emerald-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Feed</span>
                    </button>

                    <button
                      onClick={() => handleOpenNoteModal(p)}
                      className="py-2.5 bg-slate-800/10 hover:bg-slate-800/20 border border-bio-card-border/10 hover:border-bio-card-border/30 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Journal</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Journal Modal */}
      <AnimatePresence>
        {activeNotePlant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveNotePlant(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel w-full max-w-md rounded-3xl p-6 z-10 flex flex-col gap-5 shadow-neon-emerald font-sans"
            >
              <div>
                <h3 className="text-xl font-bold text-white font-sans">Plant Journal</h3>
                <p className="text-xs text-slate-400 mt-1">Log observation notes for {activeNotePlant.custom_name}</p>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write observations..."
                rows={5}
                className="glass-input p-4 rounded-xl text-sm w-full resize-none font-light leading-relaxed"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setActiveNotePlant(null)}
                  className="flex-1 py-3 border border-bio-card-border hover:bg-slate-800/10 text-slate-300 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="flex-1 py-3 bg-gradient-to-r from-bio-emerald to-emerald-600 text-bio-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
                >
                  {savingNote ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Save Entry
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Mode Drawer Modal */}
      <AnimatePresence>
        {emergencyPlant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEmergencyPlant(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel w-full max-w-lg rounded-3xl p-6 z-10 flex flex-col gap-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] border-red-500/35 font-sans"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl animate-pulse">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white font-sans flex items-center gap-1.5">
                      🚨 Recovery Protocol
                    </h3>
                    <p className="text-xs text-red-400 mt-0.5 font-bold uppercase tracking-wider">
                      {emergencyPlant.disease_detected} Detected
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEmergencyPlant(null)}
                  className="p-1.5 rounded-lg border border-bio-card-border/10 hover:bg-slate-800/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingEmergency ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-red-450 animate-spin" />
                  <span className="text-xs text-slate-400">Loading emergency steps...</span>
                </div>
              ) : (
                emergencyData && (
                  <div className="flex flex-col gap-5 text-slate-350">
                    
                    {/* Recovery list */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-450">Immediate Recovery Checklist</span>
                      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                        {emergencyData.recovery_steps.map((step, idx) => (
                          <div key={idx} className="bg-bio-black/40 border border-bio-card-border/5 p-3 rounded-xl text-xs font-light leading-relaxed">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/10 text-red-400 text-xs flex flex-col gap-1.5">
                      <span className="font-extrabold uppercase tracking-wider text-[9px]">AI Treatment Recommendation</span>
                      <p className="font-light leading-relaxed">{emergencyData.treatment_recommendation}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 border-t border-bio-card-border/10 pt-4 mt-1">
                      <button
                        onClick={() => setEmergencyPlant(null)}
                        className="flex-1 py-3 border border-bio-card-border hover:bg-slate-800/10 text-slate-300 text-xs font-semibold rounded-xl"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => handleWater(emergencyPlant.id)}
                        className="flex-1 py-3 bg-red-500 text-bio-black text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-transform shadow-lg shadow-red-500/20"
                      >
                        <Droplet className="w-4 h-4 text-bio-black" />
                        Water & Apply Treatment
                      </button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
