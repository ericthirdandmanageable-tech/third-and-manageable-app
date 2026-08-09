"""Vercel Services entrypoint for the temporary same-origin FastAPI bridge."""

from fastapi import FastAPI

from app.main import app as bridge_app

# Current Vercel service rewrites select the service but preserve the public
# request path. Mount the legacy API at that explicit prefix so its own route
# modules can remain unchanged during the temporary Phase 2 bridge.
app = FastAPI()
app.mount("/bridge", bridge_app)

__all__ = ["app"]
