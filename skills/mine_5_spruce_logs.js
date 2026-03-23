async function mineFiveSpruceLogs(bot) {
  const targetName = 'spruce_log';
  const targetCount = 5;
  const spruceLog = bot.findBlock({
    matching: b => b.name === targetName,
    maxDistance: 32
  });
  if (!spruceLog) {
    await exploreUntil('north', 60, () => {
      return bot.findBlock({
        matching: b => b.name === targetName,
        maxDistance: 32
      });
    });
  }
  await mineBlock(targetName, targetCount);
}