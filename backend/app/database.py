"""SQLAlchemy models for the temporary FastAPI bridge.

**Drizzle owns the schema.** `src/lib/db/schema.ts` is the source of truth and
`drizzle/` is the only thing that issues DDL against Neon; these models exist so
the bridge can read and write that schema during Phase 2, and they are deleted
with the rest of `backend/` at Phase 2 step 16.

Everything here therefore mirrors the baseline rather than defining it: UUID
primary keys, `date` for calendar days, UTC-aware `timestamptz` for instants,
emails and password hashes in their own tables, and real foreign keys on votes.
Do not add a column here that does not exist there — a bridge write against a
column Drizzle never created fails at runtime, and a bridge model narrower than
the table silently writes NULL into a NOT NULL.

The pytest suite still calls `Base.metadata.create_all` against throwaway
SQLite, which is why the portable `Uuid`/`UtcDateTime` types are used instead of
`postgresql.UUID`/`TIMESTAMP`.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
    Uuid,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

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


def utcnow() -> datetime:
    """The only clock this module uses. `datetime.utcnow()` returns a *naive*
    datetime that merely happens to hold UTC, which is how the pre-migration
    models ended up storing ambiguous instants."""
    return datetime.now(timezone.utc)


class UtcDateTime(TypeDecorator):
    """`timestamptz` that is aware on the way in and on the way out.

    SQLite cannot store an offset, so plain `DateTime(timezone=True)` quietly
    round-trips naive values there — the test suite would pass while Postgres
    saw something different. Normalising in the decorator makes both backends
    behave identically, and turns "someone passed a naive datetime" into an
    error at the boundary instead of a wrong timestamp discovered months later.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetime rejected — use app.database.utcnow()")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


def _pk() -> Column:
    return Column(Uuid, primary_key=True, default=uuid.uuid4)


def _user_fk(ondelete: str = "CASCADE", **kw) -> Column:
    return Column(Uuid, ForeignKey("users.id", ondelete=ondelete), **kw)


athlete_status = Enum(
    "competing", "transitioning", "transitioned", name="athlete_status"
)


class User(Base):
    """Canonical identity. Deliberately holds no email and no password — those
    live in `user_emails` and `password_credentials` so a matching email can
    never be mistaken for proof of the same person (§2.4, §6.7)."""

    __tablename__ = "users"
    id = _pk()
    display_name = Column(String(80), nullable=False)
    school = Column(String(160), nullable=True)
    # Where the athlete is in the transition (original-app onboarding step 1).
    status = Column(athlete_status, nullable=False, default="transitioning")
    # The career-defining one-liner — "Former linebacker → future physical
    # therapist". The profile page centers on writing and refining it.
    headline = Column(String(140), nullable=True)
    verified = Column(Boolean, nullable=False, default=False)
    verification_requested = Column(Boolean, nullable=False, default=False)
    verification_requested_at = Column(UtcDateTime, nullable=True)
    # Moderation flags. §6.3: the admin portal writes these and nothing read
    # them, so banning a user did nothing. `require_verified` now enforces.
    suspended = Column(Boolean, nullable=False, default=False)
    suspended_at = Column(UtcDateTime, nullable=True)
    banned = Column(Boolean, nullable=False, default=False)
    banned_at = Column(UtcDateTime, nullable=True)
    chat_banned = Column(Boolean, nullable=False, default=False)
    chat_banned_at = Column(UtcDateTime, nullable=True)
    streak = Column(Integer, nullable=False, default=0)
    # Bump to invalidate every outstanding token for this user.
    auth_version = Column(Integer, nullable=False, default=1)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)
    deleted_at = Column(UtcDateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("streak >= 0", name="users_streak_nonnegative"),
        CheckConstraint("auth_version > 0", name="users_auth_version_positive"),
    )

    emails = relationship(
        "UserEmail", back_populates="user", cascade="all, delete-orphan"
    )
    password = relationship(
        "PasswordCredential",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )
    profile = relationship(
        "AthleteProfile",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )
    commitment = relationship(
        "Commitment",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def primary_email(self) -> str | None:
        return next((e.email for e in self.emails if e.primary), None)


class UserEmail(Base):
    """Emails are attributes, not identity keys — never auto-link on a match."""

    __tablename__ = "user_emails"
    id = _pk()
    user_id = _user_fk(nullable=False)
    email = Column(Text, nullable=False)
    normalized_email = Column(Text, nullable=False)
    verified = Column(Boolean, nullable=False, default=False)
    # The baseline column is `is_primary`; `primary` reads better in Python.
    primary = Column("is_primary", Boolean, nullable=False, default=False)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    verified_at = Column(UtcDateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("normalized_email", name="ux_user_emails_normalized"),
        Index("ix_user_emails_user_id", "user_id"),
    )

    user = relationship("User", back_populates="emails")


class PasswordCredential(Base):
    """Legacy password login, isolated so it can be dropped wholesale once
    Auth.js Google/Apple is the only way in (§6.7)."""

    __tablename__ = "password_credentials"
    user_id = _user_fk(nullable=False, primary_key=True)
    password_hash = Column(Text, nullable=False)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="password")


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"
    user_id = _user_fk(nullable=False, primary_key=True)
    sport = Column(String(120), nullable=True)
    role = Column(String(120), nullable=True)
    years = Column(String(80), nullable=True)
    relied_on = Column(Text, nullable=True)  # the Hinge-style story prompt
    favorite = Column(String(240), nullable=True)
    intake_done = Column(Boolean, nullable=False, default=False)
    skill_map = Column(JSON, nullable=True)  # cached derived SkillMapEntry[]
    intake_answers = Column(JSON, nullable=True)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="profile")


