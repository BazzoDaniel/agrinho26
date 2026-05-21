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

// Elementos do Pop-up Customizado
const popupContainer = document.getElementById('popup-container');
const popupMensagem = document.getElementById('popup-mensagem');
const popupIcone = document.getElementById('popup-icone');
const btnPopupOk = document.getElementById('btn-popup-ok');

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
let turnoAtualPartida = 1; // Guarda o turno localmente

btnEntrar.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (!nome) return mostrarAlerta("Digite um nome válido!", "⚠️");

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

    // 2. Escuta o turno e o CONTADOR DE TURNOS global
    const turnoRef = ref(db, 'partida/turnoAtual');
    onValue(turnoRef, (snapshot) => {
        const jogadorDoTurno = snapshot.val();
        const statusTexto = document.getElementById('status');
        const botoes = document.querySelectorAll('.btn-acao');

        // Escuta o número do turno atual
        onValue(ref(db, 'partida/numeroTurno'), (turnoSnapshot) => {
            turnoAtualPartida = turnoSnapshot.val() || 1;
            
            // Atualiza o contador visual se ele existir na tela
            if (txtTurno) {
                txtTurno.innerText = turnoAtualPartida;
            }
        }, { onlyOnce: true });

        const listaChecagemRef = ref(db, 'jogadores/');
        onValue(listaChecagemRef, (jogadoresSnapshot) => {
            const jogadoresOnline = jogadoresSnapshot.val() || {};
            const listaIdsOnline = Object.keys(jogadoresOnline);

            if (!jogadorDoTurno || !listaIdsOnline.includes(jogadorDoTurno)) {
                if (listaIdsOnline.length > 0 && listaIdsOnline[0] === playerId) {
                    set(ref(db, 'partida/turnoAtual'), playerId);
                    set(ref(db, 'partida/numeroTurno'), 1);
                }
                return;
            }

            if (jogadorDoTurno === playerId) {
                minhaVez = true;
                statusTexto.innerText = `🟢 Turno ${turnoAtualPartida} - É a sua vez de cuidar da fazenda!`;
                botoes.forEach(b => b.disabled = false);
            } else {
                minhaVez = false;
                const nomeDoTurno = jogadoresOnline[jogadorDoTurno] ? jogadoresOnline[jogadorDoTurno].nome : "Outro produtor";
                statusTexto.innerText = `⏳ Turno ${turnoAtualPartida} - Vez de: ${nomeDoTurno}...`;
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
        mostrarAlerta("Nova partida iniciada no Turno 1!", "🔄");
    });

    // 4. Ouvir o Clima (ATUALIZADO COM OS POPUPS)
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
                mostrarAlerta("A Seca severa queimou parte das suas reservas! Você perdeu 10 sementes.", "🔥");
            }
            else if (evento.tipo === 'chuva') {
                meuSolo = Math.min(100, meuSolo + 15);
                mostrarAlerta("Chuva na hora certa! Seu solo recuperou 15% de umidade e saúde.", "🌧️");
            }
            else if (evento.tipo === 'chuva_forte') {
                meuSolo = Math.max(0, meuSolo - 30);
                mostrarAlerta("Tempestade de Chuva Forte! O excesso de água causou lixiviação e erosão. Resistência do solo caiu em -30%!", "⛈️");
                checarInfeccaoSoloPorTempo();
            }
            else if (evento.tipo === 'praga') {
                if (meuSolo < 70) {
                    meuSolo = Math.max(0, meuSolo - 20);
                    jaPlantou = false; 
                    mostrarAlerta("Infestação de Pragas! Como seu solo estava fraco (abaixo de 70%), os insetos destruíram sua lavoura. Você perdeu sua colheita e -20% de solo.", "🐛");
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
});

// --- AÇÕES COM SISTEMA DE POP-UP CORRIGIDO ---

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
    meuSolo -= 20; 
    jaPlantou = true; 

    txtSementes.innerText = minhasSementes + " sementes";
    txtSolo.innerText = meuSolo + "%";
    mostrarAlerta(`Você usou defensivos químicos comuns. Gastou menos sementes, mas a saúde e resistência do solo caiu para ${meuSolo}%!`, "⚠️");
    
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
    mostrarAlerta(`Biofertilizante aplicado! Resistência do solo aumentada em +25%. Estoque restante: ${meusFertilizantes}`, "🧪");

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

        mostrarAlerta("Colheita de sucesso! Você ganhou 50 pontos e reabasteceu +40 sementes. O processo desgastou o solo em -2%.", "🚜");
        
        txtSementes.innerText = minhasSementes + " sementes";
        txtSolo.innerText = meuSolo + "%";

        if (meusPontos >= 300) {
            set(ref(db, 'partida/vencedor'), inputNome.value.trim());
        }
    } else {
        mostrarAlerta("Você não tem nenhuma plantação pronta para colher (ou sua lavoura foi destruída por intempéries/pragas)!", "❌");
    }

    salvarDadosNoFirebase();
    passarTurno();
});

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
        mostrarAlerta("Infestação! Como a resistência do seu solo caiu abaixo de 70%, pragas invadiram a fazenda e destruíram a colheita!", "🐛");
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

    // --- RANDOMIZAÇÃO E REQUISITO DE TURNOS ---
    let eventoSorteado;
    const chance = Math.random();

    // Cenário 1: Depois do turno 3 (A partir do Turno 4)
    if (turnoAtualPartida > 3) {
        if (chance < 0.12) {
            eventoSorteado = { nome: "Tempestade de Chuva Forte", icone: "⛈️", descricao: "Temporal severo causa lixiviação e erosão. Todos perdem 30% de solo.", tipo: "chuva_forte" };
        } else if (chance < 0.30) {
            eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", descricao: "Solos degradados (< 70%) sofrem quebra e perdem 20% de saúde.", tipo: "praga" };
        } else if (chance < 0.70) {
            eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", descricao: "Condições ideais para o manejo.", tipo: "normal" };
        } else if (chance < 0.85) {
            eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", descricao: "A umidade ajuda o solo. Todos recuperam 15% de saúde.", tipo: "chuva" };
        } else {
            eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", descricao: "O calor consome recursos. Todos perdem 10 sementes.", tipo: "seca" };
        }
    } 
    // Cenário 2: Turno igual a 3
    else if (turnoAtualPartida === 3) {
        if (chance < 0.18) {
            eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", descricao: "Solos degradados (< 70%) sofrem quebra.", tipo: "praga" };
        } else if (chance < 0.60) {
            eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", descricao: "Condições ideais.", tipo: "normal" };
        } else if (chance < 0.80) {
            eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        } else {
            eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
        }
    } 
    // Cenário 3: Turnos 1 e 2
    else {
        if (chance < 0.60) {
            eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        } else if (chance < 0.80) {
            eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        } else {
            eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
        }
    }

    eventoSorteado.idRodada = Date.now();
    set(ref(db, 'partida/eventoAtual'), eventoSorteado);

    // Troca o Turno e Incrementa o Contador Global de Turnos
    const todosJogadoresRef = ref(db, 'jogadores/');
    onValue(todosJogadoresRef, (snapshot) => {
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