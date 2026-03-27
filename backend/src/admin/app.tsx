import React from 'react';
import { 
  ChartPie,
} from '@strapi/icons';

const config = {
  menu: {
    logo: 'https://images.unsplash.com/photo-1599256621730-535171e28e50?auto=format&fit=crop&q=80&w=100',
  },
  translations: {
    en: {
      "app.components.LeftMenu.navbrand.title": "WS2U Admin",
      "app.components.LeftMenu.navbrand.workplace": "Operations Hub",
    },
  },
};

const bootstrap = (app: any) => {
  // --- THE TOTAL LINK (NO COMPONENT, NO FLASH) ---
  app.addMenuLink({
    to: 'http://localhost:3001/admin/analytics', // Using the full external URL directly
    icon: ChartPie,
    intlLabel: {
      id: 'ws2u-analytics-link',
      defaultMessage: 'Analytics Hub',
    },
    // By setting standard true and removing Component, 
    // Strapi treats this as a pure top-level navigation anchor
    Component: null, 
  });

  console.log("🚀 WS2U Analytics Link Protocol Finalized (Zero-Flash Absolute Navigation)");
};

export default {
  config,
  bootstrap,
};
