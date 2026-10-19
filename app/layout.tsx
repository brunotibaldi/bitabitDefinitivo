import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Press_Start_2P } from 'next/font/google'
import './globals.css'

const pressStart = Press_Start_2P({ subsets: ['latin'], weight: '400', variable: '--font-press-start' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'Bit a Bit — Estudiá Computación jugando',
  description:
    'Micro-desafíos de exámenes reales de la Lic. en Ciencias de la Computación (FCEIA, UNR). Sumá puntos, mantené tu racha y competí con tus amigos.',
  generator: 'v0.app',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#15123b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${pressStart.variable} ${jetbrains.variable} bg-background`}>
      <body className="min-h-dvh">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
