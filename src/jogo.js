import { reactive, computed } from 'vue';
import { tabelaMinerais, tabelaItens, tabelaCarcacas } from './dados.js';
import { gerarFuncionario, criarObjetoFuncionario, processarFusao, calcularChancesFusao, ORDEM_TIERS } from './funcionarios.js';

// --- DADOS DE ESTUDO BIBLIOTECA---
export const DADOS_ESTUDO = {
    'pergaminho_comum': { nome: 'Pergaminho Comum', xp: 10, tempo: 60, cor: '#f1c40f' }, // 60 seg
    'tabula_pedra':     { nome: 'Tábula de Pedra',  xp: 50, tempo: 300, cor: '#95a5a6' }, // 5 min
    'tomo_antigo':      { nome: 'Tomo Criptografado', xp: 200, tempo: 1200, cor: '#8e44ad' } // 20 min
};
// --- DADOS DE PROCESSAMENTO DE CARCAÇAS ---
export const DADOS_PROCESSAMENTO = {
    'carcaca_javali': { nome: 'Carcaça de Javali', carne: 50, couro: 10, tempo: 30 },
    'carcaca_lobo':   { nome: 'Carcaça de Lobo',   carne: 30, couro: 25, tempo: 45 },
    'carcaca_touro':  { nome: 'Carcaça de Touro',  carne: 120, couro: 40, tempo: 120 }
};
// --- CONFIGURAÇÃO DOS PRÉDIOS (NOVO) ---
// Aqui você define as regras de cada prédio em um lugar só.
// attrNivel: nome da variável dentro do 'jogo' que guarda o nível
// attrCusto: nome da variável dentro do 'jogo' que guarda o custo
// multiplicador: quanto o preço sobe a cada nível (1.5 = +50%)
// tempoBase: tempo em segundos para construir
// efeitos: coisas extras que acontecem ao terminar (como aumentar população)
const DADOS_CONSTRUCOES = {
    casa: { 
        attrNivel: 'casas', 
        attrCusto: 'custoCasa', 
        multiplicador: 1.3, 
        tempoBase: 10,
        efeitos: () => { jogo.populacaoMax += 2; } 
    },
    armazem: { 
        attrNivel: 'armazens', 
        attrCusto: 'custoArmazem', 
        multiplicador: 1.4, 
        tempoBase: 15 
    },
    prefeitura: { 
        attrNivel: 'prefeitura', 
        attrCusto: 'custoPrefeitura', 
        multiplicador: 2.5, 
        tempoBase: null, // Usa cálculo especial
        calcTempo: (nivel) => Math.min(Math.floor(20 + Math.pow(nivel, 2.2) * 20), 14400)
    },
    mina: { 
        attrNivel: 'mina', 
        attrCusto: 'custoMina', 
        multiplicador: 1.8, 
        tempoBase: null,
        calcTempo: (nivel) => Math.min(Math.floor(20 + Math.pow(nivel, 2.2) * 20), 14400)
    },
    ferraria: { 
        attrNivel: 'ferraria', 
        attrCusto: 'custoFerraria', 
        multiplicador: 1.5, // Adicionei um custo crescente que não tinha antes
        tempoBase: 60 
    },
    taverna: { 
        attrNivel: 'taverna', 
        attrCusto: 'custoTaverna', 
        multiplicador: 1.6, 
        tempoBase: 40 
    },
    biblioteca: { 
    attrNivel: 'biblioteca',      // Nome exato da variável no 'jogo'
    attrCusto: 'custoBiblioteca', // Nome exato do custo no 'jogo'
    multiplicador: 1.6, 
    tempoBase: 20 
    },
    camaraProcessamento: { 
        attrNivel: 'camaraProcessamento', 
        attrCusto: 'custoCamaraProcessamento', 
        multiplicador: 1.5, 
        tempoBase: 30 
    },
    enfermaria: { 
        attrNivel: 'enfermaria', 
        attrCusto: 'custoEnfermaria', 
        multiplicador: 1.5, 
        tempoBase: 30 
    },
};
export const ui = reactive({
    modal: { aberto: false, titulo: '', texto: '', tipo: 'confirmacao', onConfirm: null }
});

// --- VERSÃO LOCAL (SEM INTERNET) ---
async function obterDataInternet() {
    // Retorna a data do seu computador instantaneamente
    return new Date().toISOString().split('T')[0];
}

// --- FUNÇÃO DE RESET DIÁRIO (CORREÇÃO DO BUG) ---
async function verificarNovoDia() {
    const dataInternet = await obterDataInternet();
    if (!dataInternet) return; // Sem internet, mantém como está

    // Se a data mudou, reseta tudo
    if (jogo.ultimoDiaContratacao !== dataInternet) {
        jogo.ultimoDiaContratacao = dataInternet;
        jogo.contratacoesHoje = 0;
        jogo.contratacoesEliteHoje = 0;
        processarPagamentoSalarios(); // Cobra salários na virada
        // console.log("Dia virou! Contadores resetados.");
    }
}

export function pedirConfirmacao(titulo, texto, callbackAcao) {
    ui.modal.tipo = 'confirmacao'; ui.modal.titulo = titulo; ui.modal.texto = texto; ui.modal.onConfirm = callbackAcao; ui.modal.aberto = true;
}
export function mostrarAviso(titulo, texto, tipo = 'aviso') {
    ui.modal.tipo = tipo; ui.modal.titulo = titulo; ui.modal.texto = texto; ui.modal.onConfirm = null; ui.modal.aberto = true;
}

let loopId = null;
const calcularTempoConstrucao = (n) => Math.min(Math.floor(20 + Math.pow(n, 2.2) * 20), 14400);

const mineriosIniciais = {}; const trabalhoInicial = {}; const timersIniciais = {};
// Inicializa a alocação (slots vazios)
const alocacaoInicial = {};
const bancoInicial = {};
tabelaMinerais.forEach(m => { mineriosIniciais[m.id] = 0; trabalhoInicial[m.id] = 0; timersIniciais[m.id] = 0; });
const itensIniciais = {}; tabelaItens.forEach(i => itensIniciais[i.id] = 0);
tabelaCarcacas.forEach(i => itensIniciais[i.id] = 0);

