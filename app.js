// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO (STATE)
// ==========================================
const appState = {
  currentUser: {
    id: 'arthur',
    name: 'Arthur (Criança)',
    energy: 62
  },
  lastGlycemia: {
    value: 135,
    unit: 'mg/dL',
    time: 'Recentemente',
    status: 'normal' // 'low', 'normal', 'high'
  },
  timeline: [
    {
      id: 1,
      time: '07:00',
      type: 'comida',
      title: '🍞 COMIDA',
      location: 'Casa',
      description: '30g carb — Café da manhã',
      iaComment: '🤖 IA: Bom aporte de energia!'
    },
    {
      id: 2,
      time: '07:30',
      type: 'glicemia',
      title: '🩸 GLICEMIA',
      location: 'Casa',
      description: '112 mg/dL — Antes das aulas',
      iaComment: '🤖 IA: Nível ideal para começar o dia.'
    }
  ],
  medicalLogs: [
    {
      id: 1,
      timestamp: new Date().toLocaleString('pt-BR'),
      event: 'Inicialização',
      details: 'SISTEMA: Dados inicializados com sucesso.'
    }
  ]
};

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  addMedicalLog('SISTEMA: Aplicação carregada e pronta para uso.');
});

// ==========================================
// NAVEGAÇÃO E PERSONAS (SWITCH TABS)
// ==========================================
function switchTab(tabId, event) {
  // Esconde todas as seções de abas
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Desativa visualmente todos os botões da nav
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  // Exibe a aba selecionada
  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  // Ativa o botão correspondente
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }

  // Atualiza o Badge de Persona no Header
  const userBadge = document.getElementById('current-user');
  switch (tabId) {
    case 'arthur':
      userBadge.textContent = 'Persona: Arthur (Criança)';
      break;
    case 'pais':
      userBadge.textContent = 'Persona: Família (Rosa / Mãe)';
      break;
    case 'escola':
      userBadge.textContent = 'Persona: Escola (Professor/Coord.)';
      break;
    case 'medico':
      userBadge.textContent = 'Persona: Dr. Médico (Endocrino)';
      loadDashboard(); // Recarrega os logs ao entrar
      break;
  }
}

// ==========================================
// AÇÕES DO MÓDULO ARTHUR (CRIANÇA)
// ==========================================

// Ações rápidas dos botões em Grid
function quickRegister(type, title) {
  let detail = '';

  if (type === 'glicemia') {
    const value = prompt('Digite o valor da glicemia atual (mg/dL):', '120');
    if (value !== null && !isNaN(value) && value !== '') {
      registerGlycemia(parseInt(value, 10));
      return;
    } else {
      return;
    }
  } else if (type === 'comida') {
    detail = prompt('O que você comeu?', 'Maçã e biscoito');
  } else if (type === 'esporte') {
    detail = prompt('Qual brincadeira ou esporte?', 'Futebol no recreio');
  } else if (type === 'humor') {
    detail = prompt('Como você está se sentindo?', 'Animado');
  }

  if (detail) {
    addEnergy(10);
    showMascotFeedback(`Incrível! Registrei: "${detail}". Ganhou +10 de energia! 🌟`);
    
    // Adiciona na Timeline da família
    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    addTimelineItem(currentTime, type, title.toUpperCase(), 'Escola/Casa', detail, '🤖 IA: Registro efetuado com sucesso!');
  }
}

// Registro de humor direto pelos botões de carinhas
function registerMood(moodText) {
  addEnergy(5);
  showMascotFeedback(`Obrigado por contar! Seu corpo está "${moodText}". +5 de energia! 🌟`);
  
  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  addTimelineItem(currentTime, 'humor', '😊 HUMOR', 'Escola/Casa', `Sentindo-se: ${moodText}`, '🤖 IA: Acompanhamento de bem-estar registrado.');
}

// Aumenta a energia / pontuação
function addEnergy(points) {
  appState.currentUser.energy = Math.min(100, appState.currentUser.energy + points);
  updateEnergyUI();
}

