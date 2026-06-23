import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";
import MyPlants from "./pages/MyPlants";
import CalendarView from "./pages/CalendarView";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import { AnimatePresence, motion } from "framer-motion";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");

  // Renders the correct view matching activeTab
  const renderActivePage = () => {
    switch (activeTab) {
      case "myplants":
        return <Dashboard setActiveTab={setActiveTab} />;
      case "scanner":
        return <Scanner setActiveTab={setActiveTab} />;
      case "allplants":
        return <MyPlants setActiveTab={setActiveTab} />;
      case "calendar":
        return <CalendarView />;
      case "notifications":
        return <Notifications />;
      case "analytics":
        return <AnalyticsPage />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  // Inline small wrapper for Analytics to avoid importing from non-existent file
  // (We created Analytics.tsx which we import, wait! Let's import it directly!)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bio-black select-none text-slate-100 font-sans">
      <AnimatePresence mode="wait">
        {activeTab === "home" ? (
          <motion.div
            key="home-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Home setActiveTab={setActiveTab} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full h-full overflow-hidden"
          >
            {/* Nav Sidebar */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Content view window */}
            <div className="flex-1 h-full overflow-hidden bg-bio-dark flex flex-col relative">
              {/* Top ambient glow blob */}
              <div className="absolute top-[-10%] right-[10%] w-[350px] h-[350px] bg-bio-emerald/5 rounded-full blur-[100px] pointer-events-none z-0" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="w-full h-full flex flex-col relative z-10"
                >
                  {renderActivePage()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline Analytics Page wrapper to map cleanly
import Analytics from "./pages/Analytics";
function AnalyticsPage() {
  return <Analytics />;
}
