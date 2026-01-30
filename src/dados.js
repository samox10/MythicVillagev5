// ------------------------------------------
// TABELA DE MINERIOS
// ------------------------------------------
export const tabelaMinerais = [
  { id: 'pedra',      nome: 'Pedra',      nivel: 1,  producaoBase: 60 },  // 60 por minuto
  { id: 'cobre',      nome: 'Cobre',      nivel: 2,  producaoBase: 40 },  // 40 por minuto
  { id: 'ferro',      nome: 'Ferro',      nivel: 4,  producaoBase: 30 },  // 30 por minuto
  { id: 'prata',      nome: 'Prata',      nivel: 6,  producaoBase: 20 }, // 20 por minuto
  { id: 'ouro_min',   nome: 'Ouro (Min)', nivel: 8,  producaoBase: 15 }, // 15 por minuto
  { id: 'obsidiana',  nome: 'Obsidiana',  nivel: 10, producaoBase: 10 }, // 10 por minuto
  { id: 'titanio',    nome: 'Titânio',    nivel: 12, producaoBase: 8 }, // 8 por minuto
  { id: 'diamante',   nome: 'Diamante',   nivel: 14, producaoBase: 5 }, // 5 por minuto
  { id: 'mithril',    nome: 'Mithril',    nivel: 16, producaoBase: 3 }, // 3 por minuto
  { id: 'aetherium',  nome: 'Aetherium',  nivel: 18, producaoBase: 1 } // 1 por minuto
];

// ------------------------------------------
// TABELA DE ITENS CRAFTÁVEIS
// ------------------------------------------

export const tabelaItens = [
  // --- ARMAS ---
  
  { 
    id: 'espada_cobre', nome: 'Espada de Cobre', 
    img: '/assets/craft/espada_cobre.png',
    categoria: 'aventureiro', 
    tipo: 'arma',
    custo: { madeira: 10, cobre: 5, obsidiana: 1 }, 
    tempo: 10, 
    reqNivel: 1,
    nivelItem: 5,
    stats: { ataque: 8, critico: 2, danoCritico: 50, penetracao: 2, magia: 1,
    atributoInativo: "Dano contra slimes +10%"
     }     
  },
  { 
    id: 'espada_ferro', nome: 'Espada da Ruína Celestial', 
    categoria: 'heroi',
    tipo: 'arma', 
    img: '/assets/craft/espada_ferro.png', 
    custo: { madeira: 20, ferro: 10 }, tempo: 30, 
    reqNivel: 2,
    nivelItem: 5,
    stats: { ataque: 12, precisao: 3, danoCritico: 80, critico: 3  },
    atributoInativo: "Dano contra slimes +10%"
  },
  
  // --- ARMADURAS ---
  { 
    id: 'armadura_couro', nome: 'Armadura de Couro', 
    categoria: 'heroi',
    tipo: 'armadura', 
    custo: { couro: 10 }, tempo: 20, 
    reqNivel: 1,
    nivelItem: 5,
    img: '/assets/craft/armadura_couro.png',
    stats: { defesa: 3, evasao: 2, vida: 10, ataque: 1, critico: 1, 
      danoCritico: 10, magia: 1, defesaMagica: 2,},      
      atributoInativo: "Dano contra slimes +10%"
  },
  { 
    id: 'armadura_ferro', nome: 'Armadura de Ferro', 
    categoria: 'aventureiro',
    tipo: 'armadura', 
    custo: { ferro: 15, couro: 5 }, tempo: 60, 
    reqNivel: 2,
    nivelItem: 5,
    stats: { defesa: 10, evasao: -2 },
    atributoInativo: "Dano contra slimes +10%"
  },

  
  // --- MUNIÇÃO ---
  { 
    id: 'flecha_pedra', nome: 'Flechas de Pedra (x100)', 
    categoria: 'aventureiro',
    tipo: 'municao', 
    custo: { madeira: 100, pedra: 100 }, tempo: 20, qtd: 100, 
    reqNivel: 1,
    nivelItem: 102,
    stats: { ataque: 2, mana: 5  },
    atributoInativo: "Dano contra slimes +10%"
  }
];
// ------------------------------------------
// FIM TABELA DE ITENS CRAFTÁVEIS
// ------------------------------------------

