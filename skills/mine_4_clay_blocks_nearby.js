async function mineFourClayBlocks(bot) {
  const clayBlock = bot.findBlock({
    matching: block => block.name === 'clay',
    maxDistance: 32
  });
  if (!clayBlock) {
    await exploreUntil(bot, 'horizontal', 60, () => {
      return bot.findBlock({
        matching: block => block.name === 'clay',
        maxDistance: 32
      });
    });
  }
  await mineBlock(bot, 'clay', 4);
}