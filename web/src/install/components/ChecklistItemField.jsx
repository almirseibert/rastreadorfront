import { TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    padding: theme.spacing(1.5, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  // Botões grandes: uso em campo, com uma mão e às vezes de luva.
  toggle: {
    '& .MuiToggleButton-root': {
      flex: 1,
      minHeight: 44,
      textTransform: 'none',
    },
  },
}));

const ChecklistItemField = ({ item, disabled, onChange }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const problem = item.result === 'problem';

  return (
    <div className={classes.root}>
      <Typography variant="body2">
        {item.position}. {item.label_snapshot}
        {item.required ? ' *' : ''}
      </Typography>
      <ToggleButtonGroup
        className={classes.toggle}
        exclusive
        fullWidth
        size="small"
        disabled={disabled}
        value={item.result || null}
        onChange={(event, value) => onChange({ ...item, result: value })}
      >
        <ToggleButton value="ok" color="success">
          {t('installChecklistOk')}
        </ToggleButton>
        <ToggleButton value="na">{t('installChecklistNa')}</ToggleButton>
        <ToggleButton value="problem" color="error">
          {t('installChecklistProblem')}
        </ToggleButton>
      </ToggleButtonGroup>
      {problem && (
        <TextField
          label={t('installChecklistNote')}
          value={item.note || ''}
          onChange={(e) => onChange({ ...item, note: e.target.value })}
          error={!item.note}
          helperText={!item.note ? t('installChecklistNoteRequired') : ''}
          disabled={disabled}
          size="small"
          fullWidth
          multiline
        />
      )}
    </div>
  );
};

export default ChecklistItemField;
