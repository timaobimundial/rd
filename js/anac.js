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

        const mapDiv = document.getElementById("map");

        // >>> CRIA A DIV GRANDE UMA ÚNICA VEZ (ESTRUTURA FINAL FIXA)
        mapDiv.style.display = "block";

        const metarContainer =
            document.querySelector(".container_metar");

        if (metarContainer) {
            const rect = metarContainer.getBoundingClientRect();

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

        // >>> SEMPRE MESMA CAIXA GRANDE
        mapDiv.innerHTML = `
            <div class="anac_box" id="anac_box" style="
                width:100%;
                height:100%;
                display:flex;
                align-items:center;
                justify-content:center;
            ">
                <img src="arq/l.gif" style="width:16px;height:16px;">
            </div>
        `;

        const anacBox = document.getElementById("anac_box");

        try {

            const response = await fetch(url);
            const data = await response.text();

            const linhas = data
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);

            const headerLine =
                linhas.find(l => l.includes("MARCAS"));

            const cabecalho =
                headerLine.replace(/"/g, '')
                    .split(';')
                    .map(c => c.trim());

            const marcaIdx = cabecalho.indexOf('MARCAS');

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
                tipoIcaoIdx = cabecalho.indexOf('CD_TIPO');
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

                if (colunas[marcaIdx] &&
                    colunas[marcaIdx].toUpperCase() === marca) {

                    encontrou = true;

                    let pmd = parseInt(colunas[pmdIdx]) || 0;

                    let esteira = '';
                    if (pmd <= 6999) esteira = 'Leve (L)';
                    else if (pmd <= 135999) esteira = 'Média (M)';
                    else esteira = 'Pesada (H)';

                    let operador = '-';

                    try {
                        let raw = colunas[operadorIdx];
                        if (!raw || raw === 'Indisponível') throw new Error();

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

                    const fabricante = colunas[fabricanteIdx] || '-';
                    const ano = colunas[anoIdx] || '-';
                    const modelo = colunas[modeloIdx] || '-';
                    const tipoIcao = colunas[tipoIcaoIdx] || '-';
                    const passageiros = colunas[passageirosIdx] || '-';
                    const assentos = colunas[assentosIdx] || '-';

                    const cvaBruto = colunas[cvaIdx] || '';
                    let cva = '-';

                    if (cvaBruto.length === 8) {
                        cva =
                            cvaBruto.substring(0, 2) + '/' +
                            cvaBruto.substring(2, 4) + '/' +
                            cvaBruto.substring(4, 8);
                    }

                    anacBox.innerHTML = `
<div class="anac_box" style="width:100%;height:100%;overflow:auto;position:relative;">

<button id="fechar_anac" style="
    position:absolute;
    top:10px;
    right:10px;
    width:32px;
    height:32px;
    border-radius:5px;
    background-color:#7fb0d4;
    color:white;
    border:none;
    cursor:pointer;
">✕</button>

<div style="margin-top:40px;"></div>

<div class="anac_titulo">Matrícula ${marca}</div>

<div class="anac_linha"><div class="anac_label">Operador:</div><div class="anac_valor">${operador}</div></div>
<div class="anac_linha"><div class="anac_label">Fabricante:</div><div class="anac_valor">${fabricante}</div></div>
<div class="anac_linha"><div class="anac_label">Ano de Fabricação:</div><div class="anac_valor">${ano}</div></div>
<div class="anac_linha"><div class="anac_label">Modelo:</div><div class="anac_valor">${modelo}</div></div>
<div class="anac_linha"><div class="anac_label">Tipo ICAO:</div><div class="anac_valor">${tipoIcao}</div></div>
<div class="anac_linha"><div class="anac_label">PMD:</div><div class="anac_valor">${pmd} KG - ${esteira}</div></div>
<div class="anac_linha"><div class="anac_label">Passageiros:</div><div class="anac_valor">${passageiros}</div></div>
<div class="anac_linha"><div class="anac_label">Assentos:</div><div class="anac_valor">${assentos}</div></div>
<div class="anac_linha"><div class="anac_label">CVA:</div><div class="anac_valor">${cva}</div></div>

</div>
`;

                    document.getElementById("fechar_anac")
                        .addEventListener("click", function () {
                            mapDiv.style.display = "none";
                            mapDiv.innerHTML = "";
                        });

                    break;
                }
            }

            if (!encontrou) {
                anacBox.innerHTML =
                    `<div style="display:flex;align-items:center;justify-content:center;height:100%;">
                        NIL
                    </div>`;
            }

        } catch (error) {
            console.error(error);

            anacBox.innerHTML =
                `<div style="display:flex;align-items:center;justify-content:center;height:100%;">
                    ERRO
                </div>`;
        }
    }

    function onInput() {
        const marca =
            document.getElementById("marca").value.toUpperCase();

        if (marca.length < 5) {
            document.getElementById("map").style.display = "none";
        } else {
            consultarMarca();
        }
    }

    document.getElementById("marca")
        .addEventListener("input", onInput);



function abrirANAC() {

    const marca =
        document.getElementById("marca").value.toUpperCase();

    if (marca.length >= 5) {

        const url =
            `https://sistemas.anac.gov.br/aeronaves/cons_rab_resposta.asp?textMarca=${marca}`;

        window.open(url, "_blank");

    }
}

function ativarBotaoEnter(event) {

    if (event.key === "Enter") {
        abrirANAC();
    }
}

document.getElementById("marca")
    .addEventListener("keydown", ativarBotaoEnter);

document.getElementById("search-btn")
    .addEventListener("click", abrirANAC);


     

     
});
