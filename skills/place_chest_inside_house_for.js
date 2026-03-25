async function placeChestInsideHouse(bot) {
  // Check if we have a chest in inventory
  let chestItem = bot.inventory.items().find(i => i.name === 'chest');
  if (!chestItem) {
    // Need to craft a chest - requires 8 planks
    const planksItem = bot.inventory.items().find(i => i.name.endsWith('_planks'));
    let planksCount = planksItem ? planksItem.count : 0;
    if (planksCount < 8) {
      // Need to get logs and convert to planks
      const logItem = bot.inventory.items().find(i => i.name.endsWith('_log'));
      if (!logItem) {
        await mineBlock('oak_log', 1);
      }
      const logName = bot.inventory.items().find(i => i.name.endsWith('_log')).name;
      const plankName = logName.replace('_log', '_planks');
      await craftItem(plankName, 8 - planksCount);
    }
    await craftItem('chest', 1);
  }

  // Find a good location inside the house to place the chest
  // Use crafting table location as reference: 881, 73, 223
  const targetPos = {
    x: 881,
    y: 74,
    z: 223
  };

  // Move to the target position with a range of 3 blocks
  await moveTo(targetPos.x, targetPos.y, targetPos.z, 3, 30);

  // Place the chest at the target location
  await placeItem('chest', targetPos.x, targetPos.y, targetPos.z);
}