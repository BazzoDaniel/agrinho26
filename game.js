import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, update, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// Elemento do Áudio
const musicaFazenda = document.getElementById('musica-fazenda');

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

// SISTEMA DE ESTÁGIOS
let estagioLavoura = "vazio"; 
let turnoAtualPartida = 1;
let turnosProtegidosPraga = 0; 

// FUNÇÃO AUXILIAR PARA TROCAR O PLANO DE FUNDO (Tratada para evitar travar o código caso a foto falte)
function mudarFundo(nomeImagem) {
    if (document.body) {
        document.body.style.backgroundImage = `url('${nomeImagem}')`;
    }
}

// DEFINE A IMAGEM PADRÃO DO MENU/LOBBY
mudarFundo('1.png');

function mostrarAlerta(mensagem, icone = "📢") {
    if (popupIcone && popupMensagem && popupContainer) {
        popupIcone.innerText = icone;
        popupMensagem.innerText = mensagem; 
        popupContainer.classList.remove('hidden');
    } else {
        alert(icone + " " + mensagem); // Salvaguarda caso o HTML do pop-up suma
    }
}

if (btnPopupOk) {
    btnPopupOk.addEventListener('click', () => {
        popupContainer.classList.add('hidden');
        if (faliu) {
            executarSaidaEGameOver();
        }
    });
}

if (btnEntrar) {
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
                    controleReset: 0,
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

            meusPontos = 0;
            meuSolo = 100;
            minhasSementes = 100;
            meusFertilizantes = 4;
            estagioLavoura = "vazio";
            turnosProtegidosPraga = 0;
            faliu = false;

            await set(playerRef, {
                nome: nome,
                pontuacao: meusPontos,
                solo: meuSolo,
                sementes: minhasSementes,
                fertilizantes: meusFertilizantes,
                estagio: estagioLavoura, 
                turnosProtegidos: turnosProtegidosPraga,
                online: true
            });

            onDisconnect(playerRef).remove();

            if (lobby) lobby.classList.add('hidden');
            if (gameBoard) gameBoard.classList.remove('hidden');

            if (txtSolo) txtSolo.innerText = meuSolo + "%";
            if (txtSementes) txtSementes.innerText = minhasSementes + " sementes";
            if (txtFertilizantes) txtFertilizantes.innerText = meusFertilizantes;

            if (musicaFazenda) {
                musicaFazenda.volume = 0.35;
                musicaFazenda.play().catch(erro => {
                    console.log("Áudio aguardando interação do usuário.", erro);
                });
            }

            iniciarEscutasDoJogo();

        } catch (error) {
            console.error("Erro ao entrar na partida:", error);
            mostrarAlerta("Erro ao conectar com o servidor.", "❌");
        }
    });
}

