var zs=Object.defineProperty;var Is=(o,e,s)=>e in o?zs(o,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):o[e]=s;var c=(o,e,s)=>Is(o,typeof e!="symbol"?e+"":e,s);import{M as A,O as Jt,B as Re,F as yt,S as ie,U as Be,V as D,W as ke,H as Me,N as Os,C as es,a as Ee,b as O,A as ts,c as B,R as Fs,d as $s,e as Ns,L as qs,f as Bs,g as Ds,h as ss,i as Us,j as Hs,k as js,P as Gs,l as Ys,m as Xs,n as je,o as Ws,p as Vs,q as Zs,D as Ks,r as J,G as me,s as is,t as pe,u as as,v as ht,w as os,x as rs,y as mt,z as ot,E as ns,I as Se,J as Xe,K as We,Q as Qs,T as Js,X as ft,Y as rt,Z as ei,_ as ti,$ as ls}from"./three-keT56WUa.js";import{l as si,c as ii}from"./vendor-k1XoXMcf.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&t(r)}).observe(document,{childList:!0,subtree:!0});function s(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function t(i){if(i.ep)return;i.ep=!0;const a=s(i);fetch(i.href,a)}})();const cs={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class be{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const ai=new Jt(-1,1,1,-1,0,1);class oi extends Re{constructor(){super(),this.setAttribute("position",new yt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new yt([0,2,0,0,2,0],2))}}const ri=new oi;class ut{constructor(e){this._mesh=new A(ri,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,ai)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class ds extends be{constructor(e,s){super(),this.textureID=s!==void 0?s:"tDiffuse",e instanceof ie?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Be.clone(e.uniforms),this.material=new ie({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new ut(this.material)}render(e,s,t){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=t.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class wt extends be{constructor(e,s){super(),this.scene=e,this.camera=s,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,s,t){const i=e.getContext(),a=e.state;a.buffers.color.setMask(!1),a.buffers.depth.setMask(!1),a.buffers.color.setLocked(!0),a.buffers.depth.setLocked(!0);let r,n;this.inverse?(r=0,n=1):(r=1,n=0),a.buffers.stencil.setTest(!0),a.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),a.buffers.stencil.setFunc(i.ALWAYS,r,4294967295),a.buffers.stencil.setClear(n),a.buffers.stencil.setLocked(!0),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),a.buffers.color.setLocked(!1),a.buffers.depth.setLocked(!1),a.buffers.color.setMask(!0),a.buffers.depth.setMask(!0),a.buffers.stencil.setLocked(!1),a.buffers.stencil.setFunc(i.EQUAL,1,4294967295),a.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),a.buffers.stencil.setLocked(!0)}}class ni extends be{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class li{constructor(e,s){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),s===void 0){const t=e.getSize(new D);this._width=t.width,this._height=t.height,s=new ke(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Me}),s.texture.name="EffectComposer.rt1"}else this._width=s.width,this._height=s.height;this.renderTarget1=s,this.renderTarget2=s.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ds(cs),this.copyPass.material.blending=Os,this.clock=new es}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,s){this.passes.splice(s,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const s=this.passes.indexOf(e);s!==-1&&this.passes.splice(s,1)}isLastEnabledPass(e){for(let s=e+1;s<this.passes.length;s++)if(this.passes[s].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const s=this.renderer.getRenderTarget();let t=!1;for(let i=0,a=this.passes.length;i<a;i++){const r=this.passes[i];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,t),r.needsSwap){if(t){const n=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}wt!==void 0&&(r instanceof wt?t=!0:r instanceof ni&&(t=!1))}}this.renderer.setRenderTarget(s)}reset(e){if(e===void 0){const s=this.renderer.getSize(new D);this._pixelRatio=this.renderer.getPixelRatio(),this._width=s.width,this._height=s.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,s){this._width=e,this._height=s;const t=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(t,i),this.renderTarget2.setSize(t,i);for(let a=0;a<this.passes.length;a++)this.passes[a].setSize(t,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class ci extends be{constructor(e,s,t=null,i=null,a=null){super(),this.scene=e,this.camera=s,this.overrideMaterial=t,this.clearColor=i,this.clearAlpha=a,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ee}render(e,s,t){const i=e.autoClear;e.autoClear=!1;let a,r;this.overrideMaterial!==null&&(r=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(a=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:t),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(a),this.overrideMaterial!==null&&(this.scene.overrideMaterial=r),e.autoClear=i}}const di={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ee(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class ue extends be{constructor(e,s,t,i){super(),this.strength=s!==void 0?s:1,this.radius=t,this.threshold=i,this.resolution=e!==void 0?new D(e.x,e.y):new D(256,256),this.clearColor=new Ee(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let a=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);this.renderTargetBright=new ke(a,r,{type:Me}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let p=0;p<this.nMips;p++){const f=new ke(a,r,{type:Me});f.texture.name="UnrealBloomPass.h"+p,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const m=new ke(a,r,{type:Me});m.texture.name="UnrealBloomPass.v"+p,m.texture.generateMipmaps=!1,this.renderTargetsVertical.push(m),a=Math.round(a/2),r=Math.round(r/2)}const n=di;this.highPassUniforms=Be.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new ie({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];a=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);for(let p=0;p<this.nMips;p++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[p])),this.separableBlurMaterials[p].uniforms.invSize.value=new D(1/a,1/r),a=Math.round(a/2),r=Math.round(r/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=s,this.compositeMaterial.uniforms.bloomRadius.value=.1;const d=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=d,this.bloomTintColors=[new O(1,1,1),new O(1,1,1),new O(1,1,1),new O(1,1,1),new O(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const h=cs;this.copyUniforms=Be.clone(h.uniforms),this.blendMaterial=new ie({uniforms:this.copyUniforms,vertexShader:h.vertexShader,fragmentShader:h.fragmentShader,blending:ts,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ee,this.oldClearAlpha=1,this.basic=new B,this.fsQuad=new ut(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,s){let t=Math.round(e/2),i=Math.round(s/2);this.renderTargetBright.setSize(t,i);for(let a=0;a<this.nMips;a++)this.renderTargetsHorizontal[a].setSize(t,i),this.renderTargetsVertical[a].setSize(t,i),this.separableBlurMaterials[a].uniforms.invSize.value=new D(1/t,1/i),t=Math.round(t/2),i=Math.round(i/2)}render(e,s,t,i,a){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const r=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),a&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=t.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=t.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let n=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[l].uniforms.direction.value=ue.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=ue.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),n=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=r}getSeperableBlurMaterial(e){const s=[];for(let t=0;t<e;t++)s.push(.39894*Math.exp(-.5*t*t/(e*e))/e);return new ie({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new D(.5,.5)},direction:{value:new D(.5,.5)},gaussianCoefficients:{value:s}},vertexShader:`varying vec2 vUv;
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
				}`})}getCompositeMaterial(e){return new ie({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}ue.BlurDirectionX=new D(1,0);ue.BlurDirectionY=new D(0,1);const pi={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class hi extends be{constructor(){super();const e=pi;this.uniforms=Be.clone(e.uniforms),this.material=new Fs({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new ut(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,s,t){this.uniforms.tDiffuse.value=t.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},$s.getTransfer(this._outputColorSpace)===Ns&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===qs?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Bs?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Ds?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===ss?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Us?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Hs&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const ps=360,V=380;function kt(o,e,s=ps){const t=Math.max(1,s);return{width:Math.max(1,Math.round(o/Math.max(1,e)*t)),height:t}}function xt(o=ps){return 2*V/o}function De(o,e){return Math.round(o/e)*e}function mi(o,e){e=Math.max(2,Math.floor(e));const s=255/(e-1);for(let t=0;t<o.length;t+=4)o[t]=Math.round(o[t]/s)*s,o[t+1]=Math.round(o[t+1]/s)*s,o[t+2]=Math.round(o[t+2]/s)*s}const fi=8;class ui{constructor(e,s,t){c(this,"currentX");c(this,"currentZ");this.camera=e,this.currentX=s,this.currentZ=t}update(e,s,t){const i=Math.min(1,fi*t);this.currentX+=(e-this.currentX)*i,this.currentZ+=(s-this.currentZ)*i;const a=xt(),r=De(this.currentX,a),n=De(this.currentZ,a);this.camera.position.set(r+200,600,n+200),this.camera.lookAt(r,0,n)}}const Mt=200,St=1e3,xi={uniforms:{tDiffuse:{value:null},intensity:{value:.2}},vertexShader:`
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
  `};class bi{constructor(e){c(this,"renderer");c(this,"scene");c(this,"camera");c(this,"cameraController");c(this,"composer");c(this,"animFrameId",0);c(this,"_raycaster",new js);c(this,"_groundPlane",new Gs(new O(0,1,0),0));c(this,"_worldTarget",new O);c(this,"_ndc",new D);c(this,"_canvasRect",null);c(this,"onResize",()=>{var a;const e=window.innerWidth,s=window.innerHeight,t=e/s;this.camera.left=-V*t,this.camera.right=V*t,this.camera.top=V,this.camera.bottom=-V,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,s);const i=kt(e,s);(a=this.composer)==null||a.setSize(i.width,i.height),this._canvasRect=null});this.renderer=new Ys({antialias:!1}),this.renderer.setPixelRatio(1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Xs,this.renderer.outputColorSpace=je,this.renderer.toneMapping=ss,this.renderer.domElement.style.imageRendering="pixelated",e.appendChild(this.renderer.domElement),this.scene=new Ws,this.scene.background=new Ee(657938);const s=window.innerWidth/window.innerHeight;this.camera=new Jt(-V*s,V*s,V,-V,.1,3e3),this.cameraController=new ui(this.camera,Mt,St),this.cameraController.update(Mt,St,1),this.buildLighting(),window.addEventListener("resize",this.onResize),this.onResize()}buildLighting(){this.scene.add(new Vs(6706500,2.2)),this.scene.add(new Zs(3359846,4465169,1.1));const e=new Ks(7833804,1.25);e.position.set(1500,800,1200),e.target.position.set(1e3,0,1e3),e.castShadow=!0,e.shadow.mapSize.set(2048,2048),e.shadow.camera.near=.5,e.shadow.camera.far=4e3,e.shadow.camera.left=-1500,e.shadow.camera.right=1500,e.shadow.camera.top=1500,e.shadow.camera.bottom=-1500,this.scene.add(e),this.scene.add(e.target)}initPostProcessing(){const e=kt(window.innerWidth,window.innerHeight),s=new ke(e.width,e.height,{type:Me,magFilter:J,minFilter:J});this.composer=new li(this.renderer,s),this.composer.setSize(e.width,e.height),this.composer.addPass(new ci(this.scene,this.camera)),this.composer.addPass(new ue(new D(e.width/2,e.height/2),.5,.4,.3)),this.composer.addPass(new ds(xi)),this.composer.addPass(new hi)}updateCamera(e,s,t){this.cameraController.update(e,s,t)}getCanvasRect(){return this._canvasRect||(this._canvasRect=this.renderer.domElement.getBoundingClientRect()),this._canvasRect}startRenderLoop(e){if(this.animFrameId!==0)return;const s=()=>{this.animFrameId=requestAnimationFrame(s),e(),this.composer?this.composer.render():this.renderer.render(this.scene,this.camera)};s()}stopRenderLoop(){cancelAnimationFrame(this.animFrameId),this.animFrameId=0}screenToWorld(e,s){const t=this.getCanvasRect();return this._ndc.set((e-t.left)/t.width*2-1,-((s-t.top)/t.height)*2+1),this._raycaster.setFromCamera(this._ndc,this.camera),this._raycaster.ray.intersectPlane(this._groundPlane,this._worldTarget),{x:this._worldTarget.x,y:this._worldTarget.z}}dispose(){var e;this.stopRenderLoop(),window.removeEventListener("resize",this.onResize),this.renderer.dispose(),(e=this.composer)==null||e.dispose()}}const T=2e3,Q=16,Ct=200,ze=60,_t=1/ze,Ve=750,gi=500,Ce=[{x:350,y:300,halfSize:28},{x:1e3,y:250,halfSize:28},{x:1650,y:300,halfSize:28},{x:400,y:750,halfSize:28},{x:1600,y:750,halfSize:28},{x:1e3,y:1e3,halfSize:28},{x:350,y:1450,halfSize:28},{x:750,y:1700,halfSize:28},{x:1250,y:1700,halfSize:28},{x:1650,y:1450,halfSize:28}],vi=Math.round(1.5*ze),yi=60,wi=Math.round(.75*ze),Ue={1:{manaCost:25,cooldownTicks:30},2:{manaCost:60,cooldownTicks:180},3:{manaCost:100,cooldownTicks:300},4:{manaCost:40,cooldownTicks:120},5:{manaCost:20,cooldownTicks:24},6:{manaCost:50,cooldownTicks:24},7:{manaCost:80,cooldownTicks:240},8:{manaCost:30,cooldownTicks:90}},hs=600,nt={"fire.volatile_ember":{requiresAll:["fire.fireball"]},"fire.seeking_flame":{requiresAll:["fire.fireball"]},"fire.hellfire":{requiresAll:["fire.fireball"]},"fire.pyroclasm":{requiresAll:["fire.fireball"]},"fire.fire_wall":{requiresAll:["fire.fireball"],requiresAny:["fire.volatile_ember","fire.seeking_flame"]},"fire.enduring_flames":{requiresAll:["fire.fire_wall"]},"fire.searing_heat":{requiresAll:["fire.fire_wall"]},"fire.inferno_expanse":{requiresAll:["fire.fire_wall"]},"fire.meteor":{requiresAll:["fire.fire_wall"],requiresAny:["fire.enduring_flames","fire.searing_heat","fire.inferno_expanse"]},"fire.molten_impact":{requiresAll:["fire.meteor"]},"fire.blind_strike":{requiresAll:["fire.meteor"]},"fire.cataclysm":{requiresAll:["fire.meteor"]},"utility.phase_shift":{requiresAll:["utility.teleport"]},"utility.ethereal_form":{requiresAll:["utility.teleport"]},"utility.phantom_step":{requiresAll:["utility.teleport"],requiresAny:["utility.phase_shift","utility.ethereal_form"]},"archer.guided":{requiresAll:["archer.power_shot"]},"archer.multishot":{requiresAll:["archer.power_shot"]},"archer.homing":{requiresAll:["archer.guided"]},"archer.barrage":{requiresAll:["archer.multishot"]},"archer.rain_of_arrows":{requiresAll:["archer.power_shot"],requiresAny:["archer.homing","archer.barrage"]},"archer.sustained_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.piercing_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.wide_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.burn":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.freeze","archer.poison"]},"archer.freeze":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.poison"]},"archer.poison":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.freeze"]},"archer_utility.combat_roll":{requiresAll:["archer_utility.evade"]},"archer_utility.shadowstep":{requiresAll:["archer_utility.evade"]},"archer_utility.acrobatics":{requiresAll:["archer_utility.evade"],requiresAny:["archer_utility.combat_roll","archer_utility.shadowstep"]}};function ge(o,e){const s=nt[o];return s?!(s.requiresAll&&!s.requiresAll.every(t=>e.has(t))||s.requiresAny&&!s.requiresAny.some(t=>e.has(t))||s.mutuallyExclusive&&s.mutuallyExclusive.some(t=>e.has(t))):!0}const ve=[{id:"fire.fireball",name:"Fireball",tree:"fire",tier:1,cost:1,isSpell:!0,description:"Fast projectile. 80–120 damage."},{id:"fire.volatile_ember",name:"Volatile Ember",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Larger fireball per rank.",stackable:{softCap:5,baseEffect:.4}},{id:"fire.seeking_flame",name:"Seeking Flame",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Homing toward enemy. Stronger per rank.",stackable:{softCap:5,baseEffect:12}},{id:"fire.hellfire",name:"Hellfire",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Larger, slower, harder-hitting fireball per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.pyroclasm",name:"Pyroclasm",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Fireball splits on impact. More splits per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.fire_wall",name:"Fire Wall",tree:"fire",tier:4,cost:2,isSpell:!0,description:"Persistent fire barrier. 40 dmg/s."},{id:"fire.enduring_flames",name:"Enduring Flames",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+10% Fire Wall duration per rank.",stackable:{softCap:5,baseEffect:.1}},{id:"fire.searing_heat",name:"Searing Heat",tree:"fire",tier:5,cost:2,isSpell:!1,description:"+8% Fire Wall damage per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"fire.inferno_expanse",name:"Inferno Expanse",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+25% Fire Wall length and width per rank.",stackable:{softCap:5,baseEffect:.25}},{id:"fire.meteor",name:"Meteor",tree:"fire",tier:6,cost:3,isSpell:!0,description:"Delayed AoE strike. 200–280 damage."},{id:"fire.molten_impact",name:"Molten Impact",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Meteor leaves a burning crater for 3s."},{id:"fire.blind_strike",name:"Blind Strike",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Enemy cannot see the Meteor impact indicator."},{id:"fire.cataclysm",name:"Cataclysm",tree:"fire",tier:7,cost:1,isSpell:!1,description:"+15% Meteor radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"utility.teleport",name:"Teleport",tree:"utility",tier:1,cost:1,isSpell:!0,description:"Instant displacement."},{id:"utility.phase_shift",name:"Phase Shift",tree:"utility",tier:2,cost:2,isSpell:!1,description:"+8% teleport range per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"utility.ethereal_form",name:"Ethereal Form",tree:"utility",tier:2,cost:2,isSpell:!1,description:"0.5s invulnerability after teleporting."},{id:"utility.phantom_step",name:"Phantom Step",tree:"utility",tier:3,cost:3,isSpell:!1,description:"Next cast is instant within 2s of teleporting."},{id:"archer.power_shot",name:"Power Shot",tree:"archer",tier:1,cost:1,isSpell:!0,description:"Fast arrow projectile. 60–90 damage."},{id:"archer.guided",name:"Guided",tree:"archer",tier:2,cost:2,isSpell:!1,description:"Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4).",stackable:{softCap:4,baseEffect:1}},{id:"archer.multishot",name:"Multi-shot",tree:"archer",tier:2,cost:2,isSpell:!0,description:"Fire 3 arrows in a spread. 40–60 damage each."},{id:"archer.homing",name:"Homing",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Guided redirects happen sooner per rank.",stackable:{softCap:3,baseEffect:2}},{id:"archer.barrage",name:"Barrage",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Multi-shot gains extra arrows per rank.",stackable:{softCap:5,baseEffect:2}},{id:"archer.rain_of_arrows",name:"Rain of Arrows",tree:"archer",tier:4,cost:2,isSpell:!0,description:"Mark a zone. Arrows rain after 1.5s. 150–220 AoE damage."},{id:"archer.sustained_rain",name:"Sustained Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"Rain zone lasts longer per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"archer.piercing_rain",name:"Piercing Rain",tree:"archer",tier:5,cost:2,isSpell:!1,description:"Rain damage increases per rank.",stackable:{softCap:3,baseEffect:.25}},{id:"archer.wide_rain",name:"Wide Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"+15% Rain of Arrows radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"archer.burn",name:"Burn",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows burn. More damage per rank.",stackable:{softCap:5,baseEffect:8}},{id:"archer.freeze",name:"Freeze",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows freeze. Stronger slow per rank.",stackable:{softCap:5,baseEffect:.06}},{id:"archer.poison",name:"Poison",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows poison. More damage and mana drain per rank.",stackable:{softCap:5,baseEffect:5}},{id:"archer_utility.evade",name:"Evade",tree:"archer_utility",tier:1,cost:1,isSpell:!0,description:"Short dash with invulnerability frames (~0.3s)."},{id:"archer_utility.combat_roll",name:"Combat Roll",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Fire an arrow at the nearest enemy during evade."},{id:"archer_utility.shadowstep",name:"Shadowstep",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Become invisible for 0.5s after evading."},{id:"archer_utility.acrobatics",name:"Acrobatics",tree:"archer_utility",tier:3,cost:3,isSpell:!1,description:"Evade cooldown reduced per rank.",stackable:{softCap:3,baseEffect:.1}}],Ge=[{spell:1,node:"fire.fireball",key:1,charClass:"mage"},{spell:2,node:"fire.fire_wall",key:2,charClass:"mage"},{spell:3,node:"fire.meteor",key:3,charClass:"mage"},{spell:4,node:"utility.teleport",key:4,charClass:"mage"},{spell:5,node:"archer.power_shot",key:1,charClass:"amazon"},{spell:6,node:"archer.multishot",key:2,charClass:"amazon"},{spell:7,node:"archer.rain_of_arrows",key:3,charClass:"amazon"},{spell:8,node:"archer_utility.evade",key:4,charClass:"amazon"}],ms={mage:"fire.fireball",amazon:"archer.power_shot"};function ki(o){return hs*(o>0?1+Si(.08,o):1)}const Mi=.7;function Si(o,e){return e<=0?0:o*Math.pow(e,Mi)}function ne(o){return o.stackable!==void 0}function Ze(o,e){if(!o.stackable)return e===0?o.cost:1/0;const s=e+1,t=Math.max(0,s-o.stackable.softCap);return o.cost+t}function fs(o){return{x:Math.max(Q,Math.min(T-Q,o.x)),y:Math.max(Q,Math.min(T-Q,o.y))}}function us(o){let e={...o};for(const s of Ce){const t=s.x-s.halfSize-Q,i=s.x+s.halfSize+Q,a=s.y-s.halfSize-Q,r=s.y+s.halfSize+Q;if(e.x>t&&e.x<i&&e.y>a&&e.y<r){const n=e.x-t,l=i-e.x,d=e.y-a,h=r-e.y,p=Math.min(n,l,d,h);p===n?e.x=t:p===l?e.x=i:p===d?e.y=a:e.y=r}}return e}function Tt(o,e,s=hs){const t=e.x-o.x,i=e.y-o.y,a=Math.sqrt(t*t+i*i),r=a>s?{x:o.x+t/a*s,y:o.y+i/a*s}:{x:e.x,y:e.y};return us(fs(r))}function Et(o,e,s=1){const t=Math.sqrt(e.x*e.x+e.y*e.y);if(t===0)return o;const i=e.x/t,a=e.y/t,r={x:o.x+i*Ct*_t*s,y:o.y+a*Ct*_t*s};return us(fs(r))}const Ci=6,Pt=[{id:"mage",label:"Mage",enabled:!0},{id:"amazon",label:"Amazon",enabled:!0}];function _i(o){return Math.floor(100*Math.pow(o,1.5))}const xe={walk:{frames:9,singleRow:!1,fps:12},run:{frames:8,singleRow:!1,fps:12},idle:{frames:2,singleRow:!1,fps:2},spellcast:{frames:7,singleRow:!1,fps:12},shoot:{frames:13,singleRow:!1,fps:14},hurt:{frames:6,singleRow:!0,fps:8}},Ke={purple:"#8a5fc4",green:"#4d8f4d",black:"#4a4a52",brown:"#7d5a38",red:"#c0503a",blue:"#4a6fc4",white:"#f0f0f0",blonde:"#d9b256",gray:"#9a9aa2"},Ti={olive:"#ae6b3f",bronze:"#7f4c31",brown:"#76513a",black:"#442725"},Ye={mage:{body:"male",skin:"light",hairStyle:null,hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"purple",legsColor:"black",hat:"wizard",hatColor:"base_black"},amazon:{body:"female",skin:"light",hairStyle:"ponytail",hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"green",legsColor:"brown",hat:null,hatColor:"base_black"}},P={body:["male","female"],skin:["light","olive","bronze","brown","black"],hairStyle:[null,"ponytail","plain","long","curly_short","bangs"],hairColor:["red","blonde","brown","black","gray","blue","green","purple","white"],eyes:[null,"blue","brown","green","gray"],torsoColor:["purple","green","red","blue","brown","black","white"],legsColor:["black","brown","blue","green","red","white"]},Ei=new Set(["ponytail"]);function Pi(o){const e=[],s=Ti[o.skin],t=Ke[o.hairColor],i=o.hairStyle!=null&&Ei.has(o.hairStyle);return o.hairStyle&&i&&e.push({path:`hair/${o.hairStyle}/adult/bg`,z:0,tint:t}),e.push({path:`body/bodies/${o.body}`,z:10,tint:s}),e.push({path:`head/heads/human/${o.body}`,z:20,tint:s}),o.eyes&&e.push({path:`eyes/human/adult/default/${o.eyes}`,z:25}),o.hairStyle&&(i?e.push({path:`hair/${o.hairStyle}/adult/fg`,z:30,tint:t}):e.push({path:`hair/${o.hairStyle}/adult`,z:30,tint:t})),e.push({path:`torso/clothes/${o.torso}/${o.torso}/${o.body}`,z:40,tint:Ke[o.torsoColor]}),e.push({path:`legs/pants/${o.body==="female"?"thin":"male"}`,z:50,tint:Ke[o.legsColor]}),o.hat&&e.push({path:`hat/magic/${o.hat}/base/adult/${o.hatColor}`,z:60}),e.sort((a,r)=>a.z-r.z)}function ee(o,e){return e.includes(o)}function At(o,e){const s=Ye[e];if(typeof o!="object"||o===null)return{...s};const t=o;return{body:ee(t.body,P.body)?t.body:s.body,skin:ee(t.skin,P.skin)?t.skin:s.skin,hairStyle:ee(t.hairStyle,P.hairStyle)?t.hairStyle:s.hairStyle,hairColor:ee(t.hairColor,P.hairColor)?t.hairColor:s.hairColor,eyes:ee(t.eyes,P.eyes)?t.eyes:s.eyes,torso:s.torso,torsoColor:ee(t.torsoColor,P.torsoColor)?t.torsoColor:s.torsoColor,legsColor:ee(t.legsColor,P.legsColor)?t.legsColor:s.legsColor,hat:s.hat,hatColor:s.hatColor}}function Ai(o,e=Math.random){const s=Ye[o],t=i=>i[Math.floor(e()*i.length)];return{body:t(P.body),skin:t(P.skin),hairStyle:t(P.hairStyle),hairColor:t(P.hairColor),eyes:null,torso:s.torso,torsoColor:t(P.torsoColor),legsColor:t(P.legsColor),hat:s.hat,hatColor:s.hatColor}}function Lt(o){return{body:o.body,skin:o.skin,hair_style:o.hairStyle,hair_color:o.hairColor,eyes:o.eyes,torso_color:o.torsoColor,legs_color:o.legsColor}}function Li(o,e){if(typeof o!="object"||o===null)return At(o,e);const s=o;return At({body:s.body,skin:s.skin,hairStyle:s.hair_style,hairColor:s.hair_color,eyes:s.eyes,torso:s.torso,torsoColor:s.torso_color,legsColor:s.legs_color,hat:s.hat,hatColor:s.hat_color},e)}const le=80;function Ie(o,e,s){const t=a=>{const r=a.clone();return r.wrapS=r.wrapT=rs,r.repeat.set(e,s),r.needsUpdate=!0,r},i=new as({map:t(o.map),normalMap:o.normalMap?t(o.normalMap):null,roughnessMap:o.roughnessMap?t(o.roughnessMap):null,roughness:1,metalness:0});return i.normalScale.set(.4,.4),i}class Ri{constructor(e){c(this,"group",new me);this.buildFloor(e.floor),this.buildBoundaryWalls(e.stone),this.buildPillars(e.stone)}addToScene(e){e.add(this.group)}buildFloor(e){const s=T/200,t=Ie(e,s,s),i=new A(new is(T,T),t);i.rotation.x=-Math.PI/2,i.position.set(T/2,0,T/2),i.receiveShadow=!0,this.group.add(i)}buildBoundaryWalls(e){const t=[[T/2,-10,T+40,20],[T/2,T+10,T+40,20],[-10,T/2,20,T],[T+10,T/2,20,T]],i=new pe(t[0][2],60,t[0][3]),a=new pe(t[2][2],60,t[2][3]),r=Ie(e,t[0][2]/200,60/200),n=Ie(e,t[2][2]/200,60/200);t.forEach(([l,d],h)=>{const p=new A(h<2?i:a,h<2?r:n);p.position.set(l,60/2,d),p.castShadow=!0,this.group.add(p)})}buildPillars(e){const s=new as({color:6974122,roughness:.7,metalness:.1}),t=Ce[0].halfSize*2,i=Ie(e,t/200,le/200),a=new pe(t,le,t),r=new pe(t+6,8,t+6),n=new ht(5,8,6),l=new B({color:16753984}),d=[{x:0,y:0},{x:T,y:0},{x:0,y:T},{x:T,y:T}],h=new Set(d.map(p=>Ce.reduce((f,m)=>(m.x-p.x)**2+(m.y-p.y)**2<(f.x-p.x)**2+(f.y-p.y)**2?m:f)));Ce.forEach(p=>{const f=new A(a,i);f.position.set(p.x,le/2,p.y),f.castShadow=!0,f.receiveShadow=!0,this.group.add(f);const m=new A(r,s);m.position.set(p.x,le+4,p.y),this.group.add(m);const u=new A(n,l);if(u.position.set(p.x,le+14,p.y),this.group.add(u),h.has(p)){const x=new os(16737792,3,450,2);x.position.set(p.x,le+60,p.y),this.group.add(x)}})}}const k=64;function Fe(o,e,s){const i=xe[o].singleRow?0:e;return{sx:s*k,sy:i*k}}const Rt=[3,2,1,0],zi=Math.PI/12;function Ii(o,e){const s=2*Math.PI,i=((o+Math.PI/4)%s+s)%s,a=Math.round(i/(Math.PI/2))%4,r=Rt[a];if(e===void 0||r===e)return r;const n=Rt[e]*(Math.PI/2);let l=i-n;return l>Math.PI&&(l-=s),l<-Math.PI&&(l+=s),Math.abs(l)<=Math.PI/4+zi?e:r}function $e(o,e,s){const t=xe[o],i=Math.floor(e*t.fps);return s?i%t.frames:Math.min(i,t.frames-1)}const zt=new Map;function Oi(o){let e=zt.get(o);return e||(e=new Promise(s=>{const t=new Image;t.onload=()=>s(t),t.onerror=()=>s(null),t.src=o}),zt.set(o,e)),e}async function xs(o){const e=Pi(o),s={};for(const t of Object.keys(xe)){const i=xe[t],a=await Promise.all(e.map(p=>Oi(`/assets/lpc/${p.path}/${t}.png`)));if(a.filter(p=>p!==null).length===0){s[t]=null;continue}const n=i.singleRow?1:4,l=document.createElement("canvas");l.width=i.frames*k,l.height=n*k;const d=l.getContext("2d");a.forEach((p,f)=>{if(!p)return;const m=e[f].tint;if(!m){d.drawImage(p,0,0);return}const u=document.createElement("canvas");u.width=l.width,u.height=l.height;const x=u.getContext("2d");x.drawImage(p,0,0),x.globalCompositeOperation="multiply",x.fillStyle=m,x.fillRect(0,0,u.width,u.height),x.globalCompositeOperation="destination-in",x.drawImage(p,0,0),d.drawImage(u,0,0)});const h=new mt(l);h.magFilter=J,h.minFilter=J,h.generateMipmaps=!1,h.colorSpace=je,s[t]=h}return s}function Ne(o){for(const e of Object.values(o))e==null||e.dispose()}const Fi=.5,ce=42,$i=new ot(11,16),Ni=new B({color:0,transparent:!0,opacity:.35});class qi{constructor(e,s){c(this,"group",new me);c(this,"plane");c(this,"material");c(this,"textures",null);c(this,"direction",2);c(this,"dead",!1);c(this,"castAnim");c(this,"moveAnim","idle");c(this,"moveElapsed",0);c(this,"casting",!1);c(this,"castElapsed",0);c(this,"lastFrameKey","");c(this,"scratch",null);c(this,"scratchTex",null);this.castAnim=s==="amazon"?"shoot":"spellcast";const t=k*xt()*Fi;this.material=new B({transparent:!0,alphaTest:.01}),this.material.visible=!1,this.plane=new A(new is(t,t),this.material),this.plane.rotation.order="YXZ",this.plane.rotation.y=Math.PI/4,this.plane.rotation.x=-Math.atan(600/Math.hypot(200,200)),this.plane.position.y=t/2,this.group.add(this.plane);const i=new A($i,Ni);i.rotation.x=-Math.PI/2,i.position.y=.5,this.group.add(i),xs(e).then(a=>{this.textures=a,this.material.visible=!0,this.applyFrame(!0)})}setFacing(e){this.dead||(this.direction=Ii(e,this.direction))}die(){this.dead||(this.dead=!0,this.casting=!1,this.moveElapsed=0)}update(e,s,t){if(this.moveElapsed+=e,this.castElapsed+=e,!this.dead){const i=s>220?"run":s>1.5?"walk":"idle";i!==this.moveAnim&&(this.moveAnim=i,this.moveElapsed=0),t&&(this.casting=!0,this.castElapsed=0);const a=xe[this.castAnim];this.casting&&this.castElapsed>=a.frames/a.fps&&(this.casting=!1)}this.applyFrame(!1)}applyFrame(e){if(this.textures){if(this.dead){this.applyFullFrame("hurt",this.moveElapsed,e);return}if(this.casting&&this.textures[this.castAnim]){this.moveAnim==="idle"||!this.textures[this.moveAnim]?this.applyFullFrame(this.castAnim,this.castElapsed,e):this.applySplitFrame(e);return}this.applyFullFrame(this.moveAnim,this.moveElapsed,e)}}applyFullFrame(e,s,t){const i=this.textures[e]?e:this.textures.idle?"idle":"walk",a=this.textures[i];if(!a)return;const r=xe[i],n=i!=="hurt"&&i!==this.castAnim,l=$e(i,s,n),d=`${i}:${this.direction}:${l}`;if(!t&&d===this.lastFrameKey)return;this.lastFrameKey=d,this.material.map!==a&&(this.material.map=a,this.material.needsUpdate=!0);const{sx:h,sy:p}=Fe(i,this.direction,l),f=r.singleRow?1:4;a.repeat.set(k/(r.frames*k),k/(f*k)),a.offset.set(h/(r.frames*k),1-(p+k)/(f*k))}applySplitFrame(e){const s=this.textures[this.castAnim],t=this.textures[this.moveAnim],i=$e(this.castAnim,this.castElapsed,!1),a=$e(this.moveAnim,this.moveElapsed,!0),r=`split:${this.castAnim}:${i}:${this.moveAnim}:${a}:${this.direction}`;if(!e&&r===this.lastFrameKey)return;this.lastFrameKey=r,this.scratch||(this.scratch=document.createElement("canvas"),this.scratch.width=k,this.scratch.height=k,this.scratchTex=new mt(this.scratch),this.scratchTex.magFilter=J,this.scratchTex.minFilter=J,this.scratchTex.generateMipmaps=!1,this.scratchTex.colorSpace=je);const n=Fe(this.castAnim,this.direction,i),l=Fe(this.moveAnim,this.direction,a),d=this.scratch.getContext("2d");d.clearRect(0,0,k,k),d.drawImage(t.image,l.sx,l.sy+ce,k,k-ce,0,ce,k,k-ce),d.drawImage(s.image,n.sx,n.sy,k,ce,0,0,k,ce),this.scratchTex.needsUpdate=!0,this.material.map!==this.scratchTex&&(this.material.map=this.scratchTex,this.material.needsUpdate=!0)}dispose(){var e;this.plane.geometry.dispose(),this.material.dispose(),(e=this.scratchTex)==null||e.dispose(),this.textures&&Ne(this.textures)}}const Bi=50,Di=new ns(14,18,32),ye=new O;class Ui{constructor(e,s,t,i,a){c(this,"group",new me);c(this,"sprite");c(this,"nameLabel");c(this,"ownedMaterials",[]);c(this,"prevX",0);c(this,"prevZ",0);c(this,"velocityMag",0);c(this,"smoothVel",0);this.sprite=new qi(s??Ye[e],e),this.group.add(this.sprite.group);const r=new B({color:t,transparent:!0,opacity:.5,side:Se});this.ownedMaterials.push(r);const n=new A(Di,r);n.rotation.x=-Math.PI/2,n.position.y=1,this.group.add(n),this.nameLabel=document.createElement("div"),this.nameLabel.style.cssText=`
      position:absolute; left:0; top:0; pointer-events:none; font-size:12px; color:#fff;
      text-shadow:0 0 4px #000; white-space:nowrap; transform:translateX(-50%);
    `,this.nameLabel.textContent=i,a.appendChild(this.nameLabel)}setPosition(e,s,t){const i=e-this.prevX,a=s-this.prevZ,r=Math.min(Math.sqrt(i*i+a*a)*60,1e3);this.smoothVel=this.smoothVel*.85+r*.15,this.velocityMag=this.smoothVel,t!==void 0&&this.sprite.setFacing(t),this.prevX=e,this.prevZ=s;const n=xt();this.group.position.set(De(e,n),0,De(s,n))}update(e,s){this.sprite.update(e,this.velocityMag,s)}setVisible(e){this.group.visible=e,this.nameLabel.style.display=e?"":"none"}die(){this.sprite.die()}updateLabel(e,s){this.group.getWorldPosition(ye),ye.y+=Bi+10,ye.project(e);const t=(ye.x*.5+.5)*s.width+s.left,i=(-ye.y*.5+.5)*s.height+s.top-10;this.nameLabel.style.transform=`translate(${t}px, ${i}px) translateX(-50%)`}dispose(e){e.removeChild(this.nameLabel),this.group.removeFromParent();for(const s of this.ownedMaterials)s.dispose();this.ownedMaterials=[],this.sprite.dispose()}}const M=4096,te=Math.floor(M*.9),Hi=1,ji=.4,Gi=0;class Yi{constructor(e){c(this,"posX",new Float32Array(M));c(this,"posY",new Float32Array(M));c(this,"posZ",new Float32Array(M));c(this,"velX",new Float32Array(M));c(this,"velY",new Float32Array(M));c(this,"velZ",new Float32Array(M));c(this,"life",new Float32Array(M));c(this,"maxLife",new Float32Array(M));c(this,"particleSize",new Float32Array(M));c(this,"colorR",new Float32Array(M));c(this,"colorG",new Float32Array(M));c(this,"colorB",new Float32Array(M));c(this,"activeCount",0);c(this,"positionBuffer");c(this,"sizeBuffer");c(this,"colorBuffer");c(this,"posAttr");c(this,"sizeAttr");c(this,"colorAttr");c(this,"geometry");c(this,"points");this.scene=e,this.positionBuffer=new Float32Array(M*3),this.sizeBuffer=new Float32Array(M),this.colorBuffer=new Float32Array(M*3),this.geometry=new Re,this.posAttr=new Xe(this.positionBuffer,3),this.posAttr.setUsage(We),this.geometry.setAttribute("position",this.posAttr),this.sizeAttr=new Xe(this.sizeBuffer,1),this.sizeAttr.setUsage(We),this.geometry.setAttribute("size",this.sizeAttr),this.colorAttr=new Xe(this.colorBuffer,3),this.colorAttr.setUsage(We),this.geometry.setAttribute("particleColor",this.colorAttr),this.geometry.setDrawRange(0,0);const s=new ie({vertexShader:`
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
      `,transparent:!0,depthWrite:!1,blending:ts});this.points=new Qs(this.geometry,s),this.points.frustumCulled=!1,e.add(this.points)}emitTrail(e,s,t,i,a,r=10){if(this.activeCount>=te)return;const n=r/10,l=Math.min(12,Math.floor((3+Math.floor(Math.random()*3))*n)),d=4*n;for(let h=0;h<l;h++){if(this.activeCount>=M)return;this.spawn(e+(Math.random()-.5)*d,s+(Math.random()-.5)*d,t+(Math.random()-.5)*d,-i*(40+Math.random()*30)*n+(Math.random()-.5)*30,(10+Math.random()*20)*n,-a*(40+Math.random()*30)*n+(Math.random()-.5)*30,.35+Math.random()*.15,(12+Math.random()*4)*n)}}emitExplosion(e,s,t,i=10){const a=i/10,r=Math.min(200,Math.floor((40+Math.floor(Math.random()*21))*a)),n=6*a;for(let l=0;l<r;l++){if(this.activeCount>=M)return;const d=Math.random()*Math.PI*2,h=(60+Math.random()*120)*a;this.spawn(e+(Math.random()-.5)*n,s+(Math.random()-.5)*n,t+(Math.random()-.5)*n,Math.cos(d)*h,(20+Math.random()*80)*a,Math.sin(d)*h,.5+Math.random()*.3,(Math.random()>.5?16:10)*Math.min(a,3))}}emitWall(e){if(!(this.activeCount>=te))for(const s of e)for(let t=0;t<3;t++){if(this.activeCount>=M)return;const i=Math.random();this.spawn(s.x1+(s.x2-s.x1)*i+(Math.random()-.5)*4,1,s.y1+(s.y2-s.y1)*i+(Math.random()-.5)*4,(Math.random()-.5)*15,40+Math.random()*40,(Math.random()-.5)*15,.4+Math.random()*.3,14+Math.random()*10)}}emitMeteorTrail(e,s,t){if(this.activeCount>=te)return;const i=2+Math.floor(Math.random()*2);for(let a=0;a<i;a++){if(this.activeCount>=M)return;const r=Math.random()*Math.PI*2,n=8+Math.random()*8;this.spawn(e+(Math.random()-.5)*6,s+(Math.random()-.5)*6,t+(Math.random()-.5)*6,Math.cos(r)*n,20+Math.random()*20,Math.sin(r)*n,.2+Math.random()*.1,8+Math.random()*6)}}emitCrater(e,s,t){if(this.activeCount>=te)return;const i=Math.max(4,Math.round(t/10));for(let a=0;a<i;a++){if(this.activeCount>=M)return;const r=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*t;this.spawn(e+Math.cos(r)*n,1,s+Math.sin(r)*n,(Math.random()-.5)*10,30+Math.random()*30,(Math.random()-.5)*10,.3+Math.random()*.3,10+Math.random()*8)}}emitMeteorImpact(e,s,t){if(this.activeCount>=te)return;const i=50+Math.floor(Math.random()*21);for(let a=0;a<i;a++){if(this.activeCount>=M)return;const r=Math.random()*Math.PI*2,n=80+Math.random()*120;this.spawn(e+(Math.random()-.5)*10,s+(Math.random()-.5)*10,t+(Math.random()-.5)*10,Math.cos(r)*n,30+Math.random()*100,Math.sin(r)*n,.5+Math.random()*.3,Math.random()>.5?18:12)}}emitRainImpact(e,s,t,i){if(this.activeCount>=te)return;const a=30+Math.floor(Math.random()*15);for(let r=0;r<a;r++){if(this.activeCount>=M)return;const n=Math.random()*Math.PI*2,l=Math.sqrt(Math.random())*i,d=15+Math.random()*30,h=this.activeCount;this.spawn(e+Math.cos(n)*l,s+2,t+Math.sin(n)*l,Math.cos(n)*d,30+Math.random()*50,Math.sin(n)*d,.3+Math.random()*.2,6+Math.random()*4),this.colorR[h]=.7,this.colorG[h]=.6,this.colorB[h]=.45}}emitRainZone(e,s,t){if(this.activeCount>=te)return;const i=Math.max(2,Math.round(t/20));for(let a=0;a<i;a++){if(this.activeCount>=M)return;const r=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*t,l=this.activeCount;this.spawn(e+Math.cos(r)*n,1,s+Math.sin(r)*n,(Math.random()-.5)*8,15+Math.random()*15,(Math.random()-.5)*8,.25+Math.random()*.15,5+Math.random()*4),this.colorR[l]=.7,this.colorG[l]=.6,this.colorB[l]=.45}}emitTeleportSparks(e,s,t){const i=10+Math.floor(Math.random()*6);for(let a=0;a<i;a++){if(this.activeCount>=M)return;const r=Math.random()*Math.PI*2,n=Math.random()*Math.PI*.5,l=40+Math.random()*60,d=this.activeCount;this.spawn(e+(Math.random()-.5)*4,s+(Math.random()-.5)*4,t+(Math.random()-.5)*4,Math.cos(r)*Math.sin(n)*l,Math.cos(n)*l*.4+10,Math.sin(r)*Math.sin(n)*l,.12+Math.random()*.04,7+Math.random()*4),this.colorR[d]=1,this.colorG[d]=.84+Math.random()*.16,this.colorB[d]=.4+Math.random()*.6}}spawn(e,s,t,i,a,r,n,l){const d=this.activeCount++;this.posX[d]=e,this.posY[d]=s,this.posZ[d]=t,this.velX[d]=i,this.velY[d]=a,this.velZ[d]=r,this.life[d]=n,this.maxLife[d]=n,this.particleSize[d]=l,this.colorR[d]=Hi,this.colorG[d]=ji,this.colorB[d]=Gi}update(e){let s=0;for(;s<this.activeCount;){if(this.life[s]-=e,this.life[s]<=0){const i=this.activeCount-1;this.posX[s]=this.posX[i],this.posY[s]=this.posY[i],this.posZ[s]=this.posZ[i],this.velX[s]=this.velX[i],this.velY[s]=this.velY[i],this.velZ[s]=this.velZ[i],this.life[s]=this.life[i],this.maxLife[s]=this.maxLife[i],this.particleSize[s]=this.particleSize[i],this.colorR[s]=this.colorR[i],this.colorG[s]=this.colorG[i],this.colorB[s]=this.colorB[i],this.activeCount--;continue}this.velY[s]-=80*e,this.posX[s]+=this.velX[s]*e,this.posY[s]+=this.velY[s]*e,this.posZ[s]+=this.velZ[s]*e;const t=s*3;this.positionBuffer[t]=this.posX[s],this.positionBuffer[t+1]=this.posY[s],this.positionBuffer[t+2]=this.posZ[s],this.colorBuffer[t]=this.colorR[s],this.colorBuffer[t+1]=this.colorG[s],this.colorBuffer[t+2]=this.colorB[s],this.sizeBuffer[s]=this.particleSize[s]*(this.life[s]/this.maxLife[s]),s++}this.geometry.setDrawRange(0,this.activeCount),this.activeCount>0&&(this.posAttr.addUpdateRange(0,this.activeCount*3),this.colorAttr.addUpdateRange(0,this.activeCount*3),this.sizeAttr.addUpdateRange(0,this.activeCount),this.posAttr.needsUpdate=!0,this.sizeAttr.needsUpdate=!0,this.colorAttr.needsUpdate=!0)}dispose(){this.scene.remove(this.points),this.geometry.dispose(),this.points.material.dispose()}}const Xi=.08,It=.12,Ot=.15,Wi=.2,Vi=35,Ft=4,Zi=6,Ki=new Js(1,.3,4,32),Qi=2,_e=[];function Ji(o){for(const e of _e)e.light.parent!==o&&o.add(e.light);for(;_e.length<Qi;){const e=new os(16772795,0,120);o.add(e),_e.push({light:e,inUse:!1})}}function ea(){const o=_e.find(e=>!e.inUse);return o?(o.inUse=!0,o.light):null}function $t(o){o.intensity=0;const e=_e.find(s=>s.light===o);e&&(e.inUse=!1)}class Nt{constructor(e,s,t,i){c(this,"done",!1);c(this,"elapsed",0);c(this,"lightningLines",[]);c(this,"ringMesh");c(this,"pointLight");c(this,"lightningDisposed",!1);c(this,"lightDisposed",!1);c(this,"ringDisposed",!1);this.scene=e;const a=2;i.emitTeleportSparks(s,a,t);const r=Ft+Math.floor(Math.random()*(Zi-Ft+1));for(let l=0;l<r;l++){const d=Math.random()*Math.PI*2,h=15+Math.random()*25,p=h*(.3+Math.random()*.4),f=(Math.random()-.5)*12,m=[new O(s,a+Math.random()*6,t),new O(s+Math.cos(d)*p+f,a+3+Math.random()*8,t+Math.sin(d)*p+f),new O(s+Math.cos(d)*h,a+Math.random()*5,t+Math.sin(d)*h)],u=new Re().setFromPoints(m),x=new ft({color:16766720,transparent:!0,opacity:.6}),C=new rt(u,x);this.scene.add(C),this.lightningLines.push(C)}const n=new B({color:16766720,transparent:!0,opacity:.4,side:Se});this.ringMesh=new A(Ki,n),this.ringMesh.rotation.x=-Math.PI/2,this.ringMesh.position.set(s,1,t),this.ringMesh.scale.setScalar(.01),this.scene.add(this.ringMesh),Ji(e),this.pointLight=ea(),this.pointLight&&(this.pointLight.position.set(s,20,t),this.pointLight.intensity=1)}update(e){if(!this.done){if(this.elapsed+=e,!this.lightningDisposed&&this.elapsed>=Xi){for(const s of this.lightningLines)this.scene.remove(s),s.geometry.dispose(),s.material.dispose();this.lightningLines.length=0,this.lightningDisposed=!0}if(!this.lightDisposed&&this.pointLight&&(this.elapsed>=It?($t(this.pointLight),this.pointLight=null,this.lightDisposed=!0):this.pointLight.intensity=1*(1-this.elapsed/It)),!this.ringDisposed)if(this.elapsed>=Ot)this.scene.remove(this.ringMesh),this.ringMesh.material.dispose(),this.ringDisposed=!0;else{const s=this.elapsed/Ot;this.ringMesh.scale.setScalar(Vi*s),this.ringMesh.material.opacity=.4*(1-s)}this.elapsed>=Wi&&(this.done=!0)}}dispose(){if(!this.lightningDisposed){for(const e of this.lightningLines)this.scene.remove(e),e.geometry.dispose(),e.material.dispose();this.lightningLines.length=0}!this.lightDisposed&&this.pointLight&&($t(this.pointLight),this.pointLight=null),this.ringDisposed||(this.scene.remove(this.ringMesh),this.ringMesh.material.dispose()),this.done=!0}}const Oe={none:16777215,burn:16737792,freeze:6737151,poison:4513092},lt=new ht(1,8,8),bs=new pe(18,4,4),gs=new Re().setFromPoints([new O(-9,0,0),new O(-15,0,0)]),vs=new pe(2,14,2),ys=new ns(50,58,32),ws=new ht(25,6,6),ks=new B({color:16737792}),Ms=new B({color:16720384,transparent:!0,opacity:.25}),Ss=new B({color:16729088}),Cs=new ft({color:16729088,transparent:!0,opacity:.4}),ta=new Set([lt,bs,gs,vs,ys,ws]),bt=new Set([ks,Ms,Ss,Cs]),qt=new Map,Bt=new Map;function sa(o){let e=qt.get(o);return e||(e=new B({color:o}),qt.set(o,e),bt.add(e)),e}function ia(o){let e=Bt.get(o);return e||(e=new ft({color:o,transparent:!0,opacity:.5}),Bt.set(o,e),bt.add(e)),e}function L(o){o.traverse(e=>{const s=e;if(s.geometry&&!ta.has(s.geometry)&&s.geometry.dispose(),s.material){const t=Array.isArray(s.material)?s.material:[s.material];for(const i of t)bt.has(i)||i.dispose()}})}class aa{constructor(e,s){c(this,"fireballs",new Map);c(this,"arrows",new Map);c(this,"fireWalls",new Map);c(this,"meteors",new Map);c(this,"rainOfArrows",new Map);c(this,"rainZoneArrows",new Map);c(this,"particles");c(this,"prevFireballPositions",new Map);c(this,"clock",new es);c(this,"elapsedTime",0);c(this,"teleportEffects",[]);c(this,"arrowElement","none");c(this,"emitAccumulator",0);c(this,"shouldEmitContinuous",!0);this.scene=e,this.myId=s,this.particles=new Yi(e)}setArrowElement(e){this.arrowElement=e}setMyId(e){this.myId=e}createFallingArrows(e,s,t,i=16){const a=Oe[this.arrowElement],r=new me,n=new B({color:a,transparent:!0,opacity:.7}),l=[];for(let d=0;d<i;d++){const h=Math.random()*Math.PI*2,p=Math.sqrt(Math.random())*t,f=new A(vs,n);f.position.set(Math.cos(h)*p,0,Math.sin(h)*p),f.rotation.x=(Math.random()-.5)*.3,f.rotation.z=(Math.random()-.5)*.3,r.add(f),l.push(Math.random())}return r.position.set(e,0,s),this.scene.add(r),{arrowGroup:r,arrowMaterial:n,arrowPhases:l,spawnTime:this.elapsedTime}}updateFallingArrows(e){const s=this.elapsedTime-e.spawnTime,t=250,i=.35,a=e.arrowGroup.children;for(let r=0;r<e.arrowPhases.length;r++){const n=(s/i+e.arrowPhases[r])%1;a[r].position.y=t*(1-n)}}detectTeleports(e){for(const s of Object.values(e.players))s.teleported&&(this.teleportEffects.push(new Nt(this.scene,s.teleported.x,s.teleported.y,this.particles)),this.teleportEffects.push(new Nt(this.scene,s.position.x,s.position.y,this.particles)))}update(e){const s=this.clock.getDelta();this.elapsedTime+=s,this.emitAccumulator+=s,this.shouldEmitContinuous=this.emitAccumulator>=1/60,this.shouldEmitContinuous&&(this.emitAccumulator%=1/60),this.detectTeleports(e),this.syncFireballs(e),this.syncArrows(e),this.syncFireWalls(e),this.syncMeteors(e),this.syncRainOfArrows(e),this.particles.update(s);for(let t=this.teleportEffects.length-1;t>=0;t--)this.teleportEffects[t].update(s),this.teleportEffects[t].done&&this.teleportEffects.splice(t,1)}syncFireballs(e){const s=new Set(e.projectiles.filter(t=>t.type==="fireball").map(t=>t.id));for(const[t,i]of this.fireballs)if(!s.has(t)){const a=this.prevFireballPositions.get(t);a&&this.particles.emitExplosion(a.x,a.y,a.z,a.radius),this.scene.remove(i),L(i),this.fireballs.delete(t),this.prevFireballPositions.delete(t)}for(const t of e.projectiles){if(t.type!=="fireball")continue;if(!this.fireballs.has(t.id)){const p=t.radius??10,f=new A(lt,ks);f.scale.setScalar(p*.8);const m=new A(lt,Ms);m.scale.setScalar(1.4/.8),f.add(m),this.scene.add(f),this.fireballs.set(t.id,f)}const i=this.fireballs.get(t.id),a=t.position.x,r=30,n=t.position.y;i.position.set(a,r,n);const l=this.prevFireballPositions.get(t.id);let d=0,h=0;if(l){const p=a-l.x,f=n-l.z,m=Math.sqrt(p*p+f*f);m>0&&(d=p/m,h=f/m)}this.shouldEmitContinuous&&this.particles.emitTrail(a,r,n,d,h,t.radius??10),this.prevFireballPositions.set(t.id,{x:a,y:r,z:n,radius:t.blastRadius??t.radius??10})}}syncArrows(e){const s=new Set(e.projectiles.filter(t=>t.type==="arrow").map(t=>t.id));for(const[t,i]of this.arrows)s.has(t)||(this.scene.remove(i.mesh),L(i.mesh),this.arrows.delete(t));for(const t of e.projectiles){if(t.type!=="arrow")continue;if(!this.arrows.has(t.id)){const p=new me,f=t.ownerId===this.myId?Oe[this.arrowElement]:16777215,m=new A(bs,sa(f));p.add(m);const u=new rt(gs,ia(f));p.add(u),this.scene.add(p),this.arrows.set(t.id,{mesh:p})}const i=this.arrows.get(t.id),a=t.position.x,r=30,n=t.position.y;i.mesh.position.set(a,r,n);const l=t.velocity.x,d=t.velocity.y,h=Math.atan2(d,l);i.mesh.rotation.set(-Math.PI/2,0,-h)}}syncFireWalls(e){const s=new Set(e.fireWalls.map(t=>t.id));for(const[t,i]of this.fireWalls)if(!s.has(t)){this.scene.remove(i),L(i),this.fireWalls.delete(t);const a=this.rainZoneArrows.get(t);a&&(this.scene.remove(a.arrowGroup),L(a.arrowGroup),this.rainZoneArrows.delete(t))}for(const t of e.fireWalls){const i=t.id.startsWith("rain_zone_");if(!this.fireWalls.has(t.id)){const a=new me;if(t.shape==="circle"&&t.center&&t.radius){const r=new A(new ot(t.radius,32),new B({color:i?Oe[this.arrowElement]:16720384,transparent:!0,opacity:i?.15:.2,side:Se}));r.rotation.x=-Math.PI/2,r.position.set(t.center.x,1,t.center.y),a.add(r),i&&this.rainZoneArrows.set(t.id,this.createFallingArrows(t.center.x,t.center.y,t.radius,12))}else for(const r of t.segments){const n=[new O(r.x1,1,r.y1),new O(r.x2,1,r.y2)],l=new rt(new Re().setFromPoints(n),Cs);a.add(l)}this.scene.add(a),this.fireWalls.set(t.id,a)}if(t.shape==="circle"&&t.center&&t.radius)if(i){const a=this.rainZoneArrows.get(t.id);a&&this.updateFallingArrows(a)}else this.shouldEmitContinuous&&this.particles.emitCrater(t.center.x,t.center.y,t.radius);else this.shouldEmitContinuous&&this.particles.emitWall(t.segments)}}syncMeteors(e){const s=new Set(e.meteors.map(t=>t.id));for(const[t,i]of this.meteors)s.has(t)||(this.scene.remove(i.ring),this.scene.remove(i.rock),L(i.ring),L(i.rock),this.particles.emitMeteorImpact(i.target.x,0,i.target.y),this.meteors.delete(t));for(const t of e.meteors){if(!this.meteors.has(t.id)){const f=t.aoeRadius/yi,m=new A(ys,new B({color:16720384,transparent:!0,opacity:.6,side:Se}));m.rotation.x=-Math.PI/2,m.position.set(t.target.x,2,t.target.y);const u=new A(ws,Ss);this.scene.add(m),this.scene.add(u),this.meteors.set(t.id,{ring:m,rock:u,target:{...t.target},spawnTime:this.elapsedTime,sizeScale:f})}const i=this.meteors.get(t.id),a=!t.hidden||t.ownerId===this.myId;i.ring.visible=a,i.rock.visible=a;const r=Math.max(0,Math.min(1,1-(t.strikeAt-e.tick)/vi)),n=1-r*.4;i.ring.scale.setScalar(n*i.sizeScale);const l=this.elapsedTime-i.spawnTime,d=.5+r*2;i.ring.material.opacity=Math.sin(l*d*Math.PI*2)*.3+.5;const h=500*(1-r);i.rock.position.set(t.target.x,h,t.target.y);const p=.4+r*.6;i.rock.scale.setScalar(p*i.sizeScale),this.shouldEmitContinuous&&a&&this.particles.emitMeteorTrail(t.target.x,h,t.target.y)}}syncRainOfArrows(e){const s=new Set(e.rainOfArrows.map(t=>t.id));for(const[t,i]of this.rainOfArrows)s.has(t)||(this.scene.remove(i.circle),this.scene.remove(i.arrowGroup),L(i.circle),L(i.arrowGroup),this.particles.emitRainImpact(i.target.x,0,i.target.y,i.radius),this.rainOfArrows.delete(t));for(const t of e.rainOfArrows){if(!this.rainOfArrows.has(t.id)){const r=Oe[this.arrowElement],n=new A(new ot(t.radius,48),new B({color:r,transparent:!0,opacity:.12,side:Se}));n.rotation.x=-Math.PI/2,n.position.set(t.target.x,1,t.target.y),this.scene.add(n);const l=this.createFallingArrows(t.target.x,t.target.y,t.radius);l.arrowMaterial.opacity=0,this.rainOfArrows.set(t.id,{circle:n,target:{...t.target},radius:t.radius,...l})}const i=this.rainOfArrows.get(t.id),a=Math.max(0,Math.min(1,1-(t.strikeAt-e.tick)/wi));i.circle.material.opacity=.12+a*.23,i.arrowMaterial.opacity=Math.min(1,a*2),this.updateFallingArrows(i)}}dispose(){for(const e of this.fireballs.values())this.scene.remove(e),L(e);for(const e of this.arrows.values())this.scene.remove(e.mesh),L(e.mesh);for(const e of this.fireWalls.values())this.scene.remove(e),L(e);for(const e of this.rainZoneArrows.values())this.scene.remove(e.arrowGroup),L(e.arrowGroup);this.rainZoneArrows.clear();for(const e of this.meteors.values())this.scene.remove(e.ring),this.scene.remove(e.rock),L(e.ring),L(e.rock);for(const e of this.rainOfArrows.values())this.scene.remove(e.circle),this.scene.remove(e.arrowGroup),L(e.circle),L(e.arrowGroup);for(const e of this.teleportEffects)e.dispose();this.fireballs.clear(),this.arrows.clear(),this.fireWalls.clear(),this.meteors.clear(),this.rainOfArrows.clear(),this.teleportEffects.length=0,this.particles.dispose()}}const _s=1e3/ze,Qe=2*_s,oa=250;class ra{constructor(){c(this,"snapshots",[]);c(this,"maxSnapshots",32);c(this,"clockOffset",null);c(this,"jitter",0);c(this,"renderDelayMs",Qe);c(this,"outOfBandCount",0)}push(e,s=performance.now()){const t=e.tick*_s,i=s-t;this.clockOffset===null?this.clockOffset=i:Math.abs(i-this.clockOffset)>oa?(this.outOfBandCount++,this.outOfBandCount>=2&&(this.clockOffset=i,this.jitter=0,this.outOfBandCount=0)):(this.outOfBandCount=0,this.jitter=this.jitter*.9+Math.abs(i-this.clockOffset)*.1,this.clockOffset=this.clockOffset*.95+i*.05),this.renderDelayMs=Qe+this.jitter*2,this.snapshots.push({state:e,tickTime:t}),this.snapshots.length>this.maxSnapshots&&this.snapshots.shift()}getInterpolated(e=performance.now()){if(this.snapshots.length<2||this.clockOffset===null)return null;const s=e-this.clockOffset-this.renderDelayMs;let t=0;for(;t<this.snapshots.length-1&&!(this.snapshots[t+1].tickTime>=s);t++);t=Math.max(0,Math.min(t,this.snapshots.length-2));const i=this.snapshots[t],a=this.snapshots[t+1],r=a.tickTime-i.tickTime,n=r>0?Math.max(0,Math.min(1,(s-i.tickTime)/r)):1,l={};for(const d of Object.keys(a.state.players)){const h=i.state.players[d],p=a.state.players[d];if(!h){l[d]=p;continue}l[d]={...p,position:na(h.position,p.position,n),facing:la(h.facing,p.facing,n)}}return{...a.state,players:l}}getLatest(){return this.snapshots.length===0?null:this.snapshots[this.snapshots.length-1].state}clear(){this.snapshots=[],this.clockOffset=null,this.jitter=0,this.renderDelayMs=Qe,this.outOfBandCount=0}}function na(o,e,s){return{x:o.x+(e.x-o.x)*s,y:o.y+(e.y-o.y)*s}}function la(o,e,s){let t=e-o;for(;t>Math.PI;)t-=2*Math.PI;for(;t<-Math.PI;)t+=2*Math.PI;return o+t*s}const ca=30,da=.5,pa=100;class ha{constructor(e){c(this,"position");c(this,"prevPosition");c(this,"seq",0);c(this,"buffer",[]);c(this,"correctionOffset",{x:0,y:0});c(this,"correctionStartTime",0);c(this,"correctionDurationMs",pa);this.position={...e},this.prevPosition={...e}}applyInput(e,s,t={}){this.seq++,this.prevPosition={...this.position};const i=t.speedMult??1;return this.position=Et(this.position,e,i),t.teleportTarget&&(this.position=Tt(this.position,t.teleportTarget,t.teleportRange),this.prevPosition={...this.position}),this.buffer.push({seq:this.seq,move:e,speedMult:i,teleportTarget:t.teleportTarget,teleportRange:t.teleportRange}),this.seq}reconcile(e,s){if(this.buffer=this.buffer.filter(n=>n.seq>s),this.buffer.length>ca){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0};return}let t={...e};for(const n of this.buffer)t=Et(t,n.move,n.speedMult),n.teleportTarget&&(t=Tt(t,n.teleportTarget,n.teleportRange));const i=t.x-this.position.x,a=t.y-this.position.y;if(Math.sqrt(i*i+a*a)>da){const n=performance.now(),l=this.getRenderPosition(1,n),d=this.position.x-this.prevPosition.x,h=this.position.y-this.prevPosition.y;this.correctionOffset={x:l.x-t.x,y:l.y-t.y},this.correctionStartTime=n,this.prevPosition={x:t.x-d,y:t.y-h},this.position=t}}getPosition(e=performance.now()){return this.getRenderPosition(1,e)}getRenderPosition(e,s=performance.now()){const t=Math.max(0,Math.min(1,e)),i={x:this.prevPosition.x+(this.position.x-this.prevPosition.x)*t,y:this.prevPosition.y+(this.position.y-this.prevPosition.y)*t};if(this.correctionOffset.x===0&&this.correctionOffset.y===0)return i;const a=s-this.correctionStartTime,n=1-Math.min(1,a/this.correctionDurationMs);return{x:i.x+this.correctionOffset.x*n,y:i.y+this.correctionOffset.y*n}}reset(e){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0}}getSeq(){return this.seq}}class ma{constructor(){c(this,"socket");this.socket=si("",{autoConnect:!1,transports:["websocket"]})}connect(){this.socket.connect()}disconnect(){this.socket.removeAllListeners(),this.socket.disconnect()}joinRoom(e,s,t,i,a){this.socket.emit("join-room",{roomId:e,displayName:s,accessToken:t,teamId:i,characterId:a})}ready(){this.socket.emit("player-ready")}sendInput(e){this.socket.emit("input",e)}rematch(){this.socket.emit("rematch")}sendChatMessage(e){this.socket.emit("chat-message",{text:e})}rejoinRoom(e,s){this.socket.emit("rejoin-room",{roomId:e,accessToken:s})}leavePausedMatch(){this.socket.emit("leave-paused-match")}onRoomJoined(e){this.socket.once("room-joined",e)}onPlayerJoined(e){this.socket.on("player-joined",e)}onGameReady(e){this.socket.once("game-ready",e)}onGameState(e){this.socket.off("game-state"),this.socket.on("game-state",e)}onDuelEnded(e){this.socket.off("duel-ended"),this.socket.on("duel-ended",e)}onRematchReady(e){this.socket.off("rematch-ready"),this.socket.on("rematch-ready",e)}onRematchRequested(e){this.socket.off("rematch-requested"),this.socket.on("rematch-requested",e)}onOpponentDisconnected(e){this.socket.off("opponent-disconnected"),this.socket.on("opponent-disconnected",e)}onTeamFull(e){this.socket.once("team-full",e)}onPlayerDisconnected(e){this.socket.on("player-disconnected",e)}onPlayerLeft(e){this.socket.on("player-left",e)}onRoomNotFound(e){this.socket.off("room-not-found"),this.socket.on("room-not-found",e)}onChatMessage(e){this.socket.off("chat-message"),this.socket.on("chat-message",e)}onPlayerReadyAck(e){this.socket.off("player-ready-ack"),this.socket.on("player-ready-ack",e)}onMatchPaused(e){this.socket.off("match-paused"),this.socket.on("match-paused",e)}onGameResumed(e){this.socket.off("game-resumed"),this.socket.on("game-resumed",e)}onRejoinAccepted(e){this.socket.off("rejoin-accepted"),this.socket.once("rejoin-accepted",e)}onRejoinFailed(e){this.socket.off("rejoin-failed"),this.socket.once("rejoin-failed",e)}onReconnect(e){this.socket.on("connect",e)}onDisconnect(e){this.socket.on("disconnect",e)}get id(){return this.socket.id??""}}const Ts=-Math.PI/4,Dt=Math.cos(Ts),Ut=Math.sin(Ts);class fa{constructor(e,s){c(this,"keys",new Set);c(this,"activeSpell",1);c(this,"charClass","mage");c(this,"mouseScreen",{x:0,y:0});c(this,"mouseWorld",{x:1e3,y:1e3});c(this,"pendingCast",null);c(this,"onKeyDown",e=>{this.keys.add(e.code);const s=/^Digit([1-4])$/.exec(e.code);if(s){const t=this.spellForKey(Number(s[1]));t&&(this.activeSpell=t)}if(e.code==="Space"){e.preventDefault();const t=this.spellForKey(4);t&&(this.pendingCast={spell:t,aimTarget:this.mouseWorld})}});c(this,"onKeyUp",e=>{this.keys.delete(e.code)});c(this,"onBlur",()=>{this.keys.clear()});c(this,"onMouseMove",e=>{this.mouseScreen={x:e.clientX,y:e.clientY},this.mouseWorld=this.scene.screenToWorld(e.clientX,e.clientY)});c(this,"onMouseDown",e=>{});c(this,"onMouseUp",e=>{e.button===0&&(this.pendingCast={spell:this.activeSpell,aimTarget:this.mouseWorld})});this.scene=e,this.canvas=s,window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur),window.addEventListener("contextmenu",this.onBlur),s.addEventListener("mousemove",this.onMouseMove),s.addEventListener("mousedown",this.onMouseDown),s.addEventListener("mouseup",this.onMouseUp)}spellForKey(e){var s;return((s=Ge.find(t=>t.charClass===this.charClass&&t.key===e))==null?void 0:s.spell)??null}buildInputFrame(){const e={x:0,y:0};(this.keys.has("KeyW")||this.keys.has("ArrowUp"))&&(e.y-=1),(this.keys.has("KeyS")||this.keys.has("ArrowDown"))&&(e.y+=1),(this.keys.has("KeyA")||this.keys.has("ArrowLeft"))&&(e.x-=1),(this.keys.has("KeyD")||this.keys.has("ArrowRight"))&&(e.x+=1);const s=e.x*Dt-e.y*Ut,t=e.x*Ut+e.y*Dt;e.x=s,e.y=t;const i={move:e,castSpell:null,aimTarget:this.mouseWorld};return this.pendingCast&&(i.castSpell=this.pendingCast.spell,i.aimTarget=this.pendingCast.aimTarget,this.pendingCast=null),i}refreshMouseWorld(){this.mouseWorld=this.scene.screenToWorld(this.mouseScreen.x,this.mouseScreen.y)}setCharacterClass(e){this.charClass=e==="amazon"?"amazon":"mage",this.activeSpell=this.spellForKey(1)??1}getActiveSpell(){return this.activeSpell}getCurrentMouseWorld(){return this.mouseWorld}dispose(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),window.removeEventListener("contextmenu",this.onBlur),this.canvas.removeEventListener("mousemove",this.onMouseMove),this.canvas.removeEventListener("mousedown",this.onMouseDown),this.canvas.removeEventListener("mouseup",this.onMouseUp)}}const U=120;function Je(o,e){const s=U/2+(o-e)*U/(2*T),t=(o+e)*U/(2*T);return[s,t]}class ua{constructor(e){c(this,"canvas");c(this,"ctx");this.canvas=document.createElement("canvas"),this.canvas.width=U,this.canvas.height=U,Object.assign(this.canvas.style,{position:"fixed",top:"12px",right:"12px",opacity:"0.85",border:"none",borderRadius:"0",boxShadow:"0 0 0 2px var(--px-border-dark),0 0 0 4px var(--px-border-light)",imageRendering:"pixelated",zIndex:"100",display:"none"}),e.appendChild(this.canvas),this.ctx=this.canvas.getContext("2d")}update(e,s){const t=this.ctx;t.clearRect(0,0,U,U),t.fillStyle="#0a0a1a",t.fillRect(0,0,U,U),t.strokeStyle="#333",t.lineWidth=1,t.strokeRect(0,0,U,U),t.fillStyle="#6c63ff";for(const n of Ce){const[l,d]=Je(n.x,n.y);t.fillRect(l-2,d-2,4,4)}const i=["#ff5252","#ff9800","#ab47bc"];for(let n=0;n<s.length;n++){const l=s[n];if(l.hp<=0)continue;const[d,h]=Je(l.position.x,l.position.y);t.fillStyle=i[n%i.length],t.beginPath(),t.arc(d,h,3,0,Math.PI*2),t.fill()}const[a,r]=Je(e.position.x,e.position.y);t.fillStyle="#00e676",t.beginPath(),t.arc(a,r,3,0,Math.PI*2),t.fill()}show(){this.canvas.style.display=""}hide(){this.canvas.style.display="none"}}const xa={1:"fa-fire",2:"fa-fire-flame-simple",3:"fa-meteor",4:"fa-wand-magic",5:"fa-bullseye",6:"fa-arrows-split-up-and-left",7:"fa-cloud-rain",8:"fa-person-running"},ba={1:"#ff8c42",2:"#ff8c42",3:"#ff8c42",4:"#b48cff",5:"#8cd97a",6:"#8cd97a",7:"#8cd97a",8:"#b48cff"},et="polygon(37.5% 0%,62.5% 0%,75% 6.25%,87.5% 12.5%,93.75% 25%,100% 37.5%,100% 62.5%,93.75% 75%,87.5% 87.5%,75% 93.75%,62.5% 100%,37.5% 100%,25% 93.75%,12.5% 87.5%,6.25% 75%,0% 62.5%,0% 37.5%,6.25% 25%,12.5% 12.5%,25% 6.25%)";class ga{constructor(e){c(this,"el");c(this,"minimap");c(this,"myId","");c(this,"prevHp",{});c(this,"hpFill");c(this,"mpFill");c(this,"hpOrb");c(this,"hpNum");c(this,"mpNum");c(this,"spellsEl");c(this,"enemiesEl");c(this,"slotEls",new Map);c(this,"enemyRows",new Map);c(this,"lastHpPct",-1);c(this,"lastMpPct",-1);c(this,"lastHpText","");c(this,"lastMpText","");c(this,"lastLowPulse",!1);this.minimap=new ua(e),this.el=document.createElement("div"),this.el.innerHTML=`
      <style>
        .hud-dock{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:18px;pointer-events:none}
        /* --- orbs --- */
        .orb-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
        .orb{width:88px;height:88px;position:relative;clip-path:${et};background:var(--px-border-dark);}
        .orb-inner{position:absolute;inset:5px;clip-path:${et};background:#120e1c;overflow:hidden}
        .orb-fill{position:absolute;inset:0;transition:transform .12s}
        .orb-fill::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.35)}
        .orb-hp .orb-fill{background:linear-gradient(180deg,#e0524a 0%,#b32e2e 45%,#7d1c22 100%)}
        .orb-mp .orb-fill{background:linear-gradient(180deg,#4a7ce0 0%,#2e50b3 45%,#1c2f7d 100%)}
        .orb-shine{position:absolute;top:12%;left:18%;width:26%;height:16%;background:rgba(255,255,255,0.22);clip-path:${et};pointer-events:none}
        .orb-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:13px;color:#fff;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000,0 2px 0 #000;z-index:2}
        .orb-label{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-border-light);letter-spacing:1px}
        .orb.low-pulse{animation:orb-low .9s ease-in-out infinite}
        @keyframes orb-low{0%,100%{filter:drop-shadow(0 0 0 rgba(224,91,91,0))}50%{filter:drop-shadow(0 0 9px rgba(224,91,91,0.85))}}
        /* --- spell slots --- */
        .spells{display:flex;gap:8px;padding:9px 12px;margin-bottom:8px;background:var(--px-panel);box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 6px 12px rgba(0,0,0,0.5)}
        .spell-slot{width:52px;height:52px;background:linear-gradient(180deg,#3a2f52 0%,#2b2140 100%);box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px var(--px-border-dark);position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .spell-slot .slot-icon{font-size:21px;text-shadow:0 2px 0 rgba(0,0,0,0.6);z-index:1;transition:opacity .1s}
        .spell-slot .slot-key{position:absolute;right:2px;bottom:2px;font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-text);background:var(--px-border-dark);padding:2px 3px;z-index:3}
        .spell-slot .cd-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(10,8,18,0.8);transition:height .1s;z-index:2}
        .spell-slot .cd-time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:10px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;z-index:3;display:none}
        .spell-slot.cooling .cd-time{display:flex}
        .spell-slot.cooling .slot-icon{opacity:0.45}
        .spell-slot.nomana .slot-icon{opacity:0.35;filter:saturate(0.2) brightness(1.6) hue-rotate(180deg)}
        .spell-slot.active{box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px var(--px-accent),0 0 10px rgba(255,179,71,0.55)}
        .spell-slot.active::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(255,179,71,0.4);z-index:2;pointer-events:none}
        /* --- enemy plates --- */
        .hud-enemies{position:fixed;top:12px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:7px;align-items:center}
        .hud-enemy-entry{background:var(--px-panel);padding:6px 10px 8px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);text-align:center;transition:opacity .3s}
        .hud-enemy-entry .enemy-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);margin-bottom:5px;letter-spacing:1px;text-shadow:1px 1px 0 var(--px-border-dark)}
        .hud-enemy-entry .enemy-hp-track{height:12px;background:#120e1c;overflow:hidden;width:190px;box-shadow:inset 0 0 0 2px var(--px-border-dark);position:relative}
        .hud-enemy-entry .enemy-hp-fill{height:100%;background:linear-gradient(180deg,#e0524a 0%,#b32e2e 55%,#8a2026 100%);transition:width .12s;position:relative}
        .hud-enemy-entry .enemy-hp-fill::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 17px,rgba(0,0,0,0.35) 17px 19px)}
        .hud-enemy-entry.hit .enemy-hp-fill{filter:brightness(2.2)}
        /* --- elimination toast --- */
        .hud-elim{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;text-shadow:2px 2px 0 var(--px-border-dark);pointer-events:none;animation:hud-elim-fade 2s forwards}
        @keyframes hud-elim-fade{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%) scale(0.9)}}
      </style>
      <div id="hud-enemies" class="hud-enemies"></div>
      <div class="hud-dock">
        <div class="orb-wrap">
          <div class="orb orb-hp" id="hud-hp-orb">
            <div class="orb-inner"><div class="orb-fill" id="hud-hp" style="transform:translateY(0%)"></div></div>
            <div class="orb-shine"></div>
            <div class="orb-num" id="hud-hp-num"></div>
          </div>
          <div class="orb-label">LIFE</div>
        </div>
        <div class="spells" id="hud-spells"></div>
        <div class="orb-wrap">
          <div class="orb orb-mp">
            <div class="orb-inner"><div class="orb-fill" id="hud-mp" style="transform:translateY(0%)"></div></div>
            <div class="orb-shine"></div>
            <div class="orb-num" id="hud-mp-num"></div>
          </div>
          <div class="orb-label">MANA</div>
        </div>
      </div>
    `,e.appendChild(this.el),this.hpFill=this.el.querySelector("#hud-hp"),this.mpFill=this.el.querySelector("#hud-mp"),this.hpOrb=this.el.querySelector("#hud-hp-orb"),this.hpNum=this.el.querySelector("#hud-hp-num"),this.mpNum=this.el.querySelector("#hud-mp-num"),this.spellsEl=this.el.querySelector("#hud-spells"),this.enemiesEl=this.el.querySelector("#hud-enemies")}init(e){this.myId=e,this.prevHp={},this.enemiesEl.textContent="",this.enemyRows.clear(),this.lastHpPct=-1,this.lastMpPct=-1}buildSpellSlots(e){this.spellsEl.textContent="",this.slotEls.clear();for(const s of Ge){if(!e.has(s.spell))continue;const t=document.createElement("div");t.className="spell-slot",t.innerHTML=`
        <i class="fa ${xa[s.spell]??"fa-star"} fa-fw slot-icon" style="color:${ba[s.spell]??"var(--px-text)"}"></i>
        <span class="slot-key">${s.key}</span>
        <div class="cd-overlay" style="height:0%"></div>
        <span class="cd-time"></span>`,this.spellsEl.appendChild(t),this.slotEls.set(s.spell,{slot:t,cd:t.querySelector(".cd-overlay"),cdTime:t.querySelector(".cd-time"),lastPct:0,lastActive:!1,lastNoMana:!1,lastCdText:""})}}update(e,s){const t=e.players[this.myId];if(!t)return;const i=Math.round((1-t.hp/Ve)*1e3)/10;i!==this.lastHpPct&&(this.hpFill.style.transform=`translateY(${i}%)`,this.lastHpPct=i);const a=Math.round((1-t.mana/gi)*1e3)/10;a!==this.lastMpPct&&(this.mpFill.style.transform=`translateY(${a}%)`,this.lastMpPct=a);const r=String(Math.max(0,Math.ceil(t.hp)));r!==this.lastHpText&&(this.hpNum.textContent=r,this.lastHpText=r);const n=String(Math.max(0,Math.floor(t.mana)));n!==this.lastMpText&&(this.mpNum.textContent=n,this.lastMpText=n);const l=t.hp>0&&t.hp/Ve<.3;l!==this.lastLowPulse&&(this.hpOrb.classList.toggle("low-pulse",l),this.lastLowPulse=l);for(const[f,m]of this.slotEls){const u=f===s;u!==m.lastActive&&(m.slot.classList.toggle("active",u),m.lastActive=u);const x=t.cooldowns[f]??0,C=Ue[f].cooldownTicks,_=C>0?Math.round(x/C*1e3)/10:0;_!==m.lastPct&&(m.cd.style.height=`${_}%`,m.slot.classList.toggle("cooling",_>0),m.lastPct=_);const E=x>0?(x/60).toFixed(1):"";E!==m.lastCdText&&(m.cdTime.textContent=E,m.lastCdText=E);const w=t.mana<Ue[f].manaCost;w!==m.lastNoMana&&(m.slot.classList.toggle("nomana",w),m.lastNoMana=w)}const d=[],h=new Set;for(const[f,m]of Object.entries(e.players)){if(f===this.myId)continue;h.add(f),d.push(m);let u=this.enemyRows.get(f);if(!u){const C=document.createElement("div");C.className="hud-enemy-entry";const _=document.createElement("div");_.className="enemy-name";const E=document.createElement("div");E.className="enemy-hp-track";const w=document.createElement("div");w.className="enemy-hp-fill",E.appendChild(w),C.append(_,E),this.enemiesEl.appendChild(C),u={row:C,name:_,fill:w,lastHp:-1,lastName:"",flashTimer:0},this.enemyRows.set(f,u)}m.displayName!==u.lastName&&(u.name.textContent=m.displayName,u.lastName=m.displayName),m.hp!==u.lastHp&&(u.lastHp>=0&&m.hp<u.lastHp&&(u.row.classList.add("hit"),clearTimeout(u.flashTimer),u.flashTimer=window.setTimeout(()=>u.row.classList.remove("hit"),140)),u.fill.style.width=`${m.hp/Ve*100}%`,u.row.style.opacity=m.hp<=0?"0.3":"1",u.lastHp=m.hp);const x=this.prevHp[f];x!==void 0&&x>0&&m.hp<=0&&this.showElimination(m.displayName)}for(const[f,m]of this.enemyRows)h.has(f)||(m.row.remove(),this.enemyRows.delete(f));const p={};for(const[f,m]of Object.entries(e.players))p[f]=m.hp;this.prevHp=p,this.minimap.update(t,d)}showElimination(e){const s=document.createElement("div");s.className="hud-elim",s.textContent=`${e} eliminated`,this.el.appendChild(s),setTimeout(()=>s.remove(),2e3)}show(){this.el.style.display="",this.minimap.show()}hide(){this.el.style.display="none",this.minimap.hide()}}function F(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const va=`
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
`,ya=`
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
</div>`;class wa{constructor(e,s){c(this,"el");c(this,"ui");c(this,"pollTimer",null);c(this,"pauseOverlay",null);c(this,"pauseCountdownTimer",null);c(this,"rematchInterval",null);this.cb=s;const t=document.createElement("style");t.textContent=va,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="bm-overlay",this.el.innerHTML=ya,this.ui=document.createElement("div"),this.ui.className="bm-ui",this.el.appendChild(this.ui),e.appendChild(this.el),this.showHome()}showHome(e,s,t,i){this.stopPolling();const a=new URLSearchParams(window.location.search).get("room")??"",r=e!==void 0||s!==void 0,h={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',amazon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'}[t??""]??"⚔",p=r?`<div class="bm-char-card px-panel">
           <div class="bm-char-icon">${h}</div>
           <div class="bm-char-details">
             <div class="bm-char-name">${F(e??"")}</div>
             <div class="bm-char-meta">${t?`${F(t)}`:""}${i!==void 0?` · Lvl <b>${i}</b>`:""}${s!==void 0?` · <b>${s}</b> Skill Pts`:""}</div>
           </div>
           <div class="bm-char-actions">
             <button id="bm-skills" class="bm-btn-ghost px-btn">✦ Skills</button>
             <button id="bm-switch-char" class="bm-btn-ghost px-btn">⇄ Switch</button>
             <button id="bm-logout" class="bm-btn-logout px-btn">Sign Out</button>
           </div>
         </div>`:"",f=e?F(e):"";this.ui.innerHTML=`
      <div class="bm-title px-title">Blood Moor</div>
      <div class="bm-subtitle px-label">Enter the Arena · Choose Your Fate</div>
      ${p}
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
            <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${F(a)}" maxlength="12">
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
      <button id="bm-credits" class="bm-btn-ghost px-btn bm-credits-btn">Credits</button>`;const m=this.ui.querySelector("#bm-skills");m&&m.addEventListener("click",()=>this.cb.onOpenSkills());const u=this.ui.querySelector("#bm-switch-char");u&&u.addEventListener("click",()=>this.cb.onSwitchCharacter());const x=this.ui.querySelector("#bm-credits");x&&x.addEventListener("click",()=>this.cb.onShowCredits());const C=this.ui.querySelector("#bm-logout");C&&C.addEventListener("click",()=>this.cb.onLogout());const _=this.ui.querySelector("#mode-grid");let E="1v1";_.querySelectorAll(".bm-mode").forEach(w=>{w.addEventListener("click",()=>{_.querySelectorAll(".bm-mode").forEach(K=>K.classList.remove("active")),w.classList.add("active"),E=w.dataset.mode})}),this.ui.querySelector("#bm-create").addEventListener("click",()=>{const w=this.ui.querySelector("#bm-name").value.trim();w&&this.cb.onCreateRoom(w,E)}),this.ui.querySelector("#bm-join-code").addEventListener("click",()=>{const w=this.ui.querySelector("#bm-name").value.trim(),K=this.ui.querySelector("#bm-code").value.trim();w&&K&&this.cb.onJoinRoom(K,w)}),this.ui.querySelector("#bm-code").addEventListener("keydown",w=>{w.key==="Enter"&&this.ui.querySelector("#bm-join-code").click()}),this.pollLobbies(),this.pollTimer=window.setInterval(()=>this.pollLobbies(),3e3),a&&this.ui.querySelector("#bm-name").focus()}showWaiting(e,s,t){this.stopPolling(),this.renderLobby(e,[{name:s,index:0,ready:!1}],t)}showReady(e,s,t,i,a){this.stopPolling();const r=Object.entries(s).map(([n,l],d)=>({name:l,index:d,ready:(a==null?void 0:a.has(n))??!1}));this.renderLobby(e,r,i)}showResult(e,s,t,i){this.stopPolling();let a,r;s==="2v2"?(a=e?"Your Team Wins":"Your Team Loses",r=e?"Your team dominated the arena":"Your team has fallen"):s==="ffa"?(a=e?"Victory":"Defeated",e?r="You are the last one standing":t?r=`Defeated — ${t===2?"2nd":t===3?"3rd":`${t}th`} place`:r="You have been eliminated"):(a=e?"Victory":"Defeat",r=e?"You are victorious":"You have been slain");const n=e?"bm-win":"bm-lose",l=i&&i.levelsGained>0,d=i?l?"1.4s":"1.1s":"0.8s",h=i?`<div class="bm-result-divider">
           <div class="bm-result-divider-line"></div>
           <div class="bm-result-divider-dot"></div>
           <div class="bm-result-divider-line"></div>
         </div>
         <div class="bm-result-xp">+<span id="bm-xp-count">0</span> XP</div>
         <div class="bm-result-xp-label">Experience Gained</div>
         ${l?`<div class="bm-result-levelup">Level Up <span class="bm-result-levelup-num">${i.newLevel}</span></div>`:""}`:"";if(this.ui.innerHTML=`
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
        ${h}
        <div class="bm-result-buttons" style="animation-delay:${d}">
          <button id="bm-rematch" class="bm-btn-rematch px-btn">⚔ Rematch</button>
          <button id="bm-return-lobby" class="bm-btn-return px-btn">Return to Lobby</button>
        </div>
      </div>`,i&&i.xpGained>0){const p=this.ui.querySelector("#bm-xp-count");if(p){const f=i.xpGained,m=1200,u=performance.now()+800,x=C=>{const _=C-u;if(_<0){requestAnimationFrame(x);return}const E=Math.min(_/m,1),w=1-Math.pow(1-E,3);p.textContent=String(Math.round(f*w)),E<1&&requestAnimationFrame(x)};requestAnimationFrame(x)}}this.ui.querySelector("#bm-rematch").addEventListener("click",()=>this.cb.onRematch()),this.ui.querySelector("#bm-return-lobby").addEventListener("click",()=>this.cb.onReturnToLobby())}disableRematch(){this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null);const e=this.ui.querySelector("#bm-rematch");e&&(e.disabled=!0,e.classList.add("waiting"),e.style.opacity="0.4",e.style.cursor="default",e.textContent="Opponent left");const s=this.ui.querySelector(".bm-rematch-countdown");s&&s.remove()}showRematchCountdown(e,s){this.rematchInterval&&clearInterval(this.rematchInterval);const t=this.ui.querySelector("#bm-rematch");if(!t)return;let i=e;s?(t.classList.add("waiting"),t.textContent=`Waiting... (${i}s)`):t.textContent=`⚔ Rematch (${i}s)`;let a=this.ui.querySelector(".bm-rematch-countdown");if(!a){a=document.createElement("div"),a.className="bm-rematch-countdown";const r=this.ui.querySelector(".bm-result-buttons");r&&r.appendChild(a)}a.textContent=s?"Waiting for opponent...":"Opponent wants a rematch!",this.rematchInterval=setInterval(()=>{if(i--,i<=0){this.rematchInterval&&clearInterval(this.rematchInterval),this.rematchInterval=null,s&&this.disableRematch();return}t&&(s?t.textContent=`Waiting... (${i}s)`:t.textContent=`⚔ Rematch (${i}s)`)},1e3)}showDisconnected(){this.stopPolling(),this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-disc-panel">
        <div class="bm-disc-title">Opponent Fled</div>
        <div class="bm-disc-sub">The coward has left the arena.<br>Refresh to seek new prey.</div>
      </div>`}appendChatMessage(e,s,t){const i=this.ui.querySelector("#bm-chat-msgs");if(!i)return;const a=this.getSenderColorClass(e),r=document.createElement("div");r.className="bm-msg",r.innerHTML=`<span class="bm-msg-sender ${a}">${F(s)}</span><span class="bm-msg-text">${F(t)}</span>`,i.appendChild(r),i.scrollTop=i.scrollHeight}appendSystemMessage(e){const s=this.ui.querySelector("#bm-chat-msgs");if(!s)return;const t=document.createElement("div");t.className="bm-msg",t.innerHTML=`<span class="bm-msg-sender bm-msg-sender-sys">—</span><span class="bm-msg-sys">${F(e)}</span>`,s.appendChild(t),s.scrollTop=s.scrollHeight}hide(){this.stopPolling(),this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null),this.el.style.display="none"}show(){this.el.style.display=""}showPauseOverlay(e,s){this.hidePauseOverlay(),this.pauseOverlay=document.createElement("div"),this.pauseOverlay.className="bm-pause-overlay",this.pauseOverlay.innerHTML=`
      <div class="bm-pause-title">Opponent Disconnected</div>
      <div class="bm-pause-countdown" id="bm-pause-timer">${e}</div>
      <div class="bm-pause-sub">Waiting for opponent to rejoin...</div>
      <button class="bm-btn-leave px-btn" id="bm-pause-leave">Leave Match</button>`,this.el.parentElement.appendChild(this.pauseOverlay),this.pauseOverlay.querySelector("#bm-pause-leave").addEventListener("click",s);let t=e;const i=this.pauseOverlay.querySelector("#bm-pause-timer");this.pauseCountdownTimer=window.setInterval(()=>{t--,i.textContent=String(Math.max(0,t)),t<=0&&this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null)},1e3)}hidePauseOverlay(){this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null),this.pauseOverlay&&(this.pauseOverlay.remove(),this.pauseOverlay=null)}stopPolling(){this.pollTimer!==null&&(clearInterval(this.pollTimer),this.pollTimer=null)}async pollLobbies(){try{const e=await fetch("/rooms"),{rooms:s}=await e.json();this.renderRoomRows(s)}catch{}}renderRoomRows(e){const s=this.ui.querySelector("#bm-rooms");if(s){if(e.length===0){s.innerHTML='<div class="bm-empty">No open lobbies<br>Be the first to enter the arena</div>';return}s.innerHTML=e.map(t=>{const i=t.mode==="2v2"?`<button class="bm-btn-green-sm px-btn" data-team="team1">Join T1</button>
           <button class="bm-btn-green-sm px-btn" data-team="team2" style="margin-left:4px">Join T2</button>`:'<button class="bm-btn-green-sm px-btn">Join</button>';return`
      <div class="bm-room-row" data-room-id="${F(t.roomId)}" data-mode="${F(t.mode)}">
        <div class="bm-room-info">
          <div class="bm-room-name">${F(t.creatorName)}</div>
          <div class="bm-room-meta">Waiting for players</div>
        </div>
        <span class="bm-tag">${F(t.mode)}</span>
        <div class="bm-players"><b>${t.playerCount}</b> / ${t.maxPlayers}</div>
        ${i}
      </div>`}).join(""),s.querySelectorAll(".bm-room-row").forEach(t=>{t.querySelectorAll(".bm-btn-green-sm").forEach(i=>{i.addEventListener("click",()=>{var l;const a=t.dataset.roomId,r=((l=this.ui.querySelector("#bm-name"))==null?void 0:l.value.trim())??"",n=i.dataset.team;r&&this.cb.onJoinRoom(a,r,n)})})})}}renderLobby(e,s,t){const i=`${location.origin}?room=${e}`,a=t==="ffa"||t==="2v2"?4:2,r=t==="2v2"?4:2,n=s.length>=r,d={"1v1":"1v1 Duel",ffa:"Free-for-All","2v2":"2v2 Teams"}[t??"1v1"]??"1v1 Duel",h=(x,C)=>x?`<div class="bm-slot" style="${x.ready?"box-shadow:0 0 0 2px var(--px-success),0 0 6px rgba(111,206,126,0.3);":""}">
             <div class="bm-avatar bm-avatar-${x.index%4}">${F((x.name[0]??"?").toUpperCase())}</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name">${F(x.name)}</div>
               <div class="bm-slot-status ${x.ready?"bm-status-ready":"bm-status-waiting"}">${x.ready?"✓ Ready":"Waiting..."}</div>
             </div>
           </div>`:`<div class="bm-slot">
             <div class="bm-avatar bm-avatar-empty">?</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name" style="color:var(--px-border-light)">${C}</div>
               <div class="bm-slot-status bm-status-empty">Waiting for challenger...</div>
             </div>
           </div>`;let p="";for(let x=0;x<a;x++)p+=h(s[x],`Slot ${x+1}`);const f=n?'<button id="bm-ready" class="bm-btn-green px-btn px-btn-primary">⚔ Ready</button>':`<button class="bm-btn-green px-btn px-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>⚔ Ready</button>
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
              <div class="bm-code-value">${F(e.toUpperCase())}</div>
            </div>
            <button id="bm-copy" class="bm-copy-btn px-btn">⎘ Copy Link</button>
          </div>
          ${p}
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
      </div>`,this.ui.querySelector("#bm-copy").addEventListener("click",()=>{navigator.clipboard.writeText(i)}),this.ui.querySelector("#bm-leave").addEventListener("click",()=>{this.cb.onReturnToLobby()});const m=this.ui.querySelector("#bm-ready");m&&m.addEventListener("click",()=>{m.replaceWith(Object.assign(document.createElement("button"),{className:"bm-btn-green-done px-btn",textContent:"✓ Ready"})),this.cb.onReady()});const u=()=>{const x=this.ui.querySelector("#bm-chat-input"),C=x.value.trim();C&&(this.cb.onSendChatMessage(C),x.value="")};this.ui.querySelector("#bm-chat-send").addEventListener("click",u),this.ui.querySelector("#bm-chat-input").addEventListener("keydown",x=>{x.key==="Enter"&&u()})}getSenderColorClass(e){return e.split("").reduce((t,i)=>t+i.charCodeAt(0),0)%2===0?"bm-msg-sender-0":"bm-msg-sender-1"}}const ka="https://ulekuozamvhluojthxrh.supabase.co",Ma="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWt1b3phbXZobHVvanRoeHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjYxMzgsImV4cCI6MjA5MjE0MjEzOH0.lkYBXt9xjNrPFXg8vOMDntT1Qdw98NHjSH8-fi2BavU",S=ii(ka,Ma);async function qe(){const{data:{user:o}}=await S.auth.getUser();if(!o)return[];const{data:e}=await S.from("characters").select("*").eq("user_id",o.id).order("created_at",{ascending:!0});return e??[]}async function Sa(o,e,s){const{data:{user:t}}=await S.auth.getUser();if(!t)return null;const{data:i,error:a}=await S.rpc("create_character",{p_user_id:t.id,p_name:o,p_class:e});if(a)return console.error("create_character failed:",a.message),null;const r=i;if(s)try{await Es(r,s)}catch(l){console.warn("set initial appearance failed:",l instanceof Error?l.message:l)}const n=ms[e];for(const l of n?[n]:[]){const{error:d}=await S.rpc("unlock_skill_node",{p_character_id:r,p_node_id:l,p_cost:0});d&&console.error(`starter skill ${l} failed:`,d.message)}return r}async function Ca(o){const{data:{user:e}}=await S.auth.getUser();if(!e)return!1;const{error:s}=await S.rpc("delete_character",{p_user_id:e.id,p_character_id:o});return s?(console.error("delete_character failed:",s.message),!1):!0}async function Es(o,e){const{error:s}=await S.rpc("update_appearance",{p_character_id:o,p_appearance:e});if(s)throw s}function Ht(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}class _a{constructor(e,s){c(this,"el");this.cb=s,this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);z-index:200;font-family:"VT323",monospace;color:var(--px-text)',e.appendChild(this.el),this.checkSession()}async checkSession(){const{data:{session:e}}=await S.auth.getSession();if(e){const{data:s}=await S.from("profiles").select("username").eq("user_id",e.user.id).single();if(s){this.cb.onAuthed(s.username,e.access_token);return}}this.showLogin()}showLogin(e=""){var s,t;this.el.innerHTML=`
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
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${Ht(e)}</p>`:""}
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
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${Ht(e)}</p>`:""}
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
    `,this.el.querySelector("#auth-submit").addEventListener("click",()=>this.handleRegister()),this.el.querySelector("#auth-back").addEventListener("click",()=>this.showLogin())}async handleSignIn(){const e=this.el.querySelector("#auth-email").value.trim(),s=this.el.querySelector("#auth-password").value,{data:t,error:i}=await S.auth.signInWithPassword({email:e,password:s});if(i||!t.session){this.showLogin((i==null?void 0:i.message)??"Sign in failed");return}const{data:a}=await S.from("profiles").select("username").eq("user_id",t.user.id).single();this.cb.onAuthed((a==null?void 0:a.username)??e,t.session.access_token)}async handleRegister(){const e=this.el.querySelector("#auth-username").value.trim(),s=this.el.querySelector("#auth-email").value.trim(),t=this.el.querySelector("#auth-password").value;if(!e){this.showRegister("Username is required");return}const{data:i,error:a}=await S.auth.signUp({email:s,password:t,options:{data:{username:e}}});if(a||!i.session){this.showRegister((a==null?void 0:a.message)??"Registration failed");return}this.cb.onAuthed(e,i.session.access_token)}hide(){this.el.style.display="none"}show(){this.el.style.display="flex"}}const Ta={"fire.fireball":"fa-fire","fire.volatile_ember":"fa-circle-dot","fire.seeking_flame":"fa-crosshairs","fire.hellfire":"fa-skull","fire.pyroclasm":"fa-code-fork","fire.fire_wall":"fa-fire-flame-simple","fire.enduring_flames":"fa-hourglass-half","fire.searing_heat":"fa-temperature-high","fire.inferno_expanse":"fa-expand","fire.meteor":"fa-meteor","fire.molten_impact":"fa-burst","fire.blind_strike":"fa-eye-slash","fire.cataclysm":"fa-up-right-and-down-left-from-center","utility.teleport":"fa-wand-magic","utility.phase_shift":"fa-maximize","utility.ethereal_form":"fa-ghost","utility.phantom_step":"fa-person-running","archer.power_shot":"fa-bullseye","archer.guided":"fa-location-arrow","archer.multishot":"fa-arrows-split-up-and-left","archer.homing":"fa-crosshairs","archer.barrage":"fa-burst","archer.rain_of_arrows":"fa-cloud-rain","archer.sustained_rain":"fa-hourglass-half","archer.piercing_rain":"fa-bolt","archer.wide_rain":"fa-up-right-and-down-left-from-center","archer.burn":"fa-fire","archer.freeze":"fa-snowflake","archer.poison":"fa-skull-crossbones","archer_utility.evade":"fa-person-running","archer_utility.combat_roll":"fa-person-falling","archer_utility.shadowstep":"fa-ghost","archer_utility.acrobatics":"fa-tornado"};function W(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const Ea={"fire.fireball":{x:50,y:0},"fire.volatile_ember":{x:30,y:90},"fire.seeking_flame":{x:70,y:90},"fire.hellfire":{x:30,y:180},"fire.pyroclasm":{x:70,y:180},"fire.fire_wall":{x:50,y:270},"fire.enduring_flames":{x:20,y:360},"fire.searing_heat":{x:50,y:360},"fire.inferno_expanse":{x:80,y:360},"fire.meteor":{x:50,y:450},"fire.molten_impact":{x:20,y:540},"fire.blind_strike":{x:50,y:540},"fire.cataclysm":{x:80,y:540}},Pa={"utility.teleport":{x:50,y:0},"utility.phase_shift":{x:30,y:90},"utility.ethereal_form":{x:70,y:90},"utility.phantom_step":{x:50,y:180}},Aa={"archer.power_shot":{x:50,y:0},"archer.guided":{x:30,y:90},"archer.multishot":{x:70,y:90},"archer.homing":{x:30,y:180},"archer.barrage":{x:70,y:180},"archer.rain_of_arrows":{x:50,y:270},"archer.sustained_rain":{x:20,y:360},"archer.piercing_rain":{x:50,y:360},"archer.wide_rain":{x:80,y:360},"archer.burn":{x:25,y:450},"archer.freeze":{x:50,y:450},"archer.poison":{x:75,y:450}},La={"archer_utility.evade":{x:50,y:0},"archer_utility.combat_roll":{x:30,y:90},"archer_utility.shadowstep":{x:70,y:90},"archer_utility.acrobatics":{x:50,y:180}},Ra=`
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
`;class za{constructor(e){c(this,"el");c(this,"ranks",new Map);c(this,"characterId",null);c(this,"skillPoints",0);c(this,"charName","");c(this,"charClass","");c(this,"closeResolver",null);const s=document.createElement("style");s.textContent=Ra,document.head.appendChild(s),this.el=document.createElement("div"),this.el.className="st-overlay",e.appendChild(this.el)}async show(e){this.characterId=e??null,this.el.style.display="block",await this.reload(),await new Promise(s=>{this.closeResolver=s})}hide(){var e;this.el.style.display="none",(e=this.closeResolver)==null||e.call(this),this.closeResolver=null}async reload(){if(!this.characterId)return;const{data:e}=await S.from("characters").select("skill_points_available, name, class").eq("id",this.characterId).single();this.skillPoints=(e==null?void 0:e.skill_points_available)??0,this.charName=(e==null?void 0:e.name)??"Unknown",this.charClass=(e==null?void 0:e.class)??"mage";const{data:s}=await S.from("skill_unlocks").select("node_id, rank").eq("character_id",this.characterId);this.ranks=new Map((s??[]).map(t=>[t.node_id,t.rank??1])),this.charClass==="amazon"?this.ranks.has("archer.power_shot")||(await S.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"archer.power_shot",p_cost:0}),this.ranks.set("archer.power_shot",1)):this.ranks.has("fire.fireball")||(await S.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"fire.fireball",p_cost:0}),this.ranks.set("fire.fireball",1)),this.render()}render(){const e=this.skillPoints,s=this.charClass==="amazon",t=ve.filter(d=>d.tree===(s?"archer":"fire")),i=ve.filter(d=>d.tree===(s?"archer_utility":"utility")),a=s?Aa:Ea,r=s?La:Pa,n=s?"Archer":"Fire",l=s?"520px":"600px";this.el.innerHTML=`
      <div class="st-vignette"></div>
      <div class="st-ui">
        <div class="st-header">
          <div>
            <div class="st-title px-title">${W(this.charName)} — ${W(this.charClass)} Skills</div>
            <div class="st-points px-label">Points Available: <b>${e}</b></div>
          </div>
          <div class="st-header-buttons">
            <button id="st-respec" class="st-btn px-btn">Reset Skills</button>
            <button id="st-close" class="st-btn px-btn">Back to Lobby</button>
          </div>
        </div>

        <div class="st-tree-label">${n}</div>
        <div class="st-tree-container" style="height:${l}">
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
    `,this.el.querySelector("#st-close").addEventListener("click",()=>this.hide()),this.el.querySelector("#st-respec").addEventListener("click",()=>this.handleRespec()),this.drawConnections("st-main-svg",a,t,e),this.drawConnections("st-util-svg",r,i,e),this.attachNodeListeners(e)}renderRing(e,s,t){if(!ne(e)||s===0)return"";const i=e.stackable.softCap,a=Math.max(i+3,s),r=(t-4)/2,n=2*Math.PI*r,l=n/a,d=2;let h="";for(let p=0;p<s;p++){const f=n-p*l,m=l-d,u=p<i?"#e86020":"#ddb84a";h+=`<circle cx="${t/2}" cy="${t/2}" r="${r}"
        stroke="${u}" stroke-width="2.5" stroke-opacity="0.85"
        stroke-dasharray="${m} ${n-m}"
        stroke-dashoffset="${f}"
        transform="rotate(-90 ${t/2} ${t/2})"/>`}return`<svg class="st-ring" viewBox="0 0 ${t} ${t}">${h}</svg>`}renderNode(e,s,t){if(!t)return"";const i=this.ranks.get(e.id)??0,a=i>0,r=!a&&ge(e.id,this.ranks)&&s>=e.cost;a&&ne(e)&&s>=Ze(e,i);const n=a?"st-node-owned":r?"st-node-purchasable":"st-node-locked",l=e.isSpell?"st-node-is-spell":"",d=e.isSpell?"st-node-spell":"st-node-mod",h=Ta[e.id]??"fa-star",p=a?"owned":r?"purchasable":"locked";let f;a&&ne(e)?f=`Rank ${i}`:a?f="Owned":f=`${e.cost} pt${e.cost>1?"s":""}`;const m=e.isSpell?58:44,u=this.renderRing(e,i,m),x=ne(e)&&i>0?`<span class="st-node-rank">${i}</span>`:"";return`<div class="st-node ${n} ${l}" data-id="${e.id}" data-state="${p}"
      style="left:${t.x}%;top:${t.y}px;">
      <div class="st-node-circle ${d}" style="position:relative;">
        ${u}
        <i class="fa ${h} fa-fw st-node-icon" style="font-size:${e.isSpell?"1.25rem":"1.05rem"}"></i>
        ${x}
      </div>
      <div class="st-node-name">${W(e.name)}</div>
      <div class="st-node-cost">${f}</div>
    </div>`}drawConnections(e,s,t,i){const a=this.el.querySelector(`#${e}`);if(!a)return;let r="";for(const n of t){const l=nt[n.id];if(!l)continue;const d=s[n.id];if(!d)continue;const h=this.ranks.has(n.id),p=!h&&ge(n.id,this.ranks)&&i>=n.cost,f=h?"#e86020":p?"#c8860a":"#333",m=h?.6:p?.4:.3;if(l.requiresAll)for(const u of l.requiresAll){const x=s[u];x&&(r+=`<line x1="${x.x}%" y1="${x.y+30}" x2="${d.x}%" y2="${d.y}" stroke="${f}" stroke-opacity="${m}" stroke-width="2"/>`)}if(l.requiresAny)for(const u of l.requiresAny){const x=s[u];x&&(r+=`<line x1="${x.x}%" y1="${x.y+30}" x2="${d.x}%" y2="${d.y}" stroke="${f}" stroke-opacity="${m}" stroke-width="1.5" stroke-dasharray="4,3"/>`)}}a.innerHTML=r}attachNodeListeners(e){const s=this.el.querySelector("#st-tooltip");this.el.querySelectorAll(".st-node").forEach(t=>{const i=t.getAttribute("data-id"),a=ve.find(r=>r.id===i);t.addEventListener("mouseenter",r=>{const n=this.ranks.get(i)??0,l=n>0,d=!l&&ge(i,this.ranks)&&e>=a.cost,h=nt[i],p=(h==null?void 0:h.mutuallyExclusive)&&h.mutuallyExclusive.some(_=>this.ranks.has(_)),f=!l&&!ge(i,this.ranks);let m="",u="";if(p)m='<span style="color:var(--px-danger)">Locked (requires respec to change element)</span>';else if(l&&ne(a)){const _=a.stackable.softCap,E=Ze(a,n),w=n>=_;u=`<span style="color:var(--px-text)">Rank ${n} / ${_}</span><br>`,e>=E?m=`<span style="color:var(--px-accent)">Next rank: ${E} pt${E>1?"s":""}${w?" (past cap)":""}</span>`:m='<span style="color:var(--px-danger)">Not enough points for next rank</span>'}else if(l)m='<span style="color:var(--px-success)">Owned</span>';else if(f){const _=[];if(h!=null&&h.requiresAll){for(const E of h.requiresAll)if(!this.ranks.has(E)){const w=ve.find(K=>K.id===E);w&&_.push(w.name)}}if(h!=null&&h.requiresAny&&!h.requiresAny.some(w=>this.ranks.has(w))){const w=h.requiresAny.map(K=>{var vt;return(vt=ve.find(Rs=>Rs.id===K))==null?void 0:vt.name}).filter(Boolean);_.push(`one of: ${w.join(", ")}`)}m=`<span style="color:var(--px-danger)">Requires: ${W(_.join(", "))}</span>`}else d?m='<span style="color:var(--px-success)">Click to unlock</span>':m='<span style="color:var(--px-danger)">Not enough points</span>';const x=l?"":`<span style="color:var(--px-border-light)">Cost: ${a.cost} pt${a.cost>1?"s":""}</span><br>`;s.innerHTML=`
          <strong style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--px-accent)">${W(a.name)}</strong><br>
          <span style="color:var(--px-text)">${W(a.description)}</span><br>
          ${u}${x}${m}
        `,s.style.display="block";const C=r;s.style.left=`${C.clientX+14}px`,s.style.top=`${C.clientY-10}px`}),t.addEventListener("mousemove",r=>{const n=r;s.style.left=`${n.clientX+14}px`,s.style.top=`${n.clientY-10}px`}),t.addEventListener("mouseleave",()=>{s.style.display="none"}),t.addEventListener("click",()=>{const r=this.ranks.get(i)??0;if(!(r>0))ge(i,this.ranks)&&e>=a.cost&&this.handleUnlock(i,a.cost);else if(ne(a)){const l=Ze(a,r);e>=l&&this.handleRankUp(i,a,r,l)}})})}async handleUnlock(e,s){if(!this.characterId)return;const{error:t}=await S.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:s});if(t){console.error("Unlock failed:",t.message);return}await this.reload()}handleRankUp(e,s,t,i){const a=s.stackable.softCap,n=t>=a?" (past soft cap)":"";this.showConfirm("Rank Up",`${W(s.name)}: Rank ${t} → ${t+1}${n}
