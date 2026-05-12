interface Tab {
  id: string;
  icon: string;
  label: string;
}

const tabs: Tab[] = [
  { id: "home", icon: "🏠", label: "Bosh" },
  { id: "games", icon: "🎮", label: "O'yinlar" },
  { id: "invest", icon: "📈", label: "Sarmoya" },
  { id: "deposit", icon: "💳", label: "To'ldirish" },
  { id: "donate", icon: "⚽", label: "Danat" },
];

export function BottomNav({ active, onChange }: { active: string; onChange: (tab: string) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-xs transition-all ${
              active === tab.id
                ? "nav-tab-active font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-lg leading-none mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
