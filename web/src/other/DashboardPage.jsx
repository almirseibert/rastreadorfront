import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Toolbar,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import dayjs from 'dayjs';
import { formatDistance, formatNumericHours, formatSpeed } from '../common/util/formatter';
import {
  distanceFromMeters,
  speedFromKnots,
  distanceUnitString,
  speedUnitString,
} from '../common/util/converter';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslation } from '../common/components/LocalizationProvider';
import BackIcon from '../common/components/BackIcon';
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
  periods: {
    display: 'flex',
    gap: theme.spacing(0.5),
    flexWrap: 'wrap',
  },
  content: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  kpis: {
    display: 'grid',
    gap: theme.spacing(2),
    gridTemplateColumns: 'repeat(4, 1fr)',
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  kpiCard: {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
  },
  kpiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  kpiValue: {
    fontWeight: 'bold',
    fontSize: '1.25rem',
    marginTop: theme.spacing(0.5),
  },
  chartCard: {
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
  },
  chartTitle: {
    fontWeight: 'bold',
    fontSize: '0.9rem',
    marginBottom: theme.spacing(2),
  },
  chartBox: {
    width: '100%',
    height: 260,
  },
  empty: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));

const periods = [
  { key: 'week', label: '7 dias', days: 7 },
  { key: 'month', label: '30 dias', days: 30 },
];

const KpiCard = ({ icon, label, value }) => {
  const { classes } = useStyles();
  return (
    <Card elevation={0} className={classes.kpiCard}>
      <CardContent>
        <Box className={classes.kpiHeader}>
          {icon}
          <span>{label}</span>
        </Box>
        <Typography className={classes.kpiValue}>{value}</Typography>
      </CardContent>
    </Card>
  );
};

