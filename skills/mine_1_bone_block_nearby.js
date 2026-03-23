async function mineOneBoneBlock(bot) {
  const targetBlock = bot.findBlock({
    matching: block => block.name === 'bone_block',
    maxDistance: 32
  });
  if (!targetBlock) {
    await exploreUntil('horizontal', 60, () => {
      const found = bot.findBlock({
        matching: block => block.name === 'bone_block',
        maxDistance: 32
      });
      return found;
    });
  }
  await mineBlock('bone_block', 1);
}