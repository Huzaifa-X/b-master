// Plain layout — auth guard is in (protected)/layout.tsx
// Login lives here (outside the route group) so it is never caught in a redirect loop
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
