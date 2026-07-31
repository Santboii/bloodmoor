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

// --- pixel-art defs (viewBox 0 0 160 90; bricks 10 tall, 1px mortar) ------

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
  <rect x="28" y="51" width="5" height="2" fill="#23262e"/><rect x="26" y="53" width="9" height="2" fill="#262a33"/>
  <rect x="24" y="55" width="13" height="2" fill="#23262e"/><rect x="26" y="57" width="9" height="2" fill="#1e2128"/>
  <rect x="28" y="59" width="5" height="2" fill="#1a1d23"/><rect x="29" y="55" width="3" height="2" fill="#3b3f4a"/>
  <rect x="28" y="53" width="2" height="1" fill="#454a57"/>
  <rect x="29" y="47" width="3" height="4" fill="#2c2f38"/><rect x="30" y="45" width="3" height="3" fill="#2c2f38"/>
  <rect x="29" y="47" width="1" height="3" fill="#3d414d"/>
  <rect x="30" y="42" width="3" height="3" fill="#2c2f38"/><rect x="28" y="40" width="7" height="2" fill="#343845"/>
  <rect x="27" y="38" width="9" height="2" fill="#3a3f4d"/><rect x="26" y="36" width="11" height="2" fill="#404657"/>
  <rect x="25" y="34" width="13" height="2" fill="#484f61"/>
  <rect x="25" y="33" width="2" height="1" fill="#484f61"/><rect x="29" y="33" width="2" height="1" fill="#484f61"/>
  <rect x="33" y="33" width="2" height="1" fill="#484f61"/><rect x="36" y="33" width="2" height="1" fill="#484f61"/>
  <rect x="33" y="34" width="3" height="1" fill="#8a5c26"/><rect x="34" y="36" width="2" height="2" fill="#6e4a22"/>
  <rect x="33" y="38" width="2" height="1" fill="#5c3d1c"/><rect x="31" y="42" width="1" height="2" fill="#4a3521"/>
  <rect x="30" y="53" width="2" height="1" fill="#4f3a1e"/>
  <g class="ct-f1">
    <rect x="26" y="30" width="11" height="3" fill="#922908"/><rect x="27" y="27" width="9" height="3" fill="#922908"/>
    <rect x="27" y="24" width="8" height="3" fill="#922908"/><rect x="28" y="21" width="6" height="3" fill="#922908"/>
    <rect x="28" y="18" width="4" height="3" fill="#922908"/><rect x="29" y="15" width="2" height="3" fill="#922908"/>
    <rect x="27" y="30" width="9" height="3" fill="#e8641c"/><rect x="28" y="27" width="7" height="3" fill="#e8641c"/>
    <rect x="28" y="24" width="6" height="3" fill="#e8641c"/><rect x="29" y="21" width="4" height="3" fill="#e8641c"/>
    <rect x="29" y="18" width="2" height="3" fill="#e8641c"/>
    <rect x="29" y="30" width="6" height="3" fill="#ffb347"/><rect x="29" y="27" width="5" height="3" fill="#ffb347"/>
    <rect x="30" y="24" width="3" height="3" fill="#ffb347"/><rect x="30" y="21" width="2" height="2" fill="#ffb347"/>
    <rect x="30" y="30" width="4" height="3" fill="#ffe9a0"/><rect x="30" y="28" width="3" height="2" fill="#ffe9a0"/>
    <rect x="31" y="26" width="2" height="2" fill="#ffe9a0"/>
  </g>
  <g class="ct-f2">
    <rect x="26" y="30" width="11" height="3" fill="#922908"/><rect x="27" y="27" width="10" height="3" fill="#922908"/>
    <rect x="28" y="24" width="8" height="3" fill="#922908"/><rect x="30" y="21" width="6" height="3" fill="#922908"/>
    <rect x="31" y="18" width="4" height="3" fill="#922908"/><rect x="32" y="14" width="2" height="4" fill="#922908"/>
    <rect x="27" y="30" width="9" height="3" fill="#e8641c"/><rect x="29" y="27" width="7" height="3" fill="#e8641c"/>
    <rect x="30" y="24" width="5" height="3" fill="#e8641c"/><rect x="31" y="21" width="4" height="3" fill="#e8641c"/>
    <rect x="32" y="18" width="2" height="3" fill="#e8641c"/>
    <rect x="29" y="30" width="6" height="3" fill="#ffb347"/><rect x="30" y="27" width="5" height="3" fill="#ffb347"/>
    <rect x="31" y="24" width="3" height="3" fill="#ffb347"/><rect x="32" y="22" width="2" height="2" fill="#ffb347"/>
    <rect x="30" y="30" width="4" height="3" fill="#ffe9a0"/><rect x="31" y="28" width="3" height="2" fill="#ffe9a0"/>
    <rect x="32" y="26" width="2" height="2" fill="#ffe9a0"/>
  </g>
