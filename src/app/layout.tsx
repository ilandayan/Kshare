import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaRegister } from '@/components/pwa-register';

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
  description:
    'Achetez des paniers alimentaires casher à prix réduit auprès de commerces partenaires. Réduisez le gaspillage alimentaire et faites des économies.',
  keywords: [
    'casher',
    'anti-gaspillage',
    'paniers casher',
    'invendus casher',
    'boucherie casher',
    'boulangerie casher',
    'too good to go casher',
    'kshare',
  ],
  metadataBase: new URL('https://k-share.fr'),
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Kshare',
    url: 'https://k-share.fr',
    title: 'Kshare - Les paniers casher anti-gaspi',
    description:
      'Achetez des paniers alimentaires casher à prix réduit auprès de commerces partenaires.',
    images: [{ url: '/icon-192.png', width: 192, height: 192, alt: 'Kshare' }],
  },
  twitter: {
    card: 'summary',
    title: 'Kshare - Les paniers casher anti-gaspi',
    description:
      'Paniers casher anti-gaspi à prix réduit. Boucheries, boulangeries, traiteurs partenaires.',
  },
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
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Kshare',
              url: 'https://k-share.fr',
              logo: 'https://k-share.fr/icon-192.png',
              description:
                'Marketplace de paniers casher anti-gaspi. Connecte commerces casher et consommateurs pour réduire le gaspillage alimentaire.',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'contact@k-share.fr',
                contactType: 'customer service',
                availableLanguage: 'French',
              },
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className={`${plusJakarta.variable} ${dmSans.variable} font-body antialiased`}>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem disableTransitionOnChange>
          {children}
          <PwaRegister />
          <Toaster richColors position='top-right' />
        </ThemeProvider>
      </body>
    </html>
  );
}