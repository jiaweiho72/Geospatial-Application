"""Add latest_status column to polygons

Revision ID: b804c73d94c0
Revises: 
Create Date: 2024-09-01 22:19:40.747975
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b804c73d94c0'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create the ENUM type first
    op.execute("CREATE TYPE statusenum AS ENUM ('clear', 'temporary', 'permanent')")
    
    # Add the latest_status column to the polygons table
    op.add_column('polygons', sa.Column('latest_status', sa.Enum('clear', 'temporary', 'permanent', name='statusenum'), nullable=False, server_default='clear'))
    op.create_index(op.f('ix_polygons_latest_status'), 'polygons', ['latest_status'], unique=False)

def downgrade() -> None:
    # Drop the index and column
    op.drop_index(op.f('ix_polygons_latest_status'), table_name='polygons')
    op.drop_column('polygons', 'latest_status')
    
    # Drop the ENUM type
    op.execute("DROP TYPE statusenum")
