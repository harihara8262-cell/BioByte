import React, { useState, useRef } from "react";
import { 
  Upload, 
  Cpu, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Check, 
  Loader2, 
  AlertCircle,
  AlertTriangle,
  Heart,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DetectionResult {
  plant_name: string;
  confidence: number;
  box: DetectionBox;
  disease_detected: string;
  health_score: number;
}

interface PlantQuestion {
  id: number;
  plant_name: string;
  question: string;
  answer: string;
}

interface ScannerResponse {
  success: boolean;
  detections: DetectionResult[];
  recommended_questions: PlantQuestion[];
  image_url: string;
}

interface ScannerProps {
  setActiveTab: (tab: string) => void;
}

export default function Scanner({ setActiveTab }: ScannerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<ScannerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Natural image dimensions for bounding box overlay
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 640, height: 480 });
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  // Add Plant Dialog State
  const [showAddModal, setShowAddModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [addingPlant, setAddingPlant] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadingMessages = [
    "Uploading plant image...",
    "Initializing YOLOv8 object detection engine...",
    "Extracting foliage pixel grids...",
    "Running CNN neural classification...",
    "Checking for human biometrics...",
    "Querying care recommendation database...",
    "Formatting diagnostic insights..."
  ];

  // Cycle loading messages
  const startLoadingAnimation = () => {
    setLoading(true);
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= loadingMessages.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
    return interval;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setSelectedQuestion(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!image) return;

    const loadingInterval = startLoadingAnimation();
    setError(null);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const res = await fetch("http://localhost:8000/api/detect", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process image with YOLOv8. Ensure backend is running.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      clearInterval(loadingInterval);
      setLoading(false);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const handleAddPlant = async () => {
    if (!result || !result.detections || result.detections.length === 0) return;
    
    setAddingPlant(true);
    const primary = result.detections[0];
    const plantName = primary.plant_name;
    
    // Determine status from health score
    let computedStatus = "Excellent";
    if (primary.health_score < 50) {
      computedStatus = "Needs Attention";
    } else if (primary.health_score < 75) {
      computedStatus = "Good";
    } else if (primary.health_score < 35) {
      computedStatus = "Critical";
    }

    try {
      // 1. Fetch available plant templates
      const templatesRes = await fetch("http://localhost:8000/api/plants");
      if (!templatesRes.ok) throw new Error("Could not fetch plant templates");
      const templates = await templatesRes.json();
      
      const matchedTemplate = templates.find(
        (t: any) => t.name.toLowerCase() === plantName.toLowerCase()
      );
      
      if (!matchedTemplate) {
        throw new Error(`Plant type '${plantName}' not found in templates database.`);
      }
      
      // 2. Add to User's Active Plants with AI diagnostics
      const addRes = await fetch("http://localhost:8000/api/my-plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plant_id: matchedTemplate.id,
          custom_name: customName || matchedTemplate.name,
          health_status: computedStatus,
          last_watered: new Date().toISOString(),
          last_fertilized: new Date().toISOString(),
          notes: `Added from AI Scanner detection of ${primary.disease_detected} on ${new Date().toLocaleDateString()}`,
          image_url: result.image_url,
          health_score: primary.health_score,
          disease_detected: primary.disease_detected,
          growth_stage: "Vegetative",
          age_days: 1
        })
      });
      
      if (!addRes.ok) throw new Error("Could not add plant to dashboard.");
      
      setShowAddModal(false);
      setActiveTab("allplants");
    } catch (err: any) {
      alert(err.message || "Could not add plant.");
    } finally {
      setAddingPlant(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-bio-glow-green";
    if (score >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const primaryDet = result && result.detections && result.detections.length > 0 ? result.detections[0] : null;
  const isHumanDetected = primaryDet?.plant_name === "Human Face";

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            AI Vision Diagnostics
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Scan leaves to detect species and classify foliar health diseases using YOLOv8.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Upload / Image View */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Drag & Drop Card */}
            <div 
              onDragEnter={handleDrag} 
              onDragLeave={handleDrag} 
              onDragOver={handleDrag} 
              onDrop={handleDrop}
              className={`glass-panel border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden min-h-[350px] ${
                dragActive ? "border-bio-emerald bg-bio-emerald/5 shadow-neon-emerald" : "border-bio-card-border hover:border-bio-emerald/40"
              }`}
              onClick={handleUploadClick}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleChange}
              />

              {!previewUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-bio-emerald/10 text-bio-emerald rounded-2xl group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 animate-bounce" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">Drag & drop plant image</p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse your files</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex justify-center items-center">
                  <img 
                    src={previewUrl} 
                    alt="Upload Preview" 
                    onLoad={handleImageLoad}
                    className="max-h-[400px] w-auto rounded-2xl object-contain border border-bio-card-border"
                  />
                  
                  {/* Bounding box overlay with red/green states */}
                  {result && result.detections && result.detections.map((det, index) => {
                    const imgW = naturalDimensions.width;
                    const imgH = naturalDimensions.height;
                    const isHuman = det.plant_name === "Human Face";
                    
                    // Box coordinates
                    const { x1, y1, x2, y2 } = det.box;
                    const left = `${(x1 / imgW) * 100}%`;
                    const top = `${(y1 / imgH) * 100}%`;
                    const width = `${((x2 - x1) / imgW) * 100}%`;
                    const height = `${((y2 - y1) / imgH) * 100}%`;
                    
                    return (
                      <div 
                        key={index}
                        className={`absolute border-2 flex flex-col justify-start items-start pointer-events-none ${
                          isHuman 
                            ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
                            : "border-bio-emerald box-glow"
                        }`}
                        style={{ left, top, width, height }}
                      >
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-br-md pointer-events-none select-none uppercase tracking-wide ${
                          isHuman ? "bg-red-500 text-white" : "bg-bio-emerald text-bio-black"
                        }`}>
                          {det.plant_name} ({det.confidence}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit / Trigger Button */}
            {image && !loading && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-4 bg-gradient-to-r from-bio-emerald to-emerald-600 hover:from-emerald-500 hover:to-bio-light-emerald text-bio-black font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-neon-emerald hover:shadow-neon-glow transition-all duration-300 hover:scale-[1.02]"
                >
                  <Cpu className="w-5 h-5 text-bio-black" />
                  Analyze with YOLOv8 Engine
                </button>
                <button 
                  onClick={() => {
                    setImage(null);
                    setPreviewUrl(null);
                    setResult(null);
                    setError(null);
                    setSelectedQuestion(null);
                  }}
                  className="px-6 py-4 border border-red-500/20 hover:border-red-500/40 bg-red-950/10 hover:bg-red-950/20 text-red-400 font-semibold rounded-2xl transition-all duration-200"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-2xl border border-red-500/20 bg-red-950/10 text-red-400 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Column: AI Results & Recommendation Engine */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Loading Skeleton */}
            {loading && (
              <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center text-center gap-6 min-h-[300px]">
                <Loader2 className="w-12 h-12 text-bio-emerald animate-spin" />
                <div className="flex flex-col gap-2">
                  <h4 className="text-lg font-bold text-white">Vision Inference Running</h4>
                  <p className="text-xs text-slate-400 animate-pulse">{loadingMessages[loadingStep]}</p>
                </div>
              </div>
            )}

            {/* Detection Result Card */}
            {!loading && result && result.detections && primaryDet && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 rounded-3xl flex flex-col gap-5"
              >
                
                {/* 1. Human Detected Warning Banner */}
                {isHumanDetected && (
                  <div className="p-4 rounded-2xl border border-red-500/25 bg-red-950/15 text-red-400 text-xs flex gap-2.5 items-start">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold text-sm block">🚨 Human Face Detected!</span>
                      <p className="mt-1 font-light leading-normal">
                        BioByte is designed for botanical species. Bypassing plant classifier. Please upload a clear image of a Money Plant, Rose, Mint, or Hibiscus leaves.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-bio-card-border/20 pb-3">
                    Diagnostic Output
                  </h3>
                  
                  <div className="flex flex-col gap-4 mt-4">
                    {/* Species and Conf */}
                    <div className="flex justify-between items-center bg-bio-black/45 p-4 rounded-2xl border border-bio-card-border/10">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Classification</p>
                        <p className={`text-xl font-black mt-1 ${isHumanDetected ? "text-red-400" : "text-white"}`}>
                          {primaryDet.plant_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Confidence</p>
                        <p className={`text-2xl font-black mt-1 ${isHumanDetected ? "text-red-400" : "text-bio-light-emerald glow-text"}`}>
                          {primaryDet.confidence}%
                        </p>
                      </div>
                    </div>

                    {/* Plant Health & Disease Telemetry */}
                    {!isHumanDetected && (
                      <div className="grid grid-cols-2 gap-3">
                        {/* Health Score */}
                        <div className="bg-bio-black/45 p-4 rounded-2xl border border-bio-card-border/10 flex flex-col justify-center">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-400" />
                            Health Score
                          </span>
                          <span className={`text-3xl font-black mt-1 ${getScoreColor(primaryDet.health_score)}`}>
                            {primaryDet.health_score}%
                          </span>
                        </div>
                        {/* Disease */}
                        <div className="bg-bio-black/45 p-4 rounded-2xl border border-bio-card-border/10 flex flex-col justify-center">
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-bio-emerald" />
                            Diagnosis
                          </span>
                          <span className={`text-sm font-extrabold mt-1 truncate ${
                            primaryDet.disease_detected.includes("Healthy") 
                              ? "text-bio-glow-green" 
                              : "text-amber-400 animate-pulse"
                          }`}>
                            {primaryDet.disease_detected}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Add to Gardens Button (Disabled for humans) */}
                    {isHumanDetected ? (
                      <button
                        disabled
                        className="py-3 bg-slate-900 border border-slate-800 text-slate-650 font-bold rounded-xl text-xs cursor-not-allowed select-none"
                      >
                        Cannot add humans to garden dashboard
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCustomName(primaryDet.plant_name);
                          setShowAddModal(true);
                        }}
                        className="py-3 bg-bio-emerald/10 hover:bg-bio-emerald/20 border border-bio-emerald/30 text-bio-light-emerald font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01]"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Gardens Dashboard
                      </button>
                    )}
                  </div>
                </div>

                {/* Smart Q&A recommended questions */}
                {result.recommended_questions && result.recommended_questions.length > 0 && (
                  <div className="flex flex-col gap-4 mt-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-t border-bio-card-border/10 pt-4">
                      <HelpCircle className="w-4 h-4 text-bio-emerald" />
                      Smart Recommended Care
                    </h4>
                    
                    <div className="flex flex-col gap-2">
                      {result.recommended_questions.map((q) => {
                        const isExpanded = selectedQuestion === q.id;
                        return (
                          <div 
                            key={q.id} 
                            className="border border-bio-card-border/40 rounded-xl overflow-hidden backdrop-blur-md"
                          >
                            <button
                              onClick={() => setSelectedQuestion(isExpanded ? null : q.id)}
                              className="w-full text-left px-4 py-3 flex justify-between items-center text-xs font-semibold text-slate-200 hover:bg-bio-emerald/5 transition-colors"
                            >
                              <span>{q.question}</span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-bio-emerald shrink-0 rotate-180 transition-transform" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-bio-emerald shrink-0 transition-transform" />
                              )}
                            </button>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <p className="px-4 pb-4 pt-1 text-xs text-slate-400 font-light leading-relaxed border-t border-bio-card-border/10 bg-bio-black/30">
                                    {q.answer}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Standby Card */}
            {!loading && !result && (
              <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center text-center gap-4 min-h-[300px] border-bio-card-border/10">
                <div className="p-4 bg-slate-800/20 text-slate-500 rounded-2xl">
                  <Cpu className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-300">Awaiting Analysis</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                    Once you upload and run, the YOLOv8 AI diagnostics will populate here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add to My Plants Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel w-full max-w-md rounded-3xl p-6 z-10 flex flex-col gap-6 shadow-neon-emerald font-sans"
            >
              <div>
                <h3 className="text-xl font-bold text-white">Add Plant to Gardens</h3>
                <p className="text-xs text-slate-400 mt-1">Configure your personal plant tracker</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Custom Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Name</label>
                  <input 
                    type="text" 
                    className="glass-input px-4 py-3 rounded-xl text-sm"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. My Balcony Rose"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-bio-card-border hover:bg-slate-800/10 text-slate-300 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlant}
                  disabled={addingPlant}
                  className="flex-1 py-3 bg-gradient-to-r from-bio-emerald to-emerald-600 text-bio-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
                >
                  {addingPlant ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Add to Dashboard
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
