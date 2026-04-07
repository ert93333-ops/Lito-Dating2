import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Overview from "@/pages/Overview";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import UserDetail from "@/pages/UserDetail";
import Verification from "@/pages/Verification";
import RiskFlags from "@/pages/RiskFlags";
import Appeals from "@/pages/Appeals";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/reports" component={Reports} />
        <Route path="/users" component={Users} />
        <Route path="/users/:id" component={UserDetail} />
        <Route path="/verification" component={Verification} />
        <Route path="/risk-flags" component={RiskFlags} />
        <Route path="/appeals" component={Appeals} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
