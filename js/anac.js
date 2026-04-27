document.addEventListener('DOMContentLoaded', function () {
    async function consultarMarca() {
        const marca = document.getElementById("marca").value.toUpperCase();
        const url = "https://raw.githubusercontent.com/timaobimundial/dados/main/dados_aeronaves.csv";

        if (marca.length < 5) {
            document.getElementById("result_anac").innerHTML = "";
            return;
        }

        document.getElementById("loading").style.display = "block";

        try {
            const response = await fetch(url);
            const data = await response.text();

            const linhas = data.split('\n');
            const cabecalho = linhas[1].replace(/"/g, '').split(';');

            const cdCategoriaIdx = cabecalho.indexOf('CD_CATEGORIA');
            const nrPmdIdx = cabecalho.indexOf('NR_PMD');
            const cdTipoIcaoIdx = cabecalho.indexOf('CD_TIPO_ICAO');
            const marcaIdx = cabecalho.indexOf('MARCA');
            const nmOperadorIdx = cabecalho.indexOf('NM_OPERADOR'); 
            const nrAnoFabricacaoIdx = cabecalho.indexOf('NR_ANO_FABRICACAO'); 

            let resultado = '';
            for (let i = 2; i < linhas.length; i++) {
                const colunas = linhas[i].replace(/"/g, '').split(';');

                if (colunas[marcaIdx] && colunas[marcaIdx].toUpperCase().includes(marca)) {
                    let nrPmd = parseInt(colunas[nrPmdIdx]);

                    if (nrPmd >= 0 && nrPmd <= 6999) {
                        nrPmd = "L";
                    } else if (nrPmd >= 7000 && nrPmd <= 135999) {
                        nrPmd = "M";
                    } else if (nrPmd >= 136000) {
                        nrPmd = "H";
                    }

                    let categoria = colunas[cdCategoriaIdx];
                    if (categoria === "TPR") {
                        categoria = "Regular";
                    } else if (categoria === "TPN" || categoria === "TPX") {
                        categoria = "Não regular";
                    } else {
                        categoria = "Geral";
                    }

                    const operador = colunas[nmOperadorIdx] || "Desconhecido";
                    const anoFabricacao = colunas[nrAnoFabricacaoIdx] || "N/A";

                    resultado += `<div class="info_anac" title="${operador}\n${anoFabricacao}">${colunas[cdTipoIcaoIdx]}&nbsp;&nbsp;${nrPmd}&nbsp;&nbsp;${categoria}</div>`;
                }
            }

            document.getElementById("result_anac").innerHTML = resultado || "NIL";
            document.getElementById("loading").style.display = "none";
        } catch (error) {
            document.getElementById("result_anac").innerHTML = "Erro";
            document.getElementById("loading").style.display = "none";
            console.error(error);
        }
    }

    function onInput() {
        const marca = document.getElementById("marca").value.toUpperCase();
        
        if (marca.length < 5) {
            document.getElementById("result_anac").innerHTML = "";
            document.getElementById("loading").style.display = "none";
        } else {
            consultarMarca();
        }
    }

    function abrirANAC() {
        const marca = document.getElementById("marca").value.toUpperCase();
        if (marca.length >= 5) {
            const url = `https://sistemas.anac.gov.br/aeronaves/cons_rab_resposta.asp?textMarca=${marca}`;
            window.open(url, '_blank');
            document.getElementById("marca").value = '';
            document.getElementById("result_anac").innerHTML = '';
        } else {
            alert("Digite uma marca válida com pelo menos 5 caracteres.");
        }
    }

    function ativarBotaoEnter(event) {
        if (event.key === 'Enter') {
            abrirANAC();
        }
    }

    function validarEntrada(event) {
        const campo = event.target;
        let valor = campo.value;
        valor = valor.toUpperCase();
        campo.value = valor.replace(/[^A-Z]/g, '').slice(0, 5);
    }

    document.getElementById("marca").addEventListener("input", onInput);
    document.getElementById("marca").addEventListener("keydown", ativarBotaoEnter);
    document.getElementById("marca").addEventListener("input", validarEntrada);
    document.getElementById("search-btn").addEventListener("click", abrirANAC);

    document.getElementById("result_anac").addEventListener("mouseover", function (event) {
        if (event.target.classList.contains("info_anac")) {
            event.target.style.cursor = "wait";
        }
    });

    document.getElementById("result_anac").addEventListener("mouseout", function (event) {
        if (event.target.classList.contains("info_anac")) {
            event.target.style.cursor = "default";
        }
    });
});