// --- ESTADO DO JOGO ---
export const jogo = reactive({
    equipamentos: [],
    poMistico: 0,
    tempoOciosidadeFila: 0,
    madeira: 100, comida: 100, ouro: 500, ciencia: 0, couro: 0,
    funcionarios: [],

    // Controle Diário
    contratacoesHoje: 0,
    contratacoesEliteHoje: 0,
    ultimoDiaContratacao: null,
    
    
    armazens: 0, custoArmazem: { madeira: 150, pedra: 50 },
    alocacaoMina: { ...alocacaoInicial }, // Guarda IDs: { pedra: ['id_joao', null], ... }
    bancoMinerios: { ...bancoInicial },   // Guarda frações de minério (ex: 0.45)
    biblioteca: 0, custoBiblioteca: { madeira: 300, pedra: 150, ouro: 50 },    
    alocacaoBiblioteca: [null, null, null], // Slots de estudo na biblioteca
    camaraProcessamento: 0, custoCamaraProcessamento: { madeira: 1, pedra: 1, ouro: 1 }, // Custo inicial da camara de processamento
    alocacaoCamaraProcessamento: [null], // Slots de funcionarios na camara de processamento ( 1 slot por enquanto )
    processamento: Array(8).fill({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 }), // 8 slots de processamento de carcaças

    casas: 0, custoCasa: { madeira: 50, pedra: 10 },
    construindo: { tipo: null, tempoRestante: 0, tempoTotal: 0 },
    craftando: [], // Mudou de objeto {} para lista []
    desempregados: 0, lenhadores: 0, esfoladores: 0, academicos: 0, mineradores: 0, populacaoMax: 5,
    enfermaria: 0, custoEnfermaria: { madeira: 400, pedra: 200 },
    alocacaoEnfermaria: [null], // Slots de funcionarios na enfermaria ( 1 slot por enquanto )
    estudos: [
        { item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 }, // Slot 0 (Principal)
        { item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 }, // Slot 1 (Fila 1)
        { item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 },  // Slot 2 (Fila 2)
        { item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 }   // Slot 3 (Fila 3)
    ],
    ferraria: 0, custoFerraria: { madeira: 500, pedra: 200 },
    itens: { ...itensIniciais,
        pergaminho_comum: 5, 
        tabula_pedra: 2,
        tomo_antigo: 1 
    },
    mina: 0, custoMina: { madeira: 200, comida: 100 },    
    minerios: { pedra: 20, cobre: 0, ferro: 0, prata: 0, ouro_min: 0, obsidiana: 0, titanio: 0, diamante: 0, mithril: 0, aetherium: 0 },
    prefeitura: 1, custoPrefeitura: { madeira: 100, pedra: 100, comida: 50 },
    taverna: 0, custoTaverna: { madeira: 200, pedra: 100 },
    ultimaAtualizacao: Date.now(),
    listaTechs: [
        { id: 'machado_ferro', nome: 'Machados de Ferro', desc: 'Lenhadores +50%', custo: { ciencia: 50 }, feito: false },
        { id: 'silos', nome: 'Silos', desc: 'Armazéns +50%', custo: { ciencia: 100 }, feito: false },
        { id: 'picareta_diamante', nome: 'Brocas de Diamante', desc: 'Mineração 2x mais rápida', custo: { ciencia: 1000, diamante: 10 }, feito: false }
    ]
});

// --- COMPUTEDS ---
export const limites = reactive({
    casas: computed(() => jogo.prefeitura * 3),
    recursos: computed(() => Math.floor(200 + (jogo.armazens * 500))),
    // 1 vaga especial a cada 3 níveis de prefeitura 
    vagasEspeciais: computed(() => Math.ceil(jogo.prefeitura / 3))
});
export const populacaoTotal = computed(() => jogo.funcionarios.length);
export const custoContratacao = computed(() => (jogo.taverna || 1) * 500);

export const bonusSorteTotal = computed(() => {
    return jogo.funcionarios
        .filter(f => f.profissao === 'administrador' && f.diasEmGreve === 0)
        .reduce((acc, curr) => {
            const base = curr.poderEspecial || curr.poderGerencia || 0;
            
            // Aplica o buff racial na sorte também
            const pctBuff = obterBuffRaca(curr);
            const multi = 1 + (pctBuff / 100);
            
            return acc + (base * multi);
        }, 0);
});
// --- LÓGICA DE PRODUÇÃO DA MINA ---
export function calcularProducaoPorMinuto(minerioId) {
    const dados = tabelaMinerais.find(m => m.id === minerioId);
    if (!dados) return 0;

    const slots = jogo.alocacaoMina[minerioId]; // [id1, id2]
    if (!slots) return 0;

    let producaoTotal = 0;

    // Slot 1 (100% Eficiência)
    if (slots[0]) {
        const f1 = jogo.funcionarios.find(f => f.id === slots[0]);
        if (f1 && f1.diasEmGreve === 0) {
            const buffRaca = 1 + (obterBuffRaca(f1) / 100);
            const bonusProd = f1.bonus * buffRaca; // Ex: 1.10 * 1.10 = 1.21
            producaoTotal += dados.producaoBase * bonusProd * 1.0; // 100%
        }
    }

    // Slot 2 (60% Eficiência)
    if (slots[1]) {
        const f2 = jogo.funcionarios.find(f => f.id === slots[1]);
        if (f2 && f2.diasEmGreve === 0) {
            const buffRaca = 1 + (obterBuffRaca(f2) / 100);
            const bonusProd = f2.bonus * buffRaca;
            producaoTotal += dados.producaoBase * bonusProd * 0.6; // 60%
        }
    }

    // Tech Bônus (Ex: Picareta Diamante)
    // const temTech = jogo.listaTechs.find... (Adicionar depois se quiser)
    
    return producaoTotal;
}

// --- REMOVER ESSA LINHA DEPOIS? ---
export const dadosMinerais = tabelaMinerais; export const dadosItens = tabelaItens;

