var Ci=Object.defineProperty;var Ei=(a,e,t)=>e in a?Ci(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var c=(a,e,t)=>Ei(a,typeof e!="symbol"?e+"":e,t);import{M as z,O as Hs,B as Qe,F as Kt,S as ue,U as dt,V as Z,W as De,H as He,N as Ti,C as Us,a as Ve,b as U,A as js,c as Y,R as Li,d as $i,e as Ai,L as Pi,f as Ri,g as Ii,h as Gs,i as zi,j as qi,k as Oi,P as Fi,l as Ni,m as Bi,n as ut,o as Di,p as Hi,q as Ui,D as ji,r as pe,G as Pe,s as Ws,t as Le,u as Ys,v as Nt,w as Vs,x as Xs,y as Bt,z as Lt,E as Zs,I as Ue,J as vt,K as yt,Q as Gi,T as Wi,X as Dt,Y as $t,Z as Yi,_ as Vi,$ as Ks}from"./three-keT56WUa.js";import{l as Xi,c as Zi}from"./vendor-k1XoXMcf.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const Qs={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class qe{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Ki=new Hs(-1,1,1,-1,0,1);class Qi extends Qe{constructor(){super(),this.setAttribute("position",new Kt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Kt([0,2,0,0,2,0],2))}}const Ji=new Qi;class Ht{constructor(e){this._mesh=new z(Ji,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Ki)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class Js extends qe{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof ue?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=dt.clone(e.uniforms),this.material=new ue({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new Ht(this.material)}render(e,t,s){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=s.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class Qt extends qe{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,s){const i=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,n;this.inverse?(o=0,n=1):(o=1,n=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),r.buffers.stencil.setFunc(i.ALWAYS,o,4294967295),r.buffers.stencil.setClear(n),r.buffers.stencil.setLocked(!0),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(i.EQUAL,1,4294967295),r.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),r.buffers.stencil.setLocked(!0)}}class ea extends qe{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class ta{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const s=e.getSize(new Z);this._width=s.width,this._height=s.height,t=new De(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:He}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new Js(Qs),this.copyPass.material.blending=Ti,this.clock=new Us}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let s=!1;for(let i=0,r=this.passes.length;i<r;i++){const o=this.passes[i];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,s),o.needsSwap){if(s){const n=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}Qt!==void 0&&(o instanceof Qt?s=!0:o instanceof ea&&(s=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new Z);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const s=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(s,i),this.renderTarget2.setSize(s,i);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(s,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class sa extends qe{constructor(e,t,s=null,i=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=s,this.clearColor=i,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ve}render(e,t,s){const i=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:s),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=i}}const ia={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ve(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class Ie extends qe{constructor(e,t,s,i){super(),this.strength=t!==void 0?t:1,this.radius=s,this.threshold=i,this.resolution=e!==void 0?new Z(e.x,e.y):new Z(256,256),this.clearColor=new Ve(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new De(r,o,{type:He}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let h=0;h<this.nMips;h++){const f=new De(r,o,{type:He});f.texture.name="UnrealBloomPass.h"+h,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const u=new De(r,o,{type:He});u.texture.name="UnrealBloomPass.v"+h,u.texture.generateMipmaps=!1,this.renderTargetsVertical.push(u),r=Math.round(r/2),o=Math.round(o/2)}const n=ia;this.highPassUniforms=dt.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new ue({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let h=0;h<this.nMips;h++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[h])),this.separableBlurMaterials[h].uniforms.invSize.value=new Z(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const d=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=d,this.bloomTintColors=[new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const p=Qs;this.copyUniforms=dt.clone(p.uniforms),this.blendMaterial=new ue({uniforms:this.copyUniforms,vertexShader:p.vertexShader,fragmentShader:p.fragmentShader,blending:js,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ve,this.oldClearAlpha=1,this.basic=new Y,this.fsQuad=new Ht(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let s=Math.round(e/2),i=Math.round(t/2);this.renderTargetBright.setSize(s,i);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(s,i),this.renderTargetsVertical[r].setSize(s,i),this.separableBlurMaterials[r].uniforms.invSize.value=new Z(1/s,1/i),s=Math.round(s/2),i=Math.round(i/2)}render(e,t,s,i,r){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=s.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=s.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let n=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[l].uniforms.direction.value=Ie.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Ie.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),n=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const t=[];for(let s=0;s<e;s++)t.push(.39894*Math.exp(-.5*s*s/(e*e))/e);return new ue({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new Z(.5,.5)},direction:{value:new Z(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}getCompositeMaterial(e){return new ue({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}Ie.BlurDirectionX=new Z(1,0);Ie.BlurDirectionY=new Z(0,1);const aa={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class ra extends qe{constructor(){super();const e=aa;this.uniforms=dt.clone(e.uniforms),this.material=new Li({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new Ht(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,s){this.uniforms.tDiffuse.value=s.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},$i.getTransfer(this._outputColorSpace)===Ai&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Pi?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Ri?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Ii?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Gs?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===zi?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===qi&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const ei=360,re=380;function Jt(a,e,t=ei){const s=Math.max(1,t);return{width:Math.max(1,Math.round(a/Math.max(1,e)*s)),height:s}}function Ut(a=ei){return 2*re/a}function pt(a,e){return Math.round(a/e)*e}function oa(a,e){e=Math.max(2,Math.floor(e));const t=255/(e-1);for(let s=0;s<a.length;s+=4)a[s]=Math.round(a[s]/t)*t,a[s+1]=Math.round(a[s+1]/t)*t,a[s+2]=Math.round(a[s+2]/t)*t}const na=8;class la{constructor(e,t,s){c(this,"currentX");c(this,"currentZ");this.camera=e,this.currentX=t,this.currentZ=s}update(e,t,s){const i=Math.min(1,na*s);this.currentX+=(e-this.currentX)*i,this.currentZ+=(t-this.currentZ)*i;const r=Ut(),o=pt(this.currentX,r),n=pt(this.currentZ,r);this.camera.position.set(o+200,600,n+200),this.camera.lookAt(o,0,n)}}const es=200,ts=1e3,ca={uniforms:{tDiffuse:{value:null},intensity:{value:.2}},vertexShader:`
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
  `};class da{constructor(e){c(this,"renderer");c(this,"scene");c(this,"camera");c(this,"cameraController");c(this,"composer");c(this,"animFrameId",0);c(this,"_raycaster",new Oi);c(this,"_groundPlane",new Fi(new U(0,1,0),0));c(this,"_worldTarget",new U);c(this,"_ndc",new Z);c(this,"_canvasRect",null);c(this,"onResize",()=>{var r;const e=window.innerWidth,t=window.innerHeight,s=e/t;this.camera.left=-re*s,this.camera.right=re*s,this.camera.top=re,this.camera.bottom=-re,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,t);const i=Jt(e,t);(r=this.composer)==null||r.setSize(i.width,i.height),this._canvasRect=null});this.renderer=new Ni({antialias:!1}),this.renderer.setPixelRatio(1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Bi,this.renderer.outputColorSpace=ut,this.renderer.toneMapping=Gs,this.renderer.domElement.style.imageRendering="pixelated",e.appendChild(this.renderer.domElement),this.scene=new Di,this.scene.background=new Ve(657938);const t=window.innerWidth/window.innerHeight;this.camera=new Hs(-re*t,re*t,re,-re,.1,3e3),this.cameraController=new la(this.camera,es,ts),this.cameraController.update(es,ts,1),this.buildLighting(),window.addEventListener("resize",this.onResize),this.onResize()}buildLighting(){this.scene.add(new Hi(6706500,2.2)),this.scene.add(new Ui(3359846,4465169,1.1));const e=new ji(7833804,1.25);e.position.set(1500,800,1200),e.target.position.set(1e3,0,1e3),e.castShadow=!0,e.shadow.mapSize.set(2048,2048),e.shadow.camera.near=.5,e.shadow.camera.far=4e3,e.shadow.camera.left=-1500,e.shadow.camera.right=1500,e.shadow.camera.top=1500,e.shadow.camera.bottom=-1500,this.scene.add(e),this.scene.add(e.target)}initPostProcessing(){const e=Jt(window.innerWidth,window.innerHeight),t=new De(e.width,e.height,{type:He,magFilter:pe,minFilter:pe});this.composer=new ta(this.renderer,t),this.composer.setSize(e.width,e.height),this.composer.addPass(new sa(this.scene,this.camera)),this.composer.addPass(new Ie(new Z(e.width/2,e.height/2),.5,.4,.3)),this.composer.addPass(new Js(ca)),this.composer.addPass(new ra)}updateCamera(e,t,s){this.cameraController.update(e,t,s)}getCanvasRect(){return this._canvasRect||(this._canvasRect=this.renderer.domElement.getBoundingClientRect()),this._canvasRect}startRenderLoop(e){if(this.animFrameId!==0)return;const t=()=>{this.animFrameId=requestAnimationFrame(t),e(),this.composer?this.composer.render():this.renderer.render(this.scene,this.camera)};t()}stopRenderLoop(){cancelAnimationFrame(this.animFrameId),this.animFrameId=0}screenToWorld(e,t){const s=this.getCanvasRect();return this._ndc.set((e-s.left)/s.width*2-1,-((t-s.top)/s.height)*2+1),this._raycaster.setFromCamera(this._ndc,this.camera),this._raycaster.ray.intersectPlane(this._groundPlane,this._worldTarget),{x:this._worldTarget.x,y:this._worldTarget.z}}dispose(){var e;this.stopRenderLoop(),window.removeEventListener("resize",this.onResize),this.renderer.dispose(),(e=this.composer)==null||e.dispose()}}function ht(a){return a==="ranger"||a==="amazon"?"ranger":"mage"}const $=2e3,ce=16,ss=200,Je=60,is=1/Je,At=750,ti=500,je=[{x:350,y:300,halfSize:28},{x:1e3,y:250,halfSize:28},{x:1650,y:300,halfSize:28},{x:400,y:750,halfSize:28},{x:1600,y:750,halfSize:28},{x:1e3,y:1e3,halfSize:28},{x:350,y:1450,halfSize:28},{x:750,y:1700,halfSize:28},{x:1250,y:1700,halfSize:28},{x:1650,y:1450,halfSize:28}],pa=Math.round(1.5*Je),ha=60,ma=Math.round(.75*Je),mt={1:{manaCost:25,cooldownTicks:30},2:{manaCost:60,cooldownTicks:180},3:{manaCost:100,cooldownTicks:300},4:{manaCost:40,cooldownTicks:120},5:{manaCost:20,cooldownTicks:24},6:{manaCost:50,cooldownTicks:24},7:{manaCost:80,cooldownTicks:240},8:{manaCost:30,cooldownTicks:90}},si=600,Pt={"fire.volatile_ember":{requiresAll:["fire.fireball"]},"fire.seeking_flame":{requiresAll:["fire.fireball"]},"fire.hellfire":{requiresAll:["fire.fireball"]},"fire.pyroclasm":{requiresAll:["fire.fireball"]},"fire.fire_wall":{requiresAll:["fire.fireball"],requiresAny:["fire.volatile_ember","fire.seeking_flame"]},"fire.enduring_flames":{requiresAll:["fire.fire_wall"]},"fire.searing_heat":{requiresAll:["fire.fire_wall"]},"fire.inferno_expanse":{requiresAll:["fire.fire_wall"]},"fire.meteor":{requiresAll:["fire.fire_wall"],requiresAny:["fire.enduring_flames","fire.searing_heat","fire.inferno_expanse"]},"fire.molten_impact":{requiresAll:["fire.meteor"]},"fire.blind_strike":{requiresAll:["fire.meteor"]},"fire.cataclysm":{requiresAll:["fire.meteor"]},"utility.phase_shift":{requiresAll:["utility.teleport"]},"utility.ethereal_form":{requiresAll:["utility.teleport"]},"utility.phantom_step":{requiresAll:["utility.teleport"],requiresAny:["utility.phase_shift","utility.ethereal_form"]},"archer.guided":{requiresAll:["archer.power_shot"]},"archer.multishot":{requiresAll:["archer.power_shot"]},"archer.homing":{requiresAll:["archer.guided"]},"archer.barrage":{requiresAll:["archer.multishot"]},"archer.rain_of_arrows":{requiresAll:["archer.power_shot"],requiresAny:["archer.homing","archer.barrage"]},"archer.sustained_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.piercing_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.wide_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.burn":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.freeze","archer.poison"]},"archer.freeze":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.poison"]},"archer.poison":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.freeze"]},"archer_utility.combat_roll":{requiresAll:["archer_utility.evade"]},"archer_utility.shadowstep":{requiresAll:["archer_utility.evade"]},"archer_utility.acrobatics":{requiresAll:["archer_utility.evade"],requiresAny:["archer_utility.combat_roll","archer_utility.shadowstep"]}};function Oe(a,e){const t=Pt[a];return t?!(t.requiresAll&&!t.requiresAll.every(s=>e.has(s))||t.requiresAny&&!t.requiresAny.some(s=>e.has(s))||t.mutuallyExclusive&&t.mutuallyExclusive.some(s=>e.has(s))):!0}const Q=[{id:"fire.fireball",name:"Fireball",tree:"fire",tier:1,cost:1,isSpell:!0,description:"Fast projectile. 80–120 damage."},{id:"fire.volatile_ember",name:"Volatile Ember",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Larger fireball per rank.",stackable:{softCap:5,baseEffect:.4}},{id:"fire.seeking_flame",name:"Seeking Flame",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Homing toward enemy. Stronger per rank.",stackable:{softCap:5,baseEffect:12}},{id:"fire.hellfire",name:"Hellfire",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Larger, slower, harder-hitting fireball per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.pyroclasm",name:"Pyroclasm",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Fireball splits on impact. More splits per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.fire_wall",name:"Fire Wall",tree:"fire",tier:4,cost:2,isSpell:!0,description:"Persistent fire barrier. 40 dmg/s."},{id:"fire.enduring_flames",name:"Enduring Flames",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+10% Fire Wall duration per rank.",stackable:{softCap:5,baseEffect:.1}},{id:"fire.searing_heat",name:"Searing Heat",tree:"fire",tier:5,cost:2,isSpell:!1,description:"+8% Fire Wall damage per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"fire.inferno_expanse",name:"Inferno Expanse",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+25% Fire Wall length and width per rank.",stackable:{softCap:5,baseEffect:.25}},{id:"fire.meteor",name:"Meteor",tree:"fire",tier:6,cost:3,isSpell:!0,description:"Delayed AoE strike. 200–280 damage."},{id:"fire.molten_impact",name:"Molten Impact",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Meteor leaves a burning crater for 3s."},{id:"fire.blind_strike",name:"Blind Strike",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Enemy cannot see the Meteor impact indicator."},{id:"fire.cataclysm",name:"Cataclysm",tree:"fire",tier:7,cost:1,isSpell:!1,description:"+15% Meteor radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"utility.teleport",name:"Teleport",tree:"utility",tier:1,cost:1,isSpell:!0,description:"Instant displacement."},{id:"utility.phase_shift",name:"Phase Shift",tree:"utility",tier:2,cost:2,isSpell:!1,description:"+8% teleport range per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"utility.ethereal_form",name:"Ethereal Form",tree:"utility",tier:2,cost:2,isSpell:!1,description:"0.5s invulnerability after teleporting."},{id:"utility.phantom_step",name:"Phantom Step",tree:"utility",tier:3,cost:3,isSpell:!1,description:"Next cast is instant within 2s of teleporting."},{id:"archer.power_shot",name:"Power Shot",tree:"archer",tier:1,cost:1,isSpell:!0,description:"Fast arrow projectile. 60–90 damage."},{id:"archer.guided",name:"Guided",tree:"archer",tier:2,cost:2,isSpell:!1,description:"Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4).",stackable:{softCap:4,baseEffect:1}},{id:"archer.multishot",name:"Multi-shot",tree:"archer",tier:2,cost:2,isSpell:!0,description:"Fire 3 arrows in a spread. 40–60 damage each."},{id:"archer.homing",name:"Homing",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Guided redirects happen sooner per rank.",stackable:{softCap:3,baseEffect:2}},{id:"archer.barrage",name:"Barrage",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Multi-shot gains extra arrows per rank.",stackable:{softCap:5,baseEffect:2}},{id:"archer.rain_of_arrows",name:"Rain of Arrows",tree:"archer",tier:4,cost:2,isSpell:!0,description:"Mark a zone. Arrows rain after 1.5s. 150–220 AoE damage."},{id:"archer.sustained_rain",name:"Sustained Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"Rain zone lasts longer per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"archer.piercing_rain",name:"Piercing Rain",tree:"archer",tier:5,cost:2,isSpell:!1,description:"Rain damage increases per rank.",stackable:{softCap:3,baseEffect:.25}},{id:"archer.wide_rain",name:"Wide Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"+15% Rain of Arrows radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"archer.burn",name:"Burn",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows burn. More damage per rank.",stackable:{softCap:5,baseEffect:8}},{id:"archer.freeze",name:"Freeze",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows freeze. Stronger slow per rank.",stackable:{softCap:5,baseEffect:.06}},{id:"archer.poison",name:"Poison",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows poison. More damage and mana drain per rank.",stackable:{softCap:5,baseEffect:5}},{id:"archer_utility.evade",name:"Evade",tree:"archer_utility",tier:1,cost:1,isSpell:!0,description:"Short dash with invulnerability frames (~0.3s)."},{id:"archer_utility.combat_roll",name:"Combat Roll",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Fire an arrow at the nearest enemy during evade."},{id:"archer_utility.shadowstep",name:"Shadowstep",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Become invisible for 0.5s after evading."},{id:"archer_utility.acrobatics",name:"Acrobatics",tree:"archer_utility",tier:3,cost:3,isSpell:!1,description:"Evade cooldown reduced per rank.",stackable:{softCap:3,baseEffect:.1}}],xt=[{spell:1,node:"fire.fireball",key:1,charClass:"mage"},{spell:2,node:"fire.fire_wall",key:2,charClass:"mage"},{spell:3,node:"fire.meteor",key:3,charClass:"mage"},{spell:4,node:"utility.teleport",key:4,charClass:"mage"},{spell:5,node:"archer.power_shot",key:1,charClass:"ranger"},{spell:6,node:"archer.multishot",key:2,charClass:"ranger"},{spell:7,node:"archer.rain_of_arrows",key:3,charClass:"ranger"},{spell:8,node:"archer_utility.evade",key:4,charClass:"ranger"}],jt={mage:"fire.fireball",ranger:"archer.power_shot"};function fa(a){return si*(a>0?1+rt(.08,a):1)}const ua=.7;function rt(a,e){return e<=0?0:a*Math.pow(e,ua)}function xa(a){const e=a.get("archer.burn")??0,t=a.get("archer.freeze")??0,s=a.get("archer.poison")??0,i=Math.max(e,t,s);return i<=0?"none":e===i?"burn":t===i?"freeze":"poison"}function ye(a){return a.stackable!==void 0}function we(a,e){if(!a.stackable)return e===0?a.cost:1/0;const t=e+1,s=Math.max(0,t-a.stackable.softCap);return a.cost+s}function ii(a){return{x:Math.max(ce,Math.min($-ce,a.x)),y:Math.max(ce,Math.min($-ce,a.y))}}function ai(a){let e={...a};for(const t of je){const s=t.x-t.halfSize-ce,i=t.x+t.halfSize+ce,r=t.y-t.halfSize-ce,o=t.y+t.halfSize+ce;if(e.x>s&&e.x<i&&e.y>r&&e.y<o){const n=e.x-s,l=i-e.x,d=e.y-r,p=o-e.y,h=Math.min(n,l,d,p);h===n?e.x=s:h===l?e.x=i:h===d?e.y=r:e.y=o}}return e}function as(a,e,t=si){const s=e.x-a.x,i=e.y-a.y,r=Math.sqrt(s*s+i*i),o=r>t?{x:a.x+s/r*t,y:a.y+i/r*t}:{x:e.x,y:e.y};return ai(ii(o))}function rs(a,e,t=1){const s=Math.sqrt(e.x*e.x+e.y*e.y);if(s===0)return a;const i=e.x/s,r=e.y/s,o={x:a.x+i*ss*is*t,y:a.y+r*ss*is*t};return ai(ii(o))}const ga=6,os=[{id:"mage",label:"Mage",enabled:!0},{id:"ranger",label:"Ranger",enabled:!0}];function ba(a){return Math.floor(100*Math.pow(a,1.5))}const ze={walk:{frames:9,singleRow:!1,fps:12},run:{frames:8,singleRow:!1,fps:12},idle:{frames:2,singleRow:!1,fps:2},spellcast:{frames:7,singleRow:!1,fps:12},shoot:{frames:13,singleRow:!1,fps:14},hurt:{frames:6,singleRow:!0,fps:8}},wt={purple:"#8a5fc4",green:"#4d8f4d",black:"#4a4a52",brown:"#7d5a38",red:"#c0503a",blue:"#4a6fc4",white:"#f0f0f0",blonde:"#d9b256",gray:"#9a9aa2"},va={olive:"#ae6b3f",bronze:"#7f4c31",brown:"#76513a",black:"#442725"},gt={mage:{body:"male",skin:"light",hairStyle:null,hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"purple",legsColor:"black",hat:"wizard",hatColor:"base_black"},ranger:{body:"female",skin:"light",hairStyle:"ponytail",hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"green",legsColor:"brown",hat:null,hatColor:"base_black"}},I={body:["male","female"],skin:["light","olive","bronze","brown","black"],hairStyle:[null,"ponytail","plain","long","curly_short","bangs"],hairColor:["red","blonde","brown","black","gray","blue","green","purple","white"],eyes:[null,"blue","brown","green","gray"],torsoColor:["purple","green","red","blue","brown","black","white"],legsColor:["black","brown","blue","green","red","white"]},ya=new Set(["ponytail"]);function wa(a){const e=[],t=va[a.skin],s=wt[a.hairColor],i=a.hairStyle!=null&&ya.has(a.hairStyle);return a.hairStyle&&i&&e.push({path:`hair/${a.hairStyle}/adult/bg`,z:0,tint:s,tintMode:"fabric"}),e.push({path:`body/bodies/${a.body}`,z:10,tint:t,tintMode:"skin"}),e.push({path:`head/heads/human/${a.body==="female"?"female_small":"male"}`,z:20,tint:t,tintMode:"skin"}),a.eyes&&e.push({path:`eyes/human/adult/default/${a.eyes}`,z:25}),a.hairStyle&&(i?e.push({path:`hair/${a.hairStyle}/adult/fg`,z:30,tint:s,tintMode:"fabric"}):e.push({path:`hair/${a.hairStyle}/adult`,z:30,tint:s,tintMode:"fabric"})),e.push({path:`torso/clothes/${a.torso}/${a.torso}/${a.body}`,z:40,tint:wt[a.torsoColor],tintMode:"fabric"}),e.push({path:`legs/pants/${a.body==="female"?"thin":"male"}`,z:50,tint:wt[a.legsColor],tintMode:"fabric"}),a.hat&&e.push({path:`hat/magic/${a.hat}/base/adult/${a.hatColor}`,z:60}),e.sort((r,o)=>r.z-o.z)}function he(a,e){return e.includes(a)}function ns(a,e){const t=gt[e];if(typeof a!="object"||a===null)return{...t};const s=a;return{body:he(s.body,I.body)?s.body:t.body,skin:he(s.skin,I.skin)?s.skin:t.skin,hairStyle:he(s.hairStyle,I.hairStyle)?s.hairStyle:t.hairStyle,hairColor:he(s.hairColor,I.hairColor)?s.hairColor:t.hairColor,eyes:he(s.eyes,I.eyes)?s.eyes:t.eyes,torso:t.torso,torsoColor:he(s.torsoColor,I.torsoColor)?s.torsoColor:t.torsoColor,legsColor:he(s.legsColor,I.legsColor)?s.legsColor:t.legsColor,hat:t.hat,hatColor:t.hatColor}}function ka(a,e=Math.random){const t=gt[a],s=i=>i[Math.floor(e()*i.length)];return{body:s(I.body),skin:s(I.skin),hairStyle:s(I.hairStyle),hairColor:s(I.hairColor),eyes:null,torso:t.torso,torsoColor:s(I.torsoColor),legsColor:s(I.legsColor),hat:t.hat,hatColor:t.hatColor}}function ls(a){return{body:a.body,skin:a.skin,hair_style:a.hairStyle,hair_color:a.hairColor,eyes:a.eyes,torso_color:a.torsoColor,legs_color:a.legsColor}}function Sa(a,e){if(typeof a!="object"||a===null)return ns(a,e);const t=a;return ns({body:t.body,skin:t.skin,hairStyle:t.hair_style,hairColor:t.hair_color,eyes:t.eyes,torso:t.torso,torsoColor:t.torso_color,legsColor:t.legs_color,hat:t.hat,hatColor:t.hat_color},e)}const ke={maxHp:At,maxMana:ti,damageMult:1,cooldownMult:1,moveSpeedMult:1,manaRegenMult:1},cs={max_health:[[20,40],[40,70],[70,110],[110,160]],max_mana:[[15,30],[30,50],[50,80],[80,120]],damage_pct:[[2,4],[4,7],[7,11],[11,15]],cast_speed_pct:[[2,3],[3,5],[5,8],[8,10]],move_speed_pct:[[2,3],[3,4],[4,6],[6,8]],mana_regen_pct:[[5,10],[10,15],[15,25],[25,35]],talent:[[1,1],[1,1],[1,2],[1,3]]},Rt=[1,4,7,10],ri=["max_health","max_mana","damage_pct","cast_speed_pct","move_speed_pct","mana_regen_pct"],_a={move_speed_pct:["leggings"]};function Ma(a){return ri.filter(e=>{const t=_a[e];return!t||t.includes(a.slot)})}const O=[{id:"leather_cap",slot:"helmet",name:"Leather Cap",icon:"fa-helmet-safety",itemLevel:1,implicit:{id:"max_health",value:15}},{id:"iron_helm",slot:"helmet",name:"Iron Helm",icon:"fa-helmet-safety",itemLevel:7,implicit:{id:"max_health",value:60}},{id:"padded_tunic",slot:"armor",name:"Padded Tunic",icon:"fa-shirt",itemLevel:1,implicit:{id:"max_health",value:25}},{id:"scale_mail",slot:"armor",name:"Scale Mail",icon:"fa-shirt",itemLevel:7,implicit:{id:"max_health",value:90}},{id:"cloth_pants",slot:"leggings",name:"Cloth Pants",icon:"fa-socks",itemLevel:1,implicit:{id:"max_health",value:10}},{id:"mail_leggings",slot:"leggings",name:"Mail Leggings",icon:"fa-socks",itemLevel:7,implicit:{id:"max_health",value:45}},{id:"bone_ring",slot:"ring",name:"Bone Ring",icon:"fa-ring",itemLevel:1,implicit:{id:"max_mana",value:10}},{id:"silver_ring",slot:"ring",name:"Silver Ring",icon:"fa-ring",itemLevel:4,implicit:{id:"max_mana",value:18}},{id:"carved_amulet",slot:"amulet",name:"Carved Amulet",icon:"fa-gem",itemLevel:4,implicit:{id:"max_mana",value:25}},{id:"moon_amulet",slot:"amulet",name:"Moon Amulet",icon:"fa-gem",itemLevel:7,implicit:{id:"max_mana",value:25}},{id:"apprentice_staff",slot:"weapon",name:"Apprentice Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:1,implicit:{id:"damage_pct",value:2}},{id:"gnarled_staff",slot:"weapon",name:"Gnarled Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:7,implicit:{id:"damage_pct",value:6}},{id:"archmage_staff",slot:"weapon",name:"Archmage Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:10,implicit:{id:"damage_pct",value:9}},{id:"short_bow",slot:"weapon",name:"Short Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:1,implicit:{id:"damage_pct",value:2}},{id:"war_bow",slot:"weapon",name:"War Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:7,implicit:{id:"damage_pct",value:6}},{id:"great_bow",slot:"weapon",name:"Great Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:10,implicit:{id:"damage_pct",value:9}}],Te=[{id:"emberheart",baseId:"moon_amulet",name:"Emberheart",flavor:"A cinder that never cools, warm to the touch even in the dead of winter.",affixes:[{id:"max_mana",value:60},{id:"damage_pct",value:8},{id:"talent",value:2,node:"fire.volatile_ember"},{id:"talent",value:1,node:"fire.searing_heat"}],levelReq:7},{id:"windrunner_band",baseId:"bone_ring",name:"Windrunner Band",flavor:"Fletched with feathers that never touched a bird.",affixes:[{id:"move_speed_pct",value:6},{id:"cast_speed_pct",value:5},{id:"talent",value:2,node:"archer.barrage"}],levelReq:7}],Ca=.25,oi={mage:["fire","utility"],ranger:["archer","archer_utility"]};function ds([a,e],t){return a+Math.floor(t()*(e-a+1))}function Ea(a,e,t){const s=[...a],i=[];for(let r=0;r<e&&s.length>0;r++){const o=Math.floor(t()*s.length);i.push(s.splice(o,1)[0])}return i}function Ta(a){return a.classRestriction?[a.classRestriction]:["mage","ranger"]}function La(a,e){const t=new Set(Ta(a).flatMap(o=>oi[o])),s=Q.map(o=>({node:o.id,weight:t.has(o.tree)?2:1})),i=s.reduce((o,n)=>o+n.weight,0);let r=e()*i;for(const o of s)if(r-=o.weight,r<0)return o.node;return s[s.length-1].node}function $a(a,e,t=Math.random){if(e==="basic")return[];const s=Rt.indexOf(a.itemLevel),i=e==="magic"?1+Math.floor(t()*2):3+Math.floor(t()*3),r=e!=="magic"&&t()<Ca,o=r?i-1:i,n=Ea(Ma(a),o,t).map(l=>({id:l,value:ds(cs[l][s],t)}));return r&&n.push({id:"talent",value:ds(cs.talent[s],t),node:La(a,t)}),n}function ni(a,e){const t=e.slice(0,e.indexOf("."));return oi[a].includes(t)}function Aa(a,e){let t=ke.maxHp,s=ke.maxMana,i=ke.damageMult,r=ke.cooldownMult,o=ke.moveSpeedMult,n=ke.manaRegenMult;const l=new Map;for(const d of a){const p=O.find(f=>f.id===d.base_id),h=p?[p.implicit,...d.affixes]:d.affixes;for(const f of h)switch(f.id){case"max_health":t+=f.value;break;case"max_mana":s+=f.value;break;case"damage_pct":i*=1+f.value/100;break;case"cast_speed_pct":r*=1-f.value/100;break;case"move_speed_pct":o*=1+f.value/100;break;case"mana_regen_pct":n*=1+f.value/100;break;case"talent":f.node&&ni(e,f.node)&&l.set(f.node,(l.get(f.node)??0)+f.value);break}}return{statBlock:{maxHp:t,maxMana:s,damageMult:i,cooldownMult:Math.max(.5,r),moveSpeedMult:Math.min(1.15,o),manaRegenMult:n},talentRanks:l}}const Pa=["basic","magic","rare","unique"],Ra=[...ri,"talent"],Ia=["weapon","helmet","armor","leggings","ring1","ring2","amulet"],za=["starter","drop","vendor","lootbox","admin"];function qa(a){if(typeof a!="object"||a===null)return!1;const e=a;return!(typeof e.id!="string"||!Ra.includes(e.id)||typeof e.value!="number"||e.id==="talent"&&(typeof e.node!="string"||!Q.some(t=>t.id===e.node)))}function Gt(a){if(typeof a!="object"||a===null)return null;const e=a;if(typeof e.id!="string"||typeof e.base_id!="string")return null;const t=O.find(s=>s.id===e.base_id);return!t||typeof e.rarity!="string"||!Pa.includes(e.rarity)||!Array.isArray(e.affixes)||!e.affixes.every(qa)||typeof e.level_req!="number"||e.equipped_by!==null&&typeof e.equipped_by!="string"||e.equipped_slot!==null&&(typeof e.equipped_slot!="string"||!Ia.includes(e.equipped_slot))||typeof e.slot!="string"||e.slot!==t.slot||e.source!==void 0&&(typeof e.source!="string"||!za.includes(e.source))?null:{id:e.id,base_id:e.base_id,rarity:e.rarity,affixes:e.affixes,level_req:e.level_req,equipped_by:e.equipped_by,equipped_slot:e.equipped_slot,slot:e.slot,source:e.source}}const ps={basic:150,premium:500},Oa={basic:[5,10,15,25],magic:[25,40,60,90],rare:[100,150,220,320],unique:[400,550,750,1e3]};function Fa(a){let e=0;for(let t=0;t<Rt.length;t++)Rt[t]<=a&&(e=t);return e}function Na(a,e){return Oa[a][Fa(e)]}const Se=80;function tt(a,e,t){const s=r=>{const o=r.clone();return o.wrapS=o.wrapT=Xs,o.repeat.set(e,t),o.needsUpdate=!0,o},i=new Ys({map:s(a.map),normalMap:a.normalMap?s(a.normalMap):null,roughnessMap:a.roughnessMap?s(a.roughnessMap):null,roughness:1,metalness:0});return i.normalScale.set(.4,.4),i}class Ba{constructor(e){c(this,"group",new Pe);this.buildFloor(e.floor),this.buildBoundaryWalls(e.stone),this.buildPillars(e.stone)}addToScene(e){e.add(this.group)}buildFloor(e){const t=$/200,s=tt(e,t,t),i=new z(new Ws($,$),s);i.rotation.x=-Math.PI/2,i.position.set($/2,0,$/2),i.receiveShadow=!0,this.group.add(i)}buildBoundaryWalls(e){const s=[[$/2,-10,$+40,20],[$/2,$+10,$+40,20],[-10,$/2,20,$],[$+10,$/2,20,$]],i=new Le(s[0][2],60,s[0][3]),r=new Le(s[2][2],60,s[2][3]),o=tt(e,s[0][2]/200,60/200),n=tt(e,s[2][2]/200,60/200);s.forEach(([l,d],p)=>{const h=new z(p<2?i:r,p<2?o:n);h.position.set(l,60/2,d),h.castShadow=!0,this.group.add(h)})}buildPillars(e){const t=new Ys({color:6974122,roughness:.7,metalness:.1}),s=je[0].halfSize*2,i=tt(e,s/200,Se/200),r=new Le(s,Se,s),o=new Le(s+6,8,s+6),n=new Nt(5,8,6),l=new Y({color:16753984}),d=[{x:0,y:0},{x:$,y:0},{x:0,y:$},{x:$,y:$}],p=new Set(d.map(h=>je.reduce((f,u)=>(u.x-h.x)**2+(u.y-h.y)**2<(f.x-h.x)**2+(f.y-h.y)**2?u:f)));je.forEach(h=>{const f=new z(r,i);f.position.set(h.x,Se/2,h.y),f.castShadow=!0,f.receiveShadow=!0,this.group.add(f);const u=new z(o,t);u.position.set(h.x,Se+4,h.y),this.group.add(u);const g=new z(n,l);if(g.position.set(h.x,Se+14,h.y),this.group.add(g),p.has(h)){const m=new Vs(16737792,3,450,2);m.position.set(h.x,Se+60,h.y),this.group.add(m)}})}}const T=64;function ot(a,e,t){const i=ze[a].singleRow?0:e;return{sx:t*T,sy:i*T}}const hs=[3,2,1,0],Da=Math.PI/12;function Ha(a,e){const t=2*Math.PI,i=((a+Math.PI/4)%t+t)%t,r=Math.round(i/(Math.PI/2))%4,o=hs[r];if(e===void 0||o===e)return o;const n=hs[e]*(Math.PI/2);let l=i-n;return l>Math.PI&&(l-=t),l<-Math.PI&&(l+=t),Math.abs(l)<=Math.PI/4+Da?e:o}function nt(a,e,t){const s=ze[a],i=Math.floor(e*s.fps);return t?i%s.frames:Math.min(i,s.frames-1)}const ms=new Map;function Ua(a){let e=ms.get(a);return e||(e=new Promise(t=>{const s=new Image;s.onload=()=>t(s),s.onerror=()=>t(null),s.src=a}),ms.set(a,e)),e}async function li(a){const e=wa(a),t={};for(const s of Object.keys(ze)){const i=ze[s],r=await Promise.all(e.map(h=>Ua(`/assets/lpc/${h.path}/${s}.png`)));if(r.filter(h=>h!==null).length===0){t[s]=null;continue}const n=i.singleRow?1:4,l=document.createElement("canvas");l.width=i.frames*T,l.height=n*T;const d=l.getContext("2d");r.forEach((h,f)=>{if(!h)return;const u=e[f].tint;if(!u){d.drawImage(h,0,0);return}const g=document.createElement("canvas");g.width=l.width,g.height=l.height;const m=g.getContext("2d");m.drawImage(h,0,0),m.globalCompositeOperation="multiply",m.fillStyle=u,m.fillRect(0,0,g.width,g.height),e[f].tintMode==="fabric"&&(m.globalCompositeOperation="screen",m.fillStyle="#464646",m.fillRect(0,0,g.width,g.height)),m.globalCompositeOperation="destination-in",m.drawImage(h,0,0),d.drawImage(g,0,0)});const p=new Bt(l);p.magFilter=pe,p.minFilter=pe,p.generateMipmaps=!1,p.colorSpace=ut,t[s]=p}return t}function lt(a){for(const e of Object.values(a))e==null||e.dispose()}const ja=.5,_e=42,Ga=new Lt(11,16),Wa=new Y({color:0,transparent:!0,opacity:.35});class Ya{constructor(e,t){c(this,"group",new Pe);c(this,"plane");c(this,"material");c(this,"textures",null);c(this,"direction",2);c(this,"dead",!1);c(this,"castAnim");c(this,"moveAnim","idle");c(this,"moveElapsed",0);c(this,"casting",!1);c(this,"castElapsed",0);c(this,"lastFrameKey","");c(this,"scratch",null);c(this,"scratchTex",null);this.castAnim=t==="ranger"?"shoot":"spellcast";const s=T*Ut()*ja;this.material=new Y({transparent:!0,alphaTest:.01}),this.material.visible=!1,this.plane=new z(new Ws(s,s),this.material),this.plane.rotation.order="YXZ",this.plane.rotation.y=Math.PI/4,this.plane.rotation.x=-Math.atan(600/Math.hypot(200,200)),this.plane.position.y=s/2,this.group.add(this.plane);const i=new z(Ga,Wa);i.rotation.x=-Math.PI/2,i.position.y=.5,this.group.add(i),li(e).then(r=>{this.textures=r,this.material.visible=!0,this.applyFrame(!0)})}setFacing(e){this.dead||(this.direction=Ha(e,this.direction))}die(){this.dead||(this.dead=!0,this.casting=!1,this.moveElapsed=0)}update(e,t,s){if(this.moveElapsed+=e,this.castElapsed+=e,!this.dead){const i=t>220?"run":t>1.5?"walk":"idle";i!==this.moveAnim&&(this.moveAnim=i,this.moveElapsed=0),s&&(this.casting=!0,this.castElapsed=0);const r=ze[this.castAnim];this.casting&&this.castElapsed>=r.frames/r.fps&&(this.casting=!1)}this.applyFrame(!1)}applyFrame(e){if(this.textures){if(this.dead){this.applyFullFrame("hurt",this.moveElapsed,e);return}if(this.casting&&this.textures[this.castAnim]){this.moveAnim==="idle"||!this.textures[this.moveAnim]?this.applyFullFrame(this.castAnim,this.castElapsed,e):this.applySplitFrame(e);return}this.applyFullFrame(this.moveAnim,this.moveElapsed,e)}}applyFullFrame(e,t,s){const i=this.textures[e]?e:this.textures.idle?"idle":"walk",r=this.textures[i];if(!r)return;const o=ze[i],n=i!=="hurt"&&i!==this.castAnim,l=nt(i,t,n),d=`${i}:${this.direction}:${l}`;if(!s&&d===this.lastFrameKey)return;this.lastFrameKey=d,this.material.map!==r&&(this.material.map=r,this.material.needsUpdate=!0);const{sx:p,sy:h}=ot(i,this.direction,l),f=o.singleRow?1:4;r.repeat.set(T/(o.frames*T),T/(f*T)),r.offset.set(p/(o.frames*T),1-(h+T)/(f*T))}applySplitFrame(e){const t=this.textures[this.castAnim],s=this.textures[this.moveAnim],i=nt(this.castAnim,this.castElapsed,!1),r=nt(this.moveAnim,this.moveElapsed,!0),o=`split:${this.castAnim}:${i}:${this.moveAnim}:${r}:${this.direction}`;if(!e&&o===this.lastFrameKey)return;this.lastFrameKey=o,this.scratch||(this.scratch=document.createElement("canvas"),this.scratch.width=T,this.scratch.height=T,this.scratchTex=new Bt(this.scratch),this.scratchTex.magFilter=pe,this.scratchTex.minFilter=pe,this.scratchTex.generateMipmaps=!1,this.scratchTex.colorSpace=ut);const n=ot(this.castAnim,this.direction,i),l=ot(this.moveAnim,this.direction,r),d=this.scratch.getContext("2d");d.clearRect(0,0,T,T),d.drawImage(s.image,l.sx,l.sy+_e,T,T-_e,0,_e,T,T-_e),d.drawImage(t.image,n.sx,n.sy,T,_e,0,0,T,_e),this.scratchTex.needsUpdate=!0,this.material.map!==this.scratchTex&&(this.material.map=this.scratchTex,this.material.needsUpdate=!0)}dispose(){var e;this.plane.geometry.dispose(),this.material.dispose(),(e=this.scratchTex)==null||e.dispose(),this.textures&&lt(this.textures)}}const Va=50,Xa=new Zs(14,18,32),Fe=new U;class Za{constructor(e,t,s,i,r){c(this,"group",new Pe);c(this,"sprite");c(this,"nameLabel");c(this,"ownedMaterials",[]);c(this,"prevX",0);c(this,"prevZ",0);c(this,"velocityMag",0);c(this,"smoothVel",0);this.sprite=new Ya(t??gt[e],e),this.group.add(this.sprite.group);const o=new Y({color:s,transparent:!0,opacity:.5,side:Ue});this.ownedMaterials.push(o);const n=new z(Xa,o);n.rotation.x=-Math.PI/2,n.position.y=1,this.group.add(n),this.nameLabel=document.createElement("div"),this.nameLabel.style.cssText=`
      position:absolute; left:0; top:0; pointer-events:none; font-size:12px; color:#fff;
      text-shadow:0 0 4px #000; white-space:nowrap; transform:translateX(-50%);
    `,this.nameLabel.textContent=i,r.appendChild(this.nameLabel)}setPosition(e,t,s){const i=e-this.prevX,r=t-this.prevZ,o=Math.min(Math.sqrt(i*i+r*r)*60,1e3);this.smoothVel=this.smoothVel*.85+o*.15,this.velocityMag=this.smoothVel,s!==void 0&&this.sprite.setFacing(s),this.prevX=e,this.prevZ=t;const n=Ut();this.group.position.set(pt(e,n),0,pt(t,n))}update(e,t){this.sprite.update(e,this.velocityMag,t)}setVisible(e){this.group.visible=e,this.nameLabel.style.display=e?"":"none"}die(){this.sprite.die()}updateLabel(e,t){this.group.getWorldPosition(Fe),Fe.y+=Va+10,Fe.project(e);const s=(Fe.x*.5+.5)*t.width+t.left,i=(-Fe.y*.5+.5)*t.height+t.top-10;this.nameLabel.style.transform=`translate(${s}px, ${i}px) translateX(-50%)`}dispose(e){e.removeChild(this.nameLabel),this.group.removeFromParent();for(const t of this.ownedMaterials)t.dispose();this.ownedMaterials=[],this.sprite.dispose()}}const L=4096,me=Math.floor(L*.9),Ka=1,Qa=.4,Ja=0;class er{constructor(e){c(this,"posX",new Float32Array(L));c(this,"posY",new Float32Array(L));c(this,"posZ",new Float32Array(L));c(this,"velX",new Float32Array(L));c(this,"velY",new Float32Array(L));c(this,"velZ",new Float32Array(L));c(this,"life",new Float32Array(L));c(this,"maxLife",new Float32Array(L));c(this,"particleSize",new Float32Array(L));c(this,"colorR",new Float32Array(L));c(this,"colorG",new Float32Array(L));c(this,"colorB",new Float32Array(L));c(this,"activeCount",0);c(this,"positionBuffer");c(this,"sizeBuffer");c(this,"colorBuffer");c(this,"posAttr");c(this,"sizeAttr");c(this,"colorAttr");c(this,"geometry");c(this,"points");this.scene=e,this.positionBuffer=new Float32Array(L*3),this.sizeBuffer=new Float32Array(L),this.colorBuffer=new Float32Array(L*3),this.geometry=new Qe,this.posAttr=new vt(this.positionBuffer,3),this.posAttr.setUsage(yt),this.geometry.setAttribute("position",this.posAttr),this.sizeAttr=new vt(this.sizeBuffer,1),this.sizeAttr.setUsage(yt),this.geometry.setAttribute("size",this.sizeAttr),this.colorAttr=new vt(this.colorBuffer,3),this.colorAttr.setUsage(yt),this.geometry.setAttribute("particleColor",this.colorAttr),this.geometry.setDrawRange(0,0);const t=new ue({vertexShader:`
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
      `,transparent:!0,depthWrite:!1,blending:js});this.points=new Gi(this.geometry,t),this.points.frustumCulled=!1,e.add(this.points)}emitTrail(e,t,s,i,r,o=10){if(this.activeCount>=me)return;const n=o/10,l=Math.min(12,Math.floor((3+Math.floor(Math.random()*3))*n)),d=4*n;for(let p=0;p<l;p++){if(this.activeCount>=L)return;this.spawn(e+(Math.random()-.5)*d,t+(Math.random()-.5)*d,s+(Math.random()-.5)*d,-i*(40+Math.random()*30)*n+(Math.random()-.5)*30,(10+Math.random()*20)*n,-r*(40+Math.random()*30)*n+(Math.random()-.5)*30,.35+Math.random()*.15,(12+Math.random()*4)*n)}}emitExplosion(e,t,s,i=10){const r=i/10,o=Math.min(200,Math.floor((40+Math.floor(Math.random()*21))*r)),n=6*r;for(let l=0;l<o;l++){if(this.activeCount>=L)return;const d=Math.random()*Math.PI*2,p=(60+Math.random()*120)*r;this.spawn(e+(Math.random()-.5)*n,t+(Math.random()-.5)*n,s+(Math.random()-.5)*n,Math.cos(d)*p,(20+Math.random()*80)*r,Math.sin(d)*p,.5+Math.random()*.3,(Math.random()>.5?16:10)*Math.min(r,3))}}emitWall(e){if(!(this.activeCount>=me))for(const t of e)for(let s=0;s<3;s++){if(this.activeCount>=L)return;const i=Math.random();this.spawn(t.x1+(t.x2-t.x1)*i+(Math.random()-.5)*4,1,t.y1+(t.y2-t.y1)*i+(Math.random()-.5)*4,(Math.random()-.5)*15,40+Math.random()*40,(Math.random()-.5)*15,.4+Math.random()*.3,14+Math.random()*10)}}emitMeteorTrail(e,t,s){if(this.activeCount>=me)return;const i=2+Math.floor(Math.random()*2);for(let r=0;r<i;r++){if(this.activeCount>=L)return;const o=Math.random()*Math.PI*2,n=8+Math.random()*8;this.spawn(e+(Math.random()-.5)*6,t+(Math.random()-.5)*6,s+(Math.random()-.5)*6,Math.cos(o)*n,20+Math.random()*20,Math.sin(o)*n,.2+Math.random()*.1,8+Math.random()*6)}}emitCrater(e,t,s){if(this.activeCount>=me)return;const i=Math.max(4,Math.round(s/10));for(let r=0;r<i;r++){if(this.activeCount>=L)return;const o=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*s;this.spawn(e+Math.cos(o)*n,1,t+Math.sin(o)*n,(Math.random()-.5)*10,30+Math.random()*30,(Math.random()-.5)*10,.3+Math.random()*.3,10+Math.random()*8)}}emitMeteorImpact(e,t,s){if(this.activeCount>=me)return;const i=50+Math.floor(Math.random()*21);for(let r=0;r<i;r++){if(this.activeCount>=L)return;const o=Math.random()*Math.PI*2,n=80+Math.random()*120;this.spawn(e+(Math.random()-.5)*10,t+(Math.random()-.5)*10,s+(Math.random()-.5)*10,Math.cos(o)*n,30+Math.random()*100,Math.sin(o)*n,.5+Math.random()*.3,Math.random()>.5?18:12)}}emitRainImpact(e,t,s,i){if(this.activeCount>=me)return;const r=30+Math.floor(Math.random()*15);for(let o=0;o<r;o++){if(this.activeCount>=L)return;const n=Math.random()*Math.PI*2,l=Math.sqrt(Math.random())*i,d=15+Math.random()*30,p=this.activeCount;this.spawn(e+Math.cos(n)*l,t+2,s+Math.sin(n)*l,Math.cos(n)*d,30+Math.random()*50,Math.sin(n)*d,.3+Math.random()*.2,6+Math.random()*4),this.colorR[p]=.7,this.colorG[p]=.6,this.colorB[p]=.45}}emitRainZone(e,t,s){if(this.activeCount>=me)return;const i=Math.max(2,Math.round(s/20));for(let r=0;r<i;r++){if(this.activeCount>=L)return;const o=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*s,l=this.activeCount;this.spawn(e+Math.cos(o)*n,1,t+Math.sin(o)*n,(Math.random()-.5)*8,15+Math.random()*15,(Math.random()-.5)*8,.25+Math.random()*.15,5+Math.random()*4),this.colorR[l]=.7,this.colorG[l]=.6,this.colorB[l]=.45}}emitTeleportSparks(e,t,s){const i=10+Math.floor(Math.random()*6);for(let r=0;r<i;r++){if(this.activeCount>=L)return;const o=Math.random()*Math.PI*2,n=Math.random()*Math.PI*.5,l=40+Math.random()*60,d=this.activeCount;this.spawn(e+(Math.random()-.5)*4,t+(Math.random()-.5)*4,s+(Math.random()-.5)*4,Math.cos(o)*Math.sin(n)*l,Math.cos(n)*l*.4+10,Math.sin(o)*Math.sin(n)*l,.12+Math.random()*.04,7+Math.random()*4),this.colorR[d]=1,this.colorG[d]=.84+Math.random()*.16,this.colorB[d]=.4+Math.random()*.6}}spawn(e,t,s,i,r,o,n,l){const d=this.activeCount++;this.posX[d]=e,this.posY[d]=t,this.posZ[d]=s,this.velX[d]=i,this.velY[d]=r,this.velZ[d]=o,this.life[d]=n,this.maxLife[d]=n,this.particleSize[d]=l,this.colorR[d]=Ka,this.colorG[d]=Qa,this.colorB[d]=Ja}update(e){let t=0;for(;t<this.activeCount;){if(this.life[t]-=e,this.life[t]<=0){const i=this.activeCount-1;this.posX[t]=this.posX[i],this.posY[t]=this.posY[i],this.posZ[t]=this.posZ[i],this.velX[t]=this.velX[i],this.velY[t]=this.velY[i],this.velZ[t]=this.velZ[i],this.life[t]=this.life[i],this.maxLife[t]=this.maxLife[i],this.particleSize[t]=this.particleSize[i],this.colorR[t]=this.colorR[i],this.colorG[t]=this.colorG[i],this.colorB[t]=this.colorB[i],this.activeCount--;continue}this.velY[t]-=80*e,this.posX[t]+=this.velX[t]*e,this.posY[t]+=this.velY[t]*e,this.posZ[t]+=this.velZ[t]*e;const s=t*3;this.positionBuffer[s]=this.posX[t],this.positionBuffer[s+1]=this.posY[t],this.positionBuffer[s+2]=this.posZ[t],this.colorBuffer[s]=this.colorR[t],this.colorBuffer[s+1]=this.colorG[t],this.colorBuffer[s+2]=this.colorB[t],this.sizeBuffer[t]=this.particleSize[t]*(this.life[t]/this.maxLife[t]),t++}this.geometry.setDrawRange(0,this.activeCount),this.activeCount>0&&(this.posAttr.addUpdateRange(0,this.activeCount*3),this.colorAttr.addUpdateRange(0,this.activeCount*3),this.sizeAttr.addUpdateRange(0,this.activeCount),this.posAttr.needsUpdate=!0,this.sizeAttr.needsUpdate=!0,this.colorAttr.needsUpdate=!0)}dispose(){this.scene.remove(this.points),this.geometry.dispose(),this.points.material.dispose()}}const tr=.08,fs=.12,us=.15,sr=.2,ir=35,xs=4,ar=6,rr=new Wi(1,.3,4,32),or=2,Ge=[];function nr(a){for(const e of Ge)e.light.parent!==a&&a.add(e.light);for(;Ge.length<or;){const e=new Vs(16772795,0,120);a.add(e),Ge.push({light:e,inUse:!1})}}function lr(){const a=Ge.find(e=>!e.inUse);return a?(a.inUse=!0,a.light):null}function gs(a){a.intensity=0;const e=Ge.find(t=>t.light===a);e&&(e.inUse=!1)}class bs{constructor(e,t,s,i){c(this,"done",!1);c(this,"elapsed",0);c(this,"lightningLines",[]);c(this,"ringMesh");c(this,"pointLight");c(this,"lightningDisposed",!1);c(this,"lightDisposed",!1);c(this,"ringDisposed",!1);this.scene=e;const r=2;i.emitTeleportSparks(t,r,s);const o=xs+Math.floor(Math.random()*(ar-xs+1));for(let l=0;l<o;l++){const d=Math.random()*Math.PI*2,p=15+Math.random()*25,h=p*(.3+Math.random()*.4),f=(Math.random()-.5)*12,u=[new U(t,r+Math.random()*6,s),new U(t+Math.cos(d)*h+f,r+3+Math.random()*8,s+Math.sin(d)*h+f),new U(t+Math.cos(d)*p,r+Math.random()*5,s+Math.sin(d)*p)],g=new Qe().setFromPoints(u),m=new Dt({color:16766720,transparent:!0,opacity:.6}),v=new $t(g,m);this.scene.add(v),this.lightningLines.push(v)}const n=new Y({color:16766720,transparent:!0,opacity:.4,side:Ue});this.ringMesh=new z(rr,n),this.ringMesh.rotation.x=-Math.PI/2,this.ringMesh.position.set(t,1,s),this.ringMesh.scale.setScalar(.01),this.scene.add(this.ringMesh),nr(e),this.pointLight=lr(),this.pointLight&&(this.pointLight.position.set(t,20,s),this.pointLight.intensity=1)}update(e){if(!this.done){if(this.elapsed+=e,!this.lightningDisposed&&this.elapsed>=tr){for(const t of this.lightningLines)this.scene.remove(t),t.geometry.dispose(),t.material.dispose();this.lightningLines.length=0,this.lightningDisposed=!0}if(!this.lightDisposed&&this.pointLight&&(this.elapsed>=fs?(gs(this.pointLight),this.pointLight=null,this.lightDisposed=!0):this.pointLight.intensity=1*(1-this.elapsed/fs)),!this.ringDisposed)if(this.elapsed>=us)this.scene.remove(this.ringMesh),this.ringMesh.material.dispose(),this.ringDisposed=!0;else{const t=this.elapsed/us;this.ringMesh.scale.setScalar(ir*t),this.ringMesh.material.opacity=.4*(1-t)}this.elapsed>=sr&&(this.done=!0)}}dispose(){if(!this.lightningDisposed){for(const e of this.lightningLines)this.scene.remove(e),e.geometry.dispose(),e.material.dispose();this.lightningLines.length=0}!this.lightDisposed&&this.pointLight&&(gs(this.pointLight),this.pointLight=null),this.ringDisposed||(this.scene.remove(this.ringMesh),this.ringMesh.material.dispose()),this.done=!0}}const st={none:16777215,burn:16737792,freeze:6737151,poison:4513092},It=new Nt(1,8,8),ci=new Le(18,4,4),di=new Qe().setFromPoints([new U(-9,0,0),new U(-15,0,0)]),pi=new Le(2,14,2),hi=new Zs(50,58,32),mi=new Nt(25,6,6),fi=new Y({color:16737792}),ui=new Y({color:16720384,transparent:!0,opacity:.25}),xi=new Y({color:16729088}),gi=new Dt({color:16729088,transparent:!0,opacity:.4}),cr=new Set([It,ci,di,pi,hi,mi]),Wt=new Set([fi,ui,xi,gi]),vs=new Map,ys=new Map;function dr(a){let e=vs.get(a);return e||(e=new Y({color:a}),vs.set(a,e),Wt.add(e)),e}function pr(a){let e=ys.get(a);return e||(e=new Dt({color:a,transparent:!0,opacity:.5}),ys.set(a,e),Wt.add(e)),e}function F(a){a.traverse(e=>{const t=e;if(t.geometry&&!cr.has(t.geometry)&&t.geometry.dispose(),t.material){const s=Array.isArray(t.material)?t.material:[t.material];for(const i of s)Wt.has(i)||i.dispose()}})}class hr{constructor(e,t){c(this,"fireballs",new Map);c(this,"arrows",new Map);c(this,"fireWalls",new Map);c(this,"meteors",new Map);c(this,"rainOfArrows",new Map);c(this,"rainZoneArrows",new Map);c(this,"particles");c(this,"prevFireballPositions",new Map);c(this,"clock",new Us);c(this,"elapsedTime",0);c(this,"teleportEffects",[]);c(this,"arrowElement","none");c(this,"emitAccumulator",0);c(this,"shouldEmitContinuous",!0);this.scene=e,this.myId=t,this.particles=new er(e)}setArrowElement(e){this.arrowElement=e}setMyId(e){this.myId=e}createFallingArrows(e,t,s,i=16){const r=st[this.arrowElement],o=new Pe,n=new Y({color:r,transparent:!0,opacity:.7}),l=[];for(let d=0;d<i;d++){const p=Math.random()*Math.PI*2,h=Math.sqrt(Math.random())*s,f=new z(pi,n);f.position.set(Math.cos(p)*h,0,Math.sin(p)*h),f.rotation.x=(Math.random()-.5)*.3,f.rotation.z=(Math.random()-.5)*.3,o.add(f),l.push(Math.random())}return o.position.set(e,0,t),this.scene.add(o),{arrowGroup:o,arrowMaterial:n,arrowPhases:l,spawnTime:this.elapsedTime}}updateFallingArrows(e){const t=this.elapsedTime-e.spawnTime,s=250,i=.35,r=e.arrowGroup.children;for(let o=0;o<e.arrowPhases.length;o++){const n=(t/i+e.arrowPhases[o])%1;r[o].position.y=s*(1-n)}}detectTeleports(e){for(const t of Object.values(e.players))t.teleported&&(this.teleportEffects.push(new bs(this.scene,t.teleported.x,t.teleported.y,this.particles)),this.teleportEffects.push(new bs(this.scene,t.position.x,t.position.y,this.particles)))}update(e){const t=this.clock.getDelta();this.elapsedTime+=t,this.emitAccumulator+=t,this.shouldEmitContinuous=this.emitAccumulator>=1/60,this.shouldEmitContinuous&&(this.emitAccumulator%=1/60),this.detectTeleports(e),this.syncFireballs(e),this.syncArrows(e),this.syncFireWalls(e),this.syncMeteors(e),this.syncRainOfArrows(e),this.particles.update(t);for(let s=this.teleportEffects.length-1;s>=0;s--)this.teleportEffects[s].update(t),this.teleportEffects[s].done&&this.teleportEffects.splice(s,1)}syncFireballs(e){const t=new Set(e.projectiles.filter(s=>s.type==="fireball").map(s=>s.id));for(const[s,i]of this.fireballs)if(!t.has(s)){const r=this.prevFireballPositions.get(s);r&&this.particles.emitExplosion(r.x,r.y,r.z,r.radius),this.scene.remove(i),F(i),this.fireballs.delete(s),this.prevFireballPositions.delete(s)}for(const s of e.projectiles){if(s.type!=="fireball")continue;if(!this.fireballs.has(s.id)){const h=s.radius??10,f=new z(It,fi);f.scale.setScalar(h*.8);const u=new z(It,ui);u.scale.setScalar(1.4/.8),f.add(u),this.scene.add(f),this.fireballs.set(s.id,f)}const i=this.fireballs.get(s.id),r=s.position.x,o=30,n=s.position.y;i.position.set(r,o,n);const l=this.prevFireballPositions.get(s.id);let d=0,p=0;if(l){const h=r-l.x,f=n-l.z,u=Math.sqrt(h*h+f*f);u>0&&(d=h/u,p=f/u)}this.shouldEmitContinuous&&this.particles.emitTrail(r,o,n,d,p,s.radius??10),this.prevFireballPositions.set(s.id,{x:r,y:o,z:n,radius:s.blastRadius??s.radius??10})}}syncArrows(e){const t=new Set(e.projectiles.filter(s=>s.type==="arrow").map(s=>s.id));for(const[s,i]of this.arrows)t.has(s)||(this.scene.remove(i.mesh),F(i.mesh),this.arrows.delete(s));for(const s of e.projectiles){if(s.type!=="arrow")continue;if(!this.arrows.has(s.id)){const h=new Pe,f=s.ownerId===this.myId?st[this.arrowElement]:16777215,u=new z(ci,dr(f));h.add(u);const g=new $t(di,pr(f));h.add(g),this.scene.add(h),this.arrows.set(s.id,{mesh:h})}const i=this.arrows.get(s.id),r=s.position.x,o=30,n=s.position.y;i.mesh.position.set(r,o,n);const l=s.velocity.x,d=s.velocity.y,p=Math.atan2(d,l);i.mesh.rotation.set(-Math.PI/2,0,-p)}}syncFireWalls(e){const t=new Set(e.fireWalls.map(s=>s.id));for(const[s,i]of this.fireWalls)if(!t.has(s)){this.scene.remove(i),F(i),this.fireWalls.delete(s);const r=this.rainZoneArrows.get(s);r&&(this.scene.remove(r.arrowGroup),F(r.arrowGroup),this.rainZoneArrows.delete(s))}for(const s of e.fireWalls){const i=s.id.startsWith("rain_zone_");if(!this.fireWalls.has(s.id)){const r=new Pe;if(s.shape==="circle"&&s.center&&s.radius){const o=new z(new Lt(s.radius,32),new Y({color:i?st[this.arrowElement]:16720384,transparent:!0,opacity:i?.15:.2,side:Ue}));o.rotation.x=-Math.PI/2,o.position.set(s.center.x,1,s.center.y),r.add(o),i&&this.rainZoneArrows.set(s.id,this.createFallingArrows(s.center.x,s.center.y,s.radius,12))}else for(const o of s.segments){const n=[new U(o.x1,1,o.y1),new U(o.x2,1,o.y2)],l=new $t(new Qe().setFromPoints(n),gi);r.add(l)}this.scene.add(r),this.fireWalls.set(s.id,r)}if(s.shape==="circle"&&s.center&&s.radius)if(i){const r=this.rainZoneArrows.get(s.id);r&&this.updateFallingArrows(r)}else this.shouldEmitContinuous&&this.particles.emitCrater(s.center.x,s.center.y,s.radius);else this.shouldEmitContinuous&&this.particles.emitWall(s.segments)}}syncMeteors(e){const t=new Set(e.meteors.map(s=>s.id));for(const[s,i]of this.meteors)t.has(s)||(this.scene.remove(i.ring),this.scene.remove(i.rock),F(i.ring),F(i.rock),this.particles.emitMeteorImpact(i.target.x,0,i.target.y),this.meteors.delete(s));for(const s of e.meteors){if(!this.meteors.has(s.id)){const f=s.aoeRadius/ha,u=new z(hi,new Y({color:16720384,transparent:!0,opacity:.6,side:Ue}));u.rotation.x=-Math.PI/2,u.position.set(s.target.x,2,s.target.y);const g=new z(mi,xi);this.scene.add(u),this.scene.add(g),this.meteors.set(s.id,{ring:u,rock:g,target:{...s.target},spawnTime:this.elapsedTime,sizeScale:f})}const i=this.meteors.get(s.id),r=!s.hidden||s.ownerId===this.myId;i.ring.visible=r,i.rock.visible=r;const o=Math.max(0,Math.min(1,1-(s.strikeAt-e.tick)/pa)),n=1-o*.4;i.ring.scale.setScalar(n*i.sizeScale);const l=this.elapsedTime-i.spawnTime,d=.5+o*2;i.ring.material.opacity=Math.sin(l*d*Math.PI*2)*.3+.5;const p=500*(1-o);i.rock.position.set(s.target.x,p,s.target.y);const h=.4+o*.6;i.rock.scale.setScalar(h*i.sizeScale),this.shouldEmitContinuous&&r&&this.particles.emitMeteorTrail(s.target.x,p,s.target.y)}}syncRainOfArrows(e){const t=new Set(e.rainOfArrows.map(s=>s.id));for(const[s,i]of this.rainOfArrows)t.has(s)||(this.scene.remove(i.circle),this.scene.remove(i.arrowGroup),F(i.circle),F(i.arrowGroup),this.particles.emitRainImpact(i.target.x,0,i.target.y,i.radius),this.rainOfArrows.delete(s));for(const s of e.rainOfArrows){if(!this.rainOfArrows.has(s.id)){const o=st[this.arrowElement],n=new z(new Lt(s.radius,48),new Y({color:o,transparent:!0,opacity:.12,side:Ue}));n.rotation.x=-Math.PI/2,n.position.set(s.target.x,1,s.target.y),this.scene.add(n);const l=this.createFallingArrows(s.target.x,s.target.y,s.radius);l.arrowMaterial.opacity=0,this.rainOfArrows.set(s.id,{circle:n,target:{...s.target},radius:s.radius,...l})}const i=this.rainOfArrows.get(s.id),r=Math.max(0,Math.min(1,1-(s.strikeAt-e.tick)/ma));i.circle.material.opacity=.12+r*.23,i.arrowMaterial.opacity=Math.min(1,r*2),this.updateFallingArrows(i)}}dispose(){for(const e of this.fireballs.values())this.scene.remove(e),F(e);for(const e of this.arrows.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.fireWalls.values())this.scene.remove(e),F(e);for(const e of this.rainZoneArrows.values())this.scene.remove(e.arrowGroup),F(e.arrowGroup);this.rainZoneArrows.clear();for(const e of this.meteors.values())this.scene.remove(e.ring),this.scene.remove(e.rock),F(e.ring),F(e.rock);for(const e of this.rainOfArrows.values())this.scene.remove(e.circle),this.scene.remove(e.arrowGroup),F(e.circle),F(e.arrowGroup);for(const e of this.teleportEffects)e.dispose();this.fireballs.clear(),this.arrows.clear(),this.fireWalls.clear(),this.meteors.clear(),this.rainOfArrows.clear(),this.teleportEffects.length=0,this.particles.dispose()}}const bi=1e3/Je,kt=2*bi,mr=250;class fr{constructor(){c(this,"snapshots",[]);c(this,"maxSnapshots",32);c(this,"clockOffset",null);c(this,"jitter",0);c(this,"renderDelayMs",kt);c(this,"outOfBandCount",0)}push(e,t=performance.now()){const s=e.tick*bi,i=t-s;this.clockOffset===null?this.clockOffset=i:Math.abs(i-this.clockOffset)>mr?(this.outOfBandCount++,this.outOfBandCount>=2&&(this.clockOffset=i,this.jitter=0,this.outOfBandCount=0)):(this.outOfBandCount=0,this.jitter=this.jitter*.9+Math.abs(i-this.clockOffset)*.1,this.clockOffset=this.clockOffset*.95+i*.05),this.renderDelayMs=kt+this.jitter*2,this.snapshots.push({state:e,tickTime:s}),this.snapshots.length>this.maxSnapshots&&this.snapshots.shift()}getInterpolated(e=performance.now()){if(this.snapshots.length<2||this.clockOffset===null)return null;const t=e-this.clockOffset-this.renderDelayMs;let s=0;for(;s<this.snapshots.length-1&&!(this.snapshots[s+1].tickTime>=t);s++);s=Math.max(0,Math.min(s,this.snapshots.length-2));const i=this.snapshots[s],r=this.snapshots[s+1],o=r.tickTime-i.tickTime,n=o>0?Math.max(0,Math.min(1,(t-i.tickTime)/o)):1,l={};for(const d of Object.keys(r.state.players)){const p=i.state.players[d],h=r.state.players[d];if(!p){l[d]=h;continue}l[d]={...h,position:ur(p.position,h.position,n),facing:xr(p.facing,h.facing,n)}}return{...r.state,players:l}}getLatest(){return this.snapshots.length===0?null:this.snapshots[this.snapshots.length-1].state}clear(){this.snapshots=[],this.clockOffset=null,this.jitter=0,this.renderDelayMs=kt,this.outOfBandCount=0}}function ur(a,e,t){return{x:a.x+(e.x-a.x)*t,y:a.y+(e.y-a.y)*t}}function xr(a,e,t){let s=e-a;for(;s>Math.PI;)s-=2*Math.PI;for(;s<-Math.PI;)s+=2*Math.PI;return a+s*t}const gr=30,br=.5,vr=100;class yr{constructor(e){c(this,"position");c(this,"prevPosition");c(this,"seq",0);c(this,"buffer",[]);c(this,"correctionOffset",{x:0,y:0});c(this,"correctionStartTime",0);c(this,"correctionDurationMs",vr);this.position={...e},this.prevPosition={...e}}applyInput(e,t,s={}){this.seq++,this.prevPosition={...this.position};const i=s.speedMult??1;return this.position=rs(this.position,e,i),s.teleportTarget&&(this.position=as(this.position,s.teleportTarget,s.teleportRange),this.prevPosition={...this.position}),this.buffer.push({seq:this.seq,move:e,speedMult:i,teleportTarget:s.teleportTarget,teleportRange:s.teleportRange}),this.seq}reconcile(e,t){if(this.buffer=this.buffer.filter(n=>n.seq>t),this.buffer.length>gr){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0};return}let s={...e};for(const n of this.buffer)s=rs(s,n.move,n.speedMult),n.teleportTarget&&(s=as(s,n.teleportTarget,n.teleportRange));const i=s.x-this.position.x,r=s.y-this.position.y;if(Math.sqrt(i*i+r*r)>br){const n=performance.now(),l=this.getRenderPosition(1,n),d=this.position.x-this.prevPosition.x,p=this.position.y-this.prevPosition.y;this.correctionOffset={x:l.x-s.x,y:l.y-s.y},this.correctionStartTime=n,this.prevPosition={x:s.x-d,y:s.y-p},this.position=s}}getPosition(e=performance.now()){return this.getRenderPosition(1,e)}getRenderPosition(e,t=performance.now()){const s=Math.max(0,Math.min(1,e)),i={x:this.prevPosition.x+(this.position.x-this.prevPosition.x)*s,y:this.prevPosition.y+(this.position.y-this.prevPosition.y)*s};if(this.correctionOffset.x===0&&this.correctionOffset.y===0)return i;const r=t-this.correctionStartTime,n=1-Math.min(1,r/this.correctionDurationMs);return{x:i.x+this.correctionOffset.x*n,y:i.y+this.correctionOffset.y*n}}reset(e){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0}}getSeq(){return this.seq}}class wr{constructor(){c(this,"socket");this.socket=Xi("",{autoConnect:!1,transports:["websocket"]})}connect(){this.socket.connect()}disconnect(){this.socket.removeAllListeners(),this.socket.disconnect()}joinRoom(e,t,s,i,r){this.socket.emit("join-room",{roomId:e,displayName:t,accessToken:s,teamId:i,characterId:r})}ready(){this.socket.emit("player-ready")}sendInput(e){this.socket.emit("input",e)}rematch(){this.socket.emit("rematch")}sendChatMessage(e){this.socket.emit("chat-message",{text:e})}rejoinRoom(e,t){this.socket.emit("rejoin-room",{roomId:e,accessToken:t})}leavePausedMatch(){this.socket.emit("leave-paused-match")}onRoomJoined(e){this.socket.once("room-joined",e)}onPlayerJoined(e){this.socket.on("player-joined",e)}onGameReady(e){this.socket.once("game-ready",e)}onGameState(e){this.socket.off("game-state"),this.socket.on("game-state",e)}onDuelEnded(e){this.socket.off("duel-ended"),this.socket.on("duel-ended",e)}onRematchReady(e){this.socket.off("rematch-ready"),this.socket.on("rematch-ready",e)}onRematchRequested(e){this.socket.off("rematch-requested"),this.socket.on("rematch-requested",e)}onOpponentDisconnected(e){this.socket.off("opponent-disconnected"),this.socket.on("opponent-disconnected",e)}onTeamFull(e){this.socket.once("team-full",e)}onPlayerDisconnected(e){this.socket.on("player-disconnected",e)}onPlayerLeft(e){this.socket.on("player-left",e)}onRoomNotFound(e){this.socket.off("room-not-found"),this.socket.on("room-not-found",e)}onChatMessage(e){this.socket.off("chat-message"),this.socket.on("chat-message",e)}onPlayerReadyAck(e){this.socket.off("player-ready-ack"),this.socket.on("player-ready-ack",e)}onMatchPaused(e){this.socket.off("match-paused"),this.socket.on("match-paused",e)}onGameResumed(e){this.socket.off("game-resumed"),this.socket.on("game-resumed",e)}onRejoinAccepted(e){this.socket.off("rejoin-accepted"),this.socket.once("rejoin-accepted",e)}onRejoinFailed(e){this.socket.off("rejoin-failed"),this.socket.once("rejoin-failed",e)}onReconnect(e){this.socket.on("connect",e)}onDisconnect(e){this.socket.on("disconnect",e)}get id(){return this.socket.id??""}}const vi=-Math.PI/4,ws=Math.cos(vi),ks=Math.sin(vi);class kr{constructor(e,t){c(this,"keys",new Set);c(this,"activeSpell",1);c(this,"charClass","mage");c(this,"mouseScreen",{x:0,y:0});c(this,"mouseWorld",{x:1e3,y:1e3});c(this,"pendingCast",null);c(this,"onKeyDown",e=>{this.keys.add(e.code);const t=/^Digit([1-4])$/.exec(e.code);if(t){const s=this.spellForKey(Number(t[1]));s&&(this.activeSpell=s)}if(e.code==="Space"){e.preventDefault();const s=this.spellForKey(4);s&&(this.pendingCast={spell:s,aimTarget:this.mouseWorld})}});c(this,"onKeyUp",e=>{this.keys.delete(e.code)});c(this,"onBlur",()=>{this.keys.clear()});c(this,"onMouseMove",e=>{this.mouseScreen={x:e.clientX,y:e.clientY},this.mouseWorld=this.scene.screenToWorld(e.clientX,e.clientY)});c(this,"onMouseDown",e=>{});c(this,"onMouseUp",e=>{e.button===0&&(this.pendingCast={spell:this.activeSpell,aimTarget:this.mouseWorld})});this.scene=e,this.canvas=t,window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur),window.addEventListener("contextmenu",this.onBlur),t.addEventListener("mousemove",this.onMouseMove),t.addEventListener("mousedown",this.onMouseDown),t.addEventListener("mouseup",this.onMouseUp)}spellForKey(e){var t;return((t=xt.find(s=>s.charClass===this.charClass&&s.key===e))==null?void 0:t.spell)??null}buildInputFrame(){const e={x:0,y:0};(this.keys.has("KeyW")||this.keys.has("ArrowUp"))&&(e.y-=1),(this.keys.has("KeyS")||this.keys.has("ArrowDown"))&&(e.y+=1),(this.keys.has("KeyA")||this.keys.has("ArrowLeft"))&&(e.x-=1),(this.keys.has("KeyD")||this.keys.has("ArrowRight"))&&(e.x+=1);const t=e.x*ws-e.y*ks,s=e.x*ks+e.y*ws;e.x=t,e.y=s;const i={move:e,castSpell:null,aimTarget:this.mouseWorld};return this.pendingCast&&(i.castSpell=this.pendingCast.spell,i.aimTarget=this.pendingCast.aimTarget,this.pendingCast=null),i}refreshMouseWorld(){this.mouseWorld=this.scene.screenToWorld(this.mouseScreen.x,this.mouseScreen.y)}setCharacterClass(e){this.charClass=e==="ranger"?"ranger":"mage",this.activeSpell=this.spellForKey(1)??1}getActiveSpell(){return this.activeSpell}getCurrentMouseWorld(){return this.mouseWorld}dispose(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),window.removeEventListener("contextmenu",this.onBlur),this.canvas.removeEventListener("mousemove",this.onMouseMove),this.canvas.removeEventListener("mousedown",this.onMouseDown),this.canvas.removeEventListener("mouseup",this.onMouseUp)}}const J=120;function St(a,e){const t=J/2+(a-e)*J/(2*$),s=(a+e)*J/(2*$);return[t,s]}class Sr{constructor(e){c(this,"canvas");c(this,"ctx");this.canvas=document.createElement("canvas"),this.canvas.width=J,this.canvas.height=J,Object.assign(this.canvas.style,{position:"fixed",top:"12px",right:"12px",opacity:"0.85",border:"none",borderRadius:"0",boxShadow:"0 0 0 2px var(--px-border-dark),0 0 0 4px var(--px-border-light)",imageRendering:"pixelated",zIndex:"100",display:"none"}),e.appendChild(this.canvas),this.ctx=this.canvas.getContext("2d")}update(e,t){const s=this.ctx;s.clearRect(0,0,J,J),s.fillStyle="#0a0a1a",s.fillRect(0,0,J,J),s.strokeStyle="#333",s.lineWidth=1,s.strokeRect(0,0,J,J),s.fillStyle="#6c63ff";for(const n of je){const[l,d]=St(n.x,n.y);s.fillRect(l-2,d-2,4,4)}const i=["#ff5252","#ff9800","#ab47bc"];for(let n=0;n<t.length;n++){const l=t[n];if(l.hp<=0)continue;const[d,p]=St(l.position.x,l.position.y);s.fillStyle=i[n%i.length],s.beginPath(),s.arc(d,p,3,0,Math.PI*2),s.fill()}const[r,o]=St(e.position.x,e.position.y);s.fillStyle="#00e676",s.beginPath(),s.arc(r,o,3,0,Math.PI*2),s.fill()}show(){this.canvas.style.display=""}hide(){this.canvas.style.display="none"}}const _r={1:"fa-fire",2:"fa-fire-flame-simple",3:"fa-meteor",4:"fa-wand-magic",5:"fa-bullseye",6:"fa-arrows-split-up-and-left",7:"fa-cloud-rain",8:"fa-person-running"},Mr={1:"#ff8c42",2:"#ff8c42",3:"#ff8c42",4:"#b48cff",5:"#8cd97a",6:"#8cd97a",7:"#8cd97a",8:"#b48cff"},_t="polygon(37.5% 0%,62.5% 0%,75% 6.25%,87.5% 12.5%,93.75% 25%,100% 37.5%,100% 62.5%,93.75% 75%,87.5% 87.5%,75% 93.75%,62.5% 100%,37.5% 100%,25% 93.75%,12.5% 87.5%,6.25% 75%,0% 62.5%,0% 37.5%,6.25% 25%,12.5% 12.5%,25% 6.25%)";class Cr{constructor(e){c(this,"el");c(this,"minimap");c(this,"myId","");c(this,"prevHp",{});c(this,"hpFill");c(this,"mpFill");c(this,"hpOrb");c(this,"hpNum");c(this,"mpNum");c(this,"spellsEl");c(this,"enemiesEl");c(this,"slotEls",new Map);c(this,"enemyRows",new Map);c(this,"lastHpPct",-1);c(this,"lastMpPct",-1);c(this,"lastHpText","");c(this,"lastMpText","");c(this,"lastLowPulse",!1);this.minimap=new Sr(e),this.el=document.createElement("div"),this.el.innerHTML=`
      <style>
        .hud-dock{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:18px;pointer-events:none}
        /* --- orbs --- */
        .orb-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
        .orb{width:88px;height:88px;position:relative;clip-path:${_t};background:var(--px-border-dark);}
        .orb-inner{position:absolute;inset:5px;clip-path:${_t};background:#120e1c;overflow:hidden}
        .orb-fill{position:absolute;inset:0;transition:transform .12s}
        .orb-fill::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.35)}
        .orb-hp .orb-fill{background:linear-gradient(180deg,#e0524a 0%,#b32e2e 45%,#7d1c22 100%)}
        .orb-mp .orb-fill{background:linear-gradient(180deg,#4a7ce0 0%,#2e50b3 45%,#1c2f7d 100%)}
        .orb-shine{position:absolute;top:12%;left:18%;width:26%;height:16%;background:rgba(255,255,255,0.22);clip-path:${_t};pointer-events:none}
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
    `,e.appendChild(this.el),this.hpFill=this.el.querySelector("#hud-hp"),this.mpFill=this.el.querySelector("#hud-mp"),this.hpOrb=this.el.querySelector("#hud-hp-orb"),this.hpNum=this.el.querySelector("#hud-hp-num"),this.mpNum=this.el.querySelector("#hud-mp-num"),this.spellsEl=this.el.querySelector("#hud-spells"),this.enemiesEl=this.el.querySelector("#hud-enemies")}init(e){this.myId=e,this.prevHp={},this.enemiesEl.textContent="",this.enemyRows.clear(),this.lastHpPct=-1,this.lastMpPct=-1}buildSpellSlots(e){this.spellsEl.textContent="",this.slotEls.clear();for(const t of xt){if(!e.has(t.spell))continue;const s=document.createElement("div");s.className="spell-slot",s.innerHTML=`
        <i class="fa ${_r[t.spell]??"fa-star"} fa-fw slot-icon" style="color:${Mr[t.spell]??"var(--px-text)"}"></i>
        <span class="slot-key">${t.key}</span>
        <div class="cd-overlay" style="height:0%"></div>
        <span class="cd-time"></span>`,this.spellsEl.appendChild(s),this.slotEls.set(t.spell,{slot:s,cd:s.querySelector(".cd-overlay"),cdTime:s.querySelector(".cd-time"),lastPct:0,lastActive:!1,lastNoMana:!1,lastCdText:""})}}update(e,t){const s=e.players[this.myId];if(!s)return;const i=s.maxHp??At,r=s.maxMana??ti,o=Math.round((1-s.hp/i)*1e3)/10;o!==this.lastHpPct&&(this.hpFill.style.transform=`translateY(${o}%)`,this.lastHpPct=o);const n=Math.round((1-s.mana/r)*1e3)/10;n!==this.lastMpPct&&(this.mpFill.style.transform=`translateY(${n}%)`,this.lastMpPct=n);const l=String(Math.max(0,Math.ceil(s.hp)));l!==this.lastHpText&&(this.hpNum.textContent=l,this.lastHpText=l);const d=String(Math.max(0,Math.floor(s.mana)));d!==this.lastMpText&&(this.mpNum.textContent=d,this.lastMpText=d);const p=s.hp>0&&s.hp/i<.3;p!==this.lastLowPulse&&(this.hpOrb.classList.toggle("low-pulse",p),this.lastLowPulse=p);for(const[g,m]of this.slotEls){const v=g===t;v!==m.lastActive&&(m.slot.classList.toggle("active",v),m.lastActive=v);const A=s.cooldowns[g]??0,P=mt[g].cooldownTicks,E=P>0?Math.round(A/P*1e3)/10:0;E!==m.lastPct&&(m.cd.style.height=`${E}%`,m.slot.classList.toggle("cooling",E>0),m.lastPct=E);const y=A>0?(A/60).toFixed(1):"";y!==m.lastCdText&&(m.cdTime.textContent=y,m.lastCdText=y);const S=s.mana<mt[g].manaCost;S!==m.lastNoMana&&(m.slot.classList.toggle("nomana",S),m.lastNoMana=S)}const h=[],f=new Set;for(const[g,m]of Object.entries(e.players)){if(g===this.myId)continue;f.add(g),h.push(m);let v=this.enemyRows.get(g);if(!v){const P=document.createElement("div");P.className="hud-enemy-entry";const E=document.createElement("div");E.className="enemy-name";const y=document.createElement("div");y.className="enemy-hp-track";const S=document.createElement("div");S.className="enemy-hp-fill",y.appendChild(S),P.append(E,y),this.enemiesEl.appendChild(P),v={row:P,name:E,fill:S,lastHp:-1,lastName:"",flashTimer:0},this.enemyRows.set(g,v)}m.displayName!==v.lastName&&(v.name.textContent=m.displayName,v.lastName=m.displayName),m.hp!==v.lastHp&&(v.lastHp>=0&&m.hp<v.lastHp&&(v.row.classList.add("hit"),clearTimeout(v.flashTimer),v.flashTimer=window.setTimeout(()=>v.row.classList.remove("hit"),140)),v.fill.style.width=`${m.hp/(m.maxHp??At)*100}%`,v.row.style.opacity=m.hp<=0?"0.3":"1",v.lastHp=m.hp);const A=this.prevHp[g];A!==void 0&&A>0&&m.hp<=0&&this.showElimination(m.displayName)}for(const[g,m]of this.enemyRows)f.has(g)||(m.row.remove(),this.enemyRows.delete(g));const u={};for(const[g,m]of Object.entries(e.players))u[g]=m.hp;this.prevHp=u,this.minimap.update(s,h)}showElimination(e){const t=document.createElement("div");t.className="hud-elim",t.textContent=`${e} eliminated`,this.el.appendChild(t),setTimeout(()=>t.remove(),2e3)}show(){this.el.style.display="",this.minimap.show()}hide(){this.el.style.display="none",this.minimap.hide()}}const Er="https://ulekuozamvhluojthxrh.supabase.co",Tr="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWt1b3phbXZobHVvanRoeHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjYxMzgsImV4cCI6MjA5MjE0MjEzOH0.lkYBXt9xjNrPFXg8vOMDntT1Qdw98NHjSH8-fi2BavU",w=Zi(Er,Tr),Yt="";async function Lr(){const{data:{user:a}}=await w.auth.getUser();if(!a)return null;const{data:e}=await w.from("profiles").select("username, matches_played, matches_won, is_admin").eq("user_id",a.id).single();return e??null}async function ct(){const{data:{user:a}}=await w.auth.getUser();if(!a)return[];const{data:e}=await w.from("characters").select("*").eq("user_id",a.id).order("created_at",{ascending:!0});return(e??[]).map(t=>({...t,class:ht(t.class)}))}async function $r(a,e,t){const{data:{user:s}}=await w.auth.getUser();if(!s)return null;const{data:i,error:r}=await w.rpc("create_character",{p_user_id:s.id,p_name:a,p_class:e});if(r)return console.error("create_character failed:",r.message),null;const o=i;if(t)try{await yi(o,t)}catch(l){console.warn("set initial appearance failed:",l instanceof Error?l.message:l)}const n=jt[ht(e)];for(const l of n?[n]:[]){const{error:d}=await w.rpc("unlock_skill_node",{p_character_id:o,p_node_id:l,p_cost:0});d&&console.error(`starter skill ${l} failed:`,d.message)}return o}async function Ar(a){const{data:{user:e}}=await w.auth.getUser();if(!e)return!1;const{error:t}=await w.rpc("delete_character",{p_user_id:e.id,p_character_id:a});return t?(console.error("delete_character failed:",t.message),!1):!0}async function yi(a,e){const{error:t}=await w.rpc("update_appearance",{p_character_id:a,p_appearance:e});if(t)throw t}async function wi(){const{data:{user:a}}=await w.auth.getUser();if(!a)return[];const{data:e,error:t}=await w.from("items").select("id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source").eq("user_id",a.id).order("created_at",{ascending:!1});if(t)return console.error("fetchItems failed:",t.message),[];const s=[];for(const i of e??[]){const r=Gt(i);r?s.push(r):console.warn("fetchItems: dropped invalid item row",i)}return s}async function Pr(a,e,t){const{error:s}=await w.rpc("equip_item",{p_item_id:a,p_character_id:e,p_slot:t});return s?(console.error("equip_item failed:",s.message),!1):!0}async function Rr(a){const{error:e}=await w.rpc("unequip_item",{p_item_id:a});return e?(console.error("unequip_item failed:",e.message),!1):!0}async function Ir(){const{data:a,error:e}=await w.from("items").select("id, user_id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, created_at");return e?(console.error("adminFetchAllItems failed:",e.message),[]):a??[]}async function zr(a,e,t,s,i,r,o){const{data:n,error:l}=await w.rpc("admin_grant_item",{p_user_id:a,p_base_id:e,p_rarity:t,p_affixes:s,p_level_req:i,p_slot:r,p_class_restriction:o??null});return l?(console.error("admin_grant_item failed:",l.message),null):n}async function qr(a){const{error:e}=await w.rpc("admin_delete_item",{p_item_id:a});return e?(console.error("admin_delete_item failed:",e.message),!1):!0}async function Or(){const{data:a,error:e}=await w.from("drop_tables").select("context, weights");return e?(console.error("fetchDropTables failed:",e.message),[]):a??[]}async function Ss(a,e){const{error:t}=await w.rpc("admin_update_drop_table",{p_context:a,p_weights:e});return t?(console.error("admin_update_drop_table failed:",t.message),!1):!0}async function Fr(a){const e=[...new Set(a)];if(e.length===0)return new Map;const{data:t,error:s}=await w.from("profiles").select("user_id, username").in("user_id",e);return s?(console.error("adminFetchUsernames failed:",s.message),new Map):new Map((t??[]).map(i=>[i.user_id,i.username]))}async function Nr(a){const{data:e,error:t}=await w.from("profiles").select("user_id").eq("username",a).maybeSingle();return t?(console.error("adminFindUserByUsername failed:",t.message),null):(e==null?void 0:e.user_id)??null}async function Br(a){const e=[...new Set(a)];if(e.length===0)return new Map;const{data:t,error:s}=await w.from("characters").select("id, name").in("id",e);return s?(console.error("adminFetchCharacterNames failed:",s.message),new Map):new Map((t??[]).map(i=>[i.id,i.name]))}async function Vt(){const{data:{user:a}}=await w.auth.getUser();if(!a)return 0;const{data:e,error:t}=await w.from("profiles").select("gold").eq("user_id",a.id).single();return t?(console.error("fetchGold failed:",t.message),0):(e==null?void 0:e.gold)??0}async function Dr(a){const{data:e,error:t}=await w.rpc("sell_item",{p_item_id:a});return t?(console.error("sell_item failed:",t.message),null):e}async function Hr(){const{data:{session:a}}=await w.auth.getSession();if(!a)return null;try{const e=await fetch(`${Yt}/economy/vendor`,{headers:{Authorization:`Bearer ${a.access_token}`}});return e.ok?await e.json():(console.error("fetchVendorView failed:",e.status),null)}catch(e){return console.error("fetchVendorView failed:",e),null}}async function Ur(a){const{data:{session:e}}=await w.auth.getSession();if(!e)return{ok:!1,status:401,error:"not signed in"};try{const t=await fetch(`${Yt}/economy/vendor/buy`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.access_token}`},body:JSON.stringify({slotIndex:a})}),s=await t.json().catch(()=>({}));if(!t.ok){const r=typeof(s==null?void 0:s.error)=="string"?s.error:"purchase failed";return console.error("buyVendorSlot failed:",t.status,r),{ok:!1,status:t.status,error:r}}const i=Gt(s.item);return i?{ok:!0,item:i}:(console.error("buyVendorSlot: server item failed validation",s.item),{ok:!1,status:500,error:"invalid item from server"})}catch(t){return console.error("buyVendorSlot failed:",t),{ok:!1,status:0,error:"network error"}}}async function jr(a){const{data:{session:e}}=await w.auth.getSession();if(!e)return{ok:!1,status:401,error:"not signed in"};try{const t=await fetch(`${Yt}/economy/lootbox/open`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.access_token}`},body:JSON.stringify({tier:a})}),s=await t.json().catch(()=>({}));if(!t.ok){const r=typeof(s==null?void 0:s.error)=="string"?s.error:"lootbox open failed";return console.error("openLootbox failed:",t.status,r),{ok:!1,status:t.status,error:r}}const i=Gt(s.item);return i?{ok:!0,item:i}:(console.error("openLootbox: server item failed validation",s.item),{ok:!1,status:500,error:"invalid item from server"})}catch(t){return console.error("openLootbox failed:",t),{ok:!1,status:0,error:"network error"}}}function q(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const xe={basic:"#e8dff5",magic:"#4a6fc4",rare:"#ddb84a",unique:"#ffb347"},Gr=["ring1","helmet","ring2","weapon","armor","amulet","leggings"],Wr={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring1:"Ring 1",ring2:"Ring 2",amulet:"Amulet"},Yr={weapon:"fa-khanda",helmet:"fa-helmet-safety",armor:"fa-shirt",leggings:"fa-socks",ring1:"fa-ring",ring2:"fa-ring",amulet:"fa-gem"},Vr={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring:"Ring",amulet:"Amulet"},Xr={max_health:a=>`+${a} Max Health`,max_mana:a=>`+${a} Max Mana`,damage_pct:a=>`+${a}% Damage`,cast_speed_pct:a=>`+${a}% Cast Speed`,move_speed_pct:a=>`+${a}% Move Speed`,mana_regen_pct:a=>`+${a}% Mana Regen`};function _s(a){return a.id==="talent"?`+${a.value} Talent Rank`:Xr[a.id](a.value)}function We(a){return O.find(e=>e.id===a.base_id)}function ki(a){return Te.find(e=>e.baseId===a.base_id)}function Ye(a,e){var t;return a.rarity==="unique"?((t=ki(a))==null?void 0:t.name)??e.name:e.name}function Zr(a){return a.includes("ring1")?(a.includes("ring2"),"ring2"):"ring1"}function Ms(a,e,t){if(e<a.level_req)return{ok:!1,reason:`Requires level ${a.level_req}`};const s=O.find(i=>i.id===a.base_id);return s!=null&&s.classRestriction&&s.classRestriction!==t?{ok:!1,reason:`Restricted to ${s.classRestriction}`}:{ok:!0}}function Cs(a){return a.source==="starter"?{sellable:!1,reason:"Starter gear — cannot be sold"}:{sellable:!0,price:Na(a.rarity,a.level_req)}}const Kr=`
.gr-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.gr-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.gr-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.gr-header{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;max-width:900px;margin-bottom:16px;background:var(--px-panel);padding:12px 18px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);box-sizing:border-box;}
.gr-title{font-size:11px;letter-spacing:0.05em;}
.gr-gold{font-size:14px;color:var(--px-accent);display:flex;align-items:center;gap:6px;white-space:nowrap;}
.gr-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.gr-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.gr-col-doll{flex:0 0 340px;}
.gr-col-side{flex:1 1 380px;min-width:320px;max-width:460px;display:flex;flex-direction:column;gap:14px;}
.gr-doll-label,.gr-stash-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;}
.gr-doll-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-areas:"ring1 helmet ring2" "weapon armor amulet" ". leggings .";gap:10px;}
.gr-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 6px;min-height:96px;cursor:pointer;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-slot:hover{transform:scale(1.04);}
.gr-slot-empty{outline:2px dashed var(--px-border-light);box-shadow:none;cursor:default;color:var(--px-border-light);opacity:0.7;}
.gr-slot-empty:hover{transform:none;}
.gr-slot-icon{font-size:1.3rem;}
.gr-slot-label{font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;color:var(--px-border-light);}
.gr-slot-name{font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;line-height:1.4;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gr-selected{outline:2px solid #fff;outline-offset:2px;}
.gr-stash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:320px;overflow-y:auto;padding:4px;}
.gr-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;cursor:pointer;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-card:hover{transform:scale(1.04);}
.gr-empty{grid-column:1 / -1;color:var(--px-border-light);font-size:15px;text-align:center;padding:20px 0;}
.gr-details{padding:16px 18px;min-height:220px;box-sizing:border-box;}
.gr-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:24px;}
.gr-details-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.gr-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#120e1c;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.gr-details-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.gr-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.04em;}
.gr-flavor{font-size:15px;font-style:italic;color:var(--px-border-light);margin-bottom:8px;line-height:1.4;}
.gr-details-row{font-size:16px;line-height:1.5;color:var(--px-text);}
.gr-dim{color:var(--px-border-light);opacity:0.7;}
.gr-ok{color:var(--px-success);}
.gr-bad{color:var(--px-danger);}
.gr-details-status{margin-top:10px;font-size:16px;}
.gr-sell-price{color:var(--px-accent);margin-top:10px;}
.gr-sell-btn{width:100%;font-size:6px;padding:8px 6px;margin-top:6px;}
.gr-sell-btn:disabled{opacity:0.5;cursor:not-allowed;}
/* confirm modal — mirrors SkillTreeUI's st-confirm-* (Reset Skills), kept
 * as its own gr-prefixed copy rather than reusing st-confirm's classes so
 * GearScreen doesn't depend on another screen's <style> having been
 * injected into the document first. */
