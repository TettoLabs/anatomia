## Go Patterns

**Language conventions:**
- Go fmt for formatting (run automatically)
- Short variable names (i for index, err for errors, u for user)
- Error returns not exceptions (func GetUser() (*User, error))
- Interfaces for abstraction (small interfaces, 1-3 methods ideal)
- Functions: camelCase private, PascalCase public (GetUser, validateEmail)
- Structs: PascalCase (User, AuthService)

**Standard library HTTP (if web service):**
- http.Handler interface for handlers
- Router pattern: gorilla/mux or chi
- Middleware: func(http.Handler) http.Handler chain
- Context: Use context.Context for request-scoped values, cancellation

**Error handling:**
- Return errors, don't panic (panic only for unrecoverable failures)
- Wrap errors with context: fmt.Errorf("get user: %w", err)
- Check errors immediately: if err != nil { return err }

**Concurrency:**
- Goroutines for parallel work
- Channels for communication between goroutines
- Sync primitives: sync.Mutex, sync.RWMutex for shared state
