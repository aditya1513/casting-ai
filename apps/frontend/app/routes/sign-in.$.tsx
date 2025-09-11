/**
 * Sign In Route - Clerk Authentication
 */

import { SignIn } from '@clerk/remix';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back to CastMatch</h1>
          <p className="text-slate-400">Sign in to access your casting dashboard</p>
        </div>
        
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <SignIn 
            appearance={{
              baseTheme: 'dark',
              variables: {
                colorPrimary: '#8b5cf6',
                colorBackground: '#1e293b',
                colorInputBackground: '#334155',
                colorText: '#f8fafc'
              }
            }}
          />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Mumbai's premier platform for casting directors and talent
          </p>
        </div>
      </div>
    </div>
  );
}