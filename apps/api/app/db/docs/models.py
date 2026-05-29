from datetime import datetime
from sqlalchemy import JSON, Column, DateTime, Boolean, Integer, String, Text
from app.db.database import Base

class DocsSystemConfig(Base):
    __tablename__ = "docs_system_config"

    id = Column(Integer, primary_key=True)

    # Publishing Controls
    is_public = Column(Boolean, default=False)
    schedule_start = Column(DateTime, nullable=True)
    schedule_end = Column(DateTime, nullable=True)

    # Presentation Config
    site_title = Column(String, default="OneShot Live Platform")
    hero_tagline = Column(String, default="An AI teacher for STEM education.")

    # Theme
    dark_mode = Column(Boolean, default=True)

    # Metadata
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DocsSection(Base):
    __tablename__ = "docs_sections"

    id = Column(Integer, primary_key=True)

    slug = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)

    section_type = Column(String, nullable=False) # e.g., 'pitch', 'architecture', 'metrics'
    order_index = Column(Integer, default=0)

    content_markdown = Column(Text, nullable=True)

    is_visible = Column(Boolean, default=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DocsVersion(Base):
    __tablename__ = "docs_versions"

    id = Column(Integer, primary_key=True)
    version = Column(String, nullable=False)
    snapshot_data = Column(JSON, default=dict)
    changelog = Column(Text, nullable=True)
    published_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TeamMember(Base):
    __tablename__ = "docs_team_members"

    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    email = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
