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
const txtFertilizantes = document.getElementById('recursos-fertilizantes');

// Estado do Jogador Atual
let playerId = null;
let minhaVez = false;

// Atributos iniciais da fazenda
let meuSolo = 100;
let minhasSementes = 100;
let meusFertilizantes = 4;
let meusPontos = 0;
let jaPlantou = false;

btnEntrar.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (!nome) return alert("Digite um nome!");

    playerId = "player_" + Date.now();

    const playerRef = ref(db, 'jogadores/' + playerId);
    
    set(playerRef, {
        nome: nome,
        pontuacao: meusPontos,
        solo: meuSolo,
        sementes: minhasSementes,
        fertilizantes: meusFertilizantes,
        plantou: jaPlantou,
        online: true
    });

    onDisconnect(playerRef).remove();

    lobby.classList.add('hidden');
    gameBoard.classList.remove('hidden');

    txtSolo.innerText = meuSolo + "%";
    txtSementes.innerText = minhasSementes + " sementes";
    txtFertilizantes.innerText = meusFertilizantes;

    // --- ESCUTAS DO FIREBASE ---

    // 1. Escuta a lista de jogadores
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
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

    // 2. Escuta o turno
    const turnoRef = ref(db, 'partida/turnoAtual');
    onValue(turnoRef, (snapshot) => {
        const jogadorDoTurno = snapshot.val();
        const statusTexto = document.getElementById('status');
        const botoes = document.querySelectorAll('.btn-acao');

        const listaChecagemRef = ref(db, 'jogadores/');
        onValue(listaChecagemRef, (jogadoresSnapshot) => {
            const jogadoresOnline = jogadoresSnapshot.val() || {};
            const listaIdsOnline = Object.keys(jogadoresOnline);

            if (!jogadorDoTurno || !listaIdsOnline.includes(jogadorDoTurno)) {
                if (listaIdsOnline.length > 0 && listaIdsOnline[0] === playerId) {
                    set(ref(db, 'partida/turnoAtual'), playerId);
                }
                return;
            }

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

    // 3. Ouvir vencedor
    const vencedorRef = ref(db, 'partida/vencedor');
    onValue(vencedorRef, (snapshot) => {
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

    // Botão reiniciar
    document.getElementById('btn-reiniciar').addEventListener('click', () => {
        set(ref(db, 'partida/eventoAtual'), null);
        window.ultimaRodadaEfeito = null;
        set(ref(db, 'partida/vencedor'), null);
        set(ref(db, 'partida/turnoAtual'), playerId);

        meusPontos = 0;
        meuSolo = 100;
        minhasSementes = 100;
        meusFertilizantes = 4;
        jaPlantou = false;

        txtSolo.innerText = meuSolo + "%";
        txtSementes.innerText = minhasSementes + " sementes";
        txtFertilizantes.innerText = meusFertilizantes;

        salvarDadosNoFirebase();
        alert("🔄 Nova partida iniciada!");
    });

    // 4. Ouvir o Clima (ATUALIZADO COM CHUVA FORTE)
    const climaRef = ref(db, 'partida/eventoAtual');
    onValue(climaRef, (snapshot) => {
        const evento = snapshot.val();
        const txtClima = document.getElementById('clima-atual');

        if (!evento) {
            txtClima.innerText = "🌤️ Clima: Tempo Limpo";
            return;
        }

        txtClima.innerText = `${evento.icone} Clima: ${evento.nome} (${evento.descricao})`;

        if (evento.idRodada !== window.ultimaRodadaEfeito) {
            window.ultimaRodadaEfeito = evento.idRodada;

            if (evento.tipo === 'seca') {
                minhasSementes = Math.max(0, minhasSementes - 10);
                alert(`🔥 A Seca severa queimou parte das suas reservas! Você perdeu 10 sementes.`);
            }
            else if (evento.tipo === 'chuva') {
                meuSolo = Math.min(100, meuSolo + 15);
                alert(`🌧️ Chuva na hora certa! Seu solo recuperou 15% de umidade e saúde.`);
            }
            else if (evento.tipo === 'chuva_forte') {
                // Nova consequência climática direta na resistência
                meuSolo = Math.max(0, meuSolo - 30);
                alert(`⛈️ Tempestade e Chuva Forte! O excesso de água causou erosão na cabeceira e a resistência do solo despencou em -30%!`);
                checarInfeccaoSoloPorTempo();
            }
            else if (evento.tipo === 'praga') {
                if (meuSolo < 70) {
                    meuSolo = Math.max(0, meuSolo - 20);
                    jaPlantou = false; 
                    alert(`🐛 Infestação de Pragas! Como seu solo estava fraco (abaixo de 70%), os insetos destruíram sua lavoura. Você perdeu sua colheita e -20% de solo.`);
                } else {
                    alert(`🐛 Infestação de Pragas! Como seu solo está forte e protegido, sua fazenda resistiu perfeitamente!`);
                }
            }

            txtSolo.innerText = meuSolo + "%";
            txtSementes.innerText = minhasSementes + " sementes";

            checarDegradacaoSolo();
            salvarDadosNoFirebase();
        }
    });
});

// --- AÇÕES ---

document.getElementById('btn-plantar').addEventListener('click', () => {
    if (!minhaVez) return;
    if (minhasSementes < 20) return alert("Sementes insuficientes!");
    
    minhasSementes -= 20;
    jaPlantou = true;
    
    txtSementes.innerText = minhasSementes + " sementes";
    alert("Você usou o Plantio Direto! O solo continua protegido.");
    
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
    
    checarDegradacaoSolo();
    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-fertilizar').addEventListener('click', () => {
    if (!minhaVez) return;
    if (meusFertilizantes <= 0) return alert("Você não tem mais estoque de fertilizantes!");

    meusFertilizantes -= 1;
    meuSolo = Math.min(100, meuSolo + 25); 

    txtFertilizantes.innerText = meusFertilizantes;
    txtSolo.innerText = meuSolo + "%";
    alert(`🧪 Biofertilizante aplicado! Resistência do solo aumentada em +25%. Estoque restante: ${meusFertilizantes}`);

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

        alert("🚜 Colheita de sucesso! Você ganhou 50 pontos e reabasteceu +40 sementes. O processo de colheita desgastou o solo em -2%.");
        
        txtSementes.innerText = minhasSementes + " sementes";
        txtSolo.innerText = meuSolo + "%";

        if (meusPontos >= 300) {
            set(ref(db, 'partida/vencedor'), inputNome.value.trim());
        }
    } else {
        alert("Você não tem nenhuma plantação pronta para colher (ou sua lavoura foi infestada/destruída por pragas)!");
    }

    salvarDadosNoFirebase();
    passarTurno();
});

function checarDegradacaoSolo() {
    if (meuSolo <= 0) {
        alert("🚨 Seu solo está completamente esgotado! Você perdeu 20 pontos por degradação severa.");
        meusPontos = Math.max(0, meusPontos - 20);
        meuSolo = 30; 
    }
}

function checarInfeccaoSoloPorTempo() {
    if (meuSolo < 70 && jaPlantou) {
        jaPlantou = false; 
        alert("🐛 Infestação! Como a resistência do seu solo caiu abaixo de 70%, pragas invadiram a fazenda e destruíram a colheita!");
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
    // Desgaste temporal normal de 13% por turno
    meuSolo = Math.max(0, meuSolo - 13);
    txtSolo.innerText = meuSolo + "%";
    
    checarInfeccaoSoloPorTempo();
    checarDegradacaoSolo();
    salvarDadosNoFirebase();

    // --- NOVA LÓGICA DE CLIMA COM CHUVA FORTE ---
    let eventoSorteado;
    const chance = Math.random();

    if (chance < 0.40) {
        // 40% de chance de Tempo Limpo
        eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", descricao: "Condições ideais para o manejo.", tipo: "normal" };
    } else if (chance < 0.55) {
        // 15% de chance de Chuva Abençoada
        eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", descricao: "A umidade ajuda o solo. Todos recuperam 15% de saúde da terra.", tipo: "chuva" };
    } else if (chance < 0.70) {
        // 15% de chance de Seca Prolongada
        eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", descricao: "O calor consome recursos. Todos perdem 10 sementes.", tipo: "seca" };
    } else if (chance < 0.85) {
        // 15% de chance de Pragas
        eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", descricao: "Solos degradados (abaixo de 70%) sofrem quebra e perdem 20% de saúde.", tipo: "praga" };
    } else {
        // 15% de chance de Chuva Forte (-30% Solo)
        eventoSorteado = { nome: "Tempestade de Chuva Forte", icone: "⛈️", descricao: "Temporal severo causa lixiviação e erosão. Todos perdem 30% de resistência do solo.", tipo: "chuva_forte" };
    }

    eventoSorteado.idRodada = Date.now();
    set(ref(db, 'partida/eventoAtual'), eventoSorteado);

    // Troca o Turno
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