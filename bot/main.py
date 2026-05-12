import logging
import asyncio
import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton,
    ReplyKeyboardMarkup, KeyboardButton, BotCommand, MenuButtonWebApp
)
from config import (
    BOT_TOKEN, ADMIN_ID, PAYMENT_CARD, MINI_APP_URL,
    PROFIT_TIERS, MIN_DEPOSIT, MIN_INVEST, MIN_GAME_BET,
    REAL_MADRID_CARD, BARCELONA_CARD, MIN_DONATION
)
from database import get_session, User, Investment, DepositRequest, DonationRequest, TeamDonation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


def get_or_create_user(session, telegram_id, username=None, full_name=None):
    user = session.query(User).filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(telegram_id=telegram_id, username=username, full_name=full_name)
        session.add(user)
        session.commit()
    return user


def get_tier(amount):
    for tier in PROFIT_TIERS:
        if tier["min"] <= amount < tier["max"]:
            return tier
    return PROFIT_TIERS[-1]


def main_keyboard():
    kb = [
        [KeyboardButton(text="💰 Pul kiritish"), KeyboardButton(text="📊 Hisobim")],
        [KeyboardButton(text="📈 Investitsiya"), KeyboardButton(text="🎮 O'yinlar")],
        [KeyboardButton(text="⚽ Donatsiya"), KeyboardButton(text="📞 Admin")],
        [KeyboardButton(text="📱 Mini App", web_app=WebAppInfo(url=MINI_APP_URL))],
    ]
    return ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    session = get_session()
    user = get_or_create_user(
        session, message.from_user.id,
        message.from_user.username,
        message.from_user.full_name
    )
    session.close()
    text = (
        f"Assalomu alaykum, <b>{message.from_user.first_name}</b>! 👋\n\n"
        f"<b>Invest Pro</b> — sarmoya va o'yinlar platformasi\n\n"
        f"💰 Pul kiritib, foiz oling\n"
        f"🎮 O'yinlarda g'alaba qozonin\n"
        f"⚽ Sevimli jamoangizga donatsiya qiling\n\n"
        f"Minimal depozit: <b>{MIN_DEPOSIT:,} so'm</b>\n"
        f"Minimal o'yin stavkasi: <b>{MIN_GAME_BET:,} so'm</b>"
    )
    await message.answer(text, reply_markup=main_keyboard(), parse_mode="HTML")


@dp.message(F.text == "📊 Hisobim")
async def my_account(message: types.Message):
    session = get_session()
    user = get_or_create_user(session, message.from_user.id)
    investments = session.query(Investment).filter_by(
        telegram_id=message.from_user.id, is_active=True
    ).all()
    total_invested = sum(i.amount for i in investments)
    total_earned = sum(i.earned for i in investments)
    session.close()

    tier = get_tier(total_invested)
    text = (
        f"👤 <b>Hisobingiz</b>\n\n"
        f"🎮 O'yin balansi: <b>{user.game_balance:,.0f} so'm</b>\n"
        f"📈 Investitsiya balansi: <b>{user.invest_balance:,.0f} so'm</b>\n\n"
        f"💼 Faol investitsiyalar: <b>{len(investments)} ta</b>\n"
        f"📊 Jami investitsiya: <b>{total_invested:,.0f} so'm</b>\n"
        f"💸 Jami foyda: <b>{total_earned:,.0f} so'm</b>\n\n"
        f"🏆 Daraja: <b>{tier['name']}</b> ({tier['percent']}%/kun)"
    )
    await message.answer(text, parse_mode="HTML")


@dp.message(F.text == "💰 Pul kiritish")
async def deposit_menu(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 O'yin balansi", callback_data="dep_game")],
        [InlineKeyboardButton(text="📈 Investitsiya balansi", callback_data="dep_invest")],
    ])
    await message.answer(
        f"💳 <b>Pul kiritish</b>\n\nQaysi balansga pul kiritmoqchisiz?\n\n"
        f"Minimal miqdor: <b>{MIN_DEPOSIT:,} so'm</b>",
        reply_markup=kb, parse_mode="HTML"
    )


@dp.callback_query(F.data.in_(["dep_game", "dep_invest"]))
async def deposit_type_chosen(callback: types.CallbackQuery):
    target = "game" if callback.data == "dep_game" else "invest"
    target_name = "O'yin" if target == "game" else "Investitsiya"
    await callback.message.answer(
        f"💳 <b>{target_name} balansi uchun pul kiritish</b>\n\n"
        f"Karta raqami: <code>{PAYMENT_CARD}</code>\n\n"
        f"📌 To'lov miqdorini yozing va tasdiqlash tugmasini bosing:\n"
        f"(Minimal: <b>{MIN_DEPOSIT:,} so'm</b>)",
        parse_mode="HTML"
    )
    await callback.answer()
    # Store target in user state via simple dict
    user_deposit_targets[callback.from_user.id] = target


