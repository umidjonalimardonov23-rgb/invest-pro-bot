import { useState, useEffect } from "react";
import { AppProvider } from "./context/AppContext";
import { BottomNav } from "./components/BottomNav";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { GamesPage } from "./pages/GamesPage";
import { InvestPage } from "./pages/InvestPage";
import { DepositPage } from "./pages/DepositPage";
import { DonatePage } from "./pages/DonatePage";

const PAGE_TITLES: Record<string, string> = {
  home: "Bosh sahifa",
  games: "O'yinlar",
  invest: "Sarmoya",
  deposit: "Hisob to'ldirish",
  donate: "El-Klassiko Danat",
};

function AppInner() {
  const [tab, setTab] = useState("home");

  const renderPage = () => {
    switch (tab) {
      case "home": return <HomePage onTab={setTab} />;
      case "games": return <GamesPage />;
      case "invest": return <InvestPage />;
      case "deposit": return <DepositPage />;
      case "donate": return <DonatePage />;
      default: return <HomePage onTab={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header title={PAGE_TITLES[tab]} />
      <main className="pt-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 56px - 60px)" }}>
        {renderPage()}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
