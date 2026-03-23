async function craftTwelveSprucePlanksAtTable(bot) {
  const tablePos = {
    x: 807,
    y: 64,
    z: 232
  };

  // 1. Check if we already have enough spruce logs (3 logs = 12 planks)
  let spruceLogs = bot.inventory.items().find(i => i.name === 'spruce_log');
  let currentLogs = spruceLogs ? spruceLogs.count : 0;
  if (currentLogs < 3) {
    await mineBlock('spruce_log', 3 - currentLogs);
  }

  // 2. Move to the specific crafting table location
  await moveTo(tablePos.x, tablePos.y, tablePos.z, 3, 120);

  // 3. Craft 12 spruce planks
  // craftItem will handle using the crafting table if it's nearby.
  await craftItem('spruce_planks', 12);
}