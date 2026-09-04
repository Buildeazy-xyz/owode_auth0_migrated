import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./components/AppLayout.tsx";
import AdminDashboard from "./pages/admin/page.tsx";
import AdminLoginPage from "./pages/admin-login/page.tsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.tsx";
import AboutPage from "./pages/about/page.tsx";
import FaqPage from "./pages/faq/page.tsx";
import ContactPage from "./pages/contact/page.tsx";

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          {/* Protected routes with shared layout */}
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </AdminAuthProvider>
    </DefaultProviders>
  );
}
