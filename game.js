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
let faliu = false;

// Atributos iniciais da fazenda
let meuSolo = 100;
let minhasSementes = 100;
let meusFertilizantes = 4;
let meusPontos = 0;
let jaPlantou = false;
let turnoAtualPartida = 1;
let turnosProtegidosPraga = 0; // Nova variável de controle de proteção

function mostrarAlerta(mensagem, icone = "📢") {
    popupIcone.innerText = icone;
    popupMensagem.innerText = mensagem;
    popupContainer.classList.remove('hidden');
}

btnPopupOk.addEventListener('click', () => {
    popupContainer.classList.add('hidden');
});

btnEntrar.addEventListener('click', async () => {
    const nome = inputNome.value.trim();
    if (!nome) return mostrarAlerta("Digite um nome válido!", "⚠️");

    playerId = "player_" + Date.now();
    const playerRef = ref(db, 'jogadores/' + playerId);
    
    try {
        const jogadoresSnapshot = await get(ref(db, 'jogadores/'));
        const existemJogadores = jogadoresSnapshot.exists();

        if (!existemJogadores) {
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

        await set(playerRef, {
            nome: nome,
            pontuacao: meusPontos,
            solo: meuSolo,
            sementes: minhasSementes,
            fertilizantes: meusFertilizantes,
            plantou: jaPlantou,
            turnosProtegidos: turnosProtegidosPraga,
            online: true
        });

        onDisconnect(playerRef).remove();

        lobby.classList.add('hidden');
        gameBoard.classList.remove('hidden');

        txtSolo.innerText = meuSolo + "%";
        txtSementes.innerText = minhasSementes + " sementes";
        txtFertilizantes.innerText = meusFertilizantes;

        iniciarEscutasDoJogo();

    } catch (error) {
        console.error("Erro ao entrar na partida:", error);
        mostrarAlerta("Erro ao conectar com o servidor. Verifique o Firebase.", "❌");
    }
});

function iniciarEscutasDoJogo() {
    onValue(ref(db, 'jogadores/'), (snapshot) => {
        const dados = snapshot.val();
        listaJogadores.innerHTML = "<h3>Produtores na Partida:</h3>";
        
        if (dados) {
            Object.keys(dados).forEach(id => {
                const pShield = dados[id].turnosProtegidos > 0 ? ` 🛡️(${dados[id].turnosProtegidos}T)` : "";
                listaJogadores.innerHTML += `
                    <p>🚜 <b>${dados[id].nome}</b> ${pShield}<br>
                    🏅 Pontos: ${dados[id].pontuacao} | 🌱 Solo: ${dados[id].solo}% | 📦 Sementes: ${dados[id].sementes} | 🧪 Fertilizantes: ${dados[id].fertilizantes ?? 4}</p>
                    <hr style="border: 0.5px dashed #ccc;">
                `;
            });
        }
    });

    onValue(ref(db, 'partida/numeroTurno'), (turnoSnapshot) => {
        turnoAtualPartida = turnoSnapshot.val() || 1;
        if (txtTurno) txtTurno.innerText = turnoAtualPartida;
    });

    onValue(ref(db, 'partida/turnoAtual'), (snapshot) => {
        const jogadorDoTurno = snapshot.val();
        const statusTexto = document.getElementById('status');
        const botoes = document.querySelectorAll('.btn-acao');

        if (!jogadorDoTurno) return;

        if (faliu) {
            minhaVez = false;
            statusTexto.innerText = "❌ Você faliu por falta de sementes!";
            botoes.forEach(b => { if(b.id !== 'btn-reiniciar') b.disabled = true; });
            return;
        }

        if (jogadorDoTurno === playerId) {
            minhaVez = true;
            const shieldStatus = turnosProtegidosPraga > 0 ? ` [🛡️ Escudo ativo: ${turnosProtegidosPraga}T]` : "";
            statusTexto.innerText = `🟢 Turno ${turnoAtualPartida} - É a sua vez!${shieldStatus}`;
            botoes.forEach(b => { if(b.id !== 'btn-reiniciar') b.disabled = false; });
        } else {
            minhaVez = false;
            get(ref(db, `jogadores/${jogadorDoTurno}`)).then((playerSnap) => {
                const nomeOponente = playerSnap.exists() ? playerSnap.val().nome : "Outro produtor";
                statusTexto.innerText = `⏳ Turno ${turnoAtualPartida} - Vez de: ${nomeOponente}...`;
            });
            botoes.forEach(b => { if(b.id !== 'btn-reiniciar') b.disabled = true; });
        }
    });

    onValue(ref(db, 'partida/vencedor'), (snapshot) => {
        const vencedor = snapshot.val();
        const painelAcoes = document.getElementById('painel-acoes');
        const telaFimJogo = document.getElementById('tela-fim-jogo');
        const textoVencedor = document.getElementById('texto-vencedor');
        const statusTexto = document.getElementById('status');

        if (vencedor) {
            minhaVez = false;
            statusTexto.innerText = "🏁 Partida Encerrada!";
            if (painelAcoes) painelAcoes.classList.add('hidden');
            telaFimJogo.classList.remove('hidden');
            textoVencedor.innerText = `O Produtor ${vencedor} alcançou a meta de sustentabilidade e venceu a partida! 🌾🚜`;
        } else {
            if (painelAcoes) painelAcoes.classList.remove('hidden');
            telaFimJogo.classList.add('hidden');
        }
    });

    onValue(ref(db, 'partida/eventoAtual'), (snapshot) => {
        const evento = snapshot.val();
        const txtClima = document.getElementById('clima-atual');

        if (!evento) {
            txtClima.innerText = "🌤️ Clima: Tempo Limpo";
            return;
        }

        txtClima.innerText = `${evento.icone} Clima: ${evento.nome} (${evento.descricao ?? ''})`;

        if (turnoAtualPartida === 1 && evento.tipo !== 'normal') return;

        if (evento.idRodada !== window.ultimaRodadaEfeito) {
            window.ultimaRodadaEfeito = evento.idRodada;

            if (evento.tipo === 'seca') {
                minhasSementes = Math.max(0, minhasSementes - 10);
                mostrarAlerta("A Seca severa queimou parte das suas reservas! Você perdeu 10 sementes.", "🔥");
            }
            else if (evento.tipo === 'chuva') {
                meuSolo = Math.min(100, meuSolo + 15);
                mostrarAlerta("Chuva na hora certa! Seu solo recuperou 15% de umidade.", "🌧️");
            }
            else if (evento.tipo === 'chuva_forte') {
                meuSolo = Math.max(0, meuSolo - 30);
                mostrarAlerta("Tempestade de Chuva Forte! O excesso de água causou erosão (-30% solo)!", "⛈️");
                checarInfeccaoSoloPorTempo();
            }
            else if (evento.tipo === 'praga') {
                // MODIFICAÇÃO: Checa se o jogador possui turnos de proteção ativos
                if (turnosProtegidosPraga > 0) {
                    mostrarAlerta(`Ataque de Pragas repelido! O seu Biofertilizante protegeu a lavoura. (Proteção restante: ${turnosProtegidosPraga} turnos)`, "🛡️");
                } else if (meuSolo < 70) {
                    meuSolo = Math.max(0, meuSolo - 20);
                    jaPlantou = false; 
                    mostrarAlerta("Infestação de Pragas! Como seu solo estava fraco (< 70%) e desprotegido, os insetos destruíram tudo.", "🐛");
                } else {
                    mostrarAlerta("Infestação de Pragas! Seu solo resistiu por estar forte, mas considere fertilizar para evitar riscos.", "🛡️");
                }
            }

            txtSolo.innerText = meuSolo + "%";
            txtSementes.innerText = minhasSementes + " sementes";

            checarDerrotaPorSementes();
            checarDegradacaoSolo();
            salvarDadosNoFirebase();
        }
    });
}

function checarDerrotaPorSementes() {
    if (minhasSementes < 20 && !jaPlantou) {
        faliu = true;
        minhaVez = false;
        const botoes = document.querySelectorAll('.btn-acao');
        botoes.forEach(b => { if(b.id !== 'btn-reiniciar') b.disabled = true; });
        document.getElementById('status').innerText = "❌ Você faliu por falta de sementes!";
        mostrarAlerta("Game Over! Suas sementes acabaram e você não tem plantio ativo.", "📉");
    }
}

// --- BOTÕES DE AÇÕES ---

document.getElementById('btn-plantar').addEventListener('click', () => {
    if (!minhaVez || faliu) return;
    if (minhasSementes < 20) return mostrarAlerta("Sementes insuficientes!", "⚠️");
    
    minhasSementes -= 20;
    jaPlantou = true;
    txtSementes.innerText = minhasSementes + " sementes";
    mostrarAlerta("Você usou o Plantio Direto! O solo continua protegido pela palhada.", "🌱");
    
    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-Agrotoxico').addEventListener('click', () => {
    if (!minhaVez || faliu) return;
    if (minhasSementes < 10) return mostrarAlerta("Sementes insuficientes!", "⚠️");

    minhasSementes -= 10;
    meuSolo = Math.max(0, meuSolo - 20); 
    jaPlantou = true; 

    txtSementes.innerText = minhasSementes + " sementes";
    txtSolo.innerText = meuSolo + "%";
    mostrarAlerta(`Você usou defensivos químicos comuns. Saúde do solo caiu para ${meuSolo}%!`, "⚠️");
    
    checarDegradacaoSolo();
    salvarDadosNoFirebase();
    passarTurno();
});

document.getElementById('btn-fertilizar').addEventListener('click', () => {
    if (!minhaVez || faliu) return;
    if (meusFertilizantes <= 0) return mostrarAlerta("Você não tem mais estoque de biofertilizantes!", "🧪");

    meusFertilizantes -= 1;
    meuSolo = Math.min(100, meuSolo + 25); 
    turnosProtegidosPraga = 4; // MODIFICAÇÃO: Garante 4 turnos de proteção integral

    txtFertilizantes.innerText = meusFertilizantes;
    txtSolo.innerText = meuSolo + "%";
    mostrarAlerta(`Biofertilizante aplicado! Solo aumentado em +25% e protegido contra pragas por 4 turnos!`, "🧪");

    salvarDadosNoFirebase();
    passarTurno();
});

// NOVO BOTÃO: Mecânica de compra de suprimentos
document.getElementById('btn-comprar-fertilizante').addEventListener('click', () => {
    if (!minhaVez || faliu) return;
    if (minhasSementes < 10) return mostrarAlerta("Você precisa de pelo menos 10 sementes para comprar suprimentos!", "⚠️");

    minhasSementes -= 10;
    meusFertilizantes += 2;

    txtSementes.innerText = minhasSementes + " sementes";
    txtFertilizantes.innerText = meusFertilizantes;
    mostrarAlerta("Compra realizada! +2 cargas de Biofertilizante adicionadas ao estoque.", "🛒");

    checarDerrotaPorSementes();
    salvarDadosNoFirebase();
    // Nota: Comprar recursos NÃO passa o turno, permitindo que o jogador use o fertilizante logo em seguida.
});

document.getElementById('btn-colher').addEventListener('click', () => {
    if (!minhaVez || faliu) return;

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
    faliu = false;
    turnosProtegidosPraga = 0;

    txtSolo.innerText = meuSolo + "%";
    txtSementes.innerText = minhasSementes + " sementes";
    txtFertilizantes.innerText = meusFertilizantes;

    salvarDadosNoFirebase();
    mostrarAlerta("Nova partida iniciada no Turno 1 com Tempo Limpo!", "🔄");
});

function checarDegradacaoSolo() {
    if (meuSolo <= 0) {
        mostrarAlerta("Seu solo está completamente esgotado! Você perdeu 20 pontos por degradação severa.", "🚨");
        meusPontos = Math.max(0, meusPontos - 20);
        meuSolo = 30; 
    }
}

function checarInfeccaoSoloPorTempo() {
    if (meuSolo < 70 && jaPlantou && turnosProtegidosPraga <= 0) {
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
        plantou: jaPlantou,
        turnosProtegidos: turnosProtegidosPraga // Sincroniza a proteção no Firebase
    });
}

