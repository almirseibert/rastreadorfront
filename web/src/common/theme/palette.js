import { grey, green, indigo } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

// Cores da marca Argos Track (sidebar escura funciona nos dois modos)
const brand = {
  navy: '#20304a',
  navyDark: '#182438',
  navyBorder: '#2c3e5d',
  textMuted: '#a0aec0',
};

export default (server, darkMode) => ({
  mode: darkMode ? 'dark' : 'light',
  background: {
    default: darkMode ? '#101823' : grey[50],
    paper: darkMode ? brand.navyDark : '#ffffff',
  },
  primary: {
    main:
      validatedColor(server?.attributes?.colorPrimary) || (darkMode ? indigo[200] : indigo[900]),
  },
  secondary: {
    main:
      validatedColor(server?.attributes?.colorSecondary) || (darkMode ? green[200] : green[800]),
  },
  neutral: {
    main: grey[500],
  },
  geometry: {
    main: '#3bb2d0',
  },
  alwaysDark: {
    main: grey[900],
  },
  motion: {
    moving: darkMode ? green[400] : '#28a745',
    stopped: darkMode ? '#ef5350' : '#dc3545',
  },
  sidebar: {
    background: brand.navy,
    header: brand.navyDark,
    border: brand.navyBorder,
    hover: brand.navyBorder,
    selected: brand.navyBorder,
    text: '#ffffff',
    textMuted: brand.textMuted,
  },
});
