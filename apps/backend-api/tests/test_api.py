from fastapi.testclient import TestClient

from app.config import get_settings
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


def test_create_founder_origination_job():
    response = client.post(
        "/discovery/jobs",
        json={
            "job_type": "founder_origination",
            "theme_id": "grid-infrastructure",
            "query": '"Jane Founder" new company',
            "metadata": {"review_gated": True},
        },
    )

    assert response.status_code == 200
    assert response.json()["job_type"] == "founder_origination"


def test_create_expert_profile_completion_job():
    response = client.post(
        "/discovery/jobs",
        json={
            "job_type": "expert_profile_completion",
            "theme_id": "grid-infrastructure",
            "metadata": {
                "target_name": "Jane Advisor",
                "target_organizations": ["Canaccord Genuity"],
                "target_companies": ["JSM Group"],
                "review_gated": True,
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["job_type"] == "expert_profile_completion"


def test_process_next_cron_requires_authorization():
    response = client.get("/jobs/process-next")

    assert response.status_code == 401


def test_api_token_protects_non_public_routes():
    settings = get_settings()
    original_token = settings.backend_api_token
    settings.backend_api_token = "test-api-token"
    try:
        response = client.post("/discovery/jobs", json={"theme_id": "grid-infrastructure"})
        assert response.status_code == 401

        response = client.post(
            "/discovery/jobs",
            json={"theme_id": "grid-infrastructure"},
            headers={"Authorization": "Bearer test-api-token"},
        )
        assert response.status_code == 200
    finally:
        settings.backend_api_token = original_token


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


def test_search_endpoint_uses_local_fallback_without_provider_keys():
    response = client.get("/search", params={"q": "grid infrastructure", "limit": 3})
    assert response.status_code == 200
    body = response.json()
    assert body["query"] == "grid infrastructure"
    assert body["providers"]["keirolabs"] is False
    assert isinstance(body["results"], list)
    assert len(body["results"]) <= 3
