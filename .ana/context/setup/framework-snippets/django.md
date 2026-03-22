## Django Patterns

**Framework conventions (Django/DRF):**
- MVT architecture: Models (data), Views (logic), Templates (presentation)
- Django REST Framework: Serializers for validation, ViewSets for CRUD, Permissions for auth
- Fat models, thin views: Business logic in models when reasonable
- Apps for modularity: users/, products/, orders/ (Django apps)

**ORM patterns:**
- select_related() for foreign keys (avoid N+1 queries)
- prefetch_related() for reverse FKs and M2M
- Transactions for data integrity: @transaction.atomic decorator
- QuerySets are lazy (don't evaluate until needed)

**DRF patterns:**
- Serializers: ModelSerializer for CRUD, custom validators
- ViewSets: ModelViewSet for full CRUD, ReadOnlyModelViewSet for read-only
- Permissions: IsAuthenticated, IsAdminUser, custom permission classes
- Routers: DefaultRouter for automatic URL routing

**Testing:**
- Django TestCase for database tests (transaction rollback)
- APIClient for API endpoint tests
- Factories for test data (factory_boy)
