document.addEventListener('DOMContentLoaded', function () {

    async function consultarMarca() {

        const marca =
            document.getElementById("marca").value.toUpperCase();

        const url =
            "https://raw.githubusercontent.com/timaobimundial/dados/main/dados_aeronaves.csv";

        if (marca.length < 5) {

            document.getElementById("result_anac").innerHTML = "";
            document.getElementById("map").style.display = "none";
            return;
        }

        document.getElementById("loading").style.display = "block";

        try {

            const response = await fetch(url);
            const data = await response.text();

            const linhas = data
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);

            const headerLine =
                linhas.find(l => l.includes("MARCAS"));

            const cabecalho = headerLine
                .replace(/"/g, '')
                .split(';')
                .map(c => c.trim());

            const marcaIdx =
                cabecalho.indexOf('MARCAS');

            const operadorIdx =
                cabecalho.findIndex(h =>
                    h === 'PSVTS' ||
                    h.includes('PSV') ||
                    h.includes('OPERADOR')
                );

            const fabricanteIdx =
                cabecalho.indexOf('NM_FABRICANTE');

            const anoIdx =
                cabecalho.indexOf('NR_ANO_FABRICACAO');

            const modeloIdx =
                cabecalho.indexOf('DS_MODELO');

            let tipoIcaoIdx =
                cabecalho.indexOf('CD_TIPO_ICAO');

            if (tipoIcaoIdx === -1) {
                tipoIcaoIdx =
                    cabecalho.indexOf('CD_TIPO');
            }

            const pmdIdx =
                cabecalho.indexOf('NR_PMD');

            const passageirosIdx =
                cabecalho.indexOf('NR_PASSAGEIROS_MAX');

            const assentosIdx =
                cabecalho.indexOf('NR_ASSENTOS');

            const cvaIdx =
                cabecalho.indexOf('DT_VALIDADE_CVA');

            let encontrou = false;

            for (let i = 0; i < linhas.length; i++) {

                if (!linhas[i] || linhas[i].includes("MARCAS")) continue;

                const colunas = linhas[i]
                    .split(';')
                    .map(c => {
                        c = c.trim();
                        if (c.startsWith('"') && c.endsWith('"')) {
                            c = c.slice(1, -1);
                        }
                        return c;
                    });

                if (
                    colunas[marcaIdx] &&
                    colunas[marcaIdx].toUpperCase() === marca
                ) {

                    encontrou = true;

                    let pmd = parseInt(colunas[pmdIdx]) || 0;

                    let esteira = '';

                    if (pmd <= 6999) esteira = 'Leve (L)';
                    else if (pmd <= 135999) esteira = 'Média (M)';
                    else esteira = 'Pesada (H)';

                    // =========================
                    // OPERADOR (CORRIGIDO)
                    // =========================
                    let operador = '-';

                    try {

                        let raw = colunas[operadorIdx];

                        if (!raw || raw === 'Indisponível') throw new Error('vazio');

                        raw = raw.replace(/""/g, '"');

                        const parsed = JSON.parse(raw);

                        if (Array.isArray(parsed) && parsed.length > 0) {

                            const nomesValidos = parsed
                                .map(o => o?.NOME)
                                .filter(n => n && n !== 'Indisponível');

                            operador = nomesValidos[0] || '-';
                        }

                    } catch (e) {
                        operador = '-';
                    }

                    const fabricante =
                        colunas[fabricanteIdx] || '-';

                    const ano =
                        colunas[anoIdx] || '-';

                    const modelo =
                        colunas[modeloIdx] || '-';

                    const tipoIcao =
                        colunas[tipoIcaoIdx] || '-';

                    const passageiros =
                        colunas[passageirosIdx] || '-';

                    const assentos =
                        colunas[assentosIdx] || '-';

                    const cvaBruto =
                        colunas[cvaIdx] || '';

                    let cva = '-';

                    if (cvaBruto.length === 8) {
                        cva =
                            cvaBruto.substring(0, 2) + '/' +
                            cvaBruto.substring(2, 4) + '/' +
                            cvaBruto.substring(4, 8);
                    }

                    const html = `

<div class="anac_box">

<button
    id="fechar_anac"
    style="
        position:absolute;
        top:10px;
        right:10px;
        width:32px;
        height:32px;
        border-radius:5px;
        background-color:#7fb0d4;
        color:white;
        border:none;
        padding:0;
        font-size:16px;
        text-align:center;
        cursor:pointer;
        z-index:1000;
        outline:none;
    ">✕</button>

<div style="margin-top:40px;"></div>

<div class="anac_titulo">Matrícula ${marca}</div>

<div class="anac_linha"><div class="anac_label">Operador:</div><div class="anac_valor">${operador}</div></div>
<div class="anac_linha"><div class="anac_label">Fabricante:</div><div class="anac_valor">${fabricante}</div></div>
<div class="anac_linha"><div class="anac_label">Ano de Fabricação:</div><div class="anac_valor">${ano}</div></div>
<div class="anac_linha"><div class="anac_label">Modelo:</div><div class="anac_valor">${modelo}</div></div>
<div class="anac_linha"><div class="anac_label">Tipo ICAO:</div><div class="anac_valor">${tipoIcao}</div></div>
<div class="anac_linha"><div class="anac_label">Peso Máximo de Decolagem:</div><div class="anac_valor">${pmd} KG - Esteira ${esteira}</div></div>
<div class="anac_linha"><div class="anac_label">Número de Passageiros:</div><div class="anac_valor">${passageiros}</div></div>
<div class="anac_linha"><div class="anac_label">Número de Assentos:</div><div class="anac_valor">${assentos}</div></div>
<div class="anac_linha"><div class="anac_label">Data de Validade do CVA:</div><div class="anac_valor">${cva}</div></div>

</div>
`;

                    const mapDiv =
                        document.getElementById("map");

                    if (window.map) {
                        window.map.remove();
                        window.map = null;
                    }

                    if (window.aircraftMap) {
                        window.aircraftMap.remove();
                        window.aircraftMap = null;
                    }

                    mapDiv.innerHTML = html;

                    const metarContainer =
                        document.querySelector(".container_metar");

                    if (metarContainer) {

                        const rect =
                            metarContainer.getBoundingClientRect();

                        mapDiv.style.display = "block";
                        mapDiv.style.position = "fixed";
                        mapDiv.style.top = rect.top + "px";
                        mapDiv.style.left = rect.left + "px";
                        mapDiv.style.width = rect.width + "px";
                        mapDiv.style.height = rect.height + "px";
                        mapDiv.style.margin = "0";
                        mapDiv.style.padding = "10px";
                        mapDiv.style.boxSizing = "border-box";
                        mapDiv.style.background = "#f5f5f5";
                        mapDiv.style.overflowY = "auto";
                    }

                    document
                        .getElementById("fechar_anac")
                        .addEventListener("click", function () {
                            mapDiv.style.display = "none";
                            mapDiv.innerHTML = "";
                        });

                    break;
                }
            }

            if (!encontrou) {

                document.getElementById("map").innerHTML =
                    '<div class="anac_box"><div class="anac_titulo">NIL</div></div>';

                document.getElementById("map").style.display = "block";
            }

            document.getElementById("loading").style.display = "none";

        } catch (error) {

            console.error(error);

            document.getElementById("map").innerHTML =
                '<div class="anac_box"><div class="anac_titulo">Erro</div></div>';

            document.getElementById("map").style.display = "block";

            document.getElementById("loading").style.display = "none";
        }
    }

    function onInput() {

        const marca =
            document.getElementById("marca").value.toUpperCase();

        if (marca.length < 5) {
            document.getElementById("map").style.display = "none";
            document.getElementById("loading").style.display = "none";
        } else {
            consultarMarca();
        }
    }

    function abrirANAC() {

        const marca =
            document.getElementById("marca").value.toUpperCase();

        if (marca.length >= 5) {

            const url =
                `https://sistemas.anac.gov.br/aeronaves/cons_rab_resposta.asp?textMarca=${marca}`;

            window.open(url, '_blank');

            document.getElementById("marca").value = '';
            document.getElementById("map").style.display = "none";
        }
    }

    function ativarBotaoEnter(event) {
        if (event.key === 'Enter') abrirANAC();
    }

    function validarEntrada(event) {

        const campo = event.target;

        campo.value =
            campo.value.toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 5);
    }

    document.getElementById("marca").addEventListener("input", onInput);
    document.getElementById("marca").addEventListener("keydown", ativarBotaoEnter);
    document.getElementById("marca").addEventListener("input", validarEntrada);
    document.getElementById("search-btn").addEventListener("click", abrirANAC);

});