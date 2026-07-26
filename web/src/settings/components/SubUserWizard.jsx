import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Autocomplete,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';

// Assistente de sub-usuário de uma empresa (grupo): cria um usuário comum e concede
// acesso apenas ao subconjunto escolhido — a empresa inteira (grupo) ou dispositivos
// específicos dela. Best-effort: vincula o novo usuário ao(s) gestor(es) da empresa.
const SubUserWizard = ({ open, group, onClose, onCreated }) => {
  const t = useTranslation();

  const devices = useSelector((state) => state.devices.items);
  const groupDevices = useMemo(
    () =>
      Object.values(devices)
        .filter((device) => group && device.groupId === group.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [devices, group],
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wholeGroup, setWholeGroup] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setWholeGroup(true);
    setSelectedDevices([]);
  };

  const valid =
    name.trim() && email.trim() && password && (wholeGroup || selectedDevices.length > 0);

  const handleCreate = useCatchCallback(async () => {
    setSaving(true);
    try {
      // 1. Usuário comum (sem admin/userLimit): só enxerga o que for vinculado.
      const userResponse = await fetchOrThrow('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          attributes: {},
        }),
      });
      const user = await userResponse.json();

      // 2. Concede o subconjunto escolhido: a empresa inteira (grupo) ou dispositivos.
      const permissions = wholeGroup
        ? [{ userId: user.id, groupId: group.id }]
        : selectedDevices.map((device) => ({ userId: user.id, deviceId: device.id }));
      await Promise.all(
        permissions.map((body) =>
          fetchOrThrow('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        ),
      );

      // 3. Best-effort: deixa o(s) gestor(es) da empresa gerenciarem o sub-usuário.
      try {
        const managersResponse = await fetchOrThrow(
          `/api/users?groupId=${group.id}&excludeAttributes=true`,
        );
        const managers = (await managersResponse.json()).filter(
          (candidate) => candidate.userLimit !== 0 && candidate.id !== user.id,
        );
        await Promise.all(
          managers.map((manager) =>
            fetchOrThrow('/api/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: manager.id, managedUserId: user.id }),
            }),
          ),
        );
      } catch {
        // vínculo com o gestor é opcional; o sub-usuário já tem acesso ao que foi concedido.
      }

      reset();
      onCreated?.(user);
    } finally {
      setSaving(false);
    }
  }, [name, email, password, wholeGroup, selectedDevices, group, onCreated]);

  const handleClose = () => {
    reset();
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{`${t('companySubUser')}${group ? ` — ${group.name}` : ''}`}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={t('sharedName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          fullWidth
        />
        <TextField
          label={t('userEmail')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <TextField
          label={t('userPassword')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
        />
        <FormControlLabel
          control={
            <Checkbox checked={wholeGroup} onChange={(e) => setWholeGroup(e.target.checked)} />
          }
          label={t('companyGrantGroup')}
        />
        {!wholeGroup && (
          <Autocomplete
            multiple
            options={groupDevices}
            value={selectedDevices}
            onChange={(_, value) => setSelectedDevices(value)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            getOptionLabel={(device) => `${device.name} (${device.uniqueId})`}
            renderInput={(params) => <TextField {...params} label={t('deviceTitle')} />}
          />
        )}
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

export default SubUserWizard;
