import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stripe | Financial Infrastructure to Grow Your Revenue",
  description:
    "Stripe is a suite of APIs powering online payment processing and commerce solutions for internet businesses of all sizes. Accept payments and scale faster.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US">
      <body>
        <div id="__next">{children}</div>
      </body>
    </html>
  );
}
