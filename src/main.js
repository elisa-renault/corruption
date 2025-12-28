const CLASSES = {
  Veilleur: {
    description: 'Scrutinizes presence and silence to expose who hid during the cycle.',
    ability: 'Note the players who were absent or silent this cycle.'
  },
  Archiviste: {
    description: 'Rebuilds the story of previous votes to expose inconsistencies.',
    ability: 'Recap last cycle’s votes and highlight suspicious pivots.'
  },
  Pourvoyeur: {
    description: 'Ventures outside to bring back resources for the village.',
    ability: 'Secure a cache of supplies and hand it to a villager.'
  },
  Sentinelle: {
    description: 'Pressures a present villager to explain their actions.',
    ability: 'Force a player to justify their behaviour, raising heat if they stumble.'
  }
};

const NAMES = ['Ardan', 'Faye', 'Mirel', 'Caspian', 'Lyra', 'Tamsin', 'Rogan', 'Isolde', 'Dorian'];

const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr
  .map((value) => ({ value, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value);

class Game {
  constructor() {
    this.players = [];
    this.cycle = 1;
    this.eventLog = [];
    this.discussionLog = [];
    this.lastVotes = [];
    this.awaitingVote = false;
    this.ended = false;
  }

  start() {
    this.players = [];
    this.cycle = 1;
    this.eventLog = [];
    this.discussionLog = [];
    this.lastVotes = [];
    this.awaitingVote = false;
    this.ended = false;

    const pool = shuffle([...NAMES]);
    const classes = shuffle(Object.keys(CLASSES));
    const playerCount = 7;
    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        id: i,
        name: i === 0 ? 'You' : pool[i],
        clazz: classes[i % classes.length],
        corrupted: false,
        alive: true,
        exploring: false,
        suspicion: Math.random() * 2,
        lastAction: null
      });
    }

    const corruptedCount = 2;
    const candidates = shuffle([...this.players.keys()].filter((i) => i !== 0));
    for (let i = 0; i < corruptedCount; i++) {
      this.players[candidates[i]].corrupted = true;
    }

    if (Math.random() < 0.35) {
      this.players[0].corrupted = true;
    }

    this.logEvent('A new village stirs. Corruption hides in the shadows.', 'start');
  }

  alivePlayers() {
    return this.players.filter((p) => p.alive);
  }

  healthyPlayers() {
    return this.players.filter((p) => p.alive && !p.corrupted);
  }

  corruptedPlayers() {
    return this.players.filter((p) => p.alive && p.corrupted);
  }

  getPlayer(id) { return this.players.find((p) => p.id === id); }

  updateSuspicion(targetId, amount) {
    const player = this.getPlayer(targetId);
    if (!player || !player.alive) return;
    player.suspicion = Math.max(0, player.suspicion + amount);
  }

  actionTargets(excludeId) {
    return this.alivePlayers().filter((p) => p.id !== excludeId);
  }

  resolveCycle(playerAction) {
    if (this.awaitingVote || this.ended) return;
    this.awaitingVote = true;
    this.discussionLog = [];

    this.alivePlayers().forEach((p) => {
      p.exploring = false;
      p.lastAction = null;
    });

    const actions = new Map();
    const human = this.getPlayer(0);
    const chosenTarget = playerAction?.targetId;
    const actionType = human?.alive ? playerAction?.type : 'idle';

    actions.set(0, { type: actionType, targetId: chosenTarget });

    this.alivePlayers()
      .filter((p) => p.id !== 0)
      .forEach((p) => {
        actions.set(p.id, this.planAiAction(p));
      });

    this.logEvent(`Cycle ${this.cycle}: actions resolve.`, 'cycle');

    for (const player of this.alivePlayers()) {
      const act = actions.get(player.id);
      if (act?.type === 'explore') {
        player.exploring = true;
        player.lastAction = 'explore';
        const outcome = this.exploreOutcome(player);
        this.logEvent(outcome, 'explore');
        this.updateSuspicion(player.id, 0.6);
      }
    }

    for (const player of this.alivePlayers()) {
      const act = actions.get(player.id);
      player.lastAction = act?.type ?? 'idle';

      switch (act?.type) {
        case 'ability':
          this.resolveAbility(player, act.targetId);
          break;
        case 'corrupt':
          this.resolveCorruption(player, act.targetId);
          break;
        case 'idle':
          this.logEvent(`${player.name} keeps their distance, watching quietly.`, 'idle');
          this.updateSuspicion(player.id, -0.2);
          break;
        case 'explore':
          break;
        default:
          this.logEvent(`${player.name} hesitates, unsure what to do.`, 'idle');
      }
    }

    this.simulateDiscussion();
  }

  planAiAction(player) {
    if (!player.alive) return { type: 'idle' };
    const availableTargets = this.actionTargets(player.id);
    const topSuspect = availableTargets.sort((a, b) => b.suspicion - a.suspicion)[0];

    if (player.corrupted && this.healthyPlayers().length > 0) {
      const shouldCorrupt = Math.random() < 0.55;
      if (shouldCorrupt) {
        const candidates = this.healthyPlayers();
        const target = randomOf(candidates);
        return { type: 'corrupt', targetId: target?.id };
      }
    }

    if (player.clazz === 'Sentinelle' && Math.random() < 0.65) {
      return { type: 'ability', targetId: topSuspect?.id };
    }

    const roll = Math.random();
    if (roll < 0.4) {
      return { type: 'ability', targetId: topSuspect?.id };
    }
    if (roll < 0.65) {
      return { type: 'explore' };
    }
    return { type: 'idle' };
  }

  resolveAbility(player, targetId) {
    switch (player.clazz) {
      case 'Veilleur':
        this.resolveVeilleur(player);
        break;
      case 'Archiviste':
        this.resolveArchiviste(player);
        break;
      case 'Pourvoyeur':
        this.resolvePourvoyeur(player);
        break;
      case 'Sentinelle':
        this.resolveSentinelle(player, targetId);
        break;
      default:
        this.logEvent(`${player.name} fumbles their ability.`, 'ability');
    }
  }

  resolveVeilleur(player) {
    const absent = this.alivePlayers().filter((p) => p.exploring && p.id !== player.id);
    if (absent.length === 0) {
      this.logEvent(`${player.name} found everyone accounted for. No obvious absences.`, 'ability');
      return;
    }
    const names = absent.map((p) => p.name).join(', ');
    this.logEvent(`${player.name} notes who slipped away: ${names}. Eyes narrow.`, 'ability');
    absent.forEach((p) => this.updateSuspicion(p.id, 1.2));
  }

  resolveArchiviste(player) {
    if (this.lastVotes.length === 0) {
      this.logEvent(`${player.name} reviews old parchments but finds no vote records yet.`, 'ability');
      return;
    }
    const pivots = this.lastVotes.filter((v) => v.pivot);
    const recap = this.lastVotes
      .map((v) => `${this.getPlayer(v.voter)?.name ?? 'Unknown'} → ${this.getPlayer(v.target)?.name ?? 'Unknown'}`)
      .join('; ');
    this.logEvent(`${player.name} recites the last vote: ${recap}.`, 'ability');
    if (pivots.length) {
      pivots.forEach((pivot) => this.updateSuspicion(pivot.voter, 1.5));
      const pivotNames = pivots.map((p) => this.getPlayer(p.voter)?.name ?? 'Unknown').join(', ');
      this.logEvent(`Inconsistencies sting: ${pivotNames} wavered when pressure rose.`, 'ability');
    }
  }

  resolvePourvoyeur(player) {
    const resource = randomOf(['medicinal herbs', 'a torch', 'a lockbox', 'scraps of food', 'rumors from scouts']);
    const recipient = randomOf(this.alivePlayers().filter((p) => p.id !== player.id));
    if (recipient) {
      this.updateSuspicion(recipient.id, -0.4);
      this.logEvent(`${player.name} returns with ${resource} and hands it to ${recipient.name}. Spirits lift.`, 'ability');
    } else {
      this.logEvent(`${player.name} gathers ${resource} for the village stores.`, 'ability');
    }
  }

  resolveSentinelle(player, targetId) {
    const target = this.getPlayer(targetId) || randomOf(this.actionTargets(player.id));
    if (!target) {
      this.logEvent(`${player.name} scans the crowd but no one answers.`, 'ability');
      return;
    }
    const stumble = Math.random() < (target.corrupted ? 0.7 : 0.3);
    this.logEvent(`${player.name} corners ${target.name} for an explanation. ${stumble ? 'Words falter.' : 'The story mostly holds.'}`, 'ability');
    this.updateSuspicion(target.id, stumble ? 1.8 : 0.6);
  }

  resolveCorruption(player, targetId) {
    if (!player.corrupted || !player.alive) {
      this.logEvent(`${player.name} hesitates. The corruption does not answer.`, 'corrupt');
      return;
    }
    const target = this.getPlayer(targetId) || randomOf(this.healthyPlayers());
    if (!target || !target.alive || target.corrupted) {
      this.logEvent(`${player.name} fails to find a vulnerable target.`, 'corrupt');
      return;
    }
    target.corrupted = true;
    this.logEvent(`A chill clings to ${target.name}. Nothing seems different, yet trust frays.`, 'corrupt');
    this.updateSuspicion(target.id, 0.5);
  }

  exploreOutcome(player) {
    const finds = [
      `${player.name} forages quietly. Minor supplies acquired.`,
      `${player.name} dodges shadows and returns winded but empty-handed.`,
      `${player.name} spotted movement beyond the treeline. Unease grows.`,
      `${player.name} hears whispers in the dark. They return unsettled.`,
      `${player.name} finds a hidden path that could help later.`
    ];
    return randomOf(finds);
  }

  simulateDiscussion() {
    const talkers = this.alivePlayers().filter((p) => p.id !== 0);
    const human = this.getPlayer(0);
    const silentNames = this.alivePlayers().filter((p) => p.exploring).map((p) => p.name).join(', ');
    if (silentNames) {
      this.addDiscussion(`Absent from the circle: ${silentNames}. Their silence weighs on the room.`);
    }

    talkers.forEach((speaker) => {
      const pool = this.actionTargets(speaker.id).filter((p) => p.alive);
      if (pool.length === 0) return;
      let target;
      if (speaker.corrupted) {
        const healthy = pool.filter((p) => !p.corrupted);
        target = healthy.sort((a, b) => b.suspicion - a.suspicion)[0] || randomOf(pool);
      } else {
        target = pool.sort((a, b) => b.suspicion - a.suspicion)[0];
      }
      if (!target) return;
      const line = `${speaker.name} levels an accusation at ${target.name}. ${this.accusationFlavor(target)}`;
      this.addDiscussion(line);
      this.updateSuspicion(target.id, 1.1);
    });

    if (human?.alive) {
      this.addDiscussion('You may steer the conversation. Choose carefully during the vote.');
    } else {
      this.addDiscussion('You observe from the shadows. The village acts without you.');
    }
  }

  accusationFlavor(target) {
    const remarks = [
      `${target.name} avoided eye contact.`,
      `${target.name} keeps changing their story.`,
      `Too convenient that ${target.name} was gone during the chaos.`,
      `${target.name} feels colder than before.`,
      `No one can confirm ${target.name}'s whereabouts.`
    ];
    return randomOf(remarks);
  }

  resolveVote(humanChoiceId) {
    if (!this.awaitingVote || this.ended) return;
    const alive = this.alivePlayers();
    if (alive.length === 0) return;

    const votes = new Map();
    const pushVote = (voterId, targetId, pivot = false) => {
      if (voterId === undefined || targetId === undefined) return;
      votes.set(voterId, targetId);
      const previousVote = this.lastVotes.find((v) => v.voter === voterId);
      const pivotFlag = previousVote && previousVote.target !== targetId;
      this.lastVotes = this.lastVotes.filter((v) => v.voter !== voterId);
      this.lastVotes.push({ voter: voterId, target: targetId, pivot: pivotFlag || pivot });
    };

    const human = this.getPlayer(0);
    if (human?.alive) {
      pushVote(0, humanChoiceId);
    }

    alive
      .filter((p) => p.id !== 0)
      .forEach((p) => {
        const pool = this.actionTargets(p.id).filter((t) => t.alive);
        if (!pool.length) return;
        const weighted = pool
          .map((t) => ({ player: t, weight: t.suspicion + (p.corrupted && t.corrupted ? -2 : 0) }))
          .sort((a, b) => b.weight - a.weight);
        const choice = weighted[0].player;
        pushVote(p.id, choice.id);
      });

    const tally = new Map();
    votes.forEach((target) => {
      tally.set(target, (tally.get(target) || 0) + 1);
    });
    const maxVotes = Math.max(...tally.values());
    const candidates = [...tally.entries()].filter(([, v]) => v === maxVotes).map(([id]) => this.getPlayer(id));
    const eliminated = randomOf(candidates);

    this.logEvent(`Votes converge on ${eliminated.name} (${maxVotes} vote${maxVotes > 1 ? 's' : ''}).`, 'vote');
    eliminated.alive = false;
    eliminated.exploring = false;
    this.awaitingVote = false;

    const corruptedAlive = this.corruptedPlayers().length;
    const healthyAlive = this.healthyPlayers().length;

    if (corruptedAlive === 0) {
      this.logEvent('All sources of corruption are gone. The village survives.', 'victory');
      this.ended = true;
      return 'village';
    }

    if (healthyAlive === 0) {
      this.logEvent('Corruption holds every beating heart. The village falls.', 'victory');
      this.ended = true;
      return 'corruption';
    }

    this.cycle += 1;
    this.alivePlayers().forEach((p) => { p.exploring = false; p.lastAction = null; });
    this.logEvent(`A new cycle begins. The village steels itself for night ${this.cycle}.`, 'cycle');
    return 'continue';
  }

  logEvent(text, tag = 'info') {
    this.eventLog.push({ text, tag, timestamp: Date.now() });
    renderEventLog();
  }

  addDiscussion(text) {
    this.discussionLog.push({ text, timestamp: Date.now() });
    renderDiscussionLog();
  }
}