function updateEnergyUI() {
  const scoreElem = document.getElementById('energy-score');
  const fillElem = document.getElementById('energy-fill');

  if (scoreElem) scoreElem.textContent = `${appState.currentUser.energy} / 100 pts`;
  if (fillElem) fillElem.style.width = `${appState.currentUser.energy}%`;
}

// Exibe a caixinha com feedback do mascote IA
function showMascotFeedback(message) {
  const mascotBox = document.getElementById('ia-mascot-box');
  const mascotText = document.getElementById('ia-mascot-text');

  if (mascotBox && mascotText) {
    mascotText.textContent = message;
    mascotBox.style.display = 'flex';
    
    // Oculta automaticamente após 6 segundos
    setTimeout(() => {
      mascotBox.style.display = 'none';
    }, 6000);
  }
}

// ==========================================
// REGISTRO DE GLICEMIA E REPERCUSSÃO GLOBAL
// ==========================================
function registerGlycemia(value) {
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  let status = 'normal';
  let badgeText = 'NORMAL';
  let iaMsg = '🤖 IA: Nível dentro da meta recomendada.';

  if (value < 70) {
    status = 'low';
    badgeText = 'BAIXA (HIPO)';
    iaMsg = '🤖 ALERTA IA: Atenção! Risco de hipoglicemia. Consumir carboidrato rápido.';
    triggerSchoolAlert(value);
  } else if (value > 180) {
    status = 'high';
    badgeText = 'ALTA (HIPER)';
    iaMsg = '🤖 IA: Atenção, glicemia acima da meta. Verificar hidratação/correção.';
  }

  // Atualiza Estado
  appState.lastGlycemia = {
    value: value,
    unit: 'mg/dL',
    time: `Hoje às ${timeStr}`,
    status: status
  };

  // Ganha pontos pela medição
  addEnergy(15);
  showMascotFeedback(`Glicemia de ${value} mg/dL registrada! +15 de energia! 🩸`);

  // Atualiza Interface Global
  updateUI();

  // Adiciona ao Histórico de Timeline
  addTimelineItem(timeStr, 'glicemia', '🩸 GLICEMIA', 'Registro', `${value} mg/dL`, iaMsg);

  // Log Médico
  addMedicalLog(`GLICEMIA: Medição de ${value} mg/dL registrada às ${timeStr}. Status: ${status.toUpperCase()}`);
}

// Atualização de elementos da UI dependentes da Glicemia
function updateGlycemiaDisplay() {
  const { value, time, status } = appState.lastGlycemia;

  // Atualiza Módulo Família
  const famVal = document.getElementById('fam-glycemia-val');
  const famTime = document.getElementById('fam-glycemia-time');
  const famBadge = document.getElementById('fam-glycemia-badge');

  if (famVal) famVal.textContent = value;
  if (famTime) famTime.textContent = time;
  if (famBadge) {
    famBadge.className = `glycemia-status-badge ${status}`;
    const statusLabels = { low: 'BAIXA', normal: 'NORMAL', high: 'ALTA' };
    famBadge.querySelector('span').textContent = statusLabels[status] || 'NORMAL';
  }

  // Atualiza Módulo Escola
  const escolaVal = document.getElementById('escola-glicemia-val');
  const escolaStatus = document.getElementById('escola-glicemia-status');

  if (escolaVal) escolaVal.textContent = `${value} mg/dL`;
  if (escolaStatus) {
    escolaStatus.className = `status-tag ${status}`;
    const statusLabels = { low: 'Atenção: Baixa', normal: 'Status Normal', high: 'Atenção: Alta' };
    escolaStatus.textContent = statusLabels[status] || 'Status Normal';
  }
}

// Alerta acionado em caso de hipoglicemia
function triggerSchoolAlert(value) {
  const alertBanner = document.getElementById('whatsapp-alert-banner');
  if (alertBanner) {
    alertBanner.style.display = 'block';
    alertBanner.textContent = `📲 ALERTA AUTOMÁTICO: Glicemia baixa detectada (${value} mg/dL)! Notificação enviada via WhatsApp para os Pais!`;
  }
}

