import type { Metadata } from "next";
import { MotionScript } from "@/components/motion/MotionScript";
import { PageTransitionScript } from "@/components/page-transition/PageTransitionScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stripe | Financial Infrastructure to Grow Your Revenue",
  description:
    "Stripe is a suite of APIs powering online payment processing and commerce solutions for internet businesses of all sizes. Accept payments and scale faster.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-US">
      <head>
        <PageTransitionScript />
        <MotionScript />
      </head>
      <body>
        <div id="__next">{children}</div>
      </body>
    </html>
  );
}
