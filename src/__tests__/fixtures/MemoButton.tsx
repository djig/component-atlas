import React from 'react';

export interface MemoButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * A button component wrapped with React.memo
 */
export const MemoButton = React.memo<MemoButtonProps>(({ variant = 'primary', onClick, children }) => {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {children}
    </button>
  );
});

MemoButton.displayName = 'MemoButton';
