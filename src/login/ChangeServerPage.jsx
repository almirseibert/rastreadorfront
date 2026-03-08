import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import {
  Autocomplete,
  Button,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Divider,
  Typography,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useTranslation } from '../common/components/LocalizationProvider';
import Loader from '../common/components/Loader';
import { errorsActions } from '../store';
import LoginLayout from './LoginLayout';
import LogoImage from './LogoImage';
import BackIcon from '../common/components/BackIcon';

const currentServer = `${window.location.protocol}//${window.location.host}`;

const officialServers = [
  currentServer,
  'https://demo.traccar.org',
  'https://demo2.traccar.org',
  'https://demo3.traccar.org',
  'https://demo4.traccar.org',
  'https://server.traccar.org',
  'http://localhost:8082',
  'http://localhost:3000',
].filter((value, index, self) => self.indexOf(value) === index);

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
  buttons: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-evenly',
    gap: theme.spacing(1),
  },
  actionButton: {
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '1px solid #ccc',
    boxShadow: 'none',
    borderRadius: '25px',
    padding: '6px 16px',
    flex: 1,
    whiteSpace: 'nowrap',
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
  scannerVideo: {
    width: '100%',
    maxWidth: '400px',
    height: 'auto',
  },
}));

const ChangeServerPage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const t = useTranslation();

  const filter = createFilterOptions();
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [inputValue, setInputValue] = useState(currentServer);
  const [scannerOpen, setScannerOpen] = useState(false);

  const validateUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = (url) => {
    setLoading(true);
    if (window.webkit && window.webkit.messageHandlers.appInterface) {
      window.webkit.messageHandlers.appInterface.postMessage(`server|${url}`);
    } else if (window.appInterface) {
      window.appInterface.postMessage(`server|${url}`);
    } else {
      window.location.replace(url);
    }
  };

  const handleScanResult = (codes) => {
    if (codes && codes.length) {
      const value = codes[0].rawValue || codes[0].value || '';
      if (value) {
        setInputValue(value);
        setInvalid(!validateUrl(value));
        setScannerOpen(false);
      }
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <LoginLayout>
        <div className={classes.container}>
          <div className={classes.topLogo}>
            <LogoImage color={theme.palette.primary.main} />
          </div>

          <div className={classes.header}>
            <IconButton color="primary" onClick={() => navigate(-1)} style={{ position: 'absolute', left: 0 }}>
              <BackIcon />
            </IconButton>
            <Divider className={classes.loginDivider}>{t('settingsServer')}</Divider>
          </div>

          <Autocomplete
            freeSolo
            options={officialServers}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label={t('settingsServer')} 
                error={invalid} 
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#000000',
                    borderRadius: '25px',
                  }
                }}
              />
            )}
            value={currentServer}
            onChange={(_, value) =>
              value && validateUrl(value) ? handleSubmit(value) : setInvalid(true)
            }
            inputValue={inputValue}
            onInputChange={(_, value) => {
              setInputValue(value);
              setInvalid(false);
            }}
            filterOptions={filter}
          />

          <div className={classes.buttons}>
            <Button variant="outlined" className={classes.actionButton} onClick={() => navigate(-1)}>
              {t('sharedCancel')}
            </Button>
            {Boolean(navigator?.mediaDevices?.getUserMedia) && (
              <Button variant="outlined" className={classes.actionButton} onClick={() => setScannerOpen(true)}>
                {t('sharedQrCode')}
              </Button>
            )}
            <Button
              variant="outlined"
              className={classes.actionButton}
              onClick={() =>
                inputValue && validateUrl(inputValue) ? handleSubmit(inputValue) : setInvalid(true)
              }
              disabled={!inputValue || invalid}
            >
              {t('sharedSave')}
            </Button>
          </div>

          <div className={classes.footerContainer}>
            <Typography className={classes.copyright}>
              ©2026 Todos os Direitos Reservados Argos Track.
            </Typography>
          </div>
        </div>
      </LoginLayout>

      <Dialog fullWidth maxWidth="sm" open={scannerOpen} onClose={() => setScannerOpen(false)}>
        <DialogContent>
          <Scanner
            constraints={{ facingMode: 'environment' }}
            onScan={handleScanResult}
            onError={(error) => dispatch(errorsActions.push(String(error)))}
            className={classes.scannerVideo}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerOpen(false)}>{t('sharedCancel')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChangeServerPage;