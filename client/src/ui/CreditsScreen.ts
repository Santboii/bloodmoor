// client/src/ui/CreditsScreen.ts
// LPC art requires attribution (CC-BY-SA / OGA-BY / GPL). Renders the vendored
// CREDITS.filtered.csv (rows scoped to the sheets we ship — the upstream
// generator's full CREDITS.csv is ~3.9MB and must not be fetched at runtime),
// inside a pixel-theme overlay.
export class CreditsScreen {
  private el: HTMLElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = 'position:fixed;inset:0;z-index:500;display:none;background:rgba(14,11,22,0.9);overflow-y:auto;';
    this.el.innerHTML = `
      <div class="px-panel" style="max-width:640px;margin:48px auto;padding:24px">
        <div class="px-title" style="margin-bottom:12px">Art Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Character sprites are from the <b>Liberated Pixel Cup</b> collection
          (lpc.opengameart.org), licensed CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.
        </div>
        <pre id="credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <button id="credits-close" class="px-btn" style="margin-top:16px">Close</button>
      </div>`;
    container.appendChild(this.el);
    this.el.querySelector('#credits-close')!.addEventListener('click', () => this.hide());
  }

  async show(): Promise<void> {
    this.el.style.display = 'block';
    const body = this.el.querySelector('#credits-body')!;
    if (!body.textContent) {
      try {
        const res = await fetch('/assets/lpc/CREDITS.filtered.csv');
        if (!res.ok) throw new Error(`credits fetch failed: ${res.status}`);
        body.textContent = formatCredits(await res.text());
      } catch {
        body.textContent = 'Credits file missing — see client/public/assets/lpc/CREDITS.csv';
      }
    }
  }

  hide(): void { this.el.style.display = 'none'; }
}

// One CSV field, handling quotes/embedded commas ("" -> escaped quote).
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') { if (line[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { fields.push(field); field = ''; }
    else field += c;
  }
  fields.push(field);
  return fields;
}

// filename,notes,authors,licenses,urls -> "filename — authors (licenses)" per row.
function formatCredits(csv: string): string {
  const lines = csv.split('\n').filter(l => l.trim().length > 0).slice(1);
  return lines
    .map(parseCsvRow)
    .map(([filename, , authors, licenses]) => `${filename} — ${authors?.trim()} (${licenses?.trim()})`)
    .join('\n\n');
}
