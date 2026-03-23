async function craftOneCraftingTableFromOakPlanks(bot) {
  const existingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (existingTable) {
    return;
  }
  let oakPlanks = bot.inventory.items().find(i => i.name === 'oak_planks');
  let plankCount = oakPlanks ? oakPlanks.count : 0;
  if (plankCount < 4) {
    let oakLog = bot.inventory.items().find(i => i.name === 'oak_log');
    if (!oakLog) {
      await mineBlock('oak_log', 1);
    }
    await craftItem('oak_planks', 1);
  }
  await craftItem('crafting_table', 1);
}