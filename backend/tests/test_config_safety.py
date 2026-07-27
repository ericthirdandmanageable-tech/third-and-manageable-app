"""The bridge must not be deployable in an insecure configuration.

Before this, `backend/app/config.py` shipped `JWT_SECRET=change-me-in-production`
and `AUTO_VERIFY=true` as defaults. Both are silent in development and both are
critical in production: the first lets anyone who reads this repository mint a
token for any user id, the second grants every registration the `verified` flag
that gates writes to Community.

Each guard is asserted in both directions — a passing production config and a
rejected one — so the checks cannot rot into always-true.
"""
import pytest

from app.config import MIN_JWT_SECRET_BYTES, Settings, _default_environment

GOOD_SECRET = "s" * MIN_JWT_SECRET_BYTES


def _prod(**overrides) -> Settings:
    base = {"environment": "production", "jwt_secret": GOOD_SECRET, "auto_verify": False}
    return Settings(**{**base, **overrides})


def test_defaults_are_safe_before_any_environment_is_named(monkeypatch):
    """The shipped defaults, with nothing configured, must not auto-verify.

    `AUTO_VERIFY` is unset here on purpose — conftest pins it true for the rest
    of the suite, and this is the one test about the default itself.
    """
    monkeypatch.delenv("AUTO_VERIFY", raising=False)
    assert Settings(environment="development", _env_file=None).auto_verify is False


def test_production_accepts_a_correct_configuration():
    s = _prod()
    assert s.is_production
    assert s.cors_list == []


def test_production_rejects_the_default_jwt_secret():
    with pytest.raises(ValueError, match="built-in default"):
        _prod(jwt_secret="change-me-in-production")


def test_production_rejects_an_empty_jwt_secret():
    with pytest.raises(ValueError, match="unset"):
        _prod(jwt_secret="   ")


def test_production_rejects_a_short_jwt_secret():
    with pytest.raises(ValueError, match="shorter than"):
        _prod(jwt_secret="s" * (MIN_JWT_SECRET_BYTES - 1))


def test_production_rejects_auto_verify():
    with pytest.raises(ValueError, match="AUTO_VERIFY"):
        _prod(auto_verify=True)


def test_production_rejects_wildcard_cors():
    # `allow_credentials=True` in main.py makes a wildcard origin a credential
    # leak rather than merely a loose setting.
    with pytest.raises(ValueError, match=r"'\*'"):
        _prod(cors_origins="https://ok.example,*")


def test_development_tolerates_the_insecure_defaults():
    """The guards must arm in production only — local dev stays walkable."""
    s = Settings(environment="development", jwt_secret="change-me-in-production", auto_verify=True)
    assert s.auto_verify is True


@pytest.mark.parametrize(
    "vercel_env,expected",
    [
        ("production", "production"),
        # A preview deployment is internet-reachable, so it gets production's
        # guards; only a local/unset environment is treated as development.
        ("preview", "production"),
        ("development", "development"),
    ],
)
def test_environment_is_inferred_from_vercel_env(monkeypatch, vercel_env, expected):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("VERCEL_ENV", vercel_env)
    assert _default_environment() == expected


def test_explicit_development_cannot_downgrade_public_vercel(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("VERCEL_ENV", "production")
    assert _default_environment() == "production"
    with pytest.raises(ValueError, match="built-in default"):
        Settings()


def test_environment_defaults_to_development_when_nothing_is_set(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    assert _default_environment() == "development"
