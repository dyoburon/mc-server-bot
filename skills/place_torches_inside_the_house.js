async function placeTorchesInsideHouse(bot) {
  // Check if we have torches in inventory
  let torchItem = bot.inventory.items().find(i => i.name === 'torch');
  let torchCount = torchItem ? torchItem.count : 0;

  // If we don't have enough torches, we need to craft them
  if (torchCount < 8) {
    // Check if we have coal and sticks
    const coalItem = bot.inventory.items().find(i => i.name === 'coal');
    const stickItem = bot.inventory.items().find(i => i.name === 'stick');
    let coalCount = coalItem ? coalItem.count : 0;
    let stickCount = stickItem ? stickItem.count : 0;

    // Mine coal if needed
    if (coalCount < 1) {
      await mineBlock('coal_ore', 1);
    }

    // Mine wood and craft sticks if needed
    if (stickCount < 8) {
      const logItem = bot.inventory.items().find(i => i.name.endsWith('_log'));
      if (!logItem) {
        await mineBlock('oak_log', 1);
      }
      // Craft sticks from logs (2 sticks per log)
      await craftItem('stick', 8 - stickCount);
    }

    // Move to crafting table at 881, 73, 223
    await moveTo(881, 73, 223, 3, 30);

    // Craft torches (coal + 8 sticks = 8 torches)
    await craftItem('torch', 8);
  }

  // Now place torches around the house interior
  // Place torches at strategic interior locations for lighting
  const torchPositions = [{
    x: 882,
    y: 74,
    z: 220
  }, {
    x: 886,
    y: 74,
    z: 220
  }, {
    x: 886,
    y: 74,
    z: 216
  }, {
    x: 882,
    y: 74,
    z: 216
  }, {
    x: 884,
    y: 74,
    z: 218
  }, {
    x: 880,
    y: 74,
    z: 218
  }, {
    x: 888,
    y: 74,
    z: 218
  }, {
    x: 884,
    y: 76,
    z: 220
  }];

  // Place each torch
  for (const pos of torchPositions) {
    await placeItem('torch', pos.x, pos.y, pos.z);
  }
}