import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva('card', {
  variants: {
    variant: {
      default: 'card-default',
      outlined: 'card-outlined',
      elevated: 'card-elevated',
    },
    padding: {
      none: 'p-0',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

interface CardProps extends VariantProps<typeof cardVariants> {
  title?: string;
  children: React.ReactNode;
}

/**
 * Card container component with configurable variants.
 * @deprecated Use the new Card2 component instead
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant, padding, title, children }, ref) => {
    const classNames = cardVariants({ variant, padding });
    return (
      <div ref={ref} className={classNames}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
