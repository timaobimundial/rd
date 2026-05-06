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

function getFix(ident) {
  return fixes.find(f => f.ident === ident);
}

let lastRequestId = 0;

async function getCoordinates(code) {

    if (code.length === 5) {
        if (!fixesLoaded) await fixesPromise;

        const fix = getFix(code);
        if (!fix) return null;

        return { lat: fix.lat, lng: fix.lng, type: "fix" };
    }

    if (code.length === 4) {
        const url = `https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=rotaer&icaoCode=${code}`;

        try {
            const response = await fetch(url);
            const data = await response.text();

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            const lat = parseFloat(xmlDoc.querySelector("lat")?.textContent || xmlDoc.querySelector("latRotaer")?.textContent);
            const lng = parseFloat(xmlDoc.querySelector("lng")?.textContent || xmlDoc.querySelector("lngRotaer")?.textContent);

            if (isNaN(lat) || isNaN(lng)) return null;

            return { lat, lng, type: "ad" };

        } catch {
            return null;
        }
    }

    return null;
}

function haversineDistance(coord1, coord2) {
    const R = 3440.065;
    const toRad = (angle) => angle * Math.PI / 180;

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
    const toRad = (angle) => angle * Math.PI / 180;
    const toDeg = (angle) => angle * 180 / Math.PI;

    const dLng = toRad(coord2.lng - coord1.lng);
    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function fetchAeroportoInfo() {

    const requestId = ++lastRequestId;

    const input = document.getElementById("icaoCode").value.toUpperCase().trim();

    if (!input.includes(" ")) {
        document.getElementById("result").style.display = "none";
        document.getElementById("map").style.display = "none";
        return;
    }

    const codes = input.split(/\s+/).filter(c => c.length === 4 || c.length === 5);

    if (codes.length < 2) return;

    let points = [];

    for (let code of codes) {
        const coord = await getCoordinates(code);

        if (requestId !== lastRequestId) return;

        if (!coord) {
            document.getElementById("result").textContent = `Erro em ${code}`;
            document.getElementById("result").style.display = "block";
            document.getElementById("map").style.display = "none";
            return;
        }

        points.push({ code, ...coord });
    }

    if (map) map.remove();

    map = L.map('map', {
        scrollWheelZoom: true
    }).setView([points[0].lat, points[0].lng], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const declinacao = -22;

    let boundsPoints = [];

    for (let i = 0; i < points.length; i++) {

        const p = points[i];

        const marker = L.marker([p.lat, p.lng]).addTo(map);
        marker.bindTooltip(p.code, { permanent: true, direction: "top", offset: [0, -15] });

        boundsPoints.push([p.lat, p.lng]);

        if (i === 0) continue;

        const prev = points[i - 1];

        const dist = haversineDistance(prev, p);
        const trueBrg = calculateBearing(prev, p);
        const magBrg = (trueBrg + declinacao + 360) % 360;

        const formattedBrg = String(Math.round(magBrg)).padStart(3, '0');

        const midLat = (prev.lat + p.lat) / 2;
        const midLng = (prev.lng + p.lng) / 2;

        const label = `${formattedBrg}° ${dist}nm`;

        L.polyline([[prev.lat, prev.lng], [p.lat, p.lng]], {
            color: '#ff66cc',
            weight: 4
        }).addTo(map);

        const midMarker = L.marker([midLat, midLng], {
            icon: L.divIcon({
                className: 'custom-label',
                html: `<div style="background:white;padding:2px 6px;border-radius:6px;font-size:12px">${label}</div>`
            })
        }).addTo(map);
    }

    const bounds = L.latLngBounds(boundsPoints);
    map.fitBounds(bounds, { padding: [50, 50] });

    document.getElementById("result").innerHTML = "";
    document.getElementById("result").style.display = "block";
    document.getElementById("map").style.display = "block";
}

function clearIcaoCode() {
    document.getElementById("icaoCode").value = "";
    document.getElementById("result").style.display = "none";
    document.getElementById("map").style.display = "none";
}

document.getElementById("icaoCode").addEventListener("input", fetchAeroportoInfo);

const closeButton = document.createElement("button");
closeButton.innerHTML = "X";
closeButton.style.position = "absolute";
closeButton.style.top = "10px";
closeButton.style.right = "10px";
closeButton.style.width = "32px";
closeButton.style.height = "32px";
closeButton.style.borderRadius = "5px";
closeButton.style.backgroundColor = "#7fb0d4";
closeButton.style.color = "white";
closeButton.style.border = "none";
closeButton.style.cursor = "pointer";
closeButton.style.zIndex = "1000";
closeButton.onclick = clearIcaoCode;

document.getElementById("map").appendChild(closeButton);