user_deposit_targets = {}
user_deposit_amounts = {}


@dp.message(F.text.regexp(r'^\d+$'))
async def handle_amount_input(message: types.Message):
    if message.from_user.id not in user_deposit_targets:
        return
    amount = int(message.text)
    if amount < MIN_DEPOSIT:
        await message.answer(f"❌ Minimal miqdor: <b>{MIN_DEPOSIT:,} so'm</b>", parse_mode="HTML")
        return
    user_deposit_amounts[message.from_user.id] = amount
    target = user_deposit_targets[message.from_user.id]
    target_name = "O'yin" if target == "game" else "Investitsiya"
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Chek yuborish", callback_data=f"send_receipt_{target}_{amount}")],
        [InlineKeyboardButton(text="❌ Bekor qilish", callback_data="cancel_deposit")],
    ])
    await message.answer(
        f"💰 Miqdor: <b>{amount:,} so'm</b>\n"
        f"📍 Balans: <b>{target_name}</b>\n\n"
        f"Karta: <code>{PAYMENT_CARD}</code>\n\n"
        f"To'lovni amalga oshirib, chek rasmini yuboring:",
        reply_markup=kb, parse_mode="HTML"
    )


@dp.callback_query(F.data.startswith("send_receipt_"))
async def prompt_receipt(callback: types.CallbackQuery):
    parts = callback.data.split("_")
    target = parts[2]
    amount = float(parts[3])
    user_deposit_targets[callback.from_user.id] = target
    user_deposit_amounts[callback.from_user.id] = amount
    await callback.message.answer(
        f"📸 Endi to'lov chekini (rasm) yuboring.\n"
        f"Admin tekshirib, <b>{amount:,.0f} so'm</b> balansingizga tushiradi.",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.callback_query(F.data == "cancel_deposit")
async def cancel_deposit(callback: types.CallbackQuery):
    user_deposit_targets.pop(callback.from_user.id, None)
    user_deposit_amounts.pop(callback.from_user.id, None)
    await callback.message.answer("❌ Bekor qilindi.")
    await callback.answer()


@dp.message(F.photo)
async def handle_receipt(message: types.Message):
    if message.from_user.id not in user_deposit_amounts:
        return
    amount = user_deposit_amounts.pop(message.from_user.id, 0)
    target = user_deposit_targets.pop(message.from_user.id, "game")
    target_name = "O'yin" if target == "game" else "Investitsiya"

    session = get_session()
    req = DepositRequest(
        telegram_id=message.from_user.id,
        username=message.from_user.username,
        full_name=message.from_user.full_name,
        amount=amount,
        target=target,
        file_id=message.photo[-1].file_id
    )
    session.add(req)
    session.commit()
    req_id = req.id
    session.close()

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"✅ Tasdiqlash ({amount:,.0f})", callback_data=f"confirm_dep_{req_id}")],
        [InlineKeyboardButton(text="❌ Rad etish", callback_data=f"reject_dep_{req_id}")],
    ])
    await bot.send_photo(
        chat_id=ADMIN_ID,
        photo=message.photo[-1].file_id,
        caption=(
            f"💳 <b>Yangi depozit so'rovi #{req_id}</b>\n\n"
            f"👤 Foydalanuvchi: {message.from_user.full_name}\n"
            f"🆔 ID: <code>{message.from_user.id}</code>\n"
            f"📍 Balans: <b>{target_name}</b>\n"
            f"💰 Miqdor: <b>{amount:,.0f} so'm</b>"
        ),
        reply_markup=kb,
        parse_mode="HTML"
    )
    await message.answer(
        "✅ Chek adminga yuborildi!\nAdmin tekshirgach, pul balansingizga tushadi.",
        parse_mode="HTML"
    )


