async function mineThreeCoalOre(bot) {
  const targetBlock = 'coal_ore';
  const count = 3;
  const coalOre = bot.findBlock({
    matching: b => b.name === targetBlock,
    maxDistance: 32
  });
  if (!coalOre) {
    await exploreUntil('south', 60, () => {
      return bot.findBlock({
        matching: b => b.name === targetBlock,
        maxDistance: 32
      });
    });
  }
  await mineBlock(targetBlock, count);
}