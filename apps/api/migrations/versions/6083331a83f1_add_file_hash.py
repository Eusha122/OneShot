"""Add file_hash

Revision ID: 6083331a83f1
Revises: eef4875046d0
Create Date: 2026-05-26 21:25:51.667352

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6083331a83f1'
down_revision: Union[str, Sequence[str], None] = 'eef4875046d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('documents')]
    if 'file_hash' not in columns:
        op.add_column('documents', sa.Column('file_hash', sa.String(), nullable=True))
    with op.batch_alter_table('documents') as batch_op:
        batch_op.create_unique_constraint('uq_documents_file_hash', ['file_hash'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('documents') as batch_op:
        batch_op.drop_constraint('uq_documents_file_hash', type_='unique')
        batch_op.drop_column('file_hash')
