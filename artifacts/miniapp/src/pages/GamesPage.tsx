import { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

const GAMES = [
  { id: "crash", name: "🚀 Crash", desc: "Raketa uchadi — vaqtida stop qiling!", color: "from-red-600 to-orange-500" },
  { id: "dice", name: "🎲 Dice", desc: "Zar tashlang, raqam toping", color: "from-purple-600 to-pink-500" },
  { id: "slots", name: "🎰 Slots", desc: "3 bir xil — yutdingiz!", color: "from-yellow-600 to-amber-500" },
  { id: "roulette", name: "🎡 Ruletka", desc: "Qizil yoki qora?", color: "from-green-600 to-emerald-500" },
  { id: "mines", name: "💣 Mines", desc: "Minasizni toping!", color: "from-gray-600 to-slate-500" },
  { id: "wheel", name: "🎯 Wheel", desc: "Omad g'ildiragi", color: "from-blue-600 to-cyan-500" },
  { id: "coinflip", name: "🪙 Coin Flip", desc: "Oltin yoki yozuv?", color: "from-yellow-500 to-orange-400" },
  { id: "blackjack", name: "🃏 Blackjack", desc: "21 ga yaqinroq yut!", color: "from-indigo-600 to-violet-500" },
  { id: "plinko", name: "⚡ Plinko", desc: "To'pni tashlang!", color: "from-pink-600 to-rose-500" },
  { id: "keno", name: "🔢 Keno", desc: "Raqamlarni toping", color: "from-teal-600 to-cyan-500" },
];

interface GameResult {
  won: boolean;
  multiplier: number;
  payout: number;
  newGameBalance: number;
}

function CrashGame({ onResult, gameBalance }: { onResult: (r: GameResult | null) => void; gameBalance: number }) {
  const [running, setRunning] = useState(false);
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashed, setCrashed] = useState(false);
  const [bet, setBet] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const { user, refreshUser } = useApp();

  const startCrash = () => {
    if (!bet || Number(bet) < 2000) return;
    setRunning(true);
    setCrashed(false);
    setMultiplier(1.00);
    setResult(null);
    onResult(null);
  };

  const stopCrash = async () => {
    if (!running || !user) return;
    setRunning(false);
    try {
      const res = await api.playGame({ telegramId: user.telegramId, gameType: "crash", betAmount: Number(bet) });
      const finalMult = res.won ? multiplier : 0;
      setResult({ ...res, multiplier: res.won ? multiplier : 0 });
      onResult(res);
      await refreshUser();
      if (!res.won) setCrashed(true);
    } catch (e: any) {
      alert(e.message);
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-8 text-center bg-gradient-to-br ${crashed ? "from-red-900 to-red-700" : "from-slate-800 to-slate-700"} transition-all`}>
        <div className={`text-6xl font-black mb-2 ${running ? "text-green-400 pulse-glow" : crashed ? "text-red-400" : "text-white"}`}>
          {running ? `${multiplier.toFixed(2)}x` : crashed ? "💥 CRASH!" : "🚀"}
        </div>
        {running && (
          <div className="text-sm text-muted-foreground">Vaqtida STOP bosing!</div>
        )}
        {result && (
          <div className={`text-lg font-bold mt-2 ${result.won ? "text-green-400" : "text-red-400"}`}>
            {result.won ? `+${result.payout.toLocaleString()} so'm 🎉` : "Yutqazdingiz 😢"}
          </div>
        )}
      </div>
      <input
        type="number"
        value={bet}
        onChange={(e) => setBet(e.target.value)}
        placeholder="Stavka (minimal 2,000)"
        disabled={running}
        className="w-full bg-card border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-primary"
      />
      {!running ? (
        <button onClick={startCrash} disabled={Number(bet) < 2000}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-green-600 text-white disabled:opacity-50 active:scale-95 transition-all">
          🚀 Boshlash
        </button>
      ) : (
        <button onClick={stopCrash}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-red-600 text-white animate-pulse active:scale-95">
          ⛔ STOP — {multiplier.toFixed(2)}x
        </button>
      )}
      {running && (() => {
        const interval = setInterval(() => {
          setMultiplier((m) => {
            const next = m + 0.02 + Math.random() * 0.03;
            if (Math.random() < 0.008) {
              clearInterval(interval);
              setCrashed(true);
              setRunning(false);
              return m;
            }
            return next;
          });
        }, 100);
        return null;
      })()}
    </div>
  );
}

