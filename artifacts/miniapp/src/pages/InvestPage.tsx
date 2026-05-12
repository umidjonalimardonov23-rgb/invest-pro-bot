import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

function getProfitRate(amount: number) {
  if (amount >= 2_000_000) return 3.5;
  if (amount >= 1_000_000) return 3.0;
  if (amount >= 500_000) return 2.5;
  if (amount >= 200_000) return 2.0;
  return 1.5;
}

export function InvestPage() {
  const { user, refreshUser } = useApp();
  const [investments, setInvestments] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<"new" | "active">("new");

  const numAmount = Number(amount);
  const rate = getProfitRate(numAmount);
  const dailyProfit = (numAmount * rate) / 100;
  const totalProfit = dailyProfit * days;

  useEffect(() => {
    if (user) {
      api.getInvestments(user.telegramId).then(setInvestments).catch(() => {});
    }
  }, [user]);

  const handleInvest = async () => {
    if (!user || numAmount < 50000) return;
    setLoading(true);
    setError("");
    try {
      const inv = await api.createInvestment({ telegramId: user.telegramId, amount: numAmount, durationDays: days });
      setInvestments((prev) => [inv, ...prev]);
      setAmount("");
      setSuccess(`✅ ${numAmount.toLocaleString()} so'm ${days} kunga sarmoyaga yo'naltirildi!`);
      await refreshUser();
      setTimeout(() => setSuccess(""), 4000);
      setTab("active");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const activeInv = investments.filter((i) => i.status === "active");
  const completedInv = investments.filter((i) => i.status === "completed");

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-2">
      <div className="text-lg font-bold">📈 Sarmoya boshqaruvi</div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setTab("new")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          ➕ Yangi sarmoya
        </button>
        <button
          onClick={() => setTab("active")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          📋 Faol ({activeInv.length})
        </button>
      </div>

      {tab === "new" && (
        <>
          {/* Balance info */}
          <div className="bg-card border border-border rounded-xl p-3 flex justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Investitsiya balansi</div>
              <div className="font-bold text-blue-400">{(user?.investBalance ?? 0).toLocaleString()} so'm</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Minimal sarmoya</div>
              <div className="font-bold">50,000 so'm</div>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sarmoya summasi</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50,000 so'mdan ko'p"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-2">
            {[50000, 100000, 500000, 1000000].map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className="bg-secondary rounded-lg py-2 text-xs font-medium hover:bg-muted transition-colors"
              >
                {q >= 1000000 ? `${q / 1000000}M` : `${q / 1000}K`}
              </button>
            ))}
          </div>

          {/* Duration slider */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="font-medium">Muddat</label>
              <span className="font-bold text-primary">{days} kun</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5 kun (min)</span>
              <span>30 kun (max)</span>
            </div>
          </div>

          {/* Profit preview */}
          {numAmount >= 50000 && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
              <div className="font-semibold text-primary">Hisob-kitob</div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sarmoya</span>
                <span className="font-bold">{numAmount.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kunlik stavka</span>
                <span className="font-bold text-green-400">{rate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kunlik foyda</span>
                <span className="font-bold text-green-400">+{Math.floor(dailyProfit).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Muddat</span>
                <span className="font-bold">{days} kun</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between">
                <span className="font-semibold">Jami foyda</span>
                <span className="font-bold text-accent text-lg">+{Math.floor(totalProfit).toLocaleString()} so'm</span>
              </div>
            </div>
          )}

          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-xl px-4 py-3">{error}</div>}
          {success && <div className="text-green-400 text-sm bg-green-400/10 rounded-xl px-4 py-3">{success}</div>}

          <button
            onClick={handleInvest}
            disabled={numAmount < 50000 || loading || (user?.investBalance ?? 0) < numAmount}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              numAmount >= 50000 && !loading && (user?.investBalance ?? 0) >= numAmount
                ? "bg-primary text-primary-foreground active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            {loading ? "Joylashtirilmoqda..." : (user?.investBalance ?? 0) < numAmount && numAmount > 0 ? "Balans yetarli emas" : "📈 Sarmoya kiritish"}
          </button>

          <div className="text-xs text-muted-foreground text-center">
            Foyda sarmoya boshlanganidan 24 soat o'tgach tushadi
          </div>
        </>
      )}

      {tab === "active" && (
        <div className="space-y-3">
          {activeInv.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-4xl mb-3">📭</div>
              <div>Faol sarmoya yo'q</div>
              <button onClick={() => setTab("new")} className="mt-3 text-primary text-sm">
                Yangi sarmoya kiriting →
              </button>
            </div>
          ) : (
            activeInv.map((inv) => {
              const daysLeft = Math.max(0, Math.ceil((new Date(inv.endsAt).getTime() - Date.now()) / 86400000));
              const progress = ((inv.durationDays - daysLeft) / inv.durationDays) * 100;
              return (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Sarmoya</div>
                      <div className="font-bold text-lg">{inv.amount.toLocaleString()} so'm</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Stavka</div>
                      <div className="font-bold text-green-400">{inv.profitRate}%/kun</div>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="progress-bar h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{daysLeft} kun qoldi</span>
                    <span>{Math.floor(inv.totalEarned).toLocaleString()} so'm ishlab olindi</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted rounded-lg p-2">
                      <div className="text-muted-foreground">Kunlik</div>
                      <div className="font-bold text-green-400">+{Math.floor(inv.dailyProfit).toLocaleString()} so'm</div>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <div className="text-muted-foreground">Tugash</div>
                      <div className="font-bold">{new Date(inv.endsAt).toLocaleDateString("uz")}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {completedInv.length > 0 && (
            <>
              <div className="text-sm font-semibold text-muted-foreground pt-2">Yakunlangan</div>
              {completedInv.map((inv) => (
                <div key={inv.id} className="bg-card border border-border rounded-xl p-4 opacity-60">
                  <div className="flex justify-between">
                    <div className="font-semibold">{inv.amount.toLocaleString()} so'm</div>
                    <div className="text-green-400 font-bold">+{Math.floor(inv.totalEarned).toLocaleString()} so'm</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{inv.durationDays} kun • {inv.profitRate}%/kun • ✅ Yakunlandi</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
