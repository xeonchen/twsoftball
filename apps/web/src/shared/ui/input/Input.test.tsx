import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { render, screen } from '../../../test/utils';

import { Input } from './Input';

describe('Input Component', () => {
  describe('Accessibility Requirements', () => {
    it('should render with minimum 48px height for touch targets', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('min-h-touch');
    });

    it('should have proper focus ring for keyboard navigation', () => {
      render(<Input placeholder="Focus test" />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(input).toHaveClass('focus:ring-2');
      expect(input).toHaveClass('focus:ring-field-green-500');
    });

    it('should associate label with input when provided', () => {
      render(<Input label="Player Name" />);
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Player Name');
      expect(label).toHaveAttribute('for', input.id);
      expect(input).toHaveAttribute('id');
    });

    it('should generate unique IDs for inputs', () => {
      render(
        <div>
          <Input label="Input 1" />
          <Input label="Input 2" />
        </div>
      );
      const inputs = screen.getAllByRole('textbox');
      expect(inputs[0].id).not.toBe(inputs[1].id);
    });
  });

  describe('Visual States', () => {
    it('should apply default styling', () => {
      render(<Input placeholder="Default input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-gray-300');
      expect(input).toHaveClass('rounded-lg');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-2');
    });

    it('should apply error styles when error prop provided', () => {
      render(<Input error="Required field" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
      expect(input).toHaveClass('focus:ring-red-500');
    });

    it('should display error message', () => {
      render(<Input error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
      expect(screen.getByText('Required field')).toHaveClass('text-red-600');
    });

    it('should apply disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('bg-gray-100');
      expect(input).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Input Types and Attributes', () => {
    it('should support different input types', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should support number input type', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should support password input type', () => {
      render(
        <div>
          <label htmlFor="password-test">Password</label>
          <Input id="password-test" type="password" />
        </div>
      );
      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should support placeholder text', () => {
      render(<Input placeholder="Enter your jersey number" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter your jersey number');
    });

    it('should forward HTML input attributes', () => {
      render(<Input maxLength={10} required data-testid="test-input" />);
      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('maxLength', '10');
      expect(input).toHaveAttribute('required');
    });
  });

  describe('Value and Change Handling', () => {
    it('should handle controlled value', () => {
      render(<Input value="Test Value" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      // TypeScript knows this is HTMLInputElement from the role
      expect((input as HTMLInputElement).value).toBe('Test Value');
    });

    it('should call onChange when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should support default value for uncontrolled inputs', () => {
      render(<Input defaultValue="Default text" />);
      const input = screen.getByRole('textbox');
      // TypeScript knows this is HTMLInputElement from the role
      expect((input as HTMLInputElement).value).toBe('Default text');
    });
  });

  describe('Label and Help Text', () => {
    it('should render label when provided', () => {
      render(<Input label="Player Name" />);
      expect(screen.getByText('Player Name')).toBeInTheDocument();
      expect(screen.getByText('Player Name').tagName).toBe('LABEL');
    });

    it('should render help text when provided', () => {
      render(<Input helpText="Enter first and last name" />);
      expect(screen.getByText('Enter first and last name')).toBeInTheDocument();
      expect(screen.getByText('Enter first and last name')).toHaveClass('text-gray-600');
    });

    it('should associate help text with input via aria-describedby', () => {
      render(<Input helpText="Help text" />);
      const input = screen.getByRole('textbox');
      const helpText = screen.getByText('Help text');
      expect(input).toHaveAttribute('aria-describedby', helpText.id);
    });

    it('should associate error message with input via aria-describedby', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      const errorText = screen.getByText('Error message');
      expect(input).toHaveAttribute('aria-describedby', errorText.id);
    });
  });

  describe('Baseball Theme Integration', () => {
    it('should use field green focus ring for valid inputs', () => {
      render(<Input placeholder="Valid input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:ring-field-green-500');
    });

    it('should maintain consistent spacing and typography', () => {
      render(<Input label="Jersey Number" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-base');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-2');
    });
  });

  describe('Responsive Design', () => {
    it('should maintain 48px minimum height on all screen sizes', () => {
      render(<Input placeholder="Responsive input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('min-h-touch');
    });

    it('should support custom className while preserving base styles', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('min-h-touch');
    });
  });
});
