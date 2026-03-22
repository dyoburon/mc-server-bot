async function mineThreeSpruceLogs(bot) {
  const targetBlock = 'spruce_log';
  const targetCount = 3;
  const item = bot.inventory.items().find(i => i.name === targetBlock);
  const currentCount = item ? item.count : 0;
  if (currentCount >= targetCount) {
    return;
  }
  let spruceLog = bot.findBlock({
    matching: b => b.name === targetBlock,
    maxDistance: 32
  });
  if (!spruceLog) {
    await exploreUntil('north', 60, () => {
      return bot.findBlock({
        matching: b => b.name === targetBlock,
        maxDistance: 32
      });
    });
  }
  await mineBlock(targetBlock, targetCount - currentCount);
}