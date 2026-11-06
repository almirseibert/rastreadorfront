import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import deviceCategories from '../../common/util/deviceCategories';
import { prefixString } from '../../common/util/stringUtils';

const useStyles = makeStyles()((theme) => ({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  row: {
    display: 'flex',
    gap: theme.spacing(1),
  },
}));

// Passo 2 — dados do equipamento instalado. Fica tudo em argos_install_order, e não em
// device.attributes (VARCHAR(4000) compartilhado com atributos do Traccar).
const StepEquipment = ({ order, onPatch, disabled }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const field = (label, key, extra = {}) => (
    <TextField
      label={label}
      value={order?.[key.column] ?? ''}
      onChange={(e) => onPatch({ [key.field]: e.target.value }, true)}
      onBlur={(e) => onPatch({ [key.field]: e.target.value })}
      disabled={disabled}
      fullWidth
      {...extra}
    />
  );

  const categoryOptions = deviceCategories
    .map((it) => ({ id: it, name: t(prefixString('category', it)) || it }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={classes.form}>
      <FormControl fullWidth>
        <InputLabel>{t('deviceCategory')}</InputLabel>
        <Select
          label={t('deviceCategory')}
          value={order?.equipment_category || ''}
          onChange={(e) => onPatch({ equipmentCategory: e.target.value })}
          disabled={disabled}
        >
          {categoryOptions.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {field(t('installVehiclePlate'), { field: 'vehiclePlate', column: 'vehicle_plate' })}
      <div className={classes.row}>
        {field(t('installVehicleBrand'), { field: 'vehicleBrand', column: 'vehicle_brand' })}
        {field(t('installVehicleModel'), { field: 'vehicleModel', column: 'vehicle_model' })}
      </div>
      <div className={classes.row}>
        {field(
          t('installVehicleYear'),
          {
            field: 'vehicleYear',
            column: 'vehicle_year',
          },
          { type: 'number' },
        )}
        {field(t('installVehicleColor'), { field: 'vehicleColor', column: 'vehicle_color' })}
      </div>
      {field(
        `${t('installOdometerStart')} (${t('sharedKm')})`,
        {
          field: 'odometerStart',
          column: 'odometer_start',
        },
        { type: 'number' },
      )}
      {field(t('installLocation'), { field: 'installLocation', column: 'install_location' })}

      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!order?.has_immobilizer}
              onChange={(e) => onPatch({ hasImmobilizer: e.target.checked })}
            />
          }
          label={t('installHasImmobilizer')}
          disabled={disabled}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!order?.has_siren}
              onChange={(e) => onPatch({ hasSiren: e.target.checked })}
            />
          }
          label={t('installHasSiren')}
          disabled={disabled}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={!!order?.has_panic_button}
              onChange={(e) => onPatch({ hasPanicButton: e.target.checked })}
            />
          }
          label={t('installHasPanic')}
          disabled={disabled}
        />
      </FormGroup>

      {field(t('installNotes'), { field: 'notes', column: 'notes' }, { multiline: true, rows: 3 })}
    </div>
  );
};

export default StepEquipment;
