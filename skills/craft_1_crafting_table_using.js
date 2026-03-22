async function craftOneCraftingTable(bot) {
  let tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (tableItem) return;
  let planks = bot.inventory.items().find(i => i.name === 'spruce_planks');
  if (!planks || planks.count < 4) {
    let logs = bot.inventory.items().find(i => i.name === 'spruce_log');
    if (!logs || logs.count < 1) {
      await mineBlock('spruce_log', 1);
    }
    await craftItem('spruce_planks', 1);
  }
  await craftItem('crafting_table', 1);
}