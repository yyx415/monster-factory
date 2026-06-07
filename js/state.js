window.GameState = (function() {
    const SAVE_KEY = 'monster_factory_v2';

    let state = {
        gold: 200,
        monsters: [],
        team: [null, null, null, null],
        adventureLevel: 1,
        endlessBest: 0
    };

    function generateId() {
        return 'm_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function createMonster(templateId) {
        const tpl = GameConfig.getTemplate(templateId);
        if (!tpl) return null;
        return {
            uniqueId: generateId(),
            templateId: tpl.id,
            name: tpl.name,
            level: tpl.level,
            color: tpl.color,
            emoji: tpl.emoji,
            image: tpl.image,
            range: tpl.range,
            stats: { ...tpl.baseStats, maxHealth: tpl.baseStats.health },
            critRate: tpl.critRate,
            critDmg: tpl.critDmg,
            traits: [...tpl.traits],
            healAmount: tpl.healAmount || 0,
            burstCount: tpl.burstCount || 1,
            poisonRange: tpl.poisonRange || 0,
            knockback: tpl.knockback || 0,
            splash: tpl.splash || 0, splashPct: tpl.splashPct || 0,
            lifesteal: tpl.lifesteal || 0,
            poisonDmg: tpl.poisonDmg || 0, poisonDur: tpl.poisonDur || 0,
            berserk: tpl.berserk || 0,
            thorns: tpl.thorns || 0,
            rebirth: tpl.rebirth || 0,
            slowPct: tpl.slowPct || 0, slowDur: tpl.slowDur || 0,
            explodeDmg: tpl.explodeDmg || 0, explodeRange: tpl.explodeRange || 0,
            tenacity: tpl.tenacity || 0, tenacityThreshold: tpl.tenacityThreshold || 0,
            healDmgPct: tpl.healDmgPct || 0
        };
    }

    function getDefaultState() {
        return {
            gold: 200,
            monsters: [],
            team: [null, null, null, null],
            adventureLevel: 1,
            endlessBest: 0
        };
    }

    function saveGame() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        } catch(e) { console.error('保存失败', e); }
    }

    function loadGame() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                state = JSON.parse(raw);
                return true;
            }
        } catch(e) { console.error('加载失败', e); }
        return false;
    }

    // ===== 多存档槽位 =====
    const SLOT_PREFIX = 'monster_factory_slot_';
    const MAX_SLOTS = 5;

    function saveToSlot(n) {
        if (n < 0 || n >= MAX_SLOTS) return false;
        try {
            const entry = {
                timestamp: Date.now(),
                level: state.adventureLevel,
                gold: state.gold,
                monsterCount: state.monsters.length,
                data: JSON.parse(JSON.stringify(state))
            };
            localStorage.setItem(SLOT_PREFIX + n, JSON.stringify(entry));
            return true;
        } catch(e) { return false; }
    }

    function loadFromSlot(n) {
        if (n < 0 || n >= MAX_SLOTS) return false;
        try {
            const raw = localStorage.getItem(SLOT_PREFIX + n);
            if (!raw) return false;
            const entry = JSON.parse(raw);
            state = JSON.parse(JSON.stringify(entry.data));
            saveGame(); // 同步到自动存档
            return true;
        } catch(e) { return false; }
    }

    function deleteSlot(n) {
        if (n < 0 || n >= MAX_SLOTS) return false;
        localStorage.removeItem(SLOT_PREFIX + n);
        return true;
    }

    function getSlots() {
        const slots = [];
        for (let n = 0; n < MAX_SLOTS; n++) {
            try {
                const raw = localStorage.getItem(SLOT_PREFIX + n);
                if (raw) {
                    const entry = JSON.parse(raw);
                    slots.push({
                        index: n,
                        timestamp: entry.timestamp,
                        level: entry.level,
                        gold: entry.gold,
                        monsterCount: entry.monsterCount
                    });
                }
            } catch(e) {}
        }
        return slots;
    }

    function resetGame() {
        state = getDefaultState();
        saveGame();
        // 不清除存档槽
    }

    function hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    }

    function getState() { return state; }
    function addGold(amount) { state.gold += amount; saveGame(); }
    function spendGold(amount) {
        if (state.gold >= amount) { state.gold -= amount; saveGame(); return true; }
        return false;
    }
    function addMonster(monster) { state.monsters.push(monster); saveGame(); }
    function removeMonster(uniqueId) {
        const idx = state.monsters.findIndex(m => m.uniqueId === uniqueId);
        if (idx !== -1) {
            state.monsters.splice(idx, 1);
            state.team = state.team.map(sid => sid === uniqueId ? null : sid);
            saveGame();
            return true;
        }
        return false;
    }
    function getMonsterByUniqueId(uniqueId) {
        return state.monsters.find(m => m.uniqueId === uniqueId) || null;
    }
    function getTeamMonsters() {
        return state.team.map(uid => uid ? getMonsterByUniqueId(uid) : null);
    }
    function setTeamSlot(slotIndex, uniqueId) {
        if (slotIndex >= 0 && slotIndex < 4) {
            state.team[slotIndex] = uniqueId;
            saveGame();
        }
    }
    function setAdventureLevel(lv) { state.adventureLevel = lv; saveGame(); }
    function setEndlessBest(wave) { if (wave > state.endlessBest) { state.endlessBest = wave; saveGame(); } }

    return {
        getState, saveGame, loadGame, resetGame, hasSave,
        createMonster, addGold, spendGold, addMonster, removeMonster,
        getMonsterByUniqueId, getTeamMonsters, setTeamSlot,
        setAdventureLevel, setEndlessBest,
        saveToSlot, loadFromSlot, deleteSlot, getSlots
    };
})();
