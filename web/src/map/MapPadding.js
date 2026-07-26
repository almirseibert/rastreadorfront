import { useEffect } from 'react';

import { map } from './core/MapView';
import { useTheme } from '@mui/material';

const MapPadding = ({ start, top = 0 }) => {
  const theme = useTheme();

  useEffect(() => {
    const startKey = theme.direction === 'rtl' ? 'right' : 'left';
    const topStart = document.querySelector(`.maplibregl-ctrl-top-${startKey}`);
    const bottomStart = document.querySelector(`.maplibregl-ctrl-bottom-${startKey}`);
    // Também desloca os controles do topo à direita (zoom + troca de estilo) abaixo da barra
    const topLeft = document.querySelector('.maplibregl-ctrl-top-left');
    const topRight = document.querySelector('.maplibregl-ctrl-top-right');
    topStart.style.insetInlineStart = `${start}px`;
    bottomStart.style.insetInlineStart = `${start}px`;
    if (topLeft) topLeft.style.insetBlockStart = `${top}px`;
    if (topRight) topRight.style.insetBlockStart = `${top}px`;
    map.setPadding({ [theme.direction === 'rtl' ? 'right' : 'left']: start, top });
    return () => {
      topStart.style.insetInlineStart = 0;
      bottomStart.style.insetInlineStart = 0;
      if (topLeft) topLeft.style.insetBlockStart = 0;
      if (topRight) topRight.style.insetBlockStart = 0;
      map.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    };
  }, [start, top]);

  return null;
};

export default MapPadding;
