import './globals.css'
import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Predator-Prey Ecosystem",
  description: "A simulation of a predator-prey ecosystem",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="bg-white">{children}</body>
    </html>
  )
}