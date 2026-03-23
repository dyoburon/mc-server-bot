'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useBotStore } from '@/lib/store';
import { api } from '@/lib/api';
import { getPersonalityColor, PLAYER_COLOR, STATE_COLORS } from '@/lib/constants';
import { getBlockColor } from '@/lib/blockColors';

const MIN_SCALE = 0.5;
const MAX_SCALE = 10;
const TRAIL_LENGTH = 80;
const TERRAIN_RADIUS = 96;
const TERRAIN_STEP = 2;
const ZOOM_SENSITIVITY = 0.002;
const MAX_MARKER_LABEL_LENGTH = 18;
const LABEL_OVERLAP_DIST = 40; // pixels — if two labels are closer than this, hide the non-focused one

// ── Types ─────────────────────────────────────────────────────────────

interface MapEntity {
  name: string;
  x: number;
  z: number;
  color: string;
  type: 'bot' | 'player';
  state?: string;
  personality?: string;
}

export interface MapMarker {
  id: string;
  name: string;
  x: number;
  z: number;
  color: string;
  icon?: string; // single-char emoji/symbol
}

export interface MapZone {
  id: string;
  name: string;
  color: string;
  shape: 'circle' | 'rectangle';
  // circle
  cx?: number;
  cz?: number;
  radius?: number;
  // rectangle
  x1?: number;
  z1?: number;
  x2?: number;
  z2?: number;
}

// ── Persistence helpers ───────────────────────────────────────────────

const STORAGE_KEY_MARKERS = 'dyobot:map:markers';
const STORAGE_KEY_ZONES = 'dyobot:map:zones';

function loadMarkers(): MapMarker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MARKERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m: MapMarker) =>
        m && typeof m.id === 'string' && typeof m.x === 'number' && typeof m.z === 'number' && typeof m.name === 'string',
    );
  } catch {
    return [];
  }
}

function saveMarkers(markers: MapMarker[]) {
  try {
    localStorage.setItem(STORAGE_KEY_MARKERS, JSON.stringify(markers));
  } catch { /* quota exceeded — silently skip */ }
}

function loadZones(): MapZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZONES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (z: MapZone) => z && typeof z.id === 'string' && typeof z.name === 'string' && (z.shape === 'circle' || z.shape === 'rectangle'),
    );
  } catch {
    return [];
  }
}

function saveZones(zones: MapZone[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ZONES, JSON.stringify(zones));
  } catch { /* quota exceeded */ }
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function truncateLabel(name: string): string {
  if (name.length <= MAX_MARKER_LABEL_LENGTH) return name;
  return name.slice(0, MAX_MARKER_LABEL_LENGTH - 1) + '\u2026';
}

// ── Viewport check helper ─────────────────────────────────────────────

function inViewport(sx: number, sy: number, w: number, h: number, margin = 40): boolean {
  return sx >= -margin && sx <= w + margin && sy >= -margin && sy <= h + margin;
}

// ── Zone validity checks ──────────────────────────────────────────────

function isCircleZoneValid(z: MapZone): boolean {
  return z.shape === 'circle' && typeof z.cx === 'number' && typeof z.cz === 'number' && typeof z.radius === 'number' && z.radius > 0;
}

