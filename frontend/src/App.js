import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import RehabApp from "@/pages/RehabApp";
import LongevityApp from "@/pages/LongevityApp";
import FootballApp from "@/pages/FootballApp";
import SprinterApp from "@/pages/SprinterApp";
import BuildApp from "@/pages/BuildApp";
import SelfServeBuilder from "@/pages/SelfServeBuilder";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsConditions from "@/pages/TermsConditions";
import RefundPolicy from "@/pages/RefundPolicy";
import GeneratedApp from "@/pages/GeneratedApp";
import SaveToPhoneInstructions from "@/pages/SaveToPhoneInstructions";
import AdminLogin from "@/pages/AdminLogin";
import AdminImages from "@/pages/AdminImages";
import AdminContent from "@/pages/AdminContent";
import AdminLeads from "@/pages/AdminLeads";
import AdminSupport from "@/pages/AdminSupport";
import AdminOrders from "@/pages/AdminOrders";
import AdminTestPlan from "@/pages/AdminTestPlan";
import CoachAuth from "@/pages/CoachAuth";
import CoachDashboard from "@/pages/CoachDashboard";
import CoachPlanBuilder from "@/pages/CoachPlanBuilder";
import AdminPlanBuilder from "@/pages/AdminPlanBuilder";
import PublicBrandedPlan from "@/pages/PublicBrandedPlan";

function App() {
  return (
    <div className="App min-h-screen bg-[#050505] text-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/build" element={<BuildApp />} />
          <Route path="/build/manual" element={<SelfServeBuilder />} />
          <Route path="/build/success" element={<PaymentSuccess />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/refunds" element={<RefundPolicy />} />
          <Route path="/app/rehab" element={<RehabApp />} />
          <Route path="/app/longevity" element={<LongevityApp />} />
          <Route path="/app/football" element={<FootballApp />} />
          <Route path="/app/sprinter" element={<SprinterApp />} />
          <Route path="/app/u/:id/save-instructions" element={<SaveToPhoneInstructions />} />
          <Route path="/app/u/:id" element={<GeneratedApp />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/images" element={<AdminImages />} />
          <Route path="/admin/leads" element={<AdminLeads />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/test-plan" element={<AdminTestPlan />} />
          <Route path="/coach" element={<CoachAuth />} />
          <Route path="/coach/dashboard" element={<CoachDashboard />} />
          <Route path="/coach/builder" element={<CoachPlanBuilder />} />
          <Route path="/coach/builder/:clientId" element={<CoachPlanBuilder />} />
          <Route path="/admin/plan-builder" element={<AdminPlanBuilder />} />
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
