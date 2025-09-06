/**
 * @file Documentation Constants
 * Reusable documentation patterns and text constants for reducing duplication in JSDoc comments.
 *
 * @remarks
 * This module provides standardized documentation sections that are commonly used across
 * use cases in the application layer. It helps maintain consistency while reducing
 * documentation duplication by extracting common architectural patterns, design principles,
 * and formatting conventions.
 */

/**
 * Standard design patterns used across all use cases in the application layer.
 */
export const DESIGN_PATTERNS = `**Design Patterns**:
- **Hexagonal Architecture**: Uses ports for infrastructure dependencies
- **Domain-Driven Design**: Rich domain model coordination with proper aggregates
- **Command-Query Separation**: Command input, comprehensive result output
- **Event Sourcing**: All state changes recorded as immutable domain events
- **Dependency Injection**: Testable with mocked dependencies`;

/**
 * Standard error handling strategy used across all use cases.
 */
export const ERROR_HANDLING_STRATEGY = `**Error Handling Strategy**:
- Input validation with detailed field-level error messages
- Domain rule violations caught and translated to user-friendly messages
- Infrastructure failures (database, event store) handled gracefully
- All errors logged with full context for debugging and monitoring
- Failed operations leave system in consistent state (no partial updates)`;

/**
 * Standard business process flow template for use cases.
 * @param steps Array of process steps specific to the use case
 */
export function createBusinessProcessFlow(steps: string[]): string {
  const numberedSteps = steps.map((step, index) => `${index + 1}. ${step}`).join('\n * ');
  return `**Business Process Flow**:
 * ${numberedSteps}`;
}

/**
 * Standard key responsibilities template for use cases.
 * @param responsibilities Array of key responsibilities specific to the use case
 */
export function createKeyResponsibilities(responsibilities: string[]): string {
  const bulletPoints = responsibilities.map(resp => `- ${resp}`).join('\n * ');
  return `**Key Responsibilities**:
 * ${bulletPoints}`;
}

/**
 * Creates a standard JSDoc example section with proper TypeScript formatting.
 * @param exampleCode The TypeScript code example
 * @param description Optional description of what the example demonstrates
 */
export function createJSDocExample(exampleCode: string, description?: string): string {
  const descComment = description ? ` * ${description}\n *\n` : '';
  return ` * @example\n * \`\`\`typescript\n${descComment} * ${exampleCode.split('\n').join('\n * ')}\n * \`\`\``;
}

/**
 * Standard service setup pattern used in most use case examples.
 * @param useCaseName Name of the use case class
 * @param dependencies Array of dependency names
 */
export function createServiceSetupExample(useCaseName: string, dependencies: string[]): string {
  const depList = dependencies.join(',\n *   ');
  return `// Service setup with dependency injection
 * const ${useCaseName.toLowerCase()} = new ${useCaseName}(
 *   ${depList}
 * );`;
}

/**
 * Standard success/error handling pattern for use case examples.
 * @param successMessage Success console.log message
 * @param customSuccessChecks Optional additional success checks
 */
export function createResultHandlingExample(
  successMessage: string,
  customSuccessChecks?: string[]
): string {
  const additionalChecks = customSuccessChecks
    ? customSuccessChecks.map(check => ` *   ${check}`).join('\n')
    : '';

  return ` * if (result.success) {
 *   console.log('${successMessage}');${additionalChecks}
 * } else {
 *   console.error('Operation failed:', result.errors);
 * }`;
}

/**
 * Common architectural description for use cases that coordinate multiple aggregates.
 */
export const CROSS_AGGREGATE_COORDINATION = `This use case orchestrates complex coordination between multiple domain aggregates, ensuring consistent state updates and proper event generation across aggregate boundaries.`;

/**
 * Common description for audit logging capabilities.
 */
export const AUDIT_LOGGING = `Comprehensive logging for monitoring, debugging, and compliance audit trails.`;

/**
 * Common description for event sourcing capabilities.
 */
export const EVENT_SOURCING_DESCRIPTION = `Generates and persists comprehensive domain events for complete audit trail and state reconstruction.`;

/**
 * Standard template for use case file headers.
 * @param useCaseName Name of the use case
 * @param shortDescription Brief description of what the use case does
 */
export function createUseCaseFileHeader(useCaseName: string, shortDescription: string): string {
  return `/**
 * @file ${useCaseName}
 * ${shortDescription}
 */`;
}
