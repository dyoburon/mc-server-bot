async function mineOneOakLog(bot) {
  const oakLog = bot.findBlock({
    matching: b => b.name === 'oak_log',
    maxDistance: 32
  });
  if (!oakLog) {
    const Vec3 = require('vec3');
    await exploreUntil(new Vec3(1, 0, 0), 60, () => {
      return bot.findBlock({
        matching: b => b.name === 'oak_log',
        maxDistance: 32
      });
    });
  }
  await mineBlock("oak_log", 1);
}