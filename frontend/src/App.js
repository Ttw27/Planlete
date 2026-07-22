import "@/App.css";
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
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
import AdminSecurity from "@/pages/AdminSecurity";
import PublicBrandedPlan from "@/pages/PublicBrandedPlan";
import AdminActivityStandards from "@/pages/AdminActivityStandards";
import AdminPlanEditor from "@/pages/AdminPlanEditor";
import AdminLoadingPreview from "@/pages/AdminLoadingPreview";
import AdminSampleFootball from "@/pages/AdminSampleFootball";
import AdminSampleRehab from "@/pages/AdminSampleRehab";
import AdminSampleLongevity from "@/pages/AdminSampleLongevity";
import AdminSampleSprinter from "@/pages/AdminSampleSprinter";
import { trackPageView } from "@/lib/analytics";

function App() {
  return (
    <ErrorBoundary>
      <div className="App min-h-screen bg-[#050505] text-white">
        <BrowserRouter>
          <PageTracker />
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
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/activity-standards" element={<AdminActivityStandards />} />
            <Route path="/admin/edit-plan" element={<AdminPlanEditor />} />
            <Route path="/admin/loading-preview" element={<AdminLoadingPreview />} />
            <Route path="/admin/sample-football" element={<AdminSampleFootball />} />
            <Route path="/admin/sample-rehab" element={<AdminSampleRehab />} />
            <Route path="/admin/sample-longevity" element={<AdminSampleLongevity />} />
            <Route path="/admin/sample-sprinter" element={<AdminSampleSprinter />} />
            <Route path="/c/:coachSlug/:clientSlug" element={<PublicBrandedPlan />} />
            <Route path="*" element={<NotFound />} />
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
    </ErrorBoundary>
  );
}

// Track page views on route changes
function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
}

export default App;
