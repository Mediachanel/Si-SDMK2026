import "./globals.css";

export const metadata = {
  title: "SI-SDMK",
  applicationName: "SI-SDMK",
  description: "Aplikasi internal pengelolaan data pegawai Dinas Kesehatan Provinsi DKI Jakarta",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/icon-192.png"
  }
};

export const viewport = {
  themeColor: "#2563eb"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", function () {
                  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
                    navigator.serviceWorker.getRegistrations().then(function (registrations) {
                      registrations.forEach(function (registration) {
                        registration.unregister();
                      });
                    });
                    if ("caches" in window) {
                      caches.keys().then(function (keys) {
                        keys.forEach(function (key) {
                          caches.delete(key);
                        });
                      });
                    }
                    return;
                  }
                  navigator.serviceWorker.register("/service-worker.js").catch(function (error) {
                    console.error("Service worker registration failed:", error);
                  });
                });
              }
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
