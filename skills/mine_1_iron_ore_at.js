async function mineOneIronOreAtTarget(bot) {
  // Check for stone pickaxe to ensure iron ore drops as an item
  const stonePickaxe = bot.inventory.items().find(i => i.name === 'stone_pickaxe');
  if (!stonePickaxe) {
    const sticks = bot.inventory.items().find(i => i.name === 'stick');
    const cobblestone = bot.inventory.items().find(i => i.name === 'cobblestone');
    if (sticks && sticks.count >= 2 && cobblestone && cobblestone.count >= 3) {
      // Crafting table known at 807, 64, 232
      await moveTo(807, 64, 232, 3, 60);
      await craftItem('stone_pickaxe', 1);
    }
  }
  const targetX = 810;
  const targetY = 42;
  const targetZ = 238;

  // Move to the target iron ore location
  await moveTo(targetX, targetY, targetZ, 3, 60);

  // Find iron ore or deepslate iron ore
  const findIron = () => bot.findBlock({
    matching: block => ['iron_ore', 'deepslate_iron_ore'].includes(block.name),
    maxDistance: 32
  });
  let targetBlock = findIron();

  // If the block is not immediately visible, explore slightly
  if (!targetBlock) {
    targetBlock = await exploreUntil('north', 30, () => findIron());
  }

  // Mine the iron ore
  if (targetBlock) {
    await mineBlock(targetBlock.name, 1);
  }
}