class CheckIn(Base):
    __tablename__ = "check_ins"
    id = _pk()
    user_id = _user_fk(nullable=False)
    # A calendar day, not an instant — `date`, never a string or a timestamp.
    date = Column(Date, nullable=False)
    prompt_id = Column(Text, nullable=False)
    prompt_question = Column(Text, nullable=False)
    option = Column(Text, nullable=False)
    journal = Column(Text, nullable=True)
    ambient = Column(JSON, nullable=True)
    mood = Column(Integer, nullable=True)  # 1-5, charted by admin /checkins
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="ux_check_ins_user_date"),
        CheckConstraint(
            "mood is null or mood between 1 and 5", name="check_ins_mood_range"
        ),
        Index("ix_check_ins_user_date", "user_id", "date"),
    )


class Commitment(Base):
    __tablename__ = "commitments"
    user_id = _user_fk(nullable=False, primary_key=True)
    path_id = Column(Text, nullable=False)
    committed_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="commitment")


class ActionCompletion(Base):
    __tablename__ = "action_completions"
    id = _pk()
    user_id = _user_fk(nullable=False)
    action_id = Column(Text, nullable=False)
    # Monday of the ISO week, as a date. The pre-migration code stored
    # `isocalendar()[1]` — a week *number* — so the same week of different
    # years collided, and "this week" was unqueryable.
    week_of = Column(Date, nullable=False)
    category = Column(String(32), nullable=False)  # §6.5 taxonomy
    completed_at = Column(UtcDateTime, nullable=False, default=utcnow)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "action_id",
            "week_of",
            name="ux_action_completions_user_action_week",
        ),
        Index("ix_action_completions_user_week", "user_id", "week_of"),
    )


class ClipboardMessage(Base):
    __tablename__ = "clipboard_messages"
    id = _pk()
    user_id = _user_fk(nullable=False)
    role = Column(String(8), nullable=False)  # user | ai
    text = Column(Text, nullable=False)
    persona = Column(String(80), nullable=False)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)

    __table_args__ = (
        CheckConstraint("role in ('user', 'ai')", name="clipboard_messages_role"),
        Index("ix_clipboard_messages_user_time", "user_id", "created_at"),
    )


