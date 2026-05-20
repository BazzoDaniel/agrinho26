import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const btnEntrar = document.getElementById('btn-entrar');
const inputNome = document.getElementById('player-name');
const lobby = document.getElementById('lobby');
const gameBoard = document.getElementById('game-board');
const listaJogadores = document.getElementById('jogadores-conectados');

btnEntrar.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (!nome) return alert("Digite um nome!");

    // Cria um ID único para o jogador baseado no tempo atual
    const playerId = "player_" + Date.now();

    // Salva o jogador no banco de dados do Firebase
    const playerRef = ref(db, 'jogadores/' + playerId);
    set(playerRef, {
        nome: nome,
        pontuacao: 0,
        online: true
    });

    // Se o jogador fechar a aba do navegador, o Firebase remove ele automaticamente!
    onDisconnect(playerRef).remove();

    // Esconde o lobby e mostra o jogo
    lobby.classList.add('hidden');
    gameBoard.classList.remove('hidden');

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
    // Dentro do seu btnEntrar.addEventListener('click', ...)

// 1. Ouvir de quem é o turno na partida
const turnoRef = ref(db, 'partida/turnoAtual');
onValue(turnoRef, (snapshot) => {
    const jogadorDoTurno = snapshot.val();
    
    // Se não houver ninguém no turno ainda, o primeiro assume
    if (!jogadorDoTurno) {
        set(ref(db, 'partida/turnoAtual'), playerId);
        return;
    }

    const statusTexto = document.getElementById('status');
    const botoes = document.querySelectorAll('.btn-acao');

    if (jogadorDoTurno === playerId) {
        minhaVez = true;
        statusTexto.innerText = "🟢 É a sua vez de cuidar da fazenda!";
        botoes.forEach(b => b.disabled = false); // Ativa os botões
    } else {
        minhaVez = false;
        statusTexto.innerText = "⏳ Outro produtor está jogando...";
        botoes.forEach(b => b.disabled = true); // Bloqueia os botões
    }
});
});
let minhaVez = false;
let meuSolo = 100;
let minhasSementes = 100;
let meusPontos = 0;
let jaPlantou = false;

// Elementos da tela
const txtSolo = document.getElementById('status-solo');
const txtSementes = document.getElementById('recursos-moedas');

document.getElementById('btn-plantar').addEventListener('click', () => {
    if (!minhaVez) return;
    
    minhasSementes -= 20;
    jaPlantou = true;
    txtSementes.innerText = minhasSementes + " sementes";
    alert("Você usou o Plantio Direto! O solo continua saudável e protegido.");
    
    passarTurno();
});

document.getElementById('btn-colher').addEventListener('click', () => {
    if (!minhaVez) return;
    
    if (jaPlantou) {
        meusPontos += 50;
        jaPlantou = false;
        // Atualiza a pontuação no Firebase para todos verem no ranking
        update(ref(db, 'jogadores/' + playerId), { pontuacao: meusPontos });
        alert("Colheita de sucesso! Você ganhou 50 pontos.");
    } else {
        alert("Você precisa plantar antes de colher!");
    }
    
    passarTurno();
});

// Função para passar o turno para outro jogador
function passarTurno() {
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
        const lista = snapshot.val();
        if (!lista) return;
        
        const ids = Object.keys(lista);
        // Encontra a posição do jogador atual e passa para o próximo da lista
        let proximoIndex = (ids.indexOf(playerId) + 1) % ids.length;
        const proximoJogadorId = ids[proximoIndex];
        
        // Salva o ID do próximo jogador no Firebase
        set(ref(db, 'partida/turnoAtual'), proximoJogadorId);
    }, { onlyOnce: true }); // Executa apenas uma vez para não criar um loop infinito
}