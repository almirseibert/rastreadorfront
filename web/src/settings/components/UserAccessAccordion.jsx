import { useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { makeStyles } from 'tss-react/mui';
import { useSelector } from 'react-redux';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { PAGE_GROUPS, assignablePages } from '../../common/util/pages';
import {
  LEVEL_EDIT,
  LEVEL_HIDDEN,
  LEVEL_VIEW,
  PAGES_DENY_ATTRIBUTE,
  PAGES_EXTRA_ATTRIBUTE,
  PROFILE_ATTRIBUTE,
  parseDenied,
  parseOverrides,
  parseProfiles,
  profileById,
  stringifyOverrides,
} from '../../common/util/useAccess';

const useStyles = makeStyles()((theme) => ({
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    paddingBottom: theme.spacing(3),
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  label: {
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  group: {
    marginTop: theme.spacing(1),
  },
}));

const INHERIT = 'inherit';
const DENY = 'deny';

// Acesso por páginas de um usuário: escolhe o "tipo de usuário" (perfil) e, se necessário,
// adiciona ou remove páginas só para ele — o pedido "dentro de um tipo de usuário adicionar
// certa página se precisar".
const UserAccessAccordion = ({ item, setItem }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const server = useSelector((state) => state.session.server);
  const profiles = useMemo(() => parseProfiles(server), [server]);
  const pages = useMemo(() => assignablePages(), []);

  const attributes = item.attributes || {};
  const profileId = attributes[PROFILE_ATTRIBUTE] || '';
  const profile = profileById(profiles, profileId);
  const extra = parseOverrides(attributes[PAGES_EXTRA_ATTRIBUTE]);
  const denied = parseDenied(attributes[PAGES_DENY_ATTRIBUTE]);

  const setAttribute = (key, value) => {
    const next = { ...attributes };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    setItem({ ...item, attributes: next });
  };

  const stateOf = (key) => {
    if (denied.includes(key)) return DENY;
    if (extra[key]) return extra[key];
    return INHERIT;
  };

  const inheritedLevel = (key) => profile?.pages?.[key] || LEVEL_HIDDEN;

  const setState = (key, state) => {
    const nextExtra = { ...extra };
    let nextDenied = denied.filter((it) => it !== key);
    delete nextExtra[key];

    if (state === DENY) {
      nextDenied = [...nextDenied, key];
    } else if (state === LEVEL_VIEW || state === LEVEL_EDIT) {
      nextExtra[key] = state;
    }

    const next = { ...attributes };
    const extraValue = stringifyOverrides(nextExtra);
    const denyValue = nextDenied.join(',');
    if (extraValue) {
      next[PAGES_EXTRA_ATTRIBUTE] = extraValue;
    } else {
      delete next[PAGES_EXTRA_ATTRIBUTE];
    }
    if (denyValue) {
      next[PAGES_DENY_ATTRIBUTE] = denyValue;
    } else {
      delete next[PAGES_DENY_ATTRIBUTE];
    }
    setItem({ ...item, attributes: next });
  };

  const levelLabel = (level) => {
    if (level === LEVEL_EDIT) return t('profileLevelEdit');
    if (level === LEVEL_VIEW) return t('profileLevelView');
    return t('profileLevelHidden');
  };

  const groupLabel = (group) => {
    if (group === 'views') return t('profileGroupViews');
    if (group === 'reports') return t('reportTitle');
    return t('settingsTitle');
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">{t('userAccess')}</Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.details}>
        <FormControl>
          <InputLabel>{t('userProfile')}</InputLabel>
          <Select
            label={t('userProfile')}
            value={profileId}
            onChange={(e) => setAttribute(PROFILE_ATTRIBUTE, e.target.value)}
          >
            <MenuItem value="">{t('userProfileNone')}</MenuItem>
            {profiles.map((it) => (
              <MenuItem key={it.id} value={it.id}>
                {it.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {item.administrator ? (
          <Typography variant="body2" color="textSecondary">
            {t('userAccessAdmin')}
          </Typography>
        ) : (
          <Typography variant="body2" color="textSecondary">
            {profileId ? t('userAccessHint') : t('userAccessNoProfile')}
          </Typography>
        )}

        {!item.administrator &&
          PAGE_GROUPS.map((group) => (
            <div key={group} className={classes.group}>
              <Typography variant="subtitle2">{groupLabel(group)}</Typography>
              {pages
                .filter((page) => page.group === group)
                .map((page) => (
                  <div key={page.key} className={classes.row}>
                    <span className={classes.label}>
                      {t(page.labelKey) || page.key}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={levelLabel(inheritedLevel(page.key))}
                      />
                    </span>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={stateOf(page.key)}
                      onChange={(event, value) => value && setState(page.key, value)}
                    >
                      <ToggleButton value={INHERIT}>
                        <Tooltip title={t('profileInherit')}>
                          <span>=</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value={LEVEL_VIEW}>
                        <Tooltip title={t('profileLevelView')}>
                          <span>{t('profileLevelView')}</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value={LEVEL_EDIT} disabled={!page.editable}>
                        <Tooltip title={t('profileLevelEdit')}>
                          <span>{t('profileLevelEdit')}</span>
                        </Tooltip>
                      </ToggleButton>
                      <ToggleButton value={DENY}>
                        <Tooltip title={t('profileBlock')}>
                          <span>✕</span>
                        </Tooltip>
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </div>
                ))}
            </div>
          ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default UserAccessAccordion;
