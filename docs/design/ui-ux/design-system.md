# Design System

> **Note**: This document defines the complete design system for TW Softball
> PWA, including colors, typography, spacing, components, and interaction
> patterns.

## Foundation

### Design Principles

1. **Thumb-First Mobile** - All critical actions within thumb reach
2. **High Contrast Visibility** - Readable in bright sunlight
3. **48px Touch Targets** - WCAG 2.1 AA accessibility compliance
4. **Instant Feedback** - Immediate response to user actions
5. **Fault Tolerance** - Easy error recovery with undo capabilities

### Target Devices & Contexts

- **Primary**: iPhone SE (375x667px) to iPhone 15 Pro Max
- **Secondary**: Android phones (360x640px and up)
- **Context**: Outdoor baseball fields, bright sunlight, one-handed use
- **Environment**: Noisy, distracting, time-pressured

---

## Color System

### Baseball-Inspired Palette

#### Primary Colors (Field Theme)

```scss
$field-green-50: #e8f5e9; // Lightest tint
$field-green-100: #c8e6c9; // Light backgrounds
$field-green-200: #a5d6a7; // Disabled states
$field-green-300: #81c784; // Hover states
$field-green-400: #66bb6a; // Active states
$field-green-500: #4caf50; // Standard green
$field-green-600: #43a047; // Interactive elements
$field-green-700: #388e3c; // Primary buttons
$field-green-800: #2e7d32; // Primary brand (main)
$field-green-900: #1b5e20; // Darkest shade
```

#### Secondary Colors (Dirt & Base Theme)

```scss
$dirt-brown-100: #efebe9; // Light backgrounds
$dirt-brown-300: #bcaaa4; // Borders
$dirt-brown-500: #8d6e63; // Base color
$dirt-brown-700: #5d4037; // Dark accents

$base-white: #ffffff; // Base markers, text on dark
$warning-yellow: #ffb300; // Alerts, highlights
```

#### Semantic Colors

```scss
// Status & Feedback
$success: #388e3c; // Successful actions
$warning: #ffb300; // Caution, attention needed
$error: #d32f2f; // Errors, destructive actions
$info: #1976d2; // Informational messages

// Game-Specific
$score-home: #2e7d32; // Home team (our team)
$score-away: #6a6a6a; // Away team
$base-runner: #ffb300; // Runner on base
$base-empty: #e0e0e0; // Empty base
```

#### Neutral Colors

```scss
$neutral-50: #fafafa; // Page backgrounds
$neutral-100: #f5f5f5; // Card backgrounds
$neutral-200: #eeeeee; // Dividers
$neutral-300: #e0e0e0; // Borders
$neutral-400: #bdbdbd; // Placeholder text
$neutral-500: #9e9e9e; // Disabled text
$neutral-600: #757575; // Secondary text
$neutral-700: #616161; // Primary text
$neutral-800: #424242; // Headings
$neutral-900: #212121; // Emphasis text
```

### High Contrast Mode

For bright sunlight readability:

```scss
// High contrast overrides
.high-contrast {
  --background: #ffffff;
  --surface: #f8f8f8;
  --text-primary: #000000;
  --text-secondary: #333333;
  --border: #666666;
  --primary: #1a5c1a; // Darker green
  --accent: #cc8800; // Darker yellow
}
```

---

## Typography

### Font Stack

```scss
$font-family-base:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
  Arial, sans-serif;

// No custom fonts to ensure fast loading and universal compatibility
```

### Type Scale (Mobile-Optimized)

#### Text Sizes

```scss
$text-xs: 0.75rem; // 12px - Fine print, captions
$text-sm: 0.875rem; // 14px - Secondary text, labels
$text-base: 1rem; // 16px - Body text (iOS base)
$text-lg: 1.125rem; // 18px - Emphasized body text
$text-xl: 1.25rem; // 20px - Card titles
$text-2xl: 1.5rem; // 24px - Section headings
$text-3xl: 1.875rem; // 30px - Page headings
$text-4xl: 2.25rem; // 36px - Score displays
$text-5xl: 3rem; // 48px - Large score displays
```

#### Line Heights

```scss
$leading-none: 1; // Tight headings
$leading-tight: 1.25; // Score displays
$leading-snug: 1.375; // Card titles
$leading-normal: 1.5; // Body text
$leading-relaxed: 1.625; // Comfortable reading
```

#### Font Weights

```scss
$font-light: 300; // Rare use
$font-normal: 400; // Body text
$font-medium: 500; // Emphasized text
$font-semibold: 600; // Card titles
$font-bold: 700; // Headings, buttons
$font-extrabold: 800; // Score displays
```

### Typography Usage

#### Score Display

```scss
.score-display {
  font-size: $text-4xl; // 36px
  font-weight: $font-extrabold;
  line-height: $leading-tight;
  color: $neutral-900;
  font-variant-numeric: tabular-nums;
}
```

#### Button Text

