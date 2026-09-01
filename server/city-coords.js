// City-centroid geocoding for the Jobs Map.
//
// Orthogonal returns a city string, not coordinates, and a paid geocoder is not
// worth it here: wherewework-style maps are "hand-authored, not GIS-precise",
// and a pin only has to land on the right city. Unknown city => null coords =>
// the row is still stored and searchable, just not pinned.
//
// Deliberately server-side and separate from src/lib/app-defaults's list: that
// one seeds the founder/VC map's own defaults, while this must cover wherever
// Orthogonal returns results. Different lifecycles, so they grow independently.
// ponytail: static table, swap in a real geocoder if coverage becomes the gap.

const CITY_COORDS = {
  // North America
  'san francisco': [37.7749, -122.4194],
  'bay area': [37.7749, -122.4194],
  'palo alto': [37.4419, -122.143],
  'mountain view': [37.3861, -122.0839],
  'san jose': [37.3382, -121.8863],
  'new york': [40.7128, -74.006],
  nyc: [40.7128, -74.006],
  brooklyn: [40.6782, -73.9442],
  seattle: [47.6062, -122.3321],
  austin: [30.2672, -97.7431],
  boston: [42.3601, -71.0589],
  chicago: [41.8781, -87.6298],
  'los angeles': [34.0522, -118.2437],
  miami: [25.7617, -80.1918],
  denver: [39.7392, -104.9903],
  atlanta: [33.749, -84.388],
  'san diego': [32.7157, -117.1611],
  portland: [45.5152, -122.6784],
  'salt lake city': [40.7608, -111.891],
  toronto: [43.6532, -79.3832],
  vancouver: [49.2827, -123.1207],
  montreal: [45.5019, -73.5674],
  'mexico city': [19.4326, -99.1332],

  // Europe
  london: [51.5072, -0.1276],
  paris: [48.8566, 2.3522],
  berlin: [52.52, 13.405],
  munich: [48.1351, 11.582],
  amsterdam: [52.3676, 4.9041],
  stockholm: [59.3293, 18.0686],
  copenhagen: [55.6761, 12.5683],
  oslo: [59.9139, 10.7522],
  helsinki: [60.1699, 24.9384],
  dublin: [53.3498, -6.2603],
  madrid: [40.4168, -3.7038],
  barcelona: [41.3851, 2.1734],
  lisbon: [38.7223, -9.1393],
  milan: [45.4642, 9.19],
  zurich: [47.3769, 8.5417],
  vienna: [48.2082, 16.3738],
  warsaw: [52.2297, 21.0122],
  prague: [50.0755, 14.4378],

  // Middle East / Africa
  'tel aviv': [32.0853, 34.7818],
  dubai: [25.2048, 55.2708],
  'abu dhabi': [24.4539, 54.3773],
  cairo: [30.0444, 31.2357],
  lagos: [6.5244, 3.3792],
  nairobi: [-1.2921, 36.8219],
  'cape town': [-33.9249, 18.4241],

  // Asia-Pacific
  singapore: [1.3521, 103.8198],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  delhi: [28.6139, 77.209],
  'new delhi': [28.6139, 77.209],
  gurugram: [28.4595, 77.0266],
  hyderabad: [17.385, 78.4867],
  pune: [18.5204, 73.8567],
  chennai: [13.0827, 80.2707],
  tokyo: [35.6762, 139.6503],
  seoul: [37.5665, 126.978],
  'hong kong': [22.3193, 114.1694],
  shanghai: [31.2304, 121.4737],
  beijing: [39.9042, 116.4074],
  shenzhen: [22.5431, 114.0579],
  sydney: [-33.8688, 151.2093],
  melbourne: [-37.8136, 144.9631],
  auckland: [-36.8485, 174.7633],
  jakarta: [-6.2088, 106.8456],
  bangkok: [13.7563, 100.5018],

  // South America
  'sao paulo': [-23.5505, -46.6333],
  'são paulo': [-23.5505, -46.6333],
  'buenos aires': [-34.6037, -58.3816],
  bogota: [4.711, -74.0721],
  santiago: [-33.4489, -70.6693],
};

/**
 * "Berlin, Germany" / "SAN FRANCISCO, CA" / "Remote - London" all have to reach
 * the same entry, so each comma/dash segment is tried, longest first (so
 * "new york" wins over a stray "ny" fragment).
 */
export const geocodeCity = (value) => {
  const raw = String(value ?? '').toLowerCase().trim();
  if (!raw) return null;

  const direct = CITY_COORDS[raw];
  if (direct) return { latitude: direct[0], longitude: direct[1] };

  const segments = raw
    .split(/[,/|]|\s[-–]\s/)
    .map((part) => part.replace(/[^a-zà-ú\s]/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const segment of segments) {
    const hit = CITY_COORDS[segment];
    if (hit) return { latitude: hit[0], longitude: hit[1] };
  }
  return null;
};

export default geocodeCity;
