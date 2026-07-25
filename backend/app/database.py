from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

from app.config import settings

db_url = settings.normalized_database_url
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    school = Column(String, nullable=True)
    # Where the athlete is in the transition (original-app onboarding step 1).
    # "competing" | "transitioning" | "transitioned"
    status = Column(String(20), nullable=False, default="transitioning")
    # The career-defining one-liner — "Former linebacker → future physical
    # therapist". The profile page centers on writing and refining it.
    headline = Column(String(140), nullable=True)
    verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("AthleteProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    commitment = relationship("Commitment", uselist=False, back_populates="user", cascade="all, delete-orphan")


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    sport = Column(String, nullable=True)
    role = Column(String, nullable=True)
    years = Column(String, nullable=True)
    relied_on = Column(Text, nullable=True)  # the Hinge-style story prompt
    favorite = Column(String, nullable=True)
    intake_done = Column(Boolean, nullable=False, default=False)
    skill_map = Column(JSON, nullable=True)  # cached derived SkillMapEntry[]
    intake_answers = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class CheckIn(Base):
    __tablename__ = "check_ins"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    prompt_id = Column(String, nullable=False)
    prompt_question = Column(String, nullable=False)
    option = Column(String, nullable=False)
    journal = Column(Text, nullable=True)
    ambient = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Commitment(Base):
    __tablename__ = "commitments"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    path_id = Column(String, nullable=False)
    committed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="commitment")


class ActionCompletion(Base):
    __tablename__ = "action_completions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_id = Column(String, nullable=False)
    week_of = Column(String, nullable=False)  # ISO week date
    completed_at = Column(DateTime, default=datetime.utcnow)


class ClipboardMessage(Base):
    __tablename__ = "clipboard_messages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # user | ai
    text = Column(Text, nullable=False)
    persona = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Forum(Base):
    __tablename__ = "forums"
    id = Column(String, primary_key=True)  # path-consulting | local-davis-soccer | ...
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)  # Path | Local | Sport | Support
    description = Column(String, nullable=False)
    member_count = Column(Integer, default=0)
    active_now = Column(Integer, default=0)
    icon = Column(String, nullable=False)  # lucide icon name
    path_id = Column(String, nullable=True)


class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True)
    forum_id = Column(String, ForeignKey("forums.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String, nullable=False)
    flair = Column(String, nullable=False)  # WIN | VENT | QUESTION | RESOURCE | MILESTONE
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    replies = relationship("Comment", backref="parent", remote_side=[id])


class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String, nullable=False)  # post | comment
    target_id = Column(Integer, nullable=False)
    value = Column(Integer, default=1)


class PeerSupportRequest(Base):
    __tablename__ = "peer_support_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="notified")  # notified | resolved
    created_at = Column(DateTime, default=datetime.utcnow)


class TechSupportRequest(Base):
    __tablename__ = "tech_support_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="open")  # open | resolved
    created_at = Column(DateTime, default=datetime.utcnow)