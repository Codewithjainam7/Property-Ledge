import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App.tsx';
import './index.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#22333b',
    },
    secondary: {
      main: '#a9927d',
    },
    background: {
      default: '#f2f4f3',
      paper: '#ffffff',
    },
    text: {
      primary: '#0a0908',
      secondary: '#22333b'
    }
  },
  typography: {
    fontFamily: '"Space Grotesk", "Outfit", "Inter", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 'bold',
      letterSpacing: '0.5px'
    }
  },
  shape: {
    borderRadius: 20,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true
      }
    },
    MuiFormControl: {
      defaultProps: {
        fullWidth: true
      }
    }
  }
});

import { AuthProvider } from './contexts/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
