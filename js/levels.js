// 冒险模式关卡定义 — 15关固定配置 + 后续随机生成
window.AdventureLevels = (function() {
    // 固定关卡
    const FIXED = [
        {   // 第1关 — 教程：单一远程敌人
            level: 1, name: '初入战场', reward: 100,
            stages: [
                { name: '机械哨兵', enemies: ['mech_1'] }
            ]
        },
        {   // 第2关 — 教近战+回血
            level: 2, name: '绿色丛林', reward: 120,
            stages: [
                { name: '植物守卫', enemies: ['plant_1', 'plant_1'] }
            ]
        },
        {   // 第3关 — 混合兵种初现
            level: 3, name: '钢铁森林', reward: 140,
            stages: [
                { name: '前线哨兵', enemies: ['mech_1', 'plant_1'] },
                { name: '增援机械', enemies: ['mech_1', 'mech_1', 'plant_1'] }
            ]
        },
        {   // 第4关 — 首个蓝色敌人
            level: 4, name: '齿轮转动', reward: 170,
            stages: [
                { name: '滑轮登场', enemies: ['wheel_2'] },
                { name: '滑轮+机械小队', enemies: ['wheel_2', 'mech_1', 'mech_1'] }
            ]
        },
        {   // 第5关 — 蓝色回血近战
            level: 5, name: '精灵之舞', reward: 200,
            stages: [
                { name: '精灵先锋', enemies: ['elf_2', 'plant_1'] },
                { name: '精灵+滑轮夹击', enemies: ['elf_2', 'wheel_2', 'mech_1'] }
            ]
        },
        {   // 第6关 — 暴击型敌人，测试防御
            level: 6, name: '爆裂砰砰', reward: 230,
            stages: [
                { name: '砰砰突袭', enemies: ['boom_2', 'boom_2'] },
                { name: '砰砰+精灵', enemies: ['boom_2', 'elf_2', 'plant_1'] }
            ]
        },
        {   // 第7关 — 首个橙色：穿透击退
            level: 7, name: '毒蛇出洞', reward: 270,
            stages: [
                { name: '毒液试炼', enemies: ['venom_3'] },
                { name: '毒液+近战护卫', enemies: ['venom_3', 'plant_1', 'elf_2'] }
            ]
        },
        {   // 第8关 — 高回血肉盾
            level: 8, name: '链锤要塞', reward: 320,
            stages: [
                { name: '链锤守卫', enemies: ['flail_3', 'mech_1'] },
                { name: '链锤+精灵', enemies: ['flail_3', 'elf_2', 'wheel_2'] },
                { name: '双链锤', enemies: ['flail_3', 'flail_3'] }
            ]
        },
        {   // 第9关 — 高暴击玻璃炮
            level: 9, name: '钻头风暴', reward: 370,
            stages: [
                { name: '钻枪突入', enemies: ['drill_3', 'boom_2'] },
                { name: '双钻夹击', enemies: ['drill_3', 'drill_3'] },
                { name: '钻枪+毒液', enemies: ['drill_3', 'venom_3', 'boom_2'] }
            ]
        },
        {   // 第10关 — 三连发穿透
            level: 10, name: '枪林弹雨', reward: 430,
            stages: [
                { name: '枪火阵线', enemies: ['gunfire_3', 'wheel_2'] },
                { name: '双枪火', enemies: ['gunfire_3', 'gunfire_3'] },
                { name: '枪火+链锤', enemies: ['gunfire_3', 'flail_3', 'mech_1'] }
            ]
        },
        {   // 第11关 — 大幅击退铁拳
            level: 11, name: '铁拳无敌', reward: 500,
            stages: [
                { name: '铁拳试炼', enemies: ['ironfist_3', 'plant_1'] },
                { name: '铁拳+枪火', enemies: ['ironfist_3', 'gunfire_3', 'elf_2'] },
                { name: '铁拳+毒液', enemies: ['ironfist_3', 'venom_3', 'drill_3'] }
            ]
        },
        {   // 第12关 — 治疗+坦克组合
            level: 12, name: '神树之光', reward: 580,
            stages: [
                { name: '神树庇护', enemies: ['tree_3', 'elf_2', 'plant_1'] },
                { name: '神树+铁拳', enemies: ['tree_3', 'ironfist_3', 'flail_3'] },
                { name: '神树+双毒液', enemies: ['tree_3', 'venom_3', 'venom_3'] }
            ]
        },
        {   // 第13关 — 全明星阵容
            level: 13, name: '混沌战场', reward: 670,
            stages: [
                { name: '远程轰炸', enemies: ['gunfire_3', 'wheel_2', 'gunfire_3'] },
                { name: '近战冲锋', enemies: ['ironfist_3', 'flail_3', 'drill_3'] },
                { name: '混编突击', enemies: ['ironfist_3', 'venom_3', 'gunfire_3', 'tree_3'] }
            ]
        },
        {   // 第14关 — 极端策略考验
            level: 14, name: '终极试炼', reward: 770,
            stages: [
                { name: '暴击风暴', enemies: ['drill_3', 'drill_3', 'boom_2', 'boom_2'] },
                { name: '击退阵地', enemies: ['ironfist_3', 'flail_3', 'venom_3', 'elf_2'] },
                { name: '双神树不死队', enemies: ['tree_3', 'tree_3', 'ironfist_3', 'flail_3'] }
            ]
        },
        {   // 第15关 — 怪物之王
            level: 15, name: '怪物之王', reward: 900,
            stages: [
                { name: '王之先锋', enemies: ['ironfist_3', 'gunfire_3', 'drill_3', 'wheel_2'] },
                { name: '王之禁卫', enemies: ['tree_3', 'venom_3', 'flail_3', 'ironfist_3'] },
                { name: '王之本尊', enemies: ['ironfist_3', 'ironfist_3', 'tree_3', 'gunfire_3'] }
            ]
        },
        // ===== 16-30关：高级怪物 =====
        {   // 第16关 — 首个红色
            level: 16, name: '岩浆试炼', reward: 1000,
            stages: [
                { name: '岩浆兽登场', enemies: ['magma_4'] },
                { name: '岩浆+护卫', enemies: ['magma_4', 'ironfist_3', 'venom_3'] }
            ]
        },
        {   // 第17关 — 吸血考验
            level: 17, name: '暗夜降临', reward: 1100,
            stages: [
                { name: '吸血鬼突袭', enemies: ['vampire_4', 'drill_3'] },
                { name: '双吸血鬼', enemies: ['vampire_4', 'vampire_4'] },
                { name: '吸血鬼+毒液', enemies: ['vampire_4', 'venom_3', 'gunfire_3'] }
            ]
        },
        {   // 第18关 — 毒与反伤
            level: 18, name: '毒花与盾', reward: 1200,
            stages: [
                { name: '毒花阵', enemies: ['poison_4', 'tree_3', 'venom_3'] },
                { name: '守护者壁垒', enemies: ['guardian_4', 'ironfist_3', 'flail_3'] },
                { name: '毒花+守护者', enemies: ['poison_4', 'guardian_4', 'vampire_4'] }
            ]
        },
        {   // 第19关 — 狂暴之力
            level: 19, name: '狂战士之怒', reward: 1300,
            stages: [
                { name: '狂战士', enemies: ['berserk_4', 'drill_3'] },
                { name: '狂战士+岩浆', enemies: ['berserk_4', 'magma_4', 'boom_2'] },
                { name: '双狂战士', enemies: ['berserk_4', 'berserk_4'] }
            ]
        },
        {   // 第20关 — 红色联军
            level: 20, name: '赤红风暴', reward: 1450,
            stages: [
                { name: '溅射+吸血', enemies: ['magma_4', 'vampire_4'] },
                { name: '毒花+狂战', enemies: ['poison_4', 'berserk_4', 'gunfire_3'] },
                { name: '五红齐聚', enemies: ['magma_4', 'vampire_4', 'guardian_4', 'poison_4'] }
            ]
        },
        {   // 第21关 — 首个金色
            level: 21, name: '龙帝觉醒', reward: 1600,
            stages: [
                { name: '龙帝降临', enemies: ['dragon_5'] },
                { name: '龙帝+护卫', enemies: ['dragon_5', 'magma_4', 'guardian_4'] },
                { name: '龙帝+吸血鬼', enemies: ['dragon_5', 'vampire_4', 'poison_4'] }
            ]
        },
        {   // 第22关 — 时空爆发
            level: 22, name: '时空裂隙', reward: 1750,
            stages: [
                { name: '时空刺客', enemies: ['timeassassin_5', 'drill_3'] },
                { name: '刺客+狂战', enemies: ['timeassassin_5', 'berserk_4', 'vampire_4'] },
                { name: '双刺客', enemies: ['timeassassin_5', 'timeassassin_5'] }
            ]
        },
        {   // 第23关 — 冰霜与涅槃
            level: 23, name: '冰火两重天', reward: 1900,
            stages: [
                { name: '冰霜龙', enemies: ['frostdragon_5', 'poison_4', 'gunfire_3'] },
                { name: '凤凰神', enemies: ['phoenix_5', 'guardian_4', 'tree_3'] },
                { name: '冰龙+凤凰', enemies: ['frostdragon_5', 'phoenix_5', 'magma_4'] }
            ]
        },
        {   // 第24关 — 圣光与毁灭
            level: 24, name: '圣光审判', reward: 2100,
            stages: [
                { name: '圣天使', enemies: ['angel_5', 'tree_3', 'phoenix_5'] },
                { name: '毁灭者', enemies: ['destroyer_5', 'berserk_4'] },
                { name: '天使+毁灭', enemies: ['angel_5', 'destroyer_5', 'dragon_5'] }
            ]
        },
        {   // 第25关 — 巨兽要塞
            level: 25, name: '巨兽要塞', reward: 2300,
            stages: [
                { name: '巨兽王', enemies: ['behemoth_5', 'guardian_4'] },
                { name: '巨兽+龙帝', enemies: ['behemoth_5', 'dragon_5', 'flail_3'] },
                { name: '双巨兽', enemies: ['behemoth_5', 'behemoth_5'] }
            ]
        },
        {   // 第26关 — 狙击精英
            level: 26, name: '狙击精英', reward: 2500,
            stages: [
                { name: '狙击王', enemies: ['sniper_5', 'gunfire_3'] },
                { name: '狙击+冰霜', enemies: ['sniper_5', 'frostdragon_5', 'vampire_4'] },
                { name: '双狙击', enemies: ['sniper_5', 'sniper_5'] }
            ]
        },
        {   // 第27关 — 王者争霸
            level: 27, name: '王者争霸', reward: 2800,
            stages: [
                { name: '龙帝+凤凰', enemies: ['dragon_5', 'phoenix_5', 'angel_5'] },
                { name: '刺客+狙击', enemies: ['timeassassin_5', 'sniper_5', 'vampire_4'] },
                { name: '冰龙+巨兽', enemies: ['frostdragon_5', 'behemoth_5', 'guardian_4'] }
            ]
        },
        {   // 第28关 — 毁灭之宴
            level: 28, name: '毁灭之宴', reward: 3200,
            stages: [
                { name: '毁灭+狂暴', enemies: ['destroyer_5', 'berserk_4', 'berserk_4'] },
                { name: '天使+巨兽', enemies: ['angel_5', 'behemoth_5', 'phoenix_5'] },
                { name: '全员AOE', enemies: ['destroyer_5', 'magma_4', 'frostdragon_5', 'dragon_5'] }
            ]
        },
        {   // 第29关 — 终极试炼II
            level: 29, name: '终极试炼II', reward: 3600,
            stages: [
                { name: '三狙+双刺', enemies: ['sniper_5', 'sniper_5', 'timeassassin_5', 'timeassassin_5'] },
                { name: '三龙+凤凰', enemies: ['dragon_5', 'dragon_5', 'frostdragon_5', 'phoenix_5'] },
                { name: '天使+双巨兽+毁灭', enemies: ['angel_5', 'behemoth_5', 'behemoth_5', 'destroyer_5'] }
            ]
        },
        {   // 第30关 — 最终决战
            level: 30, name: '诸神黄昏', reward: 4200,
            stages: [
                { name: '金色先锋', enemies: ['dragon_5', 'sniper_5', 'vampire_4', 'magma_4'] },
                { name: '金色禁卫', enemies: ['angel_5', 'behemoth_5', 'frostdragon_5', 'guardian_4'] },
                { name: '诸神之王', enemies: ['dragon_5', 'phoenix_5', 'timeassassin_5', 'destroyer_5'] }
            ]
        }
    ];

    // 超出15关后的随机生成
    function generateRandom(level) {
        const tpls = Object.values(GameConfig.TEMPLATES);
        // 难度随关卡递增
        const stageCount = Math.min(3, 1 + Math.floor((level - 15) / 4));
        const maxLv = Math.min(5, 1 + Math.floor((level - 15) / 2));

        const stages = [];
        for (let s = 0; s < stageCount; s++) {
            // 敌人数量：2~4，高关偏多
            const baseCount = 1 + Math.min(3, Math.floor((level - 12) / 3));
            const count = Math.min(4, baseCount + Math.floor(Math.random() * 2));
            // 选模板：随机但偏向高等级
            const pool = tpls.filter(t => t.level <= maxLv);
            const enemies = [];
            for (let i = 0; i < count; i++) {
                // 70%概率选最高等级，30%选低等级
                const t = Math.random() < 0.7
                    ? pool.filter(t => t.level === maxLv)[Math.floor(Math.random() * pool.filter(t => t.level === maxLv).length)] || pool[Math.floor(Math.random() * pool.length)]
                    : pool[Math.floor(Math.random() * pool.length)];
                enemies.push(t.id);
            }
            stages.push({
                name: `随机波次 ${s + 1}`,
                enemies
            });
        }

        return {
            level,
            name: `无尽征途 Lv.${level}`,
            reward: GameConfig.getAdventureReward(level),
            stages
        };
    }

    // 获取关卡数据（奖励统一由 GameConfig.getAdventureReward 计算）
    function getLevel(lv) {
        if (lv <= FIXED.length) {
            const entry = { ...FIXED[lv - 1] };
            entry.reward = GameConfig.getAdventureReward(lv);
            return entry;
        }
        return generateRandom(lv);
    }

    // 关卡总数（固定部分）
    function getFixedCount() { return FIXED.length; }

    return { getLevel, getFixedCount };
})();
