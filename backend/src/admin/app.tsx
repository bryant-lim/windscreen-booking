import React from 'react';
import { 
  ChartPie,
} from '@strapi/icons';

import BookingDashboard from './components/BookingDashboard';

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
  // --- OPERATIONS SNAPSHOT INJECTION ---
  const cmPlugin = app.getPlugin('content-manager');
  if (cmPlugin && cmPlugin.injectComponent) {
    cmPlugin.injectComponent('listView', 'actions', {
      name: 'booking-dashboard',
      Component: BookingDashboard,
    });
  }

  // --- THE TOTAL LINK (FIXED DEPRECATION) ---
  app.addMenuLink({
    to: 'http://localhost:3001/admin/analytics',
    icon: ChartPie,
    intlLabel: {
      id: 'ws2u-analytics-link',
      defaultMessage: 'Analytics Hub',
    },
    Component: () => null, 
  });

  console.log("🚀 WS2U Analytics Link Protocol Finalized (Zero-Flash Absolute Navigation)");
};

export default {
  config,
  bootstrap,
};
