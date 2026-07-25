from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=40)
    school: Optional[str] = None
    status: Literal["competing", "transitioning", "transitioned"] = "transitioning"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    display_name: str
    school: Optional[str] = None
    status: Optional[str] = None
    headline: Optional[str] = None
    verified: bool = False

    class Config:
        from_attributes = True


AuthOut.model_rebuild()


# ---------- Profile / intake ----------
class IntakeIn(BaseModel):
    sport: str
    role: str
    years: str
    relied_on: str
    favorite: str
    # Onboarding step 4: "join" the community or go "solo" for now (optional
    # so the standalone Game Plan intake keeps working without it).
    community: Optional[Literal["join", "solo"]] = None


class ProfileOut(BaseModel):
    user_id: int
    intake_done: bool = False
    intake_answers: Optional[dict] = None
    skill_map: list[dict] = []


class ProfileUpdateIn(BaseModel):
    """Career-defining profile edits (Profile page). All fields optional —
    only provided fields are written."""
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    school: Optional[str] = Field(default=None, max_length=120)
    status: Optional[Literal["competing", "transitioning", "transitioned"]] = None
    headline: Optional[str] = Field(default=None, max_length=140)


# ---------- Check-in ----------
class CheckInIn(BaseModel):
    prompt_id: str
    prompt_question: str
    option: str
    journal: Optional[str] = None
    ambient: Optional[dict] = None


class CheckInOut(BaseModel):
    id: int
    date: str
    prompt_id: str
    option: str
    journal: Optional[str] = None

    class Config:
        from_attributes = True


class CheckInUpdateIn(BaseModel):
    """Edit today's check-in (the day isn't over until it's over)."""
    option: Optional[str] = Field(default=None, min_length=1)
    journal: Optional[str] = None


# ---------- Game plan ----------
class CommitIn(BaseModel):
    path_id: Optional[str] = None  # null = un-commit


class ActionToggleIn(BaseModel):
    action_id: str


class PathFitOut(BaseModel):
    id: str
    name: str
    fit: Literal["STRONG FIT", "WORTH EXPLORING"]
    rationale: str
    meta: str


class GamePlanOut(BaseModel):
    intake_done: bool
    skill_map: list[dict]
    path_fit: list[PathFitOut]
    committed_path_id: Optional[str] = None
    weekly_actions: list[dict]
    completed_action_ids: list[str]
    day: int
    streak: int
    total_days: int
    phase: dict
    check_in_count: int = 0


class WorkPathOut(BaseModel):
    id: str
    name: str
    icon: str
    tagline: str
    schedule_shape: str
    income_texture: str
    loves: list[str]
    hates: list[str]
    first_reps: list[str]
    forum_id: str


# ---------- Clipboard ----------
class ClipboardChatIn(BaseModel):
    message: str
    persona: str = "friend"


class ClipboardMessageOut(BaseModel):
    id: int
    role: str
    text: str
    persona: str
    options: list[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ClipboardHistoryOut(BaseModel):
    messages: list[ClipboardMessageOut]


# ---------- Community ----------
class ForumOut(BaseModel):
    id: str
    title: str
    category: str
    description: str
    member_count: int
    active_now: int
    icon: str
    path_id: Optional[str] = None

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: int
    forum_id: str
    author_name: str
    flair: str
    title: str
    body: str
    upvotes: int
    comment_count: int
    time_ago: str

    class Config:
        from_attributes = True


class PostIn(BaseModel):
    flair: Literal["WIN", "VENT", "QUESTION", "RESOURCE", "MILESTONE"]
    title: str = Field(min_length=3)
    body: str = Field(min_length=3)


class CommentIn(BaseModel):
    body: str = Field(min_length=1)
    parent_id: Optional[int] = None


class VoteIn(BaseModel):
    target_type: Literal["post", "comment"]
    target_id: int
    value: int = 1  # 1 upvote, -1 removes


class CommentOut(BaseModel):
    id: int
    author_name: str
    body: str
    upvotes: int
    time_ago: str
    replies: list["CommentOut"] = []

    class Config:
        from_attributes = True


CommentOut.model_rebuild()


# ---------- Support ----------
class PeerSupportOut(BaseModel):
    status: str
    message: str


class TechSupportIn(BaseModel):
    message: str = Field(min_length=3, max_length=2000)


# ---------- Artifacts ----------
class ArtifactOut(BaseModel):
    id: str
    unlocked: bool
    title: str