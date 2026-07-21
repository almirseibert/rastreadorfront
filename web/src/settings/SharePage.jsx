import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Typography,
  Container,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Box,
  Snackbar,
  IconButton,
  InputAdornment,
  Tooltip,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import QRCode from 'react-qr-code';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import { useCatchCallback } from '../reactHelper';
import { snackBarDurationShortMs } from '../common/util/duration';
import useSettingsStyles from './common/useSettingsStyles';
import fetchOrThrow from '../common/util/fetchOrThrow';

const presets = [
  { label: '1 hora', amount: 1, unit: 'hour' },
  { label: '1 dia', amount: 1, unit: 'day' },
  { label: '1 semana', amount: 1, unit: 'week' },
  { label: '1 mês', amount: 1, unit: 'month' },
];

const SharePage = () => {
  const navigate = useNavigate();
  const { classes } = useSettingsStyles();
  const theme = useTheme();
  const t = useTranslation();

  const { id } = useParams();

  const device = useSelector((state) => state.devices.items[id]);

  const [preset, setPreset] = useState(2); // 1 semana
  const [expiration, setExpiration] = useState(
    dayjs().add(1, 'week').locale('en').format('YYYY-MM-DD'),
  );
  const [link, setLink] = useState();
  const [copied, setCopied] = useState(false);

  const applyPreset = (index) => {
    setPreset(index);
    const { amount, unit } = presets[index];
    setExpiration(dayjs().add(amount, unit).locale('en').format('YYYY-MM-DD'));
  };

  const handleShare = useCatchCallback(async () => {
    const expirationTime =
      preset !== null && presets[preset].unit === 'hour'
        ? dayjs().add(1, 'hour').toISOString()
        : dayjs(expiration).endOf('day').toISOString();
    const response = await fetchOrThrow('/api/devices/share', {
      method: 'POST',
      body: new URLSearchParams(`deviceId=${id}&expiration=${expirationTime}`),
    });
    const token = await response.text();
    setLink(`${window.location.origin}?token=${token}`);
  }, [id, expiration, preset, setLink]);

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(link);
    setCopied(true);
  };

  const shareMessage = device
    ? `Acompanhe a localização de ${device.name} em tempo real: ${link}`
    : link;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: device?.name, url: link });
    } catch {
      // usuário cancelou o compartilhamento
    }
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['deviceShare']}>
      <Container maxWidth="xs" className={classes.container}>
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField value={device.name} label={t('sharedDevice')} disabled fullWidth />

            <Box>
              <Typography variant="caption" color="textSecondary">
                {t('userExpirationTime')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                {presets.map((item, index) => (
                  <Chip
                    key={item.label}
                    size="small"
                    label={item.label}
                    color={preset === index ? 'primary' : 'default'}
                    variant={preset === index ? 'filled' : 'outlined'}
                    onClick={() => applyPreset(index)}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label={t('userExpirationTime')}
              type="date"
              value={expiration}
              onChange={(e) => {
                setExpiration(e.target.value);
                setPreset(null);
              }}
              fullWidth
            />

            <Button variant="contained" color="primary" fullWidth onClick={handleShare}>
              <LinkIcon sx={{ mr: 1 }} fontSize="small" />
              {t('deviceShare')}
            </Button>

            {link && (
              <>
                <TextField
                  value={link}
                  label={t('sharedLink')}
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('sharedCopy')}>
                          <IconButton size="small" onClick={handleCopy}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<WhatsAppIcon />}
                    component="a"
                    target="_blank"
                    rel="noopener"
                    href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
                  >
                    WhatsApp
                  </Button>
                  {Boolean(navigator.share) && (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ShareIcon />}
                      onClick={handleNativeShare}
                    >
                      {t('deviceShare')}
                    </Button>
                  )}
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    p: 2,
                    backgroundColor: 'common.white', // QR precisa de fundo claro para leitura
                    borderRadius: 2,
                  }}
                >
                  <QRCode value={link} size={theme.dimensions.qrCodeSize} />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
        <div className={classes.buttons}>
          <Button type="button" color="primary" variant="outlined" onClick={() => navigate(-1)}>
            {t('sharedCancel')}
          </Button>
        </div>
      </Container>
      <Snackbar
        open={copied}
        onClose={() => setCopied(false)}
        autoHideDuration={snackBarDurationShortMs}
        message="Link copiado"
      />
    </PageLayout>
  );
};

export default SharePage;
