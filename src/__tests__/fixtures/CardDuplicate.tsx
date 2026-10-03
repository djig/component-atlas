import React from 'react';

interface CardDuplicateProps {
  heading?: string;
  content: React.ReactNode;
  variant?: 'default' | 'outlined';
}

/**
 * A card-like component (near-duplicate for testing)
 */
export const CardDuplicate: React.FC<CardDuplicateProps> = ({
  heading,
  content,
  variant = 'default',
}) => {
  return (
    <div className={`card-duplicate ${variant}`}>
      {heading && <h4>{heading}</h4>}
      <div>{content}</div>
    </div>
  );
};
