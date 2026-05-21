import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDtc5jCTDrcweaPUfTS_OoZQcGJsNhQV0k",
    authDomain: "agrinho26.firebaseapp.com",
    databaseURL: "https://agrinho26-default-rtdb.firebaseio.com",
    projectId: "agrinho26",
    storageBucket: "agrinho26.firebasestorage.app",
    messagingSenderId: "994333789680",
    appId: "1:994333789680:web:f7d6c93f430ac41f9ce135"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elementos da tela
const btnEntrar = document.getElementById('btn-entrar');
const inputNome = document.getElementById('player-name');
const lobby = document.getElementById('lobby');
const gameBoard = document.getElementById('game-board');
const listaJogadores = document.getElementById('jogadores-conectados');
const txtSolo = document.getElementById('status-solo');
const txtSementes = document.getElementById('recursos-moedas');
const txtFertilizantes = document.getElementById('recursos-fertilizantes');

// Elementos do Pop-up Customizado
const popupContainer = document.getElementById('popup-container');
const popupMensagem = document.getElementById('popup-mensagem');
const popupIcone = document.getElementById('popup-icone');
const btnPopupOk = document.getElementById('btn-popup-ok');

// Elemento visual do Turno
const txtTurno = document.getElementById('turno-display'); 

// Estado do Jogador Atual
let playerId = null;
let minhaVez = false;

// Atributos iniciais da fazenda
let meuSolo = 100;
let minhasSementes = 100;
let meusFertilizantes = 4;
let meusPontos = 0;
let jaPlantou = false;
let turnoAtualPartida = 1;

// Função para disparar o Alerta customizado
function mostrarAlerta(mensagem, icone = "📢") {
    popupIcone.innerText = icone;
    popupMensagem.innerText = mensagem;
    popupContainer.classList.remove('hidden');
}

// Fecha o pop-up ao clicar no botão
btnPopupOk.addEventListener('click', () => {
    popupContainer.classList.add('hidden');
});

// Ação de Entrar no Jogo
btnEntrar.addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    if (!nome) return mostrarAlerta("Digite um nome válido!", "⚠️");

    playerId = "player_" + Date.now();
    const playerRef = ref(db, 'jogadores/' + playerId);
    
    try {
        // Verifica se a lista de jogadores está vazia antes de entrar.
        const jogadoresSnapshot = await get(ref(db, 'jogadores/'));
        const existemJogadores = jogadoresSnapshot.exists();

        if (!existemJogadores) {
            // Força o reset total da partida antiga para evitar lixo eletrônico no banco
            await set(ref(db, 'partida'), {
                numeroTurno: 1,
                turnoAtual: playerId, 
                vencedor: null,
                eventoAtual: {
                    nome: "Tempo Limpo",
                    icone: "🌤️",
                    descricao: "Condições ideais para o manejo.",
                    tipo: "normal",
                    idRodada: Date.now()
                }
            });
            window.ultimaRodadaEfeito = null;
        }

        // Registra o novo jogador no banco
        await set(playerRef, {
            nome: nome,
            pontuacao: meusPontos,
            solo: meuSolo,
            sementes: minhasSementes,
            fertilizantes: meusFertilizantes,
            plantou: jaPlantou,
            online: true
        });

        // Configura o disconnect para limpar o jogador caso feche a aba
        onDisconnect(playerRef).remove();

        // Altera a interface visual
        lobby.classList.add('hidden');
        gameBoard.classList.remove('hidden');

        txtSolo.innerText = meuSolo + "%";
        txtSementes.innerText = minhasSementes + " sementes";
        txtFertilizantes.innerText = meusFertilizantes;

        // Inicia as escutas do jogo de forma segura
        iniciarEscutasDoJogo();

    } catch (error) {
        console.error("Erro ao entrar na partida:", error);
        mostrarAlerta("Erro ao conectar com o servidor. Verifique o Firebase.", "❌");
    }
});

