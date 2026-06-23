import React, { useEffect, useRef } from "react";
import { ArrowRight, Scan, LayoutDashboard, Brain, Activity, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface HomeProps {
  setActiveTab: (tab: string) => void;
}

export default function Home({ setActiveTab }: HomeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background Particle System on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        color: i % 2 === 0 ? "#10b981" : "#34d399",
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center px-6 overflow-hidden bg-bio-black py-16">
      {/* HTML5 Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Floating Blurred Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-bio-emerald/10 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-950/20 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse" />

      {/* Floating leaves (CSS animated) */}
      <div className="leaf-container">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-leaf opacity-20"
            style={{
              left: `${Math.random() * 85}%`,
              animationDelay: `${i * 3}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
              transform: `scale(${0.5 + Math.random() * 0.8})`,
            }}
          >
            {/* SVG leaf representation */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1">
              <path d="M12 2C6.5 2 2 6.5 2 12c0 3 1.5 5.5 3.5 7L12 22l6.5-3c2-1.5 3.5-4 3.5-7 0-5.5-4.5-10-10-10z" fill="rgba(16, 185, 129, 0.05)"/>
              <path d="M12 2v20M12 12c0-3.5 2.5-6.5 4.5-8.5M12 15c-2.5-2.5-4-5-4.5-7" />
            </svg>
          </div>
        ))}
      </div>

      {/* Hero Content */}
      <div className="max-w-4xl w-full text-center z-10 flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-bio-emerald/30 bg-bio-emerald/5 text-bio-light-emerald text-xs font-semibold tracking-wider uppercase backdrop-blur-md"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-bio-glow-green animate-ping" />
          Futuristic Plant Care
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-7xl md:text-8xl font-black font-sans tracking-tight text-white select-none"
        >
          Bio<span className="text-transparent bg-clip-text bg-gradient-to-r from-bio-emerald via-emerald-400 to-bio-glow-green glow-text-emerald">Byte</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl font-light tracking-wide leading-relaxed"
        >
          An intelligent plant monitoring and care assistant. Scan with ByteAI computer vision and unlock personalized recommendations for Money Plants, Roses, Mint, and Hibiscus.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 mt-4"
        >
          <button
            onClick={() => setActiveTab("scanner")}
            className="group px-8 py-4 bg-gradient-to-r from-bio-emerald to-emerald-600 hover:from-emerald-500 hover:to-bio-light-emerald text-bio-black font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-neon-emerald hover:shadow-neon-glow transition-all duration-300 hover:scale-[1.03]"
          >
            <Scan className="w-5 h-5 text-bio-black" />
            <span>Upload Plant</span>
            <ArrowRight className="w-5 h-5 text-bio-black group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab("myplants")}
            className="px-8 py-4 border border-bio-card-border hover:border-bio-emerald/50 bg-bio-card-bg/40 hover:bg-bio-emerald/10 text-white font-semibold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.03] backdrop-blur-md"
          >
            <LayoutDashboard className="w-5 h-5 text-bio-emerald" />
            <span>Plant Dashboard</span>
          </button>
        </motion.div>

        {/* Feature Cards Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16"
        >
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center gap-3 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-bio-emerald/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="p-3 bg-bio-emerald/10 text-bio-emerald rounded-xl group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">ByteAI Engine</h3>
            <p className="text-sm text-slate-400 font-light">
              Detect species instantly with high confidence bounding boxes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center gap-3 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-bio-emerald/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="p-3 bg-bio-emerald/10 text-bio-emerald rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Realtime Analytics</h3>
            <p className="text-sm text-slate-400 font-light">
              Track watering schedules, health metrics, and growth history.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center gap-3 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-bio-emerald/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="p-3 bg-bio-emerald/10 text-bio-emerald rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Smart Q&A</h3>
            <p className="text-sm text-slate-400 font-light">
              Answer specific questions about sunlight, soil, and watering needs.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
