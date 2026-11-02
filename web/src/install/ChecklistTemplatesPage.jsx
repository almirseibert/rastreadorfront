import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, Fab, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from '../settings/components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useEffectAsync } from '../reactHelper';
import argosFetch from '../common/util/argosApi';
import TableShimmer from '../common/components/TableShimmer';
import CollectionActions from '../settings/components/CollectionActions';
import useSettingsStyles from '../settings/common/useSettingsStyles';
import { prefixString } from '../common/util/stringUtils';

const useStyles = makeStyles()((theme) => ({
  fab: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(2)})`,
    },
  },
}));

// Modelos de checklist que o instalador responde. Um modelo sem categoria é o genérico.
const ChecklistTemplatesPage = () => {
  const { classes } = useStyles();
  const { classes: settingsClasses } = useSettingsStyles();
  const t = useTranslation();
  const navigate = useNavigate();

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      setItems(await argosFetch('templates'));
    } finally {
      setLoading(false);
    }
    return null;
  }, [timestamp]);

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'checklistTemplates']}>
      <Table className={settingsClasses.table}>
        <TableHead>
          <TableRow>
            <TableCell>{t('sharedName')}</TableCell>
            <TableCell>{t('deviceCategory')}</TableCell>
            <TableCell>{t('checklistItems')}</TableCell>
            <TableCell>{t('sharedDisabled')}</TableCell>
            <TableCell className={settingsClasses.columnAction} />
          </TableRow>
        </TableHead>
        <TableBody>
          {!loading ? (
            items.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  {item.category
                    ? t(prefixString('category', item.category))
                    : t('checklistGeneric')}
                </TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={(item.items || []).length} />
                </TableCell>
                <TableCell>{item.active ? '' : '✓'}</TableCell>
                <TableCell className={settingsClasses.columnAction} padding="none">
                  <CollectionActions
                    itemId={item.id}
                    editPath="/settings/checklist"
                    endpoint="templates"
                    baseUrl="/argos"
                    setTimestamp={setTimestamp}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableShimmer columns={5} endAction />
          )}
        </TableBody>
      </Table>

      <div className={classes.fab}>
        <Fab size="medium" color="primary" onClick={() => navigate('/settings/checklist')}>
          <AddIcon />
        </Fab>
      </div>
    </PageLayout>
  );
};

export default ChecklistTemplatesPage;
