import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, roleHome } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import BrandDashboard from "./pages/BrandDashboard";
import BrandCampaignDetail from "./pages/BrandCampaignDetail";
import NewCampaign from "./pages/NewCampaign";
import CreatorBrowse from "./pages/CreatorBrowse";
import CreatorCampaignDetail from "./pages/CreatorCampaignDetail";
import CreatorSubmissions from "./pages/CreatorSubmissions";
import CreatorEarnings from "./pages/CreatorEarnings";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import Licenses from "./pages/Licenses";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

/** Sends signed-in users to the dashboard for their role. */
const DashboardRouter = () => {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={roleHome(profile?.role)} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />

            {/* App (authenticated) */}
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/brand" element={
              <ProtectedRoute role="brand"><BrandDashboard /></ProtectedRoute>
            } />
            <Route path="/brand/campaigns/new" element={
              <ProtectedRoute role="brand"><NewCampaign /></ProtectedRoute>
            } />
            <Route path="/brand/campaigns/:id" element={
              <ProtectedRoute role="brand"><BrandCampaignDetail /></ProtectedRoute>
            } />
            <Route path="/creator" element={
              <ProtectedRoute role="creator"><CreatorBrowse /></ProtectedRoute>
            } />
            <Route path="/creator/campaigns/:id" element={
              <ProtectedRoute role="creator"><CreatorCampaignDetail /></ProtectedRoute>
            } />
            <Route path="/creator/submissions" element={
              <ProtectedRoute role="creator"><CreatorSubmissions /></ProtectedRoute>
            } />
            <Route path="/creator/earnings" element={
              <ProtectedRoute role="creator"><CreatorEarnings /></ProtectedRoute>
            } />

            {/* Public Routes */}
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/licenses" element={<Licenses />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Where OAuth and email-confirmation links land. SocialAuthButtons
                hardcodes this path — without the route, SSO 404s. */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
