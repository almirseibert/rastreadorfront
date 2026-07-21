import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Toolbar,
  LinearProgress,
  Avatar,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import RouteIcon from '@mui/icons-material/Route';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SpeedIcon from '@mui/icons-material/Speed';
import FenceIcon from '@mui/icons-material/Fence';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KeyIcon from '@mui/icons-material/Key';
import dayjs from 'dayjs';
import {
  formatDistance,
  formatNumericHours,
  formatNotificationTitle,
} from '../common/util/formatter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import BackIcon from '../common/components/BackIcon';
import DateStrip from '../common/components/DateStrip';
import { useEffectAsync } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default,
  },
  toolbar: {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  title: {
    flexGrow: 1,
  },
  filters: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(2, 2, 1),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  list: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(1, 2, 2),
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  entry: {
    display: 'flex',
    gap: theme.spacing(1.5),
    position: 'relative',
    paddingBottom: theme.spacing(2),
    '&:not(:last-child)::before': {
      content: '""',
      position: 'absolute',
      left: 19,
      top: 40,
      bottom: 0,
      width: 2,
      backgroundColor: theme.palette.divider,
    },
  },
  entryBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: theme.spacing(0.5),
  },
  entryTitle: {
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  entryDetail: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  entryTime: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
    paddingTop: theme.spacing(0.5),
  },
  empty: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

const eventIcon = (type) => {
  if (type === 'deviceOverspeed') return <SpeedIcon fontSize="small" />;
  if (type === 'geofenceEnter' || type === 'geofenceExit') return <FenceIcon fontSize="small" />;
  if (type === 'ignitionOn' || type === 'ignitionOff') return <KeyIcon fontSize="small" />;
  if (type === 'deviceOnline' || type === 'deviceOffline' || type === 'deviceUnknown') {
    return <PowerSettingsNewIcon fontSize="small" />;
  }
  if (type === 'alarm') return <WarningAmberIcon fontSize="small" />;
  return <NotificationsIcon fontSize="small" />;
};

const TimelinePage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const distanceUnit = useAttributePreference('distanceUnit');

  const deviceList = useMemo(
    () => Object.values(devices).sort((a, b) => a.name.localeCompare(b.name)),
    [devices],
  );

  const [deviceId, setDeviceId] = useState(selectedDeviceId || deviceList[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));
  const [events, setEvents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffectAsync(async () => {
    if (!deviceId) {
      setEvents([]);
      setTrips([]);
      setStops([]);
      return;
    }
    const query = new URLSearchParams({
      deviceId,
      from: selectedDate.toISOString(),
      to: selectedDate.endOf('day').toISOString(),
    });
    setLoading(true);
    try {
      const [eventsResponse, tripsResponse, stopsResponse] = await Promise.all([
        fetchOrThrow(`/api/reports/events?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/stops?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
      ]);
      setEvents(await eventsResponse.json());
      setTrips(await tripsResponse.json());
      setStops(await stopsResponse.json());
    } finally {
      setLoading(false);
    }
  }, [deviceId, selectedDate]);

  const formatEventTitle = (event) =>
    formatNotificationTitle(t, {
      type: event.type,
      attributes: {
        alarms: event.attributes?.alarm,
      },
    });

  // Mescla eventos, viagens e paradas em uma linha do tempo única
  const timeline = useMemo(() => {
    const entries = [
      ...events
        // início/fim de viagem já são representados pelos cards de viagem
        .filter((event) => !['deviceMoving', 'deviceStopped'].includes(event.type))
        .map((event) => ({
          key: `event-${event.id}`,
          time: event.eventTime,
          icon: eventIcon(event.type),
          color: 'neutral',
          title: null,
          event,
        })),
      ...trips.map((trip) => ({
        key: `trip-${trip.startPositionId}`,
        time: trip.startTime,
        icon: <RouteIcon fontSize="small" />,
        color: 'primary',
        trip,
      })),
      ...stops.map((stop) => ({
        key: `stop-${stop.positionId}-${stop.startTime}`,
        time: stop.startTime,
        icon: <LocalParkingIcon fontSize="small" />,
        color: 'neutral',
        stop,
      })),
    ];
    return entries.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [events, trips, stops]);

  return (
    <div className={classes.root}>
      <Toolbar className={classes.toolbar} disableGutters>
        <IconButton edge="start" sx={{ ml: 1 }} onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Typography variant="h6" className={classes.title}>
          {t('timelineTitle')}
        </Typography>
      </Toolbar>
      <div className={classes.filters}>
        <FormControl fullWidth size="small">
          <InputLabel>{t('sharedDevice')}</InputLabel>
          <Select
            label={t('sharedDevice')}
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          >
            {deviceList.map((device) => (
              <MenuItem key={device.id} value={device.id}>
                {device.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <DateStrip selectedDate={selectedDate} onChange={setSelectedDate} />
      </div>
      {loading && <LinearProgress />}
      <div className={classes.list}>
        {!loading && timeline.length === 0 && (
          <Typography className={classes.empty}>{t('sharedNoData')}</Typography>
        )}
        {timeline.map((entry) => (
          <div key={entry.key} className={classes.entry}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: entry.color === 'primary' ? 'primary.main' : 'neutral.main',
              }}
            >
              {entry.icon}
            </Avatar>
            <div className={classes.entryBody}>
              {entry.trip && (
                <>
                  <Typography className={classes.entryTitle}>
                    {t('reportTrips')}: {dayjs(entry.trip.startTime).format('HH:mm')}
                    {' — '}
                    {dayjs(entry.trip.endTime).format('HH:mm')}
                  </Typography>
                  <Typography className={classes.entryDetail}>
                    {formatDistance(entry.trip.distance, distanceUnit, t)}
                    {' · '}
                    {formatNumericHours(entry.trip.duration, t)}
                  </Typography>
                  {entry.trip.endAddress && (
                    <Typography className={classes.entryDetail}>
                      {entry.trip.endAddress}
                    </Typography>
                  )}
                </>
              )}
              {entry.stop && (
                <>
                  <Typography className={classes.entryTitle}>
                    {'Parada'}:{' '}
                    {dayjs(entry.stop.startTime).format('HH:mm')}
                    {' — '}
                    {dayjs(entry.stop.endTime).format('HH:mm')}
                  </Typography>
                  <Typography className={classes.entryDetail}>
                    {formatNumericHours(entry.stop.duration, t)}
                  </Typography>
                  {entry.stop.address && (
                    <Typography className={classes.entryDetail}>{entry.stop.address}</Typography>
                  )}
                </>
              )}
              {entry.event && (
                <Typography className={classes.entryTitle}>
                  {formatEventTitle(entry.event)}
                </Typography>
              )}
            </div>
            <Typography className={classes.entryTime}>
              {dayjs(entry.time).format('HH:mm')}
            </Typography>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelinePage;
