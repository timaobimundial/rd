let map;

let fixes = [];
let fixesLoaded = false;
let fixesPromise = fetch('arq/waypoint.csv')
  .then(r => r.text())
  .then(text => {
    const lines = text.split('\n').slice(1);

    fixes = lines.map(line => {
      const [ident, lat, lng] = line.split(',');
      return {
        ident: ident.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      };
    });

    fixesLoaded = true;
  });

// ===================== VOR / NDB CACHE =====================
let navaids = [];
let navaidsLoaded = false;

const OPENAIP_KEY = "3fba863d8c5d70aa687b986b10c623f9";

let navaidsPromise = fetch("https://api.openaip.net/api/navaids", {
  headers: {
    "x-openaip-api-key": OPENAIP_KEY
  }
})
.then(r => r.json())
.then(data => {
  navaids = (data.items || []).map(n => ({
    ident: n.ident,
    name: n.name,
    type: n.type,
    lat: n.latitude,
    lng: n.longitude,
    freq: n.frequency
  }));

  navaidsLoaded = true;
});

// ===========================================================

function getFix(ident) {
  return fixes.find(f => f.ident === ident);
}

function getNavaid(ident) {
  return navaids.find(n => n.ident === ident);
}

let lastRequestId = 0;

async function fetchAeroportoInfo() {

    const requestId = ++lastRequestId;

    const icaoCode = document.getElementById("icaoCode").value.trim().toUpperCase();

    if (icaoCode.length < 3 || icaoCode.length > 5) {
        document.getElementById("result").style.display = "none";
        document.getElementById("map").style.display = "none";
        return;
    }

    const sbur = { lat: -19.764722222222, lng: -47.966111111111 };

    function haversineDistance(coord1, coord2) {
        const R = 3440.065;
        const toRad = (a) => a * Math.PI / 180;

        const dLat = toRad(coord2.lat - coord1.lat);
        const dLng = toRad(coord2.lng - coord1.lng);
        const lat1 = toRad(coord1.lat);
        const lat2 = toRad(coord2.lat);

        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.ceil(R * c);
    }

    function calculateBearing(coord1, coord2) {
        const toRad = (a) => a * Math.PI / 180;
        const toDeg = (a) => a * 180 / Math.PI;

        const dLng = toRad(coord2.lng - coord1.lng);
        const lat1 = toRad(coord1.lat);
        const lat2 = toRad(coord2.lat);

        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

        return String(Math.ceil((toDeg(Math.atan2(y, x)) + 360) % 360)).padStart(3, '0');
    }

    let latDest, lngDest;
    let resultHTML = "";

    let extraMarkers = [];

    // ================= FIX =================
    if (icaoCode.length === 5) {

        if (!fixesLoaded) await fixesPromise;
        if (requestId !== lastRequestId) return;

        const fix = getFix(icaoCode);

        if (!fix) {
            document.getElementById("result").textContent = "FIX não encontrado";
            document.getElementById("result").style.display = "block";
            document.getElementById("map").style.display = "none";
            return;
        }

        latDest = fix.lat;
        lngDest = fix.lng;
    }

    // ================= AERÓDROMO =================
    if (icaoCode.length === 4) {

        const apiUrl = `https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=rotaer&icaoCode=${icaoCode}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.text();

            if (requestId !== lastRequestId) return;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            latDest = parseFloat(xmlDoc.querySelector("lat")?.textContent);
            lngDest = parseFloat(xmlDoc.querySelector("lng")?.textContent);

            if (isNaN(latDest) || isNaN(lngDest)) return;

            resultHTML = "AERÓDROMO";
        } catch (e) {
            return;
        }
    }

    // ================= VOR / NDB =================
    if (icaoCode.length === 3) {

        if (!navaidsLoaded) await navaidsPromise;
        if (requestId !== lastRequestId) return;

        const nav = getNavaid(icaoCode);

        if (!nav) {
            document.getElementById("result").textContent = "VOR/NDB não encontrado";
            document.getElementById("result").style.display = "block";
            document.getElementById("map").style.display = "none";
            return;
        }

        latDest = nav.lat;
        lngDest = nav.lng;

        resultHTML = `${nav.type} ${nav.ident} (${nav.name}) ${nav.freq || ""}`;
    }

    const distance = haversineDistance(sbur, { lat: latDest, lng: lngDest });
    const trueBearing = calculateBearing(sbur, { lat: latDest, lng: lngDest });

    const declinacao = 22;
    const magneticBearing = (parseInt(trueBearing) + declinacao) % 360;

    document.getElementById("result").innerHTML = resultHTML;
    document.getElementById("result").style.display = "block";
    document.getElementById("map").style.display = "block";

    if (map) map.remove();

    map = L.map('map').setView([sbur.lat, sbur.lng], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markerSBUR = L.marker([sbur.lat, sbur.lng]).addTo(map);

    const markerDest = L.marker([latDest, lngDest]).addTo(map);

    L.polyline([sbur, { lat: latDest, lng: lngDest }], {
        color: '#7fb0d4'
    }).addTo(map);

    const bounds = L.latLngBounds([
        markerSBUR.getLatLng(),
        markerDest.getLatLng()
    ]);

    map.fitBounds(bounds, { padding: [50, 50] });
}
