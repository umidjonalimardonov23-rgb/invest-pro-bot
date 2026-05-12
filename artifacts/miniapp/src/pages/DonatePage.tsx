import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { closeMiniApp } from "../lib/telegram";

const MIN_DONATION = 2_000_000;

export function DonatePage() {
  const { user, refreshUser } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [team, setTeam] = useState<"real_madrid" | "barcelona">("real_madrid");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<"balance" | "receipt">("balance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.getDonations().then(setStats).catch(() => {});
  }, []);

  const numAmount = Number(amount);
  const isValid = numAmount >= MIN_DONATION;

  const handleDonate = async () => {
    if (!user || !isValid) return;
    setLoading(true);
    setError("");
    try {
      await api.createDonation({ telegramId: user.telegramId, team, amount: numAmount, source });
      const newStats = await api.getDonations();
      setStats(newStats);
      await refreshUser();
      if (source === "receipt") {
        setSuccess("Chek so'rovi adminga yuborildi! Chek rasmini botga yuboring.");
        setTimeout(() => closeMiniApp(), 3000);
      } else {
        setSuccess(`✅ ${numAmount.toLocaleString()} so'm ${team === "real_madrid" ? "Real Madrid" : "Barcelona"}ga danat qilindi!`);
      }
      setAmount("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const realTotal = stats?.realMadridTotal ?? 0;
  const barsaTotal = stats?.barcelonaTotal ?? 0;
  const grandTotal = realTotal + barsaTotal;
  const realPct = grandTotal > 0 ? (realTotal / grandTotal) * 100 : 50;
  const barsaPct = grandTotal > 0 ? (barsaTotal / grandTotal) * 100 : 50;

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-2">
      <div className="text-lg font-bold">⚽ El-Klassiko Danat</div>

      {/* Battle scoreboard */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-center text-xs text-muted-foreground mb-3 uppercase tracking-widest">Danat reytingi</div>
        <div className="flex items-center gap-3">
          {/* Real Madrid */}
          <div className="flex-1 text-center">
            <div className="text-4xl mb-1">⚪</div>
            <div className="font-bold text-sm">Real Madrid</div>
            <div className="text-white font-black text-lg">{realTotal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">so'm</div>
          </div>
          {/* VS */}
          <div className="text-center">
            <div className="text-2xl font-black text-accent">VS</div>
          </div>
          {/* Barcelona */}
          <div className="flex-1 text-center">
            <div className="text-4xl mb-1">🔵🔴</div>
            <div className="font-bold text-sm">Barcelona</div>
            <div className="text-blue-400 font-black text-lg">{barsaTotal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">so'm</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 flex rounded-full overflow-hidden h-3 bg-muted">
          <div className="bg-white transition-all" style={{ width: `${realPct}%` }} />
          <div className="bg-gradient-to-r from-blue-600 to-red-500 transition-all" style={{ width: `${barsaPct}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
          <span>{realPct.toFixed(1)}%</span>
          <span>{barsaPct.toFixed(1)}%</span>
        </div>
      </div>

      {/* Team selector */}
      <div>
        <div className="text-sm font-medium mb-2">Jamoa tanlang</div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTeam("real_madrid")}
            className={`rounded-xl p-4 border-2 transition-all text-center ${
              team === "real_madrid" ? "border-white bg-white/10" : "border-border bg-card"
            }`}
          >
            <div className="text-3xl mb-2">⚪</div>
            <div className="font-bold text-sm">Real Madrid</div>
            <div className="text-xs text-muted-foreground">Los Blancos</div>
          </button>
          <button
            onClick={() => setTeam("barcelona")}
            className={`rounded-xl p-4 border-2 transition-all text-center ${
              team === "barcelona" ? "border-blue-500 bg-blue-500/10" : "border-border bg-card"
            }`}
          >
            <div className="text-3xl mb-2">🔵🔴</div>
            <div className="font-bold text-sm">Barcelona</div>
            <div className="text-xs text-muted-foreground">Blaugrana</div>
          </button>
        </div>
      </div>

      {/* Source selector */}
      <div>
        <div className="text-sm font-medium mb-2">To'lov usuli</div>
        <div className="bg-card border border-border rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setSource("balance")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${source === "balance" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            💰 Balansdan
          </button>
          <button
            onClick={() => setSource("receipt")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${source === "receipt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            📸 Chek bilan
          </button>
        </div>
        {source === "balance" && (
          <div className="text-xs text-muted-foreground mt-1 text-center">
            O'yin balansidan: <span className="font-bold text-green-400">{(user?.gameBalance ?? 0).toLocaleString()} so'm</span>
          </div>
        )}
        {source === "receipt" && (
          <div className="text-xs text-muted-foreground mt-1 text-center">
            To'lov qilib chekni botga yuboring — admin tasdiqlaydi
          </div>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Summa (minimal 2,000,000 so'm)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="2,000,000"
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-primary"
        />
        {amount && !isValid && (
          <div className="text-destructive text-xs mt-1">Minimal danat 2,000,000 so'm</div>
        )}
      </div>

      {/* Quick amounts */}
      <div className="grid grid-cols-3 gap-2">
        {[2000000, 5000000, 10000000].map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className="bg-secondary rounded-lg py-2 text-xs font-medium hover:bg-muted"
          >
            {q >= 1000000 ? `${q / 1000000}M` : `${q / 1000}K`}
          </button>
        ))}
      </div>

      {error && <div className="text-destructive text-sm bg-destructive/10 rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="text-green-400 text-sm bg-green-400/10 rounded-xl px-4 py-3">{success}</div>}

      <button
        onClick={handleDonate}
        disabled={!isValid || loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
          isValid && !loading
            ? "bg-accent text-accent-foreground active:scale-95"
            : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
        }`}
      >
        {loading ? "Joylashtirilmoqda..." : isValid ? `⚽ ${team === "real_madrid" ? "Real Madrid" : "Barcelona"}ga Danat` : "Summa kiriting"}
      </button>

      {/* Recent donations */}
      {stats?.recent?.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">So'nggi danatlar</div>
          {stats.recent.slice(0, 5).map((d: any) => (
            <div key={d.id} className="flex justify-between items-center bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span>{d.team === "real_madrid" ? "⚪" : "🔵🔴"}</span>
                <span className="text-muted-foreground">{d.telegramId.slice(-4)}...User</span>
              </div>
              <span className="font-bold text-accent">{Number(d.amount).toLocaleString()} so'm</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