// --- FUNÇÕES HELPER ---
function finalizarConstrucao() {
    const tipo = jogo.construindo.tipo;
    const dados = DADOS_CONSTRUCOES[tipo];

    if (!dados) return; // Segurança caso o tipo não exista

    // 1. Sobe o Nível
    // Acessa jogo['mina'] ou jogo['casas'] dinamicamente
    jogo[dados.attrNivel]++;

    // 2. Aplica Efeitos Extras (se houver, ex: Casas aumentam pop)
    if (dados.efeitos) {
        dados.efeitos();
    }

    // 3. Atualiza o Preço para o próximo nível
    // Pega o objeto de custo (ex: jogo.custoCasa)
    const custoObj = jogo[dados.attrCusto];
    
    // Multiplica cada recurso (madeira, pedra, etc) pelo multiplicador
    if (custoObj && dados.multiplicador !== 1.0) {
        Object.keys(custoObj).forEach(recurso => {
            custoObj[recurso] = Math.floor(custoObj[recurso] * dados.multiplicador);
        });
    }

    // 4. Limpa a fila
    jogo.construindo.tipo = null;
}
function finalizarCraft(index) {
    const slot = jogo.craftando[index];
    if (!slot) return;

    const receita = tabelaItens.find(i => i.id === slot.item);
    if (receita) {
        // Verifica se é item de Herói (gera item único com nível)
        if (receita.categoria === 'heroi') {
            for (let k = 0; k < slot.qtdLote; k++) {
                // Cria uma cópia única do item
                jogo.equipamentos.push({
                    uid: Date.now() + Math.random(), // ID único para o sistema
                    id: receita.id,
                    nome: receita.nome,
                    nivel: 0, // Começa +0
                    tipo: receita.tipo, // Importante para o filtro
                    categoria: 'heroi',
                    stats: { ...receita.stats }, // Copia os stats base
                    atributoInativo: receita.atributoInativo // Copia o atributo inativo
                });
            }
        } else {
            // Se for item comum (Aventureiro), mantém a lógica antiga de pilha
            const qtdRecebida = slot.qtdLote * (receita.qtd || 1);
            jogo.itens[receita.id] = (jogo.itens[receita.id] || 0) + qtdRecebida;
        }
    }
    // Remove da lista pois acabou
    jogo.craftando.splice(index, 1);
}
function processarOffline(segundosOffline) {
    if (segundosOffline <= 0) return;
    
    // console.log(`Processando ${segundosOffline}s offline...`);

    // --- 1. MINERAÇÃO (Lógica Antiga Mantida) ---
    const minutosOffline = segundosOffline / 60;
    const eficiencia = 0.8; // 80%

    tabelaMinerais.forEach(m => {
        const prodPorMinuto = calcularProducaoPorMinuto(m.id);
        if (prodPorMinuto > 0) {
            const totalGerado = prodPorMinuto * minutosOffline * eficiencia;
            jogo.minerios[m.id] = Math.min((jogo.minerios[m.id] || 0) + Math.floor(totalGerado), limites.recursos);
        }
    });

    // --- 2. CÂMARA DE PROCESSAMENTO (NOVA LÓGICA DE FILA) ---
    // Clonamos o tempo total disponível para gastar na fila
    let tempoParaGastar = segundosOffline * 0.8;

    // Proteção: Limite máximo de 24h offline para não travar o loop se o cara ficar 1 ano fora
    if (tempoParaGastar > 86400) tempoParaGastar = 86400; 

    // Loop enquanto tivermos tempo E houver algo na mesa ou na fila
    while (tempoParaGastar > 0) {
        
        // 1. Verifica se a mesa está vazia, mas tem alguém na fila esperando
        if (!jogo.processamento[0].item && jogo.processamento[1].item) {
            jogo.processamento.shift();
            jogo.processamento.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });
        }

        const slotAtual = jogo.processamento[0];

        // Se não tem nada na mesa, acabou o trabalho. Para o loop.
        if (!slotAtual || !slotAtual.item) break;

        // 2. Calcula velocidade do funcionário (se tiver esfolador, é mais rápido)

        // 3. Simula o processamento
        // Quanto tempo REAL leva para terminar este item?
        // Ex: Falta 10s, velocidade 2x -> Leva 5 segundos reais.
        const segundosReaisNecessarios = slotAtual.tempoRestante;

        if (tempoParaGastar >= segundosReaisNecessarios) {
            // CENÁRIO A: Temos tempo para terminar este item COMPLETO
            
            // Consome o tempo do nosso banco de horas
            tempoParaGastar -= segundosReaisNecessarios;

            // Entrega recompensas
            const receita = tabelaCarcacas.find(c => c.id === slotAtual.item);
            if (receita) {
                jogo.comida += (receita.recursos.carne || 0);
                jogo.couro = Math.min(jogo.couro + (receita.recursos.couro || 0), limites.recursos);
            }

            // Remove o item e puxa o próximo (faz a fila andar)
            jogo.processamento.shift();
            jogo.processamento.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });

        } else {
            // CENÁRIO B: O tempo acabou no meio do corte
            
            // Avança o progresso o máximo que der
            const progressoFeito = tempoParaGastar; // Progresso 1:1;
            slotAtual.tempoRestante -= progressoFeito;
            
            // Atualiza visual da barra (opcional aqui, mas bom pra garantir)
            slotAtual.progresso = 100 - ((slotAtual.tempoRestante / slotAtual.tempoTotal) * 100);

            // Zera o tempo disponível para sair do loop
            tempoParaGastar = 0;
        }
    }
}
// --- NOVA FUNÇÃO DE BUFF RACIAL DO PREFEITO ---
export function obterBuffRaca(func) {
    // 1. Acha o prefeito (que não esteja em greve)
    const prefeito = jogo.funcionarios.find(f => f.profissao === 'lorde' && f.diasEmGreve === 0);
    
    // 2. Validações básicas
    if (!prefeito) return 0; // Sem prefeito, sem buff
    if (prefeito.id === func.id) return 0; // Prefeito não buffa a si mesmo
    if (prefeito.raca !== func.raca) return 0; // Raças diferentes, sem buff

    // 3. O Cálculo Conservador: 1/3 da Gestão
    // Ex: Gestão 30 -> Buff de 10%
    const gestao = prefeito.poderEspecial || 0;
    return (gestao / 3); 
}
tabelaMinerais.forEach(m => {
    alocacaoInicial[m.id] = [null, null]; // Slot 1, Slot 2
    bancoInicial[m.id] = 0.0;
});

// --- FUNÇÃO DE PRODUÇÃO ATUALIZADA COM O BUFF ---
function calcularProducaoTotal(profissao) {
    const trabalhadores = jogo.funcionarios.filter(f => f.profissao === profissao);
    let producaoTotal = 0;
    
    trabalhadores.forEach(f => {
        const penalidade = f.diasEmGreve * 0.2;
        const eficiencia = Math.max(0, 1 - penalidade);
        
        // Calcula o buff racial (ex: 10 virou 1.10)
        const pctBuff = obterBuffRaca(f); 
        const multiplicadorRaca = 1 + (pctBuff / 100);

        // Aplica o multiplicador na produção
        producaoTotal += (1 * f.bonus * eficiencia * multiplicadorRaca);
    });
    
    return producaoTotal;
}

