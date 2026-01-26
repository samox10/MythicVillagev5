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
    stats: { ataque: 8, critico: 2, danoCritico: 50, penetracao: 2, magia: 1
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
    stats: { ataque: 12, precisao: 3, danoCritico: 80, critico: 3  }
  },
  
  // --- ARMADURAS ---
  { 
    id: 'armadura_couro', nome: 'Armadura de Couro', 
    categoria: 'aventureiro',
    tipo: 'armadura', 
    custo: { couro: 10 }, tempo: 20, 
    reqNivel: 1,
    nivelItem: 5,
    img: '/assets/craft/armadura_couro.png',
    stats: { defesa: 3, evasao: 2, vida: 10, ataque: 1, critico: 1, 
      danoCritico: 10, magia: 1, defesaMagica: 2,}
  },
  { 
    id: 'armadura_ferro', nome: 'Armadura de Ferro', 
    categoria: 'aventureiro',
    tipo: 'armadura', 
    custo: { ferro: 15, couro: 5 }, tempo: 60, 
    reqNivel: 2,
    nivelItem: 5,
    stats: { defesa: 10, evasao: -2 }
  },

  
  // --- MUNIÇÃO ---
  { 
    id: 'flecha_pedra', nome: 'Flechas de Pedra (x100)', 
    categoria: 'aventureiro',
    tipo: 'municao', 
    custo: { madeira: 100, pedra: 100 }, tempo: 20, qtd: 100, 
    reqNivel: 1,
    nivelItem: 102,
    stats: { ataque: 2, mana: 5  }
  }
];
// ------------------------------------------
// FIM TABELA DE ITENS CRAFTÁVEIS
// ------------------------------------------

// ------------------------------------------
// SISTEMA DE APRIMORAMENTO DE ITENS
// ------------------------------------------
export const DB_PEDRAS = {
    nivel: [
        { id: 'pedra_up_comum', nome: 'Pedra de Afiar Comum', tier: 'comum', min: 0, max: 4, chanceBase: 100 }, 
        { id: 'pedra_up_rara', nome: 'Pedra de Afiar Rara', tier: 'rara', min: 4, max: 8, chanceBase: 70 }, 
        { id: 'pedra_up_mitica', nome: 'Pedra de Afiar Mítica', tier: 'mitica', min: 8, max: 10, chanceBase: 40 }
    ]
};