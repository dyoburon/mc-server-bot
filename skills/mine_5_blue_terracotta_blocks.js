async function mineFiveBlueTerracottaBlocks(bot) {
  const findBlueTerracotta = () => bot.findBlock({
    matching: block => block.name === 'blue_terracotta',
    maxDistance: 32
  });
  let terracottaBlock = findBlueTerracotta();
  if (!terracottaBlock) {
    await exploreUntil(bot, 'horizontal', 60, () => {
      return findBlueTerracotta();
    });
    terracottaBlock = findBlueTerracotta();
  }
  if (terracottaBlock) {
    await mineBlock('blue_terracotta', 5);
  }
}