// Centraliza todas as escutas em tempo real do Firebase de forma limpa
function iniciarEscutasDoJogo() {

    // 1. Escuta a lista de jogadores cadastrados e exibe na tela
    onValue(ref(db, 'jogadores/'), (snapshot) => {
        const dados = snapshot.val();
        listaJogadores.innerHTML = "<h3>Produtores na Partida:</h3>";
        
        if (dados) {
            Object.keys(dados).forEach(id => {
                listaJogadores.innerHTML += `
                    <p>🚜 <b>${dados[id].nome}</b> <br>
                    🏅 Pontos: ${dados[id].pontuacao} | 🌱 Solo: ${dados[id].solo}% | 📦 Sementes: ${dados[id].sementes} | 🧪 Fertilizantes: ${dados[id].fertilizantes ?? 4}</p>
                    <hr style="border: 0.5px dashed #ccc;">
                `;
            });
        }
    });

    // 2. Escuta o número do Turno global da partida
    onValue(ref(db, 'partida/numeroTurno'), (turnoSnapshot) => {
        turnoAtualPartida = turnoSnapshot.val() || 1;
        if (txtTurno) {
            txtTurno.innerText = turnoAtualPartida;
        }
    });

    // 3. Escuta de quem é a vez atual de jogar (Gerenciador de Turnos)
    onValue(ref(db, 'partida/turnoAtual'), (snapshot) => {
        const jogadorDoTurno = snapshot.val();
        const statusTexto = document.getElementById('status');
        const botoes = document.querySelectorAll('.btn-acao');

        if (!jogadorDoTurno) {
            set(ref(db, 'partida/turnoAtual'), playerId);
            return;
        }

        if (jogadorDoTurno === playerId) {
            minhaVez = true;
            statusTexto.innerText = `🟢 Turno ${turnoAtualPartida} - É a sua vez de cuidar da fazenda!`;
            botoes.forEach(b => {
                if(b.id !== 'btn-reiniciar') b.disabled = false;
            });
        } else {
            minhaVez = false;
            get(ref(db, `jogadores/${jogadorDoTurno}`)).then((playerSnap) => {
                const nomeOponente = playerSnap.exists() ? playerSnap.val().nome : "Outro produtor";
                statusTexto.innerText = `⏳ Turno ${turnoAtualPartida} - Vez de: ${nomeOponente}...`;
            });
            botoes.forEach(b => {
                if(b.id !== 'btn-reiniciar') b.disabled = true;
            });
        }
    });

    // 4. Escuta o Vencedor da Partida
    onValue(ref(db, 'partida/vencedor'), (snapshot) => {
        const vencedor = snapshot.val();
        const painelAcoes = document.getElementById('Painel-Acoes');
        const telaFimJogo = document.getElementById('tela-fim-jogo');
        const textoVencedor = document.getElementById('texto-vencedor');
        const statusTexto = document.getElementById('status');

        if (vencedor) {
            minhaVez = false;
            statusTexto.innerText = "🏁 Partida Encerrada!";
            painelAcoes.classList.add('hidden');
            telaFimJogo.classList.remove('hidden');
            textoVencedor.innerText = `O Produtor ${vencedor} alcançou a meta de sustentabilidade e venceu a partida! 🌾🚜`;
        } else {
            painelAcoes.classList.remove('hidden');
            telaFimJogo.classList.add('hidden');
        }
    });

    // 5. Escuta o Clima e aplica as intempéries climáticas
    onValue(ref(db, 'partida/eventoAtual'), (snapshot) => {
        const evento = snapshot.val();
        const txtClima = document.getElementById('clima-atual');

        if (!evento) {
            txtClima.innerText = "🌤️ Clima: Tempo Limpo";
            return;
        }

        txtClima.innerText = `${evento.icone} Clima: ${evento.nome} (${evento.descricao ?? ''})`;

        if (turnoAtualPartida === 1 && evento.tipo !== 'normal') {
            return;
        }

        if (evento.idRodada !== window.ultimaRodadaEfeito) {
            window.ultimaRodadaEfeito = evento.idRodada;

            if (evento.tipo === 'seca') {
                minhasSementes = Math.max(0, minhasSementes - 10);
                mostrarAlerta("A Seca severa queimou parte das suas reservas! Você perdeu 10 sementes.", "🔥");
            }
            else if (evento.tipo === 'chuva') {
                meuSolo = Math.min(100, meuSolo + 15);
                mostrarAlerta("Chuva na hora certa! Seu solo recuperou 15% de umidade e saúde.", "🌧️");
            }
            else if (evento.tipo === 'chuva_forte') {
                meuSolo = Math.max(0, meuSolo - 30);
                mostrarAlerta("Tempestade de Chuva Forte! O excesso de água causou erosão. Resistência do solo caiu em -30%!", "⛈️");
                checarInfeccaoSoloPorTempo();
            }
            else if (evento.tipo === 'praga') {
                if (meuSolo < 70) {
                    meuSolo = Math.max(0, meuSolo - 20);
                    jaPlantou = false; 
                    mostrarAlerta("Infestação de Pragas! Como seu solo estava fraco (< 70%), os insetos destruíram sua lavoura.", "🐛");
                } else {
                    mostrarAlerta("Infestação de Pragas! Como seu solo está forte e protegido, sua fazenda resistiu perfeitamente!", "🛡️");
                }
            }

            txtSolo.innerText = meuSolo + "%";
            txtSementes.innerText = minhasSementes + " sementes";

            checarDegradacaoSolo();
            salvarDadosNoFirebase();
        }
    });
}

