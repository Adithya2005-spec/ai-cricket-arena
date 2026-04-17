import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "@/components/SiteHeader";
import Home from "./pages/Home";
import MatchView from "./pages/MatchView";
import MatchesList from "./pages/MatchesList";
import TournamentsList from "./pages/TournamentsList";
import TournamentView from "./pages/TournamentView";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteHeader />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/matches" element={<MatchesList />} />
            <Route path="/match/:id" element={<MatchView />} />
            <Route path="/tournaments" element={<TournamentsList />} />
            <Route path="/tournaments/:id" element={<TournamentView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