const game = new Game();
const elements = {
  cycleCounter: document.getElementById('cycle-counter'),
  playerRole: document.getElementById('player-role'),
  roleDescription: document.getElementById('role-description'),
  abilityHelp: document.getElementById('ability-help'),
  playerStatus: document.getElementById('player-status'),
  playerList: document.getElementById('player-list'),
  discussionLog: document.getElementById('discussion-log'),
  eventLog: document.getElementById('event-log'),
  actionForm: document.getElementById('action-form'),
  actionOptions: document.getElementById('action-options'),
  targetSelect: document.getElementById('target-select'),
  targetField: document.getElementById('target-field'),
  corruptOption: document.getElementById('corrupt-option'),
  resolveActions: document.getElementById('resolve-actions'),
  voteForm: document.getElementById('vote-form'),
  voteSelect: document.getElementById('vote-select'),
  castVote: document.getElementById('cast-vote'),
  phaseIndicator: document.getElementById('phase-indicator'),
  voteStatus: document.getElementById('vote-status'),
  clearLog: document.getElementById('clear-log'),
  actionHint: document.getElementById('action-hint'),
  newGame: document.getElementById('new-game')
};

function renderPlayers() {
  elements.playerList.innerHTML = '';
  game.players.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    const name = document.createElement('div');
    name.innerHTML = `<strong>${p.name}</strong><div class="player-meta">${p.clazz}</div>`;

    const chips = document.createElement('div');
    if (p.alive) {
      const chip = document.createElement('span');
      chip.className = 'chip chip-alive';
      chip.textContent = 'Alive';
      chips.appendChild(chip);
    }
    if (p.exploring && p.alive) {
      const chip = document.createElement('span');
      chip.className = 'chip chip-exploring';
      chip.textContent = 'Exploring';
      chips.appendChild(chip);
    }
    if (!p.alive) {
      const chip = document.createElement('span');
      chip.className = 'chip chip-dead';
      chip.textContent = 'Eliminated';
      chips.appendChild(chip);
    }

    card.appendChild(name);
    card.appendChild(chips);
    elements.playerList.appendChild(card);
  });
}