// --- BOTÕES DE AÇÕES DO TABULEIRO ---

document.getElementById('btn-plantar').addEventListener('click', () => {
    if (!minhaVez) return;
    if (minhasSementes < 20) return mostrarAlerta("Sementes insuficientes para realizar o plantio!", "⚠️");
    
    minhasSementes -= 20;
    jaPlantou = true;
    
    txtSementes.innerText = minhasSementes + " sementes";
    mostrarAlerta("Você usou o Plantio Direto! O solo continua protegido pela palhada.", "🌱");
    
    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-Agrotoxico').addEventListener('click', () => {
    if (!minhaVez) return;
    if (minhasSementes < 10) return mostrarAlerta("Sementes insuficientes!", "⚠️");

    minhasSementes -= 10;
    meuSolo = Math.max(0, meuSolo - 20); 
    jaPlantou = true; 

    txtSementes.innerText = minhasSementes + " sementes";
    txtSolo.innerText = meuSolo + "%";
    mostrarAlerta(`Você usou defensivos químicos comuns. A saúde do solo caiu para ${meuSolo}%!`, "⚠️");
    
    checarDegradacaoSolo();
    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-fertilizar').addEventListener('click', () => {
    if (!minhaVez) return;
    if (meusFertilizantes <= 0) return mostrarAlerta("Você não tem mais estoque de biofertilizantes!", "🧪");

    meusFertilizantes -= 1;
    meuSolo = Math.min(100, meuSolo + 25); 

    txtFertilizantes.innerText = meusFertilizantes;
    txtSolo.innerText = meuSolo + "%";
    mostrarAlerta(`Biofertilizante aplicado! Resistência do solo aumentada em +25%.`, "🧪");

    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-colher').addEventListener('click', () => {
    if (!minhaVez) return;

    if (jaPlantou) {
        meusPontos += 50;
        minhasSementes += 40; 
        jaPlantou = false;
        meuSolo = Math.max(0, meuSolo - 2); 

        mostrarAlerta("Colheita de sucesso! Você ganhou 50 pontos e +40 sementes.", "🚜");
        
        txtSementes.innerText = minhasSementes + " sementes";
        txtSolo.innerText = meuSolo + "%";

        if (meusPontos >= 300) {
            set(ref(db, 'partida/vencedor'), inputNome.value.trim());
        }
    } else {
        mostrarAlerta("Você não tem nenhuma plantação pronta para colher!", "❌");
    }

    salvarDadosNoFirebase();
    passarTurno();
});

