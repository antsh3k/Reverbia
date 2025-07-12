import { useState } from "react";
import Hero from "@/components/Hero";
import Dashboard from "./Dashboard";

const Index = () => {
  const [currentView, setCurrentView] = useState<"landing" | "dashboard">("landing");

  if (currentView === "dashboard") {
    return <Dashboard />;
  }

  return <Hero onNavigate={setCurrentView} />;
};

export default Index;