</g>`;

const rowPlacements = (p: string) => `
<use href="#${p}-rowA" y="0"/><use href="#${p}-rowB" y="11"/><use href="#${p}-rowC" y="22"/>
<use href="#${p}-rowB" x="-30" y="33"/><use href="#${p}-rowA" x="-14" y="44"/><use href="#${p}-rowC" x="-22" y="55"/>
<use href="#${p}-rowB" y="66"/><use href="#${p}-rowA" x="-8" y="77"/><use href="#${p}-rowC" y="88"/>`;

const damage = `
<rect x="0" y="76" width="7" height="3" fill="#0d0f14"/><rect x="152" y="65" width="8" height="4" fill="#0d0f14"/>
<rect x="63" y="10" width="5" height="2" fill="#0d0f14"/><rect x="34" y="21" width="4" height="2" fill="#0d0f14"/>
<rect x="97" y="43" width="3" height="3" fill="#0d0f14"/><rect x="14" y="54" width="4" height="2" fill="#0d0f14"/>
<rect x="141" y="32" width="3" height="2" fill="#0d0f14"/><rect x="76" y="65" width="4" height="2" fill="#0d0f14"/>
<rect x="118" y="76" width="3" height="3" fill="#0d0f14"/><rect x="49" y="87" width="4" height="2" fill="#0d0f14"/>
<rect x="101" y="11" width="1" height="4" fill="#181b23"/><rect x="102" y="15" width="1" height="3" fill="#181b23"/>
<rect x="103" y="18" width="1" height="4" fill="#181b23"/><rect x="102" y="22" width="1" height="3" fill="#181b23"/>
<rect x="26" y="66" width="1" height="3" fill="#181b23"/><rect x="25" y="69" width="1" height="4" fill="#181b23"/>
<rect x="24" y="73" width="1" height="3" fill="#181b23"/>
<rect x="45" y="32" width="2" height="1" fill="#2a3040"/><rect x="88" y="54" width="2" height="1" fill="#2d3342"/>
<rect x="129" y="21" width="1" height="1" fill="#2a3040"/><rect x="8" y="32" width="2" height="1" fill="#262c38"/>
<rect x="70" y="43" width="1" height="1" fill="#2d3342"/><rect x="150" y="54" width="2" height="1" fill="#262c38"/>
<rect x="58" y="76" width="2" height="1" fill="#2a3040"/><rect x="106" y="65" width="1" height="1" fill="#2d3342"/>`;

const mossNormal = (p: string) => `
<use href="#${p}-mossB" x="4" y="75"/><use href="#${p}-mossA" x="30" y="86"/><use href="#${p}-mossB" x="70" y="87"/>
<use href="#${p}-mossA" x="112" y="81"/><use href="#${p}-mossB" x="140" y="70"/><use href="#${p}-mossA" x="148" y="87"/>
<use href="#${p}-mossC" x="52" y="65"/><use href="#${p}-mossC" x="96" y="59"/><use href="#${p}-mossA" x="2" y="43"/>
<use href="#${p}-mossC" x="150" y="38"/><use href="#${p}-mossC" x="64" y="21"/><use href="#${p}-mossA" x="118" y="32"/>
<use href="#${p}-mossC" x="20" y="59"/><use href="#${p}-mossC" x="34" y="20"/><use href="#${p}-mossC" x="76" y="64"/>
<use href="#${p}-mossC" x="14" y="53"/>`;

const mossSparse = (p: string) => `
<use href="#${p}-mossA" x="4" y="75"/><use href="#${p}-mossC" x="150" y="42"/><use href="#${p}-mossA" x="130" y="86"/>
<use href="#${p}-mossC" x="24" y="54"/><use href="#${p}-mossC" x="90" y="65"/>`;

export type WallOpts = { idPrefix?: string; mossDensity?: 'normal' | 'sparse' };

export function buildWallSvg(opts: WallOpts = {}): string {
  const p = opts.idPrefix ?? 'ct';
  const moss = opts.mossDensity === 'sparse' ? mossSparse(p) : mossNormal(p);
  return `<svg class="ct-wall" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<rect x="0" y="0" width="160" height="90" fill="#12141b"/>
<defs>${rowDefs(p)}${mossDefs(p)}${torchDef(p)}</defs>
${rowPlacements(p)}${damage}${moss}
<!--TORCHES-->
</svg>`;
}

export function buildTorch(idPrefix: string, side: 'left' | 'right'): string {
  if (side === 'left') return `<use href="#${idPrefix}-torch" x="-4" y="0"/>`;
  return `<g transform="translate(160,0) scale(-1,1)" class="ct-slow"><use href="#${idPrefix}-torch" x="-4" y="0"/></g>`;
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