// ==========================================
// TIMELINE E HISTÓRICO
// ==========================================
function addTimelineItem(time, type, title, location, description, iaComment) {
  const item = {
    id: Date.now(),
    time,
    type,
    title,
    location,
    description,
    iaComment
  };

  appState.timeline.unshift(item); // Adiciona no início da lista
  renderTimeline();
}

function renderTimeline() {
  const container = document.getElementById('family-timeline');
  if (!container) return;

  container.innerHTML = appState.timeline.map(item => `
    <div class="timeline-item">
      <span class="time">${item.time}</span>
      <div class="timeline-card">
        <div class="card-header">
          <strong>${item.title}</strong>
          <span class="tag home">${item.location}</span>
        </div>
        <p>${item.description}</p>
        <small class="ia-subtext">${item.iaComment}</small>
      </div>
    </div>
  `).join('');
}

// ==========================================
// BUSCA DE ALIMENTOS E ASSISTENTE IA (MODAL)
// ==========================================
function handleFoodSearch(event) {
  if (event.key === 'Enter') {
    const query = event.target.value.trim();
    if (query) {
      openAssistantModal();
      sendAutomaticAssistantMessage(`Poderia calcular os carboidratos de: "${query}"?`);
      event.target.value = '';
    }
  }
}

function openAssistantModal() {
  const modal = document.getElementById('assistant-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAssistantModal() {
  const modal = document.getElementById('assistant-modal');
  if (modal) modal.style.display = 'none';
}

function handleEnter(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();

  if (text) {
    appendChatMessage('user', text);
    input.value = '';
    
    // Simula resposta inteligente da IA
    setTimeout(() => {
      generateAIResponse(text);
    }, 800);
  }
}

function sendAutomaticAssistantMessage(text) {
  appendChatMessage('user', text);
  setTimeout(() => {
    generateAIResponse(text);
  }, 800);
}

function appendChatMessage(sender, text) {
  const chatBox = document.getElementById('chat-messages');
  if (!chatBox) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${sender === 'user' ? 'user' : 'bot'}`;
  msgDiv.textContent = text;

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function generateAIResponse(userText) {
  const lower = userText.toLowerCase();
  let response = 'Estou analisando a solicitação... Lembre-se sempre de conferir a prescrição médica para fatores de sensibilidade.';

  if (lower.includes('pão') || lower.includes('queijo')) {
    response = '🍞 1 Pão francês com queijo contém aprox. 28g a 30g de carboidratos. Excelente opção para café da manhã!';
  } else if (lower.includes('maçã') || lower.includes('fruta')) {
    response = '🍎 1 Maçã média contém cerca de 15g a 18g de carboidratos com alto teor de fibras.';
  } else if (lower.includes('glicemia') || lower.includes('corrigir')) {
    response = '🩸 Para correções de glicemia, verifique o Fator de Sensibilidade estipulado pelo endocrinologista antes de aplicar qualquer dose extra de insulina.';
  } else if (lower.includes('suco')) {
    response = '🧃 1 Copo de suco de laranja (200ml) possui aprox. 20g de carboidrato de rápida absorção, ideal para tratar hipoglicemias.';
  }

  appendChatMessage('bot', response);
  addMedicalLog(`IA ASSISTENTE: Dúvida respondida para o usuário -> "${userText}"`);
}

// ==========================================
// MÓDULO MÉDICO E LOGS
// ==========================================
function addMedicalLog(details) {
  const log = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    details
  };
  appState.medicalLogs.unshift(log);
}

function loadDashboard() {
  const logsContainer = document.getElementById('medical-logs');
  if (!logsContainer) return;

  logsContainer.innerHTML = appState.medicalLogs.map(log => `
    <div class="log-item" style="padding: 8px 0; border-bottom: 1px solid #eee; font-family: monospace; font-size: 0.85rem;">
      <span style="color: #666;">[${log.timestamp}]</span> <strong>${log.details}</strong>
    </div>
  `).join('');
}

// ==========================================
// ATUALIZAÇÃO GERAL DA INTERFACE
// ==========================================
function updateUI() {
  updateEnergyUI();
  updateGlycemiaDisplay();
  renderTimeline();
}