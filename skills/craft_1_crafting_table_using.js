async function craftCraftingTableFromSprucePlanks(bot) {
  const craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (craftingTable) return;
  let sprucePlanks = bot.inventory.items().find(i => i.name === 'spruce_planks');
  if (!sprucePlanks || sprucePlanks.count < 4) {
    let spruceLog = bot.inventory.items().find(i => i.name === 'spruce_log');
    if (!spruceLog) {
      await mineBlock('spruce_log', 1);
    }
    await craftItem('spruce_planks', 1);
  }
  await craftItem('crafting_table', 1);
}