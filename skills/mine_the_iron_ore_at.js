async function mineIronOreAtTarget(bot) {
  const targetX = 810;
  const targetY = 42;
  const targetZ = 237;

  // Move to the specified iron ore location
  await moveTo(targetX, targetY, targetZ, 3, 60);

  // Helper function to find iron ore or deepslate iron ore nearby
  const findIron = () => bot.findBlock({
    matching: block => ['iron_ore', 'deepslate_iron_ore'].includes(block.name),
    maxDistance: 32
  });
  let targetBlock = findIron();

  // If the block is not immediately visible, explore the area to find it
  if (!targetBlock) {
    targetBlock = await exploreUntil('north', 30, () => findIron());
  }

  // If we found iron ore, mine it
  if (targetBlock) {
    await mineBlock(targetBlock.name, 1);
  }
}