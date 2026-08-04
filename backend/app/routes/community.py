from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, optional_user, require_verified
from app.database import (
    get_db,
    User,
    Forum,
    ForumMembership,
    Post,
    Comment,
    PostVote,
    CommentVote,
)
from app.schemas import (
    ForumMembershipOut,
    ForumOut,
    PostOut,
    PostIn,
    CommentIn,
    CommentOut,
    VoteIn,
)

router = APIRouter(prefix="/community", tags=["community"])


def _time_ago(created_at: datetime) -> str:
    delta = datetime.now(timezone.utc) - created_at
    if delta.days > 0:
        return f"{delta.days}d"
    hours = delta.seconds // 3600
    if hours > 0:
        return f"{hours}h"
    minutes = (delta.seconds % 3600) // 60
    return f"{max(minutes, 1)}m"


def _comment_tree(comments: list[Comment]) -> list[CommentOut]:
    by_parent: dict[UUID | None, list[Comment]] = {}
    for c in comments:
        by_parent.setdefault(c.parent_id, []).append(c)

    def build(parent_id):
        out = []
        for c in by_parent.get(parent_id, []):
            out.append(CommentOut(
                id=c.id,
                author_name=c.author_name,
                body=c.body,
                upvotes=c.upvotes,
                time_ago=_time_ago(c.created_at),
                replies=build(c.id),
            ))
        return out
    return build(None)


def _post_out(db: Session, post: Post) -> PostOut:
    comment_count = _comment_count(db, post.id)
    return PostOut(
        id=post.id,
        forum_id=post.forum_id,
        author_name=post.author_name,
        flair=post.flair,
        title=post.title,
        body=post.body,
        upvotes=post.upvotes,
        comment_count=comment_count,
        time_ago=_time_ago(post.created_at),
    )


def _comment_count(db: Session, post_id: UUID) -> int:
    return (
        db.query(Comment)
        .filter(Comment.post_id == post_id, Comment.deleted_at.is_(None))
        .count()
    )


def _hot_score(db: Session, post: Post) -> float:
    """Reddit-style decay: engagement matters, but fresh posts get a window."""
    age_hours = max(
        (datetime.now(timezone.utc) - post.created_at).total_seconds() / 3600,
        0,
    )
    engagement = (post.upvotes or 0) + _comment_count(db, post.id) * 2 + 1
    return engagement / ((age_hours + 2) ** 1.5)


def _member_count(db: Session, forum_id: str) -> int:
    return (
        db.query(ForumMembership)
        .filter(ForumMembership.forum_id == forum_id)
        .count()
    )


@router.get("/forums", response_model=list[ForumOut])
def list_forums(
    user: User | None = Depends(optional_user), db: Session = Depends(get_db)
):
    forums = db.query(Forum).order_by(Forum.category, Forum.title).all()
    joined_ids = set()
    if user:
        joined_ids = {
            row[0]
            for row in db.query(ForumMembership.forum_id)
            .filter(ForumMembership.user_id == user.id)
            .all()
        }
    return [
        ForumOut(
            id=forum.id,
            title=forum.title,
            category=forum.category,
            description=forum.description,
            member_count=_member_count(db, forum.id),
            active_now=forum.active_now,
            icon=forum.icon,
            path_id=forum.path_id,
            joined=forum.id in joined_ids,
        )
        for forum in forums
    ]


