import os
import re

# Resolve the frontend paths.ts relative to this backend/ dir.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_PATHS = os.path.normpath(
    os.path.join(BACKEND_DIR, "..", "web-prototype", "src", "data", "paths.ts")
)


def _frontend_path_ids():
    """Parse path ids out of the frontend WORK_PATHS registry.

    The frontend registry is the canonical content source; this test asserts
    the backend registry mirrors it. We parse the id: '...' lines rather than
    import TS.
    """
    with open(FRONTEND_PATHS) as f:
        src = f.read()
    # ids are declared as  id: 'consulting',  inside each registry entry.
    return set(re.findall(r"^\s*id:\s*'([a-z0-9_]+)'\s*,", src, flags=re.M))


def _backend_path_ids():
    from app.services.registry import WORK_PATHS
    return {p["id"] for p in WORK_PATHS}


def test_backend_registry_mirrors_frontend():
    frontend = _frontend_path_ids()
    backend = _backend_path_ids()
    missing_in_backend = frontend - backend
    only_in_backend = backend - frontend
    assert not missing_in_backend and not only_in_backend, (
        f"registry drift — missing in backend: {sorted(missing_in_backend)}, "
        f"only in backend: {sorted(only_in_backend)}"
    )


def test_registry_has_five_paths():
    from app.services.registry import WORK_PATHS
    assert len(WORK_PATHS) == 5


def test_every_path_has_forum_and_reps():
    from app.services.registry import WORK_PATHS
    for p in WORK_PATHS:
        assert p["forum"]["title"], p["id"]
        assert len(p["first_reps"]) >= 1, p["id"]
        assert len(p["loves"]) >= 1 and len(p["hates"]) >= 1, p["id"]