Cost: ${i} pt${i>1?"s":""}`,async()=>{if(!this.characterId)return;const{error:l}=await S.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:i});if(l){console.error("Rank up failed:",l.message);return}await this.reload()})}handleRespec(){this.showConfirm("Reset Skills","All unlocked skills will be removed and points refunded. Are you sure?",async()=>{if(!this.characterId)return;const{error:e}=await S.rpc("respec_skills",{p_character_id:this.characterId});if(e){console.error("Respec failed:",e.message);return}await this.reload()})}showConfirm(e,s,t){const i=document.createElement("div");i.className="st-confirm-overlay",i.innerHTML=`
      <div class="st-confirm-panel px-panel">
        <div class="st-confirm-title px-title">${W(e)}</div>
        <div class="st-confirm-text">${W(s)}</div>
        <div class="st-confirm-buttons">
          <button class="st-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="st-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".st-confirm-yes").addEventListener("click",()=>{i.remove(),t()}),i.querySelector(".st-confirm-no").addEventListener("click",()=>i.remove())}}const tt=[{key:"body",label:"Body",options:P.body},{key:"skin",label:"Skin",options:P.skin},{key:"hairStyle",label:"Hair Style",options:P.hairStyle},{key:"hairColor",label:"Hair Color",options:P.hairColor},{key:"torsoColor",label:"Shirt Color",options:P.torsoColor},{key:"legsColor",label:"Pants Color",options:P.legsColor}],Ia=2;function Oa(o,e,s){return(e+s+o)%o}function st(o){return o===null?"None":o.split("_").map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}const Fa=`
.ap-picker{display:flex;gap:20px;align-items:flex-start;}
.ap-left{flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;}
.ap-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ap-row-label{flex:0 0 auto;white-space:nowrap;}
.ap-row-control{display:flex;align-items:center;gap:6px;}
.ap-btn{padding:4px 8px;font-size:10px;}
.ap-value{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);min-width:96px;text-align:center;}
.ap-randomize{margin-top:4px;}
.ap-right{flex:0 0 auto;display:flex;align-items:center;justify-content:center;}
.ap-canvas{width:128px;height:128px;image-rendering:pixelated;background:#120e1c;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
`;let jt=!1;function $a(){if(jt)return;jt=!0;const o=document.createElement("style");o.textContent=Fa,document.head.appendChild(o)}class it{constructor(e,s,t){c(this,"onChange");c(this,"appearance");c(this,"el");c(this,"canvas");c(this,"ctx");c(this,"valueEls",new Map);c(this,"composite",null);c(this,"requestId",0);c(this,"rafId",null);c(this,"animStart",null);c(this,"disposed",!1);c(this,"loop",e=>{var n;this.rafId=requestAnimationFrame(this.loop);const s=(n=this.composite)==null?void 0:n.walk;if(!s)return;this.animStart===null&&(this.animStart=e);const t=(e-this.animStart)/1e3,i=$e("walk",t,!0),{sx:a,sy:r}=Fe("walk",Ia,i);this.ctx.clearRect(0,0,k,k),this.ctx.drawImage(s.image,a,r,k,k,0,0,k,k)});this.charClass=s,$a(),this.appearance=t?{...t}:{...Ye[s]},this.el=document.createElement("div"),this.el.className="ap-picker",e.appendChild(this.el);const i=document.createElement("div");i.className="ap-left",this.el.appendChild(i);for(const n of tt){const l=document.createElement("div");l.className="ap-row",l.innerHTML=`
        <div class="ap-row-label px-label">${n.label}</div>
        <div class="ap-row-control">
          <button type="button" class="ap-btn px-btn ap-prev">◀</button>
          <span class="ap-value">${st(this.appearance[n.key])}</span>
          <button type="button" class="ap-btn px-btn ap-next">▶</button>
        </div>`;const d=l.querySelector(".ap-prev"),h=l.querySelector(".ap-next"),p=l.querySelector(".ap-value");this.valueEls.set(n.key,p),d.addEventListener("click",()=>this.cycle(n.key,-1)),h.addEventListener("click",()=>this.cycle(n.key,1)),i.appendChild(l)}const a=document.createElement("button");a.type="button",a.className="ap-randomize px-btn",a.textContent="⚄ Randomize",a.addEventListener("click",()=>this.randomize()),i.appendChild(a);const r=document.createElement("div");r.className="ap-right",this.canvas=document.createElement("canvas"),this.canvas.className="ap-canvas",this.canvas.width=k,this.canvas.height=k,this.ctx=this.canvas.getContext("2d"),r.appendChild(this.canvas),this.el.appendChild(r),this.recomposite(),this.rafId=requestAnimationFrame(this.loop)}getAppearance(){return{...this.appearance}}dispose(){this.disposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.composite&&(Ne(this.composite),this.composite=null),this.el.remove()}cycle(e,s){var n;const t=tt.find(l=>l.key===e),i=t.options.indexOf(this.appearance[e]),a=Oa(t.options.length,i===-1?0:i,s),r=t.options[a];this.appearance={...this.appearance,[e]:r},this.valueEls.get(e).textContent=st(r),this.recomposite(),(n=this.onChange)==null||n.call(this,this.getAppearance())}randomize(){var e;this.appearance=Ai(this.charClass);for(const s of tt)this.valueEls.get(s.key).textContent=st(this.appearance[s.key]);this.recomposite(),(e=this.onChange)==null||e.call(this,this.getAppearance())}recomposite(){const e=++this.requestId;this.composite&&(Ne(this.composite),this.composite=null),this.animStart=null,xs(this.appearance).then(s=>{if(this.disposed||e!==this.requestId){Ne(s);return}this.composite=s,this.animStart=null})}}function de(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Gt={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',amazon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'},Na=`
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
.cs-btn-look{padding:8px 10px;font-size:8px;}
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
.cs-appearance-wrap{margin-bottom:20px;}
.cs-btn-create{width:100%;}
.cs-btn-cancel{width:100%;margin-top:8px;}
.cs-error{color:var(--px-danger);font-size:16px;margin-bottom:12px;text-align:center;}
.cs-error[hidden]{display:none;}
.cs-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.cs-confirm-panel{padding:28px 32px;max-width:380px;text-align:center;}
.cs-edit-look-panel{padding:28px 32px;max-width:520px;text-align:center;}
.cs-confirm-title{color:var(--px-danger);font-size:11px;margin-bottom:12px;}
.cs-confirm-text{font-size:16px;color:var(--px-text);margin-bottom:16px;line-height:1.6;}
.cs-confirm-input{width:100%;margin-bottom:16px;}
.cs-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.cs-confirm-buttons button:disabled{opacity:0.5;cursor:not-allowed;}
.cs-confirm-delete{padding:9px 24px;background:var(--px-danger);color:#fff;opacity:0.4;pointer-events:none;}
.cs-confirm-delete.enabled{opacity:1;pointer-events:auto;}
.cs-confirm-cancel{padding:9px 24px;}
.cs-btn-logout{position:absolute;top:24px;right:24px;padding:6px 12px;}
.cs-btn-logout:hover{color:var(--px-danger);}
`;class qa{constructor(e,s){c(this,"el");c(this,"ui");c(this,"characters",[]);c(this,"showingCreate",!1);c(this,"activePicker",null);this.cb=s;const t=document.createElement("style");t.textContent=Na,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="cs-overlay",this.ui=document.createElement("div"),this.ui.className="cs-ui",this.el.appendChild(this.ui),e.appendChild(this.el)}async show(){this.el.style.display="block",this.showingCreate=!1,this.characters=await qe(),this.render()}hide(){this.el.style.display="none"}render(){var i;if(this.showingCreate){this.renderCreateForm();return}(i=this.activePicker)==null||i.dispose(),this.activePicker=null;const e=this.characters.map((a,r)=>{const n=_i(a.level),l=n>0?Math.min(100,a.xp/n*100):0;return`
        <div class="cs-slot px-panel" data-index="${r}">
          <div class="cs-char-name px-title" style="font-size:12px">${de(a.name)}</div>
          <div class="cs-char-class px-label">${Gt[a.class]??""} ${de(a.class)}</div>
          <div class="cs-char-level">Level ${a.level}</div>
          <div class="cs-xp-bar"><div class="cs-xp-fill" style="width:${l}%"></div></div>
          <div class="cs-xp-text">${a.xp} / ${n} XP</div>
          <div class="cs-slot-actions">
            <button class="cs-btn-select px-btn px-btn-primary" data-index="${r}">Select</button>
            <button class="cs-btn-look px-btn" data-index="${r}">Edit Look</button>
            <button class="cs-btn-delete px-btn" data-index="${r}">Delete</button>
          </div>
        </div>`}).join(""),s=Math.max(0,Ci-this.characters.length),t=Array.from({length:s},()=>`
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
      </div>`,this.ui.querySelector("#cs-logout").addEventListener("click",()=>this.cb.onLogout()),this.ui.querySelectorAll(".cs-btn-select").forEach(a=>{a.addEventListener("click",r=>{r.stopPropagation();const n=parseInt(a.dataset.index);this.cb.onSelectCharacter(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-look").forEach(a=>{a.addEventListener("click",r=>{r.stopPropagation();const n=parseInt(a.dataset.index);this.showEditLook(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-delete").forEach(a=>{a.addEventListener("click",r=>{r.stopPropagation();const n=parseInt(a.dataset.index);this.showDeleteConfirm(this.characters[n])})}),this.ui.querySelectorAll('[data-action="create"]').forEach(a=>{a.addEventListener("click",()=>{this.showingCreate=!0,this.render()})})}renderCreateForm(e="",s){var r;(r=this.activePicker)==null||r.dispose(),this.activePicker=null;const t=(s==null?void 0:s.selectedClass)??"mage",i=Pt.map(n=>{const l=n.id===t?"active":"",d=n.enabled?"":"disabled";return`<div class="cs-class-option ${l} ${d}" data-class="${n.id}">${Gt[n.id]??""} ${de(n.label)}</div>`}).join("");this.ui.innerHTML=`
      <div class="cs-title px-title" style="font-size:24px">Blood Moor</div>
      <div class="cs-subtitle px-label">Create a New Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-create-panel px-panel">
        ${e?`<div class="cs-error">${de(e)}</div>`:""}
        <div class="cs-label px-label">Character Name</div>
        <input id="cs-name" class="cs-input px-input" type="text" placeholder="Name your champion..." maxlength="20">
        <div class="cs-label px-label">Class</div>
        <div class="cs-class-grid">${i}</div>
        <div class="cs-label px-label">Appearance</div>
        <div id="cs-appearance" class="cs-appearance-wrap"></div>
        <button id="cs-create-btn" class="cs-btn-create px-btn px-btn-primary">Forge Champion</button>
        <button id="cs-cancel-btn" class="cs-btn-cancel px-btn">Cancel</button>
      </div>`;let a=t;this.activePicker=new it(this.ui.querySelector("#cs-appearance"),a,s==null?void 0:s.appearance),this.ui.querySelectorAll(".cs-class-option").forEach(n=>{n.addEventListener("click",()=>{var h;const l=n.dataset.class,d=Pt.find(p=>p.id===l);!(d!=null&&d.enabled)||l===a||(this.ui.querySelectorAll(".cs-class-option").forEach(p=>p.classList.remove("active")),n.classList.add("active"),a=l,(h=this.activePicker)==null||h.dispose(),this.activePicker=new it(this.ui.querySelector("#cs-appearance"),a))})}),this.ui.querySelector("#cs-create-btn").addEventListener("click",async()=>{const n=this.ui.querySelector("#cs-name").value.trim(),l={selectedClass:a,appearance:this.activePicker.getAppearance()};if(!n){this.renderCreateForm("Name is required",l);return}if(n.length>20){this.renderCreateForm("Name must be 20 characters or less",l);return}const d=Lt(l.appearance);if(!await Sa(n,a,d)){this.renderCreateForm("Failed to create character. Name may already be taken.",l);return}this.showingCreate=!1,this.characters=await qe(),this.render()}),this.ui.querySelector("#cs-cancel-btn").addEventListener("click",()=>{this.showingCreate=!1,this.render()})}showDeleteConfirm(e){const s=document.createElement("div");s.className="cs-confirm-overlay",s.innerHTML=`
      <div class="cs-confirm-panel px-panel">
        <div class="cs-confirm-title px-title">Delete Character</div>
        <div class="cs-confirm-text">
          This will permanently delete <strong style="color:var(--px-accent)">${de(e.name)}</strong>
          and all their progress.<br><br>
          Type the character's name to confirm:
        </div>
        <input class="cs-confirm-input px-input" id="cs-delete-input" type="text" placeholder="${de(e.name)}">
        <div class="cs-confirm-buttons">
          <button class="cs-confirm-delete px-btn" id="cs-delete-confirm">Delete Forever</button>
          <button class="cs-confirm-cancel px-btn" id="cs-delete-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(s);const t=s.querySelector("#cs-delete-input"),i=s.querySelector("#cs-delete-confirm"),a=s.querySelector("#cs-delete-cancel");t.addEventListener("input",()=>{t.value===e.name?i.classList.add("enabled"):i.classList.remove("enabled")}),i.addEventListener("click",async()=>{if(t.value!==e.name)return;const r=await Ca(e.id);s.remove(),r&&(this.characters=await qe(),this.render())}),a.addEventListener("click",()=>s.remove())}showEditLook(e){const s=document.createElement("div");s.className="cs-confirm-overlay",s.innerHTML=`
      <div class="cs-edit-look-panel px-panel">
        <div class="cs-confirm-title px-title">Edit Look</div>
        <div class="cs-error" hidden></div>
        <div id="cs-edit-look-picker"></div>
        <div class="cs-confirm-buttons" style="margin-top:16px">
          <button class="px-btn px-btn-primary" id="cs-look-save">Save</button>
          <button class="px-btn" id="cs-look-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(s);const t=new it(s.querySelector("#cs-edit-look-picker"),e.class,Li(e.appearance,e.class)),i=s.querySelector(".cs-error"),a=s.querySelector("#cs-look-save"),r=s.querySelector("#cs-look-cancel"),n=()=>{t.dispose(),s.remove()};r.addEventListener("click",n),a.addEventListener("click",async()=>{i.hidden=!0,a.disabled=!0,r.disabled=!0;const l=Lt(t.getAppearance());try{await Es(e.id,l),e.appearance=l,n(),this.render()}catch(d){console.error("update_appearance failed:",d instanceof Error?d.message:d),i.textContent="Failed to save look. Please try again.",i.hidden=!1,a.disabled=!1,r.disabled=!1}})}}function Yt(o,e=64,s=8){const t=o.image,i=document.createElement("canvas");i.width=e,i.height=e;const a=i.getContext("2d");a.imageSmoothingEnabled=!0,a.drawImage(t,0,0,e,e);const r=a.getImageData(0,0,e,e);mi(r.data,s),a.putImageData(r,0,0);const n=new mt(i);return n.colorSpace=o.colorSpace,n.wrapS=n.wrapT=rs,n.magFilter=J,n.minFilter=ls,o.dispose(),n}function Xt(o){return o.magFilter=J,o.minFilter=ls,o}class Ba{static async load(){const e=new ei,s=(d,h)=>new Promise((p,f)=>e.load(d,m=>{m.colorSpace=h,p(m)},void 0,f)),t=je,i=ti,[a,r,n,l]=await Promise.all([s("/assets/textures/cobblestone/diffuse.jpg",t),s("/assets/textures/castle_stone/diffuse.jpg",t),s("/assets/textures/castle_stone/normal.jpg",i),s("/assets/textures/castle_stone/roughness.jpg",i)]);return{textures:{floor:{map:Yt(a,64,12)},stone:{map:Yt(r),normalMap:Xt(n),roughnessMap:Xt(l)}}}}}class Da{constructor(e){c(this,"el");c(this,"hidden",!1);this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);z-index:300;font-family:"VT323",monospace;transition:opacity 0.6s ease;',this.el.innerHTML=`
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
    `,e.appendChild(this.el)}hide(){return this.hidden?Promise.resolve():(this.hidden=!0,new Promise(e=>{this.el.addEventListener("transitionend",()=>{this.el.remove(),e()},{once:!0}),this.el.style.opacity="0"}))}}const Ua=`
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
`;function Ha(){if(document.getElementById("px-theme"))return;const o=document.createElement("style");o.id="px-theme",o.textContent=Ua,document.head.appendChild(o)}class ja{constructor(e){c(this,"el");this.el=document.createElement("div"),this.el.style.cssText="position:fixed;inset:0;z-index:500;display:none;background:rgba(14,11,22,0.9);overflow-y:auto;",this.el.innerHTML=`
      <div class="px-panel" style="max-width:640px;margin:48px auto;padding:24px">
        <div class="px-title" style="margin-bottom:12px">Art Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Character sprites are from the <b>Liberated Pixel Cup</b> collection
          (lpc.opengameart.org), licensed CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.
        </div>
        <pre id="credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <button id="credits-close" class="px-btn" style="margin-top:16px">Close</button>
      </div>`,e.appendChild(this.el),this.el.querySelector("#credits-close").addEventListener("click",()=>this.hide())}async show(){this.el.style.display="block";const e=this.el.querySelector("#credits-body");if(!e.textContent)try{const s=await fetch("/assets/lpc/CREDITS.filtered.csv");if(!s.ok)throw new Error(`credits fetch failed: ${s.status}`);e.textContent=Ya(await s.text())}catch{e.textContent="Credits file missing — see client/public/assets/lpc/CREDITS.csv"}}hide(){this.el.style.display="none"}}function Ga(o){const e=[];let s="",t=!1;for(let i=0;i<o.length;i++){const a=o[i];t?a==='"'?o[i+1]==='"'?(s+='"',i++):t=!1:s+=a:a==='"'?t=!0:a===","?(e.push(s),s=""):s+=a}return e.push(s),e}function Ya(o){return o.split(`
`).filter(s=>s.trim().length>0).slice(1).map(Ga).map(([s,,t,i])=>`${s} — ${t==null?void 0:t.trim()} (${i==null?void 0:i.trim()})`).join(`

`)}Ha();const Xa=document.getElementById("canvas-container"),Y=document.getElementById("ui-overlay"),Wt=new Da(Y),Wa=new ja(Y),H=new bi(Xa),X=new ga(Y);X.hide();const ae=new ra,Pe=new Set,v=new ma;let y="",$="",R={},Z=new Map,z=null,q=null,j={},I="1v1",he,Ae=!1,se=null,He=[],G=new Set,N=null,oe="",g=null,re=new Set,Ps="none";function Va(o){return o.has("archer.burn")?"burn":o.has("archer.freeze")?"freeze":o.has("archer.poison")?"poison":"none"}function Za(o){const e=new Set;for(const s of Ge)o.has(s.node)&&e.add(s.spell);return e}let As=0;async function Ls(o,e){var r;const{data:s}=await S.from("skill_unlocks").select("node_id, rank").eq("character_id",o),t=s??[],i=new Set(t.map(n=>n.node_id)),a=ms[e];a&&i.add(a),re=Za(i),Ps=Va(i),As=((r=t.find(n=>n.node_id==="utility.phase_shift"))==null?void 0:r.rank)??0,X.buildSpellSlots(re)}const Vt={0:13148160,1:12582960,2:32960,3:41024};let Zt,Te="";const Ka=new za(Y),Le=new qa(Y,{onSelectCharacter:async o=>{g=o,await Ls(o.id,o.class),Le.hide(),b.show(),b.showHome(o.name,o.skill_points_available,o.class,o.level)},onLogout:async()=>{try{await S.auth.signOut()}catch{}fe(),oe="",g=null,Ae=!1,y="",$="",R={},j={},I="1v1",he=void 0,re=new Set,se=null,v.disconnect(),b.hide(),Le.hide(),gt.show()}});Le.hide();const gt=new _a(Y,{onAuthed:async(o,e)=>{oe=e,gt.hide(),await pt,Wt.hide();const s=await Qa(e);if(s){await Ja(s,o,void 0);return}await Le.show()},onShowLogin:async()=>{await pt,Wt.hide()}});async function Qa(o){try{const e=await fetch("/paused-match",{method:"POST",headers:{Authorization:`Bearer ${o}`}});if(!e.ok)return null;const{roomId:s}=await e.json();return s}catch{return null}}async function Ja(o,e,s){try{await pt}catch{return}Te=e,$=o,ct(),v.connect(),v.onRejoinAccepted(t=>{y=t.yourId,t.colorIndex,R=t.players,j={...t.players},X.init(y),b.hide()}),v.onRejoinFailed(()=>{$="",y="",b.show(),b.showHome(e,s)}),v.rejoinRoom(o,oe)}const b=new wa(Y,{onCreateRoom:async(o,e)=>{Te=o,I=e;const s=await fetch("/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:e})}),{roomId:t}=await s.json();v.connect(),v.joinRoom(t,o,oe,void 0,g==null?void 0:g.id),v.onRoomJoined(({yourId:i,mode:a,teams:r,readyPlayerIds:n})=>{y=i,$=t,R={[i]:o},I=a??e,he=r==null?void 0:r[i],G=new Set(n??[]),X.init(y),b.showReady(t,R,y,I,G),b.appendSystemMessage("You have entered the lobby")}),ct()},onJoinRoom:(o,e,s)=>{Te=e,v.connect(),v.joinRoom(o,e,oe,s,g==null?void 0:g.id),v.onRoomJoined(({yourId:t,players:i,mode:a,teams:r,readyPlayerIds:n})=>{y=t,$=o,R=i,I=a??"1v1",he=r==null?void 0:r[t],G=new Set(n??[]),Object.keys(i).indexOf(t),X.init(y),j={...i},b.showReady(o,i,t,I,G),b.appendSystemMessage("You have entered the lobby")}),ct()},onReady:()=>v.ready(),onRematch:()=>v.rematch(),onReturnToLobby:()=>{fe(),v.disconnect(),Ae=!1,$="",R={},j={},I="1v1",he=void 0,g?b.showHome(g.name,g.skill_points_available,g.class,g.level):b.showHome(Te)},onSendChatMessage:o=>v.sendChatMessage(o),onLogout:async()=>{try{await S.auth.signOut()}catch{}fe(),oe="",g=null,Ae=!1,y="",$="",R={},j={},I="1v1",he=void 0,re=new Set,se=null,v.disconnect(),b.hide(),gt.show()},onOpenSkills:async()=>{if(!g)return;b.hide(),await Ka.show(g.id);const e=(await qe()).find(t=>t.id===g.id);e&&(g=e);const{data:{user:s}}=await S.auth.getUser();s&&g&&await Ls(g.id,g.class),b.show(),g&&b.showHome(g.name,g.skill_points_available,g.class,g.level)},onSwitchCharacter:async()=>{b.hide(),await Le.show()},onShowCredits:()=>{Wa.show()}});b.hide();function ct(o){if(Ae)return;Ae=!0,v.onChatMessage(({senderId:s,displayName:t,text:i})=>b.appendChatMessage(s,t,i)),v.onPlayerJoined(({id:s,displayName:t})=>{j[s]=t,R[s]=t,b.showReady($,R,y,I,G),b.appendSystemMessage(`${t} has entered the lobby`)}),v.onGameReady(()=>b.showReady($,R,y,I,G)),v.onPlayerReadyAck(({playerId:s})=>{G.add(s),b.showReady($,R,y,I,G)}),v.onRematchRequested(({requesterId:s,countdown:t})=>{const i=s===y;b.showRematchCountdown(t,i)}),v.onGameState(s=>{z||(ae.clear(),Pe.clear(),Kt(),b.hide());const t=performance.now();ae.push(s,t);for(const[i,a]of Object.entries(s.players))a.castingSpell!==null&&Pe.add(i);if(!N&&s.players[y]&&(N=new ha(s.players[y].position)),N&&s.players[y]&&s.ack){const i=s.ack[y];i!==void 0&&N.reconcile(s.players[y].position,i)}});let e=!1;v.onDuelEnded(({winnerId:s,gameMode:t,matchResults:i})=>{e=!0;const a=t??I;let r;a==="2v2"?r=s===he:r=s===y,b.hidePauseOverlay(),fe();const n=i==null?void 0:i[y];if(a==="ffa"&&!r){const l=He.indexOf(y),h=l>=0?4-l:1;b.showResult(r,a,h,n)}else b.showResult(r,a,void 0,n);b.show(),g&&n&&(g={...g,level:n.newLevel||g.level,xp:n.newXp??g.xp})}),v.onRematchReady(()=>{e=!1,ae.clear(),Kt(),b.hide()}),v.onOpponentDisconnected(()=>{e?b.disableRematch():I==="1v1"?(fe(),b.showDisconnected(),b.show()):b.appendSystemMessage("A player disconnected")}),v.onPlayerDisconnected(({playerId:s})=>{const t=j[s]??"A player";b.appendSystemMessage(`${t} disconnected`),delete R[s],b.showReady($,R,y,I,G)}),v.onPlayerLeft(({playerId:s})=>{const t=j[s]??"A player";b.appendSystemMessage(`${t} left the lobby`),delete R[s],delete j[s],b.showReady($,R,y,I,G)}),v.onMatchPaused(({countdown:s})=>{b.showPauseOverlay(s,()=>{v.leavePausedMatch()})}),v.onGameResumed(()=>{b.hidePauseOverlay()}),v.onDisconnect(()=>{z&&$&&(se={roomId:$})}),v.onReconnect(()=>{se&&(v.onRejoinAccepted(s=>{se=null,y=s.yourId,s.colorIndex,R=s.players,j={...j,...s.players},X.init(y),z==null||z.setMyId(y),N=null}),v.onRejoinFailed(()=>{se=null,fe(),b.showDisconnected(),b.show()}),v.rejoinRoom(se.roomId,oe))}),v.onRoomNotFound(()=>{g?b.showHome(g.name,g.skill_points_available,g.class,g.level):b.showHome(Te)})}function Kt(){for(const e of Z.values())e.dispose(Y);Z.clear(),z==null||z.dispose(),q==null||q.dispose(),z=new aa(H.scene,y),z.setArrowElement(Ps),q=new fa(H,H.renderer.domElement),g&&q.setCharacterClass(g.class);const o=re.size>0?re:new Set(Ge.filter(e=>e.charClass===((g==null?void 0:g.class)??"mage")).map(e=>e.spell));X.buildSpellSlots(o),X.show(),b.hide()}function fe(){q==null||q.dispose(),q=null,z==null||z.dispose(),z=null;for(const o of Z.values())o.dispose(Y);Z.clear(),X.hide(),ae.clear(),Pe.clear(),N=null,dt=0,He=[],G=new Set}let Qt=performance.now();const at=1e3/60;let we=0,dt=0;H.startRenderLoop(()=>{const o=performance.now(),e=Math.min((o-Qt)/1e3,.1);if(Qt=o,!q||!z)return;for(we=Math.min(we+e*1e3,100);we>=at;){we-=at;const i=q.buildInputFrame();if(N){const a=ae.getLatest(),r=a==null?void 0:a.players[y],n={};if(a&&r&&((r.slowUntil??0)>a.tick&&r.slowFactor!==void 0&&(n.speedMult=r.slowFactor),i.castSpell===4&&re.has(4)&&o>=dt)){const l=(r.phantomStepUntil??0)>a.tick,d=l||r.mana>=Ue[4].manaCost;(r.cooldowns[4]??0)<=0&&d&&r.hp>0&&(n.teleportTarget={...i.aimTarget},n.teleportRange=ki(As),l||(dt=o+Ue[4].cooldownTicks/ze*1e3))}i.seq=N.applyInput(i.move,o,n)}v.sendInput(i)}const s=we/at,t=ae.getInterpolated(o);if(t){for(const[i,a]of Z)i in t.players||(a.dispose(Y),Z.delete(i));for(const[i,a]of Object.entries(t.players)){if(a.hp<=0&&!He.includes(i)&&He.push(i),!Z.has(i)){const d=Object.keys(t.players).indexOf(i)%Object.keys(Vt).length,h=new Ui(a.charClass,a.appearance,Vt[d],a.displayName,Y);H.scene.add(h.group),Z.set(i,h)}const r=Z.get(i);if(i===y&&N){const l=N.getRenderPosition(s,o),d=q.getCurrentMouseWorld(),h=Math.atan2(d.y-l.y,d.x-l.x);r.setPosition(l.x,l.y,h)}else r.setPosition(a.position.x,a.position.y,a.facing);r.update(e,Pe.has(i)),a.hp<=0&&r.die();const n=(a.invisibleUntil??0)>t.tick&&i!==y;r.setVisible(!n),r.updateLabel(H.camera,H.getCanvasRect())}if(Pe.clear(),N&&t.players[y]){const i=N.getRenderPosition(s,o);H.updateCamera(i.x,i.y,e)}else{const i=t.players[y];i&&H.updateCamera(i.position.x,i.position.y,e)}q.refreshMouseWorld(),z.update(t),X.update(t,q.getActiveSpell())}});const pt=(async()=>{Zt=await Ba.load(),new Ri(Zt.textures).addToScene(H.scene),H.initPostProcessing()})().catch(o=>{throw console.error("Asset load failed:",o),o});document.addEventListener("visibilitychange",()=>{if(document.hidden&&N){const o=ae.getLatest();o!=null&&o.players[y]&&N.reset(o.players[y].position)}});
