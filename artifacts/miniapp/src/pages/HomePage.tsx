import { useApp } from "../context/AppContext";

export function HomePage({ onTab }: { onTab: (t: string) => void }) {
  const { user } = useApp();

  const total = (user?.gameBalance ?? 0) + (user?.investBalance ?? 0);

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-2">
      {/* Main balance card */}
      <div className="rounded-2xl p-5 card-glow bg-gradient-to-br from-blue-600/20 to-blue-900/40 border border-blue-500/30">
        <p className="text-xs text-muted-foreground mb-1">UMUMIY BALANS</p>
        <div className="text-3xl font-black gradient-text mb-1">
          {total.toLocaleString()} UZS
        </div>
        <p className="text-xs text-muted-foreground">Barcha hisoblar yig'indisi</p>
      </div>

      {/* Two balances */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 bg-card border border-border">
          <div className="text-xl mb-1">🎮</div>
          <div className="text-xs text-muted-foreground">O'yin balansi</div>
          <div className="font-bold text-lg text-green-400">
            {(user?.gameBalance ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">so'm</div>
        </div>
        <div className="rounded-xl p-4 bg-card border border-border">
          <div className="text-xl mb-1">📈</div>
          <div className="text-xs text-muted-foreground">Investitsiya</div>
          <div className="font-bold text-lg text-blue-400">
            {(user?.investBalance ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">so'm</div>
        </div>
      </div>

      {/* Profit tiers */}
      <div className="rounded-xl p-4 bg-card border border-border">
        <div className="font-semibold mb-3 flex items-center gap-2">
          <span>📊</span> Kunlik foyda darajalari
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: "50K – 200K", rate: "1.5%", color: "text-muted-foreground" },
            { label: "200K – 500K", rate: "2.0%", color: "text-blue-400" },
            { label: "500K – 1M", rate: "2.5%", color: "text-purple-400" },
            { label: "1M – 2M", rate: "3.0%", color: "text-yellow-400" },
            { label: "2M+", rate: "3.5%", color: "text-green-400" },
          ].map((tier) => {
            const inv = user?.investBalance ?? 0;
            const isActive =
              (tier.label === "50K – 200K" && inv >= 50000 && inv < 200000) ||
              (tier.label === "200K – 500K" && inv >= 200000 && inv < 500000) ||
              (tier.label === "500K – 1M" && inv >= 500000 && inv < 1000000) ||
              (tier.label === "1M – 2M" && inv >= 1000000 && inv < 2000000) ||
              (tier.label === "2M+" && inv >= 2000000);
            return (
              <div
                key={tier.label}
                className={`flex justify-between items-center rounded-lg px-3 py-1.5 ${isActive ? "bg-primary/10 border border-primary/30" : ""}`}
              >
                <span className="text-muted-foreground">{tier.label} so'm</span>
                <span className={`font-bold ${tier.color}`}>{tier.rate}/kun</span>
                {isActive && <span className="text-xs text-primary ml-1">← Siz</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onTab("deposit")}
          className="rounded-xl p-4 bg-primary text-primary-foreground font-semibold text-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">💳</span>
          Hisob to'ldirish
        </button>
        <button
          onClick={() => onTab("games")}
          className="rounded-xl p-4 bg-accent text-accent-foreground font-semibold text-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">🎮</span>
          O'yin o'ynash
        </button>
        <button
          onClick={() => onTab("invest")}
          className="rounded-xl p-4 bg-card border border-border font-semibold text-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">📈</span>
          Sarmoya kiritish
        </button>
        <button
          onClick={() => onTab("donate")}
          className="rounded-xl p-4 bg-card border border-border font-semibold text-sm flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="text-2xl">⚽</span>
          Danat qilish
        </button>
      </div>

      {/* Info cards */}
      <div className="rounded-xl p-4 bg-card border border-border text-sm space-y-2">
        <div className="font-semibold mb-2">ℹ️ Qoidalar</div>
        <div className="text-muted-foreground space-y-1">
          <div>• Minimal o'yin stavkasi: <span className="text-foreground font-medium">2,000 so'm</span></div>
          <div>• Minimal sarmoya: <span className="text-foreground font-medium">50,000 so'm</span></div>
          <div>• Sarmoya muddati: <span className="text-foreground font-medium">5–30 kun</span></div>
          <div>• O'yinda yutish ehtimoli: <span className="text-foreground font-medium">25%</span></div>
          <div>• Danat minimali: <span className="text-foreground font-medium">2,000,000 so'm</span></div>
        </div>
      </div>
    </div>
  );
}
