// Globe configuration, verbatim from the reference bundle chunk 38639 (2026-09-17 capture).
// Only the "default" UI variant (wallet badge) is ported; the "flags" variant is unused on the homepage.

export const GLOBE = {
  DOT_COUNT_MAX_DESKTOP: 60000,
  DOT_COUNT_MAX_MOBILE: 30000,
  DOT_SIZE_DESKTOP: 12,
  DOT_SIZE_MOBILE: 14,
  CAMERA_Z_DESKTOP: 11.7,
  CAMERA_Z_MOBILE: 11.3,
  DOT_GRADIENT_STOP_COUNT: 3,
  ARC_UI_MIN_OFFSET: 0.01,
  ARC_UI_MAX_OFFSET: 0.25,
  ARC_UI_HIDE_DOT_THRESHOLD: -0.5,
  ARC_UI_MIN_SCALE: 0.75,
  ARC_UI_MAX_SCALE: 1,
  MARKER_TANGENT_OFFSET: 0.02,
  /** Equirectangular land mask (alpha > 0 = land); local copy of the stripeassets map_dots.png. */
  IMAGE_PATH: "/stripe/map_dots-96ddc62d.png",
} as const;

export type EasingName =
  | "linear"
  | "easeOutCubic"
  | "easeInCubic"
  | "easeInOutCubic"
  | "easeOutQuad"
  | "easeInQuad"
  | "easeInOutQuad"
  | "easeOutExpo"
  | "easeInExpo"
  | "easeOutBack"
  | "easeInBack";

export interface TimingStep {
  durationMs: number;
  easing: EasingName;
}

/** Timings for the UI (badge) arcs. */
export const ARC_TIMING = {
  markerA: { durationMs: 600, easing: "easeOutCubic" },
  markerB: { durationMs: 550, easing: "easeOutCubic" },
  line: { durationMs: 2800, easing: "easeOutCubic" },
  uiIntro: { durationMs: 800, easing: "easeOutCubic" },
  uiTravel: {
    durationMs: 5000,
    easing: "easeInOutCubic",
    distanceScale: { factor: 0.12, min: 0.6, max: 1.2 },
  },
  uiOutro: { durationMs: 600, easing: "easeInCubic" },
  lineRetreat: { durationMs: 2200, easing: "easeInOutCubic" },
  markerFade: { durationMs: 600, easing: "easeOutCubic" },
  lineDistanceScale: { baseDurationMs: 2800, referenceKm: 8000, min: 1800, max: 4500 },
} as const;

/** Timings for the thin background ("simple") arcs. */
export const SIMPLE_ARC_TIMING = {
  markerA: { durationMs: 300, easing: "easeOutCubic" },
  markerB: { durationMs: 250, easing: "easeOutCubic" },
  line: { durationMs: 1200, easing: "easeOutCubic" },
  lineRetreat: { durationMs: 800, easing: "easeInOutCubic" },
  markerFade: { durationMs: 400, easing: "easeOutCubic" },
} as const;

export const ARC_CONTROLLER = {
  ENABLED: true,
  MAX_ACTIVE_ARCS: 4,
  MIN_SPAWN_INTERVAL_MS: 1500,
  MAX_SPAWN_INTERVAL_MS: 4000,
  INITIAL_DELAY_MS: 0,
  CITY_MIN_DISTANCE_KM: 2000,
  MIN_UI_SCREEN_DISTANCE: 80,
  MAX_SPAWN_DISTANCE_ATTEMPTS: 5,
} as const;

export interface City {
  name: string;
  lat: number;
  lon: number;
  /** Precomputed unit vector on the sphere (in the arcs/dots group frame). */
  ux: number;
  uy: number;
  uz: number;
  country: string;
}

