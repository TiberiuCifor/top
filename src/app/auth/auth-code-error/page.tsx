'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-lg border-destructive/50">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>
            We encountered a problem while trying to sign you in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-md text-sm text-destructive border border-destructive/20">
            <p className="font-semibold mb-1">Common causes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>The authentication link has expired</li>
              <li>Browser cookie issues</li>
              <li>Azure SSO configuration mismatch</li>
            </ul>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/login">Return to Login</Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            If the problem persists, please contact your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
