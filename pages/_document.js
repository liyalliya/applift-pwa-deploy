// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon / icons (ensure these files exist in /public/icons/) */}
        <link rel="icon" href="/icons/applift-icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/applift-icon-192.png" />
        <link rel="shortcut icon" href="/icons/applift-icon-192.png" />

        {/* Theme color for browser chrome */}
        <meta name="theme-color" content="#000000" />

        {/* iOS web app meta to enable fullscreen behaviour for Add to Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AppLift" />

        {/* Viewport with viewport-fit=cover to allow drawing under notch and home indicator */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* Prevent zoom on double-tap */}
        <meta name="format-detection" content="telephone=no" />

        {/* Color scheme preference */}
        <meta name="color-scheme" content="dark" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
