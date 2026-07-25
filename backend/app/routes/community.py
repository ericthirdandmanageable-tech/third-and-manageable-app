from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_verified
from app.database import get_db, User, Forum, Post, Comment, Vote
from app.schemas import ForumOut, PostOut, PostIn, CommentIn, CommentOut, VoteIn

router = APIRouter(prefix="/community", tags=["community"])


def _time_ago(created_at: datetime) -> str:
    delta = datetime.utcnow() - created_at
    if delta.days > 0:
        return f"{delta.days}d"
    hours = delta.seconds // 3600
    if hours > 0:
        return f"{hours}h"
    minutes = (delta.seconds % 3600) // 60
    return f"{max(minutes, 1)}m"


def _comment_tree(comments: list[Comment]) -> list[CommentOut]:
    by_parent: dict[int | None, list[Comment]] = {}
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


@router.get("/forums", response_model=list[ForumOut])
def list_forums():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        forums = db.query(Forum).all()
        return [ForumOut.model_validate(f) for f in forums]
    finally:
        db.close()


@router.get("/forums/{forum_id}/posts", response_model=list[PostOut])
def list_posts(forum_id: str, sort: str = Query("hot"), db: Session = Depends(get_db)):
    q = db.query(Post).filter(Post.forum_id == forum_id)
    if sort == "top":
        q = q.order_by(Post.upvotes.desc())
    elif sort == "new":
        q = q.order_by(Post.created_at.desc())
    else:
        q = q.order_by((Post.upvotes + 0).desc())
    posts = q.all()
    out = []
    for p in posts:
        comment_count = db.query(Comment).filter(Comment.post_id == p.id).count()
        out.append(PostOut(
            id=p.id,
            forum_id=p.forum_id,
            author_name=p.author_name,
            flair=p.flair,
            title=p.title,
            body=p.body,
            upvotes=p.upvotes,
            comment_count=comment_count,
            time_ago=_time_ago(p.created_at),
        ))
    return out


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
def get_post(post_id: int, db: Session = Depends(get_db)):
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
def add_comment(post_id: int, body: CommentIn, user: User = Depends(require_verified), db: Session = Depends(get_db)):
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
    existing = (
        db.query(Vote)
        .filter(Vote.user_id == user.id, Vote.target_type == body.target_type, Vote.target_id == body.target_id)
        .first()
    )
    target_cls = Post if body.target_type == "post" else Comment
    target = db.get(target_cls, body.target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    if existing:
        # toggle off: remove the user's prior vote and decrement
        db.delete(existing)
        target.upvotes = max(target.upvotes - 1, 0)
        db.commit()
        return {"upvotes": target.upvotes, "voted": False}

    db.add(Vote(user_id=user.id, target_type=body.target_type, target_id=body.target_id, value=1))
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

    # seed one example post in Corporate Athletes
    db.add(Post(
        forum_id="path-nine_to_five",
        author_id=1,
        author_name="MK",
        flair="WIN",
        title="Got the offer. 4 months after my last game.",
        body="Former D1 mid. Today I signed for an ops role. The interview was just film study on their company. Your discipline got you here.",
        upvotes=212,
    ))
    db.commit()