export const CITIES: City[] = [
  { name: "New York City", lat: 40.7128, lon: -74.006, ux: 0.208854, uy: 0.652268, uz: 0.728647, country: "US" },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, ux: -0.392078, uy: 0.559948, uz: 0.729886, country: "US" },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, ux: -0.149688, uy: 0.332698, uz: 0.931078, country: "MX" },
  { name: "Toronto", lat: 43.6532, lon: -79.3832, ux: 0.133303, uy: 0.690292, uz: 0.711145, country: "CA" },
  { name: "Chicago", lat: 41.8781, lon: -87.6298, ux: 0.030792, uy: 0.667548, uz: 0.74393, country: "US" },
  { name: "Miami", lat: 25.7617, lon: -80.1918, ux: 0.153419, uy: 0.434629, uz: 0.887446, country: "US" },
  { name: "Vancouver", lat: 49.2827, lon: -123.1207, ux: -0.356435, uy: 0.757937, uz: 0.546338, country: "CA" },
  { name: "Houston", lat: 29.7604, lon: -95.3698, ux: -0.078251, uy: 0.496481, uz: 0.864467, country: "US" },
  { name: "San Francisco", lat: 37.7749, lon: -122.4194, ux: -0.440285, uy: 0.612231, uz: 0.656953, country: "US" },
  { name: "Seattle", lat: 47.6062, lon: -122.3321, ux: -0.396264, uy: 0.738349, uz: 0.545133, country: "US" },
  { name: "Boston", lat: 42.3601, lon: -71.0589, ux: 0.237618, uy: 0.673879, uz: 0.699487, country: "US" },
  { name: "Atlanta", lat: 33.749, lon: -84.388, ux: 0.076123, uy: 0.555436, uz: 0.828087, country: "US" },
  { name: "Montreal", lat: 45.5017, lon: -73.5673, ux: 0.196539, uy: 0.713171, uz: 0.672597, country: "CA" },
  { name: "Denver", lat: 39.7392, lon: -104.9903, ux: -0.196538, uy: 0.639153, uz: 0.743601, country: "US" },
  { name: "São Paulo", lat: -23.5505, lon: -46.6333, ux: 0.629472, uy: -0.399557, uz: 0.666423, country: "BR" },
  { name: "Buenos Aires", lat: -34.6037, lon: -58.3816, ux: 0.431518, uy: -0.567897, uz: 0.700918, country: "AR" },
  { name: "Santiago", lat: -33.4489, lon: -70.6693, ux: 0.276196, uy: -0.551193, uz: 0.787339, country: "CL" },
  { name: "Lima", lat: -12.0464, lon: -77.0428, ux: 0.219285, uy: -0.208704, uz: 0.953077, country: "PE" },
  { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, ux: 0.67178, uy: -0.389233, uz: 0.630246, country: "BR" },
  { name: "Bogotá", lat: 4.711, lon: -74.0721, ux: 0.273651, uy: 0.082151, uz: 0.958354, country: "CO" },
  { name: "Brasília", lat: -15.7975, lon: -47.8919, ux: 0.643556, uy: -0.272307, uz: 0.715204, country: "BR" },
  { name: "London", lat: 51.5074, lon: -0.1278, ux: 0.622412, uy: 0.782689, uz: 0.001388, country: "GB" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, ux: 0.657391, uy: 0.753065, uz: -0.027003, country: "FR" },
  { name: "Berlin", lat: 52.52, lon: 13.405, ux: 0.591907, uy: 0.793566, uz: -0.141067, country: "DE" },
  { name: "Madrid", lat: 40.4168, lon: -3.7038, ux: 0.759758, uy: 0.648343, uz: 0.049182, country: "ES" },
  { name: "Rome", lat: 41.9028, lon: 12.4964, ux: 0.726647, uy: 0.667869, uz: -0.161046, country: "IT" },
  { name: "Frankfurt", lat: 50.1109, lon: 8.6821, ux: 0.633955, uy: 0.767287, uz: -0.096806, country: "DE" },
  { name: "Warsaw", lat: 52.2297, lon: 21.0122, ux: 0.571769, uy: 0.790473, uz: -0.219621, country: "PL" },
  { name: "Amsterdam", lat: 52.3676, lon: 4.9041, ux: 0.608358, uy: 0.791944, uz: -0.052199, country: "NL" },
  { name: "Stockholm", lat: 59.3293, lon: 18.0686, ux: 0.484948, uy: 0.860113, uz: -0.158211, country: "SE" },
  { name: "Munich", lat: 48.1351, lon: 11.582, ux: 0.652312, uy: 0.744769, uz: -0.140312, country: "DE" },
  { name: "Barcelona", lat: 41.3851, lon: 2.1734, ux: 0.746481, uy: 0.661142, uz: -0.0752, country: "ES" },
  { name: "Milan", lat: 45.4642, lon: 9.19, ux: 0.692238, uy: 0.712552, uz: -0.112137, country: "IT" },
  { name: "Vienna", lat: 48.2082, lon: 16.3738, ux: 0.631452, uy: 0.745437, uz: -0.215286, country: "AT" },
  { name: "Dublin", lat: 53.3498, lon: -6.2603, ux: 0.586911, uy: 0.802356, uz: 0.106418, country: "IE" },
  { name: "Brussels", lat: 50.8503, lon: 4.3517, ux: 0.625117, uy: 0.776047, uz: -0.076419, country: "BE" },
  { name: "Lisbon", lat: 38.7223, lon: -9.1393, ux: 0.772119, uy: 0.625547, uz: 0.124091, country: "PT" },
  { name: "Accra", lat: 5.6037, lon: -0.187, ux: 0.995216, uy: 0.097647, uz: 0.003248, country: "GH" },
  { name: "Addis Ababa", lat: 8.9806, lon: 38.7578, ux: 0.77024, uy: 0.1561, uz: -0.618355, country: "ET" },
  { name: "Johannesburg", lat: -26.2041, lon: 28.0473, ux: 0.791856, uy: -0.44157, uz: -0.421876, country: "ZA" },
  { name: "Dakar", lat: 14.6928, lon: -17.4467, ux: 0.9228, uy: 0.253636, uz: 0.290014, country: "SN" },
  { name: "Tunis", lat: 36.8065, lon: 10.1815, ux: 0.788055, uy: 0.599114, uz: -0.141531, country: "TN" },
  { name: "Lomé", lat: 6.1725, lon: 1.2314, ux: 0.993973, uy: 0.107522, uz: -0.021366, country: "TG" },
  { name: "Lagos", lat: 6.5244, lon: 3.3792, ux: 0.990145, uy: 0.113598, uz: -0.082516, country: "NG" },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, ux: 0.740154, uy: 0.500978, uz: -0.449012, country: "EG" },
  { name: "Cape Town", lat: -33.9249, lon: 18.4241, ux: 0.778571, uy: -0.558362, uz: -0.285411, country: "ZA" },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219, ux: 0.79784, uy: -0.022554, uz: -0.602471, country: "KE" },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, ux: -0.619079, uy: 0.583204, uz: -0.525941, country: "JP" },
  { name: "New Delhi", lat: 28.6139, lon: 77.209, ux: 0.194356, uy: 0.478905, uz: -0.856082, country: "IN" },
  { name: "Seoul", lat: 37.5665, lon: 126.978, ux: -0.476783, uy: 0.609682, uz: -0.633219, country: "KR" },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, ux: 0.278245, uy: 0.326822, uz: -0.903198, country: "IN" },
  { name: "Kuala Lumpur", lat: 3.139, lon: 101.6869, ux: -0.202259, uy: 0.054758, uz: -0.9778, country: "MY" },
  { name: "Taipei", lat: 25.033, lon: 121.5654, ux: -0.474299, uy: 0.42314, uz: -0.772006, country: "TW" },
  { name: "Bangkok", lat: 13.7563, lon: 100.5018, ux: -0.177038, uy: 0.237793, uz: -0.955046, country: "TH" },
  { name: "Singapore", lat: 1.3521, lon: 103.8198, ux: -0.238803, uy: 0.023596, uz: -0.970781, country: "SG" },
  { name: "Dubai", lat: 25.2048, lon: 55.2708, ux: 0.515458, uy: 0.425855, uz: -0.743606, country: "AE" },
  { name: "Beijing", lat: 39.9042, lon: 116.4074, ux: -0.342618, uy: 0.641432, uz: -0.687216, country: "CN" },
  { name: "Shanghai", lat: 31.2304, lon: 121.4737, ux: -0.436321, uy: 0.518516, uz: -0.735112, country: "CN" },
  { name: "Hong Kong", lat: 22.3193, lon: 114.1694, ux: -0.370418, uy: 0.379621, uz: -0.847213, country: "HK" },
  { name: "Osaka", lat: 34.6937, lon: 135.5023, ux: -0.576941, uy: 0.569245, uz: -0.585752, country: "JP" },
  { name: "Bangalore", lat: 12.9716, lon: 77.5946, ux: 0.209124, uy: 0.224491, uz: -0.951786, country: "IN" },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456, ux: -0.285321, uy: -0.108151, uz: -0.952321, country: "ID" },
  { name: "Manila", lat: 14.5995, lon: 120.9842, ux: -0.491218, uy: 0.252105, uz: -0.833512, country: "PH" },
  { name: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297, ux: -0.280954, uy: 0.187828, uz: -0.941215, country: "VN" },
  { name: "Tel Aviv", lat: 32.0853, lon: 34.7818, ux: 0.694283, uy: 0.531063, uz: -0.485618, country: "IL" },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, ux: -0.727676, uy: -0.557293, uz: -0.39989, country: "AU" },
  { name: "Auckland", lat: -36.8509, lon: 174.7645, ux: -0.796861, uy: -0.599735, uz: -0.073018, country: "NZ" },
  { name: "Melbourne", lat: -37.8136, lon: 144.9631, ux: -0.666523, uy: -0.612654, uz: -0.424891, country: "AU" },
  { name: "Brisbane", lat: -27.4698, lon: 153.0251, ux: -0.761432, uy: -0.461152, uz: -0.455311, country: "AU" },
];