function iniciarEscutasDoJogo() {
    onValue(ref(db, 'partida/controleReset'), (snapshot) => {
        const valorReset = snapshot.val();
        if (valorReset && valorReset > 0) {
            setTimeout(() => {
                window.location.reload();
            }, 300);
        }
    });

    onValue(ref(db, 'jogadores/'), (snapshot) => {
        const dados = snapshot.val();
        if (!listaJogadores) return;
        
        listaJogadores.innerHTML = "<h3>Produtores na Partida:</h3>";
        
        if (dados) {
            const listaIds = Object.keys(dados);
            
            if (listaIds.length === 1 && playerId && listaIds[0] === playerId && turnoAtualPartida > 1) {
                get(ref(db, 'partida/vencedor')).then((vencedorSnap) => {
                    if (!vencedorSnap.val()) {
                        set(ref(db, 'partida/vencedor'), dados[playerId].nome + " (Único Sobrevivente)");
                    }
                });
            }

            listaIds.forEach(id => {
                const pShield = dados[id].turnosProtegidos > 0 ? ` 🛡️(${dados[id].turnosProtegidos}T)` : "";
                
                let statusPlantaVisual = "❌ Sem plantio";
                if (dados[id].estagio === "semeado") statusPlantaVisual = "🟤 Semente Germinando (1/2)";
                if (dados[id].estagio === "crescendo") statusPlantaVisual = "🌱 Em Crescimento (2/2)";
                if (dados[id].estagio === "pronto") statusPlantaVisual = "✨ Pronto para Colher! 🚜";

                listaJogadores.innerHTML += `
                    <p>🚜 <b>${dados[id].nome}</b> ${pShield}<br>
                    🏅 Pontos: ${dados[id].pontuacao} | 🌱 Solo: ${dados[id].solo}% | 📦 Sementes: ${dados[id].sementes} | 🧪 Fertilizantes: ${dados[id].fertilizantes ?? 4}<br>
                    🌾 Lavoura: <b>${statusPlantaVisual}</b></p>
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

        if (faliu) return;

        if (!jogadorDoTurno && playerId) {
            set(ref(db, 'partida/turnoAtual'), playerId);
            return;
        }

        if (jogadorDoTurno === playerId) {
            minhaVez = true;
            const shieldStatus = turnosProtegidosPraga > 0 ? ` [🛡️ Escudo ativo: ${turnosProtegidosPraga}T]` : "";
            
            let lembreteAcao = "";
            if (estagioLavoura === "semeado") lembreteAcao = " (Sua semente está brotando subterraneamente...)";
            if (estagioLavoura === "crescendo") lembreteAcao = " (A planta está crescendo! Quase pronta.)";
            if (estagioLavoura === "pronto") lembreteAcao = " (Safra madura! Hora de colher! 🚜)";

            if (statusTexto) statusTexto.innerText = `🟢 Turno ${turnoAtualPartida} - É a sua vez!${shieldStatus}${lembreteAcao}`;
            botoes.forEach(b => { b.disabled = false; });
        } else {
            minhaVez = false;
            get(ref(db, `jogadores/${jogadorDoTurno}`)).then((playerSnap) => {
                const nomeOponente = playerSnap.exists() ? playerSnap.val().nome : "Outro produtor";
                if (statusTexto) statusTexto.innerText = `⏳ Turno ${turnoAtualPartida} - Vez de: ${nomeOponente}...`;
            });
            botoes.forEach(b => { b.disabled = true; });
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
            if (statusTexto) statusTexto.innerText = "🏁 Partida Encerrada!";
            if (painelAcoes) painelAcoes.classList.add('hidden');
            if (telaFimJogo) telaFimJogo.classList.remove('hidden');
            if (textoVencedor) textoVencedor.innerText = `O Produtor ${vencedor} alcançou a meta e venceu a partida! 🌾🚜`;
        } else {
            if (painelAcoes) painelAcoes.classList.remove('hidden');
            if (telaFimJogo) telaFimJogo.classList.add('hidden');
        }
    });

    onValue(ref(db, 'partida/eventoAtual'), (snapshot) => {
        const evento = snapshot.val();
        const txtClima = document.getElementById('clima-atual');

        if (!evento) return;

        if (txtClima) {
            txtClima.innerHTML = `Clima atual: ${evento.icone} ${evento.nome} (${evento.descricao ?? ''}) | 📅 Turno: <span id="turno-display">${turnoAtualPartida}</span>`;
        }

        switch (evento.tipo) {
            case 'normal': mudarFundo('2.png'); break;
            case 'chuva': mudarFundo('3.png'); break;
            case 'praga': mudarFundo('4.png'); break;
            case 'chuva_forte': mudarFundo('5.png'); break;
            case 'seca': mudarFundo('2.png'); break;
            default: mudarFundo('2.png');
        }

        if (turnoAtualPartida === 1 && evento.tipo !== 'normal') return;

        if (evento.idRodada !== window.ultimaRodadaEfeito) {
            window.ultimaRodadaEfeito = evento.idRodada;

            if (evento.tipo === 'seca') {
                minhasSementes = Math.max(0, minhasSementes - 10);
                mostrarAlerta("A Seca severa queimou suas reservas! Você perdeu 10 sementes.", "🔥");
            }
            else if (evento.tipo === 'chuva') {
                meuSolo = Math.min(100, meuSolo + 15);
                mostrarAlerta("Chuva na hora certa! Seu solo recuperou 15% de umidade.", "🌧️");
            }
            else if (evento.tipo === 'chuva_forte') {
                meuSolo = Math.max(0, meuSolo - 20);
                mostrarAlerta("Tempestade de Chuva Forte! O excesso de água causou erosão (-20% solo)!", "⛈️");
                checarInfeccaoSoloPorTempo();
            }
            else if (evento.tipo === 'praga') {
                if (turnosProtegidosPraga > 0) {
                    mostrarAlerta(`Ataque de Pragas repelido pelo efeito do Defensivo Químico. (${turnosProtegidosPraga}T restantes)`, "🛡️");
                } else if (meuSolo < 55) {
                    meuSolo = Math.max(0, meuSolo - 20);
                    estagioLavoura = "vazio"; 
                    mostrarAlerta("Infestação de Pragas! Como seu solo estava crítico (< 55%), sua lavoura ativa foi devastada.", "🐛");
                } else {
                    mostrarAlerta("Infestação de Pragas! Seu solo resistiu por estar acima de 55%.", "🛡️");
                }
            }

            if (txtSolo) txtSolo.innerText = meuSolo + "%";
            if (txtSementes) txtSementes.innerText = minhasSementes + " sementes";

            checarDerrotaPorSementes();
            checarDegradacaoSolo();
            salvarDadosNoFirebase();
        }
    });
}

function checarDerrotaPorSementes() {
    if (minhasSementes < 20 && estagioLavoura === "vazio" && !faliu) {
        faliu = true;
        minhaVez = false;
        const botoes = document.querySelectorAll('.btn-acao');
        botoes.forEach(b => { b.disabled = true; });
        const statusTexto = document.getElementById('status');
        if (statusTexto) statusTexto.innerText = "❌ Você Faliu!";
        mostrarAlerta("Game Over! Sem sementes para trabalhar e sem cultivos ativos. Você faliu.", "📉");
    }
}

async function executarSaidaEGameOver() {
    if (!playerId) return;
    const meuIdAntigo = playerId;
    playerId = null; 
    if (minhaVez) {
        await forcarPassagemTurnoPorFalecimento(meuIdAntigo);
    }
    await remove(ref(db, 'jogadores/' + meuIdAntigo));
    if (gameBoard) gameBoard.classList.add('hidden');
    if (lobby) lobby.classList.remove('hidden');
    if (inputNome) inputNome.value = "";
    if (musicaFazenda) {
        musicaFazenda.pause();
        musicaFazenda.currentTime = 0;
    }
    mudarFundo('1.png');
}

async function forcarPassagemTurnoPorFalecimento(idFalecido) {
    try {
        const snapshot = await get(ref(db, 'jogadores/'));
        const lista = snapshot.val();
        if (lista) {
            const ids = Object.keys(lista).filter(id => id !== idFalecido);
            if (ids.length > 0) {
                await set(ref(db, 'partida/turnoAtual'), ids[0]);
            }
        }
    } catch(e) { console.error(e); }
}

// --- CONFIGURAÇÃO DOS CLIQUES COM PROTEÇÃO ---
const btnPlantar = document.getElementById('btn-plantar');
if (btnPlantar) {
    btnPlantar.addEventListener('click', () => {
        if (!minhaVez || faliu) return;
        if (estagioLavoura !== "vazio") return mostrarAlerta("O solo já possui um cultivo ativo!", "⚠️");
        if (minhasSementes < 20) return mostrarAlerta("Sementes insuficientes!", "⚠️");
        
        minhasSementes -= 20;
        estagioLavoura = "semeado"; 
        if (txtSementes) txtSementes.innerText = minhasSementes + " sementes";
        mostrarAlerta("Plantio Direto realizado! A semente foi enterrada. Ela precisa de 2 turnos para ficar pronta.", "🌱");
        
        checarDerrotaPorSementes();
        salvarDadosNoFirebase();
        if (!faliu) passarTurnoRapido();
    });
}

const btnAgrotoxico = document.getElementById('btn-Agrotoxico');
if (btnAgrotoxico) {
    btnAgrotoxico.addEventListener('click', () => {
        if (!minhaVez || faliu) return;
        if (meusFertilizantes < 2) return mostrarAlerta("Insumos insuficientes! Você precisa de pelo menos 2 Biofertilizantes para produzir o Defensivo.", "🧪");

        meusFertilizantes -= 2;
        meuSolo = Math.max(0, meuSolo - 10); 
        turnosProtegidosPraga = 4; 

        if (txtFertilizantes) txtFertilizantes.innerText = meusFertilizantes;
        if (txtSolo) txtSolo.innerText = meuSolo + "%";
        mostrarAlerta(`Defensivo aplicado com sucesso! Seu solo perdeu um pouco de umidade (-10%), mas está totalmente protegido contra Pragas por 4 turnos! 🛡️`, "✨");
        
        checarDegradacaoSolo();
        salvarDadosNoFirebase();
        if (!faliu) passarTurnoRapido();
    });
}

const btnFertilizar = document.getElementById('btn-fertilizar');
if (btnFertilizar) {
    btnFertilizar.addEventListener('click', () => {
        if (!minhaVez || faliu) return;
        if (meusFertilizantes <= 0) return mostrarAlerta("Estoque de biofertilizantes zerado!", "🧪");

        meusFertilizantes -= 1;
        meuSolo = Math.min(100, meuSolo + 25); 

        if (txtFertilizantes) txtFertilizantes.innerText = meusFertilizantes;
        if (txtSolo) txtSolo.innerText = meuSolo + "%";
        mostrarAlerta(`Biofertilizante aplicado! Nutrição do solo restaurada em +25%.`, "🧪");

        salvarDadosNoFirebase();
        passarTurnoRapido();
    });
}

const btnComprarFertilizante = document.getElementById('btn-comprar-fertilizante');
if (btnComprarFertilizante) {
    btnComprarFertilizante.addEventListener('click', () => {
        if (!minhaVez || faliu) return;
        if (minhasSementes < 12) return mostrarAlerta("Sementes insuficientes para essa transação!", "⚠️");

        minhasSementes -= 12; 
        meusFertilizantes += 2;

        if (txtSementes) txtSementes.innerText = minhasSementes + " sementes";
        if (txtFertilizantes) txtFertilizantes.innerText = meusFertilizantes;
        mostrarAlerta("Mercadorias entregues! +2 Biofertilizantes no depósito.", "🛒");

        checarDerrotaPorSementes();
        salvarDadosNoFirebase();
    });
}

const btnColher = document.getElementById('btn-colher');
if (btnColher) {
    btnColher.addEventListener('click', () => {
        if (!minhaVez || faliu) return;

        if (estagioLavoura === "pronto") {
            meusPontos += 50;
            minhasSementes += 40; 
            estagioLavoura = "vazio"; 
            meuSolo = Math.max(0, meuSolo - 1); 

            mostrarAlerta("Excelente! Colheita realizada com sucesso: +50 pontos e +40 sementes guardadas.", "🚜");
            if (txtSementes) txtSementes.innerText = minhasSementes + " sementes";
            if (txtSolo) txtSolo.innerText = meuSolo + "%";

            if (meusPontos >= 250) {
                if (inputNome) set(ref(db, 'partida/vencedor'), inputNome.value.trim());
            }
        } else if (estagioLavoura === "semeado") {
            mostrarAlerta("Impossível colher! A semente ainda está germinando debaixo da terra.", "⏳");
            return;
        } else if (estagioLavoura === "crescendo") {
            mostrarAlerta("Quase lá! A planta está em estágio de crescimento. Espere mais um turno.", "🌱");
            return;
        } else {
            mostrarAlerta("Não há nada plantado na sua fazenda para colher!", "❌");
            return;
        }

        checarDerrotaPorSementes();
        salvarDadosNoFirebase();
        if (!faliu) passarTurnoRapido();
    });
}

async function acionarResetGlobalSincronizado() {
    try {
        await set(ref(db, 'jogadores'), null);
        await set(ref(db, 'partida'), {
            numeroTurno: 1,
            turnoAtual: "",
            vencedor: null,
            controleReset: Date.now(), 
            eventoAtual: {
                nome: "Tempo Limpo",
                icone: "🌤️",
                descricao: "Condições ideais para o início do manejo.",
                tipo: "normal",
                idRodada: Date.now()
            }
        });
    } catch (e) {
        console.error("Erro no processo de reset:", e);
    }
}

const btnResetGlobal = document.getElementById('btn-reset-global');
if (btnResetGlobal) btnResetGlobal.addEventListener('click', acionarResetGlobalSincronizado);

function checarDegradacaoSolo() {
    if (meuSolo <= 0) {
        mostrarAlerta("Seu solo está completamente esgotado! Você perdeu 20 pontos por degradação severa.", "🚨");
        meusPontos = Math.max(0, meusPontos - 20);
        meuSolo = 30; 
    }
}

// --- CONTROLE DO MENU DE PAUSE ---
const btnPause = document.getElementById('btn-pause');
const menuPause = document.getElementById('menu-pause');
const btnRetomar = document.getElementById('btn-retomar');

if (btnPause && menuPause) {
    btnPause.addEventListener('click', () => {
        menuPause.classList.remove('hidden');
    });
}

if (btnRetomar && menuPause) {
    btnRetomar.addEventListener('click', () => {
        menuPause.classList.add('hidden');
    });
}

function checarInfeccaoSoloPorTempo() {
    if (meuSolo < 55 && estagioLavoura !== "vazio" && turnosProtegidosPraga <= 0) {
        estagioLavoura = "vazio"; 
        mostrarAlerta("Infestação! Como o seu solo estava fraco (< 55%), pragas destruíram a sua produção!", "🐛");
    }
}

function salvarDadosNoFirebase() {
    if (!playerId || faliu) return;
    update(ref(db, 'jogadores/' + playerId), {
        pontuacao: meusPontos,
        solo: meuSolo,
        sementes: minhasSementes,
        fertilizantes: meusFertilizantes,
        estagio: estagioLavoura, 
        turnosProtegidos: turnosProtegidosPraga 
    });
}

async function passarTurnoRapido() {
    if (faliu) return;

    if (turnosProtegidosPraga > 0) {
        turnosProtegidosPraga--;
    }

    meuSolo = Math.max(0, meuSolo - 5); 
    if (txtSolo) txtSolo.innerText = meuSolo + "%";
    
    if (estagioLavoura === "crescendo") {
        estagioLavoura = "pronto";     
    } else if (estagioLavoura === "semeado") {
        estagioLavoura = "crescendo";  
    }

    checarInfeccaoSoloPorTempo();
    checarDegradacaoSolo(); 
    salvarDadosNoFirebase();

    try {
        const snapshot = await get(ref(db, 'jogadores/'));
        const lista = snapshot.val();
        
        if (lista) {
            const ids = Object.keys(lista);
            let proximoIndex = ids.indexOf(playerId) + 1;
            let novaRodadaCompleta = false;

            if (proximoIndex >= ids.length) {
                proximoIndex = 0;
                novaRodadaCompleta = true;
            }

            const proximoJogadorId = ids[proximoIndex];

            if (novaRodadaCompleta) {
                const proximoTurnoGlobal = turnoAtualPartida + 1;
                await set(ref(db, 'partida/numeroTurno'), proximoTurnoGlobal);

                let eventoSorteado;
                const chance = Math.random();

                if (proximoTurnoGlobal === 1) {
                    if (chance < 0.70) eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal", descricao: "Condições ideais para o início do manejo." };
                    else eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva", descricao: "A umidade ajuda o solo. Todos recuperam 15%." };
                }
                else if (proximoTurnoGlobal === 2) {
                    if (chance < 0.10) eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", tipo: "praga", descricao: "Insetos buscam lavouras desprotegidas." };
                    else if (chance < 0.25) eventoSorteado = { nome: "Seca Prolongada", icone: "🔥", tipo: "seca", descricao: "O calor consome recursos. Todos perdem 10 sementes." };
                    else if (chance < 0.60) eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", tipo: "chuva", descricao: "A umidade ajuda o solo. Todos recuperam 15%." };
                    else eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", tipo: "normal", descricao: "Condições estáveis." };
                }
                else {
                    if (chance < 0.17) {
                        eventoSorteado = { nome: "Tempestade de Chuva Forte", icone: "⛈️", descricao: "Temporal severo causa erosão. Todos perdem 20% de solo.", tipo: "chuva_forte" };
                    } 
                    else if (chance < 0.40) { 
                        eventoSorteado = { nome: "Ataque de Pragas", icone: "🐛", descricao: "Solos críticos (< 55%) perdem a lavoura ativa.", tipo: "praga" };
                    } 
                    else if (chance < 0.70) { 
                        eventoSorteado = { nome: "Chuva Abençoada", icone: "🌧️", descricao: "A umidade ajuda o solo. Todos recuperam 15%.", tipo: "chuva" };
                    } 
                    else {
                        eventoSorteado = { nome: "Tempo Limpo", icone: "🌤️", descricao: "Condições ideais para o manejo.", tipo: "normal" };
                    }
                }

                eventoSorteado.idRodada = Date.now();
                await set(ref(db, 'partida/eventoAtual'), eventoSorteado);
            }

            await set(ref(db, 'partida/turnoAtual'), proximoJogadorId);
        }
    } catch (error) {
        console.error("Erro ao transicionar turno:", error);
    }
}

window.passarTurno = passarTurnoRapido;