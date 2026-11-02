import { Divider, List } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PlaceIcon from '@mui/icons-material/Place';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import RouteIcon from '@mui/icons-material/Route';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import NotesIcon from '@mui/icons-material/Notes';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../../common/components/LocalizationProvider';
import useAccess from '../../common/util/useAccess';
import MenuItem from '../../common/components/MenuItem';

const ReportsMenu = () => {
  const t = useTranslation();
  const location = useLocation();

  const { canView } = useAccess();

  const buildLink = (path) => {
    const sourceParams = new URLSearchParams(location.search);
    const deviceIds = sourceParams.getAll('deviceId');
    const groupIds = sourceParams.getAll('groupId');
    if (!deviceIds.length && !groupIds.length) {
      return path;
    }
    const params = new URLSearchParams();
    if (path === '/reports/chart' || path === '/reports/route' || path === '/replay') {
      const [firstDeviceId] = deviceIds;
      if (firstDeviceId != null) {
        params.append('deviceId', firstDeviceId);
      }
    } else {
      deviceIds.forEach((deviceId) => params.append('deviceId', deviceId));
      groupIds.forEach((groupId) => params.append('groupId', groupId));
    }
    const search = params.toString();
    return search ? `${path}?${search}` : path;
  };

  const secondary = [
    canView('reports.logs') && (
      <MenuItem
        key="logs"
        title={t('sharedLogs')}
        link="/reports/logs"
        icon={<NotesIcon />}
        selected={location.pathname === '/reports/logs'}
      />
    ),
    canView('reports.scheduled') && (
      <MenuItem
        key="scheduled"
        title={t('reportScheduled')}
        link="/reports/scheduled"
        icon={<EventRepeatIcon />}
        selected={location.pathname === '/reports/scheduled'}
      />
    ),
    canView('reports.statistics') && (
      <MenuItem
        key="statistics"
        title={t('statisticsTitle')}
        link="/reports/statistics"
        icon={<BarChartIcon />}
        selected={location.pathname === '/reports/statistics'}
      />
    ),
    canView('reports.audit') && (
      <MenuItem
        key="audit"
        title={t('reportAudit')}
        link="/reports/audit"
        icon={<VerifiedUserIcon />}
        selected={location.pathname === '/reports/audit'}
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <List>
        {canView('reports.combined') && (
          <MenuItem
            title={t('reportCombined')}
            link={buildLink('/reports/combined')}
            icon={<StarIcon />}
            selected={location.pathname === '/reports/combined'}
          />
        )}
        {canView('reports.events') && (
          <MenuItem
            title={t('reportEvents')}
            link={buildLink('/reports/events')}
            icon={<NotificationsActiveIcon />}
            selected={location.pathname === '/reports/events'}
          />
        )}
        {canView('reports.geofences') && (
          <MenuItem
            title={t('sharedGeofences')}
            link={buildLink('/reports/geofences')}
            icon={<PlaceIcon />}
            selected={location.pathname === '/reports/geofences'}
          />
        )}
        {canView('reports.trips') && (
          <MenuItem
            title={t('reportTrips')}
            link={buildLink('/reports/trips')}
            icon={<PlayCircleFilledIcon />}
            selected={location.pathname === '/reports/trips'}
          />
        )}
        {canView('reports.stops') && (
          <MenuItem
            title={t('reportStops')}
            link={buildLink('/reports/stops')}
            icon={<PauseCircleFilledIcon />}
            selected={location.pathname === '/reports/stops'}
          />
        )}
        {canView('reports.summary') && (
          <MenuItem
            title={t('reportSummary')}
            link={buildLink('/reports/summary')}
            icon={<FormatListBulletedIcon />}
            selected={location.pathname === '/reports/summary'}
          />
        )}
        {canView('reports.chart') && (
          <MenuItem
            title={t('reportChart')}
            link={buildLink('/reports/chart')}
            icon={<TrendingUpIcon />}
            selected={location.pathname === '/reports/chart'}
          />
        )}
        {canView('reports.replay') && (
          <MenuItem title={t('reportReplay')} link={buildLink('/replay')} icon={<RouteIcon />} />
        )}
        {canView('reports.route') && (
          <MenuItem
            title={t('reportPositions')}
            link={buildLink('/reports/route')}
            icon={<TimelineIcon />}
            selected={location.pathname === '/reports/route'}
          />
        )}
      </List>
      {secondary.length > 0 && (
        <>
          <Divider />
          <List>{secondary}</List>
        </>
      )}
    </>
  );
};

export default ReportsMenu;
