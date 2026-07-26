import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useCatchCallback } from '../../reactHelper';
import { devicesActions, groupsActions } from '../../store';
import fetchOrThrow from '../../common/util/fetchOrThrow';

// Assistente "Nova empresa": num único passo cria o gestor (usuário com userLimit),
// o grupo (empresa), vincula os dispositivos escolhidos ao grupo e liga o grupo ao gestor.
const CompanyWizard = ({ open, onClose, onCreated }) => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const devices = useSelector((state) => state.devices.items);
  const deviceList = useMemo(
    () => Object.values(devices).sort((a, b) => a.name.localeCompare(b.name)),
    [devices],
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setSelectedDevices([]);
  };

  const valid = name.trim() && email.trim() && password;

  const handleCreate = useCatchCallback(async () => {
    setSaving(true);
    try {
      // 1. Gestor da empresa (userLimit=-1 permite criar sub-usuários).
      const userResponse = await fetchOrThrow('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          userLimit: -1,
          deviceLimit: -1,
          attributes: {},
        }),
      });
      const user = await userResponse.json();

      // 2. Grupo que representa a empresa.
      const groupResponse = await fetchOrThrow('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), attributes: {} }),
      });
      const group = await groupResponse.json();

      // 3. Move os dispositivos escolhidos para o grupo.
      const updatedDevices = await Promise.all(
        selectedDevices.map(async (device) => {
          const response = await fetchOrThrow(`/api/devices/${device.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...device, groupId: group.id }),
          });
          return response.json();
        }),
      );

      // 4. Vincula o grupo ao gestor (dá acesso a toda a frota da empresa).
      await fetchOrThrow('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, groupId: group.id }),
      });

      // Atualiza a store para refletir na visão geral sem recarregar.
      const groupsResponse = await fetchOrThrow('/api/groups');
      dispatch(groupsActions.refresh(await groupsResponse.json()));
      if (updatedDevices.length) {
        dispatch(devicesActions.update(updatedDevices));
      }

      reset();
      onCreated?.(group);
    } finally {
      setSaving(false);
    }
  }, [name, email, password, selectedDevices, dispatch, onCreated]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('companyNew')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={t('sharedName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          fullWidth
        />
        <TextField
          label={`${t('companyManager')} — ${t('userEmail')}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <TextField
          label={`${t('companyManager')} — ${t('userPassword')}`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />
        <Autocomplete
          multiple
          options={deviceList}
          value={selectedDevices}
          onChange={(_, value) => setSelectedDevices(value)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          getOptionLabel={(device) => `${device.name} (${device.uniqueId})`}
          renderInput={(params) => <TextField {...params} label={t('deviceTitle')} />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('sharedCancel')}</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!valid || saving}>
          {t('sharedSave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompanyWizard;
