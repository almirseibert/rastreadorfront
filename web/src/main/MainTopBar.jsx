import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Avatar,
  Box,
  Button,
  FormControl,
  Menu,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import BusinessIcon from '@mui/icons-material/Business';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useManager, useRestriction } from '../common/util/permissions';
import useNavigation from '../common/components/useNavigation';

const useStyles = makeStyles()((theme) => ({
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    height: '100%',
    padding: theme.spacing(0, 2),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    overflowX: 'auto',
    flex: 1,
    minWidth: 0,
  },
  navButton: {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    borderRadius: 8,
    padding: theme.spacing(0.5, 1.5),
    whiteSpace: 'nowrap',
    minWidth: 'auto',
  },
  navButtonActive: {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexShrink: 0,
  },
  companySelect: {
    minWidth: 180,
    '& .MuiSelect-select': {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      paddingTop: theme.spacing(0.75),
      paddingBottom: theme.spacing(0.75),
    },
  },
  user: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: 'pointer',
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 500,
    maxWidth: 140,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}));

const MainTopBar = ({ selectedGroup = 0, setSelectedGroup }) => {
  const { classes, cx } = useStyles();
  const t = useTranslation();

  const manager = useManager();
  const disableReports = useRestriction('disableReports');

  const { user, currentSelection, handleSelection, handleAccount, handleLogout } = useNavigation();
  const selection = currentSelection();

  const groups = useSelector((state) => state.groups.items);
  const groupList = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  const showCompanies = manager && groupList.length > 0;

  const [anchorEl, setAnchorEl] = useState(null);

  const views = [
    { key: 'map', label: t('mapTitle') },
    ...(!disableReports ? [{ key: 'dashboard', label: t('dashboardTitle') }] : []),
    { key: 'trips', label: t('reportTrips') },
    { key: 'timeline', label: t('timelineTitle') },
    ...(!disableReports ? [{ key: 'reports', label: t('reportTitle') }] : []),
  ];

  const selectedCompany = selectedGroup || 'all';
  const changeCompany = (value) => {
    setSelectedGroup?.(value === 'all' ? 0 : value);
  };

  return (
    <div className={classes.bar}>
      <div className={classes.nav}>
        {views.map((view) => (
          <Button
            key={view.key}
            className={cx(classes.navButton, selection === view.key && classes.navButtonActive)}
            onClick={() => handleSelection(view.key)}
          >
            {view.label}
          </Button>
        ))}
      </div>

      <div className={classes.right}>
        {showCompanies && (
          <FormControl size="small">
            <Select
              className={classes.companySelect}
              value={selectedCompany}
              onChange={(e) => changeCompany(e.target.value)}
              renderValue={(value) => (
                <>
                  <BusinessIcon fontSize="small" color="action" />
                  {value === 'all' ? t('dashboardAllDevices') : groups[value]?.name}
                </>
              )}
            >
              <MenuItem value="all">{t('dashboardAllDevices')}</MenuItem>
              {groupList.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box className={classes.user} onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Avatar sx={{ width: 30, height: 30 }}>
            <PersonIcon fontSize="small" />
          </Avatar>
          <Typography className={classes.userName}>{user?.name}</Typography>
        </Box>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleAccount();
            }}
          >
            <PersonIcon fontSize="small" sx={{ mr: 1 }} />
            {t('settingsUser')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleLogout();
            }}
          >
            <ExitToAppIcon fontSize="small" sx={{ mr: 1 }} color="error" />
            <Typography color="error">{t('loginLogout')}</Typography>
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
};

export default MainTopBar;
