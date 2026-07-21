import { useMemo } from 'react';
import { Chip } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import dayjs from 'dayjs';

const useStyles = makeStyles()((theme) => ({
  strip: {
    display: 'flex',
    gap: theme.spacing(0.5),
    overflowX: 'auto',
    paddingBottom: theme.spacing(0.5),
    '&::-webkit-scrollbar': {
      height: 4,
    },
  },
}));

// Fita horizontal de datas estilo Ruhavik (Hoje, Ontem, DD/MM...)
const DateStrip = ({ selectedDate, onChange, daysBack = 30 }) => {
  const { classes } = useStyles();

  const dates = useMemo(
    () => Array.from({ length: daysBack }, (_, i) => dayjs().startOf('day').subtract(i, 'day')),
    [daysBack],
  );

  const dateLabel = (date, index) => {
    if (index === 0) return 'Hoje';
    if (index === 1) return 'Ontem';
    return date.format('DD/MM');
  };

  return (
    <div className={classes.strip}>
      {dates.map((date, index) => (
        <Chip
          key={date.valueOf()}
          size="small"
          label={dateLabel(date, index)}
          color={date.isSame(selectedDate, 'day') ? 'primary' : 'default'}
          variant={date.isSame(selectedDate, 'day') ? 'filled' : 'outlined'}
          onClick={() => onChange(date)}
        />
      ))}
    </div>
  );
};

export default DateStrip;
