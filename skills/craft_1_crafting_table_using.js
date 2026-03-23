async function craftOneCraftingTableUsingSpruce(bot) {
  const craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (craftingTable) return;
  let sprucePlanks = bot.inventory.items().find(i => i.name === 'spruce_planks');
  let plankCount = sprucePlanks ? sprucePlanks.count : 0;
  if (plankCount < 4) {
    let spruceLogs = bot.inventory.items().find(i => i.name === 'spruce_log');
    let logCount = spruceLogs ? spruceLogs.count : 0;
    if (logCount < 1) {
      await mineBlock('spruce_log', 1);
    }
    await craftItem('spruce_planks', 4);
  }
  await craftItem('crafting_table', 1);
}