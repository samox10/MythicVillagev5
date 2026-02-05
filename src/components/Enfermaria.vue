<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { jogo, mostrarAviso, obterBuffRaca, salvarNaNuvem } from '../jogo.js';
import { corTier, nomeProfissao } from '../funcionarios.js';
import { catalogoMedicamentos, tiposFerimentos, infoCategorias} from '../dados.js';
import { formatarTempo, formatarNumero } from '../utilidades.js';

const abaAtual = ref('tratamento');
const mostrarBotaoTopo = ref(false);

// Controle do Modal de Troca (Menu de Seleção)
const modalTrocaAberto = ref(false);
const categoriaParaTrocar = ref(null);
// Computada para facilitar o loop no HTML
const slotsVisiveis = computed(() => {
    // Transforma o objeto infoCategorias em uma lista para o v-for
    return Object.keys(infoCategorias).map(catKey => {
        const idItemAtual = loadout[catKey];
        // Busca os dados completos do item que está equipado
        const itemDados = catalogoMedicamentos.find(i => i.id === idItemAtual);
        
        return {
            key: catKey,
            info: infoCategorias[catKey], // Nome da Categoria, Icone da Categoria
            itemAtual: itemDados || {}    // Dados do item selecionado (Bandagem Premium, etc)
        };
    });
});
// 1. Abre Info da Categoria (Botão do Ícone Grande)
const verInfoCategoria = (slot) => {
    mostrarAviso(
        `Categoria: ${slot.info.nome}`, 
        `${slot.info.desc}\n\nItem Equipado Atual:\n${slot.itemAtual.nome} (Fator: ${slot.itemAtual.fatorCura}x)`,
        'confirmacao'
    );
};

// 2. Abre Menu de Troca (Botão Pequeno)
const abrirTroca = (catKey) => {
    categoriaParaTrocar.value = catKey;
    modalTrocaAberto.value = true;
};

// 3. Efetua a Troca (Ao clicar num item da lista)
const selecionarItem = (item) => {
    loadout[item.categoria] = item.id; // Salva a escolha
    salvarNaNuvem();
    modalTrocaAberto.value = false;    // Fecha o menu
    categoriaParaTrocar.value = null;
};

// 4. Lista de Opções (Filtra itens para o menu de troca)
const opcoesParaTroca = computed(() => {
    if (!categoriaParaTrocar.value) return [];
    return catalogoMedicamentos.filter(i => i.categoria === categoriaParaTrocar.value);
});

const verificarScroll = () => {
    mostrarBotaoTopo.value = window.scrollY > 300;
};

const voltarAoTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

onMounted(() => {
    window.addEventListener('scroll', verificarScroll);
});

onUnmounted(() => {
    window.removeEventListener('scroll', verificarScroll);
});
// --- 1. LÓGICA DO FUNCIONÁRIO ---
const enfermeiroAtivo = computed(() => {
    return jogo.funcionarios.find(f => f.profissao === 'enfermeiro' && f.diasEmGreve === 0);
});

const statsEnfermeiro = computed(() => {
    if (!enfermeiroAtivo.value) {
        return { 
            reducaoReal: 0, 
            textoDisplay: '0%', 
            fatorMultiplicador: 1 // Tempo x 1 (Normal)
        };
    }
    
    const prof = enfermeiroAtivo.value;
    
    // Calcula Buff Racial
    const buffPct = obterBuffRaca(prof);
    const fatorRaca = 1 + (buffPct / 100);
    
    // Pega a MEDICINA (poderEspecial) em vez do Bonus
    const medicinaBase = prof.poderEspecial || 0;
    
    // Calcula redução final (Ex: 30 * 1.1 = 33%)
    const reducaoFinal = Math.min(90, medicinaBase * fatorRaca);

    return {
        reducaoReal: reducaoFinal,
        textoDisplay: parseFloat(reducaoFinal.toFixed(1)) + '%',
        // Fator para multiplicar o tempo (Ex: 100% - 33% = 0.67)
        fatorMultiplicador: (1 - (reducaoFinal / 100))
    };
});
// --- SISTEMA DE LEITOS (PROTÓTIPO) ---

// 1. Configuração dos Leitos (Começam vazios)
const loadout = jogo.loadoutEnfermaria;

// Usa fila e leitos globais
const leitos = computed(() => jogo.leitos);
const filaDeEspera = computed(() => jogo.filaDeEspera);

