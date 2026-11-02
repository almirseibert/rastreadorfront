import { useEffect, useRef, useState } from 'react';
import { Button, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  canvas: {
    width: '100%',
    height: 180,
    // touch-action: none é o que impede a página de rolar enquanto o dedo assina.
    touchAction: 'none',
    backgroundColor: '#ffffff',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
  },
}));

// Assinatura do cliente em canvas, com pointer events (cobre mouse, dedo e caneta).
// Escrito à mão de propósito: uma lib só para isto seria dependência nova para ~80 linhas.
const SignaturePad = ({ disabled, onSave }) => {
  const { classes } = useStyles();
  const t = useTranslation();
  const canvasRef = useRef();
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    // Resolução real do dispositivo, senão o traço fica serrilhado no celular.
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#182438';
  }, []);

  const positionOf = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event) => {
    if (disabled) {
      return;
    }
    drawing.current = true;
    const context = canvasRef.current.getContext('2d');
    const { x, y } = positionOf(event);
    context.beginPath();
    context.moveTo(x, y);
    canvasRef.current.setPointerCapture?.(event.pointerId);
  };

  const move = (event) => {
    if (!drawing.current) {
      return;
    }
    const context = canvasRef.current.getContext('2d');
    const { x, y } = positionOf(event);
    context.lineTo(x, y);
    context.stroke();
    setDirty(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
  };

  const save = () => {
    canvasRef.current.toBlob((blob) => blob && onSave(blob), 'image/jpeg', 0.85);
  };

  return (
    <div className={classes.root}>
      <Typography variant="body2" color="textSecondary">
        {t('installSignature')}
      </Typography>
      <canvas
        ref={canvasRef}
        className={classes.canvas}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className={classes.actions}>
        <Button size="small" onClick={clear} disabled={disabled || !dirty}>
          {t('installSignatureClear')}
        </Button>
        <Button size="small" variant="contained" onClick={save} disabled={disabled || !dirty}>
          {t('sharedSave')}
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
