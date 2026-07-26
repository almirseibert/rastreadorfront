import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
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
import ViewLayout from '../common/components/ViewLayout';
import { filterDevicesByGroup } from '../common/util/deviceGroups';
import DateStrip from '../common/components/DateStrip';
import { useEffectAsync } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';
import MapView from '../map/core/MapView';
import MapGeofence from '../map/MapGeofence';
import MapMarkers from '../map/MapMarkers';
import MapCamera from '../map/MapCamera';
import MapScale from '../map/MapScale';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
    },
  },
  drawer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.up('sm')]: {
      width: theme.dimensions.drawerWidthDesktop,
    },
    [theme.breakpoints.down('sm')]: {
      height: '55%',
    },
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
  entryClickable: {
    cursor: 'pointer',
    borderRadius: 8,
    marginLeft: theme.spacing(-1),
    marginRight: theme.spacing(-1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  entrySelected: {
    backgroundColor: theme.palette.action.selected,
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
  mapContainer: {
    flexGrow: 1,
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

const validCoordinate = (latitude, longitude) =>
  Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);

const TimelinePage = () => {
  const { classes, cx } = useStyles();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const groups = useSelector((state) => state.groups.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const distanceUnit = useAttributePreference('distanceUnit');

  const { selectedGroup } = useOutletContext();

  const deviceList = useMemo(
    () => filterDevicesByGroup(devices, groups, selectedGroup),
    [devices, groups, selectedGroup],
  );

  const [deviceId, setDeviceId] = useState(selectedDeviceId || deviceList[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));

  useEffect(() => {
    if (deviceId && !deviceList.some((device) => device.id === deviceId)) {
      setDeviceId(deviceList[0]?.id || '');
    }
  }, [deviceList, deviceId]);
  const [events, setEvents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [eventPositions, setEventPositions] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffectAsync(async () => {
    setSelectedKey(null);
    setEventPositions({});
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
      const loadedEvents = await eventsResponse.json();
      setEvents(loadedEvents);
      setTrips(await tripsResponse.json());
      setStops(await stopsResponse.json());

      // Eventos só trazem positionId; busca as posições para poder marcá-los no mapa.
      const positionIds = [
        ...new Set(loadedEvents.map((event) => event.positionId).filter(Boolean)),
      ];
      if (positionIds.length) {
        const positionsQuery = new URLSearchParams();
        positionIds.forEach((id) => positionsQuery.append('id', id));
        const positionsResponse = await fetchOrThrow(`/api/positions?${positionsQuery.toString()}`);
        const positions = await positionsResponse.json();
        const byId = {};
        positions.forEach((position) => {
          byId[position.id] = { latitude: position.latitude, longitude: position.longitude };
        });
        setEventPositions(byId);
      }
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

  // Mescla eventos, viagens e paradas numa linha do tempo única, cada entrada com a
  // coordenada e a imagem de marcador para exibição no mapa quando selecionada.
  const timeline = useMemo(() => {
    const entries = [
      ...events
        // início/fim de viagem já são representados pelos cards de viagem
        .filter((event) => !['deviceMoving', 'deviceStopped'].includes(event.type))
        .map((event) => {
          const position = eventPositions[event.positionId];
          return {
            key: `event-${event.id}`,
            time: event.eventTime,
            icon: eventIcon(event.type),
            color: 'neutral',
            markerImage: 'default-info',
            coordinate:
              position && validCoordinate(position.latitude, position.longitude) ? position : null,
            event,
          };
        }),
      ...trips.map((trip) => ({
        key: `trip-${trip.startPositionId}`,
        time: trip.startTime,
        icon: <RouteIcon fontSize="small" />,
        color: 'primary',
        markerImage: 'start-success',
        coordinate: validCoordinate(trip.startLat, trip.startLon)
          ? { latitude: trip.startLat, longitude: trip.startLon }
          : null,
        trip,
      })),
      ...stops.map((stop) => ({
        key: `stop-${stop.positionId}-${stop.startTime}`,
        time: stop.startTime,
        icon: <LocalParkingIcon fontSize="small" />,
        color: 'neutral',
        markerImage: 'default-neutral',
        coordinate: validCoordinate(stop.latitude, stop.longitude)
          ? { latitude: stop.latitude, longitude: stop.longitude }
          : null,
        stop,
      })),
    ];
    return entries.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [events, trips, stops, eventPositions]);

  const selectedEntry = timeline.find((entry) => entry.key === selectedKey);

  const handleSelect = (entry) => {
    if (!entry.coordinate) {
      return;
    }
    setSelectedKey((current) => (current === entry.key ? null : entry.key));
  };

  return (
    <ViewLayout title="timelineTitle">
      <div className={classes.root}>
        <div className={classes.content}>
          <div className={classes.drawer}>
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
                <div
                  key={entry.key}
                  className={cx(
                    classes.entry,
                    entry.coordinate && classes.entryClickable,
                    entry.key === selectedKey && classes.entrySelected,
                  )}
                  onClick={() => handleSelect(entry)}
                >
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
                          {'Parada'}: {dayjs(entry.stop.startTime).format('HH:mm')}
                          {' — '}
                          {dayjs(entry.stop.endTime).format('HH:mm')}
                        </Typography>
                        <Typography className={classes.entryDetail}>
                          {formatNumericHours(entry.stop.duration, t)}
                        </Typography>
                        {entry.stop.address && (
                          <Typography className={classes.entryDetail}>
                            {entry.stop.address}
                          </Typography>
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
          <div className={classes.mapContainer}>
            <MapView>
              <MapGeofence />
              {selectedEntry?.coordinate && (
                <MapMarkers
                  markers={[
                    {
                      latitude: selectedEntry.coordinate.latitude,
                      longitude: selectedEntry.coordinate.longitude,
                      image: selectedEntry.markerImage,
                      title: dayjs(selectedEntry.time).format('HH:mm'),
                    },
                  ]}
                  showTitles
                />
              )}
              {selectedEntry?.coordinate && (
                <MapCamera
                  latitude={selectedEntry.coordinate.latitude}
                  longitude={selectedEntry.coordinate.longitude}
                />
              )}
            </MapView>
            <MapScale />
          </div>
        </div>
      </div>
    </ViewLayout>
  );
};

export default TimelinePage;