// Função de Alocação MANUAL (Clique do Usuário)
const alocarPaciente = (paciente, indexLeito) => {
    // Se o modo automático estiver ligado, avisa pra desligar antes de mexer
    if (jogo.modoAutomaticoEnfermaria) {
        return mostrarAviso("Modo Automático", "Desligue a automação para gerenciar manualmente.");
    }

    if (leitos.value[indexLeito].ocupado) return;

    const tipoDoencaID = paciente.doenca || 'corte_pergaminho'; 
    const dadosDoenca = tiposFerimentos[tipoDoencaID];
    const categoriaNecessaria = dadosDoenca.reqCategoria;
    
    // Pega do global
    const idItemConfigurado = jogo.loadoutEnfermaria[categoriaNecessaria]; 
    const itemUsado = catalogoMedicamentos.find(i => i.id === idItemConfigurado);

    if (!itemUsado) return mostrarAviso('Erro', 'Item configurado não existe.');

    const qtdNoInventario = jogo.itens[itemUsado.id] || 0;

    if (qtdNoInventario <= 0) {
        return mostrarAviso('Sem Estoque!', `Você precisa de ${itemUsado.nome}.`);
    }

    // Consome
    jogo.itens[itemUsado.id]--;
    salvarNaNuvem();

    // Calcula Tempo (SEM PENALIDADE MANUAL)
    let tempoFinal = dadosDoenca.tempoBase / itemUsado.fatorCura;
    
    // Aplica a redução da Medicina (Multiplica pelo fator, ex: * 0.7)
    if (statsEnfermeiro.value) {
        tempoFinal = tempoFinal * statsEnfermeiro.value.fatorMultiplicador;
    }

    const pacienteNoLeito = { ...paciente };
    pacienteNoLeito.tempoTotal = tempoFinal;
    pacienteNoLeito.tempoAtual = 0;
    
    // Atualiza direto no estado global
    jogo.leitos[indexLeito].ocupado = pacienteNoLeito;
    
    // Remove da fila global (precisa achar o index correto pelo ID)
    const idx = jogo.filaDeEspera.findIndex(p => p.id === paciente.id);
    if (idx !== -1) jogo.filaDeEspera.splice(idx, 1);
};

// Alternar Modo
const toggleAutomatico = () => {
    jogo.modoAutomaticoEnfermaria = !jogo.modoAutomaticoEnfermaria;
};

// --- HELPER PARA NOME DE PROFISSÃO CORRETO (SEXO) ---
const getNomeProfissaoCorreto = (paciente) => {
    // 1. Tenta achar o funcionário vivo na lista global pelo ID
    const funcionarioReal = jogo.funcionarios.find(f => f.id === paciente.funcionarioId);
    
    // 2. Se achar, usa a função do sistema que já trata o sexo (Enfermeiro/Enfermeira)
    if (funcionarioReal) {
        return nomeProfissao(funcionarioReal);
    }
    
    // 3. Fallback: Se não achar (ex: demitido), usa o texto salvo
    return paciente.profissao || 'Aldeão';
};
const getNomeImagem = (idOriginal) => {
    if (!idOriginal) return 'padrao'; // Proteção contra nulos

    const mapa = {
        'gerente': 'administrador',
        'prefeito': 'lorde',
        'bancario': 'tesoureiro',
        'medico': 'enfermeiro',
        'cientista': 'academico'
    };
    
    // Se o nome estiver no mapa, troca. Se não, usa o original.
    return mapa[idOriginal] || idOriginal;
};

// Mantemos o helper de doença e o toggle do leito
const getNomeDoenca = (idDoenca) => {
    if (!idDoenca) return 'Desconhecido';
    const info = tiposFerimentos[idDoenca];
    return info ? info.nome : idDoenca;
};
// --- HELPER PARA COR DO LÍQUIDO (MAGITECH) ---
const getCorLiquido = (idDoenca) => {
    // 1. Descobre qual categoria de item cura essa doença (ex: 'plasma_selante_I')
    const itemFull = tiposFerimentos[idDoenca]?.itemCura || '';

    // 2. TRUQUE: Remove o sufixo de grau (_I, _II, _III, _IV) para pegar a base
    // Ex: 'plasma_selante_IV' vira 'plasma_selante'
    // Ex: 'neutralizar_II' vira 'neutralizar'
    const categoriaBase = itemFull.replace(/_[IV]+$/, '');

    // 3. Mapa de Cores por Categoria (Use o nome base aqui)
    const paleta = {
        // Sangue (Vermelho)
        'plasma_selante':   'linear-gradient(to top, #c0392b, #e74c3c)', 
        
        // Regeneração (Verde)
        'soro_regenerador': 'linear-gradient(to top, #00b894, #55efc4)', 
        
        // Infecção (Ciano/Turquesa)
        'solucao_esteril':  'linear-gradient(to top, #16a085, #1abc9c)', 
        
        // Ossos (Cinza/Prateado)
        'resina_calcaria':  'linear-gradient(to top, #7f8c8d, #bdc3c7)', 
        
        // Pele/Fogo (Laranja)
        'derme_sintetica':  'linear-gradient(to top, #d35400, #e67e22)', 
        
        // Veneno (Roxo) - Adicionei as duas variações de nome pra garantir
        'neutralizador':    'linear-gradient(to top, #8e44ad, #9b59b6)', 
        
        // Vigor (Amarelo)
        'estimulante':      'linear-gradient(to top, #f39c12, #f1c40f)', 
        
        // Mente (Azul Profundo)
        'soro_psiquico':    'linear-gradient(to top, #2c3e50, #3498db)', 
    };

    // Retorna a cor específica ou o Verde Padrão se não achar
    return paleta[categoriaBase] || 'linear-gradient(to top, #00b894, #55efc4)';
};
</script>

