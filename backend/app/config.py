from pydantic_settings import BaseSettings


def _normalize_db_url(url: str) -> str:
    # Render exposes postgres://; SQLAlchemy + psycopg (v3) want postgresql+psycopg://
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Settings(BaseSettings):
    database_url: str = "sqlite:///./third_manageable.db"

    @property
    def normalized_database_url(self) -> str:
        return _normalize_db_url(self.database_url)
    jwt_secret: str = "change-me-in-production"
    jwt_alg: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    gemini_api_key: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Verification model (REDESIGN_BRIEF §16.2): in dev, newly-registered
    # athletes are auto-verified so the full flow is walkable. In production
    # leave this False — verified=True is granted by a review step (roster DB /
    # .edu email allow-list) so unverified users can never write to Community.
    auto_verify: bool = True

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()