@dp.callback_query(F.data.startswith("confirm_dep_"))
async def confirm_deposit(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("Ruxsat yo'q!", show_alert=True)
        return
    req_id = int(callback.data.split("_")[2])
    session = get_session()
    req = session.query(DepositRequest).filter_by(id=req_id).first()
    if not req or req.status != "pending":
        await callback.answer("Bu so'rov allaqachon ko'rib chiqilgan!", show_alert=True)
        session.close()
        return
    req.status = "confirmed"
    user = get_or_create_user(session, req.telegram_id)
    if req.target == "invest":
        user.invest_balance += req.amount
    else:
        user.game_balance += req.amount
    user.total_deposited += req.amount
    session.commit()
    session.close()

    target_name = "O'yin" if req.target == "game" else "Investitsiya"
    await bot.send_message(
        req.telegram_id,
        f"🎉 <b>Tabriklaymiz!</b>\n\n"
        f"<b>{req.amount:,.0f} so'm</b> {target_name} balansingizga tushdi!\n\n"
        f"Endi o'yinlarda ishtirok eting yoki investitsiya kiriting.",
        parse_mode="HTML"
    )
    await callback.message.edit_caption(
        caption=callback.message.caption + "\n\n✅ <b>TASDIQLANDI</b>",
        parse_mode="HTML"
    )
    await callback.answer("Tasdiqlandi!")


@dp.callback_query(F.data.startswith("reject_dep_"))
async def reject_deposit(callback: types.CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("Ruxsat yo'q!", show_alert=True)
        return
    req_id = int(callback.data.split("_")[2])
    session = get_session()
    req = session.query(DepositRequest).filter_by(id=req_id).first()
    if req:
        req.status = "rejected"
        session.commit()
        await bot.send_message(
            req.telegram_id,
            "❌ Afsuski, depozit so'rovingiz rad etildi.\nMuammo bo'lsa, admin bilan bog'laning."
        )
    session.close()
    await callback.message.edit_caption(
        caption=callback.message.caption + "\n\n❌ <b>RAD ETILDI</b>",
        parse_mode="HTML"
    )
    await callback.answer("Rad etildi!")


@dp.message(F.text == "📈 Investitsiya")
async def investment_menu(message: types.Message):
    session = get_session()
    user = get_or_create_user(session, message.from_user.id)
    investments = session.query(Investment).filter_by(
        telegram_id=message.from_user.id, is_active=True
    ).all()
    session.close()

    tiers_text = "\n".join([
        f"{'✅' if get_tier(user.invest_balance)['name'] == t['name'] else '▫️'} "
        f"<b>{t['name']}</b>: {t['percent']}%/kun ({t['min']:,}–{'∞' if t['max'] == float('inf') else f\"{t['max']:,}\"} so'm)"
        for t in PROFIT_TIERS
    ])

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Investitsiya qo'shish", callback_data="add_invest")],
        [InlineKeyboardButton(text="📋 Faol investitsiyalar", callback_data="list_invest")],
    ])

    await message.answer(
        f"📈 <b>Investitsiya tizimi</b>\n\n"
        f"💰 Investitsiya balansi: <b>{user.invest_balance:,.0f} so'm</b>\n"
        f"📊 Faol: <b>{len(investments)} ta</b>\n\n"
        f"<b>Foiz darajalari (kunlik):</b>\n{tiers_text}\n\n"
        f"⏱ Minimal muddat: <b>5 kun</b>, Maksimal: <b>30 kun</b>",
        reply_markup=kb, parse_mode="HTML"
    )


invest_state = {}


@dp.callback_query(F.data == "add_invest")
async def start_invest(callback: types.CallbackQuery):
    session = get_session()
    user = get_or_create_user(session, callback.from_user.id)
    balance = user.invest_balance
    session.close()

    if balance < MIN_INVEST:
        await callback.answer(
            f"Investitsiya balansingiz yetarli emas! Minimal: {MIN_INVEST:,} so'm",
            show_alert=True
        )
        return

    invest_state[callback.from_user.id] = {"step": "amount", "balance": balance}
    await callback.message.answer(
        f"💰 Investitsiya miqdorini kiriting:\n"
        f"(Mavjud: <b>{balance:,.0f} so'm</b>, Minimal: <b>{MIN_INVEST:,} so'm</b>)",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.message(F.text.regexp(r'^\d+$'))
async def handle_invest_input(message: types.Message):
    if message.from_user.id not in invest_state:
        return
    state = invest_state[message.from_user.id]

    if state["step"] == "amount":
        amount = int(message.text)
        if amount < MIN_INVEST:
            await message.answer(f"❌ Minimal investitsiya: <b>{MIN_INVEST:,} so'm</b>", parse_mode="HTML")
            return
        if amount > state["balance"]:
            await message.answer(f"❌ Balansingiz yetarli emas: <b>{state['balance']:,.0f} so'm</b>", parse_mode="HTML")
            return

        tier = get_tier(amount)
        state["step"] = "days"
        state["amount"] = amount
        state["tier"] = tier

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="5 kun", callback_data="idays_5"),
             InlineKeyboardButton(text="7 kun", callback_data="idays_7"),
             InlineKeyboardButton(text="10 kun", callback_data="idays_10")],
            [InlineKeyboardButton(text="14 kun", callback_data="idays_14"),
             InlineKeyboardButton(text="21 kun", callback_data="idays_21"),
             InlineKeyboardButton(text="30 kun", callback_data="idays_30")],
        ])
        await message.answer(
            f"✅ Miqdor: <b>{amount:,.0f} so'm</b>\n"
            f"🏆 Daraja: <b>{tier['name']}</b> — {tier['percent']}%/kun\n\n"
            f"Necha kunga investitsiya qilmoqchisiz?",
            reply_markup=kb, parse_mode="HTML"
        )


