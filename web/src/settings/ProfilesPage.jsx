import { useMemo, useState } from 'react';
import {
  Button,
  Chip,
  Fab,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { makeStyles } from 'tss-react/mui';
import { useDispatch, useSelector } from 'react-redux';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import ProfileDialog from './components/ProfileDialog';
import { useTranslation } from '../common/components/LocalizationProvider';
import useSettingsStyles from './common/useSettingsStyles';
import { useCatchCallback, useEffectAsync } from '../reactHelper';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { sessionActions } from '../store';
import {
  PROFILES_ATTRIBUTE,
  PROFILE_ATTRIBUTE,
  parseProfiles,
  stringifyProfiles,
} from '../common/util/useAccess';
import { assignablePages } from '../common/util/pages';

const useStyles = makeStyles()((theme) => ({
  fab: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(2)})`,
    },
  },
  empty: {
    padding: theme.spacing(3),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    alignItems: 'flex-start',
  },
}));

// Perfis prontos oferecidos quando ainda não existe nenhum ("tipos de usuário" do Argos Track).
const seedProfiles = () => {
  const pages = assignablePages();
  const level = (keys, value) =>
    keys.reduce((acc, key) => {
      const page = pages.find((it) => it.key === key);
      if (!page) {
        return acc;
      }
      return { ...acc, [key]: value === 'edit' && !page.editable ? 'view' : value };
    }, {});
  const all = (value) =>
    level(
      pages.map((page) => page.key),
      value,
    );

  return [
    {
      id: 'cliente',
      name: 'Cliente',
      default: true,
      pages: {
        ...level(['map', 'trips', 'timeline', 'dashboard'], 'view'),
        ...level(['devices', 'geofences'], 'view'),
        ...level(
          [
            'reports.combined',
            'reports.events',
            'reports.trips',
            'reports.stops',
            'reports.summary',
            'reports.replay',
          ],
          'view',
        ),
        ...level(['account', 'preferences'], 'edit'),
      },
    },
    {
      id: 'gestor-frota',
      name: 'Gestor de frota',
      pages: all('edit'),
    },
    {
      id: 'instalador',
      name: 'Instalador',
      pages: { ...level(['install'], 'edit'), ...level(['preferences'], 'view') },
    },
    {
      id: 'consulta',
      name: 'Somente consulta',
      pages: all('view'),
    },
  ];
};

const ProfilesPage = () => {
  const { classes } = useStyles();
  const { classes: settingsClasses } = useSettingsStyles();
  const t = useTranslation();
  const dispatch = useDispatch();

  const server = useSelector((state) => state.session.server);
  const profiles = useMemo(() => parseProfiles(server), [server]);

  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffectAsync(async () => {
    const response = await fetchOrThrow('/api/users?excludeAttributes=false');
    setUsers(await response.json());
    return null;
  }, []);

  const usersByProfile = useMemo(
    () =>
      users.reduce((acc, user) => {
        const id = user.attributes?.[PROFILE_ATTRIBUTE];
        return id ? { ...acc, [id]: (acc[id] || 0) + 1 } : acc;
      }, {}),
    [users],
  );

  // Grava o catálogo inteiro em server.attributes (PUT /api/server exige o objeto completo).
  const persist = useCatchCallback(
    async (next) => {
      const response = await fetchOrThrow('/api/server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...server,
          attributes: { ...server.attributes, [PROFILES_ATTRIBUTE]: stringifyProfiles(next) },
        }),
      });
      dispatch(sessionActions.updateServer(await response.json()));
    },
    [server, dispatch],
  );

  const handleSave = (profile) => {
    const others = profiles.filter((it) => it.id !== profile.id);
    const next = [...others, profile]
      .map((it) => (profile.default && it.id !== profile.id ? { ...it, default: false } : it))
      .sort((a, b) => a.name.localeCompare(b.name));
    setDialogOpen(false);
    setEditing(null);
    persist(next);
  };

  const handleRemove = (id) => persist(profiles.filter((profile) => profile.id !== id));

  const handleDuplicate = (profile) => {
    setEditing({ ...profile, id: undefined, name: `${profile.name} (2)`, default: false });
    setDialogOpen(true);
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'settingsProfiles']}>
      <Typography variant="body2" color="textSecondary" sx={{ p: 2, pb: 0 }}>
        {t('profilesHint')}
      </Typography>

      {profiles.length === 0 ? (
        <Paper className={classes.empty} elevation={0}>
          <Typography variant="body1">{t('profilesEmpty')}</Typography>
          <Button variant="contained" onClick={() => persist(seedProfiles())}>
            {t('profilesSeed')}
          </Button>
        </Paper>
      ) : (
        <Table className={settingsClasses.table}>
          <TableHead>
            <TableRow>
              <TableCell>{t('sharedName')}</TableCell>
              <TableCell>{t('profilePages')}</TableCell>
              <TableCell>{t('settingsUsers')}</TableCell>
              <TableCell className={settingsClasses.columnAction} />
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id} hover>
                <TableCell>
                  {profile.name}
                  {profile.default && (
                    <Tooltip title={t('profileDefault')}>
                      <StarIcon fontSize="small" color="primary" sx={{ ml: 1, mb: -0.5 }} />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={Object.keys(profile.pages || {}).length}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{usersByProfile[profile.id] || 0}</TableCell>
                <TableCell className={settingsClasses.columnAction} padding="none">
                  <Tooltip title={t('sharedEdit')}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(profile);
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('profileDuplicate')}>
                    <IconButton size="small" onClick={() => handleDuplicate(profile)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('sharedRemove')}>
                    <IconButton size="small" onClick={() => handleRemove(profile.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className={classes.fab}>
        <Fab
          size="medium"
          color="primary"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <AddIcon />
        </Fab>
      </div>

      <ProfileDialog
        open={dialogOpen}
        profile={editing}
        existingIds={profiles.map((profile) => profile.id)}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </PageLayout>
  );
};

export default ProfilesPage;
