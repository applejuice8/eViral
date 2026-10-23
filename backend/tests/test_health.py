def test_health_returns_ok(client):
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok", "version": "0.1.0"}


def test_openapi_schema_is_served(client):
    res = client.get("/openapi.json")

    assert res.status_code == 200
    assert "/health" in res.json()["paths"]
