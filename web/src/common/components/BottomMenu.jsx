import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Menu,
  MenuItem,
  Typography,
  Badge,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Box,
  Divider,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';

import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CellTowerIcon from '@mui/icons-material/CellTower';

import { sessionActions } from '../../store';
import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import { nativePostMessage } from './NativeInterface';
import LogoImage from '../../login/LogoImage';

const useStyles = makeStyles()((theme) => ({
  sidebar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#20304a', // Azul escuro SigaSul
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  logoContainer: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#182438', // Tom mais escuro para o cabeçalho
    borderBottom: '1px solid #2c3e5d',
    '& svg': {
      maxHeight: '40px',
    }
  },
  header: {
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: '#182438',
    borderBottom: '1px solid #2c3e5d',
  },
  avatar: {
    backgroundColor: '#ffffff',
    color: '#20304a',
    width: 40,
    height: 40,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: '0.85rem',
    lineHeight: 1.2,
  },
  greeting: {
    fontSize: '0.7rem',
    color: '#a0aec0',
  },
  list: {
    flex: 1,
    paddingTop: 0,
    overflowY: 'auto',
  },
  listItem: {
    padding: theme.spacing(1.5, 2),
    borderLeft: '4px solid transparent',
    '&:hover': {
      backgroundColor: '#2c3e5d',
    },
  },
  listItemSelected: {
    backgroundColor: '#2c3e5d',
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  },
  listIcon: {
    color: '#a0aec0',
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
    backgroundColor: '#182438',
    padding: theme.spacing(2),
    '&:hover': {
      backgroundColor: '#d32f2f', // Vermelho ao passar o mouse para sair
    }
  }
}));

