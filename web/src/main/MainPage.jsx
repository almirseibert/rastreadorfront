import { useState, useCallback, useEffect } from 'react';
import { Paper } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useOutletContext } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import DeviceList from './DeviceList';
import StatusCard from '../common/components/StatusCard';
import { devicesActions } from '../store';
import usePersistedState from '../common/util/usePersistedState';
import EventsDrawer from './EventsDrawer';
import useFilter from './useFilter';
import MainToolbar from './MainToolbar';
import MainMap from './MainMap';
import { useAttributePreference } from '../common/util/preferences';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    width: '100%',
    position: 'relative',
    display: 'flex',
  },
  // Painel flutuante de veículos sobre o mapa (estilo SigaSul), no desktop.
  // Posicionado dentro da área de conteúdo do chrome global (App.jsx).
  floatingSidebar: {
    pointerEvents: 'none',
    position: 'absolute',
    left: theme.spacing(1.5),
    top: theme.spacing(1.5),
    bottom: theme.spacing(1.5),
    width: theme.dimensions.drawerWidthDesktop,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 3,
  },
  floatingPanel: {
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    border: `1px solid ${theme.palette.divider}`,
  },
  floatingPanelOpen: {
    height: '100%',
  },
  floatingList: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  // Layout mobile (tela cheia com mapa atrás e menu inferior).
  sidebar: {
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  header: {
    pointerEvents: 'auto',
    zIndex: 6,
    boxShadow: 'none',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  middle: {
    flex: 1,
    display: 'grid',
    minHeight: 0,
  },
  contentMap: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
  },
  contentList: {
    pointerEvents: 'auto',
    gridArea: '1 / 1',
    zIndex: 4,
    display: 'flex',
    minHeight: 0,
  },
}));

const MainPage = () => {
  const { classes, cx } = useStyles();
  const dispatch = useDispatch();
  const theme = useTheme();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const mapOnSelect = useAttributePreference('mapOnSelect', true);

  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const positions = useSelector((state) => state.session.positions);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const selectedPosition = filteredPositions.find(
    (position) => selectedDeviceId && position.deviceId === selectedDeviceId,
  );

  const [filteredDevices, setFilteredDevices] = useState([]);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = usePersistedState('filter', {
    statuses: [],
    groups: [],
  });
  const [filterSort, setFilterSort] = usePersistedState('filterSort', '');
  const [filterMap, setFilterMap] = usePersistedState('filterMap', false);
  const { selectedGroup } = useOutletContext();

  const [devicesOpen, setDevicesOpen] = useState(desktop);
  const [eventsOpen, setEventsOpen] = useState(false);

  const onEventsClick = useCallback(() => setEventsOpen(true), [setEventsOpen]);

  useEffect(() => {
    if (!desktop && mapOnSelect && selectedDeviceId) {
      setDevicesOpen(false);
    }
  }, [desktop, mapOnSelect, selectedDeviceId]);

  useFilter(
    keyword,
    filter,
    selectedGroup,
    filterSort,
    filterMap,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  );

  const toolbar = (
    <MainToolbar
      filteredDevices={filteredDevices}
      devicesOpen={devicesOpen}
      setDevicesOpen={setDevicesOpen}
      keyword={keyword}
      setKeyword={setKeyword}
      filter={filter}
      setFilter={setFilter}
      filterSort={filterSort}
      setFilterSort={setFilterSort}
      filterMap={filterMap}
      setFilterMap={setFilterMap}
    />
  );

  return (
    <div className={classes.root}>
      {desktop ? (
        <>
          <MainMap
            filteredPositions={filteredPositions}
            selectedPosition={selectedPosition}
            onEventsClick={onEventsClick}
          />
          <div className={classes.floatingSidebar}>
            <Paper
              elevation={0}
              className={cx(classes.floatingPanel, devicesOpen && classes.floatingPanelOpen)}
            >
              {toolbar}
              {devicesOpen && (
                <div className={classes.floatingList}>
                  <DeviceList devices={filteredDevices} />
                </div>
              )}
            </Paper>
          </div>
        </>
      ) : (
        <div className={classes.sidebar}>
          <Paper square elevation={3} className={classes.header}>
            {toolbar}
          </Paper>
          <div className={classes.middle}>
            <div className={classes.contentMap}>
              <MainMap
                filteredPositions={filteredPositions}
                selectedPosition={selectedPosition}
                onEventsClick={onEventsClick}
              />
            </div>
            <Paper
              square
              className={classes.contentList}
              style={devicesOpen ? {} : { visibility: 'hidden' }}
            >
              <DeviceList devices={filteredDevices} />
            </Paper>
          </div>
        </div>
      )}
      <EventsDrawer open={eventsOpen} onClose={() => setEventsOpen(false)} />
      {selectedDeviceId && (
        <StatusCard
          deviceId={selectedDeviceId}
          position={selectedPosition}
          onClose={() => dispatch(devicesActions.selectId(null))}
          desktopPadding={
            desktop ? theme.dimensions.navSidebarWidth : theme.dimensions.drawerWidthDesktop
          }
        />
      )}
    </div>
  );
};

export default MainPage;
