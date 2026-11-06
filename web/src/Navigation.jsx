import { Route, Routes, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import MainPage from './main/MainPage';
import CombinedReportPage from './reports/CombinedReportPage';
import PositionsReportPage from './reports/PositionsReportPage';
import ServerPage from './settings/ServerPage';
import UsersPage from './settings/UsersPage';
import DevicePage from './settings/DevicePage';
import UserPage from './settings/UserPage';
import NotificationsPage from './settings/NotificationsPage';
import NotificationPage from './settings/NotificationPage';
import GroupsPage from './settings/GroupsPage';
import GroupPage from './settings/GroupPage';
import PositionPage from './other/PositionPage';
import NetworkPage from './other/NetworkPage';
import EventReportPage from './reports/EventReportPage';
import GeofenceReportPage from './reports/GeofenceReportPage';
import ReplayPage from './other/ReplayPage';
import TripsPage from './other/TripsPage';
import TimelinePage from './other/TimelinePage';
import DashboardPage from './other/DashboardPage';
import TripReportPage from './reports/TripReportPage';
import StopReportPage from './reports/StopReportPage';
import SummaryReportPage from './reports/SummaryReportPage';
import ChartReportPage from './reports/ChartReportPage';
import DriversPage from './settings/DriversPage';
import DriverPage from './settings/DriverPage';
import CalendarsPage from './settings/CalendarsPage';
import CalendarPage from './settings/CalendarPage';
import ComputedAttributesPage from './settings/ComputedAttributesPage';
import ComputedAttributePage from './settings/ComputedAttributePage';
import MaintenancesPage from './settings/MaintenancesPage';
import MaintenancePage from './settings/MaintenancePage';
import CommandsPage from './settings/CommandsPage';
import CommandPage from './settings/CommandPage';
import StatisticsPage from './reports/StatisticsPage';
import LoginPage from './login/LoginPage';
import RegisterPage from './login/RegisterPage';
import ResetPasswordPage from './login/ResetPasswordPage';
import GeofencesPage from './other/GeofencesPage';
import GeofencePage from './settings/GeofencePage';
import { useEffectAsync } from './reactHelper';
import { devicesActions } from './store';
import EventPage from './other/EventPage';
import PreferencesPage from './settings/PreferencesPage';
import AccumulatorsPage from './settings/AccumulatorsPage';
import CommandDevicePage from './settings/CommandDevicePage';
import CommandGroupPage from './settings/CommandGroupPage';
import App from './App';
import ChangeServerPage from './login/ChangeServerPage';
import DevicesPage from './settings/DevicesPage';
import CompaniesPage from './settings/CompaniesPage';
import ScheduledPage from './reports/ScheduledPage';
import DeviceConnectionsPage from './settings/DeviceConnectionsPage';
import GroupConnectionsPage from './settings/GroupConnectionsPage';
import UserConnectionsPage from './settings/UserConnectionsPage';
import LogsPage from './reports/LogsPage';
import SharePage from './settings/SharePage';
import AnnouncementPage from './settings/AnnouncementPage';
import EmulatorPage from './other/EmulatorPage';
import Loader from './common/components/Loader';
import { generateLoginToken } from './common/components/NativeInterface';
import { useLocalization } from './common/components/LocalizationProvider';
import fetchOrThrow from './common/util/fetchOrThrow';
import AuditPage from './reports/AuditPage';
import RequirePage from './common/components/RequirePage';
import ProfilesPage from './settings/ProfilesPage';
import InstallOrdersPage from './install/InstallOrdersPage';
import InstallOrderPage from './install/InstallOrderPage';
import InstallationsPage from './install/InstallationsPage';
import InstallationReviewPage from './install/InstallationReviewPage';
import ChecklistTemplatesPage from './install/ChecklistTemplatesPage';
import ChecklistTemplatePage from './install/ChecklistTemplatePage';

// Envolve o elemento da rota na guarda de perfis de acesso (common/util/pages.js).
// A chave da página é explícita aqui para não depender de inferência pelo pathname.
const guard = (page, element, selfParam) => (
  <RequirePage page={page} selfParam={selfParam}>
    {element}
  </RequirePage>
);

const Navigation = () => {
  const dispatch = useDispatch();
  const { setLocalLanguage } = useLocalization();

  const [searchParams, setSearchParams] = useSearchParams();

  const hasQueryParams = ['locale', 'token', 'uniqueId', 'openid'].some((key) =>
    searchParams.has(key),
  );

  useEffectAsync(async () => {
    if (!hasQueryParams) {
      return;
    }

    const newParams = new URLSearchParams(searchParams);

    if (searchParams.has('locale')) {
      setLocalLanguage(searchParams.get('locale'));
      newParams.delete('locale');
    }

    if (searchParams.has('token')) {
      const token = searchParams.get('token');
      await fetch(`/api/session?token=${encodeURIComponent(token)}`);
      newParams.delete('token');
    }

    if (searchParams.has('uniqueId')) {
      const response = await fetchOrThrow(`/api/devices?uniqueId=${searchParams.get('uniqueId')}`);
      const items = await response.json();
      if (items.length > 0) {
        dispatch(devicesActions.selectId(items[0].id));
      }
      newParams.delete('uniqueId');
    }

    if (searchParams.has('openid')) {
      if (searchParams.get('openid') === 'success') {
        generateLoginToken();
      }
      newParams.delete('openid');
    }

    setSearchParams(newParams, { replace: true });
  }, [hasQueryParams, searchParams, setSearchParams]);

  if (hasQueryParams) {
    return <Loader />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-server" element={<ChangeServerPage />} />
      <Route path="/" element={<App />}>
        <Route index element={guard('map', <MainPage />)} />

        <Route path="position/:id" element={<PositionPage />} />
        <Route path="network/:positionId" element={<NetworkPage />} />
        <Route path="event/:id" element={<EventPage />} />
        <Route path="replay" element={guard('reports.replay', <ReplayPage />)} />
        <Route path="trips" element={guard('trips', <TripsPage />)} />
        <Route path="timeline" element={guard('timeline', <TimelinePage />)} />
        <Route path="dashboard" element={guard('dashboard', <DashboardPage />)} />
        <Route path="geofences" element={guard('geofences', <GeofencesPage />)} />
        <Route path="emulator" element={guard('emulator', <EmulatorPage />)} />

        <Route path="install">
          <Route index element={guard('install', <InstallOrdersPage />)} />
          <Route path="order" element={guard('install', <InstallOrderPage />)} />
          <Route path="order/:id" element={guard('install', <InstallOrderPage />)} />
        </Route>

        <Route path="settings">
          <Route path="companies" element={guard('companies', <CompaniesPage />)} />
          <Route path="profiles" element={guard('profiles', <ProfilesPage />)} />
          <Route path="installations" element={guard('installations', <InstallationsPage />)} />
          <Route
            path="installation/:id"
            element={guard('installations', <InstallationReviewPage />)}
          />
          <Route path="checklists" element={guard('checklists', <ChecklistTemplatesPage />)} />
          <Route path="checklist/:id" element={guard('checklists', <ChecklistTemplatePage />)} />
          <Route path="checklist" element={guard('checklists', <ChecklistTemplatePage />)} />
          <Route path="accumulators/:deviceId" element={guard('devices', <AccumulatorsPage />)} />
          <Route path="announcement" element={guard('announcement', <AnnouncementPage />)} />
          <Route path="calendars" element={guard('calendars', <CalendarsPage />)} />
          <Route path="calendar/:id" element={guard('calendars', <CalendarPage />)} />
          <Route path="calendar" element={guard('calendars', <CalendarPage />)} />
          <Route path="commands" element={guard('commands', <CommandsPage />)} />
          <Route path="command/:id" element={guard('commands', <CommandPage />)} />
          <Route path="command" element={guard('commands', <CommandPage />)} />
          <Route
            path="attributes"
            element={guard('computedAttributes', <ComputedAttributesPage />)}
          />
          <Route
            path="attribute/:id"
            element={guard('computedAttributes', <ComputedAttributePage />)}
          />
          <Route
            path="attribute"
            element={guard('computedAttributes', <ComputedAttributePage />)}
          />
          <Route path="devices" element={guard('devices', <DevicesPage />)} />
          <Route
            path="device/:id/connections"
            element={guard('devices', <DeviceConnectionsPage />)}
          />
          <Route path="device/:id/command" element={guard('devices', <CommandDevicePage />)} />
          <Route path="device/:id/share" element={guard('devices', <SharePage />)} />
          <Route path="device/:id" element={guard('devices', <DevicePage />)} />
          <Route path="device" element={guard('devices', <DevicePage />)} />
          <Route path="drivers" element={guard('drivers', <DriversPage />)} />
          <Route path="driver/:id" element={guard('drivers', <DriverPage />)} />
          <Route path="driver" element={guard('drivers', <DriverPage />)} />
          <Route path="geofence/:id" element={guard('geofences', <GeofencePage />)} />
          <Route path="geofence" element={guard('geofences', <GeofencePage />)} />
          <Route path="groups" element={guard('groups', <GroupsPage />)} />
          <Route path="group/:id/connections" element={guard('groups', <GroupConnectionsPage />)} />
          <Route path="group/:id/command" element={guard('groups', <CommandGroupPage />)} />
          <Route path="group/:id" element={guard('groups', <GroupPage />)} />
          <Route path="group" element={guard('groups', <GroupPage />)} />
          <Route path="maintenances" element={guard('maintenances', <MaintenancesPage />)} />
          <Route path="maintenance/:id" element={guard('maintenances', <MaintenancePage />)} />
          <Route path="maintenance" element={guard('maintenances', <MaintenancePage />)} />
          <Route path="notifications" element={guard('notifications', <NotificationsPage />)} />
          <Route path="notification/:id" element={guard('notifications', <NotificationPage />)} />
          <Route path="notification" element={guard('notifications', <NotificationPage />)} />
          <Route path="preferences" element={guard('preferences', <PreferencesPage />)} />
          <Route path="server" element={guard('server', <ServerPage />)} />
          <Route path="users" element={guard('users', <UsersPage />)} />
          <Route path="user/:id/connections" element={guard('users', <UserConnectionsPage />)} />
          {/* A própria conta usa esta rota: selfParam libera quando o id é do usuário logado. */}
          <Route path="user/:id" element={guard('users', <UserPage />, 'id')} />
          <Route path="user" element={guard('users', <UserPage />)} />
        </Route>

        <Route path="reports">
          <Route path="combined" element={guard('reports.combined', <CombinedReportPage />)} />
          <Route path="chart" element={guard('reports.chart', <ChartReportPage />)} />
          <Route path="events" element={guard('reports.events', <EventReportPage />)} />
          <Route path="geofences" element={guard('reports.geofences', <GeofenceReportPage />)} />
          <Route path="route" element={guard('reports.route', <PositionsReportPage />)} />
          <Route path="stops" element={guard('reports.stops', <StopReportPage />)} />
          <Route path="summary" element={guard('reports.summary', <SummaryReportPage />)} />
          <Route path="trips" element={guard('reports.trips', <TripReportPage />)} />
          <Route path="scheduled" element={guard('reports.scheduled', <ScheduledPage />)} />
          <Route path="statistics" element={guard('reports.statistics', <StatisticsPage />)} />
          <Route path="audit" element={guard('reports.audit', <AuditPage />)} />
          <Route path="logs" element={guard('reports.logs', <LogsPage />)} />
        </Route>
      </Route>
    </Routes>
  );
};

export default Navigation;
