async function placeCraftingTableAndCraftFurnace(bot) {
  let craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (!craftingTable) {
    let sprucePlanks = bot.inventory.items().find(i => i.name === 'spruce_planks');
    if (!sprucePlanks || sprucePlanks.count < 4) {
      await mineBlock('spruce_log', 1);
      await craftItem('spruce_planks', 1);
    }
    await craftItem('crafting_table', 1);
  }
  const cobblestone = bot.inventory.items().find(i => i.name === 'cobblestone');
  const cobbleCount = cobblestone ? cobblestone.count : 0;
  if (cobbleCount < 8) {
    await mineBlock('cobblestone', 8 - cobbleCount);
  }
  let tableBlock = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!tableBlock) {
    const pos = bot.entity.position.offset(1, 0, 1).floored();
    await placeItem('crafting_table', pos.x, pos.y, pos.z);
    tableBlock = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
  }
  await moveTo(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 3, 10);
  await craftItem('furnace', 1);
}