const SUPABASE_URL = "https://ecxpqfjhgmmrlkwvfwcb.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable__kEK59Xeoo9jxoMgHNY3Kw_1r2D40rg";

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


(() => {
  const chatScroll = document.getElementById('chatScroll');
  const quickRepliesEl = document.getElementById('quickReplies');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('composerInput');
  const sendBtn = form.querySelector('.composer-send');

  const previewStatus = document.getElementById('previewStatus');
  const resumeAvatar = document.getElementById('resumeAvatar');
  const resumeName = document.getElementById('resumeName');
  const resumeRole = document.getElementById('resumeRole');
  const resumeSummary = document.getElementById('resumeSummary');
  const resumeExperience = document.getElementById('resumeExperience');
  const resumeEducation = document.getElementById('resumeEducation');
  const resumeSkills = document.getElementById('resumeSkills');
  const progressFill = document.getElementById('progressFill');
  const progressPct = document.getElementById('progressPct');

  const data = { name: '', role: '', experience: '', education: '', skills: '', summary: '' };

  // ---------- Conversation script ----------
  // Each step: ai message(s), optional quick replies, and what to do with the free-text answer.
  let stepIndex = 0;
  let awaitingFreeText = false;

  const steps = [
    {
      ai: ['Olá! 👋 Sou o assistente de currículo do My Resume.',
           'Posso te ajudar a montar um currículo profissional em poucos minutos, respondendo algumas perguntas rápidas. Vamos começar?'],
      replies: ['Vamos começar', 'Como funciona?'],
      onReply: (choice) => {
        if (choice === 'Como funciona?') {
          pushAI('Simples: eu vou perguntando (cargo, experiência, formação, habilidades) e você responde por aqui. O seu currículo vai se montando ao vivo ali no painel ao lado. No final você pode baixar em PDF.');
          setQuickReplies(['Vamos começar']);
          return 'stay';
        }
        return 'next';
      }
    },
    {
      ai: ['Ótimo! Primeiro, qual é o seu nome completo?'],
      field: 'name',
      placeholder: 'Ex: João Silva',
      after: (val) => {
        resumeName.textContent = val;
        resumeName.classList.remove('placeholder');
        resumeAvatar.textContent = val.trim().charAt(0).toUpperCase() || '?';
        updateProgress();
      }
    },
    {
      ai: (d) => [`Prazer, ${firstName(d.name)}! Qual cargo ou área você está buscando no momento?`],
      field: 'role',
      placeholder: 'Ex: Analista de Marketing Pleno',
      after: (val) => {
        resumeRole.textContent = val;
        resumeRole.classList.remove('placeholder');
        updateProgress();
      }
    },
    {
      ai: ['Perfeito. Agora me conta sobre sua experiência mais recente — cargo, empresa e principais atividades.'],
      field: 'experience',
      placeholder: 'Ex: Analista de Marketing na Nuvem Co. — gestão de campanhas e redes sociais',
      after: (val) => {
        resumeExperience.textContent = val;
        resumeExperience.classList.remove('placeholder');
        updateProgress();
      }
    },
    {
      ai: ['Show! E sobre a sua formação acadêmica — curso, instituição e ano de conclusão.'],
      field: 'education',
      placeholder: 'Ex: Marketing — Universidade XYZ, 2021',
      after: (val) => {
        resumeEducation.textContent = val;
        resumeEducation.classList.remove('placeholder');
        updateProgress();
      }
    },
    {
      ai: ['Quase lá! Liste suas principais habilidades, separadas por vírgula.'],
      field: 'skills',
      placeholder: 'Ex: Excel, Gestão de projetos, Copywriting',
      after: (val) => {
        renderSkills(val);
        updateProgress();
      }
    },
    {
      ai: ['Última pergunta: escreva 1 ou 2 frases sobre você para o resumo do currículo — ou clique em "Gerar automaticamente".'],
      replies: ['Gerar automaticamente'],
      field: 'summary',
      placeholder: 'Ex: Profissional com 3 anos de experiência em marketing digital...',
      onReply: (choice) => {
        if (choice === 'Gerar automaticamente') {
          const auto = `Profissional dedicado(a), buscando a vaga de ${data.role || 'nova oportunidade'}, com experiência em ${firstSkill(data.skills)} e foco em resultados.`;
          data.summary = auto;
          resumeSummary.textContent = auto;
          resumeSummary.classList.remove('placeholder');
          updateProgress();
        }
        return 'next';
      },
      after: (val) => {
        resumeSummary.textContent = val;
        resumeSummary.classList.remove('placeholder');
        updateProgress();
      }
    },
    {
      ai: (d) => [`Gerando o currículo com base no que você me contou, ${firstName(d.name)}...`],
      final: true
    }
  ];

  function firstName(full) {
    return (full || '').trim().split(' ')[0] || 'você';
  }
  function firstSkill(skills) {
    const list = (skills || '').split(',').map(s => s.trim()).filter(Boolean);
    return list.length ? list[0].toLowerCase() : 'diversas áreas';
  }

  function renderSkills(raw) {
    const list = raw.split(',').map(s => s.trim()).filter(Boolean);
    resumeSkills.innerHTML = '';
    if (!list.length) {
      resumeSkills.innerHTML = '<span class="placeholder">Ainda não preenchido</span>';
      return;
    }
    list.forEach(skill => {
      const tag = document.createElement('span');
      tag.className = 'skill-tag';
      tag.textContent = skill;
      resumeSkills.appendChild(tag);
    });
  }

  function updateProgress() {
    const fields = ['name', 'role', 'experience', 'education', 'skills', 'summary'];
    const filled = fields.filter(f => data[f] && data[f].trim().length > 0).length;
    const pct = Math.round((filled / fields.length) * 100);
    progressFill.style.width = pct + '%';
    progressPct.textContent = pct + '%';
    if (pct === 100) {
      previewStatus.textContent = 'Concluído';
      previewStatus.classList.add('done');
    }
  }

  // ---------- Chat rendering ----------
  function scrollToBottom() {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }

  function pushMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'ai' ? 'IA' : (firstName(data.name).charAt(0).toUpperCase() || 'V');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    chatScroll.appendChild(wrap);
    scrollToBottom();
  }

  function pushAI(text) { pushMessage('ai', text); }
  function pushUser(text) { pushMessage('user', text); }

  function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'msg ai typing';
    wrap.id = 'typingIndicator';
    wrap.innerHTML = `
      <div class="msg-avatar">IA</div>
      <div class="bubble">
        <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      </div>`;
    chatScroll.appendChild(wrap);
    scrollToBottom();
  }
  function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  async function aiSay(text, delay = 550) {
    showTyping();
    await wait(delay);
    hideTyping();
    pushAI(text);
    await wait(150);
  }

  function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

  function setQuickReplies(list) {
    quickRepliesEl.innerHTML = '';
    if (!list || !list.length) return;
    list.forEach(label => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => handleChoice(label));
      quickRepliesEl.appendChild(btn);
    });
  }
  function clearQuickReplies() { quickRepliesEl.innerHTML = ''; }

  function setInputEnabled(enabled, placeholder) {
    input.disabled = !enabled;
    sendBtn.disabled = !enabled;
    input.placeholder = placeholder || (enabled ? 'Digite sua resposta…' : 'Aguardando resposta da IA…');
    if (enabled) input.focus();
  }

  async function runStep() {
    const step = steps[stepIndex];
    if (!step) return;

    const lines = typeof step.ai === 'function' ? step.ai(data) : step.ai;
    for (const line of lines) {
      await aiSay(line);
    }

    if (step.final) {
      await finishResume();
      return;
    }

    setQuickReplies(step.replies);
    if (step.field) {
      awaitingFreeText = true;
      setInputEnabled(true, step.placeholder);
    } else {
      setInputEnabled(false);
    }
  }

  async function finishResume() {
    setInputEnabled(false);
    await wait(900);
    await aiSay(`Pronto! Seu currículo foi criado com sucesso, ${firstName(data.name)}. 🎉 Você pode baixá-lo em PDF ou continuar editando.`);
    setQuickReplies(['Baixar PDF', 'Editar currículo', 'Criar outro currículo']);
  }

  async function handleChoice(label) {
    clearQuickReplies();
    pushUser(label);
    setInputEnabled(false);

    const step = steps[stepIndex];

    if (label === 'Baixar PDF') {
      await aiSay('Preparando o arquivo... o download começaria aqui em uma versão conectada ao gerador de PDF. 📄');
      setQuickReplies(['Editar currículo', 'Criar outro currículo']);
      return;
    }
    if (label === 'Editar currículo') {
      await aiSay('Claro! Me diga o que você quer alterar (nome, cargo, experiência, formação, habilidades ou resumo).');
      return;
    }
    if (label === 'Criar outro currículo') {
      await aiSay('Boa! Vamos começar um novo currículo do zero.');
      resetResume();
      return;
    }

    if (step && step.onReply) {
      const result = step.onReply(label);
      if (result === 'stay') return;
    }

    stepIndex++;
    await runStep();
  }

  async function handleFreeText(text) {
    const step = steps[stepIndex];
    pushUser(text);
    setInputEnabled(false);
    clearQuickReplies();

    if (step && step.field) {
      data[step.field] = text;
      if (step.after) step.after(text);
    }

    stepIndex++;
    await runStep();
  }

  function resetResume() {
    stepIndex = 0;
    Object.keys(data).forEach(k => data[k] = '');
    resumeName.textContent = 'Seu nome aparece aqui';
    resumeName.classList.add('placeholder');
    resumeRole.textContent = 'Cargo desejado';
    resumeRole.classList.add('placeholder');
    resumeSummary.textContent = 'Ainda não preenchido';
    resumeSummary.classList.add('placeholder');
    resumeExperience.textContent = 'Ainda não preenchido';
    resumeExperience.classList.add('placeholder');
    resumeEducation.textContent = 'Ainda não preenchido';
    resumeEducation.classList.add('placeholder');
    resumeSkills.innerHTML = '<span class="placeholder">Ainda não preenchido</span>';
    resumeAvatar.textContent = '?';
    previewStatus.textContent = 'Em andamento';
    previewStatus.classList.remove('done');
    progressFill.style.width = '0%';
    progressPct.textContent = '0%';
    runStep();
  }

  // ---------- Events ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || input.disabled) return;
    input.value = '';
    handleFreeText(text);
  });

  // ---------- Boot ----------
  setInputEnabled(false);
  runStep();
})();



async function testarConexao() {

    const { data, error } = await clienteSupabase
        .from("login")
        .select("*")
        .limit(1);

    if (error) {

        console.error(error);

        document.getElementById("mensagem").textContent =
            "Erro ao conectar com o Supabase.";

        return;
    }

    console.log(data);

    document.getElementById("mensagem").textContent =
        "Conexão com o Supabase funcionando!";
}