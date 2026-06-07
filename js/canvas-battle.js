// Canvas 战斗模块 — 全屏实时战斗渲染
window.CanvasBattle = (function() {
    // ========== 常量 ==========
    const MELEE_RANGE = 5;       // 近战接敌距离(px) — 几乎贴脸
    const MID_RANGE = 100;       // 中程攻击距离
    const RANGED_RANGE = 200;    // 远程攻击距离
    const MOVE_SPEED = 100;      // 移动速度(px/s)
    const PROJECTILE_SPEED = 420;// 弹丸速度
    const HP_BAR_W = 70;         // 血条宽度
    const HP_BAR_H = 8;          // 血条高度

    // 图片缓存：key=路径, value=Image对象
    const unitImages = new Map();

    // 品质颜色映射
    const QUALITY_COLORS = { green: '#4caf50', blue: '#2196f3', purple: '#9c27b0', gold: '#ffd700' };
    const KNOCKBACK_LIGHT = 30;  // 轻微击退
    const KNOCKBACK_NORMAL = 70; // 普通击退
    const KNOCKBACK_HEAVY = 110; // 大幅击退
    const KNOCKBACK_DUR = 0.25;  // 击退视觉回收时间(s)

    // 根据特性/射程/自定义值获取击退距离
    function getKnockbackDist(traits, range, custom) {
        if (custom > 0) return custom; // 模板自定义优先
        if (traits.some(t => t.includes('大幅击退'))) return KNOCKBACK_HEAVY;
        if (traits.some(t => t === '击退' || t === '击退效果')) return KNOCKBACK_NORMAL;
        if (traits.some(t => t.includes('轻微击退'))) {
            if (range === 'ranged') return 10;
            return KNOCKBACK_LIGHT;
        }
        return 0;
    }

    // ========== 音效系统 ==========
    let audioCtx = null;

    // 初始化AudioContext（需要用户交互后调用）
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    // 播放短促音效
    function playSound(type) {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        switch (type) {
            case 'attack':  // 短"嗒"声 — 低频方波
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
                break;

            case 'crit':    // 高频"锵"声
                osc.type = 'square';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(300, t + 0.06);
                gain.gain.setValueAtTime(0.15, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                osc.start(t); osc.stop(t + 0.15);
                // 第二层泛音
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2); gain2.connect(audioCtx.destination);
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(900, t);
                osc2.frequency.exponentialRampToValueAtTime(450, t + 0.08);
                gain2.gain.setValueAtTime(0.08, t);
                gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
                osc2.start(t); osc2.stop(t + 0.12);
                break;

            case 'heal':    // 柔和上升琶音
                osc.type = 'sine';
                osc.frequency.setValueAtTime(260, t);
                osc.frequency.linearRampToValueAtTime(520, t + 0.2);
                osc.frequency.linearRampToValueAtTime(780, t + 0.4);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t); osc.stop(t + 0.5);
                break;

            case 'death':   // 低沉"砰"
                osc.type = 'sine';
                osc.frequency.setValueAtTime(100, t);
                osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.start(t); osc.stop(t + 0.35);
                break;

            case 'victory': // 胜利短旋律
                [0, 0.15, 0.3].forEach((delay, i) => {
                    const o = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    o.connect(g); g.connect(audioCtx.destination);
                    o.type = 'square';
                    const notes = [523, 659, 784]; // C5 E5 G5
                    o.frequency.setValueAtTime(notes[i], t + delay);
                    g.gain.setValueAtTime(0.12, t + delay);
                    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);
                    o.start(t + delay); o.stop(t + delay + 0.2);
                });
                break;

            case 'defeat':  // 失败旋律(下行)
                [0, 0.2, 0.4].forEach((delay, i) => {
                    const o = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    o.connect(g); g.connect(audioCtx.destination);
                    o.type = 'triangle';
                    const notes = [300, 200, 120];
                    o.frequency.setValueAtTime(notes[i], t + delay);
                    g.gain.setValueAtTime(0.1, t + delay);
                    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.3);
                    o.start(t + delay); o.stop(t + delay + 0.3);
                });
                break;
        }
    }

    // ========== 战斗单位类 ==========
    class BattleUnit {
        constructor(data, x, y, isEnemy) {
            this.uniqueId = data.uniqueId;
            this.name = data.name;
            this.emoji = data.emoji;
            this.image = data.image || null;  // 怪物贴图路径
            this.range = data.range;
            this.health = data.health;
            this.maxHealth = data.maxHealth;
            this.attack = data.attack;
            this.speed = data.speed;        // 攻击间隔(秒)
            this.regen = data.regen || 0;
            this.critRate = data.critRate || 0;
            this.critDmg = data.critDmg || 2.0;
            this.healAmount = data.healAmount || 0;
            this.traits = data.traits || [];
            this.burstCount = data.burstCount || 1; // 连发数（1=单发）
            this.poisonRange = data.poisonRange || 0; // 毒液线段长度
            this.knockback = data.knockback || 0;     // 自定义击退距离
            // 新机制
            this.splash = data.splash || 0;           // 溅射范围(px)
            this.splashPct = data.splashPct || 0;      // 溅射伤害比例
            this.lifesteal = data.lifesteal || 0;      // 吸血比例
            this.poisonDmg = data.poisonDmg || 0;      // 中毒每秒伤害
            this.poisonDur = data.poisonDur || 0;      // 中毒持续秒数
            this.berserk = data.berserk || 0;          // 狂暴系数(每1%HP损失%)
            this.thorns = data.thorns || 0;            // 反伤比例
            this.rebirth = data.rebirth || 0;          // 涅槃回血量(一次性)
            this.rebirthUsed = false;                  // 涅槃是否已触发
            this.slowPct = data.slowPct || 0;          // 减速倍率
            this.slowDur = data.slowDur || 0;          // 减速持续秒
            this.explodeDmg = data.explodeDmg || 0;    // 自爆伤害
            this.explodeRange = data.explodeRange || 0; // 自爆范围
            this.tenacity = data.tenacity || 0;        // 坚韧减伤比例
            this.tenacityThreshold = data.tenacityThreshold || 0; // 坚韧触发血量比例
            this.healDmgPct = data.healDmgPct || 0;    // 治疗时对敌伤害比例
            // 补充可能被遗漏的字段
            this.level = data.level || 1;
            this.color = data.color || 'green';
            // 运行时状态
            this.poisonStacks = [];    // 中毒层数 [{dmg, dur}]
            this.slowTimer = 0;        // 减速剩余秒数
            this.speedMult = 1;        // 攻速倍率
            this.isEnemy = isEnemy;

            // 位置
            this.x = x;
            this.y = y;
            this.startX = x;    // 初始x（治疗单位不主动前移）
            this.baseY = y;     // 基准y（lane）

            // 战斗状态
            this.alive = true;
            this.attackTimer = Math.random() * 0.5; // 随机初始偏移
            this.target = null;
            this.wasInRange = false;    // 上一帧是否在射程内

            // 视觉效果
            this.flashTimer = 0;       // 受击闪烁计时
            this.flashColor = '#ffffff'; // 闪烁颜色
            this.knockbackDist = 0;    // 击退距离（无特性不击退）
            this.knockbackX = 0;       // 击退偏移
            this.knockbackTimer = 0;
            this.lungeX = 0;           // 近战前冲
            this.lungeTimer = 0;
            this.atkFlashTimer = 0;     // 攻击前摇闪光
            this.regenAccumulator = 0;  // 回血累积计时器
            this.deathTimer = 0;       // 死亡淡出
            this.scale = 1;            // 用于呼吸/动画
        }

        // 寻找最近活着的敌人（1D：纯水平距离）
        findTarget(enemies) {
            let closest = null;
            let minDist = Infinity;
            for (const e of enemies) {
                if (!e.alive) continue;
                const dist = Math.abs(this.x - e.x);
                if (dist < minDist) { minDist = dist; closest = e; }
            }
            this.target = closest;
            return closest;
        }

        // 根据range获取攻击距离
        getAttackRange() {
            if (this.range === 'melee') return MELEE_RANGE;
            if (this.range === 'mid') return MID_RANGE;
            if (this.range === 'ranged') return RANGED_RANGE;
            return 0; // heal 不需要攻击距离
        }

        // 是否在攻击范围内（1D纯水平）
        inRangeOf(target) {
            if (!target || this.range === 'heal') return true;
            return Math.abs(this.x - target.x) <= this.getAttackRange() + 8;
        }

        // 获取弹丸视觉风格
        getProjectileStyle() {
            if (this.range === 'heal') return { style: 'heal', color: '#ffdd44', glow: '#ffdd00' };
            if (this.range === 'mid' && this.poisonRange > 0) return { style: 'poison', color: '#44cc22', glow: '#44ff44' };
            if (this.poisonDmg > 0) return { style: 'poison', color: '#66dd44', glow: '#66ff66' };
            if (this.slowPct > 0) return { style: 'ice', color: '#88ccff', glow: '#88ddff' };
            if (this.splash > 0) return { style: 'fire', color: '#ff6600', glow: '#ff4400' };
            if (this.lifesteal > 0) return { style: 'fire', color: '#ff4444', glow: '#ff0000' };
            if (this.attack >= 60) return { style: 'blunt', color: '#ffcc88', glow: '#ffaa44' }; // 高攻击=钝器感
            if (this.name === '龙帝' || this.name === '凤凰神') return { style: 'fire', color: '#ff8800', glow: '#ff4400' };
            return { style: 'default', color: '#ffcc00', glow: '#ff8800' };
        }

        // 更新移动
        updateMovement(enemies, delta) {
            if (!this.alive) return;
            if (this.range === 'heal') {
                // 治疗单位不主动前移，但会随阵线微调
                return;
            }

            // 找到目标
            if (!this.target || !this.target.alive) {
                this.findTarget(enemies);
            }
            if (!this.target) return;

            // 如果在攻击范围内则停止
            if (this.inRangeOf(this.target)) {
                this.wasInRange = true;
                return;
            }
            this.wasInRange = false;

            // 纯1D：仅在X轴移动
            const dx = this.target.x - this.x;
            if (Math.abs(dx) < 0.1) return;
            let newX = this.x + Math.sign(dx) * MOVE_SPEED * delta;

            // 不能穿越敌方单位——找移动方向上最近的敌人，停在其外侧
            const BLOCK_GAP = 10;
            for (const e of enemies) {
                if (!e.alive) continue;
                if (dx > 0) {
                    // 向右移动，不能越过右边的敌人
                    if (e.x > this.x && newX > e.x - BLOCK_GAP) {
                        newX = Math.min(newX, e.x - BLOCK_GAP);
                    }
                } else {
                    // 向左移动，不能越过左边的敌人
                    if (e.x < this.x && newX < e.x + BLOCK_GAP) {
                        newX = Math.max(newX, e.x + BLOCK_GAP);
                    }
                }
            }
            this.x = newX;
        }

        // 更新计时器和效果
        update(delta, allies, enemies) {
            if (!this.alive) {
                this.deathTimer += delta;
                // 涅槃：死亡时一次性触发
                if (this.rebirth > 0 && !this.rebirthUsed && this.deathTimer < 0.05) {
                    const friendlies = this.isEnemy ? enemies : allies;
                    friendlies.forEach(f => {
                        if (f.alive) f.health = Math.min(f.maxHealth, f.health + this.rebirth);
                    });
                    this.rebirthUsed = true;
                }
                return;
            }

            // 回血 — 每秒离散触发
            if (this.regen > 0 && this.health < this.maxHealth) {
                this.regenAccumulator += delta;
                if (this.regenAccumulator >= 1.0) {
                    const ticks = Math.floor(this.regenAccumulator);
                    this.health = Math.min(this.maxHealth, this.health + this.regen * ticks);
                    this.regenAccumulator -= ticks;
                    this._regenTick = true;  // 标记触发，供主循环显示数字
                }
            }

            // 受击闪烁衰减
            if (this.flashTimer > 0) this.flashTimer -= delta;
            // 攻击闪光衰减
            if (this.atkFlashTimer > 0) this.atkFlashTimer -= delta;

            // 击退衰减
            if (this.knockbackTimer > 0) {
                this.knockbackTimer -= delta;
                const progress = 1 - (this.knockbackTimer / KNOCKBACK_DUR);
                // easeOutCubic
                const eased = 1 - Math.pow(1 - progress, 3);
                this.knockbackX = (1 - eased) * (this.isEnemy ? this.knockbackDist : -this.knockbackDist);
                if (this.knockbackTimer <= 0) this.knockbackX = 0;
            }

            // 近战前冲衰减
            if (this.lungeTimer > 0) {
                this.lungeTimer -= delta;
                const progress = this.lungeTimer / 0.15; // 0.15s前冲时间
                if (progress > 0.5) {
                    // 前半段：冲出
                    this.lungeX = (1 - (progress - 0.5) * 2) * 20 * (this.isEnemy ? -1 : 1);
                } else {
                    // 后半段：收回
                    this.lungeX = progress * 2 * 20 * (this.isEnemy ? -1 : 1);
                }
                if (this.lungeTimer <= 0) this.lungeX = 0;
            }

            // 中毒DOT
            for (let i = this.poisonStacks.length - 1; i >= 0; i--) {
                const ps = this.poisonStacks[i];
                this.health -= ps.dmg * delta;
                this._poisonTick = (this._poisonTick || 0) + ps.dmg * delta;
                ps.dur -= delta;
                if (ps.dur <= 0) this.poisonStacks.splice(i, 1);
            }
            if (this.health <= 0 && this.alive) {
                this.health = 0; this.alive = false; this.deathTimer = 0; playSound('death');
            }
            // 减速衰减
            if (this.slowTimer > 0) {
                this.slowTimer -= delta;
                if (this.slowTimer <= 0) this.speedMult = 1;
            }

            // 呼吸效果（轻微缩放）
            this.scale = 1 + Math.sin(Date.now() / 1000 * 2) * 0.02;
        }

        // 执行攻击
        performAttack(targets, friendlies) {
            if (!this.alive) return null;

            // 治疗型：治疗全体友方
            if (this.range === 'heal') {
                const healAmt = this.healAmount || this.attack;
                const isCrit = Math.random() < this.critRate;
                const finalHeal = isCrit ? Math.floor(healAmt * this.critDmg) : healAmt;
                const aliveFriends = friendlies.filter(t => t.alive);
                const results = [];
                aliveFriends.forEach(f => {
                    f.health = Math.min(f.maxHealth, f.health + finalHeal);
                    // 圣天使：治疗同时对敌方全体造成伤害
                    if (this.healDmgPct > 0) {
                        const enemies = targets.filter(t => t.alive && t.isEnemy !== this.isEnemy);
                        const healDmg = Math.floor(finalHeal * this.healDmgPct);
                        enemies.forEach(e => {
                            e.health -= healDmg;
                            e.flashTimer = 0.08;
                            results.push({
                                type: 'healDmg',
                                target: e,
                                amount: healDmg,
                                x: e.x,
                                y: e.y - 20
                            });
                        });
                    }
                    results.push({
                        type: 'heal',
                        attacker: this,
                        target: f,
                        amount: finalHeal,
                        x: f.x,
                        y: f.y - 20,
                        isCrit
                    });
                });
                playSound('heal');
                this.lungeTimer = 0.15; // 微动表示施法
                return results;
            }

            // 选择目标
            const liveTargets = targets.filter(t => t.alive && t.isEnemy !== this.isEnemy);
            if (liveTargets.length === 0) return null;

            // 优先攻击当前目标（如果还活着且在范围内）
            let target = this.target;
            if (!target || !target.alive || !this.inRangeOf(target)) {
                // 当前目标无效或超出射程 → 重新寻找最近敌人
                target = this.findTarget(liveTargets);
            }
            if (!target) {
                target = liveTargets[0];
            }

            // 不在射程内 → 不能攻击，等移动到范围内
            if (!this.inRangeOf(target)) return null;

            let dmg = this.attack;
            let isCrit = Math.random() < this.critRate;
            if (isCrit) dmg = Math.floor(dmg * this.critDmg);

            // 狂暴：残血增伤
            if (this.berserk > 0) {
                const hpRatio = this.health / this.maxHealth;
                const multiplier = 1 + (1 - hpRatio) * 100 * this.berserk / 100;
                dmg = Math.floor(dmg * multiplier);
            }

            // 毒液线段攻击：1D纯水平线段
            if (this.poisonRange > 0) {
                const dirX = target.x > this.x ? 1 : -1;
                const startY = this.y - 10;
                playSound(isCrit ? 'crit' : 'attack');
                this.lungeTimer = 0.12;
                return [{
                    type: 'lineAOE',
                    attacker: this,
                    startX: this.x, startY,
                    endX: this.x + dirX * this.poisonRange, endY: startY,
                    damage: dmg, isCrit,
                    knockbackDist: getKnockbackDist(this.traits, this.range, this.knockback)
                }];
            }

            const isPierce = this.traits.some(t => t.includes('穿透'));

            if (this.range !== 'melee' && this.burstCount > 1) {
                // 连发：多发弹丸沿水平直线，首尾相接
                const results = [];
                const dirX = target.x > this.x ? 1 : -1;
                const fromY = this.y - 10;
                for (let i = 0; i < this.burstCount; i++) {
                    results.push({
                        type: 'projectile',
                        attacker: this, target, damage: dmg, isCrit,
                        x: target.x, y: target.y - 20,
                        isPierce,
                        fromX: this.x + dirX * i * 14,
                        fromY,
                        burstIndex: i,
                        burstTotal: this.burstCount
                    });
                }
                playSound(isCrit ? 'crit' : 'attack');
                return results;
            }

            const results = [{
                type: this.range === 'melee' ? 'melee' : 'projectile',
                attacker: this, target, damage: dmg, isCrit,
                x: target.x, y: target.y - 20,
                isPierce: isPierce
            }];

            // 近战前冲动画
            if (this.range === 'melee') {
                this.lungeTimer = 0.15;
            }

            if (isCrit) {
                playSound('crit');
            } else {
                playSound('attack');
            }

            return results;
        }

        // 受到伤害；返回实际伤害（用于反伤/吸血）
        takeDamage(dmg, attacker) {
            if (!this.alive) return 0;
            // 坚韧：低血量减伤
            if (this.tenacity > 0 && this.health / this.maxHealth < this.tenacityThreshold) {
                dmg = Math.floor(dmg * (1 - this.tenacity));
            }
            // 反伤
            if (attacker && this.thorns > 0 && attacker.alive) {
                const reflect = Math.floor(dmg * this.thorns);
                if (reflect > 0) {
                    attacker.health -= reflect;
                    attacker.flashTimer = 0.1;
                    attacker.flashColor = '#ff8800';
                }
            }
            this.health -= dmg;
            this.flashTimer = 0.1;
            this.flashColor = '#ffffff';
            if (this.health <= 0) {
                this.health = 0;
                this.alive = false;
                this.deathTimer = 0;
                playSound('death');
                // 自爆
                if (this.explodeDmg > 0) return this.explodeDmg;
            }
            return dmg;
        }

        // 受到击退
        applyKnockback(fromX, dist, canvasW) {
            if (!dist || dist <= 0) return;
            const dir = this.x > fromX ? 1 : -1;
            this.x += dir * dist;
            // 仅限制不超出画布边界
            if (this.isEnemy) {
                this.x = Math.min(canvasW - 5, this.x);
            } else {
                this.x = Math.max(5, this.x);
            }
            // 保留微小的视觉回弹动画
            this.knockbackDist = dist * 0.15;
            this.knockbackTimer = KNOCKBACK_DUR;
        }

        // 绘制怪物
        render(ctx, canvasW, canvasH) {
            if (!this.alive && this.deathTimer > 0.8) return; // 死亡0.8s后消失

            const drawX = this.x + this.knockbackX + this.lungeX;
            const drawY = this.y;
            let alpha = 1;
            if (!this.alive) {
                alpha = Math.max(0, 1 - this.deathTimer / 0.8);
                if (alpha <= 0) return;
            }

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(drawX, drawY);
            ctx.scale(this.scale, this.scale);

            // 受击闪烁
            if (this.flashTimer > 0) {
                let r = 255, g = 255, b = 255;
                const hex = this.flashColor;
                if (hex && hex[0] === '#' && hex.length === 7) {
                    r = parseInt(hex.slice(1,3), 16);
                    g = parseInt(hex.slice(3,5), 16);
                    b = parseInt(hex.slice(5,7), 16);
                }
                ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
                ctx.beginPath();
                ctx.arc(0, 0, 32, 0, Math.PI * 2);
                ctx.fill();
            }

            // 攻击前摇闪光 — 白色短暂亮起
            if (this.atkFlashTimer > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.arc(0, 0, 28, 0, Math.PI * 2);
                ctx.fill();
            }

            // 品质光环底框
            const qColor = QUALITY_COLORS[this.color] || '#4caf50';
            const baseColor = this.isEnemy ? 'rgba(255,80,80,0.10)' : 'rgba(80,160,255,0.10)';
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = qColor;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.7;
            ctx.stroke();
            ctx.globalAlpha = alpha;

            // 怪物阴影
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 24, 24, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // 怪物身体 — 优先贴图，降级用emoji
            const img = unitImages.get(this.image);
            if (img && img.complete && img.naturalWidth > 0) {
                const imgSize = 52;
                ctx.save();
                ctx.beginPath();
                ctx.arc(0, 0, 26, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
                ctx.restore();
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = '44px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.emoji, 0, 0);
            }

            // 死亡特效
            if (!this.alive) {
                ctx.strokeStyle = 'rgba(255,100,100,0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 30 + this.deathTimer * 15, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();

            // 血条（在怪物上方，不受scale影响）
            if (this.alive || this.deathTimer < 0.4) {
                this.renderHealthBar(ctx, drawX, drawY - 42);
            }

            // 状态效果叠加层
            // 减速 — 冰蓝色描边
            if (this.slowTimer > 0) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = '#88ddff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(drawX, drawY, 28, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            // 中毒 — 绿色毒泡
            if (this.poisonStacks && this.poisonStacks.length > 0) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#44ff44';
                for (let pi = 0; pi < 3; pi++) {
                    const bx = drawX + Math.sin(performance.now() * 0.003 + pi * 2.1) * 14;
                    const by = drawY - 32 + Math.cos(performance.now() * 0.004 + pi * 1.7) * 8;
                    ctx.beginPath();
                    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            // 狂战士 — 红色蒸汽
            if (this.berserk > 0 && this.alive && this.health / this.maxHealth < 0.7) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff4444';
                for (let bi = 0; bi < 4; bi++) {
                    const bx = drawX + Math.sin(performance.now() * 0.005 + bi * 1.5) * 18;
                    const by = drawY - 28 - Math.abs(Math.cos(performance.now() * 0.006 + bi)) * 15;
                    ctx.beginPath();
                    ctx.arc(bx, by, 2 + Math.random(), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            // 名字（品质色）
            if (this.alive) {
                ctx.save();
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = qColor;
                ctx.font = 'bold 13px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(this.name, drawX, drawY + 40);
                ctx.restore();
            }
        }

        // 绘制血条（增强版）
        renderHealthBar(ctx, x, y) {
            const hpRatio = Math.max(0, this.health / this.maxHealth);
            const barX = x - HP_BAR_W / 2;

            // 背景
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(barX, y, HP_BAR_W, HP_BAR_H);

            // 阵营底色：己方绿、敌方红，低血量偏橙
            let barColor;
            if (this.isEnemy) {
                barColor = hpRatio > 0.5 ? '#e53935' : `rgb(255,${Math.floor(150*hpRatio*2)},0)`;
            } else {
                barColor = hpRatio > 0.5 ? '#43a047' : `rgb(255,${Math.floor(180*hpRatio*2)},0)`;
            }
            ctx.fillStyle = barColor;
            ctx.fillRect(barX, y, HP_BAR_W * hpRatio, HP_BAR_H);

            // 中毒闪烁：血条框变绿脉冲
            if (this.poisonStacks.length > 0) {
                const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.5;
                ctx.strokeStyle = `rgba(160,255,96,${0.6 + pulse * 0.4})`;
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            }
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, y, HP_BAR_W, HP_BAR_H);

            // 受击高亮
            if (this.flashTimer > 0 && this.alive) {
                ctx.fillStyle = `rgba(255,255,255,${this.flashTimer * 5})`;
                ctx.fillRect(barX, y, HP_BAR_W, HP_BAR_H);
            }

            // HP数字
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(Math.floor(this.health) + '/' + this.maxHealth, x, y + HP_BAR_H + 12);
        }
    }

    // ========== 伤害数字类 ==========
    class DamageNumber {
        constructor(x, y, text, color, isCrit) {
            this.x = x + (Math.random() - 0.5) * 20; // 随机水平偏移
            this.y = y;
            this.text = text;
            this.color = color;
            this.isCrit = isCrit;
            this.life = 1.0;       // 1秒寿命
            this.maxLife = 1.0;
            this.vy = -40;          // 向上飘速度(px/s)
            this.shakeAmp = isCrit ? 3 : 0;
        }

        update(delta) {
            this.life -= delta;
            this.y += this.vy * delta;
            if (this.isCrit && this.shakeAmp > 0) {
                this.x += (Math.random() - 0.5) * this.shakeAmp * 2;
                this.shakeAmp *= 0.9;
            }
        }

        render(ctx) {
            const alpha = Math.max(0, this.life / this.maxLife);
            const progress = 1 - alpha;
            const yOff = progress * 10; // 轻微上浮

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.font = this.isCrit ? 'bold 18px monospace' : '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y + yOff);

            // 暴击描边
            if (this.isCrit) {
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeText(this.text, this.x, this.y + yOff);
            }
            ctx.restore();
        }
    }

    // ========== 弹丸类 ==========
    class Projectile {
        constructor(fromX, fromY, toX, toY, dmg, isCrit, isPierce) {
            this.x = fromX;
            this.y = fromY;
            const dx = toX - fromX;
            const dy = toY - fromY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.vx = (dx / dist) * PROJECTILE_SPEED;
            this.vy = (dy / dist) * PROJECTILE_SPEED;
            this.targetX = toX;
            this.targetY = toY;
            this.damage = dmg;
            this.isCrit = isCrit;
            this.isPierce = isPierce;
            this.knockbackDist = 30;
            this.splash = 0; this.splashPct = 0; this.lifesteal = 0;
            this.poisonDmg = 0; this.poisonDur = 0;
            this.slowPct = 0; this.slowDur = 0;
            this.alive = true;
            this.hitTargets = [];
            this.attacker = null; // 保存发射者引用，用于吸血回血
            this.style = 'default'; // mech/fire/poison/ice/heal/blunt
            this.pColor = '#ffcc00'; // 主色
            this.pGlow = '#ff8800';  // 光晕色
        }

        update(delta) {
            this.x += this.vx * delta;
            this.y += this.vy * delta;
        }

        render(ctx) {
            const r = this.isCrit ? 4.5 : 3;
            // 拖尾
            ctx.save();
            if (this.style === 'fire') {
                // 火球：多层不规则拖尾
                for (let i = 0; i < 3; i++) {
                    const ta = 0.3 - i * 0.08;
                    ctx.fillStyle = `rgba(255,${80 + i * 60},0,${ta})`;
                    ctx.beginPath();
                    ctx.arc(this.x - this.vx * (0.015 + i * 0.01), this.y - this.vy * (0.015 + i * 0.01), r + i * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = this.isCrit ? '#ff2200' : '#ff6600';
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 10;
            } else if (this.style === 'poison') {
                ctx.fillStyle = 'rgba(100,255,100,0.3)';
                ctx.beginPath();
                ctx.arc(this.x - this.vx * 0.02, this.y - this.vy * 0.02, r + 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = this.isCrit ? '#88ff44' : '#44cc22';
                ctx.shadowColor = '#44ff44';
                ctx.shadowBlur = 8;
            } else if (this.style === 'ice') {
                ctx.fillStyle = 'rgba(150,220,255,0.4)';
                ctx.beginPath();
                ctx.arc(this.x - this.vx * 0.015, this.y - this.vy * 0.015, r + 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = this.isCrit ? '#ccffff' : '#88ccff';
                ctx.shadowColor = '#88ddff';
                ctx.shadowBlur = 8;
            } else if (this.style === 'heal') {
                ctx.fillStyle = 'rgba(255,215,0,0.25)';
                ctx.beginPath();
                ctx.arc(this.x - this.vx * 0.01, this.y - this.vy * 0.01, r + 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffdd44';
                ctx.shadowColor = '#ffdd00';
                ctx.shadowBlur = 12;
            } else if (this.style === 'blunt') {
                // 冲击波短脉冲
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * 0.03, this.y - this.vy * 0.03);
                ctx.stroke();
                ctx.fillStyle = '#ffcc88';
                ctx.shadowColor = '#ffaa44';
                ctx.shadowBlur = 6;
            } else {
                // 默认金色齿轮弹丸
                ctx.fillStyle = this.isCrit ? '#ff4444' : this.pColor;
                ctx.shadowColor = this.isCrit ? '#ff0000' : this.pGlow;
                ctx.shadowBlur = 6;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 拖尾线
            ctx.strokeStyle = this.isCrit ? 'rgba(255,100,100,0.5)' : 'rgba(255,200,100,0.4)';
            ctx.lineWidth = this.isCrit ? 2.5 : 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 0.025, this.y - this.vy * 0.025);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ========== 命中粒子 ==========
    class HitParticle {
        constructor(x, y, count, color, spread) {
            this.particles = [];
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 60 + Math.random() * (spread || 80);
                this.particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 30,
                    life: 0.25 + Math.random() * 0.35,
                    maxLife: 0.6,
                    size: 1.5 + Math.random() * 3
                });
            }
            this.color = color;
            this.life = 0.6;
        }
        update(delta) {
            this.life -= delta;
            this.particles.forEach(p => {
                p.life -= delta;
                p.x += p.vx * delta;
                p.y += p.vy * delta;
                p.vy += 120 * delta; // gravity
            });
        }
        render(ctx) {
            const alpha = Math.max(0, this.life / 0.6);
            this.particles.forEach(p => {
                if (p.life <= 0) return;
                const pa = Math.min(alpha, p.life / p.maxLife);
                ctx.fillStyle = this.color.replace('1)', pa + ')').replace('rgb', 'rgba');
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * pa, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    // ========== 近战斩击弧线 ==========
    class MeleeSlash {
        constructor(fromX, fromY, toX, toY, color, isCrit) {
            this.fromX = fromX;
            this.fromY = fromY;
            this.toX = toX;
            this.toY = toY;
            this.color = color || '#ffffff';
            this.isCrit = isCrit || false;
            this.life = 0.25;
            this.maxLife = 0.25;
        }
        update(delta) {
            this.life -= delta;
        }
        render(ctx) {
            if (this.life <= 0) return;
            const alpha = this.life / this.maxLife;
            const progress = 1 - alpha;
            // 弧线从攻击者划向目标
            const mx = (this.fromX + this.toX) / 2;
            const my = (this.fromY + this.toY) / 2 - 30 * (1 - progress);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.isCrit ? 4 : 2.5;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.isCrit ? 12 : 6;
            ctx.beginPath();
            ctx.moveTo(this.fromX, this.fromY);
            ctx.quadraticCurveTo(mx, my, this.toX, this.toY);
            ctx.stroke();
            // 第二条更细的亮线
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha * 0.7;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // ========== 冲击波圆环（溅射用） ==========
    class ShockwaveRing {
        constructor(x, y, color, maxRadius) {
            this.x = x;
            this.y = y;
            this.color = color || '#ff8800';
            this.maxRadius = maxRadius || 50;
            this.radius = 5;
            this.life = 0.4;
            this.maxLife = 0.4;
        }
        update(delta) {
            this.life -= delta;
            const progress = 1 - (this.life / this.maxLife);
            this.radius = 5 + (this.maxRadius - 5) * progress;
        }
        render(ctx) {
            if (this.life <= 0) return;
            const alpha = this.life / this.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3 * alpha;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        }
    }

    // ========== 战斗事件日志 ==========
    class BattleEvent {
        constructor(text, color, icon) {
            this.text = text;
            this.color = color;
            this.icon = icon || '';
            this.life = 2.5;
            this.maxLife = 2.5;
        }
        update(delta) { this.life -= delta; }
    }

    // ========== 主战斗函数 ==========
    function startBattle(team, enemies, mode, callbacks) {
        initAudio();

        // 创建全屏Canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'battle-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:200;background:#1a1a1a;';
        document.body.appendChild(canvas);

        // 隐藏游戏UI元素
        const topBar = document.getElementById('top-bar');
        const tabBar = document.getElementById('tab-bar');
        const mainGame = document.getElementById('main-game');
        if (topBar) topBar.style.display = 'none';
        if (tabBar) tabBar.style.display = 'none';

        const ctx = canvas.getContext('2d');

        // Canvas尺寸适配
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resizeCanvas, 150);
        });

        // ===== 创建战斗单位 =====
        const allies = [];
        const enemiesList = [];

        // 按range排前后：近战在前，治疗在后
        function getRangePriority(range) {
            return { melee: 0, mid: 1, ranged: 2, heal: 3 }[range] || 2;
        }

        // 纯1D战场：所有怪物在同一水平线
        function calcBattleY() {
            return canvas.height * 0.55;
        }

        const validAllies = team.filter(m => m);
        const validEnemies = enemies.filter(m => m);

        // 友方保持队伍槽位顺序（slot0=前排, slot3=后排）
        // 敌方按前后排排序
        const sortedEnemies = [...validEnemies].sort((a, b) =>
            getRangePriority(a.range) - getRangePriority(b.range)
        );

        // 友方X: slot0=最后排(左), slot3=最前排(右靠近中线)
        validAllies.forEach((m, i) => {
            const t = validAllies.length <= 1 ? 0.5 : i / (validAllies.length - 1);
            const x = canvas.width * 0.06 + t * canvas.width * 0.20;
            const unit = new BattleUnit(
                { uniqueId: m.uniqueId || 'a_' + i, name: m.name, emoji: m.emoji, image: m.image,
                  range: m.range, health: m.health || m.stats?.health || 100,
                  maxHealth: m.maxHealth || m.stats?.maxHealth || m.stats?.health || 100,
                  attack: m.attack || m.stats?.attack || 10,
                  speed: m.speed || m.stats?.speed || 1.0,
                  regen: m.regen || m.stats?.regen || 0,
                  critRate: m.critRate || 0, critDmg: m.critDmg || 2.0,
                  healAmount: m.healAmount || 0, traits: m.traits || [], burstCount: m.burstCount || 1, poisonRange: m.poisonRange || 0, knockback: m.knockback || 0, splash: m.splash || 0, splashPct: m.splashPct || 0, lifesteal: m.lifesteal || 0, poisonDmg: m.poisonDmg || 0, poisonDur: m.poisonDur || 0, berserk: m.berserk || 0, thorns: m.thorns || 0, rebirth: m.rebirth || 0, slowPct: m.slowPct || 0, slowDur: m.slowDur || 0, explodeDmg: m.explodeDmg || 0, explodeRange: m.explodeRange || 0, tenacity: m.tenacity || 0, tenacityThreshold: m.tenacityThreshold || 0, healDmgPct: m.healDmgPct || 0 },
                x, calcBattleY(i, validAllies.length), false
            );
            allies.push(unit);
        });

        // 敌方X: 近战(index=0)最靠左(接近中间)，治疗(index=末)最靠右(后方)
        sortedEnemies.forEach((m, i) => {
            const t = sortedEnemies.length <= 1 ? 0.5 : i / (sortedEnemies.length - 1);
            const x = canvas.width * 0.74 + t * canvas.width * 0.20;
            const unit = new BattleUnit(
                { uniqueId: m.uniqueId || 'e_' + i, name: m.name, emoji: m.emoji, image: m.image,
                  range: m.range, health: m.health || m.stats?.health || 100,
                  maxHealth: m.maxHealth || m.stats?.maxHealth || m.stats?.health || 100,
                  attack: m.attack || m.stats?.attack || 10,
                  speed: m.speed || m.stats?.speed || 1.0,
                  regen: m.regen || m.stats?.regen || 0,
                  critRate: m.critRate || 0, critDmg: m.critDmg || 2.0,
                  healAmount: m.healAmount || 0, traits: m.traits || [], burstCount: m.burstCount || 1, poisonRange: m.poisonRange || 0, knockback: m.knockback || 0, splash: m.splash || 0, splashPct: m.splashPct || 0, lifesteal: m.lifesteal || 0, poisonDmg: m.poisonDmg || 0, poisonDur: m.poisonDur || 0, berserk: m.berserk || 0, thorns: m.thorns || 0, rebirth: m.rebirth || 0, slowPct: m.slowPct || 0, slowDur: m.slowDur || 0, explodeDmg: m.explodeDmg || 0, explodeRange: m.explodeRange || 0, tenacity: m.tenacity || 0, tenacityThreshold: m.tenacityThreshold || 0, healDmgPct: m.healDmgPct || 0 },
                x, calcBattleY(i, sortedEnemies.length), true
            );
            enemiesList.push(unit);
        });

        const allUnits = [...allies, ...enemiesList];

        // 预加载怪物贴图
        allUnits.forEach(u => {
            if (u.image && !unitImages.has(u.image)) {
                const img = new Image();
                img.src = u.image;
                unitImages.set(u.image, img);
            }
        });

        const damageNumbers = [];
        const projectiles = [];
        const battleEvents = [];
        const hitParticles = [];     // 命中粒子
        const meleeSlashes = [];     // 近战斩击弧线
        const shockwaves = [];       // 冲击波圆环

        // ===== 战斗状态机 =====
        // countdown → fighting → victory | defeat → done
        let battleState = 'countdown';
        let countdownValue = 3;
        let countdownTimer = 0;
        let countdownScale = 1;
        let fightShowTimer = 0;  // "FIGHT!"显示计时
        let battleTime = 0;
        let shakeAmount = 0;
        let shakeDuration = 0;
        let victoryOverlayAlpha = 0;

        // 点到线段的最短距离
        function distToSegment(px, py, ax, ay, bx, by) {
            const dx = bx - ax, dy = by - ay;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
            let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const nearX = ax + t * dx, nearY = ay + t * dy;
            return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
        }

        // 毒液线段视觉特效
        const poisonLines = [];

        // ===== 处理攻击结果 =====
        function processAttackResults(results) {
            if (!results) return;
            results.forEach(r => {
                if (r.type === 'heal') {
                    damageNumbers.push(new DamageNumber(
                        r.x, r.y,
                        '+' + r.amount,
                        '#4caf50',
                        false
                    ));
                    r.target.flashTimer = 0.2;
                    r.target.flashColor = '#4caf50';
                    battleEvents.push(new BattleEvent(
                        r.attacker.name + ' 治愈 +' + r.amount,
                        '#4caf50', 'HEAL'
                    ));
                } else if (r.type === 'healDmg') {
                    damageNumbers.push(new DamageNumber(r.x, r.y, '-' + r.amount, '#ffdd00', false));
                } else if (r.type === 'lineAOE') {
                    // 毒液线段：线段上的敌方单位全吃伤害+击退（仅命中敌方，不误伤友军）
                    const hitTargets = r.attacker.isEnemy ? allies : enemiesList;
                    hitTargets.forEach(t => {
                        if (!t.alive) return;
                        if (t.isEnemy === r.attacker.isEnemy) return; // 不攻击同阵营
                        const d = distToSegment(t.x, t.y - 10, r.startX, r.startY, r.endX, r.endY);
                        if (d < 35) {
                            if (r.attacker.poisonDmg > 0) t.poisonStacks.push({ dmg: r.attacker.poisonDmg, dur: r.attacker.poisonDur });
                            if (r.attacker.slowPct > 0) { t.slowTimer = r.attacker.slowDur; t.speedMult = r.attacker.slowPct; }
                            t.takeDamage(r.damage);
                            t.applyKnockback(r.attacker.x, r.knockbackDist, canvas.width);
                            damageNumbers.push(new DamageNumber(
                                t.x, t.y - 20,
                                '-' + r.damage,
                                r.isCrit ? '#ff4444' : '#a0ff60',
                                r.isCrit
                            ));
                            const evtText = r.isCrit
                                ? r.attacker.name + ' 毒暴 ' + t.name + ' -' + r.damage
                                : r.attacker.name + ' 毒击 ' + t.name + ' -' + r.damage;
                            battleEvents.push(new BattleEvent(evtText, '#a0ff60', 'POISON'));
                            if (r.isCrit) {
                                shakeAmount = Math.max(shakeAmount, 4);
                                shakeDuration = 0.3;
                            }
                        }
                    });
                    // 视觉特效：存储线段 0.3s
                    poisonLines.push({
                        ax: r.startX, ay: r.startY,
                        bx: r.endX, by: r.endY,
                        life: 0.3,
                        isCrit: r.isCrit
                    });
                } else if (r.type === 'melee') {
                    const at = r.attacker;
                    // 攻击前摇闪光
                    at.atkFlashTimer = 0.08;
                    // 近战斩击弧线
                    meleeSlashes.push(new MeleeSlash(at.x, at.y - 10, r.target.x, r.target.y - 10, '#ffffff', r.isCrit));
                    // 命中粒子
                    hitParticles.push(new HitParticle(r.target.x, r.target.y - 10, r.isCrit ? 6 : 3, r.isCrit ? 'rgb(255,100,50)' : 'rgb(255,200,150)', r.isCrit ? 100 : 60));
                    // 吸血
                    if (at.lifesteal > 0) {
                        const heal = Math.floor(r.damage * at.lifesteal);
                        at.health = Math.min(at.maxHealth, at.health + heal);
                    }
                    // 中毒
                    if (at.poisonDmg > 0) {
                        r.target.poisonStacks.push({ dmg: at.poisonDmg, dur: at.poisonDur });
                    }
                    // 减速
                    if (at.slowPct > 0) {
                        r.target.slowTimer = at.slowDur;
                        r.target.speedMult = at.slowPct;
                    }
                    r.target.takeDamage(r.damage, at);
                    damageNumbers.push(new DamageNumber(
                        r.x, r.y,
                        '-' + r.damage,
                        r.isCrit ? '#ff4444' : '#ffffff',
                        r.isCrit
                    ));
                    const meleeEvt = r.isCrit
                        ? at.name + ' 暴击 ' + r.target.name + ' -' + r.damage
                        : at.name + ' 攻击 ' + r.target.name + ' -' + r.damage;
                    battleEvents.push(new BattleEvent(meleeEvt, r.isCrit ? '#ff4444' : '#ffffff', 'ATK'));
                    if (r.isCrit) { shakeAmount = Math.max(shakeAmount, 4); shakeDuration = 0.3; }
                    if (!r.target.alive) {
                        battleEvents.push(new BattleEvent(r.target.name + ' 阵亡', '#ff6666', 'DEATH'));
                    }
                    r.target.applyKnockback(at.x, getKnockbackDist(at.traits, at.range, at.knockback), canvas.width);
                    // 溅射
                    if (at.splash > 0) {
                        shockwaves.push(new ShockwaveRing(r.target.x, r.target.y - 10, '#ff8800', at.splash));
                        const opposite = at.isEnemy ? allies : enemiesList;
                        opposite.forEach(u => {
                            if (!u.alive || u === r.target) return;
                            if (Math.abs(u.x - r.target.x) < at.splash) {
                                const sd = Math.floor(r.damage * at.splashPct);
                                u.takeDamage(sd, at);
                                damageNumbers.push(new DamageNumber(u.x, u.y - 20, '-' + sd, '#ff6600', false));
                                u.applyKnockback(at.x, getKnockbackDist(at.traits, at.range, at.knockback), canvas.width);
                            }
                        });
                    }
                } else if (r.type === 'projectile') {
                    // 远程：生成弹丸
                    const attacker = r.attacker;
                    const p = new Projectile(
                        r.fromX || attacker.x,
                        r.fromY || attacker.y - 10,
                        r.target.x, r.target.y - 10,
                        r.damage, r.isCrit, r.isPierce
                    );
                    p.knockbackDist = getKnockbackDist(attacker.traits, attacker.range, attacker.knockback);
                    p.splash = attacker.splash; p.splashPct = attacker.splashPct;
                    p.lifesteal = attacker.lifesteal;
                    p.poisonDmg = attacker.poisonDmg; p.poisonDur = attacker.poisonDur;
                    p.slowPct = attacker.slowPct; p.slowDur = attacker.slowDur;
                    p.attacker = attacker;
                    const ps = attacker.getProjectileStyle();
                    p.style = ps.style; p.pColor = ps.color; p.pGlow = ps.glow;
                    projectiles.push(p);
                    // 攻击前摇闪光
                    attacker.atkFlashTimer = 0.08;
                }
            });
        }

        // ===== 更新弹丸命中 =====
        function updateProjectiles(delta) {
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const p = projectiles[i];
                p.update(delta);

                // 检查命中
                const targets = p.vx > 0 ? enemiesList : allies;
                let hit = false;
                for (const t of targets) {
                    if (!t.alive) continue;
                    if (p.hitTargets.includes(t.uniqueId)) continue;
                    const dx = p.x - t.x;
                    const dy = p.y - (t.y - 10);
                    if (Math.sqrt(dx * dx + dy * dy) < 35) {
                        // 中毒/减速
                        if (p.poisonDmg > 0) t.poisonStacks.push({ dmg: p.poisonDmg, dur: p.poisonDur });
                        if (p.slowPct > 0) { t.slowTimer = p.slowDur; t.speedMult = p.slowPct; }
                        // 吸血：弹丸命中时通过 p.attacker 引用回血
                        const actualDmg = t.takeDamage(p.damage, p.attacker);
                        if (p.lifesteal > 0 && p.attacker && p.attacker.alive) {
                            const heal = Math.floor(actualDmg * p.lifesteal);
                            if (heal > 0) {
                                p.attacker.health = Math.min(p.attacker.maxHealth, p.attacker.health + heal);
                                damageNumbers.push(new DamageNumber(p.attacker.x, p.attacker.y - 20, '+' + heal, '#4caf50', false));
                            }
                        }
                        damageNumbers.push(new DamageNumber(
                            t.x, t.y - 20,
                            '-' + p.damage,
                            p.isCrit ? '#ff4444' : '#ffffff',
                            p.isCrit
                        ));
                        if (!t.alive) {
                            battleEvents.push(new BattleEvent(t.name + ' 阵亡', '#ff6666', 'DEATH'));
                        }
                        t.flashTimer = 0.1;
                        // 命中粒子
                        hitParticles.push(new HitParticle(t.x, t.y - 10, p.isCrit ? 5 : 2, p.isCrit ? 'rgb(255,100,50)' : 'rgb(255,200,150)', p.isCrit ? 90 : 50));
                        t.applyKnockback(p.attacker.x, p.knockbackDist, canvas.width);
                        if (p.isCrit) { shakeAmount = Math.max(shakeAmount, 4); shakeDuration = 0.3; }
                        // 溅射
                        if (p.splash > 0) {
                            shockwaves.push(new ShockwaveRing(t.x, t.y - 10, '#ff6600', p.splash));
                            const opp = p.vx > 0 ? enemiesList : allies;
                            opp.forEach(u => {
                                if (!u.alive || u === t) return;
                                if (Math.abs(u.x - t.x) < p.splash) {
                                    const sd = Math.floor(p.damage * p.splashPct);
                                    u.takeDamage(sd);
                                    damageNumbers.push(new DamageNumber(u.x, u.y - 20, '-' + sd, '#ff6600', false));
                                    u.applyKnockback(p.attacker.x, p.knockbackDist, canvas.width);
                                }
                            });
                        }
                        p.hitTargets.push(t.uniqueId);
                        if (!p.isPierce) { hit = true; break; }
                    }
                }

                // 出界或命中后移除
                if (hit || p.x < -50 || p.x > canvas.width + 50 ||
                    p.y < -50 || p.y > canvas.height + 50) {
                    projectiles.splice(i, 1);
                }
            }
        }

        // ===== 主循环 =====
        // ===== 渲染HUD =====
        function renderHUD(ctx, w) {
            const info = callbacks.getHudInfo ? callbacks.getHudInfo() : { mode: '战斗', reward: '', stage: '' };
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, w, 38);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(0, 38, w, 1);
            ctx.fillStyle = '#ff8c00';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(info.mode, 16, 26);
            if (info.stage) {
                ctx.fillStyle = '#888';
                ctx.font = '11px monospace';
                ctx.fillText(info.stage, 16, 38);
            }
            if (info.reward) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '13px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(info.reward, w / 2, 26);
            }
            const mins = Math.floor(battleTime / 60);
            const secs = Math.floor(battleTime % 60);
            ctx.fillStyle = '#aaa';
            ctx.font = '13px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(mins + ':' + String(secs).padStart(2, '0'), w - 16, 26);
        }

        function renderEvents(ctx, w, h) {
            const groundY = h * 0.78;
            const startY = groundY + 10;
            const visible = battleEvents.filter(e => e.life > 0).slice(-3);
            visible.forEach((e, i) => {
                const alpha = Math.min(1, e.life / e.maxLife);
                ctx.save();
                ctx.globalAlpha = alpha * 0.9;
                ctx.fillStyle = e.color;
                ctx.font = '11px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(e.text, 16, startY + i * 16);
                ctx.restore();
            });
        }

        let lastTime = performance.now();

        function gameLoop(timestamp) {
            let delta = (timestamp - lastTime) / 1000;
            lastTime = timestamp;
            // 防止大帧跳跃
            if (delta > 0.1) delta = 0.1;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 屏幕抖动
            let shakeX = 0, shakeY = 0;
            if (shakeDuration > 0) {
                shakeDuration -= delta;
                shakeAmount *= 0.85;
                shakeX = (Math.random() - 0.5) * shakeAmount * 2;
                shakeY = (Math.random() - 0.5) * shakeAmount * 2;
                if (shakeDuration <= 0) { shakeAmount = 0; shakeDuration = 0; }
            }

            ctx.save();
            ctx.translate(shakeX, shakeY);

            // 背景
            drawBackground(ctx, canvas.width, canvas.height);

            // HUD（非倒计时阶段）
            if (battleState !== 'countdown') {
                renderHUD(ctx, canvas.width);
            }

            if (battleState === 'countdown') {
                countdownTimer += delta;
                if (countdownTimer >= 1.0) {
                    countdownTimer = 0;
                    countdownValue--;
                    countdownScale = 2.0;
                    if (countdownValue < 0) {
                        fightShowTimer = 0.8;
                        battleState = 'fighting';
                    }
                }
                countdownScale += (1 - countdownScale) * 0.12;
                if (countdownValue >= 0) {
                    const numText = countdownValue === 0 ? 'GO!' : String(countdownValue);
                    const size = Math.floor(72 * countdownScale);
                    // 光晕背景
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                    // 数字
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.font = 'bold ' + size + 'px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(numText, canvas.width / 2, canvas.height / 2);
                    // 外环
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, canvas.height / 2, size * 0.95, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (battleState === 'fighting') {
                // FIGHT文字：两半裂开消失
                if (fightShowTimer > 0) {
                    fightShowTimer -= delta;
                    const progress = 1 - fightShowTimer / 0.8;
                    const alpha = Math.min(1, fightShowTimer / 0.25);
                    const splitX = progress * 80;
                    const scale = 1 + progress * 0.4;
                    const size = Math.floor(48 * scale);
                    ctx.font = 'bold ' + size + 'px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const cx = canvas.width / 2;
                    const cy = canvas.height / 2;
                    // 左半 "FIG"
                    ctx.save();
                    ctx.fillStyle = 'rgba(255,140,0,' + alpha + ')';
                    ctx.beginPath();
                    ctx.rect(0, cy - 60, cx, 120);
                    ctx.clip();
                    ctx.fillText('FIGHT!', cx - splitX, cy);
                    ctx.restore();
                    // 右半 "HT!"
                    ctx.save();
                    ctx.fillStyle = 'rgba(255,200,60,' + alpha + ')';
                    ctx.beginPath();
                    ctx.rect(cx, cy - 60, canvas.width, 120);
                    ctx.clip();
                    ctx.fillText('FIGHT!', cx + splitX, cy);
                    ctx.restore();
                }
                battleTime += delta;

                // 更新所有单位
                allUnits.forEach(unit => {
                    if (unit.alive) {
                        unit.updateMovement(unit.isEnemy ? allies : enemiesList, delta);
                    }
                    unit.update(delta, allies, enemiesList);
                    // 中毒伤害数字（每秒弹一次总DPS）
                    if (unit._poisonTick > 0) {
                        unit._poisonShowTimer = (unit._poisonShowTimer || 0) + delta;
                        if (unit._poisonShowTimer >= 1.0) {
                            const totalDPS = unit.poisonStacks.reduce((s, ps) => s + ps.dmg, 0);
                            damageNumbers.push(new DamageNumber(unit.x, unit.y - 30, '☠-' + totalDPS, '#a0ff60', false));
                            unit._poisonShowTimer = 0;
                        }
                        unit._poisonTick = 0;
                    }
                    // 回血数字（每秒触发时显示）
                    if (unit._regenTick) {
                        damageNumbers.push(new DamageNumber(unit.x, unit.y - 30, '+' + unit.regen, '#4caf50', false));
                        unit._regenTick = false;
                    }
                });

                // 攻击判定
                allUnits.forEach(unit => {
                    if (!unit.alive) return;
                    unit.attackTimer += delta;
                    const effectiveSpeed = unit.speed * unit.speedMult;
                    if (unit.attackTimer >= effectiveSpeed) {
                        unit.attackTimer -= effectiveSpeed;
                        const results = unit.performAttack(
                            unit.isEnemy ? allies : enemiesList,
                            unit.isEnemy ? enemiesList : allies
                        );
                        processAttackResults(results);
                    }
                });

                // 弹丸更新
                updateProjectiles(delta);

                // 伤害数字更新
                for (let i = damageNumbers.length - 1; i >= 0; i--) {
                    damageNumbers[i].update(delta);
                    if (damageNumbers[i].life <= 0) {
                        damageNumbers.splice(i, 1);
                    }
                }

                // 事件日志更新
                for (let i = battleEvents.length - 1; i >= 0; i--) {
                    battleEvents[i].update(delta);
                    if (battleEvents[i].life <= 0) battleEvents.splice(i, 1);
                }

                // 毒液线段淡出
                for (let i = poisonLines.length - 1; i >= 0; i--) {
                    poisonLines[i].life -= delta;
                    if (poisonLines[i].life <= 0) poisonLines.splice(i, 1);
                }

                // 命中粒子更新
                for (let i = hitParticles.length - 1; i >= 0; i--) {
                    hitParticles[i].update(delta);
                    if (hitParticles[i].life <= 0) hitParticles.splice(i, 1);
                }

                // 近战斩击更新
                for (let i = meleeSlashes.length - 1; i >= 0; i--) {
                    meleeSlashes[i].update(delta);
                    if (meleeSlashes[i].life <= 0) meleeSlashes.splice(i, 1);
                }

                // 冲击波更新
                for (let i = shockwaves.length - 1; i >= 0; i--) {
                    shockwaves[i].update(delta);
                    if (shockwaves[i].life <= 0) shockwaves.splice(i, 1);
                }

                // 自爆检查
                allUnits.forEach(u => {
                    if (!u.alive && u.explodeDmg > 0 && u.deathTimer < 0.02) {
                        // 爆炸视觉特效
                        hitParticles.push(new HitParticle(u.x, u.y - 10, 12, 'rgb(255,80,20)', 150));
                        shockwaves.push(new ShockwaveRing(u.x, u.y - 10, '#ff4400', u.explodeRange));
                        shakeAmount = Math.max(shakeAmount, 8);
                        shakeDuration = 0.4;
                        const opp = u.isEnemy ? allies : enemiesList;
                        opp.forEach(t => {
                            if (!t.alive) return;
                            if (Math.abs(t.x - u.x) < u.explodeRange) {
                                t.takeDamage(u.explodeDmg);
                                damageNumbers.push(new DamageNumber(t.x, t.y - 20, '-' + u.explodeDmg, '#ff4400', true));
                                u.explodeDmg = 0; // 只爆一次
                            }
                        });
                    }
                });

                // 检查胜负
                const alliesAlive = allies.some(u => u.alive);
                const enemiesAlive = enemiesList.some(u => u.alive);
                if (!alliesAlive || !enemiesAlive) {
                    battleState = alliesAlive ? 'victory' : 'defeat';
                    victoryOverlayAlpha = 0;
                    if (alliesAlive) {
                        playSound('victory');
                    } else {
                        playSound('defeat');
                    }
                }
            }

            // 渲染所有单位
            // 先画后排（治疗、远程），再画前排（近战），让前排在上面
            const sortedAllies = [...allies].sort((a, b) => {
                const order = { heal: 0, ranged: 1, mid: 2, melee: 3 };
                return (order[a.range] || 2) - (order[b.range] || 2);
            });
            const sortedEnemies = [...enemiesList].sort((a, b) => {
                const order = { heal: 0, ranged: 1, mid: 2, melee: 3 };
                return (order[a.range] || 2) - (order[b.range] || 2);
            });

            sortedAllies.forEach(u => u.render(ctx, canvas.width, canvas.height));
            sortedEnemies.forEach(u => u.render(ctx, canvas.width, canvas.height));

            // 渲染弹丸
            projectiles.forEach(p => p.render(ctx));

            // 渲染近战斩击弧线
            meleeSlashes.forEach(s => s.render(ctx));

            // 渲染命中粒子
            hitParticles.forEach(hp => hp.render(ctx));

            // 渲染冲击波
            shockwaves.forEach(sw => sw.render(ctx));

            // 渲染毒液线段
            poisonLines.forEach(pl => {
                const alpha = pl.life / 0.3;
                ctx.strokeStyle = pl.isCrit
                    ? `rgba(200,255,100,${alpha})`
                    : `rgba(100,200,60,${alpha})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = pl.isCrit
                    ? `rgba(200,255,100,${alpha * 0.8})`
                    : `rgba(100,200,60,${alpha * 0.8})`;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.moveTo(pl.ax, pl.ay);
                ctx.lineTo(pl.bx, pl.by);
                ctx.stroke();
                ctx.shadowBlur = 0;
            });

            // 渲染伤害数字
            damageNumbers.forEach(dn => dn.render(ctx));

            ctx.restore();

            // 渲染事件日志（不受shake影响）
            renderEvents(ctx, canvas.width, canvas.height);

            // 胜利/失败叠加层（不受shake影响）
            if (battleState === 'victory' || battleState === 'defeat') {
                victoryOverlayAlpha = Math.min(1, victoryOverlayAlpha + delta * 1.5);

                ctx.fillStyle = `rgba(0,0,0,${victoryOverlayAlpha * 0.6})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const isWin = battleState === 'victory';
                const mainText = isWin ? '胜利!' : '失败...';
                const subText = isWin
                    ? (mode === 'adventure' || mode === 'free' ? '点击任意处返回' : '点击继续下一波')
                    : '点击任意处返回';

                ctx.fillStyle = isWin ? '#ff6f00' : '#ff4444';
                ctx.font = 'bold 48px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.globalAlpha = victoryOverlayAlpha;
                ctx.fillText(mainText, canvas.width / 2, canvas.height / 2 - 20);

                ctx.fillStyle = '#cccccc';
                ctx.font = '16px monospace';
                ctx.fillText(subText, canvas.width / 2, canvas.height / 2 + 30);

                // 奖励信息
                if (isWin && callbacks.getRewardText) {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = '18px monospace';
                    ctx.fillText(callbacks.getRewardText(), canvas.width / 2, canvas.height / 2 + 60);
                }

                ctx.globalAlpha = 1;
            }

            // 继续循环
            if (battleState === 'victory' || battleState === 'defeat') {
                // 等待点击
                if (!canvas._clickHandler) {
                    canvas._clickHandler = (e) => {
                        cleanup();
                        const result = {
                            playerWin: battleState === 'victory',
                            survivingAllies: allies.filter(u => u.alive).map(u => ({
                                uniqueId: u.uniqueId,
                                name: u.name, emoji: u.emoji, image: u.image, range: u.range,
                                level: u.level || 1, color: u.color || 'green',
                                health: Math.floor(u.health), maxHealth: u.maxHealth,
                                attack: u.attack, speed: u.speed,
                                regen: u.regen, critRate: u.critRate, critDmg: u.critDmg,
                                healAmount: u.healAmount, traits: u.traits,
                                burstCount: u.burstCount || 1,
                                poisonRange: u.poisonRange || 0,
                                knockback: u.knockback || 0,
                                splash: u.splash || 0, splashPct: u.splashPct || 0,
                                lifesteal: u.lifesteal || 0,
                                poisonDmg: u.poisonDmg || 0, poisonDur: u.poisonDur || 0,
                                berserk: u.berserk || 0,
                                thorns: u.thorns || 0,
                                rebirth: u.rebirth || 0,
                                slowPct: u.slowPct || 0, slowDur: u.slowDur || 0,
                                explodeDmg: u.explodeDmg || 0, explodeRange: u.explodeRange || 0,
                                tenacity: u.tenacity || 0, tenacityThreshold: u.tenacityThreshold || 0,
                                healDmgPct: u.healDmgPct || 0
                            }))
                        };
                        if (callbacks.onComplete) callbacks.onComplete(result);
                    };
                    canvas.addEventListener('click', canvas._clickHandler);
                }
                requestAnimationFrame(gameLoop); // 继续渲染叠加层动画
            } else {
                requestAnimationFrame(gameLoop);
            }
        }

        // 绘制背景（分层版）
        function drawBackground(ctx, w, h) {
            // 天空渐变
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
            skyGrad.addColorStop(0, '#1a1c2e');
            skyGrad.addColorStop(0.4, '#1e2940');
            skyGrad.addColorStop(0.8, '#2a3a50');
            skyGrad.addColorStop(1, '#1e2e3e');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h);

            // 远景山脉剪影
            ctx.fillStyle = '#161e2a';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.75);
            for (let i = 0; i <= 8; i++) {
                const mx = w * i / 8;
                const my = h * 0.72 - Math.sin(i * 1.3) * h * 0.06 - Math.cos(i * 2.7) * h * 0.04;
                ctx.lineTo(mx, my);
            }
            ctx.lineTo(w, h * 0.78);
            ctx.lineTo(0, h * 0.78);
            ctx.closePath();
            ctx.fill();

            // 中景建筑群（方块剪影）
            ctx.fillStyle = '#1a2330';
            const buildings = [
                [0.02, 0.68, 0.08, 0.04], [0.12, 0.65, 0.06, 0.07],
                [0.22, 0.67, 0.07, 0.05], [0.32, 0.64, 0.09, 0.08],
                [0.45, 0.66, 0.06, 0.06], [0.56, 0.63, 0.08, 0.09],
                [0.68, 0.67, 0.07, 0.05], [0.78, 0.65, 0.06, 0.07],
                [0.88, 0.68, 0.09, 0.04]
            ];
            buildings.forEach(([bx, by, bw, bh]) => {
                ctx.fillRect(w * bx, h * by, w * bw, h * bh);
            });

            // 地面区域
            const groundY = h * 0.78;
            ctx.fillStyle = '#1a222e';
            ctx.fillRect(0, groundY, w, h - groundY);

            // 地面纹理线
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let gy = groundY; gy < h; gy += 14) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
            }
            // 竖线模拟地砖
            ctx.strokeStyle = 'rgba(255,255,255,0.025)';
            for (let gx = 30; gx < w; gx += 40) {
                ctx.beginPath();
                ctx.moveTo(gx, groundY);
                ctx.lineTo(gx, h);
                ctx.stroke();
            }

            // 中线（虚线战场分界，悬空）
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 25]);
            ctx.beginPath();
            ctx.moveTo(w / 2, h * 0.18);
            ctx.lineTo(w / 2, groundY - 10);
            ctx.stroke();
            ctx.setLineDash([]);

            // 地面高光线
            ctx.strokeStyle = 'rgba(255,140,0,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.stroke();

            // 浮动粒子
            const t = Date.now() / 1000;
            for (let i = 0; i < 20; i++) {
                const px = (i * 137 + 53) % w;
                const py = (i * 97 + 30) % (h * 0.6) + h * 0.06;
                const alpha = 0.08 + Math.sin(t * 0.7 + i) * 0.04;
                ctx.fillStyle = `rgba(200,180,140,${alpha})`;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 清理
        function cleanup() {
            window.removeEventListener('resize', resizeCanvas);
            if (canvas._clickHandler) {
                canvas.removeEventListener('click', canvas._clickHandler);
            }
            document.body.removeChild(canvas);
            if (topBar) topBar.style.display = '';
            if (tabBar) tabBar.style.display = '';
            if (mainGame) mainGame.style.display = '';
        }

        // 启动循环
        requestAnimationFrame(gameLoop);
    }

    return { startBattle };
})();