// --- AÇÕES ---
export const acoes = {
    // Função auxiliar para iniciar qualquer construção
    iniciarProjeto(tipo) {
        // 1. Verificações Básicas
        if (jogo.construindo.tipo) return mostrarAviso("Ocupado!", "A fila de construção já está ocupada.");
        
        const dados = DADOS_CONSTRUCOES[tipo];
        if (!dados) return console.error("Prédio não configurado:", tipo);

        // 2. Verifica Limites Específicos (Lógica customizada ainda é necessária aqui)
        if (tipo === 'casa' && jogo.casas >= limites.casas) return mostrarAviso("Limite", "Evolua a Prefeitura.");
        if (tipo === 'armazem' && (jogo.casas + jogo.armazens) >= limites.casas) return mostrarAviso("Limite", "Evolua a Prefeitura.");
        
        // 3. Verifica e Cobra Recursos
        const custos = jogo[dados.attrCusto];
        let podePagar = true;
        
        // Verifica se tem recursos para TODOS os itens da lista de custo
        Object.keys(custos).forEach(res => {
            // Se o recurso for 'pedra', 'ferro' etc, olha em jogo.minerios. Se for 'madeira', olha em jogo.
            const qtdTenho = (jogo.minerios[res] !== undefined) ? jogo.minerios[res] : jogo[res];
            if (qtdTenho < custos[res]) podePagar = false;
        });

        if (!podePagar) return mostrarAviso("Sem Recursos", "Você não tem recursos suficientes.");

        // Se passou, desconta tudo
        Object.keys(custos).forEach(res => {
            if (jogo.minerios[res] !== undefined) jogo.minerios[res] -= custos[res];
            else jogo[res] -= custos[res];
        });

        // 4. Define o Tempo
        let tempoTotal = 0;
        if (dados.calcTempo) {
            // Se tiver fórmula (como a mina), calcula baseado no nível ATUAL
            tempoTotal = dados.calcTempo(jogo[dados.attrNivel]);
        } else {
            // Se for tempo fixo (como casa), usa o valor fixo
            // Opcional: Se quiser que a casa demore mais a cada nível, pode criar lógica aqui
            tempoTotal = dados.tempoBase;
            if (tipo === 'taverna') tempoTotal = jogo.taverna * 60; // Regra especial da Taverna mantida
        }

        // 5. Inicia
        jogo.construindo = { tipo: tipo, tempoRestante: tempoTotal, tempoTotal: tempoTotal };
    },
    pagarIndividual(idFuncionario) {
        const func = jogo.funcionarios.find(f => f.id === idFuncionario);
        if (!func) return;
        if (func.diasEmGreve === 0) return mostrarAviso("Em dia", "Este funcionário não está em greve.");
        const totalDevido = func.salario * func.diasEmGreve;
        if (jogo.ouro >= totalDevido) {
            jogo.ouro -= totalDevido;
            func.diasEmGreve = 0;
            func.pago = true;
            mostrarAviso("Pago!", `Dívida de ${totalDevido} ouros quitada. ${func.nome} voltou ao trabalho.`, 'sucesso');
        } else {
            mostrarAviso("Sem Ouro", `Você precisa de ${totalDevido} ouros para quitar ${func.diasEmGreve} dias de atraso.`);
        }
    },
    construir(tipo) {
        // Agora só chama a função mestre
        this.iniciarProjeto(tipo);
    },
    evoluir(tipo) {
        // Agora só chama a função mestre
        this.iniciarProjeto(tipo);
    },

    async recrutar(profissaoAlvo = null, premium = false, aoContratar = null, onConflito = null, onEscolhaTroca = null) {
        await verificarNovoDia();

        const dataInternet = await obterDataInternet();
        if (!dataInternet) return mostrarAviso("Sem Conexão", "Internet obrigatória.");

        // Se NÃO for premium, checa o limite comum ( AUMENTA LIMITE DE CONTRATAÇÕES COMUM )
        if (!premium && jogo.contratacoesHoje >= 5000000000000000000) return mostrarAviso("Limite Diário", "Máximo de 5 contratações por dia.");

        // Se FOR premium, checa o limite elite ( AUMENTA LIMITE DE CONTRATAÇÕES ELITE )
        if (premium && jogo.contratacoesEliteHoje >= 1000000000000000000) return mostrarAviso("Limite Elite", "Apenas 1 contratação de Elite por dia.");

        // Verifica População Comum (Só se NÃO for especial)
        if (!premium && jogo.funcionarios.length >= jogo.populacaoMax) return mostrarAviso("Vila Cheia", "Construa Casas.");

        let multiplicador = 1;
        if (profissaoAlvo) multiplicador = 5;
        if (premium) {
            // Custo Dinâmico: 5x por Nível da Taverna
            // Nível 2 = 10x (5000 ouros)
            // Nível 6 = 30x (15000 ouros)
            // Nível 10 = 50x (25000 ouros)
            multiplicador = (jogo.taverna * 5);
        }

        const custoFinal = custoContratacao.value * multiplicador;

        if (jogo.ouro >= custoFinal) {
            const execucao = () => {
                jogo.ouro -= custoFinal;
                const novo = gerarFuncionario(jogo.taverna || 1, profissaoAlvo, premium, bonusSorteTotal.value);

                // --- LÓGICA DE VAGAS ESPECIAIS ---
                if (novo.isEspecial) {
                    const atuaisEspeciais = jogo.funcionarios.filter(f => f.isEspecial);

                    // 1. DUELO DE PROFISSÃO (Prioridade Máxima)
                    const duplicado = atuaisEspeciais.find(f => f.profissao === novo.profissao);
                    if (duplicado) {
                        if (onConflito) {
                            onConflito(novo, duplicado, () => {
                                const idx = jogo.funcionarios.indexOf(duplicado);
                                jogo.funcionarios.splice(idx, 1);
                                jogo.funcionarios.push(novo);
                                // SEPARAÇÃO DOS CONTADORES
                                if (premium) jogo.contratacoesEliteHoje++;
                                else jogo.contratacoesHoje++;

                                if (aoContratar) aoContratar(novo);
                            });
                            return; 
                        }
                    }

                    // 2. PREFEITURA CHEIA (Novo: Escolha quem sai)
                    if (atuaisEspeciais.length >= limites.vagasEspeciais) {
                        if (onEscolhaTroca) {
                            // Chama o modal para o usuário escolher UM da lista para sair
                            onEscolhaTroca(novo, atuaisEspeciais, (candidatoParaSair) => {
                                const idx = jogo.funcionarios.indexOf(candidatoParaSair);
                                jogo.funcionarios.splice(idx, 1);
                                jogo.funcionarios.push(novo);
                                // SEPARAÇÃO DOS CONTADORES
                                if (premium) jogo.contratacoesEliteHoje++;
                                else jogo.contratacoesHoje++;

                                if (aoContratar) aoContratar(novo);
                            });
                            return;
                        } else {
                            // Fallback caso não tenha UI
                            jogo.ouro += custoFinal; // Devolve o ouro
                            return mostrarAviso("Prefeitura Cheia", "Evolua a Prefeitura ou demita um especialista manualmente.");
                        }
                    }
                } else {
                    // Funcionário Comum
                    const comuns = jogo.funcionarios.filter(f => !f.isEspecial);
                    if (comuns.length >= jogo.populacaoMax) {
                        jogo.ouro += custoFinal;
                        return mostrarAviso("Vila Cheia", "Não há casas para este trabalhador comum.");
                    }
                }

                // Se passou direto (tem vaga), adiciona
                jogo.funcionarios.push(novo);
                // SEPARAÇÃO DOS CONTADORES
                if (premium) jogo.contratacoesEliteHoje++;
                else jogo.contratacoesHoje++;

                if (aoContratar) aoContratar(novo);
                else mostrarAviso("Contratado!", `Você contratou um ${novo.profissao} Tier ${novo.tier}!`, 'sucesso');
            };

            execucao();
        } else mostrarAviso("Sem Ouro", `Faltam ${custoFinal - jogo.ouro} de ouro.`);
    },

    fundirFuncionarios(idsSelecionados, onSucessoFusao, onConfirmacaoVisual = null) {
        if (idsSelecionados.length !== 3) return mostrarAviso("Erro", "Selecione 3 funcionários.");

        const temGerente = idsSelecionados.some(id => {
            const f = jogo.funcionarios.find(func => func.id === id);
            return f && f.profissao === 'gerente';
        });
        if (temGerente) return mostrarAviso("Proibido", "Gerentes não podem ser fundidos.");

        const funcs = idsSelecionados.map(id => jogo.funcionarios.find(f => f.id === id)).filter(Boolean);
        if (funcs.length !== 3) return;
        
        const tierBase = funcs[0].tier;
        if (!funcs.every(f => f.tier === tierBase)) return mostrarAviso("Erro", "Tiers diferentes.");

        // --- VERIFICAÇÃO DE PROFISSÃO ---
        const profBase = funcs[0].profissao;
        const mesmaProf = funcs.every(f => f.profissao === profBase);
        // Se for tudo igual, a profissão final é essa. Se não, é null (aleatória)
        let profissaoFinal = mesmaProf ? profBase : null; 

        // --- VERIFICAÇÃO DE HEROIS (NOVO) ---
        // Se todos forem heróis (mesmo que classes diferentes), o resultado DEVE ser herói
        const saoTodosHerois = funcs.every(f => f.profissao === 'heroi');
        
        let classeFinal = null;

        if (saoTodosHerois) {
            profissaoFinal = 'heroi'; // Força ser herói
            
            // Verifica se são da mesma CLASSE
            const classeBase = funcs[0].classe;
            const mesmaClasse = funcs.every(f => f.classe === classeBase);
            
            if (mesmaClasse) {
                classeFinal = classeBase; // Mantém a classe (ex: 3 Necromantes viram 1 Necromante)
            }
            // Se não forem mesma classe, classeFinal fica null (gera uma aleatória)
        }

        // --- VERIFICAÇÃO DE RAÇA ---
        const racaBase = funcs[0].raca;
        const mesmaRaca = funcs.every(f => f.raca === racaBase);
        const racaFinal = mesmaRaca ? racaBase : null;

        // --- CÁLCULO DO BÔNUS DE SINERGIA ---
        // Sinergia se: Mesma Profissão OU Mesma Raça OU Mesma Classe (caso heróis)
        const temSinergia = mesmaProf || mesmaRaca; // (Classe igual já implica profissão igual, então está coberto)

        const bonusFusao = bonusSorteTotal.value * 0.6;
        
        const chances = calcularChancesFusao(tierBase, jogo.taverna || 1, bonusFusao, temSinergia);

        const executarLogica = () => {
            // Passamos profissaoFinal, racaFinal, temSinergia E AGORA classeFinal
            const novo = processarFusao(tierBase, jogo.taverna || 1, profissaoFinal, racaFinal, bonusFusao, temSinergia, classeFinal);
            
            idsSelecionados.forEach(id => {
                const idx = jogo.funcionarios.findIndex(f => f.id === id);
                if (idx !== -1) jogo.funcionarios.splice(idx, 1);
            });
            jogo.funcionarios.push(novo);
            if (onSucessoFusao) onSucessoFusao(novo, tierBase);
        };

        if (onConfirmacaoVisual) {
            onConfirmacaoVisual(chances, tierBase, executarLogica);
            return;
        }

        // Fallback (Modal antigo de texto)
        let texto = `Fusão de 3x Tier ${tierBase}.\n`;
        if (temSinergia) texto += `✨ BÔNUS DE SINERGIA ATIVO! ✨\n\n`;
        
        texto += `⬆️ Upgrade: ${chances.upgrade}%\n`;
        texto += `↔️ Manter: ${chances.manter}%\n`;
        if (chances.downgrade > 0) texto += `⬇️ Downgrade: ${chances.downgrade}%\n`;

        pedirConfirmacao("Confirmar Fusão?", texto, executarLogica);
    },

    demitirFuncionario(id) {
        // 1. Verificação de Segurança da Biblioteca
        // Se o ID do funcionário estiver na lista de alocação da biblioteca, bloqueia.
        if (jogo.alocacaoBiblioteca.includes(id)) {
            return mostrarAviso("Ação Bloqueada", "Este funcionário está alocado na Biblioteca. Remova-o de lá antes de demitir.");
        }

        // 2. Verificação de Segurança da Mina (Recomendado fazer também)
        // Varre todos os slots da mina para ver se ele está lá
        const estaNaMina = Object.values(jogo.alocacaoMina).some(slots => slots.includes(id));
        if (estaNaMina) {
             return mostrarAviso("Ação Bloqueada", "Este funcionário está trabalhando na Mina. Remova-o de lá antes de demitir.");
        }

        // 3. Código Original de Demissão (só acontece se passar pelas travas acima)
        const idx = jogo.funcionarios.findIndex(x => x.id === id);
        if (idx !== -1) jogo.funcionarios.splice(idx, 1);
    },

    fabricarItem(item, qtd = 1) {
        // 1. Define quantos slots o jogador tem direito
        let maxSlots = 1;
        if (jogo.ferraria >= 7) maxSlots = 3;
        else if (jogo.ferraria >= 3) maxSlots = 2;

        // 2. Verifica se tem espaço na fila
        if (jogo.craftando.length >= maxSlots) {
            return mostrarAviso("Fila Cheia", `Sua ferraria nível ${jogo.ferraria} suporta apenas ${maxSlots} filas.`);
        }

        const custoTotal = {};
        let pode = true;
        Object.keys(item.custo).forEach(k => { custoTotal[k] = item.custo[k] * qtd; });
        Object.keys(custoTotal).forEach(k => {
            const tenho = (jogo.minerios[k] !== undefined) ? jogo.minerios[k] : jogo[k];
            if (tenho < custoTotal[k]) pode = false;
        });

        if (pode) {
            Object.keys(custoTotal).forEach(k => {
                if (jogo.minerios[k] !== undefined) jogo.minerios[k] -= custoTotal[k]; else jogo[k] -= custoTotal[k];
            });

            // Bônus do Ferreiro
            const ferreiro = jogo.funcionarios.find(f => f.profissao === 'ferreiro' && f.diasEmGreve === 0);
            let redutorTempo = 0;
            let redutorFalha = 0;
            if (ferreiro) {
                const buffRaca = 1 + (obterBuffRaca(ferreiro) / 100);
                const poderReal = (ferreiro.poderEspecial || 0) * buffRaca;
                redutorTempo = Math.min(0.9, poderReal / 100); 
                redutorFalha = Math.min(1.0, poderReal / 100);
            }

            const tempoFinal = Math.ceil(item.tempo * qtd * (1 - redutorTempo));
            
            // Adiciona o novo item na lista (push) com um ID único (usamos Date.now para garantir unicidade simples)
            jogo.craftando.push({ 
                idUnico: Date.now() + Math.random(), // Identificador para cancelar o certo depois
                item: item.id, 
                qtdLote: qtd, 
                tempoRestante: tempoFinal, 
                tempoTotal: tempoFinal,
                chanceFalha: Math.max(0, 0.0 * (1 - redutorFalha)) // Base 0% falha por enquanto
            });
            
        } else mostrarAviso("Sem Recursos", "Faltam recursos.");
    },
    cancelarCraft(index) {
        // Recebe o índice da fila (0, 1 ou 2)
        const slot = jogo.craftando[index];
        if (!slot) return;
        
        pedirConfirmacao("Cancelar Produção?", "Recupera 90% dos pendentes.", () => {
            const receita = tabelaItens.find(i => i.id === slot.item);
            if (receita) {
                const tempoDecorrido = slot.tempoTotal - slot.tempoRestante;
                const tempoPorItem = slot.tempoTotal / slot.qtdLote;
                const feitos = Math.floor(tempoDecorrido / tempoPorItem);
                const pendentes = Math.max(0, slot.qtdLote - feitos);

                if (feitos > 0) jogo.itens[receita.id] += (feitos * (receita.qtd || 1));

                if (pendentes > 0) {
                    Object.keys(receita.custo).forEach(k => {
                        const dev = Math.floor((receita.custo[k] * pendentes) * 0.9);
                        if (jogo.minerios[k] !== undefined) jogo.minerios[k] += dev; else jogo[k] += dev;
                    });
                }
                
                // Remove o item da lista
                jogo.craftando.splice(index, 1);
                mostrarAviso("Cancelado", `Finalizados: ${feitos} | Cancelados: ${pendentes}`, 'aviso');
            }
        });
    },

    acelerarCraft(index) {
        // Busca o slot correto usando o índice (0, 1 ou 2)
        const slot = jogo.craftando[index];
        if (!slot) return;
        
        // Calcula custo: 1000 ouros por minuto restante
        const custo = Math.ceil(slot.tempoRestante / 60) * 1000;

        // Verifica se tem dinheiro
        if (jogo.ouro >= custo) {
            pedirConfirmacao("Acelerar Produção?", `Deseja gastar ${custo} ouros para terminar agora?`, () => {
                jogo.ouro -= custo;
                
                const receita = tabelaItens.find(i => i.id === slot.item);
                if (receita) {
                    // CORREÇÃO: Verifica se é Herói para criar item único (igual ao finalizarCraft)
                    if (receita.categoria === 'heroi') {
                        for (let k = 0; k < slot.qtdLote; k++) {
                             jogo.equipamentos.push({
                                uid: Date.now() + Math.random(), 
                                id: receita.id,
                                nome: receita.nome,
                                nivel: 0, 
                                tipo: receita.tipo,
                                categoria: 'heroi',
                                stats: { ...receita.stats },
                                atributoInativo: receita.atributoInativo
                            });
                        }
                    } else {
                        // Se for item comum, soma na pilha
                        jogo.itens[receita.id] = (jogo.itens[receita.id] || 0) + ((receita.qtd || 1) * slot.qtdLote);
                    }
                }
                
                // Remove da fila
                jogo.craftando.splice(index, 1);
                
                // Opcional: Feedback de sucesso
                mostrarAviso("Acelerado!", "Produção concluída instantaneamente.", "sucesso");
            });
        } else {
            // --- AQUI ESTÁ O AVISO QUE FALTAVA ---
            mostrarAviso("Ouro Insuficiente", `Você precisa de ${custo} ouros para acelerar esta produção.\nVocê tem apenas ${jogo.ouro}.`);
        }
    },
    // REMOVER ESSA FUNÇÃO DEPOIS?
    alocarMina(id, qtd) {
        if (qtd === 1) { if (mineradoresOcupados.value < jogo.mineradores) jogo.trabalhoMina[id]++; }
        else if (qtd === -1 && jogo.trabalhoMina[id] > 0) jogo.trabalhoMina[id]--;
    },
    gerenciarTrabalho(prof, qtd) {
        const mapa = { lenhador: 'lenhadores', minerador: 'mineradores', esfolador: 'esfoladores', academico: 'academicos' };
        const p = mapa[prof];
        if (qtd === -1 && jogo[p] > 0) {
            if (prof === 'minerador' && (jogo.mineradores - mineradoresOcupados.value) <= 0) return mostrarAviso("Erro", "Mineradores trabalhando.");
            jogo[p]--; jogo.desempregados++;
        }
    },
    // Nova função de alocação
    alocarMinerador(minerioId, slotIndex, funcionarioId) {
        // Se slotIndex for 1 (segundo slot), verificar se está desbloqueado
        const minerio = tabelaMinerais.find(m => m.id === minerioId);
        
        // Regra de Desbloqueio de Slots:
        // Slot 1: Nível da Mina >= Nível do Minério
        // Slot 2: Nível da Mina >= Nível do Minério + 1 (Exceto Pedra que já tem 2 no Nv 1)
        
        let bloqueado = false;
        if (slotIndex === 0) {
            if (jogo.mina < minerio.nivel) bloqueado = true;
        } else {
            // Slot 2
            if (minerio.id === 'pedra') {
                if (jogo.mina < 1) bloqueado = true; // Pedra libera 2 slots no nv 1
            } else {
                if (jogo.mina < minerio.nivel + 1) bloqueado = true;
            }
        }

        if (bloqueado) return; // Não faz nada se tentar burlar

        // Remove o funcionário de qualquer outro slot onde ele esteja
        if (funcionarioId) {
            Object.keys(jogo.alocacaoMina).forEach(mId => {
                const s = jogo.alocacaoMina[mId];
                if (s[0] === funcionarioId) s[0] = null;
                if (s[1] === funcionarioId) s[1] = null;
            });
        }

        // Atribui ao novo slot
        jogo.alocacaoMina[minerioId][slotIndex] = funcionarioId;
    },
    
    desalocarMinerador(minerioId, slotIndex) {
        jogo.alocacaoMina[minerioId][slotIndex] = null;
    },
    pesquisar(tech) { if (!tech.feito && jogo.ciencia >= tech.custo.ciencia) { jogo.ciencia -= tech.custo.ciencia; tech.feito = true; } },
    // HACKS PARA TESTES
    hack() { jogo.ouro += 100000000; jogo.madeira += 100000; jogo.comida += 100000; jogo.couro += 1000; Object.keys(jogo.minerios).forEach(k => jogo.minerios[k] += 1000); jogo.poMistico = (jogo.poMistico || 0) + 1000; 
    jogo.pedra_up_comum = (jogo.pedra_up_comum || 0) + 50;
    jogo.pedra_up_rara = (jogo.pedra_up_rara || 0) + 50;
    jogo.pedra_up_mitica = (jogo.pedra_up_mitica || 0) + 50;
    jogo.itens.carcaca_javali = (jogo.itens.carcaca_javali || 0) + 5;
    jogo.itens.carcaca_lobo = (jogo.itens.carcaca_lobo || 0) + 5;
    jogo.itens.carcaca_touro = (jogo.itens.carcaca_touro || 0) + 5;
    jogo.itens.carcaca_touro2 = (jogo.itens.carcaca_touro2 || 0) + 5;
    jogo.itens.carcaca_touro3 = (jogo.itens.carcaca_touro3 || 0) + 5;
    jogo.itens.javali_da_vila = (jogo.itens.javali_da_vila || 0) + 5;
    jogo.itens.tatu_pedra = (jogo.itens.tatu_pedra || 0) + 5;
    jogo.itens.besouro_rinoceronte = (jogo.itens.besouro_rinoceronte || 0) + 5;
    jogo.itens.javali_de_granito = (jogo.itens.javali_de_granito || 0) + 5;
    jogo.itens.basilisco = (jogo.itens.basilisco || 0) + 5;
    jogo.itens.lagarto_de_brasa = (jogo.itens.lagarto_de_brasa || 0) + 5;
    jogo.itens.sand_scorpion = (jogo.itens.sand_scorpion || 0) + 5;
    jogo.itens.magma_hyena = (jogo.itens.magma_hyena || 0) + 5;
    jogo.itens.salamandra = (jogo.itens.salamandra || 0) + 5;
    jogo.itens.fire_serpe = (jogo.itens.fire_serpe || 0) + 5;
    jogo.itens.snow_fox = (jogo.itens.snow_fox || 0) + 5;
    // remedios
    jogo.itens.bandagem = (jogo.itens.bandagem || 0) +5;
    jogo.itens.pocao_vida_p = (jogo.itens.pocao_vida_p || 0) +5;
    jogo.itens.ervas_medicinais = (jogo.itens.ervas_medicinais || 0) +5;
    jogo.itens.talisma_cura = (jogo.itens.talisma_cura || 0) +5;

},
    
    // HACK DE CONSTRUÇÕES
    hackConstrucoes() {
        // Aumenta o nível dos prédios principais
        jogo.prefeitura++;
        jogo.mina++;
        jogo.ferraria++;
        jogo.taverna++;
        jogo.camaraProcessamento++;
        jogo.biblioteca++;
        jogo.enfermaria++;
        
        // Adiciona casas e armazéns extras
        jogo.casas += 2;
        jogo.armazens += 2;
        
        // Ativa o laboratório se não tiver
        if (jogo.laboratorio === 0) jogo.laboratorio = 1;
        
        // Aumenta população máxima (para acompanhar as casas novas)
        jogo.populacaoMax += 4; 
    },
    // HACK DE RECURSOS
    resetarRecursos() {
        pedirConfirmacao("Lixeira", "Zerar tudo?", () => {
            ['madeira', 'comida', 'ouro', 'ciencia', 'couro'].forEach(k => jogo[k] = 0);
            Object.keys(jogo.minerios).forEach(k => jogo.minerios[k] = 0);
        });
    }
};

