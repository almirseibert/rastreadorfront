import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { makeStyles } from 'tss-react/mui';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from '../settings/components/SettingsMenu';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatchCallback, useEffectAsync } from '../reactHelper';
import argosFetch from '../common/util/argosApi';
import deviceCategories from '../common/util/deviceCategories';
import { prefixString } from '../common/util/stringUtils';

const useStyles = makeStyles()((theme) => ({
  container: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(4),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  grow: {
    flex: 1,
  },
  section: {
    padding: theme.spacing(2),
    borderRadius: theme.dimensions.radiusCard,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  buttons: {
    display: 'flex',
    gap: theme.spacing(1),
  },
}));

// Editor de modelo de checklist. Editar um modelo não altera laudos já emitidos: cada
// resposta guarda o texto do item no momento da instalação (label_snapshot).
const ChecklistTemplatePage = () => {
  const { classes } = useStyles();
  const t = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [active, setActive] = useState(true);
  const [items, setItems] = useState([{ label: '', help: '', required: true }]);

  useEffectAsync(async () => {
    if (id) {
      const template = await argosFetch(`templates/${id}`);
      setName(template.name);
      setCategory(template.category || '');
      setActive(!!template.active);
      setItems(
        (template.items || []).map((item) => ({
          label: item.label,
          help: item.help || '',
          required: !!item.required,
        })),
      );
    }
    return null;
  }, [id]);

  const categoryOptions = deviceCategories
    .map((it) => ({ id: it, name: t(prefixString('category', it)) || it }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const updateItem = (index, patch) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const move = (index, delta) =>
    setItems((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) {
        return current;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const handleSave = useCatchCallback(async () => {
    const body = {
      name: name.trim(),
      category: category || null,
      active,
      items: items.filter((item) => item.label.trim()),
    };
    if (id) {
      await argosFetch(`templates/${id}`, { method: 'PUT', body });
    } else {
      await argosFetch('templates', { method: 'POST', body });
    }
    navigate('/settings/checklists');
  }, [id, name, category, active, items, navigate]);

  const valid = name.trim() && items.some((item) => item.label.trim());

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'checklistTemplates']}>
      <Container maxWidth="sm" className={classes.container}>
        <Paper className={classes.section} elevation={0}>
          <TextField
            label={t('sharedName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <FormControl fullWidth>
            <InputLabel>{t('deviceCategory')}</InputLabel>
            <Select
              label={t('deviceCategory')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="">{t('checklistGeneric')}</MenuItem>
              {categoryOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label={t('sharedEnabled') || t('checklistActive')}
          />
        </Paper>

        <Paper className={classes.section} elevation={0}>
          <Typography variant="subtitle2">{t('checklistItems')}</Typography>
          {items.map((item, index) => (
            <div className={classes.item} key={index}>
              <div className={classes.grow}>
                <TextField
                  label={`${index + 1}. ${t('checklistItemLabel')}`}
                  value={item.label}
                  onChange={(e) => updateItem(index, { label: e.target.value })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label={t('checklistItemHelp')}
                  value={item.help}
                  onChange={(e) => updateItem(index, { help: e.target.value })}
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.required}
                      onChange={(e) => updateItem(index, { required: e.target.checked })}
                    />
                  }
                  label={t('checklistItemRequired')}
                />
              </div>
              <div>
                <Tooltip title="↑">
                  <IconButton size="small" onClick={() => move(index, -1)}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="↓">
                  <IconButton size="small" onClick={() => move(index, 1)}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('sharedRemove')}>
                  <IconButton
                    size="small"
                    onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setItems((current) => [...current, { label: '', help: '', required: true }])
            }
          >
            {t('sharedAdd')}
          </Button>
        </Paper>

        <div className={classes.buttons}>
          <Button fullWidth variant="outlined" onClick={() => navigate(-1)}>
            {t('sharedCancel')}
          </Button>
          <Button fullWidth variant="contained" disabled={!valid} onClick={handleSave}>
            {t('sharedSave')}
          </Button>
        </div>
      </Container>
    </PageLayout>
  );
};

export default ChecklistTemplatePage;