// ------------------------------------------
// SISTEMA DE APRIMORAMENTO DE ITENS
// ------------------------------------------
export const DB_PEDRAS = {
    lista: [
        { 
            id: 'pedra_up_comum', 
            nome: 'Pedra do Aprendiz', 
            tier: 'comum',
                    // +1, +2, +3, +4,  +5,  +6, +7, +8...
            chances: [100, 80, 70, 50,  20,  10,  0,  0,  0,  0] 
        }, 
        { 
            id: 'pedra_up_rara', 
            nome: 'Pedra do Artesão', 
            tier: 'rara', 
                    // +1, +2,  +3, +4,  +5,  +6,  +7, +8,  +9,  +10
            chances: [100, 100, 90, 70,  65,  45,  30,  18,  5,  1] 
        }, 
        { 
            id: 'pedra_up_mitica', 
            nome: 'Pedra do Grão-Mestre', 
            tier: 'mitica', 
                    // +1, +2, +3,   +4,  +5,  +6, +7,  +8,  +9,  +10
            chances: [100, 100, 100, 100, 100, 75,  50,  30,  20,  10] 
        }
    ]
};

// ------------------------------------------
// FIM SISTEMA DE APRIMORAMENTO DE ITENS
// ------------------------------------------

// ------------------------------------------
// TABELA DE CARCAÇAS
// ------------------------------------------
export const tabelaCarcacas = [
  { 
    id: 'besouro_rinoceronte', nome: 'Besouro Rinoceronte', // NOME DA CARCAÇA
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/besouro_rinoceronte.png', // IMAGEM DO MONSTRO NOS BOTOES
    imgCorpo: '/assets/monstros/besouro_rinoceronte.png', // IMAGEM DA CARCAÇA EM CIMA DA MESA DE PROCESSAMENTO
    desc: 'Pode ser processada para obter carne e couro.',
    tempo: 10, // TEMPO EM SEGUNDOS PARA PROCESSAR ESSA CARCAÇA
    recursos: { carne: 50, couro: 10 }, // RECURSOS OBTIDOS AO PROCESSAR ESSA CARCAÇA
    ambiente: 'Floresta Densa', // AMBIENTE ONDE É POSSÍVEL CAÇAR ESSA CARCAÇA
    tamanhoVisual: 200, // TAMANHO DA CARCAÇA NA MESA DE PROCESSAMENTO (PC)
    tamanhoMobile: 150, // TAMANHO DA CARCAÇA NA MESA DE PROCESSAMENTO (MOBILE)
    rotacaoVisual: 20, // ROTAÇÃO DA CARCAÇA NA MESA DE PROCESSAMENTO (PC)
    rotacaoMobile: 20, // ROTAÇÃO DA CARCAÇA NA MESA DE PROCESSAMENTO (MOBILE)
    paddingVisual: 165, // POSICIONAMENTO VERTICAL NA MESA DE PROCESSAMENTO (PC) + SOBE - DESCE
    paddingMobile: 165, // POSICIONAMENTO VERTICAL NA MESA DE PROCESSAMENTO (MOBILE)
    nivelRequerido: 1 // NÍVEL QUE LIBERA MISSAO PRA CAÇAR ESSA CARCAÇA
  },
  { 
    id: 'tatu_pedra', nome: 'Tatu Pedra', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/tatu_pedra.png', 
    imgCorpo: '/assets/monstros/tatu_pedra.png',
    desc: 'Couro resistente e carne fibrosa.',
    tempo: 20, // 20 segundos
    recursos: { carne: 30, couro: 25 },
    ambiente: 'Montanhas Nevadas',
    tamanhoVisual: 160,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 1
  },
  { 
    id: 'javali_da_vila', nome: 'Javali da Vila', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/javali_da_vila.png', 
    imgCorpo: '/assets/monstros/javali_da_vila.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 300,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 1
  },
  { 
    id: 'javali_de_granito', nome: 'Javali de Granito', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/javali_de_granito.png', 
    imgCorpo: '/assets/monstros/javali_de_granito.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 305,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 1
  },
  { 
    id: 'basilisco', nome: 'Basilisco', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/basilisco.png', 
    imgCorpo: '/assets/monstros/basilisco.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 265,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 10
  },
  { 
    id: 'lagarto_de_brasa', nome: 'Lagarto de Brasa', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/lagarto_de_brasa.png', 
    imgCorpo: '/assets/monstros/lagarto_de_brasa.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 269,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 7
  },
  {
    id: 'sand_scorpion', nome: 'Escorpião de Areia', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/sand_scorpion.png', 
    imgCorpo: '/assets/monstros/sand_scorpion.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 200,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 6
  },
  {
    id: 'magma_hyena', nome: 'Hiena de Magma', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/magma_hyena.png', 
    imgCorpo: '/assets/monstros/magma_hyena.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 290,
    tamanhoMobile: 150,
    rotacaoVisual: -20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 2
  },
  {
    id: 'salamandra', nome: 'Salamandra', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/salamandra.png', 
    imgCorpo: '/assets/monstros/salamandra.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 250,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 3
  },
  {
    id: 'fire_serpe', nome: 'Serpe de Fogo', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/fire_serpe.png', 
    imgCorpo: '/assets/monstros/fire_serpe.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 430,
    tamanhoMobile: 150,
    rotacaoVisual: 20,
    rotacaoMobile: 20,
    paddingVisual: 165,
    paddingMobile: 165,
    nivelRequerido: 4
  },
  {
    id: 'snow_fox', nome: 'Raposa de Neve', 
    tipo: 'recurso', categoria: 'carcaca',
    img: '/assets/monstros/snow_fox.png', 
    imgCorpo: '/assets/monstros/snow_fox.png',
    desc: 'Uma enorme fonte de recursos.',
    tempo: 40, // 40 segundos
    recursos: { carne: 120, couro: 40 },
    ambiente: 'Planícies',
    tamanhoVisual: 250,
    tamanhoMobile: 150,
    rotacaoVisual: -25,
    rotacaoMobile: 20,
    paddingVisual: 175,
    paddingMobile: 175,
    nivelRequerido: 5
  }
];
// ------------------------------------------
// FIM TABELA DE CARCAÇAS
// ------------------------------------------
// ------------------------------------------
// CATALOGO DE MEDICAMENTOS (ENFERMARIA)
// ------------------------------------------
export const catalogoMedicamentos = [
    // --- CATEGORIA: BANDAGEM ---
    { 
        id: 'bandagem_comum', 
        categoria: 'bandagem', // <--- NOVA PROPRIEDADE
        fatorCura: 1.0,        // <--- Velocidade Base
        nome: 'Bandagem Comum', 
        icon: '🤕',
        desc: 'Pano limpo para estancar sangue.',
        funcao: 'Essencial para cortes.',
        poder: 'Tempo de cura padrão (1x).',
        onde: 'Crafting (Tecelão)',
        nivelReq: 1 
    },
    { 
        id: 'bandagem_premium', 
        categoria: 'bandagem', 
        fatorCura: 1.5,        // <--- 50% mais rápido
        nome: 'Bandagem de Seda', 
        icon: '🎗️',
        desc: 'Tecido tratado com aloe vera.',
        funcao: 'Cicatrização acelerada.',
        poder: 'Acelera cura em 1.5x.',
        onde: 'Crafting (Tecelão Nv.2)',
        nivelReq: 3 
    },

    // --- CATEGORIA: POÇÃO ---
    { 
        id: 'pocao_vida_p', 
        categoria: 'pocao',
        fatorCura: 1.0,
        nome: 'Poção de Vida (P)', 
        icon: '🧪',
        desc: 'Líquido vermelho básico.',
        funcao: 'Restaura vitalidade.',
        poder: 'Tempo de cura padrão (1x).',
        onde: 'Laboratório de Alquimia',
        nivelReq: 2 
    },
    { 
        id: 'pocao_vida_m', 
        categoria: 'pocao',
        fatorCura: 2.0,        // <--- 2x mais rápido
        nome: 'Poção de Vida (M)', 
        icon: '🍷',
        desc: 'Concentrado vital potente.',
        funcao: 'Regeneração celular rápida.',
        poder: 'Acelera cura em 2.0x.',
        onde: 'Laboratório de Alquimia (Nv.3)',
        nivelReq: 5 
    },

    // --- CATEGORIA: ERVAS ---
    { 
        id: 'ervas_comuns', 
        categoria: 'ervas',
        fatorCura: 1.0,
        nome: 'Ervas Medicinais', 
        icon: '🌿',
        desc: 'Plantas da floresta.',
        funcao: 'Trata infecções leves.',
        poder: 'Tempo de cura padrão (1x).',
        onde: 'Coleta na Floresta',
        nivelReq: 1 
    }
];
// ------------------------------------------
// FIM CATALOGO DE MEDICAMENTOS (ENFERMARIA)
// ------------------------------------------
// ------------------------------------------
// TIPOS DE FERIMENTOS E DOENÇAS
// ------------------------------------------
export const tiposFerimentos = {
    'corte_leve': {
        nome: 'Corte Leve',
        tempoBase: 60, // 60 segundos
        reqCategoria: 'bandagem', // Precisa de QUALQUER bandagem
        desc: 'Ferimento superficial causado por lâminas ou espinhos.'
    },
    'fratura_exposta': {
        nome: 'Fratura Exposta',
        tempoBase: 300, // 5 minutos
        reqCategoria: 'pocao', // Precisa de QUALQUER poção
        desc: 'Osso quebrado visível. Requer regeneração mágica.'
    },
    'infeccao_grave': {
        nome: 'Infecção Grave',
        tempoBase: 600, // 10 minutos
        reqCategoria: 'ervas', // Precisa de ervas
        desc: 'Febre alta e ferida purulenta.'
    },
    'trauma_batalha': {
        nome: 'Trauma de Batalha',
        tempoBase: 1200, // 20 minutos
        reqCategoria: 'bandagem', // Exige bandagem (mas se usar a premium vai curar muito rápido)
        desc: 'Múltiplos ferimentos causados por combate intenso.'
    }
};
// ------------------------------------------
// FIM TIPOS DE FERIMENTOS E DOENÇAS
// ------------------------------------------
// ------------------------------------------
// INFO DAS CATEGORIAS MEDICAMENTOS
// ------------------------------------------
export const infoCategorias = {
    'bandagem': {
        nome: 'Curativos',
        icon: '🩹',
        desc: 'Materiais para estancar sangramentos e fechar cortes.\nEssenciais para traumas físicos.'
    },
    'pocao': {
        nome: 'Poções',
        icon: '🧪',
        desc: 'Compostos alquímicos para regeneração acelerada.\nTratam fraturas e danos internos.'
    },
    'ervas': {
        nome: 'Ervas',
        icon: '🌿',
        desc: 'Plantas naturais para combater infecções e febres.\nCura lenta, mas segura.'
    },
    'talas': {
        nome: 'Talas',
        icon: '🩻',
        desc: 'Plantas naturais para combater infecções e febres.\nCura lenta, mas segura.'
    },
    'pomadas': {
        nome: 'Pomadas',
        icon: '🧴',
        desc: 'Plantas naturais para combater infecções e febres.\nCura lenta, mas segura.'
    },
    'antidotos': {
        nome: 'Antídotos',
        icon: '☠️',
        desc: 'Plantas naturais para combater infecções e febres.\nCura lenta, mas segura.'
    },
    'tonicos': {
        nome: 'Tônico',
        icon: '⚗️',
        desc: 'Plantas naturais para combater infecções e febres.\nCura lenta, mas segura.'
    },
    'comprimidos': {
        nome: 'Comprimidos',
        icon: '💊',
        desc: 'Plantas naturais para combater infecções e febres.\nCura lenta, mas segura.'
    }
};