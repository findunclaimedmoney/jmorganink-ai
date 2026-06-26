import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";

import Home from "@/pages/Home";
import Crypto from "@/pages/Crypto";
import Finance from "@/pages/Finance";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Guides from "@/pages/Guides";
import ThankYou from "@/pages/ThankYou";
import FindMyMoney from "@/pages/FindMyMoney";
import AustraliaMap from "@/pages/AustraliaMap";
import DeceasedEstate from "@/pages/DeceasedEstate";
import LotteryChecker from "@/pages/LotteryChecker";
import TikTokLanding from "@/pages/TikTokLanding";
import MiaResearch from "@/pages/MiaResearch";
import MiaSearch from "@/pages/MiaSearch";
import MiaSearchResults from "@/pages/MiaSearchResults";
import MiaSearchPaid from "@/pages/MiaSearchPaid";
import AdminBatchSearch from "@/pages/AdminBatchSearch";
import AdminDashboard from "@/pages/AdminDashboard";
import ClaimReport from "@/pages/ClaimReport";

import VideoTemplate from "@/components/video/VideoTemplate";
import MiaPreview from "@/pages/MiaPreview";

const BASE = import.meta.env.BASE_URL;

function PageViewBeacon() {
  const [location] = useLocation();
  useEffect(() => {
    fetch(`${BASE}api/analytics/pageview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: location, referrer: document.referrer || null }),
    }).catch(() => {});
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/video" component={VideoTemplate} />
      <Route path="/mia-preview" component={MiaPreview} />
      <Route path="/admin/batch" component={AdminBatchSearch} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/claim-report" component={ClaimReport} />

      {/* Distraction-free marketing landing page — no global nav/footer */}
      <Route path="/start" component={TikTokLanding} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/crypto" component={Crypto} />
            <Route path="/finance" component={Finance} />
            <Route path="/contact" component={Contact} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/guides" component={Guides} />
            <Route path="/find-my-money" component={FindMyMoney} />
            <Route path="/mia-research" component={MiaResearch} />
            <Route path="/mia-search/results" component={MiaSearchResults} />
            <Route path="/mia-search/paid" component={MiaSearchPaid} />
            <Route path="/mia-search" component={MiaSearch} />
            <Route path="/unclaimed-money-map" component={AustraliaMap} />
            <Route path="/deceased-estate" component={DeceasedEstate} />
            <Route path="/lottery-checker" component={LotteryChecker} />
            <Route path="/thank-you/:guide" component={ThankYou} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <PageViewBeacon />
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
