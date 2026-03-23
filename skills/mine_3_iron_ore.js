async function mineThreeIronOre(bot) {
  const ironOreNames = ['iron_ore', 'deepslate_iron_ore'];
  const inventoryItems = bot.inventory.items();
  const hasGoodPickaxe = inventoryItems.some(item => ['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'].includes(item.name));
  if (!hasGoodPickaxe) {
    const sticks = inventoryItems.find(i => i.name === 'stick');
    if (!sticks || sticks.count < 2) {
      await craftItem('stick', 1);
    }
    await craftItem('stone_pickaxe', 1);
  }
  let targetOre = bot.findBlock({
    matching: block => ironOreNames.includes(block.name),
    maxDistance: 32
  });
  if (!targetOre) {
    await exploreUntil('south', 60, () => {
      return bot.findBlock({
        matching: block => ironOreNames.includes(block.name),
        maxDistance: 32
      });
    });
    targetOre = bot.findBlock({
      matching: block => ironOreNames.includes(block.name),
      maxDistance: 32
    });
  }
  if (targetOre) {
    await mineBlock(targetOre.name, 3);
  }
}