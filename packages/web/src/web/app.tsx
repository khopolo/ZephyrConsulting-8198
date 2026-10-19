import { Route, Switch } from "wouter";
import "./site.css";
import { useEffect } from "react";
import { authClient } from "./lib/auth";
import Home from "./pages/home";
import { Layout } from "./components/site";
import {
  Services,
  About,
  Products,
  Product,
  Legal,
  Checkout,
  PaymentStatus,
  NotFound,
} from "./pages/public";
import Support from "./pages/support";
import { SignIn, Dashboard } from "./pages/account";
import Admin from "./pages/admin";
import Recovery from './pages/recovery';
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  useEffect(() => {
    void authClient.managedAuth.handleRedirect();
  }, []);
  return (
    <Provider>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/services" component={Services} />
          <Route path="/about" component={About} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={Product} />
          <Route path="/support" component={Support} />
          <Route path="/sign-in" component={SignIn} />
          <Route path="/forgot-password" component={Recovery} />
          <Route path="/reset-password" component={Recovery} />
          <Route path="/verify-email" component={Recovery} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/legal/:id" component={Legal} />
          <Route path="/checkout/:id" component={Checkout} />
          <Route path="/payment/:status" component={PaymentStatus} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
