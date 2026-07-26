import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Chip, Fab, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionActions from './components/CollectionActions';
import CompanyWizard from './components/CompanyWizard';
import { formatTime } from '../common/util/formatter';
import { useCatch } from '../reactHelper';
import { groupsActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import useSettingsStyles from './common/useSettingsStyles';

const useStyles = makeStyles()((theme) => ({
  counts: {
    display: 'flex',
    gap: theme.spacing(0.5),
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(2)})`,
    },
  },
}));

const CompaniesPage = () => {
  const { classes: settings } = useSettingsStyles();
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);

  const [wizardOpen, setWizardOpen] = useState(false);

  // Mantém a store de grupos em dia após criar/remover uma empresa (a visão geral lê da store).
  const refreshGroups = useCatch(async () => {
    const response = await fetchOrThrow('/api/groups');
    dispatch(groupsActions.refresh(await response.json()));
  });

  // Uma linha por empresa (grupo): contagem de dispositivos, online/offline e
  // última atualização (mais recente entre os dispositivos do grupo).
  const rows = useMemo(() => {
    const byGroup = new Map();
    Object.values(groups).forEach((group) => {
      byGroup.set(group.id, { group, total: 0, online: 0, lastUpdate: null });
    });
    let ungrouped = 0;
    Object.values(devices).forEach((device) => {
      if (device.groupId && byGroup.has(device.groupId)) {
        const entry = byGroup.get(device.groupId);
        entry.total += 1;
        if (device.status === 'online') {
          entry.online += 1;
        }
        if (device.lastUpdate && (!entry.lastUpdate || device.lastUpdate > entry.lastUpdate)) {
          entry.lastUpdate = device.lastUpdate;
        }
      } else {
        ungrouped += 1;
      }
    });
    return {
      groups: Array.from(byGroup.values()).sort((a, b) => a.group.name.localeCompare(b.group.name)),
      ungrouped,
    };
  }, [groups, devices]);

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (groupId) => navigate(`/settings/group/${groupId}/connections`),
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'settingsCompanies']}>
      <Table className={settings.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('sharedName')}</TableCell>
            <TableCell>{t('deviceTitle')}</TableCell>
            <TableCell>{t('deviceStatusOnline')}</TableCell>
            <TableCell>{t('deviceLastUpdate')}</TableCell>
            <TableCell className={settings.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.groups.map(({ group, total, online, lastUpdate }) => (
            <TableRow key={group.id}>
              <TableCell>{group.name}</TableCell>
              <TableCell>{total}</TableCell>
              <TableCell>
                <div className={classes.counts}>
                  <Chip size="small" color="success" variant="outlined" label={online} />
                  <Chip size="small" variant="outlined" label={total - online} />
                </div>
              </TableCell>
              <TableCell>{lastUpdate ? formatTime(lastUpdate, 'minutes') : '—'}</TableCell>
              <TableCell className={settings.columnAction} padding="none">
                <CollectionActions
                  itemId={group.id}
                  editPath="/settings/group"
                  endpoint="groups"
                  setTimestamp={refreshGroups}
                  customActions={[actionConnections]}
                />
              </TableCell>
            </TableRow>
          ))}
          {rows.ungrouped > 0 && (
            <TableRow>
              <TableCell>{t('groupNoGroup')}</TableCell>
              <TableCell>{rows.ungrouped}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className={classes.fab}>
        <Fab size="medium" color="primary" onClick={() => setWizardOpen(true)}>
          <AddIcon />
        </Fab>
      </div>
      <CompanyWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => setWizardOpen(false)}
      />
    </PageLayout>
  );
};

export default CompaniesPage;
