import './globals.css'

export const metadata = {
  title: 'E-Library Dashboard',
  description: 'Manage your documents securely',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
