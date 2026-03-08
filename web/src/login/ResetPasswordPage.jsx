import { useState } from 'react';
import { Button, TextField, Typography, Snackbar, IconButton, Divider } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import { useCatch } from '../reactHelper';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import LogoImage from './LogoImage';

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
    color: '#4b75a4',
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
    backgroundColor: '#ffffff',
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

const ResetPasswordPage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();

  const [searchParams] = useSearchParams();
  const token = searchParams.get('passwordReset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSubmit = useCatch(async (event) => {
    event.preventDefault();
    if (!token) {
      await fetchOrThrow('/api/password/reset', {
        method: 'POST',
        body: new URLSearchParams(`email=${encodeURIComponent(email)}`),
      });
    } else {
      await fetchOrThrow('/api/password/update', {
        method: 'POST',
        body: new URLSearchParams(
          `token=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}`,
        ),
      });
    }
    setSnackbarOpen(true);
  });

  return (
    <LoginLayout>
      <div className={classes.container}>
        <div className={classes.topLogo}>
          <LogoImage color={theme.palette.primary.main} />
        </div>

        <div className={classes.header}>
          <IconButton color="primary" onClick={() => navigate('/login')} style={{ position: 'absolute', left: 0 }}>
            <BackIcon />
          </IconButton>
          <Divider className={classes.loginDivider}>{t('loginReset')}</Divider>
        </div>

        {!token ? (
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
        ) : (
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
        )}
        <Button
          variant="outlined"
          className={classes.actionButton}
          type="submit"
          onClick={handleSubmit}
          disabled={!/(.+)@(.+)\.(.{2,})/.test(email) && !password}
        >
          {t('loginReset')}
        </Button>

        <div className={classes.footerContainer}>
          <Typography className={classes.copyright}>
            ©2026 Todos os Direitos Reservados Argos Track.
          </Typography>
        </div>
      </div>
      <Snackbar
        open={snackbarOpen}
        onClose={() => navigate('/login')}
        autoHideDuration={snackBarDurationShortMs}
        message={!token ? t('loginResetSuccess') : t('loginUpdateSuccess')}
      />
    </LoginLayout>
  );
};

export default ResetPasswordPage;