<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch} from 'vue';
import { jogo, acoes, dadosItens, obterBuffRaca, mostrarAviso } from '../jogo.js';

// --- ESTADO LOCAL ---
const filtroTipo = ref('todos');
const filtroStat = ref('todos');
const filtroNivel = ref('todos'); // Apenas visual por enquanto
const abaAtual = ref('fabricacao'); // Controla qual aba está visível
const filtroCategoria = ref('aventureiro');
const mostrarBotaoTopo = ref(false);
// --- Adicione isso logo abaixo das outras variáveis 'ref' ou 'const' ---
const itemSelecionado = ref(null); // Guarda qual item estamos vendo no modal
// Adicione isso junto com as outras variáveis 'ref'
const slotFocado = ref(null); // Guarda qual slot está mostrando os detalhes (0, 1 ou 2)
const modalRelatorioInterrupcao = ref(null); // Guarda a lista de itens afetados pela demissão
// --- SISTEMA DE APRIMORAMENTO ---

// 1. Variáveis de Controle Visual
const itemParaAprimorar = ref(null);
const pedraSelecionada = ref(null);
const qtdPoUsado = ref(0);
const modalSelecaoAberto = ref(null); // 'item' ou 'pedra'

// 2. Definição das Regras das Pedras (Configuração)
const DB_PEDRAS = {
    nivel: [
        { id: 'pedra_up_comum', nome: 'Pedra de Afiar Comum', tier: 'comum', min: 0, max: 4, chanceBase: 100 },
        { id: 'pedra_up_rara', nome: 'Pedra de Afiar Rara', tier: 'rara', min: 4, max: 8, chanceBase: 70 }, // Ex: 70% no +5
        { id: 'pedra_up_mitica', nome: 'Pedra de Afiar Mítica', tier: 'mitica', min: 8, max: 10, chanceBase: 40 }
    ],
    stats: [
        { id: 'pedra_vida', nome: 'Rubi de Vida', tipoStat: 'vida', valor: 10, tier: 'comum' },
        { id: 'pedra_fogo', nome: 'Brasa Eterna', tipoStat: 'res_fogo', valor: 5, tier: 'rara' },
        // Adicione outras aqui...
    ]
};

// 3. Inventário Simulado (PARA TESTE - Já que seus itens atuais são apenas números)
// Futuramente, isso virá de jogo.mochila ou algo assim
const inventarioInstancias = ref([
    { uid: 1, id: 'espada_cobre', nome: 'Espada de Cobre', nivel: 0, falhasNivel: 0, durabilidadeMax: 100, stats: { ataque: 10 }, sockets: [], tentativasSocket: 0 },
    { uid: 2, id: 'armadura_couro', nome: 'Peitoral de Couro', nivel: 3, falhasNivel: 0, durabilidadeMax: 100, stats: { defesa: 15 }, sockets: [], tentativasSocket: 0 },
    { uid: 3, id: 'espada_ferro', nome: 'Lâmina do Herói', nivel: 6, falhasNivel: 4, durabilidadeMax: 100, stats: { ataque: 25 }, sockets: [], tentativasSocket: 0 }
]);

// 4. Inventário de Pedras (Simulando que você tem esses recursos)
const minhasPedras = computed(() => {
    // Aqui você filtraria do seu jogo.itens real. Exemplo simulado:
    return [
        ...DB_PEDRAS.nivel,
        ...DB_PEDRAS.stats
    ];
});

// --- CÁLCULOS E LÓGICA ---

// Chance de Sucesso (Visual e Lógico)
const chanceSucessoAtual = computed(() => {
    if (!itemParaAprimorar.value || !pedraSelecionada.value) return 0;

    // A. Lógica de Nível (+1 a +10)
    if (pedraSelecionada.value.min !== undefined) {
        const nivelAtual = itemParaAprimorar.value.nivel;
        
        // Verifica compatibilidade da pedra
        if (nivelAtual < pedraSelecionada.value.min || nivelAtual >= pedraSelecionada.value.max) return 0;

        // Base da pedra
        let chance = pedraSelecionada.value.chanceBase;
        
        // Redução por nível (ex: -10% a cada nível acima do min da pedra)
        const dif = nivelAtual - pedraSelecionada.value.min;
        chance -= (dif * 10); 

        // Bônus do Pó (Máximo 10%)
        chance += Math.min(10, qtdPoUsado.value);

        // Bônus do Ferreiro (Ex: +5% se tier S)
        if (statsFerreiro.value) {
            chance += (statsFerreiro.value.poderReal / 5); // Ajuste essa fórmula como preferir
        }

        return Math.min(100, Math.max(0, chance));
    }
    
    // B. Lógica de Stats (Pedras de Atributo)
    // Exemplo: Mítica 50%, Comum 90%
    let chanceStat = pedraSelecionada.value.tier === 'mitica' ? 50 : 85;
    if (statsFerreiro.value) chanceStat += (statsFerreiro.value.poderReal / 5);
    return Math.min(100, chanceStat);
});

// AÇÃO PRINCIPAL: APRIMORAR
const realizarAprimoramento = () => {
    const item = itemParaAprimorar.value;
    const pedra = pedraSelecionada.value;

    if (!item || !pedra) return;
    
    // Validação de segurança
    if (item.falhasNivel >= 5) {
        alert("Este item está muito danificado para ser aprimorado (+5 Falhas).");
        return;
    }

    const roll = Math.random() * 100;
    const sucesso = roll <= chanceSucessoAtual.value;

    // --- CENÁRIO 1: SUBIR NÍVEL ---
    if (pedra.min !== undefined) {
        if (sucesso) {
            item.nivel++;
            // Aumenta stats base (Exemplo simples)
            Object.keys(item.stats).forEach(k => item.stats[k] += 2); // +2 por nível
            mostrarAviso("SUCESSO!", `O item subiu para +${item.nivel}!`);
        } else {
            item.falhasNivel++;
            mostrarAviso("FALHA", "O aprimoramento falhou. Cuidado com a durabilidade.");
            
            // Penalidade crítica
            if (item.falhasNivel >= 5) {
                item.durabilidadeMax = Math.floor(item.durabilidadeMax / 2);
                mostrarAviso("QUEBRA PARCIAL", "O item atingiu 5 falhas! Durabilidade reduzida.");
            }
        }
    } 
    // --- CENÁRIO 2: ADICIONAR STAT ---
    else {
        // Verifica limites
        if (item.tentativasSocket >= 7) {
            alert("Limite de tentativas de encanto atingido (7/7).");
            return;
        }
        if (item.sockets.length >= 5) {
            alert("O item já tem 5 pedras acopladas.");
            return;
        }

        item.tentativasSocket++;

        if (sucesso) {
            item.sockets.push({ nome: pedra.nome, stat: pedra.tipoStat, val: pedra.valor });
            
            // Aplica o stat no item
            if (!item.stats[pedra.tipoStat]) item.stats[pedra.tipoStat] = 0;
            item.stats[pedra.tipoStat] += pedra.valor;

            mostrarAviso("ENCANTO SUCESSO", `Pedra acoplada! +${pedra.valor} ${pedra.tipoStat}`);
        } else {
            mostrarAviso("FALHA DE ENCANTO", "A pedra se partiu ao tentar acoplar.");
        }
    }

    // Consome recursos (Simulado)
    pedraSelecionada.value = null; // Remove a pedra do slot
    qtdPoUsado.value = 0;
};

// Função para abrir/fechar o balão ao clicar no quadrado
const toggleSlot = (index) => {
    if (slotFocado.value === index) {
        slotFocado.value = null; // Se já ta aberto, fecha
    } else {
        slotFocado.value = index; // Abre o novo
    }
};
const formatarNumero = (n) => n ? Number(n).toLocaleString('pt-BR') : '0';
const qtdModal = ref(1); // Variável simples para controlar o input

const abrirForja = (item) => {
    itemSelecionado.value = item;
    qtdModal.value = 1; // Sempre reseta para 1 ao abrir
};

const fecharForja = () => {
    itemSelecionado.value = null; // Fecha o modal
};
// Mapeia a chave do 'dados.js' para o arquivo de imagem e o nome legível
const mapaAtributos = {
    ataque: { nome: "Ataque", img: "icone_ataque.png" },
    defesa: { nome: "Defesa", img: "icone_defesafisica.png" },
    vida: { nome: "Vida", img: "icone_vida.png" },
    precisao: { nome: "Precisão", img: "icone_precisao.png" },
    evasao: { nome: "Evasão", img: "icone_evasao.png" },
    critico: { nome: "Chance Crítica", img: "icone_chancecritico.png" },
    danoCritico: { nome: "Danos Crít.", img: "icone_danocritico.png" },
    magia: { nome: "Magia", img: "icone_danomagico.png" },
    defesaMagica: { nome: "Def. Mágica", img: "icone_defesamagica.png" },
    penetracao: { nome: "Penetração", img: "icone_penetracao.png" },
    mana: { nome: "Mana", img: "icone_mana.png"}
};
// --- CONTROLE DO TOOLTIP ---
const tooltipData = reactive({
    visivel: false,
    texto: '',
    x: 0,
    y: 0
});

// Função chamada ao clicar no ícone
const abrirTooltip = (event, nomeAtributo) => {
    // Se clicar no mesmo que já está aberto, fecha
    if (tooltipData.visivel && tooltipData.texto === nomeAtributo) {
        fecharTooltip();
        return;
    }
    
    tooltipData.texto = nomeAtributo;
    tooltipData.visivel = true;

    // Calcula posição baseada onde o mouse clicou
    // Adiciona um pequeno offset (10px) para não ficar embaixo do mouse
    tooltipData.x = event.clientX + 10;
    tooltipData.y = event.clientY + 10;

    // Adiciona um ouvinte global para fechar se clicar fora
    setTimeout(() => { // Timeout pequeno para não detectar o próprio clique atual
        window.addEventListener('click', fecharTooltipFora);
    }, 50);
};

const fecharTooltip = () => {
    // 1. Fecha o tooltip de Atributos (se estiver aberto)
    tooltipData.visivel = false;
    window.removeEventListener('click', fecharTooltipFora);

    // 2. Fecha o tooltip da Fila de Produção (se estiver aberto)
    slotFocado.value = null; 
};