function SimpleGame({ game, onResult }: { game: typeof GAMES[0]; onResult: (r: GameResult | null) => void }) {
  const [bet, setBet] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [choice, setChoice] = useState<string>("");
  const { user, refreshUser } = useApp();

  const play = async () => {
    if (!user || Number(bet) < 2000) return;
    setLoading(true);
    setResult(null);
    onResult(null);
    try {
      const res = await api.playGame({ telegramId: user.telegramId, gameType: game.id, betAmount: Number(bet) });
      setResult(res);
      onResult(res);
      await refreshUser();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getGameVisual = () => {
    if (!result) {
      const icons: Record<string, string> = {
        dice: "🎲", slots: "🎰", roulette: "🎡", mines: "💣",
        wheel: "🎯", coinflip: "🪙", blackjack: "🃏", plinko: "⚡", keno: "🔢",
      };
      return <div className="text-7xl float-anim">{icons[game.id] || "🎮"}</div>;
    }
    return (
      <div className={`text-center ${result.won ? "win-burst" : "shake"}`}>
        <div className="text-5xl mb-2">{result.won ? "🎉" : "😢"}</div>
        <div className={`text-2xl font-black ${result.won ? "text-green-400" : "text-red-400"}`}>
          {result.won ? `${result.multiplier}x — +${result.payout.toLocaleString()} so'm` : "Yutqazdingiz"}
        </div>
      </div>
    );
  };

  const extras: Record<string, JSX.Element> = {
    coinflip: (
      <div className="flex gap-2">
        {["Oltin", "Yozuv"].map((c) => (
          <button key={c} onClick={() => setChoice(c)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${choice === c ? "border-primary bg-primary/20" : "border-border"}`}>
            {c === "Oltin" ? "🪙 Oltin" : "📜 Yozuv"}
          </button>
        ))}
      </div>
    ),
    roulette: (
      <div className="flex gap-2">
        {["Qizil", "Qora"].map((c) => (
          <button key={c} onClick={() => setChoice(c)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${choice === c ? "border-primary bg-primary/20" : "border-border"}`}>
            {c === "Qizil" ? "🔴 Qizil" : "⚫ Qora"}
          </button>
        ))}
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-8 flex items-center justify-center min-h-[160px] bg-gradient-to-br ${game.color} bg-opacity-20`}>
        {getGameVisual()}
      </div>
      {extras[game.id]}
      <input
        type="number"
        value={bet}
        onChange={(e) => setBet(e.target.value)}
        placeholder="Stavka (minimal 2,000)"
        disabled={loading}
        className="w-full bg-card border border-border rounded-xl px-4 py-3 font-bold focus:outline-none focus:border-primary"
      />
      <div className="grid grid-cols-4 gap-2">
        {[2000, 5000, 10000, 50000].map((q) => (
          <button key={q} onClick={() => setBet(String(q))}
            className="bg-secondary rounded-lg py-2 text-xs font-medium hover:bg-muted">
            {q >= 1000 ? `${q / 1000}K` : q}
          </button>
        ))}
      </div>
      <button
        onClick={play}
        disabled={Number(bet) < 2000 || loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
          Number(bet) >= 2000 && !loading ? `bg-gradient-to-r ${game.color} text-white` : "bg-muted text-muted-foreground opacity-50"
        }`}>
        {loading ? "O'ynalmoqda..." : `${game.name} — O'ynash`}
      </button>
    </div>
  );
}

export function GamesPage() {
  const { user } = useApp();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  const game = GAMES.find((g) => g.id === activeGame);

  if (activeGame && game) {
    return (
      <div className="flex flex-col gap-4 pb-24 px-4 pt-2">
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveGame(null); setLastResult(null); }}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm">←</button>
          <div>
            <div className="font-bold">{game.name}</div>
            <div className="text-xs text-muted-foreground">{game.desc}</div>
          </div>
        </div>

        {/* Balance */}
        <div className="flex justify-between text-sm bg-card border border-border rounded-xl px-4 py-2">
          <span className="text-muted-foreground">O'yin balansi</span>
          <span className="font-bold text-green-400">{(user?.gameBalance ?? 0).toLocaleString()} so'm</span>
        </div>

        {/* Win/lose indicator */}
        {lastResult && (
          <div className={`rounded-xl px-4 py-3 text-sm font-bold text-center ${
            lastResult.won ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
            {lastResult.won
              ? `🎉 Yutdingiz! +${lastResult.payout.toLocaleString()} so'm (${lastResult.multiplier}x)`
              : `😢 Yutqazdingiz. Balansingiz: ${lastResult.newGameBalance.toLocaleString()} so'm`}
          </div>
        )}

        {activeGame === "crash" ? (
          <CrashGame onResult={setLastResult} gameBalance={user?.gameBalance ?? 0} />
        ) : (
          <SimpleGame game={game} onResult={setLastResult} />
        )}

        <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <div>• Minimal stavka: <span className="text-foreground">2,000 so'm</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-2">
      <div className="flex justify-between items-center">
        <div className="text-lg font-bold">🎮 O'yinlar</div>
        <div className="text-sm text-green-400 font-bold">{(user?.gameBalance ?? 0).toLocaleString()} so'm</div>
      </div>

      <div className="text-xs text-muted-foreground bg-card border border-border rounded-xl px-3 py-2">
        ⚠️ Minimal stavka 2,000 so'm
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => { setActiveGame(game.id); setLastResult(null); }}
            className={`rounded-2xl p-4 text-left bg-gradient-to-br ${game.color} bg-opacity-10 border border-white/10 active:scale-95 transition-all hover:scale-105`}
          >
            <div className="text-3xl mb-2">{game.name.split(" ")[0]}</div>
            <div className="font-bold text-sm text-white">{game.name.slice(2)}</div>
            <div className="text-xs text-white/60 mt-1">{game.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
