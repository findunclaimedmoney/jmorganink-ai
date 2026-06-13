import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudioProvider } from "@/studio/StudioContext";
import StudioPage from "@/pages/StudioPage";
import BoothStripPage from "@/pages/BoothStripPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-8 py-3 flex items-center gap-6">
      <span className="text-orange-400 font-extrabold tracking-widest text-sm uppercase mr-4">
        Glimr
      </span>
      <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
        Studio
      </Link>
      <Link href="/booth" className="text-sm text-gray-400 hover:text-white transition-colors">
        Booth
      </Link>
    </nav>
  );
}

function Router() {
  return (
    <>
      <NavBar />
      <div className="pt-12">
        <Switch>
          <Route path="/" component={StudioPage} />
          <Route path="/booth" component={BoothStripPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StudioProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </StudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
