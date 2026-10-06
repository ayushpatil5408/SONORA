"""SONORA Database Initial Migration Runner
Authoritative Reference: PRD.md Section 67 Deliverables 13 & 14

Executes the initial database schema migration, registers the schema version,
and ensures development database readiness without requiring external tooling.
"""

from datetime import datetime
from .database import engine, Base, SessionLocal
from .models import SchemaVersion, SystemSetting

INITIAL_VERSION = "001_initial_foundation"
INITIAL_DESCRIPTION = "Milestone 1 initial database foundation: schema versions and system settings"


def run_initial_migration() -> bool:
    """Creates database tables and registers the Milestone 1 migration record."""
    try:
        # Create all registered tables
        Base.metadata.create_all(bind=engine)

        with SessionLocal() as db:
            existing = db.query(SchemaVersion).filter(SchemaVersion.version == INITIAL_VERSION).first()
            if not existing:
                migration = SchemaVersion(
                    version=INITIAL_VERSION,
                    description=INITIAL_DESCRIPTION,
                    applied_at=datetime.utcnow(),
                )
                db.add(migration)

                # Initialize default product settings
                db.merge(SystemSetting(key="product_name", value="SONORA"))
                db.merge(SystemSetting(key="milestone", value="1.0"))
                db.merge(SystemSetting(key="audio_engine_status", value="operational"))

                db.commit()
                print(f"[migration] Successfully applied migration: {INITIAL_VERSION}")
            else:
                print(f"[migration] Migration {INITIAL_VERSION} already applied.")

        return True
    except Exception as e:
        print(f"[migration] Error running migration: {e}")
        return False


if __name__ == "__main__":
    success = run_initial_migration()
    if not success:
        exit(1)