@dp.callback_query(F.data.startswith("idays_"))
async def invest_days_chosen(callback: types.CallbackQuery):
    if callback.from_user.id not in invest_state:
        await callback.answer()
        return
    days = int(callback.data.split("_")[1])
    state = invest_state[callback.from_user.id]
    amount = state["amount"]
    tier = state["tier"]

    session = get_session()
    user = get_or_create_user(session, callback.from_user.id)
    if user.invest_balance < amount:
        await callback.answer("Balansingiz o'zgardi!", show_alert=True)
        session.close()
        return

    user.invest_balance -= amount
    end_date = datetime.datetime.utcnow() + datetime.timedelta(days=days)
    inv = Investment(
        telegram_id=callback.from_user.id,
        amount=amount,
        percent=tier["percent"],
        days=days,
        end_date=end_date,
        tier_name=tier["name"]
    )
    session.add(inv)
    session.commit()
    session.close()

    del invest_state[callback.from_user.id]
    total_return = amount * (1 + tier["percent"] / 100 * days)

    await callback.message.answer(
        f"🎉 <b>Investitsiya muvaffaqiyatli!</b>\n\n"
        f"💰 Miqdor: <b>{amount:,.0f} so'm</b>\n"
        f"📈 Foiz: <b>{tier['percent']}%/kun</b>\n"
        f"⏱ Muddat: <b>{days} kun</b>\n"
        f"🏆 Daraja: <b>{tier['name']}</b>\n"
        f"💵 Kutilgan daromad: <b>{total_return:,.0f} so'm</b>\n\n"
        f"Har kuni avtomatik foyda hisoblanadi!",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.callback_query(F.data == "list_invest")
async def list_investments(callback: types.CallbackQuery):
    session = get_session()
    investments = session.query(Investment).filter_by(
        telegram_id=callback.from_user.id, is_active=True
    ).all()
    session.close()

    if not investments:
        await callback.answer("Faol investitsiyalar yo'q!", show_alert=True)
        return

    text = "📋 <b>Faol investitsiyalaringiz:</b>\n\n"
    for i, inv in enumerate(investments, 1):
        days_left = (inv.end_date - datetime.datetime.utcnow()).days
        text += (
            f"{i}. <b>{inv.tier_name}</b>\n"
            f"   💰 {inv.amount:,.0f} so'm × {inv.percent}%/kun\n"
            f"   ⏳ {max(0, days_left)} kun qoldi\n"
            f"   💸 Foyda: {inv.earned:,.0f} so'm\n\n"
        )
    await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


@dp.message(F.text == "⚽ Donatsiya")
async def donation_menu(message: types.Message):
    session = get_session()
    real = session.query(TeamDonation).filter_by(team="Real Madrid").first()
    barca = session.query(TeamDonation).filter_by(team="Barcelona").first()
    session.close()

    real_total = real.total if real else 0
    barca_total = barca.total if barca else 0

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚪ Real Madrid", callback_data="donate_real"),
         InlineKeyboardButton(text="🔵 Barcelona", callback_data="donate_barca")],
    ])
    await message.answer(
        f"⚽ <b>Jamoa donatsiyasi</b>\n\n"
        f"⚪ <b>Real Madrid</b>: {real_total:,.0f} so'm\n"
        f"🔵 <b>Barcelona</b>: {barca_total:,.0f} so'm\n\n"
        f"Minimal donatsiya: <b>{MIN_DONATION:,} so'm</b>\n\n"
        f"Sevimli jamoangizni tanlang:",
        reply_markup=kb, parse_mode="HTML"
    )


donation_state = {}


