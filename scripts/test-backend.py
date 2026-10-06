"""SONORA Milestone 1 Backend Test Suite
Authoritative Reference: PRD.md Section 67 Deliverables 12, 13, 14, 15

Validates:
1. Database connectivity and initial schema migration
2. GET /health endpoint status and payload response
3. Root metadata endpoint
"""

import sys
import os

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend directory to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.database import check_database_connection
from app.migrations import run_initial_migration


def assert_true(condition: bool, message: str):
    if not condition:
        print(f"FAIL: {message}", file=sys.stderr)
        sys.exit(1)


def test_database_and_migration():
    print("[1/3] Testing database connection and migration...")
    migration_ok = run_initial_migration()
    assert_true(migration_ok, "Initial migration should execute successfully")

    db_ok = check_database_connection()
    assert_true(db_ok, "Database connection check should return True")
    print("+ Database and migration verified")


def test_health_endpoint():
    print("\n[2/3] Testing GET /health endpoint...")
    with TestClient(app) as client:
        response = client.get("/health")
        assert_true(response.status_code == 200, f"Expected 200 OK, got {response.status_code}")

        data = response.json()
        assert_true(data.get("status") == "healthy", f"Status should be 'healthy', got '{data.get('status')}'")
        assert_true(data.get("service") == "sonora-backend", "Service name should match sonora-backend")
        assert_true(data.get("version") == "0.1.0", "Version should match 0.1.0")
        assert_true(data.get("database") == "connected", "Database status should be 'connected'")
    print("+ Health endpoint response verified")


def test_root_endpoint():
    print("\n[3/3] Testing GET / root endpoint...")
    with TestClient(app) as client:
        response = client.get("/")
        assert_true(response.status_code == 200, f"Expected 200 OK, got {response.status_code}")
        data = response.json()
        assert_true(data.get("product") == "SONORA", "Product name should be SONORA")
    print("+ Root endpoint verified")


if __name__ == "__main__":
    print("====================================================")
    print("SONORA Milestone 1 -- Backend & Database Tests")
    print("====================================================")
    test_database_and_migration()
    test_health_endpoint()
    test_root_endpoint()
    print("\n====================================================")
    print("All backend test suites passed with 0 errors.")
    print("====================================================\n")
