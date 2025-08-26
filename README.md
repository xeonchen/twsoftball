# TW Softball

A slow-pitch softball game recording Progressive Web App (PWA) built with Hexagonal Architecture and Event Sourcing.

## 🚀 Features

- **Game Recording**: Record at-bat results, lineup management, score tracking
- **Offline-First**: Works without internet connection, sync when available
- **Undo/Redo**: Full operation history with undo/redo support
- **Cross-Platform**: PWA that works on web, iOS, and Android
- **Configurable Rules**: Support for different softball rule variants
- **Event Sourcing**: Complete audit trail and time-travel debugging

## 🏗️ Architecture

Built using **Hexagonal Architecture (Clean Architecture)** with strict SOLID principles:

```
Domain Layer (Core Business Logic)
├── entities/     # Game, Player, Team, AtBat
├── value-objects/# Score, Position, AtBatResult
├── events/       # Domain events for event sourcing
└── rules/        # Configurable softball rules

Application Layer (Use Cases)
├── use-cases/    # RecordAtBat, StartGame, etc.
├── ports/        # Interface definitions
├── services/     # Application services
└── dtos/         # Data Transfer Objects

Infrastructure Layer (Adapters)
├── persistence/  # IndexedDB, SQLite implementations
├── auth/         # Authentication adapters
└── config/       # Dependency injection

Web Layer (Presentation)
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

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/twsoftball.git
cd twsoftball

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Commands

```bash
# Development
pnpm dev              # Start web app
pnpm test             # Run all tests
pnpm test:watch       # Watch mode tests
pnpm test:coverage    # Coverage report

# Code Quality
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm typecheck        # TypeScript check
pnpm deps:check       # Architecture violations

# Build & Deploy
pnpm build            # Production build
pnpm preview          # Preview build
```

## 🧪 Testing Strategy

- **Unit Tests**: Domain entities, value objects, use cases (95%+ coverage)
- **Integration Tests**: Database adapters, application services (90%+ coverage)
- **E2E Tests**: Complete user workflows
- **Coverage Gates**: 80% minimum, 90% warning, 98% excellent

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

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [API Documentation](docs/design/api-contracts.md)
- [Domain Model](docs/design/domain-model.md)
- [Architecture Decisions](docs/adr/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TDD approach
4. Ensure architecture compliance (`pnpm deps:check`)
5. Maintain test coverage (>90%)
6. Create a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🚧 Roadmap

- [x] Project setup and architecture
- [ ] Domain layer implementation
- [ ] Application layer with use cases
- [ ] Infrastructure and persistence
- [ ] Web UI components
- [ ] PWA features and offline support
- [ ] Mobile app via Capacitor
- [ ] Real-time collaboration features

---

Built with ❤️ using Hexagonal Architecture and Event Sourcing