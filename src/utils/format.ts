export function timestamp(format = "yyyy-MM-dd HH:mm:ss.SSS"): string {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const map: Record<string, string> = {
    yyyy: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    dd: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    SSS: pad(d.getMilliseconds(), 3),
  };
  return format.replace(/yyyy|MM|dd|HH|mm|ss|SSS/g, (m) => map[m]);
}

const ANSI: Record<string, string> = {
  reset: "\u001b[0m",
  gray: "\u001b[90m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  white: "\u001b[37m",
};

const AUTO_COLORS = [
  "cyan",
  "yellow",
  "green",
  "magenta",
  "blue",
  "white",
  "gray",
  "red",
] as const;

function makeTrueColor(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.floor(n)));
  return `\u001b[38;2;${clamp(r)};${clamp(g)};${clamp(b)}m`;
}

export function colorize(text: string, color?: string, index?: number): string {
  if (!color) return text;
  let selected = color.trim();
  if (selected === "auto") {
    selected = AUTO_COLORS[(index ?? 0) % AUTO_COLORS.length];
  }
  // Named ANSI
  if (ANSI[selected]) {
    return `${ANSI[selected]}${text}${ANSI.reset}`;
  }
  // Hex: #RRGGBB
  const hex = selected.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const h = hex[1];
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const code = makeTrueColor(r, g, b);
    return `${code}${text}${ANSI.reset}`;
  }
  // rgb(r,g,b)
  const rgb = selected.match(
    /^rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\)$/i
  );
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    const code = makeTrueColor(r, g, b);
    return `${code}${text}${ANSI.reset}`;
  }
  // Unknown -> no color
  return text;
}
