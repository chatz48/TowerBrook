from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["embedding_dimensions"] == 384


def test_create_and_get_job():
    response = client.post("/discovery/jobs", json={"theme_id": "grid-infrastructure"})
    assert response.status_code == 200
    job = response.json()
    assert job["status"] == "queued"

    fetched = client.get(f"/discovery/jobs/{job['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == job["id"]


def test_chat_returns_tool_trace():
    response = client.post(
        "/chat",
        json={"message": "Find experts on grid connection delays", "theme_id": "grid-infrastructure"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"]
    assert body["answer"]
    assert body["tool_calls"]
