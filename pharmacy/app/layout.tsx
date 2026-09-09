import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'شبیه‌ساز جامع داروخانه استرالیا | AU Pharmacy Practice Simulator',
  description: 'سامانه جامع یادگیری داروسازی استرالیا، تریاژ سرپایی، نسخه‌پیچی Fred و جعبه لایتنر هوشمند',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AU Pharmacy',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
  applicationName: 'AU Pharmacy',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9FAFB' },
    { media: '(prefers-color-scheme: dark)', color: '#09090B' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" id="meta-apple-status-bar" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-title" content="AU Pharmacy" />
        <meta name="theme-color" content="#09090B" id="meta-theme-color" />
        <meta name="msapplication-navbutton-color" content="#09090B" id="meta-ms-theme-color" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
