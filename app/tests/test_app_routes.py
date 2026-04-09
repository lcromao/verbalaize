def test_api_root_endpoint(client):
    response = client.get("/api")

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"]
    assert payload["version"]
    assert payload["docs"] == "/docs"


def test_health_endpoints(client):
    root_response = client.get("/health")
    api_response = client.get("/api/health")

    assert root_response.status_code == 200
    assert root_response.json()["status"] == "healthy"

    assert api_response.status_code == 200
    assert api_response.json()["service"] == "verbalaize-api"
