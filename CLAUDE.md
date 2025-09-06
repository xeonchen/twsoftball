# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TW Softball** - A slow-pitch softball game recording Progressive Web App (PWA) with offline-first capabilities, built using Hexagonal Architecture and Event Sourcing patterns.

## Quick Reference (AI: Read This First)

### 🔴 CRITICAL - Always Follow These Rules
- **ALWAYS use TodoWrite** for task tracking and progress management
- **ALWAYS run commit-readiness-reviewer** before any git commit
- **ALWAYS complete Post-Commit Checklist** after EVERY commit
- **NEVER create workarounds** - raise issues after 3 failed attempts
- **NEVER compromise on code quality** - no shortcuts, quick fixes, or technical debt
- **NEVER import infrastructure into application layer**
- **ALWAYS use orchestrator-worker pattern** for complex tasks (Main Agent coordinates, General Agent implements)

### 🟡 IMPORTANT - Core Workflow
1. Plan with TodoWrite → Delegate via Task tool → Review with commit-readiness-reviewer → Handle git operations → Complete Post-Commit Checklist
2. Write tests before implementation (TDD)
3. Follow existing patterns and conventions
4. Achieve 99%+ test coverage for every layer
5. After creating new files, run lint immediately and address issues right away

### 🟢 HELPFUL - Key Commands
```bash
pnpm test                     # Run all tests
pnpm typecheck                # TypeScript check
pnpm lint                     # ESLint check
pnpm format:check             # Format files
pnpm --filter @twsoftball/domain test    # Domain tests only
```

## Architecture

**Hexagonal Architecture (Ports & Adapters) + Domain-Driven Design + SOLID Principles**

```
Domain Layer (Core Business Logic)
├── constants/    # AtBatResultType, GameStatus, FieldPosition
├── value-objects/# GameId, PlayerId, JerseyNumber, Score, etc.
├── events/       # DomainEvent, AtBatCompleted, RunScored
├── aggregates/   # Game, TeamLineup, InningState (3 aggregate roots)
├── strategies/   # TeamStrategy pattern implementations
├── services/     # GameCoordinator, RBICalculator, validators
└── rules/        # SoftballRules, RuleVariants (configurable rules)

Application Layer (Use Cases)
├── use-cases/    # RecordAtBat, StartGame, etc.
├── ports/        # Interface definitions
├── services/     # Application services
├── dtos/         # Data Transfer Objects
├── test-factories/ # Test utilities (mock-factories, test-builders, test-scenarios)
└── test-utils/   # Core testing utilities

Infrastructure Layer (Adapters)
├── persistence/  # IndexedDB, SQLite implementations
├── auth/         # Authentication adapters  
└── config/       # Dependency injection

Web Layer (Presentation)
├── adapters/     # Controllers, presenters
├── components/   # UI components
└── hooks/        # React hooks
```

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Frontend**: PWA with Vite + React
- **State Management**: Event Sourcing
- **Database**: IndexedDB (web), SQLite (mobile via Capacitor)
- **Package Manager**: pnpm (monorepo)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Build**: Vite
- **CI/CD**: GitHub Actions

## Development Workflow: Orchestrator-Worker Pattern

### Core 5-Step Workflow

1. **Plan & Track** 
   - Main Agent creates TodoWrite list for complex tasks
   - Break work into focused, discrete units

2. **Delegate Implementation**
   - Main Agent assigns ALL implementation tasks to General-Purpose Agent via Task tool
   - General-Purpose Agent implements using TDD (test → code → refactor)

3. **Review & Validate**
   - Main Agent triggers commit-readiness-reviewer for quality validation
   - Main Agent summarizes review feedback and displays to user
   - If issues found, delegate ALL fixes to General-Purpose Agent (max 3 attempts)

4. **Delegate Git Operations**
   - Main Agent delegates ALL git operations to General-Purpose Agent
   - General-Purpose Agent handles git add, commit, pre-commit hook fixes, and PR creation

5. **Delegate Documentation Updates**
   - Main Agent delegates Post-Commit Checklist to General-Purpose Agent
   - General-Purpose Agent updates relevant documentation

### Agent Roles
- **Main Agent (Orchestrator)**: Plans with TodoWrite, delegates ALL work, triggers reviews, summarizes feedback, monitors progress, escalates issues only
- **General-Purpose Agent (Worker)**: Implements ALL tasks with TDD, handles git operations, fixes issues, updates documentation, reports back with deliverables
- **Commit-Readiness-Reviewer (Validator)**: Validates architecture, checks quality gates, returns detailed feedback for main agent to summarize

## 📝 Post-Commit Checklist (DELEGATED TO GENERAL-PURPOSE AGENT)

**After every commit, delegate this task to the General-Purpose Agent:**

