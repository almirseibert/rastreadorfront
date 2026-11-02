import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useTranslation } from '../../common/components/LocalizationProvider';

// Leitura do IMEI pela câmera. Reaproveita a mesma lib já usada em login/ChangeServerPage.jsx
// (@yudiel/react-qr-scanner), que cai no BarcodeDetector nativo quando disponível — assim
// etiquetas com código de barras também funcionam, sem dependência nova.
const FORMATS = ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix', 'itf'];

const UniqueIdScanner = ({ open, onClose, onResult }) => {
  const t = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('installScan')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {t('installScanHint')}
        </Typography>
        {open && (
          <Scanner
            formats={FORMATS}
            onScan={(results) => {
              const value = results?.[0]?.rawValue;
              if (value) {
                // Etiquetas costumam trazer prefixos/espaços; o uniqueId é só o alfanumérico.
                onResult(value.trim().replace(/[^A-Za-z0-9]/g, ''));
                onClose();
              }
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('sharedCancel')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UniqueIdScanner;