// Fecha se clicar em qualquer lugar que não seja o tooltip
const fecharTooltipFora = (e) => {
    const tooltipEl = document.getElementById('tooltip-flutuante');
    if (tooltipEl && !tooltipEl.contains(e.target)) {
        fecharTooltip();
    }
};
// --- LÓGICA DE FILTRO E ORDENAÇÃO ---
const itensFiltrados = computed(() => {
    // 1. Primeiro filtramos
    const listaFiltrada = dadosItens.filter(item => {
        
        // --- CORREÇÃO AQUI ---
        // A lógica tem que ficar DENTRO deste bloco 'filter', pois é aqui que o 'item' existe.
        const catItem = item.categoria || 'aventureiro'; 
        if (catItem !== filtroCategoria.value) return false;
        // ---------------------

        // Filtro de Tipo (Já existia)
        if (filtroTipo.value !== 'todos' && item.tipo !== filtroTipo.value) return false;
        
        // Filtro de Atributo (Stat)
        if (filtroStat.value !== 'todos') {
            if (!item.stats || !item.stats[filtroStat.value]) return false;
        }

        // --- Filtro de Nível ---
        if (filtroNivel.value !== 'todos') {
            const nivelMinimo = parseInt(filtroNivel.value);
            // Se o item for menor que o filtro, esconde ele
            if ((item.nivelItem || 1) < nivelMinimo) return false;
        }

        return true;
    });

    // 2. Agora ordenamos: Nível maior fica em cima (decrescente)
    return listaFiltrada.sort((a, b) => {
        const nivelA = a.nivelItem || 0; 
        const nivelB = b.nivelItem || 0;
        return nivelB - nivelA;
    });
});

// --- COMPUTEDS DE FERREIRO E BUFFS ---
const ferreiroAtivo = computed(() => {
    return jogo.funcionarios.find(f => f.profissao === 'ferreiro' && f.diasEmGreve === 0);
});
// --- SISTEMA DE SEGURANÇA CASO FERREIRO SEJA DEMITIDO ---
// Vigia: Aba, Ferreiro, Filtro e Fila de Produção
// 1. Função que faz a varredura (Separada para ser usada em dois lugares)
// 1. Função de Segurança Atualizada (Com Modal Visual)
// 1. Função de Segurança (Versão Corrigida: Aventureiro é Seguro)
const aplicarSegurancaFerreiro = (aba, temFerreiro, categoria) => {
    // 1. Navegação
    if (aba === 'aprimoramento' && !temFerreiro) abaAtual.value = 'fabricacao';
    if (categoria === 'heroi' && !temFerreiro) filtroCategoria.value = 'aventureiro';

    // 2. Cancelamento
    if (!temFerreiro) {
        // Fecha modal se for Herói
        if (itemSelecionado.value) {
            const cat = itemSelecionado.value.categoria || 'aventureiro';
            if (cat === 'heroi') fecharForja();
        }

        const itensAfetados = [];
        // Varre a fila
        for (let i = jogo.craftando.length - 1; i >= 0; i--) {
            const slot = jogo.craftando[i];
            const itemDados = dadosItens.find(it => it.id === slot.item);
            if (!itemDados) continue;

            const cat = itemDados.categoria || 'aventureiro';
            if (cat !== 'heroi') continue; // Aventureiro é seguro

            // Lógica de Reembolso
            const tempoDecorrido = slot.tempoTotal - slot.tempoRestante;
            const tempoPorItem = slot.tempoTotal / slot.qtdLote;
            const feitos = Math.floor(tempoDecorrido / tempoPorItem);
            const pendentes = Math.max(0, slot.qtdLote - feitos);

            if (feitos > 0) jogo.itens[itemDados.id] = (jogo.itens[itemDados.id] || 0) + (feitos * (itemDados.qtd || 1));
            
            if (pendentes > 0) {
                Object.keys(itemDados.custo).forEach(k => {
                    const dev = Math.floor((itemDados.custo[k] * pendentes) * 0.9);
                    if (jogo.minerios[k] !== undefined) jogo.minerios[k] += dev; 
                    else jogo[k] += dev;
                });
            }

            itensAfetados.push({ nome: itemDados.nome, img: itemDados.img, feitos: feitos, cancelados: pendentes });
            jogo.craftando.splice(i, 1);
        }
        if (itensAfetados.length > 0) modalRelatorioInterrupcao.value = itensAfetados;
    }
};



    // Função que verifica a posição da tela
    const verificarScroll = () => {
        // Se desceu mais que 300 pixels, mostra o botão
        mostrarBotaoTopo.value = window.scrollY > 300;
    };
    const protegerMultitarefa = (event) => {
    // Se o LocalStorage mudou em outra aba, recarrega essa aqui
    if (event.storageArea === localStorage) {
        fecharForja();
        alert("⚠️ ATENÇÃO: Ação detectada em outra aba!\nA página será atualizada para evitar erros.");
        window.location.reload();
    }
};
    // 2. O Vigilante (Monitora mudanças enquanto a tela está aberta)
    watch([abaAtual, ferreiroAtivo, filtroCategoria], ([novaAba, temFerreiro, novaCategoria]) => {
        aplicarSegurancaFerreiro(novaAba, temFerreiro, novaCategoria);
    });
    // Quando a página carregar, começa a vigiar o scroll
    // 3. A Varredura Inicial (Monitora assim que a tela abre)
    onMounted(() => {
    // 1. Roda a verificação de segurança inicial (para corrigir bugs ao abrir a aba)
    aplicarSegurancaFerreiro(abaAtual.value, ferreiroAtivo.value, filtroCategoria.value);
    
    // 2. Ativa o ouvinte de Scroll
    window.addEventListener('scroll', verificarScroll);

    // 3. Ativa a proteção contra Múltiplas Abas
    window.addEventListener('storage', protegerMultitarefa);
});
    // Quando sair da página, para de vigiar (para não pesar o navegador)
    onUnmounted(() => {
    // Limpa tudo ao sair para não pesar o navegador
    window.removeEventListener('scroll', verificarScroll);
    window.removeEventListener('storage', protegerMultitarefa);
});

// Calcula os buffs visuais baseado no ferreiro atual
const statsFerreiro = computed(() => {
    if (!ferreiroAtivo.value) return { tempo: 0, falha: 0, poderReal: 0 };

    const base = ferreiroAtivo.value.poderEspecial || 0;
    const buffRaca = obterBuffRaca(ferreiroAtivo.value); // % extra vinda do Lorde
    const poderReal = base * (1 + (buffRaca / 100));

    return {
        poderReal: Math.floor(poderReal), 
        tempo: Math.min(90, Math.floor(poderReal)), // % Redução Tempo (Max 90%)
        falha: Math.min(100, Math.floor(poderReal)) // % Redução Falha
    };
});

// --- LÓGICA DE CRAFT ---

// Calcula o máximo que dá pra fazer com os recursos atuais
const getMaxCraft = (item) => {
    let max = 9999;
    for (const [recurso, qtd] of Object.entries(item.custo)) {
        const estoque = jogo.minerios[recurso] !== undefined ? jogo.minerios[recurso] : (jogo[recurso] || 0);
        const possivel = Math.floor(estoque / qtd);
        if (possivel < max) max = possivel;
    }
    return max;
};

// Função inteligente que valida o que você digita
const validarInputModal = (event, item) => {
    let valor = parseInt(event.target.value);
    const maximo = getMaxCraft(item);

    // Validações básicas
    if (isNaN(valor) || valor < 1) valor = 1;
    // Se quiser limitar ao máximo de recursos, descomente a linha abaixo:
    // if (maximo > 0 && valor > maximo) valor = maximo;

    // ATUALIZA A VARIÁVEL REATIVA (Isso faz o custo mudar na tela)
    qtdModal.value = valor;

    // Força o input a mostrar o número corrigido se necessário
    if (event.target.value != valor) {
        event.target.value = valor;
    }
};

const fabricarItemDaLista = (item) => {
    // Usa a variável qtdModal para saber quantos fazer
    const quantidade = qtdModal.value;
    
    if (quantidade > 0) {
        if (typeof acoes !== 'undefined' && acoes.fabricarItem) {
            acoes.fabricarItem(item, quantidade);
        }
    }
};

// --- FORMATAÇÃO VISUAL ---

// Tempo formatado com redução aplicada
const getTempoCraft = (item, qtd) => {
    const tempoBase = item.tempo * qtd;
    const redutor = statsFerreiro.value ? (statsFerreiro.value.tempo / 100) : 0;
    const final = Math.ceil(tempoBase * (1 - redutor));
    
    // Se for menos de 1 minuto, mostra segundos (ex: 45s)
    if (final < 60) return `${final}s`;

    // Se for menos de 1 hora, mostra minutos e segundos (ex: 59m 30s)
    if (final < 3600) return `${Math.floor(final/60)}m ${final%60}s`;

    // Se for 1 hora ou mais, mostra horas e minutos (ex: 1h03min)
    const h = Math.floor(final / 3600);
    const m = Math.floor((final % 3600) / 60);
    // O 'padStart' garante que o 3 vire '03' para ficar bonito
    return `${h}h${String(m).padStart(2, '0')}min`;
};

// Chance de sucesso (para exibir na lista)
const getChanceSucesso = () => {
    const baseFalha = 15; // 15% Base fixa do jogo
    const redutor = statsFerreiro.value ? statsFerreiro.value.falha : 0;
    const falhaFinal = baseFalha * (1 - (redutor / 100));
    return (100 - falhaFinal).toFixed(1);
};

// Formatação mm:ss (e agora hh:mm) para a fila
const formatarTempoFila = (s) => {
    // Arredonda para cima para não mostrar "0s" quando ainda falta 0.5s
    const final = Math.ceil(s);

    if (final < 60) return `${final}s`;
    
    // Se for menos de 1 hora
    if (final < 3600) {
        const m = Math.floor(final / 60);
        const rest = final % 60;
        return `${m}m ${rest}s`;
    }

    // Se for 1 hora ou mais
    const h = Math.floor(final / 3600);
    const m = Math.floor((final % 3600) / 60);
    return `${h}h${String(m).padStart(2, '0')}min`;
};

