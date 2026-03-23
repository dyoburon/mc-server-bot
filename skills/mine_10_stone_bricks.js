async function mineTenStoneBricks(bot) {
  const targetBlock = 'stone_bricks';
  const count = 10;
  const findBricks = () => bot.findBlock({
    matching: b => b.name === targetBlock,
    maxDistance: 32
  });
  let bricks = findBricks();
  if (!bricks) {
    // Try exploring in a different direction (south) for a longer duration
    await exploreUntil(bot, 'south', 120, () => {
      return findBricks();
    });
  }

  // Double check if we found any before attempting to mine
  bricks = findBricks();
  if (bricks) {
    await mineBlock(targetBlock, count);
  }
}