// Shared torch-lit castle scene: pixel masonry wall, torches, moss, light.
// Art is a direct transplant of the approved brainstorm mockups (spec:
// docs/superpowers/specs/2026-07-30-menu-torchlit-hall-design.md).

export function injectStylesOnce(id: string, css: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

const SCENE_CSS = `
.ct-wall{position:absolute;inset:0;width:100%;height:100%;z-index:0;}
.ct-warm{position:absolute;z-index:1;width:480px;height:480px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,150,50,0.34) 0%,rgba(255,110,25,0.16) 40%,transparent 68%);
  animation:ct-pulse 2.4s ease-in-out infinite alternate;}
.ct-warm-hot{position:absolute;z-index:1;width:200px;height:200px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(255,190,90,0.38) 0%,transparent 62%);
  animation:ct-pulse 1.6s ease-in-out infinite alternate-reverse;}
.ct-warm-corner{width:420px;height:420px;
  background:radial-gradient(circle,rgba(255,140,45,0.22) 0%,rgba(255,110,25,0.09) 45%,transparent 70%);
  animation-duration:2.6s;}
@keyframes ct-pulse{from{opacity:0.7;transform:scale(0.95);}to{opacity:1;transform:scale(1.06);}}
.ct-dim{position:absolute;inset:0;z-index:1;background:rgba(5,6,10,0.42);pointer-events:none;}
.ct-vig{position:absolute;inset:0;pointer-events:none;z-index:2;
  background:radial-gradient(ellipse at center,transparent 28%,rgba(4,5,9,0.72) 100%);}
.ct-floor{position:absolute;z-index:1;bottom:0;left:0;right:0;height:46px;pointer-events:none;
  background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.55) 100%);}
.ct-ember{position:absolute;z-index:1;width:4px;height:4px;background:#ffaa00;
  animation:ct-rise 5s linear infinite;opacity:0;pointer-events:none;}
@keyframes ct-rise{
  0%{opacity:0;transform:translate(0,0);}12%{opacity:0.95;}
  60%{opacity:0.6;transform:translate(10px,-90px);}
  100%{opacity:0;transform:translate(-4px,-170px);}}
.ct-f1{animation:ct-fr1 var(--ct-flame-dur,0.5s) steps(1) infinite;}
.ct-f2{animation:ct-fr2 var(--ct-flame-dur,0.5s) steps(1) infinite;}
@keyframes ct-fr1{0%{opacity:1;}50%{opacity:0;}100%{opacity:1;}}
@keyframes ct-fr2{0%{opacity:0;}50%{opacity:1;}100%{opacity:0;}}
/* Custom property, not a descendant selector: class selectors can't reach
   inside a <use> shadow tree, but inherited custom properties can. */
.ct-slow{--ct-flame-dur:0.62s;}
`;

export function injectCastleSceneCss(): void {
  injectStylesOnce('ct-scene', SCENE_CSS);
}

// --- pixel-art defs (viewBox 0 0 320 180; bricks 10 tall, 1px mortar) -----
// Row/moss defs are authored on a 160-wide grid and double-tiled across the
// 320-unit viewBox, halving the on-screen size of each art pixel so the
// masonry reads sharp on large windows.

const rowDefs = (p: string) => `
<g id="${p}-rowA">
  <rect x="0" y="0" width="22" height="10" fill="#383e4d"/><rect x="23" y="0" width="17" height="10" fill="#2e3340"/>
  <rect x="41" y="0" width="25" height="10" fill="#404757"/><rect x="67" y="0" width="19" height="10" fill="#333947"/>
  <rect x="87" y="0" width="23" height="10" fill="#2a2f3b"/><rect x="111" y="0" width="18" height="10" fill="#3c4251"/>
  <rect x="130" y="0" width="30" height="10" fill="#313744"/>
  <rect x="0" y="0" width="22" height="1" fill="#4a5163"/><rect x="41" y="0" width="25" height="1" fill="#4f5769"/>
  <rect x="111" y="0" width="18" height="1" fill="#474e5e"/>
  <rect x="0" y="0" width="2" height="2" fill="#12141b"/><rect x="21" y="8" width="1" height="2" fill="#12141b"/>
  <rect x="23" y="0" width="2" height="1" fill="#12141b"/><rect x="38" y="8" width="2" height="2" fill="#0d0f14"/>
  <rect x="41" y="9" width="3" height="1" fill="#12141b"/><rect x="64" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="67" y="8" width="2" height="2" fill="#12141b"/><rect x="85" y="0" width="1" height="3" fill="#0d0f14"/>
  <rect x="108" y="8" width="2" height="2" fill="#12141b"/><rect x="128" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="157" y="8" width="3" height="2" fill="#0d0f14"/>
  <rect x="10" y="0" width="2" height="1" fill="#12141b"/><rect x="31" y="9" width="3" height="1" fill="#12141b"/>
  <rect x="49" y="0" width="2" height="1" fill="#12141b"/><rect x="75" y="9" width="2" height="1" fill="#12141b"/>
  <rect x="96" y="0" width="3" height="1" fill="#12141b"/><rect x="119" y="9" width="2" height="1" fill="#12141b"/>
  <rect x="140" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="8" y="4" width="2" height="1" fill="#232833"/><rect x="50" y="6" width="3" height="1" fill="#2a3040"/>
  <rect x="93" y="3" width="2" height="2" fill="#20242e"/><rect x="14" y="2" width="1" height="3" fill="#252a35"/>
  <rect x="15" y="5" width="1" height="2" fill="#252a35"/><rect x="57" y="2" width="1" height="2" fill="#2d3444"/>
  <rect x="56" y="4" width="1" height="3" fill="#2d3444"/><rect x="135" y="3" width="2" height="1" fill="#232833"/>
  <rect x="146" y="6" width="2" height="2" fill="#262b36"/>
  <rect x="22" y="4" width="1" height="2" fill="#232833"/><rect x="66" y="6" width="1" height="1" fill="#20242e"/>
  <rect x="110" y="3" width="1" height="2" fill="#232833"/>
</g>
<g id="${p}-rowB">
  <rect x="0" y="0" width="12" height="10" fill="#2c313d"/><rect x="13" y="0" width="24" height="10" fill="#3b4150"/>
  <rect x="38" y="0" width="18" height="10" fill="#2f3542"/><rect x="57" y="0" width="26" height="10" fill="#434a5a"/>
  <rect x="84" y="0" width="16" height="10" fill="#2b303c"/><rect x="101" y="0" width="22" height="10" fill="#39404e"/>
  <rect x="124" y="0" width="20" height="10" fill="#303644"/><rect x="145" y="0" width="15" height="10" fill="#3e4554"/>
  <rect x="13" y="0" width="24" height="1" fill="#4d5466"/><rect x="57" y="0" width="26" height="1" fill="#525a6d"/>
  <rect x="101" y="0" width="22" height="1" fill="#49505f"/>
  <rect x="10" y="0" width="2" height="2" fill="#12141b"/><rect x="13" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="35" y="0" width="2" height="2" fill="#0d0f14"/><rect x="54" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="57" y="0" width="3" height="1" fill="#12141b"/><rect x="81" y="8" width="2" height="2" fill="#0d0f14"/>
  <rect x="84" y="0" width="1" height="2" fill="#12141b"/><rect x="99" y="0" width="2" height="3" fill="#0d0f14"/>
  <rect x="121" y="8" width="2" height="2" fill="#12141b"/><rect x="143" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="6" y="9" width="2" height="1" fill="#12141b"/><rect x="24" y="0" width="3" height="1" fill="#12141b"/>
  <rect x="44" y="9" width="2" height="1" fill="#12141b"/><rect x="68" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="91" y="9" width="3" height="1" fill="#12141b"/><rect x="112" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="133" y="9" width="2" height="1" fill="#12141b"/><rect x="152" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="20" y="5" width="3" height="1" fill="#262b36"/><rect x="66" y="3" width="2" height="2" fill="#2d3342"/>
  <rect x="130" y="6" width="3" height="1" fill="#232833"/><rect x="29" y="2" width="1" height="3" fill="#2a2f3c"/>
  <rect x="28" y="5" width="1" height="2" fill="#2a2f3c"/><rect x="74" y="3" width="1" height="4" fill="#333a49"/>
  <rect x="105" y="4" width="2" height="1" fill="#262b36"/><rect x="149" y="3" width="1" height="3" fill="#2b3140"/>
  <rect x="37" y="5" width="1" height="2" fill="#232833"/><rect x="83" y="2" width="1" height="1" fill="#20242e"/>
  <rect x="123" y="6" width="1" height="2" fill="#232833"/>
</g>
<g id="${p}-rowC">
  <rect x="0" y="0" width="19" height="10" fill="#3f4656"/><rect x="20" y="0" width="21" height="10" fill="#2d323f"/>
  <rect x="42" y="0" width="15" height="10" fill="#3a4150"/><rect x="58" y="0" width="24" height="10" fill="#313745"/>
  <rect x="83" y="0" width="20" height="10" fill="#3d4453"/><rect x="104" y="0" width="17" height="10" fill="#293039"/>
  <rect x="122" y="0" width="23" height="10" fill="#363c4b"/><rect x="146" y="0" width="14" height="10" fill="#2f3441"/>
  <rect x="0" y="0" width="19" height="1" fill="#4e5568"/><rect x="58" y="0" width="24" height="1" fill="#454c5c"/>
  <rect x="122" y="0" width="23" height="1" fill="#4a5163"/>
  <rect x="17" y="0" width="2" height="2" fill="#12141b"/><rect x="20" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="39" y="0" width="2" height="3" fill="#0d0f14"/><rect x="42" y="8" width="3" height="2" fill="#12141b"/>
  <rect x="55" y="0" width="2" height="2" fill="#12141b"/><rect x="80" y="8" width="2" height="2" fill="#0d0f14"/>
  <rect x="83" y="0" width="2" height="1" fill="#12141b"/><rect x="101" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="104" y="0" width="1" height="3" fill="#0d0f14"/><rect x="120" y="0" width="2" height="2" fill="#12141b"/>
  <rect x="144" y="8" width="2" height="2" fill="#12141b"/>
  <rect x="8" y="9" width="3" height="1" fill="#12141b"/><rect x="28" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="50" y="9" width="2" height="1" fill="#12141b"/><rect x="70" y="0" width="3" height="1" fill="#12141b"/>
  <rect x="90" y="9" width="2" height="1" fill="#12141b"/><rect x="113" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="132" y="9" width="3" height="1" fill="#12141b"/><rect x="153" y="0" width="2" height="1" fill="#12141b"/>
  <rect x="30" y="4" width="2" height="2" fill="#22262f"/><rect x="90" y="6" width="3" height="1" fill="#2b3140"/>
  <rect x="110" y="2" width="2" height="1" fill="#1f232c"/><rect x="11" y="3" width="1" height="3" fill="#343b4a"/>
  <rect x="12" y="6" width="1" height="2" fill="#343b4a"/><rect x="47" y="2" width="1" height="2" fill="#2e3543"/>
  <rect x="64" y="5" width="2" height="1" fill="#262b36"/><rect x="127" y="3" width="1" height="4" fill="#2b303d"/>
  <rect x="138" y="6" width="2" height="1" fill="#2b303d"/>
  <rect x="19" y="4" width="1" height="2" fill="#232833"/><rect x="57" y="6" width="1" height="1" fill="#20242e"/>
  <rect x="121" y="2" width="1" height="2" fill="#232833"/>
</g>`;

const mossDefs = (p: string) => `
<g id="${p}-mossA">
  <rect x="0" y="0" width="6" height="2" fill="#3f5c2c"/><rect x="1" y="-1" width="3" height="1" fill="#557a39"/>
  <rect x="2" y="2" width="2" height="2" fill="#2f4720"/><rect x="5" y="1" width="2" height="1" fill="#557a39"/>
</g>
<g id="${p}-mossB">
  <rect x="0" y="0" width="9" height="2" fill="#3a5629"/><rect x="2" y="-1" width="4" height="1" fill="#557a39"/>
  <rect x="6" y="-1" width="2" height="1" fill="#6b9147"/><rect x="1" y="2" width="2" height="3" fill="#2f4720"/>
  <rect x="6" y="2" width="2" height="2" fill="#3a5629"/>
</g>
<g id="${p}-mossC">
  <rect x="0" y="0" width="4" height="1" fill="#557a39"/><rect x="1" y="1" width="2" height="2" fill="#3f5c2c"/>
</g>`;

const torchDef = (p: string) => `
<g id="${p}-torch">
  <rect x="56" y="102" width="10" height="4" fill="#23262e"/><rect x="52" y="106" width="18" height="4" fill="#262a33"/>
  <rect x="48" y="110" width="26" height="4" fill="#23262e"/><rect x="52" y="114" width="18" height="4" fill="#1e2128"/>
  <rect x="56" y="118" width="10" height="4" fill="#1a1d23"/><rect x="58" y="110" width="6" height="4" fill="#3b3f4a"/>
  <rect x="56" y="106" width="4" height="2" fill="#454a57"/><rect x="60" y="106" width="4" height="2" fill="#4f3a1e"/>
  <rect x="49" y="111" width="2" height="2" fill="#12141b"/><rect x="71" y="111" width="2" height="2" fill="#12141b"/>
  <rect x="57" y="120" width="8" height="1" fill="#12141b"/>
  <rect x="58" y="94" width="6" height="8" fill="#2c2f38"/><rect x="60" y="90" width="6" height="6" fill="#2c2f38"/>
  <rect x="58" y="94" width="2" height="6" fill="#3d414d"/><rect x="59" y="92" width="1" height="4" fill="#24272e"/>
  <rect x="63" y="96" width="1" height="5" fill="#24272e"/>
  <rect x="60" y="84" width="6" height="6" fill="#2c2f38"/><rect x="56" y="80" width="14" height="4" fill="#343845"/>
  <rect x="54" y="76" width="18" height="4" fill="#3a3f4d"/><rect x="52" y="72" width="22" height="4" fill="#404657"/>
  <rect x="50" y="68" width="26" height="4" fill="#484f61"/><rect x="50" y="68" width="26" height="1" fill="#565d72"/>
  <rect x="50" y="66" width="4" height="2" fill="#484f61"/><rect x="58" y="66" width="4" height="2" fill="#484f61"/>
  <rect x="66" y="66" width="4" height="2" fill="#484f61"/><rect x="72" y="66" width="4" height="2" fill="#484f61"/>
  <rect x="66" y="68" width="6" height="2" fill="#8a5c26"/><rect x="68" y="72" width="4" height="4" fill="#6e4a22"/>
  <rect x="66" y="76" width="4" height="2" fill="#5c3d1c"/><rect x="62" y="84" width="2" height="4" fill="#4a3521"/>
  <g class="ct-f1">
    <rect x="52" y="63" width="22" height="3" fill="#922908"/><rect x="53" y="60" width="20" height="3" fill="#922908"/>
    <rect x="54" y="57" width="18" height="3" fill="#922908"/><rect x="55" y="54" width="16" height="3" fill="#922908"/>
    <rect x="54" y="51" width="16" height="3" fill="#922908"/><rect x="55" y="48" width="14" height="3" fill="#922908"/>
    <rect x="56" y="45" width="12" height="3" fill="#922908"/><rect x="56" y="42" width="12" height="3" fill="#922908"/>
    <rect x="57" y="39" width="10" height="3" fill="#922908"/><rect x="56" y="36" width="8" height="3" fill="#922908"/>
    <rect x="58" y="33" width="6" height="3" fill="#922908"/><rect x="58" y="30" width="4" height="3" fill="#922908"/>
    <rect x="59" y="27" width="2" height="3" fill="#922908"/>
    <rect x="54" y="63" width="18" height="3" fill="#e8641c"/><rect x="55" y="60" width="16" height="3" fill="#e8641c"/>
    <rect x="56" y="57" width="14" height="3" fill="#e8641c"/><rect x="57" y="54" width="12" height="3" fill="#e8641c"/>
    <rect x="56" y="51" width="12" height="3" fill="#e8641c"/><rect x="57" y="48" width="10" height="3" fill="#e8641c"/>
    <rect x="58" y="45" width="8" height="3" fill="#e8641c"/><rect x="58" y="42" width="8" height="3" fill="#e8641c"/>
    <rect x="58" y="39" width="6" height="3" fill="#e8641c"/><rect x="58" y="36" width="4" height="3" fill="#e8641c"/>
    <rect x="59" y="33" width="2" height="3" fill="#e8641c"/>
    <rect x="57" y="63" width="12" height="3" fill="#ffb347"/><rect x="58" y="60" width="10" height="3" fill="#ffb347"/>
    <rect x="59" y="57" width="8" height="3" fill="#ffb347"/><rect x="60" y="54" width="6" height="3" fill="#ffb347"/>
    <rect x="59" y="51" width="6" height="3" fill="#ffb347"/><rect x="60" y="48" width="4" height="3" fill="#ffb347"/>
    <rect x="60" y="45" width="4" height="3" fill="#ffb347"/><rect x="60" y="42" width="2" height="3" fill="#ffb347"/>
    <rect x="59" y="63" width="8" height="3" fill="#ffe9a0"/><rect x="60" y="60" width="6" height="3" fill="#ffe9a0"/>
    <rect x="60" y="57" width="4" height="3" fill="#ffe9a0"/><rect x="61" y="54" width="2" height="3" fill="#ffe9a0"/>
    <rect x="60" y="51" width="2" height="3" fill="#ffe9a0"/>
  </g>
  <g class="ct-f2">
    <rect x="52" y="63" width="22" height="3" fill="#922908"/><rect x="54" y="60" width="21" height="3" fill="#922908"/>
    <rect x="56" y="57" width="18" height="3" fill="#922908"/><rect x="57" y="54" width="16" height="3" fill="#922908"/>
    <rect x="58" y="51" width="14" height="3" fill="#922908"/><rect x="60" y="48" width="12" height="3" fill="#922908"/>
    <rect x="60" y="45" width="12" height="3" fill="#922908"/><rect x="61" y="42" width="10" height="3" fill="#922908"/>
    <rect x="62" y="39" width="8" height="3" fill="#922908"/><rect x="62" y="36" width="6" height="3" fill="#922908"/>
    <rect x="63" y="33" width="4" height="3" fill="#922908"/><rect x="64" y="30" width="4" height="3" fill="#922908"/>
    <rect x="64" y="27" width="2" height="3" fill="#922908"/><rect x="65" y="24" width="2" height="3" fill="#922908"/>
    <rect x="54" y="63" width="18" height="3" fill="#e8641c"/><rect x="57" y="60" width="16" height="3" fill="#e8641c"/>
    <rect x="58" y="57" width="14" height="3" fill="#e8641c"/><rect x="59" y="54" width="10" height="3" fill="#e8641c"/>
    <rect x="60" y="51" width="10" height="3" fill="#e8641c"/><rect x="61" y="48" width="8" height="3" fill="#e8641c"/>
    <rect x="62" y="45" width="6" height="3" fill="#e8641c"/><rect x="62" y="42" width="6" height="3" fill="#e8641c"/>
    <rect x="63" y="39" width="4" height="3" fill="#e8641c"/><rect x="63" y="36" width="2" height="3" fill="#e8641c"/>
    <rect x="57" y="63" width="12" height="3" fill="#ffb347"/><rect x="59" y="60" width="10" height="3" fill="#ffb347"/>
    <rect x="60" y="57" width="6" height="3" fill="#ffb347"/><rect x="61" y="54" width="6" height="3" fill="#ffb347"/>
    <rect x="62" y="51" width="4" height="3" fill="#ffb347"/><rect x="62" y="48" width="4" height="3" fill="#ffb347"/>
    <rect x="63" y="45" width="2" height="3" fill="#ffb347"/>
    <rect x="59" y="63" width="8" height="3" fill="#ffe9a0"/><rect x="61" y="60" width="6" height="3" fill="#ffe9a0"/>
    <rect x="61" y="57" width="4" height="3" fill="#ffe9a0"/><rect x="62" y="54" width="2" height="3" fill="#ffe9a0"/>
  </g>
</g>`;

// 17 courses × 2 side-by-side tiles cover 320x180. Per-course x jitter keeps
// the vertical seam between tiles from lining up course to course.
const ROW_BANDS = ['A', 'B', 'C', 'B', 'A', 'C', 'B', 'A', 'C', 'A', 'B', 'C', 'A', 'C', 'B', 'A', 'C'] as const;
const ROW_JITTER = [0, -30, -14, -22, -8, -27, -18, -6, -26, -12, -3, -20, -9, -29, -15, -4, -23];

const rowPlacements = (p: string) => ROW_BANDS.map((band, i) =>
  `<use href="#${p}-row${band}" x="${ROW_JITTER[i]}" y="${i * 11}"/>` +
  `<use href="#${p}-row${band}" x="${ROW_JITTER[i] + 160}" y="${i * 11}"/>`
).join('\n');

const damage = `
<rect x="0" y="152" width="7" height="3" fill="#0d0f14"/><rect x="304" y="130" width="8" height="4" fill="#0d0f14"/>
<rect x="126" y="20" width="5" height="2" fill="#0d0f14"/><rect x="68" y="42" width="4" height="2" fill="#0d0f14"/>
<rect x="194" y="86" width="3" height="3" fill="#0d0f14"/><rect x="28" y="108" width="4" height="2" fill="#0d0f14"/>
<rect x="282" y="64" width="3" height="2" fill="#0d0f14"/><rect x="152" y="130" width="4" height="2" fill="#0d0f14"/>
<rect x="236" y="152" width="3" height="3" fill="#0d0f14"/><rect x="98" y="174" width="4" height="2" fill="#0d0f14"/>
<rect x="252" y="20" width="6" height="3" fill="#0d0f14"/><rect x="44" y="64" width="3" height="2" fill="#0d0f14"/>
<rect x="310" y="86" width="5" height="2" fill="#0d0f14"/><rect x="180" y="42" width="3" height="2" fill="#0d0f14"/>
<rect x="14" y="20" width="4" height="2" fill="#0d0f14"/><rect x="216" y="108" width="4" height="3" fill="#0d0f14"/>
<rect x="202" y="22" width="1" height="4" fill="#181b23"/><rect x="204" y="30" width="1" height="3" fill="#181b23"/>
<rect x="206" y="36" width="1" height="4" fill="#181b23"/><rect x="204" y="44" width="1" height="3" fill="#181b23"/>
<rect x="52" y="132" width="1" height="3" fill="#181b23"/><rect x="50" y="138" width="1" height="4" fill="#181b23"/>
<rect x="48" y="146" width="1" height="3" fill="#181b23"/>
<rect x="272" y="120" width="1" height="4" fill="#181b23"/><rect x="273" y="124" width="1" height="3" fill="#181b23"/>
<rect x="271" y="127" width="1" height="4" fill="#181b23"/>
<rect x="90" y="64" width="2" height="1" fill="#2a3040"/><rect x="176" y="108" width="2" height="1" fill="#2d3342"/>
<rect x="258" y="42" width="1" height="1" fill="#2a3040"/><rect x="16" y="64" width="2" height="1" fill="#262c38"/>
<rect x="140" y="86" width="1" height="1" fill="#2d3342"/><rect x="300" y="108" width="2" height="1" fill="#262c38"/>
<rect x="116" y="152" width="2" height="1" fill="#2a3040"/><rect x="212" y="130" width="1" height="1" fill="#2d3342"/>
<rect x="76" y="152" width="2" height="1" fill="#262c38"/><rect x="246" y="64" width="2" height="1" fill="#2a3040"/>`;

const mossNormal = (p: string) => `
<use href="#${p}-mossB" x="8" y="150"/><use href="#${p}-mossA" x="60" y="172"/><use href="#${p}-mossB" x="140" y="174"/>
<use href="#${p}-mossA" x="224" y="162"/><use href="#${p}-mossB" x="280" y="140"/><use href="#${p}-mossA" x="296" y="174"/>
<use href="#${p}-mossC" x="104" y="130"/><use href="#${p}-mossC" x="192" y="118"/><use href="#${p}-mossA" x="4" y="86"/>
<use href="#${p}-mossC" x="300" y="76"/><use href="#${p}-mossC" x="128" y="42"/><use href="#${p}-mossA" x="236" y="64"/>
<use href="#${p}-mossC" x="40" y="118"/><use href="#${p}-mossC" x="68" y="40"/><use href="#${p}-mossC" x="152" y="128"/>
<use href="#${p}-mossC" x="28" y="106"/><use href="#${p}-mossB" x="184" y="170"/><use href="#${p}-mossA" x="110" y="166"/>
<use href="#${p}-mossC" x="252" y="150"/><use href="#${p}-mossC" x="90" y="94"/><use href="#${p}-mossC" x="210" y="90"/>
<use href="#${p}-mossC" x="308" y="120"/>`;

const mossSparse = (p: string) => `
<use href="#${p}-mossA" x="8" y="150"/><use href="#${p}-mossC" x="300" y="84"/><use href="#${p}-mossA" x="260" y="172"/>
<use href="#${p}-mossC" x="48" y="108"/><use href="#${p}-mossC" x="180" y="130"/><use href="#${p}-mossB" x="120" y="172"/>
<use href="#${p}-mossC" x="228" y="116"/>`;

export type WallOpts = { idPrefix?: string; mossDensity?: 'normal' | 'sparse' };

export function buildWallSvg(opts: WallOpts = {}): string {
  const p = opts.idPrefix ?? 'ct';
  const moss = opts.mossDensity === 'sparse' ? mossSparse(p) : mossNormal(p);
  return `<svg class="ct-wall" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<rect x="0" y="0" width="320" height="180" fill="#12141b"/>
<defs>${rowDefs(p)}${mossDefs(p)}${torchDef(p)}</defs>
${rowPlacements(p)}${damage}${moss}
<!--TORCHES-->
</svg>`;
}

// x=-30 pushes the sconce into the outer margin beside the lobby panels
// (panels are centered at max-width 1060, so wide windows leave a clear
// strip at each edge; on narrow windows the torch tucks behind the panel,
// which is fine — it's ambient).
export function buildTorch(idPrefix: string, side: 'left' | 'right'): string {
  if (side === 'left') return `<use href="#${idPrefix}-torch" x="-30" y="0"/>`;
  return `<g transform="translate(320,0) scale(-1,1)" class="ct-slow"><use href="#${idPrefix}-torch" x="-30" y="0"/></g>`;
}

export function buildHallScene(): string {
  const p = 'cth';
  const wall = buildWallSvg({ idPrefix: p })
    .replace('<!--TORCHES-->', buildTorch(p, 'left') + buildTorch(p, 'right'));
  return `${wall}
<div class="ct-warm" style="left:-130px;top:-40px;"></div>
<div class="ct-warm" style="right:-130px;top:-40px;animation-delay:-1.2s;"></div>
<div class="ct-warm-hot" style="left:32px;top:70px;"></div>
<div class="ct-warm-hot" style="right:32px;top:70px;animation-delay:-0.8s;"></div>
<div class="ct-ember" style="left:120px;top:130px;"></div>
<div class="ct-ember" style="left:132px;top:140px;animation-delay:-2.3s;"></div>
<div class="ct-ember" style="left:112px;top:136px;animation-delay:-3.7s;"></div>
<div class="ct-ember" style="right:120px;top:130px;animation-delay:-1.4s;"></div>
<div class="ct-ember" style="right:134px;top:140px;animation-delay:-3s;"></div>
<div class="ct-ember" style="right:110px;top:136px;animation-delay:-4.5s;"></div>
<div class="ct-floor"></div>
<div class="ct-vig"></div>`;
}

export function buildDimBackdrop(idPrefix: string): string {
  return `${buildWallSvg({ idPrefix, mossDensity: 'sparse' }).replace('<!--TORCHES-->', '')}
<div class="ct-dim"></div>
<div class="ct-warm ct-warm-corner" style="left:-260px;bottom:-260px;"></div>
<div class="ct-warm ct-warm-corner" style="right:-260px;bottom:-260px;animation-delay:-1.4s;"></div>
<div class="ct-vig"></div>`;
}
