import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Kshare - Les paniers casher anti-gaspi',
    template: '%s | Kshare',
  },
  description: 'Achetez des paniers alimentaires casher à prix réduit aupres de commerces partenaires.',
  keywords: ['casher', 'anti-gaspillage', 'paniers'],
  metadataBase: new URL('https://k-share.fr'),
  manifest: '/manifest.json',
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'Kshare' },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-icon-180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kshare',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='fr' suppressHydrationWarning>
      <head>
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-status-bar-style' content='default' />
        <meta name='apple-mobile-web-app-title' content='Kshare' />
        <meta name='theme-color' content='#3744C8' />
      </head>
      <body className={`${plusJakarta.variable} ${dmSans.variable} font-body antialiased`}>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position='top-right' />
        </ThemeProvider>
      </body>
    </html>
  );
}