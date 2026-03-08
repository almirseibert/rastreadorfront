import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';

const useStyles = makeStyles()((theme) => ({
  root: {
    display: 'flex',
    height: '100vh',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Fundo cinza claro idêntico ao SigaSul
  },
  paper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(4, 5),
    boxShadow: '0px 4px 20px rgba(95, 174, 226, 0.9)', // Sombra super suave
    borderRadius: '8px',
    width: '100%',
    maxWidth: '400px', // Limita a largura do cartão para ficar elegante
  },
  form: {
    width: '100%',
  },
}));

const LoginLayout = ({ children }) => {
  const { classes } = useStyles();

  return (
    <main className={classes.root}>
      <Paper className={classes.paper} elevation={0}>
        <form className={classes.form}>{children}</form>
      </Paper>
    </main>
  );
};

export default LoginLayout;