<template>
    <div class="mythic-container">
    
        <div class="header-titulo-aba">
            <div class="titulo-nivel">
                <h2>🔪 Enfermaria</h2>
            </div>
            <div class="info-nivel">
                <span class="badge-nivel">Nível {{ jogo.enfermaria }}</span>
            </div>
        </div>
        
        <div class="abas-taverna">
            <button :class="{ ativo: abaAtual === 'tratamento' }" @click="abaAtual = 'tratamento'">Tratamento</button>
            
            <button 
                :class="{ 'ativo': abaAtual === 'bercario', 'bloqueado': !enfermeiroAtivo }" 
                @click="abaAtual = 'bercario'"
                :disabled="!enfermeiroAtivo"
                :title="!enfermeiroAtivo ? 'Requer um Enfermeiro contratado (O Ajudante não sabe aprimorar itens)' : ''">
                Síntese <span v-if="!enfermeiroAtivo" style="margin-left:5px; font-size: 0.9em;">🔒</span>
            </button>
        </div>
    
        <div v-if="abaAtual === 'tratamento'">
            <div class="painel-auto-switch">
                <div class="info-switch">
                    <span class="titulo-auto">Modo Automático</span>
                    <span class="sub-auto" v-if="jogo.modoAutomaticoEnfermaria">Penalidade: +10% tempo de cura</span>
                    <span class="sub-auto" v-else>Inativo (Ativa após 30min ocioso)</span>
                </div>
                
                <button 
                    class="btn-toggle-auto" 
                    :class="{ 'ligado': jogo.modoAutomaticoEnfermaria }"
                    @click="toggleAutomatico">
                    {{ jogo.modoAutomaticoEnfermaria ? 'ON' : 'OFF' }}
                </button>
            </div>
            <div class="painel-controle-global">
