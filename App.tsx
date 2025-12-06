import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Shirt, 
  Users, 
  Wand2, 
  Images, 
  Settings as SettingsIcon, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Components
import Collections from './components/Collections';
import Catalog from './components/Catalog';
import Customers from './components/Customers';
import AIStudio from './components/AIStudio';
import Gallery from './components/Gallery';
import Settings from './components/Settings';
import Auth from './components/Auth';

// Services & Constants
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type View = 'collections' | 'catalog' | 'customers' | 'studio' | 'gallery' | 'settings';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('collections');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const renderView = () => {
    switch (currentView) {
      case 'collections': return <Collections />;
      case 'catalog': return <Catalog />;
      case 'customers': return <Customers />;
      case 'studio': return <AIStudio />;
      case 'gallery': return <Gallery />;
      case 'settings': return <Settings session={session} />;
      default: return <Collections />;
    }
  };

  if (!session) {
    return <Auth />;
  }

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg ${
        currentView === view
          ? 'bg-brand-600 text-white shadow-md'
          : 'text-brand-800 hover:bg-brand-200'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-brand-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-brand-100 border-r border-brand-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-brand-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-serif text-brand-900 font-bold">FitLook</h1>
              <p className="text-xs text-brand-600 uppercase tracking-widest mt-1">Boutique AI</p>
            </div>
            <button className="lg:hidden text-brand-800" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
            <NavItem view="collections" icon={LayoutDashboard} label="Collections" />
            <NavItem view="catalog" icon={Shirt} label="Catalog" />
            <NavItem view="customers" icon={Users} label="Customers" />
            <NavItem view="studio" icon={Wand2} label="AI Studio" />
            <NavItem view="gallery" icon={Images} label="Gallery" />
            <div className="pt-6 mt-6 border-t border-brand-200">
               <NavItem view="settings" icon={SettingsIcon} label="Settings" />
            </div>
          </nav>

          <div className="p-4 border-t border-brand-200">
            <div className="mb-4 px-2">
              <p className="text-xs font-semibold text-brand-500 mb-1">Logged in as</p>
              <p className="text-sm text-brand-900 truncate">{session.user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white border-b border-brand-200 flex items-center justify-between px-6 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-brand-800 p-2 -ml-2 rounded-md hover:bg-brand-100"
          >
            <Menu size={24} />
          </button>
          <span className="font-serif font-bold text-brand-900">FitLook</span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
             {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}