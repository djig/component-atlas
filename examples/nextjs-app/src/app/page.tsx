import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
} from '@/components';

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Component Atlas Demo
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This is a demo Next.js app showcasing components that will be
              indexed by Component Atlas.
            </p>
            <div className="flex gap-2">
              <Button variant="default">Primary Action</Button>
              <Button variant="outline">Secondary Action</Button>
              <Button variant="ghost">Tertiary Action</Button>
            </div>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form Example</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Email" type="email" placeholder="you@example.com" />
            <Input label="Password" type="password" />
            <Button>Submit</Button>
          </CardContent>
        </Card>

        <Card variant="ghost">
          <CardContent>
            <p className="text-sm text-gray-500">
              Run <code className="bg-gray-200 px-2 py-1 rounded">component-atlas scan</code>{' '}
              in this directory to generate the component manifest.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