function renderEventLog() {
  elements.eventLog.innerHTML = '';
  game.eventLog.slice(-80).forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.innerHTML = `<span class="tag ${entry.tag === 'victory' ? 'secondary' : ''}">${entry.tag}</span>${entry.text}`;
    elements.eventLog.appendChild(div);
  });
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function renderDiscussionLog() {
  elements.discussionLog.innerHTML = '';
  game.discussionLog.slice(-120).forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.textContent = entry.text;
    elements.discussionLog.appendChild(div);
  });
  elements.discussionLog.scrollTop = elements.discussionLog.scrollHeight;
}

function renderRole() {
  const you = game.getPlayer(0);
  elements.playerRole.textContent = `${you.clazz} — ${you.corrupted ? 'Corrupted' : 'Sain'}`;
  elements.roleDescription.textContent = CLASSES[you.clazz].description;
  elements.abilityHelp.textContent = CLASSES[you.clazz].ability;
  elements.playerStatus.textContent = you.alive ? 'Alive' : 'Eliminated';
  elements.playerStatus.classList.toggle('bad', !you.alive);
  elements.cycleCounter.textContent = game.cycle;
}

function renderVoteOptions() {
  elements.voteSelect.innerHTML = '';
  game.alivePlayers().forEach((p) => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    elements.voteSelect.appendChild(option);
  });
}