function isRectZoneValid(z: MapZone): boolean {
  return (
    z.shape === 'rectangle' &&
    typeof z.x1 === 'number' &&
    typeof z.z1 === 'number' &&
    typeof z.x2 === 'number' &&
    typeof z.z2 === 'number'
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function MapPage() {
  const bots = useBotStore((s) => s.botList);
  const players = useBotStore((s) => s.playerList);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for the draw loop (no state updates during animation)
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(3);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const showRef = useRef({ bots: true, players: true, trails: true, grid: true, coords: true, terrain: true, markers: true, zones: true });
  const botsRef = useRef(bots);
  const playersRef = useRef(players);
  const trails = useRef<Map<string, { x: number; z: number }[]>>(new Map());
  const entityPositions = useRef<Map<string, { sx: number; sy: number; radius: number }>>(new Map());
  const terrainCanvas = useRef<OffscreenCanvas | null>(null);
  const terrainMeta = useRef<{ cx: number; cz: number; radius: number } | null>(null);
  const initializedRef = useRef(false);

  // Marker & zone refs (read by draw loop)
  const markersRef = useRef<MapMarker[]>([]);
  const zonesRef = useRef<MapZone[]>([]);

  // Cached Path2D objects for static zone shapes (cleared when zones change)
  const zonePaths = useRef<Map<string, { path: Path2D; zone: MapZone }>>(new Map());
  const zonePathsDirty = useRef(true);

  // Mode refs
  const markerModeRef = useRef(false);
  const zoneModeRef = useRef<false | 'circle' | 'rectangle'>(false);
  const zoneStartRef = useRef<{ x: number; z: number } | null>(null);

  // State for UI re-renders (toolbar, sidebar, modals)
  const [, forceRender] = useState(0);
  const kick = () => forceRender((n) => n + 1);

  const [terrainStatus, setTerrainStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keep refs in sync with zustand
  botsRef.current = bots;
  playersRef.current = players;

  // ── Load persisted markers/zones on mount ───────────────────────────
  useEffect(() => {
    markersRef.current = loadMarkers();
    zonesRef.current = loadZones();
    zonePathsDirty.current = true;
    kick();
  }, []);

  // ── Terrain loading ─────────────────────────────────────────────────
  const loadTerrain = useCallback(async (centerX: number, centerZ: number) => {
    const cx = Math.round(centerX);
    const cz = Math.round(centerZ);

    if (terrainMeta.current) {
      const dx = Math.abs(terrainMeta.current.cx - cx);
      const dz = Math.abs(terrainMeta.current.cz - cz);
      if (dx < TERRAIN_RADIUS / 2 && dz < TERRAIN_RADIUS / 2) return;
    }

    setTerrainStatus('loading');
    try {
      const data = await api.getTerrain(cx, cz, TERRAIN_RADIUS, TERRAIN_STEP);
      const size = data.size;
      const offscreen = new OffscreenCanvas(size, size);
      const octx = offscreen.getContext('2d');
      if (octx) {
        for (let z = 0; z < size; z++) {
          for (let x = 0; x < size; x++) {
            octx.fillStyle = getBlockColor(data.blocks[z * size + x]);
            octx.fillRect(x, z, 1, 1);
          }
        }
      }
      terrainCanvas.current = offscreen;
      terrainMeta.current = { cx, cz, radius: data.radius };
      setTerrainStatus('loaded');
    } catch {
      setTerrainStatus('error');
    }
  }, []);

  // ── Track position history ──────────────────────────────────────────
  useEffect(() => {
    for (const e of [...bots, ...players.filter((p) => p.isOnline)]) {
      if (!e.position) continue;
      const trail = trails.current.get(e.name) || [];
      const last = trail[trail.length - 1];
      if (!last || Math.abs(last.x - e.position.x) > 0.5 || Math.abs(last.z - e.position.z) > 0.5) {
        trail.push({ x: e.position.x, z: e.position.z });
        if (trail.length > TRAIL_LENGTH) trail.shift();
        trails.current.set(e.name, trail);
      }
    }
  }, [bots, players]);

  // ── Center on first entity once ─────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    const allEntities = [...bots, ...players.filter((p) => p.isOnline)];
    const first = allEntities.find((e) => e.position);
    if (first?.position) {
      offsetRef.current = { x: -first.position.x * scaleRef.current, y: -first.position.z * scaleRef.current };
      initializedRef.current = true;
      loadTerrain(first.position.x, first.position.z);
      kick();
    }
  }, [bots, players, loadTerrain]);

  // ── Rebuild zone Path2D cache when dirty ────────────────────────────
  function rebuildZonePaths() {
    zonePaths.current.clear();
    for (const zone of zonesRef.current) {
      if (isCircleZoneValid(zone)) {
        const p = new Path2D();
        p.arc(zone.cx!, zone.cz!, zone.radius!, 0, Math.PI * 2);
        zonePaths.current.set(zone.id, { path: p, zone });
      } else if (isRectZoneValid(zone)) {
        const p = new Path2D();
        p.rect(
          Math.min(zone.x1!, zone.x2!),
          Math.min(zone.z1!, zone.z2!),
          Math.abs(zone.x2! - zone.x1!),
          Math.abs(zone.z2! - zone.z1!),
        );
        zonePaths.current.set(zone.id, { path: p, zone });
      }
    }
    zonePathsDirty.current = false;
  }

  // ── Draw loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let prevW = 0;
    let prevH = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      if (w !== prevW || h !== prevH) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        prevW = w;
        prevH = h;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const offset = offsetRef.current;
      const scale = scaleRef.current;
      const show = showRef.current;
      const curBots = botsRef.current;
      const curPlayers = playersRef.current;
      const hovered = hoveredRef.current;
      const selected = selectedRef.current;

      const cx = w / 2;
      const cy = h / 2;

      // ── Background ──────────────────────────────────────────────
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, w, h);

      // ── Terrain (z-order: bottom) ───────────────────────────────
      if (show.terrain && terrainCanvas.current && terrainMeta.current) {
        const tm = terrainMeta.current;
        const tc = terrainCanvas.current;
        const worldLeft = tm.cx - tm.radius;
        const worldTop = tm.cz - tm.radius;
        const screenX = cx + worldLeft * scale + offset.x;
        const screenY = cy + worldTop * scale + offset.y;
        const screenW = tc.width * TERRAIN_STEP * scale;
        const screenH = tc.height * TERRAIN_STEP * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tc, screenX, screenY, screenW, screenH);
      }

      // ── Grid ────────────────────────────────────────────────────
      if (show.grid) {
        const gridSize = 16 * scale;
        if (gridSize > 4) {
          const hasTerrain = show.terrain && terrainCanvas.current;
          ctx.strokeStyle = hasTerrain ? '#00000030' : '#ffffff12';
          ctx.lineWidth = 1;
          const startX = ((cx + offset.x) % gridSize + gridSize) % gridSize;
          const startY = ((cy + offset.y) % gridSize + gridSize) % gridSize;
          for (let x = startX; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
          }
          for (let y = startY; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }

          const originX = cx + offset.x;
          const originY = cy + offset.y;
          ctx.strokeStyle = hasTerrain ? '#00000050' : '#ffffff20';
          ctx.lineWidth = 1.5;
          if (originX >= 0 && originX <= w) {
            ctx.beginPath(); ctx.moveTo(originX, 0); ctx.lineTo(originX, h); ctx.stroke();
          }
          if (originY >= 0 && originY <= h) {
            ctx.beginPath(); ctx.moveTo(0, originY); ctx.lineTo(w, originY); ctx.stroke();
          }
        }
      }

      // ── Origin label ────────────────────────────────────────────
      if (show.coords) {
        const ox = cx + offset.x;
        const oy = cy + offset.y;
        if (ox >= 0 && ox <= w && oy >= 0 && oy <= h) {
          ctx.fillStyle = '#ffffff40';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('0, 0', ox + 4, oy - 4);
        }
      }

      // ── Zones (z-order: above terrain, below entities) ──────────
      if (show.zones) {
        if (zonePathsDirty.current) rebuildZonePaths();

        // Count overlapping zones at screen center for opacity reduction
        const totalZones = zonesRef.current.length;
        const baseOpacity = totalZones > 10 ? 0.08 : totalZones > 5 ? 0.12 : 0.18;
        const borderOpacity = totalZones > 10 ? '30' : totalZones > 5 ? '50' : '60';

        for (const zone of zonesRef.current) {
          if (isCircleZoneValid(zone)) {
            const scx = cx + zone.cx! * scale + offset.x;
            const scy = cy + zone.cz! * scale + offset.y;
            const sr = zone.radius! * scale;
            // Viewport check for circle
            if (scx + sr < -40 || scx - sr > w + 40 || scy + sr < -40 || scy - sr > h + 40) continue;
            ctx.beginPath();
            ctx.arc(scx, scy, sr, 0, Math.PI * 2);
            ctx.fillStyle = zone.color + Math.round(baseOpacity * 255).toString(16).padStart(2, '0');
            ctx.fill();
            ctx.strokeStyle = zone.color + borderOpacity;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Centered label
            ctx.save();
            ctx.fillStyle = zone.color + 'cc';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 3;
            ctx.fillText(truncateLabel(zone.name), scx, scy);
            ctx.restore();
          } else if (isRectZoneValid(zone)) {
            const sx1 = cx + Math.min(zone.x1!, zone.x2!) * scale + offset.x;
            const sz1 = cy + Math.min(zone.z1!, zone.z2!) * scale + offset.y;
            const sw = Math.abs(zone.x2! - zone.x1!) * scale;
            const sh = Math.abs(zone.z2! - zone.z1!) * scale;
            // Viewport check for rect
            if (sx1 + sw < -40 || sx1 > w + 40 || sz1 + sh < -40 || sz1 > h + 40) continue;
            ctx.fillStyle = zone.color + Math.round(baseOpacity * 255).toString(16).padStart(2, '0');
            ctx.fillRect(sx1, sz1, sw, sh);
            ctx.strokeStyle = zone.color + borderOpacity;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx1, sz1, sw, sh);
            // Centered label
            ctx.save();
            ctx.fillStyle = zone.color + 'cc';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 3;
            ctx.fillText(truncateLabel(zone.name), sx1 + sw / 2, sz1 + sh / 2);
            ctx.restore();
          }
          // Skip zones with missing shape data silently
        }
      }

      // ── Collect entities ────────────────────────────────────────
      const entities: MapEntity[] = [];
      const drawnNames = new Set<string>();
      if (show.bots) {
        for (const bot of curBots) {
          if (!bot.position) continue;
          drawnNames.add(bot.name.toLowerCase());
          entities.push({ name: bot.name, x: bot.position.x, z: bot.position.z, color: getPersonalityColor(bot.personality), type: 'bot', state: bot.state, personality: bot.personality });
        }
      }
      if (show.players) {
        for (const player of curPlayers) {
          if (!player.isOnline || !player.position || drawnNames.has(player.name.toLowerCase())) continue;
          entities.push({ name: player.name, x: player.position.x, z: player.position.z, color: PLAYER_COLOR, type: 'player' });
        }
      }

      entityPositions.current.clear();

      // ── Trails ──────────────────────────────────────────────────
      if (show.trails) {
        for (const entity of entities) {
          const trail = trails.current.get(entity.name) || [];
          if (trail.length > 1) {
            for (let i = 1; i < trail.length; i++) {
              const p0x = cx + trail[i - 1].x * scale + offset.x;
              const p0y = cy + trail[i - 1].z * scale + offset.y;
              const p1x = cx + trail[i].x * scale + offset.x;
              const p1y = cy + trail[i].z * scale + offset.y;
              // Skip trail segments outside viewport
              if (Math.max(p0x, p1x) < -40 || Math.min(p0x, p1x) > w + 40 || Math.max(p0y, p1y) < -40 || Math.min(p0y, p1y) > h + 40) continue;
              const alpha = Math.floor((i / trail.length) * 80).toString(16).padStart(2, '0');
              ctx.beginPath();
              ctx.strokeStyle = entity.color + alpha;
              ctx.lineWidth = entity.type === 'player' ? 1.5 : 2;
              ctx.moveTo(p0x, p0y);
              ctx.lineTo(p1x, p1y);
              ctx.stroke();
            }
          }
        }
      }

      // ── Custom markers (z-order: above zones, below entity labels) ──
      // Collect marker screen positions for label-overlap prevention
      const markerScreenPositions: { sx: number; sy: number; id: string; name: string }[] = [];

      if (show.markers) {
        for (const marker of markersRef.current) {
          // Skip markers with no position
          if (typeof marker.x !== 'number' || typeof marker.z !== 'number' || isNaN(marker.x) || isNaN(marker.z)) continue;

          const sx = cx + marker.x * scale + offset.x;
          const sy = cy + marker.z * scale + offset.y;
          if (!inViewport(sx, sy, w, h)) continue;

          markerScreenPositions.push({ sx, sy, id: marker.id, name: marker.name });

          // Draw marker pin
          const r = 6;
          ctx.save();
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = marker.color || '#F59E0B';
          ctx.fill();
          ctx.strokeStyle = '#ffffffb0';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // Icon inside
          if (marker.icon) {
            ctx.save();
            ctx.font = '8px system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(marker.icon, sx, sy + 0.5);
            ctx.restore();
          }
        }

        // Label overlap prevention: only show label if no closer focused entity, or if this is focused/selected
        for (const mp of markerScreenPositions) {
          const isFocused = hovered === `marker:${mp.id}` || selected === `marker:${mp.id}`;
          let occluded = false;
          if (!isFocused) {
            for (const other of markerScreenPositions) {
              if (other.id === mp.id) continue;
              const dx = mp.sx - other.sx;
              const dy = mp.sy - other.sy;
              if (Math.sqrt(dx * dx + dy * dy) < LABEL_OVERLAP_DIST) {
                const otherFocused = hovered === `marker:${other.id}` || selected === `marker:${other.id}`;
                if (otherFocused) { occluded = true; break; }
              }
            }
          }
          if (!occluded) {
            ctx.save();
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 3;
            ctx.fillStyle = '#ffffffdd';
            ctx.font = `${isFocused ? 'bold ' : ''}10px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(truncateLabel(mp.name), mp.sx, mp.sy - 10);
            ctx.restore();
          }
        }
      }

      // ── Entity markers ──────────────────────────────────────────
      // Collect entity label positions for overlap prevention
      const entityLabelPositions: { sx: number; sy: number; name: string }[] = [];

      for (const entity of entities) {
        const sx = cx + entity.x * scale + offset.x;
        const sy = cy + entity.z * scale + offset.y;
        if (!inViewport(sx, sy, w, h)) continue;

        const isHovered = hovered === entity.name;
        const isSelected = selected === entity.name;
        const baseR = entity.type === 'bot' ? 8 : 6;
        const r = isHovered || isSelected ? baseR + 2 : baseR;

        entityPositions.current.set(entity.name, { sx, sy, radius: r + 4 });
        entityLabelPositions.push({ sx, sy, name: entity.name });

        if (isSelected || isHovered) {
          ctx.beginPath(); ctx.arc(sx, sy, r + 6, 0, Math.PI * 2); ctx.fillStyle = entity.color + '20'; ctx.fill();
        }
        if (entity.type === 'bot' && entity.state && !['IDLE', 'DISCONNECTED'].includes(entity.state)) {
          ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = (STATE_COLORS[entity.state] ?? entity.color) + '50'; ctx.lineWidth = 1.5; ctx.stroke();
        }

        ctx.shadowColor = '#000000'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
        if (entity.type === 'player') {
          const half = r / 1.4;
          ctx.fillStyle = entity.color; ctx.fillRect(sx - half, sy - half, half * 2, half * 2);
          ctx.strokeStyle = '#ffffffb0'; ctx.lineWidth = 2; ctx.strokeRect(sx - half, sy - half, half * 2, half * 2);
        } else {
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fillStyle = entity.color; ctx.fill();
          ctx.strokeStyle = '#ffffffb0'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        // Label overlap: only show label if not occluded by a closer hovered/selected entity
        const isFocused = isHovered || isSelected;
        let labelOccluded = false;
        if (!isFocused) {
          for (const other of entityLabelPositions) {
            if (other.name === entity.name) continue;
            const dx = sx - other.sx;
            const dy = sy - other.sy;
            if (Math.sqrt(dx * dx + dy * dy) < LABEL_OVERLAP_DIST) {
              const otherFocused = hovered === other.name || selected === other.name;
              if (otherFocused) { labelOccluded = true; break; }
            }
          }
        }

        if (!labelOccluded) {
          ctx.save();
          ctx.shadowColor = '#000000'; ctx.shadowBlur = 3;
          ctx.fillStyle = '#ffffff'; ctx.font = `${isFocused ? 'bold ' : ''}11px system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.fillText(truncateLabel(entity.name), sx, sy - r - 6);
          ctx.restore();
        }

        if (isFocused) {
          ctx.save(); ctx.shadowColor = '#000000'; ctx.shadowBlur = 3;
          ctx.fillStyle = '#ffffff90'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(entity.x)}, ${Math.round(entity.z)}`, sx, sy + r + 14);
          if (entity.state) { ctx.fillStyle = STATE_COLORS[entity.state] ?? '#6B7280'; ctx.font = '9px system-ui'; ctx.fillText(entity.state, sx, sy + r + 26); }
          ctx.restore();
        }
      }

      // ── HUD overlays ────────────────────────────────────────────
      if (show.coords) {
        ctx.fillStyle = '#00000080'; ctx.fillRect(8, h - 28, 130, 20);
        ctx.fillStyle = '#ffffff80'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`Center: ${Math.round(-offset.x / scale)}, ${Math.round(-offset.y / scale)}`, 14, h - 14);
      }
      ctx.fillStyle = '#00000080'; ctx.fillRect(w - 50, h - 28, 42, 20);
      ctx.fillStyle = '#ffffff60'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText(`${scale.toFixed(1)}x`, w - 12, h - 14);

      // Mode indicator
      if (markerModeRef.current) {
        ctx.fillStyle = '#F59E0B40'; ctx.fillRect(w / 2 - 80, 8, 160, 24);
        ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('Click to place marker (Esc to cancel)', w / 2, 24);
      }
      if (zoneModeRef.current) {
        const zoneLabel = zoneStartRef.current
          ? 'Click to complete zone (Esc to cancel)'
          : `Click to start ${zoneModeRef.current} zone (Esc to cancel)`;
        ctx.fillStyle = '#8B5CF640'; ctx.fillRect(w / 2 - 110, 8, 220, 24);
        ctx.fillStyle = '#8B5CF6'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(zoneLabel, w / 2, 24);
      }

      animFrame = requestAnimationFrame(draw);
    };

    animFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame);
  }, []); // Empty deps — loop runs forever, reads from refs

  // ── Input handlers ──────────────────────────────────────────────────

  const screenToWorld = (clientX: number, clientY: number): { x: number; z: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, z: 0 };
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const cxHalf = w / 2;
    const cyHalf = h / 2;
    const scale = scaleRef.current;
    const offset = offsetRef.current;
    return {
      x: (mx - cxHalf - offset.x) / scale,
      z: (my - cyHalf - offset.y) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Marker placement mode
    if (markerModeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      const newMarker: MapMarker = {
        id: makeId(),
        name: `Marker ${markersRef.current.length + 1}`,
        x: Math.round(world.x),
        z: Math.round(world.z),
        color: '#F59E0B',
      };
      markersRef.current = [...markersRef.current, newMarker];
      saveMarkers(markersRef.current);
      markerModeRef.current = false;
      kick();
      return;
    }

    // Zone drawing mode
    if (zoneModeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      if (!zoneStartRef.current) {
        zoneStartRef.current = { x: Math.round(world.x), z: Math.round(world.z) };
        kick();
        return;
      } else {
        const start = zoneStartRef.current;
        const end = { x: Math.round(world.x), z: Math.round(world.z) };
        const shape = zoneModeRef.current;
        let newZone: MapZone;
        if (shape === 'circle') {
          const dx = end.x - start.x;
          const dz = end.z - start.z;
          const radius = Math.round(Math.sqrt(dx * dx + dz * dz));
          newZone = {
            id: makeId(),
            name: `Zone ${zonesRef.current.length + 1}`,
            color: '#8B5CF6',
            shape: 'circle',
            cx: start.x,
            cz: start.z,
            radius: Math.max(radius, 1),
          };
        } else {
          newZone = {
            id: makeId(),
            name: `Zone ${zonesRef.current.length + 1}`,
            color: '#8B5CF6',
            shape: 'rectangle',
            x1: start.x,
            z1: start.z,
            x2: end.x,
            z2: end.z,
          };
        }
        zonesRef.current = [...zonesRef.current, newZone];
        saveZones(zonesRef.current);
        zonePathsDirty.current = true;
        zoneModeRef.current = false;
        zoneStartRef.current = null;
        kick();
        return;
      }
    }

    // Entity selection
    for (const [name, pos] of entityPositions.current) {
      const dx = mx - pos.sx;
      const dy = my - pos.sy;
      if (dx * dx + dy * dy < pos.radius * pos.radius) {
        selectedRef.current = selectedRef.current === name ? null : name;
        kick();
        return;
      }
    }

    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingRef.current) {
      offsetRef.current = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: string | null = null;
    for (const [name, pos] of entityPositions.current) {
      const dx = mx - pos.sx;
      const dy = my - pos.sy;
      if (dx * dx + dy * dy < pos.radius * pos.radius) { found = name; break; }
    }
    hoveredRef.current = found;
  };

  const handleMouseUp = () => {
    if (draggingRef.current) {
      draggingRef.current = false;
      if (showRef.current.terrain) {
        const viewCenterX = -offsetRef.current.x / scaleRef.current;
        const viewCenterZ = -offsetRef.current.y / scaleRef.current;
        loadTerrain(viewCenterX, viewCenterZ);
      }
      kick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Context menu — could be extended later. For now, just cancel modes.
    if (markerModeRef.current || zoneModeRef.current) {
      markerModeRef.current = false;
      zoneModeRef.current = false;
      zoneStartRef.current = null;
      kick();
    }
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if focused in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'm':
          markerModeRef.current = !markerModeRef.current;
          zoneModeRef.current = false;
          zoneStartRef.current = null;
          kick();
          break;
        case 'z':
          if (!zoneModeRef.current) {
            zoneModeRef.current = 'rectangle';
          } else if (zoneModeRef.current === 'rectangle') {
            zoneModeRef.current = 'circle';
          } else {
            zoneModeRef.current = false;
          }
          markerModeRef.current = false;
          zoneStartRef.current = null;
          kick();
          break;
        case 'escape':
          markerModeRef.current = false;
          zoneModeRef.current = false;
          zoneStartRef.current = null;
          selectedRef.current = null;
          setShowShortcuts(false);
          kick();
          break;
        case '?':
          setShowShortcuts((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Zoom toward cursor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const rawDelta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const zoomFactor = Math.exp(-rawDelta * ZOOM_SENSITIVITY);
      const oldScale = scaleRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * zoomFactor));
      const ratio = newScale / oldScale;
      const cw = rect.width / 2;
      const ch = rect.height / 2;
      offsetRef.current = {
        x: mouseX - cw - (mouseX - cw - offsetRef.current.x) * ratio,
        y: mouseY - ch - (mouseY - ch - offsetRef.current.y) * ratio,
      };
      scaleRef.current = newScale;
      kick();
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Reload terrain after zoom settles
  useEffect(() => {
    if (!showRef.current.terrain || !initializedRef.current) return;
    const timer = setTimeout(() => {
      const viewCenterX = -offsetRef.current.x / scaleRef.current;
      const viewCenterZ = -offsetRef.current.y / scaleRef.current;
      loadTerrain(viewCenterX, viewCenterZ);
    }, 500);
    return () => clearTimeout(timer);
  });

  const centerOn = (x: number, z: number) => {
    offsetRef.current = { x: -x * scaleRef.current, y: -z * scaleRef.current };
    kick();
  };

  // ── Sidebar entities ────────────────────────────────────────────────
  const botNames = new Set(bots.map((b) => b.name.toLowerCase()));
  const allEntities: MapEntity[] = [
    ...bots.filter((b) => b.position).map((bot) => ({
      name: bot.name, x: bot.position!.x, z: bot.position!.z,
      color: getPersonalityColor(bot.personality), type: 'bot' as const,
      state: bot.state, personality: bot.personality,
    })),
    ...players.filter((p) => p.isOnline && p.position && !botNames.has(p.name.toLowerCase())).map((player) => ({
      name: player.name, x: player.position!.x, z: player.position!.z,
      color: PLAYER_COLOR, type: 'player' as const,
    })),
  ];

  const show = showRef.current;
  const toggleShow = (key: keyof typeof show) => { showRef.current = { ...show, [key]: !show[key] }; kick(); };

  // Delete helpers
  const deleteMarker = (id: string) => {
    markersRef.current = markersRef.current.filter((m) => m.id !== id);
    saveMarkers(markersRef.current);
    kick();
  };
  const deleteZone = (id: string) => {
    zonesRef.current = zonesRef.current.filter((z) => z.id !== id);
    saveZones(zonesRef.current);
    zonePathsDirty.current = true;
    kick();
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-white">World Map</h1>
          <div className="flex items-center gap-1.5 text-[11px]">
            <ToggleBtn active={show.terrain} onClick={() => toggleShow('terrain')} label="Terrain" color="#5B8C33" />
            <ToggleBtn active={show.grid} onClick={() => toggleShow('grid')} label="Grid" />
            <ToggleBtn active={show.trails} onClick={() => toggleShow('trails')} label="Trails" />
            <ToggleBtn active={show.coords} onClick={() => toggleShow('coords')} label="Coords" />
            <span className="w-px h-4 bg-zinc-800 mx-1" />
            <ToggleBtn active={show.bots} onClick={() => toggleShow('bots')} label="Bots" color="#10B981" />
            <ToggleBtn active={show.players} onClick={() => toggleShow('players')} label="Players" color="#60A5FA" />
            <span className="w-px h-4 bg-zinc-800 mx-1" />
            <ToggleBtn active={show.markers} onClick={() => toggleShow('markers')} label="Markers" color="#F59E0B" />
            <ToggleBtn active={show.zones} onClick={() => toggleShow('zones')} label="Zones" color="#8B5CF6" />
          </div>
          {terrainStatus === 'loading' && (
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="w-3 h-3 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              Loading terrain...
            </span>
          )}
          {terrainStatus === 'error' && <span className="text-[10px] text-red-400/70">Terrain unavailable</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { markerModeRef.current = !markerModeRef.current; zoneModeRef.current = false; zoneStartRef.current = null; kick(); }}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${markerModeRef.current ? 'bg-amber-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}
            title="Toggle marker placement (M)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (!zoneModeRef.current) zoneModeRef.current = 'rectangle';
              else if (zoneModeRef.current === 'rectangle') zoneModeRef.current = 'circle';
              else zoneModeRef.current = false;
              markerModeRef.current = false;
              zoneStartRef.current = null;
              kick();
            }}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${zoneModeRef.current ? 'bg-purple-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}
            title={`Toggle zone drawing (Z) — current: ${zoneModeRef.current || 'off'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
          </button>
          <span className="w-px h-4 bg-zinc-800" />
          <button
            onClick={() => {
              terrainMeta.current = null;
              terrainCanvas.current = null;
              loadTerrain(-offsetRef.current.x / scaleRef.current, -offsetRef.current.y / scaleRef.current);
            }}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs transition-colors"
            title="Reload terrain"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <span className="w-px h-4 bg-zinc-800" />
          <button
            onClick={() => { scaleRef.current = Math.min(MAX_SCALE, scaleRef.current * 1.3); kick(); }}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm transition-colors"
          >+</button>
          <span className="text-[10px] text-zinc-500 font-mono w-8 text-center">{scaleRef.current.toFixed(1)}x</span>
          <button
            onClick={() => { scaleRef.current = Math.max(MIN_SCALE, scaleRef.current / 1.3); kick(); }}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm transition-colors"
          >-</button>
          <span className="w-px h-4 bg-zinc-800" />
          <div className="relative">
            <button
              onClick={() => setShowShortcuts((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-bold transition-colors"
              title="Keyboard shortcuts (?)"
            >?</button>
            {showShortcuts && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 z-50 text-[11px]">
                <p className="text-zinc-400 font-semibold mb-2">Keyboard Shortcuts</p>
                <div className="space-y-1.5">
                  <ShortcutRow keys="M" desc="Toggle marker placement mode" />
                  <ShortcutRow keys="Z" desc="Toggle zone drawing mode (rect/circle)" />
                  <ShortcutRow keys="Esc" desc="Cancel current mode / close menus" />
                  <ShortcutRow keys="Click" desc="Select entity / Place marker" />
                  <ShortcutRow keys="Right-click" desc="Context menu / Cancel mode" />
                  <ShortcutRow keys="Scroll" desc="Zoom in/out" />
                  <ShortcutRow keys="Drag" desc="Pan the map" />
                  <ShortcutRow keys="?" desc="Toggle this help" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Entity sidebar */}
        <div className="w-52 border-r border-zinc-800/60 bg-zinc-950/50 overflow-y-auto shrink-0">
          <div className="p-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Entities ({allEntities.length})
            </p>
            <div className="space-y-0.5">
              {allEntities.map((entity) => (
                <button
                  key={`${entity.type}-${entity.name}`}
                  onClick={() => { centerOn(entity.x, entity.z); selectedRef.current = entity.name; kick(); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                    selectedRef.current === entity.name ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 shrink-0 ${entity.type === 'player' ? 'rounded-sm' : 'rounded-full'}`} style={{ backgroundColor: entity.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-zinc-300 truncate">{entity.name}</p>
                    <p className="text-[9px] text-zinc-600 font-mono tabular-nums">{Math.round(entity.x)}, {Math.round(entity.z)}</p>
                  </div>
                  <span className="text-[9px] text-zinc-600 uppercase shrink-0">
                    {entity.type === 'bot' ? entity.personality?.slice(0, 3) : 'PLR'}
                  </span>
                </button>
              ))}
              {allEntities.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-4">No entities with positions</p>}
            </div>

            {/* Markers section */}
            {markersRef.current.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">
                  Markers ({markersRef.current.length})
                </p>
                <div className="space-y-0.5">
                  {markersRef.current.map((marker) => (
                    <div key={marker.id} className="flex items-center gap-1">
                      <button
                        onClick={() => { centerOn(marker.x, marker.z); selectedRef.current = `marker:${marker.id}`; kick(); }}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-zinc-800/50 transition-colors min-w-0"
                      >
                        <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: marker.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-zinc-300 truncate">{marker.name}</p>
                          <p className="text-[9px] text-zinc-600 font-mono tabular-nums">{marker.x}, {marker.z}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteMarker(marker.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0 text-[10px]"
                        title="Delete marker"
                      >x</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Zones section */}
            {zonesRef.current.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">
                  Zones ({zonesRef.current.length})
                </p>
                <div className="space-y-0.5">
                  {zonesRef.current.map((zone) => (
                    <div key={zone.id} className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (isCircleZoneValid(zone)) centerOn(zone.cx!, zone.cz!);
                          else if (isRectZoneValid(zone)) centerOn((zone.x1! + zone.x2!) / 2, (zone.z1! + zone.z2!) / 2);
                          kick();
                        }}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-zinc-800/50 transition-colors min-w-0"
                      >
                        <span className="w-2.5 h-2.5 shrink-0 rounded-sm" style={{ backgroundColor: zone.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-zinc-300 truncate">{zone.name}</p>
                          <p className="text-[9px] text-zinc-600">{zone.shape}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteZone(zone.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0 text-[10px]"
                        title="Delete zone"
                      >x</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className={`flex-1 relative ${draggingRef.current ? 'cursor-grabbing' : hoveredRef.current ? 'cursor-pointer' : markerModeRef.current || zoneModeRef.current ? 'cursor-crosshair' : 'cursor-grab'}`}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); hoveredRef.current = null; }}
            onContextMenu={handleContextMenu}
            className="w-full h-full"
          />
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800/60 rounded-lg p-3 text-[10px]">
            <p className="text-zinc-500 font-semibold uppercase tracking-wider mb-2">Legend</p>
            <div className="space-y-1.5">
              <LegendItem shape="circle" color="#6B7280" label="Bot" />
              <LegendItem shape="square" color="#60A5FA" label="Player" />
              {show.markers && markersRef.current.length > 0 && (
                <LegendItem shape="circle" color="#F59E0B" label="Marker" />
              )}
              {show.zones && zonesRef.current.length > 0 && (
                <LegendItem shape="square" color="#8B5CF6" label="Zone" />
              )}
              {show.terrain && terrainCanvas.current && (
                <>
                  <LegendItem shape="square" color="#5B8C33" label="Grass" />
                  <LegendItem shape="square" color="#3366CC" label="Water" />
                  <LegendItem shape="square" color="#7F7F7F" label="Stone" />
                  <LegendItem shape="square" color="#DBCFA0" label="Sand" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function ToggleBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded transition-colors ${active ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'}`}
      style={active && color ? { color } : undefined}
    >{label}</button>
  );
}

function LegendItem({ shape, color, label }: { shape: 'circle' | 'square'; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 ${shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`} style={{ backgroundColor: color }} />
      <span className="text-zinc-400">{label}</span>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-[10px] min-w-[28px] text-center">{keys}</kbd>
      <span className="text-zinc-400">{desc}</span>
    </div>
  );
}
