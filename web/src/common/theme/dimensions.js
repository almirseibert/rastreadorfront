export default {
  sidebarWidth: '28%',
  sidebarWidthTablet: '52px',
  navSidebarWidth: '84px', // Trilho de ícones (estilo SigaSul) no desktop
  topBarHeight: 52, // Barra de topo horizontal (views + seletor de empresa) no desktop
  deviceRowHeight: 116, // Altura fixa dos cards da lista (react-window)
  drawerWidthDesktop: '340px', // Aumentado para acomodar confortavelmente o novo card detalhado
  drawerWidthTablet: '320px',
  drawerHeightPhone: '250px',
  filterFormWidth: '160px',
  eventsDrawerWidth: '320px',
  bottomBarHeight: 56,
  popupMapOffset: 300,
  popupMaxWidth: 288,
  popupImageHeight: 144,
  cardContentMaxHeight: '40vh',
  qrCodeSize: 192,
  // Raios e sombras da marca: antes eram literais repetidos nos componentes
  // (borderRadius 8/12 e boxShadow rgba fixo em App.jsx e MainPage.jsx).
  radiusCard: 12,
  radiusControl: 8,
  shadowRail: '2px 0 10px rgba(0,0,0,0.3)',
  shadowPanel: '0 4px 20px rgba(0,0,0,0.18)',
};