function populateTargets() {
  elements.targetSelect.innerHTML = '';
  game.actionTargets(0).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    elements.targetSelect.appendChild(opt);
  });
}

function updateActionAvailability() {
  const you = game.getPlayer(0);
  const corruptVisible = you.corrupted && you.alive && game.healthyPlayers().length > 0;
  elements.corruptOption.classList.toggle('hidden', !corruptVisible);

  const actionRadios = elements.actionOptions.querySelectorAll('input[name="action"]');
  actionRadios.forEach((radio) => {
    if (radio.value === 'corrupt' && !corruptVisible) {
      radio.checked = false;
    }
  });

  const chosen = [...actionRadios].find((r) => r.checked)?.value;
  const needsTarget = chosen === 'corrupt' || you.clazz === 'Sentinelle';
  elements.targetField.classList.toggle('hidden', !needsTarget);
}

function refreshUI() {
  renderRole();
  renderPlayers();
  renderEventLog();
  renderDiscussionLog();
  renderVoteOptions();
  populateTargets();
  updateActionAvailability();
  updatePhaseIndicators();
}

function updatePhaseIndicators() {
  if (game.ended) {
    elements.phaseIndicator.textContent = 'Game over';
    elements.voteStatus.textContent = 'Game over';
  } else {
    elements.phaseIndicator.textContent = game.awaitingVote ? 'Discussion → Ready to vote' : 'Awaiting actions';
    elements.voteStatus.textContent = game.awaitingVote ? 'Pick a target to eliminate' : 'Pending actions';
  }
  elements.castVote.disabled = !game.awaitingVote || game.ended;

  const you = game.getPlayer(0);
  elements.resolveActions.disabled = game.awaitingVote || game.ended || !you.alive;
}

