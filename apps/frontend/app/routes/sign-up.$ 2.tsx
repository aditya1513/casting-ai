import { SignUp } from '@clerk/remix';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
              card: 'bg-slate-800 border border-slate-700',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-300',
              socialButtonsBlockButton:
                'bg-slate-700 hover:bg-slate-600 text-white border-slate-600',
              dividerLine: 'bg-slate-600',
              dividerText: 'text-slate-400',
              formFieldLabel: 'text-slate-200',
              formFieldInput: 'bg-slate-700 border-slate-600 text-white',
              footerActionLink: 'text-indigo-400 hover:text-indigo-300',
            },
            variables: {
              colorPrimary: '#4f46e5',
              colorBackground: '#1e293b',
              colorInputBackground: '#374151',
              colorInputText: '#ffffff',
            },
          }}
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
