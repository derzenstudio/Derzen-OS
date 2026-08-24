import { useEffect } from "react";
import { parseHash, useApp } from "./store";
import { Shell } from "./components/Shell";
import { ToastHost } from "./components/ui";
import Dashboard from "./modules/Dashboard";
import CalendarModule from "./modules/Calendar";
import Inbox from "./modules/Inbox";
import Reservations from "./modules/Reservations";
import Operations from "./modules/Operations";
import Channels from "./modules/Channels";
import Listings from "./modules/Listings";
import Websites from "./modules/Websites";
import Quotes from "./modules/Quotes";
import Guidebooks from "./modules/Guidebooks";
import Concierge from "./modules/Concierge";
import Reviews from "./modules/Reviews";
import Customers from "./modules/Customers";
import Reports from "./modules/Reports";
import Integrations from "./modules/Integrations";
import SettingsModule from "./modules/Settings";

export default function App() {
  const route = useApp((s) => s.route);

  useEffect(() => {
    const onHash = () => useApp.setState({ route: parseHash() });
    if (!window.location.hash) window.location.hash = "/en/dashboard";
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const page = route.path[0] ?? "dashboard";
  let view: React.ReactNode;
  switch (page) {
    case "calendar": view = <CalendarModule />; break;
    case "inbox": view = <Inbox />; break;
    case "reservations": view = <Reservations />; break;
    case "ops": view = <Operations />; break;
    case "sync": view = <Channels tab="sync" />; break;
    case "listings": view = <Listings />; break;
    case "channels": view = <Channels />; break;
    case "websites": view = <Websites />; break;
    case "quotes": view = <Quotes />; break;
    case "guidebooks": view = <Guidebooks />; break;
    case "concierge": view = <Concierge />; break;
    case "reviews": view = <Reviews />; break;
    case "customers": view = <Customers />; break;
    case "reports": view = <Reports />; break;
    case "integrations": view = <Integrations />; break;
    case "settings": view = <SettingsModule />; break;
    default: view = <Dashboard />;
  }

  return (
    <>
      <Shell>{view}</Shell>
      <ToastHost />
    </>
  );
}