const BottomMenu = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const t = useTranslation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);
  const socket = useSelector((state) => state.session.socket);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const [anchorEl, setAnchorEl] = useState(null);

  const currentSelection = () => {
    if (location.pathname === `/settings/user/${user.id}`) return 'account';
    if (location.pathname.startsWith('/settings/device')) return 'devices';
    if (location.pathname.startsWith('/settings')) return 'settings';
    if (location.pathname.startsWith('/reports')) return 'reports';
    if (location.pathname === '/') return 'map';
    return null;
  };

  const handleAccount = () => {
    setAnchorEl(null);
    navigate(`/settings/user/${user.id}`);
  };

  const handleLogout = async () => {
    setAnchorEl(null);

    const notificationToken = window.localStorage.getItem('notificationToken');
    if (notificationToken && !user.readonly) {
      window.localStorage.removeItem('notificationToken');
      const tokens = user.attributes.notificationTokens?.split(',') || [];
      if (tokens.includes(notificationToken)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens:
              tokens.length > 1
                ? tokens.filter((it) => it !== notificationToken).join(',')
                : undefined,
          },
        };
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });
      }
    }

    await fetch('/api/session', { method: 'DELETE' });
    nativePostMessage('logout');
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  };

  const handleSelection = (event, value) => {
    switch (value) {
      case 'map':
        navigate('/');
        break;
      case 'devices':
        navigate('/settings/devices');
        break;
      case 'reports': {
        let id = selectedDeviceId;
        if (id == null) {
          const deviceIds = Object.keys(devices);
          if (deviceIds.length === 1) {
            id = deviceIds[0];
          }
        }
        if (id != null) {
          navigate(`/reports/combined?deviceId=${id}`);
        } else {
          navigate('/reports/combined');
        }
        break;
      }
      case 'settings':
        navigate('/settings/preferences?menu=true');
        break;
      case 'account':
        setAnchorEl(event.currentTarget);
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  // Renderização Desktop: Menu Lateral
  if (desktop) {
    return (
      <div className={classes.sidebar}>
        <div className={classes.logoContainer}>
          {/* Mostra a logo em branco sobre o fundo escuro */}
          <LogoImage color="#ffffff" /> 
        </div>
        <div className={classes.header}>
          <Avatar className={classes.avatar}><PersonIcon /></Avatar>
          <Box>
            <Typography className={classes.greeting}>Bom dia,</Typography>
            <Typography className={classes.userName}>{user?.name}</Typography>
          </Box>
        </div>
        
        <List className={classes.list}>
          <ListItemButton
            className={`${classes.listItem} ${currentSelection() === 'map' ? classes.listItemSelected : ''}`}
            onClick={(e) => handleSelection(e, 'map')}
          >
            <ListItemIcon className={currentSelection() === 'map' ? classes.listIconSelected : classes.listIcon}>
              <MapIcon />
            </ListItemIcon>
            <ListItemText primary="Rastreamento" className={classes.listText} />
          </ListItemButton>

          <ListItemButton
            className={`${classes.listItem} ${currentSelection() === 'devices' ? classes.listItemSelected : ''}`}
            onClick={(e) => handleSelection(e, 'devices')}
          >
            <ListItemIcon className={currentSelection() === 'devices' ? classes.listIconSelected : classes.listIcon}>
              <DirectionsCarIcon />
            </ListItemIcon>
            <ListItemText primary="Veículos / Frota" className={classes.listText} />
          </ListItemButton>

          {!disableReports && (
            <ListItemButton
              className={`${classes.listItem} ${currentSelection() === 'reports' ? classes.listItemSelected : ''}`}
              onClick={(e) => handleSelection(e, 'reports')}
            >
              <ListItemIcon className={currentSelection() === 'reports' ? classes.listIconSelected : classes.listIcon}>
                <DescriptionIcon />
              </ListItemIcon>
              <ListItemText primary="Relatórios" className={classes.listText} />
            </ListItemButton>
          )}

          <ListItemButton
            className={`${classes.listItem} ${currentSelection() === 'settings' ? classes.listItemSelected : ''}`}
            onClick={(e) => handleSelection(e, 'settings')}
          >
            <ListItemIcon className={currentSelection() === 'settings' ? classes.listIconSelected : classes.listIcon}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Configurações" className={classes.listText} />
          </ListItemButton>

          {!readonly && (
            <ListItemButton
              className={`${classes.listItem} ${currentSelection() === 'account' ? classes.listItemSelected : ''}`}
              onClick={handleAccount}
            >
              <ListItemIcon className={currentSelection() === 'account' ? classes.listIconSelected : classes.listIcon}>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Minha Conta" className={classes.listText} />
            </ListItemButton>
          )}
        </List>

        <ListItemButton className={classes.logout} onClick={handleLogout}>
          <ListItemIcon className={classes.listIcon}>
            <ExitToAppIcon />
          </ListItemIcon>
          <ListItemText primary="Sair do Sistema" className={classes.listText} />
        </ListItemButton>
      </div>
    );
  }

  // Renderização Mobile: Mantém o menu padrão do rodapé
  return (
    <Paper square elevation={3}>
      <BottomNavigation value={currentSelection()} onChange={handleSelection} showLabels>
        <BottomNavigationAction
          label={t('mapTitle')}
          icon={
            <Badge color="error" variant="dot" overlap="circular" invisible={socket !== false}>
              <MapIcon />
            </Badge>
          }
          value="map"
        />
        {!disableReports && (
          <BottomNavigationAction
            label={t('reportTitle')}
            icon={<DescriptionIcon />}
            value="reports"
          />
        )}
        <BottomNavigationAction
          label={t('settingsTitle')}
          icon={<SettingsIcon />}
          value="settings"
        />
        {readonly ? (
          <BottomNavigationAction
            label={t('loginLogout')}
            icon={<ExitToAppIcon />}
            value="logout"
          />
        ) : (
          <BottomNavigationAction label={t('settingsUser')} icon={<PersonIcon />} value="account" />
        )}
      </BottomNavigation>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={handleAccount}>
          <Typography color="textPrimary">{t('settingsUser')}</Typography>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Typography color="error">{t('loginLogout')}</Typography>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default BottomMenu;