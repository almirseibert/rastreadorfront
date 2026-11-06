import { useState } from 'react';
import { Dialog, DialogContent, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { argosUrl } from '../../common/util/argosApi';
import PHOTO_SLOTS, { SIGNATURE_SLOT } from '../util/photoSlots';

const useStyles = makeStyles()((theme) => ({
  group: {
    marginBottom: theme.spacing(2),
  },
  thumbs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  thumb: {
    width: 120,
    height: 120,
    objectFit: 'cover',
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    cursor: 'zoom-in',
  },
  full: {
    width: '100%',
    display: 'block',
  },
}));

const LABELS = PHOTO_SLOTS.reduce((acc, slot) => ({ ...acc, [slot.key]: slot.labelKey }), {
  [SIGNATURE_SLOT]: 'installSignature',
});

// Galeria agrupada por slot, com visualização ampliada. Usada na revisão da ordem pelo admin.
const PhotoGallery = ({ photos = [] }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const [zoom, setZoom] = useState(null);

  const grouped = photos.reduce((acc, photo) => {
    acc[photo.slot] = [...(acc[photo.slot] || []), photo];
    return acc;
  }, {});

  if (!photos.length) {
    return <Typography variant="body2">{t('sharedNoData')}</Typography>;
  }

  return (
    <>
      {Object.entries(grouped).map(([slot, slotPhotos]) => (
        <div key={slot} className={classes.group}>
          <Typography variant="subtitle2">{t(LABELS[slot]) || slot}</Typography>
          <div className={classes.thumbs}>
            {slotPhotos.map((photo) => (
              <img
                key={photo.id}
                className={classes.thumb}
                src={argosUrl(photo.thumbUrl)}
                alt={slot}
                onClick={() => setZoom(photo)}
              />
            ))}
          </div>
        </div>
      ))}
      <Dialog open={!!zoom} onClose={() => setZoom(null)} fullWidth maxWidth="md">
        <DialogContent sx={{ p: 0 }}>
          {zoom && <img className={classes.full} src={argosUrl(zoom.url)} alt={zoom.slot} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
