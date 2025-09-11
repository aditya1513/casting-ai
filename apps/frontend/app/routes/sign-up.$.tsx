/**
 * Sign Up Route - Clerk Authentication
 */

import { SignUp } from '@clerk/remix';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join CastMatch</h1>
          <p className="text-slate-400">Create your account to start casting or find roles</p>
        </div>
        
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <SignUp 
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
            Join Mumbai's premier entertainment industry network
          </p>
        </div>
      </div>
    </div>
  );
}