### Essential Documentation Updates:
1. Update architectural diagrams if package structure changed
2. Add new scripts or commands discovered/created to documentation
3. Update JSDoc examples if novel patterns emerged
4. Run quick verification that documented commands still work
5. Check that file paths mentioned in docs still exist
6. Verify architecture matches actual implementation

**Main Agent Role:** Only delegate this task and verify completion.

## Quality Assurance Philosophy

### No Compromise Principle
- **Technical Excellence First**: Quality is never negotiable, regardless of time pressure
- **Proper Solutions Only**: Address root causes, not symptoms
- **Long-term Thinking**: Avoid technical debt that creates future problems
- **Professional Standards**: Maintain enterprise-grade code quality

### When Facing Challenges
1. **First Response**: Find the proper architectural solution
2. **If Blocked**: Document the issue and seek guidance
3. **Never Do**: Create temporary fixes, skip tests, or lower standards
4. **Always Remember**: Clean code is faster to maintain and extend

### Quality Gates That Cannot Be Bypassed
- Test coverage below 80% (hard block)
- TypeScript compilation errors
- ESLint violations (unless properly justified)
- Architecture dependency violations
- Missing documentation for public APIs

## Code Standards

### Architecture Rules
- Domain layer has NO dependencies on other layers
- Application layer depends only on Domain
- Infrastructure implements Application ports
- Web layer depends on Application ports only

### Testing Strategy
- **Unit Tests**: Domain entities, value objects, use cases (Co-located .test.ts files)
- **Integration Tests**: Database adapters, application services
- **E2E Tests**: Complete user workflows
- **Coverage**: 80% hard limit, 90% soft limit, 98% excellent
- **TDD Required**: Write tests before implementation

### Code Quality
- **TypeScript**: Strict mode, no `any` types
- **ESLint**: Airbnb config with custom rules
- **Prettier**: Consistent formatting
- **Commits**: Conventional commits (feat:, fix:, test:, refactor:, docs:)
- **No Compromise Policy**: 
  - No quick fixes or temporary solutions
  - No skipping tests to "save time"
  - No relaxing TypeScript strictness
  - No disabling ESLint rules without proper justification

### Documentation Standards (JSDoc Requirements)
- **Class-level documentation**: Every class must have JSDoc explaining purpose and business context
- **Method documentation**: Complex methods need examples and @remarks for non-obvious logic
- **Domain terminology**: Explain softball-specific terms and business rules
- **Validation rules**: Document not just "what" but "why" - the business reason behind constraints

## Automated Review Process

### Review Timing
- After general agent completes implementation tasks
- Before any `git commit` attempt
- After completing TodoWrite milestones
- Before creating pull requests

### Review Workflow
1. **Main Agent**: Triggers commit-readiness-reviewer
2. **Reviewer**: Validates tests, coverage, architecture, documentation
3. **Main Agent**: Summarizes feedback for user transparency
4. **General-Purpose Agent**: Applies all fixes (if needed)
5. **General-Purpose Agent**: Handles git operations when clean

### Review Feedback Display Pattern
```
✅ **Review Summary:**
✅ Tests: All tests passing
✅ Coverage: X% (meets target)
✅ TypeScript: No type errors
⚠️  Issues: X formatting issues found
🔧 **Actions:** Delegating fixes to General-Purpose Agent...
```

## Error Handling & Escalation

### Escalation Protocol
When max attempts (3) exceeded:
1. **Document Issue**: Capture specific error details and attempted solutions
2. **Context Provision**: Show relevant error logs and affected files
3. **User Notification**: Request guidance (no workarounds policy)
4. **Clear Handoff**: Explain what was attempted and current state

### Quality-Related Escalations
When facing quality vs. speed pressure:
1. **Document the quality requirement** that seems challenging
2. **Explain why the proper solution is important** for long-term success
3. **Propose timeline adjustment** rather than quality compromise
4. **Seek architectural guidance** if the proper solution is unclear

## Key Patterns

### Event Sourcing
- All changes stored as events
- Current state derived by replaying events
- Perfect undo/redo support
- Complete audit trail

### Dependency Injection
- Ports defined in Application layer
- Implementations in Infrastructure layer
- Wired together in DI container

### Error Handling
- Domain errors extend DomainError
- Application errors handled at use case level
- Infrastructure errors wrapped appropriately

## Important Notes

- **Never** import infrastructure into application layer
- **Never** compromise on architectural principles for convenience
- **Never** skip testing phases or reduce coverage targets
- **Never** use workarounds instead of proper solutions
- **Always** write tests before implementation (TDD)
- **Always** maintain code quality standards regardless of complexity
- **Always** use orchestrator-worker pattern for complex tasks
- **Main agent coordinates, General-Purpose Agent implements everything**
- **Always trigger commit-readiness-reviewer and summarize results**
- **Delegate ALL git operations and fixes to General-Purpose Agent**

---

*For current project progress and detailed task tracking, see TODO.local.md*