```scss
.button-text {
  font-size: $text-base; // 16px (minimum for iOS)
  font-weight: $font-semibold;
  line-height: $leading-none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

#### Body Text

```scss
.body-text {
  font-size: $text-base; // 16px
  font-weight: $font-normal;
  line-height: $leading-normal;
  color: $neutral-700;
}
```

---

## Spacing System

### 8px Grid System

All spacing based on 8px increments for consistency:

```scss
$space-0: 0; // 0px
$space-1: 0.25rem; // 4px - Fine adjustments
$space-2: 0.5rem; // 8px - Base unit
$space-3: 0.75rem; // 12px - Small gaps
$space-4: 1rem; // 16px - Standard padding
$space-5: 1.25rem; // 20px - Medium gaps
$space-6: 1.5rem; // 24px - Large padding
$space-8: 2rem; // 32px - Section spacing
$space-10: 2.5rem; // 40px - Large sections
$space-12: 3rem; // 48px - Page spacing
$space-16: 4rem; // 64px - Major sections
```

### Component Spacing

#### Touch Targets

```scss
$touch-target-min: 48px; // WCAG 2.1 AA minimum
$touch-target-comfortable: 56px; // Preferred size
$touch-target-large: 64px; // Important actions
```

#### Layout Spacing

```scss
$page-padding: $space-4; // 16px page edges
$card-padding: $space-4; // 16px inside cards
$section-gap: $space-8; // 32px between sections
$item-gap: $space-3; // 12px between list items
```

---

## Component Library

### Buttons

#### Primary Button

```scss
.btn-primary {
  // Sizing
  min-height: $touch-target-min;
  padding: $space-3 $space-6;

  // Typography
  font-size: $text-base;
  font-weight: $font-semibold;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  // Visual
  background: $field-green-800;
  color: $base-white;
  border: 2px solid $field-green-800;
  border-radius: 8px;

  // Interaction
  transition: all 150ms ease;
  cursor: pointer;

  &:hover {
    background: $field-green-700;
    border-color: $field-green-700;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(46, 125, 50, 0.3);
  }

  &:disabled {
    background: $neutral-300;
    border-color: $neutral-300;
    color: $neutral-500;
    transform: none;
    box-shadow: none;
    cursor: not-allowed;
  }
}
```

#### Secondary Button

```scss
.btn-secondary {
  @extend .btn-primary;

  background: transparent;
  color: $field-green-800;
  border-color: $field-green-800;

  &:hover {
    background: $field-green-50;
    color: $field-green-900;
  }
}
```

#### Danger Button

```scss
.btn-danger {
  @extend .btn-primary;

  background: $error;
  border-color: $error;

  &:hover {
    background: darken($error, 10%);
    border-color: darken($error, 10%);
  }
}
```

#### Large Action Button (Game Recording)

```scss
.btn-action-large {
  @extend .btn-primary;

  min-height: $touch-target-large; // 64px
  padding: $space-4 $space-8;
  font-size: $text-lg;
  font-weight: $font-bold;
  border-radius: 12px;
}
```

### Cards

#### Base Card

```scss
.card {
  background: $base-white;
  border: 1px solid $neutral-200;
  border-radius: 12px;
  padding: $space-4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 150ms ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
```

#### Player Card

```scss
.player-card {
  @extend .card;

  display: flex;
  align-items: center;
  gap: $space-3;
  min-height: $touch-target-comfortable;
  cursor: pointer;

  .player-number {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    background: $field-green-800;
    color: $base-white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: $font-bold;
    font-size: $text-sm;
  }

  .player-info {
    flex: 1;
    min-width: 0; // Allow text truncation

    .player-name {
      font-weight: $font-semibold;
      color: $neutral-900;
      margin-bottom: $space-1;
    }

    .player-details {
      font-size: $text-sm;
      color: $neutral-600;
    }
  }

  .player-stats {
    flex-shrink: 0;
    text-align: right;
    font-size: $text-sm;
    color: $neutral-700;
  }
}
```

### Bases Diamond Component

```scss
.bases-diamond {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-4;

  .base-row {
    display: flex;
    align-items: center;
    gap: $space-4;
  }

  .base {
    width: 32px;
    height: 32px;
    background: $base-empty;
    border: 2px solid $neutral-400;
    border-radius: 4px;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;

    &.occupied {
      background: $base-runner;
      border-color: darken($base-runner, 20%);

      &::after {
        content: '●';
        color: $base-white;
        font-size: 16px;
        transform: rotate(-45deg);
      }
    }

    .base-label {
      position: absolute;
      top: -24px;
      left: 50%;
      transform: translateX(-50%) rotate(-45deg);
      font-size: $text-xs;
      font-weight: $font-medium;
      color: $neutral-600;
      background: $base-white;
      padding: 0 $space-1;
    }
  }

  // Specific base positioning
  .second-base {
  } // Top
  .third-base {
  } // Left
  .first-base {
  } // Right
  .home-plate {
    // Bottom
    border-radius: 50% 50% 50% 0;
    background: $base-white;
    border-color: $neutral-600;
  }
}
```

### Modals & Overlays

```scss
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $space-4;

  // Backdrop blur for modern browsers
  backdrop-filter: blur(4px);
}

