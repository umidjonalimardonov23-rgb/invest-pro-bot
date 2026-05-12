import { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { closeMiniApp } from "../lib/telegram";

const CARD_NUMBER = "9860606760806673";

export function DepositPage() {
  const { user, refreshUser } = useApp();
  const [amount, setAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"game" | "invest">("game");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const numAmount = Number(amount.replace(/\s/g, ""));
  const isValid = numAmount >= 2000;

  const quickAmounts = [10000, 50000, 100000, 500000];

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setLoading(true);
    setError("");
    try {
      await api.createDeposit({
        telegramId: user.telegramId,
        amount: numAmount,
        balanceType,
      });
      setSuccess(true);
      // Auto-close and send message to send receipt
      setTimeout(() => {
        closeMiniApp();
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Xato yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
        <div className="text-6xl">✅</div>
        <div className="text-xl font-bold">So'rov yuborildi!</div>
        <div className="text-muted-foreground">
          Endi <strong>{numAmount.toLocaleString()} so'm</strong>ni quyidagi kartaga o'tkazing va chek rasmini yuboring:
        </div>
        <div className="bg-card border border-border rounded-xl p-4 w-full">
          <div className="text-xs text-muted-foreground mb-1">Karta raqami</div>
          <div className="font-mono font-bold text-lg tracking-widest">{CARD_NUMBER}</div>
        </div>
        <div className="text-sm text-muted-foreground">Ilovadan chiqilmoqda...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-2">
      <div className="text-lg font-bold">💳 Hisob to'ldirish</div>

      {/* Balance type selector */}
      <div className="bg-card border border-border rounded-xl p-1 flex gap-1">
        {(["game", "invest"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setBalanceType(type)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              balanceType === type
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {type === "game" ? "🎮 O'yin balansi" : "📈 Investitsiya balansi"}
          </button>
        ))}
      </div>

      {/* Current balances */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className={`rounded-lg p-3 border ${balanceType === "game" ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}>
          <div className="text-muted-foreground text-xs">O'yin balansi</div>
          <div className="font-bold text-green-400">{(user?.gameBalance ?? 0).toLocaleString()} so'm</div>
        </div>
        <div className={`rounded-lg p-3 border ${balanceType === "invest" ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}>
          <div className="text-muted-foreground text-xs">Investitsiya</div>
          <div className="font-bold text-blue-400">{(user?.investBalance ?? 0).toLocaleString()} so'm</div>
        </div>
      </div>

      {/* Amount input */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Summa (so'm)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Minimal 2,000 so'm"
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-primary transition-colors"
        />
        {amount && !isValid && (
          <div className="text-destructive text-xs mt-1">Minimal summa 2,000 so'm</div>
        )}
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2">
        {quickAmounts.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String(q))}
            className="bg-secondary text-secondary-foreground rounded-lg py-2 text-xs font-medium hover:bg-muted transition-colors"
          >
            {q >= 1000 ? `${q / 1000}K` : q}
          </button>
        ))}
      </div>

      {/* Card info */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-sm font-semibold mb-2">💳 To'lov kartasi</div>
        <div className="font-mono font-bold text-lg tracking-widest text-primary">{CARD_NUMBER}</div>
        <div className="text-xs text-muted-foreground mt-1">
          To'lov qilgach chekni botga yuboring — admin tasdiqlaydi
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card border border-border rounded-xl p-4 text-sm space-y-2">
        <div className="font-semibold mb-2">Qanday ishlaydi?</div>
        {[
          "Summa kiriting va \"Tasdiqlash\" bosing",
          "Yuqoridagi kartaga pul o'tkazing",
          "Chek rasmini Telegram botga yuboring",
          "Admin tasdiqlaydi — pul hisobingizga tushadi",
        ].map((step, i) => (
          <div key={i} className="flex gap-2 text-muted-foreground">
            <span className="font-bold text-primary">{i + 1}.</span>
            {step}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Submit button - disabled without valid amount */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
          isValid && !loading
            ? "bg-primary text-primary-foreground active:scale-95"
            : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
        }`}
      >
        {loading ? "Yuborilmoqda..." : isValid ? `✅ ${numAmount.toLocaleString()} so'm Tasdiqlash` : "Summa kiriting"}
      </button>
    </div>
  );
}
