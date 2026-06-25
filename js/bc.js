const sbur = [-47.966111, -19.764722];
const declinacaoSBUR = -22;

const resultadoTable = document.getElementById('resultado-table');
const resultadoTableBody = document.getElementById('resultado-table-body');
const resultadoContainer = document.getElementById('resultado-container');
const mensagemCarregamento = document.getElementById('mensagem-carregamento');
const imagemCarregamento = mensagemCarregamento.querySelector('img');


const API_URL = "https://project-i7r19.vercel.app/api/bc";

// polígono SBUR
const polygonCoordinates = [
    [-48.596667, -20.576667],
    [-48.028056, -20.553611],
    [-47.856111, -20.543611],
    [-47.382500, -20.583611],
    [-46.985556, -20.209722],
    [-46.943611, -19.674167],
    [-46.964722, -19.561111],
    [-47.148889, -19.155556],
    [-48.092778, -19.312778],
    [-48.524167, -19.376111],
    [-48.906111, -19.425000],
    [-48.891944, -19.980278],
    [-48.596667, -20.576667]
];

const polygon = turf.polygon([polygonCoordinates]);

window.aircraftMap = null;

function abrirMapaAeronave(aircraft) {

    const mapDiv = document.getElementById('map');
    const metarContainer = document.querySelector('.container_metar');

    if (metarContainer) {
        const rect = metarContainer.getBoundingClientRect();

        mapDiv.style.display = 'block';
        mapDiv.style.position = 'fixed';
        mapDiv.style.top = rect.top + 'px';
        mapDiv.style.left = rect.left + 'px';
        mapDiv.style.width = rect.width + 'px';
        mapDiv.style.height = rect.height + 'px';
        mapDiv.style.margin = '0';
        mapDiv.style.padding = '0';
        mapDiv.style.zIndex = '9999';
    }

    if (window.aircraftMap) {
        window.aircraftMap.remove();
    }

    window.aircraftMap = L.map('map', {
        scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.aircraftMap);

    const polygonLatLng = polygonCoordinates.map(c => [c[1], c[0]]);

    L.polygon(polygonLatLng, {
        color: 'gray',
        fillColor: 'lightgray',
        fillOpacity: 0.5,
        weight: 0.5
    }).addTo(window.aircraftMap);

    const rotation =
        aircraft.rumoMagnetic !== '---'
            ? parseInt(aircraft.rumoMagnetic) - 22
            : 0;

    const planeIcon = L.divIcon({
        className: 'plane-div-icon',
        html: `
            <img src="arq/planebcmap.png"
        style="
   
            transform: rotate(${rotation}deg);
            transform-origin:center;
        ">
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const planeMarker = L.marker(
        [aircraft.latitude, aircraft.longitude],
        { icon: planeIcon }
    ).addTo(window.aircraftMap);

    // Extrai apenas o número limpo da radial (ex: "270")
    const radialLimpa = aircraft.radial.replace('URB', '').replace('°', '');
    
    // Monta o conteúdo do Tooltip do avião com o Identificador + Radial e Distância na linha de baixo
    const planeTooltipContent = `${aircraft.identifier}<br>${radialLimpa}° ${aircraft.distanciaNM.toFixed(0)}NM`;

    planeMarker.bindTooltip(planeTooltipContent, {
        permanent: true,
        direction: "top",
        offset: [0, -15]
    });

    // Pin de SBUR criado sem bindTooltip (apenas o marcador visual)
    const markerSBUR = L.marker([sbur[1], sbur[0]]).addTo(window.aircraftMap);

    L.polyline(
        [
            [sbur[1], sbur[0]],
            [aircraft.latitude, aircraft.longitude]
        ],
        { color: '#7fb0d4' }
    ).addTo(window.aircraftMap);

    const bounds = L.latLngBounds([
        [sbur[1], sbur[0]],
        [aircraft.latitude, aircraft.longitude]
    ]);

    window.aircraftMap.fitBounds(bounds, {
        paddingTopLeft: [90, 90],
        paddingBottomRight: [50, 50]
    });

    setTimeout(() => {
        window.aircraftMap.invalidateSize();
    }, 100);
}

async function buscarAeronavesProximas() {

    const sburLongitude = sbur[0];
    const sburLatitude = sbur[1];

    imagemCarregamento.style.display = 'block';

    try {

        const response = await fetch(API_URL);
        const data = await response.json();

        const ac = data.ac || [];

        if (!ac.length) {
            mensagemCarregamento.textContent = 'NIL';
            imagemCarregamento.style.display = 'none';
            resultadoTable.style.display = 'none';
            return;
        }

        const aircraftData = [];

        ac.forEach(aircraft => {

            const latitude = aircraft.lat;
            const longitude = aircraft.lon;

            let dentroPoligono = false;

            if (latitude != null && longitude != null) {
                const point = turf.point([longitude, latitude]);
                dentroPoligono = turf.booleanPointInPolygon(point, polygon);
            }

            const callsign = aircraft.flight || '';
            const registration = aircraft.r || '';
            const identifier = callsign || registration || '------';

            const altitudePes = aircraft.alt_baro != null ? Math.round(aircraft.alt_baro) : '';
            const velocidadKnots = aircraft.gs != null ? Math.round(aircraft.gs) : '';
            const heading = aircraft.track != null ? Math.round(aircraft.track) : null;

            const aircraftType = (aircraft.t || aircraft.type || '').replace("adsb_icao", "----");
            const squawkCode = aircraft.squawk || '----';

            let radialSburStr = '---';
            let distanciaSburNM = Infinity;
            let rumoMagneticCalcStr = '---';

            if (latitude != null && longitude != null) {

                const aircraftPoint = turf.point([longitude, latitude]);
                const sburPoint = turf.point([sburLongitude, sburLatitude]);

                const bearingTrue = turf.bearing(sburPoint, aircraftPoint);

                radialSburStr = Math.round((bearingTrue - declinacaoSBUR + 360) % 360)
                    .toString().padStart(3, '0');

                const distanceKM = turf.distance(sburPoint, aircraftPoint, { units: 'kilometers' });
                distanciaSburNM = distanceKM * 0.539957;

                if (heading != null && !isNaN(heading)) {
                    rumoMagneticCalcStr = Math.round((heading + 22 + 360) % 360)
                        .toString().padStart(3, '0');
                }
            }

            let flStr = '----';
            let flightLevel = null;

            if (altitudePes !== '') {

                flightLevel = Math.floor(altitudePes / 100);

                let flStrTemp = flightLevel.toString().padStart(3, '0');

                if (flStrTemp[2] === '9') {
                    flightLevel = Math.ceil(flightLevel / 10) * 10;
                    flStrTemp = flightLevel.toString().padStart(3, '0');
                }

                const rate = aircraft.baro_rate;

                if (rate == null || Math.abs(rate) <= 400) {
                    flStr = 'F' + flStrTemp;
                }
                else if (rate < -400) {
                    flStr = '↘' + flStrTemp; // descendo real
                }
                else if (rate > 400) {
                    flStr = '↗' + flStrTemp; // subindo real
                }
            }

            aircraftData.push({
                identifier,
                aircraftType,
                altitude: flStr,
                velocidade: velocidadKnots || '---',
                squawkCode,
                radial: 'URB' + radialSburStr + '°',
                distanciaNM: distanciaSburNM,
                dentroPoligono,
                flightLevel,
                baro_rate: aircraft.baro_rate,
                rumoMagnetic: rumoMagneticCalcStr,
                latitude,
                longitude
            });
        });

        aircraftData.sort((a, b) => a.distanciaNM - b.distanciaNM);

        resultadoTableBody.innerHTML = '';

        let existeAeronaveDestacada = false;

        aircraftData.forEach(aircraft => {

            const row = resultadoTableBody.insertRow();

            const identifierCell = row.insertCell();
            textContext = aircraft.identifier;
            identifierCell.textContent = aircraft.identifier;

            const altitudeNaTabela = aircraft.altitude;

            const nivelDeVooAbaixoDe195 =
                altitudeNaTabela.startsWith('F') &&
                parseInt(altitudeNaTabela.substring(1)) <= 195;

            if (aircraft.dentroPoligono && nivelDeVooAbaixoDe195) {
                identifierCell.classList.add('dentro-poligono-e-abaixo-f195');
                existeAeronaveDestacada = true;
            }

            row.insertCell().textContent = aircraft.aircraftType;
            
            const altitudeCell = row.insertCell();
            altitudeCell.textContent = altitudeNaTabela;

            if (aircraft.baro_rate != null && Math.abs(aircraft.baro_rate) > 400) {
                altitudeCell.style.cursor = 'progress';
            } else {
                altitudeCell.style.cursor = 'default';
            }
            
            if (aircraft.baro_rate != null && Math.abs(aircraft.baro_rate) > 400) {
                altitudeCell.title = Math.abs(Math.round(aircraft.baro_rate)) + ' FT/MIN';
            }
            
            row.insertCell().textContent = aircraft.velocidade + 'KT';
            row.insertCell().textContent = aircraft.squawkCode;
            row.insertCell().textContent = aircraft.radial;

            row.insertCell().textContent =
                isFinite(aircraft.distanciaNM)
                    ? aircraft.distanciaNM.toFixed(0) + 'NM'
                    : '---NM';

            row.insertCell().textContent =
                'RM' + aircraft.rumoMagnetic + '°';

            // tabela (mantém igual)
            const planeCell = row.insertCell();

            const planeImg = document.createElement('img');
            planeImg.src = 'arq/plane.png';

            planeImg.width = 16;
            planeImg.height = 16;

            planeImg.style.cursor = 'pointer';
            planeImg.style.transformOrigin = 'center';
            planeImg.style.transform =
                aircraft.rumoMagnetic !== '---'
                    ? `rotate(${parseInt(aircraft.rumoMagnetic) - 22}deg)`
                    : 'rotate(0deg)';

            planeImg.addEventListener('click', function () {
                abrirMapaAeronave(aircraft);
            });

            planeCell.appendChild(planeImg);
        });

        document.title = existeAeronaveDestacada
            ? 'Radial e distância (✈️ na TMA)'
            : 'Radial e distância';

        resultadoTable.style.display = 'table';
        imagemCarregamento.style.display = 'none';

    } catch (err) {
        console.error(err);
        mensagemCarregamento.textContent = 'Erro';
        imagemCarregamento.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', buscarAeronavesProximas);

```
