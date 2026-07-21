import { geometryToArea } from '../../map/core/mapUtil';

// Utilitários de import/export KML para geofences (paridade com Ruhavik, que exporta .kml/.kmz).
// As áreas do Traccar são WKT com ordem "lat lon"; o KML usa "lon,lat,alt". A conversão
// passa sempre por geometrias GeoJSON ([lon, lat]) para reaproveitar geometryToArea/geofenceToFeature.

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// "lon,lat,alt lon,lat" -> [[lon, lat], ...] (ignora altitude e separadores em branco/linha).
const parseKmlCoordinates = (text) =>
  (text || '')
    .trim()
    .split(/\s+/)
    .map((tuple) => tuple.split(',').map(Number))
    .filter((pair) => pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map(([lon, lat]) => [lon, lat]);

const closeRing = (ring) => {
  if (ring.length < 3) {
    return ring;
  }
  const [first] = ring;
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, first];
  }
  return ring;
};

// Lê um arquivo .kml e devolve [{ name, area }] pronto para POST em /api/geofences.
export const parseKml = (text) => {
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  if (xml.getElementsByTagName('parsererror').length) {
    throw new Error('Invalid KML file');
  }
  const results = [];
  Array.from(xml.getElementsByTagName('Placemark')).forEach((placemark, index) => {
    const name = placemark.getElementsByTagName('name')[0]?.textContent?.trim() || `Geofence ${index + 1}`;
    const polygon = placemark.getElementsByTagName('Polygon')[0];
    const lineString = placemark.getElementsByTagName('LineString')[0];

    let geometry;
    if (polygon) {
      const ring = placemark
        .querySelector('Polygon outerBoundaryIs LinearRing coordinates')
        || polygon.getElementsByTagName('coordinates')[0];
      const coordinates = parseKmlCoordinates(ring?.textContent);
      if (coordinates.length >= 3) {
        geometry = { type: 'Polygon', coordinates: [closeRing(coordinates)] };
      }
    } else if (lineString) {
      const coordinates = parseKmlCoordinates(lineString.getElementsByTagName('coordinates')[0]?.textContent);
      if (coordinates.length >= 2) {
        geometry = { type: 'LineString', coordinates };
      }
    }

    if (geometry) {
      results.push({ name, area: geometryToArea(geometry) });
    }
  });
  return results;
};

const coordinatesToKml = (ring) => ring.map(([lon, lat]) => `${lon},${lat}`).join(' ');

// Converte a geometria GeoJSON de uma geofence (de geofenceToFeature) em um <Placemark>.
// Círculos já chegam aqui como polígono (turf), pois o KML não tem geometria de círculo.
const geometryToPlacemark = (name, geometry) => {
  if (!geometry) {
    return '';
  }
  const label = `<name>${escapeXml(name)}</name>`;
  if (geometry.type === 'Polygon') {
    return `<Placemark>${label}<Polygon><outerBoundaryIs><LinearRing>`
      + `<coordinates>${coordinatesToKml(geometry.coordinates[0])}</coordinates>`
      + '</LinearRing></outerBoundaryIs></Polygon></Placemark>';
  }
  if (geometry.type === 'LineString') {
    return `<Placemark>${label}<LineString>`
      + `<coordinates>${coordinatesToKml(geometry.coordinates)}</coordinates>`
      + '</LineString></Placemark>';
  }
  return '';
};

// Monta um documento .kml a partir de [{ name, geometry }] (geometry em GeoJSON [lon, lat]).
export const buildKml = (items) => {
  const placemarks = items
    .map((item) => geometryToPlacemark(item.name, item.geometry))
    .filter(Boolean)
    .join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n'
    + `${placemarks}\n`
    + '</Document>\n</kml>\n';
};
