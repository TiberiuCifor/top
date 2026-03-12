'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowRight } from 'lucide-react'

function LoginErrorToast() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error === 'unauthorized') {
      toast.error('Access denied. Your account is not authorized to access this application.')
    }
  }, [error])

  return null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        toast.error('Invalid email or password')
        setLoading(false)
        return
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (userError || !userData) {
        await supabase.auth.signOut()
        toast.error('Access denied. Your account is not authorized to access this application.')
        setLoading(false)
        return
      }

      if (userData.must_change_password) {
        router.push('/auth/change-password')
      } else {
        router.push('/')
      }
    } catch (error) {
      toast.error('An error occurred during login')
      setLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile offline_access',
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          }
        },
      })

      if (error) throw error
    } catch (err: any) {
      toast.error(`Login error: ${err.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      <Suspense fallback={null}>
        <LoginErrorToast />
      </Suspense>
      {/* Left side: Branding & Hero */}
      <div className="hidden md:flex md:w-1/2 bg-slate-950 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[grid-white_0.02] [mask-image:radial-gradient(white,transparent_85%)] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-lg"
        >
          <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#ea2775] shadow-xl border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Operational Platform</h2>
                <p className="text-[#ea2775] font-medium">Tecknoworks</p>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
            Simplify everything. One platform. Accurate data. <span className="text-[#ea2775]">Instant decisions.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            A comprehensive suite for tracking projects, managing talent, and optimizing operational workflows across the organization.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
                <div className="h-6 w-6 rounded-full bg-[#ea2775]/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#ea2775]" />
                </div>
                <span>Secure Enterprise SSO Integration</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="h-6 w-6 rounded-full bg-[#ea2775]/20 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#ea2775]" />
              </div>
              <span>Real-time Resource Allocation</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo Only */}
          <div className="md:hidden flex flex-col items-center mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#ea2775] shadow-md mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Tecknoworks Operational Platform</h2>
          </div>

            <Card className="border-none shadow-2xl shadow-[#ea2775]/10">
              <CardContent className="pt-10 pb-8 px-8">
                <div className="mb-8 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-slate-900">Welcome Back</h3>
                  <p className="text-slate-500 mt-1">Please sign in to your account</p>
                </div>

                <div className="space-y-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-14 border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-900 font-bold text-lg transition-all group shadow-md" 
                    onClick={handleMicrosoftLogin}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <svg className="h-6 w-6" viewBox="0 0 23 23">
                        <path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>
                      </svg>
                      <span>Sign in with Microsoft</span>
                    </div>
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">Or sign in with credentials</span>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@tecknoworks.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                          className="h-11 px-4 border-slate-200 focus:ring-[#ea2775]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="h-11 px-4 border-slate-200 focus:ring-[#ea2775]"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-[#ea2775] hover:bg-[#d01e65] text-white font-semibold transition-all shadow-lg shadow-[#ea2775]/25" 
                      disabled={loading}
                    >
                      {loading ? 'Verifying...' : 'Sign In'}
                    </Button>
                  </form>
                </div>

                <p className="mt-8 text-center text-sm text-slate-500">
                Contact your IT administrator for access requests or password resets.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
