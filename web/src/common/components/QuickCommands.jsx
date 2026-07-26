import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import AddModeratorIcon from '@mui/icons-material/AddModerator';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModerator';
import { useTranslation } from './LocalizationProvider';
import { useRestriction } from '../util/permissions';
import { useCatchCallback, useEffectAsync } from '../../reactHelper';
import { snackBarDurationShortMs } from '../util/duration';
import { prefixString } from '../util/stringUtils';
import fetchOrThrow from '../util/fetchOrThrow';

const quickActions = [
  { type: 'engineStop', Icon: LockIcon, color: 'error', critical: true },
  { type: 'engineResume', Icon: LockOpenIcon, color: 'success', critical: true },
  { type: 'alarmArm', Icon: AddModeratorIcon, color: 'warning', critical: true },
  { type: 'alarmDisarm', Icon: RemoveModeratorIcon, color: 'info', critical: true },
  { type: 'positionSingle', Icon: MyLocationIcon, color: 'primary', critical: false },
];

const QuickCommands = ({ deviceId, disabled }) => {
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const limitCommands = useRestriction('limitCommands');

  const device = useSelector((state) => state.devices.items[deviceId]);

  const [available, setAvailable] = useState({});
  const [pending, setPending] = useState(null);
  const [sending, setSending] = useState(null);
  const [sent, setSent] = useState(false);

  useEffectAsync(async () => {
    setAvailable({});
    if (readonly) {
      return;
    }
    const savedResponse = await fetchOrThrow(`/api/commands/send?deviceId=${deviceId}`);
    const saved = await savedResponse.json();
    let types = [];
    if (!limitCommands) {
      const typesResponse = await fetchOrThrow(
        `/api/commands/types?${new URLSearchParams({ deviceId }).toString()}`,
      );
      types = await typesResponse.json();
    }
    const result = {};
    quickActions.forEach(({ type }) => {
      const savedCommand = saved.find((it) => it.type === type);
      if (savedCommand) {
        result[type] = { saved: savedCommand };
      } else if (types.some((it) => it.type === type)) {
        result[type] = { saved: null };
      }
    });
    setAvailable(result);
  }, [deviceId, readonly, limitCommands]);

  const sendCommand = useCatchCallback(
    async (type) => {
      setPending(null);
      setSending(type);
      try {
        const entry = available[type];
        const command = entry.saved ? { ...entry.saved } : { type, attributes: {} };
        command.deviceId = parseInt(deviceId, 10);
        await fetchOrThrow('/api/commands/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
        });
        setSent(true);
      } finally {
        setSending(null);
      }
    },
    [available, deviceId],
  );

  const handleClick = (action) => {
    if (action.critical) {
      setPending(action);
    } else {
      sendCommand(action.type);
    }
  };

  const actions = quickActions.filter(({ type }) => available[type]);
  if (!actions.length) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-evenly',
          borderTop: 1,
          borderColor: 'divider',
          px: 1,
        }}
      >
        {actions.map((action) => (
          <Tooltip key={action.type} title={t(prefixString('command', action.type))}>
            <span>
              <IconButton
                color={action.color}
                disabled={disabled || Boolean(sending)}
                onClick={() => handleClick(action)}
              >
                {sending === action.type ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <action.Icon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        ))}
      </Box>
      <Dialog open={Boolean(pending)} onClose={() => setPending(null)}>
        <DialogTitle>
          {pending && `${t(prefixString('command', pending.type))} — ${device?.name || ''}`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t('commandSendConfirm')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>{t('sharedCancel')}</Button>
          <Button
            color={pending?.color || 'primary'}
            variant="contained"
            onClick={() => sendCommand(pending.type)}
          >
            {t('commandSend')}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={sent}
        autoHideDuration={snackBarDurationShortMs}
        onClose={() => setSent(false)}
        message={t('commandSent')}
      />
    </>
  );
};

export default QuickCommands;