<!-- INICIO DO CARD FUNCIONARIO CONTRATADO-->
            <div v-if="enfermeiroAtivo" class="card-funcionario funcionario-ativo" :style="{ borderColor: corTier(enfermeiroAtivo.tier) }">
                
                <div class="card-topo" :style="{ backgroundColor: corTier(enfermeiroAtivo.tier) }">
                    <div class="topo-esquerda">
                        <span class="tier-badge">{{ enfermeiroAtivo.tier }}</span>
                        <span class="card-nome">{{ enfermeiroAtivo.nome }}</span>
                    </div>
                    
                    <div class="molde-icone-prof">
                        <img src="/assets/ui/i_enfermeiro.png" class="img-prof-inner" title="Enfermeiro">
                    </div>
                </div>

                <div class="card-mid">
                    <div class="avatar-box">
                         <img :src="`/assets/faces/${enfermeiroAtivo.raca}/${enfermeiroAtivo.imagem}.png`" class="avatar-func">
                    </div>

                    <div class="tabela-dados-func">
                        <div class="linha-dado">
                            <span class="dado-label">Profissão:</span>
                            <span class="dado-valor">{{ nomeProfissao(enfermeiroAtivo) }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Raça:</span>
                            <span class="dado-valor capitalize">{{ enfermeiroAtivo.raca }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Sexo:</span>
                            <span class="dado-valor">{{ enfermeiroAtivo.sexo === 'masculino' ? 'Masculino' : 'Feminino' }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Salário:</span>
                            <span class="dado-valor">
                                {{ formatarNumero(enfermeiroAtivo.salario) }} 
                                <img src="/assets/ui/icone_goldC.png" class="tiny-coin">
                            </span>
                        </div>
                    </div>
                </div>

                <div class="rodape-card">
                    <div class="info-produtividade">
                        Redução de Tempo: <span class="verde">{{ statsEnfermeiro.textoDisplay }}</span>
                    </div>
                    <div class="frase-efeito">
                        "{{ enfermeiroAtivo.frase || 'Curarei os Feridos!' }}"
                    </div>
                </div>
            </div>
<!-- FIM DO CARD FUNCIONARIO CONTRATADO-->
<!-- INICIO DO CARD FUNCIONARIO AJUDANTE-->
            <div v-else class="card-funcionario funcionario-ativo" style="border-color: #95a5a6; opacity: 0.9;">
                
                <div class="card-topo" style="background-color: #95a5a6;">
                    <div class="topo-esquerda">
                        <span class="tier-badge" style="background: rgba(0,0,0,0.2)">-</span>
                        <span class="card-nome">Aprendiz da Vila</span>
                    </div>
                    
                    <div class="molde-icone-prof">
                        <img src="/assets/ui/i_enfermeiro.png" class="img-prof-inner" title="Enfermeiro Interino" style="filter: grayscale(1);">
                    </div>
                </div>

                <div class="card-mid">
                    <div class="avatar-box">
                         <img src="/assets/faces/humano/enfermeiro_m.png" class="avatar-func" style="filter: sepia(0.4);">
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
<!-- FIM DO CARD FUNCIONARIO AJUDANTE-->
                <div class="linha-divisoria"></div>

                <div class="lado-direito-filtros">
                    <div class="titulo-info-cura">
                    </div>

                    <div class="grid-loadout-compacto">
                        <div v-for="slot in slotsVisiveis" :key="slot.key" class="slot-medico-mini">
                            
                            <span class="nome-cat-mini">{{ slot.info.nome }}</span>

                            <div class="wrapper-botoes">
                                
                                <button class="btn-icone-mini" @click="verInfoCategoria(slot)" :title="slot.itemAtual.nome">
                                    <div class="emoji-mini">{{ slot.itemAtual.icon }}</div>
                                    
                                    <div class="barra-qtd" :class="{'zerado': (jogo.itens[slot.itemAtual.id] || 0) === 0}">
                                        {{ jogo.itens[slot.itemAtual.id] || 0 }}
                                    </div>
                                </button>

                                <button class="btn-gear-lateral" @click="abrirTroca(slot.key)" title="Trocar Item">
                                    ⚙️
                                </button>
                            </div>

                        </div>
                    </div>

                    <div v-if="modalTrocaAberto" class="overlay-selecao" @click.self="modalTrocaAberto = false">
                        <div class="box-selecao">
                            <h4>Escolher Equipamento</h4>
                            <div class="lista-opcoes">
                                <button 
                                    v-for="opcao in opcoesParaTroca" 
                                    :key="opcao.id" 
                                    class="btn-opcao-item"
                                    :class="{'ativo': loadout[opcao.categoria] === opcao.id}"
                                    @click="selecionarItem(opcao)">
                                    
                                    <span class="icon-opt">{{ opcao.icon }}</span>
                                    <div class="dados-opt">
                                        <span class="nome-opt">{{ opcao.nome }}</span>
                                        <small class="desc-opt">Velocidade: {{ opcao.fatorCura }}x | Estoque: {{ jogo.itens[opcao.id] || 0 }}</small>
                                    </div>
                                    
                                    <span v-if="loadout[opcao.categoria] === opcao.id" class="check">✅</span>
                                </button>
                            </div>
                            <button class="btn-fechar-sel" @click="modalTrocaAberto = false">Fechar</button>
                        </div>
                    </div>
                </div>

            </div>
            <div class="area-laboratorio">
            <h3 class="titulo-tech">
                <span class="tech-icon">⚗️</span> Câmaras de Cura
            </h3>
            
            <div class="grid-tanques">
                <div v-for="(leito, index) in leitos" :key="index" class="tanque-container">
                    
                    <div class="vidro-tanque">
                        <div class="topo-tanque">UNIT-{{ index + 1 }}</div>

                        <div v-if="!leito.ocupado" class="tanque-vazio-state">
                            <span class="piscante">INJETAR<br>COMPOSTO</span>
                        </div>

                        <div v-else class="tanque-ocupado-state">
                            <div class="liquido-cura" 
                            :style="{ 
                                height: (leito.ocupado.tempoAtual / leito.ocupado.tempoTotal * 100) + '%',
                                background: getCorLiquido(leito.ocupado.doenca)
                            }">
                                 <div class="bolha b1"></div><div class="bolha b2"></div>
                            </div>

                            <div class="paciente-suspenso">
                                <img :src="`/assets/ui/i_${getNomeImagem(leito.ocupado.profissao)}.png`" class="img-alquimica">
                            </div>

                            <div class="painel-digital-vidro">
                                <span class="nome-digital">{{ leito.ocupado.nome }}</span>
                                <span class="aviso-perigo">{{ getNomeDoenca(leito.ocupado.doenca) }}</span>
                                <span class="timer-digital">{{ formatarTempo(leito.ocupado.tempoTotal - leito.ocupado.tempoAtual) }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="base-tanque"></div>
                </div>
            </div>
        </div>

        <div class="area-hologramas">
            <h3 class="titulo-tech">
                <span class="tech-icon">💠</span> Lista de Feridos
            </h3>

            <div v-if="filaDeEspera.length === 0" class="aviso-tech">
                SISTEMA OCIOSO. NENHUMA ENTRADA.
            </div>

            <div class="grid-tablets">
                <div v-for="paciente in filaDeEspera" :key="paciente.id" 
                     class="tablet-runico"
                     @click="alocarPaciente(paciente, leitos.findIndex(l => !l.ocupado))">
                    
                    <div class="tablet-header">
                        <div class="moldura-img-tech">
                            <img :src="`/assets/ui/i_${getNomeImagem(paciente.profissao)}.png`" class="img-tech-mini">
                        </div>
                        <div class="tablet-id">
                            <span class="nome-tech">{{ paciente.nome }}</span>
                            <span class="classe-tech">{{ getNomeProfissaoCorreto(paciente) }}</span>
                        </div>
                    </div>

                    <div class="tablet-body">
                        <div class="linha-dado">
                            <span class="label-tech">STATUS:</span>
                            <span class="valor-tech alerta">{{ getNomeDoenca(paciente.doenca) }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="label-tech">ESTIMATIVA:</span>
                            <span class="valor-tech">{{ formatarTempo(paciente.tempoTotal) }}</span>
                        </div>
                    </div>

                    <div class="tablet-footer">
                        <div class="botao-iniciar-protocolo">
                            INICIAR TRATAMENTO
                        </div>
                    </div>

                    <div class="scan-line"></div>
                </div>
            </div>
        </div>
        </div>

        <div class="conteudo-pagina">
            <slot></slot>
        </div>

        <button v-if="mostrarBotaoTopo" 
                class="btn-scroll-topo" 
                @click="voltarAoTopo" 
                title="Voltar ao Topo">
            ▲
        </button>
    </div>
</template>

<style scoped>
@import '../css/importantes.css';
* { box-sizing: border-box; }

/* Estilos da Tabela de Cura */
.titulo-info-cura {
    width: 100%;
    text-align: center;
    font-weight: bold;
    color: #7f8c8d;
    border-bottom: 2px solid #ecf0f1;
    padding-bottom: 5px;
    margin-bottom: 8px;
    display: flex; flex-direction: column;
}

.tabela-cura { width: 80%; display: flex; flex-direction: column; gap: 4px; margin-left: 15px; }

.linha-cura {
    display: flex; justify-content: space-between;
    background: #fff;
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 0.85em;
    border: 1px solid #f1f2f6;
}
.nome-ferimento { font-weight: 600; color: #2c3e50; }
.tempo-ferimento { color: #7f8c8d; }
.abas-taverna button.bloqueado {
    opacity: 0.6;
    cursor: not-allowed;
    background: #95a5a6;
    color: #ecf0f1;
    border-color: #7f8c8d;
    box-shadow: none;
}

.grid-leitos {
    display: grid;
    /* Isso aqui é a mágica: cria colunas automáticas de no mínimo 100px */
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
    padding: 10px;
    background: #bdc3c7; /* Cor do chão da enfermaria */
    border-radius: 8px;
    border: 4px solid #7f8c8d; /* Paredes de pedra */
}

/* BOX DO ALTAR (LEITO) */
/* === ESTILOS GERAIS === */
.titulo-secao {
    color: #2c3e50;
    border-bottom: 3px solid #dfe6e9;
    padding-bottom: 5px;
    margin-bottom: 15px;
    font-size: 1.1em;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* === ALTARES DE CURA (GRID) === */
.grid-altares {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
}

/* O CARTÃO DO ALTAR */
.altar-container {
    background: #fdfdfd;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    border: 1px solid #dcdde1;
    overflow: hidden;
    display: flex; flex-direction: column;
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
    cursor: pointer;
}
.altar-container:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
.altar-container.ocupado { border: 1px solid #a29bfe; background: #f8f9fe; }

/* Cabeçalho do Altar */
.altar-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 10px; background: rgba(0,0,0,0.03);
    font-size: 0.75em; font-weight: bold;
}
.status-indicator { color: #6c5ce7; }
.status-indicator.livre { color: #27ae60; }

/* Área do Avatar (Palco) */
.altar-palco {
    height: 100px;
    display: flex; justify-content: center; align-items: center;
    position: relative;
    background: radial-gradient(circle, rgba(162,155,254,0.1) 0%, rgba(255,255,255,0) 70%);
}

.img-paciente-altar {
    width: 60px; height: 60px; z-index: 2;
    filter: drop-shadow(0 5px 5px rgba(0,0,0,0.2));
}

/* Círculo Mágico (Animação) */
.circulo-magico {
    position: absolute; width: 80px; height: 80px;
    border: 2px dashed #a29bfe; border-radius: 50%;
    animation: spin 10s linear infinite; opacity: 0.5; z-index: 1;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Ícone de Vazio */
.icone-vazio { font-size: 2em; opacity: 0.3; filter: grayscale(1); }

/* Painel de Info (Base) */
.altar-painel-info {
    padding: 10px;
    background: #fff;
    border-top: 1px solid #f1f2f6;
    display: flex; flex-direction: column; gap: 6px;
}
.nome-destaque { font-weight: 800; font-size: 0.85em; color: #2d3436; text-align: center; display: block;}
.doenca-destaque { font-size: 0.7em; color: #e17055; text-align: center; display: block; font-weight: bold; margin-bottom: 4px; }

/* Barra de Cura */
.wrapper-barra-cura { display: flex; flex-direction: column; gap: 2px; }
.barra-fundo {
    width: 100%; height: 8px; background: #dfe6e9; border-radius: 4px; overflow: hidden;
}
.barra-enchimento {
    height: 100%; background: linear-gradient(90deg, #00b894, #55efc4);
    transition: width 0.3s linear;
}
.tempo-restante { font-size: 0.65em; color: #636e72; text-align: right; font-weight: bold; }

.altar-painel-vazio { padding: 15px; text-align: center; color: #b2bec3; font-size: 0.8em; font-style: italic; }


/* === HALL DOS FERIDOS (LISTA RPG) === */
.lista-cards-rpg {
    display: flex; flex-direction: column; gap: 8px;
}

.ficha-paciente {
    display: flex; align-items: center;
    background: #fff;
    border: 1px solid #dcdde1;
    border-left: 4px solid #e17055; /* Indicador de urgência */
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s;
}
.ficha-paciente:hover {
    background: #fff5f3;
    transform: translateX(5px);
    border-color: #fab1a0;
}

/* Avatar da Ficha */
.ficha-avatar-box { position: relative; margin-right: 12px; }
.ficha-avatar {
    width: 45px; height: 45px; border-radius: 6px;
    background: #f1f2f6; border: 1px solid #dfe6e9;
}

/* Dados da Ficha */
.ficha-dados { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.ficha-topo { display: flex; align-items: baseline; gap: 8px; }
.ficha-nome { font-weight: bold; font-size: 0.95em; color: #2d3436; }
.ficha-profissao { font-size: 0.75em; color: #636e72; text-transform: uppercase; background: #f1f2f6; padding: 1px 5px; border-radius: 4px; }
.tag-doenca { color: #d63031; font-weight: bold; font-size: 0.8em; margin-top: 2px; display: block;}

/* Ação (Direita) */
.ficha-acao {
    display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 80px;
}
.ficha-tempo { font-size: 0.75em; font-weight: bold; color: #0984e3; }
.btn-internar {
    background: #00b894; color: white; border: none;
    padding: 4px 10px; border-radius: 4px;
    font-size: 0.7em; font-weight: 800; cursor: pointer;
    text-transform: uppercase;
}
.btn-internar:hover { background: #00a884; }

/* Empty State */
.empty-state-fila {
    text-align: center; padding: 30px;
    background: #f1f2f6; border-radius: 8px; border: 2px dashed #b2bec3;
    color: #636e72;
}
.emoji-paz { font-size: 2em; display: block; margin-bottom: 10px; }

.leito-numero {
    position: absolute; top: 5px; left: 8px;
    font-size: 0.7em; color: rgba(255,255,255,0.3);
    z-index: 5; font-weight: bold; text-transform: uppercase;
}

.leito-vazio-visual {
    color: rgba(255,255,255,0.1);
    font-weight: bold; text-transform: uppercase; letter-spacing: 2px;
}

/* --- BARRA DESLIZANTE (INTERAÇÃO) --- */
.barra-info-paciente {
    position: absolute;
    bottom: 0; left: 0; width: 100%;
    background: rgba(0, 0, 0, 0.85); /* Fundo escuro semi-transparente */
    backdrop-filter: blur(4px);
    color: #ecf0f1;
    padding: 8px 10px;
    border-top: 1px solid rgba(255,255,255,0.2);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    z-index: 20;
    
    /* Altura inicial (fechado) */
    height: 35px; 
    overflow: hidden;
}

/* Quando a classe 'expandida' é ativada pelo clique */
.barra-info-paciente.expandida {
    height: 100px; /* Altura máxima ao abrir */
    background: rgba(44, 62, 80, 0.95);
    border-top: 2px solid #64ffda; /* Verde mágico */
}

.info-resumo {
    display: flex; justify-content: space-between; align-items: center;
    height: 20px;
}
.nome-paciente { font-weight: bold; font-size: 0.9em; color: #fff; }
.seta-indicadora { font-size: 0.8em; color: #bdc3c7; }

.info-detalhes-ocultos {
    margin-top: 10px;
    display: flex; flex-direction: column; gap: 4px;
    font-size: 0.8em; opacity: 0;
    transition: opacity 0.2s ease-in;
}

.barra-info-paciente.expandida .info-detalhes-ocultos {
    opacity: 1; /* Mostra o texto ao abrir */
}

/* Timer flutuante no topo (mudou de lugar) */
.ui-cura-topo {
    position: absolute; top: 10px; right: 10px;
    display: flex; flex-direction: column; align-items: flex-end;
    z-index: 10;
}

/* --- ESTILOS DO HALL DOS FERIDOS (CARDS RPG) --- */
.grid-cards-fila {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    margin-top: 10px;
}
.card-header-rpg {
    background: #f1f2f6;
    padding: 8px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid #e0e0e0;
}

.avatar-fila-rpg {
    width: 35px; height: 35px;
    border-radius: 50%;
    border: 2px solid #dfe6e9;
    background: #fff;
}

.header-texto { display: flex; flex-direction: column; }
.nome-rpg { font-weight: bold; font-size: 0.85em; color: #2c3e50; line-height: 1.1; }
.prof-rpg { font-size: 0.7em; color: #7f8c8d; text-transform: uppercase; }

.card-body-rpg {
    padding: 8px;
    display: flex; flex-direction: column; gap: 4px;
}

.info-linha {
    display: flex; justify-content: space-between;
    font-size: 0.75em;
}
.label { color: #95a5a6; }
.valor-doenca { color: #c0392b; font-weight: bold; } /* Vermelho sangue */
.valor-tempo { color: #2980b9; font-weight: bold; }

.card-footer-rpg {
    background: #27ae60;
    color: white;
    text-align: center;
    font-size: 0.7em;
    padding: 3px;
    font-weight: bold;
    text-transform: uppercase;
}

.aviso-sem-feridos {
    grid-column: 1 / -1;
    text-align: center;
    padding: 20px;
    color: #7f8c8d;
    font-style: italic;
    background: rgba(0,0,0,0.05);
    border-radius: 8px;
}
/* --- ESTANTE DE MEDICAMENTOS --- */
.grid-medicamentos {
    display: flex;
    flex-wrap: wrap; /* Permite quebrar linha se tiver muitos itens */
    gap: 8px;        /* Espaço entre os botões */
    padding: 10px;
    width: 100%;
}

.btn-item-medico {
    position: relative;
    width: 50px;     /* Tamanho fixo pequeno */
    height: 50px;    /* Quadrado perfeito */
    background: #ffffff;
    border: 1px solid #bdc3c7;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 3px rgba(0,0,0,0.1);
}

.btn-item-medico:hover {
    transform: translateY(-2px);
    border-color: #3498db;
    box-shadow: 0 4px 6px rgba(52, 152, 219, 0.3);
}

.btn-item-medico:active {
    transform: scale(0.95);
}
.btn-item-medico.bloqueado {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
    background: #ecf0f1;
}

.icone-grande {
    font-size: 1.6em; /* Tamanho do emoji/ícone */
    line-height: 1;
}

.nome-mini {
    font-size: 0.65em;
    color: #7f8c8d;
    font-weight: bold;
    text-align: center;
    line-height: 1;
}

/* Badge Flutuante (Contador) */
.badge-qtd-item {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #2c3e50;
    color: #fff;
    font-size: 0.65em;
    font-weight: bold;
    min-width: 18px; /* Garante bolinha redonda mesmo com 1 dígito */
    height: 18px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
    z-index: 2;
}
/* --- LOADOUT MÉDICO --- */
.lista-slots-loadout {
    display: flex;
    flex-direction: column; /* Lista vertical */
    gap: 10px;
    padding: 10px;
    width: 100%;
}

.card-slot-medico {
    background: #fff;
    border: 1px solid #bdc3c7;
    border-radius: 8px;
    padding: 5px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 2px 3px rgba(0,0,0,0.05);
}

.topo-slot {
    font-size: 0.7em; font-weight: bold; color: #7f8c8d; text-transform: uppercase;
    border-bottom: 1px solid #f1f2f6; margin-bottom: 4px;
}

.miolo-slot {
    display: flex; justify-content: space-between; align-items: center;
}

/* Botão do Ícone Grande */
.btn-icone-ativo {
    background: #f1f2f6; border: 1px solid #dfe6e9; border-radius: 6px;
    width: 45px; height: 45px; position: relative; cursor: pointer;
}
.emoji-ativo { font-size: 1.5em; }
.badge-qtd.zerado { background: #e74c3c; } /* Fica vermelho se tiver 0 */

/* Botão de Troca (Engrenagem) */
.btn-trocar {
    background: #ecf0f1; border: 1px solid #bdc3c7; border-radius: 4px;
    width: 30px; height: 30px; cursor: pointer; font-size: 1.2em;
    display: flex; align-items: center; justify-content: center;
}
.btn-trocar:hover { background: #bdc3c7; }

.nome-item-atual { font-size: 0.7em; color: #2c3e50; font-weight: bold; margin-top: 2px;}

/* --- MENU DE SELEÇÃO (OVERLAY) --- */
.overlay-selecao {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 50;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(2px); border-radius: 8px;
}
.box-selecao {
    background: #fff; width: 90%; max-height: 90%;
    border-radius: 8px; padding: 10px;
    display: flex; flex-direction: column; gap: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3); overflow-y: auto;
}

.box-selecao h4 { margin: 0; text-align: center; color: #2c3e50; font-size: 0.9em;}

.btn-opcao-item {
    display: flex; align-items: center; gap: 10px;
    background: #f8f9fa; border: 1px solid #dfe6e9;
    padding: 8px; border-radius: 6px; cursor: pointer; text-align: left;
}
.btn-opcao-item:hover { background: #ecf0f1; }
.btn-opcao-item.ativo { border: 2px solid #27ae60; background: #eafaf1; }

.icon-opt { font-size: 1.5em; }
.dados-opt { flex: 1; display: flex; flex-direction: column; }
.nome-opt { font-weight: bold; font-size: 0.85em; color: #2c3e50; }
.desc-opt { font-size: 0.7em; color: #7f8c8d; }
.check { font-size: 1.2em; }
.btn-fechar-sel {
    background: #e74c3c; color: white; border: none; padding: 8px;
    border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8em;
}

/* --- LOADOUT COMPACTO (Grade 4x2) --- */
.grid-loadout-compacto {
    display: grid;
    grid-template-columns: repeat(4, 1fr); 
    gap: 8px 4px; /* Espaçamento entre os itens */
    padding: 5px 0 0 10px;
    width: 100%;
}

.slot-medico-mini {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

/* 1. Nome da Categoria */
.nome-cat-mini {
    font-size: 0.55em;
    color: #7f8c8d;
    font-weight: 800;
    text-transform: uppercase;
    text-align: center;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
}

/* Container para alinhar Ícone e Engrenagem lado a lado */
.wrapper-botoes {
    display: flex;
    align-items: center;
    justify-content: center;
    /* Sombra unificada para parecer uma peça só */
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
}

/* 2. Botão Ícone (Esquerda) */
.btn-icone-mini {
    position: relative;
    width: 38px;
    height: 38px;
    background: #ffffff;
    /* Bordas arredondadas apenas na esquerda */
    border: 1px solid #bdc3c7;
    border-radius: 6px 0 0 6px;
    border-right: none; 
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    z-index: 1;
    overflow: hidden; /* <--- IMPORTANTE: Para cortar a barra nas bordas arredondadas */
}
.btn-icone-mini:hover { background: #fdfdfd; }
.btn-icone-mini:active { transform: scale(0.95); }

.emoji-mini { font-size: 1.4em; line-height: 1; }

/* 3. Botão Engrenagem (Lateral Direita) */
.btn-gear-lateral {
    width: 18px; /* Estreito */
    height: 38px; /* Mesma altura do ícone */
    background: #ecf0f1;
    /* Bordas arredondadas apenas na direita */
    border: 1px solid #bdc3c7;
    border-radius: 0 6px 6px 0;
    cursor: pointer;
    font-size: 0.7em;
    display: flex; align-items: center; justify-content: center;
    color: #95a5a6;
    transition: all 0.2s;
}
.btn-gear-lateral:hover {
    background: #bdc3c7;
    color: #fff;
    width: 22px; /* Efeito visual: cresce um pouquinho no hover */
}

/* Nova Barra de Quantidade Inferior */
.barra-qtd {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    
    /* Fundo escuro semi-transparente */
    background: rgba(0, 0, 0, 0.65); 
    color: #fff;
    
    font-size: 0.6em;
    font-weight: bold;
    text-align: center;
    line-height: 1;
    padding: 3px 0; /* Altura suficiente apenas para o número */
    z-index: 5;
}

/* Se estiver zerado, fundo vermelho semi-transparente para alertar */
.barra-qtd.zerado { 
    background: rgba(231, 76, 60, 0.85); 
}
.painel-auto-switch {
    display: flex; justify-content: space-between; align-items: center;
    background: #2c3e50; color: #ecf0f1;
    padding: 10px 15px; border-radius: 8px;
    margin-bottom: 10px; border: 2px solid #34495e;
}
.info-switch { display: flex; flex-direction: column; }
.titulo-auto { font-weight: bold; font-size: 1em; color: #64ffda; } /* Verde neon */
.sub-auto { font-size: 0.75em; color: #bdc3c7; }

.btn-toggle-auto {
    width: 60px; height: 30px;
    border-radius: 20px; border: none; font-weight: bold;
    background: #e74c3c; color: #fff; cursor: pointer;
    transition: all 0.3s; box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
}
.btn-toggle-auto.ligado {
    background: #2ecc71; box-shadow: 0 0 10px #2ecc71;
}

/* Ajuste Mobile para ficar 1 coluna se for muito pequeno */
@media(max-width: 400px) {
    .grid-medicamentos { grid-template-columns: 1fr; }
}
/* --- ANIMAÇÕES --- */
@keyframes girar {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes flutuar {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

/* === ESTILO FINAL: MAGITECH === */

.titulo-tech {
    font-family: 'Courier New', monospace;
    color: #2c3e50;
    text-transform: uppercase;
    letter-spacing: 2px;
    border-bottom: 2px solid #bdc3c7;
    padding-bottom: 10px;
    margin-bottom: 30px;
    display: flex; align-items: center; gap: 10px;
}
.tech-icon { font-size: 1.2em; filter: grayscale(1); }

/* --- REUTILIZANDO OS TANQUES (CÓDIGO OTIMIZADO) --- */
.grid-tanques {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 30px;
    margin-bottom: 60px;
}
.tanque-container { display: flex; flex-direction: column; align-items: center; }

.vidro-tanque {
    width: 120px; height: 180px;
    background: rgba(223, 230, 233, 0.4);
    border: 2px solid #b2bec3;
    border-radius: 50px 50px 10px 10px;
    position: relative; overflow: hidden;
    box-shadow: inset 0 0 15px rgba(0, 184, 148, 0.2);
}

.topo-tanque {
    position: absolute; top: 5px; width: 100%; text-align: center;
    font-size: 0.6em; font-family: monospace; z-index: 10; color: #636e72;
}

.liquido-cura {
    position: absolute; bottom: 0; left: 0; width: 100%;
    opacity: 0.7; transition: height 0.5s linear; z-index: 1;
}
.paciente-suspenso {
    position: absolute; width: 100%; height: 100%;
    display: flex; justify-content: center; align-items: center; z-index: 2;
}
.img-alquimica { width: 60px; filter: drop-shadow(0 0 5px white); animation: flutuar 3s infinite ease-in-out; }

@keyframes flutuar { 0%, 100% {transform: translateY(0);} 50% {transform: translateY(-5px);} }

.painel-digital-vidro {
    position: absolute; bottom: 10px; width: 90%; left: 5%;
    background: rgba(0,0,0,0.8); color: #55efc4;
    padding: 5px; border-radius: 4px; text-align: center;
    font-family: monospace; font-size: 0.7em; z-index: 5;
    border: 1px solid #55efc4;
}
.nome-digital { display: block; color: white; font-weight: bold; margin-bottom: 2px; }
.aviso-perigo { color: #ff7675; font-weight: bold; display: block;}
.timer-digital { font-size: 1.1em; letter-spacing: 1px; }

.tanque-vazio-state {
    height: 100%; display: flex; align-items: center; justify-content: center;
    font-family: monospace; color: #b2bec3; font-size: 0.8em;
}
.piscante { animation: piscar 1s infinite; }
@keyframes piscar { 0%, 100% {opacity: 1;} 50% {opacity: 0.3;} }

.base-tanque { width: 100px; height: 10px; background: #636e72; margin-top: -2px; border-radius: 0 0 10px 10px; }


/* --- NOVA TRIAGEM: TABLETS RÚNICOS --- */
.grid-tablets {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px;
}

.tablet-runico {
    position: relative;
    background: #fff; /* Fundo limpo */
    border: 1px solid #bdc3c7;
    border-left: 4px solid #00b894; /* Borda lateral tech */
    border-radius: 4px;
    padding: 10px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.tablet-runico:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 184, 148, 0.2);
    border-color: #00b894;
}

/* Cabeçalho do Tablet */
.tablet-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border-bottom: 1px dashed #dfe6e9; padding-bottom: 5px; }

.moldura-img-tech {
    width: 40px; height: 40px;
    border: 1px solid #bdc3c7; padding: 2px; border-radius: 4px;
}
.img-tech-mini { width: 100%; height: 100%; object-fit: contain; }

.tablet-id { display: flex; flex-direction: column; }
.nome-tech { font-weight: bold; color: #2d3436; font-size: 0.9em; font-family: sans-serif; }
.classe-tech { font-size: 0.7em; color: #636e72; text-transform: uppercase; letter-spacing: 1px; }

/* Corpo do Tablet */
.tablet-body { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.linha-dado { display: flex; justify-content: space-between; font-size: 0.75em; font-family: monospace; }
.label-tech { color: #b2bec3; }
.valor-tech { font-weight: bold; color: #2d3436; }
.valor-tech.alerta { color: #d63031; }

/* Rodapé / Botão */
.tablet-footer { text-align: center; }
.botao-iniciar-protocolo {
    background: #2d3436; color: #55efc4;
    font-size: 0.7em; padding: 5px;
    font-family: monospace; font-weight: bold;
    border-radius: 2px; letter-spacing: 1px;
    transition: background 0.2s;
}
.tablet-runico:hover .botao-iniciar-protocolo {
    background: #00b894; color: white;
}

/* Efeito Scan Line (Decorativo) */
.scan-line {
    position: absolute; top: 0; left: 0; width: 100%; height: 2px;
    background: rgba(0, 184, 148, 0.5);
    opacity: 0; pointer-events: none;
}
.tablet-runico:hover .scan-line {
    opacity: 1; animation: scan 1s linear infinite;
}
@keyframes scan { 0% {top: 0;} 100% {top: 100%;} }

.aviso-tech {
    font-family: monospace; text-align: center; padding: 20px;
    color: #b2bec3; border: 1px dashed #b2bec3;
}
</style>