function gatherPlayerAction() {
  const you = game.getPlayer(0);
  const chosen = elements.actionOptions.querySelector('input[name="action"]:checked')?.value || 'idle';
  const targetId = Number(elements.targetSelect.value);
  return {
    type: chosen,
    targetId: you.clazz === 'Sentinelle' || chosen === 'corrupt' ? targetId : undefined
  };
}

function handleActionSubmit(event) {
  event.preventDefault();
  if (game.awaitingVote || game.ended) return;
  const you = game.getPlayer(0);
  const action = you?.alive ? gatherPlayerAction() : { type: 'idle' };
  game.resolveCycle(action);
  updatePhaseIndicators();
  renderPlayers();
}

function handleVoteSubmit(event) {
  event.preventDefault();
  if (!game.awaitingVote || game.ended) return;
  const choice = Number(elements.voteSelect.value);
  game.resolveVote(choice);
  refreshUI();
}

function handleActionChange() {
  updateActionAvailability();
}

function handleNewGame() {
  game.start();
  refreshUI();
}

function bootstrap() {
  elements.actionForm.addEventListener('submit', handleActionSubmit);
  elements.voteForm.addEventListener('submit', handleVoteSubmit);
  elements.actionOptions.addEventListener('change', handleActionChange);
  elements.targetSelect.addEventListener('change', handleActionChange);
  elements.clearLog.addEventListener('click', () => { game.eventLog = []; renderEventLog(); });
  elements.newGame.addEventListener('click', () => handleNewGame());

  game.start();
  refreshUI();
  game.logEvent('Choose your action to begin the first cycle.', 'hint');
}

bootstrap();