const ChartCard = ({ title, children }) => {
  const { classes } = useStyles();
  return (
    <Card elevation={0} className={classes.chartCard}>
      <CardContent>
        <Typography className={classes.chartTitle}>{title}</Typography>
        <Box className={classes.chartBox}>
          <ResponsiveContainer>{children}</ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const DashboardPage = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);

  const distanceUnit = useAttributePreference('distanceUnit');
  const speedUnit = useAttributePreference('speedUnit');

  const deviceList = useMemo(
    () => Object.values(devices).sort((a, b) => a.name.localeCompare(b.name)),
    [devices],
  );

  const [period, setPeriod] = useState('week');
  const [deviceId, setDeviceId] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const days = periods.find((it) => it.key === period).days;

  useEffectAsync(async () => {
    const selectedIds =
      deviceId === 'all' ? deviceList.map((device) => device.id) : [Number(deviceId)];
    if (!selectedIds.length) {
      setItems([]);
      return;
    }
    const query = new URLSearchParams({
      from: dayjs()
        .startOf('day')
        .subtract(days - 1, 'day')
        .toISOString(),
      to: dayjs().endOf('day').toISOString(),
      daily: true,
    });
    selectedIds.forEach((id) => query.append('deviceId', id));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  }, [deviceId, days, deviceList.length]);

  // Série diária: um ponto por dia do período, mesmo sem dados (evita buracos no gráfico)
  const dailySeries = useMemo(() => {
    const buckets = new Map();
    Array.from({ length: days }, (_, i) =>
      dayjs()
        .startOf('day')
        .subtract(days - 1 - i, 'day'),
    ).forEach((date) => {
      buckets.set(date.format('YYYY-MM-DD'), {
        date: date.format('DD/MM'),
        distance: 0,
        engineHours: 0,
        maxSpeed: 0,
      });
    });
    items.forEach((item) => {
      const key = dayjs(item.startTime).format('YYYY-MM-DD');
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.distance += distanceFromMeters(item.distance || 0, distanceUnit);
        bucket.engineHours += (item.engineHours || 0) / 3600000;
        bucket.maxSpeed = Math.max(bucket.maxSpeed, speedFromKnots(item.maxSpeed || 0, speedUnit));
      }
    });
    return Array.from(buckets.values()).map((bucket) => ({
      ...bucket,
      distance: Number(bucket.distance.toFixed(1)),
      engineHours: Number(bucket.engineHours.toFixed(1)),
      maxSpeed: Number(bucket.maxSpeed.toFixed(1)),
    }));
  }, [items, days, distanceUnit, speedUnit]);

  // Ranking de veículos por distância no período
  const ranking = useMemo(() => {
    const totals = new Map();
    items.forEach((item) => {
      const current = totals.get(item.deviceId) || 0;
      totals.set(item.deviceId, current + (item.distance || 0));
    });
    return Array.from(totals.entries())
      .map(([id, distance]) => ({
        name: devices[id]?.name || `#${id}`,
        distance: Number(distanceFromMeters(distance, distanceUnit).toFixed(1)),
      }))
      .filter((entry) => entry.distance > 0)
      .sort((a, b) => b.distance - a.distance)
      .slice(0, 10);
  }, [items, devices, distanceUnit]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          distance: acc.distance + (item.distance || 0),
          engineHours: acc.engineHours + (item.engineHours || 0),
          maxSpeed: Math.max(acc.maxSpeed, item.maxSpeed || 0),
          activeDevices:
            item.distance > 0 ? acc.activeDevices.add(item.deviceId) : acc.activeDevices,
        }),
        { distance: 0, engineHours: 0, maxSpeed: 0, activeDevices: new Set() },
      ),
    [items],
  );

  const hasEngineHours = dailySeries.some((entry) => entry.engineHours > 0);
  const hasData = items.length > 0;

  const axisProps = {
    stroke: theme.palette.text.secondary,
    tick: { fontSize: 11 },
  };
  const tooltipProps = {
    contentStyle: {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      color: theme.palette.text.primary,
      fontSize: '0.8rem',
    },
  };

  return (
    <div className={classes.root}>
      <Toolbar className={classes.toolbar} disableGutters>
        <IconButton edge="start" sx={{ ml: 1 }} onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Typography variant="h6" className={classes.title}>
          {t('dashboardTitle')}
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
            <MenuItem value="all">{t('dashboardAllDevices')}</MenuItem>
            {deviceList.map((device) => (
              <MenuItem key={device.id} value={device.id}>
                {device.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div className={classes.periods}>
          {periods.map((item) => (
            <Chip
              key={item.key}
              size="small"
              label={item.label}
              color={period === item.key ? 'primary' : 'default'}
              variant={period === item.key ? 'filled' : 'outlined'}
              onClick={() => setPeriod(item.key)}
            />
          ))}
        </div>
      </div>
      {loading && <LinearProgress />}
      <div className={classes.content}>
        {!loading && !hasData && (
          <Typography className={classes.empty}>{t('sharedNoData')}</Typography>
        )}
        {hasData && (
          <>
            <div className={classes.kpis}>
              <KpiCard
                icon={<RouteIcon fontSize="small" />}
                label={t('sharedDistance')}
                value={formatDistance(totals.distance, distanceUnit, t)}
              />
              <KpiCard
                icon={<SpeedIcon fontSize="small" />}
                label={t('reportMaximumSpeed')}
                value={formatSpeed(totals.maxSpeed, speedUnit, t)}
              />
              <KpiCard
                icon={<TimerIcon fontSize="small" />}
                label={t('reportEngineHours')}
                value={formatNumericHours(totals.engineHours, t)}
              />
              <KpiCard
                icon={<DirectionsCarIcon fontSize="small" />}
                label={t('dashboardActiveDevices')}
                value={`${totals.activeDevices.size} / ${deviceList.length}`}
              />
            </div>

            <ChartCard
              title={`${t('dashboardDistancePerDay')} (${distanceUnitString(distanceUnit, t)})`}
            >
              <BarChart data={dailySeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  stroke={theme.palette.divider}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="date" {...axisProps} />
                <YAxis {...axisProps} />
                <ChartTooltip
                  {...tooltipProps}
                  formatter={(value) => [value, t('sharedDistance')]}
                />
                <Bar dataKey="distance" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title={`${t('reportMaximumSpeed')} (${speedUnitString(speedUnit, t)})`}>
              <LineChart data={dailySeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  stroke={theme.palette.divider}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="date" {...axisProps} />
                <YAxis {...axisProps} />
                <ChartTooltip
                  {...tooltipProps}
                  formatter={(value) => [value, t('reportMaximumSpeed')]}
                />
                <Line
                  type="monotone"
                  dataKey="maxSpeed"
                  stroke={theme.palette.error.main}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartCard>

            {hasEngineHours && (
              <ChartCard title={`${t('reportEngineHours')} (${t('sharedHourAbbreviation')})`}>
                <BarChart data={dailySeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    stroke={theme.palette.divider}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="date" {...axisProps} />
                  <YAxis {...axisProps} />
                  <ChartTooltip
                    {...tooltipProps}
                    formatter={(value) => [value, t('reportEngineHours')]}
                  />
                  <Bar
                    dataKey="engineHours"
                    fill={theme.palette.secondary.main}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartCard>
            )}

            {ranking.length > 1 && (
              <ChartCard
                title={`${t('dashboardRanking')} (${distanceUnitString(distanceUnit, t)})`}
              >
                <BarChart
                  data={ranking}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke={theme.palette.divider}
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="name" width={110} {...axisProps} />
                  <ChartTooltip
                    {...tooltipProps}
                    formatter={(value) => [value, t('sharedDistance')]}
                  />
                  <Bar dataKey="distance" radius={[0, 4, 4, 0]}>
                    {ranking.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={index === 0 ? theme.palette.success.main : theme.palette.primary.main}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartCard>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
