"""add users.headline + tech_support_requests

The career-defining profile: a one-line headline ("Former linebacker →
future physical therapist") editable from the new Profile page. Tech
support requests back the Support page's second card (its button
previously showed a fake success state with nothing persisted).

Revision ID: 7d2e5f8a1c34
Revises: 4c7e1a9f2b08
Create Date: 2026-07-19 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d2e5f8a1c34'
down_revision: Union[str, Sequence[str], None] = '4c7e1a9f2b08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('headline', sa.String(length=140), nullable=True))
    op.create_table(
        'tech_support_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('tech_support_requests')
    op.drop_column('users', 'headline')
