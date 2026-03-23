async function craftFourSprucePlanksAtTable(bot) {
  const tablePos = {
    x: 750,
    y: 70,
    z: 227
  };
  const spruceLog = bot.inventory.items().find(i => i.name === 'spruce_log');
  if (!spruceLog || spruceLog.count < 1) {
    await mineBlock('spruce_log', 1);
  }
  await moveTo(tablePos.x, tablePos.y, tablePos.z, 3, 60);
  const table = bot.findBlock({
    matching: b => b.name === 'crafting_table',
    maxDistance: 32
  });
  await craftItem('spruce_planks', 4);
}