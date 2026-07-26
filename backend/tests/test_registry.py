import os
import re

# Resolve the frontend paths.ts relative to this backend/ dir. It moved from
# `web-prototype/src/data/` to `src/lib/core/` at Phase 1 steps 9-10, when the
# prototype was absorbed and deleted.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_PATHS = os.path.normpath(
    os.path.join(BACKEND_DIR, "..", "src", "lib", "core", "paths.ts")
)


def _frontend_path_ids():
    """Parse path ids out of the frontend WORK_PATHS registry.

    The frontend registry is the canonical content source; this test asserts
    the backend registry mirrors it. We parse the `id:` lines rather than
    import TS. `tests/core-registry.test.ts` checks the same agreement from
    the other side, and additionally pins order, names, and fit ratings — but
    this suite has to stand on its own, because pytest runs without Vitest.
    """
    with open(FRONTEND_PATHS) as f:
        src = f.read()
    # ids are declared as  id: "consulting",  inside each registry entry, and
    # never inside the interface (`id: string;` has no quotes and no comma).
    ids = set(re.findall(r"""^\s*id:\s*["']([a-z0-9_]+)["']\s*,""", src, flags=re.M))
    assert ids, f"parsed no path ids from {FRONTEND_PATHS} — has its shape changed?"
    return ids


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
