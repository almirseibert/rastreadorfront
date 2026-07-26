import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMediaQuery, useTheme } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import BottomMenu from './common/components/BottomMenu';
import AppSidebar from './common/components/AppSidebar';
import MainTopBar from './main/MainTopBar';
import SocketController from './SocketController';
import CachingController from './CachingController';
import { useCatch, useEffectAsync } from './reactHelper';
import { sessionActions } from './store';
import UpdateController from './UpdateController';
import MotionController from './main/MotionController';
import TermsDialog from './common/components/TermsDialog';
import Loader from './common/components/Loader';
import fetchOrThrow from './common/util/fetchOrThrow';
import usePersistedState from './common/util/usePersistedState';

// Rotas de "detalhe" (abertas via botão voltar) que gerenciam o próprio layout
// de tela cheia e portanto não recebem o chrome global (trilho + barra de topo).
const bareLayoutPaths = ['/replay', '/position', '/network', '/event', '/emulator'];

const useStyles = makeStyles()((theme) => ({
  page: {
    flexGrow: 1,
    overflow: 'auto',
  },
  menu: {
    zIndex: 4,
    '@media print': {
      display: 'none',
    },
  },
  // Chrome global (desktop): trilho de ícones + barra de topo compartilhados por
  // todas as seções (mapa, painel, viagens, timeline, cercas, configurações, relatórios).
  chrome: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
  },
  rail: {
    width: theme.dimensions.navSidebarWidth,
    flexShrink: 0,
    height: '100%',
    backgroundColor: theme.palette.sidebar.background,
    boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
    zIndex: 2,
  },
  main: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    height: theme.dimensions.topBarHeight,
    flexShrink: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
}));

const App = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const [selectedGroup, setSelectedGroup] = usePersistedState('selectedGroupId', 0);
  const outletContext = useMemo(
    () => ({ selectedGroup, setSelectedGroup }),
    [selectedGroup, setSelectedGroup],
  );

  const bareLayout = bareLayoutPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const newServer = useSelector((state) => state.session.server.newServer);
  const termsUrl = useSelector((state) => state.session.server.attributes.termsUrl);
  const user = useSelector((state) => state.session.user);

  const acceptTerms = useCatch(async () => {
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, attributes: { ...user.attributes, termsAccepted: true } }),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  });

  useEffectAsync(async () => {
    if (!user) {
      const response = await fetch('/api/session');
      if (response.ok) {
        dispatch(sessionActions.updateUser(await response.json()));
      } else {
        window.sessionStorage.setItem('postLogin', pathname + search);
        navigate(newServer ? '/register' : '/login', { replace: true });
      }
    }
    return null;
  }, []);

  if (user == null) {
    return <Loader />;
  }
  if (termsUrl && !user.attributes.termsAccepted) {
    return <TermsDialog open onCancel={() => navigate('/login')} onAccept={() => acceptTerms()} />;
  }
  const outlet = <Outlet context={outletContext} />;

  return (
    <>
      <SocketController />
      <CachingController />
      <UpdateController />
      <MotionController />
      {desktop && !bareLayout ? (
        <div className={classes.chrome}>
          <div className={classes.rail}>
            <AppSidebar />
          </div>
          <div className={classes.main}>
            <div className={classes.topBar}>
              <MainTopBar selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup} />
            </div>
            <div className={classes.content}>{outlet}</div>
          </div>
        </div>
      ) : (
        <div className={classes.page}>{outlet}</div>
      )}
      {!desktop && (
        <div className={classes.menu}>
          <BottomMenu />
        </div>
      )}
    </>
  );
};

export default App;
