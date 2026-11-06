import { Alert, AlertTitle, Typography } from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';

// Mostrado quando o argos-api não responde em /argos — tipicamente porque a regra de
// proxy do EasyPanel ainda não existe (aí a requisição cai no servidor web do Traccar e
// volta HTML) ou o serviço está fora do ar. Sem isso, o instalador em campo via um
// fragmento de HTML no snackbar, sem pista do que fazer.
const ServiceUnavailable = () => {
  const t = useTranslation();

  return (
    <Alert severity="warning" sx={{ m: 2 }}>
      <AlertTitle>{t('installServiceUnavailable')}</AlertTitle>
      <Typography variant="body2">{t('installServiceUnavailableHint')}</Typography>
    </Alert>
  );
};

export default ServiceUnavailable;
