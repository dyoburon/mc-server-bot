async function craftOneFurnace(bot) {
  const furnace = bot.inventory.items().find(i => i.name === 'furnace');
  if (furnace) return;
  const cobblestone = bot.inventory.items().find(i => i.name === 'cobblestone');
  const count = cobblestone ? cobblestone.count : 0;
  if (count < 8) {
    await mineBlock('stone', 8 - count);
  }
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (tableItem) {
      const pos = bot.entity.position.offset(1, 0, 0).floored();
      await placeItem('crafting_table', pos.x, pos.y, pos.z);
      craftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
    } else {
      const planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
      if (!planks || planks.count < 4) {
        const logs = bot.inventory.items().find(i => i.name.endsWith('_log'));
        if (logs) {
          await craftItem(logs.name.replace('_log', '_planks'), 1);
        } else {
          await mineBlock('oak_log', 1);
          await craftItem('oak_planks', 1);
        }
      }
      await craftItem('crafting_table', 1);
      const pos = bot.entity.position.offset(1, 0, 0).floored();
      await placeItem('crafting_table', pos.x, pos.y, pos.z);
      craftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
    }
  }
  await craftItem('furnace', 1);
}