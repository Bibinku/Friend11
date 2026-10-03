import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { isSupabaseConfigured } from './lib/supabase';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { RoomsProvider } from './context/RoomsContext';
import { RoomFiltersProvider } from './context/RoomFiltersContext';
import { UIProvider } from './context/UIContext';
import { SetupNeeded } from './components/SetupNeeded';
import App from './App';

import './styles/tokens.css';
import './styles/ui.css';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element (#root) not found — check index.html.');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      {isSupabaseConfigured ? (
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <RoomsProvider>
                <RoomFiltersProvider>
                  <UIProvider>
                    <App />
                  </UIProvider>
                </RoomFiltersProvider>
              </RoomsProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      ) : (
        <SetupNeeded />
      )}
    </ThemeProvider>
  </StrictMode>,
);