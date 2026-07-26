"""Idempotent forum seed, run as an explicit release step.

    python -m app.seed

This used to happen inside `@app.on_event("startup")`, which on serverless
fires on every cold start (VERCEL_MIGRATION_PLAN.md §2.2). Migrations and seeds
belong in the release, not in the request path.
"""
from app.database import SessionLocal
from app.routes.community import seed_forums


def main() -> None:
    db = SessionLocal()
    try:
        seed_forums(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
    print("forums seeded")
