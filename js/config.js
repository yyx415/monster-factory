window.GameConfig = (function() {
    // 品质颜色映射
    const QUALITY_COLORS = {
        green: '#4caf50',
        blue: '#2196f3',
        orange: '#ff9800',
        red: '#f44336',
        gold: '#ffd700'
    };

    // 攻击距离类型
    const RANGE = { MELEE: 'melee', RANGED: 'ranged', MID: 'mid', HEAL: 'heal' };

    // 所有怪物模板
    const TEMPLATES = {
        // ===== 1级 绿色 =====
        mech_1: {
            id: 'mech_1', name: '机械', level: 1, color: 'green',
            emoji: '🔧', range: RANGE.RANGED,
            baseStats: { health: 180, attack: 18, speed: 1.3, regen: 0 },
            critRate: 0.2, critDmg: 2.0,
            traits: ['暴击20%', '轻微击退']
        },
        plant_1: {
            id: 'plant_1', name: '植物', level: 1, color: 'green',
            emoji: '🌱', range: RANGE.MELEE,
            baseStats: { health: 240, attack: 12, speed: 1.1, regen: 3 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血3', '轻微击退']
        },

        // ===== 2级 蓝色 =====
        wheel_2: {
            id: 'wheel_2', name: '滑轮', level: 2, color: 'blue',
            emoji: '⚙️', range: RANGE.RANGED,
            baseStats: { health: 320, attack: 36, speed: 1.2, regen: 0 },
            critRate: 0.4, critDmg: 2.0,
            traits: ['暴击40%', '轻微击退']
        },
        elf_2: {
            id: 'elf_2', name: '精灵', level: 2, color: 'blue',
            emoji: '🧚', range: RANGE.MELEE,
            baseStats: { health: 440, attack: 24, speed: 1.0, regen: 8 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血8', '轻微击退']
        },
        boom_2: {
            id: 'boom_2', name: '砰砰', level: 2, color: 'blue',
            emoji: '💥', range: RANGE.MELEE,
            baseStats: { health: 240, attack: 42, speed: 0.9, regen: 0 },
            critRate: 0.5, critDmg: 2.0,
            traits: ['暴击50%', '血量少伤害高', '轻微击退']
        },

        // ===== 3级 橙色 =====
        tree_3: {
            id: 'tree_3', name: '神树', level: 3, color: 'orange',
            emoji: '🌳', range: RANGE.HEAL,
            baseStats: { health: 560, attack: 40, speed: 1.5, regen: 0 },
            critRate: 0.2, critDmg: 2.0,
            traits: ['治疗全体', '治疗暴击20%'],
            healAmount: 40
        },
        venom_3: {
            id: 'venom_3', name: '毒液', level: 3, color: 'orange',
            emoji: '🐍', range: RANGE.MID,
            baseStats: { health: 600, attack: 50, speed: 2.6, regen: 12 },
            critRate: 0, critDmg: 2.0,
            traits: ['穿透', '击退', '每秒回血12'],
            knockback: 52, // 普通击退的75%
            poisonRange: 100
        },
        flail_3: {
            id: 'flail_3', name: '链锤', level: 3, color: 'orange',
            emoji: '🔗', range: RANGE.MELEE,
            baseStats: { health: 800, attack: 45, speed: 0.9, regen: 18 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血18', '击退']
        },
        drill_3: {
            id: 'drill_3', name: '钻枪', level: 3, color: 'orange',
            emoji: '🔩', range: RANGE.MELEE,
            baseStats: { health: 440, attack: 70, speed: 0.8, regen: 0 },
            critRate: 0.7, critDmg: 2.0,
            traits: ['暴击70%', '血量少伤害高', '轻微击退']
        },
        gunfire_3: {
            id: 'gunfire_3', name: '枪火', level: 3, color: 'orange',
            emoji: '🔫', range: RANGE.RANGED,
            baseStats: { health: 560, attack: 10, speed: 1.1, regen: 0 },
            critRate: 0, critDmg: 2.0,
            traits: ['穿透攻击', '3连发'],
            burstCount: 3
        },
        ironfist_3: {
            id: 'ironfist_3', name: '铁拳', level: 3, color: 'orange',
            emoji: '🤖', range: RANGE.MELEE,
            baseStats: { health: 700, attack: 40, speed: 0.9, regen: 8 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血8', '大幅击退']
        },

        // ===== 4级 红色 =====
        magma_4: {
            id: 'magma_4', name: '岩浆兽', level: 4, color: 'red',
            emoji: '🔥', range: RANGE.MELEE,
            baseStats: { health: 750, attack: 60, speed: 1.0, regen: 20 },
            critRate: 0, critDmg: 2.0,
            traits: ['击退'],
            knockback: 70,
            splash: 50, splashPct: 0.4
        },
        vampire_4: {
            id: 'vampire_4', name: '吸血鬼', level: 4, color: 'red',
            emoji: '🦇', range: RANGE.MID,
            baseStats: { health: 500, attack: 48, speed: 1.1, regen: 0 },
            critRate: 0.2, critDmg: 2.0,
            traits: ['暴击20%'],
            lifesteal: 0.4
        },
        poison_4: {
            id: 'poison_4', name: '毒之花', level: 4, color: 'red',
            emoji: '🌺', range: RANGE.RANGED,
            baseStats: { health: 420, attack: 35, speed: 1.0, regen: 5 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血5'],
            poisonDmg: 8, poisonDur: 3
        },
        berserk_4: {
            id: 'berserk_4', name: '狂战士', level: 4, color: 'red',
            emoji: '💢', range: RANGE.MELEE,
            baseStats: { health: 550, attack: 45, speed: 0.9, regen: 5 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血5', '轻微击退'],
            berserk: 0.7
        },
        guardian_4: {
            id: 'guardian_4', name: '守护者', level: 4, color: 'red',
            emoji: '🛡️', range: RANGE.MELEE,
            baseStats: { health: 950, attack: 38, speed: 1.3, regen: 15 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血15', '大幅击退'],
            thorns: 0.25
        },

        // ===== 5级 金色 =====
        dragon_5: {
            id: 'dragon_5', name: '龙帝', level: 5, color: 'gold',
            emoji: '🐲', range: RANGE.MELEE,
            baseStats: { health: 950, attack: 60, speed: 0.9, regen: 20 },
            critRate: 0.25, critDmg: 2.0,
            traits: ['暴击25%', '每秒回血20', '大幅击退'],
            splash: 50, splashPct: 0.4, lifesteal: 0.15
        },
        phoenix_5: {
            id: 'phoenix_5', name: '凤凰神', level: 5, color: 'gold',
            emoji: '🦅', range: RANGE.HEAL,
            baseStats: { health: 700, attack: 55, speed: 1.1, regen: 15 },
            critRate: 0.3, critDmg: 2.0,
            traits: ['治疗全体', '治疗暴击30%', '每秒回血15'],
            healAmount: 55,
            rebirth: 150
        },
        timeassassin_5: {
            id: 'timeassassin_5', name: '时空刺客', level: 5, color: 'gold',
            emoji: '⏰', range: RANGE.MELEE,
            baseStats: { health: 420, attack: 40, speed: 1.0, regen: 0 },
            critRate: 0.4, critDmg: 3.0,
            traits: ['暴击40%'],
            burstCount: 3
        },
        frostdragon_5: {
            id: 'frostdragon_5', name: '冰霜龙', level: 5, color: 'gold',
            emoji: '🧊', range: RANGE.MID,
            baseStats: { health: 600, attack: 48, speed: 1.2, regen: 10 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血10', '击退'],
            knockback: 70,
            poisonRange: 120,
            slowPct: 1.5, slowDur: 2
        },
        angel_5: {
            id: 'angel_5', name: '圣天使', level: 5, color: 'gold',
            emoji: '✨', range: RANGE.HEAL,
            baseStats: { health: 800, attack: 60, speed: 0.9, regen: 10 },
            critRate: 0.4, critDmg: 2.0,
            traits: ['治疗全体', '治疗暴击40%', '每秒回血10'],
            healAmount: 60,
            healDmgPct: 0.15
        },
        destroyer_5: {
            id: 'destroyer_5', name: '毁灭者', level: 5, color: 'gold',
            emoji: '💣', range: RANGE.MELEE,
            baseStats: { health: 300, attack: 130, speed: 1.0, regen: 0 },
            critRate: 0.25, critDmg: 2.0,
            traits: ['暴击25%', '轻微击退'],
            explodeDmg: 300, explodeRange: 50
        },
        behemoth_5: {
            id: 'behemoth_5', name: '巨兽王', level: 5, color: 'gold',
            emoji: '🦍', range: RANGE.MELEE,
            baseStats: { health: 1300, attack: 55, speed: 1.2, regen: 28 },
            critRate: 0, critDmg: 2.0,
            traits: ['每秒回血28', '大幅击退'],
            tenacity: 0.5, tenacityThreshold: 0.3
        },
        sniper_5: {
            id: 'sniper_5', name: '狙击王', level: 5, color: 'gold',
            emoji: '🎯', range: RANGE.RANGED,
            baseStats: { health: 450, attack: 42, speed: 1.4, regen: 0 },
            critRate: 0.5, critDmg: 3.0,
            traits: ['暴击50%', '穿透攻击'],
            burstCount: 3
        }
    };

    // 合成配方表
    const RECIPES = {
        // 蓝色
        'mech_1+mech_1': 'wheel_2',
        'plant_1+plant_1': 'elf_2',
        'mech_1+plant_1': 'boom_2',
        // 橙色
        'elf_2+wheel_2': 'tree_3',
        'boom_2+wheel_2': 'venom_3',
        'elf_2+elf_2': 'flail_3',
        'boom_2+boom_2': 'drill_3',
        'wheel_2+wheel_2': 'gunfire_3',
        'boom_2+elf_2': 'ironfist_3',
        // 红色 (橙+橙)
        'venom_3+flail_3': 'magma_4',
        'drill_3+venom_3': 'vampire_4',
        'gunfire_3+tree_3': 'poison_4',
        'drill_3+ironfist_3': 'berserk_4',
        'flail_3+ironfist_3': 'guardian_4',
        // 金色 (红+红)
        'magma_4+vampire_4': 'dragon_5',
        'poison_4+guardian_4': 'phoenix_5',
        'berserk_4+vampire_4': 'timeassassin_5',
        'poison_4+magma_4': 'frostdragon_5',
        'guardian_4+berserk_4': 'angel_5',     // 修复：原 guardian_4+poison_4 与 phoenix_5 配方冲突，改为 守护者+狂战士=圣天使
        'berserk_4+magma_4': 'destroyer_5',
        'magma_4+guardian_4': 'behemoth_5',
        'vampire_4+poison_4': 'sniper_5'
    };

    // 经济
    const SHOP_COST = 10;
    const SYNTH_BASE_COST = 100;
    const ADVENTURE_BASE_REWARD = 90;
    const ADVENTURE_REWARD_PER_LEVEL = 25;
    const ENDLESS_BASE_REWARD = 15;
    const ENDLESS_REWARD_PER_WAVE = 5;

    // 合成费用（按目标等级）
    function getSynthCost(targetLevel) {
        return SYNTH_BASE_COST * (targetLevel - 1);
    }

    // 冒险奖励
    function getAdventureReward(level) {
        return ADVENTURE_BASE_REWARD + ADVENTURE_REWARD_PER_LEVEL * level;
    }

    // 获取模板
    function getTemplate(id) {
        return TEMPLATES[id] || null;
    }

    // 查找合成配方
    function findRecipe(idA, idB) {
        const key1 = idA + '+' + idB;
        const key2 = idB + '+' + idA;
        return RECIPES[key1] || RECIPES[key2] || null;
    }

    return {
        QUALITY_COLORS,
        RANGE,
        TEMPLATES,
        RECIPES,
        SHOP_COST,
        getSynthCost,
        getAdventureReward,
        ENDLESS_BASE_REWARD,
        ENDLESS_REWARD_PER_WAVE,
        getTemplate,
        findRecipe
    };
})();