// Cores de Tier (mesma da Taverna)
const corTier = (t) => ({'F':'#8A8A8A','E':'#659665','D':'#71c404','C':'#475fad','B':'#0233d1','A':'#8e44ad','S':'#f1c40f','SS':'#0fbdd1'}[t] || '#000');
</script>

<template>
  <div class="mythic-container">
    
    <div class="header-titulo-aba">
        <div class="titulo-nivel">
            <h2>⚒️ Forja</h2>
        </div>
        <div class="info-nivel">
            <span class="badge-nivel">Nível {{ jogo.ferraria }}</span>
        </div>
    </div>
    <div class="abas-taverna">
    <button :class="{ ativo: abaAtual === 'fabricacao' }" @click="abaAtual = 'fabricacao'">FABRICAÇÃO</button>
    
    <button 
        :class="{ 'ativo': abaAtual === 'aprimoramento', 'bloqueado': !ferreiroAtivo }" 
        @click="abaAtual = 'aprimoramento'"
        :disabled="!ferreiroAtivo"
        :title="!ferreiroAtivo ? 'Requer um Ferreiro contratado (O Ajudante não sabe aprimorar itens)' : ''">
        APRIMORAMENTO <span v-if="!ferreiroAtivo" style="margin-left:5px; font-size: 0.9em;">🔒</span>
    </button>
    
