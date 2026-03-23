async function mineFiveCopperOreBlocks(bot) {
  const hasStonePickaxe = bot.inventory.items().find(i => i.name === 'stone_pickaxe');
  if (!hasStonePickaxe) {
    const craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
    if (!craftingTable) {
      const tableInInventory = bot.inventory.items().find(i => i.name === 'crafting_table');
      if (tableInInventory) {
        const pos = bot.entity.position.offset(1, -1, 1);
        await placeItem('crafting_table', pos.x, pos.y + 1, pos.z);
      } else {
        await mineBlock('oak_log', 1);
        await craftItem('oak_planks', 1);
        await craftItem('crafting_table', 1);
        const pos = bot.entity.position.offset(1, -1, 1);
        await placeItem('crafting_table', pos.x, pos.y + 1, pos.z);
      }
    }
    await craftItem('stone_pickaxe', 1);
  }
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
    await mineBlock(copperBlock.name, 5);
  }
}