let map;

let fixes = [];

fetch('arq/waypoint.csv')
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
  });

function getFix(ident) {
  return fixes.find(f => f.ident === ident);
}

async function fetchAeroportoInfo() {

    const icaoCode = document.getElementById("icaoCode").value.trim().toUpperCase();

    if (icaoCode.length !== 4 && icaoCode.length !== 5) {
        document.getElementById("result").style.display = "none";
        document.getElementById("map").style.display = "none";
        return;
    }

    const sbur = { lat: -19.764722222222, lng: -47.966111111111 };

    function haversineDistance(coord1, coord2) {
        const R = 3440.065;
        const toRad = (angle) => angle * Math.PI / 180;

        const dLat = toRad(coord2.lat - coord1.lat);
        const dLng = toRad(coord2.lng - coord1.lng);
        const lat1 = toRad(coord1.lat);
        const lat2 = toRad(coord2.lat);

        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
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
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

        return String(Math.ceil((toDeg(Math.atan2(y, x)) + 360) % 360)).padStart(3, '0');
    }

    let latDest, lngDest;
    let resultHTML = "";

    if (icaoCode.length === 5) {
        const fix = getFix(icaoCode);

        if (!fix) {
            document.getElementById("result").textContent = "FIX não encontrado";
            document.getElementById("result").style.display = "block";
            document.getElementById("map").style.display = "none";
            return;
        }

        latDest = fix.lat;
        lngDest = fix.lng;

        resultHTML = ""; // <-- aqui remove o texto do FIX
    }

    if (icaoCode.length === 4) {

        const metarUrl = `https://api-redemet.decea.mil.br/mensagens/metar/${icaoCode}?api_key=welgZua24vqAod3zlxzJ9DfBz57evfVQore1f7aL`;

        let metarIcao = "";

        try {
            const metarResponse = await fetch(metarUrl);
            const metarData = await metarResponse.json();
            metarIcao = metarData.data?.data?.[0]?.mens || " ";
        } catch (metarError) {
            metarIcao = "erro";
        }

        const apiUrl = `https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=rotaer&icaoCode=${icaoCode}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.text();

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            const cidade = xmlDoc.querySelector("city")?.textContent || "";
            const estado = xmlDoc.querySelector("uf")?.textContent || "";
            const fir = xmlDoc.querySelector("fir")?.textContent || "não encontrado";

            latDest = parseFloat(xmlDoc.querySelector("lat")?.textContent || xmlDoc.querySelector("latRotaer")?.textContent);
            lngDest = parseFloat(xmlDoc.querySelector("lng")?.textContent || xmlDoc.querySelector("lngRotaer")?.textContent);

            if (isNaN(latDest) || isNaN(lngDest)) {
                document.getElementById("result").textContent = "Coordenadas inválidas";
                document.getElementById("result").style.display = "block";
                document.getElementById("map").style.display = "none";
                return;
            }

            const runwayIdent = xmlDoc.querySelector("runways > runway > ident")?.textContent || "-";

            resultHTML = `${cidade}-${estado} (${fir}) RWY ${runwayIdent}<br>${metarIcao}`;

        } catch (error) {
            document.getElementById("result").textContent = "Erro ao carregar";
            document.getElementById("result").style.display = "block";
            document.getElementById("map").style.display = "none";
            return;
        }
    }

    const distance = haversineDistance(sbur, { lat: latDest, lng: lngDest });
    const trueBearing = calculateBearing(sbur, { lat: latDest, lng: lngDest });
    const declinacao = 22;
    const magneticBearing = (parseInt(trueBearing) + declinacao) % 360;
    const formattedMagneticBearing = String(magneticBearing).padStart(3, '0');

    document.getElementById("result").innerHTML = resultHTML;
    document.getElementById("result").style.display = "block";
    document.getElementById("map").style.display = "block";

    if (map) {
        map.remove();
    }

    map = L.map('map', {
        scrollWheelZoom: true
    }).setView([sbur.lat, sbur.lng], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const polygonCoordinates = [
        [
            [-20.582222, -48.596667],
            [-20.553611, -48.028056],
            [-20.543611, -47.856111],
            [-20.583611, -47.382500],
            [-20.210000, -46.985556],
            [-19.674167, -46.943611],
            [-19.561111, -46.964722],
            [-19.155556, -47.148889],
            [-19.312778, -48.092778],
            [-19.375000, -48.524167],
            [-19.425000, -48.906111],
            [-19.980278, -48.892500]
        ]
    ];

    L.polygon(polygonCoordinates, { color: 'gray', fillColor: 'lightgray', fillOpacity: 0.5, weight: 0.5 }).addTo(map);

    const tooltipContent = `SBUR<br><span style="display:inline-block; width:50%; text-align:left">${formattedMagneticBearing}º</span><span style="display:inline-block; width:50%; text-align:right">${distance}NM</span>`;

    const markerSBUR = L.marker([sbur.lat, sbur.lng]).addTo(map);
    markerSBUR.bindTooltip(tooltipContent, { permanent: true, direction: "top", offset: [0, -15] });

    const markerDest = L.marker([latDest, lngDest]).addTo(map);
    markerDest.bindTooltip(icaoCode, { permanent: true, direction: "top", offset: [0, -15] });

    L.polyline([sbur, { lat: latDest, lng: lngDest }], { color: '#7fb0d4' }).addTo(map);

    const bounds = L.latLngBounds([markerSBUR.getLatLng(), markerDest.getLatLng()]);
    map.fitBounds(bounds, { paddingTopLeft: [90, 90], paddingBottomRight: [50, 50] });
}

function clearIcaoCode() {
    document.getElementById("icaoCode").value = "";
    document.getElementById("result").style.display = "none";
    document.getElementById("map").style.display = "none";
}

function openNewTab() {
    const icaoInput = document.getElementById("icaoCode");
    const icaoCode = icaoInput.value.trim().toUpperCase();

    if (icaoCode.length === 4) {
        const url = `https://aisweb.decea.mil.br/?i=aerodromos&codigo=${icaoCode}`;
        window.open(url, "_blank");

        icaoInput.value = "";
        document.getElementById("result").style.display = "none";
        document.getElementById("map").style.display = "none";
    }
}

document.getElementById("icaoCode").addEventListener("input", fetchAeroportoInfo);
document.getElementById("searchButton").addEventListener("click", openNewTab);
document.getElementById("icaoCode").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        openNewTab();
    }
});

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
closeButton.style.padding = "0";
closeButton.style.fontSize = "16px";
closeButton.style.textAlign = "center";
closeButton.style.cursor = "pointer";
closeButton.style.zIndex = "1000";
closeButton.onclick = clearIcaoCode;

document.getElementById("map").appendChild(closeButton);
