const sbur = [-47.958611, -19.794722]; // [longitude, latitude] de SBUR
const declinacaoSBUR = -22;
const resultadoTable = document.getElementById('resultado-table');
const resultadoTableBody = document.getElementById('resultado-table-body');
const resultadoContainer = document.getElementById('resultado-container');
const mensagemCarregamento = document.getElementById('mensagem-carregamento');
const imagemCarregamento = mensagemCarregamento ? mensagemCarregamento.querySelector('img') : null;

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
    const sburLongitude = sbur[0];
    const sburLatitude = sbur[1];
    const raioNM = 70; 
    
    // Mudança estratégica: usando a API de "States" filtrada por área para evitar bloqueios comuns em endpoints de "Point"
    // Bounding box calculado para cobrir aprox. o raio de 70NM (aprox. 1.2 graus de margem)
    const lamin = sburLatitude - 1.2;
    const lomin = sburLongitude - 1.2;
    const lamax = sburLatitude + 1.2;
    const lomax = sburLongitude + 1.2;

    const apiUrl = `https://api.adsb.lol/v2/box/${lamin}/${lamax}/${lomin}/${lomax}`;

    if (imagemCarregamento) imagemCarregamento.style.display = 'block';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Erro CORS/Rede");
        
        const data = await response.json();

        if (data && data.ac && Array.isArray(data.ac) && data.ac.length > 0) {
            const aircraftData = [];
            data.ac.forEach(aircraft => {
                const latitude = aircraft.lat;
                const longitude = aircraft.lon;
                let dentroPoligono = false;

                if (latitude != null && longitude != null) {
                    const point = turf.point([longitude, latitude]);
                    dentroPoligono = turf.booleanPointInPolygon(point, polygon);
                }

                const callsign = aircraft.flight ? aircraft.flight.trim() : '';
                const registration = aircraft.r || '';
                const identifier = callsign || registration || '------';
                const altitudePes = aircraft.alt_baro != null ? Math.round(aircraft.alt_baro) : '';
                const velocidadeKnots = aircraft.gs != null ? Math.round(aircraft.gs) : '';
                const heading = aircraft.track != null ? Math.round(aircraft.track) : null;
                const aircraftType = (aircraft.t || aircraft.type || '').replace("adsb_icao", "----");
                const squawkCode = aircraft.squawk || '----';

                let radialSburStr = '---';
                let distanciaSburNM = Infinity;
                let rumoMagneticCalcStr = '---';

                if (latitude != null && longitude != null) {
                    const aircraftPoint = turf.point([longitude, latitude]);
                    const sburPoint = turf.point(sbur);
                    const bearingTrue = turf.bearing(sburPoint, aircraftPoint);
                    
                    const radialMagnetic = (bearingTrue - declinacaoSBUR + 360) % 360;
                    radialSburStr = Math.round(radialMagnetic).toString().padStart(3, '0');
                    
                    const distanceKM = turf.distance(sburPoint, aircraftPoint, { units: 'kilometers' });
                    distanciaSburNM = distanceKM * 0.539957;

                    if (heading !== null) {
                        const headingMagnetic = (heading + 22 + 360) % 360;
                        rumoMagneticCalcStr = Math.round(headingMagnetic).toString().padStart(3, '0');
                    }
                }

                let flStr = '';
                let flightLevel = null;
                if (altitudePes !== '') {
                    flightLevel = Math.floor(altitudePes / 100);
                    let flStrTemp = flightLevel.toString().padStart(3, '0');
                    if (flStrTemp[2] === '9') {
                        flightLevel = Math.ceil(flightLevel / 10) * 10;
                        flStrTemp = flightLevel.toString().padStart(3, '0');
                    }
                    flStr = 'F' + flStrTemp;
                }

                // Apenas adiciona se estiver dentro do raio original de 70NM (filtragem manual após o box)
                if (distanciaSburNM <= raioNM) {
                    aircraftData.push({
                        identifier,
                        aircraftType,
                        altitude: flStr || '----',
                        velocidade: velocidadeKnots || '---',
                        squawkCode,
                        radial: 'URB' + radialSburStr + '°',
                        distanciaNM: distanciaSburNM,
                        dentroPoligono: dentroPoligono,
                        flightLevel: flightLevel,
                        rumoMagnetic: rumoMagneticCalcStr 
                    });
                }
            });

            aircraftData.sort((a, b) => a.distanciaNM - b.distanciaNM);

            resultadoTableBody.innerHTML = '';

            aircraftData.forEach(aircraft => {
                const row = resultadoTableBody.insertRow();
                const identifierCell = row.insertCell();
                identifierCell.textContent = aircraft.identifier;
                
                const altitudeNaTabela = aircraft.altitude;
                const nivelDeVooAbaixoDe195 = altitudeNaTabela.startsWith('F') && parseInt(altitudeNaTabela.substring(1)) <= 195;

                if (aircraft.dentroPoligono && nivelDeVooAbaixoDe195) {
                    identifierCell.classList.add('dentro-poligono-e-abaixo-f195');
                }

                row.insertCell().textContent = aircraft.aircraftType;
                row.insertCell().textContent = altitudeNaTabela;
                row.insertCell().textContent = aircraft.velocidade + 'KT';
                row.insertCell().textContent = aircraft.squawkCode;
                row.insertCell().textContent = aircraft.radial;
                row.insertCell().textContent = isFinite(aircraft.distanciaNM) ? aircraft.distanciaNM.toFixed(0) + 'NM' : '---NM';
                row.insertCell().textContent = 'RM' + aircraft.rumoMagnetic + '°';

                const planeCell = row.insertCell();
                const planeImg = document.createElement('img');
                planeImg.src = 'arq/plane.png';
                planeImg.width = 16;
                planeImg.height = 16;
                planeImg.style.transformOrigin = 'center';
                
                const rotation = aircraft.rumoMagnetic !== '---' ? (parseInt(aircraft.rumoMagnetic) - 22) : 0;
                planeImg.style.transform = `rotate(${rotation}deg)`;
                planeCell.appendChild(planeImg);
            });

            resultadoTable.style.display = 'table';
            if (imagemCarregamento) imagemCarregamento.style.display = 'none';

        } else {
            if (mensagemCarregamento) mensagemCarregamento.textContent = 'NIL';
            resultadoTable.style.display = 'none';
            if (imagemCarregamento) imagemCarregamento.style.display = 'none';
        }

    } catch (error) {
        console.error("Erro ao buscar aeronaves:", error);
        if (mensagemCarregamento) mensagemCarregamento.textContent = 'Erro de Acesso';
        resultadoTable.style.display = 'none';
        if (imagemCarregamento) imagemCarregamento.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', buscarAeronavesProximas);
