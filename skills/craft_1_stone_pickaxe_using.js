async function craftStonePickaxe(bot) {
  const existingPickaxe = bot.inventory.items().find(i => i.name === 'stone_pickaxe');
  if (existingPickaxe) return;
  const cobblestone = bot.inventory.items().find(i => i.name === 'cobblestone');
  if (!cobblestone || cobblestone.count < 3) {
    await mineBlock('stone', 3 - (cobblestone ? cobblestone.count : 0));
  }
  const sticks = bot.inventory.items().find(i => i.name === 'stick');
  if (!sticks || sticks.count < 2) {
    const planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
    if (!planks) {
      const logs = bot.inventory.items().find(i => i.name.endsWith('_log'));
      if (!logs) {
        await mineBlock('oak_log', 1);
      }
      const logToUse = bot.inventory.items().find(i => i.name.endsWith('_log'));
      await craftItem(logToUse.name.replace('_log', '_planks'), 1);
    }
    await craftItem('stick', 1);
  }
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (tableItem) {
      const pos = bot.entity.position.offset(1, 0, 0);
      await placeItem('crafting_table', pos.x, pos.y, pos.z);
      craftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
    } else {
      await craftItem('crafting_table', 1);
      const pos = bot.entity.position.offset(1, 0, 0);
      await placeItem('crafting_table', pos.x, pos.y, pos.z);
      craftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
    }
  }
  await moveTo(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 3, 10);
  await craftItem('stone_pickaxe', 1);
}