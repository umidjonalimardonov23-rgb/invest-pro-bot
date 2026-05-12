import os

BOT_TOKEN = os.getenv("BOT_TOKEN", "8673048636:AAGt98mEwI85lWnKqLwlH3yqbLbumuuYWqI")
ADMIN_ID = int(os.getenv("ADMIN_ID", "7575930751"))
PAYMENT_CARD = os.getenv("PAYMENT_CARD", "9860606760806673")
DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///database.db"
PORT = int(os.getenv("PORT") or 8080)
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://invest-pro-mini.up.railway.app")

MIN_DEPOSIT = 2000
MIN_INVEST = 30000
MIN_GAME_BET = 2000

PROFIT_TIERS = [
    {"min": 0,       "max": 200000,   "percent": 1.5,  "name": "Standart", "days_min": 5, "days_max": 30},
    {"min": 200000,  "max": 500000,   "percent": 2.0,  "name": "Plus",     "days_min": 5, "days_max": 30},
    {"min": 500000,  "max": 1000000,  "percent": 2.5,  "name": "Pro",      "days_min": 5, "days_max": 30},
    {"min": 1000000, "max": 2000000,  "percent": 3.0,  "name": "VIP",      "days_min": 5, "days_max": 30},
    {"min": 2000000, "max": float("inf"), "percent": 3.5, "name": "Max",   "days_min": 5, "days_max": 30},
]

REAL_MADRID_CARD = "9860606760806673"
BARCELONA_CARD = "9860606760806673"
MIN_DONATION = 2000000