</div>
    <div v-if="abaAtual === 'fabricacao'">
    <div class="painel-controle-ferraria">
        
        <div v-if="ferreiroAtivo" class="card-funcionario ferreiro-ativo" :style="{ borderColor: corTier(ferreiroAtivo.tier) }">
                
                <div class="card-topo" :style="{ backgroundColor: corTier(ferreiroAtivo.tier) }">
                    <div class="topo-esquerda">
                        <span class="tier-badge">{{ ferreiroAtivo.tier }}</span>
                        <span class="card-nome">{{ ferreiroAtivo.nome }}</span>
                    </div>
                    
                    <div class="molde-icone-prof">
                        <img src="/assets/ui/i_ferreiro.png" class="img-prof-inner" title="Ferreiro">
                    </div>
                </div>

                <div class="card-mid">
                    <div class="avatar-box">
                         <img :src="`/assets/faces/${ferreiroAtivo.raca}/${ferreiroAtivo.imagem}.png`" class="avatar-func">
                    </div>

                    <div class="tabela-dados-func">
                        <div class="linha-dado">
                            <span class="dado-label">Profissão:</span>
                            <span class="dado-valor">Ferreiro</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Raça:</span>
                            <span class="dado-valor capitalize">{{ ferreiroAtivo.raca }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Sexo:</span>
                            <span class="dado-valor">{{ ferreiroAtivo.sexo === 'masculino' ? 'Masculino' : 'Feminino' }}</span>
</div>
                        <div class="linha-dado">
                            <span class="dado-label">Salário:</span>
                            <span class="dado-valor">
                                {{ formatarNumero(ferreiroAtivo.salario) }} 
                                <img src="/assets/ui/icone_goldC.png" class="tiny-coin">
                            </span>
                        </div>
                    </div>
                </div>

                <div class="rodape-card">
                    <div class="info-produtividade">
                        Maestria da forja +<span class="verde">{{ statsFerreiro.tempo }}%</span>
                    </div>
                    <div class="frase-efeito">
                        "{{ ferreiroAtivo.frase || 'Pronto para forjar!' }}"
                    </div>
                </div>
            </div>
            <div v-else class="card-funcionario ferreiro-ativo" style="border-color: #95a5a6; opacity: 0.9;">
                
                <div class="card-topo" style="background-color: #95a5a6;">
                    <div class="topo-esquerda">
                        <span class="tier-badge" style="background: rgba(0,0,0,0.2)">-</span>
                        <span class="card-nome">Aprendiz da Vila</span>
                    </div>
                    
                    <div class="molde-icone-prof">
                        <img src="/assets/ui/i_ferreiro.png" class="img-prof-inner" title="Ferreiro Interino" style="filter: grayscale(1);">
                    </div>
                </div>

                <div class="card-mid">
                    <div class="avatar-box">
                         <img src="/assets/faces/humano/ferreiro_m.png" class="avatar-func" style="filter: sepia(0.4);">
                    </div>

                    <div class="tabela-dados-func" style="justify-content: flex-start; align-self: flex-start; margin-top: 5px;">
                        <div class="linha-dado">
                            <span class="dado-label">Profissão:</span>
                            <span class="dado-valor">Ajudante</span>
                        </div>
                        </div>
                </div>

                <div class="rodape-card">
                    <div class="frase-efeito">
                        "Segurando as pontas até o mestre chegar..."
                    </div>
                </div>
            </div>
            

        <div class="linha-divisoria"></div>

        <div class="lado-direito-filtros">
            <div class="botoes-categoria-wrapper">
    <button 
        class="btn-cat" 
        :class="{ 'ativo': filtroCategoria === 'aventureiro' }"
        @click="filtroCategoria = 'aventureiro'">
        Aventureiros
    </button>
    <button 
        class="btn-cat" 
        :class="{ 'ativo': filtroCategoria === 'heroi', 'bloqueado': !ferreiroAtivo }"
        :disabled="!ferreiroAtivo"
        :title="!ferreiroAtivo ? 'Requer um Ferreiro contratado (O Ajudante não sabe forjar itens de Herói)' : ''"
        @click="filtroCategoria = 'heroi'">
        Heróis <span v-if="!ferreiroAtivo" style="margin-left:5px; font-size: 0.9em;">🔒</span>
    </button>
</div>
            
            <fieldset class="input-rpg">
                <legend>Tipo de Item</legend>
                <select v-model="filtroTipo">
                    <option value="todos">Todos</option>
                    <option value="arma">⚔️ Armas</option>
                    <option value="armadura">🛡️ Armaduras</option>
                    <option value="municao">🏹 Munição</option>
                </select>
            </fieldset>

            <fieldset class="input-rpg">
                <legend>Atributo Principal</legend>
                <select v-model="filtroStat">
                    <option value="todos">Qualquer</option>
                    <option value="ataque">Ataque</option>
                    <option value="defesa">Defesa</option>
                    <option value="agilidade">Agilidade</option>
                    <option value="precisao">Precisão</option>
                </select>
            </fieldset>

            <fieldset class="input-rpg">
                <legend>Nível do Item</legend>
                <select v-model="filtroNivel">
                    <option value="todos">Todos</option>
                    <option value="5">Nível 5+</option>
                    <option value="10">Nível 10+</option>
                    <option value="15">Nível 15+</option>
                    <option value="20">Nível 20+</option>
                </select>
            </fieldset>
        </div>
    </div>
    <div class="fila-quadrados-container">
        
        <div v-if="slotFocado !== null" class="mobile-overlay-backdrop" @click="fecharTooltip"></div>

        <div v-if="slotFocado !== null && jogo.craftando[slotFocado]" class="tooltip-progresso" @click.stop>
            
            <button class="btn-fechar-absoluto" @click.stop="fecharTooltip">✖</button>

            <div class="tooltip-seta" :style="{ left: (slotFocado === 0 ? '16%' : (slotFocado === 1 ? '50%' : '84%')) }"></div>

            <div class="tooltip-header">
                <span>{{ (dadosItens.find(i => i.id === jogo.craftando[slotFocado].item) || {}).nome }}</span>
                <small>{{ formatarTempoFila(jogo.craftando[slotFocado].tempoRestante) }}</small>
            </div>
            
            <div class="barra-fundo-tooltip">
                <div class="barra-fill-tooltip" 
                     :style="{ width: (100 - (jogo.craftando[slotFocado].tempoRestante / jogo.craftando[slotFocado].tempoTotal * 100)) + '%' }">
                </div>
            </div>

            <div class="tooltip-acoes">
                <button class="btn-tooltip cancelar" 
                        @click.stop="acoes.cancelarCraft(slotFocado); fecharTooltip()">
                    Cancelar
                </button>
                
                <button class="btn-tooltip acelerar" 
                        @click.stop="acoes.acelerarCraft(slotFocado); fecharTooltip()">
                    Acelerar
                </button>
            </div>
        </div>


        <div v-for="index in 3" :key="index" class="slot-wrapper-quadrado">
            
            <div v-if="jogo.craftando[index - 1]" 
                 class="quadrado-slot item-ativo"
                 @click.stop="toggleSlot(index - 1)">
                
                <img :src="(dadosItens.find(i => i.id === jogo.craftando[index - 1].item) || {}).img" class="img-slot-pulsante">
            </div>

            <div v-else-if="(index - 1) === 0 || ((index - 1) === 1 && jogo.ferraria >= 3) || ((index - 1) === 2 && jogo.ferraria >= 7)" 
                 class="quadrado-slot vazio"
                 @click="fecharTooltip"> <span class="icone-inativo">⚒️</span>
            </div>

            <div v-else class="quadrado-slot bloqueado" @click="fecharTooltip">
                <span class="icone-inativo">🔒</span>
            </div>

        </div>
    </div>
    <div class="lista-receitas-container">
        
        <div class="header-lista"></div>

        <div v-for="item in itensFiltrados" 
                 :key="item.id" 
                 class="card-light-fixed"
                 :class="{ 'indisponivel': getMaxCraft(item) === 0 }">
                
                <div class="box-img-light">
                    <img :src="item.img" class="img-light-fixa">
                    <div class="nivel-tag">Nv. {{ item.nivelItem || 1 }}</div>
                </div>

                <div class="miolo-light">
                    <div class="header-light">
                        <span class="nome-item-light">{{ item.nome }}</span>
                        <span class="tipo-tag-light">{{ item.tipo }}</span>
                    </div>

                    <div class="container-stats-split">
                        
                        <div class="stats-esquerda">
                            <template v-for="(valor, nomeStat, index) in item.stats" :key="nomeStat">
                                <div v-if="index < 6" class="linha-stat-light">
                                    <template v-if="mapaAtributos[nomeStat]">
                                        <img :src="`/assets/ui/${mapaAtributos[nomeStat].img}`" class="icone-stat-visivel">
                                        <span class="stat-label-light">{{ mapaAtributos[nomeStat].nome }}:</span>
                                        <span class="stat-valor-light">{{ valor }}</span>
                                    </template>
                                </div>
                            </template>
                        </div>

                        <div class="stats-direita">
                            <template v-for="(valor, nomeStat, index) in item.stats" :key="nomeStat">
                                <div v-if="index >= 6" class="linha-stat-light">
                                    <template v-if="mapaAtributos[nomeStat]">
                                        <img :src="`/assets/ui/${mapaAtributos[nomeStat].img}`" class="icone-stat-visivel">
                                        <span class="stat-label-light">{{ mapaAtributos[nomeStat].nome }}:</span>
                                        <span class="stat-valor-light">{{ valor }}</span>
                                    </template>
                                </div>
                            </template>
                        </div>

                    </div>
                    
                    <div v-if="!item.stats" class="desc-light">Sem atributos especiais.</div>
                </div>

                <div class="coluna-botao-light">
                    <button class="btn-forjar-light" @click="abrirForja(item)">
                        FORJAR
                    </button>
                </div>

            </div>

        <div v-if="itemSelecionado" class="modal-overlay" @click.self="fecharForja">
            <div class="modal-content-forja">
                
                <button class="btn-fechar-modal" @click="fecharForja">✖</button>

                <h3 class="modal-titulo">{{ itemSelecionado.nome }}</h3>

                <div class="modal-img-area">
                    <img :src="itemSelecionado.img" class="modal-icon-big">
                    <span class="modal-badge-tipo">{{ itemSelecionado.tipo || 'Item' }}</span>
                </div>

                <div class="modal-stats-area">
                    <template v-if="itemSelecionado.stats">
                        <template v-for="(valor, nomeStat) in itemSelecionado.stats" :key="nomeStat">
                            <div class="modal-stat-row" v-if="mapaAtributos[nomeStat]">
                                <div class="stat-left">
                                    <img :src="`/assets/ui/${mapaAtributos[nomeStat].img}`">
                                    <span>{{ mapaAtributos[nomeStat].nome }}</span>
                                </div>
                                <span class="stat-right">{{ valor }}</span>
                            </div>
                        </template>
                    </template>
                    <div v-else class="modal-desc-text">
                        {{ itemSelecionado.desc }}
                    </div>
                </div>

                <div class="modal-recursos-box">
                    <div class="label-section">RECURSOS NECESSÁRIOS:</div>
                    <div class="modal-lista-custos">
                        <div v-for="(custoBase, recurso) in itemSelecionado.custo" :key="recurso" 
                            class="modal-pill-custo"
                            :class="{ 'falta': (jogo.minerios[recurso]||jogo[recurso]||0) < (custoBase * qtdModal) }">
                            
                            <img :src="`/assets/recursos/min_${recurso}.png`" 
                                @error="$event.target.src = '/assets/recursos/res_' + recurso + '.png'"
                                class="icon-custo-modal">
                            
                            <div class="custo-texto">
                                <span class="custo-nome">{{ recurso }}</span>
                                <span class="custo-val">
                                    {{ (custoBase * qtdModal).toLocaleString('pt-BR') }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-controles-box">
                    <div class="modal-timer">
                        ⏳ {{ getTempoCraft(itemSelecionado, qtdModal) }}
                    </div>

                    
                    <div class="modal-input-group">
                        <button class="btn-max" @click="qtdModal = Math.max(1, getMaxCraft(itemSelecionado))" title="Máximo possível">MAX</button>
                        <button @click="qtdModal > 1 ? qtdModal-- : null">-</button>
                        
                        <input 
                            type="number" 
                            :value="qtdModal" 
                            @input="(e) => validarInputModal(e, itemSelecionado)"
                            @focus="$event.target.select()" 
                            min="1"
                        >
                        
                        <button @click="qtdModal < getMaxCraft(itemSelecionado) ? qtdModal++ : null">+</button>
                    </div>
                </div>

                <button class="btn-forjar-final"
                        :disabled="jogo.craftando.length >= (jogo.ferraria >= 7 ? 3 : (jogo.ferraria >= 3 ? 2 : 1)) || qtdModal < 1 || qtdModal > getMaxCraft(itemSelecionado)"
                        @click="fabricarItemDaLista(itemSelecionado); fecharForja()">
                    🔨 FORJAR AGORA
                </button>

            </div>
        </div>
    </div>
    <!-- Tooltip -->
    <div v-if="tooltipData.visivel" 
          id="tooltip-flutuante"
          class="tooltip-custom"
          :style="{ top: tooltipData.y + 'px', left: tooltipData.x + 'px' }">
        {{ tooltipData.texto }}
    </div>
    </div>
    <div v-if="abaAtual === 'aprimoramento'">
        <div class="painel-controle-ferraria">
            
            <div v-if="ferreiroAtivo" class="card-funcionario ferreiro-ativo" :style="{ borderColor: corTier(ferreiroAtivo.tier) }">
                
                <div class="card-topo" :style="{ backgroundColor: corTier(ferreiroAtivo.tier) }">
                    <div class="topo-esquerda">
                        <span class="tier-badge">{{ ferreiroAtivo.tier }}</span>
                        <span class="card-nome">{{ ferreiroAtivo.nome }}</span>
                    </div>
                    
                    <div class="molde-icone-prof">
                        <img src="/assets/ui/i_ferreiro.png" class="img-prof-inner" title="Ferreiro">
                    </div>
                </div>

                <div class="card-mid">
                    <div class="avatar-box">
                         <img :src="`/assets/faces/${ferreiroAtivo.raca}/${ferreiroAtivo.imagem}.png`" class="avatar-func">
                    </div>

                    <div class="tabela-dados-func">
                        <div class="linha-dado">
                            <span class="dado-label">Profissão:</span>
                            <span class="dado-valor">Ferreiro</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Raça:</span>
                            <span class="dado-valor capitalize">{{ ferreiroAtivo.raca }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Sexo:</span>
                            <span class="dado-valor">{{ ferreiroAtivo.sexo === 'masculino' ? 'Masculino' : 'Feminino' }}</span>
</div>
                        <div class="linha-dado">
                            <span class="dado-label">Salário:</span>
                            <span class="dado-valor">
                                {{ formatarNumero(ferreiroAtivo.salario) }} 
                                <img src="/assets/ui/icone_goldC.png" class="tiny-coin">
                            </span>
                        </div>
                    </div>
                </div>

                <div class="rodape-card">
                    <div class="info-produtividade">
                        Maestria da forja +<span class="verde">{{ statsFerreiro.tempo }}%</span>
                    </div>
                    <div class="frase-efeito">
                        "{{ ferreiroAtivo.frase || 'Pronto para forjar!' }}"
                    </div>
                </div>
            </div>
            <div v-else class="card-funcionario vazio-ferreiro-card">
                 <div class="card-topo vazio-topo"><span class="card-nome">Sem Ferreiro</span></div>
                  <div class="card-mid"><span style="padding:20px;">Aprimoramento Bloqueado</span></div>
            </div>


            <div class="linha-divisoria"></div>

            <div class="lado-direito-aprimoramento">
                
                <h4 class="titulo-bancada">✨ Bancada Rúnica</h4>

                <div class="slots-bancada-wrapper">
                    
                    <div class="slot-group">
                        <div class="slot-aprimoramento" 
                             :class="{ 'vazio': !itemParaAprimorar }"
                             @click="modalSelecaoAberto = 'item'">
                            
                            <img v-if="itemParaAprimorar" :src="(dadosItens.find(i=>i.id===itemParaAprimorar.id)||{}).img" class="img-slot-grande">
                            <span v-else class="placeholder-slot">⚔️</span>
                            
                            <div v-if="itemParaAprimorar" class="tag-nivel-slot">+{{ itemParaAprimorar.nivel }}</div>
                        </div>
                        <span class="label-slot">Item</span>
                    </div>

                    <div class="seta-bancada">➡</div>

                    <div class="slot-group">
                        <div class="slot-aprimoramento" 
                             :class="{ 'vazio': !pedraSelecionada, 'pedra': pedraSelecionada }"
                             @click="modalSelecaoAberto = 'pedra'">
                            
                            <div v-if="pedraSelecionada" class="pedra-visual">💎</div>
                            <span v-else class="placeholder-slot">💠</span>
                        </div>
                        <span class="label-slot">Pedra</span>
                    </div>

                </div>

                <div class="painel-info-aprimoramento">
                    
                    <div class="controle-po" v-if="pedraSelecionada && pedraSelecionada.min !== undefined">
                        <span class="po-label">Pó Mágico:</span>
                        <input type="range" v-model.number="qtdPoUsado" min="0" max="10" class="slider-po">
                        <span class="po-valor">+{{ qtdPoUsado }}%</span>
                    </div>

                    <button class="btn-aprimorar" 
                            :disabled="!itemParaAprimorar || !pedraSelecionada || !ferreiroAtivo"
                            @click="realizarAprimoramento">
                        
                        <div class="btn-content">
                            <span>APRIMORAR</span>
                            <span class="chance-tag" :class="{'alta': chanceSucessoAtual > 70, 'baixa': chanceSucessoAtual < 40}">
                                {{ chanceSucessoAtual.toFixed(0) }}% Chance
                            </span>
                        </div>
                    </button>
                    
                    <div class="aviso-risco" v-if="itemParaAprimorar && itemParaAprimorar.falhasNivel > 0">
                        ⚠️ Atenção: Item com {{ itemParaAprimorar.falhasNivel }}/5 falhas.
                    </div>

                </div>

            </div>
        </div>

        <div v-if="modalSelecaoAberto" class="modal-overlay" @click.self="modalSelecaoAberto = null">
            <div class="modal-content-forja">
                <div class="alert-header">
                    <h3>Selecione {{ modalSelecaoAberto === 'item' ? 'o Equipamento' : 'a Pedra' }}</h3>
                    <button @click="modalSelecaoAberto = null">✖</button>
                </div>
                
                <div class="lista-receitas-scroll">
                    
                    <template v-if="modalSelecaoAberto === 'item'">
                        <div v-for="item in inventarioInstancias" :key="item.uid" 
                             class="card-light-fixed" @click="itemParaAprimorar = item; modalSelecaoAberto = null">
                            <div class="box-img-light">
                                <img :src="(dadosItens.find(i=>i.id===item.id)||{}).img" class="img-light-fixa">
                                <div class="nivel-tag">+{{ item.nivel }}</div>
                            </div>
                            <div class="miolo-light">
                                <span class="nome-item-light">{{ item.nome }}</span>
                                <small>Falhas: {{ item.falhasNivel }}/5</small>
                            </div>
                        </div>
                    </template>

                    <template v-else>
                        <div v-for="pedra in minhasPedras" :key="pedra.id" 
                             class="card-light-fixed" style="height: 80px;" 
                             @click="pedraSelecionada = pedra; modalSelecaoAberto = null">
                            <div class="box-img-light" style="width: 80px;">
                                <div style="font-size: 2em;">💎</div>
                            </div>
                            <div class="miolo-light">
                                <span class="nome-item-light">{{ pedra.nome }}</span>
                                <small v-if="pedra.min !== undefined">Nível: +{{ pedra.min }} a +{{ pedra.max }}</small>
                                <small v-else>Stat: {{ pedra.tipoStat }} (+{{ pedra.valor }})</small>
                            </div>
                        </div>
                    </template>

                </div>
            </div>
        </div>
    </div>
    <button v-if="mostrarBotaoTopo"
        class="btn-scroll-topo"
        @click="voltarAoTopo"
        title="Voltar ao Topo">
    ▲
</button>

</div> 
<div v-if="modalRelatorioInterrupcao" class="modal-overlay" style="z-index: 9999;">
        <div class="modal-content-alert">
            
            <div class="alert-header">
                <div class="alert-icon">⚠️</div>
                <h3>Produção Interrompida</h3>
            </div>
            
            <p class="alert-msg">
                O Ferreiro deixou a forja! Os itens complexos não podem ser concluídos pelo Ajudante.
            </p>

            <div class="lista-cancelados-scroll">
                <div v-for="(relatorio, idx) in modalRelatorioInterrupcao" :key="idx" class="card-cancelamento">
                    
                    <div class="cancel-left">
                        <img :src="relatorio.img" class="img-cancelado">
                    </div>

                    <div class="cancel-right">
                        <span class="nome-cancelado">{{ relatorio.nome }}</span>
                        
                        <div class="stats-cancel">
                            <div class="stat-box success" v-if="relatorio.feitos > 0">
                                <span class="lbl">Entregues</span>
                                <span class="val">✅ {{ relatorio.feitos }}</span>
                            </div>
                            <div class="stat-box error">
                                <span class="lbl">Cancelados</span>
                                <span class="val">🚫 {{ relatorio.cancelados }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="alert-footer">
                <small>Recursos dos itens cancelados foram devolvidos (Multa de 10% aplicada).</small>
                <button class="btn-alert-ok" @click="modalRelatorioInterrupcao = null">Entendi</button>
            </div>

        </div>
    </div>
</template>

<style scoped>
@import '../css/importantes.css';
.abas-taverna button.bloqueado {
    opacity: 0.6;
    cursor: not-allowed;
    background: #95a5a6; /* Cinza Concreto */
    color: #ecf0f1;
    border-color: #7f8c8d;
    box-shadow: none;
}

/* Garante que não mude de cor ao passar o mouse se estiver bloqueado */
.abas-taverna button.bloqueado:hover {
    background: #95a5a6;
    transform: none;
    color: #ecf0f1;
}

/* --- PAINEL DE CONTROLE (Topo) --- */
.painel-controle-ferraria {
    display: flex; align-items: center; justify-content: space-between;
    background: #ecf0f1; border: 1px solid #bdc3c7; border-radius: 8px;
    margin: 15px 0; padding: 10px; gap: 15px; height: 180px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.ferreiro-ativo .card-mid { flex: 1; display: flex; align-items: center; padding: 5px 5px 5px 15px; background: #fff; }
.linha-divisoria { width: 2px; height: 70%; background: #bdc3c7; opacity: 0.6; }
/* Lista Container */
.lista-receitas-container {
    background: #ecf0f1; border: 1px solid #bdc3c7; border-radius: 8px;
    display: flex; flex-direction: column; height: 80%;
}
.header-lista { display: none; }
.lista-receitas-scroll { 
    overflow-y: auto; 
    flex: 1; 
    padding: 10px; 
    background: #e3e6ea;
    
    /* --- MÁGICA DAS 2 COLUNAS --- */
    display: grid;
    grid-template-columns: 1fr 1fr; /* Cria 2 colunas de tamanho igual */
    gap: 15px; /* Espaço entre os itens (lado e baixo) */
    align-content: start; /* Garante que os itens fiquem no topo */
}
/* ==================================================
   2. ESTILO DO MODAL (Janela Flutuante)
   ================================================== */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    display: flex; justify-content: center; align-items: center;
    padding: 20px;
}

.modal-content-forja {
    background: #fff;
    /* Mude width para 95% para deixar uma margem de segurança nas laterais */
    width: 95%; 
    max-width: 400px;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    display: flex; 
    flex-direction: column; 
    gap: 15px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    animation: modalPop 0.3s ease-out;
    max-height: 90vh; 
    overflow-y: auto;
    
    /* IMPORTANTE: Garante que o padding não estoure a largura */
    box-sizing: border-box; 
    margin: auto; /* Centraliza se usar flex no pai */
}
@media(max-width: 480px) {
    /* 1. Remove o padding do fundo escuro no celular para não atrapalhar o cálculo */
    .modal-overlay {
        /* Garante que o container ocupe a tela toda */
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75);
        z-index: 20000;
        backdrop-filter: blur(3px);
        
        /* O SEGREDO DO CENTRO: Flexbox */
        display: flex !important;
        align-items: center !important;     /* Centro Vertical */
        justify-content: center !important; /* Centro Horizontal */
        padding: 0 !important;              /* Remove padding para não atrapalhar */
    }

    /* 2. Força o modal a ficar centralizado e com tamanho correto */
    .modal-content-forja {
        /* Tamanho */
        width: 85% !important;        /* Deixa uma margem de respiro nas laterais */
        max-width: 380px !important;  /* Não deixa ficar gigante em tablets */
        max-height: 85vh !important;  /* Altura máxima segura */
        
        /* Posição: Removemos 'margin: auto' e deixamos o Flexbox (pai) centralizar */
        margin: 0 !important; 
        
        /* Reset de posições absolutas que possam estar atrapalhando */
        position: relative !important;
        top: auto !important; left: auto !important; 
        right: auto !important; bottom: auto !important;
        transform: none !important;

        /* Visual */
        border-radius: 12px !important;
        padding: 15px !important;
        box-sizing: border-box !important;
    }

    /* 3. Ajustes internos para o conteúdo caber bem */
    .modal-controles-box {
        flex-direction: column;
        gap: 10px;
        text-align: center;
    }

    .modal-input-group {
        justify-content: center; /* Centraliza o contador de +/- */
    }
    .lista-receitas-scroll {
        grid-template-columns: 1fr !important; /* 1 Coluna no celular */
    }
}

@keyframes modalPop {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.btn-fechar-modal {
    position: absolute; top: 10px; right: 10px;
    background: transparent; border: none; font-size: 1.5em; color: #95a5a6; cursor: pointer;
}

.modal-titulo {
    text-align: center; color: #e67e22; text-transform: uppercase; margin: 0;
    border-bottom: 2px solid #ecf0f1; padding-bottom: 10px;
}

.modal-img-area {
    position: relative;
    display: flex; justify-content: center; background: #ecf0f1;
    border-radius: 8px; padding: 15px; border: 1px solid #bdc3c7;
    margin-bottom: 10px;
    background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('/assets/ui/bg_ferraria_dark_long.png') !important;

    background-size: 100% 100% !important;

    background-position: center !important;

    background-repeat: no-repeat !important;
}
.modal-badge-tipo {
    position: absolute; top: 5px; right: 18px; top: 10px;
    background: rgba(0,0,0,0.1); font-size: 0.7em; padding: 2px 6px; border-radius: 4px;
    color: #7f8c8d; text-transform: uppercase; font-weight: bold;
}
.modal-stats-area {
    background: #fff;
    border: 1px solid #bdc3c7;
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 10px;
    display: flex; flex-direction: column; gap: 4px;
}
.modal-stat-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.9em;
}
.modal-stat-row:nth-child(odd) { background: #f8f9fa; }
.stat-left { display: flex; align-items: center; gap: 8px; color: #555; }
.stat-left img { width: 16px; height: 16px; opacity: 0.8; }
.stat-right { font-weight: bold; color: #2c3e50; }

.modal-desc-text {
    font-style: italic; color: #7f8c8d; text-align: center; padding: 10px; font-size: 0.9em;
}
.modal-icon-big { width: 80px; height: 80px; object-fit: contain; }

.modal-recursos-box {
    background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 10px;
}
.label-section { font-size: 0.75em; font-weight: bold; color: #7f8c8d; margin-bottom: 8px; }

.modal-lista-custos {
    display: flex; flex-direction: column; gap: 8px;
}
.modal-pill-custo {
    display: flex; align-items: center; gap: 10px;
    background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #dee2e6;
}
.modal-pill-custo.falta { border-color: #e74c3c; background: #fadbd8; }

.icon-custo-modal { width: 24px; height: 24px; }
.custo-texto { display: flex; justify-content: space-between; flex: 1; font-size: 0.9em; font-weight: bold; color: #2c3e50; }
.custo-nome { text-transform: capitalize; }

.modal-controles-box {
    display: flex; justify-content: space-between; align-items: center;
    background: #ecf0f1; padding: 10px; border-radius: 8px;
}
.modal-timer { font-weight: bold; color: #7f8c8d; }

.modal-input-group {
    display: flex; background: #fff; border-radius: 6px; border: 1px solid #bdc3c7;
}
.modal-input-group button { width: 35px; height: 35px; border: none; background: transparent; font-weight: bold; cursor: pointer; }
.modal-input-group input {
    width: 70px; /* Aumentei de 50px para caber números maiores (ex: 1000) */
    text-align: center;
    border: none;
    font-weight: bold;
    font-size: 1.1em; /* Texto um pouco maior */
    color: #2c3e50;
    background: #fff; /* Fundo branco para indicar que pode escrever */
    outline: none;
    
    /* Remove as setinhas padrão chatas do input number */
    appearance: textfield;
    -webkit-appearance: textfield; /* Safari / Chrome antigos */
    -moz-appearance: textfield;     /* Firefox antigo */
}

/* Remove setinhas no Chrome/Safari/Edge */
.modal-input-group input::-webkit-outer-spin-button,
.modal-input-group input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

/* Efeito de foco para saber que está editando */
.modal-input-group input:focus {
    background: #e8f6f3; /* Um verde bem clarinho */
    color: #2c3e50;
}
.btn-forjar-final {
    width: 100%; padding: 15px;
    background: #27ae60; color: white; border: none; border-radius: 8px;
    font-size: 1.1em; font-weight: bold; letter-spacing: 1px; cursor: pointer;
    box-shadow: 0 4px 0 #219150; transition: transform 0.1s;
}
.btn-forjar-final:active { transform: translateY(4px); box-shadow: none; }
.btn-forjar-final:disabled { background: #bdc3c7; box-shadow: none; cursor: not-allowed; }

/* ==================================================
   RESPONSIVIDADE (MOBILE)
   ================================================== */
@media(max-width: 768px) {
    .painel-controle-ferraria { flex-direction: column; height: auto; }
    
    .capa-corpo { flex-direction: column; align-items: stretch; }
    .capa-img-box { width: 100%; height: 100px; display: flex; justify-content: center; }
    .capa-icon { width: auto; height: 100%; }
    
    .capa-stats { grid-template-columns: repeat(2, 1fr); }
    .lista-receitas-scroll {
        grid-template-columns: 1fr; /* No celular, volta para 1 coluna */
    }
}
/* --- ESTILO ATUALIZADO DO CARD DE FUNCIONÁRIO --- */
.icon-prof-topo {
    width: 20px; height: 20px;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}

/* Efeito Zebrado (Opcional, deixa mais legível) */
.linha-dado:nth-child(odd) { background-color: #ffffff; }
/* Container Principal do Card */
.ferreiro-ativo {
    width: 100%;
    max-width: 220px; /* Largura consideravelmente menor (Carta) */
    margin: 0 auto;   /* Centraliza no espaço disponível */
    background: #ffffff;
    border-width: 2px; border-style: solid;
    border-radius: 8px; overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

/* 1. O cabeçalho precisa ser relative para o ícone se alinhar a ele */
.card-topo {
    position: relative; /* IMPORTANTE: É a âncora do posicionamento */
    display: flex;
    align-items: center;
    padding: 1px 5px;
    padding-right: 35px; /* Garante que o texto do nome não fique embaixo do ícone */
    color: #fff; 
    font-weight: bold;
    height: 32px; /* Altura fixa para o cabeçalho não pular */
}

/* 2. A bolinha branca (Menor e Absoluta) */
.molde-icone-prof {
    position: absolute; /* Solta o elemento para mover livremente */
    top: 2px;           /* Cola no topo (ajuste se quiser mais p/ cima) */
    right: 6px;         /* Cola na direita */
    
    background-color: #ffffff;
    width: 24px;        /* Reduzi de 32px para 24px */
    height: 24px;
    border-radius: 50%;
    
    display: flex;
    align-items: center;
    justify-content: center;
    
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid rgba(255, 255, 255, 0.5);
    z-index: 10;
}

/* 3. O desenho dentro da bolinha (Ajustado para o novo tamanho) */
.img-prof-inner {
    width: 19px;  /* Reduzi para caber na bolinha menor */
    height: 19px;
    object-fit: contain;
}
.topo-esquerda { display: flex; align-items: center; gap: 6px; }
.tier-badge { background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
.icon-prof-topo { width: 22px; height: 22px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5)); }

/* Meio (Avatar + Tabela) */
.card-mid { flex: 1; display: flex; align-items: stretch; background: #fff; }

.avatar-box {
    width: 80px; /* AUMENTADO DE 75px PARA 100px */
    display: flex; align-items: center; justify-content: center;
    background: #f1f2f6; border-right: 1px solid #dfe4ea;
}
.avatar-func { 
    width: 90px;  /* AUMENTADO DE 65px PARA 90px */
    height: 90px; /* AUMENTADO DE 65px PARA 90px */
    border-radius: 4px; border: 1px solid #ced6e0; background: #fff; 
}

.tabela-dados-func { flex: 1; display: flex; flex-direction: column; font-size: 0.75em; }

.linha-dado {
    display: flex; justify-content: space-between; align-items: center;
    padding: 3px 6px; border-bottom: 1px solid #f1f2f6; color: #2f3542;
}
.linha-dado:nth-child(even) { background-color: #f8f9fa; }

.dado-label { color: #747d8c; font-weight: 600; }
.dado-valor { font-weight: bold; color: #2f3542; display: flex; align-items: center; gap: 3px; white-space: nowrap; }
.capitalize { text-transform: capitalize; }
.tiny-coin { width: 11px; height: 11px; }

/* Rodapé Novo */
.rodape-card {
    background: #fff;
    border-top: 1px solid #f1f2f6;
    padding: 6px 4px;
    text-align: center;
    display: flex; flex-direction: column; gap: 2px;
}
.info-produtividade {
    font-size: 0.75em; color: #2c3e50; font-weight: 600;
}
.verde { color: #27ae60; }

.frase-efeito {
    font-size: 0.7em; font-style: italic; color: #a4b0be;
}
/* --- ESTILO DO CARD VAZIO (SLOT) --- */

.vazio-ferreiro-card {
    width: 100%;
    max-width: 220px; /* Mesma largura do card ativo */
    margin: 0 auto;
    background: #f8f9fa; /* Fundo bem claro */
    border: 2px dashed #bdc3c7; /* Borda tracejada (padrão de slot vazio) */
    border-radius: 8px;
    overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: none; /* Sem sombra profunda para parecer "fundo" */
    height: 100%; /* Ocupa a mesma altura */
    min-height: 140px; /* Garante altura mínima visual */
}

/* Topo Desativado */
.vazio-topo {
    background-color: #95a5a6; /* Cinza Concreto */
    color: #ecf0f1;
}
.vazio-badge { background: rgba(0,0,0,0.1); }
.grayscale { filter: grayscale(100%) opacity(0.6); }

/* Avatar Vazio */
.vazio-avatar-box {
    width: 75px; 
    display: flex; align-items: center; justify-content: center;
    background: #ecf0f1;
    border-right: 1px dashed #bdc3c7;
}
.avatar-vazio {
    width: 40px; height: 40px;
    opacity: 0.3; /* Bem transparente */
    filter: grayscale(100%);
}

/* Dados/Mensagem Central */
.vazio-dados {
    display: flex; align-items: center; justify-content: center;
    padding: 10px;
    text-align: center;
}
.texto-central-vazio {
    display: flex; flex-direction: column; gap: 4px;
}
.titulo-vazio {
    font-weight: 800; color: #7f8c8d; text-transform: uppercase; font-size: 0.9em;
}
.subtitulo-vazio {
    font-size: 0.75em; color: #95a5a6;
}

/* Rodapé Vazio */
.vazio-rodape {
    background: #ecf0f1;
    border-top: 1px dashed #bdc3c7;
    color: #95a5a6;
}

/* NOVOS EXEMPLOS AQUI */
/* Container que segura os filtros */
.lado-direito-filtros { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    gap: 1px;  /* Espaçamento entre as caixas */
    padding: 5px; 
    justify-content: center; 
    align-items: center; /* CENTRALIZA TUDO HORIZONTALMENTE */
}

/* Título */
.titulo-filtros { 
    color: #d35400; 
    font-weight: bold; 
    border-bottom: 1px solid #ccc; 
    margin-bottom: 5px; 
    width: 90%; 
    text-align: center;
}

/* --- NOVO ESTILO: FIELDSET RPG --- */
.input-rpg {
    width: 220px;      /* Largura fixa para manter o padrão */
    border: 2px solid #bdc3c7;
    border-radius: 8px;
    padding: 0 10px;
    margin: 0;
    background: #fff;
    /* Reset do padding padrão do navegador */
    margin-inline-start: 0;
    margin-inline-end: 0;
    padding-block-start: 0;
    padding-block-end: 0;
    padding-bottom: 2px; /* Leve respiro embaixo */
    
    transition: border-color 0.2s;
}

.input-rpg:hover {
    border-color: #3498db; /* Muda a cor da borda ao passar o mouse */
}

.input-rpg legend {
    font-size: 0.70em;
    font-weight: 800;      /* Texto bem grosso */
    color: #2c3e50;         /* Cor Laranja do tema */
    padding: 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.input-rpg select {
    width: 100%;
    border: none;
    background: transparent;
    font-weight: 500;
    color: #2c3e50;
    padding: 5px 0;
    outline: none;
    cursor: pointer;
    font-size: 0.80em;
}
.btn-max {
    font-size: 0.7em !important; /* Letra menor */
    background: #b80000df !important; /* Laranja */
    color: #fff !important;
    width: auto !important; /* Largura automática */
    padding: 0 8px !important;
    margin-right: 5px;
    border-right: 1px solid #bdc3c7;
}



/* Container para organizar os 3 slots */

/* --- ESTILO FORJA FRIA (Idea Nova) --- */

/* A barra base (fina e discreta) */


/* Container que centraliza os 3 quadrados */
.fila-quadrados-container {
    display: flex;
    justify-content: center; /* Centraliza na Horizontal (Esquerda/Direita) */
    align-items: center;     /* Centraliza na Vertical (Cima/Baixo) - O CORRETOR DO PROBLEMA */
    gap: 40px; 
    margin-bottom: 20px; 
    padding-top: 2px;
    position: relative;
    min-height: 20px; /* Garante altura suficiente para alinhar */
}

/* O Quadrado Base */
.quadrado-slot {
    width: 60px;
    height: 60px;
    margin: 0; /* Adicione isso para garantir que não haja empurrões invisíveis */
    background: #ecf0f1;
    border: 2px solid #bdc3c7;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    position: relative;
    transition: transform 0.2s;
}

/* Ícones Cinza Apagado (Vazio e Bloqueado) */
.icone-inativo {
    font-size: 1.8em;
    filter: grayscale(100%);
    opacity: 0.3; /* Bem apagado como pediu */
}

/* --- ITEM ATIVO (CRAFTANDO) --- */
.quadrado-slot.item-ativo {
    background: linear-gradient(
    to bottom,
    #f8f9fa,
    #e9ecef
  );

  border: 2px solid #ccd1d6;

  box-shadow:
    0 3px 6px rgba(0,0,0,0.08),
    inset 0 1px 0 rgba(255,255,255,0.9);
}

.quadrado-slot.item-ativo:hover {
    transform: scale(1.05);
}

.img-slot-pulsante {
    width: 80%;
    height: 80%;
    object-fit: contain;
    /* Animação de Luz na Imagem */
}

/* --- TOOLTIP (O BALÃO QUE ABRE) --- */
.tooltip-progresso {
    position: absolute;
    bottom: 75px;
    left: 50%;
    transform: translateX(-50%);

    width: 210px;

    background: linear-gradient(
        to bottom,
        #f8f9fb,
        #eef2f6
    );

    color: #2c3e50;
    padding: 12px;

    border-radius: 14px;
    border: 1px solid #d5dde5;

    box-shadow:
        0 6px 16px rgba(0,0,0,0.12),
        inset 0 1px 0 rgba(255,255,255,0.8);

    z-index: 100;

    display: flex;
    flex-direction: column;
    gap: 8px;

    animation: slideUp 0.2s ease-out;
}

/* Setinha */
.tooltip-seta {
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);

    width: 0;
    height: 0;

    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 7px solid #eef2f6;
}

/* Header */
.tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    font-size: 0.78em;
    font-weight: 600;
    color: #2c3e50;
}

/* Barra */
.barra-fundo-tooltip {
    width: 100%;
    height: 7px;

    background: #dfe6ee;
    border-radius: 4px;
    overflow: hidden;
}

.barra-fill-tooltip {
    height: 100%;
    background: linear-gradient(
        to right,
        #f39c12,
        #ffb84d
    );

    border-radius: 4px;
    transition: width 1s linear;
}

/* Ações */
.tooltip-acoes {
    display: flex;
    gap: 6px;
    margin-top: 6px;
}

/* Botões */
.btn-tooltip {
    flex: 1;
    border: none;

    padding: 5px 6px;
    border-radius: 6px;

    font-size: 0.72em;
    font-weight: 600;

    cursor: pointer;

    background: #e9edf2;
    color: #2c3e50;

    box-shadow: inset 0 -2px 0 rgba(0,0,0,0.12);
}

.btn-tooltip.cancelar {
    background: #f2dede;
    color: #a94442;
}

.btn-tooltip.acelerar {
    background: #fde9c9;
    color: #9c5a00;
}


/* --- ANIMAÇÕES SUTIS --- */
@keyframes luzInterna {
    0% { filter: drop-shadow(0 0 0px rgba(230, 126, 34, 0)); opacity: 0.9; }
    50% { filter: drop-shadow(0 0 8px rgba(230, 126, 34, 0.6)); opacity: 1; }
    100% { filter: drop-shadow(0 0 0px rgba(230, 126, 34, 0)); opacity: 0.9; }
}

@keyframes bordaPulsante {
    0% { box-shadow: 0 0 0 rgba(230, 126, 34, 0); }
    50% { box-shadow: 0 0 10px rgba(230, 126, 34, 0.3); } /* Brilho laranja muito leve */
    100% { box-shadow: 0 0 0 rgba(230, 126, 34, 0); }
}

@keyframes slideUp {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}
/* Botão de Fechar (X) - Invisível no PC, Visível no Mobile */
.btn-fechar-absoluto {
    display: none; /* Escondido por padrão */
}
.mobile-overlay-backdrop {
    display: none; /* Escondido por padrão */
}

/* =========================================================
   AJUSTES PARA CELULAR (Mobile) - VERSÃO CORRIGIDA
   ========================================================= */
@media (max-width: 600px) {

    /* 1. Cortina Escura de Fundo */
    .mobile-overlay-backdrop {
        display: block;
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.8);
        z-index: 9998;
        backdrop-filter: blur(2px);
    }

    /* 2. A Janela Centralizada (COM FORÇA TOTAL) */
    .tooltip-progresso {
        /* Muda de Absolute (PC) para Fixed (Celular) */
        position: fixed !important; 
        
        /* Zera o posicionamento antigo do PC */
        margin: 0 !important;
        
        /* Força o Centro da Tela */
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        
        /* Tamanho e Visual */
        width: 80vw !important;
        max-width: 320px !important;
        background: #2c3e50;
        z-index: 9999;
        padding: 25px 20px;
        border: 2px solid #34495e;
        box-shadow: 0 0 30px rgba(0,0,0,0.8);
        
        /* Garante que os botões caibam */
        display: flex;
        flex-direction: column;
    }

    /* 3. Botão Fechar (X) - Fica Grande */
    .btn-fechar-absoluto {
        display: block;
        position: absolute;
        top: -15px;
        right: -10px;
        background: #c0392b;
        color: white;
        border: 3px solid #fff;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-weight: bold;
        font-size: 1.2em;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    }

    /* 4. Botões de Ação (Cancelar/Acelerar) */
    .tooltip-acoes {
        display: flex;
        flex-direction: column; /* Um embaixo do outro */
        gap: 12px;
        margin-top: 20px;
    }

    .btn-tooltip {
        padding: 15px; /* Botão Gordinho para o dedo */
        font-size: 1.1rem;
        width: 100%;
    }

    /* Esconde a setinha no mobile pois a janela flutua no meio */
    .tooltip-seta { display: none !important; }
    
    /* Aumenta letra do título */
    .tooltip-header { font-size: 1.3rem; margin-bottom: 15px; text-align: center; }
}
/* --- ESTILO V7: GRID 3 COLUNAS (COMPACTO) --- */
/* Ajuste do Container da Lista */
.lista-receitas-scroll {
    display: flex !important;
    flex-direction: column !important;
    gap: 15px !important;
    padding: 15px !important;
    background: #e3e6ea !important; 
    border: 1px solid #bdc3c7;
    border-radius: 8px;
}

/* O CARTÃO (Base) */
.card-light-fixed {
    display: flex;
    align-items: stretch;
    
    /* ALTURA: 150px é perfeito para 3 linhas de atributos (3x3 = 9 stats) */
    height: 150px; 
    
    background: #f7f9fa;
    border: 1px solid #b2bec3;
    border-radius: 8px;
    box-shadow: 0 3px 6px rgba(0,0,0,0.08);
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
}

.card-light-fixed:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    border-color: #7f8c8d;
}

.card-light-fixed.indisponivel {
    opacity: 0.6;
    filter: grayscale(1);
    background: #e0e0e0;
}

/* 1. CAIXA DE IMAGEM (Esquerda) */
.box-img-light {
    width: 115px;
    min-width: 115px;
    
    /* --- SUA IMAGEM DE VOLTA --- */
    /* Adicionei um leve escurecimento (rgba) por cima da imagem para garantir leitura */
    background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('/assets/ui/bg_ferraria_dark.png') !important;
    background-size: 100% 100% !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
    
    /* Fallback (cor de segurança se a imagem falhar) */
    background-color: #2d3436; 
    
    border-right: 1px solid #b2bec3;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.img-light-fixa {
    max-width: 85%;
    max-height: 85%;
    object-fit: contain;
    
    /* O SEGREDO DO CONTRASTE: */
    /* 1. Luz branca suave atrás (0 0 5px rgba...) */
    /* 2. Sombra escura forte para dar volume (0 4px 6px...) */
    filter: drop-shadow(0 0 4px rgba(255,255,255,0.2)) drop-shadow(0 4px 6px rgba(0,0,0,0.8));
    
    transition: transform 0.2s;
}

/* Efeito extra: Item cresce um pouquinho ao passar o mouse no card */
.card-light-fixed:hover .img-light-fixa {
    transform: scale(1.05) translateY(-2px);
}

.nivel-tag {
    position: absolute;
    bottom: 5px; right: 5px;
    background: #2d3436;
    color: #dfe6e9;
    font-size: 0.65em;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    box-shadow: 0 2px 2px rgba(0,0,0,0.2);
}

/* 2. MIOLO (Centro) */
.miolo-light {
    flex: 1;
    padding: 10px 15px;
    display: flex;
    flex-direction: column;
    overflow: hidden; 
}

.header-light {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
    border-bottom: 2px solid #dfe6e9;
    padding-bottom: 5px;
}

.nome-item-light {
    font-size: 1.05em;
    font-weight: 800;
    color: #2d3436;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tipo-tag-light {
    font-size: 0.65em;
    color: #636e72;
    font-weight: bold;
    text-transform: uppercase;
    background: #dfe6e9;
    padding: 3px 8px;
    border-radius: 12px;
}



.desc-light {
    font-size: 0.75em; color: #aaa; font-style: italic; margin-top: 10px;
}

/* 3. COLUNA DO BOTÃO (Direita) */
.coluna-botao-light {
    width: 100px;
    display: flex;
    flex-direction: column;
    background: #2d3436;
    border-left: 1px solid #636e72;
}

.btn-forjar-light {
    flex: 1;
    width: 100%;
    border: none;
    background: #2d3436;
    color: #ecf0f1;
    font-weight: 900;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85em;
    letter-spacing: 1px;
    display: flex; align-items: center; justify-content: center;
}

.btn-forjar-light:hover {
    background: #00b894;
    color: #fff;
}

.btn-forjar-light:active {
    background: #00cec9;
}
/* Container que segura os dois blocos */
.container-stats-split {
    display: flex;
    width: 100%;
    /* Removemos o gap do container para controlar espaçamento internamente */
    gap: 0; 
    overflow: hidden;
}

/* BLOCO 1: Esquerda (2 Colunas) - Onde ficam 1 a 6 */
.stats-esquerda {
    flex: 2; /* Ocupa 66% da largura */
    display: grid;
    grid-template-columns: 1fr 1fr; 
    grid-auto-rows: min-content; 
    
    /* Espaçamento interno para não colar na direita */
    padding-right: 10px; 
    gap: 0 10px; /* Espaço horizontal entre coluna 1 e 2 */
}

/* BLOCO 2: Direita (1 Coluna) - Onde ficam 7, 8, 9 */
.stats-direita {
    flex: 1; /* Ocupa 33% da largura */
    display: flex;
    flex-direction: column;
    
    /* REMOVIDO: border-left (a linha que separava) */
    /* Adicionado padding para alinhar visualmente como uma 3ª coluna */
    padding-left: 5px; 
}

/* Estilo das linhas individuais (Mantido Igual) */
.linha-stat-light {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75em;
    color: #2d3436;
    
    /* ALTURA FIXA: Crucial para o alinhamento 1-2-7 funcionar */
    height: 25px; 
    
    /* MUDANÇA AQUI: "dashed" para tracejado e "0.15" para ficar mais visível */
    border-bottom: 1px dashed rgba(0,0,0,0.15); 
    white-space: nowrap;
}

.icone-stat-visivel {
    width: 14px; height: 14px; object-fit: contain; opacity: 0.8;
}

.stat-label-light { 
    font-weight: 600; 
    color: #636e72; 
    overflow: hidden;
    text-overflow: ellipsis;
    /* Ajuste para caber bem na coluna */
    max-width: 75px; 
}

.stat-valor-light { 
    font-weight: 800; 
    color: #0984e3; 
    margin-left: auto; 
}

/* --- AJUSTES MOBILE --- */
@media(max-width: 600px) {
    .lista-receitas-scroll { gap: 25px !important; }

    .card-light-fixed { 
        height: auto; 
        flex-direction: column;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15); 
    }

    .box-img-light { width: 100%; height: 100px; border-right: none; border-bottom: 1px solid #b2bec3; 
    
    /* Adicionei um leve escurecimento (rgba) por cima da imagem para garantir leitura */
    background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('/assets/ui/bg_ferraria_dark_long.png') !important;
    background-size: 100% 100% !important;
    background-position: center !important; 
    background-repeat: no-repeat !important;
}
    
    .miolo-light { min-height: 100px; }

    .coluna-botao-light { 
        width: 100%; height: 55px; border-left: none; border-top: 1px solid #b2bec3;
        padding: 5px; background: #ecf0f1; 
    }

    .btn-forjar-light {
        border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); 
    }
    .container-stats-split { flex-direction: column; }
    .stats-esquerda { padding-right: 0; }
    .stats-direita { padding-left: 0; margin-top: 5px; border-top: 1px dashed #ccc; }
}
h4 { 
    margin: 0 0 5px 0; 
    font-size: 0.75em; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
    text-align: center; 
    width: 100%; 
}
.painel-aprimoramento {
    padding: 40px;
    text-align: center;
    background: #ecf0f1;
    border: 2px dashed #bdc3c7;
    border-radius: 8px;
    margin-top: 20px;
    color: #7f8c8d;
}
.aviso-em-breve h3 {
    color: #d35400;
    margin-bottom: 10px;
}
/* Container dos botões Aventureiro/Heroi */
.botoes-categoria-wrapper {
    display: flex;
    gap: 10px;
    margin-bottom: 15px; /* Espaço para os filtros de baixo */
    width: 80%;
    justify-content: center;
}

/* --- OPÇÃO 1: PLACA DE METAL (Rústico) --- */
.btn-cat {
    flex: 1;
    padding: 6px 4px;
    /* Degradê suave de branco para azul gelo */
    background: linear-gradient(to bottom, #ffffff, #eaf2f8);
    border: 1px solid #b1b6b9;
    border-radius: 20px; /* Bordas bem redondas (pílula) */
    color: #85929e;
    font-weight: 600;
    font-size: 0.75em;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cat:hover {
    background: #eaf2f8;
    color: #2e86c1;
}

.btn-cat.ativo {
    background: #3498db;
    border-color: #2980b9;
    color: white;
    /* Remove a redondeza ao ativar ou mantém? Vamos manter */
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); /* Parece "apertado" para dentro */
}
.btn-cat:disabled {
    cursor: not-allowed !important; /* O !important garante que o ponteiro mude */
    opacity: 0.5;
    background: #bdc3c7;
    border-color: #95a5a6;
    color: #7f8c8d;
    box-shadow: none;
}
/* --- ESTILO DO MODAL DE ALERTA --- */
.modal-content-alert {
    background: #fff;
    width: 90%;
    max-width: 380px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    animation: modalPop 0.3s ease-out;
    display: flex; flex-direction: column;
}

.alert-header {
    background: #e74c3c; /* Vermelho Alerta */
    color: white;
    padding: 15px;
    display: flex; align-items: center; gap: 10px;
}
.alert-icon { font-size: 1.5em; }
.alert-header h3 { margin: 0; font-size: 1.1em; text-transform: uppercase; letter-spacing: 0.5px; }

.alert-msg {
    padding: 15px 15px 5px 15px;
    color: #7f8c8d;
    font-size: 0.9em;
    text-align: center;
    line-height: 1.4;
}

/* Lista de Itens */
.lista-cancelados-scroll {
    padding: 10px 15px;
    max-height: 250px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 10px;
}

.card-cancelamento {
    display: flex;
    background: #fdfefe;
    border: 1px solid #ecf0f1;
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.img-cancelado {
    width: 50px; height: 50px;
    object-fit: contain;
    background: #ecf0f1;
    border-radius: 4px;
    border: 1px solid #bdc3c7;
}

.cancel-right {
    flex: 1; margin-left: 10px;
    display: flex; flex-direction: column; justify-content: center;
}

.nome-cancelado {
    font-weight: bold; color: #2c3e50; font-size: 0.9em; margin-bottom: 5px;
}

.stats-cancel { display: flex; gap: 10px; }

.stat-box {
    display: flex; flex-direction: column;
    font-size: 0.75em;
    background: #f4f6f7;
    padding: 3px 6px;
    border-radius: 4px;
}
.stat-box.success .val { color: #27ae60; font-weight: bold; font-size: 1.1em; }
.stat-box.error .val { color: #c0392b; font-weight: bold; font-size: 1.1em; }

.alert-footer {
    background: #f9f9f9;
    padding: 15px;
    text-align: center;
    border-top: 1px solid #ecf0f1;
}
.alert-footer small { display: block; color: #95a5a6; margin-bottom: 10px; font-size: 0.75em; }

.btn-alert-ok {
    background: #34495e;
    color: white;
    border: none;
    padding: 10px 30px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s;
}
.btn-alert-ok:hover { background: #2c3e50; }
/* --- ESTILOS DA BANCADA DE APRIMORAMENTO --- */

.lado-direito-aprimoramento {
    flex: 1;
    display: flex; flex-direction: column;
    padding: 10px;
    background: #fdfefe;
    border-radius: 8px;
    height: 100%;
    align-items: center;
}

.titulo-bancada {
    color: #8e44ad; /* Roxo Místico */
    text-transform: uppercase;
    border-bottom: 2px solid #ecf0f1;
    width: 100%; text-align: center;
    margin-bottom: 15px;
}

.slots-bancada-wrapper {
    display: flex; align-items: center; gap: 15px;
    margin-bottom: 20px;
}

.slot-group {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
}

.slot-aprimoramento {
    width: 80px; height: 80px;
    border: 2px dashed #bdc3c7;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    background: #ecf0f1;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
}

.slot-aprimoramento:hover {
    border-color: #8e44ad;
    background: #f4ecf7;
    transform: scale(1.05);
}

.slot-aprimoramento.vazio .placeholder-slot { font-size: 2em; opacity: 0.3; }

.img-slot-grande { width: 80%; height: 80%; object-fit: contain; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.2)); }

.tag-nivel-slot {
    position: absolute; bottom: -5px; right: -5px;
    background: #8e44ad; color: white;
    font-size: 0.8em; font-weight: bold;
    padding: 2px 6px; border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.seta-bancada { font-size: 1.5em; color: #bdc3c7; }

/* Controles de Baixo */
.painel-info-aprimoramento {
    width: 100%;
    display: flex; flex-direction: column; gap: 10px;
}

.controle-po {
    display: flex; align-items: center; gap: 10px;
    background: #f8f9fa; padding: 8px; border-radius: 6px;
}
.slider-po { flex: 1; cursor: pointer; }
.po-valor { font-weight: bold; color: #2980b9; }

.btn-aprimorar {
    width: 100%;
    background: linear-gradient(to right, #8e44ad, #9b59b6);
    color: white; border: none; padding: 12px;
    border-radius: 8px; cursor: pointer;
    transition: transform 0.1s;
    box-shadow: 0 4px 0 #71368a;
}
.btn-aprimorar:active { transform: translateY(4px); box-shadow: none; }
.btn-aprimorar:disabled { background: #bdc3c7; cursor: not-allowed; box-shadow: none; }

.btn-content { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }

.chance-tag {
    background: rgba(0,0,0,0.2);
    padding: 2px 8px; border-radius: 4px; font-size: 0.9em;
}
.chance-tag.alta { color: #2ecc71; background: rgba(46, 204, 113, 0.2); }
.chance-tag.baixa { color: #e74c3c; background: rgba(231, 76, 60, 0.2); }

.aviso-risco {
    font-size: 0.75em; color: #e67e22; text-align: center; font-weight: bold;
}

/* Ajuste no Modal para a lista de pedras */
.pedra-visual { font-size: 2.5em; animation: luzInterna 2s infinite; }
</style>