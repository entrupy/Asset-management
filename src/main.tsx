import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Bootstrap from './components/Bootstrap.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap>
      <App />
    </Bootstrap>
  </StrictMode>,
);
