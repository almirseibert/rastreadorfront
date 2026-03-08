export default {
  MuiUseMediaQuery: {
    defaultProps: {
      noSsr: true,
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.background.default,
        borderRadius: '4px', // Borda mais reta/quadrada imitando SigaSul
      }),
      input: {
        padding: '8px 12px', // Caixas de texto mais compactas
      }
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '4px', // Botões flat e retos
        textTransform: 'none', // Remove letras 100% maiúsculas
        fontWeight: 'bold',
      },
      sizeMedium: {
        height: '36px',
      },
    },
  },
  MuiFormControl: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiSnackbar: {
    defaultProps: {
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'center',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      enterDelay: 500,
      enterNextDelay: 500,
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: '10px 16px', // Compacta as tabelas do Grid para mostrar mais linhas
        '@media print': {
          color: theme.palette.alwaysDark.main,
        },
      }),
      head: {
        fontWeight: 'bold', // Títulos das colunas em negrito
      }
    },
  },
};