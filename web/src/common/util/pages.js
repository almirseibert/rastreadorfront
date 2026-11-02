// Registro central das páginas do Argos Track.
//
// É a fonte única da verdade usada por:
//  - menus (AppSidebar, MainTopBar, BottomMenu, SettingsMenu, ReportsMenu);
//  - perfis de acesso ("tipos de usuário") editados pelo administrador;
//  - guarda de rota (RequirePage), que impede o acesso por URL direta.
//
// Campos de cada página:
//  key        identificador curto e estável (vai gravado no perfil — NÃO renomear)
//  group      seção da UI: 'views' | 'settings' | 'reports'
//  path       rota principal
//  childPaths rotas filhas (detalhe/edição) que pertencem à mesma página
//  labelKey   chave i18n do rótulo
//  exact      só casa o path idêntico (usado pela home '/')
//  editable   a página tem distinção leitura × edição (FAB, salvar, excluir)
//  adminOnly  nunca concedível por perfil; só administradores
//  managerOnly nunca concedível por perfil; administradores e gestores (userLimit != 0)
//  always     sempre liberada, independente do perfil (conta do próprio usuário)
//  feature    chave de useFeatures() que também pode esconder a página
//  restriction chave de useRestriction() que também pode esconder a página

export const PAGE_GROUPS = ['views', 'settings', 'reports'];

export const PAGES = [
  // ---------------------------------------------------------------- views
  { key: 'map', group: 'views', path: '/', labelKey: 'mapTitle', exact: true },
  {
    key: 'dashboard',
    group: 'views',
    path: '/dashboard',
    labelKey: 'dashboardTitle',
    restriction: 'disableReports',
  },
  { key: 'trips', group: 'views', path: '/trips', labelKey: 'reportTrips' },
  { key: 'timeline', group: 'views', path: '/timeline', labelKey: 'timelineTitle' },
  {
    key: 'geofences',
    group: 'views',
    path: '/geofences',
    childPaths: ['/settings/geofence'],
    labelKey: 'sharedGeofences',
    editable: true,
  },
  {
    key: 'install',
    group: 'views',
    path: '/install',
    labelKey: 'installTitle',
    editable: true,
  },

  // ------------------------------------------------------------- settings
  {
    key: 'account',
    group: 'settings',
    path: '/settings/user',
    labelKey: 'settingsUser',
    always: true,
    editable: true,
  },
  {
    key: 'preferences',
    group: 'settings',
    path: '/settings/preferences',
    labelKey: 'sharedPreferences',
    editable: true,
  },
  {
    key: 'notifications',
    group: 'settings',
    path: '/settings/notifications',
    childPaths: ['/settings/notification'],
    labelKey: 'sharedNotifications',
    editable: true,
  },
  {
    key: 'devices',
    group: 'settings',
    path: '/settings/devices',
    childPaths: ['/settings/device', '/settings/accumulators'],
    labelKey: 'deviceTitle',
    editable: true,
  },
  {
    key: 'groups',
    group: 'settings',
    path: '/settings/groups',
    childPaths: ['/settings/group'],
    labelKey: 'settingsGroups',
    editable: true,
    feature: 'disableGroups',
  },
  {
    key: 'drivers',
    group: 'settings',
    path: '/settings/drivers',
    childPaths: ['/settings/driver'],
    labelKey: 'sharedDrivers',
    editable: true,
    feature: 'disableDrivers',
  },
  {
    key: 'calendars',
    group: 'settings',
    path: '/settings/calendars',
    childPaths: ['/settings/calendar'],
    labelKey: 'sharedCalendars',
    editable: true,
    feature: 'disableCalendars',
  },
  {
    key: 'computedAttributes',
    group: 'settings',
    path: '/settings/attributes',
    childPaths: ['/settings/attribute'],
    labelKey: 'sharedComputedAttributes',
    editable: true,
    feature: 'disableComputedAttributes',
  },
  {
    key: 'maintenances',
    group: 'settings',
    path: '/settings/maintenances',
    childPaths: ['/settings/maintenance'],
    labelKey: 'sharedMaintenance',
    editable: true,
    feature: 'disableMaintenance',
  },
  {
    key: 'commands',
    group: 'settings',
    path: '/settings/commands',
    childPaths: ['/settings/command'],
    labelKey: 'sharedSavedCommands',
    editable: true,
    feature: 'disableSavedCommands',
  },

  // -------------------------------------------------------------- reports
  {
    key: 'reports.combined',
    group: 'reports',
    path: '/reports/combined',
    labelKey: 'reportCombined',
    restriction: 'disableReports',
  },
  {
    key: 'reports.events',
    group: 'reports',
    path: '/reports/events',
    labelKey: 'reportEvents',
    restriction: 'disableReports',
  },
  {
    key: 'reports.geofences',
    group: 'reports',
    path: '/reports/geofences',
    labelKey: 'sharedGeofences',
    restriction: 'disableReports',
  },
  {
    key: 'reports.trips',
    group: 'reports',
    path: '/reports/trips',
    labelKey: 'reportTrips',
    restriction: 'disableReports',
  },
  {
    key: 'reports.stops',
    group: 'reports',
    path: '/reports/stops',
    labelKey: 'reportStops',
    restriction: 'disableReports',
  },
  {
    key: 'reports.summary',
    group: 'reports',
    path: '/reports/summary',
    labelKey: 'reportSummary',
    restriction: 'disableReports',
  },
  {
    key: 'reports.chart',
    group: 'reports',
    path: '/reports/chart',
    labelKey: 'reportChart',
    restriction: 'disableReports',
  },
  {
    key: 'reports.replay',
    group: 'reports',
    path: '/replay',
    labelKey: 'reportReplay',
    restriction: 'disableReports',
  },
  {
    key: 'reports.route',
    group: 'reports',
    path: '/reports/route',
    labelKey: 'reportPositions',
    restriction: 'disableReports',
  },
  {
    key: 'reports.scheduled',
    group: 'reports',
    path: '/reports/scheduled',
    labelKey: 'reportScheduled',
    editable: true,
    restriction: 'disableReports',
  },
  {
    key: 'reports.logs',
    group: 'reports',
    path: '/reports/logs',
    labelKey: 'sharedLogs',
    restriction: 'disableReports',
  },

  // ------------------------------------------------- administração (admin)
  {
    key: 'users',
    group: 'settings',
    path: '/settings/users',
    labelKey: 'settingsUsers',
    editable: true,
    managerOnly: true,
  },
  {
    key: 'companies',
    group: 'settings',
    path: '/settings/companies',
    labelKey: 'settingsCompanies',
    editable: true,
    adminOnly: true,
  },
  {
    key: 'profiles',
    group: 'settings',
    path: '/settings/profiles',
    labelKey: 'settingsProfiles',
    editable: true,
    adminOnly: true,
  },
  {
    key: 'installations',
    group: 'settings',
    path: '/settings/installations',
    childPaths: ['/settings/installation'],
    labelKey: 'installOrders',
    editable: true,
    adminOnly: true,
  },
  {
    key: 'checklists',
    group: 'settings',
    path: '/settings/checklists',
    childPaths: ['/settings/checklist'],
    labelKey: 'checklistTemplates',
    editable: true,
    adminOnly: true,
  },
  {
    key: 'announcement',
    group: 'settings',
    path: '/settings/announcement',
    labelKey: 'serverAnnouncement',
    editable: true,
    managerOnly: true,
  },
  {
    key: 'server',
    group: 'settings',
    path: '/settings/server',
    labelKey: 'settingsServer',
    editable: true,
    adminOnly: true,
  },
  {
    key: 'reports.statistics',
    group: 'reports',
    path: '/reports/statistics',
    labelKey: 'statisticsTitle',
    adminOnly: true,
  },
  {
    key: 'reports.audit',
    group: 'reports',
    path: '/reports/audit',
    labelKey: 'reportAudit',
    adminOnly: true,
  },
  {
    key: 'emulator',
    group: 'settings',
    path: '/emulator',
    labelKey: 'sharedEmulator',
    adminOnly: true,
  },
];

