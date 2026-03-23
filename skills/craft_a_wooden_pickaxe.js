async function craftWoodenPickaxe(bot) {
  const existingPickaxe = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
  if (existingPickaxe) return;
  let planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
  let plankCount = planks ? planks.count : 0;
  if (plankCount < 3) {
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
  }
  let craftingTable = bot.findBlock({
    matching: block => block.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    const tableInInv = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (!tableInInv) {
      await craftItem('crafting_table', 1);
    }
    const pos = bot.entity.position.offset(1, 0, 0);
    await placeItem('crafting_table', pos.x, pos.y, pos.z);
    craftingTable = bot.findBlock({
      matching: block => block.name === 'crafting_table',
      maxDistance: 32
    });
  }
  await craftItem('wooden_pickaxe', 1);
}