import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Divider, Typography, IconButton, Toolbar, Paper, Snackbar } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { makeStyles } from 'tss-react/mui';
import { useTheme } from '@mui/material/styles';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import MapView from '../map/core/MapView';
import MapCurrentLocation from '../map/MapCurrentLocation';
import MapGeofenceEdit from '../map/draw/MapGeofenceEdit';
import GeofencesList from './GeofencesList';
import GeofenceWizard from './GeofenceWizard';
import { useTranslation } from '../common/components/LocalizationProvider';
import MapGeocoder from '../map/geocoder/MapGeocoder';
import { errorsActions, geofencesActions } from '../store';
import MapScale from '../map/MapScale';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { geofenceToFeature } from '../map/core/mapUtil';
import { buildKml, parseKml } from '../common/util/kml';
import { snackBarDurationShortMs } from '../common/util/duration';

const useStyles = makeStyles()((theme) => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column-reverse',
    },
  },
  drawer: {
    display: 'flex',
    flexDirection: 'column',
    [theme.breakpoints.up('sm')]: {
      width: theme.dimensions.drawerWidthDesktop,
    },
    [theme.breakpoints.down('sm')]: {
      height: theme.dimensions.drawerHeightPhone,
    },
  },
  mapContainer: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  fileInput: {
    display: 'none',
  },
}));

const GeofencesPage = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const geofences = useSelector((state) => state.geofences.items);

  const [selectedGeofenceId, setSelectedGeofenceId] = useState();
  const [wizardArea, setWizardArea] = useState();
  const [snackbar, setSnackbar] = useState();

  const refreshGeofences = async () => {
    const response = await fetchOrThrow('/api/geofences');
    dispatch(geofencesActions.refresh(await response.json()));
  };

  const importKml = async (text) => {
    const items = parseKml(text);
    if (!items.length) {
      dispatch(errorsActions.push(t('sharedNoData')));
      return;
    }
    await Promise.all(
      items.map((item) =>
        fetchOrThrow('/api/geofences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, attributes: {} }),
        }),
      ),
    );
    await refreshGeofences();
    setSnackbar(`${items.length} ${t('sharedGeofences')}`);
  };

  const importGpx = async (text) => {
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    const segment = xml.getElementsByTagName('trkseg')[0];
    const coordinates = Array.from(segment.getElementsByTagName('trkpt'))
      .map((point) => `${point.getAttribute('lat')} ${point.getAttribute('lon')}`)
      .join(', ');
    const area = `LINESTRING (${coordinates})`;
    const response = await fetchOrThrow('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t('sharedGeofence'), area }),
    });
    const item = await response.json();
    navigate(`/settings/geofence/${item.id}`);
  };

  const handleFile = (event) => {
    const [file] = Array.from(event.target.files);
    if (!file) {
      return;
    }
    const isKml = file.name.toLowerCase().endsWith('.kml');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (isKml) {
          await importKml(reader.result);
        } else {
          await importGpx(reader.result);
        }
      } catch (error) {
        dispatch(errorsActions.push(error.message));
      }
    };
    reader.onerror = () => dispatch(errorsActions.push(reader.error.message));
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExport = () => {
    const items = Object.values(geofences).map((item) => ({
      name: item.name,
      geometry: geofenceToFeature(theme, item).geometry,
    }));
    const blob = new Blob([buildKml(items)], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'geofences.kml';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={classes.root}>
      <div className={classes.content}>
        <Paper square className={classes.drawer}>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
              <BackIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              {t('sharedGeofences')}
            </Typography>
            <Tooltip title={t('geofenceExport')}>
              <span>
                <IconButton
                  onClick={handleExport}
                  disabled={!Object.keys(geofences).length}
                >
                  <DownloadIcon />
                </IconButton>
              </span>
            </Tooltip>
            <label htmlFor="upload-geofence">
              <input
                accept=".gpx,.kml"
                id="upload-geofence"
                type="file"
                className={classes.fileInput}
                onChange={handleFile}
              />
              <Tooltip title={t('sharedUpload')}>
                <IconButton edge="end" component="span">
                  <UploadFileIcon />
                </IconButton>
              </Tooltip>
            </label>
          </Toolbar>
          <Divider />
          <GeofencesList onGeofenceSelected={setSelectedGeofenceId} />
        </Paper>
        <div className={classes.mapContainer}>
          <MapView>
            <MapGeofenceEdit selectedGeofenceId={selectedGeofenceId} onCreate={setWizardArea} />
          </MapView>
          <MapScale />
          <MapCurrentLocation />
          <MapGeocoder />
        </div>
      </div>
      <GeofenceWizard
        area={wizardArea}
        onClose={() => setWizardArea(undefined)}
        onSaved={() => {
          setWizardArea(undefined);
          setSnackbar(t('geofenceWizardSaved'));
        }}
      />
      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={snackBarDurationShortMs}
        onClose={() => setSnackbar(undefined)}
        message={snackbar}
      />
    </div>
  );
};

export default GeofencesPage;
