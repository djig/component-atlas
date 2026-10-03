import React from 'react';
import { Button } from './Button';
import { Card } from './Card';

export function ExampleUsage() {
  return (
    <div>
      <Button variant="primary" size="lg" onClick={() => console.log('clicked')}>
        Click Me
      </Button>
      
      <Button variant="secondary" size="sm">
        Small Button
      </Button>
      
      <Card title="Example Card" variant="elevated" padding="lg">
        <p>This is some card content</p>
        <Button variant="ghost">Action</Button>
      </Card>
    </div>
  );
}
