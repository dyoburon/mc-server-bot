async function mineThreeIronOreBlocks(bot) {
  // Ensure we have a stone pickaxe to successfully collect iron ore drops
  const hasStonePickaxe = bot.inventory.items().find(i => i.name === 'stone_pickaxe');
  if (!hasStonePickaxe) {
    // craftItem handles finding or placing a crafting table if needed
    await craftItem('stone_pickaxe', 1);
  }

  // Define a helper to locate iron ore or deepslate iron ore
  const findIron = () => bot.findBlock({
    matching: block => ['iron_ore', 'deepslate_iron_ore'].includes(block.name),
    maxDistance: 32
  });

  // Check for nearby iron ore
  let targetBlock = findIron();

  // If no iron ore is found nearby, explore the area
  if (!targetBlock) {
    targetBlock = await exploreUntil('south', 60, () => findIron());
  }

  // If iron ore is located, mine 3 blocks
  if (targetBlock) {
    await mineBlock(targetBlock.name, 3);
  }
}