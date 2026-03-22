async function mineOneSpruceLog(bot) {
  const targetBlock = 'spruce_log';
  const count = 1;
  const spruceLog = bot.findBlock({
    matching: b => b.name === targetBlock,
    maxDistance: 32
  });
  if (!spruceLog) {
    await exploreUntil({
      x: 1,
      y: 0,
      z: 0
    }, 60, () => {
      return bot.findBlock({
        matching: b => b.name === targetBlock,
        maxDistance: 32
      });
    });
  }
  await mineBlock(targetBlock, count);
}