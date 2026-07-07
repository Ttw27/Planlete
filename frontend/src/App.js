import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import AthleteApp from "@/pages/AthleteApp";
import LongevityApp from "@/pages/LongevityApp";
import FootballApp from "@/pages/FootballApp";
import SprinterApp from "@/pages/SprinterApp";
import BuildApp from "@/pages/BuildApp";
import GeneratedApp from "@/pages/GeneratedApp";
import SaveToPhoneInstructions from "@/pages/SaveToPhoneInstructions";
import AdminLogin from "@/pages/AdminLogin";
import AdminImages from "@/pages/AdminImages";
import AdminContent from "@/pages/AdminContent";
import CoachAuth from "@/pages/CoachAuth";
import CoachDashboard from "@/pages/CoachDashboard";
import PublicBrandedPlan from "@/pages/PublicBrandedPlan";

function App() {
  return (
    <div className="App min-h-screen bg-[#050505] text-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/build" element={<BuildApp />} />
          <Route path="/app/athlete" element={<AthleteApp />} />
          <Route path="/app/longevity" element={<LongevityApp />} />
          <Route path="/app/football" element={<FootballApp />} />
          <Route path="/app/sprinter" element={<SprinterApp />} />
          <Route path="/app/u/:id/save-instructions" element={<SaveToPhoneInstructions />} />
          <Route path="/app/u/:id" element={<GeneratedApp />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/images" element={<AdminImages />} />
          <Route path="/coach" element={<CoachAuth />} />
          <Route path="/coach/dashboard" element={<CoachDashboard />} />
          <Route path="/c/:coachSlug/:clientSlug" element={<PublicBrandedPlan />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#0a0a0a",
            border: "1px solid rgba(212,255,0,0.3)",
            color: "#fafafa",
            borderRadius: 0,
          },
        }}
      />
    </div>
  );
}

export default App;