class Forum(Base):
    __tablename__ = "forums"
    id = Column(Text, primary_key=True)  # path-consulting | local-davis-soccer
    title = Column(String(160), nullable=False)
    category = Column(String(40), nullable=False)  # Path | Local | Sport | Support
    description = Column(Text, nullable=False)
    member_count = Column(Integer, nullable=False, default=0)
    active_now = Column(Integer, nullable=False, default=0)
    icon = Column(String(80), nullable=False)  # lucide icon name
    path_id = Column(Text, nullable=True)
    # Written by the admin portal's /api/update-prompt.
    daily_prompt = Column(Text, nullable=True)
    daily_prompt_author = Column(String(80), nullable=True)
    daily_prompt_updated_at = Column(UtcDateTime, nullable=True)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)


class ForumMembership(Base):
    """A persisted forum subscription used to build each athlete's feed."""

    __tablename__ = "forum_memberships"
    user_id = _user_fk(nullable=False, primary_key=True)
    forum_id = Column(
        Text,
        ForeignKey("forums.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    joined_at = Column(UtcDateTime, nullable=False, default=utcnow)

    __table_args__ = (
        Index("ix_forum_memberships_forum_time", "forum_id", "joined_at"),
    )


class Post(Base):
    __tablename__ = "posts"
    id = _pk()
    forum_id = Column(
        Text, ForeignKey("forums.id", ondelete="CASCADE"), nullable=False
    )
    author_id = _user_fk("RESTRICT", nullable=False)
    # Denormalized display name; never an email address (§6.4).
    author_name = Column(String(80), nullable=False)
    flair = Column(String(32), nullable=False)  # WIN | VENT | QUESTION | ...
    title = Column(String(240), nullable=False)
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)
    deleted_at = Column(UtcDateTime, nullable=True)

    __table_args__ = (Index("ix_posts_forum_time", "forum_id", "created_at"),)


class Comment(Base):
    __tablename__ = "comments"
    id = _pk()
    post_id = Column(
        Uuid, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    author_id = _user_fk("RESTRICT", nullable=False)
    author_name = Column(String(80), nullable=False)
    parent_id = Column(
        Uuid, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)
    deleted_at = Column(UtcDateTime, nullable=True)

    __table_args__ = (Index("ix_comments_post_time", "post_id", "created_at"),)

    replies = relationship("Comment", backref="parent", remote_side=[id])


class PostVote(Base):
    """Split from the old polymorphic `votes` table so the target is a real
    foreign key — a vote can no longer outlive, or point past, its post."""

    __tablename__ = "post_votes"
    user_id = _user_fk(nullable=False, primary_key=True)
    post_id = Column(
        Uuid,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    value = Column(Integer, nullable=False, default=1)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)

    __table_args__ = (CheckConstraint("value in (-1, 1)", name="post_votes_value"),)


class CommentVote(Base):
    __tablename__ = "comment_votes"
    user_id = _user_fk(nullable=False, primary_key=True)
    comment_id = Column(
        Uuid,
        ForeignKey("comments.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    value = Column(Integer, nullable=False, default=1)
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        CheckConstraint("value in (-1, 1)", name="comment_votes_value"),
    )


class PeerSupportRequest(Base):
    __tablename__ = "peer_support_requests"
    id = _pk()
    user_id = _user_fk("RESTRICT", nullable=False)
    status = Column(String(24), nullable=False, default="notified")
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)
    resolved_at = Column(UtcDateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status in ('notified', 'connected', 'resolved')",
            name="peer_support_status",
        ),
    )


class TechSupportRequest(Base):
    __tablename__ = "tech_support_requests"
    id = _pk()
    user_id = _user_fk("RESTRICT", nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(24), nullable=False, default="open")
    created_at = Column(UtcDateTime, nullable=False, default=utcnow)
    updated_at = Column(UtcDateTime, nullable=False, default=utcnow, onupdate=utcnow)
    resolved_at = Column(UtcDateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status in ('open', 'pending', 'resolved')", name="tech_support_status"
        ),
    )
