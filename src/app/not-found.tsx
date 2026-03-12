import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for does not exist or has been moved. 
        If you were trying to sign in, please check your SSO configuration.
      </p>
      <Button asChild>
        <Link href="/auth/login">Return to Login</Link>
      </Button>
    </div>
  )
}
