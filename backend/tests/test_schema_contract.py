"""The bridge must fit the schema Drizzle owns.

`src/lib/db/schema.ts` defines the database and `drizzle/*.sql` is what actually
runs against Neon. These SQLAlchemy models only *borrow* that schema,
so nothing here re-checks whether the baseline is well designed — it checks that
the bridge cannot drift away from it. A model column that Drizzle never created
fails at runtime on the first write; a NOT NULL the bridge does not know about
fails on the first insert. Both are cheap to catch here and expensive to catch
in production.

This is the "shared contract suite" the migration plan gates the bridge on
(VERCEL_MIGRATION_PLAN.md, technical go-live blocker 2).
"""
import re
from pathlib import Path

import pytest

from app.database import Base

MIGRATION_DIR = Path(__file__).resolve().parents[2] / "drizzle"
MIGRATIONS = sorted(MIGRATION_DIR.glob("[0-9][0-9][0-9][0-9]_*.sql"))

# What a Postgres column type in the baseline is allowed to look like once
# SQLAlchemy has compiled the model column for Postgres.
_EQUIVALENT = {
    "uuid": {"UUID"},
    "text": {"TEXT", "VARCHAR"},
    "date": {"DATE"},
    "integer": {"INTEGER"},
    "boolean": {"BOOLEAN"},
    "jsonb": {"JSON", "JSONB"},
    "timestamp with time zone": {"TIMESTAMP WITH TIME ZONE"},
    "athlete_status": {"VARCHAR", "ATHLETE_STATUS"},
}


def _parse_migrations() -> dict[str, dict[str, tuple[str, bool]]]:
    """table -> column -> (postgres type, not_null). Deliberately a small
    regex parser rather than a Postgres connection: this has to run in CI
    without a database, which is the whole point of catching drift early."""
    sql = "\n".join(path.read_text() for path in MIGRATIONS)
    tables: dict[str, dict[str, tuple[str, bool]]] = {}
    for table, block in re.findall(
        r'CREATE TABLE "(\w+)" \((.*?)\n\);', sql, re.S
    ):
        columns: dict[str, tuple[str, bool]] = {}
        for line in block.strip().splitlines():
            line = line.strip().rstrip(",")
            m = re.match(r'"(\w+)" (.+)', line)
            if not m:
                continue
            name, rest = m.group(1), m.group(2)
            not_null = "NOT NULL" in rest
            col_type = re.split(r"\s+(?:PRIMARY|NOT|DEFAULT|GENERATED)", rest)[0]
            columns[name] = (col_type.strip().strip('"').lower(), not_null)
        tables[table] = columns
    return tables


BASELINE_TABLES = _parse_migrations()
BRIDGE_TABLES = sorted(Base.metadata.tables)


def test_baseline_parsed():
    # 20 tables across the baseline + membership migration; a parser that
    # silently matched nothing
    # would make every other assertion in this file vacuously true.
    assert len(BASELINE_TABLES) == 20, sorted(BASELINE_TABLES)


@pytest.mark.parametrize("table_name", BRIDGE_TABLES)
def test_bridge_table_exists_in_baseline(table_name):
    assert table_name in BASELINE_TABLES, (
        f"{table_name} is modelled by the bridge but Drizzle never creates it"
    )


@pytest.mark.parametrize("table_name", BRIDGE_TABLES)
def test_bridge_columns_exist_with_compatible_types(table_name):
    from sqlalchemy.dialects import postgresql

    baseline = BASELINE_TABLES[table_name]
    for column in Base.metadata.tables[table_name].columns:
        assert column.name in baseline, (
            f"{table_name}.{column.name} does not exist in the baseline"
        )
        pg_type, _ = baseline[column.name]
        compiled = str(
            column.type.compile(dialect=postgresql.dialect())
        ).upper()
        allowed = _EQUIVALENT.get(pg_type)
        if allowed is None:  # varchar(n), etc.
            allowed = {pg_type.split("(")[0].upper()}
        assert any(compiled.startswith(a) for a in allowed), (
            f"{table_name}.{column.name}: bridge compiles to {compiled}, "
            f"baseline is {pg_type}"
        )


@pytest.mark.parametrize("table_name", BRIDGE_TABLES)
def test_bridge_supplies_every_required_column(table_name):
    """A NOT NULL column with no database default must be modelled and
    populated by the bridge, or every insert fails."""
    modelled = {c.name for c in Base.metadata.tables[table_name].columns}
    sql = "\n".join(path.read_text() for path in MIGRATIONS)
    block = re.search(rf'CREATE TABLE "{table_name}" \((.*?)\n\);', sql, re.S)
    assert block
    for line in block.group(1).strip().splitlines():
        line = line.strip().rstrip(",")
        m = re.match(r'"(\w+)" (.+)', line)
        if not m or "NOT NULL" not in m.group(2) or "DEFAULT" in m.group(2):
            continue
        assert m.group(1) in modelled, (
            f"{table_name}.{m.group(1)} is NOT NULL with no default and the "
            f"bridge does not model it — every insert would fail"
        )


def test_no_naive_timestamp_columns():
    """The blocker this file exists for: every instant is timezone-aware."""
    from app.database import UtcDateTime

    for table in Base.metadata.tables.values():
        for column in table.columns:
            type_name = type(column.type).__name__
            if "DateTime" in type_name or "TIMESTAMP" in type_name.upper():
                assert isinstance(column.type, UtcDateTime), (
                    f"{table.name}.{column.name} is a naive datetime"
                )


def test_no_integer_primary_keys():
    """Domain entities use UUIDs, not enumerable row numbers (§3.1)."""
    from sqlalchemy import Integer

    for table in Base.metadata.tables.values():
        for column in table.primary_key.columns:
            assert not isinstance(column.type, Integer), (
                f"{table.name}.{column.name} is still an integer primary key"
            )
