import './globals.css';
import { RealtimeProvider } from './components/providers/RealtimeProvider';

export const metadata = {
  title: 'AI Assitant',
  description: 'Portal to manage AI Assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <RealtimeProvider>
          {children}
        </RealtimeProvider>
      </body>
    </html>
  )
}
