import React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';

const buttonVariants = cva('button-base', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
    },
    size: {
      sm: 'btn-sm',
      lg: 'btn-lg',
    },
  },
});

export interface ForwardRefButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  label: string;
  icon?: string;
}

/**
 * A button component using forwardRef with extends and VariantProps
 */
export const ForwardRefButton = React.forwardRef<HTMLButtonElement, ForwardRefButtonProps>(
  ({ label, icon, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} {...props}>
        {icon && <span>{icon}</span>}
        {label}
      </button>
    );
  }
);

ForwardRefButton.displayName = 'ForwardRefButton';
