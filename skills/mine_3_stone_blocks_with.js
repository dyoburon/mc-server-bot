async function mineThreeStoneBlocks(bot) {
  const woodenPickaxe = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
  if (woodenPickaxe) {
    await bot.equip(woodenPickaxe, 'hand');
  }
  const stone = bot.findBlock({
    matching: b => b.name === 'stone',
    maxDistance: 32
  });
  if (!stone) {
    await exploreUntil('north', 60, () => {
      return bot.findBlock({
        matching: b => b.name === 'stone',
        maxDistance: 32
      });
    });
  }
  await mineBlock('stone', 3);
}