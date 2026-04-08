import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import AuthCallback from "./pages/auth/Callback.tsx";
import VerifyAccountPage from "./pages/auth/VerifyAccount.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./components/AppLayout.tsx";
import OnboardingPage from "./pages/onboarding/page.tsx";
import AgentDashboard from "./pages/agent/page.tsx";
import AgentContributorDetailPage from "./pages/agent/contributor-detail-page.tsx";
import ContributorDashboard from "./pages/contributor/page.tsx";
import AdminDashboard from "./pages/admin/page.tsx";
import AdminAgentDetailPage from "./pages/admin/agent-detail-page.tsx";
import AboutPage from "./pages/about/page.tsx";
import FaqPage from "./pages/faq/page.tsx";
import ContactPage from "./pages/contact/page.tsx";

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/verify-account" element={<VerifyAccountPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          {/* Protected routes with shared layout */}
          <Route element={<AppLayout />}>
            <Route path="/agent" element={<AgentDashboard />} />
            <Route path="/agent/contributors/:contributorId" element={<AgentContributorDetailPage />} />
            <Route path="/contributor" element={<ContributorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/agents/:agentId" element={<AdminAgentDetailPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