@dp.callback_query(F.data.in_(["donate_real", "donate_barca"]))
async def donation_team_chosen(callback: types.CallbackQuery):
    team = "Real Madrid" if callback.data == "donate_real" else "Barcelona"
    card = REAL_MADRID_CARD if team == "Real Madrid" else BARCELONA_CARD

    donation_state[callback.from_user.id] = {"team": team, "step": "amount"}

    session = get_session()
    user = get_or_create_user(session, callback.from_user.id)
    balance = user.game_balance + user.invest_balance
    session.close()

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Karta orqali", callback_data=f"don_card_{team.replace(' ', '_')}"),
         InlineKeyboardButton(text="💰 Balansdan", callback_data=f"don_balance_{team.replace(' ', '_')}")],
    ])
    await callback.message.answer(
        f"{'⚪' if team == 'Real Madrid' else '🔵'} <b>{team}</b> uchun donatsiya\n\n"
        f"Minimal: <b>{MIN_DONATION:,} so'm</b>\n\n"
        f"To'lov usulini tanlang:",
        reply_markup=kb, parse_mode="HTML"
    )
    await callback.answer()


@dp.callback_query(F.data.startswith("don_card_"))
async def donation_by_card(callback: types.CallbackQuery):
    team = callback.data.replace("don_card_", "").replace("_", " ")
    card = REAL_MADRID_CARD if "Real" in team else BARCELONA_CARD
    donation_state[callback.from_user.id] = {"team": team, "method": "card", "step": "amount"}
    await callback.message.answer(
        f"💳 Karta: <code>{card}</code>\n\n"
        f"Donatsiya miqdorini yozing (minimal {MIN_DONATION:,} so'm):",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.callback_query(F.data.startswith("don_balance_"))
async def donation_by_balance(callback: types.CallbackQuery):
    team = callback.data.replace("don_balance_", "").replace("_", " ")
    donation_state[callback.from_user.id] = {"team": team, "method": "balance", "step": "amount"}
    await callback.message.answer(
        f"💰 Balansdan donatsiya\n\nMiqdorni yozing (minimal {MIN_DONATION:,} so'm):",
        parse_mode="HTML"
    )
    await callback.answer()


@dp.message(F.text == "📞 Admin")
async def contact_admin(message: types.Message):
    await message.answer(
        f"📞 <b>Admin bilan bog'lanish</b>\n\n"
        f"Muammo yoki savollar uchun: @admin\n"
        f"Ish vaqti: 09:00 – 23:00",
        parse_mode="HTML"
    )


async def profit_scheduler():
    while True:
        try:
            session = get_session()
            investments = session.query(Investment).filter_by(is_active=True).all()
            now = datetime.datetime.utcnow()
            for inv in investments:
                if (now - inv.last_profit).total_seconds() >= 86400:
                    if now >= inv.end_date:
                        inv.is_active = False
                        user = session.query(User).filter_by(telegram_id=inv.telegram_id).first()
                        if user:
                            total = inv.amount + inv.earned
                            user.invest_balance += total
                        try:
                            await bot.send_message(
                                inv.telegram_id,
                                f"🏁 <b>Investitsiya yakunlandi!</b>\n\n"
                                f"💰 Asosiy: <b>{inv.amount:,.0f} so'm</b>\n"
                                f"💸 Foyda: <b>{inv.earned:,.0f} so'm</b>\n"
                                f"💵 Jami qaytarildi: <b>{total:,.0f} so'm</b>",
                                parse_mode="HTML"
                            )
                        except Exception:
                            pass
                    else:
                        profit = inv.amount * (inv.percent / 100)
                        inv.earned += profit
                        inv.last_profit = now
                        user = session.query(User).filter_by(telegram_id=inv.telegram_id).first()
                        if user:
                            user.invest_balance += profit
                        try:
                            await bot.send_message(
                                inv.telegram_id,
                                f"💸 <b>Kunlik foyda!</b>\n\n"
                                f"+<b>{profit:,.0f} so'm</b> ({inv.percent}% — {inv.tier_name})\n"
                                f"Jami foyda: <b>{inv.earned:,.0f} so'm</b>",
                                parse_mode="HTML"
                            )
                        except Exception:
                            pass
            session.commit()
            session.close()
        except Exception as e:
            logger.error(f"Profit scheduler error: {e}")
        await asyncio.sleep(3600)


async def main():
    await bot.set_my_commands([
        BotCommand(command="start", description="Botni boshlash"),
    ])
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Invest Pro",
                web_app=WebAppInfo(url=MINI_APP_URL)
            )
        )
    except Exception:
        pass

    asyncio.create_task(profit_scheduler())
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
