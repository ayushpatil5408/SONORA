"""SONORA Backend Database Models
Authoritative Reference: PRD.md Section 48 & Milestone 1

Defines initial schema tracking and system metadata entities.
Domain entities (users, tracks, playlists) are deferred to Milestone 2.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from .database import Base


class SchemaVersion(Base):
    """Tracks applied database schema versions and migration timestamps."""
    __tablename__ = "schema_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<SchemaVersion(version='{self.version}', description='{self.description}')>"


class SystemSetting(Base):
    """Key-value repository configuration and runtime flags."""
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<SystemSetting(key='{self.key}', value='{self.value}')>"
