    // ─────────────────────────────────────────────
    // URL BASE PARA COMPARTIR — edita esta variable
    // ─────────────────────────────────────────────
    const SHARE_BASE_URL  = 'https://juanjmerono.github.io/skratica/';
    const SESSION_TTL_MS  = 1 * 60 * 60 * 1000; // 1 hora
    const RESET_TTL_MS    = 15 * 60 * 1000;     // 15 minutos (solo payload reset)

    // ─────────────────────────────────────────────
    // CONFIGURACIÓN DE LETRAS
    // ─────────────────────────────────────────────
    const LETTERS = [
      { letter: 'A',  score: 1,  weight: 12 },
      { letter: 'E',  score: 1,  weight: 12 },
      { letter: 'O',  score: 1,  weight: 9  },
      { letter: 'I',  score: 1,  weight: 6  },
      { letter: 'S',  score: 1,  weight: 6  },
      { letter: 'N',  score: 1,  weight: 5  },
      { letter: 'R',  score: 1,  weight: 5  },
      { letter: 'U',  score: 1,  weight: 5  },
      { letter: 'D',  score: 2,  weight: 5  },
      { letter: 'L',  score: 1,  weight: 4  },
      { letter: 'T',  score: 1,  weight: 4  },
      { letter: 'C',  score: 3,  weight: 4  },
      { letter: 'M',  score: 3,  weight: 3  },
      { letter: 'P',  score: 3,  weight: 2  },
      { letter: 'B',  score: 3,  weight: 2  },
      { letter: 'G',  score: 2,  weight: 2  },
      { letter: 'H',  score: 4,  weight: 2  },
      { letter: 'F',  score: 4,  weight: 1  },
      { letter: 'V',  score: 4,  weight: 1  },
      { letter: 'Y',  score: 4,  weight: 1  },
      { letter: 'Q',  score: 5,  weight: 1  },
      { letter: 'J',  score: 8,  weight: 1  },
      { letter: 'Ñ',  score: 8,  weight: 1  },
      { letter: 'X',  score: 8,  weight: 1  },
      { letter: 'Z',  score: 10, weight: 1  },
    ];

    // Equipos: clave interna A/B/C/D, nombre y colores configurables libremente
    const TEAMS_POOL = {
      A: {
        label:          'Azul',
        captainKeyHash: 'a4bd1d3a69aa0ea6ffb1298c8c26be4b333526cae7d27f2362f89857157701ce',
        color:          '#5278e0',
        tileBg:         '#f0f3fd',
        tileBorder:     '#c4cce8',
        glow:           'rgba(82, 120, 224, 0.55)',
        qrColor:        '#000000',
      },
      B: {
        label:          'Rojo',
        captainKeyHash: '49bfb8998b3fabca7428df603bb2b263e099ce2959e96207669eeab330b85bbc',
        color:          '#e05252',
        tileBg:         '#fdf0f0',
        tileBorder:     '#e8c4c4',
        glow:           'rgba(82, 82, 82, 0.55)',
        qrColor:        '#000000',
      },
      C: {
        label:          'Verde',
        captainKeyHash: 'ec061fafb777f2943027f2deb3c17961556c386cad45065f343a74aea1177ad0',
        color:          '#52c052',
        tileBg:         '#f0fdf0',
        tileBorder:     '#c4e8c4',
        glow:           'rgba(82, 192, 82, 0.55)',
        qrColor:        '#000000',
      },
      D: {
        label:          'Amarillo',
        captainKeyHash: 'e07198ba050a32495f45e76e102a28e9b062828bf7a51fd8ed4462f53e0205d9',
        color:          '#c8b820',
        tileBg:         '#fdfbf0',
        tileBorder:     '#e8e0a0',
        glow:           'rgba(200, 184, 32, 0.55)',
        qrColor:        '#000000',
      },
    };
    let TEAMS = {};

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────
    const totalWeight = LETTERS.reduce((sum, l) => sum + l.weight, 0);

    function weightedRandom() {
      let rand = Math.random() * totalWeight;
      for (const entry of LETTERS) {
        rand -= entry.weight;
        if (rand <= 0) return entry;
      }
      return LETTERS[LETTERS.length - 1];
    }

    function letterEntry(l) {
      return LETTERS.find(e => e.letter === l) || { letter: l, score: 0 };
    }

    function applyTeamCSS(teamConf) {
      const root = document.documentElement;
      root.style.setProperty('--team-color',      teamConf.color);
      root.style.setProperty('--team-tile-bg',     teamConf.tileBg);
      root.style.setProperty('--team-tile-border', teamConf.tileBorder);
      root.style.setProperty('--team-glow',        teamConf.glow);
    }

    // ─────────────────────────────────────────────
    // TIEMPO DE RED — evita diferencias de reloj entre dispositivos
    // ─────────────────────────────────────────────
    async function getNetworkTime() {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(SHARE_BASE_URL, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        const dateHeader = res.headers.get('Date');
        if (dateHeader) {
          const t = Date.parse(dateHeader);
          if (!isNaN(t)) return t;
        }
      } catch (e) {
        console.warn('[skratica] getNetworkTime falló, usando reloj local', e);
      }
      return Date.now();
    }

    // ─────────────────────────────────────────────
    // PERSISTENCIA
    // ─────────────────────────────────────────────

    // Devuelve el label de sesión basado en la hora UTC del created_at
    function getSessionLabel(created, teamCount) {
      const remainingMs = created + SESSION_TTL_MS - Date.now();
      let next;
      if (remainingMs >= 3600000) {
        next = `next game in ${Math.ceil(remainingMs / 3600000)}h`;
      } else {
        next = `next game in ${Math.max(1, Math.ceil(remainingMs / 60000))}m`;
      }
      return {
        current: `Game ${String(teamCount).padStart(2, '0')}`,
        next,
      };
    }

    // Comprueba si la sesión ha expirado (TTL 12h).
    // Devuelve el created_at vigente (ya sea existente o recién creado).
    // Si expira, borra todo el storage y recarga — en ese caso no retorna.
    async function checkAndResetIfExpired() {
      const now = await getNetworkTime();
      const raw = localStorage.getItem('skratica_created_at');
      const created = parseInt(raw, 10);

      if (isNaN(created)) {
        // Primera visita: registrar timestamp de red
        localStorage.setItem('skratica_created_at', now.toString());
        return now;
      }

      if (now - created > SESSION_TTL_MS) {
        // TTL expirado: borrar todo y recargar
        ['skratica_letter','skratica_team','skratica_mode','skratica_word',
         'skratica_word_bonus','skratica_word_order','skratica_word_used',
         'skratica_word_used_bonuses','skratica_word_final',
         'skratica_share_url','skratica_surplus_shared','skratica_surplus_url',
         'skratica_used_tiles','skratica_created_at',
         'skratica_captain','skratica_captain_id','skratica_captain_url',
         'skratica_captain_score','skratica_captain_scanned','skratica_captain_finished',
         'skratica_captain_started_at','skratica_team_count',
        ].forEach(k => localStorage.removeItem(k));
        location.reload();
        return;
      }

      return created;
    }

    function getOrAssignLetter() {
      const saved = localStorage.getItem('skratica_letter');
      if (saved) {
        const entry = LETTERS.find(l => l.letter === saved);
        if (entry) return entry;
      }
      const entry = weightedRandom();
      localStorage.setItem('skratica_letter', entry.letter);
      return entry;
    }

    function getOrAssignTeam() {
      const saved = localStorage.getItem('skratica_team');
      if (saved && TEAMS[saved]) return saved;
      const keys = Object.keys(TEAMS);
      const team = keys[Math.floor(Math.random() * keys.length)];
      localStorage.setItem('skratica_team', team);
      return team;
    }

    function teamCountInValidRange(n) {
      return n >= 1 && n <= 4;
    }

    function resolveTeamCount() {
      const saved = localStorage.getItem('skratica_team_count');
      if (saved) {
        const n = parseInt(saved, 10);
        if (teamCountInValidRange(n)) return n;
      }
      const params = new URLSearchParams(location.search);
      const fromUrl = params.get('teams');
      if (fromUrl) {
        const n = parseInt(fromUrl, 10);
        if (teamCountInValidRange(n)) {
          localStorage.setItem('skratica_team_count', n);
          return n;
        }
      }
      localStorage.setItem('skratica_team_count', 4);
      return 4;
    }

    function getMode()       { return localStorage.getItem('skratica_mode') || 'intro'; }
    function setMode(m)      { localStorage.setItem('skratica_mode', m); }
    function getWordLetters(){ return JSON.parse(localStorage.getItem('skratica_word') || '[]'); }
    function setWordLetters(arr){ localStorage.setItem('skratica_word', JSON.stringify(arr)); }
    function getWordBonuses(){ return JSON.parse(localStorage.getItem('skratica_word_bonus') || '[]'); }

    // Devuelve skratica_word_order como string de letras (nuevo formato: JSON array de índices)
    function getWordOrderStr(letters) {
      const raw = localStorage.getItem('skratica_word_order');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(i => letters[i].toUpperCase()).join('');
      } catch(e) {}
      return raw; // fallback formato antiguo
    }
    function setWordBonuses(arr){ localStorage.setItem('skratica_word_bonus', JSON.stringify(arr)); }

    // Elige un bonus según la antigüedad de la letra escaneada (en ms)
    // Bonus de letra más probables que de palabra; magnitud mayor cuanto más rápido
    function pickBonus(ageMs) {
      const age = ageMs / 1000; // segundos
      let weights;
      if (age < 5) {
        // Muy rápido: ×3 más probable
        weights = [{ b: '3L', w: 35 }, { b: '2L', w: 35 }, { b: '3W', w: 20 }, { b: '2W', w: 10 }];
      } else if (age < 15) {
        weights = [{ b: '3L', w: 25 }, { b: '2L', w: 35 }, { b: '3W', w: 15 }, { b: '2W', w: 25 }];
      } else {
        // Lento: ×2 más probable
        weights = [{ b: '3L', w: 15 }, { b: '2L', w: 40 }, { b: '3W', w: 10 }, { b: '2W', w: 35 }];
      }
      const total = weights.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      for (const { b, w } of weights) { r -= w; if (r <= 0) return b; }
      return '2L';
    }

    // Calcula si un bonus aplica según la posición (1-indexed)
    // ×2 → posición par (2,4,6…); ×3 → posición impar (1,3,5…)
    function bonusApplies(bonus, pos1indexed) {
      if (bonus === '1') return false;
      const isOdd = pos1indexed % 2 !== 0;
      if (bonus === '3L' || bonus === '3W') return isOdd;
      if (bonus === '2L' || bonus === '2W') return !isOdd;
      return false;
    }

    // Devuelve el multiplicador de letra y de palabra que aplica en una posición
    function bonusMultipliers(bonus, pos1indexed) {
      if (!bonusApplies(bonus, pos1indexed)) return { letter: 1, word: 1 };
      if (bonus === '2L') return { letter: 2, word: 1 };
      if (bonus === '3L') return { letter: 3, word: 1 };
      if (bonus === '2W') return { letter: 1, word: 2 };
      if (bonus === '3W') return { letter: 1, word: 3 };
      return { letter: 1, word: 1 };
    }

    // ─────────────────────────────────────────────
    // CONSTRUCCIÓN DE LETRAS PEQUEÑAS
    // ─────────────────────────────────────────────
    // bonus: '1' | '2L' | '3L' | '2W' | '3W'
    // active: true si el bonus aplica según la posición en la palabra
    function buildMiniTile(letterStr, bonus, active) {
      const entry = letterEntry(letterStr);
      const tile  = document.createElement('div');
      tile.className = 'mini-tile';
      tile.dataset.letter = entry.letter;
      if (bonus && bonus !== '1') tile.dataset.bonus = bonus;
      const l = document.createElement('span');
      l.className = 'mini-tile-letter';
      l.textContent = entry.letter;
      const s = document.createElement('span');
      s.className = 'mini-tile-score';
      s.textContent = entry.score;
      tile.appendChild(l);
      tile.appendChild(s);
      if (bonus && bonus !== '1') {
        const b = document.createElement('span');
        b.className = 'mini-tile-bonus' + (active ? ' bonus-active' : '');
        b.textContent = bonus === '2L' ? '×2L'
                      : bonus === '3L' ? '×3L'
                      : bonus === '2W' ? '×2P'
                      : '×3P';
        tile.appendChild(b);
      }
      return tile;
    }

    // letters: array de letras usadas en el orden de la palabra (1-indexed por posición)
    // bonuses: array paralelo de bonus; si no se pasa se ignoran multiplicadores
    function calcScore(letters, bonuses) {
      if (!bonuses || bonuses.length === 0) {
        return letters.reduce((sum, l) => sum + (letterEntry(l).score || 0), 0);
      }
      let letterTotal = 0;
      let wordMult    = 1;
      letters.forEach((l, i) => {
        const pos   = i + 1; // 1-indexed
        const bonus = bonuses[i] || '1';
        const { letter: lm, word: wm } = bonusMultipliers(bonus, pos);
        letterTotal += (letterEntry(l).score || 0) * lm;
        if (wm > wordMult) wordMult = wm;
      });
      return letterTotal * wordMult;
    }

    // Actualiza opacidad de letras según qué letras están usadas en inputStr
    // Devuelve { used, unused }
    function applyUsageToTilesAndReturn(inputStr, allLetters) {
      const pool = allLetters.map(l => l.toUpperCase());
      const used = [];

      for (const ch of inputStr.toUpperCase()) {
        const idx = pool.indexOf(ch);
        if (idx !== -1) { used.push(allLetters[idx]); pool.splice(idx, 1); }
      }
      // Las que quedan en pool son no usadas — sus índices originales
      // Necesitamos marcar cada tile del DOM
      const usedOriginal = [...used];
      const poolOriginal = allLetters.map(l => l.toUpperCase());
      const consumed     = [];
      for (const ch of inputStr.toUpperCase()) {
        const idx = poolOriginal.indexOf(ch);
        if (idx !== -1) { consumed.push(idx); poolOriginal.splice(idx, 1); }
      }

      const tiles = document.querySelectorAll('#tiles-row .mini-tile');
      // Rebuilding: consumed has original indices of used tiles
      // Easier: mark by iterating tiles with a fresh pool
      const markPool = allLetters.map(l => l.toUpperCase());
      const inputUpper = inputStr.toUpperCase();
      // Which original-index positions are used?
      const usedIndices = new Set();
      const tmpPool = allLetters.map((l, i) => ({ l: l.toUpperCase(), i }));
      for (const ch of inputUpper) {
        const found = tmpPool.find(x => x.l === ch);
        if (found) {
          usedIndices.add(found.i);
          tmpPool.splice(tmpPool.indexOf(found), 1);
        }
      }

      tiles.forEach((tile, i) => {
        if (usedIndices.has(i)) {
          tile.classList.remove('unused');
        } else {
          tile.classList.add('unused');
        }
      });

      const unused = allLetters.filter((_, i) => !usedIndices.has(i));
      return { used: used, unused };
    }

    function applyUsageToTiles(inputStr, allLetters) {
      applyUsageToTilesAndReturn(inputStr, allLetters);
    }

    // Dado un array de índices (de letters[]), devuelve las letras y bonuses usados en ese orden exacto
    function getUsedWithBonusesByIndices(indices, allLetters, allBonuses) {
      const used        = indices.map(i => allLetters[i]);
      const usedBonuses = indices.map(i => (allBonuses && allBonuses[i]) || '1');
      return { used, usedBonuses };
    }

    // Versión inteligente: usa índices del localStorage si el formato es array JSON,
    // sino fallback al método por string. Garantiza bonus correcto aunque haya letras duplicadas.
    function getUsedWithBonusesSmart(allLetters, allBonuses) {
      const raw = localStorage.getItem('skratica_word_order');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return getUsedWithBonusesByIndices(parsed, allLetters, allBonuses);
          }
        } catch(e) {}
      }
      // Fallback: buscar por string
      const wordStr = getWordOrderStr(allLetters) || allLetters.join('');
      return getUsedWithBonuses(wordStr, allLetters, allBonuses);
    }

    // Dado un wordStr, allLetters y allBonuses, devuelve las letras y bonuses usados en orden de palabra
    function getUsedWithBonuses(wordStr, allLetters, allBonuses) {
      const wordUp = (wordStr || '').toUpperCase();
      const tmpPool = allLetters.map((l, i) => ({ l: l.toUpperCase(), i }));
      const used = [];
      const usedBonuses = [];
      for (const ch of wordUp) {
        const found = tmpPool.find(x => x.l === ch);
        if (found) {
          used.push(allLetters[found.i]);
          usedBonuses.push((allBonuses && allBonuses[found.i]) || '1');
          tmpPool.splice(tmpPool.indexOf(found), 1);
        }
      }
      return { used, usedBonuses };
    }

    // Reconstruye las mini-tiles del #tiles-row mostrando bonus activos según posición en la palabra    // allLetters: array de letras acumuladas (índice original)
    // allBonuses: array paralelo de bonus
    // wordStr: palabra en el orden actual (para calcular posiciones)
    function rebuildTilesWithBonuses(container, allLetters, allBonuses, wordStr) {
      container.innerHTML = '';
      const wordUp = (wordStr || '').toUpperCase();

      // Mapear índices originales al orden de la palabra
      const tmpPool = allLetters.map((l, i) => ({ l: l.toUpperCase(), i }));
      const orderedIndices = []; // índices originales en el orden de wordStr
      for (const ch of wordUp) {
        const found = tmpPool.find(x => x.l === ch);
        if (found) {
          orderedIndices.push(found.i);
          tmpPool.splice(tmpPool.indexOf(found), 1);
        }
      }
      // Índices de letras no usadas (sobrantes)
      const usedSet = new Set(orderedIndices);
      const unusedIndices = allLetters.map((_, i) => i).filter(i => !usedSet.has(i));

      // Primera pasada: letras usadas en orden de la palabra
      orderedIndices.forEach((origIdx, pos0) => {
        const letter = allLetters[origIdx];
        const bonus  = (allBonuses && allBonuses[origIdx]) || '1';
        const active = bonusApplies(bonus, pos0 + 1);
        container.appendChild(buildMiniTile(letter, bonus, active));
      });

      // Segunda pasada: letras sobrantes al final, tenues
      unusedIndices.forEach(origIdx => {
        const letter = allLetters[origIdx];
        const bonus  = (allBonuses && allBonuses[origIdx]) || '1';
        const tile   = buildMiniTile(letter, bonus, false);
        tile.classList.add('unused');
        container.appendChild(tile);
      });
    }

    // Genera el texto de desglose de bonus aplicados para un conjunto de letras usadas
    // usedLetters: array de letras en orden de palabra, usedBonuses: array paralelo
    // Devuelve string vacío si no hay ningún bonus activo
    function buildBonusBreakdown(usedLetters, usedBonuses) {
      if (!usedBonuses || usedBonuses.length === 0) return '';

      const letterParts = {}; // '×2L' → [pos, pos, ...]
      let wordBonus     = 1;
      let wordBonusLabel = '';

      usedLetters.forEach((_, i) => {
        const pos   = i + 1;
        const bonus = usedBonuses[i] || '1';
        if (!bonusApplies(bonus, pos)) return;

        if (bonus === '2L' || bonus === '3L') {
          const label = bonus === '2L' ? '×2L' : '×3L';
          if (!letterParts[label]) letterParts[label] = [];
          letterParts[label].push('P' + pos);
        } else if (bonus === '2W' || bonus === '3W') {
          const mult = bonus === '2W' ? 2 : 3;
          if (mult > wordBonus) {
            wordBonus      = mult;
            wordBonusLabel = (bonus === '2W' ? '×2P' : '×3P') + ' en P' + pos;
          }
        }
      });

      const parts = [];
      for (const [label, positions] of Object.entries(letterParts)) {
        parts.push(label + ' en ' + positions.join(', '));
      }
      if (wordBonusLabel) parts.push(wordBonusLabel);

      if (parts.length === 0) return '';
      let text = parts.join(' · ');
      if (wordBonus > 1) text += ' → ×' + wordBonus + ' palabra';
      return text;
    }

    // ─────────────────────────────────────────────
    // MOSTRAR VISTAS
    // ─────────────────────────────────────────────
    function showError(title, msg, onClose) {
      document.getElementById('view-normal').style.display = 'none';
      document.getElementById('view-intro').classList.remove('active');
      document.getElementById('view-word').classList.remove('active');
      document.getElementById('view-done').classList.remove('active');
      document.getElementById('view-captain').classList.remove('active');
      document.getElementById('error-title').textContent = title;
      document.getElementById('error-msg').textContent   = msg;
      document.getElementById('view-error').classList.add('active');

      // Clonar el botón para limpiar cualquier listener previo acumulado
      const closeBtn = document.getElementById('error-close');
      const freshBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(freshBtn, closeBtn);
      freshBtn.addEventListener('click', () => {
        document.getElementById('view-error').classList.remove('active');
        if (onClose) onClose();
      });
    }

    function showIntroView(teamConf, onScanCaptain, onBeCaptain) {
      document.getElementById('view-normal').style.display = 'none';
      document.getElementById('view-intro').classList.remove('active');
      document.getElementById('team-label-intro').textContent = teamConf.label;
      document.getElementById('view-intro').classList.add('active');

      // Clonar botones para limpiar listeners previos
      const btnStart   = document.getElementById('btn-start');
      const btnCaptain = document.getElementById('btn-captain');
      const freshStart   = btnStart.cloneNode(true);
      const freshCaptain = btnCaptain.cloneNode(true);
      btnStart.parentNode.replaceChild(freshStart, btnStart);
      btnCaptain.parentNode.replaceChild(freshCaptain, btnCaptain);

      if (onScanCaptain) freshStart.addEventListener('click', onScanCaptain);
      if (onBeCaptain)   freshCaptain.addEventListener('click', onBeCaptain);
    }

    function initReorderUI(letters, bonuses) {
      let selected = [];

      // Helper: convierte skratica_word_order (array JSON de índices) a string de letras
      function getWordOrderStr() {
        const raw = localStorage.getItem('skratica_word_order');
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map(i => letters[i].toUpperCase()).join('');
        } catch(e) {}
        return raw; // fallback: formato antiguo era string de letras
      }

      function getWordStr() {
        return selected.map(i => letters[i].toUpperCase()).join('');
      }

      function persist() {
        if (selected.length) localStorage.setItem('skratica_word_order', JSON.stringify(selected));
        else localStorage.removeItem('skratica_word_order');
      }

      function updatePreviewAndScore(wordStr) {
        let used, usedBonuses;
        if (wordStr !== undefined && selected.length > 0) {
          // Modo reordenar activo: usar índices exactos para bonus correcto
          ({ used, usedBonuses } = getUsedWithBonusesByIndices(selected, letters, bonuses));
          document.getElementById('word-preview').textContent = wordStr.toUpperCase();
        } else {
          // Modo normal o sin selección: derivar desde el orden guardado
          const word = getWordOrderStr() || letters.join('').toUpperCase();
          document.getElementById('word-preview').textContent = word.toUpperCase();
          // Intentar usar índices guardados si el formato es array
          const raw = localStorage.getItem('skratica_word_order');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                ({ used, usedBonuses } = getUsedWithBonusesByIndices(parsed, letters, bonuses));
              }
            } catch(e) {}
          }
          if (!used) ({ used, usedBonuses } = getUsedWithBonuses(word, letters, bonuses));
        }
        document.getElementById('partial-score').textContent   = calcScore(used, usedBonuses);
        document.getElementById('bonus-breakdown').textContent = buildBonusBreakdown(used, usedBonuses);

        // Validar palabra contra el diccionario
        const wordForDict = used.join('').toLowerCase();
        const statusEl = document.getElementById('validation-status');
        if (used.length > 0 && typeof WORDS_ES !== 'undefined') {
          if (WORDS_ES.has(wordForDict)) {
            statusEl.textContent = '✓ Válida';
            statusEl.className = 'validation-status valid';
          } else {
            statusEl.textContent = '✗ No válida';
            statusEl.className = 'validation-status invalid';
          }
        } else {
          statusEl.textContent = '';
          statusEl.className = 'validation-status';
        }
      }

      function renderPoolNormal() {
        // Modo normal: letras no incluidas en el orden guardado marcadas como unused
        const row = document.getElementById('tiles-row');
        row.innerHTML = '';
        const raw = localStorage.getItem('skratica_word_order');
        let usedSet = new Set();
        let currentWord = letters.join('').toUpperCase();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              usedSet = new Set(parsed);
              currentWord = parsed.map(i => letters[i].toUpperCase()).join('');
            } else {
              // fallback string antiguo
              const tmpPool = letters.map((l, i) => ({ l: l.toUpperCase(), i }));
              for (const ch of raw.toUpperCase()) {
                const found = tmpPool.find(x => x.l === ch);
                if (found) { usedSet.add(found.i); tmpPool.splice(tmpPool.indexOf(found), 1); }
              }
              currentWord = raw.toUpperCase();
            }
          } catch(e) { currentWord = raw.toUpperCase(); }
        }

        letters.forEach((letter, idx) => {
          const bonus  = (bonuses && bonuses[idx]) || '1';
          const pos    = raw ? ([...usedSet].indexOf(idx) + 1) : 0;
          const active = bonusApplies(bonus, pos);
          const tile   = buildMiniTile(letter, bonus, active);
          if (raw && !usedSet.has(idx)) tile.classList.add('unused');
          row.appendChild(tile);
        });
      }

      function renderPoolReorder() {
        // Modo reordenar: letras clickables, seleccionadas en .unused
        const selectedSet = new Set(selected);
        const row = document.getElementById('tiles-row');
        row.innerHTML = '';
        letters.forEach((letter, idx) => {
          const bonus = (bonuses && bonuses[idx]) || '1';
          const tile  = buildMiniTile(letter, bonus, false);
          if (selectedSet.has(idx)) tile.classList.add('unused');
          tile.addEventListener('click', () => {
            if (new Set(selected).has(idx)) return;
            selected.push(idx);
            persist();
            renderPoolReorder();
            updatePreviewAndScore(getWordStr());
          });
          row.appendChild(tile);
        });
      }

      function enterReorderMode() {
        // Siempre empezar con selección vacía; el usuario recompone la palabra desde cero
        selected = [];

        document.getElementById('word-preview').textContent    = '';
        document.getElementById('partial-score').textContent   = '0';
        document.getElementById('bonus-breakdown').textContent = '';

        document.getElementById('btn-reorder').style.display = 'none';
        document.getElementById('reorder-area').classList.add('active');
        renderPoolReorder();
      }

      function exitReorderMode() {
        // Si no se seleccionó ninguna letra, usar todas en orden natural
        if (selected.length === 0) {
          selected = letters.map((_, i) => i);
        }
        persist();
        document.getElementById('reorder-area').classList.remove('active');
        document.getElementById('btn-reorder').style.display = '';
        renderPoolNormal();
        updatePreviewAndScore();
      }

      // Clonar botones para limpiar listeners previos al re-entrar en la vista
      ['btn-reorder-back', 'btn-reorder-confirm', 'btn-reorder'].forEach(id => {
        const el = document.getElementById(id);
        const clone = el.cloneNode(true);
        el.replaceWith(clone);
      });

      document.getElementById('btn-reorder').addEventListener('click', enterReorderMode);

      document.getElementById('btn-reorder-back').addEventListener('click', () => {
        if (selected.length) {
          selected.pop();
          persist();
          renderPoolReorder();
          updatePreviewAndScore(getWordStr());
        }
      });

      document.getElementById('btn-reorder-confirm').addEventListener('click', exitReorderMode);

      // Renderizado inicial en modo normal
      renderPoolNormal();
      updatePreviewAndScore();
    }

    function showWordView(teamConf, letters) {
      document.getElementById('view-normal').style.display = 'none';
      const bonuses = getWordBonuses();

      document.getElementById('team-label-word').textContent = teamConf.label;
      document.getElementById('view-word').classList.add('active');

      initReorderUI(letters, bonuses);
    }

    function showDoneView(teamConf, letters, myTeamKey) {
      document.getElementById('view-normal').style.display = 'none';
      document.getElementById('view-word').classList.remove('active');

      const allBonuses = getWordBonuses();

      // Letras usadas = las que forman la palabra en el orden confirmado
      const { used: usedLetters, usedBonuses } = getUsedWithBonusesSmart(letters, allBonuses);
      const confirmedWord = usedLetters.join('');

      // Letras sobrantes = las que no entraron en la palabra
      const unusedLetters = (() => {
        const p = [...letters];
        usedLetters.forEach(l => { const i = p.indexOf(l); if (i !== -1) p.splice(i, 1); });
        return p;
      })();

      // Letras sobrantes ya compartidas
      const sharedAlready  = JSON.parse(localStorage.getItem('skratica_surplus_shared') || '[]');
      const pendingLetters = (() => {
        const pool = [...sharedAlready];
        return unusedLetters.filter(l => {
          const i = pool.indexOf(l);
          if (i !== -1) { pool.splice(i, 1); return false; }
          return true;
        });
      })();

      const row = document.getElementById('tiles-row-done');
      row.innerHTML = '';

      // Letras usadas con badge según posición
      usedLetters.forEach((l, pos0) => {
        const bonus  = usedBonuses[pos0] || '1';
        const active = bonusApplies(bonus, pos0 + 1);
        const t = buildMiniTile(l, bonus, active);
        row.appendChild(t);
      });

      // Letras sobrantes: pendientes (tenues) o ya compartidas (muy tenues)
      const sharedMark = [...sharedAlready];
      unusedLetters.forEach(l => {
        const t = buildMiniTile(l, '1', false);
        const si = sharedMark.indexOf(l);
        if (si !== -1) { sharedMark.splice(si, 1); t.classList.add('shared'); }
        else { t.classList.add('unused'); }
        row.appendChild(t);
      });

      const score = calcScore(usedLetters, usedBonuses);

      document.getElementById('word-display').textContent          = confirmedWord.toUpperCase();
      document.getElementById('final-score-value').textContent     = score;
      document.getElementById('team-label-done').textContent       = teamConf.label;
      document.getElementById('bonus-breakdown-done').textContent  = buildBonusBreakdown(usedLetters, usedBonuses);
      document.getElementById('final-team-msg').innerHTML          =
        `${score} puntos para el equipo <strong>${teamConf.label}</strong>`;

      document.getElementById('btn-surplus').style.display = pendingLetters.length > 0 ? '' : 'none';

      // Generar QR de palabra para que el capitán lo escanee
      const _captainId = localStorage.getItem('skratica_captain_id') || '';
      const _wordQrTs  = Date.now();
      const _wordQrId  = Math.random().toString(36).slice(2, 10);
      const _wordQrPayload = btoa(`word,${myTeamKey},${confirmedWord},${score},${_captainId},${_wordQrTs},${_wordQrId}`);
      const _wordQrUrl = `${SHARE_BASE_URL}/?tile=${_wordQrPayload}`;
      const _wordQrEl  = document.getElementById('done-word-qr-code');
      _wordQrEl.innerHTML = '';
      new QRCode(_wordQrEl, {
        text:         _wordQrUrl,
        width:        200,
        height:       200,
        colorDark:    teamConf.qrColor,
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
      document.getElementById('done-word-qr-area').style.display = '';

      document.getElementById('view-done').classList.add('active');
    }

    // ─────────────────────────────────────────────
    // PROCESAMIENTO DEL PARÁMETRO ?tile=
    // ─────────────────────────────────────────────
    // ─────────────────────────────────────────────
    // PROCESAMIENTO QR CAPITÁN
    // ─────────────────────────────────────────────

    // Valida el QR generado por el capitán (payload: "captain,TEAM,TS,ID")
    // Válido durante SESSION_TTL_MS (2h) en lugar de los 40s de las letras normales
    function processCaptainQR(encoded, myTeamKey) {
      let payload;
      try { payload = atob(encoded); } catch {
        return { ok: false, title: 'Código no válido', msg: 'El código del capitán no se puede leer.' };
      }
      const parts = payload.split(',');
      if (parts.length !== 4 || parts[0] !== 'captain') {
        return { ok: false, title: 'Código no válido', msg: 'Este no es un código de capitán.' };
      }
      const [, inTeam, inTsStr, inId] = parts;
      const inTs = parseInt(inTsStr, 10);
      if (inTeam !== myTeamKey) {
        return { ok: false, title: 'Equipo incorrecto', msg: 'Este no es el capitán de tu equipo. Escanea el código QR del capitán de tu equipo.' };
      }
      if (isNaN(inTs) || Date.now() - inTs > SESSION_TTL_MS) {
        return { ok: false, title: 'Código caducado', msg: 'El código del capitán ha caducado. Pide al capitán que lo regenere.' };
      }
      localStorage.setItem('skratica_captain_id', inId);
      return { ok: true, type: 'captain' };
    }

    // Valida el QR de palabra validada escaneado por el capitán (payload: "word,TEAM,WORD,SCORE,CAPTAIN_ID,TS,ID")
    function processCaptainWordQR(encoded, myTeamKey) {
      let payload;
      try { payload = atob(encoded); } catch {
        return { ok: false, title: 'Código no válido', msg: 'El código de palabra no se puede leer.' };
      }
      const parts = payload.split(',');
      if (parts.length !== 7 || parts[0] !== 'word') {
        return { ok: false, title: 'Código no válido', msg: 'Este no es un código de palabra validada.' };
      }
      const [, inTeam, inWord, inScoreStr, inCaptainId, inTsStr, inId] = parts;
      const inScore = parseInt(inScoreStr, 10);
      const inTs    = parseInt(inTsStr, 10);
      if (inTeam !== myTeamKey) {
        return { ok: false, title: 'Equipo incorrecto', msg: `Esta palabra es del equipo ${TEAMS[inTeam]?.label || 'desconocido'}, no del tuyo.` };
      }
      if (!inWord || isNaN(inScore)) {
        return { ok: false, title: 'Código no válido', msg: 'El formato del código de palabra es incorrecto.' };
      }
      if (isNaN(inTs) || Date.now() - inTs > SESSION_TTL_MS) {
        return { ok: false, title: 'Código caducado', msg: 'La palabra ha caducado. El equipo debe generar un nuevo código.' };
      }
      const myCaptainId = localStorage.getItem('skratica_captain_id') || '';
      if (inCaptainId && myCaptainId && inCaptainId !== myCaptainId) {
        return { ok: false, title: 'Capitán incorrecto', msg: 'Palabra de otro capitán, debes entregarla al capitán que te ayudó a empezar la ronda.' };
      }
      const scanned = JSON.parse(localStorage.getItem('skratica_captain_scanned') || '[]');
      if (scanned.includes(inId)) {
        return { ok: false, title: 'Palabra ya escaneada', msg: 'Esta palabra ya ha sido registrada.' };
      }
      return { ok: true, type: 'word', word: inWord.toUpperCase(), score: inScore, id: inId };
    }

    async function processTileParam(encoded, myTeamKey, myMode) {
      // El capitán no puede canjear letras
      if (myMode === 'captain') {
        return { ok: false, title: 'Modo capitán', msg: 'Como capitán solo puedes escanear palabras validadas de tu equipo.' };
      }
      // Decodificar base64
      let payload;
      try {
        payload = atob(encoded);
      } catch {
        return { ok: false, title: 'Letra no válida', msg: 'El código de la letra no se puede leer.' };
      }

      const parts = payload.split(',');
      if (parts.length !== 4) {
        return { ok: false, title: 'Letra no válida', msg: 'El formato de la letra es incorrecto.' };
      }

      const [inLetter, inTeam, inTsStr, inTileId] = parts;
      const inTs = parseInt(inTsStr, 10);

      if (!inLetter || !inTeam || isNaN(inTs)) {
        return { ok: false, title: 'Letra no válida', msg: 'El formato de la letra es incorrecto.' };
      }

      // Validar equipo
      if (inTeam !== myTeamKey) {
        const inTeamConf = TEAMS[inTeam];
        const inTeamName = inTeamConf ? inTeamConf.label : 'desconocido';
        return {
          ok: false,
          title: 'Equipo incorrecto',
          msg: `Esta letra pertenece al equipo ${inTeamName}. Solo puedes unir letras de tu propio equipo.`,
        };
      }

      // Validar timestamp (< 40 segundos)
      const now = await getNetworkTime();
      const age = now - inTs;
      if (age < 0 || age > 40000) {
        const secs = Math.round(Math.abs(age) / 1000);
        return {
          ok: false,
          title: 'Caducado',
          msg: `Este código se generó hace demasiado tiempo y ha caducado, solo son válidas durante un tiempo.`,
        };
      }

      // Validar estado del receptor
      if (myMode === 'intro') {
        return {
          ok: false,
          title: 'Aún no has empezado',
          msg: 'Primero debes escanear el código QR del capitán de tu equipo para empezar a jugar.',
        };
      }

      if (myMode === 'sharing') {
        return {
          ok: false,
          title: 'Ya has compartido tu letra',
          msg: 'Una vez en modo compartir no puedes acumular letras de otros jugadores.',
        };
      }

      if (myMode === 'done') {
        return {
          ok: false,
          title: 'Palabra ya validada',
          msg: 'Tu palabra ya ha sido validada. No puedes añadir más letras.',
        };
      }

      // Validar que la letra existe
      if (!LETTERS.find(e => e.letter === inLetter)) {
        return { ok: false, title: 'Letra desconocida', msg: `La letra "${inLetter}" no es válida.` };
      }

      // Comprobar que este tileId no ha sido canjeado ya en este dispositivo
      const usedTiles = JSON.parse(localStorage.getItem('skratica_used_tiles') || '[]');
      if (usedTiles.includes(inTileId)) {
        return { ok: false, title: 'Ya escaneado', msg: 'Este código ya ha sido escaneado y no puede canjearse de nuevo.' };
      }

      // Asignar bonus (30% de probabilidad, magnitud según velocidad de escaneo)
      const ageMs = now - inTs;
      const bonus = Math.random() < 0.35 ? pickBonus(ageMs) : '1';

      // Registrar tileId como usado
      usedTiles.push(inTileId);
      localStorage.setItem('skratica_used_tiles', JSON.stringify(usedTiles));

      return { ok: true, letter: inLetter, bonus };
    }

    // ─────────────────────────────────────────────
    // MODO COMPARTIR (QR)
    // ─────────────────────────────────────────────
    let qrGenerated = false;

    function renderQR(shareUrl, teamConf) {
      const el = document.getElementById('qr-code');
      el.innerHTML = '';
      new QRCode(el, {
        text:         shareUrl,
        width:        316,
        height:       316,
        colorDark:    teamConf.qrColor,
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
      qrGenerated = true;
    }

    function showQRPanel(entry) {
      document.getElementById('tile-wrapper').style.display = 'none';
      document.getElementById('qr-panel').classList.add('visible');
      document.querySelector('.hints').style.opacity = '0';
      if (entry) {
        document.getElementById('qr-hint-letter').textContent = entry.letter;
        document.getElementById('qr-hint-score').textContent  = entry.score;
      }
      // Iniciar cuenta atrás si hay URL guardada
      const expiry = getShareExpiry();
      if (expiry) startCountdown(expiry);
    }

    function hideQRPanel() {
      document.getElementById('qr-panel').classList.remove('visible');
      document.getElementById('tile-wrapper').style.display = '';
      document.querySelector('.hints').style.opacity = '';
    }

    function getShareExpiry() {
      const url = localStorage.getItem('skratica_share_url');
      if (!url) return null;
      try {
        const encoded = new URL(url).searchParams.get('tile');
        if (!encoded) return null;
        const payload = atob(encoded);
        const ts = parseInt(payload.split(',')[2], 10);
        if (isNaN(ts)) return null;
        return ts + 30000;
      } catch { return null; }
    }

    let _countdownInterval = null;

    function startCountdown(expiresAt) {
      const el = document.getElementById('qr-countdown');
      if (_countdownInterval) clearInterval(_countdownInterval);

      function tick() {
        const remaining = Math.max(0, expiresAt - Date.now());
        const secs = Math.ceil(remaining / 1000);
        if (remaining <= 0) {
          el.textContent = 'Caducado';
          el.classList.add('urgent');
          clearInterval(_countdownInterval);
          _countdownInterval = null;
          return;
        }
        el.textContent = `0:${String(secs).padStart(2, '0')}`;
        el.classList.toggle('urgent', secs <= 10);
      }

      tick();
      _countdownInterval = setInterval(tick, 500);
    }

    function showConfirm(onConfirm, onCancel, opts = {}) {
      if (opts.title) document.getElementById('confirm-title').innerHTML = opts.title;
      if (opts.msg)   document.getElementById('confirm-msg').innerHTML   = opts.msg;
      if (opts.yes)   document.getElementById('btn-confirm-yes').textContent = opts.yes;
      document.getElementById('view-confirm').classList.add('active');

      const yes = document.getElementById('btn-confirm-yes');
      const no  = document.getElementById('btn-confirm-no');

      const cleanup = () => {
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click',  onNo);
      };

      function onYes() {
        cleanup();
        document.getElementById('view-confirm').classList.remove('active');
        onConfirm();
      }

      function onNo() {
        cleanup();
        document.getElementById('view-confirm').classList.remove('active');
        if (onCancel) onCancel();
      }

      yes.addEventListener('click', onYes);
      no.addEventListener('click',  onNo);
    }

    async function sha256(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function launchCaptainKeyScan(onSuccess, onCancel) {
      startScanner(async ({ pass }) => {
        if (!pass) {
          showError('Código no válido',
            'Este no es un código de acceso de capitán. Escanea el QR con la clave de tu equipo.',
            onCancel);
          return;
        }

        let decoded;
        try { decoded = atob(pass); } catch {
          showError('Código no válido', 'No se puede leer este código.', onCancel);
          return;
        }

        const hash = await sha256(decoded);
        if (TEAMS[getOrAssignTeam()].captainKeyHash !== hash) {
          showError('Clave incorrecta', 'La clave de capitán no es válida.', onCancel);
          return;
        }

        onSuccess();
      }).catch(() => {
        showError('Sin acceso a la cámara', 'No se ha podido acceder a la cámara. Comprueba los permisos.', onCancel);
      });
    }

    // ─────────────────────────────────────────────
    // VISTA CAPITÁN
    // ─────────────────────────────────────────────
    // MODO CAPITÁN
    // ─────────────────────────────────────────────

    function initCaptainMode(teamConf, teamKey) {
      setMode('captain');
      localStorage.setItem('skratica_captain', '1');
      applyTeamCSS(teamConf);

      // Si la ronda ya fue finalizada, mostrar el resultado y salir
      if (localStorage.getItem('skratica_captain_finished') === '1') {
        document.getElementById('view-intro').classList.remove('active');
        document.getElementById('view-captain').classList.add('active');
        document.getElementById('team-label-captain').textContent = teamConf.label;
        document.getElementById('captain-qr-area').style.display = 'none';
        document.getElementById('captain-round-ended').style.display = 'flex';
        _renderCaptainScore();
        document.getElementById('btn-captain-scan').style.display   = 'none';
        document.getElementById('btn-captain-finish').style.display = 'none';
        return;
      }

      document.getElementById('view-intro').classList.remove('active');
      document.getElementById('view-captain').classList.add('active');
      document.getElementById('team-label-captain').textContent = teamConf.label;

      // Generar o reutilizar URL del QR del capitán
      let captainUrl = localStorage.getItem('skratica_captain_url');
      if (!captainUrl) {
        const id      = Math.random().toString(36).slice(2, 10);
        const payload = `captain,${teamKey},${Date.now()},${id}`;
        captainUrl    = `${SHARE_BASE_URL}/?tile=${btoa(payload)}`;
        localStorage.setItem('skratica_captain_url', captainUrl);
        localStorage.setItem('skratica_captain_id', id);
      }

      // Registrar inicio de ronda (solo la primera vez, persiste entre recargas)
      if (!localStorage.getItem('skratica_captain_started_at')) {
        localStorage.setItem('skratica_captain_started_at', String(Date.now()));
      }

      // Renderizar QR del capitán
      const qrEl = document.getElementById('captain-qr-code');
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text:         captainUrl,
        width:        260,
        height:       260,
        colorDark:    teamConf.qrColor,
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });

      // Restaurar marcador desde localStorage
      _renderCaptainScore();

      // Clonar botones para limpiar listeners
      const btnScan   = document.getElementById('btn-captain-scan');
      const btnFinish = document.getElementById('btn-captain-finish');
      const freshScan   = btnScan.cloneNode(true);
      const freshFinish = btnFinish.cloneNode(true);
      btnScan.parentNode.replaceChild(freshScan, btnScan);
      btnFinish.parentNode.replaceChild(freshFinish, btnFinish);

      freshScan.addEventListener('click', () => _launchCaptainScanner(teamConf, teamKey));
      freshFinish.addEventListener('click', () => finalizeCaptainRound(teamConf, teamKey));
    }

    // Restaura la vista del capitán completa (re-renderiza QR y marcador)
    function showCaptainView(teamConf, teamKey) {
      initCaptainMode(teamConf, teamKey);
    }

    function _renderCaptainScore() {
      const words = JSON.parse(localStorage.getItem('skratica_captain_score') || '[]');
      const total = words.reduce((s, e) => s + e.score, 0);
      document.getElementById('captain-total-score').textContent = total;
      const list = document.getElementById('captain-words-list');
      list.innerHTML = '';
      words.forEach(({ word, score }) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="word-entry-word">${word.toUpperCase()}</span><span class="word-entry-score">+${score}</span>`;
        list.appendChild(li);
      });
    }

    async function _launchCaptainScanner(teamConf, teamKey) {
      try {
        await startScanner(async ({ tile, reset }) => {
          if (reset || !tile) {
            showError('Código no válido', 'Solo puedes escanear palabras validadas de tu equipo.',
              () => showCaptainView(teamConf, teamKey));
            return;
          }
          // Detectar tipo de payload
          let decoded;
          try { decoded = atob(tile); } catch {
            showError('Código no válido', 'No se puede leer este código.',
              () => showCaptainView(teamConf, teamKey));
            return;
          }
          const parts = decoded.split(',');
          if (parts[0] !== 'word') {
            showError('Código no válido', 'Solo puedes escanear palabras validadas de tu equipo.',
              () => showCaptainView(teamConf, teamKey));
            return;
          }
          const result = processCaptainWordQR(tile, teamKey);
          if (!result.ok) {
            showError(result.title, result.msg,
              () => showCaptainView(teamConf, teamKey));
            return;
          }
          // Registrar anti-replay
          const scanned = JSON.parse(localStorage.getItem('skratica_captain_scanned') || '[]');
          scanned.push(result.id);
          localStorage.setItem('skratica_captain_scanned', JSON.stringify(scanned));

          // Añadir palabra al marcador
          const words = JSON.parse(localStorage.getItem('skratica_captain_score') || '[]');
          words.push({ word: result.word, score: result.score });
          localStorage.setItem('skratica_captain_score', JSON.stringify(words));

          _renderCaptainScore();
          showCaptainView(teamConf, teamKey);
        });
      } catch {
        showError('Sin acceso a la cámara', 'No se ha podido acceder a la cámara. Comprueba los permisos.',
          () => showCaptainView(teamConf, teamKey));
      }
    }

    function finalizeCaptainRound(teamConf, teamKey = null) {
      const CAPTAIN_ROUND_MIN_MS = 10 * 60 * 1000;
      const startedAt = parseInt(localStorage.getItem('skratica_captain_started_at') || '0', 10);
      const elapsed = Date.now() - startedAt;
      const words = JSON.parse(localStorage.getItem('skratica_captain_score') || '[]');

      if (startedAt > 0 && elapsed < CAPTAIN_ROUND_MIN_MS && words.length === 0) {
        const faltaMin = Math.ceil((CAPTAIN_ROUND_MIN_MS - elapsed) / 60000);
        showError(
          'Todavía no puedes finalizar',
          `Escanea al menos una palabra primero o espera 10 minutos para finalizar la ronda. Te quedan aproximadamente ${faltaMin} min.`,
          () => showCaptainView(teamConf, teamKey)
        );
        return;
      }

      showConfirm(
        () => _doFinalizeCaptainRound(teamConf),
        null,
        {
          title: '¿Has escaneado todas las palabras de tu equipo?',
          msg:   'Esta acción es <strong>irreversible</strong>.<br><br>Ya no podrás escanear más palabras y se cerrará la ronda del equipo, a la suma actual se añadirá el valor de tu letra asignada como capitán con un multiplicador por uso.',
          yes:   'Finalizar',
        }
      );
    }

    function _doFinalizeCaptainRound(teamConf) {
      const myEntry = getOrAssignLetter();
      const words   = JSON.parse(localStorage.getItem('skratica_captain_score') || '[]');

      // Contar apariciones de la letra del capitán en las palabras recopiladas
      const count = words
        .filter(w => !w.isCaptainLetter)
        .reduce((sum, w) => sum + (w.word.toUpperCase().split(myEntry.letter).length - 1), 0);
      const multiplier = 1 + count;
      const finalScore = myEntry.score * multiplier;

      // Persistir la letra del capitán en el array de puntuaciones
      words.push({
        word:  `Tu letra: ${myEntry.letter}` + (multiplier > 1 ? ` ×${multiplier}` : ''),
        score: finalScore,
        isCaptainLetter: true,
      });
      localStorage.setItem('skratica_captain_score', JSON.stringify(words));

      // Renderizar listado y total (incluye ya la letra del capitán)
      _renderCaptainScore();

      // Marcar ronda como finalizada (persiste entre recargas)
      localStorage.setItem('skratica_captain_finished', '1');

      // Ocultar QR del capitán y mostrar indicador de fin de ronda
      document.getElementById('captain-qr-area').style.display = 'none';
      document.getElementById('captain-round-ended').style.display = 'flex';

      // Ocultar botones de acción
      document.getElementById('btn-captain-scan').style.display   = 'none';
      document.getElementById('btn-captain-finish').style.display = 'none';
    }

    function initShareMode(entry, teamKey, teamConf) {
      // Tap on QR panel → back to tile view
      document.getElementById('qr-panel').addEventListener('click', () => {
        if (getMode() === 'sharing') return;
        hideQRPanel();
      });

      // Si hay URL guardada de una sesión anterior de sharing, mostrar QR directamente
      const savedUrl = localStorage.getItem('skratica_share_url');
      if (savedUrl) {
        renderQR(savedUrl, teamConf);
        showQRPanel(entry);
        return;
      }

      document.getElementById('tile-wrapper').addEventListener('click', () => {
        if (qrGenerated) {
          showQRPanel(entry);
          return;
        }

        startScanner(async (result) => {
          const { tile, pass, reset } = result;
          if (reset) {
            showError('Código no válido', 'Debes escanear el QR del capitán para compartir tu letra.',
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }
          if (pass) {
            showError('Código no válido', 'Este es un código de acceso de capitán, no el QR del capitán.',
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }
          if (!tile) {
            showError('Código no válido', 'Este código no es válido.',
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }

          let decoded;
          try { decoded = atob(tile); } catch {
            showError('Código no válido', 'No se puede leer este código.',
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }

          const parts = decoded.split(',');
          if (parts[0] !== 'captain') {
            showError('Código no válido', 'Debes escanear el QR del capitán para compartir tu letra.',
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }

          const captainResult = processCaptainQR(tile, teamKey);
          if (!captainResult.ok) {
            showError(captainResult.title, captainResult.msg,
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }

          try {
            const timestamp = Date.now();
            const tileId    = Math.random().toString(36).slice(2, 10);
            const payload   = `${entry.letter},${teamKey},${timestamp},${tileId}`;
            const encoded   = btoa(payload);
            const shareUrl  = `${SHARE_BASE_URL}/?tile=${encoded}`;

            localStorage.setItem('skratica_share_url', shareUrl);
            renderQR(shareUrl, teamConf);
            setMode('sharing');
            document.getElementById('view-normal').style.display = 'flex';
            showQRPanel(entry);
          } catch (e) {
            showError('Error al compartir', 'No se ha podido generar el código. Inténtalo de nuevo.',
              () => document.getElementById('view-normal').style.display = 'flex');
          }
        }).catch(() => {
          showError('Sin acceso a la cámara', 'No se ha podido acceder a la cámara. Comprueba los permisos.',
            () => document.getElementById('view-normal').style.display = 'flex');
        });
      });
    }

    // ─────────────────────────────────────────────
    // COMPARTIR LETRAS SOBRANTES
    // ─────────────────────────────────────────────

    function getPendingSurplus(letters) {
      const bonuses   = getWordBonuses();
      const { used: usedLetters } = getUsedWithBonusesSmart(letters, bonuses);
      const unusedLetters = (() => {
        const p = [...letters];
        usedLetters.forEach(l => { const i = p.indexOf(l); if (i !== -1) p.splice(i, 1); });
        return p;
      })();
      const sharedAlready = JSON.parse(localStorage.getItem('skratica_surplus_shared') || '[]');
      const pool = [...sharedAlready];
      return unusedLetters.filter(l => {
        const i = pool.indexOf(l);
        if (i !== -1) { pool.splice(i, 1); return false; }
        return true;
      });
    }

    function showSurplusQRPanel(entry, teamConf, teamKey, letters) {
      // Ocultar vista done, mostrar view-normal (padre de qr-panel)
      document.getElementById('view-done').classList.remove('active');
      document.getElementById('view-normal').style.display = 'flex';
      document.getElementById('tile-wrapper').style.display = 'none';
      document.getElementById('qr-hint-letter').textContent = entry.letter;
      document.getElementById('qr-hint-score').textContent  = entry.score;
      document.getElementById('qr-panel').classList.add('visible');
      // Ocultar instrucciones y botón de escanear del modo normal
      document.querySelector('.hints').style.opacity = '0';
      document.querySelector('.hints').style.pointerEvents = 'none';

      // Arrancar countdown (solo visual, no auto-vuelve)
      const url     = localStorage.getItem('skratica_surplus_url');
      const expiry  = (() => {
        try {
          const encoded = new URL(url).searchParams.get('tile');
          const ts = parseInt(atob(encoded).split(',')[2], 10);
          return isNaN(ts) ? null : ts + 30000;
        } catch { return null; }
      })();
      if (expiry) startCountdown(expiry);

      // Mostrar botón volver
      const btnBack = document.getElementById('btn-surplus-back');
      btnBack.classList.add('visible');

      // Al pulsar volver: marcar letra como compartida y volver a done
      const onBack = () => {
        btnBack.classList.remove('visible');
        btnBack.removeEventListener('click', onBack);

        // Marcar letra como compartida (bonus se pierde al compartir)
        const shared = JSON.parse(localStorage.getItem('skratica_surplus_shared') || '[]');
        shared.push(entry.letter);
        localStorage.setItem('skratica_surplus_shared', JSON.stringify(shared));

        // Resetear el bonus de esa letra a '1' en skratica_word_bonus
        const allLetters = getWordLetters();
        const allBonuses = getWordBonuses();
        let resetIdx = allLetters.findIndex((l, i) => l === entry.letter && allBonuses[i] !== '1');
        if (resetIdx === -1) resetIdx = allLetters.indexOf(entry.letter);
        if (resetIdx !== -1) {
          allBonuses[resetIdx] = '1';
          setWordBonuses(allBonuses);
        }

        localStorage.removeItem('skratica_surplus_url');

        // Parar countdown
        if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }

        // Ocultar panel QR, restaurar hints, volver a done
        document.getElementById('qr-panel').classList.remove('visible');
        document.getElementById('tile-wrapper').style.display = 'none';
        document.querySelector('.hints').style.opacity = '';
        document.querySelector('.hints').style.pointerEvents = '';
        showDoneView(teamConf, letters, teamKey);
        initSurplusShare(teamKey, teamConf, letters);
      };
      btnBack.addEventListener('click', onBack);
    }

    function initSurplusShare(teamKey, teamConf, letters) {
      const btn = document.getElementById('btn-surplus');

      // Clonar el botón para limpiar listeners previos
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);

      const pending = getPendingSurplus(letters);
      fresh.style.display = pending.length > 0 ? '' : 'none';
      if (pending.length === 0) return;

      fresh.addEventListener('click', () => {
        const nowPending = getPendingSurplus(letters);
        if (nowPending.length === 0) { fresh.style.display = 'none'; return; }

        const letter    = nowPending[0];
        const entryObj  = LETTERS.find(l => l.letter === letter) || { letter, score: 0 };

        showConfirm(async () => {
          const timestamp = await getNetworkTime();
          const tileId    = Math.random().toString(36).slice(2, 10);
          const encoded   = btoa(`${letter},${teamKey},${timestamp},${tileId}`);
          const url       = `${SHARE_BASE_URL}/?tile=${encoded}`;
          localStorage.setItem('skratica_surplus_url', url);

          // Reutilizar renderQR pero con qrCode limpio
          const el = document.getElementById('qr-code');
          el.innerHTML = '';
          new QRCode(el, {
            text:         url,
            width:        316,
            height:       316,
            colorDark:    teamConf.qrColor,
            colorLight:   '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
          });

          showSurplusQRPanel(entryObj, teamConf, teamKey, letters);
        }, () => { /* cancelar: view-done sigue visible, no hace falta nada */ });
      });
    }

    // ─────────────────────────────────────────────
    // ESCÁNER QR
    // ─────────────────────────────────────────────
    let _scanStream    = null;
    let _scanRafId     = null;
    let _scanDetector  = null;
    let _scanCallback  = null;

    function _isScannerActive() { return !!_scanStream; }

    async function startScanner(onResult) {
      _scanCallback = onResult;

      // Mostrar panel
      document.getElementById('scan-panel').classList.add('active');

      // Solicitar cámara trasera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        document.getElementById('scan-panel').classList.remove('active');
        throw err; // caller maneja el error
      }

      _scanStream = stream;
      const video = document.getElementById('scan-video');
      video.srcObject = stream;
      await video.play();

      // Elegir método de detección
      if (typeof BarcodeDetector !== 'undefined') {
        try {
          const formats = await BarcodeDetector.getSupportedFormats();
          if (formats.includes('qr_code')) {
            _scanDetector = new BarcodeDetector({ formats: ['qr_code'] });
          }
        } catch (_) { /* fallback a jsQR */ }
      }

      _scanLoop();
    }

    function _scanLoop() {
      const video  = document.getElementById('scan-video');
      const canvas = document.getElementById('scan-canvas');

      async function tick() {
        if (!_scanStream) return; // parado

        if (video.readyState < video.HAVE_ENOUGH_DATA) {
          _scanRafId = requestAnimationFrame(tick);
          return;
        }

        if (_scanDetector) {
          // BarcodeDetector nativo
          try {
            const codes = await _scanDetector.detect(video);
            if (codes.length > 0) {
              const raw = codes[0].rawValue;
              if (_handleScanResult(raw)) return;
            }
          } catch (_) { /* ignorar frames fallidos */ }
          _scanRafId = requestAnimationFrame(tick);
        } else if (typeof jsQR !== 'undefined') {
          // jsQR fallback — pintar frame en canvas
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code && _handleScanResult(code.data)) return;
          _scanRafId = requestAnimationFrame(tick);
        } else {
          // Sin soporte — parar
          stopScanner();
        }
      }

      _scanRafId = requestAnimationFrame(tick);
    }

    // Devuelve true si el resultado es una URL skratica válida y dispara el callback
    function _handleScanResult(raw) {
      let url;
      try { url = new URL(raw); } catch { return false; }

      const tile  = url.searchParams.get('tile');
      const reset = url.searchParams.get('reset');
      const pass  = url.searchParams.get('pass');
      const teams = url.searchParams.get('teams');

      if (!tile && !reset && !pass) return false;

      // Es una URL válida — parar escáner y notificar
      const cb = _scanCallback;
      stopScanner();
      if (cb) cb({ tile, reset, pass, teams });
      return true;
    }

    function stopScanner() {
      if (_scanRafId)    { cancelAnimationFrame(_scanRafId); _scanRafId = null; }
      if (_scanStream)   { _scanStream.getTracks().forEach(t => t.stop()); _scanStream = null; }
      _scanCallback = null;
      document.getElementById('scan-panel').classList.remove('active');
    }

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────
    (async function init() {
      // Comprobar TTL de sesión antes de leer ningún otro valor del storage
      const createdAt = await checkAndResetIfExpired();
      const teamCount = resolveTeamCount();
      TEAMS = Object.fromEntries(Object.entries(TEAMS_POOL).slice(0, teamCount));

      // Renderizar identificador de sesión
      if (createdAt) {
        const { current, next } = getSessionLabel(createdAt, teamCount);
        document.getElementById('session-label').textContent = current;
        document.getElementById('session-next').textContent  = next;
      }

      const myEntry   = getOrAssignLetter();
      const myTeamKey = getOrAssignTeam();
      const myMode    = getMode();
      const teamConf  = TEAMS[myTeamKey];

      // Transición intro → jugador normal (llamada tras escanear QR de capitán)
      const startGame = () => {
        setMode('normal');
        document.getElementById('view-intro').classList.remove('active');
        document.getElementById('view-normal').style.display = 'flex';
        initShareMode(myEntry, myTeamKey, teamConf);
      };

      // Lanzar escáner desde la intro (botón "Escanear al capitán")
      const launchScanFromIntro = async () => {
        try {
          await startScanner(async ({ tile, reset, pass, teams }) => {
            if (reset) {
              showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
              return;
            }
            if (!tile) {
              if (pass) {
                showError('Código no válido',
                  'Este es un código de acceso de capitán. Pulsa "Soy capitán" para escanearlo.',
                  () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
                return;
              }
              showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
              return;
            }
            // Detectar tipo
            let decoded;
            try { decoded = atob(tile); } catch {
              showError('Código no válido', 'No se puede leer este código.',
                () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
              return;
            }
            const parts = decoded.split(',');
            if (parts[0] === 'captain') {
              const result = processCaptainQR(tile, myTeamKey);
              if (!result.ok) {
                showError(result.title, result.msg,
                  () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
                return;
              }
              startGame();
            } else {
              showError('Código no válido',
                'Este no es el código QR del capitán de tu equipo. Pide al capitán que muestre su QR.',
                () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
            }
          });
        } catch {
          showError('Sin acceso a la cámara', 'No se ha podido acceder a la cámara. Comprueba los permisos.',
            () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
        }
      };

      // Convertirse en capitán (con confirmación previa)
      const becomeCaptain = () => {
        launchCaptainKeyScan(
          () => initCaptainMode(teamConf, myTeamKey),
          () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain)
        );
      };

      applyTeamCSS(teamConf);

      // Siempre rellenar la letra propia (puede estar oculta pero debe estar lista)
      document.getElementById('tile-letter').textContent       = myEntry.letter;
      document.getElementById('tile-score').textContent        = myEntry.score;
      document.getElementById('team-label-normal').textContent = teamConf.label;

      // ── Validar palabra ───────────────────────────────────────────
      document.getElementById('btn-validate').addEventListener('click', () => {
        const letters = getWordLetters();
        const bonuses = getWordBonuses();
        const { used: usedLetters } = getUsedWithBonusesSmart(letters, bonuses);
        const wordForDict = usedLetters.join('').toLowerCase();

        if (typeof WORDS_ES === 'undefined') {
          setMode('done');
          showDoneView(teamConf, letters, myTeamKey);
          initSurplusShare(myTeamKey, teamConf, letters);
          return;
        }

        if (!WORDS_ES.has(wordForDict)) {
          showError(
            'Palabra no válida',
            `"${wordForDict.toUpperCase()}" no es una palabra válida en el diccionario de Skratica. Sigue añadiendo letras o intenta otra combinación.`,
            () => showWordView(teamConf, letters)
          );
          return;
        }

        setMode('done');
        localStorage.setItem('skratica_word_final', wordForDict);
        showDoneView(teamConf, letters, myTeamKey);
        initSurplusShare(myTeamKey, teamConf, letters);
      });

      // ── Botón cancelar escáner ────────────────────────────────────
      document.getElementById('btn-scan-cancel').addEventListener('click', () => stopScanner());

      // ── Función común para procesar resultado escaneado (tile o reset) ──
      async function handleScannedPayload({ tile, reset, teams }) {
        if (reset) {
          let resetValid = false;
          try {
            const resetParts = atob(reset).split(',');
            if (resetParts.length === 2 && resetParts[0] === 'reset') {
              const resetTs  = parseInt(resetParts[1], 10);
              const resetAge = Date.now() - resetTs;
              if (!isNaN(resetTs) && resetAge >= 0 && resetAge <= RESET_TTL_MS) resetValid = true;
            }
          } catch { /* payload inválido */ }

          if (resetValid) {
            ['skratica_letter','skratica_team','skratica_mode','skratica_word',
             'skratica_word_bonus','skratica_word_order','skratica_word_used',
             'skratica_word_used_bonuses','skratica_word_final',
             'skratica_share_url','skratica_surplus_shared','skratica_surplus_url',
             'skratica_used_tiles','skratica_created_at','skratica_captain',
             'skratica_captain_id','skratica_captain_url','skratica_captain_score',
             'skratica_captain_scanned','skratica_captain_finished',
             'skratica_captain_started_at','skratica_team_count',
            ].forEach(k => localStorage.removeItem(k));
            if (teams) {
              const n = parseInt(teams, 10);
              if (teamCountInValidRange(n)) localStorage.setItem('skratica_team_count', n);
            }
            location.reload();
          } else {
            const currentMode = getMode();
            showError(
              'Código de reset inválido',
              'El código de reset ha caducado o no es válido.',
              () => {
                if (currentMode === 'word') showWordView(teamConf, getWordLetters());
                else if (currentMode === 'done') showDoneView(teamConf, getWordLetters(), myTeamKey);
                else if (currentMode === 'captain') showCaptainView(teamConf, myTeamKey);
                else if (currentMode === 'intro') showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
                else document.getElementById('view-normal').style.display = 'flex';
              }
            );
          }
          return;
        }

        if (tile) {
          const currentMode = getMode();

          let decodedType = '';
          try { decodedType = atob(tile).split(',')[0]; } catch {}
          if (decodedType === 'captain' && currentMode === 'normal') {
            const captainResult = processCaptainQR(tile, myTeamKey);
            if (!captainResult.ok) {
              showError(captainResult.title, captainResult.msg,
                () => document.getElementById('view-normal').style.display = 'flex');
              return;
            }
            try {
              const timestamp = Date.now();
              const tileId    = Math.random().toString(36).slice(2, 10);
              const payload   = `${myEntry.letter},${myTeamKey},${timestamp},${tileId}`;
              const encoded   = btoa(payload);
              const shareUrl  = `${SHARE_BASE_URL}/?tile=${encoded}`;
              localStorage.setItem('skratica_share_url', shareUrl);
              renderQR(shareUrl, teamConf);
              setMode('sharing');
              document.getElementById('view-normal').style.display = 'flex';
              showQRPanel(myEntry);
            } catch (e) {
              showError('Error al compartir', 'No se ha podido generar el código. Inténtalo de nuevo.',
                () => document.getElementById('view-normal').style.display = 'flex');
            }
            return;
          }
          if (decodedType === 'captain') {
            showError('Ya has empezado', 'Para compartir tu letra debes estar en la pantalla principal, antes de escanear letras de compañeros.',
              () => {
                if (currentMode === 'word') showWordView(teamConf, getWordLetters());
                else if (currentMode === 'done') showDoneView(teamConf, getWordLetters(), myTeamKey);
                else document.getElementById('view-normal').style.display = 'flex';
              }
            );
            return;
          }

          const result = await processTileParam(tile, myTeamKey, currentMode);

          if (!result.ok) {
            showError(result.title, result.msg, () => {
              if (currentMode === 'intro') showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
              else if (currentMode === 'word') showWordView(teamConf, getWordLetters());
              else document.getElementById('view-normal').style.display = 'flex';
            });
            return;
          }

          const letters = getWordLetters();
          const bonuses = getWordBonuses();

          if (currentMode === 'normal' && letters.length === 0) {
            letters.push(myEntry.letter);
            bonuses.push('1');
          }

          letters.push(result.letter);
          bonuses.push(result.bonus);
          setWordLetters(letters);
          setWordBonuses(bonuses);
          setMode('word');
          localStorage.removeItem('skratica_word_order');
          localStorage.removeItem('skratica_share_url');

          showWordView(teamConf, letters);
        }
      }

      // ── Botones escanear (normal y word) ─────────────────────────
      async function launchScanner() {
        try {
          await startScanner(handleScannedPayload);
        } catch (err) {
          showError(
            'Sin acceso a la cámara',
            'No se ha podido acceder a la cámara. Comprueba los permisos del navegador.',
            () => {
              const m = getMode();
              if (m === 'word') showWordView(teamConf, getWordLetters());
              else if (m === 'captain') showCaptainView(teamConf, myTeamKey);
              else document.getElementById('view-normal').style.display = 'flex';
            }
          );
        }
      }

      document.getElementById('btn-scan').addEventListener('click', launchScanner);
      document.getElementById('btn-scan-word').addEventListener('click', launchScanner);

      // ¿Llega parámetro ?reset=?
      const params = new URLSearchParams(window.location.search);
      const resetEncoded = params.get('reset');

      if (resetEncoded) {
        // Leer ?teams= antes de limpiar la URL
        const teamsAtReset = params.get('teams');
        // Limpiar parámetro de la URL inmediatamente
        history.replaceState(null, '', window.location.pathname);

        let resetPayload;
        let resetValid = false;
        try {
          resetPayload = atob(resetEncoded);
          const resetParts = resetPayload.split(',');
          if (resetParts.length === 2 && resetParts[0] === 'reset') {
            const resetTs = parseInt(resetParts[1], 10);
            const resetAge = Date.now() - resetTs;
            if (!isNaN(resetTs) && resetAge >= 0 && resetAge <= RESET_TTL_MS) {
              resetValid = true;
            }
          }
        } catch { /* payload inválido */ }

        if (resetValid) {
          // Borrar todo el localStorage de Skratica y recargar limpio
           ['skratica_letter','skratica_team','skratica_mode','skratica_word',
            'skratica_word_bonus','skratica_word_order','skratica_word_used',
            'skratica_word_used_bonuses','skratica_word_final',
            'skratica_share_url','skratica_surplus_shared','skratica_surplus_url',
            'skratica_used_tiles','skratica_created_at','skratica_captain',
            'skratica_captain_url','skratica_captain_score','skratica_captain_scanned',
            'skratica_captain_finished','skratica_captain_started_at','skratica_team_count',
           ].forEach(k => localStorage.removeItem(k));
          // Restaurar team count si venía en la URL del reset
          if (teamsAtReset) {
            const n = parseInt(teamsAtReset, 10);
            if (teamCountInValidRange(n)) localStorage.setItem('skratica_team_count', n);
          }
          location.reload();
          return;
        } else {
          showError(
            'Código de reset inválido',
            'El código de reset ha caducado o no es válido. Genera un nuevo código desde la página de administración.',
            () => {
              if (myMode === 'word') showWordView(teamConf, getWordLetters());
              else if (myMode === 'done') showDoneView(teamConf, getWordLetters(), myTeamKey);
              else if (myMode === 'captain') showCaptainView(teamConf, myTeamKey);
              else if (myMode === 'intro') showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
              else document.getElementById('view-normal').style.display = 'flex';
            }
          );
          return;
        }
      }

      // ── Parámetro ?pass= (clave de capitán) ──
      const passEncoded = params.get('pass');

      if (passEncoded) {
        history.replaceState(null, '', window.location.pathname);

        let decoded;
        try { decoded = atob(passEncoded); } catch {
          showError('Código no válido', 'No se puede leer este código.',
            () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
          return;
        }

        const hash = await sha256(decoded);
        if (teamConf.captainKeyHash !== hash) {
          showError('Clave incorrecta', 'La clave de capitán no es válida.', 
            () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
          return;
        }
        // Válido: activar modo capitán
        setMode('captain');
        initCaptainMode(teamConf, myTeamKey);
        return;
      }

      // ¿Llega parámetro ?tile=?
      const encoded = params.get('tile');

      // Limpiar el parámetro de la URL inmediatamente (antes de cualquier lógica)
      history.replaceState(null, '', window.location.pathname);

      if (encoded) {
        // Detectar si es payload de capitán antes de processTileParam
        let decodedType = '';
        try { decodedType = atob(encoded).split(',')[0]; } catch {}

        if (decodedType === 'captain' && myMode === 'intro') {
          const result = processCaptainQR(encoded, myTeamKey);
          if (!result.ok) {
            showError(result.title, result.msg,
              () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain));
            return;
          }
          startGame();
          return;
        }

        if (decodedType === 'captain' && myMode === 'normal') {
          const captainResult = processCaptainQR(encoded, myTeamKey);
          if (!captainResult.ok) {
            showError(captainResult.title, captainResult.msg,
              () => document.getElementById('view-normal').style.display = 'flex');
            return;
          }
          try {
            const timestamp = Date.now();
            const tileId    = Math.random().toString(36).slice(2, 10);
            const payload   = `${myEntry.letter},${myTeamKey},${timestamp},${tileId}`;
            const shareEncoded = btoa(payload);
            const shareUrl  = `${SHARE_BASE_URL}/?tile=${shareEncoded}`;
            localStorage.setItem('skratica_share_url', shareUrl);
            renderQR(shareUrl, teamConf);
            setMode('sharing');
            document.getElementById('view-normal').style.display = 'flex';
            showQRPanel(myEntry);
          } catch (e) {
            showError('Error al compartir', 'No se ha podido generar el código. Inténtalo de nuevo.',
              () => document.getElementById('view-normal').style.display = 'flex');
          }
          document.getElementById('qr-panel').addEventListener('click', () => {
            if (getMode() === 'sharing') return;
            hideQRPanel();
          });
          return;
        }

        if (decodedType === 'word' && myMode === 'captain') {
          const result = processCaptainWordQR(encoded, myTeamKey);
          if (!result.ok) {
            showError(result.title, result.msg, () => showCaptainView(teamConf, myTeamKey));
            return;
          }
          // Registrar anti-replay
          const scanned = JSON.parse(localStorage.getItem('skratica_captain_scanned') || '[]');
          scanned.push(result.id);
          localStorage.setItem('skratica_captain_scanned', JSON.stringify(scanned));
          // Añadir palabra al marcador
          const words = JSON.parse(localStorage.getItem('skratica_captain_score') || '[]');
          words.push({ word: result.word, score: result.score });
          localStorage.setItem('skratica_captain_score', JSON.stringify(words));
          _renderCaptainScore();
          showCaptainView(teamConf, myTeamKey);
          return;
        }

        const result = await processTileParam(encoded, myTeamKey, myMode);

        if (!result.ok) {
          let onClose;
          if (myMode === 'word') {
            onClose = () => showWordView(teamConf, getWordLetters());
          } else if (myMode === 'done') {
            onClose = () => showDoneView(teamConf, getWordLetters(), myTeamKey);
          } else if (myMode === 'sharing') {
            onClose = () => {
              document.getElementById('view-normal').style.display = 'flex';
              const savedUrl = localStorage.getItem('skratica_share_url');
              if (savedUrl && !qrGenerated) renderQR(savedUrl, teamConf);
              showQRPanel(myEntry);
            };
          } else if (myMode === 'intro') {
            onClose = () => showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
          } else if (myMode === 'captain') {
            onClose = () => showCaptainView(teamConf, myTeamKey);
          } else {
            onClose = () => { document.getElementById('view-normal').style.display = 'flex'; };
          }
          showError(result.title, result.msg, onClose);
          return;
        }

        // Añadir letra a la colección
        const letters = getWordLetters();
        const bonuses = getWordBonuses();

        // Si es la primera letra del modo palabra, añadir también la propia (sin bonus)
        if (myMode === 'normal' && letters.length === 0) {
          letters.push(myEntry.letter);
          bonuses.push('1');
        }

        letters.push(result.letter);
        bonuses.push(result.bonus);
        setWordLetters(letters);
        setWordBonuses(bonuses);
        setMode('word');

        // Resetear orden confirmado al añadir nueva letra
        localStorage.removeItem('skratica_word_order');
        localStorage.removeItem('skratica_share_url');

        showWordView(teamConf, letters);
        return;
      }

      // Sin parámetro — usar modo persistido
      if (myMode === 'intro') {
        showIntroView(teamConf, launchScanFromIntro, becomeCaptain);
        return;
      }

      if (myMode === 'word') {
        const letters = getWordLetters();
        showWordView(teamConf, letters);
        return;
      }

      if (myMode === 'done') {
        const letters = getWordLetters();
        showDoneView(teamConf, letters, myTeamKey);
        initSurplusShare(myTeamKey, teamConf, letters);
        return;
      }

      if (myMode === 'captain') {
        initCaptainMode(teamConf, myTeamKey);
        return;
      }

      // Modo normal o sharing — mostrar letra propia
      document.getElementById('view-normal').style.display = 'flex';
      if (myMode === 'sharing') {
        // Ya estaba compartiendo — no puede acumular, no mostrar hint
        document.querySelector('.hints').style.display = 'none';
      }

      initShareMode(myEntry, myTeamKey, teamConf);
    })();
