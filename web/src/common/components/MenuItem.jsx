import { makeStyles } from 'tss-react/mui';
import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Link } from 'react-router-dom';

// Estilo alinhado à AppSidebar (mesmos tokens sidebar.*), para que os menus de
// Configurações e Relatórios (dentro do PageLayout) tenham a mesma aparência do menu do mapa.
const useStyles = makeStyles()((theme) => ({
  menuItem: {
    padding: theme.spacing(1.25, 2),
    borderLeft: '4px solid transparent',
    color: theme.palette.sidebar.text,
    '&:hover': {
      backgroundColor: theme.palette.sidebar.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.sidebar.selected,
      borderLeft: `4px solid ${theme.palette.primary.main}`,
    },
    '&.Mui-selected:hover': {
      backgroundColor: theme.palette.sidebar.selected,
    },
  },
  icon: {
    color: theme.palette.sidebar.textMuted,
    minWidth: 40,
  },
  iconSelected: {
    color: theme.palette.primary.main,
    minWidth: 40,
  },
  menuItemText: {
    whiteSpace: 'nowrap',
    '& span': {
      fontSize: '0.85rem',
      fontWeight: 500,
    },
  },
}));

const MenuItem = ({ title, link, icon, selected }) => {
  const { classes } = useStyles();
  return (
    <ListItemButton
      key={link}
      className={classes.menuItem}
      component={Link}
      to={link}
      selected={selected}
    >
      <ListItemIcon className={selected ? classes.iconSelected : classes.icon}>{icon}</ListItemIcon>
      <ListItemText primary={title} className={classes.menuItemText} />
    </ListItemButton>
  );
};

export default MenuItem;
