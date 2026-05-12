import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, jsonify, request
from database import get_session, User, Investment, TeamDonation, DepositRequest

app = Flask(__name__, template_folder="../templates")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/user/<int:telegram_id>")
def get_user(telegram_id):
    session = get_session()
    user = session.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        session.close()
        return jsonify({"game_balance": 0, "invest_balance": 0})
    data = {
        "telegram_id": user.telegram_id,
        "username": user.username,
        "game_balance": user.game_balance,
        "invest_balance": user.invest_balance,
        "total_deposited": user.total_deposited,
    }
    session.close()
    return jsonify(data)


@app.route("/api/teams")
def get_teams():
    session = get_session()
    teams = session.query(TeamDonation).all()
    data = {t.team: t.total for t in teams}
    session.close()
    return jsonify(data)


@app.route("/api/game/play", methods=["POST"])
def play_game():
    import random
    data = request.json
    telegram_id = data.get("telegram_id")
    game = data.get("game")
    bet = float(data.get("bet", 0))
    extra = data.get("extra", {})

    from config import MIN_GAME_BET
    if bet < MIN_GAME_BET:
        return jsonify({"success": False, "error": f"Minimal stavka {MIN_GAME_BET:,} so'm"}), 400

    session = get_session()
    user = session.query(User).filter_by(telegram_id=telegram_id).first()
    if not user or user.game_balance < bet:
        session.close()
        return jsonify({"success": False, "error": "Balans yetarli emas"}), 400

    user.game_balance -= bet
    result = _play_game_logic(game, bet, extra)
    if result["win"]:
        user.game_balance += result["payout"]

    session.commit()
    new_balance = user.game_balance
    session.close()

    return jsonify({
        "success": True,
        "win": result["win"],
        "payout": result["payout"],
        "multiplier": result.get("multiplier", 0),
        "message": result["message"],
        "balance": new_balance,
        "details": result.get("details", {})
    })


