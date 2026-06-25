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
    
    // Conteúdo do Tooltip do avião com Identificador + Radial e Distância abaixo
    const planeTooltipContent = `${aircraft.identifier}<br>${radialLimpa}° ${aircraft.distanciaNM.toFixed(0)}NM`;

    planeMarker.bindTooltip(planeTooltipContent, {
        permanent: true,
        direction: "top",
        offset: [0, -15]
    });

    // Pin de SBUR criado sem tooltip (apenas o marcador visual)
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
