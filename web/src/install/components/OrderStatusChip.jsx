import { Chip } from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { statusColor, statusLabelKey } from '../util/orderStatus';

const OrderStatusChip = ({ status, size = 'small' }) => {
  const t = useTranslation();
  return (
    <Chip size={size} color={statusColor(status)} label={t(statusLabelKey(status)) || status} />
  );
};

export default OrderStatusChip;
