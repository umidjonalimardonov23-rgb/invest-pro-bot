import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///database.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, index=True)
    username = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    game_balance = Column(Float, default=0.0)
    invest_balance = Column(Float, default=0.0)
    total_deposited = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Investment(Base):
    __tablename__ = "investments"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, index=True)
    amount = Column(Float, nullable=False)
    percent = Column(Float, nullable=False)
    days = Column(Integer, nullable=False)
    earned = Column(Float, default=0.0)
    start_date = Column(DateTime, default=datetime.datetime.utcnow)
    end_date = Column(DateTime, nullable=False)
    last_profit = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    tier_name = Column(String, default="Standart")


class DepositRequest(Base):
    __tablename__ = "deposit_requests"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, index=True)
    username = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    target = Column(String, default="game")
    file_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class DonationRequest(Base):
    __tablename__ = "donation_requests"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, index=True)
    username = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    team = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    file_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TeamDonation(Base):
    __tablename__ = "team_donations"
    id = Column(Integer, primary_key=True)
    team = Column(String, unique=True)
    total = Column(Float, default=0.0)


Base.metadata.create_all(engine)

# Init teams
session = Session()
for team in ["Real Madrid", "Barcelona"]:
    existing = session.query(TeamDonation).filter_by(team=team).first()
    if not existing:
        session.add(TeamDonation(team=team, total=0.0))
session.commit()
session.close()


def get_session():
    return Session()
