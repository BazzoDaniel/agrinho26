import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// Estado do Jogador Atual
let playerId = null;
let minhaVez = false;

// Atributos iniciais da fazenda
let meuSolo = 100;
let minhasSementes = 100;
let meusPontos = 0;
let jaPlantou = false;

btnEntrar.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (!nome) return alert("Digite um nome!");

    playerId = "player_" + Date.now();

    const playerRef = ref(db, 'jogadores/' + playerId);
    
    // Salvando todos os atributos iniciais no Firebase
    set(playerRef, {
        nome: nome,
        pontuacao: meusPontos,
        solo: meuSolo,
        sementes: minhasSementes,
        plantou: jaPlantou,
        online: true
    });

    // Remove o jogador se ele desconectar ou fechar a aba
    onDisconnect(playerRef).remove();

    lobby.classList.add('hidden');
    gameBoard.classList.remove('hidden');

    // Atualiza a tela local imediatamente
    txtSolo.innerText = meuSolo + "%";
    txtSementes.innerText = minhasSementes + " sementes";

    // --- ESCUTAS DO FIREBASE DESACOPLADAS ---

    // 1. Escuta a lista de jogadores e exibe o painel com os dados atualizados de cada um
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
        const dados = snapshot.val();
        listaJogadores.innerHTML = "<h3>Produtores na Partida:</h3>";
        
        if (dados) {
            Object.keys(dados).forEach(id => {
                listaJogadores.innerHTML += `
                    <p>🚜 <b>${dados[id].nome}</b> <br>
                    🏅 Pontos: ${dados[id].pontuacao} | 🌱 Solo: ${dados[id].solo}% | 📦 Sementes: ${dados[id].sementes}</p>
                    <hr style="border: 0.5px dashed #ccc;">
                `;
            });
        }
    });

    // 2. Escuta de quem é o turno na partida com Validação Antitrava (CORREÇÃO)
    const turnoRef = ref(db, 'partida/turnoAtual');
    onValue(turnoRef, (snapshot) => {
        const jogadorDoTurno = snapshot.val();
        const statusTexto = document.getElementById('status');
        const botoes = document.querySelectorAll('.btn-acao');

        // Puxa a lista de jogadores online para verificar se o dono do turno sumiu
        const listaChecagemRef = ref(db, 'jogadores/');
        onValue(listaChecagemRef, (jogadoresSnapshot) => {
            const jogadoresOnline = jogadoresSnapshot.val() || {};
            const listaIdsOnline = Object.keys(jogadoresOnline);

            // Se o turno estiver vazio OU pertencer a alguém que ficou offline, o primeiro da fila assume
            if (!jogadorDoTurno || !listaIdsOnline.includes(jogadorDoTurno)) {
                if (listaIdsOnline.length > 0 && listaIdsOnline[0] === playerId) {
                    set(ref(db, 'partida/turnoAtual'), playerId);
                }
                return;
            }

            // Aplica o bloqueio ou liberação dos botões
            if (jogadorDoTurno === playerId) {
                minhaVez = true;
                statusTexto.innerText = "🟢 É a sua vez de cuidar da fazenda!";
                botoes.forEach(b => b.disabled = false);
            } else {
                minhaVez = false;
                const nomeDoTurno = jogadoresOnline[jogadorDoTurno] ? jogadoresOnline[jogadorDoTurno].nome : "Outro produtor";
                statusTexto.innerText = `⏳ Vez de: ${nomeDoTurno}...`;
                botoes.forEach(b => b.disabled = true);
            }
        }, { onlyOnce: true });
    });
});

// --- AÇÕES DO TABULEIRO ---

document.getElementById('btn-plantar').addEventListener('click', () => {
    if (!minhaVez) return;
    if (minhasSementes < 20) return alert("Sementes insuficientes!");
    
    minhasSementes -= 20;
    jaPlantou = true;
    
    txtSementes.innerText = minhasSementes + " sementes";
    alert("Você usou o Plantio Direto! O solo continua saudável e protegido.");
    
    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-Agrotoxico').addEventListener('click', () => {
    if (!minhaVez) return;
    if (minhasSementes < 10) return alert("Sementes insuficientes!");

    minhasSementes -= 10;
    meuSolo -= 20; 
    jaPlantou = true; 

    txtSementes.innerText = minhasSementes + " sementes";
    txtSolo.innerText = meuSolo + "%";
    alert("⚠️ Você usou defensivos químicos comuns. Gastou menos sementes, mas a saúde do solo caiu para " + meuSolo + "%!");
    
    if (meuSolo <= 0) {
        alert("🚨 Seu solo está esgotado! Você perdeu 20 pontos por degradação.");
        meusPontos = Math.max(0, meusPontos - 20);
        meuSolo = 40; // Sistema de ajuda para o jogador não travar em 0%
    }

    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-colher').addEventListener('click', () => {
    if (!minhaVez) return;
    
    if (jaPlantou) {
        meusPontos += 50;
        jaPlantou = false;
        alert("Colheita de sucesso! Você ganhou 50 pontos.");
    } else {
        alert("Você precisa plantar antes de colher!");
    }
    
    salvarDadosNoFirebase();
    passarTurno();
});

// Função auxiliar para atualizar o Firebase toda vez que o jogador atual mudar seus status
function salvarDadosNoFirebase() {
    if (!playerId) return;
    update(ref(db, 'jogadores/' + playerId), {
        pontuacao: meusPontos,
        solo: meuSolo,
        sementes: minhasSementes,
        plantou: jaPlantou
    });
}

function passarTurno() {
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
        const lista = snapshot.val();
        if (!lista) return;
        
        const ids = Object.keys(lista);
        let proximoIndex = (ids.indexOf(playerId) + 1) % ids.length;
        const proximoJogadorId = ids[proximoIndex];
        
        set(ref(db, 'partida/turnoAtual'), proximoJogadorId);
    }, { onlyOnce: true });
}