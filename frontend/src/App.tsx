import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import VisibilityGrader from "./pages/VisibilityGrader";
import WorkspaceSetup from "./pages/WorkspaceSetup";
import VisibilityDashboard from "./pages/VisibilityDashboard";
import PromptLibrary from "./pages/PromptLibrary";
import ModelMonitoring from "./pages/ModelMonitoring";
import AnswerAnalysis from "./pages/AnswerAnalysis";
import CompetitorIntelligence from "./pages/CompetitorIntelligence";
import ContentRecommendations from "./pages/ContentRecommendations";
import ExperimentsImpact from "./pages/ExperimentsImpact";
import ReportsBilling from "./pages/ReportsBilling";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/grader" element={<VisibilityGrader />} />
            <Route path="/workspace-setup" element={<WorkspaceSetup />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <VisibilityDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/prompts"
              element={
                <RequireAuth>
                  <PromptLibrary />
                </RequireAuth>
              }
            />
            <Route
              path="/monitoring"
              element={
                <RequireAuth>
                  <ModelMonitoring />
                </RequireAuth>
              }
            />
            <Route
              path="/answers"
              element={
                <RequireAuth>
                  <AnswerAnalysis />
                </RequireAuth>
              }
            />
            <Route
              path="/competitors"
              element={
                <RequireAuth>
                  <CompetitorIntelligence />
                </RequireAuth>
              }
            />
            <Route
              path="/recommendations"
              element={
                <RequireAuth>
                  <ContentRecommendations />
                </RequireAuth>
              }
            />
            <Route
              path="/experiments"
              element={
                <RequireAuth>
                  <ExperimentsImpact />
                </RequireAuth>
              }
            />
            <Route
              path="/billing"
              element={
                <RequireAuth>
                  <ReportsBilling />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
