import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Marca compacta para o trilho de navegação (o logo completo é usado no login).
// Respeita o logo white-label do servidor quando houver.
const LogoMark = () => {
  const theme = useTheme();
  const logo = useSelector((state) => state.session.server.attributes?.logo);

  if (logo) {
    return <img src={logo} alt="" style={{ maxWidth: 60, maxHeight: 40 }} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '8px',
          backgroundColor: theme.palette.sidebar.text,
          color: theme.palette.sidebar.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1.25rem',
          lineHeight: 1,
        }}
      >
        A
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: theme.palette.sidebar.text,
        }}
      >
        ARGOS
      </Box>
    </Box>
  );
};

export default LogoMark;