function processarPagamentoSalarios() {
    const copiaFuncionarios = [...jogo.funcionarios].sort((a, b) => {
        const idxA = ORDEM_TIERS.indexOf(a.tier);
        const idxB = ORDEM_TIERS.indexOf(b.tier);
        return idxB - idxA;
    });
    copiaFuncionarios.forEach(func => {
        if (jogo.ouro >= func.salario) {
            jogo.ouro -= func.salario;
            func.diasEmGreve = 0;
        } else {
            func.diasEmGreve++;
        }
    });
    const demitidos = jogo.funcionarios.filter(f => f.diasEmGreve >= 5);
    if (demitidos.length > 0) {
        jogo.funcionarios = jogo.funcionarios.filter(f => f.diasEmGreve < 5);
        mostrarAviso("Demissões!", `${demitidos.length} funcionários se demitiram por falta de pagamento (5 dias de greve).`, "aviso");
    }
}

export function iniciarLoop() {
    if (loopId) clearInterval(loopId);
    loopId = setInterval(() => {
        // 1. Calcula o tempo real que passou desde o último tick (Delta Time)
        const agora = Date.now();
        
        // Evita saltos gigantes se o jogo travou (limita a 1s min se for muito pequeno)
        const deltaSegundos = (agora - jogo.ultimaAtualizacao) / 1000;
        jogo.ultimaAtualizacao = agora;
// Verifica se a lista existe antes de tentar ler (segurança para saves antigos)
        // --- SISTEMA DE FILA DA BIBLIOTECA (NOVO) ---
        // Agora processamos apenas o PRIMEIRO da fila (Slot 0)
        // O Slot 1 fica "esperando" o 0 acabar.
        
        if (jogo.estudos && jogo.estudos.length > 0) {
            // --- LÓGICA DE FILA AUTOMÁTICA (COM DELAY DE 8s) ---
            // Verifica: Se o Centro (0) está VAZIO e a Fila (1) tem ITEM
            if (!jogo.estudos[0].item && jogo.estudos[1].item) {
                
                // Começa a contar o tempo
                jogo.tempoOciosidadeFila = (jogo.tempoOciosidadeFila || 0) + deltaSegundos;
                
                // Se passar de 8 segundos
                if (jogo.tempoOciosidadeFila >= 8) {
                    // Puxa a fila (O 1 vira 0, o 2 vira 1, etc)
                    jogo.estudos.shift();
                    // Adiciona um vazio no final pra manter 4 slots
                    jogo.estudos.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });
                    // Reseta o timer
                    jogo.tempoOciosidadeFila = 0;
                }
        } else {
            // Se o centro encheu (você colocou algo) ou a fila acabou, zera o timer
            jogo.tempoOciosidadeFila = 0;
        }
        // -----------------------------------------------------
            // Olha apenas para o primeiro da fila
            const slotAtual = jogo.estudos[0];

            if (slotAtual && slotAtual.item) {
                // Diminui o tempo
                slotAtual.tempoRestante -= deltaSegundos;

                // Atualiza Barra de Progresso
                slotAtual.progresso = 100 - ((slotAtual.tempoRestante / slotAtual.tempoTotal) * 100);

                // --- NOVO CÓDIGO: VERIFICA SE ACABOU ---
                if (slotAtual.tempoRestante <= 0) {
                    
                    // 1. Pega os dados do item (XP, Nome, etc)
                    const dadosItem = DADOS_ESTUDO[slotAtual.item];
                    
                    if (dadosItem) {
                        // 2. Dá a recompensa
                        jogo.ciencia += dadosItem.xp;
                        // console.log("Estudo concluído!");
                    }

                    // 3. MÁGICA DA FILA: .shift()
                    // Remove o item da posição [0]. O item da posição [1] vira [0] automaticamente!
                    jogo.estudos.shift(); 

                    // 4. Adiciona um slot vazio no final para manter sempre 4 vagas
                    jogo.estudos.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });
                }
            }
        }
        // -----------------------------------------------------
        // Fim do sistema de fila da biblioteca
        // ----------------------------------------------------

        // --- PROCESSAMENTO DE CARCAÇAS (NOVO) ---
        if (jogo.processamento && jogo.processamento.length > 0) {
            
            // Lógica de puxar da fila (Delay de 5s se estiver vazio no centro)
            if (!jogo.processamento[0].item && jogo.processamento[1].item) {
                // Usa uma variável temporária para delay ou puxa direto. 
                // Para simplificar, vamos puxar direto por enquanto:
                jogo.processamento.shift();
                jogo.processamento.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });
            }

            const slotCarne = jogo.processamento[0];
            
            // Se tem carcaça sendo processada
            if (slotCarne && slotCarne.item) {
                
                // Calcula velocidade baseada no funcionário alocado
                let velocidade = 1;
                // PROCURA AUTOMÁTICA (Igual à tela): Pega o primeiro esfolador disponível
                const func = jogo.funcionarios.find(f => f.profissao === 'esfolador' && f.diasEmGreve === 0);

                if (func) {
                    // Aplica o bônus simples
                    velocidade += func.bonus;
                    
                    // (Opcional) Se quiser aplicar o buff racial do prefeito aqui também, igual na tela:
                    const pctBuff = obterBuffRaca(func); 
                    const multiplicadorRaca = 1 + (pctBuff / 100);
                    // Ajuste a fórmula de velocidade conforme seu balanceamento desejado
                    // Exemplo: velocidade = velocidade * multiplicadorRaca;
                }
                // Aplica a velocidade ao tempo restante
                slotCarne.tempoRestante -= deltaSegundos;
                slotCarne.progresso = 100 - ((slotCarne.tempoRestante / slotCarne.tempoTotal) * 100);

                // Terminou o processamento?
                if (slotCarne.tempoRestante <= 0) {
                    const receita = tabelaCarcacas.find(c => c.id === slotCarne.item);
                    if (receita) {
                        // ENTREGAR RECOMPENSAS
                        jogo.comida += (receita.recursos.carne || 0);
                        jogo.couro = Math.min(jogo.couro + (receita.recursos.couro || 0), limites.recursos);
                        // console.log(`Processado: +${receita.carne} carne, +${receita.couro} couro`);
                    }
                    
                    // Remove item atual e puxa a fila
                    jogo.processamento.shift();
                    jogo.processamento.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });
                }
            }
        }

        // Limites gerais

        const lim = limites.recursos;
        
        // Verifica se tem a tecnologia de picareta (opcional, se ainda não tiver a tech, assume 1)
        const techPicareta = jogo.listaTechs.find(t => t.id === 'picareta_diamante');
        const multiplicadorTech = (techPicareta && techPicareta.feito) ? 2 : 1;

        // --- PROCESSAR MINERAÇÃO ---
        tabelaMinerais.forEach(m => {
            const prodPorMinuto = calcularProducaoPorMinuto(m.id);
            
            if (prodPorMinuto > 0) {
                // Aplica o multiplicador da Tech aqui se desejar, ou deixe no cálculo base
                const prodTotalMinuto = prodPorMinuto * multiplicadorTech;
                
                const prodPorSegundo = prodTotalMinuto / 60;
                const ganho = prodPorSegundo * deltaSegundos; // Agora deltaSegundos existe!
                
                // Usa o banco para acumular frações
                jogo.bancoMinerios[m.id] = (jogo.bancoMinerios[m.id] || 0) + ganho;
                
                if (jogo.bancoMinerios[m.id] >= 1) {
                    const inteiro = Math.floor(jogo.bancoMinerios[m.id]);
                    jogo.minerios[m.id] = Math.min((jogo.minerios[m.id] || 0) + inteiro, limites.recursos);
                    jogo.bancoMinerios[m.id] -= inteiro;
                }
            }
        });

        // --- TIMERS DE CONSTRUÇÃO E CRAFT ---
        if (jogo.construindo.tipo) { 
            jogo.construindo.tempoRestante -= deltaSegundos; // Usa delta para precisão
            if (jogo.construindo.tempoRestante <= 0) finalizarConstrucao(); 
        }
        // Percorre a lista de trás para frente para poder remover itens sem bugar o índice
        for (let i = jogo.craftando.length - 1; i >= 0; i--) {
            const slot = jogo.craftando[i];
            slot.tempoRestante -= deltaSegundos;
            if (slot.tempoRestante <= 0) {
                finalizarCraft(i);
            }
        }
        

        // --- RECURSOS BÁSICOS (COMIDA/MADEIRA) ---
        // Mantido simples (por tick) ou pode usar deltaSegundos também para precisão
        const cons = populacaoTotal.value;
        //jogo.comida = Math.max(0, jogo.comida - (cons * deltaSegundos)); // Consome comida proporcional ao tempo passado
        
        const prodMadeira = calcularProducaoTotal('lenhador');
        if (prodMadeira > 0) {
            const techMachado = jogo.listaTechs.find(t => t.id === 'machado_ferro');
            const bMad = (techMachado && techMachado.feito) ? 1.5 : 1;
            jogo.madeira = Math.min(jogo.madeira + (prodMadeira * bMad * deltaSegundos), lim);
        }

    }, 1000); // Roda a cada segundo
}

