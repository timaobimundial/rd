/* -------------------- NOTAMS -------------------- */

function buscarNotams(icaoCode) {
    return new Promise(function (resolve, reject) {
        var client;

        if (window.XMLHttpRequest) {
            client = new XMLHttpRequest();
        } else {
            client = new ActiveXObject("Microsoft.XMLHTTP");
        }

        client.open(
            "GET",
            "https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=notam&icaocode=" + icaoCode
        );

        client.responseType = "document";

        client.onreadystatechange = function () {
            if (client.readyState === 4) {
                if (client.status === 200) {
                    var xmlDoc = client.responseXML;

                    if (!xmlDoc) {
                        resolve([]);
                        return;
                    }

                    var items = Array.from(xmlDoc.getElementsByTagName("item"));

                    resolve(
                        items.map(function (item) {
                            return {
                                item: item,
                                origem: icaoCode.toUpperCase()
                            };
                        })
                    );
                } else {
                    reject(new Error("Erro ao buscar NOTAMs de " + icaoCode));
                }
            }
        };

        client.send();
    });
}

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

function normalizarTexto(texto) {
    return (texto || "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function obterCampo(item, tag) {
    return item.getElementsByTagName(tag)[0]?.textContent || "";
}

/*
 * Cria uma assinatura do conteúdo operacional do NOTAM.
 *
 * O número <n> NÃO entra na comparação, pois SBUR e SBXU
 * podem possuir números diferentes para o mesmo NOTAM.
 */
function criarAssinaturaNotam(item) {
    return [
        normalizarTexto(obterCampo(item, "q")),
        normalizarTexto(obterCampo(item, "e")),
        normalizarTexto(obterCampo(item, "b")),
        normalizarTexto(obterCampo(item, "c")),
        normalizarTexto(obterCampo(item, "d")),
        normalizarTexto(obterCampo(item, "f")),
        normalizarTexto(obterCampo(item, "g")),
        normalizarTexto(obterCampo(item, "geo"))
    ].join("|||");
}

function dmsToDecimal(dms) {
    var regex = /(\d{2})(\d{2})(\d{2}(?:\.\d+)?)?([NS])\/?(\d{3})(\d{2})(\d{2}(?:\.\d+)?)?([EW])/;

    var match = dms.match(regex);

    if (!match) return null;

    var latDeg = parseInt(match[1]);
    var latMin = parseInt(match[2]);
    var latSec = match[3] ? parseFloat(match[3]) : 0;

    var lat = latDeg + latMin / 60 + latSec / 3600;

    if (match[4] === "S") lat = -lat;

    var lngDeg = parseInt(match[5]);
    var lngMin = parseInt(match[6]);
    var lngSec = match[7] ? parseFloat(match[7]) : 0;

    var lng = lngDeg + lngMin / 60 + lngSec / 3600;

    if (match[8] === "W") lng = -lng;

    return {
        lat: lat,
        lng: lng
    };
}

function processarTextoNotam(texto, geo, notamNum) {
    var coordsPoly = [];

    var regexDMS = /(\d{6}(?:\.\d+)?[NS][\/]?\d{7}(?:\.\d+)?[EW])/g;

    var match;

    while ((match = regexDMS.exec(texto)) !== null) {
        var parsed = dmsToDecimal(match[1]);

        if (parsed) {
            coordsPoly.push([parsed.lat, parsed.lng]);
        }
    }

    // Detecta RAIO em NM, KM ou M
    var regexRaio = /RAIO\s+(\d+(?:\.\d+)?)\s*(NM|KM|M)\b/i;

    var matchRaio = texto.match(regexRaio);

    var raioMeters = null;

    if (matchRaio) {
        var valor = parseFloat(matchRaio[1]);
        var unidade = matchRaio[2].toUpperCase();

        if (unidade === "NM") {
            raioMeters = valor * 1852;
        } else if (unidade === "KM") {
            raioMeters = valor * 1000;
        } else if (unidade === "M") {
            raioMeters = valor;
        }
    } else if (geo && geo.length >= 13) {
        var raioNM = parseFloat(geo.substring(10, 13));

        if (!isNaN(raioNM)) {
            raioMeters = raioNM * 1852;
        }
    }

    // Caso 1: Círculo
    if (coordsPoly.length === 1 && raioMeters) {
        var center = coordsPoly[0];

        var payload = JSON.stringify({
            tipo: "circulo",
            lat: center[0],
            lng: center[1],
            raioMeters: raioMeters,
            titulo: notamNum
        }).replace(/"/g, "&quot;");

        var regexAreaCirculo =
            /(\d{6}(?:\.\d+)?[NS][\/]?\d{7}(?:\.\d+)?[EW][\s\S]*?RAIO\s+\d+(?:\.\d+)?\s*(?:NM|KM|M)\b)/i;

        if (regexAreaCirculo.test(texto)) {
            return texto.replace(regexAreaCirculo, function (trechoOriginal) {
                return (
                    "<u style='cursor:pointer;color:#7fb0d4;' " +
                    'onclick="window.desenharNotamNoMapa(' +
                    payload +
                    ')">' +
                    trechoOriginal +
                    "</u>"
                );
            });
        } else {
            return texto.replace(regexDMS, function (trechoOriginal) {
                return (
                    "<u style='cursor:pointer;color:#7fb0d4;' " +
                    'onclick="window.desenharNotamNoMapa(' +
                    payload +
                    ')">' +
                    trechoOriginal +
                    "</u>"
                );
            });
        }
    }

    // Caso 2: Polígono
    else if (coordsPoly.length > 1) {
        var payloadPoly = JSON.stringify({
            tipo: "poligono",
            coords: coordsPoly,
            titulo: notamNum
        }).replace(/"/g, "&quot;");

        return texto.replace(regexDMS, function (trechoOriginal) {
            return (
                "<u style='cursor:pointer;color:#7fb0d4;' " +
                'onclick="window.desenharNotamNoMapa(' +
                payloadPoly +
                ')">' +
                trechoOriginal +
                "</u>"
            );
        });
    }

    return texto;
}


/* -------------------- BUSCA SBUR + SBXU -------------------- */

Promise.all([
    buscarNotams("sbur"),
    buscarNotams("sbxu")
])
    .then(function (resultados) {
        var notamsSBUR = resultados[0];
        var notamsSBXU = resultados[1];

        /*
         * Cria um conjunto com as assinaturas dos NOTAMs SBUR.
         * Assim podemos eliminar os SBXU que tenham o mesmo
         * conteúdo operacional.
         */
        var assinaturasSBUR = new Set(
            notamsSBUR.map(function (notam) {
                return criarAssinaturaNotam(notam.item);
            })
        );

        /*
         * Mantém apenas os NOTAMs SBXU que NÃO possuem
         * equivalente em SBUR.
         */
        var notamsSBXUFiltrados = notamsSBXU.filter(function (notam) {
            var assinatura = criarAssinaturaNotam(notam.item);

            return !assinaturasSBUR.has(assinatura);
        });

        /*
         * Junta SBUR + SBXU não duplicados.
         */
        var notams = notamsSBUR.concat(notamsSBXUFiltrados);

        /*
         * Ordena do mais novo para o mais antigo
         * usando a data do campo <b>.
         */
        notams.sort(function (a, b) {
            return (
                parseNotamDate(obterCampo(b.item, "b")) -
                parseNotamDate(obterCampo(a.item, "b"))
            );
        });

        var container = document.getElementById("api_nt");

        var tableString = "<table width='100%'>";

        for (var i = 0; i < notams.length; i++) {
            var notam = notams[i];
            var item = notam.item;
            var origem = notam.origem;

            var codigoLink = origem === "SBXU" ? "SBXU" : "SBUR";

            tableString += "<tr><td style='padding:15px 0 0 0'><br>";

            tableString +=
                "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=" +
                codigoLink +
                "#notam' target='_blank'>";

            var notamNum = obterCampo(item, "n") || "N/A";

            tableString += notamNum;

            tableString += "</a> ";

            var b = obterCampo(item, "b");
            var c = obterCampo(item, "c");

            if (formatDateTime(b)) {
                tableString +=
                    c === "PERM"
                        ? formatDateTime(b) + " a PERM"
                        : formatDateTime(b) + " a " + formatDateTime(c);
            } else {
                tableString += "Data inválida";
            }

            tableString += "</td></tr><tr><td>";

            var textoE = obterCampo(item, "e");
            var geoTag = obterCampo(item, "geo");

            tableString += processarTextoNotam(
                textoE,
                geoTag,
                notamNum
            );

            var tagF = obterCampo(item, "f");
            var tagG = obterCampo(item, "g");

            if (tagF || tagG) {
                var limites = [tagF, tagG]
                    .filter(Boolean)
                    .join(" - ");

                tableString +=
                    "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";

                tableString += limites;
            }

            tableString +=
                "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";

            tableString += obterCampo(item, "d");

            tableString += "</td></tr>";

            /*
             * Identificação exclusiva dos NOTAMs da TMA.
             */
            if (origem === "SBXU") {
                tableString +=
                    "<tr><td style='font-size:14px;color:#a3a3a3'>" +
                    "(NOTAM DA TMA)" +
                    "</td></tr>";
            }
        }

        if (notams.length > 0) {
            tableString +=
                "<tr><td align='right'>" +
                "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#notam' target='_blank'>" +
                "VER NA AISWEB" +
                "</a>" +
                "</td></tr>";
        }

        tableString += "</table>";

        container.innerHTML = tableString;
    })
    .catch(function (erro) {
        console.error("Erro ao buscar NOTAMs:", erro);
    });


/* -------------------- SUPLEMENTOS -------------------- */

var clientSup;

if (window.XMLHttpRequest) {
    clientSup = new XMLHttpRequest();
} else {
    clientSup = new ActiveXObject("Microsoft.XMLHTTP");
}

clientSup.open(
    "GET",
    "https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=suplementos&icaocode=sbur"
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

            var serie =
                suplementos[i].getElementsByTagName("serie")[0]?.textContent || "";

            var numero =
                suplementos[i].getElementsByTagName("n")[0]?.textContent || "0";

            var numeroFormatado = numero.padStart(4, "0");

            var displayNumero = serie + numeroFormatado;

            var dtRaw =
                suplementos[i].getElementsByTagName("dt")[0]?.textContent || "";

            var dtFormat = "";

            if (dtRaw && dtRaw.length === 10) {
                var p = dtRaw.split("-");

                dtFormat =
                    p[2] +
                    "/" +
                    p[1] +
                    "/" +
                    p[0].slice(2, 4);
            }

            var displayBotao = displayNumero;

            if (dtFormat) {
                displayBotao += " | " + dtFormat;
            }

            tableSup +=
                "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=" +
                (
                    suplementos[i]
                        .getElementsByTagName("local")[0]
                        ?.textContent || "SBUR"
                ) +
                "#sup' target='_blank'>" +
                displayBotao +
                "</a> ";

            var titulo =
                suplementos[i]
                    .getElementsByTagName("titulo")[0]
                    ?.textContent || "Sem título";

            tableSup +=
                "<span style='color:#ffffff;margin-left:5px;font-size:17px;'>" +
                titulo +
                "</span>";

            tableSup += "</td></tr><tr><td>";

            tableSup +=
                suplementos[i]
                    .getElementsByTagName("texto")[0]
                    ?.textContent || "";

            tableSup +=
                "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";

            tableSup +=
                suplementos[i]
                    .getElementsByTagName("duracao")[0]
                    ?.textContent || "";

            tableSup += "</td></tr>";
        }

        if (suplementos.length > 0) {
            tableSup +=
                "<tr><td align='right'>" +
                "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#sup' target='_blank'>" +
                "VER NA AISWEB" +
                "</a>" +
                "</td></tr>";
        }

        tableSup += "</table>";

        containerSup.innerHTML = tableSup;
    }
};

clientSup.send();
