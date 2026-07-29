var xs=Object.defineProperty;var bs=(o,e,s)=>e in o?xs(o,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):o[e]=s;var l=(o,e,s)=>bs(o,typeof e!="symbol"?e+"":e,s);import{M as _,O as Nt,B as Pe,F as ct,S as ee,U as Fe,V as B,W as ve,H as ye,N as gs,C as qt,a as Ce,b as R,A as Bt,c as F,R as vs,d as ys,e as ws,L as ks,f as Ms,g as Ss,h as Dt,i as Cs,j as _s,k as Ts,P as Es,l as Ps,m as As,n as et,o as Rs,p as Ls,q as zs,D as Is,r as pe,G as ce,s as Ut,t as ne,u as Ht,v as tt,w as Gt,x as jt,y as Yt,z as je,E as Xt,I as we,J as qe,K as Be,Q as Os,T as Fs,X as st,Y as Ye,Z as $s,_ as Ns,$ as Vt}from"./three-keT56WUa.js";import{l as qs,c as Bs}from"./vendor-k1XoXMcf.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&t(r)}).observe(document,{childList:!0,subtree:!0});function s(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function t(i){if(i.ep)return;i.ep=!0;const a=s(i);fetch(i.href,a)}})();const Wt={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class fe{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Ds=new Nt(-1,1,1,-1,0,1);class Us extends Pe{constructor(){super(),this.setAttribute("position",new ct([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new ct([0,2,0,0,2,0],2))}}const Hs=new Us;class it{constructor(e){this._mesh=new _(Hs,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Ds)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Xe extends fe{constructor(e,s){super(),this.textureID=s!==void 0?s:"tDiffuse",e instanceof ee?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Fe.clone(e.uniforms),this.material=new ee({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new it(this.material)}render(e,s,t){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=t.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class dt extends fe{constructor(e,s){super(),this.scene=e,this.camera=s,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,s,t){const i=e.getContext(),a=e.state;a.buffers.color.setMask(!1),a.buffers.depth.setMask(!1),a.buffers.color.setLocked(!0),a.buffers.depth.setLocked(!0);let r,n;this.inverse?(r=0,n=1):(r=1,n=0),a.buffers.stencil.setTest(!0),a.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),a.buffers.stencil.setFunc(i.ALWAYS,r,4294967295),a.buffers.stencil.setClear(n),a.buffers.stencil.setLocked(!0),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),a.buffers.color.setLocked(!1),a.buffers.depth.setLocked(!1),a.buffers.color.setMask(!0),a.buffers.depth.setMask(!0),a.buffers.stencil.setLocked(!1),a.buffers.stencil.setFunc(i.EQUAL,1,4294967295),a.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),a.buffers.stencil.setLocked(!0)}}class Gs extends fe{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class js{constructor(e,s){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),s===void 0){const t=e.getSize(new B);this._width=t.width,this._height=t.height,s=new ve(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ye}),s.texture.name="EffectComposer.rt1"}else this._width=s.width,this._height=s.height;this.renderTarget1=s,this.renderTarget2=s.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Xe(Wt),this.copyPass.material.blending=gs,this.clock=new qt}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,s){this.passes.splice(s,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const s=this.passes.indexOf(e);s!==-1&&this.passes.splice(s,1)}isLastEnabledPass(e){for(let s=e+1;s<this.passes.length;s++)if(this.passes[s].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const s=this.renderer.getRenderTarget();let t=!1;for(let i=0,a=this.passes.length;i<a;i++){const r=this.passes[i];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,t),r.needsSwap){if(t){const n=this.renderer.getContext(),c=this.renderer.state.buffers.stencil;c.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),c.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}dt!==void 0&&(r instanceof dt?t=!0:r instanceof Gs&&(t=!1))}}this.renderer.setRenderTarget(s)}reset(e){if(e===void 0){const s=this.renderer.getSize(new B);this._pixelRatio=this.renderer.getPixelRatio(),this._width=s.width,this._height=s.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,s){this._width=e,this._height=s;const t=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(t,i),this.renderTarget2.setSize(t,i);for(let a=0;a<this.passes.length;a++)this.passes[a].setSize(t,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Ys extends fe{constructor(e,s,t=null,i=null,a=null){super(),this.scene=e,this.camera=s,this.overrideMaterial=t,this.clearColor=i,this.clearAlpha=a,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ce}render(e,s,t){const i=e.autoClear;e.autoClear=!1;let a,r;this.overrideMaterial!==null&&(r=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(a=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:t),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(a),this.overrideMaterial!==null&&(this.scene.overrideMaterial=r),e.autoClear=i}}const Xs={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ce(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class he extends fe{constructor(e,s,t,i){super(),this.strength=s!==void 0?s:1,this.radius=t,this.threshold=i,this.resolution=e!==void 0?new B(e.x,e.y):new B(256,256),this.clearColor=new Ce(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let a=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);this.renderTargetBright=new ve(a,r,{type:ye}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const f=new ve(a,r,{type:ye});f.texture.name="UnrealBloomPass.h"+h,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const m=new ve(a,r,{type:ye});m.texture.name="UnrealBloomPass.v"+h,m.texture.generateMipmaps=!1,this.renderTargetsVertical.push(m),a=Math.round(a/2),r=Math.round(r/2)}const n=Xs;this.highPassUniforms=Fe.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new ee({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const c=[3,5,7,9,11];a=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(c[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new B(1/a,1/r),a=Math.round(a/2),r=Math.round(r/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=s,this.compositeMaterial.uniforms.bloomRadius.value=.1;const d=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=d,this.bloomTintColors=[new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1),new R(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const p=Wt;this.copyUniforms=Fe.clone(p.uniforms),this.blendMaterial=new ee({uniforms:this.copyUniforms,vertexShader:p.vertexShader,fragmentShader:p.fragmentShader,blending:Bt,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ce,this.oldClearAlpha=1,this.basic=new F,this.fsQuad=new it(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,s){let t=Math.round(e/2),i=Math.round(s/2);this.renderTargetBright.setSize(t,i);for(let a=0;a<this.nMips;a++)this.renderTargetsHorizontal[a].setSize(t,i),this.renderTargetsVertical[a].setSize(t,i),this.separableBlurMaterials[a].uniforms.invSize.value=new B(1/t,1/i),t=Math.round(t/2),i=Math.round(i/2)}render(e,s,t,i,a){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const r=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),a&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=t.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=t.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let n=this.renderTargetBright;for(let c=0;c<this.nMips;c++)this.fsQuad.material=this.separableBlurMaterials[c],this.separableBlurMaterials[c].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[c].uniforms.direction.value=he.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[c]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[c].uniforms.colorTexture.value=this.renderTargetsHorizontal[c].texture,this.separableBlurMaterials[c].uniforms.direction.value=he.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[c]),e.clear(),this.fsQuad.render(e),n=this.renderTargetsVertical[c];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=r}getSeperableBlurMaterial(e){const s=[];for(let t=0;t<e;t++)s.push(.39894*Math.exp(-.5*t*t/(e*e))/e);return new ee({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new B(.5,.5)},direction:{value:new B(.5,.5)},gaussianCoefficients:{value:s}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new ee({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}he.BlurDirectionX=new B(1,0);he.BlurDirectionY=new B(0,1);const Vs={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class Ws extends fe{constructor(){super();const e=Vs;this.uniforms=Fe.clone(e.uniforms),this.material=new vs({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new it(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,s,t){this.uniforms.tDiffuse.value=t.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},ys.getTransfer(this._outputColorSpace)===ws&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===ks?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Ms?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Ss?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Dt?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Cs?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===_s&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const Zt=360,V=380;function pt(o,e,s=Zt){const t=Math.max(1,s);return{width:Math.max(1,Math.round(o/Math.max(1,e)*t)),height:t}}function at(o=Zt){return 2*V/o}function $e(o,e){return Math.round(o/e)*e}const Zs=32;function Ks(o,e){e=Math.max(2,Math.floor(e));const s=255/(e-1);for(let t=0;t<o.length;t+=4)o[t]=Math.round(o[t]/s)*s,o[t+1]=Math.round(o[t+1]/s)*s,o[t+2]=Math.round(o[t+2]/s)*s}const Qs=8;class Js{constructor(e,s,t){l(this,"currentX");l(this,"currentZ");this.camera=e,this.currentX=s,this.currentZ=t}update(e,s,t){const i=Math.min(1,Qs*t);this.currentX+=(e-this.currentX)*i,this.currentZ+=(s-this.currentZ)*i;const a=at(),r=$e(this.currentX,a),n=$e(this.currentZ,a);this.camera.position.set(r+200,600,n+200),this.camera.lookAt(r,0,n)}}const ht=200,mt=1e3,ei={uniforms:{tDiffuse:{value:null},intensity:{value:.35}},vertexShader:`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float intensity;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * 2.0;
      float v = 1.0 - dot(uv * 0.4, uv * 0.4);
      v = clamp(mix(1.0 - intensity, 1.0, v), 0.0, 1.0);
      gl_FragColor = vec4(color.rgb * v, color.a);
    }
  `},ti={uniforms:{tDiffuse:{value:null},levels:{value:32}},vertexShader:`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float levels;
    varying vec2 vUv;

    const mat4 BAYER = mat4(
       0.0,  8.0,  2.0, 10.0,
      12.0,  4.0, 14.0,  6.0,
       3.0, 11.0,  1.0,  9.0,
      15.0,  7.0, 13.0,  5.0
    );

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
      float threshold = (BAYER[p.x][p.y] + 0.5) / 16.0 - 0.5;
      vec3 dithered = color.rgb + threshold / levels;
      vec3 quantized = floor(dithered * (levels - 1.0) + 0.5) / (levels - 1.0);
      gl_FragColor = vec4(quantized, color.a);
    }
  `};class si{constructor(e){l(this,"renderer");l(this,"scene");l(this,"camera");l(this,"cameraController");l(this,"composer");l(this,"animFrameId",0);l(this,"_raycaster",new Ts);l(this,"_groundPlane",new Es(new R(0,1,0),0));l(this,"_worldTarget",new R);l(this,"_ndc",new B);l(this,"_canvasRect",null);l(this,"onResize",()=>{var a;const e=window.innerWidth,s=window.innerHeight,t=e/s;this.camera.left=-V*t,this.camera.right=V*t,this.camera.top=V,this.camera.bottom=-V,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,s);const i=pt(e,s);(a=this.composer)==null||a.setSize(i.width,i.height),this._canvasRect=null});this.renderer=new Ps({antialias:!1}),this.renderer.setPixelRatio(1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=As,this.renderer.outputColorSpace=et,this.renderer.toneMapping=Dt,this.renderer.domElement.style.imageRendering="pixelated",e.appendChild(this.renderer.domElement),this.scene=new Rs,this.scene.background=new Ce(328968);const s=window.innerWidth/window.innerHeight;this.camera=new Nt(-V*s,V*s,V,-V,.1,3e3),this.cameraController=new Js(this.camera,ht,mt),this.cameraController.update(ht,mt,1),this.buildLighting(),window.addEventListener("resize",this.onResize),this.onResize()}buildLighting(){this.scene.add(new Ls(5588019,1.5)),this.scene.add(new zs(2241365,3346688,.8));const e=new Is(7833804,1);e.position.set(1500,800,1200),e.target.position.set(1e3,0,1e3),e.castShadow=!0,e.shadow.mapSize.set(2048,2048),e.shadow.camera.near=.5,e.shadow.camera.far=4e3,e.shadow.camera.left=-1500,e.shadow.camera.right=1500,e.shadow.camera.top=1500,e.shadow.camera.bottom=-1500,this.scene.add(e),this.scene.add(e.target)}initPostProcessing(){const e=pt(window.innerWidth,window.innerHeight),s=new ve(e.width,e.height,{type:ye,magFilter:pe,minFilter:pe});this.composer=new js(this.renderer,s),this.composer.setSize(e.width,e.height),this.composer.addPass(new Ys(this.scene,this.camera)),this.composer.addPass(new he(new B(e.width/2,e.height/2),.5,.4,.3));{const t=new Xe(ti);t.uniforms.levels.value=Zs,this.composer.addPass(t)}this.composer.addPass(new Xe(ei)),this.composer.addPass(new Ws)}updateCamera(e,s,t){this.cameraController.update(e,s,t)}getCanvasRect(){return this._canvasRect||(this._canvasRect=this.renderer.domElement.getBoundingClientRect()),this._canvasRect}startRenderLoop(e){if(this.animFrameId!==0)return;const s=()=>{this.animFrameId=requestAnimationFrame(s),e(),this.composer?this.composer.render():this.renderer.render(this.scene,this.camera)};s()}stopRenderLoop(){cancelAnimationFrame(this.animFrameId),this.animFrameId=0}screenToWorld(e,s){const t=this.getCanvasRect();return this._ndc.set((e-t.left)/t.width*2-1,-((s-t.top)/t.height)*2+1),this._raycaster.setFromCamera(this._ndc,this.camera),this._raycaster.ray.intersectPlane(this._groundPlane,this._worldTarget),{x:this._worldTarget.x,y:this._worldTarget.z}}dispose(){var e;this.stopRenderLoop(),window.removeEventListener("resize",this.onResize),this.renderer.dispose(),(e=this.composer)==null||e.dispose()}}const k=2e3,K=16,ft=200,Ae=60,ut=1/Ae,xt=750,ii=500,ke=[{x:350,y:300,halfSize:28},{x:1e3,y:250,halfSize:28},{x:1650,y:300,halfSize:28},{x:400,y:750,halfSize:28},{x:1600,y:750,halfSize:28},{x:1e3,y:1e3,halfSize:28},{x:350,y:1450,halfSize:28},{x:750,y:1700,halfSize:28},{x:1250,y:1700,halfSize:28},{x:1650,y:1450,halfSize:28}],ai=Math.round(1.5*Ae),oi=60,ri=Math.round(.75*Ae),Ve={1:{manaCost:25,cooldownTicks:30},2:{manaCost:60,cooldownTicks:180},3:{manaCost:100,cooldownTicks:300},4:{manaCost:40,cooldownTicks:120},5:{manaCost:20,cooldownTicks:24},6:{manaCost:50,cooldownTicks:24},7:{manaCost:80,cooldownTicks:240},8:{manaCost:30,cooldownTicks:90}},Kt=600,We={"fire.volatile_ember":{requiresAll:["fire.fireball"]},"fire.seeking_flame":{requiresAll:["fire.fireball"]},"fire.hellfire":{requiresAll:["fire.fireball"]},"fire.pyroclasm":{requiresAll:["fire.fireball"]},"fire.fire_wall":{requiresAll:["fire.fireball"],requiresAny:["fire.volatile_ember","fire.seeking_flame"]},"fire.enduring_flames":{requiresAll:["fire.fire_wall"]},"fire.searing_heat":{requiresAll:["fire.fire_wall"]},"fire.inferno_expanse":{requiresAll:["fire.fire_wall"]},"fire.meteor":{requiresAll:["fire.fire_wall"],requiresAny:["fire.enduring_flames","fire.searing_heat","fire.inferno_expanse"]},"fire.molten_impact":{requiresAll:["fire.meteor"]},"fire.blind_strike":{requiresAll:["fire.meteor"]},"fire.cataclysm":{requiresAll:["fire.meteor"]},"utility.phase_shift":{requiresAll:["utility.teleport"]},"utility.ethereal_form":{requiresAll:["utility.teleport"]},"utility.phantom_step":{requiresAll:["utility.teleport"],requiresAny:["utility.phase_shift","utility.ethereal_form"]},"archer.guided":{requiresAll:["archer.power_shot"]},"archer.multishot":{requiresAll:["archer.power_shot"]},"archer.homing":{requiresAll:["archer.guided"]},"archer.barrage":{requiresAll:["archer.multishot"]},"archer.rain_of_arrows":{requiresAll:["archer.power_shot"],requiresAny:["archer.homing","archer.barrage"]},"archer.sustained_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.piercing_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.wide_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.burn":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.freeze","archer.poison"]},"archer.freeze":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.poison"]},"archer.poison":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.freeze"]},"archer_utility.combat_roll":{requiresAll:["archer_utility.evade"]},"archer_utility.shadowstep":{requiresAll:["archer_utility.evade"]},"archer_utility.acrobatics":{requiresAll:["archer_utility.evade"],requiresAny:["archer_utility.combat_roll","archer_utility.shadowstep"]}};function ue(o,e){const s=We[o];return s?!(s.requiresAll&&!s.requiresAll.every(t=>e.has(t))||s.requiresAny&&!s.requiresAny.some(t=>e.has(t))||s.mutuallyExclusive&&s.mutuallyExclusive.some(t=>e.has(t))):!0}const xe=[{id:"fire.fireball",name:"Fireball",tree:"fire",tier:1,cost:1,isSpell:!0,description:"Fast projectile. 80–120 damage."},{id:"fire.volatile_ember",name:"Volatile Ember",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Larger fireball per rank.",stackable:{softCap:5,baseEffect:.4}},{id:"fire.seeking_flame",name:"Seeking Flame",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Homing toward enemy. Stronger per rank.",stackable:{softCap:5,baseEffect:12}},{id:"fire.hellfire",name:"Hellfire",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Larger, slower, harder-hitting fireball per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.pyroclasm",name:"Pyroclasm",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Fireball splits on impact. More splits per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.fire_wall",name:"Fire Wall",tree:"fire",tier:4,cost:2,isSpell:!0,description:"Persistent fire barrier. 40 dmg/s."},{id:"fire.enduring_flames",name:"Enduring Flames",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+10% Fire Wall duration per rank.",stackable:{softCap:5,baseEffect:.1}},{id:"fire.searing_heat",name:"Searing Heat",tree:"fire",tier:5,cost:2,isSpell:!1,description:"+8% Fire Wall damage per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"fire.inferno_expanse",name:"Inferno Expanse",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+25% Fire Wall length and width per rank.",stackable:{softCap:5,baseEffect:.25}},{id:"fire.meteor",name:"Meteor",tree:"fire",tier:6,cost:3,isSpell:!0,description:"Delayed AoE strike. 200–280 damage."},{id:"fire.molten_impact",name:"Molten Impact",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Meteor leaves a burning crater for 3s."},{id:"fire.blind_strike",name:"Blind Strike",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Enemy cannot see the Meteor impact indicator."},{id:"fire.cataclysm",name:"Cataclysm",tree:"fire",tier:7,cost:1,isSpell:!1,description:"+15% Meteor radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"utility.teleport",name:"Teleport",tree:"utility",tier:1,cost:1,isSpell:!0,description:"Instant displacement."},{id:"utility.phase_shift",name:"Phase Shift",tree:"utility",tier:2,cost:2,isSpell:!1,description:"+8% teleport range per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"utility.ethereal_form",name:"Ethereal Form",tree:"utility",tier:2,cost:2,isSpell:!1,description:"0.5s invulnerability after teleporting."},{id:"utility.phantom_step",name:"Phantom Step",tree:"utility",tier:3,cost:3,isSpell:!1,description:"Next cast is instant within 2s of teleporting."},{id:"archer.power_shot",name:"Power Shot",tree:"archer",tier:1,cost:1,isSpell:!0,description:"Fast arrow projectile. 60–90 damage."},{id:"archer.guided",name:"Guided",tree:"archer",tier:2,cost:2,isSpell:!1,description:"Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4).",stackable:{softCap:4,baseEffect:1}},{id:"archer.multishot",name:"Multi-shot",tree:"archer",tier:2,cost:2,isSpell:!0,description:"Fire 3 arrows in a spread. 40–60 damage each."},{id:"archer.homing",name:"Homing",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Guided redirects happen sooner per rank.",stackable:{softCap:3,baseEffect:2}},{id:"archer.barrage",name:"Barrage",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Multi-shot gains extra arrows per rank.",stackable:{softCap:5,baseEffect:2}},{id:"archer.rain_of_arrows",name:"Rain of Arrows",tree:"archer",tier:4,cost:2,isSpell:!0,description:"Mark a zone. Arrows rain after 1.5s. 150–220 AoE damage."},{id:"archer.sustained_rain",name:"Sustained Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"Rain zone lasts longer per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"archer.piercing_rain",name:"Piercing Rain",tree:"archer",tier:5,cost:2,isSpell:!1,description:"Rain damage increases per rank.",stackable:{softCap:3,baseEffect:.25}},{id:"archer.wide_rain",name:"Wide Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"+15% Rain of Arrows radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"archer.burn",name:"Burn",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows burn. More damage per rank.",stackable:{softCap:5,baseEffect:8}},{id:"archer.freeze",name:"Freeze",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows freeze. Stronger slow per rank.",stackable:{softCap:5,baseEffect:.06}},{id:"archer.poison",name:"Poison",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows poison. More damage and mana drain per rank.",stackable:{softCap:5,baseEffect:5}},{id:"archer_utility.evade",name:"Evade",tree:"archer_utility",tier:1,cost:1,isSpell:!0,description:"Short dash with invulnerability frames (~0.3s)."},{id:"archer_utility.combat_roll",name:"Combat Roll",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Fire an arrow at the nearest enemy during evade."},{id:"archer_utility.shadowstep",name:"Shadowstep",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Become invisible for 0.5s after evading."},{id:"archer_utility.acrobatics",name:"Acrobatics",tree:"archer_utility",tier:3,cost:3,isSpell:!1,description:"Evade cooldown reduced per rank.",stackable:{softCap:3,baseEffect:.1}}],ot=[{spell:1,node:"fire.fireball",key:1,charClass:"mage"},{spell:2,node:"fire.fire_wall",key:2,charClass:"mage"},{spell:3,node:"fire.meteor",key:3,charClass:"mage"},{spell:4,node:"utility.teleport",key:4,charClass:"mage"},{spell:5,node:"archer.power_shot",key:1,charClass:"amazon"},{spell:6,node:"archer.multishot",key:2,charClass:"amazon"},{spell:7,node:"archer.rain_of_arrows",key:3,charClass:"amazon"},{spell:8,node:"archer_utility.evade",key:4,charClass:"amazon"}],Qt={mage:"fire.fireball",amazon:"archer.power_shot"};function ni(o){return Kt*(o>0?1+ci(.08,o):1)}const li=.7;function ci(o,e){return e<=0?0:o*Math.pow(e,li)}function ae(o){return o.stackable!==void 0}function De(o,e){if(!o.stackable)return e===0?o.cost:1/0;const s=e+1,t=Math.max(0,s-o.stackable.softCap);return o.cost+t}function Jt(o){return{x:Math.max(K,Math.min(k-K,o.x)),y:Math.max(K,Math.min(k-K,o.y))}}function es(o){let e={...o};for(const s of ke){const t=s.x-s.halfSize-K,i=s.x+s.halfSize+K,a=s.y-s.halfSize-K,r=s.y+s.halfSize+K;if(e.x>t&&e.x<i&&e.y>a&&e.y<r){const n=e.x-t,c=i-e.x,d=e.y-a,p=r-e.y,h=Math.min(n,c,d,p);h===n?e.x=t:h===c?e.x=i:h===d?e.y=a:e.y=r}}return e}function bt(o,e,s=Kt){const t=e.x-o.x,i=e.y-o.y,a=Math.sqrt(t*t+i*i),r=a>s?{x:o.x+t/a*s,y:o.y+i/a*s}:{x:e.x,y:e.y};return es(Jt(r))}function gt(o,e,s=1){const t=Math.sqrt(e.x*e.x+e.y*e.y);if(t===0)return o;const i=e.x/t,a=e.y/t,r={x:o.x+i*ft*ut*s,y:o.y+a*ft*ut*s};return es(Jt(r))}const di=6,vt=[{id:"mage",label:"Mage",enabled:!0},{id:"amazon",label:"Amazon",enabled:!0}];function pi(o){return Math.floor(100*Math.pow(o,1.5))}const te={walk:{frames:9,singleRow:!1,fps:12},run:{frames:8,singleRow:!1,fps:12},idle:{frames:2,singleRow:!1,fps:2},spellcast:{frames:7,singleRow:!1,fps:12},shoot:{frames:13,singleRow:!1,fps:14},hurt:{frames:6,singleRow:!0,fps:8}},Re={purple:"#8a5fc4",green:"#4d8f4d",black:"#4a4a52",brown:"#7d5a38",red:"#c0503a",blue:"#4a6fc4",white:"#f0f0f0"},hi={mage:{body:"male",hairStyle:null,hairColor:"red",torso:"longsleeve",torsoColor:"purple",legsColor:"black",hat:"wizard",hatColor:"base_black"},amazon:{body:"female",hairStyle:"ponytail",hairColor:"red",torso:"longsleeve",torsoColor:"green",legsColor:"brown",hat:null,hatColor:"base_black"}};function mi(o){const e=[];return o.hairStyle&&e.push({path:`hair/${o.hairStyle}/adult/bg`,z:0,tint:Re[o.hairColor]}),e.push({path:`body/bodies/${o.body}`,z:10}),e.push({path:`head/heads/human/${o.body}`,z:20}),o.hairStyle&&e.push({path:`hair/${o.hairStyle}/adult/fg`,z:30,tint:Re[o.hairColor]}),e.push({path:`torso/clothes/${o.torso}/${o.torso}/${o.body}`,z:40,tint:Re[o.torsoColor]}),e.push({path:`legs/pants/${o.body==="female"?"thin":"male"}`,z:50,tint:Re[o.legsColor]}),o.hat&&e.push({path:`hat/magic/${o.hat}/base/adult/${o.hatColor}`,z:60}),e.sort((s,t)=>s.z-t.z)}const oe=80;function Le(o,e,s){const t=a=>{const r=a.clone();return r.wrapS=r.wrapT=jt,r.repeat.set(e,s),r.needsUpdate=!0,r},i=new Ht({map:t(o.map),normalMap:t(o.normalMap),roughnessMap:t(o.roughnessMap),roughness:1,metalness:0});return i.normalScale.set(.4,.4),i}class fi{constructor(e){l(this,"group",new ce);this.buildFloor(e.floor),this.buildBoundaryWalls(e.stone),this.buildPillars(e.stone)}addToScene(e){e.add(this.group)}buildFloor(e){const s=k/200,t=Le(e,s,s),i=new _(new Ut(k,k),t);i.rotation.x=-Math.PI/2,i.position.set(k/2,0,k/2),i.receiveShadow=!0,this.group.add(i)}buildBoundaryWalls(e){const t=[[k/2,-10,k+40,20],[k/2,k+10,k+40,20],[-10,k/2,20,k],[k+10,k/2,20,k]],i=new ne(t[0][2],60,t[0][3]),a=new ne(t[2][2],60,t[2][3]),r=Le(e,t[0][2]/200,60/200),n=Le(e,t[2][2]/200,60/200);t.forEach(([c,d],p)=>{const h=new _(p<2?i:a,p<2?r:n);h.position.set(c,60/2,d),h.castShadow=!0,this.group.add(h)})}buildPillars(e){const s=new Ht({color:6974122,roughness:.7,metalness:.1}),t=ke[0].halfSize*2,i=Le(e,t/200,oe/200),a=new ne(t,oe,t),r=new ne(t+6,8,t+6),n=new tt(5,8,6),c=new F({color:16753984}),d=[{x:0,y:0},{x:k,y:0},{x:0,y:k},{x:k,y:k}],p=new Set(d.map(h=>ke.reduce((f,m)=>(m.x-h.x)**2+(m.y-h.y)**2<(f.x-h.x)**2+(f.y-h.y)**2?m:f)));ke.forEach(h=>{const f=new _(a,i);f.position.set(h.x,oe/2,h.y),f.castShadow=!0,f.receiveShadow=!0,this.group.add(f);const m=new _(r,s);m.position.set(h.x,oe+4,h.y),this.group.add(m);const x=new _(n,c);if(x.position.set(h.x,oe+14,h.y),this.group.add(x),p.has(h)){const u=new Gt(16737792,3,450,2);u.position.set(h.x,oe+60,h.y),this.group.add(u)}})}}const q=64;function ui(o,e,s){const i=te[o].singleRow?0:e;return{sx:s*q,sy:i*q}}function xi(o){const s=((o+Math.PI/4)%(2*Math.PI)+2*Math.PI)%(2*Math.PI),t=Math.round(s/(Math.PI/2))%4;return[3,2,1,0][t]}function bi(o,e,s){const t=te[o],i=Math.floor(e*t.fps);return s?i%t.frames:Math.min(i,t.frames-1)}const yt=new Map;function gi(o){let e=yt.get(o);return e||(e=new Promise(s=>{const t=new Image;t.onload=()=>s(t),t.onerror=()=>s(null),t.src=o}),yt.set(o,e)),e}async function vi(o){const e=mi(o),s={};for(const t of Object.keys(te)){const i=te[t],a=await Promise.all(e.map(h=>gi(`/assets/lpc/${h.path}/${t}.png`)));if(a.filter(h=>h!==null).length===0){s[t]=null;continue}const n=i.singleRow?1:4,c=document.createElement("canvas");c.width=i.frames*q,c.height=n*q;const d=c.getContext("2d");a.forEach((h,f)=>{if(!h)return;const m=e[f].tint;if(!m){d.drawImage(h,0,0);return}const x=document.createElement("canvas");x.width=c.width,x.height=c.height;const u=x.getContext("2d");u.drawImage(h,0,0),u.globalCompositeOperation="multiply",u.fillStyle=m,u.fillRect(0,0,x.width,x.height),u.globalCompositeOperation="destination-in",u.drawImage(h,0,0),d.drawImage(x,0,0)});const p=new Yt(c);p.magFilter=pe,p.minFilter=pe,p.generateMipmaps=!1,p.colorSpace=et,s[t]=p}return s}function yi(o){for(const e of Object.values(o))e==null||e.dispose()}const wi=.5,ki=new je(11,16),Mi=new F({color:0,transparent:!0,opacity:.35});class Si{constructor(e,s){l(this,"group",new ce);l(this,"plane");l(this,"material");l(this,"textures",null);l(this,"anim","idle");l(this,"animElapsed",0);l(this,"direction",2);l(this,"dead",!1);l(this,"castAnim");l(this,"casting",!1);l(this,"lastFrameKey","");this.castAnim=s==="amazon"?"shoot":"spellcast";const t=q*at()*wi;this.material=new F({transparent:!0,alphaTest:.01}),this.material.visible=!1,this.plane=new _(new Ut(t,t),this.material),this.plane.rotation.order="YXZ",this.plane.rotation.y=Math.PI/4,this.plane.rotation.x=-Math.atan(600/Math.hypot(200,200)),this.plane.position.y=t/2,this.group.add(this.plane);const i=new _(ki,Mi);i.rotation.x=-Math.PI/2,i.position.y=.5,this.group.add(i),vi(e).then(a=>{this.textures=a,this.material.visible=!0,this.applyFrame(!0)})}setFacing(e){this.dead||(this.direction=xi(e))}die(){this.dead||(this.dead=!0,this.anim="hurt",this.animElapsed=0)}update(e,s,t){if(this.animElapsed+=e,!this.dead){let i;t||this.casting&&this.animElapsed<te[this.castAnim].frames/te[this.castAnim].fps?i=this.castAnim:s>220?i="run":s>1.5?i="walk":i="idle",t&&(this.animElapsed=0),this.casting=i===this.castAnim&&(t||this.casting),i!==this.anim&&!(this.casting&&this.anim===this.castAnim)&&(this.anim=i,this.animElapsed=0)}this.applyFrame(!1)}applyFrame(e){if(!this.textures)return;const s=this.textures[this.anim]?this.anim:this.textures.idle?"idle":"walk",t=this.textures[s];if(!t)return;const i=te[s],a=s!=="hurt"&&s!==this.castAnim,r=bi(s,this.animElapsed,a),n=`${s}:${this.direction}:${r}`;if(!e&&n===this.lastFrameKey)return;this.lastFrameKey=n,this.material.map!==t&&(this.material.map=t,this.material.needsUpdate=!0);const{sx:c,sy:d}=ui(s,this.direction,r),p=i.singleRow?1:4;t.repeat.set(q/(i.frames*q),q/(p*q)),t.offset.set(c/(i.frames*q),1-(d+q)/(p*q))}dispose(){this.plane.geometry.dispose(),this.material.dispose(),this.textures&&yi(this.textures)}}const Ci=50,_i=new Xt(14,18,32),be=new R;class Ti{constructor(e,s,t,i){l(this,"group",new ce);l(this,"sprite");l(this,"nameLabel");l(this,"ownedMaterials",[]);l(this,"prevX",0);l(this,"prevZ",0);l(this,"velocityMag",0);l(this,"smoothVel",0);l(this,"smoothVelX",0);l(this,"smoothVelZ",0);this.sprite=new Si(hi[e],e),this.group.add(this.sprite.group);const a=new F({color:s,transparent:!0,opacity:.5,side:we});this.ownedMaterials.push(a);const r=new _(_i,a);r.rotation.x=-Math.PI/2,r.position.y=1,this.group.add(r),this.nameLabel=document.createElement("div"),this.nameLabel.style.cssText=`
      position:absolute; left:0; top:0; pointer-events:none; font-size:12px; color:#fff;
      text-shadow:0 0 4px #000; white-space:nowrap; transform:translateX(-50%);
    `,this.nameLabel.textContent=t,i.appendChild(this.nameLabel)}setPosition(e,s,t){const i=e-this.prevX,a=s-this.prevZ;this.smoothVelX=this.smoothVelX*.8+i*.2,this.smoothVelZ=this.smoothVelZ*.8+a*.2;const r=Math.sqrt(this.smoothVelX*this.smoothVelX+this.smoothVelZ*this.smoothVelZ),n=Math.min(Math.sqrt(i*i+a*a)*60,1e3);this.smoothVel=this.smoothVel*.85+n*.15,this.velocityMag=this.smoothVel,r>.05?this.sprite.setFacing(Math.atan2(this.smoothVelZ,this.smoothVelX)):t!==void 0&&this.sprite.setFacing(t),this.prevX=e,this.prevZ=s;const c=at();this.group.position.set($e(e,c),0,$e(s,c))}update(e,s){this.sprite.update(e,this.velocityMag,s)}setVisible(e){this.group.visible=e,this.nameLabel.style.display=e?"":"none"}die(){this.sprite.die()}updateLabel(e,s){this.group.getWorldPosition(be),be.y+=Ci+10,be.project(e);const t=(be.x*.5+.5)*s.width+s.left,i=(-be.y*.5+.5)*s.height+s.top-10;this.nameLabel.style.transform=`translate(${t}px, ${i}px) translateX(-50%)`}dispose(e){e.removeChild(this.nameLabel),this.group.removeFromParent();for(const s of this.ownedMaterials)s.dispose();this.ownedMaterials=[],this.sprite.dispose()}}const w=4096,Q=Math.floor(w*.9),Ei=1,Pi=.4,Ai=0;class Ri{constructor(e){l(this,"posX",new Float32Array(w));l(this,"posY",new Float32Array(w));l(this,"posZ",new Float32Array(w));l(this,"velX",new Float32Array(w));l(this,"velY",new Float32Array(w));l(this,"velZ",new Float32Array(w));l(this,"life",new Float32Array(w));l(this,"maxLife",new Float32Array(w));l(this,"particleSize",new Float32Array(w));l(this,"colorR",new Float32Array(w));l(this,"colorG",new Float32Array(w));l(this,"colorB",new Float32Array(w));l(this,"activeCount",0);l(this,"positionBuffer");l(this,"sizeBuffer");l(this,"colorBuffer");l(this,"posAttr");l(this,"sizeAttr");l(this,"colorAttr");l(this,"geometry");l(this,"points");this.scene=e,this.positionBuffer=new Float32Array(w*3),this.sizeBuffer=new Float32Array(w),this.colorBuffer=new Float32Array(w*3),this.geometry=new Pe,this.posAttr=new qe(this.positionBuffer,3),this.posAttr.setUsage(Be),this.geometry.setAttribute("position",this.posAttr),this.sizeAttr=new qe(this.sizeBuffer,1),this.sizeAttr.setUsage(Be),this.geometry.setAttribute("size",this.sizeAttr),this.colorAttr=new qe(this.colorBuffer,3),this.colorAttr.setUsage(Be),this.geometry.setAttribute("particleColor",this.colorAttr),this.geometry.setDrawRange(0,0);const s=new ee({vertexShader:`
        attribute float size;
        attribute vec3 particleColor;
        varying vec3 vColor;
        void main() {
          vColor = particleColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
        }
      `,fragmentShader:`
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,transparent:!0,depthWrite:!1,blending:Bt});this.points=new Os(this.geometry,s),this.points.frustumCulled=!1,e.add(this.points)}emitTrail(e,s,t,i,a,r=10){if(this.activeCount>=Q)return;const n=r/10,c=Math.min(12,Math.floor((3+Math.floor(Math.random()*3))*n)),d=4*n;for(let p=0;p<c;p++){if(this.activeCount>=w)return;this.spawn(e+(Math.random()-.5)*d,s+(Math.random()-.5)*d,t+(Math.random()-.5)*d,-i*(40+Math.random()*30)*n+(Math.random()-.5)*30,(10+Math.random()*20)*n,-a*(40+Math.random()*30)*n+(Math.random()-.5)*30,.35+Math.random()*.15,(12+Math.random()*4)*n)}}emitExplosion(e,s,t,i=10){const a=i/10,r=Math.min(200,Math.floor((40+Math.floor(Math.random()*21))*a)),n=6*a;for(let c=0;c<r;c++){if(this.activeCount>=w)return;const d=Math.random()*Math.PI*2,p=(60+Math.random()*120)*a;this.spawn(e+(Math.random()-.5)*n,s+(Math.random()-.5)*n,t+(Math.random()-.5)*n,Math.cos(d)*p,(20+Math.random()*80)*a,Math.sin(d)*p,.5+Math.random()*.3,(Math.random()>.5?16:10)*Math.min(a,3))}}emitWall(e){if(!(this.activeCount>=Q))for(const s of e)for(let t=0;t<3;t++){if(this.activeCount>=w)return;const i=Math.random();this.spawn(s.x1+(s.x2-s.x1)*i+(Math.random()-.5)*4,1,s.y1+(s.y2-s.y1)*i+(Math.random()-.5)*4,(Math.random()-.5)*15,40+Math.random()*40,(Math.random()-.5)*15,.4+Math.random()*.3,14+Math.random()*10)}}emitMeteorTrail(e,s,t){if(this.activeCount>=Q)return;const i=2+Math.floor(Math.random()*2);for(let a=0;a<i;a++){if(this.activeCount>=w)return;const r=Math.random()*Math.PI*2,n=8+Math.random()*8;this.spawn(e+(Math.random()-.5)*6,s+(Math.random()-.5)*6,t+(Math.random()-.5)*6,Math.cos(r)*n,20+Math.random()*20,Math.sin(r)*n,.2+Math.random()*.1,8+Math.random()*6)}}emitCrater(e,s,t){if(this.activeCount>=Q)return;const i=Math.max(4,Math.round(t/10));for(let a=0;a<i;a++){if(this.activeCount>=w)return;const r=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*t;this.spawn(e+Math.cos(r)*n,1,s+Math.sin(r)*n,(Math.random()-.5)*10,30+Math.random()*30,(Math.random()-.5)*10,.3+Math.random()*.3,10+Math.random()*8)}}emitMeteorImpact(e,s,t){if(this.activeCount>=Q)return;const i=50+Math.floor(Math.random()*21);for(let a=0;a<i;a++){if(this.activeCount>=w)return;const r=Math.random()*Math.PI*2,n=80+Math.random()*120;this.spawn(e+(Math.random()-.5)*10,s+(Math.random()-.5)*10,t+(Math.random()-.5)*10,Math.cos(r)*n,30+Math.random()*100,Math.sin(r)*n,.5+Math.random()*.3,Math.random()>.5?18:12)}}emitRainImpact(e,s,t,i){if(this.activeCount>=Q)return;const a=30+Math.floor(Math.random()*15);for(let r=0;r<a;r++){if(this.activeCount>=w)return;const n=Math.random()*Math.PI*2,c=Math.sqrt(Math.random())*i,d=15+Math.random()*30,p=this.activeCount;this.spawn(e+Math.cos(n)*c,s+2,t+Math.sin(n)*c,Math.cos(n)*d,30+Math.random()*50,Math.sin(n)*d,.3+Math.random()*.2,6+Math.random()*4),this.colorR[p]=.7,this.colorG[p]=.6,this.colorB[p]=.45}}emitRainZone(e,s,t){if(this.activeCount>=Q)return;const i=Math.max(2,Math.round(t/20));for(let a=0;a<i;a++){if(this.activeCount>=w)return;const r=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*t,c=this.activeCount;this.spawn(e+Math.cos(r)*n,1,s+Math.sin(r)*n,(Math.random()-.5)*8,15+Math.random()*15,(Math.random()-.5)*8,.25+Math.random()*.15,5+Math.random()*4),this.colorR[c]=.7,this.colorG[c]=.6,this.colorB[c]=.45}}emitTeleportSparks(e,s,t){const i=10+Math.floor(Math.random()*6);for(let a=0;a<i;a++){if(this.activeCount>=w)return;const r=Math.random()*Math.PI*2,n=Math.random()*Math.PI*.5,c=40+Math.random()*60,d=this.activeCount;this.spawn(e+(Math.random()-.5)*4,s+(Math.random()-.5)*4,t+(Math.random()-.5)*4,Math.cos(r)*Math.sin(n)*c,Math.cos(n)*c*.4+10,Math.sin(r)*Math.sin(n)*c,.12+Math.random()*.04,7+Math.random()*4),this.colorR[d]=1,this.colorG[d]=.84+Math.random()*.16,this.colorB[d]=.4+Math.random()*.6}}spawn(e,s,t,i,a,r,n,c){const d=this.activeCount++;this.posX[d]=e,this.posY[d]=s,this.posZ[d]=t,this.velX[d]=i,this.velY[d]=a,this.velZ[d]=r,this.life[d]=n,this.maxLife[d]=n,this.particleSize[d]=c,this.colorR[d]=Ei,this.colorG[d]=Pi,this.colorB[d]=Ai}update(e){let s=0;for(;s<this.activeCount;){if(this.life[s]-=e,this.life[s]<=0){const i=this.activeCount-1;this.posX[s]=this.posX[i],this.posY[s]=this.posY[i],this.posZ[s]=this.posZ[i],this.velX[s]=this.velX[i],this.velY[s]=this.velY[i],this.velZ[s]=this.velZ[i],this.life[s]=this.life[i],this.maxLife[s]=this.maxLife[i],this.particleSize[s]=this.particleSize[i],this.colorR[s]=this.colorR[i],this.colorG[s]=this.colorG[i],this.colorB[s]=this.colorB[i],this.activeCount--;continue}this.velY[s]-=80*e,this.posX[s]+=this.velX[s]*e,this.posY[s]+=this.velY[s]*e,this.posZ[s]+=this.velZ[s]*e;const t=s*3;this.positionBuffer[t]=this.posX[s],this.positionBuffer[t+1]=this.posY[s],this.positionBuffer[t+2]=this.posZ[s],this.colorBuffer[t]=this.colorR[s],this.colorBuffer[t+1]=this.colorG[s],this.colorBuffer[t+2]=this.colorB[s],this.sizeBuffer[s]=this.particleSize[s]*(this.life[s]/this.maxLife[s]),s++}this.geometry.setDrawRange(0,this.activeCount),this.activeCount>0&&(this.posAttr.addUpdateRange(0,this.activeCount*3),this.colorAttr.addUpdateRange(0,this.activeCount*3),this.sizeAttr.addUpdateRange(0,this.activeCount),this.posAttr.needsUpdate=!0,this.sizeAttr.needsUpdate=!0,this.colorAttr.needsUpdate=!0)}dispose(){this.scene.remove(this.points),this.geometry.dispose(),this.points.material.dispose()}}const Li=.08,wt=.12,kt=.15,zi=.2,Ii=35,Mt=4,Oi=6,Fi=new Fs(1,.3,4,32),$i=2,Me=[];function Ni(o){for(const e of Me)e.light.parent!==o&&o.add(e.light);for(;Me.length<$i;){const e=new Gt(16772795,0,120);o.add(e),Me.push({light:e,inUse:!1})}}function qi(){const o=Me.find(e=>!e.inUse);return o?(o.inUse=!0,o.light):null}function St(o){o.intensity=0;const e=Me.find(s=>s.light===o);e&&(e.inUse=!1)}class Ct{constructor(e,s,t,i){l(this,"done",!1);l(this,"elapsed",0);l(this,"lightningLines",[]);l(this,"ringMesh");l(this,"pointLight");l(this,"lightningDisposed",!1);l(this,"lightDisposed",!1);l(this,"ringDisposed",!1);this.scene=e;const a=2;i.emitTeleportSparks(s,a,t);const r=Mt+Math.floor(Math.random()*(Oi-Mt+1));for(let c=0;c<r;c++){const d=Math.random()*Math.PI*2,p=15+Math.random()*25,h=p*(.3+Math.random()*.4),f=(Math.random()-.5)*12,m=[new R(s,a+Math.random()*6,t),new R(s+Math.cos(d)*h+f,a+3+Math.random()*8,t+Math.sin(d)*h+f),new R(s+Math.cos(d)*p,a+Math.random()*5,t+Math.sin(d)*p)],x=new Pe().setFromPoints(m),u=new st({color:16766720,transparent:!0,opacity:.6}),C=new Ye(x,u);this.scene.add(C),this.lightningLines.push(C)}const n=new F({color:16766720,transparent:!0,opacity:.4,side:we});this.ringMesh=new _(Fi,n),this.ringMesh.rotation.x=-Math.PI/2,this.ringMesh.position.set(s,1,t),this.ringMesh.scale.setScalar(.01),this.scene.add(this.ringMesh),Ni(e),this.pointLight=qi(),this.pointLight&&(this.pointLight.position.set(s,20,t),this.pointLight.intensity=1)}update(e){if(!this.done){if(this.elapsed+=e,!this.lightningDisposed&&this.elapsed>=Li){for(const s of this.lightningLines)this.scene.remove(s),s.geometry.dispose(),s.material.dispose();this.lightningLines.length=0,this.lightningDisposed=!0}if(!this.lightDisposed&&this.pointLight&&(this.elapsed>=wt?(St(this.pointLight),this.pointLight=null,this.lightDisposed=!0):this.pointLight.intensity=1*(1-this.elapsed/wt)),!this.ringDisposed)if(this.elapsed>=kt)this.scene.remove(this.ringMesh),this.ringMesh.material.dispose(),this.ringDisposed=!0;else{const s=this.elapsed/kt;this.ringMesh.scale.setScalar(Ii*s),this.ringMesh.material.opacity=.4*(1-s)}this.elapsed>=zi&&(this.done=!0)}}dispose(){if(!this.lightningDisposed){for(const e of this.lightningLines)this.scene.remove(e),e.geometry.dispose(),e.material.dispose();this.lightningLines.length=0}!this.lightDisposed&&this.pointLight&&(St(this.pointLight),this.pointLight=null),this.ringDisposed||(this.scene.remove(this.ringMesh),this.ringMesh.material.dispose()),this.done=!0}}const ze={none:16777215,burn:16737792,freeze:6737151,poison:4513092},Ze=new tt(1,8,8),ts=new ne(18,4,4),ss=new Pe().setFromPoints([new R(-9,0,0),new R(-15,0,0)]),is=new ne(2,14,2),as=new Xt(50,58,32),os=new tt(25,6,6),rs=new F({color:16737792}),ns=new F({color:16720384,transparent:!0,opacity:.25}),ls=new F({color:16729088}),cs=new st({color:16729088,transparent:!0,opacity:.4}),Bi=new Set([Ze,ts,ss,is,as,os]),rt=new Set([rs,ns,ls,cs]),_t=new Map,Tt=new Map;function Di(o){let e=_t.get(o);return e||(e=new F({color:o}),_t.set(o,e),rt.add(e)),e}function Ui(o){let e=Tt.get(o);return e||(e=new st({color:o,transparent:!0,opacity:.5}),Tt.set(o,e),rt.add(e)),e}function T(o){o.traverse(e=>{const s=e;if(s.geometry&&!Bi.has(s.geometry)&&s.geometry.dispose(),s.material){const t=Array.isArray(s.material)?s.material:[s.material];for(const i of t)rt.has(i)||i.dispose()}})}class Hi{constructor(e,s){l(this,"fireballs",new Map);l(this,"arrows",new Map);l(this,"fireWalls",new Map);l(this,"meteors",new Map);l(this,"rainOfArrows",new Map);l(this,"rainZoneArrows",new Map);l(this,"particles");l(this,"prevFireballPositions",new Map);l(this,"clock",new qt);l(this,"elapsedTime",0);l(this,"teleportEffects",[]);l(this,"arrowElement","none");l(this,"emitAccumulator",0);l(this,"shouldEmitContinuous",!0);this.scene=e,this.myId=s,this.particles=new Ri(e)}setArrowElement(e){this.arrowElement=e}setMyId(e){this.myId=e}createFallingArrows(e,s,t,i=16){const a=ze[this.arrowElement],r=new ce,n=new F({color:a,transparent:!0,opacity:.7}),c=[];for(let d=0;d<i;d++){const p=Math.random()*Math.PI*2,h=Math.sqrt(Math.random())*t,f=new _(is,n);f.position.set(Math.cos(p)*h,0,Math.sin(p)*h),f.rotation.x=(Math.random()-.5)*.3,f.rotation.z=(Math.random()-.5)*.3,r.add(f),c.push(Math.random())}return r.position.set(e,0,s),this.scene.add(r),{arrowGroup:r,arrowMaterial:n,arrowPhases:c,spawnTime:this.elapsedTime}}updateFallingArrows(e){const s=this.elapsedTime-e.spawnTime,t=250,i=.35,a=e.arrowGroup.children;for(let r=0;r<e.arrowPhases.length;r++){const n=(s/i+e.arrowPhases[r])%1;a[r].position.y=t*(1-n)}}detectTeleports(e){for(const s of Object.values(e.players))s.teleported&&(this.teleportEffects.push(new Ct(this.scene,s.teleported.x,s.teleported.y,this.particles)),this.teleportEffects.push(new Ct(this.scene,s.position.x,s.position.y,this.particles)))}update(e){const s=this.clock.getDelta();this.elapsedTime+=s,this.emitAccumulator+=s,this.shouldEmitContinuous=this.emitAccumulator>=1/60,this.shouldEmitContinuous&&(this.emitAccumulator%=1/60),this.detectTeleports(e),this.syncFireballs(e),this.syncArrows(e),this.syncFireWalls(e),this.syncMeteors(e),this.syncRainOfArrows(e),this.particles.update(s);for(let t=this.teleportEffects.length-1;t>=0;t--)this.teleportEffects[t].update(s),this.teleportEffects[t].done&&this.teleportEffects.splice(t,1)}syncFireballs(e){const s=new Set(e.projectiles.filter(t=>t.type==="fireball").map(t=>t.id));for(const[t,i]of this.fireballs)if(!s.has(t)){const a=this.prevFireballPositions.get(t);a&&this.particles.emitExplosion(a.x,a.y,a.z,a.radius),this.scene.remove(i),T(i),this.fireballs.delete(t),this.prevFireballPositions.delete(t)}for(const t of e.projectiles){if(t.type!=="fireball")continue;if(!this.fireballs.has(t.id)){const h=t.radius??10,f=new _(Ze,rs);f.scale.setScalar(h*.8);const m=new _(Ze,ns);m.scale.setScalar(1.4/.8),f.add(m),this.scene.add(f),this.fireballs.set(t.id,f)}const i=this.fireballs.get(t.id),a=t.position.x,r=30,n=t.position.y;i.position.set(a,r,n);const c=this.prevFireballPositions.get(t.id);let d=0,p=0;if(c){const h=a-c.x,f=n-c.z,m=Math.sqrt(h*h+f*f);m>0&&(d=h/m,p=f/m)}this.shouldEmitContinuous&&this.particles.emitTrail(a,r,n,d,p,t.radius??10),this.prevFireballPositions.set(t.id,{x:a,y:r,z:n,radius:t.blastRadius??t.radius??10})}}syncArrows(e){const s=new Set(e.projectiles.filter(t=>t.type==="arrow").map(t=>t.id));for(const[t,i]of this.arrows)s.has(t)||(this.scene.remove(i.mesh),T(i.mesh),this.arrows.delete(t));for(const t of e.projectiles){if(t.type!=="arrow")continue;if(!this.arrows.has(t.id)){const h=new ce,f=t.ownerId===this.myId?ze[this.arrowElement]:16777215,m=new _(ts,Di(f));h.add(m);const x=new Ye(ss,Ui(f));h.add(x),this.scene.add(h),this.arrows.set(t.id,{mesh:h})}const i=this.arrows.get(t.id),a=t.position.x,r=30,n=t.position.y;i.mesh.position.set(a,r,n);const c=t.velocity.x,d=t.velocity.y,p=Math.atan2(d,c);i.mesh.rotation.set(-Math.PI/2,0,-p)}}syncFireWalls(e){const s=new Set(e.fireWalls.map(t=>t.id));for(const[t,i]of this.fireWalls)if(!s.has(t)){this.scene.remove(i),T(i),this.fireWalls.delete(t);const a=this.rainZoneArrows.get(t);a&&(this.scene.remove(a.arrowGroup),T(a.arrowGroup),this.rainZoneArrows.delete(t))}for(const t of e.fireWalls){const i=t.id.startsWith("rain_zone_");if(!this.fireWalls.has(t.id)){const a=new ce;if(t.shape==="circle"&&t.center&&t.radius){const r=new _(new je(t.radius,32),new F({color:i?ze[this.arrowElement]:16720384,transparent:!0,opacity:i?.15:.2,side:we}));r.rotation.x=-Math.PI/2,r.position.set(t.center.x,1,t.center.y),a.add(r),i&&this.rainZoneArrows.set(t.id,this.createFallingArrows(t.center.x,t.center.y,t.radius,12))}else for(const r of t.segments){const n=[new R(r.x1,1,r.y1),new R(r.x2,1,r.y2)],c=new Ye(new Pe().setFromPoints(n),cs);a.add(c)}this.scene.add(a),this.fireWalls.set(t.id,a)}if(t.shape==="circle"&&t.center&&t.radius)if(i){const a=this.rainZoneArrows.get(t.id);a&&this.updateFallingArrows(a)}else this.shouldEmitContinuous&&this.particles.emitCrater(t.center.x,t.center.y,t.radius);else this.shouldEmitContinuous&&this.particles.emitWall(t.segments)}}syncMeteors(e){const s=new Set(e.meteors.map(t=>t.id));for(const[t,i]of this.meteors)s.has(t)||(this.scene.remove(i.ring),this.scene.remove(i.rock),T(i.ring),T(i.rock),this.particles.emitMeteorImpact(i.target.x,0,i.target.y),this.meteors.delete(t));for(const t of e.meteors){if(!this.meteors.has(t.id)){const f=t.aoeRadius/oi,m=new _(as,new F({color:16720384,transparent:!0,opacity:.6,side:we}));m.rotation.x=-Math.PI/2,m.position.set(t.target.x,2,t.target.y);const x=new _(os,ls);this.scene.add(m),this.scene.add(x),this.meteors.set(t.id,{ring:m,rock:x,target:{...t.target},spawnTime:this.elapsedTime,sizeScale:f})}const i=this.meteors.get(t.id),a=!t.hidden||t.ownerId===this.myId;i.ring.visible=a,i.rock.visible=a;const r=Math.max(0,Math.min(1,1-(t.strikeAt-e.tick)/ai)),n=1-r*.4;i.ring.scale.setScalar(n*i.sizeScale);const c=this.elapsedTime-i.spawnTime,d=.5+r*2;i.ring.material.opacity=Math.sin(c*d*Math.PI*2)*.3+.5;const p=500*(1-r);i.rock.position.set(t.target.x,p,t.target.y);const h=.4+r*.6;i.rock.scale.setScalar(h*i.sizeScale),this.shouldEmitContinuous&&a&&this.particles.emitMeteorTrail(t.target.x,p,t.target.y)}}syncRainOfArrows(e){const s=new Set(e.rainOfArrows.map(t=>t.id));for(const[t,i]of this.rainOfArrows)s.has(t)||(this.scene.remove(i.circle),this.scene.remove(i.arrowGroup),T(i.circle),T(i.arrowGroup),this.particles.emitRainImpact(i.target.x,0,i.target.y,i.radius),this.rainOfArrows.delete(t));for(const t of e.rainOfArrows){if(!this.rainOfArrows.has(t.id)){const r=ze[this.arrowElement],n=new _(new je(t.radius,48),new F({color:r,transparent:!0,opacity:.12,side:we}));n.rotation.x=-Math.PI/2,n.position.set(t.target.x,1,t.target.y),this.scene.add(n);const c=this.createFallingArrows(t.target.x,t.target.y,t.radius);c.arrowMaterial.opacity=0,this.rainOfArrows.set(t.id,{circle:n,target:{...t.target},radius:t.radius,...c})}const i=this.rainOfArrows.get(t.id),a=Math.max(0,Math.min(1,1-(t.strikeAt-e.tick)/ri));i.circle.material.opacity=.12+a*.23,i.arrowMaterial.opacity=Math.min(1,a*2),this.updateFallingArrows(i)}}dispose(){for(const e of this.fireballs.values())this.scene.remove(e),T(e);for(const e of this.arrows.values())this.scene.remove(e.mesh),T(e.mesh);for(const e of this.fireWalls.values())this.scene.remove(e),T(e);for(const e of this.rainZoneArrows.values())this.scene.remove(e.arrowGroup),T(e.arrowGroup);this.rainZoneArrows.clear();for(const e of this.meteors.values())this.scene.remove(e.ring),this.scene.remove(e.rock),T(e.ring),T(e.rock);for(const e of this.rainOfArrows.values())this.scene.remove(e.circle),this.scene.remove(e.arrowGroup),T(e.circle),T(e.arrowGroup);for(const e of this.teleportEffects)e.dispose();this.fireballs.clear(),this.arrows.clear(),this.fireWalls.clear(),this.meteors.clear(),this.rainOfArrows.clear(),this.teleportEffects.length=0,this.particles.dispose()}}const ds=1e3/Ae,Ue=2*ds,Gi=250;class ji{constructor(){l(this,"snapshots",[]);l(this,"maxSnapshots",32);l(this,"clockOffset",null);l(this,"jitter",0);l(this,"renderDelayMs",Ue);l(this,"outOfBandCount",0)}push(e,s=performance.now()){const t=e.tick*ds,i=s-t;this.clockOffset===null?this.clockOffset=i:Math.abs(i-this.clockOffset)>Gi?(this.outOfBandCount++,this.outOfBandCount>=2&&(this.clockOffset=i,this.jitter=0,this.outOfBandCount=0)):(this.outOfBandCount=0,this.jitter=this.jitter*.9+Math.abs(i-this.clockOffset)*.1,this.clockOffset=this.clockOffset*.95+i*.05),this.renderDelayMs=Ue+this.jitter*2,this.snapshots.push({state:e,tickTime:t}),this.snapshots.length>this.maxSnapshots&&this.snapshots.shift()}getInterpolated(e=performance.now()){if(this.snapshots.length<2||this.clockOffset===null)return null;const s=e-this.clockOffset-this.renderDelayMs;let t=0;for(;t<this.snapshots.length-1&&!(this.snapshots[t+1].tickTime>=s);t++);t=Math.max(0,Math.min(t,this.snapshots.length-2));const i=this.snapshots[t],a=this.snapshots[t+1],r=a.tickTime-i.tickTime,n=r>0?Math.max(0,Math.min(1,(s-i.tickTime)/r)):1,c={};for(const d of Object.keys(a.state.players)){const p=i.state.players[d],h=a.state.players[d];if(!p){c[d]=h;continue}c[d]={...h,position:Yi(p.position,h.position,n),facing:Xi(p.facing,h.facing,n)}}return{...a.state,players:c}}getLatest(){return this.snapshots.length===0?null:this.snapshots[this.snapshots.length-1].state}clear(){this.snapshots=[],this.clockOffset=null,this.jitter=0,this.renderDelayMs=Ue,this.outOfBandCount=0}}function Yi(o,e,s){return{x:o.x+(e.x-o.x)*s,y:o.y+(e.y-o.y)*s}}function Xi(o,e,s){let t=e-o;for(;t>Math.PI;)t-=2*Math.PI;for(;t<-Math.PI;)t+=2*Math.PI;return o+t*s}const Vi=30,Wi=.5,Zi=100;class Ki{constructor(e){l(this,"position");l(this,"prevPosition");l(this,"seq",0);l(this,"buffer",[]);l(this,"correctionOffset",{x:0,y:0});l(this,"correctionStartTime",0);l(this,"correctionDurationMs",Zi);this.position={...e},this.prevPosition={...e}}applyInput(e,s,t={}){this.seq++,this.prevPosition={...this.position};const i=t.speedMult??1;return this.position=gt(this.position,e,i),t.teleportTarget&&(this.position=bt(this.position,t.teleportTarget,t.teleportRange),this.prevPosition={...this.position}),this.buffer.push({seq:this.seq,move:e,speedMult:i,teleportTarget:t.teleportTarget,teleportRange:t.teleportRange}),this.seq}reconcile(e,s){if(this.buffer=this.buffer.filter(n=>n.seq>s),this.buffer.length>Vi){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0};return}let t={...e};for(const n of this.buffer)t=gt(t,n.move,n.speedMult),n.teleportTarget&&(t=bt(t,n.teleportTarget,n.teleportRange));const i=t.x-this.position.x,a=t.y-this.position.y;if(Math.sqrt(i*i+a*a)>Wi){const n=performance.now(),c=this.getRenderPosition(1,n),d=this.position.x-this.prevPosition.x,p=this.position.y-this.prevPosition.y;this.correctionOffset={x:c.x-t.x,y:c.y-t.y},this.correctionStartTime=n,this.prevPosition={x:t.x-d,y:t.y-p},this.position=t}}getPosition(e=performance.now()){return this.getRenderPosition(1,e)}getRenderPosition(e,s=performance.now()){const t=Math.max(0,Math.min(1,e)),i={x:this.prevPosition.x+(this.position.x-this.prevPosition.x)*t,y:this.prevPosition.y+(this.position.y-this.prevPosition.y)*t};if(this.correctionOffset.x===0&&this.correctionOffset.y===0)return i;const a=s-this.correctionStartTime,n=1-Math.min(1,a/this.correctionDurationMs);return{x:i.x+this.correctionOffset.x*n,y:i.y+this.correctionOffset.y*n}}reset(e){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0}}getSeq(){return this.seq}}class Qi{constructor(){l(this,"socket");this.socket=qs("",{autoConnect:!1,transports:["websocket"]})}connect(){this.socket.connect()}disconnect(){this.socket.removeAllListeners(),this.socket.disconnect()}joinRoom(e,s,t,i,a){this.socket.emit("join-room",{roomId:e,displayName:s,accessToken:t,teamId:i,characterId:a})}ready(){this.socket.emit("player-ready")}sendInput(e){this.socket.emit("input",e)}rematch(){this.socket.emit("rematch")}sendChatMessage(e){this.socket.emit("chat-message",{text:e})}rejoinRoom(e,s){this.socket.emit("rejoin-room",{roomId:e,accessToken:s})}leavePausedMatch(){this.socket.emit("leave-paused-match")}onRoomJoined(e){this.socket.once("room-joined",e)}onPlayerJoined(e){this.socket.on("player-joined",e)}onGameReady(e){this.socket.once("game-ready",e)}onGameState(e){this.socket.off("game-state"),this.socket.on("game-state",e)}onDuelEnded(e){this.socket.off("duel-ended"),this.socket.on("duel-ended",e)}onRematchReady(e){this.socket.off("rematch-ready"),this.socket.on("rematch-ready",e)}onRematchRequested(e){this.socket.off("rematch-requested"),this.socket.on("rematch-requested",e)}onOpponentDisconnected(e){this.socket.off("opponent-disconnected"),this.socket.on("opponent-disconnected",e)}onTeamFull(e){this.socket.once("team-full",e)}onPlayerDisconnected(e){this.socket.on("player-disconnected",e)}onPlayerLeft(e){this.socket.on("player-left",e)}onRoomNotFound(e){this.socket.off("room-not-found"),this.socket.on("room-not-found",e)}onChatMessage(e){this.socket.off("chat-message"),this.socket.on("chat-message",e)}onPlayerReadyAck(e){this.socket.off("player-ready-ack"),this.socket.on("player-ready-ack",e)}onMatchPaused(e){this.socket.off("match-paused"),this.socket.on("match-paused",e)}onGameResumed(e){this.socket.off("game-resumed"),this.socket.on("game-resumed",e)}onRejoinAccepted(e){this.socket.off("rejoin-accepted"),this.socket.once("rejoin-accepted",e)}onRejoinFailed(e){this.socket.off("rejoin-failed"),this.socket.once("rejoin-failed",e)}onReconnect(e){this.socket.on("connect",e)}onDisconnect(e){this.socket.on("disconnect",e)}get id(){return this.socket.id??""}}const ps=-Math.PI/4,Et=Math.cos(ps),Pt=Math.sin(ps);class Ji{constructor(e,s){l(this,"keys",new Set);l(this,"activeSpell",1);l(this,"charClass","mage");l(this,"mouseScreen",{x:0,y:0});l(this,"mouseWorld",{x:1e3,y:1e3});l(this,"pendingCast",null);l(this,"onKeyDown",e=>{this.keys.add(e.code);const s=/^Digit([1-4])$/.exec(e.code);if(s){const t=this.spellForKey(Number(s[1]));t&&(this.activeSpell=t)}if(e.code==="Space"){e.preventDefault();const t=this.spellForKey(4);t&&(this.pendingCast={spell:t,aimTarget:this.mouseWorld})}});l(this,"onKeyUp",e=>{this.keys.delete(e.code)});l(this,"onBlur",()=>{this.keys.clear()});l(this,"onMouseMove",e=>{this.mouseScreen={x:e.clientX,y:e.clientY},this.mouseWorld=this.scene.screenToWorld(e.clientX,e.clientY)});l(this,"onMouseDown",e=>{});l(this,"onMouseUp",e=>{e.button===0&&(this.pendingCast={spell:this.activeSpell,aimTarget:this.mouseWorld})});this.scene=e,this.canvas=s,window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur),window.addEventListener("contextmenu",this.onBlur),s.addEventListener("mousemove",this.onMouseMove),s.addEventListener("mousedown",this.onMouseDown),s.addEventListener("mouseup",this.onMouseUp)}spellForKey(e){var s;return((s=ot.find(t=>t.charClass===this.charClass&&t.key===e))==null?void 0:s.spell)??null}buildInputFrame(){const e={x:0,y:0};(this.keys.has("KeyW")||this.keys.has("ArrowUp"))&&(e.y-=1),(this.keys.has("KeyS")||this.keys.has("ArrowDown"))&&(e.y+=1),(this.keys.has("KeyA")||this.keys.has("ArrowLeft"))&&(e.x-=1),(this.keys.has("KeyD")||this.keys.has("ArrowRight"))&&(e.x+=1);const s=e.x*Et-e.y*Pt,t=e.x*Pt+e.y*Et;e.x=s,e.y=t;const i={move:e,castSpell:null,aimTarget:this.mouseWorld};return this.pendingCast&&(i.castSpell=this.pendingCast.spell,i.aimTarget=this.pendingCast.aimTarget,this.pendingCast=null),i}refreshMouseWorld(){this.mouseWorld=this.scene.screenToWorld(this.mouseScreen.x,this.mouseScreen.y)}setCharacterClass(e){this.charClass=e==="amazon"?"amazon":"mage",this.activeSpell=this.spellForKey(1)??1}getActiveSpell(){return this.activeSpell}getCurrentMouseWorld(){return this.mouseWorld}dispose(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),window.removeEventListener("contextmenu",this.onBlur),this.canvas.removeEventListener("mousemove",this.onMouseMove),this.canvas.removeEventListener("mousedown",this.onMouseDown),this.canvas.removeEventListener("mouseup",this.onMouseUp)}}const D=120;function He(o,e){const s=D/2+(o-e)*D/(2*k),t=(o+e)*D/(2*k);return[s,t]}class ea{constructor(e){l(this,"canvas");l(this,"ctx");this.canvas=document.createElement("canvas"),this.canvas.width=D,this.canvas.height=D,Object.assign(this.canvas.style,{position:"fixed",top:"12px",right:"12px",opacity:"0.85",border:"none",borderRadius:"0",boxShadow:"0 0 0 2px var(--px-border-dark),0 0 0 4px var(--px-border-light)",imageRendering:"pixelated",zIndex:"100",display:"none"}),e.appendChild(this.canvas),this.ctx=this.canvas.getContext("2d")}update(e,s){const t=this.ctx;t.clearRect(0,0,D,D),t.fillStyle="#0a0a1a",t.fillRect(0,0,D,D),t.strokeStyle="#333",t.lineWidth=1,t.strokeRect(0,0,D,D),t.fillStyle="#6c63ff";for(const n of ke){const[c,d]=He(n.x,n.y);t.fillRect(c-2,d-2,4,4)}const i=["#ff5252","#ff9800","#ab47bc"];for(let n=0;n<s.length;n++){const c=s[n];if(c.hp<=0)continue;const[d,p]=He(c.position.x,c.position.y);t.fillStyle=i[n%i.length],t.beginPath(),t.arc(d,p,3,0,Math.PI*2),t.fill()}const[a,r]=He(e.position.x,e.position.y);t.fillStyle="#00e676",t.beginPath(),t.arc(a,r,3,0,Math.PI*2),t.fill()}show(){this.canvas.style.display=""}hide(){this.canvas.style.display="none"}}const ta={1:"FB",2:"FW",3:"MT",4:"TP",5:"PS",6:"MS",7:"RA",8:"EV"};class sa{constructor(e){l(this,"el");l(this,"minimap");l(this,"myId","");l(this,"prevHp",{});l(this,"hpFill");l(this,"mpFill");l(this,"spellsEl");l(this,"enemiesEl");l(this,"slotEls",new Map);l(this,"enemyRows",new Map);l(this,"lastHpPct",-1);l(this,"lastMpPct",-1);this.minimap=new ea(e),this.el=document.createElement("div"),this.el.innerHTML=`
      <style>
        .hud-panel{position:fixed;bottom:0;left:0;right:0;height:72px;background:var(--px-panel);box-shadow:0 -2px 0 0 var(--px-border-light),0 -4px 0 0 var(--px-border-dark);display:flex;align-items:center;justify-content:space-between;padding:0 20px}
        .orb{width:80px;height:80px;position:relative;overflow:hidden;margin-bottom:16px;background:var(--px-border-dark);box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);border:none;border-radius:0}
        .orb-fill{position:absolute;inset:0;transition:transform .1s;image-rendering:pixelated}
        .orb-hp .orb-fill{background:repeating-linear-gradient(0deg,#a02222 0 6px,#c23333 6px 12px)}
        .orb-mp .orb-fill{background:repeating-linear-gradient(0deg,#2244a0 0 6px,#3355c2 6px 12px)}
        .spells{display:flex;gap:6px}
        .spell-slot{width:44px;height:44px;background:#33294a;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);border:none;border-radius:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-text);position:relative;overflow:hidden;cursor:pointer}
        .spell-slot.active{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);color:var(--px-accent)}
        .spell-slot .cd-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(14,11,22,0.75);transition:height .1s}
        .hud-enemies{position:fixed;top:12px;right:140px;display:flex;flex-direction:column;gap:6px;min-width:160px}
        .hud-enemy-entry{text-align:center}
        .hud-enemy-entry .enemy-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);margin-bottom:3px}
        .hud-enemy-entry .enemy-hp-track{height:10px;background:var(--px-border-dark);border-radius:0;overflow:hidden;width:160px;box-shadow:0 0 0 2px var(--px-border-dark)}
        .hud-enemy-entry .enemy-hp-fill{height:100%;background:repeating-linear-gradient(90deg,#a02222 0 6px,#c23333 6px 12px);border-radius:0;transition:width .1s}
        .hud-elim{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;text-shadow:2px 2px 0 var(--px-border-dark);pointer-events:none;animation:hud-elim-fade 2s forwards}
        @keyframes hud-elim-fade{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(0.9)}}
      </style>
      <div id="hud-enemies" class="hud-enemies"></div>
      <div class="hud-panel">
        <div class="orb orb-hp"><div class="orb-fill" id="hud-hp" style="transform:translateY(0%)"></div></div>
        <div class="spells" id="hud-spells"></div>
        <div class="orb orb-mp"><div class="orb-fill" id="hud-mp" style="transform:translateY(0%)"></div></div>
      </div>
    `,e.appendChild(this.el),this.hpFill=this.el.querySelector("#hud-hp"),this.mpFill=this.el.querySelector("#hud-mp"),this.spellsEl=this.el.querySelector("#hud-spells"),this.enemiesEl=this.el.querySelector("#hud-enemies")}init(e){this.myId=e,this.prevHp={},this.enemiesEl.textContent="",this.enemyRows.clear(),this.lastHpPct=-1,this.lastMpPct=-1}buildSpellSlots(e){this.spellsEl.textContent="",this.slotEls.clear();for(const s of ot){if(!e.has(s.spell))continue;const t=document.createElement("div");t.className="spell-slot",t.innerHTML=`<span>${ta[s.spell]}</span><span style="font-size:9px;color:#888">${s.key}</span><div class="cd-overlay" style="height:0%"></div>`,this.spellsEl.appendChild(t),this.slotEls.set(s.spell,{slot:t,cd:t.querySelector(".cd-overlay"),lastPct:0,lastActive:!1})}}update(e,s){const t=e.players[this.myId];if(!t)return;const i=Math.round((1-t.hp/xt)*1e3)/10;i!==this.lastHpPct&&(this.hpFill.style.transform=`translateY(${i}%)`,this.lastHpPct=i);const a=Math.round((1-t.mana/ii)*1e3)/10;a!==this.lastMpPct&&(this.mpFill.style.transform=`translateY(${a}%)`,this.lastMpPct=a);for(const[d,p]of this.slotEls){const h=d===s;h!==p.lastActive&&(p.slot.classList.toggle("active",h),p.lastActive=h);const f=t.cooldowns[d]??0,m=Ve[d].cooldownTicks,x=m>0?Math.round(f/m*1e3)/10:0;x!==p.lastPct&&(p.cd.style.height=`${x}%`,p.lastPct=x)}const r=[],n=new Set;for(const[d,p]of Object.entries(e.players)){if(d===this.myId)continue;n.add(d),r.push(p);let h=this.enemyRows.get(d);if(!h){const m=document.createElement("div");m.className="hud-enemy-entry";const x=document.createElement("div");x.className="enemy-name";const u=document.createElement("div");u.className="enemy-hp-track";const C=document.createElement("div");C.className="enemy-hp-fill",u.appendChild(C),m.append(x,u),this.enemiesEl.appendChild(m),h={row:m,name:x,fill:C,lastHp:-1,lastName:""},this.enemyRows.set(d,h)}p.displayName!==h.lastName&&(h.name.textContent=p.displayName,h.lastName=p.displayName),p.hp!==h.lastHp&&(h.fill.style.width=`${p.hp/xt*100}%`,h.row.style.opacity=p.hp<=0?"0.3":"1",h.lastHp=p.hp);const f=this.prevHp[d];f!==void 0&&f>0&&p.hp<=0&&this.showElimination(p.displayName)}for(const[d,p]of this.enemyRows)n.has(d)||(p.row.remove(),this.enemyRows.delete(d));const c={};for(const[d,p]of Object.entries(e.players))c[d]=p.hp;this.prevHp=c,this.minimap.update(t,r)}showElimination(e){const s=document.createElement("div");s.className="hud-elim",s.textContent=`${e} eliminated`,this.el.appendChild(s),setTimeout(()=>s.remove(),2e3)}show(){this.el.style.display="",this.minimap.show()}hide(){this.el.style.display="none",this.minimap.hide()}}function z(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const ia=`
.bm-overlay{position:fixed;inset:0;z-index:100;}
.bm-bg{position:absolute;inset:0;overflow:hidden;}
.bm-sky{position:absolute;inset:0;background:linear-gradient(180deg,#050208 0%,#0d0714 20%,#1a1524 45%,#241d33 65%,#160f22 80%,#0e0b16 100%);}
.bm-moon{position:absolute;top:6%;left:50%;transform:translateX(-50%);width:80px;height:80px;border-radius:0;background:radial-gradient(circle,#e8d8a0 0%,#c8a850 30%,transparent 70%);box-shadow:0 0 40px 20px rgba(255,179,71,0.15);opacity:0.6;}
.bm-fog{position:absolute;left:-20%;right:-20%;border-radius:0;filter:blur(40px);animation:bm-drift linear infinite;}
.bm-fog-1{bottom:28%;height:120px;background:radial-gradient(ellipse,rgba(120,100,170,0.5) 0%,transparent 70%);opacity:0.18;animation-duration:28s;}
.bm-fog-2{bottom:22%;height:80px;background:radial-gradient(ellipse,rgba(100,80,150,0.4) 0%,transparent 70%);opacity:0.14;animation-duration:38s;animation-delay:-12s;}
.bm-fog-3{bottom:32%;height:60px;background:radial-gradient(ellipse,rgba(110,90,160,0.3) 0%,transparent 70%);opacity:0.1;animation-duration:22s;animation-delay:-6s;}
@keyframes bm-drift{0%{transform:translateX(0)}50%{transform:translateX(8%)}100%{transform:translateX(0)}}
.bm-grain{position:absolute;inset:0;opacity:0.06;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:256px 256px;}
.bm-vignette{position:absolute;inset:0;background:radial-gradient(ellipse 90% 90% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);}
.bm-ui{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 24px;font-family:'VT323',monospace;color:var(--px-text);}
.bm-title{font-family:'Press Start 2P',monospace;font-size:40px;color:var(--px-accent);text-shadow:0 0 20px rgba(255,179,71,0.6),3px 3px 0 var(--px-border-dark);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
.bm-subtitle{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-border-light);letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;}
.bm-divider{display:flex;align-items:center;gap:12px;width:100%;max-width:940px;margin-bottom:28px;}
.bm-divider-line{flex:1;height:2px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.bm-divider-gem{width:10px;height:10px;background:var(--px-accent);transform:rotate(45deg);box-shadow:0 0 8px rgba(255,179,71,0.6);}
.bm-layout{display:flex;gap:20px;width:100%;max-width:940px;align-items:flex-start;}
.bm-panel{padding:22px;position:relative;}
.bm-panel-left{flex:0 0 280px;}
.bm-panel-right{flex:1;}
.bm-ptitle{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--px-border-light);margin-bottom:16px;padding-bottom:8px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.bm-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;margin-bottom:6px;}
.bm-input{width:100%;font-size:9px;letter-spacing:1px;margin-bottom:20px;}
.bm-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;}
.bm-mode{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:0.5px;padding:8px 6px;text-align:center;}
.bm-mode.active{background:#453766;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.bm-mode.locked{opacity:0.4;cursor:not-allowed;position:relative;}
.bm-mode.locked::after{content:'Soon';position:absolute;top:3px;right:4px;font-size:6px;color:var(--px-border-light);letter-spacing:0.5px;}
.bm-mode-label{font-size:10px;display:block;margin-bottom:3px;}
.bm-mode-desc{font-size:7px;opacity:0.7;font-family:'Press Start 2P',monospace;letter-spacing:0.5px;}
.bm-btn-red{width:100%;margin-bottom:10px;}
.bm-sep{display:flex;align-items:center;gap:10px;margin:14px 0;}
.bm-sep-line{flex:1;height:1px;background:var(--px-border-dark);}
.bm-sep-text{color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;}
.bm-code-row{display:flex;gap:6px;}
.bm-code-input{flex:1;font-size:9px;letter-spacing:1px;}
.bm-btn-blue{font-size:8px;letter-spacing:1px;}
.bm-lobby-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.bm-lobby-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;}
.bm-pulse{width:6px;height:6px;border-radius:0;background:var(--px-success);box-shadow:0 0 6px rgba(111,206,126,0.6);animation:bm-pulse 2s ease-in-out infinite;}
@keyframes bm-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.bm-room-row{display:flex;align-items:center;padding:10px 12px;margin-bottom:6px;background:var(--px-border-dark);box-shadow:0 0 0 1px var(--px-border-light),-3px 0 0 0 #453766;transition:all 0.15s;cursor:pointer;}
.bm-room-row:hover{background:#1c1730;box-shadow:0 0 0 1px var(--px-border-light),-3px 0 0 0 var(--px-accent);}
.bm-room-info{flex:1;}
.bm-room-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);}
.bm-room-meta{font-size:16px;color:var(--px-border-light);margin-top:1px;font-family:'VT323',monospace;}
.bm-tag{font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.5px;padding:3px 8px;margin-right:12px;text-transform:uppercase;background:var(--px-border-dark);box-shadow:0 0 0 2px #453766;color:var(--px-accent);}
.bm-players{font-size:16px;color:var(--px-border-light);margin-right:8px;white-space:nowrap;font-family:'VT323',monospace;}
.bm-players b{color:var(--px-text);}
.bm-btn-green-sm{font-size:7px;letter-spacing:1px;}
.bm-empty{padding:40px 20px;text-align:center;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.5px;line-height:2.2;outline:2px dashed var(--px-border-light);}
.bm-code-block{background:var(--px-border-dark);padding:10px 12px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 0 0 1px var(--px-border-light);}
.bm-code-label{font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;margin-bottom:2px;}
.bm-code-value{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:2px;}
.bm-copy-btn{font-size:7px;letter-spacing:0.5px;}
.bm-slot{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:8px;background:var(--px-border-dark);box-shadow:0 0 0 1px var(--px-border-light);}
.bm-avatar{width:32px;height:32px;border-radius:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:11px;flex-shrink:0;}
.bm-avatar-0{background:#3a1414;box-shadow:0 0 0 2px #a04030;color:#ff8844;}
.bm-avatar-1{background:#131c30;box-shadow:0 0 0 2px #2f5aa0;color:#4488ff;}
.bm-avatar-2{background:#0f2530;box-shadow:0 0 0 2px #1c7fa0;color:#4fc3e8;}
.bm-avatar-3{background:#132a18;box-shadow:0 0 0 2px #2f8a45;color:#5fdc78;}
.bm-avatar-empty{background:var(--px-border-dark);outline:2px dashed var(--px-border-light);color:var(--px-border-light);}
.bm-slot-info{flex:1;}
.bm-slot-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);}
.bm-slot-status{font-size:16px;margin-top:2px;font-family:'VT323',monospace;}
.bm-status-ready{color:var(--px-success);}
.bm-status-waiting{color:var(--px-border-light);}
.bm-status-empty{color:var(--px-border-light);opacity:0.6;font-style:italic;}
.bm-btn-green{width:100%;margin-top:20px;font-size:9px;letter-spacing:2px;}
.bm-btn-green-done{width:100%;margin-top:20px;font-size:9px;letter-spacing:2px;opacity:0.7;cursor:default;color:var(--px-success);}
.bm-waiting-text{text-align:center;margin-top:10px;font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;}
.bm-chat-msgs{background:var(--px-border-dark);padding:12px;height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;box-shadow:0 0 0 1px var(--px-border-light);}
.bm-msg{display:flex;gap:8px;align-items:flex-start;}
.bm-msg-sender{font-family:'Press Start 2P',monospace;font-size:8px;white-space:nowrap;flex-shrink:0;margin-top:2px;}
.bm-msg-sender-0{color:#ff8844;}
.bm-msg-sender-1{color:#4488ff;}
.bm-msg-sender-sys{color:var(--px-border-light);font-style:italic;}
.bm-msg-text{font-size:16px;color:var(--px-text);line-height:1.4;font-family:'VT323',monospace;}
.bm-msg-sys{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-border-light);letter-spacing:0.5px;font-style:italic;}
.bm-chat-row{display:flex;gap:8px;}
.bm-chat-input{flex:1;}
.bm-btn-send{font-size:7px;letter-spacing:1px;}
@keyframes bm-slam{0%{transform:scale(1.6);opacity:0;filter:blur(8px)}50%{transform:scale(0.97);opacity:1;filter:blur(0)}70%{transform:scale(1.02)}100%{transform:scale(1)}}
@keyframes bm-rise{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes bm-lvlpop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes bm-glow-breathe{0%,100%{opacity:0.5}50%{opacity:1}}
.bm-result-panel{text-align:center;max-width:460px;padding:40px 52px 36px !important;position:relative;overflow:hidden;}
.bm-result-panel.bm-win{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent),0 0 80px rgba(255,179,71,0.12),0 4px 32px rgba(0,0,0,0.7);}
.bm-result-panel.bm-lose{box-shadow:0 -2px 0 0 var(--px-danger),0 2px 0 0 var(--px-danger),-2px 0 0 0 var(--px-danger),2px 0 0 0 var(--px-danger),0 0 80px rgba(224,91,91,0.1),0 4px 32px rgba(0,0,0,0.7);}
.bm-result-glow{position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:300px;height:200px;border-radius:0;filter:blur(60px);pointer-events:none;animation:bm-glow-breathe 3s ease-in-out infinite;}
.bm-win .bm-result-glow{background:rgba(255,179,71,0.18);}
.bm-lose .bm-result-glow{background:rgba(224,91,91,0.12);}
.bm-result-ornament{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:24px;opacity:0;animation:bm-rise 0.6s ease-out 0.1s forwards;}
.bm-result-ornament-line{width:60px;height:2px;}
.bm-win .bm-result-ornament-line{background:linear-gradient(90deg,transparent,var(--px-accent));}
.bm-lose .bm-result-ornament-line{background:linear-gradient(90deg,transparent,var(--px-danger));}
.bm-result-ornament-gem{width:8px;height:8px;transform:rotate(45deg);}
.bm-win .bm-result-ornament-gem{background:var(--px-accent);box-shadow:0 0 8px rgba(255,179,71,0.6);}
.bm-lose .bm-result-ornament-gem{background:var(--px-danger);box-shadow:0 0 8px rgba(224,91,91,0.5);}
.bm-result-title{font-family:'Press Start 2P',monospace;font-size:32px;text-transform:uppercase;margin-bottom:10px;opacity:0;animation:bm-slam 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards;line-height:1.3;letter-spacing:2px;}
.bm-win .bm-result-title{color:var(--px-accent);text-shadow:0 0 30px rgba(255,179,71,0.7),2px 2px 0 var(--px-border-dark);}
.bm-lose .bm-result-title{color:var(--px-danger);text-shadow:0 0 30px rgba(224,91,91,0.5),2px 2px 0 var(--px-border-dark);}
.bm-result-sub{font-family:'VT323',monospace;font-size:18px;font-style:italic;margin-bottom:28px;opacity:0;animation:bm-rise 0.6s ease-out 0.55s forwards;}
.bm-win .bm-result-sub{color:var(--px-border-light);}
.bm-lose .bm-result-sub{color:var(--px-border-light);}
.bm-result-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 auto 20px;max-width:180px;opacity:0;animation:bm-rise 0.5s ease-out 0.7s forwards;}
.bm-result-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.bm-result-divider-dot{width:4px;height:4px;border-radius:0;background:var(--px-border-light);}
.bm-result-xp{font-family:'Press Start 2P',monospace;font-size:16px;letter-spacing:1px;margin-bottom:4px;opacity:0;animation:bm-rise 0.6s ease-out 0.8s forwards;color:var(--px-accent);}
.bm-result-xp-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;opacity:0;animation:bm-rise 0.5s ease-out 0.9s forwards;color:var(--px-border-light);}
.bm-result-levelup{font-family:'Press Start 2P',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--px-success);margin-bottom:24px;opacity:0;animation:bm-lvlpop 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s forwards;text-shadow:0 0 20px rgba(111,206,126,0.5);}
.bm-result-levelup-num{font-size:16px;color:var(--px-success);}
.bm-result-buttons{display:flex;flex-direction:column;gap:8px;opacity:0;animation:bm-rise 0.5s ease-out forwards;}
.bm-btn-rematch{width:100%;padding:13px 40px;font-size:9px;letter-spacing:1px;}
.bm-btn-return{width:100%;padding:12px 40px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-return:hover{color:var(--px-accent);}
.bm-disc-panel{text-align:center;max-width:360px;}
.bm-disc-title{font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;}
.bm-disc-sub{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-border-light);letter-spacing:1px;}
.bm-btn-logout{background:transparent;font-size:7px;letter-spacing:1px;}
.bm-btn-logout:hover{color:var(--px-danger);}
.bm-char-card{display:flex;align-items:center;gap:16px;padding:10px 20px;margin:-8px 0 20px;font-family:'Press Start 2P',monospace;max-width:600px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-border-dark);}
.bm-char-icon{width:38px;height:38px;border-radius:0;background:var(--px-border-dark);box-shadow:0 0 0 2px var(--px-accent);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.bm-char-details{flex:1;min-width:0;}
.bm-char-name{font-size:11px;color:var(--px-accent);letter-spacing:1px;}
.bm-char-meta{font-size:7px;color:var(--px-border-light);letter-spacing:1px;text-transform:uppercase;margin-top:4px;font-family:'Press Start 2P',monospace;}
.bm-char-meta b{color:var(--px-text);}
.bm-char-actions{display:flex;gap:8px;align-items:center;}
.bm-btn-ghost{background:transparent;font-size:7px;letter-spacing:1px;}
.bm-btn-ghost:hover{color:var(--px-accent);}
.bm-credits-btn{position:fixed;right:16px;bottom:16px;font-size:6px;padding:8px 10px;opacity:0.6;z-index:2;}
.bm-credits-btn:hover{opacity:1;}
.bm-pause-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;}
.bm-pause-title{font-size:20px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;text-shadow:0 0 20px rgba(224,91,91,0.6);}
.bm-pause-countdown{font-size:48px;color:var(--px-accent);letter-spacing:2px;margin-bottom:24px;text-shadow:0 0 30px rgba(255,179,71,0.4);}
.bm-pause-sub{font-size:8px;color:var(--px-border-light);letter-spacing:1px;margin-bottom:32px;}
.bm-btn-leave{padding:12px 32px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-leave:hover{color:var(--px-danger);}
.bm-btn-rematch.waiting{opacity:0.6;cursor:default;pointer-events:none;}
.bm-rematch-countdown{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-accent);letter-spacing:1px;margin-top:6px;text-align:center;animation:bm-pulse 1s ease-in-out infinite;}
`,aa=`
<div class="bm-bg">
  <div class="bm-sky"></div>
  <div class="bm-moon"></div>
  <svg viewBox="0 0 1400 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice" style="position:absolute;bottom:0;width:100%;height:auto;opacity:0.85">
    <defs>
      <linearGradient id="bm-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a1524" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#100c1c" stop-opacity="1"/>
        <stop offset="100%" stop-color="#0a0712" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect x="0" y="280" width="1400" height="220" fill="url(#bm-ground)"/>
    <ellipse cx="700" cy="330" rx="700" ry="40" fill="rgba(26,20,36,0.5)"/>
    <ellipse cx="420" cy="400" rx="70" ry="18" fill="rgba(90,4,4,0.5)"/>
    <ellipse cx="860" cy="420" rx="50" ry="12" fill="rgba(70,3,3,0.4)"/>
    <ellipse cx="1180" cy="390" rx="40" ry="10" fill="rgba(80,4,4,0.45)"/>
    <g opacity="0.18" fill="#0d0a14">
      <rect x="0" y="200" width="18" height="120"/><rect x="60" y="190" width="14" height="130"/>
      <rect x="120" y="205" width="20" height="115"/><rect x="200" y="185" width="16" height="135"/>
      <rect x="500" y="188" width="14" height="132"/><rect x="700" y="192" width="16" height="128"/>
      <rect x="900" y="185" width="18" height="135"/><rect x="1060" y="190" width="20" height="130"/>
      <rect x="1260" y="188" width="14" height="132"/><rect x="1380" y="195" width="12" height="125"/>
    </g>
    <g fill="#100a18">
      <rect x="48" y="120" width="12" height="200"/>
      <rect x="44" y="130" width="20" height="6" transform="rotate(-20 54 133)"/>
      <rect x="44" y="155" width="28" height="5" transform="rotate(15 58 157)"/>
      <rect x="44" y="175" width="22" height="4" transform="rotate(-10 55 177)"/>
      <rect x="110" y="100" width="16" height="230"/>
      <rect x="104" y="115" width="32" height="6" transform="rotate(-25 120 118)"/>
      <rect x="104" y="145" width="36" height="5" transform="rotate(18 122 147)"/>
      <rect x="104" y="165" width="26" height="4" transform="rotate(-15 117 167)"/>
      <rect x="116" y="130" width="30" height="5" transform="rotate(30 131 132)"/>
      <rect x="175" y="150" width="8" height="170"/>
      <rect x="171" y="165" width="18" height="4" transform="rotate(-18 180 167)"/>
      <rect x="171" y="188" width="22" height="4" transform="rotate(12 182 190)"/>
      <rect x="1200" y="110" width="18" height="220"/>
      <rect x="1193" y="125" width="36" height="6" transform="rotate(22 1209 128)"/>
      <rect x="1193" y="152" width="40" height="5" transform="rotate(-16 1213 154)"/>
      <rect x="1208" y="140" width="32" height="5" transform="rotate(-28 1224 142)"/>
      <rect x="1280" y="130" width="14" height="200"/>
      <rect x="1274" y="145" width="28" height="5" transform="rotate(-20 1287 147)"/>
      <rect x="1274" y="170" width="32" height="5" transform="rotate(14 1290 172)"/>
      <rect x="1355" y="140" width="9" height="180"/>
      <rect x="1350" y="155" width="20" height="4" transform="rotate(-15 1359 157)"/>
    </g>
    <g stroke="#241a30" stroke-width="1.5" opacity="0.6">
      <line x1="240" y1="340" x2="244" y2="300"/><line x1="248" y1="338" x2="250" y2="305"/>
      <line x1="650" y1="335" x2="653" y2="305"/><line x1="657" y1="337" x2="659" y2="310"/>
      <line x1="980" y1="342" x2="983" y2="310"/><line x1="987" y1="340" x2="989" y2="316"/>
    </g>
    <rect x="0" y="430" width="1400" height="70" fill="rgba(6,4,10,0.8)"/>
  </svg>
  <div class="bm-fog bm-fog-1"></div>
  <div class="bm-fog bm-fog-2"></div>
  <div class="bm-fog bm-fog-3"></div>
  <div class="bm-grain"></div>
  <div class="bm-vignette"></div>
</div>`;class oa{constructor(e,s){l(this,"el");l(this,"ui");l(this,"pollTimer",null);l(this,"pauseOverlay",null);l(this,"pauseCountdownTimer",null);l(this,"rematchInterval",null);this.cb=s;const t=document.createElement("style");t.textContent=ia,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="bm-overlay",this.el.innerHTML=aa,this.ui=document.createElement("div"),this.ui.className="bm-ui",this.el.appendChild(this.ui),e.appendChild(this.el),this.showHome()}showHome(e,s,t,i){this.stopPolling();const a=new URLSearchParams(window.location.search).get("room")??"",r=e!==void 0||s!==void 0,p={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',amazon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'}[t??""]??"⚔",h=r?`<div class="bm-char-card px-panel">
           <div class="bm-char-icon">${p}</div>
           <div class="bm-char-details">
             <div class="bm-char-name">${z(e??"")}</div>
             <div class="bm-char-meta">${t?`${z(t)}`:""}${i!==void 0?` · Lvl <b>${i}</b>`:""}${s!==void 0?` · <b>${s}</b> Skill Pts`:""}</div>
           </div>
           <div class="bm-char-actions">
             <button id="bm-skills" class="bm-btn-ghost px-btn">✦ Skills</button>
             <button id="bm-switch-char" class="bm-btn-ghost px-btn">⇄ Switch</button>
             <button id="bm-logout" class="bm-btn-logout px-btn">Sign Out</button>
           </div>
         </div>`:"",f=e?z(e):"";this.ui.innerHTML=`
      <div class="bm-title px-title">Blood Moor</div>
      <div class="bm-subtitle px-label">Enter the Arena · Choose Your Fate</div>
      ${h}
      <div class="bm-divider"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-layout">
        <div class="bm-panel px-panel bm-panel-left">
          <div class="bm-ptitle">Challenger</div>
          <input id="bm-name" type="hidden" value="${f}">
          <div class="bm-label">Game Mode</div>
          <div class="bm-mode-grid" id="mode-grid">
            <div class="bm-mode px-btn active" data-mode="1v1"><span class="bm-mode-label">1v1</span><span class="bm-mode-desc">Duel · 2 players</span></div>
            <div class="bm-mode px-btn" data-mode="ffa"><span class="bm-mode-label">FFA</span><span class="bm-mode-desc">Free-for-All · 4p</span></div>
            <div class="bm-mode px-btn" data-mode="2v2"><span class="bm-mode-label">2v2</span><span class="bm-mode-desc">Teams · 4 players</span></div>
          </div>
          <button id="bm-create" class="bm-btn-red px-btn px-btn-primary">⚔ Create Lobby</button>
          <div class="bm-sep"><div class="bm-sep-line"></div><div class="bm-sep-text">or</div><div class="bm-sep-line"></div></div>
          <div class="bm-label">Join by Code</div>
          <div class="bm-code-row">
            <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${z(a)}" maxlength="12">
            <button id="bm-join-code" class="bm-btn-blue px-btn">Join</button>
          </div>
        </div>
        <div class="bm-panel px-panel bm-panel-right">
          <div class="bm-lobby-header">
            <div class="bm-lobby-label">Open Lobbies</div>
            <div class="bm-pulse"></div>
          </div>
          <div id="bm-rooms"></div>
        </div>
      </div>
      <button id="bm-credits" class="bm-btn-ghost px-btn bm-credits-btn">Credits</button>`;const m=this.ui.querySelector("#bm-skills");m&&m.addEventListener("click",()=>this.cb.onOpenSkills());const x=this.ui.querySelector("#bm-switch-char");x&&x.addEventListener("click",()=>this.cb.onSwitchCharacter());const u=this.ui.querySelector("#bm-credits");u&&u.addEventListener("click",()=>this.cb.onShowCredits());const C=this.ui.querySelector("#bm-logout");C&&C.addEventListener("click",()=>this.cb.onLogout());const L=this.ui.querySelector("#mode-grid");let $="1v1";L.querySelectorAll(".bm-mode").forEach(S=>{S.addEventListener("click",()=>{L.querySelectorAll(".bm-mode").forEach(Z=>Z.classList.remove("active")),S.classList.add("active"),$=S.dataset.mode})}),this.ui.querySelector("#bm-create").addEventListener("click",()=>{const S=this.ui.querySelector("#bm-name").value.trim();S&&this.cb.onCreateRoom(S,$)}),this.ui.querySelector("#bm-join-code").addEventListener("click",()=>{const S=this.ui.querySelector("#bm-name").value.trim(),Z=this.ui.querySelector("#bm-code").value.trim();S&&Z&&this.cb.onJoinRoom(Z,S)}),this.ui.querySelector("#bm-code").addEventListener("keydown",S=>{S.key==="Enter"&&this.ui.querySelector("#bm-join-code").click()}),this.pollLobbies(),this.pollTimer=window.setInterval(()=>this.pollLobbies(),3e3),a&&this.ui.querySelector("#bm-name").focus()}showWaiting(e,s,t){this.stopPolling(),this.renderLobby(e,[{name:s,index:0,ready:!1}],t)}showReady(e,s,t,i,a){this.stopPolling();const r=Object.entries(s).map(([n,c],d)=>({name:c,index:d,ready:(a==null?void 0:a.has(n))??!1}));this.renderLobby(e,r,i)}showResult(e,s,t,i){this.stopPolling();let a,r;s==="2v2"?(a=e?"Your Team Wins":"Your Team Loses",r=e?"Your team dominated the arena":"Your team has fallen"):s==="ffa"?(a=e?"Victory":"Defeated",e?r="You are the last one standing":t?r=`Defeated — ${t===2?"2nd":t===3?"3rd":`${t}th`} place`:r="You have been eliminated"):(a=e?"Victory":"Defeat",r=e?"You are victorious":"You have been slain");const n=e?"bm-win":"bm-lose",c=i&&i.levelsGained>0,d=i?c?"1.4s":"1.1s":"0.8s",p=i?`<div class="bm-result-divider">
           <div class="bm-result-divider-line"></div>
           <div class="bm-result-divider-dot"></div>
           <div class="bm-result-divider-line"></div>
         </div>
         <div class="bm-result-xp">+<span id="bm-xp-count">0</span> XP</div>
         <div class="bm-result-xp-label">Experience Gained</div>
         ${c?`<div class="bm-result-levelup">Level Up <span class="bm-result-levelup-num">${i.newLevel}</span></div>`:""}`:"";if(this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-result-panel ${n}">
        <div class="bm-result-glow"></div>
        <div class="bm-result-ornament">
          <div class="bm-result-ornament-line"></div>
          <div class="bm-result-ornament-gem"></div>
          <div class="bm-result-ornament-line" style="transform:scaleX(-1)"></div>
        </div>
        <div class="bm-result-title">${a}</div>
        <div class="bm-result-sub">${r}</div>
        ${p}
        <div class="bm-result-buttons" style="animation-delay:${d}">
          <button id="bm-rematch" class="bm-btn-rematch px-btn">⚔ Rematch</button>
          <button id="bm-return-lobby" class="bm-btn-return px-btn">Return to Lobby</button>
        </div>
      </div>`,i&&i.xpGained>0){const h=this.ui.querySelector("#bm-xp-count");if(h){const f=i.xpGained,m=1200,x=performance.now()+800,u=C=>{const L=C-x;if(L<0){requestAnimationFrame(u);return}const $=Math.min(L/m,1),S=1-Math.pow(1-$,3);h.textContent=String(Math.round(f*S)),$<1&&requestAnimationFrame(u)};requestAnimationFrame(u)}}this.ui.querySelector("#bm-rematch").addEventListener("click",()=>this.cb.onRematch()),this.ui.querySelector("#bm-return-lobby").addEventListener("click",()=>this.cb.onReturnToLobby())}disableRematch(){this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null);const e=this.ui.querySelector("#bm-rematch");e&&(e.disabled=!0,e.classList.add("waiting"),e.style.opacity="0.4",e.style.cursor="default",e.textContent="Opponent left");const s=this.ui.querySelector(".bm-rematch-countdown");s&&s.remove()}showRematchCountdown(e,s){this.rematchInterval&&clearInterval(this.rematchInterval);const t=this.ui.querySelector("#bm-rematch");if(!t)return;let i=e;s?(t.classList.add("waiting"),t.textContent=`Waiting... (${i}s)`):t.textContent=`⚔ Rematch (${i}s)`;let a=this.ui.querySelector(".bm-rematch-countdown");if(!a){a=document.createElement("div"),a.className="bm-rematch-countdown";const r=this.ui.querySelector(".bm-result-buttons");r&&r.appendChild(a)}a.textContent=s?"Waiting for opponent...":"Opponent wants a rematch!",this.rematchInterval=setInterval(()=>{if(i--,i<=0){this.rematchInterval&&clearInterval(this.rematchInterval),this.rematchInterval=null,s&&this.disableRematch();return}t&&(s?t.textContent=`Waiting... (${i}s)`:t.textContent=`⚔ Rematch (${i}s)`)},1e3)}showDisconnected(){this.stopPolling(),this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-disc-panel">
        <div class="bm-disc-title">Opponent Fled</div>
        <div class="bm-disc-sub">The coward has left the arena.<br>Refresh to seek new prey.</div>
      </div>`}appendChatMessage(e,s,t){const i=this.ui.querySelector("#bm-chat-msgs");if(!i)return;const a=this.getSenderColorClass(e),r=document.createElement("div");r.className="bm-msg",r.innerHTML=`<span class="bm-msg-sender ${a}">${z(s)}</span><span class="bm-msg-text">${z(t)}</span>`,i.appendChild(r),i.scrollTop=i.scrollHeight}appendSystemMessage(e){const s=this.ui.querySelector("#bm-chat-msgs");if(!s)return;const t=document.createElement("div");t.className="bm-msg",t.innerHTML=`<span class="bm-msg-sender bm-msg-sender-sys">—</span><span class="bm-msg-sys">${z(e)}</span>`,s.appendChild(t),s.scrollTop=s.scrollHeight}hide(){this.stopPolling(),this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null),this.el.style.display="none"}show(){this.el.style.display=""}showPauseOverlay(e,s){this.hidePauseOverlay(),this.pauseOverlay=document.createElement("div"),this.pauseOverlay.className="bm-pause-overlay",this.pauseOverlay.innerHTML=`
      <div class="bm-pause-title">Opponent Disconnected</div>
      <div class="bm-pause-countdown" id="bm-pause-timer">${e}</div>
      <div class="bm-pause-sub">Waiting for opponent to rejoin...</div>
      <button class="bm-btn-leave px-btn" id="bm-pause-leave">Leave Match</button>`,this.el.parentElement.appendChild(this.pauseOverlay),this.pauseOverlay.querySelector("#bm-pause-leave").addEventListener("click",s);let t=e;const i=this.pauseOverlay.querySelector("#bm-pause-timer");this.pauseCountdownTimer=window.setInterval(()=>{t--,i.textContent=String(Math.max(0,t)),t<=0&&this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null)},1e3)}hidePauseOverlay(){this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null),this.pauseOverlay&&(this.pauseOverlay.remove(),this.pauseOverlay=null)}stopPolling(){this.pollTimer!==null&&(clearInterval(this.pollTimer),this.pollTimer=null)}async pollLobbies(){try{const e=await fetch("/rooms"),{rooms:s}=await e.json();this.renderRoomRows(s)}catch{}}renderRoomRows(e){const s=this.ui.querySelector("#bm-rooms");if(s){if(e.length===0){s.innerHTML='<div class="bm-empty">No open lobbies<br>Be the first to enter the arena</div>';return}s.innerHTML=e.map(t=>{const i=t.mode==="2v2"?`<button class="bm-btn-green-sm px-btn" data-team="team1">Join T1</button>
           <button class="bm-btn-green-sm px-btn" data-team="team2" style="margin-left:4px">Join T2</button>`:'<button class="bm-btn-green-sm px-btn">Join</button>';return`
      <div class="bm-room-row" data-room-id="${z(t.roomId)}" data-mode="${z(t.mode)}">
        <div class="bm-room-info">
          <div class="bm-room-name">${z(t.creatorName)}</div>
          <div class="bm-room-meta">Waiting for players</div>
        </div>
        <span class="bm-tag">${z(t.mode)}</span>
        <div class="bm-players"><b>${t.playerCount}</b> / ${t.maxPlayers}</div>
        ${i}
      </div>`}).join(""),s.querySelectorAll(".bm-room-row").forEach(t=>{t.querySelectorAll(".bm-btn-green-sm").forEach(i=>{i.addEventListener("click",()=>{var c;const a=t.dataset.roomId,r=((c=this.ui.querySelector("#bm-name"))==null?void 0:c.value.trim())??"",n=i.dataset.team;r&&this.cb.onJoinRoom(a,r,n)})})})}}renderLobby(e,s,t){const i=`${location.origin}?room=${e}`,a=t==="ffa"||t==="2v2"?4:2,r=t==="2v2"?4:2,n=s.length>=r,d={"1v1":"1v1 Duel",ffa:"Free-for-All","2v2":"2v2 Teams"}[t??"1v1"]??"1v1 Duel",p=(u,C)=>u?`<div class="bm-slot" style="${u.ready?"box-shadow:0 0 0 2px var(--px-success),0 0 6px rgba(111,206,126,0.3);":""}">
             <div class="bm-avatar bm-avatar-${u.index%4}">${z((u.name[0]??"?").toUpperCase())}</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name">${z(u.name)}</div>
               <div class="bm-slot-status ${u.ready?"bm-status-ready":"bm-status-waiting"}">${u.ready?"✓ Ready":"Waiting..."}</div>
             </div>
           </div>`:`<div class="bm-slot">
             <div class="bm-avatar bm-avatar-empty">?</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name" style="color:var(--px-border-light)">${C}</div>
               <div class="bm-slot-status bm-status-empty">Waiting for challenger...</div>
             </div>
           </div>`;let h="";for(let u=0;u<a;u++)h+=p(s[u],`Slot ${u+1}`);const f=n?'<button id="bm-ready" class="bm-btn-green px-btn px-btn-primary">⚔ Ready</button>':`<button class="bm-btn-green px-btn px-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>⚔ Ready</button>
         <div class="bm-waiting-text">Waiting for players...</div>`;this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-subtitle">⚔ Lobby — ${d}</div>
      <div class="bm-divider"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-layout">
        <div class="bm-panel px-panel bm-panel-left">
          <div class="bm-ptitle">Combatants</div>
          <div class="bm-code-block">
            <div>
              <div class="bm-code-label">Invite Code</div>
              <div class="bm-code-value">${z(e.toUpperCase())}</div>
            </div>
            <button id="bm-copy" class="bm-copy-btn px-btn">⎘ Copy Link</button>
          </div>
          ${h}
          ${f}
          <button id="bm-leave" class="bm-btn-leave px-btn" style="margin-top:12px;width:100%;">← Leave Lobby</button>
        </div>
        <div class="bm-panel px-panel bm-panel-right" style="display:flex;flex-direction:column;">
          <div class="bm-ptitle">War Council</div>
          <div id="bm-chat-msgs" class="bm-chat-msgs"></div>
          <div class="bm-chat-row">
            <input id="bm-chat-input" class="bm-chat-input px-input" type="text" placeholder="Speak your mind, warrior..." maxlength="80">
            <button id="bm-chat-send" class="bm-btn-send px-btn">Send</button>
          </div>
        </div>
      </div>`,this.ui.querySelector("#bm-copy").addEventListener("click",()=>{navigator.clipboard.writeText(i)}),this.ui.querySelector("#bm-leave").addEventListener("click",()=>{this.cb.onReturnToLobby()});const m=this.ui.querySelector("#bm-ready");m&&m.addEventListener("click",()=>{m.replaceWith(Object.assign(document.createElement("button"),{className:"bm-btn-green-done px-btn",textContent:"✓ Ready"})),this.cb.onReady()});const x=()=>{const u=this.ui.querySelector("#bm-chat-input"),C=u.value.trim();C&&(this.cb.onSendChatMessage(C),u.value="")};this.ui.querySelector("#bm-chat-send").addEventListener("click",x),this.ui.querySelector("#bm-chat-input").addEventListener("keydown",u=>{u.key==="Enter"&&x()})}getSenderColorClass(e){return e.split("").reduce((t,i)=>t+i.charCodeAt(0),0)%2===0?"bm-msg-sender-0":"bm-msg-sender-1"}}const ra="https://ulekuozamvhluojthxrh.supabase.co",na="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWt1b3phbXZobHVvanRoeHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjYxMzgsImV4cCI6MjA5MjE0MjEzOH0.lkYBXt9xjNrPFXg8vOMDntT1Qdw98NHjSH8-fi2BavU",M=Bs(ra,na);async function Oe(){const{data:{user:o}}=await M.auth.getUser();if(!o)return[];const{data:e}=await M.from("characters").select("*").eq("user_id",o.id).order("created_at",{ascending:!0});return e??[]}async function la(o,e){const{data:{user:s}}=await M.auth.getUser();if(!s)return null;const{data:t,error:i}=await M.rpc("create_character",{p_user_id:s.id,p_name:o,p_class:e});if(i)return console.error("create_character failed:",i.message),null;const a=t,r=Qt[e];for(const n of r?[r]:[]){const{error:c}=await M.rpc("unlock_skill_node",{p_character_id:a,p_node_id:n,p_cost:0});c&&console.error(`starter skill ${n} failed:`,c.message)}return a}async function ca(o){const{data:{user:e}}=await M.auth.getUser();if(!e)return!1;const{error:s}=await M.rpc("delete_character",{p_user_id:e.id,p_character_id:o});return s?(console.error("delete_character failed:",s.message),!1):!0}function At(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}class da{constructor(e,s){l(this,"el");this.cb=s,this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);z-index:200;font-family:"VT323",monospace;color:var(--px-text)',e.appendChild(this.el),this.checkSession()}async checkSession(){const{data:{session:e}}=await M.auth.getSession();if(e){const{data:s}=await M.from("profiles").select("username").eq("user_id",e.user.id).single();if(s){this.cb.onAuthed(s.username,e.access_token);return}}this.showLogin()}showLogin(e=""){var s,t;this.el.innerHTML=`
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center bottom,rgba(255,179,71,0.06),transparent 60%);pointer-events:none"></div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:28px;margin-bottom:8px">BLOODMOOR</h1>
        <p class="px-label" style="margin-bottom:6px">Arena PvP</p>
        <p style="font-family:'VT323',monospace;font-style:italic;color:var(--px-border-light);font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:36px">Enter the blood-soaked arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 28px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${At(e)}</p>`:""}
        <div style="margin-bottom:10px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Email</span>
          <input id="auth-email" type="email" placeholder="Email" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <div style="margin-bottom:12px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Password</span>
          <input id="auth-password" type="password" placeholder="Password" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <button id="auth-signin" class="px-btn px-btn-primary" style="width:100%;margin-bottom:12px">ENTER THE ARENA</button>
        <button id="auth-register" class="px-btn" style="width:100%">Create Account</button>
      </div>
    `,this.el.querySelector("#auth-signin").addEventListener("click",()=>this.handleSignIn()),this.el.querySelector("#auth-register").addEventListener("click",()=>this.showRegister()),(t=(s=this.cb).onShowLogin)==null||t.call(s)}showRegister(e=""){this.el.innerHTML=`
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center bottom,rgba(255,179,71,0.06),transparent 60%);pointer-events:none"></div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:22px;margin-bottom:8px">CREATE ACCOUNT</h1>
        <p style="font-family:'VT323',monospace;font-style:italic;color:var(--px-border-light);font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:28px">Join the arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 24px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${At(e)}</p>`:""}
        <div style="margin-bottom:10px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Username</span>
          <input id="auth-username" placeholder="Username" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <div style="margin-bottom:10px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Email</span>
          <input id="auth-email" type="email" placeholder="Email" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <div style="margin-bottom:12px">
          <span class="px-label" style="display:block;margin-bottom:4px;text-align:left">Password</span>
          <input id="auth-password" type="password" placeholder="Password" class="px-input" style="width:100%;margin-bottom:12px">
        </div>
        <button id="auth-submit" class="px-btn px-btn-primary" style="width:100%;margin-bottom:12px">FORGE YOUR LEGACY</button>
        <button id="auth-back" class="px-btn" style="width:100%">Back</button>
      </div>
    `,this.el.querySelector("#auth-submit").addEventListener("click",()=>this.handleRegister()),this.el.querySelector("#auth-back").addEventListener("click",()=>this.showLogin())}async handleSignIn(){const e=this.el.querySelector("#auth-email").value.trim(),s=this.el.querySelector("#auth-password").value,{data:t,error:i}=await M.auth.signInWithPassword({email:e,password:s});if(i||!t.session){this.showLogin((i==null?void 0:i.message)??"Sign in failed");return}const{data:a}=await M.from("profiles").select("username").eq("user_id",t.user.id).single();this.cb.onAuthed((a==null?void 0:a.username)??e,t.session.access_token)}async handleRegister(){const e=this.el.querySelector("#auth-username").value.trim(),s=this.el.querySelector("#auth-email").value.trim(),t=this.el.querySelector("#auth-password").value;if(!e){this.showRegister("Username is required");return}const{data:i,error:a}=await M.auth.signUp({email:s,password:t,options:{data:{username:e}}});if(a||!i.session){this.showRegister((a==null?void 0:a.message)??"Registration failed");return}this.cb.onAuthed(e,i.session.access_token)}hide(){this.el.style.display="none"}show(){this.el.style.display="flex"}}const pa={"fire.fireball":"fa-fire","fire.volatile_ember":"fa-circle-dot","fire.seeking_flame":"fa-crosshairs","fire.hellfire":"fa-skull","fire.pyroclasm":"fa-code-fork","fire.fire_wall":"fa-fire-flame-simple","fire.enduring_flames":"fa-hourglass-half","fire.searing_heat":"fa-temperature-high","fire.inferno_expanse":"fa-expand","fire.meteor":"fa-meteor","fire.molten_impact":"fa-burst","fire.blind_strike":"fa-eye-slash","fire.cataclysm":"fa-up-right-and-down-left-from-center","utility.teleport":"fa-wand-magic","utility.phase_shift":"fa-maximize","utility.ethereal_form":"fa-ghost","utility.phantom_step":"fa-person-running","archer.power_shot":"fa-bullseye","archer.guided":"fa-location-arrow","archer.multishot":"fa-arrows-split-up-and-left","archer.homing":"fa-crosshairs","archer.barrage":"fa-burst","archer.rain_of_arrows":"fa-cloud-rain","archer.sustained_rain":"fa-hourglass-half","archer.piercing_rain":"fa-bolt","archer.wide_rain":"fa-up-right-and-down-left-from-center","archer.burn":"fa-fire","archer.freeze":"fa-snowflake","archer.poison":"fa-skull-crossbones","archer_utility.evade":"fa-person-running","archer_utility.combat_roll":"fa-person-falling","archer_utility.shadowstep":"fa-ghost","archer_utility.acrobatics":"fa-tornado"};function X(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const ha={"fire.fireball":{x:50,y:0},"fire.volatile_ember":{x:30,y:90},"fire.seeking_flame":{x:70,y:90},"fire.hellfire":{x:30,y:180},"fire.pyroclasm":{x:70,y:180},"fire.fire_wall":{x:50,y:270},"fire.enduring_flames":{x:20,y:360},"fire.searing_heat":{x:50,y:360},"fire.inferno_expanse":{x:80,y:360},"fire.meteor":{x:50,y:450},"fire.molten_impact":{x:20,y:540},"fire.blind_strike":{x:50,y:540},"fire.cataclysm":{x:80,y:540}},ma={"utility.teleport":{x:50,y:0},"utility.phase_shift":{x:30,y:90},"utility.ethereal_form":{x:70,y:90},"utility.phantom_step":{x:50,y:180}},fa={"archer.power_shot":{x:50,y:0},"archer.guided":{x:30,y:90},"archer.multishot":{x:70,y:90},"archer.homing":{x:30,y:180},"archer.barrage":{x:70,y:180},"archer.rain_of_arrows":{x:50,y:270},"archer.sustained_rain":{x:20,y:360},"archer.piercing_rain":{x:50,y:360},"archer.wide_rain":{x:80,y:360},"archer.burn":{x:25,y:450},"archer.freeze":{x:50,y:450},"archer.poison":{x:75,y:450}},ua={"archer_utility.evade":{x:50,y:0},"archer_utility.combat_roll":{x:30,y:90},"archer_utility.shadowstep":{x:70,y:90},"archer_utility.acrobatics":{x:50,y:180}},xa=`
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.st-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.st-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:32px 24px;font-family:'VT323',monospace;color:var(--px-text);}
.st-header{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:600px;margin-bottom:20px;}
.st-title{font-size:12px;letter-spacing:0.05em;}
.st-points{font-size:6px;letter-spacing:0.1em;margin-top:4px;}
.st-points b{color:var(--px-success);}
.st-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.st-header-buttons{display:flex;gap:10px;}
.st-tree-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:#d86030;text-align:center;margin-bottom:8px;}
.st-tree-container{position:relative;width:100%;max-width:600px;height:600px;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;}
.st-node{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;}
.st-node-circle:hover{transform:scale(1.08);}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
.st-node-spell{width:58px;height:58px;}
.st-node-mod{width:44px;height:44px;}
.st-node-owned .st-node-circle{border:0;box-shadow:0 0 0 3px #e86020;background:radial-gradient(circle at 38% 38%,#2a0c00,#0e0400);}
.st-node-owned.st-node-is-spell .st-node-circle{box-shadow:0 0 0 3px #e86020,0 0 12px rgba(232,96,32,0.25);}
.st-node-owned .st-node-icon{color:#e87040;}
.st-node-owned .st-node-name{color:#d86040;}
.st-node-purchasable .st-node-circle{border:0;outline:2px dashed var(--px-accent);outline-offset:-2px;background:radial-gradient(circle at 38% 38%,#160800,#0a0400);}
.st-node-purchasable .st-node-icon{color:var(--px-accent);}
.st-node-purchasable .st-node-name{color:var(--px-accent);}
.st-node-locked .st-node-circle{border:0;box-shadow:0 0 0 1.5px #444;background:#151515;}
.st-node-locked .st-node-icon{color:#555;}
.st-node-locked .st-node-name{color:#555;}
.st-node-name{font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;max-width:72px;margin-top:4px;line-height:1.4;}
.st-node-cost{font-family:'Press Start 2P',monospace;font-size:6px;margin-top:2px;letter-spacing:0.05em;}
.st-node-owned .st-node-cost{color:#d86040;}
.st-node-purchasable .st-node-cost{color:var(--px-accent);}
.st-node-locked .st-node-cost{color:#444;}
.st-divider{display:flex;align-items:center;gap:12px;width:100%;max-width:600px;margin:24px 0;}
.st-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.st-divider-gem{width:10px;height:10px;background:var(--px-accent);transform:rotate(45deg);box-shadow:0 0 8px rgba(255,179,71,0.6);}
.st-util-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;color:var(--px-border-light);text-transform:uppercase;text-align:center;margin-bottom:12px;}
.st-util-container{position:relative;width:100%;max-width:600px;height:250px;}
.st-util-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
.st-tooltip{display:none;position:fixed;max-width:300px;font-family:'VT323',monospace;font-size:16px;line-height:1.5;z-index:300;pointer-events:none;}
.st-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.st-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.st-confirm-title{margin-bottom:8px;}
.st-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;}
.st-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.st-confirm-yes{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
.st-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
.st-node-rank{position:absolute;bottom:2px;font-family:'Press Start 2P',monospace;font-size:6px;color:var(--px-accent);text-shadow:0 0 4px rgba(0,0,0,0.8);pointer-events:none;}
.st-ring{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;}
.st-ring circle{fill:none;stroke-linecap:round;}
`;class ba{constructor(e){l(this,"el");l(this,"ranks",new Map);l(this,"characterId",null);l(this,"skillPoints",0);l(this,"charName","");l(this,"charClass","");l(this,"closeResolver",null);const s=document.createElement("style");s.textContent=xa,document.head.appendChild(s),this.el=document.createElement("div"),this.el.className="st-overlay",e.appendChild(this.el)}async show(e){this.characterId=e??null,this.el.style.display="block",await this.reload(),await new Promise(s=>{this.closeResolver=s})}hide(){var e;this.el.style.display="none",(e=this.closeResolver)==null||e.call(this),this.closeResolver=null}async reload(){if(!this.characterId)return;const{data:e}=await M.from("characters").select("skill_points_available, name, class").eq("id",this.characterId).single();this.skillPoints=(e==null?void 0:e.skill_points_available)??0,this.charName=(e==null?void 0:e.name)??"Unknown",this.charClass=(e==null?void 0:e.class)??"mage";const{data:s}=await M.from("skill_unlocks").select("node_id, rank").eq("character_id",this.characterId);this.ranks=new Map((s??[]).map(t=>[t.node_id,t.rank??1])),this.charClass==="amazon"?this.ranks.has("archer.power_shot")||(await M.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"archer.power_shot",p_cost:0}),this.ranks.set("archer.power_shot",1)):this.ranks.has("fire.fireball")||(await M.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"fire.fireball",p_cost:0}),this.ranks.set("fire.fireball",1)),this.render()}render(){const e=this.skillPoints,s=this.charClass==="amazon",t=xe.filter(d=>d.tree===(s?"archer":"fire")),i=xe.filter(d=>d.tree===(s?"archer_utility":"utility")),a=s?fa:ha,r=s?ua:ma,n=s?"Archer":"Fire",c=s?"520px":"600px";this.el.innerHTML=`
      <div class="st-vignette"></div>
      <div class="st-ui">
        <div class="st-header">
          <div>
            <div class="st-title px-title">${X(this.charName)} — ${X(this.charClass)} Skills</div>
            <div class="st-points px-label">Points Available: <b>${e}</b></div>
          </div>
          <div class="st-header-buttons">
            <button id="st-respec" class="st-btn px-btn">Reset Skills</button>
            <button id="st-close" class="st-btn px-btn">Back to Lobby</button>
          </div>
        </div>

        <div class="st-tree-label">${n}</div>
        <div class="st-tree-container" style="height:${c}">
          <svg id="st-main-svg" class="st-tree-svg"></svg>
          ${t.map(d=>this.renderNode(d,e,a[d.id])).join("")}
        </div>

        <div class="st-divider"><div class="st-divider-line"></div><div class="st-divider-gem"></div><div class="st-divider-line"></div></div>

        <div class="st-util-label">${s?"Evasion":"Shared Utility"}</div>
        <div class="st-util-container">
          <svg id="st-util-svg" class="st-util-svg" overflow="visible"></svg>
          ${i.map(d=>this.renderNode(d,e,r[d.id])).join("")}
        </div>

        <div id="st-tooltip" class="st-tooltip px-panel"></div>
      </div>
    `,this.el.querySelector("#st-close").addEventListener("click",()=>this.hide()),this.el.querySelector("#st-respec").addEventListener("click",()=>this.handleRespec()),this.drawConnections("st-main-svg",a,t,e),this.drawConnections("st-util-svg",r,i,e),this.attachNodeListeners(e)}renderRing(e,s,t){if(!ae(e)||s===0)return"";const i=e.stackable.softCap,a=Math.max(i+3,s),r=(t-4)/2,n=2*Math.PI*r,c=n/a,d=2;let p="";for(let h=0;h<s;h++){const f=n-h*c,m=c-d,x=h<i?"#e86020":"#ddb84a";p+=`<circle cx="${t/2}" cy="${t/2}" r="${r}"
        stroke="${x}" stroke-width="2.5" stroke-opacity="0.85"
        stroke-dasharray="${m} ${n-m}"
        stroke-dashoffset="${f}"
        transform="rotate(-90 ${t/2} ${t/2})"/>`}return`<svg class="st-ring" viewBox="0 0 ${t} ${t}">${p}</svg>`}renderNode(e,s,t){if(!t)return"";const i=this.ranks.get(e.id)??0,a=i>0,r=!a&&ue(e.id,this.ranks)&&s>=e.cost;a&&ae(e)&&s>=De(e,i);const n=a?"st-node-owned":r?"st-node-purchasable":"st-node-locked",c=e.isSpell?"st-node-is-spell":"",d=e.isSpell?"st-node-spell":"st-node-mod",p=pa[e.id]??"fa-star",h=a?"owned":r?"purchasable":"locked";let f;a&&ae(e)?f=`Rank ${i}`:a?f="Owned":f=`${e.cost} pt${e.cost>1?"s":""}`;const m=e.isSpell?58:44,x=this.renderRing(e,i,m),u=ae(e)&&i>0?`<span class="st-node-rank">${i}</span>`:"";return`<div class="st-node ${n} ${c}" data-id="${e.id}" data-state="${h}"
      style="left:${t.x}%;top:${t.y}px;">
      <div class="st-node-circle ${d}" style="position:relative;">
        ${x}
        <i class="fa ${p} fa-fw st-node-icon" style="font-size:${e.isSpell?"1.25rem":"1.05rem"}"></i>
        ${u}
      </div>
      <div class="st-node-name">${X(e.name)}</div>
      <div class="st-node-cost">${f}</div>
    </div>`}drawConnections(e,s,t,i){const a=this.el.querySelector(`#${e}`);if(!a)return;let r="";for(const n of t){const c=We[n.id];if(!c)continue;const d=s[n.id];if(!d)continue;const p=this.ranks.has(n.id),h=!p&&ue(n.id,this.ranks)&&i>=n.cost,f=p?"#e86020":h?"#c8860a":"#333",m=p?.6:h?.4:.3;if(c.requiresAll)for(const x of c.requiresAll){const u=s[x];u&&(r+=`<line x1="${u.x}%" y1="${u.y+30}" x2="${d.x}%" y2="${d.y}" stroke="${f}" stroke-opacity="${m}" stroke-width="2"/>`)}if(c.requiresAny)for(const x of c.requiresAny){const u=s[x];u&&(r+=`<line x1="${u.x}%" y1="${u.y+30}" x2="${d.x}%" y2="${d.y}" stroke="${f}" stroke-opacity="${m}" stroke-width="1.5" stroke-dasharray="4,3"/>`)}}a.innerHTML=r}attachNodeListeners(e){const s=this.el.querySelector("#st-tooltip");this.el.querySelectorAll(".st-node").forEach(t=>{const i=t.getAttribute("data-id"),a=xe.find(r=>r.id===i);t.addEventListener("mouseenter",r=>{const n=this.ranks.get(i)??0,c=n>0,d=!c&&ue(i,this.ranks)&&e>=a.cost,p=We[i],h=(p==null?void 0:p.mutuallyExclusive)&&p.mutuallyExclusive.some(L=>this.ranks.has(L)),f=!c&&!ue(i,this.ranks);let m="",x="";if(h)m='<span style="color:var(--px-danger)">Locked (requires respec to change element)</span>';else if(c&&ae(a)){const L=a.stackable.softCap,$=De(a,n),S=n>=L;x=`<span style="color:var(--px-text)">Rank ${n} / ${L}</span><br>`,e>=$?m=`<span style="color:var(--px-accent)">Next rank: ${$} pt${$>1?"s":""}${S?" (past cap)":""}</span>`:m='<span style="color:var(--px-danger)">Not enough points for next rank</span>'}else if(c)m='<span style="color:var(--px-success)">Owned</span>';else if(f){const L=[];if(p!=null&&p.requiresAll){for(const $ of p.requiresAll)if(!this.ranks.has($)){const S=xe.find(Z=>Z.id===$);S&&L.push(S.name)}}if(p!=null&&p.requiresAny&&!p.requiresAny.some(S=>this.ranks.has(S))){const S=p.requiresAny.map(Z=>{var lt;return(lt=xe.find(us=>us.id===Z))==null?void 0:lt.name}).filter(Boolean);L.push(`one of: ${S.join(", ")}`)}m=`<span style="color:var(--px-danger)">Requires: ${X(L.join(", "))}</span>`}else d?m='<span style="color:var(--px-success)">Click to unlock</span>':m='<span style="color:var(--px-danger)">Not enough points</span>';const u=c?"":`<span style="color:var(--px-border-light)">Cost: ${a.cost} pt${a.cost>1?"s":""}</span><br>`;s.innerHTML=`
          <strong style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--px-accent)">${X(a.name)}</strong><br>
          <span style="color:var(--px-text)">${X(a.description)}</span><br>
          ${x}${u}${m}
        `,s.style.display="block";const C=r;s.style.left=`${C.clientX+14}px`,s.style.top=`${C.clientY-10}px`}),t.addEventListener("mousemove",r=>{const n=r;s.style.left=`${n.clientX+14}px`,s.style.top=`${n.clientY-10}px`}),t.addEventListener("mouseleave",()=>{s.style.display="none"}),t.addEventListener("click",()=>{const r=this.ranks.get(i)??0;if(!(r>0))ue(i,this.ranks)&&e>=a.cost&&this.handleUnlock(i,a.cost);else if(ae(a)){const c=De(a,r);e>=c&&this.handleRankUp(i,a,r,c)}})})}async handleUnlock(e,s){if(!this.characterId)return;const{error:t}=await M.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:s});if(t){console.error("Unlock failed:",t.message);return}await this.reload()}handleRankUp(e,s,t,i){const a=s.stackable.softCap,n=t>=a?" (past soft cap)":"";this.showConfirm("Rank Up",`${X(s.name)}: Rank ${t} → ${t+1}${n}
Cost: ${i} pt${i>1?"s":""}`,async()=>{if(!this.characterId)return;const{error:c}=await M.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:i});if(c){console.error("Rank up failed:",c.message);return}await this.reload()})}handleRespec(){this.showConfirm("Reset Skills","All unlocked skills will be removed and points refunded. Are you sure?",async()=>{if(!this.characterId)return;const{error:e}=await M.rpc("respec_skills",{p_character_id:this.characterId});if(e){console.error("Respec failed:",e.message);return}await this.reload()})}showConfirm(e,s,t){const i=document.createElement("div");i.className="st-confirm-overlay",i.innerHTML=`
      <div class="st-confirm-panel px-panel">
        <div class="st-confirm-title px-title">${X(e)}</div>
        <div class="st-confirm-text">${X(s)}</div>
        <div class="st-confirm-buttons">
          <button class="st-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="st-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".st-confirm-yes").addEventListener("click",()=>{i.remove(),t()}),i.querySelector(".st-confirm-no").addEventListener("click",()=>i.remove())}}function re(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Rt={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',amazon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'},ga=`
.cs-overlay{position:fixed;inset:0;z-index:100;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);}
.cs-ui{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:32px 24px;font-family:'VT323',monospace;color:var(--px-text);}
.cs-title{font-size:28px;letter-spacing:2px;margin-bottom:4px;}
.cs-subtitle{font-size:9px;margin-bottom:36px;}
.cs-divider{display:flex;align-items:center;gap:12px;width:100%;max-width:700px;margin-bottom:28px;}
.cs-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.cs-divider-gem{width:10px;height:10px;background:var(--px-accent);transform:rotate(45deg);box-shadow:0 0 8px rgba(255,179,71,0.6);}
.cs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;width:100%;max-width:700px;margin-bottom:24px;}
.cs-slot{padding:20px;cursor:pointer;transition:all 0.15s;min-height:140px;display:flex;flex-direction:column;}
.cs-slot:hover{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent),inset 0 2px 0 0 rgba(255,255,255,0.06);}
.cs-slot-empty{align-items:center;justify-content:center;box-shadow:none;outline:2px dashed var(--px-border-light);}
.cs-slot-empty:hover{background:#2c2440;box-shadow:none;outline:2px dashed var(--px-accent);}
.cs-char-name{margin-bottom:4px;}
.cs-char-class{margin-bottom:12px;display:flex;align-items:center;gap:6px;}
.cs-char-class svg{flex-shrink:0;}
.cs-char-level{font-size:16px;color:var(--px-text);margin-bottom:8px;}
.cs-xp-bar{width:100%;height:8px;background:var(--px-border-dark);border-radius:0;overflow:hidden;margin-bottom:8px;box-shadow:0 0 0 2px var(--px-border-dark);}
.cs-xp-fill{height:100%;background:repeating-linear-gradient(90deg,var(--px-accent) 0 6px,#c97a26 6px 12px);border-radius:0;transition:width 0.3s;}
.cs-xp-text{font-size:16px;color:var(--px-border-light);margin-bottom:auto;}
.cs-slot-actions{display:flex;gap:8px;margin-top:12px;}
.cs-btn-select{flex:1;}
.cs-btn-delete{padding:8px 12px;}
.cs-btn-delete:hover{color:var(--px-danger);}
.cs-empty-text{margin-top:4px;}
.cs-empty-plus{font-size:32px;color:var(--px-border-light);margin-bottom:8px;}
.cs-create-panel{padding:28px;width:100%;max-width:400px;}
.cs-label{margin-bottom:6px;}
.cs-input{width:100%;margin-bottom:16px;}
.cs-input::placeholder{color:var(--px-border-light);}
.cs-class-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:20px;}
.cs-class-option{padding:12px;background:#33294a;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;border:0;border-radius:0;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);text-align:center;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.cs-class-option svg{flex-shrink:0;}
.cs-class-option.active{background:#453766;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.cs-class-option.disabled{opacity:0.4;cursor:not-allowed;position:relative;}
.cs-class-option.disabled::after{content:'Coming Soon';position:absolute;top:50%;right:12px;transform:translateY(-50%);font-size:7px;color:var(--px-border-light);}
.cs-btn-create{width:100%;}
.cs-btn-cancel{width:100%;margin-top:8px;}
.cs-error{color:var(--px-danger);font-size:16px;margin-bottom:12px;text-align:center;}
.cs-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.cs-confirm-panel{padding:28px 32px;max-width:380px;text-align:center;}
.cs-confirm-title{color:var(--px-danger);font-size:11px;margin-bottom:12px;}
.cs-confirm-text{font-size:16px;color:var(--px-text);margin-bottom:16px;line-height:1.6;}
.cs-confirm-input{width:100%;margin-bottom:16px;}
.cs-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.cs-confirm-delete{padding:9px 24px;background:var(--px-danger);color:#fff;opacity:0.4;pointer-events:none;}
.cs-confirm-delete.enabled{opacity:1;pointer-events:auto;}
.cs-confirm-cancel{padding:9px 24px;}
.cs-btn-logout{position:absolute;top:24px;right:24px;padding:6px 12px;}
.cs-btn-logout:hover{color:var(--px-danger);}
`;class va{constructor(e,s){l(this,"el");l(this,"ui");l(this,"characters",[]);l(this,"showingCreate",!1);this.cb=s;const t=document.createElement("style");t.textContent=ga,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="cs-overlay",this.ui=document.createElement("div"),this.ui.className="cs-ui",this.el.appendChild(this.ui),e.appendChild(this.el)}async show(){this.el.style.display="block",this.showingCreate=!1,this.characters=await Oe(),this.render()}hide(){this.el.style.display="none"}render(){if(this.showingCreate){this.renderCreateForm();return}const e=this.characters.map((i,a)=>{const r=pi(i.level),n=r>0?Math.min(100,i.xp/r*100):0;return`
        <div class="cs-slot px-panel" data-index="${a}">
          <div class="cs-char-name px-title" style="font-size:12px">${re(i.name)}</div>
          <div class="cs-char-class px-label">${Rt[i.class]??""} ${re(i.class)}</div>
          <div class="cs-char-level">Level ${i.level}</div>
          <div class="cs-xp-bar"><div class="cs-xp-fill" style="width:${n}%"></div></div>
          <div class="cs-xp-text">${i.xp} / ${r} XP</div>
          <div class="cs-slot-actions">
            <button class="cs-btn-select px-btn px-btn-primary" data-index="${a}">Select</button>
            <button class="cs-btn-delete px-btn" data-index="${a}">Delete</button>
          </div>
        </div>`}).join(""),s=Math.max(0,di-this.characters.length),t=Array.from({length:s},()=>`
      <div class="cs-slot cs-slot-empty px-panel" data-action="create">
        <div class="cs-empty-plus">+</div>
        <div class="cs-empty-text px-label">Create Character</div>
      </div>`).join("");this.ui.innerHTML=`
      <button class="cs-btn-logout px-btn" id="cs-logout">Sign Out</button>
      <div class="cs-title px-title">Blood Moor</div>
      <div class="cs-subtitle px-label">Choose Your Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-grid">
        ${e}
        ${t}
      </div>`,this.ui.querySelector("#cs-logout").addEventListener("click",()=>this.cb.onLogout()),this.ui.querySelectorAll(".cs-btn-select").forEach(i=>{i.addEventListener("click",a=>{a.stopPropagation();const r=parseInt(i.dataset.index);this.cb.onSelectCharacter(this.characters[r])})}),this.ui.querySelectorAll(".cs-btn-delete").forEach(i=>{i.addEventListener("click",a=>{a.stopPropagation();const r=parseInt(i.dataset.index);this.showDeleteConfirm(this.characters[r])})}),this.ui.querySelectorAll('[data-action="create"]').forEach(i=>{i.addEventListener("click",()=>{this.showingCreate=!0,this.render()})})}renderCreateForm(e=""){const s=vt.map(i=>{const a=i.id==="mage"?"active":"",r=i.enabled?"":"disabled";return`<div class="cs-class-option ${a} ${r}" data-class="${i.id}">${Rt[i.id]??""} ${re(i.label)}</div>`}).join("");this.ui.innerHTML=`
      <div class="cs-title px-title" style="font-size:24px">Blood Moor</div>
      <div class="cs-subtitle px-label">Create a New Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-create-panel px-panel">
        ${e?`<div class="cs-error">${re(e)}</div>`:""}
        <div class="cs-label px-label">Character Name</div>
        <input id="cs-name" class="cs-input px-input" type="text" placeholder="Name your champion..." maxlength="20">
        <div class="cs-label px-label">Class</div>
        <div class="cs-class-grid">${s}</div>
        <button id="cs-create-btn" class="cs-btn-create px-btn px-btn-primary">Forge Champion</button>
        <button id="cs-cancel-btn" class="cs-btn-cancel px-btn">Cancel</button>
      </div>`;let t="mage";this.ui.querySelectorAll(".cs-class-option").forEach(i=>{i.addEventListener("click",()=>{const a=i.dataset.class,r=vt.find(n=>n.id===a);r!=null&&r.enabled&&(this.ui.querySelectorAll(".cs-class-option").forEach(n=>n.classList.remove("active")),i.classList.add("active"),t=a)})}),this.ui.querySelector("#cs-create-btn").addEventListener("click",async()=>{const i=this.ui.querySelector("#cs-name").value.trim();if(!i){this.renderCreateForm("Name is required");return}if(i.length>20){this.renderCreateForm("Name must be 20 characters or less");return}if(!await la(i,t)){this.renderCreateForm("Failed to create character. Name may already be taken.");return}this.showingCreate=!1,this.characters=await Oe(),this.render()}),this.ui.querySelector("#cs-cancel-btn").addEventListener("click",()=>{this.showingCreate=!1,this.render()})}showDeleteConfirm(e){const s=document.createElement("div");s.className="cs-confirm-overlay",s.innerHTML=`
      <div class="cs-confirm-panel px-panel">
        <div class="cs-confirm-title px-title">Delete Character</div>
        <div class="cs-confirm-text">
          This will permanently delete <strong style="color:var(--px-accent)">${re(e.name)}</strong>
          and all their progress.<br><br>
          Type the character's name to confirm:
        </div>
        <input class="cs-confirm-input px-input" id="cs-delete-input" type="text" placeholder="${re(e.name)}">
        <div class="cs-confirm-buttons">
          <button class="cs-confirm-delete px-btn" id="cs-delete-confirm">Delete Forever</button>
          <button class="cs-confirm-cancel px-btn" id="cs-delete-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(s);const t=s.querySelector("#cs-delete-input"),i=s.querySelector("#cs-delete-confirm"),a=s.querySelector("#cs-delete-cancel");t.addEventListener("input",()=>{t.value===e.name?i.classList.add("enabled"):i.classList.remove("enabled")}),i.addEventListener("click",async()=>{if(t.value!==e.name)return;const r=await ca(e.id);s.remove(),r&&(this.characters=await Oe(),this.render())}),a.addEventListener("click",()=>s.remove())}}function Lt(o,e=64,s=8){const t=o.image,i=document.createElement("canvas");i.width=e,i.height=e;const a=i.getContext("2d");a.imageSmoothingEnabled=!0,a.drawImage(t,0,0,e,e);const r=a.getImageData(0,0,e,e);Ks(r.data,s),a.putImageData(r,0,0);const n=new Yt(i);return n.colorSpace=o.colorSpace,n.wrapS=n.wrapT=jt,n.magFilter=pe,n.minFilter=Vt,o.dispose(),n}function Ie(o){return o.magFilter=pe,o.minFilter=Vt,o}class ya{static async load(){const e=new $s,s=(h,f)=>new Promise((m,x)=>e.load(h,u=>{u.colorSpace=f,m(u)},void 0,x)),t=et,i=Ns,[a,r,n,c,d,p]=await Promise.all([s("/assets/textures/cobblestone/diffuse.jpg",t),s("/assets/textures/cobblestone/normal.jpg",i),s("/assets/textures/cobblestone/roughness.jpg",i),s("/assets/textures/castle_stone/diffuse.jpg",t),s("/assets/textures/castle_stone/normal.jpg",i),s("/assets/textures/castle_stone/roughness.jpg",i)]);return{textures:{floor:{map:Lt(a),normalMap:Ie(r),roughnessMap:Ie(n)},stone:{map:Lt(c),normalMap:Ie(d),roughnessMap:Ie(p)}}}}}class wa{constructor(e){l(this,"el");l(this,"hidden",!1);this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);z-index:300;font-family:"VT323",monospace;transition:opacity 0.6s ease;',this.el.innerHTML=`
      <style>
        @keyframes ls-rise {
          0%   { transform: translateY(100%); }
          45%  { transform: translateY(10%); }
          55%  { transform: translateY(0%); }
          70%  { transform: translateY(5%); }
          85%  { transform: translateY(50%); }
          100% { transform: translateY(100%); }
        }
        @keyframes ls-riseInner {
          0%   { transform: translateY(120%); }
          15%  { transform: translateY(120%); }
          50%  { transform: translateY(15%); }
          60%  { transform: translateY(5%); }
          75%  { transform: translateY(20%); }
          90%  { transform: translateY(70%); }
          100% { transform: translateY(120%); }
        }
        @keyframes ls-riseHot {
          0%   { transform: translateY(140%); }
          25%  { transform: translateY(140%); }
          55%  { transform: translateY(20%); }
          65%  { transform: translateY(10%); }
          78%  { transform: translateY(35%); }
          92%  { transform: translateY(90%); }
          100% { transform: translateY(140%); }
        }
        @keyframes ls-flicker {
          0%, 100% { transform: scaleX(1); }
          20%  { transform: scaleX(0.97); }
          40%  { transform: scaleX(1.02); }
          60%  { transform: scaleX(0.98); }
          80%  { transform: scaleX(1.01); }
        }
        @keyframes ls-glow {
          0%, 100% { box-shadow: 0 -2px 0 0 var(--px-border-light), 0 2px 0 0 var(--px-border-dark), -2px 0 0 0 var(--px-border-light), 2px 0 0 0 var(--px-border-dark), 0 0 20px rgba(255,100,0,0.15), 0 0 40px rgba(255,60,0,0.08); }
          30%  { box-shadow: 0 -2px 0 0 var(--px-border-light), 0 2px 0 0 var(--px-border-dark), -2px 0 0 0 var(--px-border-light), 2px 0 0 0 var(--px-border-dark), 0 0 35px rgba(255,120,0,0.3), 0 0 70px rgba(255,60,0,0.15); }
          60%  { box-shadow: 0 -2px 0 0 var(--px-border-light), 0 2px 0 0 var(--px-border-dark), -2px 0 0 0 var(--px-border-light), 2px 0 0 0 var(--px-border-dark), 0 0 25px rgba(255,100,0,0.2), 0 0 50px rgba(255,60,0,0.1); }
        }
        @keyframes ls-ember1 {
          0%   { opacity: 0; transform: translate(0, 0) scale(1); }
          8%   { opacity: 1; }
          25%  { opacity: 0.9; transform: translate(5px, -20px) scale(0.85); }
          45%  { opacity: 0.7; transform: translate(-3px, -45px) scale(0.65); }
          65%  { opacity: 0.4; transform: translate(7px, -65px) scale(0.4); }
          85%  { opacity: 0.15; transform: translate(-2px, -85px) scale(0.2); }
          100% { opacity: 0; transform: translate(4px, -100px) scale(0.05); }
        }
        @keyframes ls-ember2 {
          0%   { opacity: 0; transform: translate(0, 0) scale(1); }
          10%  { opacity: 1; }
          30%  { opacity: 0.8; transform: translate(-7px, -18px) scale(0.9); }
          50%  { opacity: 0.6; transform: translate(3px, -42px) scale(0.6); }
          70%  { opacity: 0.3; transform: translate(-8px, -68px) scale(0.35); }
          90%  { opacity: 0.1; transform: translate(5px, -88px) scale(0.15); }
          100% { opacity: 0; transform: translate(-3px, -105px) scale(0.05); }
        }
        @keyframes ls-ember3 {
          0%   { opacity: 0; transform: translate(0, 0) scale(1); }
          12%  { opacity: 0.9; }
          28%  { opacity: 0.85; transform: translate(8px, -15px) scale(0.8); }
          48%  { opacity: 0.5; transform: translate(-5px, -38px) scale(0.55); }
          68%  { opacity: 0.25; transform: translate(10px, -60px) scale(0.3); }
          88%  { opacity: 0.08; transform: translate(-4px, -82px) scale(0.12); }
          100% { opacity: 0; transform: translate(6px, -95px) scale(0.05); }
        }
        @keyframes ls-ember4 {
          0%   { opacity: 0; transform: translate(0, 0) scale(1); }
          7%   { opacity: 1; }
          22%  { opacity: 0.9; transform: translate(-4px, -22px) scale(0.88); }
          42%  { opacity: 0.65; transform: translate(6px, -48px) scale(0.6); }
          62%  { opacity: 0.35; transform: translate(-7px, -70px) scale(0.35); }
          82%  { opacity: 0.12; transform: translate(3px, -90px) scale(0.18); }
          100% { opacity: 0; transform: translate(-5px, -108px) scale(0.05); }
        }
        @keyframes ls-ember5 {
          0%   { opacity: 0; transform: translate(0, 0) scale(1); }
          10%  { opacity: 0.85; }
          20%  { opacity: 0.9; transform: translate(3px, -12px) scale(0.9); }
          38%  { opacity: 0.7; transform: translate(-6px, -32px) scale(0.7); }
          55%  { opacity: 0.45; transform: translate(8px, -52px) scale(0.45); }
          72%  { opacity: 0.2; transform: translate(-4px, -72px) scale(0.25); }
          100% { opacity: 0; transform: translate(2px, -98px) scale(0.05); }
        }
        @keyframes ls-ember6 {
          0%   { opacity: 0; transform: translate(0, 0) scale(1); }
          6%   { opacity: 0.8; }
          18%  { opacity: 0.85; transform: translate(-5px, -16px) scale(0.92); }
          35%  { opacity: 0.6; transform: translate(9px, -35px) scale(0.65); }
          52%  { opacity: 0.4; transform: translate(-3px, -55px) scale(0.42); }
          75%  { opacity: 0.15; transform: translate(6px, -78px) scale(0.2); }
          100% { opacity: 0; transform: translate(-4px, -102px) scale(0.05); }
        }
        @keyframes ls-bgMote1 {
          0%   { opacity: 0; transform: translateY(0) translateX(0); }
          5%   { opacity: 0.6; }
          50%  { opacity: 0.3; transform: translateY(-40vh) translateX(15px); }
          100% { opacity: 0; transform: translateY(-80vh) translateX(-10px); }
        }
        @keyframes ls-bgMote2 {
          0%   { opacity: 0; transform: translateY(0) translateX(0); }
          8%   { opacity: 0.5; }
          45%  { opacity: 0.25; transform: translateY(-35vh) translateX(-20px); }
          100% { opacity: 0; transform: translateY(-70vh) translateX(8px); }
        }
        @keyframes ls-bgMote3 {
          0%   { opacity: 0; transform: translateY(0) translateX(0); }
          6%   { opacity: 0.4; }
          55%  { opacity: 0.2; transform: translateY(-30vh) translateX(12px); }
          100% { opacity: 0; transform: translateY(-65vh) translateX(-15px); }
        }
        @keyframes ls-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
      </style>

      <div class="px-title" style="font-size:19px;margin-bottom:2px">
        BLOODMOOR
      </div>
      <div class="px-label" style="margin-bottom:28px">
        Arena PvP
      </div>

      <div style="position:relative;width:120px;height:120px;margin-bottom:24px">
        <!-- Outer ring with glow -->
        <div style="position:absolute;inset:0;border-radius:0;
                    animation:ls-glow 3s ease-in-out infinite"></div>
        <!-- Clipping container -->
        <div style="position:absolute;inset:3px;border-radius:0;overflow:hidden;
                    animation:ls-flicker 0.6s ease-in-out infinite">
          <!-- Flame base (dark red — rises from below) -->
          <div style="position:absolute;left:-20%;width:140%;height:140%;border-radius:0;
                      background:radial-gradient(circle at 50% 40%,#cc4400,#991100 35%,#550800 60%,#220400 80%);
                      animation:ls-rise 3s ease-in-out infinite;
                      filter:blur(3px)">
          </div>
          <!-- Flame middle (bright orange — rises slightly later) -->
          <div style="position:absolute;left:-5%;width:110%;height:110%;border-radius:0;
                      background:radial-gradient(circle at 50% 40%,#ff8800,#ff5500 30%,#cc2200 55%,#880800 80%);
                      animation:ls-riseInner 3s ease-in-out infinite;
                      filter:blur(1.5px)">
          </div>
          <!-- Flame hot core (yellow — rises last) -->
          <div style="position:absolute;left:10%;width:80%;height:80%;border-radius:0;
                      background:radial-gradient(circle at 50% 40%,#ffee88,#ffcc44 25%,#ff8800 50%,#ff5500 75%);
                      animation:ls-riseHot 3s ease-in-out infinite;
                      filter:blur(0.5px)">
          </div>
        </div>
        <!-- Ember particles — start from center of orb, drift upward -->
        <div style="position:absolute;left:-15px;right:-15px;top:10px;bottom:-10px;pointer-events:none;overflow:visible">
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffcc44;box-shadow:0 0 6px 2px #ff6600;opacity:0;left:24%;bottom:20%;animation:ls-ember1 1.8s ease-out infinite 0s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffbb33;box-shadow:0 0 5px 2px #ff5500;opacity:0;left:60%;bottom:30%;animation:ls-ember3 1.9s ease-out infinite 0.5s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffaa22;box-shadow:0 0 6px 2px #ff6600;opacity:0;left:48%;bottom:15%;animation:ls-ember1 2.2s ease-out infinite 1.0s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ff7722;box-shadow:0 0 5px 2px #ff4400;opacity:0;left:36%;bottom:25%;animation:ls-ember4 2.4s ease-out infinite 0.6s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffbb44;box-shadow:0 0 6px 2px #ff6600;opacity:0;left:55%;bottom:10%;animation:ls-ember3 2.1s ease-out infinite 1.8s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffaa33;box-shadow:0 0 5px 2px #ff5500;opacity:0;left:20%;bottom:18%;animation:ls-ember5 2.5s ease-out infinite 0.7s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffcc22;box-shadow:0 0 6px 2px #ff7700;opacity:0;left:42%;bottom:28%;animation:ls-ember6 2.0s ease-out infinite 1.4s"></div>
          <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ff9933;box-shadow:0 0 5px 2px #ff5500;opacity:0;left:70%;bottom:22%;animation:ls-ember1 1.7s ease-out infinite 2.1s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff9933;box-shadow:0 0 4px 1px #ff4400;opacity:0;left:40%;bottom:12%;animation:ls-ember2 2.1s ease-out infinite 0.2s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffdd66;box-shadow:0 0 4px 1px #ff7700;opacity:0;left:72%;bottom:26%;animation:ls-ember4 2.3s ease-out infinite 0.3s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff8833;box-shadow:0 0 5px 1px #ff3300;opacity:0;left:32%;bottom:8%;animation:ls-ember3 2.0s ease-out infinite 0.8s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffcc55;box-shadow:0 0 4px 1px #ff5500;opacity:0;left:65%;bottom:18%;animation:ls-ember2 1.7s ease-out infinite 1.3s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffee77;box-shadow:0 0 4px 1px #ffaa00;opacity:0;left:45%;bottom:32%;animation:ls-ember5 1.6s ease-out infinite 1.5s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff9944;box-shadow:0 0 4px 1px #ff3300;opacity:0;left:28%;bottom:22%;animation:ls-ember6 1.9s ease-out infinite 0.4s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffdd44;box-shadow:0 0 5px 1px #ff7700;opacity:0;left:68%;bottom:14%;animation:ls-ember4 1.8s ease-out infinite 1.1s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff8844;box-shadow:0 0 4px 1px #ff4400;opacity:0;left:76%;bottom:6%;animation:ls-ember3 2.0s ease-out infinite 1.6s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffbb55;box-shadow:0 0 4px 1px #ff6600;opacity:0;left:52%;bottom:24%;animation:ls-ember1 2.3s ease-out infinite 0.9s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffaa66;box-shadow:0 0 4px 1px #ff5500;opacity:0;left:34%;bottom:16%;animation:ls-ember5 1.8s ease-out infinite 2.0s"></div>
          <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff7744;box-shadow:0 0 5px 1px #ff3300;opacity:0;left:58%;bottom:10%;animation:ls-ember6 2.2s ease-out infinite 0.1s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffee88;box-shadow:0 0 3px 1px #ffaa00;opacity:0;left:26%;bottom:28%;animation:ls-ember5 1.5s ease-out infinite 0.3s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffdd77;box-shadow:0 0 3px 1px #ff8800;opacity:0;left:50%;bottom:6%;animation:ls-ember6 1.4s ease-out infinite 0.7s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffcc66;box-shadow:0 0 3px 1px #ff6600;opacity:0;left:63%;bottom:20%;animation:ls-ember5 1.6s ease-out infinite 1.2s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffbb55;box-shadow:0 0 3px 1px #ff7700;opacity:0;left:38%;bottom:30%;animation:ls-ember6 1.3s ease-out infinite 1.7s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffee99;box-shadow:0 0 3px 1px #ffaa00;opacity:0;left:56%;bottom:14%;animation:ls-ember5 1.7s ease-out infinite 0.5s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffdd88;box-shadow:0 0 3px 1px #ff8800;opacity:0;left:30%;bottom:24%;animation:ls-ember6 1.5s ease-out infinite 2.2s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffcc77;box-shadow:0 0 3px 1px #ff6600;opacity:0;left:74%;bottom:16%;animation:ls-ember5 1.8s ease-out infinite 1.9s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffbb66;box-shadow:0 0 3px 1px #ff7700;opacity:0;left:22%;bottom:10%;animation:ls-ember6 1.6s ease-out infinite 0.8s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffee77;box-shadow:0 0 3px 1px #ffaa00;opacity:0;left:44%;bottom:26%;animation:ls-ember5 1.4s ease-out infinite 1.4s"></div>
          <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffdd66;box-shadow:0 0 3px 1px #ff8800;opacity:0;left:54%;bottom:8%;animation:ls-ember6 1.9s ease-out infinite 0.2s"></div>
        </div>
      </div>

      <div style="font-size:16px;color:var(--px-border-light);letter-spacing:0.1em;
                  font-family:'VT323',monospace;animation:ls-pulse 2s ease-in-out infinite">
        Forging the Arena...
      </div>

      <!-- Background motes rising from bottom of screen -->
      <div style="position:fixed;inset:0;pointer-events:none;overflow:hidden">
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff8833;box-shadow:0 0 4px 1px #ff4400;opacity:0;left:8%;bottom:2%;animation:ls-bgMote1 4.5s ease-out infinite 0s"></div>
        <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffaa44;box-shadow:0 0 5px 2px #ff6600;opacity:0;left:15%;bottom:0%;animation:ls-bgMote2 5.2s ease-out infinite 0.8s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffcc66;box-shadow:0 0 3px 1px #ff7700;opacity:0;left:22%;bottom:3%;animation:ls-bgMote3 4.0s ease-out infinite 1.5s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff9944;box-shadow:0 0 4px 1px #ff5500;opacity:0;left:30%;bottom:1%;animation:ls-bgMote1 5.8s ease-out infinite 2.3s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffbb55;box-shadow:0 0 3px 1px #ff8800;opacity:0;left:37%;bottom:4%;animation:ls-bgMote2 4.3s ease-out infinite 0.4s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff7733;box-shadow:0 0 5px 1px #ff3300;opacity:0;left:43%;bottom:0%;animation:ls-bgMote3 5.5s ease-out infinite 3.1s"></div>
        <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffcc33;box-shadow:0 0 5px 2px #ff7700;opacity:0;left:50%;bottom:2%;animation:ls-bgMote1 4.8s ease-out infinite 1.2s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffdd77;box-shadow:0 0 3px 1px #ffaa00;opacity:0;left:57%;bottom:1%;animation:ls-bgMote2 5.0s ease-out infinite 2.7s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffaa55;box-shadow:0 0 4px 1px #ff6600;opacity:0;left:63%;bottom:3%;animation:ls-bgMote3 4.6s ease-out infinite 0.6s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ff8844;box-shadow:0 0 3px 1px #ff4400;opacity:0;left:70%;bottom:0%;animation:ls-bgMote1 5.3s ease-out infinite 1.9s"></div>
        <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffbb33;box-shadow:0 0 6px 2px #ff5500;opacity:0;left:78%;bottom:2%;animation:ls-bgMote2 4.2s ease-out infinite 3.5s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff9933;box-shadow:0 0 4px 1px #ff5500;opacity:0;left:85%;bottom:4%;animation:ls-bgMote3 5.6s ease-out infinite 0.3s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffcc77;box-shadow:0 0 3px 1px #ff8800;opacity:0;left:92%;bottom:1%;animation:ls-bgMote1 4.9s ease-out infinite 2.0s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ffaa33;box-shadow:0 0 5px 1px #ff6600;opacity:0;left:5%;bottom:3%;animation:ls-bgMote3 5.1s ease-out infinite 1.7s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffdd55;box-shadow:0 0 3px 1px #ffaa00;opacity:0;left:47%;bottom:0%;animation:ls-bgMote1 4.4s ease-out infinite 3.8s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff8855;box-shadow:0 0 4px 1px #ff4400;opacity:0;left:73%;bottom:2%;animation:ls-bgMote2 5.4s ease-out infinite 1.0s"></div>
        <div style="position:absolute;width:3px;height:3px;border-radius:0;background:#ffbb55;box-shadow:0 0 5px 2px #ff6600;opacity:0;left:18%;bottom:1%;animation:ls-bgMote1 4.7s ease-out infinite 2.5s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffcc44;box-shadow:0 0 3px 1px #ff7700;opacity:0;left:60%;bottom:4%;animation:ls-bgMote3 5.7s ease-out infinite 0.9s"></div>
        <div style="position:absolute;width:2px;height:2px;border-radius:0;background:#ff9955;box-shadow:0 0 4px 1px #ff5500;opacity:0;left:33%;bottom:0%;animation:ls-bgMote2 4.1s ease-out infinite 3.3s"></div>
        <div style="position:absolute;width:1px;height:1px;border-radius:0;background:#ffee66;box-shadow:0 0 3px 1px #ffaa00;opacity:0;left:88%;bottom:3%;animation:ls-bgMote1 5.9s ease-out infinite 1.4s"></div>
      </div>
    `,e.appendChild(this.el)}hide(){return this.hidden?Promise.resolve():(this.hidden=!0,new Promise(e=>{this.el.addEventListener("transitionend",()=>{this.el.remove(),e()},{once:!0}),this.el.style.opacity="0"}))}}const ka=`
:root {
  --px-bg: #1a1524;
  --px-panel: #241d33;
  --px-border-light: #6d5a8f;
  --px-border-dark: #0e0b16;
  --px-text: #e8dff5;
  --px-accent: #ffb347;
  --px-danger: #e05b5b;
  --px-success: #6fce7e;
}

/* Chunky raised panel: hard 2px steps, no radius, no blur anywhere. */
.px-panel {
  background: var(--px-panel);
  border: 0;
  border-radius: 0;
  box-shadow:
    0 -2px 0 0 var(--px-border-light),
    0 2px 0 0 var(--px-border-dark),
    -2px 0 0 0 var(--px-border-light),
    2px 0 0 0 var(--px-border-dark),
    inset 0 2px 0 0 rgba(255,255,255,0.06);
  padding: 16px;
  color: var(--px-text);
}

.px-title {
  font-family: 'Press Start 2P', monospace;
  color: var(--px-accent);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 16px;
  text-shadow: 2px 2px 0 var(--px-border-dark);
}

.px-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--px-border-light);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.px-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  text-transform: uppercase;
  color: var(--px-text);
  background: #33294a;
  border: 0;
  border-radius: 0;
  padding: 12px 16px;
  cursor: pointer;
  box-shadow:
    0 -2px 0 0 var(--px-border-light),
    0 2px 0 0 var(--px-border-dark),
    -2px 0 0 0 var(--px-border-light),
    2px 0 0 0 var(--px-border-dark);
}
.px-btn:hover { background: #453766; }
.px-btn:active { transform: translateY(2px); box-shadow:
    0 -2px 0 0 var(--px-border-dark),
    0 2px 0 0 var(--px-border-light),
    -2px 0 0 0 var(--px-border-dark),
    2px 0 0 0 var(--px-border-light); }
.px-btn-primary { background: #a85f1a; color: #ffe9c9; }
.px-btn-primary:hover { background: #c97a26; }

.px-input {
  font-family: 'VT323', monospace;
  font-size: 20px;
  color: var(--px-text);
  background: var(--px-border-dark);
  border: 0;
  border-radius: 0;
  padding: 10px 12px;
  outline: none;
  box-shadow:
    0 -2px 0 0 var(--px-border-dark),
    0 2px 0 0 var(--px-border-light),
    -2px 0 0 0 var(--px-border-dark),
    2px 0 0 0 var(--px-border-light);
}
.px-input:focus { box-shadow:
    0 -2px 0 0 var(--px-accent),
    0 2px 0 0 var(--px-accent),
    -2px 0 0 0 var(--px-accent),
    2px 0 0 0 var(--px-accent); }
`;function Ma(){if(document.getElementById("px-theme"))return;const o=document.createElement("style");o.id="px-theme",o.textContent=ka,document.head.appendChild(o)}class Sa{constructor(e){l(this,"el");this.el=document.createElement("div"),this.el.style.cssText="position:fixed;inset:0;z-index:500;display:none;background:rgba(14,11,22,0.9);overflow-y:auto;",this.el.innerHTML=`
      <div class="px-panel" style="max-width:640px;margin:48px auto;padding:24px">
        <div class="px-title" style="margin-bottom:12px">Art Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Character sprites are from the <b>Liberated Pixel Cup</b> collection
          (lpc.opengameart.org), licensed CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.
        </div>
        <pre id="credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <button id="credits-close" class="px-btn" style="margin-top:16px">Close</button>
      </div>`,e.appendChild(this.el),this.el.querySelector("#credits-close").addEventListener("click",()=>this.hide())}async show(){this.el.style.display="block";const e=this.el.querySelector("#credits-body");if(!e.textContent)try{const s=await fetch("/assets/lpc/CREDITS.filtered.csv");if(!s.ok)throw new Error(`credits fetch failed: ${s.status}`);e.textContent=_a(await s.text())}catch{e.textContent="Credits file missing — see client/public/assets/lpc/CREDITS.csv"}}hide(){this.el.style.display="none"}}function Ca(o){const e=[];let s="",t=!1;for(let i=0;i<o.length;i++){const a=o[i];t?a==='"'?o[i+1]==='"'?(s+='"',i++):t=!1:s+=a:a==='"'?t=!0:a===","?(e.push(s),s=""):s+=a}return e.push(s),e}function _a(o){return o.split(`
`).filter(s=>s.trim().length>0).slice(1).map(Ca).map(([s,,t,i])=>`${s} — ${t==null?void 0:t.trim()} (${i==null?void 0:i.trim()})`).join(`

`)}Ma();const Ta=document.getElementById("canvas-container"),j=document.getElementById("ui-overlay"),zt=new wa(j),Ea=new Sa(j),U=new si(Ta),Y=new sa(j);Y.hide();const se=new ji,_e=new Set,v=new Qi;let y="",I="",E={},W=new Map,P=null,N=null,H={},A="1v1",le,Te=!1,J=null,Ne=[],G=new Set,O=null,ie="",g=null,me=new Set,hs="none";function Pa(o){return o.has("archer.burn")?"burn":o.has("archer.freeze")?"freeze":o.has("archer.poison")?"poison":"none"}function Aa(o){const e=new Set;for(const s of ot)o.has(s.node)&&e.add(s.spell);return e}let ms=0;async function fs(o,e){var r;const{data:s}=await M.from("skill_unlocks").select("node_id, rank").eq("character_id",o),t=s??[],i=new Set(t.map(n=>n.node_id)),a=Qt[e];a&&i.add(a),me=Aa(i),hs=Pa(i),ms=((r=t.find(n=>n.node_id==="utility.phase_shift"))==null?void 0:r.rank)??0,Y.buildSpellSlots(me)}const It={0:13148160,1:12582960,2:32960,3:41024};let Ot,Se="";const Ra=new ba(j),Ee=new va(j,{onSelectCharacter:async o=>{g=o,await fs(o.id,o.class),Ee.hide(),b.show(),b.showHome(o.name,o.skill_points_available,o.class,o.level)},onLogout:async()=>{try{await M.auth.signOut()}catch{}de(),ie="",g=null,Te=!1,y="",I="",E={},H={},A="1v1",le=void 0,me=new Set,J=null,v.disconnect(),b.hide(),Ee.hide(),nt.show()}});Ee.hide();const nt=new da(j,{onAuthed:async(o,e)=>{ie=e,nt.hide(),await Je,zt.hide();const s=await La(e);if(s){await za(s,o,void 0);return}await Ee.show()},onShowLogin:async()=>{await Je,zt.hide()}});async function La(o){try{const e=await fetch("/paused-match",{method:"POST",headers:{Authorization:`Bearer ${o}`}});if(!e.ok)return null;const{roomId:s}=await e.json();return s}catch{return null}}async function za(o,e,s){try{await Je}catch{return}Se=e,I=o,Ke(),v.connect(),v.onRejoinAccepted(t=>{y=t.yourId,t.colorIndex,E=t.players,H={...t.players},Y.init(y),b.hide()}),v.onRejoinFailed(()=>{I="",y="",b.show(),b.showHome(e,s)}),v.rejoinRoom(o,ie)}const b=new oa(j,{onCreateRoom:async(o,e)=>{Se=o,A=e;const s=await fetch("/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:e})}),{roomId:t}=await s.json();v.connect(),v.joinRoom(t,o,ie,void 0,g==null?void 0:g.id),v.onRoomJoined(({yourId:i,mode:a,teams:r,readyPlayerIds:n})=>{y=i,I=t,E={[i]:o},A=a??e,le=r==null?void 0:r[i],G=new Set(n??[]),Y.init(y),b.showReady(t,E,y,A,G),b.appendSystemMessage("You have entered the lobby")}),Ke()},onJoinRoom:(o,e,s)=>{Se=e,v.connect(),v.joinRoom(o,e,ie,s,g==null?void 0:g.id),v.onRoomJoined(({yourId:t,players:i,mode:a,teams:r,readyPlayerIds:n})=>{y=t,I=o,E=i,A=a??"1v1",le=r==null?void 0:r[t],G=new Set(n??[]),Object.keys(i).indexOf(t),Y.init(y),H={...i},b.showReady(o,i,t,A,G),b.appendSystemMessage("You have entered the lobby")}),Ke()},onReady:()=>v.ready(),onRematch:()=>v.rematch(),onReturnToLobby:()=>{de(),v.disconnect(),Te=!1,I="",E={},H={},A="1v1",le=void 0,g?b.showHome(g.name,g.skill_points_available,g.class,g.level):b.showHome(Se)},onSendChatMessage:o=>v.sendChatMessage(o),onLogout:async()=>{try{await M.auth.signOut()}catch{}de(),ie="",g=null,Te=!1,y="",I="",E={},H={},A="1v1",le=void 0,me=new Set,J=null,v.disconnect(),b.hide(),nt.show()},onOpenSkills:async()=>{if(!g)return;b.hide(),await Ra.show(g.id);const e=(await Oe()).find(t=>t.id===g.id);e&&(g=e);const{data:{user:s}}=await M.auth.getUser();s&&g&&await fs(g.id,g.class),b.show(),g&&b.showHome(g.name,g.skill_points_available,g.class,g.level)},onSwitchCharacter:async()=>{b.hide(),await Ee.show()},onShowCredits:()=>{Ea.show()}});b.hide();function Ke(o){if(Te)return;Te=!0,v.onChatMessage(({senderId:s,displayName:t,text:i})=>b.appendChatMessage(s,t,i)),v.onPlayerJoined(({id:s,displayName:t})=>{H[s]=t,E[s]=t,b.showReady(I,E,y,A,G),b.appendSystemMessage(`${t} has entered the lobby`)}),v.onGameReady(()=>b.showReady(I,E,y,A,G)),v.onPlayerReadyAck(({playerId:s})=>{G.add(s),b.showReady(I,E,y,A,G)}),v.onRematchRequested(({requesterId:s,countdown:t})=>{const i=s===y;b.showRematchCountdown(t,i)}),v.onGameState(s=>{P||(se.clear(),_e.clear(),Ft(),b.hide());const t=performance.now();se.push(s,t);for(const[i,a]of Object.entries(s.players))a.castingSpell!==null&&_e.add(i);if(!O&&s.players[y]&&(O=new Ki(s.players[y].position)),O&&s.players[y]&&s.ack){const i=s.ack[y];i!==void 0&&O.reconcile(s.players[y].position,i)}});let e=!1;v.onDuelEnded(({winnerId:s,gameMode:t,matchResults:i})=>{e=!0;const a=t??A;let r;a==="2v2"?r=s===le:r=s===y,b.hidePauseOverlay(),de();const n=i==null?void 0:i[y];if(a==="ffa"&&!r){const c=Ne.indexOf(y),p=c>=0?4-c:1;b.showResult(r,a,p,n)}else b.showResult(r,a,void 0,n);b.show(),g&&n&&(g={...g,level:n.newLevel||g.level,xp:n.newXp??g.xp})}),v.onRematchReady(()=>{e=!1,se.clear(),Ft(),b.hide()}),v.onOpponentDisconnected(()=>{e?b.disableRematch():A==="1v1"?(de(),b.showDisconnected(),b.show()):b.appendSystemMessage("A player disconnected")}),v.onPlayerDisconnected(({playerId:s})=>{const t=H[s]??"A player";b.appendSystemMessage(`${t} disconnected`),delete E[s],b.showReady(I,E,y,A,G)}),v.onPlayerLeft(({playerId:s})=>{const t=H[s]??"A player";b.appendSystemMessage(`${t} left the lobby`),delete E[s],delete H[s],b.showReady(I,E,y,A,G)}),v.onMatchPaused(({countdown:s})=>{b.showPauseOverlay(s,()=>{v.leavePausedMatch()})}),v.onGameResumed(()=>{b.hidePauseOverlay()}),v.onDisconnect(()=>{P&&I&&(J={roomId:I})}),v.onReconnect(()=>{J&&(v.onRejoinAccepted(s=>{J=null,y=s.yourId,s.colorIndex,E=s.players,H={...H,...s.players},Y.init(y),P==null||P.setMyId(y),O=null}),v.onRejoinFailed(()=>{J=null,de(),b.showDisconnected(),b.show()}),v.rejoinRoom(J.roomId,ie))}),v.onRoomNotFound(()=>{g?b.showHome(g.name,g.skill_points_available,g.class,g.level):b.showHome(Se)})}function Ft(){for(const o of W.values())o.dispose(j);W.clear(),P==null||P.dispose(),N==null||N.dispose(),P=new Hi(U.scene,y),P.setArrowElement(hs),N=new Ji(U,U.renderer.domElement),g&&N.setCharacterClass(g.class),Y.buildSpellSlots(me),Y.show(),b.hide()}function de(){N==null||N.dispose(),N=null,P==null||P.dispose(),P=null;for(const o of W.values())o.dispose(j);W.clear(),Y.hide(),se.clear(),_e.clear(),O=null,Qe=0,Ne=[],G=new Set}let $t=performance.now();const Ge=1e3/60;let ge=0,Qe=0;U.startRenderLoop(()=>{const o=performance.now(),e=Math.min((o-$t)/1e3,.1);if($t=o,!N||!P)return;for(ge=Math.min(ge+e*1e3,100);ge>=Ge;){ge-=Ge;const i=N.buildInputFrame();if(O){const a=se.getLatest(),r=a==null?void 0:a.players[y],n={};if(a&&r&&((r.slowUntil??0)>a.tick&&r.slowFactor!==void 0&&(n.speedMult=r.slowFactor),i.castSpell===4&&me.has(4)&&o>=Qe)){const c=(r.phantomStepUntil??0)>a.tick,d=c||r.mana>=Ve[4].manaCost;(r.cooldowns[4]??0)<=0&&d&&r.hp>0&&(n.teleportTarget={...i.aimTarget},n.teleportRange=ni(ms),c||(Qe=o+Ve[4].cooldownTicks/Ae*1e3))}i.seq=O.applyInput(i.move,o,n)}v.sendInput(i)}const s=ge/Ge,t=se.getInterpolated(o);if(t){for(const[i,a]of W)i in t.players||(a.dispose(j),W.delete(i));for(const[i,a]of Object.entries(t.players)){if(a.hp<=0&&!Ne.includes(i)&&Ne.push(i),!W.has(i)){const d=Object.keys(t.players).indexOf(i)%Object.keys(It).length,p=new Ti(a.charClass,It[d],a.displayName,j);U.scene.add(p.group),W.set(i,p)}const r=W.get(i);if(i===y&&O){const c=O.getRenderPosition(s,o);r.setPosition(c.x,c.y,a.facing)}else r.setPosition(a.position.x,a.position.y,a.facing);r.update(e,_e.has(i)),a.hp<=0&&r.die();const n=(a.invisibleUntil??0)>t.tick&&i!==y;r.setVisible(!n),r.updateLabel(U.camera,U.getCanvasRect())}if(_e.clear(),O&&t.players[y]){const i=O.getRenderPosition(s,o);U.updateCamera(i.x,i.y,e)}else{const i=t.players[y];i&&U.updateCamera(i.position.x,i.position.y,e)}N.refreshMouseWorld(),P.update(t),Y.update(t,N.getActiveSpell())}});const Je=(async()=>{Ot=await ya.load(),new fi(Ot.textures).addToScene(U.scene),U.initPostProcessing()})().catch(o=>{throw console.error("Asset load failed:",o),o});document.addEventListener("visibilitychange",()=>{if(document.hidden&&O){const o=se.getLatest();o!=null&&o.players[y]&&O.reset(o.players[y].position)}});
