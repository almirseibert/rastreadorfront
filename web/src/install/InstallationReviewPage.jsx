import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from '../settings/components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatchCallback, useEffectAsync } from '../reactHelper';
import argosFetch, { argosUrl } from '../common/util/argosApi';
import { formatTime } from '../common/util/formatter';
import OrderStatusChip from './components/OrderStatusChip';
import PhotoGallery from './components/PhotoGallery';
import { STATUS } from './util/orderStatus';

const useStyles = makeStyles()((theme) => ({
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  section: {
    padding: theme.spacing(2),
    borderRadius: theme.dimensions.radiusCard,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: theme.spacing(0.5),
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 0),
    borderBottom: `1px dotted ${theme.palette.divider}`,
    fontSize: '0.875rem',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
  },
}));

const RESULTS = {
  ok: 'installChecklistOk',
  na: 'installChecklistNa',
  problem: 'installChecklistProblem',
};

// Revisão da ordem pelo administrador: dados, checklist, fotos, histórico e aprovar/reprovar.
const InstallationReviewPage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState('');

  useEffectAsync(async () => {
    setOrder(await argosFetch(`orders/${id}`));
    return null;
  }, [id]);

  const changeStatus = useCatchCallback(
    async (status, reviewComment) => {
      const detail = await argosFetch(`orders/${id}/status`, {
        method: 'POST',
        body: { status, comment: reviewComment },
      });
      setOrder(detail);
      setRejectOpen(false);
      setComment('');
    },
    [id],
  );

  if (!order) {
    return (
      <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'installOrders']}>
        <LinearProgress />
      </PageLayout>
    );
  }

  const field = (label, value) => (
    <div className={classes.field}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <strong>{value === null || value === undefined || value === '' ? '—' : String(value)}</strong>
    </div>
  );

  const canReview = order.status === STATUS.DONE;

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'installOrders']}>
      <Container maxWidth="md" className={classes.container}>
        <div className={classes.header}>
          <Typography variant="h6">{order.code}</Typography>
          <OrderStatusChip status={order.status} />
        </div>

        {order.review_comment && (
          <Alert severity={order.status === STATUS.REJECTED ? 'error' : 'info'}>
            {order.review_comment} — {formatTime(order.reviewed_at, 'minutes')}
          </Alert>
        )}

        <Paper className={classes.section} elevation={0}>
          <Typography variant="subtitle2" gutterBottom>
            {t('installStepIdentification')}
          </Typography>
          <div className={classes.grid}>
            {field(t('deviceIdentifier'), order.device_unique_id)}
            {field(t('installTrackerModel'), order.tracker_model)}
            {field(t('installSimCarrier'), order.sim_carrier)}
            {field(t('installSimNumber'), order.sim_number)}
            {field(t('deviceCategory'), order.equipment_category)}
            {field(t('installVehiclePlate'), order.vehicle_plate)}
            {field(t('installVehicleBrand'), order.vehicle_brand)}
            {field(t('installVehicleModel'), order.vehicle_model)}
            {field(t('installVehicleYear'), order.vehicle_year)}
            {field(t('installVehicleColor'), order.vehicle_color)}
            {field(`${t('installOdometerStart')} (${t('sharedKm')})`, order.odometer_start)}
            {field(t('installLocation'), order.install_location)}
            {field(
              t('installHasImmobilizer'),
              order.has_immobilizer ? t('sharedYes') : t('sharedNo'),
            )}
            {field(t('installHasSiren'), order.has_siren ? t('sharedYes') : t('sharedNo'))}
            {field(t('installHasPanic'), order.has_panic_button ? t('sharedYes') : t('sharedNo'))}
            {field(t('installTestPosition'), order.position_ok ? t('sharedYes') : t('sharedNo'))}
            {field(t('sharedDate'), formatTime(order.created_at, 'minutes'))}
            {field(t('installFinishedAt'), formatTime(order.finished_at, 'minutes'))}
          </div>
          {order.notes && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">{order.notes}</Typography>
            </>
          )}
        </Paper>

        <Paper className={classes.section} elevation={0}>
          <Typography variant="subtitle2" gutterBottom>
            {t('installStepChecklist')}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>{t('checklistItemLabel')}</TableCell>
                <TableCell>{t('deviceStatus')}</TableCell>
                <TableCell>{t('installChecklistNote')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(order.items || []).map((item) => (
                <TableRow key={item.position}>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.label_snapshot}</TableCell>
                  <TableCell>{item.result ? t(RESULTS[item.result]) : '—'}</TableCell>
                  <TableCell>{item.note || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        <Paper className={classes.section} elevation={0}>
          <Typography variant="subtitle2" gutterBottom>
            {t('orderPhotos')}
          </Typography>
          <PhotoGallery photos={order.photos || []} />
        </Paper>

        {order.audit && order.audit.length > 0 && (
          <Paper className={classes.section} elevation={0}>
            <Typography variant="subtitle2" gutterBottom>
              {t('orderHistory')}
            </Typography>
            <Table size="small">
              <TableBody>
                {order.audit.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatTime(entry.created_at, 'seconds')}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>
                      {entry.from_status ? `${entry.from_status} → ${entry.to_status}` : ''}
                      {entry.detail ? ` ${entry.detail}` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        <div className={classes.actions}>
          <Button
            variant="outlined"
            href={argosUrl(`orders/${order.id}/report`)}
            target="_blank"
            rel="noopener"
          >
            {t('orderReport')}
          </Button>
          {canReview && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => changeStatus(STATUS.APPROVED)}
              >
                {t('orderApprove')}
              </Button>
              <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)}>
                {t('orderReject')}
              </Button>
            </>
          )}
          <Button onClick={() => navigate('/settings/installations')}>{t('sharedCancel')}</Button>
        </div>
      </Container>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('orderReject')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('orderReviewComment')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>{t('sharedCancel')}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!comment.trim()}
            onClick={() => changeStatus(STATUS.REJECTED, comment.trim())}
          >
            {t('orderReject')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default InstallationReviewPage;
