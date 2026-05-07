window.aircraftMap = null;

function abrirMapaAeronave(aircraft) {

    const mapDiv = document.getElementById('map');
    const metarContainer = document.querySelector('.container_metar');

    if (metarContainer) {

        const rect = metarContainer.getBoundingClientRect();

        mapDiv.style.display = 'block';
        mapDiv.style.position = 'fixed';

mapDiv.style.top = (rect.top + window.scrollY) + 'px';
mapDiv.style.left = (rect.left + window.scrollX) + 'px';

        mapDiv.style.width = rect.width + 'px';
        mapDiv.style.height = rect.height + 'px';

        mapDiv.style.margin = '0';
        mapDiv.style.padding = '0';

        mapDiv.style.zIndex = '9999';
    }

    if (window.map) {
        window.map.remove();
        window.map = null;
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

    const polygonLatLng = [
        [-20.576667, -48.596667],
        [-20.553611, -48.028056],
        [-20.543611, -47.856111],
        [-20.583611, -47.382500],
        [-20.209722, -46.985556],
        [-19.674167, -46.943611],
        [-19.561111, -46.964722],
        [-19.155556, -47.148889],
        [-19.312778, -48.092778],
        [-19.376111, -48.524167],
        [-19.425000, -48.906111],
        [-19.980278, -48.891944]
    ];

    L.polygon(polygonLatLng, {
        color: 'gray',
        fillColor: 'lightgray',
        fillOpacity: 0.5,
        weight: 0.5
    }).addTo(window.aircraftMap);

    const tooltipContent =
        `SBUR<br>
        <span style="display:inline-block;width:50%;text-align:left">
        ${aircraft.radial.replace('URB', '').replace('°', '')}°
        </span>
        <span style="display:inline-block;width:50%;text-align:right">
        ${aircraft.distanciaNM.toFixed(0)}NM
        </span>`;

    const markerSBUR = L.marker([-19.794722, -47.958611]).addTo(window.aircraftMap);

    markerSBUR.bindTooltip(tooltipContent, {
        permanent: true,
        direction: "top",
        offset: [0, -15]
    });

    const rotation =
        aircraft.rumoMagnetic !== '---'
            ? parseInt(aircraft.rumoMagnetic) - 22
            : 0;

    const planeIcon = L.divIcon({
        className: 'plane-div-icon',
        html: `
            <img
                src="arq/plane.png"
                style="
                    width:28px;
                    height:28px;
                    transform: rotate(${rotation}deg);
                    transform-origin:center;
                "
            >
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    const planeMarker = L.marker(
        [aircraft.latitude, aircraft.longitude],
        {
            icon: planeIcon
        }
    ).addTo(window.aircraftMap);

    planeMarker.bindTooltip(aircraft.identifier, {
        permanent: true,
        direction: "top",
        offset: [0, -15]
    });

    L.polyline(
        [
            [-19.794722, -47.958611],
            [aircraft.latitude, aircraft.longitude]
        ],
        {
            color: '#7fb0d4'
        }
    ).addTo(window.aircraftMap);

    const bounds = L.latLngBounds([
        [-19.794722, -47.958611],
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
