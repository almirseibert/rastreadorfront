import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  Tooltip,
  ListItemButton,
  Typography,
  Box,
  Avatar,
  Chip,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import EngineIcon from '../resources/images/data/engine.svg?react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions } from '../store';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAdministrator } from '../common/util/permissions';
import { useAttributePreference } from '../common/util/preferences';
import DriverValue from '../common/components/DriverValue';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  rowWrapper: {
    padding: theme.spacing(0.5, 1),
    height: '100%',
  },
  card: {
    height: '100%',
    padding: 0,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    overflow: 'hidden',
  },
  cardSelected: {
    border: `1px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.action.selected,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    padding: theme.spacing(1, 1.5),
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(0.5),
  },
  vehicleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minWidth: 0,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  title: {
    fontWeight: 'bold',
    color: theme.palette.text.primary,
    fontSize: '0.85rem',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.2,
    marginTop: '2px',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: theme.spacing(0.5),
  },
  statusChip: {
    height: 20,
    fontSize: '0.65rem',
    fontWeight: 'bold',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    fontSize: '0.70rem',
    color: theme.palette.text.secondary,
    marginTop: '4px',
  },
  iconSmall: {
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
  },
  speed: {
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  success: { color: theme.palette.success.main },
  neutral: { color: theme.palette.neutral.main },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes, cx, theme } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');

  const speed = position ? (position.speed * 1.852).toFixed(0) : 0;
  const address = position?.address || '';
  const updateTime = item.lastUpdate ? dayjs(item.lastUpdate).format('DD/MM/YYYY HH:mm:ss') : t('deviceStatusUnknown');
  const driverUniqueId = position?.attributes?.driverUniqueId;

  const moving = item.status === 'online' && Boolean(position?.attributes?.motion);

  // Cor e rótulo de status estilo Ruhavik
  let statusColor;
  let statusLabel;
  if (item.status === 'online') {
    statusColor = moving ? theme.palette.success.main : theme.palette.primary.main;
    statusLabel = moving ? t('eventDeviceMoving') : t('deviceStatusOnline');
  } else if (item.status === 'offline') {
    statusColor = theme.palette.error.main;
    statusLabel = t('deviceStatusOffline');
  } else {
    statusColor = theme.palette.neutral.main;
    statusLabel = t('deviceStatusUnknown');
  }
  const relative = item.lastUpdate ? dayjs().to(item.lastUpdate) : null;

  return (
    <div style={style}>
      <div className={classes.rowWrapper}>
        <ListItemButton
          key={item.id}
          onClick={() => dispatch(devicesActions.selectId(item.id))}
          disabled={!admin && item.disabled}
          selected={selectedDeviceId === item.id}
          className={cx(classes.card, selectedDeviceId === item.id && classes.cardSelected)}
        >
          <Box className={classes.container}>

            {/* Linha 1: Avatar de status, Placa/Nome e Chip de status */}
            <Box className={classes.topRow}>
              <Box className={classes.vehicleInfo}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: statusColor }}>
                  <LocalShippingIcon fontSize="small" />
                </Avatar>
                <Box className={classes.titleBlock}>
                  <Typography className={classes.title}>{item[devicePrimary]}</Typography>
                  <Typography className={classes.subtitle}>{item.uniqueId}</Typography>
                </Box>
              </Box>

              <Box className={classes.controls}>
                <Tooltip title={relative || ''}>
                  <Chip
                    size="small"
                    label={statusLabel}
                    className={classes.statusChip}
                    sx={{ backgroundColor: statusColor, color: theme.palette.common.white }}
                  />
                </Tooltip>
                {position && position.attributes.hasOwnProperty('ignition') && (
                  <Tooltip title={`${t('positionIgnition')}: ${formatBoolean(position.attributes.ignition, t)}`}>
                    <Box>
                      {position.attributes.ignition ? (
                        <EngineIcon width={16} height={16} className={classes.success} />
                      ) : (
                        <EngineIcon width={16} height={16} className={classes.neutral} />
                      )}
                    </Box>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {/* Linha 2: Data/Hora e Velocidade */}
            <Box display="flex" gap={2}>
              <Typography variant="body2" className={classes.infoRow}>
                <AccessTimeIcon className={classes.iconSmall} />
                {updateTime}
              </Typography>
              {position && (
                <Typography variant="body2" className={classes.infoRow}>
                  <SpeedIcon className={classes.iconSmall} />
                  <span className={classes.speed}>{speed} km/h</span>
                </Typography>
              )}
            </Box>

            {/* Linha 3: Motorista */}
            <Typography variant="body2" className={classes.infoRow}>
              <PersonIcon className={classes.iconSmall} />
              {driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : 'Motorista não identificado'}
            </Typography>

            {/* Linha 4: Endereço */}
            {address && (
              <Typography
                variant="body2"
                className={classes.infoRow}
                sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <LocationOnIcon className={classes.iconSmall} />
                {address}
              </Typography>
            )}

          </Box>
        </ListItemButton>
      </div>
    </div>
  );
};

export default DeviceRow;
