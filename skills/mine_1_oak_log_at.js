async function mineOakLogAtLocation(bot) {
  const targetX = 847;
  const targetY = 68;
  const targetZ = 199;
  await moveTo(targetX, targetY, targetZ, 3, 60);
  await mineBlock('oak_log', 1);
}