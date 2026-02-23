/**
 * Comprehensive mock diagram generator for Information Architecture
 * Generates 50+ elements with proper arrow bindings
 */

export function generateComprehensiveIA(): any[] {
  const elements: any[] = [];
  
  // Title
  elements.push({
    type: 'text',
    x: 400,
    y: 30,
    text: 'Information Architecture',
    fontSize: 24,
    strokeColor: '#1e1e1e'
  });

  // Level 1: Main Navigation (5 items)
  const nav = [
    { id: 'nav-home', text: 'Home', x: 100, color: '#e3f2fd' },
    { id: 'nav-dashboard', text: 'Dashboard', x: 320, color: '#e3f2fd' },
    { id: 'nav-products', text: 'Products', x: 540, color: '#e3f2fd' },
    { id: 'nav-analytics', text: 'Analytics', x: 760, color: '#e3f2fd' },
    { id: 'nav-settings', text: 'Settings', x: 980, color: '#e3f2fd' }
  ];

  nav.forEach(item => {
    elements.push({
      type: 'rectangle',
      id: item.id,
      x: item.x,
      y: 100,
      width: 180,
      height: 70,
      backgroundColor: item.color,
      text: item.text
    });
  });

  // Level 2: Pages under each nav (20 items total, 4 per nav)
  const pages = [
    // Home pages
    { id: 'page-landing', text: 'Landing Page', parentId: 'nav-home', x: 50, color: '#e8f5e9' },
    { id: 'page-features', text: 'Features', parentId: 'nav-home', x: 150, color: '#e8f5e9' },
    
    // Dashboard pages
    { id: 'page-overview', text: 'Overview', parentId: 'nav-dashboard', x: 270, color: '#e8f5e9' },
    { id: 'page-tasks', text: 'My Tasks', parentId: 'nav-dashboard', x: 370, color: '#e8f5e9' },
    
    // Product pages
    { id: 'page-catalog', text: 'Product Catalog', parentId: 'nav-products', x: 490, color: '#e8f5e9' },
    { id: 'page-details', text: 'Product Details', parentId: 'nav-products', x: 590, color: '#e8f5e9' },
    
    // Analytics pages
    { id: 'page-reports', text: 'Reports', parentId: 'nav-analytics', x: 710, color: '#e8f5e9' },
    { id: 'page-metrics', text: 'Metrics', parentId: 'nav-analytics', x: 810, color: '#e8f5e9' },
    
    // Settings pages
    { id: 'page-profile', text: 'Profile', parentId: 'nav-settings', x: 930, color: '#e8f5e9' },
    { id: 'page-account', text: 'Account', parentId: 'nav-settings', x: 1030, color: '#e8f5e9' }
  ];

  pages.forEach(page => {
    elements.push({
      type: 'rectangle',
      id: page.id,
      x: page.x,
      y: 220,
      width: 150,
      height: 60,
      backgroundColor: page.color,
      text: page.text
    });
    
    // Arrow from parent nav to this page
    elements.push({
      type: 'arrow',
      startId: page.parentId,
      endId: page.id,
      x: page.x + 75,
      y: 170,
      points: [[0, 0], [0, 50]]
    });
  });

  // Level 3: Features/Components (30 items, 3 per page)
  const features = [
    // Landing features
    { id: 'feat-hero', text: 'Hero Section', parentId: 'page-landing', x: 30, color: '#f3e5f5' },
    { id: 'feat-cta', text: 'CTA Buttons', parentId: 'page-landing', x: 90, color: '#f3e5f5' },
    
    // Features page
    { id: 'feat-list', text: 'Feature List', parentId: 'page-features', x: 130, color: '#f3e5f5' },
    { id: 'feat-demo', text: 'Demo Video', parentId: 'page-features', x: 190, color: '#f3e5f5' },
    
    // Overview features
    { id: 'feat-widgets', text: 'Widgets', parentId: 'page-overview', x: 250, color: '#f3e5f5' },
    { id: 'feat-charts', text: 'Charts', parentId: 'page-overview', x: 310, color: '#f3e5f5' },
    
    // Tasks features
    { id: 'feat-kanban', text: 'Kanban Board', parentId: 'page-tasks', x: 350, color: '#f3e5f5' },
    { id: 'feat-filters', text: 'Filters', parentId: 'page-tasks', x: 410, color: '#f3e5f5' },
    
    // Catalog features
    { id: 'feat-grid', text: 'Product Grid', parentId: 'page-catalog', x: 470, color: '#f3e5f5' },
    { id: 'feat-search', text: 'Search', parentId: 'page-catalog', x: 530, color: '#f3e5f5' },
    
    // Details features
    { id: 'feat-gallery', text: 'Image Gallery', parentId: 'page-details', x: 570, color: '#f3e5f5' },
    { id: 'feat-reviews', text: 'Reviews', parentId: 'page-details', x: 630, color: '#f3e5f5' },
    
    // Reports features
    { id: 'feat-export', text: 'Export PDF', parentId: 'page-reports', x: 690, color: '#f3e5f5' },
    { id: 'feat-schedule', text: 'Schedule', parentId: 'page-reports', x: 750, color: '#f3e5f5' },
    
    // Metrics features
    { id: 'feat-dashboard', text: 'Dashboard', parentId: 'page-metrics', x: 790, color: '#f3e5f5' },
    { id: 'feat-kpis', text: 'KPIs', parentId: 'page-metrics', x: 850, color: '#f3e5f5' },
    
    // Profile features
    { id: 'feat-avatar', text: 'Avatar Upload', parentId: 'page-profile', x: 910, color: '#f3e5f5' },
    { id: 'feat-bio', text: 'Bio Editor', parentId: 'page-profile', x: 970, color: '#f3e5f5' },
    
    // Account features
    { id: 'feat-security', text: 'Security', parentId: 'page-account', x: 1010, color: '#f3e5f5' },
    { id: 'feat-billing', text: 'Billing', parentId: 'page-account', x: 1070, color: '#f3e5f5' }
  ];

  features.forEach(feat => {
    elements.push({
      type: 'rectangle',
      id: feat.id,
      x: feat.x,
      y: 340,
      width: 120,
      height: 50,
      backgroundColor: feat.color,
      text: feat.text
    });
    
    // Arrow from parent page to this feature
    elements.push({
      type: 'arrow',
      startId: feat.parentId,
      endId: feat.id,
      x: feat.x + 60,
      y: 280,
      points: [[0, 0], [0, 60]]
    });
  });

  console.log(`🎨 [MockProvider] Generated ${elements.length} elements for Information Architecture`);
  
  return elements;
}