def _play_game_logic(game, bet, extra):
    import random

    def weighted_win(win_chance):
        return random.random() < win_chance

    if game == "crash":
        # Server determines crash point
        crash_at = round(1.0 + random.expovariate(0.5), 2)
        crash_at = min(crash_at, 10.0)
        cashout = float(extra.get("cashout", 1.5))
        if cashout <= crash_at:
            payout = round(bet * cashout, 2)
            return {"win": True, "payout": payout, "multiplier": cashout,
                    "message": f"Tabrik! {cashout}x — {payout:,.0f} so'm yutdingiz!",
                    "details": {"crash_at": crash_at}}
        else:
            return {"win": False, "payout": 0, "multiplier": crash_at,
                    "message": f"Samolyot {crash_at}x da uchib ketdi!",
                    "details": {"crash_at": crash_at}}

    elif game == "dice":
        player = int(extra.get("choice", 4))
        rolled = random.randint(1, 6)
        win = player == rolled
        payout = bet * 5 if win else 0
        return {"win": win, "payout": payout, "multiplier": 5,
                "message": f"Zar: {rolled} — {'Yutdingiz! 5x' if win else 'Yutqazdingiz'}" ,
                "details": {"rolled": rolled, "choice": player}}

    elif game == "slots":
        symbols = ["🍒", "🍊", "🍋", "💎", "⭐", "7️⃣"]
        weights = [30, 25, 20, 10, 10, 5]
        reels = random.choices(symbols, weights=weights, k=3)
        if reels[0] == reels[1] == reels[2]:
            sym = reels[0]
            mult = {"💎": 20, "7️⃣": 15, "⭐": 10, "🍒": 5, "🍊": 4, "🍋": 3}.get(sym, 3)
            payout = bet * mult
            return {"win": True, "payout": payout, "multiplier": mult,
                    "message": f"JACKPOT! {' '.join(reels)} — {mult}x!",
                    "details": {"reels": reels}}
        elif reels[0] == reels[1] or reels[1] == reels[2]:
            payout = bet * 1.5
            return {"win": True, "payout": payout, "multiplier": 1.5,
                    "message": f"2 ta mos: {' '.join(reels)} — 1.5x",
                    "details": {"reels": reels}}
        return {"win": False, "payout": 0, "message": f"{' '.join(reels)} — Yutqazdingiz",
                "details": {"reels": reels}}

    elif game == "coinflip":
        choice = extra.get("choice", "heads")
        result = random.choice(["heads", "tails"])
        win = choice == result
        payout = bet * 1.9 if win else 0
        label = {"heads": "Yuz", "tails": "Dum"}
        return {"win": win, "payout": payout, "multiplier": 1.9,
                "message": f"{label[result]} tushdi — {'Yutdingiz 1.9x!' if win else 'Yutqazdingiz'}",
                "details": {"result": result}}

    elif game == "roulette":
        choice = extra.get("choice", "red")
        num = random.randint(0, 36)
        reds = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
        actual = "green" if num == 0 else ("red" if num in reds else "black")
        if choice == actual:
            mult = 14 if choice == "green" else 2
            payout = bet * mult
            return {"win": True, "payout": payout, "multiplier": mult,
                    "message": f"{num} — {actual.upper()} — {mult}x!",
                    "details": {"number": num, "color": actual}}
        return {"win": False, "payout": 0,
                "message": f"{num} — {actual.upper()} — Yutqazdingiz",
                "details": {"number": num, "color": actual}}

    elif game == "blackjack":
        def draw(): return min(random.randint(1, 13), 10)
        player = [draw(), draw()]
        dealer = [draw(), draw()]
        p_sum = sum(player)
        d_sum = sum(dealer)
        if p_sum == 21:
            payout = bet * 2.5
            return {"win": True, "payout": payout, "multiplier": 2.5,
                    "message": f"BLACKJACK! {player} — 2.5x!",
                    "details": {"player": player, "dealer": dealer}}
        if p_sum > 21:
            return {"win": False, "payout": 0,
                    "message": f"Bust! {p_sum} — Yutqazdingiz",
                    "details": {"player": player, "dealer": dealer}}
        while d_sum < 17:
            dealer.append(draw())
            d_sum = sum(dealer)
        if d_sum > 21 or p_sum > d_sum:
            payout = bet * 2
            return {"win": True, "payout": payout, "multiplier": 2,
                    "message": f"Yutdingiz! {p_sum} vs {d_sum} — 2x!",
                    "details": {"player": player, "dealer": dealer}}
        return {"win": False, "payout": 0,
                "message": f"Yutqazdingiz: {p_sum} vs {d_sum}",
                "details": {"player": player, "dealer": dealer}}

    elif game == "hilo":
        current = random.randint(1, 13)
        choice = extra.get("choice", "higher")
        next_card = random.randint(1, 13)
        correct = (choice == "higher" and next_card > current) or (choice == "lower" and next_card < current)
        payout = bet * 1.9 if correct else 0
        return {"win": correct, "payout": payout, "multiplier": 1.9,
                "message": f"{current} → {next_card} — {'To\'g\'ri! 1.9x' if correct else 'Noto\'g\'ri'}",
                "details": {"current": current, "next": next_card}}

    elif game == "plinko":
        import math
        rows = 8
        pos = 4
        for _ in range(rows):
            pos += random.choice([-1, 1])
        pos = max(0, min(8, pos))
        multipliers = [10, 3, 1.5, 1, 0.5, 1, 1.5, 3, 10]
        mult = multipliers[pos]
        win = mult >= 1
        payout = bet * mult if win else 0
        return {"win": win, "payout": payout, "multiplier": mult,
                "message": f"Pozitsiya {pos}: {mult}x — {payout:,.0f} so'm",
                "details": {"position": pos, "mult": mult}}

    elif game == "mines":
        mines = int(extra.get("mines", 3))
        chosen = int(extra.get("chosen", 0))
        total_cells = 25
        safe = total_cells - mines
        win_chance = (safe / total_cells) ** chosen if chosen > 0 else 0.7
        win = random.random() < win_chance
        mult = round((total_cells / safe) ** chosen, 2) if chosen > 0 else 1.5
        payout = bet * mult if win else 0
        return {"win": win, "payout": payout, "multiplier": mult,
                "message": f"{'Xavfsiz! ' + str(mult) + 'x' if win else 'MINE! Portladi!'}",
                "details": {"mines": mines}}

    elif game == "wheel":
        segments = [0, 1.5, 0, 2, 0, 3, 0, 5, 0, 10]
        result_seg = random.choice(segments)
        win = result_seg > 0
        payout = bet * result_seg if win else 0
        return {"win": win, "payout": payout, "multiplier": result_seg,
                "message": f"{'Yutdingiz ' + str(result_seg) + 'x!' if win else 'Yutqazdingiz — 0'}",
                "details": {"segment": result_seg}}

    return {"win": False, "payout": 0, "message": "Noma'lum o'yin"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
