import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { makeStyles } from 'tss-react/mui';
import { useDispatch } from 'react-redux';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatch, useCatchCallback, useEffectAsync } from '../reactHelper';
import argosFetch, { argosUpload } from '../common/util/argosApi';
import usePersistedState from '../common/util/usePersistedState';
import { errorsActions } from '../store';
import compressImage from './util/compressImage';
import PHOTO_SLOTS from './util/photoSlots';
import { STATUS, isOpen } from './util/orderStatus';
import OrderStatusChip from './components/OrderStatusChip';
import PhotoSlot from './components/PhotoSlot';
import ChecklistItemField from './components/ChecklistItemField';
import StepDevice from './steps/StepDevice';
import StepEquipment from './steps/StepEquipment';
import StepFinish from './steps/StepFinish';

const useStyles = makeStyles()((theme) => ({
  page: {
    height: '100%',
    overflow: 'auto',
    backgroundColor: theme.palette.background.default,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontWeight: 500,
  },
  content: {
    padding: theme.spacing(2, 0, 10),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  section: {
    padding: theme.spacing(2),
    borderRadius: theme.dimensions.radiusCard,
  },
  // Barra de ações fixa: o técnico avança o wizard com o polegar.
  actions: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  photos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: theme.spacing(1.5),
  },
}));

const STEP_KEYS = [
  'installStepIdentification',
  'installStepVehicle',
  'installStepChecklist',
  'installStepPhotos',
  'installStepTests',
];

