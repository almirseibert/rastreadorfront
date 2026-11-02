import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { PAGE_GROUPS, assignablePages } from '../../common/util/pages';
import { LEVEL_EDIT, LEVEL_HIDDEN, LEVEL_VIEW } from '../../common/util/useAccess';

const useStyles = makeStyles()((theme) => ({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    padding: theme.spacing(0.5, 0),
  },
  rowLabel: {
    fontSize: '0.875rem',
  },
  toggle: {
    '& .MuiToggleButton-root': {
      padding: theme.spacing(0.25, 1),
    },
  },
}));

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

// Editor de um perfil de acesso: nome + matriz de páginas (oculto / leitura / editável).
const ProfileDialog = ({ open, profile, existingIds = [], onClose, onSave }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const pages = useMemo(() => assignablePages(), []);
  const groups = useMemo(
    () => PAGE_GROUPS.map((group) => ({ group, items: pages.filter((p) => p.group === group) })),
    [pages],
  );

  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [levels, setLevels] = useState({});

  useEffect(() => {
    if (open) {
      setName(profile?.name || '');
      setIsDefault(!!profile?.default);
      setLevels({ ...(profile?.pages || {}) });
    }
  }, [open, profile]);

  const setLevel = (key, level) => {
    setLevels((current) => {
      const next = { ...current };
      if (!level || level === LEVEL_HIDDEN) {
        delete next[key];
      } else {
        next[key] = level;
      }
      return next;
    });
  };

  const setGroupLevel = (items, level) => {
    setLevels((current) => {
      const next = { ...current };
      items.forEach((page) => {
        if (!level || level === LEVEL_HIDDEN) {
          delete next[page.key];
        } else {
          next[page.key] = level === LEVEL_EDIT && !page.editable ? LEVEL_VIEW : level;
        }
      });
      return next;
    });
  };

  const id = profile?.id || slugify(name);
  const duplicated = !profile?.id && existingIds.includes(id);
  const valid = name.trim().length > 1 && id.length > 0 && !duplicated;

  const groupLabel = (group) => {
    if (group === 'views') return t('profileGroupViews');
    if (group === 'reports') return t('reportTitle');
    return t('settingsTitle');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{profile?.id ? profile.name : t('profileNew')}</DialogTitle>
      <DialogContent className={classes.content}>
        <TextField
          label={t('sharedName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={duplicated}
          helperText={duplicated ? t('profileDuplicated') : `id: ${id || '—'}`}
          autoFocus
          fullWidth
        />
        <FormControlLabel
          control={
            <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          }
          label={t('profileDefault')}
        />
        <Typography variant="body2" color="textSecondary">
          {t('profilePagesHint')}
        </Typography>

        {groups.map(({ group, items }) => (
          <div key={group}>
            <Divider />
            <div className={classes.groupHeader}>
              <Typography variant="subtitle2">{groupLabel(group)}</Typography>
              <div>
                <Button size="small" onClick={() => setGroupLevel(items, LEVEL_HIDDEN)}>
                  {t('profileLevelHidden')}
                </Button>
                <Button size="small" onClick={() => setGroupLevel(items, LEVEL_VIEW)}>
                  {t('profileLevelView')}
                </Button>
                <Button size="small" onClick={() => setGroupLevel(items, LEVEL_EDIT)}>
                  {t('profileLevelEdit')}
                </Button>
              </div>
            </div>
            {items.map((page) => (
              <div key={page.key} className={classes.row}>
                <span className={classes.rowLabel}>{t(page.labelKey) || page.key}</span>
                <ToggleButtonGroup
                  className={classes.toggle}
                  exclusive
                  size="small"
                  value={levels[page.key] || LEVEL_HIDDEN}
                  onChange={(event, value) => value && setLevel(page.key, value)}
                >
                  <ToggleButton value={LEVEL_HIDDEN}>
                    <Tooltip title={t('profileLevelHidden')}>
                      <VisibilityOffIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value={LEVEL_VIEW}>
                    <Tooltip title={t('profileLevelView')}>
                      <VisibilityIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                  <ToggleButton value={LEVEL_EDIT} disabled={!page.editable}>
                    <Tooltip title={t('profileLevelEdit')}>
                      <EditIcon fontSize="small" />
                    </Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>
            ))}
          </div>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('sharedCancel')}</Button>
        <Button
          variant="contained"
          disabled={!valid}
          onClick={() => onSave({ id, name: name.trim(), default: isDefault, pages: levels })}
        >
          {t('sharedSave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
