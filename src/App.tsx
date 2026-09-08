import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, roleHome } from "@/contexts/AuthContext";
import { AppPrivyProvider } from "@/providers/PrivyProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppNavigate } from "@/components/AppNavigate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConfigGuard } from "@/components/ConfigGuard";
import { AuthRedirect } from "@/components/AuthRedirect";
import { AppHostRedirect } from "@/components/AppHostRedirect";
import CreatorLanding from "./pages/CreatorLanding";
import BrandLanding from "./pages/BrandLanding";
import { HomeByHost } from "./components/HomeByHost";
import { HostAudienceSync } from "./components/HostAudienceSync";
import BrandDashboard from "./pages/BrandDashboard";
import BrandCampaignDetail from "./pages/BrandCampaignDetail";
import NewCampaign from "./pages/NewCampaign";
import CreatorBrowse from "./pages/CreatorBrowse";
import CreatorCampaignDetail from "./pages/CreatorCampaignDetail";
import CreatorSubmissions from "./pages/CreatorSubmissions";
import CreatorEarnings from "./pages/CreatorEarnings";
import CreatorProfile from "./pages/CreatorProfile";
import CreatorWatchlist from "./pages/CreatorWatchlist";
import BrandCreatorMarketplace from "./pages/BrandCreatorMarketplace";
import BrandCreatorProfile from "./pages/BrandCreatorProfile";
import BrandAnalytics from "./pages/BrandAnalytics";
import BrandProfile from "./pages/BrandProfile";
import Messages from "./pages/Messages";
import AdminPanel from "./pages/AdminPanel";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import SignIn from "./pages/SignIn";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import SocialCallback from "./pages/SocialCallback";
import Licenses from "./pages/Licenses";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import { Seo } from "./components/Seo";

const queryClient = new QueryClient();

/** Sends signed-in users to the dashboard for their role (on the role subdomain). */
const DashboardRouter = () => {
  const { profile, isLoading } = useAuth();
  if (isLoading) return null;
  return <AppNavigate role={profile?.role} path={roleHome(profile?.role)} />;
};

/** Old /signup links go to the home gate — pick a role, Privy opens there. */
const SignupRedirect = () => <Navigate to="/" replace />;

const App = () => (
  <ErrorBoundary>
    <ConfigGuard>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppPrivyProvider>
              <AuthProvider>
                <ScrollToTop />
                <Seo />
                <HostAudienceSync />
                <AuthRedirect />
                <AppHostRedirect />
                <Routes>
                <Route path="/" element={<HomeByHost />} />
                <Route path="/creators" element={<CreatorLanding />} />
                <Route path="/brands" element={<BrandLanding />} />

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
                <Route path="/brand/creators" element={
                  <ProtectedRoute role="brand"><BrandCreatorMarketplace /></ProtectedRoute>
                } />
                <Route path="/brand/creators/:id" element={
                  <ProtectedRoute role="brand"><BrandCreatorProfile /></ProtectedRoute>
                } />
                <Route path="/brand/analytics" element={
                  <ProtectedRoute role="brand"><BrandAnalytics /></ProtectedRoute>
                } />
                <Route path="/brand/profile" element={
                  <ProtectedRoute role="brand"><BrandProfile /></ProtectedRoute>
                } />
                <Route path="/messages" element={
                  <ProtectedRoute><Messages /></ProtectedRoute>
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
                <Route path="/creator/profile" element={
                  <ProtectedRoute role="creator"><CreatorProfile /></ProtectedRoute>
                } />
                <Route path="/creator/watchlist" element={
                  <ProtectedRoute role="creator"><CreatorWatchlist /></ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute staff><AdminPanel /></ProtectedRoute>
                } />
                <Route path="/moderator" element={<Navigate to="/admin" replace />} />

                {/* Public Routes */}
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/licenses" element={<Licenses />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignupRedirect />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/social-callback" element={<SocialCallback />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </AppPrivyProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ConfigGuard>
  </ErrorBoundary>
);

export default App;
