import {
  AppWindow, Atom, BrainCircuit, BriefcaseBusiness, Code2, Database, Globe2,
  Megaphone, Monitor, Palette, Search, Settings, ShoppingCart, Smartphone, Wrench,
} from 'lucide-react';

const iconMap = {
  app: AppWindow,
  atom: Atom,
  brain: BrainCircuit,
  briefcase: BriefcaseBusiness,
  code: Code2,
  database: Database,
  globe: Globe2,
  megaphone: Megaphone,
  monitor: Monitor,
  palette: Palette,
  search: Search,
  settings: Settings,
  'shopping-cart': ShoppingCart,
  smartphone: Smartphone,
  wrench: Wrench,
};

export const iconOptions = Object.keys(iconMap);

export function getCatalogIcon(icon) {
  if (typeof icon === 'function' || (typeof icon === 'object' && icon)) return icon;
  return iconMap[icon] || Code2;
}

