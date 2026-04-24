import type { Metadata } from 'next'
import './globals.css'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Sidebar } from '@/components/layout/Sidebar'
import { ActivityFeed } from '@/components/layout/ActivityFeed'
import { GlobalStatusBar } from '@/components/ui/GlobalStatusBar'

export const metadata: Metadata = {
  title: 'Mission Control — Timber + Love',
  description: 'Live operating system for the Timber + Love portfolio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Apply Geist font CSS variables — Ada design spec: Geist Sans + Geist Mono
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            <GlobalStatusBar />
            <main style={{ flex: 1, overflowY: 'auto' }}>
              {children}
            </main>
          </div>
          <ActivityFeed />
        </div>
      </body>
    </html>
  )
}
