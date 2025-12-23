export const SELECTORS = {
  ventureSwitcher: '[data-testid="venture-switcher"]',
  currentVenture: '[data-testid="current-venture"]',
  sidebarNav: '[data-testid="sidebar-nav"]',
  
  freightLoadsList: '[data-testid="freight-loads-list"]',
  carriersList: '[data-testid="carriers-list"]',
  
  warRoom: '[data-testid="war-room"]',
  warRoomLoadFeed: '[data-testid="war-room-load-feed"]',
  btnPreviewSms: '[data-testid="btn-preview-sms"]',
  btnPreviewEmail: '[data-testid="btn-preview-email"]',
  outreachPreview: '[data-testid="outreach-preview"]',
  btnSendConfirm: '[data-testid="btn-send-confirm"]',
  
  aiTemplates: '[data-testid="ai-templates"]',
  hotelsList: '[data-testid="hotels-list"]',
  bpoEmployees: '[data-testid="bpo-employees"]',
  systemCheck: '[data-testid="system-check"]',
  
  loginForm: '[data-testid="login-form"]',
  loginEmail: '[data-testid="login-email"]',
  loginSubmit: '[data-testid="login-submit"]',
};

export const TEST_VENTURES = {
  siox: {
    name: "SIOX E2E",
    loadPrefix: "SIOX-E2E-",
    carrierPrefix: "SIOX Carrier",
    loadIdRange: { min: 100001, max: 100010 },
    carrierIdRange: { min: 100001, max: 100020 },
  },
  mb: {
    name: "MB E2E",
    loadPrefix: "MB-E2E-",
    carrierPrefix: "MB Carrier",
    loadIdRange: { min: 200001, max: 200010 },
    carrierIdRange: { min: 200001, max: 200020 },
  },
};

export const TEST_USERS = {
  admin: "admin@siox.test",
  sioxManager: "manager@siox.test",
  mbManager: "manager@mb.test",
};
