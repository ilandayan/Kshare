import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Kshare — La nourriture casher anti-gaspillage',
    template: '%s | Kshare',
  },
  description: 'Achetez des paniers alimentaires casher à prix réduit aupres de commerces partenaires.',
  keywords: ['casher', 'anti-gaspillage', 'paniers'],
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'Kshare' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='fr' suppressHydrationWarning>
      <body className={inter.variable + ' font-sans antialiased'}>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position='top-right' />
        </ThemeProvider>
      </body>
    </html>
  );
}