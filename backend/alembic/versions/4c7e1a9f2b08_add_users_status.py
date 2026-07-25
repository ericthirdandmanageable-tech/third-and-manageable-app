"""add users.status

Onboarding step 1 (from the original shipped app): whether the athlete is
currently competing, transitioning, or transitioned. The register schema
accepted this field from day one but it was never persisted.

Revision ID: 4c7e1a9f2b08
Revises: 9b002fad09d3
Create Date: 2026-07-19 18:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c7e1a9f2b08'
down_revision: Union[str, Sequence[str], None] = '9b002fad09d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('status', sa.String(length=20), nullable=False, server_default='transitioning'),
    )


def downgrade() -> None:
    op.drop_column('users', 'status')
