async function craftWoodenPickaxe(bot) {
  const existingPickaxe = bot.inventory.items().find(i => i.name === 'wooden_pickaxe');
  if (existingPickaxe) return;

  // Ensure we have 3 planks and 2 sticks
  let planks = bot.inventory.items().find(i => i.name === 'oak_planks' || i.name === 'spruce_planks');
  let sticks = bot.inventory.items().find(i => i.name === 'stick');

  // Collect oak logs if we need planks
  if (!planks || planks.count < 3) {
    const logBlock = bot.findBlock({
      matching: b => b.name === 'oak_log',
      maxDistance: 32
    });
    if (logBlock) {
      await moveTo(logBlock.position.x, logBlock.position.y, logBlock.position.z, 4, 10);
      await mineBlock('oak_log', 2);
    }
  }

  // Craft planks from logs if needed
  planks = bot.inventory.items().find(i => i.name === 'oak_planks' || i.name === 'spruce_planks');
  if (!planks || planks.count < 3) {
    await craftItem('oak_planks', 3);
  }

  // Craft sticks if needed
  sticks = bot.inventory.items().find(i => i.name === 'stick');
  if (!sticks || sticks.count < 2) {
    await craftItem('stick', 2);
  }

  // Now craft the wooden pickaxe
  await craftItem('wooden_pickaxe', 1);
}