import {
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Box,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';

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
import LogoImage from '../../login/LogoImage';

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
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: theme.palette.sidebar.header,
    borderBottom: `1px solid ${theme.palette.sidebar.border}`,
    '& svg': {
      maxHeight: '40px',
    }
  },
  header: {
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.palette.sidebar.header,
    borderBottom: `1px solid ${theme.palette.sidebar.border}`,
  },
  avatar: {
    backgroundColor: theme.palette.sidebar.text,
    color: theme.palette.sidebar.background,
    width: 40,
    height: 40,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: '0.85rem',
    lineHeight: 1.2,
  },
  userEmail: {
    fontSize: '0.7rem',
    color: theme.palette.sidebar.textMuted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  list: {
    flex: 1,
    paddingTop: 0,
    overflowY: 'auto',
  },
  listItem: {
    padding: theme.spacing(1.25, 2),
    borderLeft: '4px solid transparent',
    '&:hover': {
      backgroundColor: theme.palette.sidebar.hover,
    },
  },
  listItemSelected: {
    backgroundColor: theme.palette.sidebar.selected,
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  },
  listIcon: {
    color: theme.palette.sidebar.textMuted,
    minWidth: '40px',
  },
  listIconSelected: {
    color: theme.palette.primary.main,
    minWidth: '40px',
  },
  listText: {
    '& span': {
      fontSize: '0.85rem',
      fontWeight: 500,
    }
  },
  logout: {
    marginTop: 'auto',
    flex: '0 0 auto',
    padding: theme.spacing(1.25, 2),
    borderTop: `1px solid ${theme.palette.sidebar.border}`,
    backgroundColor: theme.palette.sidebar.header,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    }
  }
}));

const AppSidebar = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');

  const { user, currentSelection, handleSelection, handleAccount, handleLogout } = useNavigation();

  const selection = currentSelection();

  const items = [
    { key: 'map', label: t('mapTitle'), icon: <MapIcon /> },
    ...(!disableReports
      ? [{ key: 'dashboard', label: t('dashboardTitle'), icon: <DashboardIcon /> }]
      : []),
    { key: 'trips', label: t('reportTrips'), icon: <RouteIcon /> },
    { key: 'timeline', label: t('timelineTitle'), icon: <ViewTimelineIcon /> },
    { key: 'devices', label: t('deviceTitle'), icon: <DirectionsCarIcon /> },
    ...(!disableReports ? [{ key: 'reports', label: t('reportTitle'), icon: <DescriptionIcon /> }] : []),
    { key: 'settings', label: t('settingsTitle'), icon: <SettingsIcon /> },
    ...(!readonly ? [{ key: 'account', label: t('settingsUser'), icon: <PersonIcon /> }] : []),
  ];

  return (
    <div className={classes.sidebar}>
      <div className={classes.logoContainer}>
        <LogoImage color={theme.palette.sidebar.text} />
      </div>
      <div className={classes.header}>
        <Avatar className={classes.avatar}><PersonIcon /></Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography className={classes.userName}>{user?.name}</Typography>
          <Typography className={classes.userEmail}>{user?.email}</Typography>
        </Box>
      </div>

      <List className={classes.list}>
        {items.map((item) => (
          <ListItemButton
            key={item.key}
            className={`${classes.listItem} ${selection === item.key ? classes.listItemSelected : ''}`}
            onClick={() => (item.key === 'account' ? handleAccount() : handleSelection(item.key))}
          >
            <ListItemIcon className={selection === item.key ? classes.listIconSelected : classes.listIcon}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} className={classes.listText} />
          </ListItemButton>
        ))}
      </List>

      <ListItemButton className={classes.logout} onClick={handleLogout}>
        <ListItemIcon className={classes.listIcon}>
          <ExitToAppIcon />
        </ListItemIcon>
        <ListItemText primary={t('loginLogout')} className={classes.listText} />
      </ListItemButton>
    </div>
  );
};

export default AppSidebar;
