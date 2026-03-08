import { useEffect, useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  Button,
  TextField,
  Link,
  Snackbar,
  IconButton,
  Tooltip,
  Box,
  InputAdornment,
  Divider,
  Typography,
} from '@mui/material';
import ReactCountryFlag from 'react-country-flag';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import LoginLayout from './LoginLayout';
import usePersistedState from '../common/util/usePersistedState';
import {
  generateLoginToken,
  handleLoginTokenListeners,
  nativeEnvironment,
  nativePostMessage,
} from '../common/components/NativeInterface';
import LogoImage from './LogoImage';
import { useCatch } from '../reactHelper';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  options: {
    position: 'fixed',
    top: theme.spacing(2),
    right: theme.spacing(2),
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  loginDivider: {
    marginBottom: theme.spacing(1),
    color: '#4b75a4', // Cor azul do texto "Login"
    fontSize: '1.2rem',
  },
  topLogo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
    '& svg': {
      maxHeight: '60px', // Limita a altura para ficar elegante
    }
  },
  acessarButton: {
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '1px solid #ccc',
    boxShadow: 'none',
    width: '120px',
    margin: '0 auto', // Centraliza o botão
    borderRadius: '25px', // Arredonda o botão para combinar com os campos
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
  extraContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing(4),
  },
  link: {
    cursor: 'pointer',
  },
}));

const LoginPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();

  const { languages, language, setLocalLanguage } = useLocalization();
  const languageList = Object.entries(languages).map((values) => ({
    code: values[0],
    country: values[1].country,
    name: values[1].name,
  }));

  const [failed, setFailed] = useState(false);

  const [email, setEmail] = usePersistedState('loginEmail', '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerTooltip, setShowServerTooltip] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const registrationEnabled = useSelector((state) => state.session.server.registration);
  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const emailEnabled = useSelector((state) => state.session.server.emailEnabled);
  const openIdEnabled = useSelector((state) => state.session.server.openIdEnabled);
  const openIdForced = useSelector(
    (state) => state.session.server.openIdEnabled && state.session.server.openIdForce,
  );
  const [codeEnabled, setCodeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcement = useSelector((state) => state.session.server.announcement);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setFailed(false);
    try {
      const query = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch('/api/session', {
        method: 'POST',
        body: new URLSearchParams(code.length ? `${query}&code=${code}` : query),
      });
      if (response.ok) {
        const user = await response.json();
        generateLoginToken();
        dispatch(sessionActions.updateUser(user));
        const target = window.sessionStorage.getItem('postLogin') || '/';
        window.sessionStorage.removeItem('postLogin');
        navigate(target, { replace: true });
      } else if (response.status === 401 && response.headers.get('WWW-Authenticate') === 'TOTP') {
        setCodeEnabled(true);
      } else {
        throw Error(await response.text());
      }
    } catch {
      setFailed(true);
      setPassword('');
    }
  };

  const handleTokenLogin = useCatch(async (token) => {
    const response = await fetchOrThrow(`/api/session?token=${encodeURIComponent(token)}`);
    const user = await response.json();
    dispatch(sessionActions.updateUser(user));
    navigate('/');
  });

  const handleOpenIdLogin = () => {
    document.location = '/api/session/openid/auth';
  };

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLogin(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem('hostname') !== window.location.hostname) {
      window.localStorage.setItem('hostname', window.location.hostname);
      setShowServerTooltip(true);
    }
  }, []);

  return (
    <LoginLayout>
      <div className={classes.options}>
        {nativeEnvironment && changeEnabled && (
          <IconButton color="primary" onClick={() => navigate('/change-server')}>
            <Tooltip
              title={`${t('settingsServer')}: ${window.location.hostname}`}
              open={showServerTooltip}
              arrow
            >
              <VpnLockIcon />
            </Tooltip>
          </IconButton>
        )}
        {!nativeEnvironment && (
          <IconButton color="primary" onClick={() => setShowQr(true)}>
            <QrCode2Icon />
          </IconButton>
        )}
        {languageEnabled && (
          <FormControl>
            <Select value={language} onChange={(e) => setLocalLanguage(e.target.value)} sx={{ 
    backgroundColor: '#c0bebe', // Cor de fundo da caixa
    color: '#000000',           // Cor do texto
    borderRadius: '25px',       // Borda arredondada
    height: '36px',             // Altura do botão
    fontSize: '0.85rem',        // Tamanho da fonte
    boxShadow: '0px 2px 4px rgba(127, 216, 241, 0.45)', // Sombreado leve
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none'            // Remove a borda padrão feia do MUI
    },
    '& .MuiSvgIcon-root': {
      color: '#000000'          // Cor da setinha para baixo
    }
  }}>
              {languageList.map((it) => (
                <MenuItem key={it.code} value={it.code}>
                  <Box component="span" sx={{ mr: 1 }}>
                    <ReactCountryFlag countryCode={it.country} svg />
                  </Box>
                  {it.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>
      
      <div className={classes.container}>
        <div className={classes.topLogo}>
          <LogoImage color={theme.palette.primary.main} />
        </div>

        {!openIdForced && (
          <>
            <Divider className={classes.loginDivider}>Login</Divider>

            <TextField
              required
              error={failed}
              placeholder="Login"
              name="email"
              value={email}
              autoComplete="email"
              autoFocus={!email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#000000',
                  borderRadius: '25px', // Campos mais arredondados
                }
              }}
            />
            <TextField
              required
              error={failed}
              placeholder="Senha"
              name="password"
              value={password}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus={!!email}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#000000',
                  borderRadius: '25px', // Campos mais arredondados
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {codeEnabled && (
              <TextField
                required
                error={failed}
                placeholder={t('loginTotpCode')}
                name="code"
                value={code}
                type="number"
                onChange={(e) => setCode(e.target.value)}
              />
            )}
            
            <Button
              onClick={handlePasswordLogin}
              type="submit"
              variant="outlined"
              className={classes.acessarButton}
              disabled={!email || !password || (codeEnabled && !code)}
            >
              Acessar
            </Button>
          </>
        )}
        
        {openIdEnabled && (
          <Button onClick={() => handleOpenIdLogin()} variant="contained" color="secondary">
            {t('loginOpenId')}
          </Button>
        )}
        
        {!openIdForced && (
          <div className={classes.extraContainer}>
            {registrationEnabled && (
              <Link onClick={() => navigate('/register')} className={classes.link} underline="none" variant="caption">
                {t('loginRegister')}
              </Link>
            )}
            {emailEnabled && (
              <Link onClick={() => navigate('/reset-password')} className={classes.link} underline="none" variant="caption">
                {t('loginReset')}
              </Link>
            )}
          </div>
        )}

        {/* Rodapé do Cartão com Copyright */}
        <div className={classes.footerContainer}>
          <Typography className={classes.copyright}>
            ©2026 Todos os Direitos Reservados Argos Track.
          </Typography>
        </div>

      </div>
      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
      <Snackbar
        open={!!announcement && !announcementShown}
        message={announcement}
        action={
          <IconButton size="small" color="inherit" onClick={() => setAnnouncementShown(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </LoginLayout>
  );
};

export default LoginPage;