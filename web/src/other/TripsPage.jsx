import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import RouteIcon from '@mui/icons-material/Route';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import dayjs from 'dayjs';
import {
  formatDistance,
  formatSpeed,
  formatNumericHours,
  formatVolume,
} from '../common/util/formatter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import ViewLayout from '../common/components/ViewLayout';
import { filterDevicesByGroup } from '../common/util/deviceGroups';
import { useEffectAsync } from '../reactHelper';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapMarkers from '../map/MapMarkers';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import MapScale from '../map/MapScale';
import AddressValue from '../common/components/AddressValue';
import DateStrip from '../common/components/DateStrip';
import fetchOrThrow from '../common/util/fetchOrThrow';

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
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    padding: theme.spacing(1, 2),
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
  },
  list: {
    flexGrow: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 2, 2),
  },
  card: {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    cursor: 'pointer',
    flexShrink: 0,
  },
  cardSelected: {
    border: `1px solid ${theme.palette.primary.main}`,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  tripIcon: {
    color: theme.palette.primary.main,
  },
  stopIcon: {
    color: theme.palette.neutral.main,
  },
  metrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
  },
  metricValue: {
    color: theme.palette.text.primary,
    fontWeight: 'bold',
  },
  addresses: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  addressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
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

const TripsPage = () => {
  const { classes, cx } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const groups = useSelector((state) => state.groups.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  const { selectedGroup } = useOutletContext();

  const deviceList = useMemo(
    () => filterDevicesByGroup(devices, groups, selectedGroup),
    [devices, groups, selectedGroup],
  );

  const [deviceId, setDeviceId] = useState(selectedDeviceId || deviceList[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'));

  // Se a empresa selecionada mudar e o dispositivo atual não pertencer a ela, escolhe o primeiro
  useEffect(() => {
    if (deviceId && !deviceList.some((device) => device.id === deviceId)) {
      setDeviceId(deviceList[0]?.id || '');
    }
  }, [deviceList, deviceId]);
  const [trips, setTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [route, setRoute] = useState(null);

  useEffectAsync(async () => {
    setSelectedTrip(null);
    setRoute(null);
    if (!deviceId) {
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
      const [tripsResponse, stopsResponse] = await Promise.all([
        fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
        fetchOrThrow(`/api/reports/stops?${query.toString()}`, {
          headers: { Accept: 'application/json' },
        }),
      ]);
      setTrips(await tripsResponse.json());
      setStops(await stopsResponse.json());
    } finally {
      setLoading(false);
    }
  }, [deviceId, selectedDate]);

  useEffectAsync(async () => {
    if (selectedTrip) {
      const query = new URLSearchParams({
        deviceId: selectedTrip.deviceId,
        from: selectedTrip.startTime,
        to: selectedTrip.endTime,
      });
      const response = await fetchOrThrow(`/api/reports/route?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setRoute(await response.json());
    } else {
      setRoute(null);
    }
  }, [selectedTrip]);

  const navigateToReplay = (trip) => {
    navigate({
      pathname: '/replay',
      search: new URLSearchParams({
        from: trip.startTime,
        to: trip.endTime,
        deviceId: trip.deviceId,
      }).toString(),
    });
  };

  // Mescla viagens e paradas em ordem cronológica
  const timeline = useMemo(() => {
    const entries = [
      ...trips.map((item) => ({ type: 'trip', time: item.startTime, item })),
      ...stops.map((item) => ({ type: 'stop', time: item.startTime, item })),
    ];
    return entries.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [trips, stops]);

  const totalDistance = trips.reduce((sum, item) => sum + (item.distance || 0), 0);
  const totalDuration = trips.reduce((sum, item) => sum + (item.duration || 0), 0);

  const createMarkers = () => [
    {
      latitude: selectedTrip.startLat,
      longitude: selectedTrip.startLon,
      image: 'start-success',
    },
    {
      latitude: selectedTrip.endLat,
      longitude: selectedTrip.endLon,
      image: 'finish-error',
    },
  ];

  return (
    <ViewLayout title="reportTrips">
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
            {timeline.length > 0 && (
              <div className={classes.summary}>
                <span>
                  {t('reportTrips')}: <span className={classes.metricValue}>{trips.length}</span>
                </span>
                <span>
                  {t('sharedDistance')}:{' '}
                  <span className={classes.metricValue}>
                    {formatDistance(totalDistance, distanceUnit, t)}
                  </span>
                </span>
                <span>
                  {t('reportDuration')}:{' '}
                  <span className={classes.metricValue}>
                    {formatNumericHours(totalDuration, t)}
                  </span>
                </span>
              </div>
            )}
            <div className={classes.list}>
              {!loading && timeline.length === 0 && (
                <Typography className={classes.empty}>{t('sharedNoData')}</Typography>
              )}
              {timeline.map((entry) =>
                entry.type === 'trip' ? (
                  <Card
                    key={`trip-${entry.item.startPositionId}`}
                    elevation={0}
                    className={cx(
                      classes.card,
                      selectedTrip === entry.item && classes.cardSelected,
                    )}
                    onClick={() =>
                      setSelectedTrip((current) => (current === entry.item ? null : entry.item))
                    }
                  >
                    <CardContent>
                      <Box className={classes.cardHeader}>
                        <Box className={classes.cardTitle}>
                          <RouteIcon className={classes.tripIcon} fontSize="small" />
                          <span>
                            {dayjs(entry.item.startTime).format('HH:mm')}
                            {' — '}
                            {dayjs(entry.item.endTime).format('HH:mm')}
                          </span>
                        </Box>
                        <Tooltip title={t('reportReplay')}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToReplay(entry.item);
                            }}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box className={classes.metrics}>
                        <span>
                          {t('sharedDistance')}:{' '}
                          <span className={classes.metricValue}>
                            {formatDistance(entry.item.distance, distanceUnit, t)}
                          </span>
                        </span>
                        <span>
                          {t('reportDuration')}:{' '}
                          <span className={classes.metricValue}>
                            {formatNumericHours(entry.item.duration, t)}
                          </span>
                        </span>
                        {entry.item.averageSpeed > 0 && (
                          <span>
                            {t('reportAverageSpeed')}:{' '}
                            <span className={classes.metricValue}>
                              {formatSpeed(entry.item.averageSpeed, speedUnit, t)}
                            </span>
                          </span>
                        )}
                        {entry.item.maxSpeed > 0 && (
                          <span>
                            {t('reportMaximumSpeed')}:{' '}
                            <span className={classes.metricValue}>
                              {formatSpeed(entry.item.maxSpeed, speedUnit, t)}
                            </span>
                          </span>
                        )}
                        {entry.item.spentFuel > 0 && (
                          <span>
                            {t('reportSpentFuel')}:{' '}
                            <span className={classes.metricValue}>
                              {formatVolume(entry.item.spentFuel, volumeUnit, t)}
                            </span>
                          </span>
                        )}
                      </Box>
                      <Box className={classes.addresses}>
                        <span className={classes.addressRow}>
                          <AddressValue
                            latitude={entry.item.startLat}
                            longitude={entry.item.startLon}
                            originalAddress={entry.item.startAddress}
                          />
                        </span>
                        <span className={classes.addressRow}>
                          <ArrowForwardIcon sx={{ fontSize: '0.75rem' }} />
                          <AddressValue
                            latitude={entry.item.endLat}
                            longitude={entry.item.endLon}
                            originalAddress={entry.item.endAddress}
                          />
                        </span>
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Card
                    key={`stop-${entry.item.positionId}-${entry.item.startTime}`}
                    elevation={0}
                    className={classes.card}
                  >
                    <CardContent>
                      <Box className={classes.cardHeader}>
                        <Box className={classes.cardTitle}>
                          <LocalParkingIcon className={classes.stopIcon} fontSize="small" />
                          <span>
                            {dayjs(entry.item.startTime).format('HH:mm')}
                            {' — '}
                            {dayjs(entry.item.endTime).format('HH:mm')}
                          </span>
                        </Box>
                      </Box>
                      <Box className={classes.metrics}>
                        <span>
                          {t('reportDuration')}:{' '}
                          <span className={classes.metricValue}>
                            {formatNumericHours(entry.item.duration, t)}
                          </span>
                        </span>
                      </Box>
                      <Box className={classes.addresses}>
                        <span className={classes.addressRow}>
                          <AddressValue
                            latitude={entry.item.latitude}
                            longitude={entry.item.longitude}
                            originalAddress={entry.item.address}
                          />
                        </span>
                      </Box>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </div>
          <div className={classes.mapContainer}>
            <MapView>
              <MapGeofence />
              {route && (
                <>
                  <MapRoutePath positions={route} />
                  <MapMarkers markers={createMarkers()} />
                  <MapCamera positions={route} />
                </>
              )}
            </MapView>
            <MapScale />
          </div>
        </div>
      </div>
    </ViewLayout>
  );
};

export default TripsPage;
