import { AppBar, IconButton, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import { useNavigate } from 'react-router-dom';
import BackIcon from './BackIcon';
import { useTranslation } from './LocalizationProvider';

// Cabeçalho mobile das páginas de "view" (Painel, Viagens, Timeline, Cercas).
// No desktop o chrome (trilho + barra de topo) é global (App.jsx), então este
// componente apenas repassa o conteúdo. No mobile adiciona a barra com voltar + título.
const useStyles = makeStyles()(() => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  appBar: {
    '@media print': {
      display: 'none',
    },
  },
  title: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
}));

const ViewLayout = ({ title, children }) => {
  const { classes } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const t = useTranslation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  if (desktop) {
    return children;
  }

  return (
    <div className={classes.root}>
      <AppBar className={classes.appBar} position="static" color="inherit">
        <Toolbar>
          <IconButton color="inherit" edge="start" sx={{ mr: 2 }} onClick={() => navigate('/')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            {title ? t(title) : ''}
          </Typography>
        </Toolbar>
      </AppBar>
      <div className={classes.content}>{children}</div>
    </div>
  );
};

export default ViewLayout;
