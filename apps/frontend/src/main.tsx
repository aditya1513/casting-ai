import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import CastingDirectorApp from './CastingDirectorDashboard.tsx';
import AIChatApp from './AIChatApp.tsx';
import { MessageCircle, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import '../app/globals.css';

function MainApp() {
  const [activeView, setActiveView] = useState<'dashboard' | 'chat' | 'auth'>('dashboard');

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: CastingDirectorApp },
    { id: 'chat', label: 'AI Assistant', icon: MessageCircle, component: AIChatApp },
  ];

  if (activeView === 'chat') {
    return <AIChatApp />;
  }

  const ActiveComponent = navigation.find(nav => nav.id === activeView)?.component || CastingDirectorApp;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="text-2xl font-bold text-blue-400">🎬 CastMatch</div>
              <div className="flex space-x-4">
                {navigation.map((nav) => {
                  const Icon = nav.icon;
                  return (
                    <button
                      key={nav.id}
                      onClick={() => setActiveView(nav.id as 'dashboard' | 'chat')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeView === nav.id
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{nav.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-slate-400 hover:text-white">
                <MessageCircle className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
              </button>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">RK</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <ActiveComponent />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>,
);