/** Preferred transpacific pairs, drawn when the Pacific faces the camera. */
export const TRANSPACIFIC_PAIRS: { from: string; to: string }[] = [
  { from: "Los Angeles", to: "Tokyo" },
  { from: "Los Angeles", to: "Singapore" },
  { from: "Los Angeles", to: "Sydney" },
  { from: "New York City", to: "Beijing" },
  { from: "New York City", to: "Auckland" },
  { from: "Singapore", to: "Auckland" },
  { from: "Miami", to: "Sydney" },
  { from: "Santiago", to: "Tokyo" },
  { from: "Santiago", to: "Seoul" },
  { from: "Santiago", to: "Kuala Lumpur" },
  { from: "Lima", to: "Tokyo" },
  { from: "Los Angeles", to: "Auckland" },
  { from: "Vancouver", to: "Sydney" },
  { from: "Mexico City", to: "Seoul" },
  { from: "Mexico City", to: "Singapore" },
  { from: "Mexico City", to: "Sydney" },
  { from: "Mexico City", to: "Taipei" },
];

export interface Wallet {
  name: string;
  svg: string;
}

export const WALLETS: Wallet[] = [
  {
    name: "Phantom",
    svg:
      "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M24 0H0v24h24z\" fill=\"#000\"/><path d=\"M24 0H0v24h24z\" fill=\"#ab9ff2\"/><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M10.4444 15.2962c-.94238 1.4439-2.52146 3.2713-4.62262 3.2713-.99328 0-1.94836-.409-1.94836-2.1852 0-4.5236 6.17618-11.52615 11.90668-11.52615 3.26 0 4.5589 2.2618 4.5589 4.83026 0 3.29689-2.1394 7.06649-4.2661 7.06649-.6749 0-1.006-.3706-1.006-.9584 0-.1533.0255-.3194.0764-.4983-.7258 1.2395-2.1266 2.3895-3.4382 2.3895-.9551 0-1.439-.6006-1.439-1.4439 0-.3067.0636-.6262.1783-.9456m4.9363-5.69895c0 .74845-.4416 1.12265-.9355 1.12265-.5015 0-.9356-.3742-.9356-1.12265 0-.74842.4341-1.12264.9356-1.12264.4939 0 .9355.37422.9355 1.12264m2.8066.00002c0 .74843-.4415 1.12263-.9355 1.12263-.5015 0-.9355-.3742-.9355-1.12263 0-.74844.434-1.12266.9355-1.12266.494 0 .9355.37422.9355 1.12266\" fill=\"#fffdf8\"/></svg>",
  },
  {
    name: "MetaMask",
    svg:
      "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"24\" height=\"24\" rx=\"2\" fill=\"#ebf1f7\"/><path d=\"m18.8095 5-5.8759 4.36414 1.0866-2.57544z\" fill=\"#e2761b\"/><path d=\"m5.24339 5 5.82881 4.4053-1.0337-2.6166-4.79511-1.78811zM16.6947 15.116l-1.5653 2.3984 3.3487.9214.9625-3.2663-2.7459-.053zm-12.07165.0535.95667 3.2663 3.34866-.9214-1.56525-2.3979z\" fill=\"#e4761b\"/><path d=\"m8.74009 11.0643-.93198 1.4124 3.32459.1476-.1176-3.57269-2.27384 2.01389zm6.57321 0-2.3032-2.05502-.0764 3.61442 3.3187-.147-.9391-1.4118zm-6.38388 6.4498 1.99628-.9743-1.72462-1.3465zm4.19888-.9743 2.0022.9743-.2776-2.3214-1.7246 1.3465z\" fill=\"#e4761b\"/><path d=\"m15.1307 17.5145-2.0021-.9744.1593 1.3054-.0176.5486zm-6.20101 0 1.86041.8796-.0117-.5492.147-1.3053z\" fill=\"#d7c1b3\"/><path d=\"m10.8195 14.3308-1.6652-.4904 1.1748-.5374zm2.4155 0 .4904-1.0278 1.1807.5374z\" fill=\"#233447\"/><path d=\"m8.92951 17.5141.28342-2.3979-1.84867.0529zm5.91759-2.3985.2835 2.3985 1.5652-2.345-1.8487-.0529zm1.4054-2.6395-3.3187.1476.3069 1.7069.4904-1.0278 1.1807.5374zm-7.09837 1.3641 1.18067-.5374.4845 1.0278.3129-1.7069-3.32459-.147 1.34652 1.3641z\" fill=\"#cd6116\"/><path d=\"m7.80762 12.4761 1.39356 2.7165-.04704-1.3524zm7.10418 1.3641-.0588 1.3524 1.3995-2.7165zm-3.7796-1.2165-.3128 1.7069.3898 2.0139.0882-2.6519-.1646-1.0689zm1.8016 0-.1593 1.0631.0705 2.6577.3957-2.0139z\" fill=\"#e4751f\"/><path d=\"m13.2709 18.3936.0176-.5492-.1481-.1294h-2.2262l-.1358.1294.0117.5492-1.86041-.8797.64974.5316 1.31707.9149h2.2615l1.323-.9149.6497-.5316-1.8604.8797z\" fill=\"#c0ad9e\"/><path d=\"m13.1281 16.5399-.2834-.1952h-1.6359l-.2834.1952-.1476 1.3054.1353-.1305h2.2267l.1476.1299-.1587-1.3053z\" fill=\"#161616\"/><path d=\"m19.0577 9.64755.5022-2.40962L18.8096 5l-5.6813 4.21655 2.185 1.84865 3.0888.9032.6856-.7968-.2958-.2128.4728-.431-.3663-.2834.4727-.36047zM4.5 7.23793l.50215 2.40962-.31928.23638.47275.36047-.36044.2834.47275.431-.29577.2128.67973.7968 3.08877-.9032 2.18504-1.84865L5.24441 5z\" fill=\"#763d16\"/><path d=\"m13.2409 14.3312-.3957 2.0139.2834.1952 1.7246-1.3465.0588-1.3524zm-4.0866-.4904.04704 1.3524 1.72456 1.3465.2835-.1946-.3899-2.0139z\" fill=\"#f6851b\"/><path d=\"m18.4011 11.9682-3.0888-.9032.939 1.4112-1.3994 2.7166 1.8428-.0236h2.7459zm-9.66205-.9038-3.08818.9038-1.02782 3.201h2.74008l1.83691.0236-1.39356-2.7166.93257-1.4112zm4.19365 1.5594.1946-3.40747.8979-2.42727h-3.9867l.8861 2.42727.2064 3.40747.0706 1.0749.0059 2.646h1.6364l.0117-2.646.0765-1.0749z\" fill=\"#f6851b\"/></svg>",
  },
  {
    name: "Rainbow",
    svg:
      "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"24\" height=\"24\" rx=\"2\" fill=\"#ebf1f7\"/><path fill=\"url(#rainbow-bg)\" d=\"M0 0h24v24H0z\"/><path d=\"M4.5 7.87498h1.125c5.799 0 10.5 4.70102 10.5 10.49992v1.125h2.25c.6213 0 1.125-.5037 1.125-1.125C19.5 10.712 13.288 4.5 5.625 4.5c-.62132 0-1.125.50368-1.125 1.12499z\" fill=\"url(#rainbow-outer)\"/><path d=\"M4.5 7.50024h1.125c6.0061 0 10.875 4.86886 10.875 10.87496v1.125h-3.375v-1.125c0-4.1421-3.35786-7.5-7.5-7.5H4.5z\" fill=\"url(#rainbow-mid)\"/><path d=\"M4.5 12.3752c0 .6213.50368 1.125 1.125 1.125 2.69239 0 4.875 2.1826 4.875 4.875 0 .6213.5037 1.125 1.125 1.125H13.5v-1.125c0-4.3492-3.52575-7.875-7.875-7.875H4.5z\" fill=\"url(#rainbow-inner)\"/><defs><radialGradient id=\"rainbow-outer\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"matrix(0 -13.8749 13.875 0 5.625 18.3749)\"><stop offset=\".770277\" stop-color=\"#ff4000\"/><stop offset=\"1\" stop-color=\"#8754c9\"/></radialGradient><radialGradient id=\"rainbow-mid\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"matrix(0 -10.8749 10.875 0 5.625 18.3752)\"><stop offset=\".723929\" stop-color=\"#fff700\"/><stop offset=\"1\" stop-color=\"#ff9901\"/></radialGradient><radialGradient id=\"rainbow-inner\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"matrix(0 -7.87495 7.875 0 5.625 18.3752)\"><stop offset=\".59513\" stop-color=\"#0af\"/><stop offset=\"1\" stop-color=\"#01da40\"/></radialGradient><linearGradient id=\"rainbow-bg\" x1=\"12\" y1=\"0\" x2=\"12\" y2=\"24\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#174299\"/><stop offset=\"1\" stop-color=\"#001e59\"/></linearGradient></defs></svg>",
  },
  {
    name: "Crypto.com",
    svg:
      "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"24\" height=\"24\" rx=\"2\" fill=\"#ebf1f7\"/><path d=\"M0 0v23.9999h24V0z\" fill=\"url(#crypto-bg)\"/><path d=\"M9.35965 7.55055H14.635l.6356 2.66135H8.74766zM13.157 12.1003l.5629-1.4862h-3.4156l.5754 1.4862-.1755 1.6668h1.302l1.3144-.0059z\" fill=\"#fff\"/><path d=\"m15.283 11.1116-1.5447.9951v1.7686l-1.1809 1.1213v.5268l1.1383 1.0377h.9511l2.3984-4.1369zm-4.9846.9951-1.56314-.9834-1.76812 1.3009 2.41022 4.1486h.96354l1.1383-1.0494v-.5268l-1.1808-1.1214z\" fill=\"#fff\"/><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M5.01771 7.9902 12.0009 4 19 8.00014v7.99916L12.0009 20l-.0178-.0099L5 15.9993V8.00014zm6.98319-3.17404L5.71537 8.40941v7.18299l6.28553 3.5914 6.2855-3.5914V8.40941z\" fill=\"#fff\"/><defs><radialGradient id=\"crypto-bg\" cx=\"0\" cy=\"0\" r=\"1\" gradientUnits=\"userSpaceOnUse\" gradientTransform=\"rotate(90)scale(24 52.3481)\"><stop offset=\".0249942\" stop-color=\"#3c62d1\"/><stop offset=\".286382\" stop-color=\"#1e379d\"/><stop offset=\".553401\" stop-color=\"#041c73\"/><stop offset=\".988775\" stop-color=\"#010348\"/></radialGradient></defs></svg>",
  },
  {
    name: "Base",
    svg:
      "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"24\" height=\"24\" rx=\"2\" fill=\"#00f\"/><path d=\"M5.84 19Q5 19 5 18.16V5.84Q5 5 5.84 5h12.32q.84 0 .84.84v12.32q0 .84-.84.84z\" fill=\"#fff\"/></svg>",
  },
  {
    name: "Kraken",
    svg:
      "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"24\" height=\"24\" rx=\"2\" fill=\"#7132f5\"/><path d=\"M11.9981 6C7.58072 6 4 9.41938 4 13.6373v3.2729C4 17.5123 4.511 18 5.14179 18s1.14553-.4877 1.14553-1.0898v-3.2729c0-.6038.50912-1.0915 1.14178-1.0915.63079 0 1.14178.4877 1.14178 1.0915v3.2729c0 .6021.51102 1.0898 1.1418 1.0898.63262 0 1.14362-.4877 1.14362-1.0898v-3.2729c0-.6038.511-1.0915 1.1418-1.0915.6327 0 1.1455.4877 1.1455 1.0915v3.2729c0 .6021.5111 1.0898 1.1418 1.0898.6308 0 1.1418-.4877 1.1418-1.0898v-3.2729c0-.6038.511-1.0915 1.1456-1.0915.6307 0 1.1417.4877 1.1417 1.0915v3.2729c0 .6021.511 1.0898 1.1437 1.0898C19.489 18 20 17.5123 20 16.9102v-3.2729C20 9.41938 16.4174 6 11.9981 6\" fill=\"#fff\"/></svg>",
  },
];

/** Wallet SVGs with gradient ids suffixed so each DOM copy can get a unique id. */
export const WALLET_TEMPLATES = WALLETS.map((w) => ({
  ...w,
  template: w.svg.replace(/id="([^"]+)"/g, 'id="$1-UID"').replace(/url(#([^)]+))/g, "url(#$1-UID)"),
}));

export const STABLECOINS = ["USDC", "USDB"] as const;

/** UI arc gradient palettes — monochrome. Primary routes run charcoal <-> mid grey so each route still
 *  reads as its own line (was coral → magenta, violet → magenta, coral → violet). */
export const ARC_PALETTES = [
  { start: 0x292929, end: 0x737373 },
  { start: 0x4a4a4a, end: 0x1a1a1a },
  { start: 0x737373, end: 0x292929 },
];

/** Background arc palettes — faint greys (was sky, amber, lilac). */
export const SIMPLE_ARC_PALETTES = [
  { start: 0xb4b4b4, end: 0x8a8a8a },
  { start: 0xc4c4c4, end: 0x9c9c9c },
  { start: 0xa4a4a4, end: 0x7a7a7a },
];