const InstallOrderPage = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const t = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  // Identificador do rascunho: garante que um retry (ou um refresh no meio do campo) não
  // crie duas ordens para a mesma instalação.
  const [draftId, setDraftId] = usePersistedState('argosInstallDraft', '');

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState([]);

  const apply = (detail) => {
    setOrder(detail);
    setItems(detail.items || []);
    setPhotos(detail.photos || []);
  };

  useEffectAsync(async () => {
    if (id) {
      apply(await argosFetch(`orders/${id}`));
    } else {
      // Cria a ordem já no início: com ela existindo no servidor, cada campo e cada foto são
      // persistidos na hora, sem depender de rascunho local.
      const clientDraftId = draftId || (crypto.randomUUID?.() ?? String(Date.now()));
      if (!draftId) {
        setDraftId(clientDraftId);
      }
      const created = await argosFetch('orders', {
        method: 'POST',
        body: { clientDraftId },
      });
      setDraftId('');
      navigate(`/install/order/${created.id}`, { replace: true });
    }
    return null;
  }, [id]);

  const editable = !!order && isOpen(order.status);

  // patch local (digitação) × patch persistido (blur / seleção)
  const handlePatch = useCatchCallback(
    async (patch, localOnly) => {
      const columns = {
        trackerModel: 'tracker_model',
        simCarrier: 'sim_carrier',
        simNumber: 'sim_number',
        vehiclePlate: 'vehicle_plate',
        vehicleBrand: 'vehicle_brand',
        vehicleModel: 'vehicle_model',
        vehicleYear: 'vehicle_year',
        vehicleColor: 'vehicle_color',
        odometerStart: 'odometer_start',
        installLocation: 'install_location',
        notes: 'notes',
        equipmentCategory: 'equipment_category',
        deviceId: 'device_id',
        deviceUniqueId: 'device_unique_id',
        customerUserId: 'customer_user_id',
        customerGroupId: 'customer_group_id',
        hasImmobilizer: 'has_immobilizer',
        hasSiren: 'has_siren',
        hasPanicButton: 'has_panic_button',
        positionOk: 'position_ok',
        blockTestOk: 'block_test_ok',
      };
      setOrder((current) => {
        if (!current) {
          return current;
        }
        const next = { ...current };
        Object.entries(patch).forEach(([field, value]) => {
          const column = columns[field];
          if (column) {
            next[column] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
          }
        });
        return next;
      });
      if (!localOnly && order?.id) {
        const detail = await argosFetch(`orders/${order.id}`, { method: 'PUT', body: patch });
        apply(detail);
      }
    },
    [order],
  );

  const handleItemChange = useCatch(async (item) => {
    setItems((current) => current.map((it) => (it.position === item.position ? item : it)));
    await argosFetch(`orders/${order.id}/items`, {
      method: 'PUT',
      body: { items: [{ position: item.position, result: item.result, note: item.note }] },
    });
  });

  const reload = useCallback(async () => {
    apply(await argosFetch(`orders/${order.id}`));
  }, [order]);

  const handleUpload = useCatchCallback(
    async (file, slot, onProgress) => {
      const blob = await compressImage(file);
      await argosUpload({
        orderId: order.id,
        slot,
        blob,
        clientPhotoId: crypto.randomUUID?.() ?? String(Date.now()),
        onProgress,
      });
      await reload();
    },
    [order, reload],
  );

  const handleUploadBlob = useCatchCallback(
    async (blob, slot) => {
      await argosUpload({
        orderId: order.id,
        slot,
        blob,
        clientPhotoId: crypto.randomUUID?.() ?? String(Date.now()),
      });
      await reload();
    },
    [order, reload],
  );

  const handleRemovePhoto = useCatch(async (photoId) => {
    await argosFetch(`photos/${photoId}`, { method: 'DELETE' });
    await reload();
  });

  const handleFinish = useCatchCallback(async () => {
    setBusy(true);
    setMissing([]);
    try {
      const detail = await argosFetch(`orders/${order.id}/status`, {
        method: 'POST',
        body: { status: STATUS.DONE },
      });
      apply(detail);
      navigate('/install');
    } catch (error) {
      // O servidor devolve a lista do que falta (error.payload.missing): mostra item por item.
      if (error.payload?.missing) {
        setMissing(error.payload.missing);
        dispatch(errorsActions.push(t('installIncomplete')));
      } else {
        throw error;
      }
    } finally {
      setBusy(false);
    }
  }, [order, dispatch, t]);

  const photosBySlot = useMemo(
    () =>
      photos.reduce((acc, photo) => {
        acc[photo.slot] = [...(acc[photo.slot] || []), photo];
        return acc;
      }, {}),
    [photos],
  );

  useEffect(() => {
    if (order && !editable && step > 4) {
      setStep(4);
    }
  }, [order, editable, step]);

  if (!order) {
    return <LinearProgress />;
  }

  const missingLabel = (key) => {
    if (key.startsWith('photo:')) {
      const slot = PHOTO_SLOTS.find((it) => it.key === key.slice(6));
      return `${t('orderPhotos')}: ${slot ? t(slot.labelKey) : key.slice(6)}`;
    }
    if (key === 'checklist') return t('installStepChecklist');
    if (key === 'checklistNote') return t('installChecklistNoteRequired');
    if (key === 'position') return t('installTestPosition');
    if (key === 'device') return t('installDeviceRequired');
    return key;
  };

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <IconButton edge="start" onClick={() => navigate('/install')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography className={classes.title} noWrap>
          {order.code}
        </Typography>
        <OrderStatusChip status={order.status} />
      </div>

      <Container maxWidth="sm" className={classes.content}>
        <Stepper
          activeStep={step}
          alternativeLabel={desktop}
          orientation={desktop ? 'horizontal' : 'vertical'}
        >
          {STEP_KEYS.map((key, index) => (
            <Step key={key} completed={index < step} onClick={() => setStep(index)}>
              <StepLabel sx={{ cursor: 'pointer' }}>{t(key)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {!editable && <Alert severity="info">{t('installOrderClosed')}</Alert>}
        {order.status === STATUS.REJECTED && order.review_comment && (
          <Alert severity="error">{order.review_comment}</Alert>
        )}
        {missing.length > 0 && (
          <Alert severity="warning">
            {t('installIncomplete')}
            <ul>
              {missing.map((key) => (
                <li key={key}>{missingLabel(key)}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Paper className={classes.section} elevation={0}>
          {step === 0 && <StepDevice order={order} onPatch={handlePatch} disabled={!editable} />}
          {step === 1 && <StepEquipment order={order} onPatch={handlePatch} disabled={!editable} />}
          {step === 2 && (
            <>
              {items.length === 0 && <Typography variant="body2">{t('sharedNoData')}</Typography>}
              {items.map((item) => (
                <ChecklistItemField
                  key={item.position}
                  item={item}
                  disabled={!editable}
                  onChange={handleItemChange}
                />
              ))}
            </>
          )}
          {step === 3 && (
            <Box className={classes.photos}>
              {PHOTO_SLOTS.map((slot) => (
                <PhotoSlot
                  key={slot.key}
                  slot={slot}
                  photos={photosBySlot[slot.key] || []}
                  disabled={!editable}
                  upload={handleUpload}
                  onRemove={handleRemovePhoto}
                />
              ))}
            </Box>
          )}
          {step === 4 && (
            <StepFinish
              order={order}
              photos={photos}
              onPatch={handlePatch}
              uploadBlob={handleUploadBlob}
              disabled={!editable}
            />
          )}
        </Paper>
      </Container>

      <Divider />
      <div className={classes.actions}>
        <Button
          fullWidth
          variant="outlined"
          disabled={step === 0}
          onClick={() => setStep((current) => current - 1)}
        >
          {t('sharedBack') || '<'}
        </Button>
        {step < STEP_KEYS.length - 1 ? (
          <Button fullWidth variant="contained" onClick={() => setStep((current) => current + 1)}>
            {t('sharedNext') || '>'}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            color="success"
            disabled={!editable || busy}
            onClick={handleFinish}
          >
            {t('installFinish')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default InstallOrderPage;
