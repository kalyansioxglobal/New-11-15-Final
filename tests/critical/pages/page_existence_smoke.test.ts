const criticalPages = [
  '@/pages/freight/loads/[id]',
  '@/pages/freight/loads/index',
  '@/pages/admin/freight/carriers/[id]/preferred-lanes',
  '@/pages/admin/freight/shippers/[id]/preferred-lanes',
  '@/pages/admin/ai-templates',
  '@/pages/admin/hotels/pnl',
  '@/pages/ventures/index',
  '@/pages/ventures/[id]',
  '@/pages/logistics/dashboard',
  '@/pages/hospitality/dashboard',
  '@/pages/freight/pnl',
  '@/pages/freight/kpi',
];

describe('critical pages load', () => {
  it.each(criticalPages)('%s should import and expose a component', async (pagePath) => {
    const mod = await import(pagePath);
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
    if (mod.getServerSideProps) {
      expect(typeof mod.getServerSideProps).toBe('function');
    }
  });
});
