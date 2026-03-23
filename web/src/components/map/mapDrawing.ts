import { getPersonalityColor, PLAYER_COLOR } from '@/lib/constants';

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 10;
export const TRAIL_LENGTH = 80;
export const TERRAIN_RADIUS = 96;
export const TERRAIN_STEP = 2;
export const ZOOM_SENSITIVITY = 0.002; // Normalized zoom speed

export type MapMode = 'navigate' | 'select' | 'place-marker' | 'draw-zone' | 'draw-route';

export interface MapEntity {
  name: string;
  x: number;
  z: number;
  color: string;
  type: 'bot' | 'player';
  state?: string;
  personality?: string;
}

export interface ShowState {
  bots: boolean;
  players: boolean;
  trails: boolean;
  grid: boolean;
  coords: boolean;
  terrain: boolean;
}

interface BotLike {
  name: string;
  position: { x: number; y: number; z: number } | null;
  personality?: string;
  state?: string;
}

interface PlayerLike {
  name: string;
  position: { x: number; y: number; z: number } | null;
  isOnline: boolean;
}

export function collectEntities(
  bots: BotLike[],
  players: PlayerLike[],
  showBots: boolean,
  showPlayers: boolean,
): MapEntity[] {
  const entities: MapEntity[] = [];
  const drawnNames = new Set<string>();

  if (showBots) {
    for (const bot of bots) {
      if (!bot.position) continue;
      drawnNames.add(bot.name.toLowerCase());
      entities.push({
        name: bot.name,
        x: bot.position.x,
        z: bot.position.z,
        color: getPersonalityColor(bot.personality ?? ''),
        type: 'bot',
        state: bot.state,
        personality: bot.personality,
      });
    }
  }

  if (showPlayers) {
    for (const player of players) {
      if (!player.isOnline || !player.position || drawnNames.has(player.name.toLowerCase())) continue;
      entities.push({
        name: player.name,
        x: player.position.x,
        z: player.position.z,
        color: PLAYER_COLOR,
        type: 'player',
      });
    }
  }

  return entities;
}

// ── Schematic footprint drawing ──────────────────────────────

export function drawSchematicFootprint(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  offset: { x: number; y: number },
  origin: { x: number; z: number },
  sizeX: number,
  sizeZ: number,
  style: 'preview' | 'placed' | 'active',
) {
  const sx = cx + origin.x * scale + offset.x;
  const sy = cy + origin.z * scale + offset.y;
  const w = sizeX * scale;
  const h = sizeZ * scale;

  const colors = {
    preview: { fill: '#3B82F618', stroke: '#3B82F6', label: '#3B82F6A0' },
    placed:  { fill: '#3B82F628', stroke: '#3B82F6', label: '#3B82F6' },
    active:  { fill: '#10B98118', stroke: '#10B981', label: '#10B981' },
  };
  const c = colors[style];

  ctx.save();

  // Fill
  ctx.fillStyle = c.fill;
  ctx.fillRect(sx, sy, w, h);

  // Border
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = style === 'preview' ? 1 : 1.5;
  if (style === 'preview') ctx.setLineDash([4, 4]);
  ctx.strokeRect(sx, sy, w, h);
  ctx.setLineDash([]);

  // Origin marker (small diamond at anchor corner)
  const dmSz = 4;
  ctx.fillStyle = c.stroke;
  ctx.beginPath();
  ctx.moveTo(sx, sy - dmSz);
  ctx.lineTo(sx + dmSz, sy);
  ctx.lineTo(sx, sy + dmSz);
  ctx.lineTo(sx - dmSz, sy);
  ctx.closePath();
  ctx.fill();

  // Dimension label at center
  if (w > 30 && h > 20) {
    ctx.fillStyle = c.label;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${sizeX} x ${sizeZ}`, sx + w / 2, sy + h / 2);
  }

  // Corner coordinate labels (only if big enough)
  if (scale > 1 && (style === 'placed' || style === 'active')) {
    ctx.fillStyle = c.label;
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(origin.x)}, ${Math.round(origin.z)}`, sx + 3, sy + 3);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `${Math.round(origin.x + sizeX)}, ${Math.round(origin.z + sizeZ)}`,
      sx + w - 3,
      sy + h - 3,
    );
  }

  // Direction arrow along +X edge (right side)
  if (w > 40) {
    const arrowY = sy + h / 2;
    const arrowX = sx + w - 8;
    ctx.strokeStyle = c.label;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(arrowX - 8, arrowY);
    ctx.lineTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 3, arrowY - 3);
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 3, arrowY + 3);
    ctx.stroke();
  }

  ctx.restore();
}
