import { Divider, List } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import DrawIcon from '@mui/icons-material/Draw';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import TodayIcon from '@mui/icons-material/Today';
import SendIcon from '@mui/icons-material/Send';
import DnsIcon from '@mui/icons-material/Dns';
import HelpIcon from '@mui/icons-material/Help';
import PaymentIcon from '@mui/icons-material/Payment';
import CampaignIcon from '@mui/icons-material/Campaign';
import CalculateIcon from '@mui/icons-material/Calculate';
import BadgeIcon from '@mui/icons-material/Badge';
import HandymanIcon from '@mui/icons-material/Handyman';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import useAccess from '../../common/util/useAccess';
import MenuItem from '../../common/components/MenuItem';

// O menu de Configurações é montado a partir do perfil de acesso do usuário
// (common/util/pages.js + useAccess), não mais de flags espalhadas.
const SettingsMenu = () => {
  const t = useTranslation();
  const location = useLocation();

  const { canView } = useAccess();
  const userId = useSelector((state) => state.session.user.id);
  const supportLink = useSelector((state) => state.session.server.attributes.support);
  const billingLink = useSelector((state) => state.session.user.attributes.billingLink);

  const starts = (prefix) => location.pathname.startsWith(prefix);

  const adminItems = [
    canView('announcement') && (
      <MenuItem
        key="announcement"
        title={t('serverAnnouncement')}
        link="/settings/announcement"
        icon={<CampaignIcon />}
        selected={location.pathname === '/settings/announcement'}
      />
    ),
    canView('server') && (
      <MenuItem
        key="server"
        title={t('settingsServer')}
        link="/settings/server"
        icon={<SettingsIcon />}
        selected={location.pathname === '/settings/server'}
      />
    ),
    canView('users') && (
      <MenuItem
        key="users"
        title={t('settingsUsers')}
        link="/settings/users"
        icon={<PeopleIcon />}
        selected={starts('/settings/user') && location.pathname !== `/settings/user/${userId}`}
      />
    ),
    canView('profiles') && (
      <MenuItem
        key="profiles"
        title={t('settingsProfiles')}
        link="/settings/profiles"
        icon={<BadgeIcon />}
        selected={location.pathname === '/settings/profiles'}
      />
    ),
    canView('companies') && (
      <MenuItem
        key="companies"
        title={t('settingsCompanies')}
        link="/settings/companies"
        icon={<BusinessIcon />}
        selected={location.pathname === '/settings/companies'}
      />
    ),
    canView('installations') && (
      <MenuItem
        key="installations"
        title={t('installOrders')}
        link="/settings/installations"
        icon={<HandymanIcon />}
        selected={starts('/settings/installation')}
      />
    ),
    canView('checklists') && (
      <MenuItem
        key="checklists"
        title={t('checklistTemplates')}
        link="/settings/checklists"
        icon={<FactCheckIcon />}
        selected={starts('/settings/checklist')}
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <List>
        {canView('preferences') && (
          <MenuItem
            title={t('sharedPreferences')}
            link="/settings/preferences"
            icon={<TuneIcon />}
            selected={location.pathname === '/settings/preferences'}
          />
        )}
        {canView('notifications') && (
          <MenuItem
            title={t('sharedNotifications')}
            link="/settings/notifications"
            icon={<NotificationsIcon />}
            selected={starts('/settings/notification')}
          />
        )}
        {canView('account') && (
          <MenuItem
            title={t('settingsUser')}
            link={`/settings/user/${userId}`}
            icon={<PersonIcon />}
            selected={location.pathname === `/settings/user/${userId}`}
          />
        )}
        {canView('devices') && (
          <MenuItem
            title={t('deviceTitle')}
            link="/settings/devices"
            icon={<DnsIcon />}
            selected={starts('/settings/device')}
          />
        )}
        {canView('geofences') && (
          <MenuItem
            title={t('sharedGeofences')}
            link="/geofences"
            icon={<DrawIcon />}
            selected={starts('/settings/geofence')}
          />
        )}
        {canView('groups') && (
          <MenuItem
            title={t('settingsGroups')}
            link="/settings/groups"
            icon={<FolderIcon />}
            selected={starts('/settings/group')}
          />
        )}
        {canView('drivers') && (
          <MenuItem
            title={t('sharedDrivers')}
            link="/settings/drivers"
            icon={<PersonIcon />}
            selected={starts('/settings/driver')}
          />
        )}
        {canView('calendars') && (
          <MenuItem
            title={t('sharedCalendars')}
            link="/settings/calendars"
            icon={<TodayIcon />}
            selected={starts('/settings/calendar')}
          />
        )}
        {canView('computedAttributes') && (
          <MenuItem
            title={t('sharedComputedAttributes')}
            link="/settings/attributes"
            icon={<CalculateIcon />}
            selected={starts('/settings/attribute')}
          />
        )}
        {canView('maintenances') && (
          <MenuItem
            title={t('sharedMaintenance')}
            link="/settings/maintenances"
            icon={<BuildIcon />}
            selected={starts('/settings/maintenance')}
          />
        )}
        {canView('commands') && (
          <MenuItem
            title={t('sharedSavedCommands')}
            link="/settings/commands"
            icon={<SendIcon />}
            selected={starts('/settings/command')}
          />
        )}
        {billingLink && (
          <MenuItem title={t('userBilling')} link={billingLink} icon={<PaymentIcon />} />
        )}
        {supportLink && (
          <MenuItem title={t('settingsSupport')} link={supportLink} icon={<HelpIcon />} />
        )}
      </List>
      {adminItems.length > 0 && (
        <>
          <Divider />
          <List>{adminItems}</List>
        </>
      )}
    </>
  );
};

export default SettingsMenu;
