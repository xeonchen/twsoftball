# Architecture Patterns - Single Source of Truth

This document defines THE canonical architecture patterns for the TW Softball
project. All other documentation must reference and align with these patterns.

## Core Architecture: Hexagonal + DDD + Dependency Injection Container

### Layer Dependencies

```
Web Layer (apps/web)
  ↓ imports from
Application Layer (packages/application)
  ↓ imports from
Domain Layer (packages/domain)
  ↑ implements ports defined by Application
Infrastructure Layer (packages/infrastructure)
```

**Dependency Rules:**

- **Domain Layer**: No external dependencies (pure business logic)
- **Application Layer**: Only imports from Domain layer
- **Infrastructure Layer**: Imports from Domain + Application (implements ports)
- **Web Layer**: Only imports from Application layer

## Dependency Injection Pattern: DI Container with Dynamic Import

### The Problem

Traditional DI approaches violate hexagonal architecture:

- **Composition Root in main.tsx**: Web layer imports from ALL layers ❌
- **Abstract Factory Injection**: Web layer still imports Infrastructure ❌
- **Service Locator**: Creates hidden dependencies ❌

### The Solution: DI Container with Dynamic Import

```typescript
// DI Container with Dynamic Import
import { createApplicationServicesWithContainer } from '@twsoftball/application';

const services = await createApplicationServicesWithContainer({
  environment: 'production',
  storage: 'indexeddb',
});

// Application Layer - DI Container with Dynamic Infrastructure Loading
export async function createApplicationServicesWithContainer(
  config: ApplicationConfig
): Promise<ApplicationServices> {
  const container = new DIContainer();

  // Register infrastructure services based on config.storage
  await registerInfrastructureServices(container, config);

  // Register application services
  await registerApplicationServices(container);

  // Resolve and return complete application services
  return await container.resolve<ApplicationServices>('applicationServices');
}

// Infrastructure Layer - Provides factories
export function createIndexedDBFactory(): InfrastructureFactory {
  return {
    async createServices(config) {
      return {
        gameRepository: new IndexedDBGameRepository(),
        logger: new ConsoleLogger(),
        // ...
      };
    },
  };
}
```

### DI Container Benefits

- ✅ **Enterprise-grade DI**: Service registry, lazy loading, circular
  dependency detection
- ✅ **Multiple implementations**: Memory, IndexedDB, SQLite, Cloud
- ✅ **Zero Architecture violations**: Web layer NEVER imports Infrastructure
- ✅ **Advanced features**: Singleton management, parallel resolution, container
  introspection
- ✅ **Clean testing**: Mock implementations easily tested
- ✅ **Future-proof**: New implementations added without changing Web layer
- ✅ **No dependency-cruiser exceptions**: Clean architectural compliance

## No Architecture Exceptions Needed

**The Dynamic Import pattern eliminates the need for any architectural
exceptions:**

```typescript
// DI Container with Dynamic Import
import { createApplicationServicesWithContainer } from '@twsoftball/application';

const services = await createApplicationServicesWithContainer(config);
```

**Why DI Container is architecturally superior:**

1. **Enterprise DI features**: Service registry, lazy loading, circular
   dependency detection
2. **Zero exceptions**: No dependency-cruiser exceptions needed
3. **Dynamic loading**: Infrastructure loaded at runtime, not compile-time
4. **Pure inversion**: Application controls Infrastructure, not Web layer
5. **Advanced lifecycle**: Singleton management, parallel resolution, container
   introspection
6. **Future-proof**: Adding new storage backends requires no Web layer changes

## File Locations

### Correct Structure

```
apps/web/src/shared/api/
├── adapters/              ✅ Web-specific business adapters
│   ├── gameAdapter.ts     ✅ Orchestrates use cases for UI
│   └── index.ts
├── mappers/               ✅ Web form → Application command mapping
│   ├── wizardToCommand.ts ✅ UI wizard → StartNewGameCommand
│   └── commandMapper.ts   ✅ UI actions → Commands
├── di/                    ✅ Dependency injection container
│   └── container.ts       ✅ Uses Application layer only, no Infrastructure imports
└── repositories/          ❌ MOVE to Infrastructure layer

packages/application/src/
├── use-cases/            ✅ Business use cases
├── ports/                ✅ Interface definitions
├── services/             ✅ DI Container implementation
│   └── DIContainer.ts    ✅ DI container with enterprise features
└── adapters/             ❌ REMOVE - Web adapters belong in Web layer

packages/infrastructure/src/
├── web/                  ✅ Web-specific infrastructure
│   ├── repositories/     ✅ IndexedDB implementations
│   └── factory.ts        ✅ Creates web infrastructure services
├── memory/               ✅ Memory implementations
│   └── factory.ts        ✅ Creates memory services
└── adapters/             ❌ REMOVE - Adapters belong in Web layer
```

### Common Mistakes

- ❌ **Web adapters in Application layer**: Violates technology-agnostic
  principle
- ❌ **Web adapters in Infrastructure layer**: Creates coupling
- ❌ **Application importing Infrastructure**: Violates hexagonal architecture
  (use dynamic imports instead)
- ❌ **Web importing Domain directly**: Should go through Application layer

## Testing Patterns

### Unit Tests

```typescript
// Domain layer tests (no dependencies)
describe('Game', () => {
  it('should calculate RBI correctly', () => {
    const game = Game.create('Home', 'Away');
    // Pure domain logic testing
  });
});

// Application layer tests (use memory storage for fast testing)
describe('StartNewGameUseCase', () => {
  it('should create game successfully', async () => {
    const services = await createApplicationServicesWithContainer({
      environment: 'test',
      storage: 'memory',
    });
    // Test use case with in-memory implementations
  });
});
```

### Integration Tests

```typescript
// Web layer integration tests
describe('DI Container', () => {
  it('should initialize with memory factory', async () => {
    const services = await createApplicationServicesWithContainer({
      environment: 'test',
      storage: 'memory',
    });

    expect(services.startNewGame).toBeDefined();
  });
});
```

## Multiple Implementation Support

### Current Implementations

- **Memory**: Fast, in-memory storage for testing/development
- **IndexedDB**: Browser persistent storage for production

### Future Implementations

```typescript
// SQLite (Future)
const services = await createApplicationServicesWithContainer({
  environment: 'production',
  storage: 'sqlite',
});

// Cloud (Future)
const services = await createApplicationServicesWithContainer({
  environment: 'production',
  storage: 'cloud',
});
```

## Validation Commands

```bash
# Check architecture compliance
pnpm deps:check

# Verify types compile
pnpm typecheck

# Run tests
pnpm test

# Build packages
pnpm build
```

## Documentation References

**All documentation files must align with these patterns:**

1. `/docs/design/architecture.md` - Must reference this file
2. `/apps/web/src/features/game-setup/README.md` - Must show DI Container
   implementation
3. `/CLAUDE.md` - Must include DI Container in architecture rules
4. `/TODO.local.md` - Must reflect current DI pattern status
5. All other documentation files listed in implementation plan

## Summary

**THE DI Container Pattern with Dynamic Import is THE standard dependency
injection approach for this project.**

### DI Container Implementation

- Enterprise-grade dependency injection with service registry and lifecycle
  management
- Web layer only calls Application layer, never imports Infrastructure
- Application layer dynamically imports Infrastructure at runtime based on
  config
- Advanced features: lazy loading, circular dependency detection, singleton
  management
- Clean, testable, and architecturally compliant with zero exceptions
- Domain layer remains pure with no dependencies
- Multiple implementations supported through dynamic import pattern
