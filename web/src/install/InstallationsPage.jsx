import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useSelector } from 'react-redux';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from '../settings/components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useEffectAsync } from '../reactHelper';
import argosFetch, { isUnavailable } from '../common/util/argosApi';
import TableShimmer from '../common/components/TableShimmer';
import { formatTime } from '../common/util/formatter';
import OrderStatusChip from './components/OrderStatusChip';
import ServiceUnavailable from './components/ServiceUnavailable';
import { STATUS } from './util/orderStatus';
import { statusLabelKey } from './util/orderStatus';

const useStyles = makeStyles()((theme) => ({
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    padding: theme.spacing(2),
  },
  filter: {
    minWidth: 160,
  },
  row: {
    cursor: 'pointer',
  },
}));

// Visão do administrador: todas as ordens de instalação, com filtros e acesso ao laudo.
const InstallationsPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();

  const groups = useSelector((state) => state.groups.items);
  const groupList = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

  const [status, setStatus] = useState('');
  const [groupId, setGroupId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (status) {
        params.set('status', status);
      }
      if (groupId) {
        params.set('customerGroupId', String(groupId));
      }
      if (keyword.trim()) {
        params.set('q', keyword.trim());
      }
      const result = await argosFetch(`orders?${params.toString()}`);
      setItems(result.items || []);
      setUnavailable(false);
    } catch (error) {
      if (!isUnavailable(error)) {
        throw error;
      }
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
    return null;
  }, [status, groupId, keyword]);

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'installOrders']}>
      <div className={classes.filters}>
        <FormControl className={classes.filter} size="small">
          <InputLabel>{t('deviceStatus')}</InputLabel>
          <Select
            label={t('deviceStatus')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="">{t('sharedAll') || '—'}</MenuItem>
            {Object.values(STATUS).map((value) => (
              <MenuItem key={value} value={value}>
                {t(statusLabelKey(value)) || value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl className={classes.filter} size="small">
          <InputLabel>{t('settingsGroups')}</InputLabel>
          <Select
            label={t('settingsGroups')}
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <MenuItem value="">{t('sharedAll') || '—'}</MenuItem>
            {groupList.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          className={classes.filter}
          size="small"
          label={t('sharedSearch')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {unavailable && <ServiceUnavailable />}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('installOrderCode')}</TableCell>
            <TableCell>{t('deviceIdentifier')}</TableCell>
            <TableCell>{t('installVehiclePlate')}</TableCell>
            <TableCell>{t('settingsGroups')}</TableCell>
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
                onClick={() => navigate(`/settings/installation/${item.id}`)}
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
                <TableCell>{groups[item.customer_group_id]?.name || '—'}</TableCell>
                <TableCell>
                  <OrderStatusChip status={item.status} />
                </TableCell>
                <TableCell>{formatTime(item.created_at, 'minutes')}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableShimmer columns={6} />
          )}
          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6}>{t('sharedNoData')}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </PageLayout>
  );
};

export default InstallationsPage;
