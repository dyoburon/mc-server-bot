async function mineOneLapisOre(bot) {
  const findLapis = () => bot.findBlock({
    matching: block => ['lapis_ore', 'deepslate_lapis_ore'].includes(block.name),
    maxDistance: 32
  });
  let lapisBlock = findLapis();
  if (!lapisBlock) {
    await exploreUntil(bot, 'horizontal', 120, () => {
      return findLapis();
    });
    lapisBlock = findLapis();
  }
  if (lapisBlock) {
    await mineBlock(lapisBlock.name, 1);
  }
}