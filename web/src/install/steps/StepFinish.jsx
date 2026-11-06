import { useState } from 'react';
import { Alert, Button, Checkbox, Divider, FormControlLabel, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useCatchCallback } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';
import QuickCommands from '../../common/components/QuickCommands';
import SignaturePad from '../components/SignaturePad';
import { formatTime } from '../../common/util/formatter';
import { SIGNATURE_SLOT } from '../util/photoSlots';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
}));

// Passo 5 — testes finais: confirma que o rastreador já reportou posição, registra o teste
// de bloqueio (reusando os comandos rápidos) e colhe a assinatura do cliente.
const StepFinish = ({ order, photos, onPatch, uploadBlob, disabled }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const [position, setPosition] = useState(null);
  const [checking, setChecking] = useState(false);

  const signature = photos.find((photo) => photo.slot === SIGNATURE_SLOT);

  const handleCheckPosition = useCatchCallback(async () => {
    if (!order?.device_id) {
      return;
    }
    setChecking(true);
    try {
      const response = await fetchOrThrow(`/api/positions?deviceId=${order.device_id}`);
      const items = await response.json();
      if (items.length) {
        setPosition(items[0]);
        onPatch({ positionOk: true });
      } else {
        setPosition(false);
      }
    } finally {
      setChecking(false);
    }
  }, [order, onPatch]);

  return (
    <div className={classes.root}>
      <Typography variant="subtitle2">{t('installTestPosition')}</Typography>
      {order?.position_ok || position ? (
        <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />}>
          {t('installTestPositionOk')}
          {position
            ? ` — ${position.latitude?.toFixed(5)}, ${position.longitude?.toFixed(5)} (${formatTime(
                position.fixTime,
                'minutes',
              )})`
            : ''}
        </Alert>
      ) : (
        <Alert severity={position === false ? 'warning' : 'info'}>
          {position === false ? t('installTestPositionWaiting') : t('installTestPositionHint')}
        </Alert>
      )}
      <Button
        variant="outlined"
        onClick={handleCheckPosition}
        disabled={disabled || checking || !order?.device_id}
      >
        {t('installTestPositionCheck')}
      </Button>

      <Divider />

      <Typography variant="subtitle2">{t('installTestBlock')}</Typography>
      {order?.device_id ? (
        <QuickCommands deviceId={order.device_id} />
      ) : (
        <Typography variant="body2" color="textSecondary">
          {t('installDeviceRequired')}
        </Typography>
      )}
      <FormControlLabel
        control={
          <Checkbox
            checked={!!order?.block_test_ok}
            onChange={(e) => onPatch({ blockTestOk: e.target.checked })}
          />
        }
        label={t('installTestBlockOk')}
        disabled={disabled}
      />

      <Divider />

      {signature ? (
        <Alert severity="success">{t('installSignatureSaved')}</Alert>
      ) : (
        <SignaturePad disabled={disabled} onSave={(blob) => uploadBlob(blob, SIGNATURE_SLOT)} />
      )}
    </div>
  );
};

export default StepFinish;