async function passarTurno() {
    checarDerrotaPorSementes();
    if (faliu) return;

    // MODIFICAÇÃO: Consome 1 turno da proteção contra pragas na passagem de tempo natural
    if (turnosProtegidosPraga > 0) {
        turnosProtegidosPraga--;
    }

    meuSolo = Math.max(0, meuSolo - 13);
    txtSolo.innerText = meuSolo + "%";
    
    checarInfeccaoSoloPorTempo();
    checarDegradacaoSolo();
    salvarDadosNoFirebase();

    let eventoSorteado;
    const chance = Math.random();

    if (turnoAtualPartida === 1) {
        if (chance < 0.70) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        else if (chance < 0.90) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
    }
    else if (turnoAtualPartida > 3) {
        if (chance < 0.05) eventoSorteado = { nome: "Tempestade de Chuva Forte", icone: "⛈️", descricao: "Temporal severo causa erosão. Todos perdem 30% de solo.", tipo: "chuva_forte" };
        else if (chance < 0.12) eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", descricao: "Solos degradados (< 70%) perdem 20% de saúde.", tipo: "praga" };
        else if (chance < 0.65) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", descricao: "Condições ideais para o manejo.", tipo: "normal" };
        else if (chance < 0.85) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", descricao: "A umidade ajuda o solo. Todos recuperam 15%.", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", descricao: "O calor consome recursos. Todos perdem 10 sementes.", tipo: "seca" };
    } 
    else if (turnoAtualPartida === 3) {
        if (chance < 0.08) eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", tipo: "praga" };
        else if (chance < 0.65) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        else if (chance < 0.85) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
    } 
    else { 
        if (chance < 0.65) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal" };
        else if (chance < 0.85) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva" };
        else eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca" };
    }

    eventoSorteado.idRodada = Date.now();
    await set(ref(db, 'partida/eventoAtual'), eventoSorteado);

    try {
        const snapshot = await get(ref(db, 'jogadores/'));
        const lista = snapshot.val();
        
        if (lista) {
            const ids = Object.keys(lista);
            let proximoIndex = (ids.indexOf(playerId) + 1) % ids.length;
            const proximoJogadorId = ids[proximoIndex];

            if (proximoIndex === 0) {
                await set(ref(db, 'partida/numeroTurno'), turnoAtualPartida + 1);
            }

            await set(ref(db, 'partida/turnoAtual'), proximoJogadorId);
        }
    } catch (error) {
        console.error("Erro ao transicionar turno:", error);
    }
}

window.passarTurno = passarTurno;
window.pasarTurno = passarTurno;