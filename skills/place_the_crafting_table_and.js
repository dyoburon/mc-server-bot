async function placeTableAndCraftSticks(bot) {
  // 1. Ensure we have a crafting table in inventory
  let craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  if (!craftingTable) {
    // Check if we have enough planks (need 4 for crafting table)
    let sprucePlanks = bot.inventory.items().find(i => i.name === 'spruce_planks');
    if (!sprucePlanks || sprucePlanks.count < 4) {
      // If not enough spruce planks, use oak logs to get planks
      let oakLogs = bot.inventory.items().find(i => i.name === 'oak_log');
      if (oakLogs && oakLogs.count > 0) {
        await craftItem('oak_planks', 1);
      } else {
        // If no logs, mine one
        await mineBlock('oak_log', 1);
        await craftItem('oak_planks', 1);
      }
    }
    await craftItem('crafting_table', 1);
    craftingTable = bot.inventory.items().find(i => i.name === 'crafting_table');
  }

  // 2. Place the crafting table
  if (craftingTable) {
    const referenceBlock = bot.findBlock({
      matching: b => ['grass_block', 'dirt', 'stone', 'sand'].includes(b.name),
      maxDistance: 32
    });
    if (referenceBlock) {
      const targetPos = referenceBlock.position.offset(0, 1, 0);
      // Move within range to place the item
      await moveTo(targetPos.x, targetPos.y, targetPos.z, 3);
      await placeItem('crafting_table', targetPos.x, targetPos.y, targetPos.z);
    }
  }

  // 3. Craft 4 sticks (1 recipe set)
  // Check if we have enough planks (need 2 for 4 sticks)
  let planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
  if (!planks || planks.count < 2) {
    let oakLogs = bot.inventory.items().find(i => i.name === 'oak_log');
    if (oakLogs && oakLogs.count > 0) {
      await craftItem('oak_planks', 1);
    }
  }
  await craftItem('stick', 1);
}