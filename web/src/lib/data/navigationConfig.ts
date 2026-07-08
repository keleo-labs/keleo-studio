export type NavItemConfig = {
  id: string;
  label: string;
  href: string;
  badge?: string;
  description: string;
  icon: string; // Font Awesome class (e.g., "fa-house")
};

export const navigationItems: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    badge: 'Home',
    icon: 'fa-house',
    description: 'Overview and workspace tiles',
  },
  {
    id: 'method-builder',
    label: 'Method Builder',
    href: '/method-builder',
    badge: 'Compose',
    icon: 'fa-layer-group',
    description: 'Browse the library, drag a baseline and extension practices into a method',
  },
  {
    id: 'practice-navigator',
    label: 'Practice Navigator',
    href: '/navigator',
    badge: 'Explore',
    icon: 'fa-compass',
    description: 'Interactive hierarchical navigation of practice elements and relationships',
  },
  {
    id: 'practice-author',
    label: 'Practice Author',
    href: '/practice-author',
    badge: 'Author',
    icon: 'fa-pen-to-square',
    description: 'Open practices, validate against schema, preview and export PDFs',
  },
  {
    id: 'manage-library',
    label: 'Manage Library',
    href: '/library',
    badge: 'Library',
    icon: 'fa-book',
    description: 'Browse, import, export, and organize the practice library',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    href: '/preferences',
    badge: 'Settings',
    icon: 'fa-gear',
    description: 'Choose theme and language',
  },
];
