import './globals.css';
import MainAppWrapper from './components/MainAppWrapper';

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
        <MainAppWrapper>
          {children}
        </MainAppWrapper>
      </body>
    </html>
  )
}
