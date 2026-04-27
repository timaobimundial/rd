(function(){
  const DB = window.TELEFONES || [];

  const busca = document.getElementById('busca_tel');
  const resultado = document.getElementById('resultado_tel');

  const popupBg = document.getElementById('popup_bg_tel');
  const popupNome = document.getElementById('popupNome_tel');
  const popupFone = document.getElementById('popupFone_tel');
  const fechar = document.getElementById('fechar_tel');

  const pinImg = document.getElementById('pin_img_tel');

  // cria botão X dinamicamente
  const clearBtn = document.createElement('button');
  clearBtn.id = 'clearInput_tel';
  clearBtn.title = 'Limpar campo';
  clearBtn.textContent = 'X';
  clearBtn.style.display = 'none';
  busca.parentNode.appendChild(clearBtn);

  let posicaoSelecionada = -1;
  let resultadosAtuais = [];

  function normaliza(s) {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function filtrarTermo(term) {
    if (!term || term.length < 2) return [];   // <-- só filtra com 2+ caracteres
    const t = normaliza(term).toUpperCase();
    return DB.filter(item =>
      normaliza(item.nome).toUpperCase().includes(t) ||
      normaliza(item.tags.join(" ")).toUpperCase().includes(t)
    );
  }

  function montarLista(matches) {
    resultadosAtuais = matches;
    posicaoSelecionada = -1;

    if (matches.length === 0) {
      resultado.style.display = 'none';
      resultado.innerHTML = '';
      return;
    }

    resultado.innerHTML = matches.map((r, i) =>
      `<div class="resultado-item_tel" data-idx="${i}">${r.nome}</div>`
    ).join('');

    resultado.style.display = 'block';
  }

  function marcarAtivo() {
    const itens = resultado.querySelectorAll('.resultado-item_tel');
    itens.forEach(i => i.classList.remove('ativo_tel'));

    if (posicaoSelecionada >= 0 && itens[posicaoSelecionada]) {
      const ativo = itens[posicaoSelecionada];
      ativo.classList.add('ativo_tel');
      ativo.scrollIntoView({ block: "nearest" });
    }
  }

  function toggleClear() {
    if(busca.value.trim() !== "") {
      pinImg.style.display = "none";
      clearBtn.style.display = "inline-block";
    } else {
      pinImg.style.display = "inline-block";
      clearBtn.style.display = "none";
    }
  }

  function clearInput() {
    busca.value = "";
    toggleClear();
    resultadosAtuais = [];
    resultado.innerHTML = '';
    resultado.style.display = 'none';
    posicaoSelecionada = -1;
  }

  busca.addEventListener('input', () => {
    toggleClear();

    const valor = busca.value.trim();
    if (valor.length < 2) {
      resultado.style.display = 'none';
      resultado.innerHTML = '';
      resultadosAtuais = [];
      return;
    }

    montarLista(filtrarTermo(valor));
  });

  clearBtn.addEventListener('click', () => clearInput());

  resultado.addEventListener('click', ev => {
    const div = ev.target.closest('.resultado-item_tel');
    if (!div) return;
    const idx = Number(div.dataset.idx);
    const reg = resultadosAtuais[idx];
    abrirPopup(reg);
  });

  busca.addEventListener('keydown', e => {
    if (resultado.style.display === 'none') return;

    const total = resultadosAtuais.length;
    if (!total) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      posicaoSelecionada = (posicaoSelecionada + 1) % total;
      marcarAtivo();
    }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      posicaoSelecionada = (posicaoSelecionada - 1 + total) % total;
      marcarAtivo();
    }
    else if (e.key === "Enter" && posicaoSelecionada >= 0) {
      e.preventDefault();
      abrirPopup(resultadosAtuais[posicaoSelecionada]);
    }
  });

  function abrirPopup(reg) {
    popupNome.textContent = reg.nome;
    popupFone.innerHTML = reg.telefones.map(t => `<div>${t}</div>`).join('');
    popupBg.style.display = 'flex';
  }

  fechar.addEventListener('click', () => popupBg.style.display = 'none');

  popupBg.addEventListener('click', e => { 
    if (e.target === popupBg) popupBg.style.display = 'none'; 
  });

  document.addEventListener('keydown', e => { 
    if (e.key === 'Escape') popupBg.style.display = 'none'; 
  });

  toggleClear();
  busca.focus();
})();
