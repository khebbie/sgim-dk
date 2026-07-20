# Constitution for LLM Code Agents

> Explicit, actionable coding principles and architectural constraints.
> This constitution defines behavioral and structural rules with concrete decision criteria.
> Operations, infrastructure, and organizational processes are out of scope.

---

## 1. Guiding Principles

### Always Releasable
- **Main branch:** Must remain deployable and stable.
- **Feature branches:** May contain work-in-progress commits that temporarily break builds.
- **Merge requirement:** Only merge to main through PRs that pass CI/CD.

### Incremental Improvement
- **When editing a file:** Improve the specific code being modified (fix nearby style issues, simplify adjacent logic).
- **Scope:** Limit improvements to the immediate context of the change.
- **Do not:** Make unrelated changes elsewhere in the file unless explicitly required.

### Readable > Clever
- **Priority:** Clarity and maintainability outweigh brevity or optimization.
- **Guideline:** Code should be self-documenting; prefer explicit over implicit.

### Stateless by Default
- **Prefer:** Stateless logic for simplicity and scalability.
- **When state is needed:** Make it explicit and contained.

### Replaceability
- **Module boundaries:** Use interfaces/protocols for all module boundaries.
- **External dependencies:** Avoid vendor-specific APIs. When using a vendor API we wrap it in a generic interface so we can replace it.
- **Module size:** Keep modules small (~100 LOC per file as a guideline).
- **Goal:** Any module should be easy to substitute or rewrite.

### Functional Resilience
- **Requirement:** Code must handle known failure modes gracefully.
- **See:** Section 3 for service resilience patterns.

---

## 2. Testing Principles

### Test Coverage Strategy
- **Business logic / domain rules:** Aim for ~80%+ coverage.
- **Infrastructure / adapters / UI:** Accept ~60-70% coverage.
- **Trivial code:** Allow minimal coverage for getters, simple DTOs.

### Test-Driven Development
- **Always write tests first for:** Complex business logic and bug fixes.
- **Follow:** Strict red-green-refactor cycle for these cases.
- **Allow test-after for:** Simple CRUD operations or UI code (but tests must still exist).
- **Refactor not restructure** Refactoring referes to the original meaning as defined by Martin Fowler in the original book.

### Mock Usage Policy
- **Prefer:** Dependency injection and interface-based design.
- **Use mocks only for:** External services (databases, APIs, file systems).
- **Avoid mocking:** Internal application code or domain logic.
- **Design goal:** Use real implementations or in-memory alternatives where practical.

> "If a mock returns a mock, the design needs work."

### Test Requirements
- **Mandatory:** Automated tests for all production logic.
- **Focus on:** Functional behavior, not internal implementation.

---

## 3. Architecture & Microservices

### Service Boundaries
- **Note:** Domain-driven boundaries are determined elsewhere and outside the scope of this constitution.
- **Requirement:** Services must be independently deployable (avoid tight coupling).

### External Service Calls - Mandatory Requirements
- **Timeouts:** Always specify explicit timeout values.
  - Internal services: ~1 seconds
  - External APIs: ~5 seconds
- **Error handling:** Handle all error types with specific recovery logic:
  - Timeout errors
  - Network errors
  - 4xx client errors
  - 5xx server errors
- **Pattern:** Use ports and adapters pattern to isolate external service integration.

### Resilience Patterns
- **Critical dependencies:** Implement circuit breaker pattern (open/half-open/closed states with thresholds).
- **Non-critical calls:** Simple retry logic is acceptable.
- **Apply bulkheading:** Prevent cascading failures across service boundaries.
- **Use standard libraries** Use community built libraries for these patterns - don't implement your own.

### API Versioning
- **Strategy:** Use URL path versioning (e.g., `/v1/users`, `/v2/users`).
- **Rule:** Never make breaking changes to existing versions.
- **Scope:** Version all public/external APIs

---

## 4. Observability Contracts

### Metrics
- **Requirement:** Each service must expose structured metrics endpoints (e.g., `/metrics`).
- **Implementation:** Metrics hooks should not depend on infrastructure.

### Structured Logging
- **Format:** Always use structured logging libraries (JSON format).
- **Required fields:**
  - `timestamp`
  - `level`
  - `message`
  - `context` (e.g., `requestId`, `userId`, `operation`)
- **Never:** Use plain string logging.

### Logging Decision Points
- **Do log:**
  - Function entry with key parameters
  - Error conditions and warnings
  - State transitions
  - External service calls
- **Do not log:**
  - Routine operations
  - Internal loops
  - Successful internal operations

---

## 5. Functional Design Guidelines

### Idempotency (Strict)
- **Definition:** All public functions and API operations must produce identical results and side effects when called multiple times with the same inputs.
- **Scope:** Applies to all public functions, not just mutation operations.

### Purity
- **Guideline:** Push all side effects (I/O, mutations, logging) to the edges of the system.
- **Target:** Keep 80%+ of business logic pure, even if it requires passing more parameters.
- **Core domain logic:** Must be pure; side effects allowed only in application/service layers.

### Explicitness Over Magic
- **Requirement:** Make data flow, dependencies, and effects visible and deliberate.
- **Avoid:** Hidden behavior, implicit dependencies, framework magic.

### Immutability by Default
- **Rule:** Data structures should be immutable unless mutability yields clear, measurable benefit.

### Referential Transparency
- **Goal:** Replacing a function call with its result must not change program behavior.

### Controlled Side Effects
- **Pattern:** Encapsulate I/O, network calls, and mutations behind clear interfaces.
- **See:** Ports and adapters pattern (Section 3).

### Error Handling Through Types
- **Languages with good support (e.g. Rust, TypeScript with Result types, Haskell, Scala):**
  - Use type-based error handling (e.g., `Result`, `Either`).
- **Languages where exceptions are idiomatic (Python, Java, C#):**
  - Use exceptions as standard. But only for exceptional flow, normal flow MUST NEVER use exceptions.
- **General principle:** Prefer type-based error handling where language idioms support it.

### Asynchronous Safety
- **Requirement:** Ensure concurrency primitives are abstracted behind predictable, composable interfaces.
- **Never use low level thread constructs** NEVER use thread,ThreadLocal, Locks, synchronized an other low level threading constructs.

### Declarative Style
- **Guideline:** Describe *what* the system should do rather than *how* to do it.

### Determinism
- **Rule:** Inject time, randomness, and environment variables as dependencies.
- **Pattern:**
  - Use `Clock` interface for time
  - Use `RandomGenerator` interface for randomness
  - Use `Config` object for environment variables
- **Goal:** Make non-deterministic inputs explicit and testable.

### Composability
- **Guideline:** Prefer many small, single-purpose functions (5-15 LOC).
- **Accept:** More function definitions in favor of better composition.
- **Goal:** Functions should be testable and reusable in isolation.

### Isolation
- **Requirement:** Each component should be independently understandable and modifiable.

### Defensive Boundaries
- **Rule:** Validate and sanitize at every system boundary (API endpoints, message handlers, file parsers).
- **Validation requirements:**
  - Schema validation
  - Type checking
  - Range checks
- **Action:** Reject invalid input immediately.
- **Internal trust:** Once data is validated at entry points, internal functions may skip validation.


## Follow the Sandi Metz rules
- Classes can be no longer than one hundred lines of code.
- Methods can be no longer than five lines of code.
- Pass no more than four parameters into a method. 
- Entry point handlers (controllers, request handlers, CLI commands) can instantiate only one object. Presentation layer components should only know about one data source and should only send messages to that object (avoid chained calls like `object.collaborator.value`).
