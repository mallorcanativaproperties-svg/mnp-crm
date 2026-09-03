import "./globals.css";

export const metadata = {
  title: "CRM - Mallorca Nativa Properties",
  description: "Gestion inmobiliaria + Marketing + IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
        <meta name="facebook-domain-verification" content="puxosx91k2s7uij3prtl8k64mibqe1" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
// Sun Jun  7 14:30:39 UTC 2026
