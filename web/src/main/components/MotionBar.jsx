import { makeStyles } from 'tss-react/mui';
import { useSelector } from 'react-redux';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'inline-flex',
    width: theme.spacing(16),
    height: theme.spacing(1),
    backgroundColor: theme.palette.action.disabledBackground,
  },
  moving: {
    backgroundColor: theme.palette.motion.moving,
  },
  stopped: {
    backgroundColor: theme.palette.motion.stopped,
  },
}));

const MotionBar = ({ deviceId }) => {
  const { classes } = useStyles();
  const segments = useSelector((state) => state.motion?.items?.[deviceId] || []);

  return (
    <span className={classes.root}>
      {segments.map((segment, segmentIndex) => (
        <span
          key={segmentIndex}
          style={{ flexGrow: segment.value, minWidth: segments.length > 16 ? 0 : 4 }}
          className={classes[segment.type]}
        />
      ))}
    </span>
  );
};

export default MotionBar;
