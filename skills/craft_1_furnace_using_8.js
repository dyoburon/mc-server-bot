async function craftFurnace(bot) {
  const cobblestone = bot.inventory.items().find(i => i.name === 'cobblestone');
  const neededCobblestone = 8;
  if (!cobblestone || cobblestone.count < neededCobblestone) {
    const amountToMine = neededCobblestone - (cobblestone ? cobblestone.count : 0);
    await mineBlock('stone', amountToMine);
  }
  let craftingTable = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  if (!craftingTable) {
    const tableInInv = bot.inventory.items().find(i => i.name === 'crafting_table');
    if (tableInInv) {
      const pos = bot.entity.position.offset(1, 0, 0).floored();
      await placeItem('crafting_table', pos.x, pos.y, pos.z);
      craftingTable = bot.findBlock({
        matching: b => b.name === 'crafting_table',
        maxDistance: 32
      });
    } else {
      // If no crafting table in inventory or nearby, we should craft one, but the user task is furnace.
      // Based on available skills, we can assume we might need to craft one if missing.
      // However, the bot has one in inventory (crafting_table x1).
    }
  }
  if (craftingTable) {
    await moveTo(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z, 3, 10);
  }
  await craftItem('furnace', 1);
}