export function iniciarSave() {
    const s = localStorage.getItem('save-v15-refactor');
    if (s) { 
        try { 
            const dadosSalvos = JSON.parse(s);
            Object.assign(jogo, dadosSalvos);
            if (jogo.craftando && !Array.isArray(jogo.craftando)) {
                console.warn("Detectado save antigo da Ferraria. Resetando fila para evitar crash.");
                jogo.craftando = []; // Transforma em lista vazia à força
            }
            if (!jogo.estudos) {
                 jogo.estudos = [];
            }
            if (jogo.estudos.length < 4) {
                console.log("Corrigindo save da Biblioteca: Adicionando slots de fila.");
                while (jogo.estudos.length < 4) {
                    jogo.estudos.push({ item: null, tempoTotal: 0, tempoRestante: 0, progresso: 0 });
                }
            }
            // --- CORREÇÃO: REPARO DE SLOTS INEXISTENTES ---
            // Garante que se você adicionou minérios novos no código, 
            // eles sejam criados no save antigo.
            tabelaMinerais.forEach(m => {
                if (!jogo.alocacaoMina[m.id]) {
                    jogo.alocacaoMina[m.id] = [null, null];
                    jogo.bancoMinerios[m.id] = 0; // Garante banco também
                    // Inicializa contadores se não existirem
                    if (jogo.minerios[m.id] === undefined) jogo.minerios[m.id] = 0;
                }
            });

            // Processamento Offline
            if (Date.now() - jogo.ultimaAtualizacao > 5000) {
                processarOffline((Date.now() - jogo.ultimaAtualizacao) / 1000);
            }
        } catch (e) { 
            console.error("Erro ao carregar save:", e);
        } 
    }

    // VERIFICAÇÃO AUTOMÁTICA AO CARREGAR O JOGO
    verificarNovoDia();

    setInterval(() => { 
        jogo.ultimaAtualizacao = Date.now(); 
        localStorage.setItem('save-v15-refactor', JSON.stringify(jogo)); 
    }, 5000);
}
export function resetar() { if (confirm("Resetar?")) { localStorage.removeItem('save-v15-refactor'); location.reload(); } }