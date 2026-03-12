'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserPlus, LogIn, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AuthChoicePage() {
  const [googleLoading, setGoogleLoading] = useState(false)
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Image
            src="/icon-192x192.png"
            alt="Wheel of Founders logo"
            width={64}
            height={64}
            className="rounded-2xl shadow-sm"
            priority
          />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Wheel of Founders</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Choose how you&apos;d like to continue
          </p>
        </div>

        <div className="space-y-4">
          {/* Sign Up Card */}
          <Link
            href="/auth/signup"
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#ef725c] hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#ef725c]/10 rounded-full flex items-center justify-center group-hover:bg-[#ef725c] transition-colors">
                <UserPlus className="w-6 h-6 text-[#ef725c] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">New to Wheel of Founders?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create an account to start your founder journey
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#ef725c] transition-colors" />
            </div>
          </Link>

          {/* Log In Card */}
          <Link
            href="/auth/login"
            className="block p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-[#ef725c] hover:shadow-lg transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#ef725c]/10 rounded-full flex items-center justify-center group-hover:bg-[#ef725c] transition-colors">
                <LogIn className="w-6 h-6 text-[#ef725c] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Already have an account?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Log in to continue your journey
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#ef725c] transition-colors" />
            </div>
          </Link>
        </div>

        {/* Optional Google Sign In */}
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setGoogleLoading(true)
              try {
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                  },
                })
              } finally {
                setGoogleLoading(false)
              }
            }}
            disabled={googleLoading}
            className="w-full mt-4 py-3 px-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
