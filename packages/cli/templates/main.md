# Project Context - {{projectName}}

## Overview

<!-- TODO: Describe your project's purpose and goals (2-3 sentences) -->
<!-- Example 1: "FastAPI backend for multi-tenant SaaS product. Provides user authentication, subscription billing, and usage analytics. Serves React frontend via REST API." -->
<!-- Example 2: "Next.js full-stack web application for contractor project management. Handles job scheduling, customer communication, invoicing. Deployed on Vercel with Supabase backend." -->
<!-- Example 3: "Go microservice for real-time event processing. Consumes from Kafka, processes events, writes to PostgreSQL. Part of larger event-driven architecture." -->

## Architecture

<!-- TODO: Explain your high-level architecture (layered, domain-driven, microservices, monolith, serverless) -->
<!-- Example 1: "Layered architecture: API layer (FastAPI routes) → Service layer (business logic) → Repository layer (data access) → Database (PostgreSQL with SQLAlchemy ORM)" -->
<!-- Example 2: "Next.js App Router with Server Components: Server-rendered pages, Server Actions for mutations, Supabase for database, Vercel Edge Functions for API routes" -->
<!-- Example 3: "Hexagonal architecture: Domain core (business logic) → Ports (interfaces) → Adapters (HTTP handlers, database repos, message queue) → External systems" -->

## Tech Stack

<!-- TODO: List your primary technologies, frameworks, libraries -->
<!-- Example 1: "Python 3.11, FastAPI 0.100, SQLAlchemy 2.0, PostgreSQL 15, Redis 7, Celery for background jobs, pytest for testing, Docker for deployment" -->
<!-- Example 2: "TypeScript 5.0, Next.js 15, React 19, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Vercel deployment, Vitest for testing" -->
<!-- Example 3: "Go 1.21, standard library HTTP server, pgx for PostgreSQL, go-redis, Kafka Go client, Docker multi-stage builds" -->

**Language:** <!-- e.g., Python, TypeScript, Go, Rust -->
**Framework:** <!-- e.g., FastAPI, Next.js, Express, Standard Library -->
**Database:** <!-- e.g., PostgreSQL, MongoDB, MySQL, None -->
**Infrastructure:** <!-- e.g., Docker, Kubernetes, Vercel, AWS Lambda -->

## Directory Structure

<!-- TODO: Explain key directories and their purposes -->
<!-- Example 1: "src/ = source code, src/api/ = FastAPI routes, src/services/ = business logic, src/repositories/ = data access, src/models/ = SQLAlchemy models, tests/ = pytest tests, alembic/ = database migrations" -->
<!-- Example 2: "app/ = Next.js pages and routes, components/ = React components, lib/ = utilities and helpers, public/ = static assets, prisma/ = database schema and migrations, tests/ = Vitest tests" -->
<!-- Example 3: "cmd/ = main packages (entrypoints), internal/ = private application code, pkg/ = public libraries, api/ = OpenAPI specs, deployments/ = Kubernetes manifests, scripts/ = build and deploy scripts" -->

## Key Dependencies

<!-- TODO: Document important dependencies and why they were chosen -->
<!-- Example 1: "FastAPI: Modern async framework with automatic OpenAPI docs and type validation. SQLAlchemy: ORM with strong typing support and migration tools. Pydantic: Request/response validation with automatic schema generation." -->
<!-- Example 2: "Next.js: React framework with Server Components for performance. Supabase: Backend-as-a-service with PostgreSQL, auth, and realtime. Tailwind: Utility-first CSS for rapid UI development." -->
<!-- Example 3: "pgx: Pure Go PostgreSQL driver with better performance than lib/pq. go-redis: Redis client with connection pooling. sarama: Kafka client for event streaming." -->

## Key Concepts

<!-- TODO: Define domain-specific terms, business logic concepts, important abstractions -->
<!-- Example 1: "Multi-tenant: Each customer has isolated data. Tenant ID in JWT token determines data access. Row-level security enforces isolation. Subscription: Billing model with tiers (free, pro, enterprise). Usage tracking for metered billing." -->
<!-- Example 2: "Job: Customer project with timeline, budget, tasks. Customer: End client (not system user). Quote: Pre-work estimate sent to customer. Invoice: Post-work billing sent after job complete." -->
<!-- Example 3: "Event: Domain event published to Kafka (UserCreated, OrderPlaced, PaymentProcessed). Handler: Processes events asynchronously. Saga: Multi-step transaction across services with compensation." -->

---

*Fill this file with your project details. Better context = better AI assistance.*
*Update as project evolves - keep context current for accurate AI help.*