// Botão reiniciar
document.getElementById('btn-reiniciar').addEventListener('click', () => {
    set(ref(db, 'partida/eventoAtual'), {
        nome: "Tempo Limpo",
        icone: "🌤️",
        descricao: "Condições ideais para o manejo.",
        tipo: "normal",
        idRodada: Date.now()
    });
    window.ultimaRodadaEfeito = null;
    set(ref(db, 'partida/vencedor'), null);
    set(ref(db, 'partida/turnoAtual'), playerId);
    set(ref(db, 'partida/numeroTurno'), 1);

    meusPontos = 0;
    meuSolo = 100;
    minhasSementes = 100;
    meusFertilizantes = 4;
    jaPlantou = false;
    turnoAtualPartida = 1;

    txtSolo.innerText = meuSolo + "%";
    txtSementes.innerText = minhasSementes + " sementes";
    txtFertilizantes.innerText = meusFertilizantes;

    salvarDadosNoFirebase();
    mostrarAlerta("Nova partida iniciada no Turno 1 com Tempo Limpo!", "🔄");
});

// Funções Utilitárias de Regras
function checarDegradacaoSolo() {
    if (meuSolo <= 0) {
        mostrarAlerta("Seu solo está completamente esgotado! Você perdeu 20 pontos por degradação severa.", "🚨");
        meusPontos = Math.max(0, meusPontos - 20);
        meuSolo = 30; 
    }
}

function checarInfeccaoSoloPorTempo() {
    if (meuSolo < 70 && jaPlantou) {
        jaPlantou = false; 
        mostrarAlerta("Infestação! Como o seu solo estava fraco, pragas destruíram a colheita!", "🐛");
    }
}

function salvarDadosNoFirebase() {
    if (!playerId) return;
    update(ref(db, 'jogadores/' + playerId), {
        pontuacao: meusPontos,
        solo: meuSolo,
        sementes: minhasSementes,
        fertilizantes: meusFertilizantes,
        plantou: jaPlantou
    });
}

function passarTurno() {
    meuSolo = Math.max(0, meuSolo - 13);
    txtSolo.innerText = meuSolo + "%";
    
    checarInfeccaoSoloPorTempo();
    checarDegradacaoSolo();
    salvarDadosNoFirebase();

    let eventoSorteado;
    const chance = Math.random();

    if (turnoAtualPartida === 1) {
        if (chance < 0.60) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        else if (chance < 0.85) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
    }
    else if (turnoAtualPartida > 3) {
        if (chance < 0.12) eventoSorteado = { nome: "Tempestade de Chuva Forte", icone: "⛈️", descricao: "Temporal severo causa erosão. Todos perdem 30% de solo.", tipo: "chuva_forte" };
        else if (chance < 0.30) eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", descricao: "Solos degradados (< 70%) perdem 20% de saúde.", tipo: "praga" };
        else if (chance < 0.70) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", descricao: "Condições ideais para o manejo.", tipo: "normal" };
        else if (chance < 0.85) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", descricao: "A umidade ajuda o solo. Todos recuperam 15%.", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", descricao: "O calor consome recursos. Todos perdem 10 sementes.", tipo: "seca" };
    } 
    else if (turnoAtualPartida === 3) {
        if (chance < 0.18) eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", tipo: "praga" };
        else if (chance < 0.60) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        else if (chance < 0.80) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
    } 
    else { 
        if (chance < 0.60) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        else if (chance < 0.80) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
    }

    eventoSorteado.idRodada = Date.now();
    set(ref(db, 'partida/eventoAtual'), eventoSorteado);

    // Avança o turno para o próximo jogador da lista
    onValue(ref(db, 'jogadores/'), (snapshot) => {
        const lista = snapshot.val();
        if (!lista) return;

        const ids = Object.keys(lista);
        let proximoIndex = (ids.indexOf(playerId) + 1) % ids.length;
        const proximoJogadorId = ids[proximoIndex];

        if (proximoIndex === 0) {
            set(ref(db, 'partida/numeroTurno'), turnoAtualPartida + 1);
        }

        set(ref(db, 'partida/turnoAtual'), proximoJogadorId);
    }, { onlyOnce: true });
}