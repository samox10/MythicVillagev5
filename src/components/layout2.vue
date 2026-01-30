<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { jogo, DADOS_PROCESSAMENTO, mostrarAviso, obterBuffRaca } from '../jogo.js';
import { corTier } from '../funcionarios.js';

const abaAtual = ref('tratamento');
const mostrarBotaoTopo = ref(false);

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
    // Procura o primeiro enfermeiro que NÃO esteja em greve
    const profissional = jogo.funcionarios.find(f => f.profissao === 'enfermeiro' && f.diasEmGreve === 0);
    
    if (profissional) {
        // Calcula o buff racial
        const buffPct = obterBuffRaca(profissional);
        const poderFinal = (profissional.bonus * (1 + (buffPct / 100)));

        return {
            tipo: 'profissional',
            nome: profissional.nome,
            raca: profissional.raca,
            sexo: profissional.sexo,
            imagem: profissional.imagem,
            tier: profissional.tier,
            poder: poderFinal.toFixed(2),
            salario: profissional.salario,
            frase: profissional.frase
        };
    } 
    // CORREÇÃO: Retorna null se não tiver profissional, para ativar o v-else do Ajudante corretamente
    return null;
});

const statsEnfermeiro = computed(() => {
    // Proteção: Se não tiver enfermeiro, retorna valor padrão
    if (!enfermeiroAtivo.value) return { tempo: '1.00' };
    
    return {
        tempo: enfermeiroAtivo.value.poder
    };
});

// --- 2. HELPERS VISUAIS ---
const formatarNumero = (num) => {
    return num ? num.toLocaleString('pt-BR') : '0';
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
                BERÇARIO <span v-if="!enfermeiroAtivo" style="margin-left:5px; font-size: 0.9em;">🔒</span>
            </button>
        </div>

        <div v-if="abaAtual === 'aba1'">
            <div class="painel-controle-camaraProcessamento">
                
                <div v-if="enfermeiroAtivo" class="card-funcionario enfermeiro-ativo" :style="{ borderColor: corTier(enfermeiroAtivo.tier) }">
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
                                <span class="dado-valor capitalize">{{ enfermeiroAtivo.profissao }}</span>
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
                            Poder de Cura: <span class="verde">{{ enfermeiroAtivo.poderCura }}x</span>
                        </div>
                        <div class="frase-efeito">
                            "{{ enfermeiroAtivo.frase || 'Pronto para o corte!' }}"
                        </div>
                    </div>
                </div>

                <div v-else class="card-funcionario enfermeiro-ativo" style="border-color: #95a5a6; opacity: 0.9;">
                    <div class="card-topo" style="background-color: #95a5a6;">
                        <div class="topo-esquerda">
                            <span class="tier-badge" style="background: rgba(0,0,0,0.2)">-</span>
                            <span class="card-nome">Ajudante da Vila</span>
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

                <div class="linha-divisoria"></div>

                <div class="lado-direito-filtros">
                    <div class="botoes-categoria-wrapper"></div>
                </div>
            </div>
        </div>
        <div class="abas-taverna" v-if="abas && abas.length > 0">
            <button 
                v-for="aba in abas" 
                :key="aba.key"
                :class="{ ativo: abaAtual === aba.key }" 
                @click="emit('update:abaAtual', aba.key)"
            >
                {{ aba.label }}
            </button>
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

/* --- PAINEL DE CONTROLE --- */
.painel-controle-camaraProcessamento {
    display: flex; 
    align-items: center; 
    justify-content: space-between;
    background: #ecf0f1; 
    border: 1px solid #bdc3c7; 
    border-radius: 8px;
    margin: 4px 0; 
    padding: 10px; 
    gap: 15px; 
    
    /* Altura automática mas com mínimo para não colapsar */
    height: auto; 
    min-height: 180px; 
    
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* --- CARD GENÉRICO (Estrutura) --- */
.enfermeiro-ativo {
    width: 100%;
    max-width: 230px; 
    margin: 0;  
    background: #ffffff;
    border-width: 2px; 
    border-style: solid;
    border-radius: 8px; 
    overflow: hidden;
    display: flex; 
    flex-direction: column;
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    flex-shrink: 0; 
}

/* Miolo do Card */
.enfermeiro-ativo .card-mid { 
    flex: 1; 
    display: flex; 
    align-items: center; 
    padding: 5px 5px 5px 15px; 
    background: #fff; 
}

/* --- HEADER DO CARD --- */
.card-topo {
    position: relative;
    display: flex;
    align-items: center;
    padding: 1px 5px;
    padding-right: 35px;
    color: #fff; 
    font-weight: bold;
    height: 32px;
}

.molde-icone-prof {
    position: absolute;
    top: 2px;
    right: 6px;
    background-color: #ffffff;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid rgba(255, 255, 255, 0.5);
    z-index: 10;
}

.img-prof-inner { width: 19px; height: 19px; object-fit: contain; }
.topo-esquerda { display: flex; align-items: center; gap: 6px; }
.tier-badge { background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }

/* --- CONTEÚDO (Avatar e Tabela) --- */
.avatar-box {
    width: 80px;
    display: flex; align-items: center; justify-content: center;
    background: #f1f2f6; border-right: 1px solid #dfe4ea;
}
.avatar-func { 
    width: 90px;
    height: 90px;
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

/* --- RODAPÉ --- */
.rodape-card {
    background: #fff;
    border-top: 1px solid #f1f2f6;
    padding: 6px 4px;
    text-align: center;
    display: flex; flex-direction: column; gap: 2px;
}
.info-produtividade { font-size: 0.75em; color: #2c3e50; font-weight: 600; }
.verde { color: #27ae60; }
.frase-efeito { font-size: 0.7em; font-style: italic; color: #a4b0be; }

/* --- OUTROS --- */
.linha-divisoria { width: 2px; height: 70%; background: #bdc3c7; opacity: 0.6; }

.lado-direito-filtros { 
    flex: 1; 
    display: flex; 
    flex-direction: column; 
    padding: 5px; 
    justify-content: center; 
    align-items: center;
}

.abas-taverna button.bloqueado {
    opacity: 0.6;
    cursor: not-allowed;
    background: #95a5a6;
    color: #ecf0f1;
    border-color: #7f8c8d;
    box-shadow: none;
}

@media(max-width: 768px) {
    .painel-controle-camaraProcessamento { flex-direction: column; height: auto; }
}
</style>