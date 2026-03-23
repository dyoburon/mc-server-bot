async function craftStonePickaxeAtLocation(bot) {
  const targetX = 848;
  const targetY = 68;
  const targetZ = 199;

  // Ensure we have the required materials: 3 cobblestone and 2 sticks
  let cobblestone = bot.inventory.items().find(i => i.name === 'cobblestone');
  let sticks = bot.inventory.items().find(i => i.name === 'stick');
  if (!cobblestone || cobblestone.count < 3) {
    await mineBlock('stone', 3);
  }
  if (!sticks || sticks.count < 2) {
    let planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
    if (!planks) {
      let logs = bot.inventory.items().find(i => i.name.endsWith('_log'));
      if (!logs) {
        await mineBlock('oak_log', 1);
        logs = bot.inventory.items().find(i => i.name.endsWith('_log'));
      }
      await craftItem(logs.name.replace('_log', '_planks'), 1);
      planks = bot.inventory.items().find(i => i.name.endsWith('_planks'));
    }
    await craftItem('stick', 1);
  }

  // Move to the specified crafting table location
  await moveTo(targetX, targetY, targetZ, 2);

  // Craft the stone pickaxe
  await craftItem('stone_pickaxe', 1);
}