.PHONY: test-backend test-backend-audio test-frontend test-integration verify

test-backend:
	PYTHONPATH=. pytest -m "not integration and not real_audio"

test-backend-audio:
	PYTHONPATH=. pytest -m real_audio

test-frontend:
	cd frontend && npm run verify

test-integration:
	PYTHONPATH=. pytest -m integration

verify: test-backend test-frontend
