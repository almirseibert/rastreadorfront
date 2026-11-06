import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';
import deviceCategories from '../../common/util/deviceCategories';
import { prefixString } from '../../common/util/stringUtils';
import { devicesActions } from '../../store';
import UniqueIdScanner from '../components/UniqueIdScanner';

const useStyles = makeStyles()((theme) => ({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  row: {
    display: 'flex',
    gap: theme.spacing(1),
    alignItems: 'flex-start',
  },
}));

// Passo 1 — identificação: encontra o rastreador pelo IMEI (digitado ou lido pela câmera),
// cria o dispositivo no Traccar quando ele ainda não existe e vincula ao cliente.
const StepDevice = ({ order, onPatch, disabled }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const dispatch = useDispatch();

  const groups = useSelector((state) => state.groups.items);
  const groupList = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

  const [uniqueId, setUniqueId] = useState(order?.device_unique_id || '');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [device, setDevice] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('car');
  const [users, setUsers] = useState([]);

  const categoryOptions = deviceCategories
    .map((it) => ({ id: it, name: t(prefixString('category', it)) || it }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Aceita o valor explícito para o scanner não depender do estado já atualizado.
  const handleLookup = useCatchCallback(
    async (explicit) => {
      const value = String(explicit ?? uniqueId).trim();
      if (!value) {
        return;
      }
      setNotFound(false);
      const response = await fetchOrThrow(`/api/devices?uniqueId=${encodeURIComponent(value)}`);
      const items = await response.json();
      if (items.length) {
        setDevice(items[0]);
        onPatch({ deviceId: items[0].id, deviceUniqueId: items[0].uniqueId });
      } else {
        setDevice(null);
        setNotFound(true);
        onPatch({ deviceUniqueId: value });
      }
    },
    [uniqueId, onPatch],
  );

  const handleCreate = useCatchCallback(async () => {
    const response = await fetchOrThrow('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim() || uniqueId.trim(),
        uniqueId: uniqueId.trim(),
        category,
        model: order?.tracker_model || undefined,
        phone: order?.sim_number || undefined,
        groupId: order?.customer_group_id || 0,
        attributes: {},
      }),
    });
    const created = await response.json();
    dispatch(devicesActions.update([created]));
    setDevice(created);
    setNotFound(false);
    onPatch({
      deviceId: created.id,
      deviceUniqueId: created.uniqueId,
      equipmentCategory: category,
    });
  }, [name, uniqueId, category, order, dispatch, onPatch]);

  // Vincular o cliente ao dispositivo é a mesma sequência do assistente de empresas.
  const handleLinkCustomer = useCatchCallback(
    async (userId) => {
      onPatch({ customerUserId: userId || null });
      if (userId && order?.device_id) {
        await fetchOrThrow('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, deviceId: order.device_id }),
        });
      }
    },
    [order, onPatch],
  );

  const loadUsers = useCatchCallback(async () => {
    if (users.length) {
      return;
    }
    const response = await fetchOrThrow('/api/users?excludeAttributes=true');
    setUsers(await response.json());
  }, [users]);

  return (
    <div className={classes.form}>
      <div className={classes.row}>
        <TextField
          label={t('deviceIdentifier')}
          value={uniqueId}
          onChange={(e) => setUniqueId(e.target.value)}
          onBlur={() => handleLookup()}
          inputProps={{ inputMode: 'numeric' }}
          disabled={disabled}
          fullWidth
          autoFocus
        />
        <Tooltip title={t('installScan')}>
          <IconButton onClick={() => setScannerOpen(true)} disabled={disabled}>
            <QrCodeScannerIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('sharedSearch')}>
          <IconButton onClick={() => handleLookup()} disabled={disabled || !uniqueId.trim()}>
            <SearchIcon />
          </IconButton>
        </Tooltip>
      </div>

      {device && (
        <Alert severity="success">
          {t('installDeviceFound')}: <strong>{device.name}</strong>{' '}
          {device.groupId ? <Chip size="small" label={groups[device.groupId]?.name} /> : null}
        </Alert>
      )}

      {notFound && (
        <Alert
          severity="info"
          action={
            <Button size="small" onClick={handleCreate} disabled={disabled}>
              {t('installDeviceCreate')}
            </Button>
          }
        >
          {t('installDeviceNotFound')}
        </Alert>
      )}

      {notFound && (
        <>
          <TextField
            label={t('sharedName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={uniqueId}
            disabled={disabled}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>{t('deviceCategory')}</InputLabel>
            <Select
              label={t('deviceCategory')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={disabled}
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}

      <TextField
        label={t('installTrackerModel')}
        value={order?.tracker_model || ''}
        onChange={(e) => onPatch({ trackerModel: e.target.value }, true)}
        onBlur={(e) => onPatch({ trackerModel: e.target.value })}
        disabled={disabled}
        fullWidth
      />
      <div className={classes.row}>
        <TextField
          label={t('installSimCarrier')}
          value={order?.sim_carrier || ''}
          onChange={(e) => onPatch({ simCarrier: e.target.value }, true)}
          onBlur={(e) => onPatch({ simCarrier: e.target.value })}
          disabled={disabled}
          fullWidth
        />
        <TextField
          label={t('installSimNumber')}
          value={order?.sim_number || ''}
          onChange={(e) => onPatch({ simNumber: e.target.value }, true)}
          onBlur={(e) => onPatch({ simNumber: e.target.value })}
          disabled={disabled}
          fullWidth
        />
      </div>

      <FormControl fullWidth>
        <InputLabel>{t('installCustomerGroup')}</InputLabel>
        <Select
          label={t('installCustomerGroup')}
          value={order?.customer_group_id || ''}
          onChange={(e) => onPatch({ customerGroupId: e.target.value || null })}
          disabled={disabled}
        >
          <MenuItem value="">{t('groupNoGroup')}</MenuItem>
          {groupList.map((group) => (
            <MenuItem key={group.id} value={group.id}>
              {group.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Autocomplete
        options={users}
        onOpen={loadUsers}
        getOptionLabel={(user) => `${user.name} (${user.email})`}
        value={users.find((user) => user.id === order?.customer_user_id) || null}
        onChange={(_, value) => handleLinkCustomer(value?.id)}
        disabled={disabled}
        renderInput={(params) => <TextField {...params} label={t('installCustomer')} />}
      />

      <UniqueIdScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onResult={(value) => {
          setUniqueId(value);
          handleLookup(value);
        }}
      />
    </div>
  );
};

export default StepDevice;
