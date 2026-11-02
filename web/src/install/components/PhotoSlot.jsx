import { useRef, useState } from 'react';
import { Chip, IconButton, LinearProgress, Paper, Tooltip, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { argosUrl } from '../../common/util/argosApi';

const useStyles = makeStyles()((theme) => ({
  root: {
    padding: theme.spacing(1.5),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.dimensions.radiusCard,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  title: {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  thumbs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  thumbBox: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    border: `1px solid ${theme.palette.divider}`,
  },
  thumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.palette.background.paper,
    '&:hover': { backgroundColor: theme.palette.background.paper },
  },
  // Alvo grande: o técnico usa em campo, muitas vezes de luva.
  capture: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    width: 96,
    height: 96,
    borderRadius: 8,
    border: `1px dashed ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    backgroundColor: theme.palette.action.hover,
  },
  hidden: {
    display: 'none',
  },
}));

// Um slot de foto da ordem: aciona a câmera, mostra as fotos enviadas, o progresso do envio
// e permite repetir um envio que falhou.
const PhotoSlot = ({ slot, photos = [], disabled, upload, onRemove }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const inputRef = useRef();

  const [progress, setProgress] = useState(null);
  const [failed, setFailed] = useState(null);

  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    for (const file of list) {
      setFailed(null);
      setProgress(0);
      try {
        // Sequencial de propósito: em rede ruim, paralelizar piora o tempo total.
        await upload(file, slot.key, setProgress);
      } catch (error) {
        setFailed({ file, message: error.message });
        break;
      } finally {
        setProgress(null);
      }
      if (!slot.multiple) {
        break;
      }
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const canAdd = !disabled && (slot.multiple || photos.length === 0);

  return (
    <Paper className={classes.root} elevation={0}>
      <div className={classes.header}>
        <span className={classes.title}>{t(slot.labelKey)}</span>
        {slot.required && (
          <Chip
            size="small"
            color={photos.length ? 'success' : 'default'}
            variant={photos.length ? 'filled' : 'outlined'}
            label={photos.length ? '✓' : t('sharedRequired')}
          />
        )}
      </div>

      <div className={classes.thumbs}>
        {photos.map((photo) => (
          <div key={photo.id} className={classes.thumbBox}>
            <img className={classes.thumb} src={argosUrl(photo.thumbUrl)} alt={slot.key} />
            {!disabled && (
              <Tooltip title={t('sharedRemove')}>
                <IconButton
                  size="small"
                  className={classes.remove}
                  onClick={() => onRemove(photo.id)}
                >
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        ))}

        {canAdd && (
          <>
            <div
              className={classes.capture}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            >
              <PhotoCameraIcon />
            </div>
            <input
              ref={inputRef}
              className={classes.hidden}
              type="file"
              accept="image/*"
              capture="environment"
              multiple={!!slot.multiple}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {progress !== null && <LinearProgress variant="determinate" value={progress} />}

      {failed && (
        <div className={classes.header}>
          <Typography variant="caption" color="error">
            {t('installPhotoFailed')}: {failed.message}
          </Typography>
          <Tooltip title={t('installPhotoRetry')}>
            <IconButton size="small" onClick={() => handleFiles([failed.file])}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </Paper>
  );
};

export default PhotoSlot;
