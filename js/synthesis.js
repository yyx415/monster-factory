window.Synthesis = (function() {
    function synthesize(monsterA, monsterB) {
        const resultId = GameConfig.findRecipe(monsterA.templateId, monsterB.templateId);
        if (!resultId) return { success: false, message: '没有匹配的合成配方' };

        const cost = GameConfig.getSynthCost(GameConfig.getTemplate(resultId).level);
        if (!GameState.spendGold(cost)) return { success: false, message: `金币不足，需要 ${cost}💰` };

        GameState.removeMonster(monsterA.uniqueId);
        GameState.removeMonster(monsterB.uniqueId);
        const newMonster = GameState.createMonster(resultId);
        GameState.addMonster(newMonster);

        return {
            success: true,
            message: `合成成功！获得 [${newMonster.name}] (Lv.${newMonster.level})`,
            monster: newMonster,
            cost: cost
        };
    }

    return { synthesize };
})();
