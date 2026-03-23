async function craftFourSticksFromSpruce(bot) {
  let sprucePlanks = bot.inventory.items().find(i => i.name === 'spruce_planks');
  let planksCount = sprucePlanks ? sprucePlanks.count : 0;
  if (planksCount < 2) {
    let spruceLog = bot.inventory.items().find(i => i.name === 'spruce_log');
    if (!spruceLog) {
      await mineBlock('spruce_log', 1);
    }
    await craftItem('spruce_planks', 1);
  }
  await craftItem('stick', 1);
}