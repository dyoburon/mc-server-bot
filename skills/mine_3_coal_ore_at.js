async function mineThreeCoalOreAtTarget(bot) {
  await moveTo(803, 55, 241, 3, 60);
  await mineBlock('coal_ore', 3);
}