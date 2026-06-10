export type NavItemConfig = {
  id: string;
  label: string;
  href: string;
  badge?: string;
  description: string;
};

export const navigationItems: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    badge: 'Home',
    description: 'Overview and workspace tiles',
  },
  {
    id: 'method-builder',
    label: 'Method Builder',
    href: '/method-builder',
    badge: 'Compose',
    description: 'Browse the library, drag a baseline and extension practices into a method',
  },
  {
    id: 'practice-author',
    label: 'Practice Author',
    href: '/practice-author',
    badge: 'Author',
    description: 'Open practices, validate against schema, preview and export PDFs',
  },
  {
    id: 'pattern-kanban',
    label: 'Pattern Kanban',
    href: '/flow-visualizer',
    badge: 'Visualize',
    description: 'Kanban board view of pattern progression',
  },
  {
    id: 'topology-viewer',
    label: 'Topology Diagram',
    href: '/topology-viewer',
    badge: 'Visualize',
    description: 'Interactive network view of practice elements and relationships',
  },
  {
    id: 'manage-library',
    label: 'Manage Library',
    href: '/library',
    badge: 'Library',
    description: 'Browse, import, export, and organize the practice library',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    href: '/preferences',
    badge: 'Settings',
    description: 'Choose theme and language',
  },
];