export const PAGE_MAP = PAGES.reduce((acc, page) => ({ ...acc, [page.key]: page }), {});

// Páginas que um perfil pode conceder: exclui as de administração (adminOnly/managerOnly,
// governadas pelas flags nativas do Traccar) e a conta do próprio usuário (sempre liberada).
export const assignablePages = () =>
  PAGES.filter((page) => !page.adminOnly && !page.managerOnly && !page.always);

// Todos os prefixos de rota de uma página, do mais específico para o menos.
const pathsOf = (page) => [page.path, ...(page.childPaths || [])];

const matches = (page, pathname) =>
  pathsOf(page).some((path) => {
    if (page.exact) {
      return pathname === path;
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  });

// Resolve a página a que uma rota pertence. Usado pelos componentes compartilhados
// (CollectionFab, EditItemView, ...) para descobrir o nível de acesso da tela atual.
// A guarda de rota NÃO usa isto: lá a chave é explícita em Navigation.jsx.
export const pageByPath = (pathname) => {
  if (!pathname) {
    return null;
  }
  const candidates = PAGES.filter((page) => matches(page, pathname));
  if (!candidates.length) {
    return null;
  }
  // Mais específico primeiro: '/settings/devices' ganha de '/settings'.
  return candidates.sort((a, b) => {
    const longest = (page) => Math.max(...pathsOf(page).map((path) => path.length));
    return longest(b) - longest(a);
  })[0];
};