.gr-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.gr-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.gr-confirm-title{margin-bottom:8px;}
.gr-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.gr-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.gr-confirm-yes,.gr-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
`;class Qr{constructor(e){c(this,"el");c(this,"items",[]);c(this,"characterId",null);c(this,"charClass","mage");c(this,"charLevel",1);c(this,"selectedId",null);c(this,"closeResolver",null);c(this,"gold",null);c(this,"sellPending",new Set);c(this,"sellErrorById",new Map);const t=document.createElement("style");t.textContent=Kr,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="gr-overlay",e.appendChild(this.el)}async show(e,t,s){this.characterId=e,this.charClass=t,this.charLevel=s,this.selectedId=null,this.sellPending.clear(),this.sellErrorById.clear(),this.el.style.display="block",await this.reload(),await new Promise(i=>{this.closeResolver=i})}hide(){var e;this.el.style.display="none",(e=this.closeResolver)==null||e.call(this),this.closeResolver=null}async reload(){const[e,t]=await Promise.all([wi(),Vt()]);this.items=e,this.gold=t,this.render()}equippedSlots(){return this.items.filter(e=>e.equipped_by===this.characterId&&e.equipped_slot!==null).map(e=>e.equipped_slot)}render(){const e=Gr.map(i=>this.renderDollSlot(i)).join(""),t=this.items.filter(i=>i.equipped_by===null),s=t.length?t.map(i=>this.renderCard(i)).join(""):'<div class="gr-empty">Stash is empty.</div>';this.el.innerHTML=`
      <div class="gr-vignette"></div>
      <div class="gr-ui">
        <div class="gr-header">
          <div class="gr-title px-title">${q(this.charClass)} Lvl ${this.charLevel} — Gear</div>
          <div class="gr-gold"><i class="fa fa-coins"></i> ${this.gold??0}</div>
          <button id="gr-close" class="gr-btn px-btn px-btn-primary">Back to Lobby</button>
        </div>
        <div class="gr-columns">
          <div class="gr-col-doll">
            <div class="gr-doll-label">Equipped</div>
            <div class="gr-doll-grid">${e}</div>
          </div>
          <div class="gr-col-side">
            <div id="gr-details" class="gr-details px-panel"></div>
            <div class="gr-stash-label">Stash (${t.length})</div>
            <div class="gr-stash-grid">${s}</div>
          </div>
        </div>
      </div>
    `,this.el.querySelector("#gr-close").addEventListener("click",()=>this.hide()),this.attachItemListeners(),this.renderDetails(this.selectedId)}renderDollSlot(e){const t=this.items.find(n=>n.equipped_by===this.characterId&&n.equipped_slot===e);if(!t)return`<div class="gr-slot gr-slot-empty" style="grid-area:${e}">
        <div class="gr-slot-icon"><i class="fa ${Yr[e]}"></i></div>
        <div class="gr-slot-label">${q(Wr[e])}</div>
      </div>`;const s=We(t);if(!s)return"";const i=xe[t.rarity],r=Ye(t,s);return`<div class="gr-slot${t.id===this.selectedId?" gr-selected":""}" style="grid-area:${e};box-shadow:inset 0 0 0 2px ${i}" data-item="${t.id}" data-equipped="1">
      <div class="gr-slot-icon" style="color:${i}"><i class="fa ${s.icon}"></i></div>
      <div class="gr-slot-name" style="color:${i}">${q(r)}</div>
    </div>`}renderCard(e){const t=We(e);if(!t)return"";const s=xe[e.rarity],i=Ye(e,t);return`<div class="gr-card${e.id===this.selectedId?" gr-selected":""}" style="box-shadow:inset 0 0 0 2px ${s}" data-item="${e.id}">
      <div class="gr-slot-icon" style="color:${s}"><i class="fa ${t.icon}"></i></div>
      <div class="gr-slot-name" style="color:${s}">${q(i)}</div>
    </div>`}attachItemListeners(){this.el.querySelectorAll("[data-item]").forEach(e=>{const t=e.getAttribute("data-item"),s=e.getAttribute("data-equipped")==="1";e.addEventListener("mouseenter",()=>this.renderDetails(t)),e.addEventListener("click",()=>{const i=this.items.find(n=>n.id===t);if(!i)return;if(s){this.handleUnequip(i);return}if(!Ms(i,this.charLevel,this.charClass).ok){this.selectItem(t);return}const o=i.slot==="ring"?Zr(this.equippedSlots()):i.slot;this.equipOptimistic(i,o)})})}selectItem(e){var t;this.selectedId=e,this.el.querySelectorAll(".gr-selected").forEach(s=>s.classList.remove("gr-selected")),(t=this.el.querySelector(`[data-item="${e}"]`))==null||t.classList.add("gr-selected"),this.renderDetails(e)}equipOptimistic(e,t){if(!this.characterId)return;const s=this.characterId;for(const i of this.items)i.id!==e.id&&i.equipped_by===s&&i.equipped_slot===t&&(i.equipped_by=null,i.equipped_slot=null);e.equipped_by=s,e.equipped_slot=t,this.selectedId=e.id,this.render(),Pr(e.id,s,t).then(i=>{i||console.error("equip_item failed, reverting"),this.reload()})}handleUnequip(e){e.equipped_by=null,e.equipped_slot=null,this.selectedId=e.id,this.render(),Rr(e.id).then(t=>{t||console.error("unequip_item failed, reverting"),this.reload()})}renderDetails(e){const t=this.el.querySelector("#gr-details");if(!t)return;if(!e){t.innerHTML='<div class="gr-details-empty">Hover an item to inspect it.<br>Click a stash item to equip, or an equipped item to unequip.</div>';return}const s=this.items.find(E=>E.id===e),i=s?We(s):void 0;if(!s||!i){t.innerHTML='<div class="gr-details-empty">Item no longer available.</div>';return}const r=xe[s.rarity],o=Ye(s,i),n=s.rarity==="unique"?ki(s):void 0,l=s.equipped_by===this.characterId,d=n?`<div class="gr-flavor">${q(n.flavor)}</div>`:"",p=`<div class="gr-details-row">${q(_s(i.implicit))} <span class="gr-dim">(implicit)</span></div>`,h=s.affixes.map(E=>{if(E.id==="talent"&&E.node){const y=Q.find(ie=>ie.id===E.node),S=(y==null?void 0:y.name)??E.node,C=ni(this.charClass,E.node),R=`+${E.value} ${S}${C?"":" (inert for this class)"}`;return`<div class="gr-details-row${C?"":" gr-dim"}">${q(R)}</div>`}return`<div class="gr-details-row">${q(_s(E))}</div>`}).join(""),u=`<div class="gr-details-row ${this.charLevel<s.level_req?"gr-bad":"gr-ok"}">Requires Level ${s.level_req}</div>`;let g="";i.classRestriction&&(g=`<div class="gr-details-row ${i.classRestriction!==this.charClass?"gr-bad":"gr-ok"}">Class: ${q(i.classRestriction)}</div>`);const m=Ms(s,this.charLevel,this.charClass),v=l?'<div class="gr-details-status gr-ok">Equipped — click to unequip</div>':m.ok?'<div class="gr-details-status gr-ok">Click to equip</div>':`<div class="gr-details-status gr-bad">${q(m.reason??"Cannot equip")}</div>`;let A="";if(s.equipped_by===null){const E=this.sellErrorById.get(s.id),y=E?`<div class="gr-details-row gr-bad">${q(E)}</div>`:"",S=Cs(s);if(S.sellable){const C=this.sellPending.has(s.id);A=`
          <div class="gr-details-row gr-sell-price">Sell: ${S.price} gold</div>
          ${y}
          <button class="gr-sell-btn px-btn px-btn-primary" data-sell="${s.id}" ${C?"disabled":""}>${C?"Selling…":"Sell"}</button>
        `}else A=`<div class="gr-details-row gr-dim">${q(S.reason)}</div>${y}`}t.innerHTML=`
      <div class="gr-details-head">
        <div class="gr-details-icon" style="color:${r}"><i class="fa ${i.icon}"></i></div>
        <div>
          <div class="gr-details-name" style="color:${r}">${q(o)}</div>
          <div class="gr-details-kind">${q(i.name)} · ${q(Vr[i.slot])}</div>
        </div>
      </div>
      ${d}
      ${p}
      ${h}
      ${u}
      ${g}
      ${v}
      ${A}
    `;const P=t.querySelector("[data-sell]");P==null||P.addEventListener("click",()=>{P.disabled||this.handleSell(s)})}handleSell(e){if(this.sellPending.has(e.id))return;const t=Cs(e);if(!t.sellable)return;const s=t.price,i=async()=>{this.sellPending.add(e.id),this.sellErrorById.delete(e.id);const r=this.items;this.items=this.items.filter(n=>n.id!==e.id),this.selectedId=null,this.gold!==null&&(this.gold+=s),this.render();const o=await Dr(e.id);this.sellPending.delete(e.id),o===null&&(this.items=r,this.selectedId=e.id,this.sellErrorById.set(e.id,"Sell failed — please try again.")),await this.reload()};if(e.rarity==="unique"){this.showConfirm("Sell Unique Item",`Sell this unique item for ${s} gold? This cannot be undone.`,()=>{i()});return}i()}showConfirm(e,t,s){const i=document.createElement("div");i.className="gr-confirm-overlay",i.innerHTML=`
      <div class="gr-confirm-panel px-panel">
        <div class="gr-confirm-title px-title">${q(e)}</div>
        <div class="gr-confirm-text">${q(t)}</div>
        <div class="gr-confirm-buttons">
          <button class="gr-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="gr-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".gr-confirm-yes").addEventListener("click",()=>{i.remove(),s()}),i.querySelector(".gr-confirm-no").addEventListener("click",()=>i.remove())}}function D(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Jr=`
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
.bm-result-gold{font-family:'Press Start 2P',monospace;font-size:12px;letter-spacing:1px;margin-bottom:16px;opacity:0;animation:bm-rise 0.5s ease-out forwards;color:var(--px-accent);display:flex;align-items:center;justify-content:center;gap:8px;}
.bm-result-spoils{max-width:280px;margin:0 auto 20px;padding:12px 16px;background:var(--px-border-dark);opacity:0;animation:bm-rise 0.5s ease-out forwards;}
.bm-result-spoils-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--px-border-light);margin-bottom:8px;}
.bm-result-spoils-item{display:flex;align-items:center;justify-content:center;gap:8px;font-family:'Press Start 2P',monospace;font-size:10px;letter-spacing:0.5px;}
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
.bm-gold-pill{display:flex;align-items:center;gap:6px;padding:8px 14px;flex-shrink:0;background:var(--px-border-dark);box-shadow:0 0 0 2px var(--px-accent);color:var(--px-accent);font-size:11px;letter-spacing:1px;white-space:nowrap;}
.bm-gold-pill i{font-size:12px;}
.bm-char-actions{display:flex;gap:8px;align-items:center;}
.bm-btn-ghost{background:transparent;font-size:7px;letter-spacing:1px;}
.bm-btn-ghost:hover{color:var(--px-accent);}
.bm-credits-btn{position:fixed;right:16px;bottom:16px;font-size:6px;padding:8px 10px;opacity:0.6;z-index:2;}
.bm-credits-btn:hover{opacity:1;}
.bm-admin-btn{position:fixed;left:16px;bottom:16px;font-size:6px;padding:8px 10px;opacity:0.6;z-index:2;}
.bm-admin-btn:hover{opacity:1;}
.bm-pause-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;}
.bm-pause-title{font-size:20px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;text-shadow:0 0 20px rgba(224,91,91,0.6);}
.bm-pause-countdown{font-size:48px;color:var(--px-accent);letter-spacing:2px;margin-bottom:24px;text-shadow:0 0 30px rgba(255,179,71,0.4);}
.bm-pause-sub{font-size:8px;color:var(--px-border-light);letter-spacing:1px;margin-bottom:32px;}
.bm-btn-leave{padding:12px 32px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-leave:hover{color:var(--px-danger);}
.bm-btn-rematch.waiting{opacity:0.6;cursor:default;pointer-events:none;}
.bm-rematch-countdown{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-accent);letter-spacing:1px;margin-top:6px;text-align:center;animation:bm-pulse 1s ease-in-out infinite;}
`,eo=`
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
</div>`;class to{constructor(e,t){c(this,"el");c(this,"ui");c(this,"pollTimer",null);c(this,"pauseOverlay",null);c(this,"pauseCountdownTimer",null);c(this,"isAdminFlag",!1);c(this,"goldAmount",null);c(this,"rematchInterval",null);this.cb=t;const s=document.createElement("style");s.textContent=Jr,document.head.appendChild(s),this.el=document.createElement("div"),this.el.className="bm-overlay",this.el.innerHTML=eo,this.ui=document.createElement("div"),this.ui.className="bm-ui",this.el.appendChild(this.ui),e.appendChild(this.el),this.showHome()}setAdmin(e){this.isAdminFlag=e}setGold(e){this.goldAmount=e;const t=this.ui.querySelector("#bm-gold-pill");if(!t)return;if(e===null){t.style.display="none";return}t.style.display="";const s=t.querySelector("#bm-gold-amount");s&&(s.textContent=String(e))}showHome(e,t,s,i){this.stopPolling();const r=new URLSearchParams(window.location.search).get("room")??"",o=e!==void 0||t!==void 0,p={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',ranger:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="22" height="22"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'}[s??""]??"⚔",h=o?`<div class="bm-char-card px-panel">
           <div class="bm-char-icon">${p}</div>
           <div class="bm-char-details">
             <div class="bm-char-name">${D(e??"")}</div>
             <div class="bm-char-meta">${s?`${D(s)}`:""}${i!==void 0?` · Lvl <b>${i}</b>`:""}${t!==void 0?` · <b>${t}</b> Skill Pts`:""}</div>
           </div>
           <div id="bm-gold-pill" class="bm-gold-pill" style="display:${this.goldAmount===null?"none":""}">
             <i class="fa fa-coins"></i><span id="bm-gold-amount">${this.goldAmount??0}</span>
           </div>
           <div class="bm-char-actions">
             <button id="bm-skills" class="bm-btn-ghost px-btn">✦ Skills</button>
             <button id="bm-gear" class="bm-btn-ghost px-btn">⚔ Gear</button>
             <button id="bm-shop" class="bm-btn-ghost px-btn">⚖ Shop</button>
             <button id="bm-switch-char" class="bm-btn-ghost px-btn">⇄ Switch</button>
             <button id="bm-logout" class="bm-btn-logout px-btn">Sign Out</button>
           </div>
         </div>`:"",f=e?D(e):"";this.ui.innerHTML=`
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
            <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${D(r)}" maxlength="12">
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
      <button id="bm-credits" class="bm-btn-ghost px-btn bm-credits-btn">Credits</button>
      ${this.isAdminFlag?'<button id="bm-admin" class="bm-btn-ghost px-btn bm-admin-btn">⚙ Admin</button>':""}`;const u=this.ui.querySelector("#bm-skills");u&&u.addEventListener("click",()=>this.cb.onOpenSkills());const g=this.ui.querySelector("#bm-gear");g&&g.addEventListener("click",()=>this.cb.onOpenGear());const m=this.ui.querySelector("#bm-shop");m&&m.addEventListener("click",()=>this.cb.onOpenShop());const v=this.ui.querySelector("#bm-switch-char");v&&v.addEventListener("click",()=>this.cb.onSwitchCharacter());const A=this.ui.querySelector("#bm-credits");A&&A.addEventListener("click",()=>this.cb.onShowCredits());const P=this.ui.querySelector("#bm-admin");P&&P.addEventListener("click",()=>this.cb.onOpenAdmin());const E=this.ui.querySelector("#bm-logout");E&&E.addEventListener("click",()=>this.cb.onLogout());const y=this.ui.querySelector("#mode-grid");let S="1v1";y.querySelectorAll(".bm-mode").forEach(C=>{C.addEventListener("click",()=>{y.querySelectorAll(".bm-mode").forEach(R=>R.classList.remove("active")),C.classList.add("active"),S=C.dataset.mode})}),this.ui.querySelector("#bm-create").addEventListener("click",()=>{const C=this.ui.querySelector("#bm-name").value.trim();C&&this.cb.onCreateRoom(C,S)}),this.ui.querySelector("#bm-join-code").addEventListener("click",()=>{const C=this.ui.querySelector("#bm-name").value.trim(),R=this.ui.querySelector("#bm-code").value.trim();C&&R&&this.cb.onJoinRoom(R,C)}),this.ui.querySelector("#bm-code").addEventListener("keydown",C=>{C.key==="Enter"&&this.ui.querySelector("#bm-join-code").click()}),this.pollLobbies(),this.pollTimer=window.setInterval(()=>this.pollLobbies(),3e3),r&&this.ui.querySelector("#bm-name").focus()}showWaiting(e,t,s){this.stopPolling(),this.renderLobby(e,[{name:t,index:0,ready:!1}],s)}showReady(e,t,s,i,r){this.stopPolling();const o=Object.entries(t).map(([n,l],d)=>({name:l,index:d,ready:(r==null?void 0:r.has(n))??!1}));this.renderLobby(e,o,i)}showResult(e,t,s,i){this.stopPolling();let r,o;t==="2v2"?(r=e?"Your Team Wins":"Your Team Loses",o=e?"Your team dominated the arena":"Your team has fallen"):t==="ffa"?(r=e?"Victory":"Defeated",e?o="You are the last one standing":s?o=`Defeated — ${s===2?"2nd":s===3?"3rd":`${s}th`} place`:o="You have been eliminated"):(r=e?"Victory":"Defeat",o=e?"You are victorious":"You have been slain");const n=e?"bm-win":"bm-lose",l=i&&i.levelsGained>0,d=i?`<div class="bm-result-divider">
           <div class="bm-result-divider-line"></div>
           <div class="bm-result-divider-dot"></div>
           <div class="bm-result-divider-line"></div>
         </div>
         <div class="bm-result-xp">+<span id="bm-xp-count">0</span> XP</div>
         <div class="bm-result-xp-label">Experience Gained</div>
         ${l?`<div class="bm-result-levelup">Level Up <span class="bm-result-levelup-num">${i.newLevel}</span></div>`:""}`:"";let p=l?1.1:.8,h="";i&&i.goldGained>0&&(h=`<div class="bm-result-gold" style="animation-delay:${p}s">+${i.goldGained} <i class="fa fa-coins"></i> Gold</div>`,p+=.3);let f="";const u=i==null?void 0:i.droppedItem,g=u?We(u):void 0;if(u&&g){const v=xe[u.rarity],A=Ye(u,g);f=`<div class="bm-result-spoils" style="animation-delay:${p}s;box-shadow:inset 0 0 0 2px ${v}">
        <div class="bm-result-spoils-label">War Spoils</div>
        <div class="bm-result-spoils-item"><i class="fa ${g.icon}" style="color:${v}"></i><span style="color:${v}">${D(A)}</span></div>
      </div>`,p+=.3}const m=i?`${Math.max(p,l?1.4:1.1)}s`:"0.8s";if(this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-result-panel ${n}">
        <div class="bm-result-glow"></div>
        <div class="bm-result-ornament">
          <div class="bm-result-ornament-line"></div>
          <div class="bm-result-ornament-gem"></div>
          <div class="bm-result-ornament-line" style="transform:scaleX(-1)"></div>
        </div>
        <div class="bm-result-title">${r}</div>
        <div class="bm-result-sub">${o}</div>
        ${d}
        ${h}
        ${f}
        <div class="bm-result-buttons" style="animation-delay:${m}">
          <button id="bm-rematch" class="bm-btn-rematch px-btn">⚔ Rematch</button>
          <button id="bm-return-lobby" class="bm-btn-return px-btn">Return to Lobby</button>
        </div>
      </div>`,i&&i.xpGained>0){const v=this.ui.querySelector("#bm-xp-count");if(v){const A=i.xpGained,P=1200,E=performance.now()+800,y=S=>{const C=S-E;if(C<0){requestAnimationFrame(y);return}const R=Math.min(C/P,1),ie=1-Math.pow(1-R,3);v.textContent=String(Math.round(A*ie)),R<1&&requestAnimationFrame(y)};requestAnimationFrame(y)}}this.ui.querySelector("#bm-rematch").addEventListener("click",()=>this.cb.onRematch()),this.ui.querySelector("#bm-return-lobby").addEventListener("click",()=>this.cb.onReturnToLobby())}disableRematch(){this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null);const e=this.ui.querySelector("#bm-rematch");e&&(e.disabled=!0,e.classList.add("waiting"),e.style.opacity="0.4",e.style.cursor="default",e.textContent="Opponent left");const t=this.ui.querySelector(".bm-rematch-countdown");t&&t.remove()}showRematchCountdown(e,t){this.rematchInterval&&clearInterval(this.rematchInterval);const s=this.ui.querySelector("#bm-rematch");if(!s)return;let i=e;t?(s.classList.add("waiting"),s.textContent=`Waiting... (${i}s)`):s.textContent=`⚔ Rematch (${i}s)`;let r=this.ui.querySelector(".bm-rematch-countdown");if(!r){r=document.createElement("div"),r.className="bm-rematch-countdown";const o=this.ui.querySelector(".bm-result-buttons");o&&o.appendChild(r)}r.textContent=t?"Waiting for opponent...":"Opponent wants a rematch!",this.rematchInterval=setInterval(()=>{if(i--,i<=0){this.rematchInterval&&clearInterval(this.rematchInterval),this.rematchInterval=null,t&&this.disableRematch();return}s&&(t?s.textContent=`Waiting... (${i}s)`:s.textContent=`⚔ Rematch (${i}s)`)},1e3)}showDisconnected(){this.stopPolling(),this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-disc-panel">
        <div class="bm-disc-title">Opponent Fled</div>
        <div class="bm-disc-sub">The coward has left the arena.<br>Refresh to seek new prey.</div>
      </div>`}appendChatMessage(e,t,s){const i=this.ui.querySelector("#bm-chat-msgs");if(!i)return;const r=this.getSenderColorClass(e),o=document.createElement("div");o.className="bm-msg",o.innerHTML=`<span class="bm-msg-sender ${r}">${D(t)}</span><span class="bm-msg-text">${D(s)}</span>`,i.appendChild(o),i.scrollTop=i.scrollHeight}appendSystemMessage(e){const t=this.ui.querySelector("#bm-chat-msgs");if(!t)return;const s=document.createElement("div");s.className="bm-msg",s.innerHTML=`<span class="bm-msg-sender bm-msg-sender-sys">—</span><span class="bm-msg-sys">${D(e)}</span>`,t.appendChild(s),t.scrollTop=t.scrollHeight}hide(){this.stopPolling(),this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null),this.el.style.display="none"}show(){this.el.style.display=""}showPauseOverlay(e,t){this.hidePauseOverlay(),this.pauseOverlay=document.createElement("div"),this.pauseOverlay.className="bm-pause-overlay",this.pauseOverlay.innerHTML=`
      <div class="bm-pause-title">Opponent Disconnected</div>
      <div class="bm-pause-countdown" id="bm-pause-timer">${e}</div>
      <div class="bm-pause-sub">Waiting for opponent to rejoin...</div>
      <button class="bm-btn-leave px-btn" id="bm-pause-leave">Leave Match</button>`,this.el.parentElement.appendChild(this.pauseOverlay),this.pauseOverlay.querySelector("#bm-pause-leave").addEventListener("click",t);let s=e;const i=this.pauseOverlay.querySelector("#bm-pause-timer");this.pauseCountdownTimer=window.setInterval(()=>{s--,i.textContent=String(Math.max(0,s)),s<=0&&this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null)},1e3)}hidePauseOverlay(){this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null),this.pauseOverlay&&(this.pauseOverlay.remove(),this.pauseOverlay=null)}stopPolling(){this.pollTimer!==null&&(clearInterval(this.pollTimer),this.pollTimer=null)}async pollLobbies(){try{const e=await fetch("/rooms"),{rooms:t}=await e.json();this.renderRoomRows(t)}catch{}}renderRoomRows(e){const t=this.ui.querySelector("#bm-rooms");if(t){if(e.length===0){t.innerHTML='<div class="bm-empty">No open lobbies<br>Be the first to enter the arena</div>';return}t.innerHTML=e.map(s=>{const i=s.mode==="2v2"?`<button class="bm-btn-green-sm px-btn" data-team="team1">Join T1</button>
           <button class="bm-btn-green-sm px-btn" data-team="team2" style="margin-left:4px">Join T2</button>`:'<button class="bm-btn-green-sm px-btn">Join</button>';return`
      <div class="bm-room-row" data-room-id="${D(s.roomId)}" data-mode="${D(s.mode)}">
        <div class="bm-room-info">
          <div class="bm-room-name">${D(s.creatorName)}</div>
          <div class="bm-room-meta">Waiting for players</div>
        </div>
        <span class="bm-tag">${D(s.mode)}</span>
        <div class="bm-players"><b>${s.playerCount}</b> / ${s.maxPlayers}</div>
        ${i}
      </div>`}).join(""),t.querySelectorAll(".bm-room-row").forEach(s=>{s.querySelectorAll(".bm-btn-green-sm").forEach(i=>{i.addEventListener("click",()=>{var l;const r=s.dataset.roomId,o=((l=this.ui.querySelector("#bm-name"))==null?void 0:l.value.trim())??"",n=i.dataset.team;o&&this.cb.onJoinRoom(r,o,n)})})})}}renderLobby(e,t,s){const i=`${location.origin}?room=${e}`,r=s==="ffa"||s==="2v2"?4:2,o=s==="2v2"?4:2,n=t.length>=o,d={"1v1":"1v1 Duel",ffa:"Free-for-All","2v2":"2v2 Teams"}[s??"1v1"]??"1v1 Duel",p=(m,v)=>m?`<div class="bm-slot" style="${m.ready?"box-shadow:0 0 0 2px var(--px-success),0 0 6px rgba(111,206,126,0.3);":""}">
             <div class="bm-avatar bm-avatar-${m.index%4}">${D((m.name[0]??"?").toUpperCase())}</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name">${D(m.name)}</div>
               <div class="bm-slot-status ${m.ready?"bm-status-ready":"bm-status-waiting"}">${m.ready?"✓ Ready":"Waiting..."}</div>
             </div>
           </div>`:`<div class="bm-slot">
             <div class="bm-avatar bm-avatar-empty">?</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name" style="color:var(--px-border-light)">${v}</div>
               <div class="bm-slot-status bm-status-empty">Waiting for challenger...</div>
             </div>
           </div>`;let h="";for(let m=0;m<r;m++)h+=p(t[m],`Slot ${m+1}`);const f=n?'<button id="bm-ready" class="bm-btn-green px-btn px-btn-primary">⚔ Ready</button>':`<button class="bm-btn-green px-btn px-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>⚔ Ready</button>
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
              <div class="bm-code-value">${D(e.toUpperCase())}</div>
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
      </div>`,this.ui.querySelector("#bm-copy").addEventListener("click",()=>{navigator.clipboard.writeText(i)}),this.ui.querySelector("#bm-leave").addEventListener("click",()=>{this.cb.onReturnToLobby()});const u=this.ui.querySelector("#bm-ready");u&&u.addEventListener("click",()=>{u.replaceWith(Object.assign(document.createElement("button"),{className:"bm-btn-green-done px-btn",textContent:"✓ Ready"})),this.cb.onReady()});const g=()=>{const m=this.ui.querySelector("#bm-chat-input"),v=m.value.trim();v&&(this.cb.onSendChatMessage(v),m.value="")};this.ui.querySelector("#bm-chat-send").addEventListener("click",g),this.ui.querySelector("#bm-chat-input").addEventListener("keydown",m=>{m.key==="Enter"&&g()})}getSenderColorClass(e){return e.split("").reduce((s,i)=>s+i.charCodeAt(0),0)%2===0?"bm-msg-sender-0":"bm-msg-sender-1"}}function Es(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}class so{constructor(e,t){c(this,"el");this.cb=t,this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);z-index:200;font-family:"VT323",monospace;color:var(--px-text)',e.appendChild(this.el),this.checkSession()}async checkSession(){const{data:{session:e}}=await w.auth.getSession();if(e){const{data:t}=await w.from("profiles").select("username").eq("user_id",e.user.id).single();if(t){this.cb.onAuthed(t.username,e.access_token);return}}this.showLogin()}showLogin(e=""){var t,s;this.el.innerHTML=`
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
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${Es(e)}</p>`:""}
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
    `,this.el.querySelector("#auth-signin").addEventListener("click",()=>this.handleSignIn()),this.el.querySelector("#auth-register").addEventListener("click",()=>this.showRegister()),(s=(t=this.cb).onShowLogin)==null||s.call(t)}showRegister(e=""){this.el.innerHTML=`
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center bottom,rgba(255,179,71,0.06),transparent 60%);pointer-events:none"></div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:22px;margin-bottom:8px">CREATE ACCOUNT</h1>
        <p style="font-family:'VT323',monospace;font-style:italic;color:var(--px-border-light);font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:28px">Join the arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 24px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${Es(e)}</p>`:""}
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
    `,this.el.querySelector("#auth-submit").addEventListener("click",()=>this.handleRegister()),this.el.querySelector("#auth-back").addEventListener("click",()=>this.showLogin())}async handleSignIn(){const e=this.el.querySelector("#auth-email").value.trim(),t=this.el.querySelector("#auth-password").value,{data:s,error:i}=await w.auth.signInWithPassword({email:e,password:t});if(i||!s.session){this.showLogin((i==null?void 0:i.message)??"Sign in failed");return}const{data:r}=await w.from("profiles").select("username").eq("user_id",s.user.id).single();this.cb.onAuthed((r==null?void 0:r.username)??e,s.session.access_token)}async handleRegister(){const e=this.el.querySelector("#auth-username").value.trim(),t=this.el.querySelector("#auth-email").value.trim(),s=this.el.querySelector("#auth-password").value;if(!e){this.showRegister("Username is required");return}const{data:i,error:r}=await w.auth.signUp({email:t,password:s,options:{data:{username:e}}});if(r||!i.session){this.showRegister((r==null?void 0:r.message)??"Registration failed");return}this.cb.onAuthed(e,i.session.access_token)}hide(){this.el.style.display="none"}show(){this.el.style.display="flex"}}const Ts={"fire.fireball":"fa-fire","fire.volatile_ember":"fa-circle-dot","fire.seeking_flame":"fa-crosshairs","fire.hellfire":"fa-skull","fire.pyroclasm":"fa-code-fork","fire.fire_wall":"fa-fire-flame-simple","fire.enduring_flames":"fa-hourglass-half","fire.searing_heat":"fa-temperature-high","fire.inferno_expanse":"fa-expand","fire.meteor":"fa-meteor","fire.molten_impact":"fa-burst","fire.blind_strike":"fa-eye-slash","fire.cataclysm":"fa-up-right-and-down-left-from-center","utility.teleport":"fa-wand-magic","utility.phase_shift":"fa-maximize","utility.ethereal_form":"fa-ghost","utility.phantom_step":"fa-person-running","archer.power_shot":"fa-bullseye","archer.guided":"fa-location-arrow","archer.multishot":"fa-arrows-split-up-and-left","archer.homing":"fa-crosshairs","archer.barrage":"fa-burst","archer.rain_of_arrows":"fa-cloud-rain","archer.sustained_rain":"fa-hourglass-half","archer.piercing_rain":"fa-bolt","archer.wide_rain":"fa-up-right-and-down-left-from-center","archer.burn":"fa-fire","archer.freeze":"fa-snowflake","archer.poison":"fa-skull-crossbones","archer_utility.evade":"fa-person-running","archer_utility.combat_roll":"fa-person-falling","archer_utility.shadowstep":"fa-ghost","archer_utility.acrobatics":"fa-tornado"};function K(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const io={"fire.fireball":{x:50,y:0},"fire.volatile_ember":{x:30,y:90},"fire.seeking_flame":{x:70,y:90},"fire.hellfire":{x:30,y:180},"fire.pyroclasm":{x:70,y:180},"fire.fire_wall":{x:50,y:270},"fire.enduring_flames":{x:20,y:360},"fire.searing_heat":{x:50,y:360},"fire.inferno_expanse":{x:80,y:360},"fire.meteor":{x:50,y:450},"fire.molten_impact":{x:20,y:540},"fire.blind_strike":{x:50,y:540},"fire.cataclysm":{x:80,y:540}},ao={"utility.teleport":{x:50,y:0},"utility.phase_shift":{x:28,y:90},"utility.ethereal_form":{x:72,y:90},"utility.phantom_step":{x:50,y:180}},ro={"archer.power_shot":{x:50,y:0},"archer.guided":{x:30,y:90},"archer.multishot":{x:70,y:90},"archer.homing":{x:30,y:180},"archer.barrage":{x:70,y:180},"archer.rain_of_arrows":{x:50,y:270},"archer.sustained_rain":{x:20,y:360},"archer.piercing_rain":{x:50,y:360},"archer.wide_rain":{x:80,y:360},"archer.burn":{x:25,y:450},"archer.freeze":{x:50,y:450},"archer.poison":{x:75,y:450}},oo={"archer_utility.evade":{x:50,y:0},"archer_utility.combat_roll":{x:28,y:90},"archer_utility.shadowstep":{x:72,y:90},"archer_utility.acrobatics":{x:50,y:180}},no=`
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.st-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.st-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
/* ── header bar ─────────────────────────────────────────────────────── */
.st-header{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;max-width:1060px;margin-bottom:16px;flex-wrap:wrap;background:var(--px-panel);padding:12px 18px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);box-sizing:border-box;}
.st-title{font-size:11px;letter-spacing:0.05em;}
.st-points-pill{display:flex;align-items:center;gap:10px;background:#120e1c;padding:8px 16px;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
.st-points-gem{width:10px;height:10px;background:var(--px-success);transform:rotate(45deg);box-shadow:0 0 8px rgba(111,206,126,0.7);}
.st-points-num{font-family:'Press Start 2P',monospace;font-size:14px;color:var(--px-success);}
.st-points-label{font-family:'Press Start 2P',monospace;font-size:6px;color:var(--px-border-light);letter-spacing:0.1em;}
.st-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.st-header-buttons{display:flex;gap:10px;}
/* ── two-column workspace ───────────────────────────────────────────── */
.st-columns{display:flex;gap:24px;width:100%;max-width:1060px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.st-col-main{flex:1 1 560px;min-width:480px;max-width:640px;}
.st-col-side{flex:0 0 340px;display:flex;flex-direction:column;gap:18px;}
.st-tree-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:#d86030;text-align:center;margin-bottom:8px;}
.st-util-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;color:var(--px-border-light);text-transform:uppercase;text-align:center;margin-bottom:8px;}
.st-tree-container{position:relative;width:100%;height:640px;}
.st-util-container{position:relative;width:100%;height:280px;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
/* ── nodes ──────────────────────────────────────────────────────────── */
.st-node{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;position:relative;}
.st-node-circle:hover{transform:scale(1.08);}
.st-node[data-state="locked"] .st-node-circle{cursor:not-allowed;}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
.st-node-spell{width:58px;height:58px;}
.st-node-mod{width:44px;height:44px;}
.st-node-owned .st-node-circle{box-shadow:0 0 0 3px #e86020;background:radial-gradient(circle at 38% 38%,#2a0c00,#0e0400);}
.st-node-owned.st-node-is-spell .st-node-circle{box-shadow:0 0 0 3px #e86020,0 0 12px rgba(232,96,32,0.25);}
.st-node-owned .st-node-icon{color:#e87040;}
.st-node-owned .st-node-name{color:#d86040;}
.st-node-purchasable .st-node-circle{box-shadow:0 0 0 2px var(--px-accent);background:radial-gradient(circle at 38% 38%,#201200,#0a0400);animation:st-pulse 1.6s ease-in-out infinite;}
.st-node-purchasable .st-node-icon{color:var(--px-accent);}
.st-node-purchasable .st-node-name{color:var(--px-accent);}
@keyframes st-pulse{0%,100%{box-shadow:0 0 0 2px var(--px-accent);}50%{box-shadow:0 0 0 2px var(--px-accent),0 0 14px rgba(255,179,71,0.55);}}
.st-node-locked .st-node-circle{box-shadow:0 0 0 1.5px #444;background:#151515;}
.st-node-locked .st-node-icon{color:#555;}
.st-node-locked .st-node-name{color:#555;}
/* supercharged: ranks pushed past the soft cap — gold treatment */
.st-node-supercharged .st-node-circle{box-shadow:0 0 0 3px #ddb84a,0 0 14px rgba(221,184,74,0.45);background:radial-gradient(circle at 38% 38%,#2a2000,#0e0a00);}
.st-node-supercharged .st-node-icon{color:#ddb84a;}
.st-node-supercharged .st-node-name{color:#ddb84a;}
.st-node-selected .st-node-circle{outline:2px solid #fff;outline-offset:3px;}
.st-node-name{font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;max-width:76px;margin-top:5px;line-height:1.4;}
/* corner badges replace the old cost/rank text rows */
.st-badge{position:absolute;right:-10px;top:-8px;font-family:'Press Start 2P',monospace;font-size:6px;padding:3px 4px;background:var(--px-border-dark);box-shadow:0 0 0 1px #000;pointer-events:none;z-index:2;}
.st-badge-cost{color:var(--px-accent);}
.st-badge-rank{color:#e87040;}
.st-badge-rank.st-past-cap{color:#ddb84a;}
.st-badge-lock{color:#666;}
.st-flash .st-node-circle{animation:st-buy-flash 0.45s ease-out;}
@keyframes st-buy-flash{0%{filter:brightness(3) saturate(2);}100%{filter:none;}}
/* ── details panel ──────────────────────────────────────────────────── */
.st-details{padding:16px 18px;min-height:300px;box-sizing:border-box;}
.st-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:24px;}
.st-details-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.st-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#120e1c;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.st-details-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);line-height:1.5;}
.st-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.08em;text-transform:uppercase;}
.st-details-desc{font-size:17px;line-height:1.45;color:var(--px-text);margin:10px 0;}
.st-rank-track{display:flex;gap:3px;margin:8px 0;}
.st-rank-seg{height:8px;flex:1;background:#221a30;box-shadow:inset 0 0 0 1px var(--px-border-dark);}
.st-rank-seg.filled{background:#e86020;}
.st-rank-seg.past-cap{background:#ddb84a;}
.st-rank-line{font-size:15px;color:var(--px-border-light);margin-bottom:4px;}
.st-details-row{font-size:16px;line-height:1.5;}
.st-req{font-size:15px;line-height:1.6;}
.st-req .met{color:var(--px-success);}
.st-req .unmet{color:var(--px-danger);}
.st-details-status{margin-top:8px;font-size:16px;}
.st-status-ok{color:var(--px-success);}
.st-status-warn{color:var(--px-accent);}
.st-status-bad{color:var(--px-danger);}
.st-super-note{margin-top:10px;padding:10px 12px;background:#1a1400;box-shadow:inset 0 0 0 2px #6a5416;font-size:15px;line-height:1.5;color:#ddb84a;}
.st-super-note b{color:#f0d060;}
.st-super-btn{display:block;width:100%;margin-top:10px;padding:10px 0;font-size:8px;letter-spacing:0.08em;text-transform:uppercase;color:#1a1400;background:linear-gradient(180deg,#f0d060,#c8a02a);box-shadow:0 -2px 0 0 #f8e090,0 2px 0 0 #806410,-2px 0 0 0 #f8e090,2px 0 0 0 #806410;border:none;font-family:'Press Start 2P',monospace;cursor:pointer;}
.st-super-btn:hover{filter:brightness(1.1);}
.st-super-btn:disabled{filter:saturate(0.25) brightness(0.6);cursor:not-allowed;}
.st-refund-hint{margin-top:8px;font-size:14px;color:var(--px-border-light);}
.st-refund-hint.st-refund-blocked{color:var(--px-danger);opacity:0.85;}
.st-legend{margin-top:14px;padding-top:12px;border-top:1px solid var(--px-border-dark);display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--px-border-light);}
.st-legend-row{display:flex;align-items:center;gap:8px;}
.st-legend-swatch{width:12px;height:12px;flex:0 0 12px;}
/* ── confirm modal (kept for reset + past-cap ranks) ─────────────────── */
.st-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.st-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.st-confirm-title{margin-bottom:8px;}
.st-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.st-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.st-confirm-yes,.st-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
`;class lo{constructor(e){c(this,"el");c(this,"ranks",new Map);c(this,"characterId",null);c(this,"skillPoints",0);c(this,"charName","");c(this,"charClass","");c(this,"selectedId",null);c(this,"flashId",null);c(this,"closeResolver",null);const t=document.createElement("style");t.textContent=no,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="st-overlay",e.appendChild(this.el)}async show(e){this.characterId=e??null,this.selectedId=null,this.el.style.display="block",await this.reload(),await new Promise(t=>{this.closeResolver=t})}hide(){var e;this.el.style.display="none",(e=this.closeResolver)==null||e.call(this),this.closeResolver=null}async reload(){if(!this.characterId)return;const[{data:e},{data:t}]=await Promise.all([w.from("characters").select("skill_points_available, name, class").eq("id",this.characterId).single(),w.from("skill_unlocks").select("node_id, rank").eq("character_id",this.characterId)]);this.skillPoints=(e==null?void 0:e.skill_points_available)??0,this.charName=(e==null?void 0:e.name)??"Unknown",this.charClass=ht(e==null?void 0:e.class),this.ranks=new Map((t??[]).map(s=>[s.node_id,s.rank??1])),this.charClass==="ranger"?this.ranks.has("archer.power_shot")||(await w.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"archer.power_shot",p_cost:0}),this.ranks.set("archer.power_shot",1)):this.ranks.has("fire.fireball")||(await w.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"fire.fireball",p_cost:0}),this.ranks.set("fire.fireball",1)),this.render()}render(){var d;const e=this.skillPoints,t=this.charClass==="ranger",s=Q.filter(p=>p.tree===(t?"archer":"fire")),i=Q.filter(p=>p.tree===(t?"archer_utility":"utility")),r=t?ro:io,o=t?oo:ao,n=t?"Archer":"Fire",l=t?"560px":"640px";this.el.innerHTML=`
      <div class="st-vignette"></div>
      <div class="st-ui">
        <div class="st-header">
          <div class="st-title px-title">${K(this.charName)} — ${K(this.charClass)} Skills</div>
          <div class="st-points-pill">
            <div class="st-points-gem"></div>
            <span class="st-points-num">${e}</span>
            <span class="st-points-label">Points<br>Available</span>
          </div>
          <div class="st-header-buttons">
            <button id="st-respec" class="st-btn px-btn">Reset Skills</button>
            <button id="st-close" class="st-btn px-btn px-btn-primary">Back to Lobby</button>
          </div>
        </div>

        <div class="st-columns">
          <div class="st-col-main">
            <div class="st-tree-label">${n}</div>
            <div class="st-tree-container" style="height:${l}">
              <svg id="st-main-svg" class="st-tree-svg"></svg>
              ${s.map(p=>this.renderNode(p,e,r[p.id])).join("")}
            </div>
          </div>
          <div class="st-col-side">
            <div id="st-details" class="st-details px-panel"></div>
            <div>
              <div class="st-util-label">${t?"Evasion":"Shared Utility"}</div>
              <div class="st-util-container">
                <svg id="st-util-svg" class="st-tree-svg" overflow="visible"></svg>
                ${i.map(p=>this.renderNode(p,e,o[p.id])).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `,this.el.querySelector("#st-close").addEventListener("click",()=>this.hide()),this.el.querySelector("#st-respec").addEventListener("click",()=>this.handleRespec()),this.drawConnections("st-main-svg",r,s,e),this.drawConnections("st-util-svg",o,i,e),this.attachNodeListeners(e),this.renderDetails(this.selectedId,e),this.flashId&&((d=this.el.querySelector(`.st-node[data-id="${this.flashId}"]`))==null||d.classList.add("st-flash"),this.flashId=null)}renderNode(e,t,s){if(!s)return"";const i=this.ranks.get(e.id)??0,r=i>0,o=!r&&Oe(e.id,this.ranks)&&t>=e.cost,l=r&&ye(e)&&i>e.stackable.softCap?"st-node-owned st-node-supercharged":r?"st-node-owned":o?"st-node-purchasable":"st-node-locked",d=e.isSpell?"st-node-is-spell":"",p=e.isSpell?"st-node-spell":"st-node-mod",h=e.id===this.selectedId?"st-node-selected":"",f=Ts[e.id]??"fa-star",u=r?"owned":o?"purchasable":"locked";let g="";if(r&&ye(e)){const m=e.stackable.softCap;g=`<span class="st-badge st-badge-rank${i>m?" st-past-cap":""}">${i}/${m}</span>`}else!r&&o?g=`<span class="st-badge st-badge-cost">${e.cost}pt</span>`:r||(g='<span class="st-badge st-badge-lock"><i class="fa fa-lock"></i></span>');return`<div class="st-node ${l} ${d} ${h}" data-id="${e.id}" data-state="${u}"
      style="left:${s.x}%;top:${s.y}px;">
      <div class="st-node-circle ${p}">
        <i class="fa ${f} fa-fw st-node-icon" style="font-size:${e.isSpell?"1.25rem":"1.05rem"}"></i>
        ${g}
      </div>
      <div class="st-node-name">${K(e.name)}</div>
    </div>`}drawConnections(e,t,s,i){const r=this.el.querySelector(`#${e}`);if(!r)return;let o="";for(const n of s){const l=Pt[n.id];if(!l)continue;const d=t[n.id];if(!d)continue;const p=this.ranks.has(n.id),h=!p&&Oe(n.id,this.ranks)&&i>=n.cost,f=p?"#e86020":h?"#c8860a":"#333",u=p?.75:h?.5:.3,g=p?2.5:2;if(l.requiresAll)for(const m of l.requiresAll){const v=t[m];v&&(o+=`<line x1="${v.x}%" y1="${v.y+30}" x2="${d.x}%" y2="${d.y}" stroke="${f}" stroke-opacity="${u}" stroke-width="${g}"/>`)}if(l.requiresAny)for(const m of l.requiresAny){const v=t[m];v&&(o+=`<line x1="${v.x}%" y1="${v.y+30}" x2="${d.x}%" y2="${d.y}" stroke="${f}" stroke-opacity="${u*.8}" stroke-width="1.5" stroke-dasharray="4,3"/>`)}}r.innerHTML=o}renderDetails(e,t){var v,A,P,E;const s=this.el.querySelector("#st-details");if(!s)return;if(!e){s.innerHTML=`
        <div class="st-details-empty">
          Hover a skill to inspect it.<br>Click to learn or rank up.
        </div>
        <div class="st-legend">
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #e86020;background:#2a0c00;"></span>Owned</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-accent);background:#201200;"></span>Can learn — click it</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 1.5px #444;background:#151515;"></span>Locked</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="background:repeating-linear-gradient(90deg,#c8860a 0 4px,transparent 4px 7px);"></span>Dashed line: needs any one parent</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-border-light);background:#120e1c;"></span>Right-click a skill: refund 1 rank</div>
        </div>
      `;return}const i=Q.find(y=>y.id===e),r=Pt[e],o=this.ranks.get(e)??0,n=o>0,l=Ts[e]??"fa-star",d=i.isSpell?"Active Spell":"Passive";let p="",h="";if(ye(i)){const y=i.stackable.softCap,S=i.stackable.baseEffect,C=Math.max(y,o),R=Array.from({length:C},(le,ve)=>`<div class="st-rank-seg ${ve<o?ve<y?"filled":"filled past-cap":""}"></div>`).join(""),ie=o>y?' <span style="color:#ddb84a">⚡ Supercharged</span>':"";if(p=`
        <div class="st-rank-line">Rank ${o} / ${y}${ie}</div>
        <div class="st-rank-track">${R}</div>
      `,o>=y){const le=Zt=>S<1?`${Math.round(Zt*100)}%`:Zt.toFixed(1).replace(/\.0$/,""),ve=rt(S,o),bt=rt(S,o+1),et=we(i,o);h=`
          <div class="st-super-note">
            ⚡ ${o>y?`Supercharging is boosting this talent's total effect to <b>${le(ve)}</b> (base cap is ${le(rt(S,y))}).`:`This talent is at its cap: total effect <b>${le(ve)}</b>.`}<br>
            Next rank raises it to <b>${le(bt)}</b> (+${le(bt-ve)}) — each rank past the cap gives less and costs 1 pt more.
          </div>
          <button id="st-super-btn" class="st-super-btn" ${t>=et?"":"disabled"}>
            ⚡ Supercharge — ${et} pt${et>1?"s":""}${t>=et?"":" (not enough)"}
          </button>
        `}}let f="";if(r&&!n){const y=[];for(const S of r.requiresAll??[]){const C=this.ranks.has(S),R=((v=Q.find(ie=>ie.id===S))==null?void 0:v.name)??S;y.push(`<div class="${C?"met":"unmet"}"><i class="fa ${C?"fa-check":"fa-xmark"}"></i> ${K(R)}</div>`)}if((A=r.requiresAny)!=null&&A.length){const S=r.requiresAny.some(R=>this.ranks.has(R)),C=r.requiresAny.map(R=>{var ie;return((ie=Q.find(le=>le.id===R))==null?void 0:ie.name)??R});y.push(`<div class="${S?"met":"unmet"}"><i class="fa ${S?"fa-check":"fa-xmark"}"></i> Any of: ${K(C.join(", "))}</div>`)}if((P=r.mutuallyExclusive)!=null&&P.length){const S=r.mutuallyExclusive.find(C=>this.ranks.has(C));if(S){const C=((E=Q.find(R=>R.id===S))==null?void 0:E.name)??S;y.push(`<div class="unmet"><i class="fa fa-ban"></i> Excluded by ${K(C)} (respec to change)</div>`)}}y.length&&(f=`<div class="st-req">${y.join("")}</div>`)}let u="";if(n){const y=this.refundBlockReason(e),S=we(i,o-1);u=y===null?`<div class="st-refund-hint">Right-click: refund 1 rank (+${S} pt${S>1?"s":""})</div>`:`<div class="st-refund-hint st-refund-blocked">Refund blocked: ${K(y)}</div>`}let g="";if(n&&ye(i)&&o>=i.stackable.softCap)g="";else if(n&&ye(i)){const y=we(i,o);g=t>=y?`<span class="st-status-warn">Next rank costs ${y} pt${y>1?"s":""} — click to buy</span>`:`<span class="st-status-bad">Next rank costs ${y} pt${y>1?"s":""} — not enough points</span>`}else n?g='<span class="st-status-ok"><i class="fa fa-check"></i> Owned</span>':Oe(e,this.ranks)?g=t>=i.cost?`<span class="st-status-ok">Costs ${i.cost} pt${i.cost>1?"s":""} — click to learn</span>`:`<span class="st-status-bad">Costs ${i.cost} pt${i.cost>1?"s":""} — not enough points</span>`:g='<span class="st-status-bad">Locked — requirements not met</span>';s.innerHTML=`
      <div class="st-details-head">
        <div class="st-details-icon"><i class="fa ${l}" style="color:var(--px-accent)"></i></div>
        <div>
          <div class="st-details-name">${K(i.name)}</div>
          <div class="st-details-kind">${d}${n?"":` · ${i.cost} pt${i.cost>1?"s":""}`}</div>
        </div>
      </div>
      <div class="st-details-desc">${K(i.description)}</div>
      ${p}
      ${f}
      <div class="st-details-status">${g}</div>
      ${u}
      ${h}
    `;const m=s.querySelector("#st-super-btn");if(m&&!m.disabled){const y=this.ranks.get(e)??0;m.addEventListener("click",()=>this.buyNode(e,we(i,y),y+1))}}attachNodeListeners(e){this.el.querySelectorAll(".st-node").forEach(t=>{const s=t.getAttribute("data-id"),i=Q.find(r=>r.id===s);t.addEventListener("mouseenter",()=>this.renderDetails(s,e)),t.addEventListener("click",()=>{this.selectedId=s;const r=this.ranks.get(s)??0;if(r>0){if(ye(i)&&r<i.stackable.softCap){const n=we(i,r);if(e>=n){this.buyNode(s,n,r+1);return}}}else if(Oe(s,this.ranks)&&e>=i.cost){this.handleUnlock(s,i.cost);return}this.el.querySelectorAll(".st-node-selected").forEach(n=>n.classList.remove("st-node-selected")),t.classList.add("st-node-selected"),this.renderDetails(s,e)}),t.addEventListener("contextmenu",r=>{r.preventDefault(),this.refundNode(s,i)})})}buyNode(e,t,s){this.characterId&&(this.ranks.set(e,s),this.skillPoints-=t,this.flashId=e,this.selectedId=e,this.render(),w.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:t}).then(({error:i})=>{i&&console.error("Purchase failed, reverting:",i.message),this.reload()}))}handleUnlock(e,t){this.buyNode(e,t,1)}refundBlockReason(e){var r;const t=this.ranks.get(e)??0;if(t===0)return"Not owned";if(t>1)return null;const s=jt[ht(this.charClass)];if(e===s)return"Class starter skill — cannot be removed";const i=new Map(this.ranks);i.delete(e);for(const o of i.keys())if(!Oe(o,i))return`${((r=Q.find(l=>l.id===o))==null?void 0:r.name)??o} depends on it`;return null}refundNode(e,t){if(!this.characterId)return;const s=this.ranks.get(e)??0;if(s===0||this.refundBlockReason(e)!==null)return;const i=we(t,s-1);s>1?this.ranks.set(e,s-1):this.ranks.delete(e),this.skillPoints+=i,this.flashId=e,this.selectedId=this.ranks.has(e)?e:null,this.render(),w.rpc("refund_skill_node",{p_character_id:this.characterId,p_node_id:e,p_refund:i}).then(({error:r})=>{r&&console.error("Refund failed, reverting:",r.message),this.reload()})}handleRespec(){this.showConfirm("Reset Skills","All unlocked skills will be removed and points refunded. Are you sure?",async()=>{if(!this.characterId)return;const{error:e}=await w.rpc("respec_skills",{p_character_id:this.characterId});if(e){console.error("Respec failed:",e.message);return}await this.reload()})}showConfirm(e,t,s){const i=document.createElement("div");i.className="st-confirm-overlay",i.innerHTML=`
      <div class="st-confirm-panel px-panel">
        <div class="st-confirm-title px-title">${K(e)}</div>
        <div class="st-confirm-text">${K(t)}</div>
        <div class="st-confirm-buttons">
          <button class="st-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="st-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".st-confirm-yes").addEventListener("click",()=>{i.remove(),s()}),i.querySelector(".st-confirm-no").addEventListener("click",()=>i.remove())}}function X(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const co={max_health:a=>`+${a} Max Health`,max_mana:a=>`+${a} Max Mana`,damage_pct:a=>`+${a}% Damage`,cast_speed_pct:a=>`+${a}% Cast Speed`,move_speed_pct:a=>`+${a}% Move Speed`,mana_regen_pct:a=>`+${a}% Mana Regen`};function Ls(a){return a.id==="talent"?`+${a.value} Talent Rank`:co[a.id](a.value)}function Si(a,e){return a!==null&&a>=e}function po(a,e){return a.purchased?"sold":Si(e,a.price)?"available":"unaffordable"}function $s(a,e){return a===402?"Not enough gold.":e}function ho(a=new Date){return a.toISOString().slice(0,10)}function mo(a,e){return a!==e}const fo=`
.sh-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.sh-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.sh-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.sh-header{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;max-width:900px;margin-bottom:16px;background:var(--px-panel);padding:12px 18px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);box-sizing:border-box;}
.sh-title{font-size:11px;letter-spacing:0.05em;}
.sh-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.sh-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.sh-col-vendor{flex:1 1 480px;min-width:320px;max-width:560px;}
.sh-col-lootbox{flex:0 0 280px;min-width:260px;display:flex;flex-direction:column;gap:14px;}
.sh-col-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;display:flex;flex-direction:column;gap:2px;}
.sh-countdown{font-size:12px;letter-spacing:0.05em;text-transform:none;font-style:italic;opacity:0.75;}
.sh-details{padding:14px 16px;min-height:120px;box-sizing:border-box;margin-bottom:12px;}
.sh-details-empty{color:var(--px-border-light);font-size:15px;line-height:1.6;text-align:center;padding-top:8px;}
.sh-details-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.sh-details-icon{width:36px;height:36px;flex:0 0 36px;display:flex;align-items:center;justify-content:center;background:#120e1c;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:16px;}
.sh-details-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.sh-details-kind{font-size:13px;color:var(--px-border-light);letter-spacing:0.04em;text-transform:capitalize;}
.sh-details-row{font-size:15px;line-height:1.5;color:var(--px-text);}
.sh-dim{color:var(--px-border-light);opacity:0.7;}
.sh-bad{color:var(--px-danger);}
.sh-vendor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.sh-vslot{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:transform 0.1s;}
.sh-vslot:hover{transform:scale(1.03);}
.sh-vslot-icon{font-size:1.3rem;}
.sh-vslot-name{font-family:'Press Start 2P',monospace;font-size:6px;text-align:center;line-height:1.4;}
.sh-vslot-price{font-size:15px;color:var(--px-accent);display:flex;align-items:center;gap:4px;}
.sh-crossclass-dim{opacity:0.65;}
.sh-crossclass{font-size:11px;color:var(--px-accent);opacity:0.85;text-align:center;line-height:1.3;}
.sh-notice{font-size:12px;color:var(--px-danger);text-align:center;line-height:1.3;}
.sh-stale-notice{font-size:14px;color:var(--px-accent);text-align:center;font-style:italic;margin-bottom:10px;}
.sh-sold{opacity:0.55;}
.sh-sold-badge{position:absolute;top:6px;right:6px;font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.05em;color:var(--px-danger);}
.sh-buy-btn{width:100%;font-size:6px;padding:8px 6px;margin-top:2px;}
.sh-buy-btn:disabled{opacity:0.5;cursor:not-allowed;}
.sh-lootbox{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.sh-lootbox-icon{font-size:2rem;color:var(--px-accent);}
.sh-lootbox-name{font-family:'Press Start 2P',monospace;font-size:9px;line-height:1.5;}
.sh-lootbox-price{font-size:16px;color:var(--px-accent);display:flex;align-items:center;gap:6px;}
.sh-open-btn{width:100%;font-size:7px;padding:10px 8px;}
.sh-open-btn:disabled{opacity:0.5;cursor:not-allowed;}
@keyframes sh-flash{0%{opacity:0;transform:scale(0.85)}60%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
.sh-reveal{width:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 8px;margin-top:6px;background:#120e1c;animation:sh-flash 0.35s ease-out;}
.sh-reveal-icon{font-size:1.4rem;}
.sh-reveal-name{font-family:'Press Start 2P',monospace;font-size:8px;line-height:1.5;}
.sh-reveal-note{font-size:13px;color:var(--px-success);font-style:italic;}
.sh-empty{grid-column:1 / -1;color:var(--px-border-light);font-size:15px;text-align:center;padding:20px 0;}
`;class uo{constructor(e){c(this,"el");c(this,"closeResolver",null);c(this,"vendor",null);c(this,"gold",null);c(this,"selectedSlotIndex",null);c(this,"pending",new Set);c(this,"noticeBySlot",new Map);c(this,"lootboxNotice",new Map);c(this,"reveal",null);c(this,"staleNotice",null);const t=document.createElement("style");t.textContent=fo,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="sh-overlay",e.appendChild(this.el)}async show(){this.selectedSlotIndex=null,this.pending.clear(),this.noticeBySlot.clear(),this.lootboxNotice.clear(),this.reveal=null,this.staleNotice=null,this.el.style.display="block",await this.reload(),await new Promise(e=>{this.closeResolver=e})}hide(){var e;this.el.style.display="none",(e=this.closeResolver)==null||e.call(this),this.closeResolver=null}async reload(){const[e,t]=await Promise.all([Hr(),Vt()]);this.vendor=e,this.gold=t,this.render()}render(){const e=this.vendor?this.vendor.slots.map(s=>this.renderVendorCard(s)).join(""):'<div class="sh-empty">Unable to load the vendor right now.</div>',t=["basic","premium"].map(s=>this.renderLootboxCard(s)).join("");this.el.innerHTML=`
      <div class="sh-vignette"></div>
      <div class="sh-ui">
        <div class="sh-header">
          <div class="sh-title px-title">Shop</div>
          <button id="sh-close" class="sh-btn px-btn px-btn-primary">Back to Lobby</button>
        </div>
        <div class="sh-columns">
          <div class="sh-col-vendor">
            <div class="sh-col-label">Vendor<span class="sh-countdown">new stock at midnight UTC</span></div>
            ${this.staleNotice?`<div class="sh-stale-notice">${X(this.staleNotice)}</div>`:""}
            <div id="sh-details" class="sh-details px-panel"></div>
            <div class="sh-vendor-grid">${e}</div>
          </div>
          <div class="sh-col-lootbox">
            <div class="sh-col-label">Loot Boxes</div>
            ${t}
          </div>
        </div>
      </div>
    `,this.attachListeners(),this.renderDetails(this.selectedSlotIndex)}renderVendorCard(e){const t=xe[e.rarity],s=po(e,this.gold),i=`vendor:${e.slotIndex}`,r=this.pending.has(i),o=s!=="available"||r,n=s==="sold"?"Sold":r?"Buying…":s==="unaffordable"?"Can't Afford":"Buy",l=this.noticeBySlot.get(e.slotIndex);return`
      <div class="${`sh-vslot${s==="sold"?" sh-sold":""}${e.crossClass?" sh-crossclass-dim":""}`}" data-slot="${e.slotIndex}" style="box-shadow:inset 0 0 0 2px ${t}">
        ${s==="sold"?'<div class="sh-sold-badge">SOLD</div>':""}
        <div class="sh-vslot-icon" style="color:${t}"><i class="fa ${e.base.icon}"></i></div>
        <div class="sh-vslot-name" style="color:${t}">${X(e.base.name)}</div>
        <div class="sh-vslot-price"><i class="fa fa-coins"></i> ${e.price}</div>
        ${e.crossClass?'<div class="sh-crossclass">⚠ No current class can use this</div>':""}
        ${l?`<div class="sh-notice">${X(l)}</div>`:""}
        <button class="sh-buy-btn px-btn px-btn-primary" data-buy-slot="${e.slotIndex}" ${o?"disabled":""}>${X(n)}</button>
      </div>`}renderLootboxCard(e){const t=ps[e],s=`lootbox:${e}`,i=this.pending.has(s),r=Si(this.gold,t),o=i||!r,n=i?"Opening…":r?"Open":"Can't Afford",l=this.lootboxNotice.get(e),d=this.reveal&&this.reveal.tier===e?this.renderReveal(this.reveal.item):"";return`
      <div class="sh-lootbox px-panel">
        <div class="sh-lootbox-icon"><i class="fa fa-box"></i></div>
        <div class="sh-lootbox-name">${e==="basic"?"Basic":"Premium"} Loot Box</div>
        <div class="sh-lootbox-price"><i class="fa fa-coins"></i> ${t}</div>
        ${l?`<div class="sh-notice">${X(l)}</div>`:""}
        <button class="sh-open-btn px-btn px-btn-primary" data-open-lootbox="${e}" ${o?"disabled":""}>${X(n)}</button>
        ${d}
      </div>`}renderReveal(e){const t=We(e);if(!t)return"";const s=xe[e.rarity],i=Ye(e,t);return`
      <div class="sh-reveal" style="box-shadow:inset 0 0 0 2px ${s}">
        <div class="sh-reveal-icon" style="color:${s}"><i class="fa ${t.icon}"></i></div>
        <div class="sh-reveal-name" style="color:${s}">${X(i)}</div>
        <div class="sh-reveal-note">Sent to stash</div>
      </div>`}renderDetails(e){var l;this.selectedSlotIndex=e;const t=this.el.querySelector("#sh-details");if(!t)return;const s=e!==null?(l=this.vendor)==null?void 0:l.slots.find(d=>d.slotIndex===e):void 0;if(!s){t.innerHTML='<div class="sh-details-empty">Hover a vendor slot to inspect it.</div>';return}const i=xe[s.rarity],r=`<div class="sh-details-row">${X(Ls(s.base.implicit))} <span class="sh-dim">(implicit)</span></div>`,o=s.affixes.map(d=>`<div class="sh-details-row">${X(Ls(d))}</div>`).join(""),n=s.base.classRestriction?`<div class="sh-details-row${s.crossClass?" sh-bad":""}">Class: ${X(s.base.classRestriction)}${s.crossClass?" — no current class can use this":""}</div>`:"";t.innerHTML=`
      <div class="sh-details-head">
        <div class="sh-details-icon" style="color:${i}"><i class="fa ${s.base.icon}"></i></div>
        <div>
          <div class="sh-details-name" style="color:${i}">${X(s.base.name)}</div>
          <div class="sh-details-kind">${X(s.rarity)} · Lvl ${s.base.itemLevel}+</div>
        </div>
      </div>
      ${r}
      ${o}
      ${n}
    `}attachListeners(){var e;(e=this.el.querySelector("#sh-close"))==null||e.addEventListener("click",()=>this.hide()),this.el.querySelectorAll("[data-slot]").forEach(t=>{const s=Number(t.dataset.slot);t.addEventListener("mouseenter",()=>this.renderDetails(s))}),this.el.querySelectorAll("[data-buy-slot]").forEach(t=>{const s=t,i=Number(s.dataset.buySlot);s.addEventListener("click",()=>{s.disabled||this.handleBuySlot(i)})}),this.el.querySelectorAll("[data-open-lootbox]").forEach(t=>{const s=t,i=s.dataset.openLootbox;s.addEventListener("click",()=>{s.disabled||this.handleOpenLootbox(i)})})}async handleBuySlot(e){var r;const t=`vendor:${e}`;if(this.pending.has(t))return;if(!this.vendor||mo(this.vendor.utcDay,ho())){this.staleNotice="New stock has arrived — refreshed.",await this.reload();return}this.staleNotice=null,this.pending.add(t),this.noticeBySlot.delete(e);const s=(r=this.vendor)==null?void 0:r.slots.find(o=>o.slotIndex===e);s&&this.gold!==null&&(s.purchased=!0,this.gold-=s.price),this.render();const i=await Ur(e);this.pending.delete(t),i.ok||this.noticeBySlot.set(e,$s(i.status,i.error)),await this.reload()}async handleOpenLootbox(e){const t=`lootbox:${e}`;if(this.pending.has(t))return;this.pending.add(t),this.lootboxNotice.delete(e),this.reveal=null,this.gold!==null&&(this.gold-=ps[e]),this.render();const s=await jr(e);this.pending.delete(t),s.ok?this.reveal={tier:e,item:s.item}:this.lootboxNotice.set(e,$s(s.status,s.error)),await this.reload()}}function k(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const Ne={basic:"#e8dff5",magic:"#4a6fc4",rare:"#ddb84a",unique:"#ffb347"},it={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring:"Ring",amulet:"Amulet"},xo={max_health:a=>`+${a} Max Health`,max_mana:a=>`+${a} Max Mana`,damage_pct:a=>`+${a}% Damage`,cast_speed_pct:a=>`+${a}% Cast Speed`,move_speed_pct:a=>`+${a}% Move Speed`,mana_regen_pct:a=>`+${a}% Mana Regen`};function Me(a){return a.id==="talent"?`+${a.value} Talent Rank${a.node?` (${a.node})`:""}`:xo[a.id](a.value)}const at={match_drop:{basic:70,magic:24,rare:5.5,unique:.5},lootbox_basic:{basic:60,magic:32,rare:7.5,unique:.5},lootbox_premium:{basic:25,magic:50,rare:21,unique:4}},go=[{key:"match_drop",label:"Match Drop"},{key:"lootbox_basic",label:"Lootbox — Basic"},{key:"lootbox_premium",label:"Lootbox — Premium"}];function As(a){const e=a.basic+a.magic+a.rare+a.unique;if(e<=0)return{basic:0,magic:0,rare:0,unique:0};const t=s=>Math.round(s/e*1e3)/10;return{basic:t(a.basic),magic:t(a.magic),rare:t(a.rare),unique:t(a.unique)}}function bo(a){const{basic:e,magic:t,rare:s,unique:i}=a;return e<0||t<0||s<0||i<0?"Weights must be non-negative.":e+t+s+i<=0?"At least one weight must be positive.":null}const Ce=200,Ps={items:"Items",manifests:"Manifests",grant:"Grant",droprates:"Drop Rates"},vo=`
.ad-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.ad-vignette{position:fixed;inset:0;background:radial-gradient(ellipse 80% 80% at 50% 50%,transparent 40%,rgba(0,0,0,0.85) 100%);pointer-events:none;z-index:151;}
.ad-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.ad-header{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;max-width:1100px;margin-bottom:16px;flex-wrap:wrap;background:var(--px-panel);padding:12px 18px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);box-sizing:border-box;}
.ad-title{font-size:11px;letter-spacing:0.05em;}
.ad-tabs{display:flex;gap:6px;flex-wrap:wrap;}
.ad-tab{font-size:7px;letter-spacing:0.05em;padding:8px 14px;}
.ad-tab-active{background:#453766;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.ad-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.ad-body{width:100%;max-width:1100px;}
.ad-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.ad-search{flex:1 1 220px;font-size:14px;padding:8px 10px;}
.ad-filters select{font-size:13px;padding:8px 10px;min-width:130px;}
.ad-cap-note{font-size:14px;color:var(--px-border-light);margin-bottom:8px;font-style:italic;min-height:1.2em;}
.ad-table-wrap{max-height:520px;overflow-y:auto;background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);margin-bottom:20px;}
.ad-table{width:100%;border-collapse:collapse;font-size:15px;}
.ad-table th{position:sticky;top:0;background:#241d33;font-family:'Press Start 2P',monospace;font-size:6px;letter-spacing:0.05em;text-transform:uppercase;color:var(--px-border-light);text-align:left;padding:8px 10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.ad-table td{padding:7px 10px;border-bottom:1px solid var(--px-border-dark);vertical-align:top;}
.ad-table tr:hover td{background:rgba(255,255,255,0.03);}
.ad-empty{text-align:center;color:var(--px-border-light);padding:20px 0 !important;font-style:italic;}
.ad-del-btn{font-size:6px;padding:6px 10px;}
.ad-del-btn:hover{color:var(--px-danger);}
.ad-manifest-label{font-family:'Press Start 2P',monospace;font-size:9px;letter-spacing:0.05em;text-transform:uppercase;color:var(--px-border-light);margin:14px 0 8px;}
.ad-manifest-label:first-child{margin-top:0;}
.ad-flavor{font-style:italic;color:var(--px-border-light);}
.ad-grant-columns{display:flex;gap:24px;flex-wrap:wrap;}
.ad-grant-col{flex:1 1 360px;min-width:320px;}
.ad-label{margin-bottom:6px;display:block;}
.ad-full{width:100%;box-sizing:border-box;}
.ad-target-row{display:flex;gap:8px;}
.ad-target-row .ad-full{flex:1;}
.ad-target-status{margin-top:6px;font-size:15px;min-height:1.4em;}
.ad-rarity-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.ad-rarity-btn{font-size:8px;letter-spacing:0.05em;text-transform:uppercase;padding:8px 12px;}
.ad-rarity-active{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.ad-preview{background:#1c1730;box-shadow:inset 0 0 0 2px var(--px-border-dark);padding:14px 16px;min-height:80px;}
.ad-preview-empty{color:var(--px-border-light);font-style:italic;text-align:center;padding:20px 0;}
.ad-preview-name{font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:8px;}
.ad-preview-row{font-size:16px;line-height:1.5;}
.ad-preview-flavor{font-style:italic;color:var(--px-border-light);margin-bottom:8px;font-size:14px;}
.ad-dim{color:var(--px-border-light);opacity:0.7;}
.ad-reroll-btn{margin-top:10px;font-size:7px;}
.ad-grant-status{margin-top:10px;font-size:15px;}
.ad-ok{color:var(--px-success);}
.ad-bad{color:var(--px-danger);}
.ad-drop-card{margin-bottom:18px;max-width:640px;}
.ad-drop-title{font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:14px;}
.ad-drop-key{color:var(--px-border-light);font-size:7px;text-transform:none;}
.ad-drop-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;}
.ad-drop-field{display:flex;flex-direction:column;gap:6px;}
.ad-drop-input{width:100%;box-sizing:border-box;font-size:16px;padding:8px 10px;}
.ad-drop-pct{font-size:14px;color:var(--px-accent);text-align:center;}
.ad-drop-buttons{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.ad-drop-status{font-size:14px;color:var(--px-success);}
.ad-drop-error{font-size:14px;margin-bottom:10px;}
.ad-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.ad-confirm-panel{padding:28px 32px;max-width:380px;text-align:center;}
.ad-confirm-title{margin-bottom:8px;}
.ad-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.ad-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.ad-confirm-yes,.ad-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
`;class yo{constructor(e){c(this,"el");c(this,"closeResolver",null);c(this,"tab","items");c(this,"items",[]);c(this,"usernames",new Map);c(this,"charNames",new Map);c(this,"filterRarity","");c(this,"filterSlot","");c(this,"filterSource","");c(this,"search","");c(this,"grantTargetQuery","");c(this,"grantTargetUserId",null);c(this,"grantTargetUsername",null);c(this,"grantTargetError",null);c(this,"grantRarity","basic");c(this,"grantBaseId",null);c(this,"grantUniqueId",null);c(this,"grantPreviewAffixes",[]);c(this,"grantStatus",null);c(this,"dropWeights",new Map);c(this,"dropStatus",new Map);c(this,"dropErrors",new Map);const t=document.createElement("style");t.textContent=vo,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="ad-overlay",e.appendChild(this.el)}async show(){this.tab="items",this.el.style.display="block",await this.reloadAll(),await new Promise(e=>{this.closeResolver=e})}hide(){var e;this.el.style.display="none",(e=this.closeResolver)==null||e.call(this),this.closeResolver=null}async reloadAll(){await Promise.all([this.reloadItems(),this.reloadDropTables()]),this.render()}async reloadItems(){this.items=await Ir();const e=this.items.map(r=>r.user_id),t=this.items.map(r=>r.equipped_by).filter(r=>r!==null),[s,i]=await Promise.all([Fr(e),Br(t)]);this.usernames=s,this.charNames=i}async reloadDropTables(){const e=await Or();for(const t of e)this.dropWeights.set(t.context,{...t.weights});for(const t of Object.keys(at))this.dropWeights.has(t)||this.dropWeights.set(t,{...at[t]})}render(){const e=Object.keys(Ps).map(s=>`<button class="ad-tab px-btn${s===this.tab?" ad-tab-active":""}" data-tab="${s}">${Ps[s]}</button>`).join("");let t;this.tab==="items"?t=this.renderItemsTab():this.tab==="manifests"?t=this.renderManifestsTab():this.tab==="grant"?t=this.renderGrantTab():t=this.renderDropRatesTab(),this.el.innerHTML=`
      <div class="ad-vignette"></div>
      <div class="ad-ui">
        <div class="ad-header">
          <div class="ad-title px-title">Admin</div>
          <div class="ad-tabs">${e}</div>
          <button id="ad-close" class="ad-btn px-btn px-btn-primary">Back to Lobby</button>
        </div>
        <div class="ad-body">${t}</div>
      </div>
    `,this.el.querySelector("#ad-close").addEventListener("click",()=>this.hide()),this.el.querySelectorAll("[data-tab]").forEach(s=>{s.addEventListener("click",()=>{this.tab=s.dataset.tab,this.render()})}),this.tab==="items"?this.attachItemsListeners():this.tab==="grant"?this.attachGrantListeners():this.tab==="droprates"&&this.attachDropRatesListeners()}filteredItems(){const e=this.search.trim().toLowerCase();return this.items.filter(t=>{if(this.filterRarity&&t.rarity!==this.filterRarity||this.filterSlot&&t.slot!==this.filterSlot||this.filterSource&&t.source!==this.filterSource)return!1;if(e){const s=O.find(o=>o.id===t.base_id),i=((s==null?void 0:s.name)??t.base_id).toLowerCase(),r=(this.usernames.get(t.user_id)??t.user_id).toLowerCase();if(!i.includes(e)&&!r.includes(e))return!1}return!0})}renderItemsTab(){const e=this.filteredItems(),t=e.slice(0,Ce),s=e.length>Ce?`Showing ${Ce} of ${e.length}`:"",i=t.length?t.map(l=>this.renderItemRow(l)).join(""):'<tr><td colspan="7" class="ad-empty">No items match.</td></tr>',r=["basic","magic","rare","unique"].map(l=>`<option value="${l}" ${this.filterRarity===l?"selected":""}>${l}</option>`).join(""),o=Object.keys(it).map(l=>`<option value="${l}" ${this.filterSlot===l?"selected":""}>${it[l]}</option>`).join(""),n=["starter","drop","vendor","lootbox","admin"].map(l=>`<option value="${l}" ${this.filterSource===l?"selected":""}>${l}</option>`).join("");return`
      <div class="ad-filters">
        <input id="ad-search" class="px-input ad-search" type="text" placeholder="Search owner or item name..." value="${k(this.search)}">
        <select id="ad-filter-rarity" class="px-input"><option value="">All Rarities</option>${r}</select>
        <select id="ad-filter-slot" class="px-input"><option value="">All Slots</option>${o}</select>
        <select id="ad-filter-source" class="px-input"><option value="">All Sources</option>${n}</select>
      </div>
      <div id="ad-cap-note" class="ad-cap-note">${s}</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>Owner</th><th>Item</th><th>Rarity</th><th>Slot</th><th>Source</th><th>Equipped By</th><th></th></tr></thead>
          <tbody id="ad-table-body">${i}</tbody>
        </table>
      </div>
    `}renderItemRow(e){const t=O.find(n=>n.id===e.base_id),s=(t==null?void 0:t.name)??e.base_id,i=Ne[e.rarity]??"#e8dff5",r=this.usernames.get(e.user_id)??e.user_id,o=e.equipped_by?this.charNames.get(e.equipped_by)??e.equipped_by:"—";return`<tr>
      <td>${k(r)}</td>
      <td style="color:${i}">${k(s)}</td>
      <td style="color:${i}">${k(e.rarity)}</td>
      <td>${k(e.slot)}</td>
      <td>${k(e.source)}</td>
      <td>${k(o)}</td>
      <td><button class="ad-del-btn px-btn" data-del="${k(e.id)}">Delete</button></td>
    </tr>`}attachItemsListeners(){var t,s,i;const e=this.el.querySelector("#ad-search");e==null||e.addEventListener("input",()=>{this.search=e.value,this.refreshItemsTable()}),(t=this.el.querySelector("#ad-filter-rarity"))==null||t.addEventListener("change",r=>{this.filterRarity=r.target.value,this.refreshItemsTable()}),(s=this.el.querySelector("#ad-filter-slot"))==null||s.addEventListener("change",r=>{this.filterSlot=r.target.value,this.refreshItemsTable()}),(i=this.el.querySelector("#ad-filter-source"))==null||i.addEventListener("change",r=>{this.filterSource=r.target.value,this.refreshItemsTable()}),this.attachDeleteButtons()}refreshItemsTable(){const e=this.filteredItems(),t=e.slice(0,Ce),s=this.el.querySelector("#ad-table-body"),i=this.el.querySelector("#ad-cap-note");s&&(s.innerHTML=t.length?t.map(r=>this.renderItemRow(r)).join(""):'<tr><td colspan="7" class="ad-empty">No items match.</td></tr>'),i&&(i.textContent=e.length>Ce?`Showing ${Ce} of ${e.length}`:""),this.attachDeleteButtons()}attachDeleteButtons(){this.el.querySelectorAll("[data-del]").forEach(e=>{const t=e.dataset.del;e.addEventListener("click",()=>this.confirmDelete(t))})}confirmDelete(e){const t=this.items.find(n=>n.id===e);if(!t)return;const s=O.find(n=>n.id===t.base_id),i=(s==null?void 0:s.name)??t.base_id,r=this.usernames.get(t.user_id)??t.user_id;let o=`Delete ${i} (${t.rarity}) owned by ${r}?`;if(t.equipped_by){const n=this.charNames.get(t.equipped_by)??t.equipped_by;o+=`

Warning: this item is currently equipped by ${n}. Deleting it will simply vanish next time that character's loadout loads.`}this.showConfirm("Delete Item",o,async()=>{await qr(e)||console.error("admin_delete_item failed"),await this.reloadItems(),this.render()})}renderManifestsTab(){const e=O.map(s=>`
      <tr>
        <td>${k(s.id)}</td>
        <td>${k(it[s.slot])}</td>
        <td>${k(s.name)}</td>
        <td>${s.itemLevel}</td>
        <td>${s.classRestriction?k(s.classRestriction):"—"}</td>
        <td>${k(Me(s.implicit))}</td>
      </tr>`).join(""),t=Te.map(s=>{const i=O.find(r=>r.id===s.baseId);return`
      <tr>
        <td>${k(s.id)}</td>
        <td style="color:${Ne.unique}">${k(s.name)}</td>
        <td>${k((i==null?void 0:i.name)??s.baseId)}</td>
        <td>${s.levelReq}</td>
        <td>${s.affixes.map(r=>k(Me(r))).join("<br>")}</td>
        <td class="ad-flavor">${k(s.flavor)}</td>
      </tr>`}).join("");return`
      <div class="ad-manifest-label">Item Bases (${O.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Slot</th><th>Name</th><th>ILvl</th><th>Class</th><th>Implicit</th></tr></thead>
          <tbody>${e}</tbody>
        </table>
      </div>
      <div class="ad-manifest-label">Unique Items (${Te.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Name</th><th>Base</th><th>Lvl Req</th><th>Affixes</th><th>Flavor</th></tr></thead>
          <tbody>${t}</tbody>
        </table>
      </div>
    `}renderGrantTab(){const e=this.grantTargetUserId?`<span class="ad-ok">Found: ${k(this.grantTargetUsername??"")}</span>`:this.grantTargetError?`<span class="ad-bad">${k(this.grantTargetError)}</span>`:"",t=["basic","magic","rare","unique"].map(n=>`<button class="ad-rarity-btn px-btn${n===this.grantRarity?" ad-rarity-active":""}" data-rarity="${n}" style="color:${Ne[n]}">${n}</button>`).join("");let s,i;if(this.grantRarity==="unique"){s=`
        <div class="ad-label px-label">Unique Item</div>
        <select id="ad-unique-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${Te.map(d=>{const p=O.find(h=>h.id===d.baseId);return`<option value="${k(d.id)}" ${d.id===this.grantUniqueId?"selected":""}>${k(d.name)} (${k((p==null?void 0:p.name)??d.baseId)})</option>`}).join("")}
        </select>`;const l=Te.find(d=>d.id===this.grantUniqueId);if(l){const d=O.find(p=>p.id===l.baseId);i=d?`
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${Ne.unique}">${k(l.name)}</div>
            <div class="ad-preview-flavor">${k(l.flavor)}</div>
            <div class="ad-preview-row">${k(Me(d.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${l.affixes.map(p=>`<div class="ad-preview-row">${k(Me(p))}</div>`).join("")}
            <div class="ad-preview-row">Level Req: ${l.levelReq}</div>
          </div>`:'<div class="ad-preview-empty">Unknown base for this unique.</div>'}else i='<div class="ad-preview-empty">Select a unique item.</div>'}else{s=`
        <div class="ad-label px-label">Base Item</div>
        <select id="ad-base-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${["weapon","helmet","armor","leggings","ring","amulet"].map(p=>{const h=O.filter(u=>u.slot===p);if(!h.length)return"";const f=h.map(u=>`<option value="${k(u.id)}" ${u.id===this.grantBaseId?"selected":""}>${k(u.name)} (ilvl ${u.itemLevel}${u.classRestriction?`, ${k(u.classRestriction)}`:""})</option>`).join("");return`<optgroup label="${k(it[p])}">${f}</optgroup>`}).join("")}
        </select>`;const d=O.find(p=>p.id===this.grantBaseId);if(d){const p=this.grantPreviewAffixes.map(f=>`<div class="ad-preview-row">${k(Me(f))}</div>`).join(""),h=this.grantRarity!=="basic"?'<button id="ad-reroll" class="px-btn ad-reroll-btn">🎲 Reroll</button>':"";i=`
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${Ne[this.grantRarity]}">${k(d.name)}</div>
            <div class="ad-preview-row">${k(Me(d.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${p||`<div class="ad-dim">No rolled affixes${this.grantRarity==="basic"?" (basic)":""}</div>`}
            <div class="ad-preview-row">Level Req: ${d.itemLevel}</div>
            ${h}
          </div>`}else i='<div class="ad-preview-empty">Select a base item.</div>'}const r=this.grantTargetUserId!==null&&(this.grantRarity==="unique"?this.grantUniqueId!==null:this.grantBaseId!==null),o=this.grantStatus?`<div class="ad-grant-status ${this.grantStatus.ok?"ad-ok":"ad-bad"}">${k(this.grantStatus.text)}</div>`:"";return`
      <div class="ad-grant-columns">
        <div class="ad-grant-col">
          <div class="ad-label px-label">Target Account</div>
          <div class="ad-target-row">
            <input id="ad-target-input" class="px-input ad-full" type="text" placeholder="Username" value="${k(this.grantTargetQuery)}">
            <button id="ad-target-find" class="px-btn">Find</button>
          </div>
          <div class="ad-target-status">${e}</div>

          <div class="ad-label px-label" style="margin-top:16px">Rarity</div>
          <div class="ad-rarity-row">${t}</div>

          ${s}
        </div>
        <div class="ad-grant-col">
          <div class="ad-label px-label">Preview</div>
          ${i}
          <button id="ad-grant-btn" class="px-btn px-btn-primary ad-full" ${r?"":"disabled"} style="margin-top:16px">Grant Item</button>
          ${o}
        </div>
      </div>
    `}attachGrantListeners(){var s,i,r,o;const e=this.el.querySelector("#ad-target-input");e==null||e.addEventListener("input",()=>{this.grantTargetQuery=e.value}),e==null||e.addEventListener("keydown",n=>{n.key==="Enter"&&this.handleFindTarget()}),(s=this.el.querySelector("#ad-target-find"))==null||s.addEventListener("click",()=>void this.handleFindTarget()),this.el.querySelectorAll("[data-rarity]").forEach(n=>{n.addEventListener("click",()=>{this.grantRarity=n.dataset.rarity,this.grantRarity!=="unique"&&this.regeneratePreview(),this.render()})}),(i=this.el.querySelector("#ad-unique-select"))==null||i.addEventListener("change",n=>{this.grantUniqueId=n.target.value||null,this.render()}),(r=this.el.querySelector("#ad-base-select"))==null||r.addEventListener("change",n=>{this.grantBaseId=n.target.value||null,this.regeneratePreview(),this.render()}),(o=this.el.querySelector("#ad-reroll"))==null||o.addEventListener("click",()=>{this.regeneratePreview(),this.render()});const t=this.el.querySelector("#ad-grant-btn");t==null||t.addEventListener("click",()=>{t.disabled||(t.disabled=!0,this.handleGrant())})}async handleFindTarget(){const e=this.grantTargetQuery.trim();if(!e)return;const t=await Nr(e);t?(this.grantTargetUserId=t,this.grantTargetUsername=e,this.grantTargetError=null):(this.grantTargetUserId=null,this.grantTargetUsername=null,this.grantTargetError="No account found with that username."),this.grantStatus=null,this.render()}regeneratePreview(){const e=O.find(t=>t.id===this.grantBaseId);this.grantPreviewAffixes=e?$a(e,this.grantRarity,Math.random):[]}async handleGrant(){if(!this.grantTargetUserId)return;let e,t,s,i,r,o,n;if(this.grantRarity==="unique"){const d=Te.find(h=>h.id===this.grantUniqueId);if(!d)return;const p=O.find(h=>h.id===d.baseId);if(!p)return;e=d.baseId,t="unique",s=d.affixes,i=d.levelReq,r=p.slot,o=p.classRestriction,n=d.name}else{const d=O.find(p=>p.id===this.grantBaseId);if(!d)return;e=d.id,t=this.grantRarity,s=this.grantPreviewAffixes,i=d.itemLevel,r=d.slot,o=d.classRestriction,n=d.name}const l=await zr(this.grantTargetUserId,e,t,s,i,r,o);this.grantStatus=l?{ok:!0,text:`Granted ${n} to ${this.grantTargetUsername??this.grantTargetUserId}.`}:{ok:!1,text:"Grant failed — see console."},l&&this.reloadItems(),this.render()}renderDropRatesTab(){return go.map(e=>this.renderDropContext(e.key,e.label)).join("")}renderDropContext(e,t){const s=this.dropWeights.get(e)??at[e],i=As(s),r=this.dropStatus.get(e),o=this.dropErrors.get(e),n=["basic","magic","rare","unique"].map(l=>`
      <div class="ad-drop-field">
        <label class="ad-label px-label">${l}</label>
        <input class="px-input ad-drop-input" type="number" min="0" step="0.1" data-context="${e}" data-rarity="${l}" value="${s[l]}">
        <div class="ad-drop-pct">${i[l].toFixed(1)}%</div>
      </div>`).join("");return`
      <div class="ad-drop-card px-panel">
        <div class="ad-drop-title">${k(t)} <span class="ad-drop-key">(${k(e)})</span></div>
        <div class="ad-drop-grid">${n}</div>
        ${o?`<div class="ad-drop-error ad-bad">${k(o)}</div>`:""}
        <div class="ad-drop-buttons">
          <button class="px-btn px-btn-primary" data-save="${e}">Save</button>
          <button class="px-btn" data-reset="${e}">Reset to Seed</button>
          ${r?`<span class="ad-drop-status">${k(r)}</span>`:""}
        </div>
      </div>
    `}attachDropRatesListeners(){this.el.querySelectorAll(".ad-drop-input").forEach(e=>{e.addEventListener("input",()=>{const t=e,s=t.dataset.context,i=t.dataset.rarity,r=this.dropWeights.get(s)??{basic:0,magic:0,rare:0,unique:0};r[i]=parseFloat(t.value)||0,this.dropWeights.set(s,r);const o=As(r),n=t.closest(".ad-drop-card");n==null||n.querySelectorAll(".ad-drop-field").forEach(l=>{const p=l.querySelector("input").dataset.rarity,h=l.querySelector(".ad-drop-pct");h&&(h.textContent=`${o[p].toFixed(1)}%`)})})}),this.el.querySelectorAll("[data-save]").forEach(e=>{const t=e;t.addEventListener("click",()=>{t.disabled||(t.disabled=!0,this.handleDropSave(t.dataset.save))})}),this.el.querySelectorAll("[data-reset]").forEach(e=>{const t=e;t.addEventListener("click",()=>{t.disabled||(t.disabled=!0,this.handleDropReset(t.dataset.reset))})})}async handleDropSave(e){const t=this.dropWeights.get(e);if(!t)return;const s=bo(t);if(s){this.dropErrors.set(e,s),this.dropStatus.delete(e),this.render();return}this.dropErrors.delete(e);const i=await Ss(e,t);this.dropStatus.set(e,i?"Saved.":"Save failed — see console."),this.render()}async handleDropReset(e){const t=at[e];if(!t)return;this.dropWeights.set(e,{...t}),this.dropErrors.delete(e);const s=await Ss(e,t);this.dropStatus.set(e,s?"Reset to seed.":"Reset failed — see console."),this.render()}showConfirm(e,t,s){const i=document.createElement("div");i.className="ad-confirm-overlay",i.innerHTML=`
      <div class="ad-confirm-panel px-panel">
        <div class="ad-confirm-title px-title">${k(e)}</div>
        <div class="ad-confirm-text">${k(t)}</div>
        <div class="ad-confirm-buttons">
          <button class="ad-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="ad-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".ad-confirm-yes").addEventListener("click",()=>{i.remove(),s()}),i.querySelector(".ad-confirm-no").addEventListener("click",()=>i.remove())}}const Mt=[{key:"body",label:"Body",options:I.body},{key:"skin",label:"Skin",options:I.skin},{key:"hairStyle",label:"Hair Style",options:I.hairStyle},{key:"hairColor",label:"Hair Color",options:I.hairColor},{key:"torsoColor",label:"Shirt Color",options:I.torsoColor},{key:"legsColor",label:"Pants Color",options:I.legsColor}],wo=2;function ko(a,e,t){return(e+t+a)%a}function So(a){return a===null?"None":a.split("_").map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}function Ct(a,e,t){return a==="skin"?`Tone ${t.indexOf(e)+1}`:So(e)}const _o=`
.ap-picker{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;}
.ap-left{flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;}
.ap-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ap-row-label{flex:0 0 auto;white-space:nowrap;}
.ap-row-control{display:flex;align-items:center;gap:6px;}
.ap-btn{padding:4px 8px;font-size:10px;}
.ap-value{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);min-width:96px;text-align:center;}
.ap-randomize{margin-top:4px;}
.ap-right{flex:0 0 auto;display:flex;align-items:center;justify-content:center;margin:0 auto;}
.ap-canvas{width:128px;height:128px;image-rendering:pixelated;background:#120e1c;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
`;let Rs=!1;function Mo(){if(Rs)return;Rs=!0;const a=document.createElement("style");a.textContent=_o,document.head.appendChild(a)}class Et{constructor(e,t,s){c(this,"onChange");c(this,"appearance");c(this,"el");c(this,"canvas");c(this,"ctx");c(this,"valueEls",new Map);c(this,"composite",null);c(this,"requestId",0);c(this,"rafId",null);c(this,"animStart",null);c(this,"disposed",!1);c(this,"loop",e=>{var n;this.rafId=requestAnimationFrame(this.loop);const t=(n=this.composite)==null?void 0:n.walk;if(!t)return;this.animStart===null&&(this.animStart=e);const s=(e-this.animStart)/1e3,i=nt("walk",s,!0),{sx:r,sy:o}=ot("walk",wo,i);this.ctx.clearRect(0,0,T,T),this.ctx.drawImage(t.image,r,o,T,T,0,0,T,T)});this.charClass=t,Mo(),this.appearance=s?{...s}:{...gt[t]},this.el=document.createElement("div"),this.el.className="ap-picker",e.appendChild(this.el);const i=document.createElement("div");i.className="ap-left",this.el.appendChild(i);for(const n of Mt){const l=document.createElement("div");l.className="ap-row",l.innerHTML=`
        <div class="ap-row-label px-label">${n.label}</div>
        <div class="ap-row-control">
          <button type="button" class="ap-btn px-btn ap-prev">◀</button>
          <span class="ap-value">${Ct(n.key,this.appearance[n.key],n.options)}</span>
          <button type="button" class="ap-btn px-btn ap-next">▶</button>
        </div>`;const d=l.querySelector(".ap-prev"),p=l.querySelector(".ap-next"),h=l.querySelector(".ap-value");this.valueEls.set(n.key,h),d.addEventListener("click",()=>this.cycle(n.key,-1)),p.addEventListener("click",()=>this.cycle(n.key,1)),i.appendChild(l)}const r=document.createElement("button");r.type="button",r.className="ap-randomize px-btn",r.textContent="⚄ Randomize",r.addEventListener("click",()=>this.randomize()),i.appendChild(r);const o=document.createElement("div");o.className="ap-right",this.canvas=document.createElement("canvas"),this.canvas.className="ap-canvas",this.canvas.width=T,this.canvas.height=T,this.ctx=this.canvas.getContext("2d"),o.appendChild(this.canvas),this.el.appendChild(o),this.recomposite(),this.rafId=requestAnimationFrame(this.loop)}getAppearance(){return{...this.appearance}}dispose(){this.disposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.composite&&(lt(this.composite),this.composite=null),this.el.remove()}cycle(e,t){var n;const s=Mt.find(l=>l.key===e),i=s.options.indexOf(this.appearance[e]),r=ko(s.options.length,i===-1?0:i,t),o=s.options[r];this.appearance={...this.appearance,[e]:o},this.valueEls.get(e).textContent=Ct(e,o,s.options),this.recomposite(),(n=this.onChange)==null||n.call(this,this.getAppearance())}randomize(){var e;this.appearance=ka(this.charClass);for(const t of Mt)this.valueEls.get(t.key).textContent=Ct(t.key,this.appearance[t.key],t.options);this.recomposite(),(e=this.onChange)==null||e.call(this,this.getAppearance())}recomposite(){const e=++this.requestId;this.composite&&(lt(this.composite),this.composite=null),this.animStart=null,li(this.appearance).then(t=>{if(this.disposed||e!==this.requestId){lt(t);return}this.composite=t,this.animStart=null})}}function Ee(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Is={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',ranger:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'},Co=`
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
.cs-create-panel{padding:28px;width:100%;max-width:600px;}
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
.cs-edit-look-panel{padding:28px 32px;max-width:600px;text-align:center;}
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
`;class Eo{constructor(e,t){c(this,"el");c(this,"ui");c(this,"characters",[]);c(this,"showingCreate",!1);c(this,"activePicker",null);this.cb=t;const s=document.createElement("style");s.textContent=Co,document.head.appendChild(s),this.el=document.createElement("div"),this.el.className="cs-overlay",this.ui=document.createElement("div"),this.ui.className="cs-ui",this.el.appendChild(this.ui),e.appendChild(this.el)}async show(){this.el.style.display="block",this.showingCreate=!1,this.characters=await ct(),this.render()}hide(){this.el.style.display="none"}render(){var i;if(this.showingCreate){this.renderCreateForm();return}(i=this.activePicker)==null||i.dispose(),this.activePicker=null;const e=this.characters.map((r,o)=>{const n=ba(r.level),l=n>0?Math.min(100,r.xp/n*100):0;return`
        <div class="cs-slot px-panel" data-index="${o}">
          <div class="cs-char-name px-title" style="font-size:12px">${Ee(r.name)}</div>
          <div class="cs-char-class px-label">${Is[r.class]??""} ${Ee(r.class)}</div>
          <div class="cs-char-level">Level ${r.level}</div>
          <div class="cs-xp-bar"><div class="cs-xp-fill" style="width:${l}%"></div></div>
          <div class="cs-xp-text">${r.xp} / ${n} XP</div>
          <div class="cs-slot-actions">
            <button class="cs-btn-select px-btn px-btn-primary" data-index="${o}">Select</button>
            <button class="cs-btn-look px-btn" data-index="${o}">Edit Look</button>
            <button class="cs-btn-delete px-btn" data-index="${o}">Delete</button>
          </div>
        </div>`}).join(""),t=Math.max(0,ga-this.characters.length),s=Array.from({length:t},()=>`
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
        ${s}
      </div>`,this.ui.querySelector("#cs-logout").addEventListener("click",()=>this.cb.onLogout()),this.ui.querySelectorAll(".cs-btn-select").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.cb.onSelectCharacter(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-look").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.showEditLook(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-delete").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.showDeleteConfirm(this.characters[n])})}),this.ui.querySelectorAll('[data-action="create"]').forEach(r=>{r.addEventListener("click",()=>{this.showingCreate=!0,this.render()})})}renderCreateForm(e="",t){var o;(o=this.activePicker)==null||o.dispose(),this.activePicker=null;const s=(t==null?void 0:t.selectedClass)??"mage",i=os.map(n=>{const l=n.id===s?"active":"",d=n.enabled?"":"disabled";return`<div class="cs-class-option ${l} ${d}" data-class="${n.id}">${Is[n.id]??""} ${Ee(n.label)}</div>`}).join("");this.ui.innerHTML=`
      <div class="cs-title px-title" style="font-size:24px">Blood Moor</div>
      <div class="cs-subtitle px-label">Create a New Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-create-panel px-panel">
        ${e?`<div class="cs-error">${Ee(e)}</div>`:""}
        <div class="cs-label px-label">Character Name</div>
        <input id="cs-name" class="cs-input px-input" type="text" placeholder="Name your champion..." maxlength="20">
        <div class="cs-label px-label">Class</div>
        <div class="cs-class-grid">${i}</div>
        <div class="cs-label px-label">Appearance</div>
        <div id="cs-appearance" class="cs-appearance-wrap"></div>
        <button id="cs-create-btn" class="cs-btn-create px-btn px-btn-primary">Forge Champion</button>
        <button id="cs-cancel-btn" class="cs-btn-cancel px-btn">Cancel</button>
      </div>`;let r=s;this.activePicker=new Et(this.ui.querySelector("#cs-appearance"),r,t==null?void 0:t.appearance),this.ui.querySelectorAll(".cs-class-option").forEach(n=>{n.addEventListener("click",()=>{var p;const l=n.dataset.class,d=os.find(h=>h.id===l);!(d!=null&&d.enabled)||l===r||(this.ui.querySelectorAll(".cs-class-option").forEach(h=>h.classList.remove("active")),n.classList.add("active"),r=l,(p=this.activePicker)==null||p.dispose(),this.activePicker=new Et(this.ui.querySelector("#cs-appearance"),r))})}),this.ui.querySelector("#cs-create-btn").addEventListener("click",async()=>{const n=this.ui.querySelector("#cs-name").value.trim(),l={selectedClass:r,appearance:this.activePicker.getAppearance()};if(!n){this.renderCreateForm("Name is required",l);return}if(n.length>20){this.renderCreateForm("Name must be 20 characters or less",l);return}const d=ls(l.appearance);if(!await $r(n,r,d)){this.renderCreateForm("Failed to create character. Name may already be taken.",l);return}this.showingCreate=!1,this.characters=await ct(),this.render()}),this.ui.querySelector("#cs-cancel-btn").addEventListener("click",()=>{this.showingCreate=!1,this.render()})}showDeleteConfirm(e){const t=document.createElement("div");t.className="cs-confirm-overlay",t.innerHTML=`
      <div class="cs-confirm-panel px-panel">
        <div class="cs-confirm-title px-title">Delete Character</div>
        <div class="cs-confirm-text">
          This will permanently delete <strong style="color:var(--px-accent)">${Ee(e.name)}</strong>
          and all their progress.<br><br>
          Type the character's name to confirm:
        </div>
        <input class="cs-confirm-input px-input" id="cs-delete-input" type="text" placeholder="${Ee(e.name)}">
        <div class="cs-confirm-buttons">
          <button class="cs-confirm-delete px-btn" id="cs-delete-confirm">Delete Forever</button>
          <button class="cs-confirm-cancel px-btn" id="cs-delete-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(t);const s=t.querySelector("#cs-delete-input"),i=t.querySelector("#cs-delete-confirm"),r=t.querySelector("#cs-delete-cancel");s.addEventListener("input",()=>{s.value===e.name?i.classList.add("enabled"):i.classList.remove("enabled")}),i.addEventListener("click",async()=>{if(s.value!==e.name)return;const o=await Ar(e.id);t.remove(),o&&(this.characters=await ct(),this.render())}),r.addEventListener("click",()=>t.remove())}showEditLook(e){const t=document.createElement("div");t.className="cs-confirm-overlay",t.innerHTML=`
      <div class="cs-edit-look-panel px-panel">
        <div class="cs-confirm-title px-title">Edit Look</div>
        <div class="cs-error" hidden></div>
        <div id="cs-edit-look-picker"></div>
        <div class="cs-confirm-buttons" style="margin-top:16px">
          <button class="px-btn px-btn-primary" id="cs-look-save">Save</button>
          <button class="px-btn" id="cs-look-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(t);const s=new Et(t.querySelector("#cs-edit-look-picker"),e.class,Sa(e.appearance,e.class)),i=t.querySelector(".cs-error"),r=t.querySelector("#cs-look-save"),o=t.querySelector("#cs-look-cancel"),n=()=>{s.dispose(),t.remove()};o.addEventListener("click",n),r.addEventListener("click",async()=>{i.hidden=!0,r.disabled=!0,o.disabled=!0;const l=ls(s.getAppearance());try{await yi(e.id,l),e.appearance=l,n(),this.render()}catch(d){console.error("update_appearance failed:",d instanceof Error?d.message:d),i.textContent="Failed to save look. Please try again.",i.hidden=!1,r.disabled=!1,o.disabled=!1}})}}function zs(a,e=64,t=8){const s=a.image,i=document.createElement("canvas");i.width=e,i.height=e;const r=i.getContext("2d");r.imageSmoothingEnabled=!0,r.drawImage(s,0,0,e,e);const o=r.getImageData(0,0,e,e);oa(o.data,t),r.putImageData(o,0,0);const n=new Bt(i);return n.colorSpace=a.colorSpace,n.wrapS=n.wrapT=Xs,n.magFilter=pe,n.minFilter=Ks,a.dispose(),n}function qs(a){return a.magFilter=pe,a.minFilter=Ks,a}class To{static async load(){const e=new Yi,t=(d,p)=>new Promise((h,f)=>e.load(d,u=>{u.colorSpace=p,h(u)},void 0,f)),s=ut,i=Vi,[r,o,n,l]=await Promise.all([t("/assets/textures/cobblestone/diffuse.jpg",s),t("/assets/textures/castle_stone/diffuse.jpg",s),t("/assets/textures/castle_stone/normal.jpg",i),t("/assets/textures/castle_stone/roughness.jpg",i)]);return{textures:{floor:{map:zs(r,64,12)},stone:{map:zs(o),normalMap:qs(n),roughnessMap:qs(l)}}}}}class Lo{constructor(e){c(this,"el");c(this,"hidden",!1);this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1a1524 0%,#0e0b16 60%,#0e0b16 100%);z-index:300;font-family:"VT323",monospace;transition:opacity 0.6s ease;',this.el.innerHTML=`
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
    `,e.appendChild(this.el)}hide(){return this.hidden?Promise.resolve():(this.hidden=!0,new Promise(e=>{this.el.addEventListener("transitionend",()=>{this.el.remove(),e()},{once:!0}),this.el.style.opacity="0"}))}}const $o=`
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
`;function Ao(){if(document.getElementById("px-theme"))return;const a=document.createElement("style");a.id="px-theme",a.textContent=$o,document.head.appendChild(a)}class Po{constructor(e){c(this,"el");this.el=document.createElement("div"),this.el.style.cssText="position:fixed;inset:0;z-index:500;display:none;background:rgba(14,11,22,0.9);overflow-y:auto;",this.el.innerHTML=`
      <div class="px-panel" style="max-width:640px;margin:48px auto;padding:24px">
        <div class="px-title" style="margin-bottom:12px">Art Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Character sprites are from the <b>Liberated Pixel Cup</b> collection
          (lpc.opengameart.org), licensed CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.
        </div>
        <pre id="credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <button id="credits-close" class="px-btn" style="margin-top:16px">Close</button>
      </div>`,e.appendChild(this.el),this.el.querySelector("#credits-close").addEventListener("click",()=>this.hide())}async show(){this.el.style.display="block";const e=this.el.querySelector("#credits-body");if(!e.textContent)try{const t=await fetch("/assets/lpc/CREDITS.filtered.csv");if(!t.ok)throw new Error(`credits fetch failed: ${t.status}`);e.textContent=Io(await t.text())}catch{e.textContent="Credits file missing — see client/public/assets/lpc/CREDITS.csv"}}hide(){this.el.style.display="none"}}function Ro(a){const e=[];let t="",s=!1;for(let i=0;i<a.length;i++){const r=a[i];s?r==='"'?a[i+1]==='"'?(t+='"',i++):s=!1:t+=r:r==='"'?s=!0:r===","?(e.push(t),t=""):t+=r}return e.push(t),e}function Io(a){return a.split(`
`).filter(t=>t.trim().length>0).slice(1).map(Ro).map(([t,,s,i])=>`${t} — ${s==null?void 0:s.trim()} (${i==null?void 0:i.trim()})`).join(`

`)}Ao();const zo=document.getElementById("canvas-container"),V=document.getElementById("ui-overlay"),Os=new Lo(V),qo=new Po(V),ee=new da(zo),ae=new Cr(V);ae.hide();const ge=new fr,Xe=new Set,_=new wr;let M="",j="",N={},oe=new Map,B=null,W=null,te={},H="1v1",$e,Ze=!1,fe=null,ft=[],se=new Set,G=null,de="",x=null,be=new Set,_i="none";function Oo(a){const e=new Set;for(const t of xt)a.has(t.node)&&e.add(t.spell);return e}let Mi=0;async function zt(a,e){const{data:t}=await w.from("skill_unlocks").select("node_id, rank").eq("character_id",a),s=t??[],i=new Set(s.map(d=>d.node_id)),r=jt[e];r&&i.add(r);const o=new Map;for(const d of s)o.set(d.node_id,d.rank??0);const n=(await wi()).filter(d=>d.equipped_by===a),{talentRanks:l}=Aa(n,e);for(const[d,p]of l)i.add(d),o.set(d,(o.get(d)??0)+p);be=Oo(i),_i=xa(o),Mi=o.get("utility.phase_shift")??0,ae.buildSpellSlots(be)}async function ne(){if(!de){b.setGold(null);return}const a=await Vt();b.setGold(a)}const Fs={0:13148160,1:12582960,2:32960,3:41024};let Ns,Ae="";const Fo=new lo(V),No=new Qr(V),Bo=new uo(V),Do=new yo(V),Ke=new Eo(V,{onSelectCharacter:async a=>{x=a,await zt(a.id,a.class),Ke.hide(),b.show(),b.showHome(a.name,a.skill_points_available,a.class,a.level),ne()},onLogout:async()=>{try{await w.auth.signOut()}catch{}Re(),de="",x=null,Ze=!1,M="",j="",N={},te={},H="1v1",$e=void 0,be=new Set,fe=null,_.disconnect(),b.hide(),b.setAdmin(!1),Ke.hide(),Xt.show()}});Ke.hide();const Xt=new so(V,{onAuthed:async(a,e)=>{de=e,Xt.hide(),await Ft,Os.hide();const t=await Lr();b.setAdmin((t==null?void 0:t.is_admin)??!1);const s=await Ho(e);if(s){await Uo(s,a,void 0);return}await Ke.show()},onShowLogin:async()=>{await Ft,Os.hide()}});async function Ho(a){try{const e=await fetch("/paused-match",{method:"POST",headers:{Authorization:`Bearer ${a}`}});if(!e.ok)return null;const{roomId:t}=await e.json();return t}catch{return null}}async function Uo(a,e,t){try{await Ft}catch{return}Ae=e,j=a,qt(),_.connect(),_.onRejoinAccepted(s=>{M=s.yourId,s.colorIndex,N=s.players,te={...s.players},ae.init(M),b.hide()}),_.onRejoinFailed(()=>{j="",M="",b.show(),b.showHome(e,t),ne()}),_.rejoinRoom(a,de)}const b=new to(V,{onCreateRoom:async(a,e)=>{Ae=a,H=e;const t=await fetch("/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:e})}),{roomId:s}=await t.json();_.connect(),_.joinRoom(s,a,de,void 0,x==null?void 0:x.id),_.onRoomJoined(({yourId:i,mode:r,teams:o,readyPlayerIds:n})=>{M=i,j=s,N={[i]:a},H=r??e,$e=o==null?void 0:o[i],se=new Set(n??[]),ae.init(M),b.showReady(s,N,M,H,se),b.appendSystemMessage("You have entered the lobby")}),qt()},onJoinRoom:(a,e,t)=>{Ae=e,_.connect(),_.joinRoom(a,e,de,t,x==null?void 0:x.id),_.onRoomJoined(({yourId:s,players:i,mode:r,teams:o,readyPlayerIds:n})=>{M=s,j=a,N=i,H=r??"1v1",$e=o==null?void 0:o[s],se=new Set(n??[]),Object.keys(i).indexOf(s),ae.init(M),te={...i},b.showReady(a,i,s,H,se),b.appendSystemMessage("You have entered the lobby")}),qt()},onReady:()=>_.ready(),onRematch:()=>_.rematch(),onReturnToLobby:()=>{Re(),_.disconnect(),Ze=!1,j="",N={},te={},H="1v1",$e=void 0,x?b.showHome(x.name,x.skill_points_available,x.class,x.level):b.showHome(Ae),ne()},onSendChatMessage:a=>_.sendChatMessage(a),onLogout:async()=>{try{await w.auth.signOut()}catch{}Re(),de="",x=null,Ze=!1,M="",j="",N={},te={},H="1v1",$e=void 0,be=new Set,fe=null,_.disconnect(),b.hide(),b.setAdmin(!1),Xt.show()},onOpenSkills:async()=>{if(!x)return;b.hide(),await Fo.show(x.id);const e=(await ct()).find(s=>s.id===x.id);e&&(x=e);const{data:{user:t}}=await w.auth.getUser();t&&x&&await zt(x.id,x.class),b.show(),x&&b.showHome(x.name,x.skill_points_available,x.class,x.level),ne()},onOpenGear:async()=>{x&&(b.hide(),await No.show(x.id,x.class,x.level),await zt(x.id,x.class),b.show(),x&&b.showHome(x.name,x.skill_points_available,x.class,x.level),ne())},onOpenShop:async()=>{x&&(b.hide(),await Bo.show(),b.show(),x&&b.showHome(x.name,x.skill_points_available,x.class,x.level),ne())},onSwitchCharacter:async()=>{b.hide(),await Ke.show()},onShowCredits:()=>{qo.show()},onOpenAdmin:async()=>{b.hide(),await Do.show(),b.show(),x?b.showHome(x.name,x.skill_points_available,x.class,x.level):b.showHome(Ae),ne()}});b.hide();function qt(a){if(Ze)return;Ze=!0,_.onChatMessage(({senderId:t,displayName:s,text:i})=>b.appendChatMessage(t,s,i)),_.onPlayerJoined(({id:t,displayName:s})=>{te[t]=s,N[t]=s,b.showReady(j,N,M,H,se),b.appendSystemMessage(`${s} has entered the lobby`)}),_.onGameReady(()=>b.showReady(j,N,M,H,se)),_.onPlayerReadyAck(({playerId:t})=>{se.add(t),b.showReady(j,N,M,H,se)}),_.onRematchRequested(({requesterId:t,countdown:s})=>{const i=t===M;b.showRematchCountdown(s,i)}),_.onGameState(t=>{B||(ge.clear(),Xe.clear(),Bs(),b.hide());const s=performance.now();ge.push(t,s);for(const[i,r]of Object.entries(t.players))r.castingSpell!==null&&Xe.add(i);if(!G&&t.players[M]&&(G=new yr(t.players[M].position)),G&&t.players[M]&&t.ack){const i=t.ack[M];i!==void 0&&G.reconcile(t.players[M].position,i)}});let e=!1;_.onDuelEnded(({winnerId:t,gameMode:s,matchResults:i})=>{e=!0;const r=s??H;let o;r==="2v2"?o=t===$e:o=t===M,b.hidePauseOverlay(),Re();const n=i==null?void 0:i[M];if(r==="ffa"&&!o){const l=ft.indexOf(M),p=l>=0?4-l:1;b.showResult(o,r,p,n)}else b.showResult(o,r,void 0,n);b.show(),x&&n&&(x={...x,level:n.newLevel||x.level,xp:n.newXp??x.xp}),ne()}),_.onRematchReady(()=>{e=!1,ge.clear(),Bs(),b.hide()}),_.onOpponentDisconnected(()=>{e?b.disableRematch():H==="1v1"?(Re(),b.showDisconnected(),b.show()):b.appendSystemMessage("A player disconnected")}),_.onPlayerDisconnected(({playerId:t})=>{const s=te[t]??"A player";b.appendSystemMessage(`${s} disconnected`),delete N[t],b.showReady(j,N,M,H,se)}),_.onPlayerLeft(({playerId:t})=>{const s=te[t]??"A player";b.appendSystemMessage(`${s} left the lobby`),delete N[t],delete te[t],b.showReady(j,N,M,H,se)}),_.onMatchPaused(({countdown:t})=>{b.showPauseOverlay(t,()=>{_.leavePausedMatch()})}),_.onGameResumed(()=>{b.hidePauseOverlay()}),_.onDisconnect(()=>{B&&j&&(fe={roomId:j})}),_.onReconnect(()=>{fe&&(_.onRejoinAccepted(t=>{fe=null,M=t.yourId,t.colorIndex,N=t.players,te={...te,...t.players},ae.init(M),B==null||B.setMyId(M),G=null}),_.onRejoinFailed(()=>{fe=null,Re(),b.showDisconnected(),b.show()}),_.rejoinRoom(fe.roomId,de))}),_.onRoomNotFound(()=>{x?b.showHome(x.name,x.skill_points_available,x.class,x.level):b.showHome(Ae),ne()})}function Bs(){for(const e of oe.values())e.dispose(V);oe.clear(),B==null||B.dispose(),W==null||W.dispose(),B=new hr(ee.scene,M),B.setArrowElement(_i),W=new kr(ee,ee.renderer.domElement),x&&W.setCharacterClass(x.class);const a=be.size>0?be:new Set(xt.filter(e=>e.charClass===((x==null?void 0:x.class)??"mage")).map(e=>e.spell));ae.buildSpellSlots(a),ae.show(),b.hide()}function Re(){W==null||W.dispose(),W=null,B==null||B.dispose(),B=null;for(const a of oe.values())a.dispose(V);oe.clear(),ae.hide(),ge.clear(),Xe.clear(),G=null,Ot=0,ft=[],se=new Set}let Ds=performance.now();const Tt=1e3/60;let Be=0,Ot=0;ee.startRenderLoop(()=>{var i;const a=performance.now(),e=Math.min((a-Ds)/1e3,.1);if(Ds=a,!W||!B)return;for(Be=Math.min(Be+e*1e3,100);Be>=Tt;){Be-=Tt;const r=W.buildInputFrame();if(G){const o=ge.getLatest(),n=o==null?void 0:o.players[M],l={};if(o&&n){const d=(n.slowUntil??0)>o.tick?n.slowFactor??1:1;if(l.speedMult=d*(((i=n.statMults)==null?void 0:i.moveSpeed)??1),r.castSpell===4&&be.has(4)&&a>=Ot){const p=(n.phantomStepUntil??0)>o.tick,h=p||n.mana>=mt[4].manaCost;(n.cooldowns[4]??0)<=0&&h&&n.hp>0&&(l.teleportTarget={...r.aimTarget},l.teleportRange=fa(Mi),p||(Ot=a+mt[4].cooldownTicks/Je*1e3))}}r.seq=G.applyInput(r.move,a,l)}_.sendInput(r)}const t=Be/Tt,s=ge.getInterpolated(a);if(s){for(const[r,o]of oe)r in s.players||(o.dispose(V),oe.delete(r));for(const[r,o]of Object.entries(s.players)){if(o.hp<=0&&!ft.includes(r)&&ft.push(r),!oe.has(r)){const p=Object.keys(s.players).indexOf(r)%Object.keys(Fs).length,h=new Za(o.charClass,o.appearance,Fs[p],o.displayName,V);ee.scene.add(h.group),oe.set(r,h)}const n=oe.get(r);if(r===M&&G){const d=G.getRenderPosition(t,a),p=W.getCurrentMouseWorld(),h=Math.atan2(p.y-d.y,p.x-d.x);n.setPosition(d.x,d.y,h)}else n.setPosition(o.position.x,o.position.y,o.facing);n.update(e,Xe.has(r)),o.hp<=0&&n.die();const l=(o.invisibleUntil??0)>s.tick&&r!==M;n.setVisible(!l),n.updateLabel(ee.camera,ee.getCanvasRect())}if(Xe.clear(),G&&s.players[M]){const r=G.getRenderPosition(t,a);ee.updateCamera(r.x,r.y,e)}else{const r=s.players[M];r&&ee.updateCamera(r.position.x,r.position.y,e)}W.refreshMouseWorld(),B.update(s),ae.update(s,W.getActiveSpell())}});const Ft=(async()=>{Ns=await To.load(),new Ba(Ns.textures).addToScene(ee.scene),ee.initPostProcessing()})().catch(a=>{throw console.error("Asset load failed:",a),a});document.addEventListener("visibilitychange",()=>{if(document.hidden&&G){const a=ge.getLatest();a!=null&&a.players[M]&&G.reset(a.players[M].position)}});
