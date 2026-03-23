async function mineTheNearestOakLog(bot) {
  const logName = 'oak_log';
  const nearestLog = bot.findBlock({
    matching: block => block.name === logName,
    maxDistance: 32
  });
  if (!nearestLog) {
    await exploreUntil(bot, 'north', 60, () => {
      return bot.findBlock({
        matching: block => block.name === logName,
        maxDistance: 32
      });
    });
  }
  await mineBlock(logName, 1);
}