@router.post(
    "/forums/{forum_id}/membership", response_model=ForumMembershipOut
)
def join_forum(
    forum_id: str,
    user: User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    if not db.get(Forum, forum_id):
        raise HTTPException(status_code=404, detail="Forum not found")
    membership = db.get(ForumMembership, (user.id, forum_id))
    if not membership:
        db.add(ForumMembership(user_id=user.id, forum_id=forum_id))
        db.commit()
    return ForumMembershipOut(
        forum_id=forum_id,
        joined=True,
        member_count=_member_count(db, forum_id),
    )


@router.delete(
    "/forums/{forum_id}/membership", response_model=ForumMembershipOut
)
def leave_forum(
    forum_id: str,
    user: User = Depends(require_verified),
    db: Session = Depends(get_db),
):
    if not db.get(Forum, forum_id):
        raise HTTPException(status_code=404, detail="Forum not found")
    membership = db.get(ForumMembership, (user.id, forum_id))
    if membership:
        db.delete(membership)
        db.commit()
    return ForumMembershipOut(
        forum_id=forum_id,
        joined=False,
        member_count=_member_count(db, forum_id),
    )


@router.get("/feed", response_model=list[PostOut])
def list_feed(
    scope: Literal["joined", "all"] = Query("joined"),
    sort: Literal["hot", "new", "top"] = Query("hot"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Post).filter(Post.deleted_at.is_(None))
    if scope == "joined":
        q = q.join(
            ForumMembership,
            ForumMembership.forum_id == Post.forum_id,
        ).filter(ForumMembership.user_id == user.id)
    if sort == "new":
        q = q.order_by(Post.created_at.desc())
    elif sort == "top":
        q = q.order_by(Post.upvotes.desc(), Post.created_at.desc())
    else:
        posts = q.all()
        posts.sort(key=lambda post: _hot_score(db, post), reverse=True)
        return [_post_out(db, post) for post in posts]
    return [_post_out(db, post) for post in q.all()]


@router.get("/forums/{forum_id}/posts", response_model=list[PostOut])
def list_posts(forum_id: str, sort: str = Query("hot"), db: Session = Depends(get_db)):
    q = db.query(Post).filter(
        Post.forum_id == forum_id, Post.deleted_at.is_(None)
    )
    if sort == "top":
        q = q.order_by(Post.upvotes.desc())
    elif sort == "new":
        q = q.order_by(Post.created_at.desc())
    else:
        posts = q.all()
        posts.sort(key=lambda post: _hot_score(db, post), reverse=True)
        return [_post_out(db, post) for post in posts]
    return [_post_out(db, post) for post in q.all()]


@router.post("/forums/{forum_id}/posts", response_model=PostOut)
def create_post(forum_id: str, body: PostIn, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    forum = db.get(Forum, forum_id)
    if not forum:
        raise HTTPException(status_code=404, detail="Forum not found")
    post = Post(
        forum_id=forum_id,
        author_id=user.id,
        author_name=user.display_name,
        flair=body.flair,
        title=body.title,
        body=body.body,
    )
    if not db.get(ForumMembership, (user.id, forum_id)):
        db.add(ForumMembership(user_id=user.id, forum_id=forum_id))
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostOut(
        id=post.id,
        forum_id=post.forum_id,
        author_name=post.author_name,
        flair=post.flair,
        title=post.title,
        body=post.body,
        upvotes=0,
        comment_count=0,
        time_ago="just now",
    )


@router.get("/posts/{post_id}", response_model=dict)
def get_post(post_id: UUID, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comments = db.query(Comment).filter(Comment.post_id == post_id).all()
    return {
        "id": post.id,
        "forum_id": post.forum_id,
        "author_name": post.author_name,
        "flair": post.flair,
        "title": post.title,
        "body": post.body,
        "upvotes": post.upvotes,
        "time_ago": _time_ago(post.created_at),
        "comments": _comment_tree(comments),
    }


@router.post("/posts/{post_id}/comments", response_model=CommentOut)
def add_comment(post_id: UUID, body: CommentIn, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if body.parent_id is not None:
        parent = db.get(Comment, body.parent_id)
        if not parent or parent.post_id != post_id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")
    c = Comment(
        post_id=post_id,
        author_id=user.id,
        author_name=user.display_name,
        parent_id=body.parent_id,
        body=body.body,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return CommentOut(
        id=c.id,
        author_name=c.author_name,
        body=c.body,
        upvotes=0,
        time_ago="just now",
        replies=[],
    )


@router.post("/vote")
def vote(body: VoteIn, user: User = Depends(require_verified), db: Session = Depends(get_db)):
    # The polymorphic `votes` table is gone: each target now has its own table
    # with a real foreign key, so a vote cannot point at a deleted row or at
    # the wrong kind of row that happens to share an id.
    if body.target_type == "post":
        target = db.get(Post, body.target_id)
        vote_cls, key = PostVote, {"post_id": body.target_id}
    else:
        target = db.get(Comment, body.target_id)
        vote_cls, key = CommentVote, {"comment_id": body.target_id}
    if not target or target.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Target not found")

    existing = db.get(vote_cls, (user.id, body.target_id))
    if existing:
        # toggle off: remove the user's prior vote and decrement
        db.delete(existing)
        target.upvotes = max(target.upvotes - 1, 0)
        db.commit()
        return {"upvotes": target.upvotes, "voted": False}

    db.add(vote_cls(user_id=user.id, value=1, **key))
    target.upvotes = (target.upvotes or 0) + 1
    db.commit()
    return {"upvotes": target.upvotes, "voted": True}


def seed_forums(db: Session):
    """Seed forums at startup mirroring the work-path registry + standalone forums."""
    if db.query(Forum).count() > 0:
        return
    from app.services.registry import WORK_PATHS
    icon_map = {"consulting": "Timer", "nine_to_five": "Briefcase", "entrepreneurship": "Rocket", "gig": "DollarSign", "overnight": "Moon"}
    for p in WORK_PATHS:
        f = p["forum"]
        db.add(Forum(
            id=f"path-{p['id']}",
            title=f["title"],
            category="Path",
            description=f["description"],
            member_count=f["member_count"],
            active_now=f["active_now"],
            icon=icon_map.get(p["id"], "Briefcase"),
            path_id=p["id"],
        ))
    standalone = [
        {"id": "local-davis-soccer", "title": "UC Davis - Pick-up Soccer", "category": "Local", "description": "Casual games, zero tryouts.", "icon": "MapPin"},
        {"id": "local-nyc-swimmers", "title": "Former Swimmers in NYC", "category": "Local", "description": "Lane mates turned city network.", "icon": "MapPin"},
        {"id": "support-acl", "title": "ACL Recovery Support", "category": "Support", "description": "Rehab is a season too.", "icon": "ShieldAlert"},
        {"id": "support-stories", "title": "Transition Stories", "category": "Support", "description": "How you got through it — or how you are.", "icon": "Trophy"},
    ]
    for s in standalone:
        db.add(Forum(id=s["id"], title=s["title"], category=s["category"], description=s["description"], icon=s["icon"]))

    # The old seed inserted an example post with `author_id=1`. `posts.author_id`
    # is now a UUID with a real foreign key to `users`, and no such user exists —
    # it was only ever writable because the column had no integrity behind it.
    # Forums seed; demo content does not.
    db.commit()
