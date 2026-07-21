import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { sessionActions } from '../../store';
import { nativePostMessage } from './NativeInterface';

// Lógica de navegação compartilhada entre a sidebar desktop (AppSidebar)
// e o menu inferior mobile (BottomMenu).
const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const devices = useSelector((state) => state.devices.items);
  const user = useSelector((state) => state.session.user);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);

  const currentSelection = () => {
    if (location.pathname === `/settings/user/${user.id}`) return 'account';
    if (location.pathname.startsWith('/settings/device')) return 'devices';
    if (location.pathname.startsWith('/settings')) return 'settings';
    if (location.pathname.startsWith('/reports')) return 'reports';
    if (location.pathname === '/trips') return 'trips';
    if (location.pathname === '/timeline') return 'timeline';
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname === '/') return 'map';
    return null;
  };

  const handleAccount = () => {
    navigate(`/settings/user/${user.id}`);
  };

  const handleLogout = async () => {
    const notificationToken = window.localStorage.getItem('notificationToken');
    if (notificationToken && !user.readonly) {
      window.localStorage.removeItem('notificationToken');
      const tokens = user.attributes.notificationTokens?.split(',') || [];
      if (tokens.includes(notificationToken)) {
        const updatedUser = {
          ...user,
          attributes: {
            ...user.attributes,
            notificationTokens:
              tokens.length > 1
                ? tokens.filter((it) => it !== notificationToken).join(',')
                : undefined,
          },
        };
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });
      }
    }

    await fetch('/api/session', { method: 'DELETE' });
    nativePostMessage('logout');
    navigate('/login');
    dispatch(sessionActions.updateUser(null));
  };

  const handleSelection = (value) => {
    switch (value) {
      case 'map':
        navigate('/');
        break;
      case 'devices':
        navigate('/settings/devices');
        break;
      case 'trips':
        navigate('/trips');
        break;
      case 'timeline':
        navigate('/timeline');
        break;
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'reports': {
        let id = selectedDeviceId;
        if (id == null) {
          const deviceIds = Object.keys(devices);
          if (deviceIds.length === 1) {
            id = deviceIds[0];
          }
        }
        if (id != null) {
          navigate(`/reports/combined?deviceId=${id}`);
        } else {
          navigate('/reports/combined');
        }
        break;
      }
      case 'settings':
        navigate('/settings/preferences?menu=true');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        break;
    }
  };

  return { user, currentSelection, handleSelection, handleAccount, handleLogout };
};

export default useNavigation;
