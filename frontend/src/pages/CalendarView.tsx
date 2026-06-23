import React, { useEffect, useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "Watered" | "Fertilized" | "Note Added" | string;
  status: "completed" | "upcoming";
  notes: string | null;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(
    new Date().toISOString().split("T")[0]
  );

  const fetchEvents = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar days
  const calendarCells = [];
  // Blank days for previous month offset
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Format date to YYYY-MM-DD
  const formatDateString = (day: number) => {
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const mStr = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
    return `${year}-${mStr}-${dStr}`;
  };

  // Get events for a specific day
  const getEventsForDate = (dateStr: string) => {
    return events.filter((e) => e.date === dateStr);
  };

  const selectedEvents = selectedDateStr ? getEventsForDate(selectedDateStr) : [];

  return (
    <div className="flex-1 min-h-screen overflow-y-auto px-8 py-10 relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-bio-emerald" />
            Care Calendar
          </h2>
          <p className="text-sm text-slate-400 font-light">
            Check historical logs and upcoming predictive care routines.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Monthly Grid */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-3xl flex flex-col gap-6">
            
            {/* Header / Month Controls */}
            <div className="flex justify-between items-center border-b border-bio-card-border/10 pb-4">
              <h3 className="text-lg font-bold text-white font-sans">
                {monthNames[month]} <span className="text-bio-emerald font-black">{year}</span>
              </h3>
              
              <div className="flex gap-2">
                <button 
                  onClick={prevMonth}
                  className="p-2 border border-bio-card-border/30 hover:border-bio-emerald bg-bio-card-bg/20 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={nextMonth}
                  className="p-2 border border-bio-card-border/30 hover:border-bio-emerald bg-bio-card-bg/20 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            {loading ? (
              <div className="h-96 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-bio-emerald border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {weekDays.map((wd) => (
                    <div key={wd} className="py-1">{wd}</div>
                  ))}
                </div>

                {/* Days cells */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarCells.map((day, index) => {
                    if (day === null) {
                      return <div key={`offset-${index}`} className="h-16 rounded-xl bg-slate-900/10 opacity-30 border border-transparent" />;
                    }

                    const dateStr = formatDateString(day);
                    const dayEvents = getEventsForDate(dateStr);
                    const isSelected = selectedDateStr === dateStr;
                    const isToday = new Date().toISOString().split("T")[0] === dateStr;

                    // Filter events for quick display indicator dots
                    const hasWater = dayEvents.some((e) => e.type === "Watered");
                    const hasFertilize = dayEvents.some((e) => e.type === "Fertilized");
                    const hasNote = dayEvents.some((e) => e.type === "Note Added");
                    const hasCompleted = dayEvents.some((e) => e.status === "completed");

                    return (
                      <div
                        key={`day-${day}`}
                        onClick={() => setSelectedDateStr(dateStr)}
                        className={`h-16 rounded-xl p-2 border flex flex-col justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-bio-emerald/10 border-bio-emerald shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.02]" 
                            : isToday 
                              ? "bg-emerald-950/15 border-bio-emerald/40 hover:border-bio-emerald"
                              : "bg-bio-black/40 border-bio-card-border/10 hover:border-bio-card-border/30"
                        }`}
                      >
                        {/* Day Number */}
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold ${
                            isSelected 
                              ? "text-bio-light-emerald" 
                              : isToday 
                                ? "text-bio-emerald" 
                                : "text-slate-300"
                          }`}>
                            {day}
                          </span>
                          
                          {/* Checkmark if all events completed on this day */}
                          {dayEvents.length > 0 && hasCompleted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-bio-glow-green" />
                          )}
                        </div>

                        {/* Event Badges list */}
                        <div className="flex gap-1 overflow-hidden h-4 items-center">
                          {hasWater && (
                            <div className="p-0.5 bg-bio-emerald/10 text-bio-light-emerald rounded-full">
                              <Droplet className="w-2.5 h-2.5" />
                            </div>
                          )}
                          {hasFertilize && (
                            <div className="p-0.5 bg-amber-500/10 text-amber-400 rounded-full">
                              <Sparkles className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Agenda/Details Panel */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="glass-panel p-6 rounded-3xl min-h-[350px] flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Agenda for {selectedDateStr ? new Date(selectedDateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Selected Date"}
                </h3>
                <p className="text-[10px] text-slate-500 font-light mt-0.5">Tasks scheduled or completed on this day</p>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto max-h-[350px]">
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 gap-3">
                    <CheckCircle2 className="w-8 h-8 text-slate-600" />
                    <p className="text-xs">No care schedules recorded for this day</p>
                  </div>
                ) : (
                  selectedEvents.map((ev) => {
                    const isWater = ev.type === "Watered";
                    const isFert = ev.type === "Fertilized";
                    const isCompleted = ev.status === "completed";
                    
                    return (
                      <div 
                        key={ev.id} 
                        className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                          isCompleted 
                            ? "bg-bio-emerald/[0.02] border-bio-emerald/10 text-slate-300" 
                            : "bg-bio-black/40 border-bio-card-border/10 text-white"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            {isWater ? (
                              <div className="p-1.5 bg-bio-emerald/10 text-bio-light-emerald rounded-lg shrink-0">
                                <Droplet className="w-3.5 h-3.5" />
                              </div>
                            ) : isFert ? (
                              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="p-1.5 bg-slate-800/10 text-slate-400 rounded-lg shrink-0">
                                <AlertCircle className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div>
                              <h4 className="text-xs font-bold leading-tight">{ev.title}</h4>
                              <span className="text-[9px] uppercase tracking-wide text-slate-500">
                                {ev.type}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isCompleted 
                              ? "bg-bio-glow-green/10 border-bio-glow-green/20 text-bio-glow-green" 
                              : "bg-bio-emerald/10 border-bio-emerald/20 text-bio-light-emerald"
                          }`}>
                            {ev.status}
                          </span>
                        </div>

                        {ev.notes && (
                          <p className="text-[10px] text-slate-400 font-light border-t border-bio-card-border/10 pt-2 leading-relaxed">
                            {ev.notes}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
