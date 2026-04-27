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
            tableString += notams[i].getElementsByTagName("e")[0]?.textContent || "";
            tableString += "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";
            tableString += notams[i].getElementsByTagName("d")[0]?.textContent || "";
            tableString += "</td></tr>";
        }

        tableString +=
            "<td align='right'><a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#notam' target='_blank'>VER NA AISWEB</a></td>";
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

            tableSup +=
                "<a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=" +
                (suplementos[i].getElementsByTagName("local")[0]?.textContent || "SBUR") +
                "#sup' target='_blank'>";
            tableSup += displayBotao;
            tableSup += "</a> ";

            var titulo = suplementos[i].getElementsByTagName("titulo")[0]?.textContent || "Sem título";
            tableSup +=
                "<span style='color:#ffffff;margin-left:5px;font-size:17px;'>" +
                titulo +
                "</span>";

            tableSup += "</td></tr><tr><td>";
            tableSup += suplementos[i].getElementsByTagName("texto")[0]?.textContent || "";
            tableSup += "</td></tr><tr><td style='font-size:16px;color:#a3a3a3'>";
            tableSup += suplementos[i].getElementsByTagName("duracao")[0]?.textContent || "";
            tableSup += "</td></tr>";
        }

        tableSup +=
            "<td align='right'><a href='https://aisweb.decea.mil.br/?i=aerodromos&codigo=SBUR#sup' target='_blank'>VER NA AISWEB</a></td>";
        tableSup += "</table>";

        containerSup.innerHTML = tableSup;
    }
};

clientSup.send();
