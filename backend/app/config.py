import os

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings

# Long enough that an HS256 key cannot be brute-forced offline from a token.
MIN_JWT_SECRET_BYTES = 32
_DEFAULT_JWT_SECRET = "change-me-in-production"


def _normalize_db_url(url: str) -> str:
    # Render exposes postgres://; SQLAlchemy + psycopg (v3) want postgresql+psycopg://
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _default_environment() -> str:
    """Vercel sets VERCEL_ENV (production|preview|development) on every deploy.

    Reading it means the production guards below arm themselves on a real
    deployment without anyone remembering to set a second variable — the
    failure mode that shipped `change-me-in-production` to production is
    exactly "the default was safe for dev and nobody overrode it."
    """
    vercel_env = os.getenv("VERCEL_ENV")
    if vercel_env and vercel_env.strip().lower() in {"production", "preview"}:
        # A public Vercel environment cannot be downgraded by an accidentally
        # copied ENVIRONMENT=development value.
        return "production"
    explicit = os.getenv("ENVIRONMENT")
    if explicit:
        return explicit.strip().lower()
    if vercel_env:
        return "development"
    return "development"


def _is_public_vercel_environment() -> bool:
    """Whether the current process is an internet-reachable Vercel deploy."""
    return os.getenv("VERCEL_ENV", "").strip().lower() in {"production", "preview"}


class Settings(BaseSettings):
    # A factory, not a computed default: evaluated per instantiation so the
    # inference is observable from a test that patches the environment.
    environment: str = Field(default_factory=_default_environment)
    database_url: str = "sqlite:///./third_manageable.db"

    @property
    def normalized_database_url(self) -> str:
        return _normalize_db_url(self.database_url)
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_alg: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    gemini_api_key: str = ""
    # Empty by default: the bridge is same-origin behind a rewrite in every
    # environment (`next.config.ts` locally, `vercel.json` in production), so
    # the browser never issues a cross-origin request and no origin needs
    # allowing. Set this only for the `NEXT_PUBLIC_API_URL` escape hatch, and
    # never to a wildcard — `allow_credentials=True` makes `*` a credential leak.
    cors_origins: str = ""
    # Verification model (REDESIGN_BRIEF §16.2): in dev, newly-registered
    # athletes are auto-verified so the full flow is walkable. In production this
    # must be False — verified=True is granted by a review step (roster DB /
    # .edu email allow-list) so unverified users can never write to Community.
    # Defaults to False so the unsafe value is the one you have to ask for.
    auto_verify: bool = False

    @property
    def is_production(self) -> bool:
        # BaseSettings may populate `environment` directly from ENVIRONMENT,
        # bypassing the default factory. VERCEL_ENV therefore remains an
        # independent, non-downgradeable production signal here.
        return self.environment == "production" or _is_public_vercel_environment()

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _enforce_production_safety(self) -> "Settings":
        """Fail closed at import time rather than serving forgeable tokens.

        A weak or defaulted `JWT_SECRET` is not a degraded mode — anyone who
        knows the default can mint a token for any user id. Raising here means a
        misconfigured deployment cannot boot, which is the whole point.
        """
        if not self.is_production:
            return self

        problems: list[str] = []
        if self.jwt_secret == _DEFAULT_JWT_SECRET:
            problems.append("JWT_SECRET is still the built-in default")
        elif not self.jwt_secret.strip():
            problems.append("JWT_SECRET is unset")
        elif len(self.jwt_secret.encode()) < MIN_JWT_SECRET_BYTES:
            problems.append(
                f"JWT_SECRET is shorter than {MIN_JWT_SECRET_BYTES} bytes"
            )
        if self.auto_verify:
            problems.append(
                "AUTO_VERIFY is true, which would auto-verify every registration"
            )
        if "*" in self.cors_list:
            problems.append(
                "CORS_ORIGINS contains '*', which leaks credentialed responses"
            )
        if problems:
            raise ValueError(
                "Refusing to start in production: "
                + "; ".join(problems)
                + ". See VERCEL_MIGRATION_PLAN.md §2.2."
            )
        return self

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
