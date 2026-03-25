async function buildRoofUsingOakSlabs(bot) {
  // First, we need oak slabs to build the roof
  // Check current oak_slabs inventory
  let slabsItem = bot.inventory.items().find(i => i.name === 'oak_slab');
  let slabCount = slabsItem ? slabsItem.count : 0;

  // Estimate slabs needed for a roof over 4 walls
  // Assuming a 5x5 structure (4 walls around current position), we need roughly 16-20 slabs
  if (slabCount < 20) {
    // Check if we have oak planks to craft slabs
    let planksItem = bot.inventory.items().find(i => i.name === 'oak_planks');
    let plankCount = planksItem ? planksItem.count : 0;

    // Need 10 planks to make 20 slabs (2 planks = 3 slabs, so 7 planks ≈ 20 slabs)
    if (plankCount < 10) {
      // Check if we have oak logs to craft planks
      let logsItem = bot.inventory.items().find(i => i.name === 'oak_log');
      let logCount = logsItem ? logsItem.count : 0;

      // Need 3 logs to make 12 planks
      if (logCount < 3) {
        let logBlock = bot.findBlock({
          matching: b => b.name === 'oak_log',
          maxDistance: 32
        });
        if (!logBlock) {
          await exploreUntil(new Vec3(1, 0, 1), 60000, () => bot.findBlock({
            matching: b => b.name === 'oak_log',
            maxDistance: 32
          }));
        }
        await mineBlock('oak_log', 3 - logCount);
      }

      // Craft oak planks
      await craftItem('oak_planks', 10 - plankCount);
    }

    // Craft oak slabs from planks
    await craftItem('oak_slab', 20 - slabCount);
  }

  // Build the roof: place oak slabs on top of the walls
  // Assuming walls are at height 3 (blocks at y+1, y+2, y+3), roof goes at y+4
  const baseY = bot.entity.position.y + 2;
  const roofY = baseY + 3;
  const centerX = Math.floor(bot.entity.position.x);
  const centerZ = Math.floor(bot.entity.position.z);

  // Place slabs in a square pattern covering the roof area (5x5)
  for (let x = centerX - 2; x <= centerX + 2; x++) {
    for (let z = centerZ - 2; z <= centerZ + 2; z++) {
      await placeItem('oak_slab', x, roofY, z);
    }
  }
}