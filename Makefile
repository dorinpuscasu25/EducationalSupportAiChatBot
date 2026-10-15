.PHONY: help up down logs ingest ingest-force db-up api-dev web-dev setup check api-check web-check

GO = docker run --rm -v "$(CURDIR)/apps/api":/app -v educational-support-gomod:/go/pkg/mod -w /app golang:1.25-alpine

help:
	@echo 'up            Build and start everything (http://localhost:8080)'
	@echo 'down          Stop (data is kept)'
	@echo 'logs          Follow API logs (verification codes appear here in development)'
	@echo 'ingest        Index new/changed files from documents/'
	@echo 'ingest-force  Re-index every file in documents/'
	@echo 'db-up         Start only PostgreSQL (for api-dev / web-dev)'
	@echo 'api-dev       Run the API locally (needs Go 1.25, apps/api/.env)'
	@echo 'web-dev       Run the web dev server on http://localhost:5173'
	@echo 'setup         Create .env files and install web dependencies'
	@echo 'check         API tests + web lint, tests and build'

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f api

ingest:
	docker compose exec api ./ingest

ingest-force:
	docker compose exec api ./ingest --force

db-up:
	docker compose up -d postgres

api-dev:
	cd apps/api && go run ./cmd/api

web-dev:
	npm --prefix apps/web run dev

setup:
	@test -f .env || cp .env.example .env
	@test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
	@test -f apps/web/.env || cp apps/web/.env.example apps/web/.env
	npm --prefix apps/web ci --legacy-peer-deps

check: api-check web-check

api-check:
	$(GO) sh -c "go vet ./... && go test ./... && go build ./..."

web-check:
	npm --prefix apps/web run lint
	npm --prefix apps/web test
	npm --prefix apps/web run build
