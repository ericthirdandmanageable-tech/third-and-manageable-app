# Makes `tests` a real package so `from tests.conftest import ...` inside a test
# resolves to the module pytest already imported. Without it, pytest imports
# tests/conftest.py as top-level `conftest` while that import creates a *second*
# module object — a second temp database, a second engine, and a second
# `app.dependency_overrides[get_db]` assignment that silently re-points the app
# at the new database mid-run. Rows written before the first such import then
# disappear, which reads as a spurious 401.
