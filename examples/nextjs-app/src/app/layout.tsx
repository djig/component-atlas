import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Component Atlas Demo',
  description: 'Demo app for component-atlas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
