import { Tooltip } from '@mui/material';
import { makeStyles } from 'tss-react/mui';

import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import DashboardIcon from '@mui/icons-material/Dashboard';

import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import useNavigation from './useNavigation';
import LogoMark from './LogoMark';

// Trilho de navegação vertical estilo SigaSul: ícones compactos com rótulo curto.
const useStyles = makeStyles()((theme) => ({
  sidebar: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.palette.sidebar.background,
    color: theme.palette.sidebar.text,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  logoContainer: {
    padding: theme.spacing(1.5, 0.5),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.palette.sidebar.header,
    borderBottom: `1px solid ${theme.palette.sidebar.border}`,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    // Esconde a barra de rolagem mas mantém o scroll funcional
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  item: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(1.25, 0.5),
    color: theme.palette.sidebar.textMuted,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    borderLeft: '3px solid transparent',
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      backgroundColor: theme.palette.sidebar.hover,
      color: theme.palette.sidebar.text,
    },
    '& svg': {
      fontSize: '1.4rem',
    },
  },
  itemSelected: {
    backgroundColor: theme.palette.sidebar.selected,
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    color: theme.palette.sidebar.text,
    '& svg': {
      color: theme.palette.primary.main,
    },
  },
  label: {
    fontSize: '0.6rem',
    fontWeight: 500,
    lineHeight: 1.15,
    textAlign: 'center',
    letterSpacing: '0.01em',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
  },
  logout: {
    borderTop: `1px solid ${theme.palette.sidebar.border}`,
    backgroundColor: theme.palette.sidebar.header,
    color: theme.palette.sidebar.textMuted,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
      color: theme.palette.sidebar.text,
    },
    '& svg': {
      fontSize: '1.25rem',
    },
  },
}));

const AppSidebar = () => {
  const { classes, cx } = useStyles();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');

  const { currentSelection, handleSelection, handleAccount, handleLogout } = useNavigation();

  const selection = currentSelection();

  const items = [
    { key: 'map', label: t('mapTitle'), icon: <MapIcon /> },
    ...(!disableReports
      ? [{ key: 'dashboard', label: t('dashboardTitle'), icon: <DashboardIcon /> }]
      : []),
    { key: 'trips', label: t('reportTrips'), icon: <RouteIcon /> },
    { key: 'timeline', label: t('timelineTitle'), icon: <ViewTimelineIcon /> },
    { key: 'devices', label: t('deviceTitle'), icon: <DirectionsCarIcon /> },
    ...(!disableReports
      ? [{ key: 'reports', label: t('reportTitle'), icon: <DescriptionIcon /> }]
      : []),
    { key: 'settings', label: t('settingsTitle'), icon: <SettingsIcon /> },
    ...(!readonly ? [{ key: 'account', label: t('settingsUser'), icon: <PersonIcon /> }] : []),
  ];

  return (
    <div className={classes.sidebar}>
      <div className={classes.logoContainer}>
        <LogoMark />
      </div>

      <div className={classes.list}>
        {items.map((item) => (
          <Tooltip key={item.key} title={item.label} placement="right">
            <button
              type="button"
              className={cx(classes.item, selection === item.key && classes.itemSelected)}
              onClick={() => (item.key === 'account' ? handleAccount() : handleSelection(item.key))}
            >
              {item.icon}
              <span className={classes.label}>{item.label}</span>
            </button>
          </Tooltip>
        ))}
      </div>

      <Tooltip title={t('loginLogout')} placement="right">
        <button type="button" className={cx(classes.item, classes.logout)} onClick={handleLogout}>
          <ExitToAppIcon />
          <span className={classes.label}>{t('loginLogout')}</span>
        </button>
      </Tooltip>
    </div>
  );
};

export default AppSidebar;
