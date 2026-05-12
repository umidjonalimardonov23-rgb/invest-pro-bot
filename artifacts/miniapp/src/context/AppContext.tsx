import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";
import { getTelegramUser, initTelegram } from "../lib/telegram";

interface User {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  gameBalance: number;
  investBalance: number;
}

interface AppContextType {
  user: User | null;
  theme: "dark" | "light";
  toggleTheme: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    initTelegram();
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    const load = async () => {
      const tgUser = getTelegramUser();
      try {
        const u = await api.createOrGetUser(tgUser);
        setUser(u);
      } catch (e) {
        console.error("Failed to load user", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshUser = async () => {
    if (!user) return;
    try {
      const u = await api.getUser(user.telegramId);
      setUser(u);
    } catch (e) {}
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  };

  return (
    <AppContext.Provider value={{ user, theme, toggleTheme, refreshUser, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
