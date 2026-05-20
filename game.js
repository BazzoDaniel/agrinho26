import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// CORREÇÃO: Adicionado o 'update' na importação do database abaixo
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

// Elementos da tela do Lobby
const btnEntrar = document.getElementById('btn-entrar');
const inputNome = document.getElementById('player-name');
const lobby = document.getElementById('lobby');
const gameBoard = document.getElementById('game-board');
const listaJogadores = document.getElementById('jogadores-conectados');

// Variáveis Globais de Estado do Jogo
let playerId = null; // Agora começa nulo e ganha valor ao entrar
let minhaVez = false;
let meuSolo = 100;
let minhasSementes = 100;
let meusPontos = 0;
let jaPlantou = false;

btnEntrar.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (!nome) return alert("Digite um nome!");

    // Define o ID único do jogador baseado no tempo
    playerId = "player_" + Date.now();

    // Salva o jogador no banco de dados do Firebase
    const playerRef = ref(db, 'jogadores/' + playerId);
    set(playerRef, {
        nome: nome,
        pontuacao: 0,
        online: true
    });

    // Se o jogador fechar a aba do navegador, o Firebase remove ele automaticamente
    onDisconnect(playerRef).remove();

    // Esconde o lobby e mostra o jogo
    lobby.classList.add('hidden');
    gameBoard.classList.remove('hidden');

    // Inicializa os elementos visuais do tabuleiro de quem acabou de entrar
    document.getElementById('status-solo').innerText = meuSolo + "%";
    document.getElementById('recursos-moedas').innerText = minhasSementes + " sementes";

    // Escuta em tempo real quando OUTROS jogadores entram ou saem
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
        const dados = snapshot.val();
        listaJogadores.innerHTML = "<h3>Produtores na Partida:</h3>";
        
        if (dados) {
            Object.keys(dados).forEach(id => {
                listaJogadores.innerHTML += `<p>🚜 ${dados[id].nome} (Pontos: ${dados[id].pontuacao})</p>`;
            });
        }
    });

    // Ouvir em tempo real de quem é o turno na partida
    const turnoRef = ref(db, 'partida/turnoAtual');
    onValue(turnoRef, (snapshot) => {
        const jogadorDoTurno = snapshot.val();
        
        // Se não houver ninguém no turno ainda, o primeiro a logar assume o controle
        if (!jogadorDoTurno) {
            set(ref(db, 'partida/turnoAtual'), playerId);
            return;
        }

        const statusTexto = document.getElementById('status');
        const botoes = document.querySelectorAll('.btn-acao');

        if (jogadorDoTurno === playerId) {
            minhaVez = true;
            statusTexto.innerText = "🟢 É a sua vez de cuidar da fazenda!";
            botoes.forEach(b => b.disabled = false); // Ativa os botões na tela
        } else {
            minhaVez = false;
            statusTexto.innerText = "⏳ Outro produtor está jogando...";
            botoes.forEach(b => b.disabled = true); // Bloqueia os botões na tela
        }
    });
});

// --- LÓGICA E CLIQUES DOS BOTÕES DE AÇÃO DO TABULEIRO ---

document.getElementById('btn-plantar').addEventListener('click', () => {
    if (!minhaVez) return;
    if (minhasSementes < 20) return alert("Sementes insuficientes!");
    
    minhasSementes -= 20;
    jaPlantou = true;
    document.getElementById('recursos-moedas').innerText = minhasSementes + " sementes";
    alert("Você usou o Plantio Direto! O solo continua saudável e protegido.");
    
    passarTurno();
});

document.getElementById('btn-colher').addEventListener('click', () => {
    if (!minhaVez) return;
    
    if (jaPlantou) {
        meusPontos += 50;
        jaPlantou = false;
        
        // Atualiza a pontuação no Firebase usando o update importado corretamente
        update(ref(db, 'jogadores/' + playerId), { pontuacao: meusPontos });
        alert("Colheita de sucesso! Você ganhou 50 pontos.");
    } else {
        alert("Você precisa plantar antes de colher!");
    }
    
    passarTurno();
});

// Função interna para passar o bastão da vez para o próximo jogador da fila
function passarTurno() {
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
        const lista = snapshot.val();
        if (!lista) return;
        
        const ids = Object.keys(lista);
        // Calcula matematicamente quem é o próximo com base na ordem do Firebase
        let proximoIndex = (ids.indexOf(playerId) + 1) % ids.length;
        const proximoJogadorId = ids[proximoIndex];
        
        // Altera o ID do jogador ativo na nuvem do Firebase
        set(ref(db, 'partida/turnoAtual'), proximoJogadorId);
    }, { onlyOnce: true });
}