/* -------------------- NOTAMS -------------------- */
var client;
if (window.XMLHttpRequest) {
    client = new XMLHttpRequest();
} else {
    client = new ActiveXObject("Microsoft.XMLHTTP");
}

client.open(
    'GET',
    'https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=notam&icaocode=sbur'
);
client.responseType = "document";

client.onreadystatechange = function () {
    if (client.readyState === 4 && client.status === 200) {
        var xmlDoc = client.responseXML;
        if (!xmlDoc) return;

        var notams = Array.from(xmlDoc.getElementsByTagName("item"));

        function parseNotamDate(raw) {
            if (!raw || raw === "PERM" || raw.length < 10) return 0;
            return Date.UTC(
                2000 + parseInt(raw.slice(0, 2)),
                parseInt(raw.slice(2, 4)) - 1,
                parseInt(raw.slice(4, 6)),
                parseInt(raw.slice(6, 8)),
                parseInt(raw.slice(8, 10))
            );
        }

        notams.sort(function (a, b) {
            return (
                parseNotamDate(b.getElementsByTagName("b")[0]?.textContent) -
                parseNotamDate(a.getElementsByTagName("b")[0]?.textContent)
            );
        });

        var container = document.getElementById("api_nt");
        var tableString = "<table width='100%'>";

        function formatDateTime(raw) {
            if (!raw) return "";
            if (raw === "PERM") return "PERM";
            if (raw.length < 10) return "";
            return (
                raw.slice(4, 6) +
                "/" +
                raw.slice(2, 4) +
                "/20" +
                raw.slice(0, 2) +
                " " +
                raw.slice(6, 8) +
                ":" +
                raw.slice(8, 10) +
                " UTC"
            );
        }

        for (var i = 0; i < notams.length; i++) {
            tableString += "<tr><td style='padding:15px 0 0 0'><br>";
            tableString += "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#notam' target='_blank'>";
            tableString += notams[i].getElementsByTagName("n")[0]?.textContent || "N/A";
            tableString += "</a> ";

            var b = notams[i].getElementsByTagName("b")[0]?.textContent || "";
            var c = notams[i].getElementsByTagName("c")[0]?.textContent || "";

            if (formatDateTime(b)) {
                tableString +=
                    c === "PERM"
                        ? formatDateTime(b) + " a PERM"
                        : formatDateTime(b) + " a " + formatDateTime(c);
            } else {
                tableString += "Data inválida";
            }


tableString += "</td></tr><tr><td>";
            
            var textoE = notams[i].getElementsByTagName("e")[0]?.textContent || "";
            var geoTag = notams[i].getElementsByTagName("geo")[0]?.textContent || "";
            
            function dmsToDecimal(dms) {
                var regex = /(\d{2})(\d{2})(\d{2}(?:\.\d+)?)?([NS])\/?(\d{3})(\d{2})(\d{2}(?:\.\d+)?)?([EW])/;
                var match = dms.match(regex);
                if (!match) return null;
                
                var latDeg = parseInt(match[1]), latMin = parseInt(match[2]), latSec = match[3] ? parseFloat(match[3]) : 0;
                var lat = latDeg + latMin / 60 + latSec / 3600;
                if (match[4] === 'S') lat = -lat;
                
                var lngDeg = parseInt(match[5]), lngMin = parseInt(match[6]), lngSec = match[7] ? parseFloat(match[7]) : 0;
                var lng = lngDeg + lngMin / 60 + lngSec / 3600;
                if (match[8] === 'W') lng = -lng;
                
                return { lat: lat, lng: lng };
            }

function processarTextoNotam(texto, geo) {
                var coordsPoly = [];
                var regexDMS = /(\d{6}(?:\.\d+)?[NS][\/]?\d{7}(?:\.\d+)?[EW])/g;
                var match;
                
                while ((match = regexDMS.exec(texto)) !== null) {
                    var parsed = dmsToDecimal(match[1]);
                    if (parsed) coordsPoly.push([parsed.lat, parsed.lng]);
                }
                
                // Detecta RAIO em NM, KM ou M
                var regexRaio = /RAIO\s+(\d+(?:\.\d+)?)\s*(NM|KM|M)\b/i;
                var matchRaio = texto.match(regexRaio);
                var raioMeters = null;
                
                if (matchRaio) {
                    var valor = parseFloat(matchRaio[1]);
                    var unidade = matchRaio[2].toUpperCase();
                    
                    if (unidade === 'NM') raioMeters = valor * 1852;
                    else if (unidade === 'KM') raioMeters = valor * 1000;
                    else if (unidade === 'M') raioMeters = valor;
                } else if (geo && geo.length >= 13) {
                    var raioNM = parseFloat(geo.substring(10, 13));
                    if (!isNaN(raioNM)) raioMeters = raioNM * 1852;
                }

                var notamNum = notams[i].getElementsByTagName("n")[0]?.textContent || "NOTAM";

                // Caso 1: Círculo (1 Coordenada + Raio em qualquer unidade)
                if (coordsPoly.length === 1 && raioMeters) {
                    var center = coordsPoly[0];
                    var payload = JSON.stringify({ tipo: 'circulo', lat: center[0], lng: center[1], raioMeters: raioMeters, titulo: notamNum }).replace(/"/g, '&quot;');
                    
                    // Regex flexível: pega da coordenada até a palavra RAIO + unidade (mesmo com texto/parênteses no meio)
                    var regexAreaCirculo = /(\d{6}(?:\.\d+)?[NS][\/]?\d{7}(?:\.\d+)?[EW][\s\S]*?RAIO\s+\d+(?:\.\d+)?\s*(?:NM|KM|M)\b)/i;

                    if (regexAreaCirculo.test(texto)) {
                        return texto.replace(regexAreaCirculo, function(trechoOriginal) {
                            return "<u style='cursor:pointer;color:#7fb0d4;' onclick=\"window.desenharNotamNoMapa(" + payload + ")\">" + trechoOriginal + "</u>";
                        });
                    } else {
                        return texto.replace(regexDMS, function(trechoOriginal) {
                            return "<u style='cursor:pointer;color:#7fb0d4;' onclick=\"window.desenharNotamNoMapa(" + payload + ")\">" + trechoOriginal + "</u>";
                        });
                    }
                } 
                // Caso 2: Polígono (Múltiplas Coordenadas)
                else if (coordsPoly.length > 1) {
                    var payloadPoly = JSON.stringify({ tipo: 'poligono', coords: coordsPoly, titulo: notamNum }).replace(/"/g, '&quot;');
                    
                    return texto.replace(regexDMS, function(trechoOriginal) {
                        return "<u style='cursor:pointer;color:#7fb0d4;' onclick=\"window.desenharNotamNoMapa(" + payloadPoly + ")\">" + trechoOriginal + "</u>";
                    });
                }
                
                return texto;
            }

            tableString += processarTextoNotam(textoE, geoTag);

            var tagF = notams[i].getElementsByTagName("f")[0]?.textContent || "";
            var tagG = notams[i].getElementsByTagName("g")[0]?.textContent || "";
            
            if (tagF || tagG) {
                var limites = [tagF, tagG].filter(Boolean).join(" - ");
                tableString += "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";
                tableString += limites;
            }

            tableString += "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";
            tableString += notams[i].getElementsByTagName("d")[0]?.textContent || "";

            
            tableString += "</td></tr>";
        }

        if (notams.length > 0) {
            tableString += "<tr><td align='right'><a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#notam' target='_blank'>VER NA AISWEB</a></td></tr>";
        }

        tableString += "</table>";
        container.innerHTML = tableString;
    }
};

client.send();


/* -------------------- SUPLEMENTOS -------------------- */
var clientSup;
if (window.XMLHttpRequest) {
    clientSup = new XMLHttpRequest();
} else {
    clientSup = new ActiveXObject("Microsoft.XMLHTTP");
}

clientSup.open(
    'GET',
    'https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=suplementos&icaocode=sbur'
);
clientSup.responseType = "document";

clientSup.onreadystatechange = function () {
    if (clientSup.readyState === 4 && clientSup.status === 200) {
        var xmlDoc = clientSup.responseXML;
        if (!xmlDoc) return;

        var suplementos = xmlDoc.getElementsByTagName("item");
        var containerSup = document.getElementById("api_sup");
        var tableSup = "<table width='100%'>";

        for (var i = suplementos.length - 1; i >= 0; i--) {
            tableSup += "<tr><td style='padding:15px 0 0 0'><br>";

            var serie = suplementos[i].getElementsByTagName("serie")[0]?.textContent || "";
            var numero = suplementos[i].getElementsByTagName("n")[0]?.textContent || "0";
            var numeroFormatado = numero.padStart(4, "0");
            var displayNumero = serie + numeroFormatado;

            var dtRaw = suplementos[i].getElementsByTagName("dt")[0]?.textContent || "";
            var dtFormat = "";
            if (dtRaw && dtRaw.length === 10) {
                var p = dtRaw.split("-");
                dtFormat = p[2] + "/" + p[1] + "/" + p[0].slice(2, 4);
            }

            var displayBotao = displayNumero;
            if (dtFormat) displayBotao += " | " + dtFormat;

            tableSup += "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=" +
                (suplementos[i].getElementsByTagName("local")[0]?.textContent || "SBUR") +
                "#sup' target='_blank'>" + displayBotao + "</a> ";

            var titulo = suplementos[i].getElementsByTagName("titulo")[0]?.textContent || "Sem título";
            tableSup += "<span style='color:#ffffff;margin-left:5px;font-size:17px;'>" +
                titulo +
                "</span>";

            tableSup += "</td></tr><tr><td>";
            tableSup += suplementos[i].getElementsByTagName("texto")[0]?.textContent || "";
            tableSup += "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";
            tableSup += suplementos[i].getElementsByTagName("duracao")[0]?.textContent || "";
            tableSup += "</td></tr>";
        }

        if (suplementos.length > 0) {
            tableSup += "<tr><td align='right'><a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#sup' target='_blank'>VER NA AISWEB</a></td></tr>";
        }

        tableSup += "</table>";
        containerSup.innerHTML = tableSup;
    }
};

clientSup.send();
