
let map; // Definindo uma variável global para o mapa

async function fetchAeroportoInfo() {






    const icaoCode = document.getElementById("icaoCode").value.trim().toUpperCase();

    if (icaoCode.length !== 4) {
        document.getElementById("result").style.display = "none";
        document.getElementById("map").style.display = "none"; // Esconde a div 'map' se ICAO não for válido
        return;
    }

    const apiUrl = `https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=rotaer&icaoCode=${icaoCode}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");

        const cidade = xmlDoc.querySelector("city") ? xmlDoc.querySelector("city").textContent : "";
        const estado = xmlDoc.querySelector("uf") ? xmlDoc.querySelector("uf").textContent : "";
        const fir = xmlDoc.querySelector("fir") ? xmlDoc.querySelector("fir").textContent : "não encontrado";

        const latDest = parseFloat(xmlDoc.querySelector("lat") ? xmlDoc.querySelector("lat").textContent : 
            (xmlDoc.querySelector("latRotaer") ? xmlDoc.querySelector("latRotaer").textContent : 0));
        const lngDest = parseFloat(xmlDoc.querySelector("lng") ? xmlDoc.querySelector("lng").textContent : 
            (xmlDoc.querySelector("lngRotaer") ? xmlDoc.querySelector("lngRotaer").textContent : 0));

        if (isNaN(latDest) || isNaN(lngDest)) {
            document.getElementById("result").textContent = "Coordenadas inválidas para o destino.";
            document.getElementById("result").style.display = "block";
            document.getElementById("map").style.display = "none"; // Esconde a div 'map' se as coordenadas forem inválidas
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






        const distance = haversineDistance(sbur, { lat: latDest, lng: lngDest });
        const trueBearing = calculateBearing(sbur, { lat: latDest, lng: lngDest });
        const declinacao = 22;
        const magneticBearing = (parseInt(trueBearing) + declinacao) % 360;
        const formattedMagneticBearing = String(magneticBearing).padStart(3, '0');

        const resultText = `${cidade}-${estado} (${fir})`;

        const resultElement = document.createElement("span");
        resultElement.innerHTML = resultText;
        resultElement.style.cursor = "wait";

        const name = xmlDoc.querySelector("name") ? xmlDoc.querySelector("name").textContent : "";
        const length = xmlDoc.querySelector("length") ? xmlDoc.querySelector("length").textContent : "";
        const width = xmlDoc.querySelector("width") ? xmlDoc.querySelector("width").textContent : "";
        resultElement.title = `${name}\n${length}x${width}`;

        // Exibe informações de radial e distância na div result, com quebra de linha
        const radialDistText = `<br>${formattedMagneticBearing}º ${distance}NM`;
        const radialDistElement = document.createElement("span");
        radialDistElement.innerHTML = radialDistText;
        resultElement.appendChild(radialDistElement);

        document.getElementById("result").innerHTML = "";
        document.getElementById("result").appendChild(resultElement);
        document.getElementById("result").style.display = "block";

        // Exibe a div 'map' somente quando 'result' for exibida
        document.getElementById("map").style.display = "block";

        // Se o mapa já foi criado, destruímos ele
        if (map) {
            map.remove();
        }

        // Inicializa o mapa
        map = L.map('map', {
            scrollWheelZoom: true  // Permite o zoom com a roda do mouse
        }).setView([-19.764722222222, -47.966111111111], 5);  // Centro SBUR

        // Adiciona o tile layer (mapa de fundo)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
  ],
  // [
  //   [-19.375000, -48.524167],
  //   [-19.312778, -48.092778],
  //   [-19.155556, -47.148889],
  //   [-18.431667, -47.697222],
  //   [-18.286389, -47.890278],
  //   [-18.213333, -48.127778],
  //   [-18.210556, -48.152778],
  //   [-18.204444, -48.248056],
  //   [-18.219722, -48.341944],
  //   [-18.248889, -48.461389],
  //   [-18.576667, -48.849167],
  //   [-18.954167, -48.919722],
  //   [-19.425000, -48.906111]
  // ]
];



L.polygon(polygonCoordinates, { color: 'gray', fillColor: 'lightgray', fillOpacity: 0.5, weight: 0.5 }).addTo(map);






        // Função para obter as coordenadas do ICAOCode
        function fetchCoordinates(icaoCode) {
            const url = `https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=rotaer&icaoCode=${icaoCode}`;
            
            return fetch(url)
                .then(response => response.text())  // Alterando para .text() para receber XML
                .then(data => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(data, "text/xml");

                    // Obtém as coordenadas
                    const lat = parseFloat(xmlDoc.getElementsByTagName("lat")[0].textContent);
                    const lng = parseFloat(xmlDoc.getElementsByTagName("lng")[0].textContent);

                    return { lat, lng };
                });
        }

        // Função para atualizar o mapa
        function updateMap() {
            fetchCoordinates(icaoCode).then(coords => {
                const latLngDest = L.latLng(coords.lat, coords.lng);

                // Calculando distância e radial
                const distance = haversineDistance(sbur, { lat: latLngDest.lat, lng: latLngDest.lng });
                const trueBearing = calculateBearing(sbur, { lat: latLngDest.lat, lng: latLngDest.lng });
                const declinacao = 20;
                const magneticBearing = (parseInt(trueBearing) + declinacao) % 360;
                const formattedMagneticBearing = String(magneticBearing).padStart(3, '0');

                // Criando o conteúdo do tooltip com SBUR na primeira linha e radial/distância na segunda
                const tooltipContent = `SBUR<br><span style="display:inline-block; width:50%; text-align:left">${formattedMagneticBearing}º</span><span style="display:inline-block; width:50%; text-align:right">${distance}NM</span>`;

                // Adiciona o pin para SBUR
                const markerSBUR = L.marker([sbur.lat, sbur.lng]).addTo(map);
                markerSBUR.bindTooltip(tooltipContent, { permanent: true, direction: "top", offset: [0, -15] });

                // Adiciona o pin para o destino dinâmico
                const markerDest = L.marker([latLngDest.lat, latLngDest.lng]).addTo(map);
                markerDest.bindTooltip(icaoCode, { permanent: true, direction: "top", offset: [0, -15] });

                // Desenha uma linha (polyline) entre SBUR e o destino
                L.polyline([sbur, latLngDest], { color: '#7fb0d4' }).addTo(map);

                // Ajusta o zoom do mapa para enquadrar os pins
                const bounds = L.latLngBounds([markerSBUR.getLatLng(), markerDest.getLatLng()]);
                map.fitBounds(bounds, { paddingTopLeft: [90, 90], paddingBottomRight: [50, 50] });  // Aumentei o padding nas direções superior e inferior
            });
        }

        // Atualiza o mapa com o ICAOCode digitado
        updateMap();

    } catch (error) {
        console.error("Erro ao buscar os dados da API:", error);
        document.getElementById("result").textContent = "Erro ao carregar";
        document.getElementById("result").style.display = "block";
        document.getElementById("map").style.display = "none"; // Esconde a div 'map' em caso de erro
    }
}

// Função para limpar o ICAOCode
function clearIcaoCode() {
    document.getElementById("icaoCode").value = "";
    document.getElementById("result").style.display = "none";
    document.getElementById("map").style.display = "none"; // Esconde a div 'map' ao limpar
}

function openNewTab() {
    const icaoInput = document.getElementById("icaoCode");
    const icaoCode = icaoInput.value.trim().toUpperCase();

    if (icaoCode.length === 4) {
        const url = `https://aisweb.decea.mil.br/?i=aerodromos&codigo=${icaoCode}`;
        window.open(url, "_blank");

        icaoInput.value = "";
        document.getElementById("result").style.display = "none";
        document.getElementById("map").style.display = "none"; // Esconde a div 'map' após abrir a nova aba
    }
}

document.getElementById("icaoCode").addEventListener("input", fetchAeroportoInfo);
document.getElementById("searchButton").addEventListener("click", openNewTab);
document.getElementById("icaoCode").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        openNewTab();
    }
});

// Adicionando o botão "X" para limpar a caixa de texto e esconder o mapa, fixando-o no canto
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
closeButton.style.zIndex = "1000"; // Garantindo que o botão fique sempre por cima
closeButton.onclick = clearIcaoCode;

document.getElementById("map").appendChild(closeButton);

