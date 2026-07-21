import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from '../common/components/LocalizationProvider';
import SelectField from '../common/components/SelectField';
import { prefixString } from '../common/util/stringUtils';
import { geofencesActions, errorsActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';

// Fluxo guiado "criar cerca + ativar alerta de entrada/saída" em um passo só (estilo Ruhavik).
// Recebe a área desenhada no mapa; cria a geofence e, para cada alerta marcado, cria uma
// notificação geofenceEnter/geofenceExit vinculada a esta cerca (attributes.geofenceIds).
const GeofenceWizard = ({ area, onClose, onSaved }) => {
  const t = useTranslation();
  const dispatch = useDispatch();

  const [name, setName] = useState('');
  const [alertEnter, setAlertEnter] = useState(true);
  const [alertExit, setAlertExit] = useState(false);
  const [notificators, setNotificators] = useState('web');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(t('sharedGeofence'));
    setAlertEnter(true);
    setAlertExit(false);
    setNotificators('web');
    setSaving(false);
  }, [area]);

  const anyAlert = alertEnter || alertExit;
  const valid = name.trim() && (!anyAlert || notificators);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), area, attributes: {} }),
      });
      const geofence = await response.json();
      dispatch(geofencesActions.update([geofence]));

      const events = [];
      if (alertEnter) events.push('geofenceEnter');
      if (alertExit) events.push('geofenceExit');

      await Promise.all(
        events.map((type) =>
          fetchOrThrow('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              always: true,
              notificators,
              attributes: { geofenceIds: String(geofence.id) },
            }),
          }),
        ),
      );

      onSaved();
    } catch (error) {
      dispatch(errorsActions.push(error.message));
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(area)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('geofenceWizardTitle')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          label={t('sharedName')}
          fullWidth
        />
        <DialogContentText sx={{ fontSize: '0.85rem' }}>
          {t('geofenceWizardHint')}
        </DialogContentText>
        <FormGroup>
          <FormControlLabel
            control={(
              <Checkbox
                checked={alertEnter}
                onChange={(event) => setAlertEnter(event.target.checked)}
                icon={<LoginIcon />}
                checkedIcon={<LoginIcon />}
              />
            )}
            label={t('geofenceAlertEntry')}
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={alertExit}
                onChange={(event) => setAlertExit(event.target.checked)}
                icon={<LogoutIcon />}
                checkedIcon={<LogoutIcon />}
              />
            )}
            label={t('geofenceAlertExit')}
          />
        </FormGroup>
        {anyAlert && (
          <SelectField
            multiple
            value={notificators ? notificators.split(/[, ]+/) : []}
            onChange={(event) => setNotificators(event.target.value.join())}
            endpoint="/api/notifications/notificators"
            keyGetter={(it) => it.type}
            titleGetter={(it) => t(prefixString('notificator', it.type))}
            label={t('notificationNotificators')}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('sharedCancel')}</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={!valid || saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {t('sharedSave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GeofenceWizard;
