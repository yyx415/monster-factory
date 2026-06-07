window.UI = (function() {
    let els = {};
    let draggedMonsterId = null;
    let selectedMonsterId = null;  // 点击选择
    let cachedAdventureEnemies = null; // 缓存敌方预览
    let cachedAdvLevel = -1;           // 缓存时对应的关卡
    let synthSlotA = null;
    let synthSlotB = null;
    // 自由模式状态
    let freeAllySlots = [null, null, null, null];   // 存储 templateId
    let freeEnemySlots = [null, null, null, null];  // 存储 templateId
    let freePickSide = 'ally';  // 当前选择填充到哪一边
    // 将怪物对象转为战斗单位数据（消除重复属性映射）
    // 怪物贴图HTML生成
    function monsterImgHTML(templateId, emoji, size) {
        return `<img src="images/${templateId}.png" alt="${emoji}" class="monster-img" style="width:${size};height:${size};object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.insertAdjacentText('afterend','${emoji}')">`;
    }
    function monsterToUnitData(m) {
        const tpl = GameConfig.getTemplate(m.templateId);
        return {
            uniqueId: m.uniqueId,
            name: m.name, emoji: m.emoji, image: tpl ? tpl.image : null, range: m.range,
            health: m.stats.health, maxHealth: m.stats.maxHealth,
            attack: m.stats.attack, speed: m.stats.speed,
            regen: m.stats.regen, critRate: m.critRate, critDmg: m.critDmg,
            healAmount: m.healAmount, traits: m.traits,
            burstCount: m.burstCount || 1,
            poisonRange: m.poisonRange || 0, knockback: m.knockback || 0,
            splash: m.splash || 0, splashPct: m.splashPct || 0,
            lifesteal: m.lifesteal || 0,
            poisonDmg: m.poisonDmg || 0, poisonDur: m.poisonDur || 0,
            berserk: m.berserk || 0,
            thorns: m.thorns || 0,
            rebirth: m.rebirth || 0,
            slowPct: m.slowPct || 0, slowDur: m.slowDur || 0,
            explodeDmg: m.explodeDmg || 0, explodeRange: m.explodeRange || 0,
            tenacity: m.tenacity || 0, tenacityThreshold: m.tenacityThreshold || 0,
            healDmgPct: m.healDmgPct || 0,
            level: m.level || 1,
            color: m.color || 'green'
        };
    }

    // 将战斗结果单位转为下一战战斗单位数据
    function battleResultToUnitData(u) {
        return {
            uniqueId: u.uniqueId,
            name: u.name, emoji: u.emoji, image: u.image || null, range: u.range,
            health: Math.floor(u.health), maxHealth: u.maxHealth,
            attack: u.attack, speed: u.speed,
            regen: u.regen, critRate: u.critRate, critDmg: u.critDmg,
            healAmount: u.healAmount, traits: u.traits,
            burstCount: u.burstCount || 1,
            poisonRange: u.poisonRange || 0, knockback: u.knockback || 0,
            splash: u.splash || 0, splashPct: u.splashPct || 0,
            lifesteal: u.lifesteal || 0,
            poisonDmg: u.poisonDmg || 0, poisonDur: u.poisonDur || 0,
            berserk: u.berserk || 0,
            thorns: u.thorns || 0,
            rebirth: u.rebirth || 0,
            slowPct: u.slowPct || 0, slowDur: u.slowDur || 0,
            explodeDmg: u.explodeDmg || 0, explodeRange: u.explodeRange || 0,
            tenacity: u.tenacity || 0, tenacityThreshold: u.tenacityThreshold || 0,
            healDmgPct: u.healDmgPct || 0,
            level: u.level || 1,
            color: u.color || 'green'
        };
    }



    function cacheElements() {
        els.startScreen = document.getElementById('start-screen');
        els.mainGame = document.getElementById('main-game');
        els.goldDisplay = document.getElementById('gold-display');
        els.levelDisplay = document.getElementById('level-display');
        els.newGameBtn = document.getElementById('new-game-btn');
        els.continueBtn = document.getElementById('continue-btn');
        els.saveBtn = document.getElementById('save-btn');
        els.saveSlotsBtn = document.getElementById('save-slots-btn');
        els.saveSlotsPanel = document.getElementById('save-slots-panel');
        els.resetBtn = document.getElementById('reset-btn');
        els.synthTree = document.getElementById('synth-tree');
        els.tabBtns = document.querySelectorAll('.tab-btn');
        els.panels = {
            lab: document.getElementById('panel-lab'),
            team: document.getElementById('panel-team'),
            adventure: document.getElementById('panel-adventure'),
            endless: document.getElementById('panel-endless'),
            free: document.getElementById('panel-free'),
            guide: document.getElementById('panel-guide'),
            bestiary: document.getElementById('panel-besiary')
        };
        els.bestiaryGrid = document.getElementById('bestiary-grid');
        els.monsterList = document.getElementById('monster-list');
        els.monsterCount = document.getElementById('monster-count');
        els.synthSlotA = document.getElementById('synthesis-slot-a');
        els.synthSlotB = document.getElementById('synthesis-slot-b');
        els.synthesizeBtn = document.getElementById('synthesize-btn');
        els.synthPreview = document.getElementById('synth-preview');
        els.synthResult = document.getElementById('synth-result');
        els.teamSlots = document.querySelectorAll('.team-slot');
        els.adventureFightBtn = document.getElementById('adventure-fight-btn');
        els.advLevel = document.getElementById('adv-level');
        els.advReward = document.getElementById('adv-reward');
        els.enemyLineup = document.getElementById('enemy-lineup');
        els.adventureResult = document.getElementById('adventure-result');
        els.endlessStartBtn = document.getElementById('endless-start-btn');
        els.endlessBest = document.getElementById('endless-best');
        els.endlessBattleArea = document.getElementById('endless-battle-area');
        els.endlessWave = document.getElementById('endless-wave');
        els.endlessEnemyLineup = document.getElementById('endless-enemy-lineup');
        els.endlessBattleLog = document.getElementById('endless-battle-log');
        els.endlessNextBtn = document.getElementById('endless-next-btn');
        els.endlessQuitBtn = document.getElementById('endless-quit-btn');
        els.endlessResult = document.getElementById('endless-result');
        els.teamMonsterList = document.getElementById('team-monster-list');
        // 自由模式
        els.freeAllySlots = document.getElementById('free-ally-slots');
        els.freeEnemySlots = document.getElementById('free-enemy-slots');
        els.freeTemplatePicker = document.getElementById('free-template-picker');
        els.freeFightBtn = document.getElementById('free-fight-btn');
        els.freeClearBtn = document.getElementById('free-clear-btn');
        els.freeResult = document.getElementById('free-result');
    }

    function renderAll() {
        const state = GameState.getState();
        els.goldDisplay.textContent = '💰 ' + state.gold;
        els.levelDisplay.textContent = '🏭 Lv.' + state.adventureLevel;
        renderMonsterList();
        renderTeamSlots();
        renderSynthSlots();
        renderAdventure();
        renderEndless();
        if (document.getElementById('panel-team').classList.contains('active')) {
            renderTeamMonsterList();
        }
        if (document.getElementById('panel-guide').classList.contains('active')) {
            renderSynthTree();
        }
        if (document.getElementById('panel-besiary').classList.contains('active')) {
            renderBestiary();
        }
        if (document.getElementById('panel-free').classList.contains('active')) {
            renderFreeMode();
        }
    }

    function renderMonsterList() {
        const state = GameState.getState();
        els.monsterList.innerHTML = '';
        const teamIds = state.team.filter(Boolean);
        const available = state.monsters.filter(m => !teamIds.includes(m.uniqueId));
        els.monsterCount.textContent = available.length;
        available.forEach(m => {
            const card = document.createElement('div');
            card.className = 'monster-card';
            card.setAttribute('draggable', 'true');
            card.dataset.uniqueId = m.uniqueId;
            card.innerHTML = `
                <div class="monster-card-img">${monsterImgHTML(m.templateId, m.emoji, '68px')}</div>
                <div class="name" style="color:${GameConfig.QUALITY_COLORS[m.color]}">${m.name}</div>
                <div class="info">❤${m.stats.health} ⚔${m.stats.attack}</div>
                <div class="info">⏱${m.stats.speed}s ${m.stats.regen ? '↻'+m.stats.regen : ''}</div>
            `;
            card.addEventListener('dragstart', (e) => {
                draggedMonsterId = m.uniqueId;
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', m.uniqueId);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                draggedMonsterId = null;
            });
            card.addEventListener('click', () => {
                if (selectedMonsterId === m.uniqueId) {
                    // 再次点击已选中的 → 显示详情
                    showMonsterDetail(m);
                } else {
                    // 选中此怪物
                    selectedMonsterId = m.uniqueId;
                    refreshSelection();
                }
            });
            // 初始同步选中状态
            if (selectedMonsterId === m.uniqueId) card.classList.add('selected');
            els.monsterList.appendChild(card);
        });
    }

    function renderTeamSlots() {
        const team = GameState.getTeamMonsters();
        els.teamSlots.forEach((slot, i) => {
            const m = team[i];
            if (m) {
                slot.innerHTML = `${monsterImgHTML(m.templateId, m.emoji, '38px')}<div class="slot-name">${m.name}</div>`;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '空';
                slot.classList.remove('filled');
            }
        });
    }

    function renderSynthSlots() {
        if (synthSlotA) {
            els.synthSlotA.innerHTML = monsterImgHTML(synthSlotA.templateId, synthSlotA.emoji, '30px') + ' ' + synthSlotA.name;
            els.synthSlotA.style.color = GameConfig.QUALITY_COLORS[synthSlotA.color];
        } else {
            els.synthSlotA.innerHTML = '拖入怪物A';
            els.synthSlotA.style.color = '#888';
        }
        if (synthSlotB) {
            els.synthSlotB.innerHTML = monsterImgHTML(synthSlotB.templateId, synthSlotB.emoji, '30px') + ' ' + synthSlotB.name;
            els.synthSlotB.style.color = GameConfig.QUALITY_COLORS[synthSlotB.color];
        } else {
            els.synthSlotB.innerHTML = '拖入怪物B';
            els.synthSlotB.style.color = '#888';
        }
        updateSynthButton();
    }

    function updateSynthButton() {
        els.synthPreview.innerHTML = '';
        if (synthSlotA && synthSlotB) {
            const resultId = GameConfig.findRecipe(synthSlotA.templateId, synthSlotB.templateId);
            if (resultId) {
                const tpl = GameConfig.getTemplate(resultId);
                const cost = GameConfig.getSynthCost(tpl.level);
                els.synthesizeBtn.disabled = false;
                els.synthesizeBtn.textContent = `合成 (${cost}💰)`;
                els.synthPreview.innerHTML = `
                    <div class="preview-card" style="border-color:${GameConfig.QUALITY_COLORS[tpl.color]}">
                        ${monsterImgHTML(tpl.id, tpl.emoji, '36px')}
                        <span class="preview-name" style="color:${GameConfig.QUALITY_COLORS[tpl.color]}">${tpl.name}</span>
                        <span class="preview-level">Lv.${tpl.level}</span>
                    </div>`;
            } else {
                els.synthesizeBtn.disabled = true;
                els.synthesizeBtn.textContent = '无匹配配方';
            }
        } else {
            els.synthesizeBtn.disabled = true;
            els.synthesizeBtn.textContent = '合成 (费用待算)';
        }
    }

    function renderSynthTree() {
        els.synthTree.innerHTML = '';

        // 按等级分组模板
        const byLevel = {};
        Object.values(GameConfig.TEMPLATES).forEach(t => {
            if (!byLevel[t.level]) byLevel[t.level] = [];
            byLevel[t.level].push(t);
        });

        // 构建反向索引：resultId → parents
        const childParents = {};
        Object.entries(GameConfig.RECIPES).forEach(([key, resultId]) => {
            const [a, b] = key.split('+');
            childParents[resultId] = [a, b];
        });

        const levels = [1, 2, 3, 4, 5];
        const levelNames = ['', 'Lv1 绿色', 'Lv2 蓝色', 'Lv3 橙色', 'Lv4 红色', 'Lv5 金色'];

        levels.forEach((lv, li) => {
            const col = document.createElement('div');
            col.className = 'tree-level';

            const label = document.createElement('div');
            label.className = 'tree-level-label';
            label.textContent = levelNames[lv];
            col.appendChild(label);

            (byLevel[lv] || []).forEach(t => {
                const node = document.createElement('div');
                node.className = 'tree-node';
                node.style.borderColor = GameConfig.QUALITY_COLORS[t.color] || '#555';

                const parents = childParents[t.id];
                let parentsHtml = '';
                if (parents) {
                    const pa = GameConfig.getTemplate(parents[0]);
                    const pb = GameConfig.getTemplate(parents[1]);
                    parentsHtml = `<div class="node-parents">${monsterImgHTML(pa.id, pa.emoji, '24px')}+${monsterImgHTML(pb.id, pb.emoji, '24px')}</div>`;
                }
                const cost = t.level > 1 ? `<div class="node-cost">💰${GameConfig.getSynthCost(t.level)}</div>` : '';

                node.innerHTML = `
                    ${monsterImgHTML(t.id, t.emoji, '30px')}
                    <div class="node-name">${t.name}</div>
                    ${parentsHtml}
                    ${cost}
                `;
                col.appendChild(node);
            });

            els.synthTree.appendChild(col);

            // 箭头
            if (li < levels.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'tree-arrow';
                arrow.textContent = '→';
                els.synthTree.appendChild(arrow);
            }
        });
    }

    function renderAdventure() {
        const state = GameState.getState();
        const lvData = AdventureLevels.getLevel(state.adventureLevel);
        els.advLevel.textContent = `第${lvData.level}关 · ${lvData.name}`;
        els.advReward.textContent = GameConfig.getAdventureReward(state.adventureLevel) + '💰';

        els.enemyLineup.innerHTML = '';
        lvData.stages.forEach((stg, si) => {
            const stageDiv = document.createElement('div');
            stageDiv.style.cssText = 'margin-bottom:8px;border-left:2px solid #ff6f00;padding-left:8px;';
            stageDiv.innerHTML = `<div style="font-size:0.75rem;color:#ff6f00;margin-bottom:4px;">阶段${si+1}: ${stg.name}</div>`;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
            stg.enemies.forEach(tid => {
                const tpl = GameConfig.getTemplate(tid);
                if (tpl) {
                    const card = document.createElement('div');
                    card.className = 'enemy-preview-card';
                    card.title = `${tpl.name} ❤${tpl.baseStats.health} ⚔${tpl.baseStats.attack}`;
                    card.innerHTML = `${monsterImgHTML(tpl.id, tpl.emoji, '42px')}<div style="font-size:0.6rem;">${tpl.name}</div>`;
                    row.appendChild(card);
                }
            });
            stageDiv.appendChild(row);
            els.enemyLineup.appendChild(stageDiv);
        });
    }

    function renderBestiary() {
        els.bestiaryGrid.innerHTML = '';
        const rangeNames = { melee: '近战', mid: '中程', ranged: '远程', heal: '治疗' };

        Object.values(GameConfig.TEMPLATES).forEach(t => {
            const card = document.createElement('div');
            card.className = 'bestiary-card';
            card.style.borderColor = GameConfig.QUALITY_COLORS[t.color] || '#555';

            // 找合成此怪物的配方
            let recipeText = '';
            const cp = {};
            Object.entries(GameConfig.RECIPES).forEach(([k, rid]) => {
                const [a, b] = k.split('+'); cp[rid] = [a, b];
            });
            if (cp[t.id]) {
                const pa = GameConfig.getTemplate(cp[t.id][0]);
                const pb = GameConfig.getTemplate(cp[t.id][1]);
                if (pa && pb) recipeText = `<div class="b-recipe">${monsterImgHTML(pa.id, pa.emoji, '24px')}+${monsterImgHTML(pb.id, pb.emoji, '24px')} →</div>`;
            }

            card.innerHTML = `
                ${monsterImgHTML(t.id, t.emoji, '44px')}
                <div class="b-info">
                    <div class="b-name" style="color:${GameConfig.QUALITY_COLORS[t.color]}">${t.name} Lv.${t.level}</div>
                    ${recipeText}
                    <div class="b-stats">
                        <span>❤${t.baseStats.health}</span>
                        <span>⚔${t.baseStats.attack}</span>
                        <span>⏱${t.baseStats.speed}s</span>
                        ${t.baseStats.regen ? `<span>↻${t.baseStats.regen}/s</span>` : ''}
                        ${t.critRate ? `<span>💥${Math.floor(t.critRate*100)}% x${t.critDmg}</span>` : ''}
                        ${t.healAmount ? `<span>💚${t.healAmount}</span>` : ''}
                        ${t.burstCount > 1 ? `<span>🔫${t.burstCount}连发</span>` : ''}
                    </div>
                    <div class="b-traits">${(t.traits || []).join(' · ')}</div>
                </div>
                <div class="b-range" style="background:${t.range==='melee'?'#d84315':t.range==='mid'?'#f57c00':t.range==='ranged'?'#1565c0':t.range==='heal'?'#2e7d32':'#555'}">${rangeNames[t.range]||t.range}</div>
            `;

            els.bestiaryGrid.appendChild(card);
        });
    }

    function renderEndless() {
        const state = GameState.getState();
        els.endlessBest.textContent = state.endlessBest;
    }

    function generateEndlessEnemies(wave) {
        const enemies = [];
        let count = 1 + Math.floor(wave / 3);
        let maxLv = 1 + Math.floor(wave / 5);
        count = Math.min(count, 4);
        maxLv = Math.min(maxLv, 5);

        const pool = Object.values(GameConfig.TEMPLATES).filter(t => t.level <= maxLv);
        for (let i = 0; i < count; i++) {
            const tpl = pool[Math.floor(Math.random() * pool.length)];
            enemies.push(GameState.createMonster(tpl.id));
        }
        return enemies;
    }

    // 刷新所有卡片选中状态
    function refreshSelection() {
        document.querySelectorAll('.monster-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.uniqueId === selectedMonsterId);
        });
    }

    function renderSaveSlots() {
        const panel = els.saveSlotsPanel;
        const slots = GameState.getSlots();
        const state = GameState.getState();

        let html = '<h3>📂 存档管理</h3>';
        for (let n = 0; n < 5; n++) {
            const slot = slots.find(s => s.index === n);
            if (slot) {
                const d = new Date(slot.timestamp);
                const ds = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
                html += `<div class="save-slot">
                    <div class="slot-info">
                        <div class="slot-date">存档${n+1} · ${ds}</div>
                        <div class="slot-detail">🏭Lv.${slot.level} 💰${slot.gold} 📦${slot.monsterCount}只</div>
                    </div>
                    <button class="btn-load" data-action="load" data-slot="${n}">读取</button>
                    <button class="btn-save" data-action="save" data-slot="${n}">覆盖</button>
                    <button class="btn-del" data-action="delete" data-slot="${n}">删除</button>
                </div>`;
            } else {
                html += `<div class="save-slot">
                    <div class="slot-empty">存档${n+1} · 空</div>
                    <button class="btn-save" data-action="save" data-slot="${n}">保存</button>
                </div>`;
            }
        }
        panel.innerHTML = html;

        // 事件委托
        panel.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const n = parseInt(btn.dataset.slot);
                if (action === 'save') {
                    GameState.saveToSlot(n);
                    renderSaveSlots();
                } else if (action === 'load') {
                    if (confirm(`确定读取存档${n+1}？当前进度将被覆盖。`)) {
                        GameState.loadFromSlot(n);
                        renderAll();
                        renderSaveSlots();
                    }
                } else if (action === 'delete') {
                    if (confirm(`确定删除存档${n+1}？`)) {
                        GameState.deleteSlot(n);
                        renderSaveSlots();
                    }
                }
            });
        });
    }

    // 清除选中
    function clearSelection() {
        selectedMonsterId = null;
        refreshSelection();
    }

    function showMonsterDetail(monster) {
        let html = '<div style="text-align:left;padding:12px 18px;font-size:0.85rem;line-height:1.8;">'
            + '<div style="font-size:1.4rem;margin-bottom:8px;">' + monsterImgHTML(monster.templateId, monster.emoji, '34px') + ' <b>' + monster.name + '</b> <span style="color:#aaa;">(Lv.' + monster.level + ' ' + monster.color + ')</span></div>'
            + '<div>❤️ 生命: ' + monster.stats.health + '/' + monster.stats.maxHealth + '</div>'
            + '<div>⚔️ 攻击: ' + monster.stats.attack + '</div>'
            + '<div>⏱️ 攻速: ' + monster.stats.speed + '秒/次</div>'
            + '<div>↻ 回血: ' + monster.stats.regen + '/秒</div>'
            + '<div>💥 暴击: ' + Math.floor(monster.critRate*100) + '% (' + monster.critDmg + 'x)</div>'
            + '<div>特性: ' + ((monster.traits || []).join(' · ') || '无') + '</div>'
            + '</div>';
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;';
        const box = document.createElement('div');
        box.style.cssText = 'background:#1e1e2e;color:#e0e0e0;padding:18px 24px;border-radius:10px;max-width:340px;box-shadow:0 4px 24px rgba(0,0,0,0.5);';
        box.innerHTML = html + '<div style="text-align:right;margin-top:12px;"><button id="detail-close-btn" style="padding:4px 16px;background:#ff6f00;color:#fff;border:none;border-radius:6px;cursor:pointer;">关闭</button></div>';
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        document.getElementById('detail-close-btn').onclick = function() { overlay.remove(); };
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    }

    function bindEvents() {
        els.newGameBtn.addEventListener('click', () => {
            GameState.resetGame();
            showMainGame();
        });
        els.continueBtn.addEventListener('click', () => {
            if (GameState.loadGame()) showMainGame();
            else alert('存档加载失败');
        });
        els.saveBtn.addEventListener('click', () => {
            GameState.saveGame();
            els.saveBtn.textContent = '✅';
            setTimeout(() => els.saveBtn.textContent = '💾', 800);
        });
        els.saveSlotsBtn.addEventListener('click', () => {
            const panel = els.saveSlotsPanel;
            if (panel.style.display === 'none') {
                renderSaveSlots();
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        });
        els.resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置当前进度吗？（存档槽不受影响）')) {
                GameState.resetGame();
                renderAll();
            }
        });
        // 标签切换
        els.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                els.tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                Object.values(els.panels).forEach(p => p.classList.remove('active'));
                els.panels[tab].classList.add('active');
                clearSelection();
                renderAll();
            });
        });

        // 商店购买
        document.querySelectorAll('.shop-card .buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.target.closest('.shop-card').dataset.template;
                if (GameState.spendGold(GameConfig.SHOP_COST)) {
                    const monster = GameState.createMonster(templateId);
                    GameState.addMonster(monster);
                    renderAll();
                } else {
                    alert('金币不足！');
                }
            });
        });

        // 合成区拖放
        els.synthSlotA.addEventListener('dragover', e => e.preventDefault());
        els.synthSlotA.addEventListener('drop', e => {
            e.preventDefault();
            const uid = e.dataTransfer.getData('text/plain');
            const monster = GameState.getMonsterByUniqueId(uid);
            if (monster) {
                if (synthSlotB && synthSlotB.uniqueId === uid) synthSlotB = null;
                synthSlotA = monster;
                renderSynthSlots();
            }
        });
        els.synthSlotA.addEventListener('click', () => {
            if (selectedMonsterId) {
                const m = GameState.getMonsterByUniqueId(selectedMonsterId);
                if (m) {
                    if (synthSlotB && synthSlotB.uniqueId === m.uniqueId) synthSlotB = null;
                    synthSlotA = m;
                    clearSelection();
                    renderSynthSlots();
                }
            } else if (synthSlotA) {
                synthSlotA = null; renderSynthSlots();
            }
        });

        els.synthSlotB.addEventListener('dragover', e => e.preventDefault());
        els.synthSlotB.addEventListener('drop', e => {
            e.preventDefault();
            const uid = e.dataTransfer.getData('text/plain');
            const monster = GameState.getMonsterByUniqueId(uid);
            if (monster) {
                if (synthSlotA && synthSlotA.uniqueId === uid) synthSlotA = null;
                synthSlotB = monster;
                renderSynthSlots();
            }
        });
        els.synthSlotB.addEventListener('click', () => {
            if (selectedMonsterId) {
                const m = GameState.getMonsterByUniqueId(selectedMonsterId);
                if (m) {
                    if (synthSlotA && synthSlotA.uniqueId === m.uniqueId) synthSlotA = null;
                    synthSlotB = m;
                    clearSelection();
                    renderSynthSlots();
                }
            } else if (synthSlotB) {
                synthSlotB = null; renderSynthSlots();
            }
        });

        // 合成按钮
        els.synthesizeBtn.addEventListener('click', () => {
            if (!synthSlotA || !synthSlotB) return;
            const result = Synthesis.synthesize(synthSlotA, synthSlotB);
            els.synthResult.textContent = result.message;
            if (result.success) {
                synthSlotA = null;
                synthSlotB = null;
            }
            renderAll();
            setTimeout(() => els.synthResult.textContent = '', 3000);
        });

        // 队伍槽位拖放
        els.teamSlots.forEach(slot => {
            slot.addEventListener('dragover', e => e.preventDefault());
            slot.addEventListener('drop', e => {
                e.preventDefault();
                const uid = e.dataTransfer.getData('text/plain');
                const slotIndex = parseInt(slot.dataset.slot);
                GameState.setTeamSlot(slotIndex, uid);
                renderAll();
            });
            slot.addEventListener('click', () => {
                const slotIndex = parseInt(slot.dataset.slot);
                if (selectedMonsterId) {
                    GameState.setTeamSlot(slotIndex, selectedMonsterId);
                    clearSelection();
                } else {
                    GameState.setTeamSlot(slotIndex, null);
                }
                renderAll();
            });
        });

        // 冒险战斗（支持多阶段）
        els.adventureFightBtn.addEventListener('click', () => {
            const state = GameState.getState();
            const playerTeam = GameState.getTeamMonsters();
            if (playerTeam.every(m => !m)) { alert('请先上阵怪物！'); return; }

            const lvData = AdventureLevels.getLevel(state.adventureLevel);
            let currentStage = 0;
            // 将玩家怪物转为普通对象（携带独立血量）
            let playerUnits = playerTeam.filter(m => m).map(m => monsterToUnitData(m));

            function runNextStage() {
                if (currentStage >= lvData.stages.length) {
                    // 全部阶段通关！
                    GameState.addGold(GameConfig.getAdventureReward(state.adventureLevel));
                    GameState.setAdventureLevel(state.adventureLevel + 1);
                    renderAll();
                    return;
                }

                const stg = lvData.stages[currentStage];
                // 生成当前阶段的敌方怪物
                const enemies = stg.enemies.map(tid => GameState.createMonster(tid)).filter(m => m);

                CanvasBattle.startBattle(
                    playerUnits,
                    enemies,
                    'adventure',
                    {
                        getHudInfo: () => ({
                            mode: '第' + lvData.level + '关 ' + lvData.name,
                            stage: '阶段' + (currentStage+1) + '/' + lvData.stages.length + ' ' + stg.name,
                            reward: '+' + GameConfig.getAdventureReward(lvData.level) + '💰'
                        }),
                        getRewardText: () => '第' + lvData.level + '关 ' + stg.name + ' (阶段' + (currentStage+1) + '/' + lvData.stages.length + ')',
                        onComplete: (result) => {
                            if (result.playerWin) {
                                // 保留存活怪物血量进入下一阶段
                                playerUnits = result.survivingAllies.map(u => battleResultToUnitData(u));
                                currentStage++;
                                runNextStage();
                            } else {
                                renderAll();
                            }
                        }
                    }
                );
            }

            runNextStage();
        });

        // 无尽模式
        let endlessState = null;
        els.endlessStartBtn.addEventListener('click', () => {
            const playerTeam = GameState.getTeamMonsters();
            if (playerTeam.every(m => !m)) { alert('请先上阵怪物！'); return; }
            endlessState = {
                wave: 1,
                playerTeam: playerTeam.filter(m => m).map(m => monsterToUnitData(m)),
                previousBest: GameState.getState().endlessBest,
                running: true
            };
            els.endlessBattleArea.style.display = 'block';
            els.endlessStartBtn.style.display = 'none';
            startEndlessWave();
        });

        function startEndlessWave() {
            if (!endlessState || !endlessState.running) return;
            els.endlessWave.textContent = endlessState.wave;
            const enemies = generateEndlessEnemies(endlessState.wave);
            const waveReward = GameConfig.ENDLESS_BASE_REWARD + GameConfig.ENDLESS_REWARD_PER_WAVE * endlessState.wave;

            CanvasBattle.startBattle(
                endlessState.playerTeam,
                enemies,
                'endless',
                {
                    getHudInfo: () => ({
                        mode: '无尽模式',
                        stage: '第' + endlessState.wave + '波',
                        reward: '+' + waveReward + '💰'
                    }),
                    getRewardText: () => '第' + endlessState.wave + '波 +' + waveReward + '💰',
                    onComplete: (result) => {
                        if (result.playerWin) {
                            // 保留存活怪物HP，回血30%，自动进入下一波
                            endlessState.playerTeam = result.survivingAllies.map(u => {
                                const d = battleResultToUnitData(u);
                                d.health = Math.min(d.maxHealth, d.health + Math.floor(d.maxHealth * 0.3));
                                return d;
                            });
                            endlessState.wave++;
                            els.endlessWave.textContent = endlessState.wave;
                            els.endlessResult.textContent = `第${endlessState.wave - 1}波胜利！`;
                            startEndlessWave();
                        } else {
                            els.endlessResult.textContent = `第${endlessState.wave}波失败！`;
                            endEndlessRun();
                        }
                    }
                }
            );
        }

        // 自由模式：槽位点击切换当前填充方
        function bindFreeSlotClicks() {
            const allySlots = els.freeAllySlots.querySelectorAll('.free-slot');
            const enemySlots = els.freeEnemySlots.querySelectorAll('.free-slot');

            allySlots.forEach(slot => {
                slot.addEventListener('click', () => {
                    const idx = parseInt(slot.dataset.index);
                    if (freeAllySlots[idx]) {
                        // 已有怪物，点击移除
                        freeAllySlots[idx] = null;
                        renderFreeSlots();
                    }
                    freePickSide = 'ally';
                    highlightActiveSide();
                });
            });

            enemySlots.forEach(slot => {
                slot.addEventListener('click', () => {
                    const idx = parseInt(slot.dataset.index);
                    if (freeEnemySlots[idx]) {
                        freeEnemySlots[idx] = null;
                        renderFreeSlots();
                    }
                    freePickSide = 'enemy';
                    highlightActiveSide();
                });
            });
        }

        function highlightActiveSide() {
            const allyTitle = els.freeAllySlots.parentElement.querySelector('.free-side-title');
            const enemyTitle = els.freeEnemySlots.parentElement.querySelector('.free-side-title');
            if (freePickSide === 'ally') {
                allyTitle.classList.add('active-side');
                enemyTitle.classList.remove('active-side');
            } else {
                enemyTitle.classList.add('active-side');
                allyTitle.classList.remove('active-side');
            }
        }

        bindFreeSlotClicks();
        highlightActiveSide();

        els.freeFightBtn.addEventListener('click', freeStartFight);
        els.freeClearBtn.addEventListener('click', freeClearSlots);

        function endEndlessRun() {
            if (!endlessState) return;
            const prevBest = endlessState.previousBest;
            const newWaves = Math.max(0, endlessState.wave - prevBest);
            let reward = 0;
            for (let w = prevBest + 1; w < endlessState.wave; w++) {
                reward += GameConfig.ENDLESS_BASE_REWARD + GameConfig.ENDLESS_REWARD_PER_WAVE * w;
            }
            if (reward > 0) {
                els.endlessResult.textContent += ` 新纪录！+${reward}💰`;
                GameState.addGold(reward);
            } else {
                els.endlessResult.textContent += ` 未超过记录(${prevBest}波)，无奖励`;
            }
            GameState.setEndlessBest(endlessState.wave);
            endlessState.running = false;
            els.endlessBattleArea.style.display = 'none';
            els.endlessStartBtn.style.display = 'inline-block';
            renderAll();
        }

    }

    function showMainGame() {
        els.startScreen.style.display = 'none';
        els.mainGame.style.display = 'block';
        renderAll();
    }

    function renderTeamMonsterList() {
        const state = GameState.getState();
        els.teamMonsterList.innerHTML = '';
        const teamIds = state.team.filter(Boolean);
        const available = state.monsters.filter(m => !teamIds.includes(m.uniqueId));
        if (available.length === 0) {
            els.teamMonsterList.innerHTML = '<p style="color:#888;">无可出战怪物</p>';
            return;
        }
        available.forEach(m => {
            const card = document.createElement('div');
            card.className = 'monster-card';
            card.setAttribute('draggable', 'true');
            card.dataset.uniqueId = m.uniqueId;
            card.innerHTML = `
                <div class="monster-card-img">${monsterImgHTML(m.templateId, m.emoji, '68px')}</div>
                <div class="name" style="color:${GameConfig.QUALITY_COLORS[m.color]}">${m.name}</div>
                <div class="info">❤${m.stats.health} ⚔${m.stats.attack}</div>
            `;
            card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', m.uniqueId);
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
            card.addEventListener('click', () => {
                if (selectedMonsterId === m.uniqueId) {
                    showMonsterDetail(m);
                } else {
                    selectedMonsterId = m.uniqueId;
                    refreshSelection();
                }
            });
            if (selectedMonsterId === m.uniqueId) card.classList.add('selected');
            els.teamMonsterList.appendChild(card);
        });
    }

    // ========== 自由模式 ==========

    function renderFreeMode() {
        // 渲染模板选择器（全部24种，按等级分组）
        els.freeTemplatePicker.innerHTML = '';
        const tpls = Object.values(GameConfig.TEMPLATES);
        const byLevel = {};
        tpls.forEach(t => {
            if (!byLevel[t.level]) byLevel[t.level] = [];
            byLevel[t.level].push(t);
        });
        const lvNames = { 1: 'Lv1 绿', 2: 'Lv2 蓝', 3: 'Lv3 橙', 4: 'Lv4 红', 5: 'Lv5 金' };

        [1, 2, 3, 4, 5].forEach(lv => {
            const group = document.createElement('div');
            group.className = 'free-tpl-group';
            group.innerHTML = `<div class="free-tpl-lv">${lvNames[lv]}</div>`;

            const row = document.createElement('div');
            row.className = 'free-tpl-row';

            (byLevel[lv] || []).forEach(t => {
                const card = document.createElement('div');
                card.className = 'free-tpl-card';
                card.style.borderColor = GameConfig.QUALITY_COLORS[t.color];
                card.title = `${t.name}\n❤${t.baseStats.health} ⚔${t.baseStats.attack} ⏱${t.baseStats.speed}s\n${(t.traits||[]).join(' · ')}`;
                card.innerHTML = `
                    ${monsterImgHTML(t.id, t.emoji, '44px')}
                    <div class="free-tpl-name" style="color:${GameConfig.QUALITY_COLORS[t.color]}">${t.name}</div>
                    <div class="free-tpl-stats">❤${t.baseStats.health} ⚔${t.baseStats.attack}</div>
                `;
                card.addEventListener('click', () => {
                    freePickTemplate(t.id);
                });
                row.appendChild(card);
            });

            group.appendChild(row);
            els.freeTemplatePicker.appendChild(group);
        });

        // 渲染双方阵容槽位
        renderFreeSlots();
    }

    function renderFreeSlots() {
        const allySlots = els.freeAllySlots.querySelectorAll('.free-slot');
        const enemySlots = els.freeEnemySlots.querySelectorAll('.free-slot');

        allySlots.forEach((slot, i) => {
            const tid = freeAllySlots[i];
            if (tid) {
                const tpl = GameConfig.getTemplate(tid);
                slot.innerHTML = `${monsterImgHTML(tpl.id, tpl.emoji, '28px')}<span class="free-slot-name" style="color:${GameConfig.QUALITY_COLORS[tpl.color]}">${tpl.name}</span>`;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '空';
                slot.classList.remove('filled');
            }
        });

        enemySlots.forEach((slot, i) => {
            const tid = freeEnemySlots[i];
            if (tid) {
                const tpl = GameConfig.getTemplate(tid);
                slot.innerHTML = `${monsterImgHTML(tpl.id, tpl.emoji, '28px')}<span class="free-slot-name" style="color:${GameConfig.QUALITY_COLORS[tpl.color]}">${tpl.name}</span>`;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '空';
                slot.classList.remove('filled');
            }
        });
    }

    function freePickTemplate(templateId) {
        // 找到并填充到当前选中的方
        const slots = freePickSide === 'ally' ? freeAllySlots : freeEnemySlots;
        const emptyIdx = slots.findIndex(s => !s);
        if (emptyIdx === -1) {
            // 已满，先清掉第一个再填
            slots[0] = null;
            slots[3] = null;
            for (let i = 1; i < 4; i++) {
                slots[i - 1] = slots[i];
            }
            slots[3] = templateId;
        } else {
            slots[emptyIdx] = templateId;
        }
        renderFreeSlots();
    }

    function freeClearSlots() {
        freeAllySlots = [null, null, null, null];
        freeEnemySlots = [null, null, null, null];
        renderFreeSlots();
        els.freeResult.textContent = '';
    }

    function freeStartFight() {
        const allyTids = freeAllySlots.filter(Boolean);
        const enemyTids = freeEnemySlots.filter(Boolean);
        if (allyTids.length === 0) { alert('请先选择我方阵容！'); return; }
        if (enemyTids.length === 0) { alert('请先选择敌方阵容！'); return; }

        // 生成战斗单位（满血，每次都新建）
        const allyUnits = allyTids.map(tid => {
            const m = GameState.createMonster(tid);
            return UI._monsterToUnitData(m);
        });
        const enemyUnits = enemyTids.map(tid => {
            const m = GameState.createMonster(tid);
            return UI._monsterToUnitData(m);
        });

        CanvasBattle.startBattle(
            allyUnits,
            enemyUnits,
            'free',
            {
                getHudInfo: () => ({ mode: '自由模式', stage: '测试对战', reward: '' }),
                getRewardText: () => '自由模式 · 测试对战',
                onComplete: (result) => {
                    if (result.playerWin) {
                        els.freeResult.textContent = '🏆 我方胜利！';
                    } else {
                        els.freeResult.textContent = '💀 敌方胜利！';
                    }
                    renderFreeSlots();
                }
            }
        );
    }

    // ========== 导出的单位映射 ==========
    // 将怪物对象转为战斗单位数据
    function _monsterToUnitData(m) {
        const tpl2 = GameConfig.getTemplate(m.templateId);
        return {
            uniqueId: m.uniqueId,
            name: m.name, emoji: m.emoji, image: tpl2 ? tpl2.image : null, range: m.range,
            poisonDmg: m.poisonDmg || 0, poisonDur: m.poisonDur || 0,
            berserk: m.berserk || 0,
            thorns: m.thorns || 0,
            rebirth: m.rebirth || 0,
            slowPct: m.slowPct || 0, slowDur: m.slowDur || 0,
            explodeDmg: m.explodeDmg || 0, explodeRange: m.explodeRange || 0,
            tenacity: m.tenacity || 0, tenacityThreshold: m.tenacityThreshold || 0,
            healDmgPct: m.healDmgPct || 0,
            level: m.level || 1,
            color: m.color || 'green'
        };
    }
    function init() {
        cacheElements();
        bindEvents();
        const hasSave = GameState.hasSave();
        if (hasSave) {
            els.continueBtn.style.display = 'block';
        }
        if (GameState.loadGame()) {
            showMainGame();
        } else {
            els.startScreen.style.display = 'block';
        }
    }

    return { init, renderAll, _monsterToUnitData };
})();
