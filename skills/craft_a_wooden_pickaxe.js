async function craftWoodenPickaxe(bot) {
  const woodenPickaxe = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
  if (woodenPickaxe) return;
  let planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
  if (!planks || planks.count < 3) {
    let log = bot.inventory.items().find(i => i.name.endsWith('_log'));
    if (!log) {
      await mineBlock('oak_log', 1);
      log = bot.inventory.items().find(i => i.name.endsWith('_log'));
    }
    await craftItem(log.name.replace('_log', '_planks'), 1);
    planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
  }
  let sticks = bot.inventory.items().find(i => i.name === 'stick');
  if (!sticks || sticks.count < 2) {
    await craftItem('stick', 1);
    sticks = bot.inventory.items().find(i => i.name === 'stick');
  }
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    const tableItem = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (!tableItem) {
      await craftItem('crafting_table', 1);
    }
    const pos = bot.entity.position.floored().offset(1, 0, 0);
    await placeItem('crafting_table', pos.x, pos.y, pos.z);
    craftingTable = bot.findBlock({
      matching: b => b.name === 'crafting_table',
      maxDistance: 32
    });
  }
  await craftItem('wooden_pickaxe', 1);
}