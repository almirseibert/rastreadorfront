import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, TextField, Typography, Snackbar, IconButton, Divider } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import { useCatch, useEffectAsync } from '../reactHelper';
import { sessionActions } from '../store';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import LogoImage from './LogoImage';

// Configurações de estilo mantendo a consistência do design limpo e arredondado
const useStyles = makeStyles()((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  loginDivider: {
    marginBottom: theme.spacing(1),
    color: '#4b75a4', // Cor azul padrão
    fontSize: '1.2rem',
    width: '100%',
  },
  topLogo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
    '& svg': {
      maxHeight: '60px',
    }
  },
  actionButton: {
    backgroundColor: '#b4b2b2',
    color: '#000000',
    border: '1px solid #ccc',
    boxShadow: 'none',
    width: '150px',
    margin: '0 auto',
    borderRadius: '25px',
    '&:hover': {
      backgroundColor: '#6890ed',
      boxShadow: 'none',
    }
  },
  footerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: theme.spacing(4),
  },
  copyright: {
    fontSize: '0.65rem',
    color: '#888',
    marginTop: theme.spacing(1),
  },
}));

const RegisterPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();

  const server = useSelector((state) => state.session.server);
  const totpForce = useSelector((state) => state.session.server.attributes.totpForce);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpKey, setTotpKey] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffectAsync(async () => {
    if (totpForce) {
      const response = await fetchOrThrow('/api/users/totp', { method: 'POST' });
      setTotpKey(await response.text());
    }
  }, [totpForce, setTotpKey]);

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    await fetchOrThrow('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, totpKey }),
    });
    setSnackbarOpen(true);
  });

  return (
    <LoginLayout>
      <div className={classes.container}>
        <div className={classes.topLogo}>
          <LogoImage color={theme.palette.primary.main} />
        </div>

        <div className={classes.header}>
          {!server.newServer && (
            <IconButton color="primary" onClick={() => navigate('/login')} style={{ position: 'absolute', left: 0 }}>
              <BackIcon />
            </IconButton>
          )}
          <Divider className={classes.loginDivider}>{t('loginRegister')}</Divider>
        </div>

        <TextField
          required
          label={t('sharedName')}
          name="name"
          value={name}
          autoComplete="name"
          autoFocus
          onChange={(event) => setName(event.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#000000',
              borderRadius: '25px',
            }
          }}
        />
        <TextField
          required
          type="email"
          label={t('userEmail')}
          name="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#000000',
              borderRadius: '25px',
            }
          }}
        />
        <TextField
          required
          label={t('userPassword')}
          name="password"
          value={password}
          type="password"
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#000000',
              borderRadius: '25px',
            }
          }}
        />
        {totpForce && (
          <TextField
            required
            label={t('loginTotpKey')}
            name="totpKey"
            value={totpKey || ''}
            InputProps={{
              readOnly: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#000000',
                borderRadius: '25px',
              }
            }}
          />
        )}
        <Button
          variant="outlined"
          className={classes.actionButton}
          onClick={handleSubmit}
          type="submit"
          disabled={!name || !password || !(server.newServer || /(.+)@(.+)\.(.{2,})/.test(email))}
        >
          {t('loginRegister')}
        </Button>

        <div className={classes.footerContainer}>
          <Typography className={classes.copyright}>
            ©2026 Todos os Direitos Reservados Argos Track.
          </Typography>
        </div>
      </div>
      <Snackbar
        open={snackbarOpen}
        onClose={() => {
          dispatch(sessionActions.updateServer({ ...server, newServer: false }));
          navigate('/login');
        }}
        autoHideDuration={snackBarDurationShortMs}
        message={t('loginCreated')}
      />
    </LoginLayout>
  );
};

export default RegisterPage;