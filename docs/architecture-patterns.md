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
- **Application Layer**: Only imports from Domain layer (never imports
  Infrastructure)
- **Infrastructure Layer**: Imports from Domain + Application (implements ports)
- **Web Layer**: Acts as Composition Root - imports from Application +
  Infrastructure factory functions

## Dependency Injection Pattern: Composition Root with DI Container

### The Problem

Traditional DI approaches violate hexagonal architecture or create circular
dependencies:

- **Application imports Infrastructure**: Creates circular dependencies ❌
- **Service Locator**: Creates hidden dependencies ❌
- **Dynamic Import with string paths**: Brittle and hard to maintain ❌

### The Solution: Composition Root Pattern with DI Container

The **Composition Root** pattern places all dependency wiring at the
application's entry point (Web layer). This eliminates circular dependencies
while maintaining clean architecture.

```typescript
// Web Layer (Composition Root) - Selects infrastructure factory
import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application';
import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';

function createApplicationServicesFactory() {
  return async (appConfig: ApplicationConfig) => {
    // Composition root: Select infrastructure factory based on configuration
    const factory =
      appConfig.storage === 'memory'
        ? createMemoryFactory()
        : createIndexedDBFactory();

    // Use DI container with explicit factory (no infrastructure import in Application layer)
    return await createApplicationServicesWithContainerAndFactory(
      appConfig,
      factory
    );
  };
}

// Application Layer - Accepts factory as parameter (no Infrastructure import)
export async function createApplicationServicesWithContainerAndFactory(
  config: ApplicationConfig,
  infrastructureFactory: InfrastructureFactory
): Promise<ApplicationServices> {
  const container = new DIContainer();

  // Register infrastructure services using provided factory
  await container.register('infrastructureServices', async () => {
    return await infrastructureFactory.createServices(config);
  });

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

### Composition Root Benefits

- ✅ **No Circular Dependencies**: Application never imports Infrastructure
- ✅ **Explicit Dependencies**: All wiring happens at single entry point
- ✅ **Enterprise-grade DI**: Service registry, lazy loading, circular
  dependency detection
- ✅ **Multiple implementations**: Memory, IndexedDB, SQLite, Cloud
- ✅ **Type-safe**: Infrastructure factories are strongly typed
- ✅ **Clean testing**: Easy to inject test doubles at composition root
- ✅ **Clear flow**: Dependency direction is obvious (Web → Application ←
  Infrastructure)
- ✅ **Maintainable**: All dependency decisions in one place

## Architecture Rules for Composition Root Pattern

**The Composition Root pattern requires specific dependency rules:**

```typescript
// Web Layer (Composition Root) - Imports Infrastructure factories
import { createIndexedDBFactory } from '@twsoftball/infrastructure/web';
import { createMemoryFactory } from '@twsoftball/infrastructure/memory';
import { createApplicationServicesWithContainerAndFactory } from '@twsoftball/application';
```

**Why Composition Root is architecturally sound:**

1. **Single Wiring Point**: All dependency decisions made at application entry
   point
2. **No Circular Dependencies**: Application never imports Infrastructure
3. **Explicit Flow**: Web → Infrastructure (factory selection) + Application →
   Infrastructure (port implementation)
4. **Type Safety**: Infrastructure factories are strongly typed at compile time
5. **Testability**: Easy to inject test doubles at composition root
6. **Enterprise DI features**: Service registry, lazy loading, circular
   dependency detection
7. **Clear Ownership**: Web layer owns infrastructure selection, Application
   owns business logic

**Dependency-Cruiser Rules Required:**

- Web layer must be allowed to import Infrastructure factory functions
  (composition root exception)
- Application layer must NOT import Infrastructure (enforced, no exceptions)
- Infrastructure layer provides factories but doesn't control selection

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

**THE Composition Root Pattern with DI Container is THE standard dependency
injection approach for this project.**

### Composition Root Implementation

- Enterprise-grade dependency injection with service registry and lifecycle
  management
- Web layer acts as Composition Root - imports Infrastructure factories and
  wires dependencies at entry point
- Application layer accepts factories as parameters, never imports
  Infrastructure directly
- No circular dependencies - clean unidirectional flow
- Advanced features: lazy loading, circular dependency detection, singleton
  management
- Type-safe, explicit, and maintainable dependency management
- Domain layer remains pure with no dependencies
- Multiple implementations supported through factory pattern
