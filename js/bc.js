const sbur = [-47.958611, -19.794722];
const declinacaoSBUR = -22;

const resultadoTable = document.getElementById('resultado-table');
const resultadoTableBody = document.getElementById('resultado-table-body');
const mensagemCarregamento = document.getElementById('mensagem-carregamento');
const imagemCarregamento = mensagemCarregamento.querySelector('img');

const API_URL = "https://bc.carlos-gomes-299.workers.dev/";

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

async function buscarAeronavesProximas() {

    const [lon, lat] = sbur;

    imagemCarregamento.style.display = 'block';

    try {

        const response = await fetch(API_URL);
        const data = await response.json();

        const ac = data.ac || [];
        const aircraftData = [];

        ac.forEach(a => {

            const latitude = a.lat;
            const longitude = a.lon;

            let dentroPoligono = false;

            if (latitude && longitude) {
                const point = turf.point([longitude, latitude]);
                dentroPoligono = turf.booleanPointInPolygon(point, polygon);
            }

            const identifier = a.flight?.trim() || a.r || '------';
            const altitude = a.alt_baro ? Math.round(a.alt_baro) : '';
            const speed = a.gs ? Math.round(a.gs) : '';
            const heading = a.track;
            const type = (a.t || '').replace("adsb_icao", "----");
            const squawk = a.squawk || '----';

            let distanciaNM = Infinity;
            let radial = '---';
            let rumoMag = null;

            if (latitude && longitude) {

                const aircraftPoint = turf.point([longitude, latitude]);
                const sburPoint = turf.point([lon, lat]);

                const bearing = turf.bearing(sburPoint, aircraftPoint);

                radial = Math.round((bearing - declinacaoSBUR + 360) % 360)
                    .toString().padStart(3, '0');

                const distKM = turf.distance(sburPoint, aircraftPoint);
                distanciaNM = distKM * 0.539957;

                if (heading != null && !isNaN(heading)) {
                    rumoMag = Math.round((heading + 22 + 360) % 360);
                }
            }

            let fl = '----';
            if (altitude !== '') {
                const flNum = Math.floor(altitude / 100);
                fl = 'F' + flNum.toString().padStart(3, '0');
            }

            aircraftData.push({
                identifier,
                type,
                altitude: fl,
                speed,
                squawk,
                radial,
                distanciaNM,
                dentroPoligono,
                rumoMag
            });
        });

        aircraftData.sort((a, b) => a.distanciaNM - b.distanciaNM);

        resultadoTableBody.innerHTML = '';

        aircraftData.forEach(a => {

            const row = resultadoTableBody.insertRow();

            const idCell = row.insertCell();
            idCell.textContent = a.identifier;

            if (a.dentroPoligono && a.altitude.startsWith('F') && parseInt(a.altitude.slice(1)) <= 195) {
                idCell.classList.add('dentro-poligono-e-abaixo-f195');
            }

            row.insertCell().textContent = a.type;
            row.insertCell().textContent = a.altitude;
            row.insertCell().textContent = a.speed + 'KT';
            row.insertCell().textContent = a.squawk;
            row.insertCell().textContent = a.radial;
            row.insertCell().textContent = isFinite(a.distanciaNM) ? a.distanciaNM.toFixed(0) + 'NM' : '---';

            // ✔ COLUNA RM CORRIGIDA
            const rmCell = row.insertCell();
            rmCell.textContent = (a.rumoMag != null)
                ? `RM${String(a.rumoMag).padStart(3, '0')}°`
                : 'RM---°';

            const planeCell = row.insertCell();
            const img = document.createElement('img');
            img.src = 'arq/plane.png';
            img.width = 16;
            img.height = 16;
            img.style.transform = (a.rumoMag != null)
                ? `rotate(${a.rumoMag - 22}deg)`
                : `rotate(0deg)`;
            planeCell.appendChild(img);
        });

        resultadoTable.style.display = 'table';
        imagemCarregamento.style.display = 'none';

    } catch (err) {
        console.error(err);
        mensagemCarregamento.textContent = 'Erro';
        imagemCarregamento.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', buscarAeronavesProximas);