.modal {
  background: $base-white;
  border-radius: 16px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);

  .modal-header {
    padding: $space-6 $space-4 $space-4;
    border-bottom: 1px solid $neutral-200;

    h3 {
      font-size: $text-xl;
      font-weight: $font-semibold;
      color: $neutral-900;
      margin: 0;
    }
  }

  .modal-body {
    padding: $space-4;
  }

  .modal-actions {
    padding: $space-4;
    border-top: 1px solid $neutral-200;
    display: flex;
    gap: $space-3;
    justify-content: flex-end;

    .btn {
      min-width: 100px;
    }
  }
}
```

### Form Elements

```scss
.form-group {
  margin-bottom: $space-4;

  .form-label {
    display: block;
    font-size: $text-sm;
    font-weight: $font-medium;
    color: $neutral-700;
    margin-bottom: $space-2;
  }

  .form-input {
    width: 100%;
    min-height: $touch-target-min;
    padding: $space-3 $space-4;
    font-size: $text-base;
    color: $neutral-900;
    background: $base-white;
    border: 2px solid $neutral-300;
    border-radius: 8px;
    transition: border-color 150ms ease;

    &:focus {
      outline: none;
      border-color: $field-green-600;
      box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
    }

    &:invalid {
      border-color: $error;
    }

    &:disabled {
      background: $neutral-100;
      color: $neutral-500;
      cursor: not-allowed;
    }
  }

  .form-select {
    @extend .form-input;

    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 12px center;
    background-repeat: no-repeat;
    background-size: 16px;
    padding-right: 48px;
  }
}
```

---

## Animation & Transitions

### Micro-Interactions

```scss
// Button feedback
.btn {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:active {
    transform: scale(0.98);
  }
}

// Modal entrance
.modal-enter {
  opacity: 0;
  transform: scale(0.95);
  animation: modal-enter 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes modal-enter {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// Base runner animation
.base.runner-arrives {
  animation: runner-safe 400ms ease-out;
}

@keyframes runner-safe {
  0% {
    transform: rotate(45deg) scale(1);
  }
  50% {
    transform: rotate(45deg) scale(1.1);
  }
  100% {
    transform: rotate(45deg) scale(1);
  }
}

// Score update animation
.score-update {
  animation: score-pulse 600ms ease-out;
}

@keyframes score-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
    color: $success;
  }
  100% {
    transform: scale(1);
  }
}
```

### Loading States

```scss
.skeleton {
  background: linear-gradient(
    90deg,
    $neutral-200 25%,
    $neutral-100 50%,
    $neutral-200 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

// Spinner for critical loading
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid $neutral-300;
  border-top: 3px solid $field-green-600;
  border-radius: 50%;
  animation: spinner-rotate 1s linear infinite;
}

@keyframes spinner-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
```

---

## Responsive Breakpoints

```scss
$breakpoint-sm: 480px; // Large phones
$breakpoint-md: 768px; // Tablets
$breakpoint-lg: 1024px; // Small laptops
$breakpoint-xl: 1280px; // Desktop

// Mobile-first media queries
@mixin respond-above($breakpoint) {
  @media (min-width: $breakpoint) {
    @content;
  }
}

// Usage example
.game-recording {
  // Mobile (default)
  grid-template-columns: 1fr;

  @include respond-above($breakpoint-md) {
    // Tablet
    grid-template-columns: 1fr 1fr;
  }

  @include respond-above($breakpoint-lg) {
    // Desktop
    grid-template-columns: 1fr 2fr 1fr;
  }
}
```

---

## Accessibility & Usability

### Touch Targets

- **Minimum**: 48px × 48px (WCAG 2.1 AA)
- **Comfortable**: 56px × 56px
- **Large Actions**: 64px × 64px

### Color Contrast

- **Text on White**: 4.5:1 minimum ratio
- **Large Text**: 3:1 minimum ratio
- **Interactive Elements**: 3:1 minimum ratio

### Focus States

```scss
.focusable:focus {
  outline: 2px solid $field-green-600;
  outline-offset: 2px;
}

// For dark backgrounds
.focusable-dark:focus {
  outline: 2px solid $base-white;
  outline-offset: 2px;
}
```

### High Contrast Support

```scss
@media (prefers-contrast: high) {
  :root {
    --primary: #1a5c1a;
    --text: #000000;
    --background: #ffffff;
    --border: #666666;
  }
}
```

---

## Implementation Notes

### CSS Custom Properties Usage

```scss
:root {
  // Colors
  --color-primary: #{$field-green-800};
  --color-success: #{$success};
  --color-warning: #{$warning};
  --color-error: #{$error};

  // Spacing
  --space-base: #{$space-4};
  --touch-target: #{$touch-target-min};

  // Typography
  --font-base: #{$text-base};
  --font-bold: #{$font-bold};
}

// Dark mode support (future enhancement)
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #{$field-green-400};
    --text-primary: #ffffff;
    --background: #121212;
  }
}
```

### Performance Considerations

- No custom fonts to avoid loading delays
- CSS animations use `transform` and `opacity` only
- Hardware acceleration with `will-change` on animated elements
- Minimal box-shadow usage (expensive on mobile)

This design system ensures consistency, accessibility, and optimal performance
for the TW Softball PWA across all target devices and usage contexts.
