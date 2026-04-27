        async function consultarAPI() {
            const url = 'https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=cartas&icaoCode=sbur';

            try {
                const response = await fetch(url);
                const xmlText = await response.text();

                // Parse o XML
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");

                // Extrair as informações de <nome>, <link> e <dt>
                const nomes = xmlDoc.getElementsByTagName("nome");
                const links = xmlDoc.getElementsByTagName("link");
                const dts = xmlDoc.getElementsByTagName("dt");

                if (nomes.length > 0 && links.length > 0) {
                    let nomesArray = [];
                    for (let i = 0; i < nomes.length; i++) {
                        nomesArray.push({
                            nome: nomes[i].textContent,
                            link: links[i].textContent,
                            dt: dts[i] ? formatDate(dts[i].textContent) : "" // Formatar a data se existir
                        });
                    }

                    // Ordenar os nomes em ordem alfabética
                    nomesArray.sort((a, b) => a.nome.localeCompare(b.nome));

                    // Adicionar ao dropdown
                    const dropdownContent = document.getElementById("dropdown-content");
                    dropdownContent.innerHTML = "";
                    nomesArray.forEach(item => {
                        const a = document.createElement("a");
                        a.href = "javascript:void(0);";
                        a.textContent = item.nome;
                        a.title = item.dt; // Inserindo a data formatada no title
                        a.onclick = () => openWindow(item.link); // Abrir no Google Docs
                        dropdownContent.appendChild(a);
                    });

                    // Adicionar os dois novos links ao final
                    await adicionarNovoLink("https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=cartas&especie=rota&name=l5");
                    await adicionarNovoLink("https://aisweb.decea.mil.br/api/?apiKey=1505393075&apiPass=1f301b84-0a7c-11ed-9f5b-0050569ac2e1&area=cartas&especie=rota&name=h5");

                } else {
                    console.error("Nome ou link não encontrado.");
                }
            } catch (error) {
                console.error("Erro ao consultar a API:", error);
            }
        }

        async function adicionarNovoLink(url) {
            try {
                const response = await fetch(url);
                const xmlText = await response.text();

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "application/xml");

                const nomeElement = xmlDoc.getElementsByTagName("nome")[0];
                const linkElement = xmlDoc.getElementsByTagName("link")[0];
                const dtElement = xmlDoc.getElementsByTagName("dt")[0];

                if (nomeElement && linkElement) {
                    const nome = nomeElement.textContent;
                    const linkFinal = linkElement.textContent;
                    const dt = dtElement ? formatDate(dtElement.textContent) : ""; // Formatar a data se existir

                    const dropdownContent = document.getElementById("dropdown-content");
                    const a = document.createElement("a");
                    a.href = linkFinal;
                    a.textContent = nome; // Nome extraído da API
                    a.title = dt; // Inserindo a data formatada no title
                    a.target = "_blank"; // Abrir normalmente em nova guia
                    dropdownContent.appendChild(a);
                } else {
                    console.error("Nome ou link não encontrado na API.");
                }
            } catch (error) {
                console.error("Erro ao consultar a API:", error);
            }
        }

        // Função para formatar a data
        function formatDate(dateString) {
            const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = months[date.getMonth()];
            const year = String(date.getFullYear()).slice(-2); // Pega os últimos dois dígitos do ano

            return `${day} ${month} ${year}`;
        }

        function openWindow(url) {
            const windowFeatures = "width=800,height=600,scrollbars=yes,resizable=yes,location=no,menubar=no,status=no";
            const pdfWindow = window.open(url, "_blank", windowFeatures);

            // Forçar visualização do PDF no navegador via Google Docs
            if (pdfWindow) {
                pdfWindow.location.href = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`;
            }
        }

        // Chama a função ao carregar a página
        window.onload = consultarAPI;