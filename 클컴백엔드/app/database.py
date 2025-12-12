from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sqlite3

SQLALCHEMY_DATABASE_URL = "sqlite:///./joint_order.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_connection():
    conn = sqlite3.connect(SQLALCHEMY_DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn