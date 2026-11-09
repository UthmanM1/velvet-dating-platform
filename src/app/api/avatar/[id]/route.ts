import { createHash } from "node:crypto";

/**
 * Original generated portrait artwork for demo members: abstract, tasteful and contains no real
 * person's likeness or any personal data. Deterministic per member id and photo index.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const v = Number(new URL(req.url).searchParams.get("v") ?? 0) || 0;
  const h = createHash("sha256").update(`${id}:${v}`).digest();
  const palettes = [
    ["#2a0a14", "#7b1e3a", "#e6cfa3"],
    ["#14090d", "#5a1530", "#d9b98a"],
    ["#1b1013", "#8a2c47", "#f1dfbd"],
    ["#0f0a0c", "#4a1226", "#c9a77a"],
    ["#201016", "#6d1d3b", "#ead3a9"],
  ];
  const [c1, c2, c3] = palettes[h[0] % palettes.length];
  const skin = ["#d9b79b", "#c49a7c", "#e8cdb4", "#a97c5e", "#8d6249", "#f0d9c4"][h[1] % 6];
  const hair = ["#1a1110", "#3b2418", "#6b4226", "#a67b4b", "#0e0a0a", "#5a2a2a"][h[2] % 6];
  const long = h[3] % 2 === 0;
  const cx = 150 + ((h[4] % 40) - 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" role="img" aria-label="Illustrated portrait">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<radialGradient id="glow" cx="${(h[5] % 60) + 20}%" cy="25%" r="70%"><stop offset="0" stop-color="${c3}" stop-opacity=".55"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient>
<linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c3}" stop-opacity=".9"/><stop offset="1" stop-color="${c2}"/></linearGradient>
</defs>
<rect width="300" height="400" fill="url(#bg)"/><rect width="300" height="400" fill="url(#glow)"/>
${long ? `<path d="M${cx - 70} 215 C${cx - 90} 120 ${cx - 40} 70 ${cx} 70 C${cx + 40} 70 ${cx + 90} 120 ${cx + 70} 215 L${cx + 78} 330 L${cx - 78} 330 Z" fill="${hair}"/>` : ""}
<path d="M${cx - 95} 400 C${cx - 90} 318 ${cx - 45} 292 ${cx} 292 C${cx + 45} 292 ${cx + 90} 318 ${cx + 95} 400 Z" fill="url(#cloth)"/>
<rect x="${cx - 16}" y="248" width="32" height="52" rx="14" fill="${skin}"/>
<ellipse cx="${cx}" cy="190" rx="52" ry="66" fill="${skin}"/>
<path d="M${cx - 56} 178 C${cx - 56} 118 ${cx - 20} 112 ${cx + 4} 112 C${cx + 44} 112 ${cx + 58} 140 ${cx + 54} 182 C${cx + 40} 150 ${cx + 8} 142 ${cx - 56} 178 Z" fill="${hair}"/>
<rect x="0" y="0" width="300" height="400" fill="none" stroke="${c3}" stroke-opacity=".15"/>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
