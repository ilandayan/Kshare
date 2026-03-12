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
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'Kshare' },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='fr' suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${dmSans.variable} font-body antialiased`}>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position='top-right' />
        </ThemeProvider>
      </body>
    </html>
  );
}