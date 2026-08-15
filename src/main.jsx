import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import { CatalogProvider } from './catalog/CatalogContext';
import { CartProvider } from './cart/CartContext';
import { ConfiguratorProvider } from './configurator/ConfiguratorContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <ConfiguratorProvider>
          <CartProvider><App /></CartProvider>
        </ConfiguratorProvider>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>,
);
