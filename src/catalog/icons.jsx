import {
  AppWindow, Atom, Blocks, BrainCircuit, BriefcaseBusiness, Building2, Code2, Database, Globe2,
  Megaphone, Monitor, Palette, Search, Settings, ShoppingCart, Smartphone, Wrench,
} from 'lucide-react';

const iconMap = {
  app: AppWindow,
  atom: Atom,
  brain: BrainCircuit,
  briefcase: BriefcaseBusiness,
  building: Building2,
  blocks: Blocks,
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
