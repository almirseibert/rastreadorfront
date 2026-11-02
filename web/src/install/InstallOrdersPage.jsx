import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chip,
  Fab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { makeStyles } from 'tss-react/mui';
import ViewLayout from '../common/components/ViewLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useEffectAsync } from '../reactHelper';
import argosFetch from '../common/util/argosApi';
import TableShimmer from '../common/components/TableShimmer';
import { formatTime } from '../common/util/formatter';
import OrderStatusChip from './components/OrderStatusChip';
import useAccess from '../common/util/useAccess';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    overflow: 'auto',
    padding: theme.spacing(2),
  },
  intro: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderRadius: theme.dimensions.radiusCard,
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(2)})`,
    },
  },
  row: {
    cursor: 'pointer',
  },
}));

// Tela do instalador: as ordens dele, com atalho para abrir uma nova instalação.
const InstallOrdersPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();

  const { canEdit } = useAccess();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const result = await argosFetch('orders?limit=100');
      setItems(result.items || []);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  return (
    <ViewLayout title="installTitle">
      <div className={classes.root}>
        <Paper className={classes.intro} elevation={0}>
          <Typography variant="subtitle1">{t('installTitle')}</Typography>
          <Typography variant="body2" color="textSecondary">
            {t('installHint')}
          </Typography>
        </Paper>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('installOrderCode')}</TableCell>
              <TableCell>{t('deviceIdentifier')}</TableCell>
              <TableCell>{t('installVehiclePlate')}</TableCell>
              <TableCell>{t('deviceStatus')}</TableCell>
              <TableCell>{t('sharedDate')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!loading ? (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  className={classes.row}
                  onClick={() => navigate(`/install/order/${item.id}`)}
                >
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.device_unique_id || '—'}</TableCell>
                  <TableCell>
                    {item.vehicle_plate ? (
                      <Chip size="small" variant="outlined" label={item.vehicle_plate} />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <OrderStatusChip status={item.status} />
                  </TableCell>
                  <TableCell>{formatTime(item.created_at, 'minutes')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableShimmer columns={5} />
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>{t('sharedNoData')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {canEdit('install') && (
          <div className={classes.fab}>
            <Fab size="medium" color="primary" onClick={() => navigate('/install/order')}>
              <AddIcon />
            </Fab>
          </div>
        )}
      </div>
    </ViewLayout>
  );
};

export default InstallOrdersPage;
