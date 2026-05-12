import { useApp } from "../context/AppContext";

export function Header({ title }: { title?: string }) {
  const { user, theme, toggleTheme } = useApp();

  return (
    <header className="sticky top-0 z-40 glass px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">Invest Pro</div>
        <div className="font-bold text-sm gradient-text">{title || user?.firstName || "Xush kelibsiz"}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm hover:bg-muted transition-colors"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
