# TW Softball

[![codecov](https://codecov.io/gh/xeonchen/twsoftball/graph/badge.svg?token=CODECOV_TOKEN)](https://codecov.io/gh/xeonchen/twsoftball)

A slow-pitch softball game recording Progressive Web App (PWA) built with
Hexagonal Architecture and Event Sourcing.

**Project Status**: Core domain layer complete with 99%+ test coverage.
Application layer in development.

## 🚀 Features

- **Game Recording**: Record at-bat results, lineup management, score tracking
- **Offline-First**: Works without internet connection, sync when available
- **Undo/Redo**: Full operation history with undo/redo support
- **Cross-Platform**: PWA that works on web, iOS, and Android
- **Configurable Rules**: Support for different softball rule variants
- **Event Sourcing**: Complete audit trail and time-travel debugging

## 🏗️ Architecture

Built using **Hexagonal Architecture (Clean Architecture)** with strict SOLID
principles and Event Sourcing:

```
Domain Layer (Core Business Logic) ✅ COMPLETED
├── constants/    # AtBatResultType, GameStatus, FieldPosition
├── value-objects/# GameId, PlayerId, JerseyNumber, Score, GameScore, BasesState
├── events/       # DomainEvent, AtBatCompleted, RunScored, RunnerAdvanced
├── aggregates/   # Game, TeamLineup, InningState (3 aggregate roots)
├── strategies/   # TeamStrategy pattern (DetailedTeamStrategy, SimpleTeamStrategy)
├── services/     # GameCoordinator, RBICalculator, validators
└── rules/        # SoftballRules, RuleVariants (configurable rules)

Application Layer (Use Cases) 🚀 IN DEVELOPMENT
├── use-cases/    # RecordAtBat, StartGame, etc.
├── ports/        # Interface definitions
├── services/     # Application services
└── dtos/         # Data Transfer Objects

Infrastructure Layer (Adapters) 🚀 IN DEVELOPMENT
├── persistence/  # IndexedDB, InMemory EventStore implementations ✅ COMPLETED
├── auth/         # Authentication adapters ⏳ PENDING
└── config/       # Dependency injection ⏳ PENDING

Web Layer (Presentation) ⏳ PENDING
├── adapters/     # Controllers, presenters
├── components/   # UI components
└── hooks/        # React hooks
```

## 🛠️ Technology Stack

- **Language**: TypeScript (strict mode)
- **Frontend**: PWA with Vite + React
- **State Management**: Event Sourcing
- **Database**: IndexedDB (web), SQLite (mobile)
- **Package Manager**: pnpm (monorepo)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Build**: Vite
- **CI/CD**: GitHub Actions

## 📋 Development

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/twsoftball.git
cd twsoftball

# Install dependencies
pnpm install
```

### Commands

```bash
# Testing
pnpm test                    # Run all tests
pnpm test:watch             # Watch mode tests
pnpm test:coverage          # Coverage report
pnpm --filter @twsoftball/domain test           # Domain tests only
pnpm --filter @twsoftball/domain test:coverage  # Domain coverage only

# Code Quality
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm typecheck        # TypeScript check
pnpm deps:check       # Architecture violations

# Package-specific
pnpm --filter @twsoftball/domain test           # Domain tests only
pnpm --filter @twsoftball/domain typecheck      # Domain typecheck
pnpm --filter @twsoftball/infrastructure test   # Infrastructure tests only
```

## 🧪 Testing Strategy

- **Unit Tests**: Domain entities, value objects, use cases (99%+ coverage
  achieved)
- **Integration Tests**: Database adapters, application services
- **E2E Tests**: Complete user workflows
- **Testing Approach**: Test-Driven Development (TDD) with comprehensive
  business rule validation

## 📁 Project Structure

```
twsoftball/
├── packages/
│   ├── domain/           # Core business logic
│   ├── application/      # Use cases and ports
│   ├── infrastructure/   # Adapters
│   └── shared/          # Common utilities
├── apps/
│   └── web/             # PWA application
├── docs/                # Documentation
├── tools/               # Build tools
└── tests/              # Test suites
```

## 🎯 Development Workflow

1. **TDD Cycle**: Write test → Make it pass → Refactor → Commit
2. **Domain First**: Start with domain entities and business rules
3. **Architecture Check**: Every commit validates layer dependencies
4. **Coverage Gates**: Quality gates ensure high test coverage

## 📖 Documentation

- [Architecture Guide](docs/design/architecture.md)
- [Development Guide](docs/guides/development.md)
- [API Documentation](docs/design/api-contracts.md)
- [Domain Model](docs/design/domain-model.md)
- [Testing Strategy](docs/guides/testing-strategy.md)
- [Architecture Decisions](docs/adr/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TDD approach
4. Ensure architecture compliance (`pnpm deps:check`)
5. Maintain high test coverage
6. Create a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the
[LICENSE](LICENSE) file for details.

---

Built with ❤️ using Hexagonal Architecture and Event Sourcing

## 🏆 Achievement Summary

- **Domain Layer**: 99%+ test coverage with comprehensive softball business
  rules
- **Architecture**: Strict layer separation with automated violation detection
- **Quality**: 4,600+ tests validating complex game scenarios and edge cases
