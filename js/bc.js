const sbur = [-47.958611, -19.794722]; // [longitude, latitude] de SBUR
const declinacaoSBUR = -22;
const resultadoTable = document.getElementById('resultado-table');
const resultadoTableBody = document.getElementById('resultado-table-body');
const resultadoContainer = document.getElementById('resultado-container');
const mensagemCarregamento = document.getElementById('mensagem-carregamento');
const imagemCarregamento = mensagemCarregamento.querySelector('img'); // Obtém a tag <img> dentro da div de carregamento

// Definição do polígono a partir das coordenadas fornecidas
const polygonCoordinates = [
    [-48.596667, -20.576667], // 203456S 0483548W (convertido para [lon, lat])
    [-48.028056, -20.553611], // 203313S 0480141W
    [-47.856111, -20.543611], // 203237S 0475122W
    [-47.382500, -20.583611], // 203501S 0472257W
    [-46.985556, -20.209722], // 201236S 0465908W
    [-46.943611, -19.674167], // 194027S 0465637W
    [-46.964722, -19.561111], // 193340S 0465753W
    [-47.148889, -19.155556], // 190920S 0470856W
    [-48.092778, -19.312778], // 191846S 0480534W
    [-48.524167, -19.376111], // 192234S 0483127W
    [-48.906111, -19.425000], // 192530S 0485422W
    [-48.891944, -19.980278], // 195849S 0485331W
    [-48.596667, -20.576667]  // 203456S 0483548W (ponto de fechamento)
];

const polygon = turf.polygon([polygonCoordinates]);

async function buscarAeronavesProximas() {
    const sburLongitude = sbur[0];
    const sburLatitude = sbur[1];
    const raioNM = 70; // Raio de busca em NM
    const apiUrl = `https://bc.carlos-gomes-299.workers.dev/?lat=${sburLatitude}&lon=${sburLongitude}&raio=${raioNM}`;

    // Exibe o GIF de carregamento
    imagemCarregamento.style.display = 'block';

    try {
        const response = await fetch(apiUrl);
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

                const callsign = aircraft.flight || '';
                const registration = aircraft.r || '';
                const identifier = callsign || registration || '------';
                const altitudePes = aircraft.alt_baro != null ? Math.round(aircraft.alt_baro) : '';
                const velocidadeKnots = aircraft.gs != null ? Math.round(aircraft.gs) : '';
                const heading = aircraft.track != null ? Math.round(aircraft.track) : '';
                const aircraftType = (aircraft.t || aircraft.type || '').replace("adsb_icao", "----");
                const squawkCode = aircraft.squawk || '----';

                let radialSburStr = '---';
                let distanciaSburNM = Infinity;
                let rumoMagneticCalcStr = '---';

                if (latitude != null && longitude != null) {
                    const aircraftPoint = turf.point([longitude, latitude]);
                    const sburPoint = turf.point(sbur);
                    const bearingTrue = turf.bearing(sburPoint, aircraftPoint);
                    // Aplica o ajuste de +22º no cálculo do rumo magnético
                    const radialMagnetic = (bearingTrue - declinacaoSBUR + 360) % 360;
                    radialSburStr = Math.round(radialMagnetic).toString().padStart(3, '0');
                    const distanceKM = turf.distance(sburPoint, aircraftPoint, { units: 'kilometers' });
                    distanciaSburNM = distanceKM * 0.539957;
                    // Calcula o rumo magnético com o ajuste
                    const headingMagnetic = (heading + 22 + 360) % 360;
                    rumoMagneticCalcStr = heading !== null ? Math.round(headingMagnetic).toString().padStart(3, '0') : '---';
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

                aircraftData.push({
                    identifier,
                    aircraftType,
                    altitude: flStr || '----',
                    velocidade: velocidadeKnots || '---',
                    squawkCode,
                    radial: 'URB' + radialSburStr + '\u00B0',
                    distanciaNM: distanciaSburNM,
                    dentroPoligono: dentroPoligono,
                    flightLevel: flightLevel,
                    rumoMagnetic: rumoMagneticCalcStr // Salva o rumo magnético calculado
                });
            });

            // Ordena o array de aeronaves pela distância (crescente)
            aircraftData.sort((a, b) => a.distanciaNM - b.distanciaNM);

            // Limpa o corpo da tabela
            resultadoTableBody.innerHTML = '';

            // Preenche a tabela com os dados das aeronaves ordenados
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
                row.insertCell().textContent = 'RM' + aircraft.rumoMagnetic + '\u00B0'; // Última coluna com "RMxxxº"
		// Adiciona a célula do aviãozinho
const planeCell = row.insertCell();
const planeImg = document.createElement('img');
planeImg.src = 'arq/plane.png'; // caminho relativo correto
planeImg.width = 16;
planeImg.height = 16;
planeImg.style.transformOrigin = 'center';
// gira para o rumo correto considerando 022° como norte do PNG
planeImg.style.transform = `rotate(${aircraft.rumoMagnetic - 22}deg)`;
planeCell.appendChild(planeImg);


            });

            resultadoTable.style.display = 'table'; // Exibe a tabela
            imagemCarregamento.style.display = 'none'; // Oculta o GIF de carregamento

        } else {
            mensagemCarregamento.textContent = 'NIL';
            resultadoTable.style.display = 'none'; // Oculta a tabela se não houver dados
            imagemCarregamento.style.display = 'none'; // Oculta o GIF também
        }

    } catch (error) {
        console.error("Erro ao buscar aeronaves:", error);
        mensagemCarregamento.textContent = 'Erro';
        resultadoTable.style.display = 'none'; // Oculta a tabela em caso de erro
        imagemCarregamento.style.display = 'none'; // Oculta o GIF também
    }
}

document.addEventListener('DOMContentLoaded', buscarAeronavesProximas);