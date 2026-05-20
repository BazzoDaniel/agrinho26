import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// COLE AS SUAS CREDENCIAIS DO FIREBASE AQUI
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    databaseURL: "SUA_DATABASE_URL",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
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
});