async function mineThreeIronOreBlocks(bot) {
  const ironOreNames = ['iron_ore', 'deepslate_iron_ore'];
  const items = bot.inventory.items();
  const hasGoodPickaxe = items.some(item => ['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'].includes(item.name));
  if (!hasGoodPickaxe) {
    const cobble = items.find(i => i.name === 'cobblestone');
    const sticks = items.find(i => i.name === 'stick');
    if (!cobble || cobble.count < 3) {
      await mineBlock('stone', 3);
    }
    if (!sticks || sticks.count < 2) {
      await craftItem('stick', 1);
    }
    await craftItem('stone_pickaxe', 1);
  }
  const findOre = () => bot.findBlock({
    matching: block => ironOreNames.includes(block.name),
    maxDistance: 32
  });
  let oreBlock = findOre();
  if (!oreBlock) {
    oreBlock = await exploreUntil('south', 60, () => findOre());
  }
  if (oreBlock) {
    await mineBlock(oreBlock.name, 3);
  }
}