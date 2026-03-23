async function findAWaterSource(bot) {
  let water = bot.findBlock({
    matching: b => b.name === 'water',
    maxDistance: 32
  });
  if (!water) {
    water = await exploreUntil({
      x: 0,
      y: 0,
      z: -1
    }, 60, () => {
      return bot.findBlock({
        matching: b => b.name === 'water',
        maxDistance: 32
      });
    });
  }
  if (water) {
    await moveTo(water.position.x, water.position.y, water.position.z, 3, 60);
  }
}