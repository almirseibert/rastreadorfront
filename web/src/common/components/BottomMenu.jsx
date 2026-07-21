import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Menu,
  MenuItem,
  Typography,
  Badge,
} from '@mui/material';

import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import RouteIcon from '@mui/icons-material/Route';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import useNavigation from './useNavigation';

// Menu inferior usado apenas no mobile; no desktop a navegação fica na AppSidebar.
const BottomMenu = () => {
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const socket = useSelector((state) => state.session.socket);

  const { currentSelection, handleSelection, handleAccount, handleLogout } = useNavigation();

  const [anchorEl, setAnchorEl] = useState(null);

  const onChange = (event, value) => {
    if (value === 'account') {
      setAnchorEl(event.currentTarget);
    } else {
      handleSelection(value);
    }
  };

  return (
    <Paper square elevation={3}>
      <BottomNavigation value={currentSelection()} onChange={onChange} showLabels>
        <BottomNavigationAction
          label={t('mapTitle')}
          icon={
            <Badge color="error" variant="dot" overlap="circular" invisible={socket !== false}>
              <MapIcon />
            </Badge>
          }
          value="map"
        />
        <BottomNavigationAction
          label={t('reportTrips')}
          icon={<RouteIcon />}
          value="trips"
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
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            handleAccount();
          }}
        >
          <Typography color="textPrimary">{t('settingsUser')}</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            handleLogout();
          }}
        >
          <Typography color="error">{t('loginLogout')}</Typography>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default BottomMenu;
