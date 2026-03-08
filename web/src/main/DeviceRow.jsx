import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  IconButton,
  Tooltip,
  ListItemButton,
  Typography,
  Box,
  Switch,
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
  selected: {
    backgroundColor: theme.palette.action.hover, // Fundo sutil ao selecionar, como no SigaSul
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
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  },
  iconWrapper: {
    backgroundColor: theme.palette.customColors?.primary || '#1976d2', // Fundo azul quadrado do SigaSul
    color: '#ffffff',
    borderRadius: '4px',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontWeight: 'bold',
    color: theme.palette.customColors?.primary || '#1976d2',
    fontSize: '0.85rem',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: theme.palette.text.secondary,
    lineHeight: 1.2,
    marginTop: '2px',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 0,
  },
  switchSmall: {
    transform: 'scale(0.7)',
    marginRight: '-10px',
    marginTop: '-5px',
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
  success: { color: theme.palette.success.main || '#28a745' },
  neutral: { color: theme.palette.neutral.main || '#6e6e6e' },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');

  // Lógicas SigaSul
  const speed = position ? (position.speed * 1.852).toFixed(0) : 0;
  const address = position?.address || '';
  const updateTime = item.lastUpdate ? dayjs(item.lastUpdate).format('DD/MM/YYYY HH:mm:ss') : t('deviceStatusUnknown');
  const driverUniqueId = position?.attributes?.driverUniqueId;

  return (
    <div style={style}>
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={selectedDeviceId === item.id ? classes.selected : null}
        sx={{ padding: 0, borderBottom: '1px solid #e0e0e0' }}
      >
        <Box className={classes.container}>
          
          {/* Linha 1: Ícone Quadrado, Placa/Nome e Controles (Switch/Ignição) */}
          <Box className={classes.topRow}>
            <Box className={classes.vehicleInfo}>
              <Box className={classes.iconWrapper}>
                <LocalShippingIcon fontSize="small" />
              </Box>
              <Box className={classes.titleBlock}>
                <Typography className={classes.title}>{item[devicePrimary]}</Typography>
                <Typography className={classes.subtitle}>{item.uniqueId}</Typography>
              </Box>
            </Box>
            
            <Box className={classes.controls}>
              <Switch size="small" defaultChecked color="primary" className={classes.switchSmall} />
              {position && position.attributes.hasOwnProperty('ignition') && (
                <Tooltip title={`${t('positionIgnition')}: ${formatBoolean(position.attributes.ignition, t)}`}>
                  <Box mt={0.5}>
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
  );
};

export default DeviceRow;