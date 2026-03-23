async function mineThreeCopperOreBlocks(bot) {
  const findCopper = () => bot.findBlock({
    matching: block => ['copper_ore', 'deepslate_copper_ore'].includes(block.name),
    maxDistance: 32
  });
  let copperBlock = findCopper();
  if (!copperBlock) {
    await exploreUntil(bot, 'horizontal', 60, () => {
      const block = findCopper();
      return block ? block : null;
    });
    copperBlock = findCopper();
  }
  if (copperBlock) {
    await mineBlock(copperBlock.name, 3);
  }
}