var pr=Object.defineProperty;var fr=(s,e,t)=>e in s?pr(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var c=(s,e,t)=>fr(s,typeof e!="symbol"?e+"":e,t);import{M as H,O as da,B as St,F as Ki,S as _e,U as Dt,V as oe,W as rt,H as ot,N as ur,C as ha,a as ut,b as K,A as pa,c as ie,R as mr,d as gr,e as xr,L as br,f as vr,g as yr,h as fa,i as wr,j as kr,k as Sr,P as _r,l as Mr,m as Cr,n as Yt,o as Tr,p as $r,q as Er,D as Ar,r as be,G as je,s as ua,t as He,u as ma,v as Ai,w as ga,x as xa,y as Li,z as mi,E as ba,I as nt,J as ti,K as ii,Q as Lr,T as Pr,X as Pi,Y as gi,Z as Rr,_ as Ir,$ as va}from"./three-keT56WUa.js";import{l as zr,c as qr}from"./vendor-k1XoXMcf.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(a){if(a.ep)return;a.ep=!0;const r=t(a);fetch(a.href,r)}})();const ya={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class Qe{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Or=new da(-1,1,1,-1,0,1);class Nr extends St{constructor(){super(),this.setAttribute("position",new Ki([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ki([0,2,0,0,2,0],2))}}const Fr=new Nr;class Ri{constructor(e){this._mesh=new H(Fr,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Or)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class wa extends Qe{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof _e?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Dt.clone(e.uniforms),this.material=new _e({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new Ri(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class Qi extends Qe{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const a=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,n;this.inverse?(o=0,n=1):(o=1,n=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),r.buffers.stencil.setFunc(a.ALWAYS,o,4294967295),r.buffers.stencil.setClear(n),r.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(a.EQUAL,1,4294967295),r.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),r.buffers.stencil.setLocked(!0)}}class Br extends Qe{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Dr{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new oe);this._width=i.width,this._height=i.height,t=new rt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:ot}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new wa(ya),this.copyPass.material.blending=ur,this.clock=new ha}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let a=0,r=this.passes.length;a<r;a++){const o=this.passes[a];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(a),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),o.needsSwap){if(i){const n=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}Qi!==void 0&&(o instanceof Qi?i=!0:o instanceof Br&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new oe);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,a=this._height*this._pixelRatio;this.renderTarget1.setSize(i,a),this.renderTarget2.setSize(i,a);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(i,a)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Hr extends Qe{constructor(e,t,i=null,a=null,r=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=a,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new ut}render(e,t,i){const a=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=a}}const Ur={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new ut(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class We extends Qe{constructor(e,t,i,a){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=a,this.resolution=e!==void 0?new oe(e.x,e.y):new oe(256,256),this.clearColor=new ut(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new rt(r,o,{type:ot}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let p=0;p<this.nMips;p++){const u=new rt(r,o,{type:ot});u.texture.name="UnrealBloomPass.h"+p,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);const m=new rt(r,o,{type:ot});m.texture.name="UnrealBloomPass.v"+p,m.texture.generateMipmaps=!1,this.renderTargetsVertical.push(m),r=Math.round(r/2),o=Math.round(o/2)}const n=Ur;this.highPassUniforms=Dt.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=a,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new _e({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let p=0;p<this.nMips;p++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[p])),this.separableBlurMaterials[p].uniforms.invSize.value=new oe(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const d=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=d,this.bloomTintColors=[new K(1,1,1),new K(1,1,1),new K(1,1,1),new K(1,1,1),new K(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const h=ya;this.copyUniforms=Dt.clone(h.uniforms),this.blendMaterial=new _e({uniforms:this.copyUniforms,vertexShader:h.vertexShader,fragmentShader:h.fragmentShader,blending:pa,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new ut,this.oldClearAlpha=1,this.basic=new ie,this.fsQuad=new Ri(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),a=Math.round(t/2);this.renderTargetBright.setSize(i,a);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(i,a),this.renderTargetsVertical[r].setSize(i,a),this.separableBlurMaterials[r].uniforms.invSize.value=new oe(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2)}render(e,t,i,a,r){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let n=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[l].uniforms.direction.value=We.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=We.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),n=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new _e({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new oe(.5,.5)},direction:{value:new oe(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
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
				}`})}getCompositeMaterial(e){return new _e({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}We.BlurDirectionX=new oe(1,0);We.BlurDirectionY=new oe(0,1);const jr={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class Gr extends Qe{constructor(){super();const e=jr;this.uniforms=Dt.clone(e.uniforms),this.material=new mr({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new Ri(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},gr.getTransfer(this._outputColorSpace)===xr&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===br?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===vr?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===yr?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===fa?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===wr?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===kr&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const ka=360,fe=380;function Ji(s,e,t=ka){const i=Math.max(1,t);return{width:Math.max(1,Math.round(s/Math.max(1,e)*i)),height:i}}function Ii(s=ka){return 2*fe/s}function Ht(s,e){return Math.round(s/e)*e}function Vr(s,e){e=Math.max(2,Math.floor(e));const t=255/(e-1);for(let i=0;i<s.length;i+=4)s[i]=Math.round(s[i]/t)*t,s[i+1]=Math.round(s[i+1]/t)*t,s[i+2]=Math.round(s[i+2]/t)*t}const Wr=8;class Yr{constructor(e,t,i){c(this,"currentX");c(this,"currentZ");this.camera=e,this.currentX=t,this.currentZ=i}update(e,t,i){const a=Math.min(1,Wr*i);this.currentX+=(e-this.currentX)*a,this.currentZ+=(t-this.currentZ)*a;const r=Ii(),o=Ht(this.currentX,r),n=Ht(this.currentZ,r);this.camera.position.set(o+200,600,n+200),this.camera.lookAt(o,0,n)}}const es=200,ts=1e3,Xr={uniforms:{tDiffuse:{value:null},intensity:{value:.2}},vertexShader:`
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
  `};class Zr{constructor(e){c(this,"renderer");c(this,"scene");c(this,"camera");c(this,"cameraController");c(this,"composer");c(this,"animFrameId",0);c(this,"_raycaster",new Sr);c(this,"_groundPlane",new _r(new K(0,1,0),0));c(this,"_worldTarget",new K);c(this,"_ndc",new oe);c(this,"_canvasRect",null);c(this,"onResize",()=>{var r;const e=window.innerWidth,t=window.innerHeight,i=e/t;this.camera.left=-fe*i,this.camera.right=fe*i,this.camera.top=fe,this.camera.bottom=-fe,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,t);const a=Ji(e,t);(r=this.composer)==null||r.setSize(a.width,a.height),this._canvasRect=null});this.renderer=new Mr({antialias:!1}),this.renderer.setPixelRatio(1),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Cr,this.renderer.outputColorSpace=Yt,this.renderer.toneMapping=fa,this.renderer.domElement.style.imageRendering="pixelated",e.appendChild(this.renderer.domElement),this.scene=new Tr,this.scene.background=new ut(657938);const t=window.innerWidth/window.innerHeight;this.camera=new da(-fe*t,fe*t,fe,-fe,.1,3e3),this.cameraController=new Yr(this.camera,es,ts),this.cameraController.update(es,ts,1),this.buildLighting(),window.addEventListener("resize",this.onResize),this.onResize()}buildLighting(){this.scene.add(new $r(6706500,2.2)),this.scene.add(new Er(3359846,4465169,1.1));const e=new Ar(7833804,1.25);e.position.set(1500,800,1200),e.target.position.set(1e3,0,1e3),e.castShadow=!0,e.shadow.mapSize.set(2048,2048),e.shadow.camera.near=.5,e.shadow.camera.far=4e3,e.shadow.camera.left=-1500,e.shadow.camera.right=1500,e.shadow.camera.top=1500,e.shadow.camera.bottom=-1500,this.scene.add(e),this.scene.add(e.target)}initPostProcessing(){const e=Ji(window.innerWidth,window.innerHeight),t=new rt(e.width,e.height,{type:ot,magFilter:be,minFilter:be});this.composer=new Dr(this.renderer,t),this.composer.setSize(e.width,e.height),this.composer.addPass(new Hr(this.scene,this.camera)),this.composer.addPass(new We(new oe(e.width/2,e.height/2),.5,.4,.3)),this.composer.addPass(new wa(Xr)),this.composer.addPass(new Gr)}updateCamera(e,t,i){this.cameraController.update(e,t,i)}getCanvasRect(){return this._canvasRect||(this._canvasRect=this.renderer.domElement.getBoundingClientRect()),this._canvasRect}startRenderLoop(e){if(this.animFrameId!==0)return;const t=()=>{this.animFrameId=requestAnimationFrame(t),e(),this.composer?this.composer.render():this.renderer.render(this.scene,this.camera)};t()}stopRenderLoop(){cancelAnimationFrame(this.animFrameId),this.animFrameId=0}screenToWorld(e,t){const i=this.getCanvasRect();return this._ndc.set((e-i.left)/i.width*2-1,-((t-i.top)/i.height)*2+1),this._raycaster.setFromCamera(this._ndc,this.camera),this._raycaster.ray.intersectPlane(this._groundPlane,this._worldTarget),{x:this._worldTarget.x,y:this._worldTarget.z}}dispose(){var e;this.stopRenderLoop(),window.removeEventListener("resize",this.onResize),this.renderer.dispose(),(e=this.composer)==null||e.dispose()}}function Ut(s){return s==="ranger"||s==="amazon"?"ranger":"mage"}const q=2e3,ge=16,is=200,_t=60,ss=1/_t,xi=750,Sa=500,mt=6,lt=[{x:350,y:300,halfSize:28},{x:1e3,y:250,halfSize:28},{x:1650,y:300,halfSize:28},{x:400,y:750,halfSize:28},{x:1600,y:750,halfSize:28},{x:1e3,y:1e3,halfSize:28},{x:350,y:1450,halfSize:28},{x:750,y:1700,halfSize:28},{x:1250,y:1700,halfSize:28},{x:1650,y:1450,halfSize:28}],Kr=Math.round(1.5*_t),Qr=60,Jr=Math.round(.75*_t),eo=2,ct={1:{manaCost:25,cooldownTicks:30},2:{manaCost:60,cooldownTicks:180},3:{manaCost:100,cooldownTicks:300},4:{manaCost:40,cooldownTicks:120},5:{manaCost:20,cooldownTicks:24},6:{manaCost:50,cooldownTicks:24},7:{manaCost:80,cooldownTicks:240},8:{manaCost:30,cooldownTicks:90}},_a=600,bi={"fire.volatile_ember":{requiresAll:["fire.fireball"]},"fire.seeking_flame":{requiresAll:["fire.fireball"]},"fire.hellfire":{requiresAll:["fire.fireball"]},"fire.pyroclasm":{requiresAll:["fire.fireball"]},"fire.fire_wall":{requiresAll:["fire.fireball"],requiresAny:["fire.volatile_ember","fire.seeking_flame"]},"fire.enduring_flames":{requiresAll:["fire.fire_wall"]},"fire.searing_heat":{requiresAll:["fire.fire_wall"]},"fire.inferno_expanse":{requiresAll:["fire.fire_wall"]},"fire.meteor":{requiresAll:["fire.fire_wall"],requiresAny:["fire.enduring_flames","fire.searing_heat","fire.inferno_expanse"]},"fire.molten_impact":{requiresAll:["fire.meteor"]},"fire.blind_strike":{requiresAll:["fire.meteor"]},"fire.cataclysm":{requiresAll:["fire.meteor"]},"utility.phase_shift":{requiresAll:["utility.teleport"]},"utility.ethereal_form":{requiresAll:["utility.teleport"]},"utility.phantom_step":{requiresAll:["utility.teleport"],requiresAny:["utility.phase_shift","utility.ethereal_form"]},"archer.guided":{requiresAll:["archer.power_shot"]},"archer.multishot":{requiresAll:["archer.power_shot"]},"archer.homing":{requiresAll:["archer.guided"]},"archer.barrage":{requiresAll:["archer.multishot"]},"archer.rain_of_arrows":{requiresAll:["archer.power_shot"],requiresAny:["archer.homing","archer.barrage"]},"archer.sustained_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.piercing_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.wide_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.burn":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.freeze","archer.poison"]},"archer.freeze":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.poison"]},"archer.poison":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.freeze"]},"archer_utility.combat_roll":{requiresAll:["archer_utility.evade"]},"archer_utility.shadowstep":{requiresAll:["archer_utility.evade"]},"archer_utility.acrobatics":{requiresAll:["archer_utility.evade"],requiresAny:["archer_utility.combat_roll","archer_utility.shadowstep"]}};function Je(s,e){const t=bi[s];return t?!(t.requiresAll&&!t.requiresAll.every(i=>e.has(i))||t.requiresAny&&!t.requiresAny.some(i=>e.has(i))||t.mutuallyExclusive&&t.mutuallyExclusive.some(i=>e.has(i))):!0}const se=[{id:"fire.fireball",name:"Fireball",tree:"fire",tier:1,cost:1,isSpell:!0,description:"Fast projectile. 80–120 damage."},{id:"fire.volatile_ember",name:"Volatile Ember",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Larger fireball per rank.",stackable:{softCap:5,baseEffect:.4}},{id:"fire.seeking_flame",name:"Seeking Flame",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Homing toward enemy. Stronger per rank.",stackable:{softCap:5,baseEffect:12}},{id:"fire.hellfire",name:"Hellfire",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Larger, slower, harder-hitting fireball per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.pyroclasm",name:"Pyroclasm",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Fireball splits on impact. More splits per rank.",stackable:{softCap:3,baseEffect:1}},{id:"fire.fire_wall",name:"Fire Wall",tree:"fire",tier:4,cost:2,isSpell:!0,description:"Persistent fire barrier. 40 dmg/s."},{id:"fire.enduring_flames",name:"Enduring Flames",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+10% Fire Wall duration per rank.",stackable:{softCap:5,baseEffect:.1}},{id:"fire.searing_heat",name:"Searing Heat",tree:"fire",tier:5,cost:2,isSpell:!1,description:"+8% Fire Wall damage per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"fire.inferno_expanse",name:"Inferno Expanse",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+25% Fire Wall length and width per rank.",stackable:{softCap:5,baseEffect:.25}},{id:"fire.meteor",name:"Meteor",tree:"fire",tier:6,cost:3,isSpell:!0,description:"Delayed AoE strike. 200–280 damage."},{id:"fire.molten_impact",name:"Molten Impact",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Meteor leaves a burning crater for 3s."},{id:"fire.blind_strike",name:"Blind Strike",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Enemy cannot see the Meteor impact indicator."},{id:"fire.cataclysm",name:"Cataclysm",tree:"fire",tier:7,cost:1,isSpell:!1,description:"+15% Meteor radius per rank.",stackable:{softCap:5,baseEffect:.15}},{id:"utility.teleport",name:"Teleport",tree:"utility",tier:1,cost:1,isSpell:!0,description:"Instant displacement."},{id:"utility.phase_shift",name:"Phase Shift",tree:"utility",tier:2,cost:2,isSpell:!1,description:"+8% teleport range per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"utility.ethereal_form",name:"Ethereal Form",tree:"utility",tier:2,cost:2,isSpell:!1,description:"0.5s invulnerability after teleporting."},{id:"utility.phantom_step",name:"Phantom Step",tree:"utility",tier:3,cost:3,isSpell:!1,description:"Next cast is instant within 2s of teleporting."},{id:"archer.power_shot",name:"Power Shot",tree:"archer",tier:1,cost:1,isSpell:!0,description:"Fast arrow projectile. 60–90 damage."},{id:"archer.guided",name:"Guided",tree:"archer",tier:2,cost:2,isSpell:!1,description:"Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4). Each completed redirect adds +5% damage.",stackable:{softCap:4,baseEffect:1},keystone:{name:"Relentless",description:"Redirects never run out — the arrow re-acquires until it hits something."}},{id:"archer.multishot",name:"Multi-shot",tree:"archer",tier:2,cost:2,isSpell:!0,description:"Fire 3 arrows in a spread. 40–60 damage each."},{id:"archer.homing",name:"Homing",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Guided redirects happen sooner per rank.",stackable:{softCap:3,baseEffect:6},keystone:{name:"Predator",description:"Redirects lead the target, aiming where they are moving."}},{id:"archer.barrage",name:"Barrage",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Multi-shot gains extra arrows per rank.",stackable:{softCap:5,baseEffect:2},keystone:{name:"Echo Volley",description:"0.25s after Multi-shot, a second volley fires at the same angles for 35% damage."}},{id:"archer.rain_of_arrows",name:"Rain of Arrows",tree:"archer",tier:4,cost:2,isSpell:!0,description:"Mark a zone. Arrows rain after 1.5s. 150–220 AoE damage."},{id:"archer.sustained_rain",name:"Sustained Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"Rain zone lasts longer per rank.",stackable:{softCap:5,baseEffect:.35},keystone:{name:"Stormcall",description:"The rain zone slowly drifts toward the nearest enemy."}},{id:"archer.piercing_rain",name:"Piercing Rain",tree:"archer",tier:5,cost:2,isSpell:!1,description:"Rain damage increases per rank.",stackable:{softCap:3,baseEffect:.25},keystone:{name:"Exposed",description:"Enemies inside your rain zone take +15% damage from all your attacks."}},{id:"archer.wide_rain",name:"Wide Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"+15% Rain of Arrows radius per rank.",stackable:{softCap:5,baseEffect:.15},keystone:{name:"Twin Storm",description:"Casting also marks a half-size zone on the enemy's position."}},{id:"archer.burn",name:"Burn",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows burn. More damage per rank.",stackable:{softCap:3,baseEffect:12},keystone:{name:"Ignite",description:"Hitting a burning enemy detonates the burn for 40 burst damage."}},{id:"archer.freeze",name:"Freeze",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows freeze. Stronger slow per rank.",stackable:{softCap:3,baseEffect:.09},keystone:{name:"Deep Freeze",description:"The first freeze roots the target for 0.4s (once per 6s per target)."}},{id:"archer.poison",name:"Poison",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows poison. More damage and mana drain per rank.",stackable:{softCap:3,baseEffect:7},keystone:{name:"Withering Venom",description:"Poison also drains 10 mana per second."}},{id:"archer_utility.evade",name:"Evade",tree:"archer_utility",tier:1,cost:1,isSpell:!0,description:"Short dash with invulnerability frames (~0.3s)."},{id:"archer_utility.combat_roll",name:"Combat Roll",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Fire an arrow at the nearest enemy during evade."},{id:"archer_utility.shadowstep",name:"Shadowstep",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Become invisible for 0.5s after evading."},{id:"archer_utility.acrobatics",name:"Acrobatics",tree:"archer_utility",tier:3,cost:3,isSpell:!1,description:"Evade cooldown reduced per rank.",stackable:{softCap:3,baseEffect:.1},keystone:{name:"Second Wind",description:"Evade holds 2 charges."}}];new Map(se.map(s=>[s.id,s]));const $e=[{spell:1,node:"fire.fireball",defaultSlot:1,charClass:"mage"},{spell:2,node:"fire.fire_wall",defaultSlot:2,charClass:"mage"},{spell:3,node:"fire.meteor",defaultSlot:3,charClass:"mage"},{spell:4,node:"utility.teleport",defaultSlot:4,charClass:"mage"},{spell:5,node:"archer.power_shot",defaultSlot:1,charClass:"ranger"},{spell:6,node:"archer.multishot",defaultSlot:2,charClass:"ranger"},{spell:7,node:"archer.rain_of_arrows",defaultSlot:3,charClass:"ranger"},{spell:8,node:"archer_utility.evade",defaultSlot:4,charClass:"ranger"}],to={mage:4,ranger:8},io=new Set($e.map(s=>s.spell));function zi(s,e){const t=new Array(mt).fill(null),i=new Set,a=(r,o)=>{t[r]=o,i.add(o)};for(const r of e){if(!Number.isInteger(r.slot)||r.slot<1||r.slot>mt||!io.has(r.spell))continue;const o=r.spell;s.has(o)&&(i.has(o)||t[r.slot-1]===null&&a(r.slot-1,o))}if(i.size>0)return t;for(const r of $e){if(!s.has(r.spell)||i.has(r.spell)||r.defaultSlot===void 0)continue;const o=r.defaultSlot-1;t[o]===null&&a(o,r.spell)}for(const r of $e){if(!s.has(r.spell)||i.has(r.spell))continue;const o=t.indexOf(null);if(o===-1)break;a(o,r.spell)}return t}const qi={mage:"fire.fireball",ranger:"archer.power_shot"};function so(s){return _a*(s>0?1+Be(.08,s):1)}const ao=.7;function Be(s,e){return e<=0?0:s*Math.pow(e,ao)}function ro(s){const e=s.get("archer.burn")??0,t=s.get("archer.freeze")??0,i=s.get("archer.poison")??0,a=Math.max(e,t,i);return a<=0?"none":e===a?"burn":t===a?"freeze":"poison"}function Pe(s){return s.stackable!==void 0}function Et(s,e){if(!s.stackable)return e===0?s.cost:1/0;const t=e+1,i=Math.max(0,t-s.stackable.softCap);return s.cost+i}function Ma(s){return{x:Math.max(ge,Math.min(q-ge,s.x)),y:Math.max(ge,Math.min(q-ge,s.y))}}function Ca(s){let e={...s};for(const t of lt){const i=t.x-t.halfSize-ge,a=t.x+t.halfSize+ge,r=t.y-t.halfSize-ge,o=t.y+t.halfSize+ge;if(e.x>i&&e.x<a&&e.y>r&&e.y<o){const n=e.x-i,l=a-e.x,d=e.y-r,h=o-e.y,p=Math.min(n,l,d,h);p===n?e.x=i:p===l?e.x=a:p===d?e.y=r:e.y=o}}return e}function as(s,e,t=_a){const i=e.x-s.x,a=e.y-s.y,r=Math.sqrt(i*i+a*a),o=r>t?{x:s.x+i/r*t,y:s.y+a/r*t}:{x:e.x,y:e.y};return Ca(Ma(o))}function rs(s,e,t=1){const i=Math.sqrt(e.x*e.x+e.y*e.y);if(i===0)return s;const a=e.x/i,r=e.y/i,o={x:s.x+a*is*ss*t,y:s.y+r*is*ss*t};return Ca(Ma(o))}const oo=6,os=[{id:"mage",label:"Mage",enabled:!0},{id:"ranger",label:"Ranger",enabled:!0}];function no(s){return Math.floor(100*Math.pow(s,1.5))}const ve={walk:{frames:9,singleRow:!1,fps:12},run:{frames:8,singleRow:!1,fps:12},idle:{frames:2,singleRow:!1,fps:2},spellcast:{frames:7,singleRow:!1,fps:12},shoot:{frames:13,singleRow:!1,fps:14},hurt:{frames:6,singleRow:!0,fps:8},slash:{frames:6,singleRow:!1,fps:14}},si={purple:"#8a5fc4",green:"#4d8f4d",black:"#4a4a52",brown:"#7d5a38",red:"#c0503a",blue:"#4a6fc4",white:"#f0f0f0",blonde:"#d9b256",gray:"#9a9aa2"},lo={olive:"#ae6b3f",bronze:"#7f4c31",brown:"#76513a",black:"#442725"},Mt={mage:{body:"male",skin:"light",hairStyle:null,hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"purple",legsColor:"black",hat:"wizard",hatColor:"base_black"},ranger:{body:"female",skin:"light",hairStyle:"ponytail",hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"green",legsColor:"brown",hat:null,hatColor:"base_black"}},B={body:["male","female"],skin:["light","olive","bronze","brown","black"],hairStyle:[null,"ponytail","plain","long","curly_short","bangs"],hairColor:["red","blonde","brown","black","gray","blue","green","purple","white"],eyes:[null,"blue","brown","green","gray"],torsoColor:["purple","green","red","blue","brown","black","white"],legsColor:["black","brown","blue","green","red","white"]},co=new Set(["ponytail"]);function ho(s){const e=[],t=lo[s.skin],i=si[s.hairColor],a=s.hairStyle!=null&&co.has(s.hairStyle);return s.hairStyle&&a&&e.push({path:`hair/${s.hairStyle}/adult/bg`,z:0,tint:i,tintMode:"fabric"}),e.push({path:`body/bodies/${s.body}`,z:10,tint:t,tintMode:"skin"}),e.push({path:`head/heads/human/${s.body==="female"?"female_small":"male"}`,z:20,tint:t,tintMode:"skin"}),s.eyes&&e.push({path:`eyes/human/adult/default/${s.eyes}`,z:25}),s.hairStyle&&(a?e.push({path:`hair/${s.hairStyle}/adult/fg`,z:30,tint:i,tintMode:"fabric"}):e.push({path:`hair/${s.hairStyle}/adult`,z:30,tint:i,tintMode:"fabric"})),e.push({path:`torso/clothes/${s.torso}/${s.torso}/${s.body}`,z:40,tint:si[s.torsoColor],tintMode:"fabric"}),e.push({path:`legs/pants/${s.body==="female"?"thin":"male"}`,z:50,tint:si[s.legsColor],tintMode:"fabric"}),s.hat&&e.push({path:`hat/magic/${s.hat}/base/adult/${s.hatColor}`,z:60}),e.sort((r,o)=>r.z-o.z)}function we(s,e){return e.includes(s)}function ns(s,e){const t=Mt[e];if(typeof s!="object"||s===null)return{...t};const i=s;return{body:we(i.body,B.body)?i.body:t.body,skin:we(i.skin,B.skin)?i.skin:t.skin,hairStyle:we(i.hairStyle,B.hairStyle)?i.hairStyle:t.hairStyle,hairColor:we(i.hairColor,B.hairColor)?i.hairColor:t.hairColor,eyes:we(i.eyes,B.eyes)?i.eyes:t.eyes,torso:t.torso,torsoColor:we(i.torsoColor,B.torsoColor)?i.torsoColor:t.torsoColor,legsColor:we(i.legsColor,B.legsColor)?i.legsColor:t.legsColor,hat:t.hat,hatColor:t.hatColor}}function po(s,e=Math.random){const t=Mt[s],i=a=>a[Math.floor(e()*a.length)];return{body:i(B.body),skin:i(B.skin),hairStyle:i(B.hairStyle),hairColor:i(B.hairColor),eyes:null,torso:t.torso,torsoColor:i(B.torsoColor),legsColor:i(B.legsColor),hat:t.hat,hatColor:t.hatColor}}function ls(s){return{body:s.body,skin:s.skin,hair_style:s.hairStyle,hair_color:s.hairColor,eyes:s.eyes,torso_color:s.torsoColor,legs_color:s.legsColor}}function Xt(s,e){if(typeof s!="object"||s===null)return ns(s,e);const t=s;return ns({body:t.body,skin:t.skin,hairStyle:t.hair_style,hairColor:t.hair_color,eyes:t.eyes,torso:t.torso,torsoColor:t.torso_color,legsColor:t.legs_color,hat:t.hat,hatColor:t.hat_color},e)}const Re={maxHp:xi,maxMana:Sa,damageMult:1,cooldownMult:1,moveSpeedMult:1,manaRegenMult:1},cs={max_health:[[20,40],[40,70],[70,110],[110,160]],max_mana:[[15,30],[30,50],[50,80],[80,120]],damage_pct:[[2,4],[4,7],[7,11],[11,15]],cast_speed_pct:[[2,3],[3,5],[5,8],[8,10]],move_speed_pct:[[2,3],[3,4],[4,6],[6,8]],mana_regen_pct:[[5,10],[10,15],[15,25],[25,35]],talent:[[1,1],[1,1],[1,2],[1,3]]},vi=[1,4,7,10],Ta=["max_health","max_mana","damage_pct","cast_speed_pct","move_speed_pct","mana_regen_pct"],fo={move_speed_pct:["leggings"]};function uo(s){return Ta.filter(e=>{const t=fo[e];return!t||t.includes(s.slot)})}const N=[{id:"leather_cap",slot:"helmet",name:"Leather Cap",icon:"fa-helmet-safety",itemLevel:1,implicit:{id:"max_health",value:15},lpc:{layers:[{path:"hat/cloth/leather_cap/adult/leather",z:60}]}},{id:"iron_helm",slot:"helmet",name:"Iron Helm",icon:"fa-helmet-safety",itemLevel:7,implicit:{id:"max_health",value:60},lpc:{layers:[{path:"hat/helmet/barbuta/{body}",z:60}],hidesHair:!0}},{id:"padded_tunic",slot:"armor",name:"Padded Tunic",icon:"fa-shirt",itemLevel:1,implicit:{id:"max_health",value:25},lpc:{layers:[{path:"torso/armour/leather/{body}",z:40}]}},{id:"scale_mail",slot:"armor",name:"Scale Mail",icon:"fa-shirt",itemLevel:7,implicit:{id:"max_health",value:90},lpc:{layers:[{path:"torso/chainmail/{body}",z:40}]}},{id:"cloth_pants",slot:"leggings",name:"Cloth Pants",icon:"fa-socks",itemLevel:1,implicit:{id:"max_health",value:10},lpc:{layers:[{path:"legs/pants/{legs}",z:50,tint:"#c9a86a",tintMode:"fabric"}]}},{id:"mail_leggings",slot:"leggings",name:"Mail Leggings",icon:"fa-socks",itemLevel:7,implicit:{id:"max_health",value:45},lpc:{layers:[{path:"legs/leggings/{legs}",z:50,tint:"#9a9aa2",tintMode:"fabric"}]}},{id:"bone_ring",slot:"ring",name:"Bone Ring",icon:"fa-ring",itemLevel:1,implicit:{id:"max_mana",value:10}},{id:"silver_ring",slot:"ring",name:"Silver Ring",icon:"fa-ring",itemLevel:4,implicit:{id:"max_mana",value:18}},{id:"carved_amulet",slot:"amulet",name:"Carved Amulet",icon:"fa-gem",itemLevel:4,implicit:{id:"max_mana",value:25}},{id:"moon_amulet",slot:"amulet",name:"Moon Amulet",icon:"fa-gem",itemLevel:7,implicit:{id:"max_mana",value:25}},{id:"apprentice_staff",slot:"weapon",name:"Apprentice Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:1,implicit:{id:"damage_pct",value:2},lpc:{layers:[{path:"weapon/magic/simple/background/simple",z:5,weaponRole:"behind"},{path:"weapon/magic/simple/foreground/simple",z:70,weaponRole:"front"}]}},{id:"gnarled_staff",slot:"weapon",name:"Gnarled Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:7,implicit:{id:"damage_pct",value:6},lpc:{layers:[{path:"weapon/magic/gnarled/universal/background/gnarled",z:5,weaponRole:"behind"},{path:"weapon/magic/gnarled/universal/foreground/gnarled",z:70,weaponRole:"front"}]}},{id:"archmage_staff",slot:"weapon",name:"Archmage Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:10,implicit:{id:"damage_pct",value:9},lpc:{layers:[{path:"weapon/magic/crystal/universal/background/purple",z:5,weaponRole:"behind"},{path:"weapon/magic/crystal/universal/foreground/purple",z:70,weaponRole:"front"}]}},{id:"short_bow",slot:"weapon",name:"Short Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:1,implicit:{id:"damage_pct",value:2},lpc:{layers:[{path:"weapon/ranged/bow/normal/universal/background/normal",z:5,weaponRole:"behind"},{path:"weapon/ranged/bow/normal/universal/foreground/normal",z:70,weaponRole:"front"}],nativeAnims:["shoot"]}},{id:"war_bow",slot:"weapon",name:"War Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:7,implicit:{id:"damage_pct",value:6},lpc:{layers:[{path:"weapon/ranged/bow/recurve/universal/background/recurve",z:5,weaponRole:"behind"},{path:"weapon/ranged/bow/recurve/universal/foreground/recurve",z:70,weaponRole:"front"}],nativeAnims:["shoot"]}},{id:"great_bow",slot:"weapon",name:"Great Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:10,implicit:{id:"damage_pct",value:9},lpc:{layers:[{path:"weapon/ranged/bow/great/universal/background/great",z:5,weaponRole:"behind"},{path:"weapon/ranged/bow/great/universal/foreground/great",z:70,weaponRole:"front"}],nativeAnims:["shoot"]}}],De=[{id:"emberheart",baseId:"moon_amulet",name:"Emberheart",flavor:"A cinder that never cools, warm to the touch even in the dead of winter.",affixes:[{id:"max_mana",value:60},{id:"damage_pct",value:8},{id:"talent",value:2,node:"fire.volatile_ember"},{id:"talent",value:1,node:"fire.searing_heat"}],levelReq:7},{id:"windrunner_band",baseId:"bone_ring",name:"Windrunner Band",flavor:"Fletched with feathers that never touched a bird.",affixes:[{id:"move_speed_pct",value:6},{id:"cast_speed_pct",value:5},{id:"talent",value:2,node:"archer.barrage"}],levelReq:7}],mo=.25,$a={mage:["fire","utility"],ranger:["archer","archer_utility"]};function ds([s,e],t){return s+Math.floor(t()*(e-s+1))}function go(s,e,t){const i=[...s],a=[];for(let r=0;r<e&&i.length>0;r++){const o=Math.floor(t()*i.length);a.push(i.splice(o,1)[0])}return a}function xo(s){return s.classRestriction?[s.classRestriction]:["mage","ranger"]}function bo(s,e){const t=new Set(xo(s).flatMap(o=>$a[o])),i=se.map(o=>({node:o.id,weight:t.has(o.tree)?2:1})),a=i.reduce((o,n)=>o+n.weight,0);let r=e()*a;for(const o of i)if(r-=o.weight,r<0)return o.node;return i[i.length-1].node}function vo(s,e,t=Math.random){if(e==="basic")return[];const i=vi.indexOf(s.itemLevel),a=e==="magic"?1+Math.floor(t()*2):3+Math.floor(t()*3),r=e!=="magic"&&t()<mo,o=r?a-1:a,n=go(uo(s),o,t).map(l=>({id:l,value:ds(cs[l][i],t)}));return r&&n.push({id:"talent",value:ds(cs.talent[i],t),node:bo(s,t)}),n}function Ea(s,e){const t=e.slice(0,e.indexOf("."));return $a[s].includes(t)}function yo(s,e){let t=Re.maxHp,i=Re.maxMana,a=Re.damageMult,r=Re.cooldownMult,o=Re.moveSpeedMult,n=Re.manaRegenMult;const l=new Map;for(const d of s){const h=N.find(u=>u.id===d.base_id),p=h?[h.implicit,...d.affixes]:d.affixes;for(const u of p)switch(u.id){case"max_health":t+=u.value;break;case"max_mana":i+=u.value;break;case"damage_pct":a*=1+u.value/100;break;case"cast_speed_pct":r*=1-u.value/100;break;case"move_speed_pct":o*=1+u.value/100;break;case"mana_regen_pct":n*=1+u.value/100;break;case"talent":u.node&&Ea(e,u.node)&&l.set(u.node,(l.get(u.node)??0)+u.value);break}}return{statBlock:{maxHp:t,maxMana:i,damageMult:a,cooldownMult:Math.max(.5,r),moveSpeedMult:Math.min(1.15,o),manaRegenMult:n},talentRanks:l}}const wo=["basic","magic","rare","unique"],ko=[...Ta,"talent"],So=["weapon","helmet","armor","leggings","ring1","ring2","amulet"],_o=["starter","drop","vendor","lootbox","admin"];function Mo(s){if(typeof s!="object"||s===null)return!1;const e=s;return!(typeof e.id!="string"||!ko.includes(e.id)||typeof e.value!="number"||e.id==="talent"&&(typeof e.node!="string"||!se.some(t=>t.id===e.node)))}function Oi(s){if(typeof s!="object"||s===null)return null;const e=s;if(typeof e.id!="string"||typeof e.base_id!="string")return null;const t=N.find(i=>i.id===e.base_id);return!t||typeof e.rarity!="string"||!wo.includes(e.rarity)||!Array.isArray(e.affixes)||!e.affixes.every(Mo)||typeof e.level_req!="number"||e.equipped_by!==null&&typeof e.equipped_by!="string"||e.equipped_slot!==null&&(typeof e.equipped_slot!="string"||!So.includes(e.equipped_slot))||typeof e.slot!="string"||e.slot!==t.slot||e.source!==void 0&&(typeof e.source!="string"||!_o.includes(e.source))?null:{id:e.id,base_id:e.base_id,rarity:e.rarity,affixes:e.affixes,level_req:e.level_req,equipped_by:e.equipped_by,equipped_slot:e.equipped_slot,slot:e.slot,source:e.source}}const Aa=["helmet","armor","leggings","weapon"],Co={helmet:60,armor:40,leggings:50,weapon:null},To=30;function La(s){const e={};for(const t of s){const i=t.equipped_slot;if(t.equipped_by===null||i===null||!Aa.includes(i))continue;const a=N.find(r=>r.id===t.base_id);a!=null&&a.lpc&&(e[i]=a.id)}return e}function $o(s,e){return s.replace("{body}",e.body).replace("{legs}",e.body==="female"?"thin":"male")}function Eo(s,e){let t=ho(s);for(const i of Aa){const a=e[i];if(!a)continue;const r=N.find(n=>n.id===a);if(!(r!=null&&r.lpc)||i!=="weapon"&&r.slot!==i||i==="weapon"&&r.slot!=="weapon")continue;const o=Co[i];o!==null&&(t=t.filter(n=>n.z!==o)),i==="helmet"&&r.lpc.hidesHair&&(t=t.filter(n=>n.z!==To));for(const n of r.lpc.layers)t.push({path:$o(n.path,s),z:n.z,tint:n.tint,tintMode:n.tintMode,...i==="weapon"?{weapon:r.id,weaponRole:n.weaponRole,weaponNativeAnims:r.lpc.nativeAnims??[]}:{}})}return t.sort((i,a)=>i.z-a.z)}const ai={basic:150,premium:500},Ao={basic:[5,10,15,25],magic:[25,40,60,90],rare:[100,150,220,320],unique:[400,550,750,1e3]};function Lo(s){let e=0;for(let t=0;t<vi.length;t++)vi[t]<=s&&(e=t);return e}function Po(s,e){return Ao[s][Lo(e)]}const Ie=80;function At(s,e,t){const i=r=>{const o=r.clone();return o.wrapS=o.wrapT=xa,o.repeat.set(e,t),o.needsUpdate=!0,o},a=new ma({map:i(s.map),normalMap:s.normalMap?i(s.normalMap):null,roughnessMap:s.roughnessMap?i(s.roughnessMap):null,roughness:1,metalness:0});return a.normalScale.set(.4,.4),a}class Ro{constructor(e){c(this,"group",new je);this.buildFloor(e.floor),this.buildBoundaryWalls(e.stone),this.buildPillars(e.stone)}addToScene(e){e.add(this.group)}buildFloor(e){const t=q/200,i=At(e,t,t),a=new H(new ua(q,q),i);a.rotation.x=-Math.PI/2,a.position.set(q/2,0,q/2),a.receiveShadow=!0,this.group.add(a)}buildBoundaryWalls(e){const i=[[q/2,-10,q+40,20],[q/2,q+10,q+40,20],[-10,q/2,20,q],[q+10,q/2,20,q]],a=new He(i[0][2],60,i[0][3]),r=new He(i[2][2],60,i[2][3]),o=At(e,i[0][2]/200,60/200),n=At(e,i[2][2]/200,60/200);i.forEach(([l,d],h)=>{const p=new H(h<2?a:r,h<2?o:n);p.position.set(l,60/2,d),p.castShadow=!0,this.group.add(p)})}buildPillars(e){const t=new ma({color:6974122,roughness:.7,metalness:.1}),i=lt[0].halfSize*2,a=At(e,i/200,Ie/200),r=new He(i,Ie,i),o=new He(i+6,8,i+6),n=new Ai(5,8,6),l=new ie({color:16753984}),d=[{x:0,y:0},{x:q,y:0},{x:0,y:q},{x:q,y:q}],h=new Set(d.map(p=>lt.reduce((u,m)=>(m.x-p.x)**2+(m.y-p.y)**2<(u.x-p.x)**2+(u.y-p.y)**2?m:u)));lt.forEach(p=>{const u=new H(r,a);u.position.set(p.x,Ie/2,p.y),u.castShadow=!0,u.receiveShadow=!0,this.group.add(u);const m=new H(o,t);m.position.set(p.x,Ie+4,p.y),this.group.add(m);const v=new H(n,l);if(v.position.set(p.x,Ie+14,p.y),this.group.add(v),h.has(p)){const f=new ga(16737792,3,450,2);f.position.set(p.x,Ie+60,p.y),this.group.add(f)}})}}const M=64;function qt(s,e,t){const a=ve[s].singleRow?0:e;return{sx:t*M,sy:a*M}}const hs=[3,2,1,0],Io=Math.PI/12;function zo(s,e){const t=2*Math.PI,a=((s+Math.PI/4)%t+t)%t,r=Math.round(a/(Math.PI/2))%4,o=hs[r];if(e===void 0||o===e)return o;const n=hs[e]*(Math.PI/2);let l=a-n;return l>Math.PI&&(l-=t),l<-Math.PI&&(l+=t),Math.abs(l)<=Math.PI/4+Io?e:o}function Ot(s,e,t){const i=ve[s],a=Math.floor(e*i.fps);return t?a%i.frames:Math.min(a,i.frames-1)}function Pa(s,e,t,i,a){const r=document.createElement("canvas");r.width=e,r.height=t;const o=r.getContext("2d");return o.drawImage(s,0,0),o.globalCompositeOperation="multiply",o.fillStyle=i,o.fillRect(0,0,r.width,r.height),a==="fabric"&&(o.globalCompositeOperation="screen",o.fillStyle="#464646",o.fillRect(0,0,r.width,r.height)),o.globalCompositeOperation="destination-in",o.drawImage(s,0,0),r}const ps={male:{walk:[[[42.8,46.1],[42.9,46],[42.9,44.3],[42.3,43.8],[42.9,44.4],[42.7,46.2],[42.7,47.2],[40.2,51.7],[42.7,47.2]],[[32.9,48.1],[32.9,48.1],[34.9,48.4],[40.9,48.3],[42,48.2],[43.9,48.3],[41.9,48.3],[41.9,48.3],[36.5,47.6]],[[42.8,47.2],[42.8,47.2],[42.9,45.4],[42.9,45.1],[43,45.3],[42.8,47.3],[42.8,48.3],[42.1,49.9],[42.8,48.3]],[[30.1,48.1],[30.1,48.1],[28.1,48.4],[22.1,48.3],[21,48.2],[19.1,48.3],[21.1,48.3],[21.1,48.3],[26.5,47.6]]],run:[[[38,39.5],[39.4,41.7],[39.4,41.7],[39.4,41.7],[39.4,41.7],[39.4,41.7],[38.8,41.9],[39,38.5]],[[21.2,39.8],[25.3,42.9],[30.9,45.7],[36.6,40.5],[34.4,42.7],[31.4,45.4],[29.3,45.8],[22.7,40.8]],[[34.4,44.4],[37.3,46.8],[38.6,45.6],[39.8,42.7],[41.1,43.6],[41,45.9],[40.7,44.9],[35.8,43.5]],[[41.8,39.8],[37.7,42.9],[32.1,45.7],[26.4,40.5],[28.6,42.7],[31.6,45.4],[33.7,45.8],[40.3,40.8]]],idle:[[[42.8,47.2],[42.8,46.7]],[[23.6,45.8],[23.6,45.5]],[[42.8,47.2],[42.6,47]],[[39.2,45.7],[39.4,45.5]]],spellcast:[[[42.8,47.1],[42,45.2],[42,45.2],[47.7,40.6],[53.4,34.5],[51.9,27.9],[47.7,40.6]],[[23.6,45.5],[22.7,44.9],[27.2,44.3],[21.8,40.9],[19.8,36.8],[20.2,29.1],[21.8,40.9]],[[42.8,47],[42.6,44],[34.9,42.2],[45.6,42.5],[53.2,33.8],[51.8,27.3],[44.6,44.5]],[[39.4,45.5],[40.3,44.9],[35.8,44.3],[41.2,40.9],[43.2,36.8],[42.8,29.1],[41.2,40.9]]],shoot:[[[41.9,47],[41.7,50.9],[41.7,50.9],[39.8,39],[38.6,36.1],[38.6,36.1],[38.6,36.1],[38.6,36.1],[39.8,32.6],[39,36.9],[39.8,39],[39.8,39],[39.9,39.3]],[[24.6,45.5],[22.7,45.9],[18.3,44],[16.3,42.1],[15.7,35.1],[15,33.1],[14.9,31.1],[15.8,32.1],[15.7,34.2],[15.7,35.1],[15.7,35.1],[15.7,35.1],[15.7,35.1]],[[41.8,47],[35.9,45.6],[34.9,45.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6]],[[38.4,45.5],[40.3,45.9],[44.7,44],[46.7,42.1],[47.3,35.1],[48.1,33.1],[48.1,31.1],[47.2,32.1],[47.3,34.2],[47.3,35.1],[47.3,35.1],[47.3,35.1],[47.3,35.1]]],hurt:[[[42.8,47.2],[44.9,48.3],[44.9,48.3],[44.9,48.3],[46.5,44.9],[46.5,44.9]]],slash:[[[42.8,47.2],[42.8,47.2],[42.8,47.2],[42.8,47.2],[50.1,31.3],[53.1,35.7]],[[23.6,45.8],[19.7,48.1],[22.7,46.5],[14.5,44],[10.9,33],[13.8,32.2]],[[42.8,47.2],[37.1,46],[37.1,46],[39.9,46.5],[50.9,43],[54,40.1]],[[39.2,45.7],[43.3,48.1],[40.3,46.5],[48.5,44],[52.1,33],[49.2,32.2]]]},female:{walk:[[[41.9,46.7],[42,47.6],[41.3,47.3],[40.9,46.8],[41.9,46.7],[41.8,47.8],[40.9,48.6],[40.9,48.6],[40.9,48.6]],[[31.8,48.3],[31.8,48.3],[34.8,48.3],[40.1,48.1],[41.9,47.3],[42.9,47.7],[41.9,47.3],[39.9,48.5],[35.8,48.5]],[[41.9,47.3],[41.9,47.3],[41.8,46.8],[41.3,47.3],[41.8,46.9],[41.9,47.4],[40.9,48.3],[39.8,48.4],[41.9,47.7]],[[31.2,48.3],[31.2,48.3],[28.2,48.3],[22.9,48.1],[21.1,47.3],[20.1,47.7],[21.1,47.3],[23.1,48.5],[27.2,48.5]]],run:[[[31.8,33],[32.1,34],[31.5,33],[31.5,31.2],[31.2,33],[30.9,34],[31.5,33],[31.5,31.2]],[[21.6,39.5],[25.6,42.5],[24.6,44.8],[21.6,38.5],[19.6,39.5],[23.4,43.2],[28.2,45.1],[22.6,40.5]],[[32.7,45.8],[34.9,49],[37,46.2],[39.4,42.3],[39.5,43.5],[39.9,45.9],[39,45.9],[35.3,43.3]],[[41.4,39.5],[37.4,42.5],[38.4,44.8],[41.4,38.5],[43.4,39.5],[39.6,43.2],[34.8,44.9],[40.4,40.5]]],idle:[[[41.9,47.7],[41.5,47.3]],[[24,47.5],[24,47.5]],[[41.9,47.3],[41.9,46.8]],[[39,47.5],[39,47.5]]],spellcast:[[[41.9,47.7],[41.9,47.7],[41.9,47.7],[46.8,40.1],[50.4,35.3],[50,28.8],[46.6,40]],[[24,47.5],[23.2,46.7],[24.1,45.4],[22.1,43.6],[20.1,37.8],[19.9,30.8],[22.1,43.6]],[[41.9,47.3],[41.9,44.2],[35,42.3],[43.8,43.3],[50.4,35.6],[49.9,28.8],[43.8,43.3]],[[39,47.5],[39.8,46.7],[39.4,45.6],[40.9,43.6],[42.9,37.8],[43.1,30.8],[40.9,43.6]]],shoot:[[[40.9,47.7],[40.9,50.7],[40.9,50.7],[40.9,50.7],[38.7,36.2],[38.7,36.2],[38.7,36.2],[38.7,36.2],[40.1,32.5],[39.1,36.9],[39.1,36.9],[39.1,36.9],[39.1,36.9]],[[25,47.5],[22.7,45.9],[18.1,44.1],[16.2,42],[15.7,35.1],[14.7,33.2],[14.7,31.1],[15.8,32.1],[15.7,34.2],[15.7,35.1],[15.7,35.1],[15.7,35.1],[15.7,35.1]],[[40.9,47.3],[35.9,45.6],[34.9,45.6],[33.1,46.8],[33.1,46.8],[33.1,46.8],[33.1,46.8],[32.2,41.2],[32.2,41.2],[32.2,41.2],[32.2,41.2],[32.2,41.2],[32.2,41.2]],[[38,47.5],[40.3,45.9],[44.9,44.1],[46.8,42],[47.3,35.1],[48.3,33.2],[48.3,31.1],[47.2,32.1],[47.3,34.2],[47.3,35.1],[47.3,35.1],[47.3,35.1],[47.3,35.1]]],hurt:[[[41.9,47.3],[42.8,48.6],[42.8,48.6],[42.8,48.6],[46,45],[46,45]]],slash:[[[41.9,47.7],[41.9,47.7],[41.9,47.7],[41.9,47.7],[50.1,31.4],[53,35.7]],[[24,47.5],[19.6,48.3],[23.7,48.5],[15.4,44.1],[10.8,32.9],[14.3,31.7]],[[41.9,47.3],[37.2,45.9],[37.2,45.9],[39.2,48.4],[51.5,43.4],[54.3,39.2]],[[39,47.5],[43.4,48.3],[39.3,48.5],[47.6,44.1],[52.2,32.9],[48.7,31.7]]]}},Ni={apprentice_staff:{source:["weapon/magic/simple/background/simple","weapon/magic/simple/foreground/simple"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[42,24,4,18],offset:[-.8,-22.1]},front:{rect:[42,46,3,10],offset:[-.8,-.1]}},left:{frame:0,behind:{rect:[18,27,9,36],offset:[-14.9,-21.1]},front:null},down:{frame:0,behind:null,front:{rect:[36,26,9,36],offset:[-6.8,-21.2]}},right:{frame:0,behind:{rect:[37,27,9,36],offset:[6.9,-21.1]},front:null}}},gnarled_staff:{source:["weapon/magic/gnarled/universal/background/gnarled","weapon/magic/gnarled/universal/foreground/gnarled"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[37,24,12,19],offset:[-5.8,-22.1]},front:{rect:[41,46,6,10],offset:[-1.8,-.1]}},left:{frame:0,behind:{rect:[18,28,12,32],offset:[-14.9,-20.1]},front:null},down:{frame:0,behind:null,front:{rect:[37,28,12,32],offset:[-5.8,-19.2]}},right:{frame:0,behind:{rect:[34,28,12,32],offset:[3.9,-20.1]},front:null}}},archmage_staff:{source:["weapon/magic/crystal/universal/background/purple","weapon/magic/crystal/universal/foreground/purple"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[40,25,5,10],offset:[-2.8,-21.1]},front:null},left:{frame:0,behind:{rect:[21,26,5,10],offset:[-11.9,-22.1]},front:null},down:{frame:0,behind:null,front:{rect:[41,26,5,10],offset:[-1.8,-21.2]}},right:{frame:0,behind:{rect:[38,26,5,10],offset:[7.9,-22.1]},front:null}}},short_bow:{source:["weapon/ranged/bow/normal/universal/background/normal","weapon/ranged/bow/normal/universal/foreground/normal"],oversize:!1,anim:"shoot",byDir:{up:{frame:9,behind:null,front:{rect:[25,4,7,13],offset:[-14.1,-32.9]}},left:{frame:9,behind:null,front:{rect:[14,11,16,44],offset:[-1.7,-24.1]}},down:{frame:9,behind:null,front:{rect:[27,20,7,44],offset:[-5.2,-21.2]}},right:{frame:9,behind:null,front:{rect:[34,11,16,44],offset:[-13.3,-24.1]}}}},war_bow:{source:["weapon/ranged/bow/recurve/universal/background/recurve","weapon/ranged/bow/recurve/universal/foreground/recurve"],oversize:!1,anim:"shoot",byDir:{up:{frame:9,behind:null,front:{rect:[24,5,7,12],offset:[-15.1,-31.9]}},left:{frame:9,behind:null,front:{rect:[12,10,17,48],offset:[-3.7,-25.1]}},down:{frame:9,behind:null,front:{rect:[26,19,9,44],offset:[-6.2,-22.2]}},right:{frame:9,behind:null,front:{rect:[35,10,17,48],offset:[-12.3,-25.1]}}}},great_bow:{source:["weapon/ranged/bow/great/universal/background/great","weapon/ranged/bow/great/universal/foreground/great"],oversize:!1,anim:"shoot",byDir:{up:{frame:9,behind:null,front:{rect:[25,2,7,15],offset:[-14.1,-34.9]}},left:{frame:9,behind:null,front:{rect:[13,9,17,52],offset:[-2.7,-26.1]}},down:{frame:9,behind:null,front:{rect:[25,12,10,52],offset:[-7.2,-29.2]}},right:{frame:9,behind:null,front:{rect:[34,9,17,52],offset:[-13.3,-26.1]}}}}},fs=["up","left","down","right"],qo=32,Oo=new Set(["slash"]),No=13,us=150,Fo=(s,e,t)=>Math.min(t,Math.max(e,s));function Bo(s){return!!s&&!!Ni[s]}function Do(s){const e=Ni[s];return e?e.source.map(t=>`${t}/${e.anim}`):[]}function Ho(s,e){var l;const t=Ni[e.weaponId],i=ps[e.body]??ps.male,a=i==null?void 0:i[e.anim];if(!t||!a)return!1;const r=ve[e.anim],o=r.singleRow?1:4;if(e.sources.every(d=>d===null))return!1;let n=!1;for(let d=0;d<o;d++){const h=fs[r.singleRow?2:d],p=t.byDir[h]??null;if(!p||e.role!=="front")continue;const u=[[p.behind,e.sources[0]],[p.front,e.sources[1]]].filter(f=>!!f[0]&&!!f[1]);if(!u.length)continue;const m=t.oversize?qo:0,v=t.oversize?M*2:M;for(let f=0;f<r.frames;f++){const g=(l=a[d])==null?void 0:l[f];if(g)for(const[b,y]of u){const[w,x,k,A]=b.rect,O=w-b.offset[0],D=Math.round(f*M+g[0]+b.offset[0]),F=Math.round(d*M+g[1]+b.offset[1]),ae=p.frame*v+m+w,me=fs.indexOf(h)*v+m+x,ei=Oo.has(e.anim)?Fo((g[0]-O)*No,-us,us):0;if(Math.abs(ei)<1)s.drawImage(y,ae,me,k,A,D,F,k,A);else{const $t=-b.offset[0],Zi=-b.offset[1];s.save(),s.translate(D+$t,F+Zi),s.rotate(ei*Math.PI/180),s.imageSmoothingEnabled=!1,s.drawImage(y,ae,me,k,A,-$t,-Zi,k,A),s.restore()}n=!0}}}return n}const ms=new Map;function gs(s){let e=ms.get(s);return e||(e=new Promise(t=>{const i=new Image;i.onload=()=>t(i),i.onerror=()=>t(null),i.src=s}),ms.set(s,e)),e}async function Ra(s,e={}){const t=Eo(s,e),i={};for(const a of Object.keys(ve)){const r=ve[a],o=await Promise.all(t.map(f=>{var g;return f.weapon&&!((g=f.weaponNativeAnims)!=null&&g.includes(a))?Promise.resolve(null):gs(`/assets/lpc/${f.path}/${a}.png`)})),n=t.map((f,g)=>{var b;return o[g]===null&&!((b=f.weaponNativeAnims)!=null&&b.includes(a))&&Bo(f.weapon)?f:null}),l=await Promise.all(n.map(f=>f?Promise.all(Do(f.weapon).map(g=>gs(`/assets/lpc/${g}.png`))):Promise.resolve([]))),d=o.filter(f=>f!==null),h=l.some(f=>f.some(Boolean));if(d.length===0&&!h){i[a]=null;continue}const p=r.singleRow?1:4,u=document.createElement("canvas");u.width=r.frames*M,u.height=p*M;const m=u.getContext("2d");o.forEach((f,g)=>{const b=t[g];let y=f;if(!y&&n[g]){const k=document.createElement("canvas");k.width=u.width,k.height=u.height,Ho(k.getContext("2d"),{weaponId:b.weapon,role:b.weaponRole==="front"?"front":"behind",body:s.body,anim:a,sources:l[g]})&&(y=k)}if(!y)return;const{tint:w,tintMode:x}=b;if(!w){m.drawImage(y,0,0);return}m.drawImage(Pa(y,u.width,u.height,w,x),0,0)});const v=new Li(u);v.magFilter=be,v.minFilter=be,v.generateMipmaps=!1,v.colorSpace=Yt,i[a]=v}return i}function dt(s){for(const e of Object.values(s))e==null||e.dispose()}const Uo=.5,ze=42,jo=new mi(11,16),Go=new ie({color:0,transparent:!0,opacity:.35});class Vo{constructor(e,t,i={}){c(this,"group",new je);c(this,"plane");c(this,"material");c(this,"textures",null);c(this,"direction",2);c(this,"dead",!1);c(this,"castAnim");c(this,"moveAnim","idle");c(this,"moveElapsed",0);c(this,"casting",!1);c(this,"castElapsed",0);c(this,"lastFrameKey","");c(this,"scratch",null);c(this,"scratchTex",null);c(this,"disposed",!1);this.castAnim=t==="ranger"?"shoot":"slash";const a=M*Ii()*Uo;this.material=new ie({transparent:!0,alphaTest:.01}),this.material.visible=!1,this.plane=new H(new ua(a,a),this.material),this.plane.rotation.order="YXZ",this.plane.rotation.y=Math.PI/4,this.plane.rotation.x=-Math.atan(600/Math.hypot(200,200)),this.plane.position.y=a/2,this.group.add(this.plane);const r=new H(jo,Go);r.rotation.x=-Math.PI/2,r.position.y=.5,this.group.add(r),Ra(e,i).then(o=>{if(this.disposed){dt(o);return}this.textures=o,this.material.visible=!0,this.applyFrame(!0)})}setFacing(e){this.dead||(this.direction=zo(e,this.direction))}die(){this.dead||(this.dead=!0,this.casting=!1,this.moveElapsed=0)}update(e,t,i){if(this.moveElapsed+=e,this.castElapsed+=e,!this.dead){const a=t>220?"run":t>1.5?"walk":"idle";a!==this.moveAnim&&(this.moveAnim=a,this.moveElapsed=0),i&&(this.casting=!0,this.castElapsed=0);const r=ve[this.castAnim];this.casting&&this.castElapsed>=r.frames/r.fps&&(this.casting=!1)}this.applyFrame(!1)}applyFrame(e){if(this.textures){if(this.dead){this.applyFullFrame("hurt",this.moveElapsed,e);return}if(this.casting&&this.textures[this.castAnim]){this.moveAnim==="idle"||!this.textures[this.moveAnim]?this.applyFullFrame(this.castAnim,this.castElapsed,e):this.applySplitFrame(e);return}this.applyFullFrame(this.moveAnim,this.moveElapsed,e)}}applyFullFrame(e,t,i){const a=this.textures[e]?e:this.textures.idle?"idle":"walk",r=this.textures[a];if(!r)return;const o=ve[a],n=a!=="hurt"&&a!==this.castAnim,l=Ot(a,t,n),d=`${a}:${this.direction}:${l}`;if(!i&&d===this.lastFrameKey)return;this.lastFrameKey=d,this.material.map!==r&&(this.material.map=r,this.material.needsUpdate=!0);const{sx:h,sy:p}=qt(a,this.direction,l),u=o.singleRow?1:4;r.repeat.set(M/(o.frames*M),M/(u*M)),r.offset.set(h/(o.frames*M),1-(p+M)/(u*M))}applySplitFrame(e){const t=this.textures[this.castAnim],i=this.textures[this.moveAnim],a=Ot(this.castAnim,this.castElapsed,!1),r=Ot(this.moveAnim,this.moveElapsed,!0),o=`split:${this.castAnim}:${a}:${this.moveAnim}:${r}:${this.direction}`;if(!e&&o===this.lastFrameKey)return;this.lastFrameKey=o,this.scratch||(this.scratch=document.createElement("canvas"),this.scratch.width=M,this.scratch.height=M,this.scratchTex=new Li(this.scratch),this.scratchTex.magFilter=be,this.scratchTex.minFilter=be,this.scratchTex.generateMipmaps=!1,this.scratchTex.colorSpace=Yt);const n=qt(this.castAnim,this.direction,a),l=qt(this.moveAnim,this.direction,r),d=this.scratch.getContext("2d");d.clearRect(0,0,M,M),d.drawImage(i.image,l.sx,l.sy+ze,M,M-ze,0,ze,M,M-ze),d.drawImage(t.image,n.sx,n.sy,M,ze,0,0,M,ze),this.scratchTex.needsUpdate=!0,this.material.map!==this.scratchTex&&(this.material.map=this.scratchTex,this.material.needsUpdate=!0)}dispose(){var e;this.disposed=!0,this.plane.geometry.dispose(),this.material.dispose(),(e=this.scratchTex)==null||e.dispose(),this.textures&&dt(this.textures)}}const Wo=50,Yo=new ba(14,18,32),et=new K;class Xo{constructor(e,t,i,a,r,o){c(this,"group",new je);c(this,"sprite");c(this,"nameLabel");c(this,"ownedMaterials",[]);c(this,"prevX",0);c(this,"prevZ",0);c(this,"velocityMag",0);c(this,"smoothVel",0);this.sprite=new Vo(t??Mt[e],e,i??{}),this.group.add(this.sprite.group);const n=new ie({color:a,transparent:!0,opacity:.5,side:nt});this.ownedMaterials.push(n);const l=new H(Yo,n);l.rotation.x=-Math.PI/2,l.position.y=1,this.group.add(l),this.nameLabel=document.createElement("div"),this.nameLabel.style.cssText=`
      position:absolute; left:0; top:0; pointer-events:none; font-size:12px; color:#fff;
      text-shadow:0 0 4px #000; white-space:nowrap; transform:translateX(-50%);
    `,this.nameLabel.textContent=r,o.appendChild(this.nameLabel)}setPosition(e,t,i){const a=e-this.prevX,r=t-this.prevZ,o=Math.min(Math.sqrt(a*a+r*r)*60,1e3);this.smoothVel=this.smoothVel*.85+o*.15,this.velocityMag=this.smoothVel,i!==void 0&&this.sprite.setFacing(i),this.prevX=e,this.prevZ=t;const n=Ii();this.group.position.set(Ht(e,n),0,Ht(t,n))}update(e,t){this.sprite.update(e,this.velocityMag,t)}setVisible(e){this.group.visible=e,this.nameLabel.style.display=e?"":"none"}die(){this.sprite.die()}updateLabel(e,t){this.group.getWorldPosition(et),et.y+=Wo+10,et.project(e);const i=(et.x*.5+.5)*t.width+t.left,a=(-et.y*.5+.5)*t.height+t.top-10;this.nameLabel.style.transform=`translate(${i}px, ${a}px) translateX(-50%)`}dispose(e){e.removeChild(this.nameLabel),this.group.removeFromParent();for(const t of this.ownedMaterials)t.dispose();this.ownedMaterials=[],this.sprite.dispose()}}const z=4096,ke=Math.floor(z*.9),Zo=1,Ko=.4,Qo=0;class Jo{constructor(e){c(this,"posX",new Float32Array(z));c(this,"posY",new Float32Array(z));c(this,"posZ",new Float32Array(z));c(this,"velX",new Float32Array(z));c(this,"velY",new Float32Array(z));c(this,"velZ",new Float32Array(z));c(this,"life",new Float32Array(z));c(this,"maxLife",new Float32Array(z));c(this,"particleSize",new Float32Array(z));c(this,"colorR",new Float32Array(z));c(this,"colorG",new Float32Array(z));c(this,"colorB",new Float32Array(z));c(this,"activeCount",0);c(this,"positionBuffer");c(this,"sizeBuffer");c(this,"colorBuffer");c(this,"posAttr");c(this,"sizeAttr");c(this,"colorAttr");c(this,"geometry");c(this,"points");this.scene=e,this.positionBuffer=new Float32Array(z*3),this.sizeBuffer=new Float32Array(z),this.colorBuffer=new Float32Array(z*3),this.geometry=new St,this.posAttr=new ti(this.positionBuffer,3),this.posAttr.setUsage(ii),this.geometry.setAttribute("position",this.posAttr),this.sizeAttr=new ti(this.sizeBuffer,1),this.sizeAttr.setUsage(ii),this.geometry.setAttribute("size",this.sizeAttr),this.colorAttr=new ti(this.colorBuffer,3),this.colorAttr.setUsage(ii),this.geometry.setAttribute("particleColor",this.colorAttr),this.geometry.setDrawRange(0,0);const t=new _e({vertexShader:`
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
      `,transparent:!0,depthWrite:!1,blending:pa});this.points=new Lr(this.geometry,t),this.points.frustumCulled=!1,e.add(this.points)}emitTrail(e,t,i,a,r,o=10){if(this.activeCount>=ke)return;const n=o/10,l=Math.min(12,Math.floor((3+Math.floor(Math.random()*3))*n)),d=4*n;for(let h=0;h<l;h++){if(this.activeCount>=z)return;this.spawn(e+(Math.random()-.5)*d,t+(Math.random()-.5)*d,i+(Math.random()-.5)*d,-a*(40+Math.random()*30)*n+(Math.random()-.5)*30,(10+Math.random()*20)*n,-r*(40+Math.random()*30)*n+(Math.random()-.5)*30,.35+Math.random()*.15,(12+Math.random()*4)*n)}}emitExplosion(e,t,i,a=10){const r=a/10,o=Math.min(200,Math.floor((40+Math.floor(Math.random()*21))*r)),n=6*r;for(let l=0;l<o;l++){if(this.activeCount>=z)return;const d=Math.random()*Math.PI*2,h=(60+Math.random()*120)*r;this.spawn(e+(Math.random()-.5)*n,t+(Math.random()-.5)*n,i+(Math.random()-.5)*n,Math.cos(d)*h,(20+Math.random()*80)*r,Math.sin(d)*h,.5+Math.random()*.3,(Math.random()>.5?16:10)*Math.min(r,3))}}emitWall(e){if(!(this.activeCount>=ke))for(const t of e)for(let i=0;i<3;i++){if(this.activeCount>=z)return;const a=Math.random();this.spawn(t.x1+(t.x2-t.x1)*a+(Math.random()-.5)*4,1,t.y1+(t.y2-t.y1)*a+(Math.random()-.5)*4,(Math.random()-.5)*15,40+Math.random()*40,(Math.random()-.5)*15,.4+Math.random()*.3,14+Math.random()*10)}}emitMeteorTrail(e,t,i){if(this.activeCount>=ke)return;const a=2+Math.floor(Math.random()*2);for(let r=0;r<a;r++){if(this.activeCount>=z)return;const o=Math.random()*Math.PI*2,n=8+Math.random()*8;this.spawn(e+(Math.random()-.5)*6,t+(Math.random()-.5)*6,i+(Math.random()-.5)*6,Math.cos(o)*n,20+Math.random()*20,Math.sin(o)*n,.2+Math.random()*.1,8+Math.random()*6)}}emitCrater(e,t,i){if(this.activeCount>=ke)return;const a=Math.max(4,Math.round(i/10));for(let r=0;r<a;r++){if(this.activeCount>=z)return;const o=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*i;this.spawn(e+Math.cos(o)*n,1,t+Math.sin(o)*n,(Math.random()-.5)*10,30+Math.random()*30,(Math.random()-.5)*10,.3+Math.random()*.3,10+Math.random()*8)}}emitMeteorImpact(e,t,i){if(this.activeCount>=ke)return;const a=50+Math.floor(Math.random()*21);for(let r=0;r<a;r++){if(this.activeCount>=z)return;const o=Math.random()*Math.PI*2,n=80+Math.random()*120;this.spawn(e+(Math.random()-.5)*10,t+(Math.random()-.5)*10,i+(Math.random()-.5)*10,Math.cos(o)*n,30+Math.random()*100,Math.sin(o)*n,.5+Math.random()*.3,Math.random()>.5?18:12)}}emitRainImpact(e,t,i,a){if(this.activeCount>=ke)return;const r=30+Math.floor(Math.random()*15);for(let o=0;o<r;o++){if(this.activeCount>=z)return;const n=Math.random()*Math.PI*2,l=Math.sqrt(Math.random())*a,d=15+Math.random()*30,h=this.activeCount;this.spawn(e+Math.cos(n)*l,t+2,i+Math.sin(n)*l,Math.cos(n)*d,30+Math.random()*50,Math.sin(n)*d,.3+Math.random()*.2,6+Math.random()*4),this.colorR[h]=.7,this.colorG[h]=.6,this.colorB[h]=.45}}emitRainZone(e,t,i){if(this.activeCount>=ke)return;const a=Math.max(2,Math.round(i/20));for(let r=0;r<a;r++){if(this.activeCount>=z)return;const o=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*i,l=this.activeCount;this.spawn(e+Math.cos(o)*n,1,t+Math.sin(o)*n,(Math.random()-.5)*8,15+Math.random()*15,(Math.random()-.5)*8,.25+Math.random()*.15,5+Math.random()*4),this.colorR[l]=.7,this.colorG[l]=.6,this.colorB[l]=.45}}emitTeleportSparks(e,t,i){const a=10+Math.floor(Math.random()*6);for(let r=0;r<a;r++){if(this.activeCount>=z)return;const o=Math.random()*Math.PI*2,n=Math.random()*Math.PI*.5,l=40+Math.random()*60,d=this.activeCount;this.spawn(e+(Math.random()-.5)*4,t+(Math.random()-.5)*4,i+(Math.random()-.5)*4,Math.cos(o)*Math.sin(n)*l,Math.cos(n)*l*.4+10,Math.sin(o)*Math.sin(n)*l,.12+Math.random()*.04,7+Math.random()*4),this.colorR[d]=1,this.colorG[d]=.84+Math.random()*.16,this.colorB[d]=.4+Math.random()*.6}}spawn(e,t,i,a,r,o,n,l){const d=this.activeCount++;this.posX[d]=e,this.posY[d]=t,this.posZ[d]=i,this.velX[d]=a,this.velY[d]=r,this.velZ[d]=o,this.life[d]=n,this.maxLife[d]=n,this.particleSize[d]=l,this.colorR[d]=Zo,this.colorG[d]=Ko,this.colorB[d]=Qo}update(e){let t=0;for(;t<this.activeCount;){if(this.life[t]-=e,this.life[t]<=0){const a=this.activeCount-1;this.posX[t]=this.posX[a],this.posY[t]=this.posY[a],this.posZ[t]=this.posZ[a],this.velX[t]=this.velX[a],this.velY[t]=this.velY[a],this.velZ[t]=this.velZ[a],this.life[t]=this.life[a],this.maxLife[t]=this.maxLife[a],this.particleSize[t]=this.particleSize[a],this.colorR[t]=this.colorR[a],this.colorG[t]=this.colorG[a],this.colorB[t]=this.colorB[a],this.activeCount--;continue}this.velY[t]-=80*e,this.posX[t]+=this.velX[t]*e,this.posY[t]+=this.velY[t]*e,this.posZ[t]+=this.velZ[t]*e;const i=t*3;this.positionBuffer[i]=this.posX[t],this.positionBuffer[i+1]=this.posY[t],this.positionBuffer[i+2]=this.posZ[t],this.colorBuffer[i]=this.colorR[t],this.colorBuffer[i+1]=this.colorG[t],this.colorBuffer[i+2]=this.colorB[t],this.sizeBuffer[t]=this.particleSize[t]*(this.life[t]/this.maxLife[t]),t++}this.geometry.setDrawRange(0,this.activeCount),this.activeCount>0&&(this.posAttr.addUpdateRange(0,this.activeCount*3),this.colorAttr.addUpdateRange(0,this.activeCount*3),this.sizeAttr.addUpdateRange(0,this.activeCount),this.posAttr.needsUpdate=!0,this.sizeAttr.needsUpdate=!0,this.colorAttr.needsUpdate=!0)}dispose(){this.scene.remove(this.points),this.geometry.dispose(),this.points.material.dispose()}}const en=.08,xs=.12,bs=.15,tn=.2,sn=35,vs=4,an=6,rn=new Pr(1,.3,4,32),on=2,ht=[];function nn(s){for(const e of ht)e.light.parent!==s&&s.add(e.light);for(;ht.length<on;){const e=new ga(16772795,0,120);s.add(e),ht.push({light:e,inUse:!1})}}function ln(){const s=ht.find(e=>!e.inUse);return s?(s.inUse=!0,s.light):null}function ys(s){s.intensity=0;const e=ht.find(t=>t.light===s);e&&(e.inUse=!1)}class ws{constructor(e,t,i,a){c(this,"done",!1);c(this,"elapsed",0);c(this,"lightningLines",[]);c(this,"ringMesh");c(this,"pointLight");c(this,"lightningDisposed",!1);c(this,"lightDisposed",!1);c(this,"ringDisposed",!1);this.scene=e;const r=2;a.emitTeleportSparks(t,r,i);const o=vs+Math.floor(Math.random()*(an-vs+1));for(let l=0;l<o;l++){const d=Math.random()*Math.PI*2,h=15+Math.random()*25,p=h*(.3+Math.random()*.4),u=(Math.random()-.5)*12,m=[new K(t,r+Math.random()*6,i),new K(t+Math.cos(d)*p+u,r+3+Math.random()*8,i+Math.sin(d)*p+u),new K(t+Math.cos(d)*h,r+Math.random()*5,i+Math.sin(d)*h)],v=new St().setFromPoints(m),f=new Pi({color:16766720,transparent:!0,opacity:.6}),g=new gi(v,f);this.scene.add(g),this.lightningLines.push(g)}const n=new ie({color:16766720,transparent:!0,opacity:.4,side:nt});this.ringMesh=new H(rn,n),this.ringMesh.rotation.x=-Math.PI/2,this.ringMesh.position.set(t,1,i),this.ringMesh.scale.setScalar(.01),this.scene.add(this.ringMesh),nn(e),this.pointLight=ln(),this.pointLight&&(this.pointLight.position.set(t,20,i),this.pointLight.intensity=1)}update(e){if(!this.done){if(this.elapsed+=e,!this.lightningDisposed&&this.elapsed>=en){for(const t of this.lightningLines)this.scene.remove(t),t.geometry.dispose(),t.material.dispose();this.lightningLines.length=0,this.lightningDisposed=!0}if(!this.lightDisposed&&this.pointLight&&(this.elapsed>=xs?(ys(this.pointLight),this.pointLight=null,this.lightDisposed=!0):this.pointLight.intensity=1*(1-this.elapsed/xs)),!this.ringDisposed)if(this.elapsed>=bs)this.scene.remove(this.ringMesh),this.ringMesh.material.dispose(),this.ringDisposed=!0;else{const t=this.elapsed/bs;this.ringMesh.scale.setScalar(sn*t),this.ringMesh.material.opacity=.4*(1-t)}this.elapsed>=tn&&(this.done=!0)}}dispose(){if(!this.lightningDisposed){for(const e of this.lightningLines)this.scene.remove(e),e.geometry.dispose(),e.material.dispose();this.lightningLines.length=0}!this.lightDisposed&&this.pointLight&&(ys(this.pointLight),this.pointLight=null),this.ringDisposed||(this.scene.remove(this.ringMesh),this.ringMesh.material.dispose()),this.done=!0}}const ks="bloodmoor.audio.v1",Ue={musicVol:60,sfxVol:80,muted:!1};function jt(s,e){return typeof s!="number"||Number.isNaN(s)?e:Math.max(0,Math.min(100,Math.floor(s)))}function cn(s){if(s===null)return{...Ue};try{const e=JSON.parse(s);return{musicVol:jt(e.musicVol,Ue.musicVol),sfxVol:jt(e.sfxVol,Ue.sfxVol),muted:!!e.muted}}catch{return{...Ue}}}function dn(s){try{return localStorage.getItem(s)}catch{return null}}function hn(s,e){try{localStorage.setItem(s,e)}catch{}}function Ss(s){return(s/100)**2}const pn=.05;class fn{constructor(){c(this,"settings");c(this,"ctx_",null);c(this,"failed",!1);c(this,"master",null);c(this,"music_",null);c(this,"sfx_",null);c(this,"unlockCbs",[]);this.settings=cn(dn(ks))}get ctx(){return this.ctx_}get sfxBus(){return this.sfx_}get musicBus(){return this.music_}get ready(){return this.ctx_!==null}onUnlock(e){if(this.ctx_){e();return}this.unlockCbs.push(e)}installUnlockListener(){const e=()=>{window.removeEventListener("pointerdown",e,!0),window.removeEventListener("keydown",e,!0),this.init()};window.addEventListener("pointerdown",e,!0),window.addEventListener("keydown",e,!0)}init(){if(!(this.ctx_||this.failed))try{this.ctx_=new AudioContext,this.master=this.ctx_.createGain(),this.master.connect(this.ctx_.destination),this.music_=this.ctx_.createGain(),this.music_.connect(this.master),this.sfx_=this.ctx_.createGain(),this.sfx_.connect(this.master),this.applyVolumes(),this.ctx_.state==="suspended"&&this.ctx_.resume(),window.addEventListener("pointerdown",()=>{this.ctx_&&this.ctx_.state==="suspended"&&this.ctx_.resume()},!0);const e=this.unlockCbs;this.unlockCbs=[];for(const t of e)t()}catch(e){this.failed=!0,this.ctx_=null,console.warn("Audio unavailable, continuing silent:",e)}}applyVolumes(){if(!this.ctx_||!this.master||!this.music_||!this.sfx_)return;const e=this.ctx_.currentTime,t=e+pn;this.master.gain.setValueAtTime(this.master.gain.value,e),this.master.gain.linearRampToValueAtTime(this.settings.muted?0:1,t),this.music_.gain.setValueAtTime(this.music_.gain.value,e),this.music_.gain.linearRampToValueAtTime(Ss(this.settings.musicVol),t),this.sfx_.gain.setValueAtTime(this.sfx_.gain.value,e),this.sfx_.gain.linearRampToValueAtTime(Ss(this.settings.sfxVol),t)}save(){hn(ks,JSON.stringify(this.settings))}setMusicVol(e){this.settings.musicVol=jt(e,Ue.musicVol),this.applyVolumes(),this.save()}setSfxVol(e){this.settings.sfxVol=jt(e,Ue.sfxVol),this.applyVolumes(),this.save()}setMuted(e){this.settings.muted=e,this.applyVolumes(),this.save()}}const Y=new fn,Fi={ui_click:{path:"/assets/audio/sfx/ui_click.mp3"},ui_tab:{path:"/assets/audio/sfx/ui_tab.mp3"},denied:{path:"/assets/audio/sfx/denied.mp3"},player_join:{path:"/assets/audio/sfx/player_join.mp3"},cooldown_ready:{path:"/assets/audio/sfx/cooldown_ready.mp3"},no_mana:{path:"/assets/audio/sfx/no_mana.mp3"},chat:{path:"/assets/audio/sfx/chat.mp3"},purchase:{path:"/assets/audio/sfx/purchase.mp3"},sell:{path:"/assets/audio/sfx/sell.mp3"},gold_gain:{path:"/assets/audio/sfx/gold_gain.mp3"},equip:{path:"/assets/audio/sfx/equip.mp3"},unequip:{path:"/assets/audio/sfx/unequip.mp3"},skill_spend:{path:"/assets/audio/sfx/skill_spend.mp3"},drop_sting:{path:"/assets/audio/sfx/drop_sting.mp3"},cast_fire:{path:"/assets/audio/sfx/cast_fire.mp3"},cast_firewall:{path:"/assets/audio/sfx/cast_firewall.mp3"},cast_meteor:{path:"/assets/audio/sfx/cast_meteor.mp3"},cast_rain:{path:"/assets/audio/sfx/cast_rain.mp3"},cast_bow:{path:"/assets/audio/sfx/cast_bow.mp3"},fireball_whoosh:{path:"/assets/audio/sfx/fireball_whoosh.mp3"},fireball_explode:{path:"/assets/audio/sfx/fireball_explode.mp3"},meteor_fall:{path:"/assets/audio/sfx/meteor_fall.mp3"},meteor_impact:{path:"/assets/audio/sfx/meteor_impact.mp3"},arrow_shot:{path:"/assets/audio/sfx/arrow_shot.mp3"},rain_volley:{path:"/assets/audio/sfx/rain_volley.mp3"},rain_impact:{path:"/assets/audio/sfx/rain_impact.mp3"},evade:{path:"/assets/audio/sfx/evade.mp3"},teleport:{path:"/assets/audio/sfx/teleport.mp3"},hit_taken:{path:"/assets/audio/sfx/hit_taken.mp3"},hit_dealt:{path:"/assets/audio/sfx/hit_dealt.mp3"},death:{path:"/assets/audio/sfx/death.mp3"},countdown:{path:"/assets/audio/sfx/countdown.mp3"},duel_begin:{path:"/assets/audio/sfx/duel_begin.mp3"},victory:{path:"/assets/audio/sfx/victory.mp3"},defeat:{path:"/assets/audio/sfx/defeat.mp3"},level_up:{path:"/assets/audio/sfx/level_up.mp3"},firewall_loop:{path:"/assets/audio/sfx/firewall_loop.mp3",loop:!0},hall_base:{path:"/assets/audio/amb/hall_base.mp3",loop:!0},hall_torch:{path:"/assets/audio/amb/hall_torch.mp3",loop:!0},arena_wind:{path:"/assets/audio/amb/arena_wind.mp3",loop:!0}},yi=new Map,Gt=new Map,ri=new Set,_s=new Set;let Ms=!1;function un(s){fetch(Fi[s].path).then(e=>{if(!e.ok)throw new Error(String(e.status));return e.arrayBuffer()}).then(e=>{yi.set(s,e),Oa(s)}).catch(()=>{Ia(s)})}function Ia(s){_s.has(s)||(_s.add(s),console.warn(`sampleBank: missing/undecoded sample "${s}"`))}const za=[];function qa(s){za.push(s)}function mn(s){for(const e of za)e(s)}function Oa(s){const e=Y.ctx,t=yi.get(s);!e||!t||Gt.has(s)||ri.has(s)||(ri.add(s),e.decodeAudioData(t.slice(0)).then(i=>{Gt.set(s,i),yi.delete(s),mn(s)}).catch(()=>{Ia(s)}).finally(()=>{ri.delete(s)}))}function gn(){if(Ms)return;Ms=!0;const s=Object.keys(Fi);for(const e of s)un(e);Y.onUnlock(()=>{for(const e of s)Oa(e)})}function Na(s){return s==="music"?Y.musicBus:Y.sfxBus}function R(s,e={}){const t=Y.ctx,i=Na(e.bus??"sfx");if(!t||!i)return;const a=Gt.get(s);if(!a)return;const r=Fi[s],o=t.createBufferSource();o.buffer=a;const n=e.rateJitter??.04,l=e.rate??1;o.playbackRate.value=l*(1+(Math.random()*2-1)*n);const d=t.createGain();d.gain.value=e.gain??r.gain??1,o.connect(d),d.connect(i),o.start(t.currentTime+(e.delayS??0)),o.onended=()=>{o.disconnect(),d.disconnect()}}function at(s,e,t,i=1){const a=Y.ctx,r=Na(e);if(!a||!r)return null;const o=Gt.get(s);if(!o)return null;const n=a.createGain();n.gain.value=t,n.connect(r);const l=a.createBufferSource();l.buffer=o,l.loop=!0,l.playbackRate.value=i,l.connect(n),l.start(a.currentTime);let d=!1;return{gain:n,stop:()=>{if(d)return;d=!0;const h=a.currentTime;n.gain.cancelScheduledValues(h),n.gain.setValueAtTime(n.gain.value,h),n.gain.linearRampToValueAtTime(1e-4,h+.25),window.setTimeout(()=>{try{l.stop()}catch{}l.disconnect(),n.disconnect()},300)}}}function L(){return Y.ctx!==null&&Y.sfxBus!==null}const Cs=new Map;function I(s,e){const t=performance.now();return t-(Cs.get(s)??-1e9)<e?!0:(Cs.set(s,t),!1)}function xn(s){const e=s.split(/\s+/);return e.includes("bm-nav-tab")?"tab":e.includes("px-btn")||e.includes("bm-acct-item")?"click":null}function bn(){!L()||I("uiClick",40)||R("ui_click")}function vn(){!L()||I("uiTab",60)||R("ui_tab")}function Vt(){!L()||I("denied",150)||R("denied")}const yn={1:"cast_fire",2:"cast_firewall",3:"cast_meteor",4:"teleport",5:"cast_bow",6:"cast_bow",7:"cast_rain",8:"evade"};function wn(s){!L()||I(`cast${s}`,120)||R(yn[s]??"cast_fire")}function kn(){!L()||I("fbWhoosh",90)||R("fireball_whoosh")}function Sn(){!L()||I("fbBoom",90)||R("fireball_explode")}function _n(){!L()||I("arrow",70)||R("arrow_shot")}function Mn(){!L()||I("meteorFall",200)||R("meteor_fall")}function Cn(){!L()||I("meteorHit",150)||R("meteor_impact")}function Tn(){!L()||I("rainVolley",200)||R("rain_volley")}function $n(){if(!(!L()||I("rainHit",200)))for(let s=0;s<4;s++)R("rain_impact",{delayS:s/4*.25+Math.random()*.03})}function En(){!L()||I("teleport",100)||R("teleport")}const Ye=new Map,gt=new Set;let Ts=!1;function $s(s){if(Ye.has(s))return;const e=at("firewall_loop","sfx",.25);e?(Ye.set(s,e),gt.delete(s)):gt.add(s)}function An(s){!L()||Ye.has(s)||(Ts||(Ts=!0,qa(e=>{if(e==="firewall_loop")for(const t of[...gt])$s(t)})),$s(s))}function Fa(s){var e;gt.delete(s),(e=Ye.get(s))==null||e.stop(),Ye.delete(s)}function Ln(){for(const s of new Set([...Ye.keys(),...gt]))Fa(s)}function Pn(){!L()||I("hitTaken",150)||R("hit_taken")}function Rn(){!L()||I("hitDealt",150)||R("hit_dealt")}function Es(){!L()||I("death",300)||R("death")}function In(){!L()||I("cdReady",120)||R("cooldown_ready",{gain:.4})}function zn(){!L()||I("noMana",400)||R("no_mana")}function qn(s){!L()||I("result",500)||R(s?"victory":"defeat")}function On(){!L()||I("levelUp",300)||R("level_up")}function Nn(){!L()||I("gold",200)||R("gold_gain")}function Fn(s){switch(s){case"magic":return 3;case"rare":return 7;case"unique":return 12;default:return 0}}function Ba(s){!L()||I("drop",300)||R("drop_sting",{rate:Math.pow(2,Fn(s)/12)})}function Bn(){!L()||I("duelBegin",500)||R("duel_begin")}function As(){!L()||I("cdTick",300)||R("countdown")}function Dn(){!L()||I("chat",150)||R("chat")}function Hn(){!L()||I("join",200)||R("player_join")}function Un(){!L()||I("equip",100)||R("equip")}function wi(){!L()||I("unequip",100)||R("unequip")}function jn(){!L()||I("sell",150)||R("sell")}function Ls(){!L()||I("purchase",150)||R("purchase")}function Gn(){!L()||I("skillSpend",150)||R("skill_spend")}const Lt={none:16777215,burn:16737792,freeze:6737151,poison:4513092},ki=new Ai(1,8,8),Da=new He(18,4,4),Ha=new St().setFromPoints([new K(-9,0,0),new K(-15,0,0)]),Ua=new He(2,14,2),ja=new ba(50,58,32),Ga=new Ai(25,6,6),Va=new ie({color:16737792}),Wa=new ie({color:16720384,transparent:!0,opacity:.25}),Ya=new ie({color:16729088}),Xa=new Pi({color:16729088,transparent:!0,opacity:.4}),Vn=new Set([ki,Da,Ha,Ua,ja,Ga]),Bi=new Set([Va,Wa,Ya,Xa]),Ps=new Map,Rs=new Map;function Wn(s){let e=Ps.get(s);return e||(e=new ie({color:s}),Ps.set(s,e),Bi.add(e)),e}function Yn(s){let e=Rs.get(s);return e||(e=new Pi({color:s,transparent:!0,opacity:.5}),Rs.set(s,e),Bi.add(e)),e}function G(s){s.traverse(e=>{const t=e;if(t.geometry&&!Vn.has(t.geometry)&&t.geometry.dispose(),t.material){const i=Array.isArray(t.material)?t.material:[t.material];for(const a of i)Bi.has(a)||a.dispose()}})}class Xn{constructor(e,t){c(this,"fireballs",new Map);c(this,"arrows",new Map);c(this,"fireWalls",new Map);c(this,"meteors",new Map);c(this,"rainOfArrows",new Map);c(this,"rainZoneArrows",new Map);c(this,"particles");c(this,"prevFireballPositions",new Map);c(this,"clock",new ha);c(this,"elapsedTime",0);c(this,"teleportEffects",[]);c(this,"arrowElement","none");c(this,"emitAccumulator",0);c(this,"shouldEmitContinuous",!0);this.scene=e,this.myId=t,this.particles=new Jo(e)}setArrowElement(e){this.arrowElement=e}setMyId(e){this.myId=e}createFallingArrows(e,t,i,a=16){const r=Lt[this.arrowElement],o=new je,n=new ie({color:r,transparent:!0,opacity:.7}),l=[];for(let d=0;d<a;d++){const h=Math.random()*Math.PI*2,p=Math.sqrt(Math.random())*i,u=new H(Ua,n);u.position.set(Math.cos(h)*p,0,Math.sin(h)*p),u.rotation.x=(Math.random()-.5)*.3,u.rotation.z=(Math.random()-.5)*.3,o.add(u),l.push(Math.random())}return o.position.set(e,0,t),this.scene.add(o),{arrowGroup:o,arrowMaterial:n,arrowPhases:l,spawnTime:this.elapsedTime}}updateFallingArrows(e){const t=this.elapsedTime-e.spawnTime,i=250,a=.35,r=e.arrowGroup.children;for(let o=0;o<e.arrowPhases.length;o++){const n=(t/a+e.arrowPhases[o])%1;r[o].position.y=i*(1-n)}}detectTeleports(e){for(const t of Object.values(e.players))t.teleported&&(En(),this.teleportEffects.push(new ws(this.scene,t.teleported.x,t.teleported.y,this.particles)),this.teleportEffects.push(new ws(this.scene,t.position.x,t.position.y,this.particles)))}update(e){const t=this.clock.getDelta();this.elapsedTime+=t,this.emitAccumulator+=t,this.shouldEmitContinuous=this.emitAccumulator>=1/60,this.shouldEmitContinuous&&(this.emitAccumulator%=1/60),this.detectTeleports(e),this.syncFireballs(e),this.syncArrows(e),this.syncFireWalls(e),this.syncMeteors(e),this.syncRainOfArrows(e),this.particles.update(t);for(let i=this.teleportEffects.length-1;i>=0;i--)this.teleportEffects[i].update(t),this.teleportEffects[i].done&&this.teleportEffects.splice(i,1)}syncFireballs(e){const t=new Set(e.projectiles.filter(i=>i.type==="fireball").map(i=>i.id));for(const[i,a]of this.fireballs)if(!t.has(i)){const r=this.prevFireballPositions.get(i);r&&this.particles.emitExplosion(r.x,r.y,r.z,r.radius),Sn(),this.scene.remove(a),G(a),this.fireballs.delete(i),this.prevFireballPositions.delete(i)}for(const i of e.projectiles){if(i.type!=="fireball")continue;if(!this.fireballs.has(i.id)){kn();const p=i.radius??10,u=new H(ki,Va);u.scale.setScalar(p*.8);const m=new H(ki,Wa);m.scale.setScalar(1.4/.8),u.add(m),this.scene.add(u),this.fireballs.set(i.id,u)}const a=this.fireballs.get(i.id),r=i.position.x,o=30,n=i.position.y;a.position.set(r,o,n);const l=this.prevFireballPositions.get(i.id);let d=0,h=0;if(l){const p=r-l.x,u=n-l.z,m=Math.sqrt(p*p+u*u);m>0&&(d=p/m,h=u/m)}this.shouldEmitContinuous&&this.particles.emitTrail(r,o,n,d,h,i.radius??10),this.prevFireballPositions.set(i.id,{x:r,y:o,z:n,radius:i.blastRadius??i.radius??10})}}syncArrows(e){const t=new Set(e.projectiles.filter(i=>i.type==="arrow").map(i=>i.id));for(const[i,a]of this.arrows)t.has(i)||(this.scene.remove(a.mesh),G(a.mesh),this.arrows.delete(i));for(const i of e.projectiles){if(i.type!=="arrow")continue;if(!this.arrows.has(i.id)){_n();const p=new je,u=i.ownerId===this.myId?Lt[this.arrowElement]:16777215,m=new H(Da,Wn(u));p.add(m);const v=new gi(Ha,Yn(u));p.add(v),this.scene.add(p),this.arrows.set(i.id,{mesh:p})}const a=this.arrows.get(i.id),r=i.position.x,o=30,n=i.position.y;a.mesh.position.set(r,o,n);const l=i.velocity.x,d=i.velocity.y,h=Math.atan2(d,l);a.mesh.rotation.set(-Math.PI/2,0,-h)}}syncFireWalls(e){const t=new Set(e.fireWalls.map(i=>i.id));for(const[i,a]of this.fireWalls)if(!t.has(i)){this.scene.remove(a),G(a),this.fireWalls.delete(i),Fa(i);const r=this.rainZoneArrows.get(i);r&&(this.scene.remove(r.arrowGroup),G(r.arrowGroup),this.rainZoneArrows.delete(i))}for(const i of e.fireWalls){const a=i.id.startsWith("rain_zone_");if(!this.fireWalls.has(i.id)){a||An(i.id);const r=new je;if(i.shape==="circle"&&i.center&&i.radius){const o=new H(new mi(i.radius,32),new ie({color:a?Lt[this.arrowElement]:16720384,transparent:!0,opacity:a?.15:.2,side:nt}));o.rotation.x=-Math.PI/2,o.position.set(i.center.x,1,i.center.y),r.add(o),a&&this.rainZoneArrows.set(i.id,this.createFallingArrows(i.center.x,i.center.y,i.radius,12))}else for(const o of i.segments){const n=[new K(o.x1,1,o.y1),new K(o.x2,1,o.y2)],l=new gi(new St().setFromPoints(n),Xa);r.add(l)}this.scene.add(r),this.fireWalls.set(i.id,r)}if(i.shape==="circle"&&i.center&&i.radius){const r=this.fireWalls.get(i.id),o=r==null?void 0:r.children[0];if(o&&o.position.set(i.center.x,1,i.center.y),a){const n=this.rainZoneArrows.get(i.id);n&&(n.arrowGroup.position.set(i.center.x,0,i.center.y),this.updateFallingArrows(n))}else this.shouldEmitContinuous&&this.particles.emitCrater(i.center.x,i.center.y,i.radius)}else this.shouldEmitContinuous&&this.particles.emitWall(i.segments)}}syncMeteors(e){const t=new Set(e.meteors.map(i=>i.id));for(const[i,a]of this.meteors)t.has(i)||(this.scene.remove(a.ring),this.scene.remove(a.rock),G(a.ring),G(a.rock),this.particles.emitMeteorImpact(a.target.x,0,a.target.y),Cn(),this.meteors.delete(i));for(const i of e.meteors){if(!this.meteors.has(i.id)){Mn();const u=i.aoeRadius/Qr,m=new H(ja,new ie({color:16720384,transparent:!0,opacity:.6,side:nt}));m.rotation.x=-Math.PI/2,m.position.set(i.target.x,2,i.target.y);const v=new H(Ga,Ya);this.scene.add(m),this.scene.add(v),this.meteors.set(i.id,{ring:m,rock:v,target:{...i.target},spawnTime:this.elapsedTime,sizeScale:u})}const a=this.meteors.get(i.id),r=!i.hidden||i.ownerId===this.myId;a.ring.visible=r,a.rock.visible=r;const o=Math.max(0,Math.min(1,1-(i.strikeAt-e.tick)/Kr)),n=1-o*.4;a.ring.scale.setScalar(n*a.sizeScale);const l=this.elapsedTime-a.spawnTime,d=.5+o*2;a.ring.material.opacity=Math.sin(l*d*Math.PI*2)*.3+.5;const h=500*(1-o);a.rock.position.set(i.target.x,h,i.target.y);const p=.4+o*.6;a.rock.scale.setScalar(p*a.sizeScale),this.shouldEmitContinuous&&r&&this.particles.emitMeteorTrail(i.target.x,h,i.target.y)}}syncRainOfArrows(e){const t=new Set(e.rainOfArrows.map(i=>i.id));for(const[i,a]of this.rainOfArrows)t.has(i)||(this.scene.remove(a.circle),this.scene.remove(a.arrowGroup),G(a.circle),G(a.arrowGroup),this.particles.emitRainImpact(a.target.x,0,a.target.y,a.radius),$n(),this.rainOfArrows.delete(i));for(const i of e.rainOfArrows){if(!this.rainOfArrows.has(i.id)){Tn();const o=Lt[this.arrowElement],n=new H(new mi(i.radius,48),new ie({color:o,transparent:!0,opacity:.12,side:nt}));n.rotation.x=-Math.PI/2,n.position.set(i.target.x,1,i.target.y),this.scene.add(n);const l=this.createFallingArrows(i.target.x,i.target.y,i.radius);l.arrowMaterial.opacity=0,this.rainOfArrows.set(i.id,{circle:n,target:{...i.target},radius:i.radius,...l})}const a=this.rainOfArrows.get(i.id),r=Math.max(0,Math.min(1,1-(i.strikeAt-e.tick)/Jr));a.circle.material.opacity=.12+r*.23,a.arrowMaterial.opacity=Math.min(1,r*2),this.updateFallingArrows(a)}}dispose(){Ln();for(const e of this.fireballs.values())this.scene.remove(e),G(e);for(const e of this.arrows.values())this.scene.remove(e.mesh),G(e.mesh);for(const e of this.fireWalls.values())this.scene.remove(e),G(e);for(const e of this.rainZoneArrows.values())this.scene.remove(e.arrowGroup),G(e.arrowGroup);this.rainZoneArrows.clear();for(const e of this.meteors.values())this.scene.remove(e.ring),this.scene.remove(e.rock),G(e.ring),G(e.rock);for(const e of this.rainOfArrows.values())this.scene.remove(e.circle),this.scene.remove(e.arrowGroup),G(e.circle),G(e.arrowGroup);for(const e of this.teleportEffects)e.dispose();this.fireballs.clear(),this.arrows.clear(),this.fireWalls.clear(),this.meteors.clear(),this.rainOfArrows.clear(),this.teleportEffects.length=0,this.particles.dispose()}}const Za=1e3/_t,oi=2*Za,Zn=250;class Kn{constructor(){c(this,"snapshots",[]);c(this,"maxSnapshots",32);c(this,"clockOffset",null);c(this,"jitter",0);c(this,"renderDelayMs",oi);c(this,"outOfBandCount",0)}push(e,t=performance.now()){const i=e.tick*Za,a=t-i;this.clockOffset===null?this.clockOffset=a:Math.abs(a-this.clockOffset)>Zn?(this.outOfBandCount++,this.outOfBandCount>=2&&(this.clockOffset=a,this.jitter=0,this.outOfBandCount=0)):(this.outOfBandCount=0,this.jitter=this.jitter*.9+Math.abs(a-this.clockOffset)*.1,this.clockOffset=this.clockOffset*.95+a*.05),this.renderDelayMs=oi+this.jitter*2,this.snapshots.push({state:e,tickTime:i}),this.snapshots.length>this.maxSnapshots&&this.snapshots.shift()}getInterpolated(e=performance.now()){if(this.snapshots.length<2||this.clockOffset===null)return null;const t=e-this.clockOffset-this.renderDelayMs;let i=0;for(;i<this.snapshots.length-1&&!(this.snapshots[i+1].tickTime>=t);i++);i=Math.max(0,Math.min(i,this.snapshots.length-2));const a=this.snapshots[i],r=this.snapshots[i+1],o=r.tickTime-a.tickTime,n=o>0?Math.max(0,Math.min(1,(t-a.tickTime)/o)):1,l={};for(const d of Object.keys(r.state.players)){const h=a.state.players[d],p=r.state.players[d];if(!h){l[d]=p;continue}l[d]={...p,position:Qn(h.position,p.position,n),facing:Jn(h.facing,p.facing,n)}}return{...r.state,players:l}}getLatest(){return this.snapshots.length===0?null:this.snapshots[this.snapshots.length-1].state}clear(){this.snapshots=[],this.clockOffset=null,this.jitter=0,this.renderDelayMs=oi,this.outOfBandCount=0}}function Qn(s,e,t){return{x:s.x+(e.x-s.x)*t,y:s.y+(e.y-s.y)*t}}function Jn(s,e,t){let i=e-s;for(;i>Math.PI;)i-=2*Math.PI;for(;i<-Math.PI;)i+=2*Math.PI;return s+i*t}const el=30,tl=.5,il=100;class sl{constructor(e){c(this,"position");c(this,"prevPosition");c(this,"seq",0);c(this,"buffer",[]);c(this,"correctionOffset",{x:0,y:0});c(this,"correctionStartTime",0);c(this,"correctionDurationMs",il);this.position={...e},this.prevPosition={...e}}applyInput(e,t,i={}){this.seq++,this.prevPosition={...this.position};const a=i.speedMult??1;return this.position=rs(this.position,e,a),i.teleportTarget&&(this.position=as(this.position,i.teleportTarget,i.teleportRange),this.prevPosition={...this.position}),this.buffer.push({seq:this.seq,move:e,speedMult:a,teleportTarget:i.teleportTarget,teleportRange:i.teleportRange}),this.seq}reconcile(e,t){if(this.buffer=this.buffer.filter(n=>n.seq>t),this.buffer.length>el){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0};return}let i={...e};for(const n of this.buffer)i=rs(i,n.move,n.speedMult),n.teleportTarget&&(i=as(i,n.teleportTarget,n.teleportRange));const a=i.x-this.position.x,r=i.y-this.position.y;if(Math.sqrt(a*a+r*r)>tl){const n=performance.now(),l=this.getRenderPosition(1,n),d=this.position.x-this.prevPosition.x,h=this.position.y-this.prevPosition.y;this.correctionOffset={x:l.x-i.x,y:l.y-i.y},this.correctionStartTime=n,this.prevPosition={x:i.x-d,y:i.y-h},this.position=i}}getPosition(e=performance.now()){return this.getRenderPosition(1,e)}getRenderPosition(e,t=performance.now()){const i=Math.max(0,Math.min(1,e)),a={x:this.prevPosition.x+(this.position.x-this.prevPosition.x)*i,y:this.prevPosition.y+(this.position.y-this.prevPosition.y)*i};if(this.correctionOffset.x===0&&this.correctionOffset.y===0)return a;const r=t-this.correctionStartTime,n=1-Math.min(1,r/this.correctionDurationMs);return{x:a.x+this.correctionOffset.x*n,y:a.y+this.correctionOffset.y*n}}reset(e){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0}}getSeq(){return this.seq}}class al{constructor(){c(this,"socket");this.socket=zr("",{autoConnect:!1,transports:["websocket"]})}connect(){this.socket.connect()}disconnect(){this.socket.removeAllListeners(),this.socket.disconnect()}joinRoom(e,t,i,a,r){this.socket.emit("join-room",{roomId:e,displayName:t,accessToken:i,teamId:a,characterId:r})}ready(){this.socket.emit("player-ready")}sendInput(e){this.socket.emit("input",e)}rematch(){this.socket.emit("rematch")}sendChatMessage(e){this.socket.emit("chat-message",{text:e})}rejoinRoom(e,t){this.socket.emit("rejoin-room",{roomId:e,accessToken:t})}leavePausedMatch(){this.socket.emit("leave-paused-match")}onRoomJoined(e){this.socket.once("room-joined",e)}onPlayerJoined(e){this.socket.on("player-joined",e)}onGameReady(e){this.socket.once("game-ready",e)}onGameState(e){this.socket.off("game-state"),this.socket.on("game-state",e)}onDuelEnded(e){this.socket.off("duel-ended"),this.socket.on("duel-ended",e)}onRematchReady(e){this.socket.off("rematch-ready"),this.socket.on("rematch-ready",e)}onRematchRequested(e){this.socket.off("rematch-requested"),this.socket.on("rematch-requested",e)}onOpponentDisconnected(e){this.socket.off("opponent-disconnected"),this.socket.on("opponent-disconnected",e)}onTeamFull(e){this.socket.once("team-full",e)}onPlayerDisconnected(e){this.socket.on("player-disconnected",e)}onPlayerLeft(e){this.socket.on("player-left",e)}onRoomNotFound(e){this.socket.off("room-not-found"),this.socket.on("room-not-found",e)}onChatMessage(e){this.socket.off("chat-message"),this.socket.on("chat-message",e)}onPlayerReadyAck(e){this.socket.off("player-ready-ack"),this.socket.on("player-ready-ack",e)}onMatchPaused(e){this.socket.off("match-paused"),this.socket.on("match-paused",e)}onGameResumed(e){this.socket.off("game-resumed"),this.socket.on("game-resumed",e)}onRejoinAccepted(e){this.socket.off("rejoin-accepted"),this.socket.once("rejoin-accepted",e)}onRejoinFailed(e){this.socket.off("rejoin-failed"),this.socket.once("rejoin-failed",e)}onReconnect(e){this.socket.on("connect",e)}onDisconnect(e){this.socket.on("disconnect",e)}get id(){return this.socket.id??""}}const Ka=-Math.PI/4,Is=Math.cos(Ka),zs=Math.sin(Ka);class rl{constructor(e,t){c(this,"keys",new Set);c(this,"activeSpell",null);c(this,"slots",new Array(mt).fill(null));c(this,"charClass","mage");c(this,"mouseScreen",{x:0,y:0});c(this,"mouseWorld",{x:1e3,y:1e3});c(this,"pendingCast",null);c(this,"onKeyDown",e=>{this.keys.add(e.code);const t=/^Digit([1-6])$/.exec(e.code);if(t){const i=this.spellForSlot(Number(t[1]));i&&(this.activeSpell=i)}if(e.code==="Space"){e.preventDefault();const i=to[this.charClass];this.slots.includes(i)&&(this.pendingCast={spell:i,aimTarget:this.mouseWorld})}});c(this,"onKeyUp",e=>{this.keys.delete(e.code)});c(this,"onBlur",()=>{this.keys.clear()});c(this,"onMouseMove",e=>{this.mouseScreen={x:e.clientX,y:e.clientY},this.mouseWorld=this.scene.screenToWorld(e.clientX,e.clientY)});c(this,"onMouseDown",e=>{});c(this,"onMouseUp",e=>{e.button===0&&this.activeSpell!==null&&(this.pendingCast={spell:this.activeSpell,aimTarget:this.mouseWorld})});this.scene=e,this.canvas=t,window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur),window.addEventListener("contextmenu",this.onBlur),t.addEventListener("mousemove",this.onMouseMove),t.addEventListener("mousedown",this.onMouseDown),t.addEventListener("mouseup",this.onMouseUp)}spellForSlot(e){return this.slots[e-1]??null}buildInputFrame(){const e={x:0,y:0};(this.keys.has("KeyW")||this.keys.has("ArrowUp"))&&(e.y-=1),(this.keys.has("KeyS")||this.keys.has("ArrowDown"))&&(e.y+=1),(this.keys.has("KeyA")||this.keys.has("ArrowLeft"))&&(e.x-=1),(this.keys.has("KeyD")||this.keys.has("ArrowRight"))&&(e.x+=1);const t=e.x*Is-e.y*zs,i=e.x*zs+e.y*Is;e.x=t,e.y=i;const a={move:e,castSpell:null,aimTarget:this.mouseWorld};return this.pendingCast&&(a.castSpell=this.pendingCast.spell,a.aimTarget=this.pendingCast.aimTarget,this.pendingCast=null),a}refreshMouseWorld(){this.mouseWorld=this.scene.screenToWorld(this.mouseScreen.x,this.mouseScreen.y)}setSlots(e){this.slots=e,(this.activeSpell===null||!e.includes(this.activeSpell))&&(this.activeSpell=e.find(t=>t!==null)??null)}setCharacterClass(e){this.charClass=e==="ranger"?"ranger":"mage"}getActiveSpell(){return this.activeSpell}getCurrentMouseWorld(){return this.mouseWorld}dispose(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),window.removeEventListener("contextmenu",this.onBlur),this.canvas.removeEventListener("mousemove",this.onMouseMove),this.canvas.removeEventListener("mousedown",this.onMouseDown),this.canvas.removeEventListener("mouseup",this.onMouseUp)}}const ne=120;function ni(s,e){const t=ne/2+(s-e)*ne/(2*q),i=(s+e)*ne/(2*q);return[t,i]}class ol{constructor(e){c(this,"canvas");c(this,"ctx");this.canvas=document.createElement("canvas"),this.canvas.width=ne,this.canvas.height=ne,Object.assign(this.canvas.style,{position:"fixed",top:"12px",right:"12px",opacity:"0.85",border:"none",borderRadius:"0",boxShadow:"0 0 0 2px var(--px-border-dark),0 0 0 4px var(--px-border-light)",imageRendering:"pixelated",zIndex:"100",display:"none"}),e.appendChild(this.canvas),this.ctx=this.canvas.getContext("2d")}update(e,t){const i=this.ctx;i.clearRect(0,0,ne,ne),i.fillStyle="#0a0a1a",i.fillRect(0,0,ne,ne),i.strokeStyle="#333",i.lineWidth=1,i.strokeRect(0,0,ne,ne),i.fillStyle="#6c63ff";for(const n of lt){const[l,d]=ni(n.x,n.y);i.fillRect(l-2,d-2,4,4)}const a=["#ff5252","#ff9800","#ab47bc"];for(let n=0;n<t.length;n++){const l=t[n];if(l.hp<=0)continue;const[d,h]=ni(l.position.x,l.position.y);i.fillStyle=a[n%a.length],i.beginPath(),i.arc(d,h,3,0,Math.PI*2),i.fill()}const[r,o]=ni(e.position.x,e.position.y);i.fillStyle="#00e676",i.beginPath(),i.arc(r,o,3,0,Math.PI*2),i.fill()}show(){this.canvas.style.display=""}hide(){this.canvas.style.display="none"}}const nl={1:"fa-fire",2:"fa-fire-flame-simple",3:"fa-meteor",4:"fa-wand-magic",5:"fa-bullseye",6:"fa-arrows-split-up-and-left",7:"fa-cloud-rain",8:"fa-person-running"},ll={1:"#ff8c42",2:"#ff8c42",3:"#ff8c42",4:"#b48cff",5:"#8cd97a",6:"#8cd97a",7:"#8cd97a",8:"#b48cff"},li="polygon(37.5% 0%,62.5% 0%,75% 6.25%,87.5% 12.5%,93.75% 25%,100% 37.5%,100% 62.5%,93.75% 75%,87.5% 87.5%,75% 93.75%,62.5% 100%,37.5% 100%,25% 93.75%,12.5% 87.5%,6.25% 75%,0% 62.5%,0% 37.5%,6.25% 25%,12.5% 12.5%,25% 6.25%)";class cl{constructor(e){c(this,"el");c(this,"minimap");c(this,"myId","");c(this,"prevHp",{});c(this,"hpFill");c(this,"mpFill");c(this,"hpOrb");c(this,"hpNum");c(this,"mpNum");c(this,"spellsEl");c(this,"enemiesEl");c(this,"slotEls",[]);c(this,"enemyRows",new Map);c(this,"lastHpPct",-1);c(this,"lastMpPct",-1);c(this,"lastHpText","");c(this,"lastMpText","");c(this,"lastLowPulse",!1);this.minimap=new ol(e),this.el=document.createElement("div"),this.el.innerHTML=`
      <style>
        .hud-dock{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:18px;pointer-events:none}
        /* --- orbs --- */
        .orb-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
        .orb{width:88px;height:88px;position:relative;clip-path:${li};background:var(--px-border-dark);}
        .orb-inner{position:absolute;inset:5px;clip-path:${li};background:#101117;overflow:hidden}
        .orb-fill{position:absolute;inset:0;transition:transform .12s}
        .orb-fill::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.35)}
        .orb-hp .orb-fill{background:linear-gradient(180deg,#e0524a 0%,#b32e2e 45%,#7d1c22 100%)}
        .orb-mp .orb-fill{background:linear-gradient(180deg,#4a7ce0 0%,#2e50b3 45%,#1c2f7d 100%)}
        .orb-shine{position:absolute;top:12%;left:18%;width:26%;height:16%;background:rgba(255,255,255,0.22);clip-path:${li};pointer-events:none}
        .orb-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:13px;color:#fff;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000,0 2px 0 #000;z-index:2}
        .orb-label{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-border-light);letter-spacing:1px}
        .orb.low-pulse{animation:orb-low .9s ease-in-out infinite}
        @keyframes orb-low{0%,100%{filter:drop-shadow(0 0 0 rgba(224,91,91,0))}50%{filter:drop-shadow(0 0 9px rgba(224,91,91,0.85))}}
        /* --- spell slots --- */
        .spells{display:flex;gap:8px;padding:9px 12px;margin-bottom:8px;background:var(--px-panel);box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 6px 12px rgba(0,0,0,0.5)}
        .spell-slot{width:52px;height:52px;background:linear-gradient(180deg,#333640 0%,#23252c 100%);box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px var(--px-border-dark);position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .spell-slot .slot-icon{font-size:21px;text-shadow:0 2px 0 rgba(0,0,0,0.6);z-index:1;transition:opacity .1s}
        .spell-slot .slot-key{position:absolute;right:2px;bottom:2px;font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-text);background:var(--px-border-dark);padding:2px 3px;z-index:3}
        .spell-slot .cd-overlay{position:absolute;bottom:0;left:0;right:0;background:rgba(10,8,18,0.8);transition:height .1s;z-index:2}
        .spell-slot .cd-time{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;font-size:10px;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;z-index:3;display:none}
        .spell-slot.cooling .cd-time{display:flex}
        .spell-slot.cooling .slot-icon{opacity:0.45}
        .spell-slot.nomana .slot-icon{opacity:0.35;filter:saturate(0.2) brightness(1.6) hue-rotate(180deg)}
        .spell-slot.active{box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px var(--px-accent),0 0 10px rgba(255,179,71,0.55)}
        .spell-slot.active::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(255,179,71,0.4);z-index:2;pointer-events:none}
        .spell-slot.empty{opacity:0.3}
        .spell-slot.empty .slot-icon{opacity:0.5}
        .spell-slot .charge-pips{position:absolute;left:3px;top:3px;display:flex;gap:3px;z-index:3}
        .charge-pips .pip{width:6px;height:6px;background:#3a3d46;box-shadow:0 0 0 1px var(--px-border-dark)}
        .charge-pips .pip.full{background:#ddb84a}
        /* --- enemy plates --- */
        .hud-enemies{position:fixed;top:12px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:7px;align-items:center}
        .hud-enemy-entry{background:var(--px-panel);padding:6px 10px 8px;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);text-align:center;transition:opacity .3s}
        .hud-enemy-entry .enemy-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);margin-bottom:5px;letter-spacing:1px;text-shadow:1px 1px 0 var(--px-border-dark)}
        .hud-enemy-entry .enemy-hp-track{height:12px;background:#101117;overflow:hidden;width:190px;box-shadow:inset 0 0 0 2px var(--px-border-dark);position:relative}
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
    `,e.appendChild(this.el),this.hpFill=this.el.querySelector("#hud-hp"),this.mpFill=this.el.querySelector("#hud-mp"),this.hpOrb=this.el.querySelector("#hud-hp-orb"),this.hpNum=this.el.querySelector("#hud-hp-num"),this.mpNum=this.el.querySelector("#hud-mp-num"),this.spellsEl=this.el.querySelector("#hud-spells"),this.enemiesEl=this.el.querySelector("#hud-enemies")}init(e){this.myId=e,this.prevHp={},this.enemiesEl.textContent="",this.enemyRows.clear(),this.lastHpPct=-1,this.lastMpPct=-1}buildSpellSlots(e){this.spellsEl.textContent="",this.slotEls=[];for(let t=0;t<mt;t++){const i=e[t]??null,a=document.createElement("div");a.className=i===null?"spell-slot empty":"spell-slot";const r=i===null?"fa-minus":nl[i]??"fa-star",o=i===null?"var(--px-text)":ll[i]??"var(--px-text)";if(a.innerHTML=`
        <i class="fa ${r} fa-fw slot-icon" style="color:${o}"></i>
        <span class="slot-key">${t+1}</span>
        <div class="cd-overlay" style="height:0%"></div>
        <span class="cd-time"></span>
        <div class="charge-pips"></div>`,this.spellsEl.appendChild(a),i===null){this.slotEls.push(null);continue}this.slotEls.push({spell:i,slot:a,cd:a.querySelector(".cd-overlay"),cdTime:a.querySelector(".cd-time"),pips:a.querySelector(".charge-pips"),lastPct:0,lastActive:!1,lastNoMana:!1,lastCooling:!1,lastCdText:""})}}update(e,t){const i=e.players[this.myId];if(!i)return;const a=i.maxHp??xi,r=i.maxMana??Sa,o=Math.round((1-i.hp/a)*1e3)/10;o!==this.lastHpPct&&(this.hpFill.style.transform=`translateY(${o}%)`,this.lastHpPct=o);const n=Math.round((1-i.mana/r)*1e3)/10;n!==this.lastMpPct&&(this.mpFill.style.transform=`translateY(${n}%)`,this.lastMpPct=n);const l=String(Math.max(0,Math.ceil(i.hp)));l!==this.lastHpText&&(this.hpNum.textContent=l,this.lastHpText=l);const d=String(Math.max(0,Math.floor(i.mana)));d!==this.lastMpText&&(this.mpNum.textContent=d,this.lastMpText=d);const h=i.hp>0&&i.hp/a<.3;h!==this.lastLowPulse&&(this.hpOrb.classList.toggle("low-pulse",h),this.lastLowPulse=h);const p=this.prevHp[this.myId];p!==void 0&&i.hp<p&&(p>0&&i.hp<=0?Es():Pn());for(const f of this.slotEls){if(!f)continue;const g=f.spell,b=g===t;b!==f.lastActive&&(f.slot.classList.toggle("active",b),f.lastActive=b);const y=i.cooldowns[g]??0,w=ct[g].cooldownTicks,x=w>0?Math.round(y/w*1e3)/10:0;x!==f.lastPct&&(f.lastPct>0&&x===0&&In(),f.cd.style.height=`${x}%`,f.lastPct=x);const k=g===8?i.evadeCharges:void 0,A=k!==void 0?k===0:x>0;A!==f.lastCooling&&(f.slot.classList.toggle("cooling",A),f.lastCooling=A);const O=y>0?(y/60).toFixed(1):"";O!==f.lastCdText&&(f.cdTime.textContent=O,f.lastCdText=O);const D=i.mana<ct[g].manaCost;if(D!==f.lastNoMana&&(f.slot.classList.toggle("nomana",D),f.lastNoMana=D),g===8){const F=i.evadeCharges;F!==f.lastCharges&&(f.lastCharges=F,f.pips.innerHTML=F===void 0?"":Array.from({length:eo},(ae,me)=>`<span class="pip${me<F?" full":""}"></span>`).join(""))}}const u=[],m=new Set;for(const[f,g]of Object.entries(e.players)){if(f===this.myId)continue;m.add(f),u.push(g);let b=this.enemyRows.get(f);if(!b){const w=document.createElement("div");w.className="hud-enemy-entry";const x=document.createElement("div");x.className="enemy-name";const k=document.createElement("div");k.className="enemy-hp-track";const A=document.createElement("div");A.className="enemy-hp-fill",k.appendChild(A),w.append(x,k),this.enemiesEl.appendChild(w),b={row:w,name:x,fill:A,lastHp:-1,lastName:"",flashTimer:0},this.enemyRows.set(f,b)}g.displayName!==b.lastName&&(b.name.textContent=g.displayName,b.lastName=g.displayName),g.hp!==b.lastHp&&(b.lastHp>=0&&g.hp<b.lastHp&&(Rn(),b.row.classList.add("hit"),clearTimeout(b.flashTimer),b.flashTimer=window.setTimeout(()=>b.row.classList.remove("hit"),140)),b.fill.style.width=`${g.hp/(g.maxHp??xi)*100}%`,b.row.style.opacity=g.hp<=0?"0.3":"1",b.lastHp=g.hp);const y=this.prevHp[f];y!==void 0&&y>0&&g.hp<=0&&(Es(),this.showElimination(g.displayName))}for(const[f,g]of this.enemyRows)m.has(f)||(g.row.remove(),this.enemyRows.delete(f));const v={};for(const[f,g]of Object.entries(e.players))v[f]=g.hp;this.prevHp=v,this.minimap.update(i,u)}showElimination(e){const t=document.createElement("div");t.className="hud-elim",t.textContent=`${e} eliminated`,this.el.appendChild(t),setTimeout(()=>t.remove(),2e3)}show(){this.el.style.display="",this.minimap.show()}hide(){this.el.style.display="none",this.minimap.hide()}}function Di(s,e){if(document.getElementById(s))return;const t=document.createElement("style");t.id=s,t.textContent=e,document.head.appendChild(t)}const dl=`
.ct-wall{position:absolute;inset:0;width:100%;height:100%;z-index:0;}
.ct-vig{position:absolute;inset:0;pointer-events:none;z-index:2;
  background:radial-gradient(ellipse at center,transparent 28%,rgba(4,5,9,0.72) 100%);}
.ct-floor{position:absolute;z-index:1;bottom:0;left:0;right:0;height:46px;pointer-events:none;
  background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.55) 100%);}
/* Torch light pool painted inside the wall svg: screen-blended radial so the
   bricks around the sconce genuinely brighten, with a slow breathing pulse. */
.ct-glow{mix-blend-mode:screen;visibility:var(--ct-amb-vis,visible);
  animation:ct-glowpulse 2.6s ease-in-out infinite alternate;
  animation-delay:var(--ct-amb-shift,0s);}
.ct-glow-hot{animation-duration:1.7s;animation-direction:alternate-reverse;}
@keyframes ct-glowpulse{from{opacity:0.72;}to{opacity:1;}}
/* Embers are svg rects inside the torch def, so they rise from the flame at
   any viewport size. Per-ember phase comes from --ct-em-d style attrs. */
.ct-emberp{opacity:0;visibility:var(--ct-amb-vis,visible);
  animation:ct-emrise 4.4s linear infinite;
  animation-delay:calc(var(--ct-amb-shift,0s) + var(--ct-em-d,0s));}
@keyframes ct-emrise{
  0%{opacity:0;transform:translate(0,0);}7%{opacity:0.95;}
  40%{opacity:0.6;transform:translate(2.5px,-18px);}
  70%{opacity:0.3;transform:translate(-1.5px,-32px);}
  100%{opacity:0;transform:translate(1px,-45px);}}
.ct-f1{animation:ct-fx1 var(--ct-flame-dur,0.54s) steps(1) infinite;}
.ct-f2{animation:ct-fx2 var(--ct-flame-dur,0.54s) steps(1) infinite;}
.ct-f3{animation:ct-fx3 var(--ct-flame-dur,0.54s) steps(1) infinite;}
@keyframes ct-fx1{0%,32.99%{opacity:1;}33%,100%{opacity:0;}}
@keyframes ct-fx2{0%,32.99%{opacity:0;}33%,65.99%{opacity:1;}66%,100%{opacity:0;}}
@keyframes ct-fx3{0%,65.99%{opacity:0;}66%,100%{opacity:1;}}
/* Custom properties, not descendant selectors: class selectors can't reach
   inside a <use> shadow tree, but inherited custom properties can. The right
   torch runs slower and phase-shifted so the pair never sync up. */
.ct-slow{--ct-flame-dur:0.66s;--ct-amb-shift:-1.4s;}
`;function Le(){Di("ct-scene",dl)}const hl=s=>`
<g id="${s}-rowA">
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
<g id="${s}-rowB">
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
<g id="${s}-rowC">
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
</g>`,pl=s=>`
<g id="${s}-mossA">
  <rect x="0" y="0" width="6" height="2" fill="#3f5c2c"/><rect x="1" y="-1" width="3" height="1" fill="#557a39"/>
  <rect x="2" y="2" width="2" height="2" fill="#2f4720"/><rect x="5" y="1" width="2" height="1" fill="#557a39"/>
</g>
<g id="${s}-mossB">
  <rect x="0" y="0" width="9" height="2" fill="#3a5629"/><rect x="2" y="-1" width="4" height="1" fill="#557a39"/>
  <rect x="6" y="-1" width="2" height="1" fill="#6b9147"/><rect x="1" y="2" width="2" height="3" fill="#2f4720"/>
  <rect x="6" y="2" width="2" height="2" fill="#3a5629"/>
</g>
<g id="${s}-mossC">
  <rect x="0" y="0" width="4" height="1" fill="#557a39"/><rect x="1" y="1" width="2" height="2" fill="#3f5c2c"/>
</g>`,fl=s=>`
<radialGradient id="${s}-glowgrad">
  <stop offset="0" stop-color="#ff9a38" stop-opacity="0.55"/>
  <stop offset="0.45" stop-color="#ff8226" stop-opacity="0.2"/>
  <stop offset="1" stop-color="#ff8226" stop-opacity="0"/>
</radialGradient>
<g id="${s}-torch">
  <circle class="ct-glow" cx="63" cy="52" r="54" fill="url(#${s}-glowgrad)"/>
  <circle class="ct-glow ct-glow-hot" cx="63" cy="58" r="22" fill="url(#${s}-glowgrad)"/>
  <!-- near-black silhouette underlay: 1px outline so the iron separates from
       the same-value bricks behind it -->
  <rect x="49" y="63" width="28" height="8" fill="#0a0b0f"/>
  <rect x="51" y="69" width="24" height="8" fill="#0a0b0f"/>
  <rect x="55" y="75" width="16" height="8" fill="#0a0b0f"/>
  <rect x="59" y="81" width="8" height="6" fill="#0a0b0f"/>
  <rect x="60" y="85" width="6" height="15" fill="#0a0b0f"/>
  <rect x="58" y="91" width="10" height="5" fill="#0a0b0f"/>
  <rect x="57" y="97" width="12" height="22" fill="#0a0b0f"/>
  <!-- mounting plate bolted to the wall -->
  <rect x="58" y="98" width="10" height="20" fill="#20232b"/>
  <rect x="58" y="98" width="10" height="2" fill="#3a3f4b"/>
  <rect x="58" y="100" width="2" height="18" fill="#2c303a"/>
  <rect x="66" y="100" width="2" height="18" fill="#171a20"/>
  <rect x="61" y="101" width="3" height="3" fill="#454a57"/><rect x="62" y="102" width="1" height="1" fill="#5a6172"/>
  <rect x="61" y="112" width="3" height="3" fill="#454a57"/><rect x="62" y="113" width="1" height="1" fill="#5a6172"/>
  <rect x="58" y="116" width="10" height="2" fill="#14161c"/>
  <!-- stem with collar -->
  <rect x="61" y="86" width="4" height="14" fill="#2c2f38"/>
  <rect x="61" y="86" width="1" height="14" fill="#3d414d"/>
  <rect x="59" y="92" width="8" height="3" fill="#343845"/>
  <rect x="59" y="92" width="8" height="1" fill="#5c5340"/>
  <!-- flared iron cresset basket -->
  <rect x="60" y="82" width="6" height="4" fill="#23262e"/>
  <rect x="56" y="76" width="14" height="6" fill="#262a33"/>
  <rect x="56" y="76" width="14" height="1" fill="#3d372c"/>
  <rect x="52" y="70" width="22" height="6" fill="#2a2e38"/>
  <rect x="52" y="70" width="22" height="1" fill="#4a4030"/>
  <rect x="50" y="66" width="26" height="4" fill="#343a46"/>
  <rect x="50" y="66" width="26" height="1" fill="#8a6f45"/>
  <rect x="50" y="64" width="3" height="2" fill="#343a46"/><rect x="57" y="64" width="3" height="2" fill="#343a46"/>
  <rect x="66" y="64" width="3" height="2" fill="#343a46"/><rect x="73" y="64" width="3" height="2" fill="#343a46"/>
  <rect x="50" y="64" width="3" height="1" fill="#7a5f38"/><rect x="57" y="64" width="3" height="1" fill="#7a5f38"/>
  <rect x="66" y="64" width="3" height="1" fill="#7a5f38"/><rect x="73" y="64" width="3" height="1" fill="#7a5f38"/>
  <rect x="55" y="72" width="2" height="2" fill="#3f4552"/><rect x="59" y="75" width="2" height="2" fill="#3f4552"/>
  <rect x="63" y="78" width="2" height="2" fill="#3f4552"/><rect x="69" y="72" width="2" height="2" fill="#3b414d"/>
  <rect x="66" y="75" width="2" height="2" fill="#3b414d"/>
  <rect x="52" y="70" width="2" height="4" fill="#1c1f26"/><rect x="72" y="70" width="2" height="4" fill="#171a20"/>
  <!-- coals in the cup -->
  <rect x="53" y="66" width="20" height="3" fill="#57230a"/>
  <rect x="55" y="65" width="7" height="2" fill="#a33d0c"/>
  <rect x="64" y="65" width="6" height="2" fill="#8a3208"/>
  <rect x="58" y="64" width="4" height="2" fill="#e8641c"/>
  <rect x="66" y="64" width="3" height="1" fill="#ffb347"/>
  <!-- flame frame 1: calm sway left, small right tongue -->
  <g class="ct-f1">
    <rect x="53" y="61" width="20" height="3" fill="#922908"/><rect x="54" y="58" width="18" height="3" fill="#922908"/>
    <rect x="54" y="55" width="16" height="3" fill="#922908"/><rect x="55" y="52" width="14" height="3" fill="#922908"/>
    <rect x="56" y="49" width="12" height="3" fill="#922908"/><rect x="56" y="46" width="10" height="3" fill="#922908"/>
    <rect x="57" y="43" width="8" height="3" fill="#922908"/><rect x="57" y="40" width="6" height="3" fill="#922908"/>
    <rect x="58" y="37" width="4" height="3" fill="#922908"/><rect x="58" y="34" width="2" height="3" fill="#922908"/>
    <rect x="68" y="50" width="3" height="3" fill="#922908"/><rect x="69" y="47" width="2" height="3" fill="#922908"/>
    <rect x="70" y="44" width="1" height="3" fill="#922908"/>
    <rect x="55" y="61" width="16" height="3" fill="#e8641c"/><rect x="56" y="58" width="14" height="3" fill="#e8641c"/>
    <rect x="56" y="55" width="12" height="3" fill="#e8641c"/><rect x="57" y="52" width="10" height="3" fill="#e8641c"/>
    <rect x="58" y="49" width="8" height="3" fill="#e8641c"/><rect x="58" y="46" width="6" height="3" fill="#e8641c"/>
    <rect x="59" y="43" width="4" height="3" fill="#e8641c"/><rect x="59" y="40" width="2" height="3" fill="#e8641c"/>
    <rect x="68" y="50" width="2" height="2" fill="#e8641c"/>
    <rect x="57" y="61" width="12" height="3" fill="#ffb347"/><rect x="58" y="58" width="10" height="3" fill="#ffb347"/>
    <rect x="58" y="55" width="8" height="3" fill="#ffb347"/><rect x="59" y="52" width="6" height="3" fill="#ffb347"/>
    <rect x="60" y="49" width="4" height="3" fill="#ffb347"/><rect x="60" y="46" width="2" height="3" fill="#ffb347"/>
    <rect x="59" y="61" width="8" height="3" fill="#ffe9a0"/><rect x="60" y="58" width="6" height="3" fill="#ffe9a0"/>
    <rect x="60" y="55" width="4" height="3" fill="#ffe9a0"/><rect x="61" y="52" width="2" height="3" fill="#ffe9a0"/>
  </g>
  <!-- flame frame 2: tall lean right with detached spark -->
  <g class="ct-f2">
    <rect x="53" y="61" width="20" height="3" fill="#922908"/><rect x="55" y="58" width="18" height="3" fill="#922908"/>
    <rect x="56" y="55" width="16" height="3" fill="#922908"/><rect x="58" y="52" width="14" height="3" fill="#922908"/>
    <rect x="59" y="49" width="12" height="3" fill="#922908"/><rect x="60" y="46" width="10" height="3" fill="#922908"/>
    <rect x="61" y="43" width="8" height="3" fill="#922908"/><rect x="62" y="40" width="6" height="3" fill="#922908"/>
    <rect x="63" y="37" width="4" height="3" fill="#922908"/><rect x="64" y="34" width="3" height="3" fill="#922908"/>
    <rect x="64" y="31" width="2" height="3" fill="#922908"/><rect x="66" y="26" width="2" height="2" fill="#922908"/>
    <rect x="55" y="52" width="2" height="3" fill="#922908"/><rect x="54" y="49" width="1" height="3" fill="#922908"/>
    <rect x="55" y="61" width="16" height="3" fill="#e8641c"/><rect x="57" y="58" width="14" height="3" fill="#e8641c"/>
    <rect x="58" y="55" width="12" height="3" fill="#e8641c"/><rect x="60" y="52" width="10" height="3" fill="#e8641c"/>
    <rect x="61" y="49" width="8" height="3" fill="#e8641c"/><rect x="62" y="46" width="6" height="3" fill="#e8641c"/>
    <rect x="62" y="43" width="4" height="3" fill="#e8641c"/><rect x="63" y="40" width="2" height="3" fill="#e8641c"/>
    <rect x="57" y="61" width="12" height="3" fill="#ffb347"/><rect x="59" y="58" width="10" height="3" fill="#ffb347"/>
    <rect x="60" y="55" width="8" height="3" fill="#ffb347"/><rect x="61" y="52" width="6" height="3" fill="#ffb347"/>
    <rect x="62" y="49" width="4" height="3" fill="#ffb347"/><rect x="63" y="46" width="2" height="3" fill="#ffb347"/>
    <rect x="59" y="61" width="8" height="3" fill="#ffe9a0"/><rect x="61" y="58" width="6" height="3" fill="#ffe9a0"/>
    <rect x="61" y="55" width="4" height="3" fill="#ffe9a0"/><rect x="62" y="52" width="2" height="3" fill="#ffe9a0"/>
  </g>
  <!-- flame frame 3: split twin tongues -->
  <g class="ct-f3">
    <rect x="53" y="61" width="20" height="3" fill="#922908"/><rect x="54" y="58" width="18" height="3" fill="#922908"/>
    <rect x="55" y="55" width="16" height="3" fill="#922908"/><rect x="56" y="52" width="14" height="3" fill="#922908"/>
    <rect x="56" y="49" width="6" height="3" fill="#922908"/><rect x="64" y="49" width="6" height="3" fill="#922908"/>
    <rect x="57" y="46" width="4" height="3" fill="#922908"/><rect x="65" y="46" width="4" height="3" fill="#922908"/>
    <rect x="57" y="43" width="3" height="3" fill="#922908"/><rect x="66" y="43" width="3" height="3" fill="#922908"/>
    <rect x="58" y="40" width="2" height="3" fill="#922908"/><rect x="67" y="40" width="2" height="3" fill="#922908"/>
    <rect x="67" y="37" width="1" height="3" fill="#922908"/>
    <rect x="55" y="61" width="16" height="3" fill="#e8641c"/><rect x="56" y="58" width="14" height="3" fill="#e8641c"/>
    <rect x="57" y="55" width="12" height="3" fill="#e8641c"/><rect x="58" y="52" width="10" height="3" fill="#e8641c"/>
    <rect x="58" y="49" width="2" height="3" fill="#e8641c"/><rect x="65" y="49" width="3" height="3" fill="#e8641c"/>
    <rect x="58" y="46" width="2" height="3" fill="#e8641c"/><rect x="66" y="46" width="2" height="3" fill="#e8641c"/>
    <rect x="57" y="61" width="12" height="3" fill="#ffb347"/><rect x="58" y="58" width="10" height="3" fill="#ffb347"/>
    <rect x="59" y="55" width="8" height="3" fill="#ffb347"/><rect x="60" y="52" width="6" height="3" fill="#ffb347"/>
    <rect x="59" y="49" width="2" height="3" fill="#ffb347"/><rect x="66" y="49" width="2" height="3" fill="#ffb347"/>
    <rect x="59" y="61" width="8" height="3" fill="#ffe9a0"/><rect x="60" y="58" width="6" height="3" fill="#ffe9a0"/>
    <rect x="61" y="55" width="4" height="3" fill="#ffe9a0"/><rect x="61" y="52" width="2" height="3" fill="#ffe9a0"/>
  </g>
  <!-- rising embers, phase-staggered via --ct-em-d -->
  <rect class="ct-emberp" x="60" y="46" width="2" height="2" fill="#ffcc55" style="--ct-em-d:0s"/>
  <rect class="ct-emberp" x="66" y="50" width="1" height="1" fill="#ffaa00" style="--ct-em-d:-1.1s"/>
  <rect class="ct-emberp" x="57" y="52" width="1" height="1" fill="#ff8a2a" style="--ct-em-d:-2.3s"/>
  <rect class="ct-emberp" x="63" y="42" width="1" height="1" fill="#ffd27a" style="--ct-em-d:-3.2s"/>
  <rect class="ct-emberp" x="69" y="47" width="1" height="1" fill="#ffaa00" style="--ct-em-d:-2.0s;animation-duration:5.1s"/>
</g>`,ul=["A","B","C","B","A","C","B","A","C","A","B","C","A","C","B","A","C"],qs=[0,-30,-14,-22,-8,-27,-18,-6,-26,-12,-3,-20,-9,-29,-15,-4,-23],ml=s=>ul.map((e,t)=>`<use href="#${s}-row${e}" x="${qs[t]}" y="${t*11}"/><use href="#${s}-row${e}" x="${qs[t]+160}" y="${t*11}"/>`).join(`
`),gl=`
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
<rect x="76" y="152" width="2" height="1" fill="#262c38"/><rect x="246" y="64" width="2" height="1" fill="#2a3040"/>`,xl=s=>`
<use href="#${s}-mossB" x="8" y="150"/><use href="#${s}-mossA" x="60" y="172"/><use href="#${s}-mossB" x="140" y="174"/>
<use href="#${s}-mossA" x="224" y="162"/><use href="#${s}-mossB" x="280" y="140"/><use href="#${s}-mossA" x="296" y="174"/>
<use href="#${s}-mossC" x="104" y="130"/><use href="#${s}-mossC" x="192" y="118"/><use href="#${s}-mossA" x="4" y="86"/>
<use href="#${s}-mossC" x="300" y="76"/><use href="#${s}-mossC" x="128" y="42"/><use href="#${s}-mossA" x="236" y="64"/>
<use href="#${s}-mossC" x="40" y="118"/><use href="#${s}-mossC" x="68" y="40"/><use href="#${s}-mossC" x="152" y="128"/>
<use href="#${s}-mossC" x="28" y="106"/><use href="#${s}-mossB" x="184" y="170"/><use href="#${s}-mossA" x="110" y="166"/>
<use href="#${s}-mossC" x="252" y="150"/><use href="#${s}-mossC" x="90" y="94"/><use href="#${s}-mossC" x="210" y="90"/>
<use href="#${s}-mossC" x="308" y="120"/>`,bl=s=>`
<use href="#${s}-mossA" x="8" y="150"/><use href="#${s}-mossC" x="300" y="84"/><use href="#${s}-mossA" x="260" y="172"/>
<use href="#${s}-mossC" x="48" y="108"/><use href="#${s}-mossC" x="180" y="130"/><use href="#${s}-mossB" x="120" y="172"/>
<use href="#${s}-mossC" x="228" y="116"/>`;function vl(s={}){const e=s.idPrefix??"ct",t=s.mossDensity==="sparse"?bl(e):xl(e);return`<svg class="ct-wall" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<rect x="0" y="0" width="320" height="180" fill="#12141b"/>
<defs>${hl(e)}${pl(e)}${fl(e)}</defs>
${ml(e)}${gl}${t}
<!--TORCHES-->
</svg>`}function Os(s,e){return e==="left"?`<use href="#${s}-torch" x="-30" y="0"/>`:`<g transform="translate(320,0) scale(-1,1)" class="ct-slow"><use href="#${s}-torch" x="-30" y="0"/></g>`}function he(s="cth"){return`${vl({idPrefix:s}).replace("<!--TORCHES-->",Os(s,"left")+Os(s,"right"))}
<div class="ct-floor"></div>
<div class="ct-vig"></div>`}function yl(s){const e=[{id:"credits",label:"Credits"}];return s&&e.push({id:"admin",label:"⚙ Admin"}),e.push({id:"settings",label:"Settings"}),e.push({id:"logout",label:"Sign Out"}),e}function wl(s){return s&&s>0?`✦${s}`:""}const kl=[{key:"arena",label:"Arena"},{key:"skills",label:"Skills"},{key:"gear",label:"Gear"},{key:"shop",label:"Shop"}],Sl=`
.bm-nav{display:flex;align-items:center;gap:10px;width:100%;max-width:1060px;background:rgba(10,11,15,0.92);padding:10px 14px;margin-bottom:24px;box-sizing:border-box;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
.bm-gold-pill{display:flex;align-items:center;gap:6px;padding:8px 14px;flex-shrink:0;background:var(--px-border-dark);box-shadow:0 0 0 2px var(--px-accent);color:var(--px-accent);font-size:11px;letter-spacing:1px;white-space:nowrap;font-family:'Press Start 2P',monospace;}
.bm-gold-pill i{font-size:12px;}
.bm-nav-crest{font-family:'Press Start 2P',monospace;font-size:10px;color:var(--px-accent);letter-spacing:1px;white-space:nowrap;margin-right:8px;text-shadow:0 0 10px rgba(255,122,30,0.5),2px 2px 0 var(--px-border-dark);}
.bm-nav-tab{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;padding:10px 14px;}
.bm-nav-tab.active{background:#3a3f4b;color:var(--px-accent);cursor:default;box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.bm-nav-tab.locked{opacity:0.4;cursor:not-allowed;}
.bm-nav-badge{color:var(--px-success);margin-left:6px;}
.bm-nav-spacer{flex:1;}
.bm-acct{position:relative;}
.bm-acct-btn{font-size:8px;letter-spacing:1px;padding:10px 12px;color:var(--px-accent);}
.bm-acct-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:200px;background:var(--px-panel);display:none;z-index:5;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark),0 8px 24px rgba(0,0,0,0.6);}
.bm-acct-menu.open{display:block;}
.bm-acct-item{display:block;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-text);text-transform:uppercase;padding:12px 14px;}
.bm-acct-item:hover{background:#3a3f4b;color:var(--px-accent);}
.bm-acct-item[data-item="logout"]:hover{color:var(--px-danger);}
/* Alignment is shared state: the bar is centred inside each screen's own
   scroll container, so a container that reserves scrollbar space while its
   neighbour doesn't makes the bar jump sideways on every section switch.
   Reserving it everywhere — including the lobby, which never scrolls —
   keeps the bar pinned. The screens' top padding must stay equal too (20px);
   these class names are listed here so that contract lives in one file. */
.bm-overlay,.st-overlay,.gr-overlay,.sh-overlay,.ad-overlay{scrollbar-gutter:stable;}
/* Sub-screens put their own title/actions in a row under the nav. */
.bm-subhead{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;width:100%;max-width:1060px;margin-bottom:16px;box-sizing:border-box;}
.bm-subhead-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
/* Shown in a screen's content region while its first fetch is in flight. Each
   screen paints its chrome (backdrop, nav, subhead) synchronously on show()
   and swaps this for real content when the data lands — before, show() set
   display:block on a still-empty element and awaited the network, so the whole
   load was a blank screen. */
.bm-loading{font-family:'Press Start 2P',monospace;font-size:9px;letter-spacing:1px;color:var(--px-text-dim,#8a8f9c);padding:40px 0;text-align:center;animation:bm-loading-pulse 1.1s ease-in-out infinite;}
@keyframes bm-loading-pulse{0%,100%{opacity:0.35;}50%{opacity:0.75;}}
@media (prefers-reduced-motion: reduce){.bm-loading{animation:none;opacity:0.6;}}
`;function Ct(){Di("bm-nav-css",Sl)}function Ee(s){const e=s.tabsEnabled!==!1,t=wl(s.skillPoints),i=kl.map(o=>{const n=o.key==="skills"&&t?`<span class="bm-nav-badge">${t}</span>`:"";if(o.key===s.active)return`<button class="bm-nav-tab px-btn active" data-nav="${o.key}">${o.label}${n}</button>`;const l=e?"bm-nav-tab px-btn":"bm-nav-tab px-btn locked",d=e?"":" disabled";return`<button class="${l}" data-nav="${o.key}"${d}>${o.label}${n}</button>`}).join(""),a=yl(s.isAdmin===!0).map(o=>`<button class="bm-acct-item" data-item="${o.id}">${o.label}</button>`).join(""),r=s.gold===null||s.gold===void 0;return`
      <div class="bm-nav">
        <div class="bm-nav-crest">⚔ Blood Moor</div>
        ${i}
        <div class="bm-nav-spacer"></div>
        <div class="bm-gold-pill" data-nav-gold style="display:${r?"none":""}">
          <i class="fa fa-coins"></i><span data-nav-gold-amount>${s.gold??0}</span>
        </div>
        <div class="bm-acct">
          <button class="bm-acct-btn px-btn" data-nav-acct>${s.username||"Account"} ▾</button>
          <div class="bm-acct-menu" data-nav-acct-menu>${a}</div>
        </div>
      </div>`}function Ae(s,e){s.querySelectorAll("[data-nav]").forEach(o=>{const n=o.dataset.nav;o.classList.contains("active")||o.disabled||o.addEventListener("click",()=>e.onNavigate(n))});const t=s.querySelector("[data-nav-acct]"),i=s.querySelector("[data-nav-acct-menu]");if(!t||!i)return()=>{};t.addEventListener("click",o=>{o.stopPropagation(),i.classList.toggle("open")});const a=()=>i.classList.remove("open");document.addEventListener("click",a);const r={credits:()=>e.onCredits(),admin:()=>e.onNavigate("admin"),settings:()=>e.onSettings(),logout:()=>e.onLogout()};return i.querySelectorAll(".bm-acct-item").forEach(o=>{o.addEventListener("click",()=>{var n;i.classList.remove("open"),(n=r[o.dataset.item])==null||n.call(r)})}),()=>document.removeEventListener("click",a)}function _l(s,e){const t=s.querySelector("[data-nav-gold]");if(!t)return;if(e===null){t.style.display="none";return}t.style.display="";const i=t.querySelector("[data-nav-gold-amount]");i&&(i.textContent=String(e))}class Hi{constructor(e,t=2,i="walk"){c(this,"ctx");c(this,"composite",null);c(this,"requestId",0);c(this,"rafId",null);c(this,"animStart",null);c(this,"disposed",!1);c(this,"loop",e=>{var n;this.rafId=requestAnimationFrame(this.loop);const t=(n=this.composite)==null?void 0:n[this.anim];if(!t)return;this.animStart===null&&(this.animStart=e);const i=(e-this.animStart)/1e3,a=Ot(this.anim,i,!0),{sx:r,sy:o}=qt(this.anim,this.dir,a);this.ctx.clearRect(0,0,M,M),this.ctx.drawImage(t.image,r,o,M,M,0,0,M,M)});this.dir=t,this.anim=i,e.width=M,e.height=M,this.ctx=e.getContext("2d"),this.rafId=requestAnimationFrame(this.loop)}setAppearance(e,t={}){const i=++this.requestId;return this.composite&&(dt(this.composite),this.composite=null),this.animStart=null,Ra(e,t).then(a=>this.disposed||i!==this.requestId?(dt(a),!0):(this.composite=a,this.animStart=null,!0),a=>(console.warn("SpritePreview: composite failed",a),!1))}dispose(){this.disposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.composite&&(dt(this.composite),this.composite=null)}}const Ml=void 0,Cl=void 0,C=qr(Ml,Cl),Ui="";async function Zt(){var e;const{data:{session:s}}=await C.auth.getSession();return((e=s==null?void 0:s.user)==null?void 0:e.id)??null}async function Tl(){const s=await Zt();if(!s)return null;const{data:e}=await C.from("profiles").select("username, matches_played, matches_won, is_admin").eq("user_id",s).single();return e??null}async function Nt(){const s=await Zt();if(!s)return[];const{data:e}=await C.from("characters").select("*").eq("user_id",s).order("created_at",{ascending:!0});return(e??[]).map(t=>({...t,class:Ut(t.class)}))}async function $l(s,e,t){const{data:{user:i}}=await C.auth.getUser();if(!i)return null;const{data:a,error:r}=await C.rpc("create_character",{p_user_id:i.id,p_name:s,p_class:e});if(r)return console.error("create_character failed:",r.message),null;const o=a;if(t)try{await Qa(o,t)}catch(l){console.warn("set initial appearance failed:",l instanceof Error?l.message:l)}const n=qi[Ut(e)];for(const l of n?[n]:[]){const{error:d}=await C.rpc("unlock_skill_node",{p_character_id:o,p_node_id:l,p_cost:0});d&&console.error(`starter skill ${l} failed:`,d.message)}return o}async function El(s){const{data:{user:e}}=await C.auth.getUser();if(!e)return!1;const{error:t}=await C.rpc("delete_character",{p_user_id:e.id,p_character_id:s});return t?(console.error("delete_character failed:",t.message),!1):!0}async function Qa(s,e){const{error:t}=await C.rpc("update_appearance",{p_character_id:s,p_appearance:e});if(t)throw t}async function Ja(){const s=await Zt();if(!s)return[];const{data:e,error:t}=await C.from("items").select("id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source").eq("user_id",s).order("created_at",{ascending:!1});if(t)return console.error("fetchItems failed:",t.message),[];const i=[];for(const a of e??[]){const r=Oi(a);r?i.push(r):console.warn("fetchItems: dropped invalid item row",a)}return i}async function Al(s,e,t){const{error:i}=await C.rpc("equip_item",{p_item_id:s,p_character_id:e,p_slot:t});return i?(console.error("equip_item failed:",i.message),!1):!0}async function Ll(s){const{error:e}=await C.rpc("unequip_item",{p_item_id:s});return e?(console.error("unequip_item failed:",e.message),!1):!0}async function Pl(){const{data:s,error:e}=await C.from("items").select("id, user_id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, created_at");return e?(console.error("adminFetchAllItems failed:",e.message),[]):s??[]}async function Rl(s,e,t,i,a,r,o){const{data:n,error:l}=await C.rpc("admin_grant_item",{p_user_id:s,p_base_id:e,p_rarity:t,p_affixes:i,p_level_req:a,p_slot:r,p_class_restriction:o??null});return l?(console.error("admin_grant_item failed:",l.message),null):n}async function Il(s){const{error:e}=await C.rpc("admin_delete_item",{p_item_id:s});return e?(console.error("admin_delete_item failed:",e.message),!1):!0}async function zl(){const{data:s,error:e}=await C.from("drop_tables").select("context, weights");return e?(console.error("fetchDropTables failed:",e.message),[]):s??[]}async function Ns(s,e){const{error:t}=await C.rpc("admin_update_drop_table",{p_context:s,p_weights:e});return t?(console.error("admin_update_drop_table failed:",t.message),!1):!0}async function ql(s){const e=[...new Set(s)];if(e.length===0)return new Map;const{data:t,error:i}=await C.from("profiles").select("user_id, username").in("user_id",e);return i?(console.error("adminFetchUsernames failed:",i.message),new Map):new Map((t??[]).map(a=>[a.user_id,a.username]))}async function Ol(s){const{data:e,error:t}=await C.from("profiles").select("user_id").eq("username",s).maybeSingle();return t?(console.error("adminFindUserByUsername failed:",t.message),null):(e==null?void 0:e.user_id)??null}async function Nl(s){const e=[...new Set(s)];if(e.length===0)return new Map;const{data:t,error:i}=await C.from("characters").select("id, name").in("id",e);return i?(console.error("adminFetchCharacterNames failed:",i.message),new Map):new Map((t??[]).map(a=>[a.id,a.name]))}async function ji(){const s=await Zt();if(!s)return 0;const{data:e,error:t}=await C.from("profiles").select("gold").eq("user_id",s).single();return t?(console.error("fetchGold failed:",t.message),0):(e==null?void 0:e.gold)??0}async function Fl(s){const{data:e,error:t}=await C.rpc("sell_item",{p_item_id:s});return t?(console.error("sell_item failed:",t.message),null):e}async function Bl(){const{data:{session:s}}=await C.auth.getSession();if(!s)return null;try{const e=await fetch(`${Ui}/economy/vendor`,{headers:{Authorization:`Bearer ${s.access_token}`}});return e.ok?await e.json():(console.error("fetchVendorView failed:",e.status),null)}catch(e){return console.error("fetchVendorView failed:",e),null}}async function Dl(s){const{data:{session:e}}=await C.auth.getSession();if(!e)return{ok:!1,status:401,error:"not signed in"};try{const t=await fetch(`${Ui}/economy/vendor/buy`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.access_token}`},body:JSON.stringify({slotIndex:s})}),i=await t.json().catch(()=>({}));if(!t.ok){const r=typeof(i==null?void 0:i.error)=="string"?i.error:"purchase failed";return console.error("buyVendorSlot failed:",t.status,r),{ok:!1,status:t.status,error:r}}const a=Oi(i.item);return a?{ok:!0,item:a}:(console.error("buyVendorSlot: server item failed validation",i.item),{ok:!1,status:500,error:"invalid item from server"})}catch(t){return console.error("buyVendorSlot failed:",t),{ok:!1,status:0,error:"network error"}}}async function Hl(s){const{data:{session:e}}=await C.auth.getSession();if(!e)return{ok:!1,status:401,error:"not signed in"};try{const t=await fetch(`${Ui}/economy/lootbox/open`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.access_token}`},body:JSON.stringify({tier:s})}),i=await t.json().catch(()=>({}));if(!t.ok){const r=typeof(i==null?void 0:i.error)=="string"?i.error:"lootbox open failed";return console.error("openLootbox failed:",t.status,r),{ok:!1,status:t.status,error:r}}const a=Oi(i.item);return a?{ok:!0,item:a}:(console.error("openLootbox: server item failed validation",i.item),{ok:!1,status:500,error:"invalid item from server"})}catch(t){return console.error("openLootbox failed:",t),{ok:!1,status:0,error:"network error"}}}const qe=40,Ul=["idle","walk","shoot","spellcast","hurt"],Fs=new Map;function jl(s){return new Promise(e=>{const t=new Image;t.onload=()=>e(t),t.onerror=()=>e(null),t.src=s})}function Gl(s){return s.replace("{body}","male").replace("{legs}","male")}async function Vl(s){if(!s.lpc)return null;try{let e=null,t=[];for(const y of Ul)if(t=await Promise.all(s.lpc.layers.map(w=>jl(`/assets/lpc/${Gl(w.path)}/${y}.png`))),t.some(w=>w!==null)){e=y;break}if(!e)return null;const i=ve[e].singleRow?0:2,a=document.createElement("canvas");a.width=M,a.height=M;const r=a.getContext("2d");if(!r)return null;s.lpc.layers.forEach((y,w)=>{const x=t[w];if(!x)return;const k=y.tint?Pa(x,x.width,x.height,y.tint,y.tintMode):x;r.drawImage(k,0,i*M,M,M,0,0,M,M)});const o=r.getImageData(0,0,M,M).data;let n=M,l=M,d=-1,h=-1;for(let y=0;y<M;y++)for(let w=0;w<M;w++)o[(y*M+w)*4+3]>8&&(w<n&&(n=w),w>d&&(d=w),y<l&&(l=y),y>h&&(h=y));if(d<0)return null;const p=d-n+1,u=h-l+1,m=document.createElement("canvas");m.width=qe,m.height=qe;const v=m.getContext("2d");if(!v)return null;v.imageSmoothingEnabled=!1;const f=Math.min(qe/p,qe/u),g=Math.max(1,Math.floor(p*f)),b=Math.max(1,Math.floor(u*f));return v.drawImage(a,n,l,p,u,Math.floor((qe-g)/2),Math.floor((qe-b)/2),g,b),m}catch{return null}}function Wl(s){let e=Fs.get(s.id);return e||(e=Vl(s),Fs.set(s.id,e)),e}function Me(s){return s.lpc?` data-icon-base="${s.id}"`:""}function xt(s){s.querySelectorAll("[data-icon-base]").forEach(e=>{const t=N.find(i=>i.id===e.dataset.iconBase);t&&Wl(t).then(i=>{var r;if(!i||!e.isConnected)return;const a=document.createElement("canvas");a.width=i.width,a.height=i.height,(r=a.getContext("2d"))==null||r.drawImage(i,0,0),a.style.cssText="width:100%;height:100%;image-rendering:pixelated;",e.replaceChildren(a)})})}function j(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const Ce={basic:"#e2e2e6",magic:"#4a6fc4",rare:"#ddb84a",unique:"#ffb347"},Yl=["ring1","helmet","ring2","weapon","armor","amulet","leggings"],Xl={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring1:"Ring 1",ring2:"Ring 2",amulet:"Amulet"},Zl={weapon:"fa-khanda",helmet:"fa-helmet-safety",armor:"fa-shirt",leggings:"fa-socks",ring1:"fa-ring",ring2:"fa-ring",amulet:"fa-gem"},Kl={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring:"Ring",amulet:"Amulet"},Ql={max_health:s=>`+${s} Max Health`,max_mana:s=>`+${s} Max Mana`,damage_pct:s=>`+${s}% Damage`,cast_speed_pct:s=>`+${s}% Cast Speed`,move_speed_pct:s=>`+${s}% Move Speed`,mana_regen_pct:s=>`+${s}% Mana Regen`};function Bs(s){return s.id==="talent"?`+${s.value} Talent Rank`:Ql[s.id](s.value)}function pt(s){return N.find(e=>e.id===s.base_id)}function er(s){return De.find(e=>e.baseId===s.base_id)}function ft(s,e){var t;return s.rarity==="unique"?((t=er(s))==null?void 0:t.name)??e.name:e.name}function Jl(s){return s.includes("ring1")?(s.includes("ring2"),"ring2"):"ring1"}function Ds(s,e,t){if(e<s.level_req)return{ok:!1,reason:`Requires level ${s.level_req}`};const i=N.find(a=>a.id===s.base_id);return i!=null&&i.classRestriction&&i.classRestriction!==t?{ok:!1,reason:`Restricted to ${i.classRestriction}`}:{ok:!0}}function Hs(s){return s.source==="starter"?{sellable:!1,reason:"Starter gear — cannot be sold"}:{sellable:!0,price:Po(s.rarity,s.level_req)}}const ec=`
.gr-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.gr-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.gr-title{font-size:11px;letter-spacing:0.05em;}
.gr-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
.gr-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.gr-col-doll{flex:0 0 340px;}
.gr-col-side{flex:1 1 380px;min-width:320px;max-width:460px;display:flex;flex-direction:column;gap:14px;}
.gr-doll-label,.gr-stash-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;}
.gr-doll-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-areas:"ring1 helmet ring2" "weapon armor amulet" ". leggings .";gap:10px;}
.gr-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 6px;min-height:96px;cursor:pointer;background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-slot:hover{transform:scale(1.04);}
.gr-slot-empty{outline:2px dashed var(--px-border-light);box-shadow:none;cursor:default;color:var(--px-border-light);opacity:0.7;}
.gr-slot-empty:hover{transform:none;}
.gr-slot-icon{font-size:1.3rem;}
.gr-slot-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:0.05em;text-transform:uppercase;text-align:center;color:var(--px-border-light);}
.gr-slot-name{font-family:'Press Start 2P',monospace;font-size:8px;text-align:center;line-height:1.5;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.gr-selected{outline:2px solid #fff;outline-offset:2px;}
.gr-stash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:320px;overflow-y:auto;padding:4px;}
.gr-card{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;cursor:pointer;background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);transition:filter 0.14s,transform 0.1s;}
.gr-card:hover{transform:scale(1.04);}
.gr-empty{grid-column:1 / -1;color:var(--px-border-light);font-size:15px;text-align:center;padding:20px 0;}
.gr-details{padding:16px 18px;min-height:220px;box-sizing:border-box;}
.gr-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:24px;}
.gr-details-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.gr-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
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
.gr-slot-icon,.gr-details-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;}
.gr-paperdoll{display:flex;justify-content:center;margin-bottom:10px;}
.gr-paperdoll canvas{width:128px;height:128px;image-rendering:pixelated;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
`;class tc{constructor(e,t,i){c(this,"el");c(this,"items",[]);c(this,"characterId",null);c(this,"charClass","mage");c(this,"charLevel",1);c(this,"selectedId",null);c(this,"closeResolver",null);c(this,"navTeardown",null);c(this,"gold",null);c(this,"loading",!1);c(this,"sellPending",new Set);c(this,"sellErrorById",new Map);c(this,"paperdoll",null);c(this,"appearance",Mt.mage);this.navCtx=t,this.navHandlers=i,Le(),Ct();const a=document.createElement("style");a.textContent=ec,document.head.appendChild(a),this.el=document.createElement("div"),this.el.className="gr-overlay",e.appendChild(this.el)}async show(e,t,i,a){return this.characterId=e,this.charClass=t,this.charLevel=i,this.appearance=a,this.selectedId=null,this.sellPending.clear(),this.sellErrorById.clear(),this.el.style.display="block",this.gold=null,this.loading=this.items.length===0,this.render(),await this.reload(),await new Promise(r=>{this.closeResolver=r})}hide(e="arena"){var i,a;this.el.style.display="none",(i=this.navTeardown)==null||i.call(this),this.navTeardown=null,(a=this.paperdoll)==null||a.dispose(),this.paperdoll=null;const t=this.closeResolver;this.closeResolver=null,t==null||t(e)}reset(){this.items=[],this.gold=null,this.selectedId=null}async reload(){const[e,t]=await Promise.all([Ja(),ji()]);this.items=e,this.gold=t,this.loading=!1,this.render()}equippedSlots(){return this.items.filter(e=>e.equipped_by===this.characterId&&e.equipped_slot!==null).map(e=>e.equipped_slot)}render(){var r,o;const e=Yl.map(n=>this.renderDollSlot(n)).join(""),t=this.items.filter(n=>n.equipped_by===null),i=t.length?t.map(n=>this.renderCard(n)).join(""):'<div class="gr-empty">Stash is empty.</div>';this.el.innerHTML=`
      <div class="gr-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${he("gr")}</div>
      <div class="gr-ui">
        ${Ee({active:"gear",...this.navCtx(),gold:this.gold})}
        <div class="bm-subhead">
          <div class="gr-title px-title">${j(this.charClass)} Lvl ${this.charLevel} — Gear</div>
        </div>
        ${this.loading?'<div class="bm-loading">Loading gear…</div>':`
        <div class="gr-columns">
          <div class="gr-col-doll">
            <div class="gr-paperdoll"><canvas id="gr-paperdoll-canvas"></canvas></div>
            <div class="gr-doll-label">Equipped</div>
            <div class="gr-doll-grid">${e}</div>
          </div>
          <div class="gr-col-side">
            <div id="gr-details" class="gr-details px-panel"></div>
            <div class="gr-stash-label">Stash (${t.length})</div>
            <div class="gr-stash-grid">${i}</div>
          </div>
        </div>`}
      </div>
    `,(r=this.navTeardown)==null||r.call(this),this.navTeardown=Ae(this.el,{onNavigate:n=>this.hide(n),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.attachItemListeners(),xt(this.el),this.renderDetails(this.selectedId),(o=this.paperdoll)==null||o.dispose(),this.paperdoll=null;const a=this.el.querySelector("#gr-paperdoll-canvas");if(a){this.paperdoll=new Hi(a,2,"walk");const n=this.items.filter(l=>l.equipped_by===this.characterId);this.paperdoll.setAppearance(this.appearance,La(n))}}renderDollSlot(e){const t=this.items.find(n=>n.equipped_by===this.characterId&&n.equipped_slot===e);if(!t)return`<div class="gr-slot gr-slot-empty" style="grid-area:${e}">
        <div class="gr-slot-icon"><i class="fa ${Zl[e]}"></i></div>
        <div class="gr-slot-label">${j(Xl[e])}</div>
      </div>`;const i=pt(t);if(!i)return"";const a=Ce[t.rarity],r=ft(t,i);return`<div class="gr-slot${t.id===this.selectedId?" gr-selected":""}" style="grid-area:${e};box-shadow:inset 0 0 0 2px ${a}" data-item="${t.id}" data-equipped="1">
      <div class="gr-slot-icon"${Me(i)} style="color:${a}"><i class="fa ${i.icon}"></i></div>
      <div class="gr-slot-name" style="color:${a}">${j(r)}</div>
    </div>`}renderCard(e){const t=pt(e);if(!t)return"";const i=Ce[e.rarity],a=ft(e,t);return`<div class="gr-card${e.id===this.selectedId?" gr-selected":""}" style="box-shadow:inset 0 0 0 2px ${i}" data-item="${e.id}">
      <div class="gr-slot-icon"${Me(t)} style="color:${i}"><i class="fa ${t.icon}"></i></div>
      <div class="gr-slot-name" style="color:${i}">${j(a)}</div>
    </div>`}attachItemListeners(){this.el.querySelectorAll("[data-item]").forEach(e=>{const t=e.getAttribute("data-item"),i=e.getAttribute("data-equipped")==="1";e.addEventListener("mouseenter",()=>this.renderDetails(t)),e.addEventListener("click",()=>{const a=this.items.find(n=>n.id===t);if(!a)return;if(i){this.handleUnequip(a);return}if(!Ds(a,this.charLevel,this.charClass).ok){this.selectItem(t);return}const o=a.slot==="ring"?Jl(this.equippedSlots()):a.slot;this.equipOptimistic(a,o)})})}selectItem(e){var t;this.selectedId=e,this.el.querySelectorAll(".gr-selected").forEach(i=>i.classList.remove("gr-selected")),(t=this.el.querySelector(`[data-item="${e}"]`))==null||t.classList.add("gr-selected"),this.renderDetails(e)}equipOptimistic(e,t){if(!this.characterId)return;Un();const i=this.characterId;for(const a of this.items)a.id!==e.id&&a.equipped_by===i&&a.equipped_slot===t&&(a.equipped_by=null,a.equipped_slot=null);e.equipped_by=i,e.equipped_slot=t,this.selectedId=e.id,this.render(),Al(e.id,i,t).then(a=>{a||console.error("equip_item failed, reverting"),this.reload()})}handleUnequip(e){wi(),e.equipped_by=null,e.equipped_slot=null,this.selectedId=e.id,this.render(),Ll(e.id).then(t=>{t||console.error("unequip_item failed, reverting"),this.reload()})}renderDetails(e){const t=this.el.querySelector("#gr-details");if(!t)return;if(!e){t.innerHTML='<div class="gr-details-empty">Hover an item to inspect it.<br>Click a stash item to equip, or an equipped item to unequip.</div>';return}const i=this.items.find(w=>w.id===e),a=i?pt(i):void 0;if(!i||!a){t.innerHTML='<div class="gr-details-empty">Item no longer available.</div>';return}const r=Ce[i.rarity],o=ft(i,a),n=i.rarity==="unique"?er(i):void 0,l=i.equipped_by===this.characterId,d=n?`<div class="gr-flavor">${j(n.flavor)}</div>`:"",h=`<div class="gr-details-row">${j(Bs(a.implicit))} <span class="gr-dim">(implicit)</span></div>`,p=i.affixes.map(w=>{if(w.id==="talent"&&w.node){const x=se.find(D=>D.id===w.node),k=(x==null?void 0:x.name)??w.node,A=Ea(this.charClass,w.node),O=`+${w.value} ${k}${A?"":" (inert for this class)"}`;return`<div class="gr-details-row${A?"":" gr-dim"}">${j(O)}</div>`}return`<div class="gr-details-row">${j(Bs(w))}</div>`}).join(""),m=`<div class="gr-details-row ${this.charLevel<i.level_req?"gr-bad":"gr-ok"}">Requires Level ${i.level_req}</div>`;let v="";a.classRestriction&&(v=`<div class="gr-details-row ${a.classRestriction!==this.charClass?"gr-bad":"gr-ok"}">Class: ${j(a.classRestriction)}</div>`);const f=Ds(i,this.charLevel,this.charClass),g=l?'<div class="gr-details-status gr-ok">Equipped — click to unequip</div>':f.ok?'<div class="gr-details-status gr-ok">Click to equip</div>':`<div class="gr-details-status gr-bad">${j(f.reason??"Cannot equip")}</div>`;let b="";if(i.equipped_by===null){const w=this.sellErrorById.get(i.id),x=w?`<div class="gr-details-row gr-bad">${j(w)}</div>`:"",k=Hs(i);if(k.sellable){const A=this.sellPending.has(i.id);b=`
          <div class="gr-details-row gr-sell-price">Sell: ${k.price} gold</div>
          ${x}
          <button class="gr-sell-btn px-btn px-btn-primary" data-sell="${i.id}" ${A?"disabled":""}>${A?"Selling…":"Sell"}</button>
        `}else b=`<div class="gr-details-row gr-dim">${j(k.reason)}</div>${x}`}t.innerHTML=`
      <div class="gr-details-head">
        <div class="gr-details-icon"${Me(a)} style="color:${r}"><i class="fa ${a.icon}"></i></div>
        <div>
          <div class="gr-details-name" style="color:${r}">${j(o)}</div>
          <div class="gr-details-kind">${j(a.name)} · ${j(Kl[a.slot])}</div>
        </div>
      </div>
      ${d}
      ${h}
      ${p}
      ${m}
      ${v}
      ${g}
      ${b}
    `;const y=t.querySelector("[data-sell]");y==null||y.addEventListener("click",()=>{y.disabled||this.handleSell(i)}),xt(t)}handleSell(e){if(this.sellPending.has(e.id))return;const t=Hs(e);if(!t.sellable)return;const i=t.price,a=async()=>{jn(),this.sellPending.add(e.id),this.sellErrorById.delete(e.id);const r=this.items;this.items=this.items.filter(n=>n.id!==e.id),this.selectedId=null,this.gold!==null&&(this.gold+=i),this.render();const o=await Fl(e.id);this.sellPending.delete(e.id),o===null&&(this.items=r,this.selectedId=e.id,this.sellErrorById.set(e.id,"Sell failed — please try again.")),await this.reload()};if(e.rarity==="unique"){this.showConfirm("Sell Unique Item",`Sell this unique item for ${i} gold? This cannot be undone.`,()=>{a()});return}a()}showConfirm(e,t,i){const a=document.createElement("div");a.className="gr-confirm-overlay",a.innerHTML=`
      <div class="gr-confirm-panel px-panel">
        <div class="gr-confirm-title px-title">${j(e)}</div>
        <div class="gr-confirm-text">${j(t)}</div>
        <div class="gr-confirm-buttons">
          <button class="gr-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="gr-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(a),a.querySelector(".gr-confirm-yes").addEventListener("click",()=>{a.remove(),i()}),a.querySelector(".gr-confirm-no").addEventListener("click",()=>a.remove())}}function J(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Us(s,e,t){const i=[];return s&&i.push(J(s.charAt(0).toUpperCase()+s.slice(1))),e!==void 0&&i.push(`Lv <b>${e}</b>`),t&&t>0&&i.push(`<b>✦${t}</b> skill pts`),i.join(" · ")}const ic=`
.bm-overlay{position:fixed;inset:0;z-index:100;}
/* z-index:0 is load-bearing: without it .bm-bg forms no stacking context, so
   the hall's .ct-vig (z-index:2) escapes into .bm-overlay's context and paints
   over .bm-ui (z-index:1) — the vignette is darkest at the edges, which dimmed
   the nav bar and made the lobby header look darker than every sub-screen's.
   The sub-screens' backdrop divs already pin themselves to z-index:0. */
.bm-bg{position:absolute;inset:0;overflow:hidden;z-index:0;}
.bm-bg.bm-bg-dim{--ct-amb-vis:hidden;}
.bm-bg.bm-bg-dim::after{content:'';position:absolute;inset:0;z-index:1;background:rgba(5,6,10,0.42);}
.bm-ui{position:relative;z-index:1;min-height:calc(100vh / var(--ui-zoom, 1));display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);}
.bm-title{font-family:'Press Start 2P',monospace;font-size:40px;color:var(--px-accent);text-shadow:0 0 22px rgba(255,122,30,0.4),3px 3px 0 var(--px-border-dark);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;}
.bm-subtitle{font-family:'Press Start 2P',monospace;font-size:8px;color:#9aa0ae;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px;}
.bm-divider{display:flex;align-items:center;gap:12px;width:100%;max-width:960px;margin-bottom:28px;}
.bm-divider-line{flex:1;height:2px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.bm-divider-gem{width:10px;height:10px;background:var(--px-accent);transform:rotate(45deg);box-shadow:0 0 8px rgba(255,122,30,0.5);}
.bm-layout{display:flex;gap:24px;width:100%;max-width:960px;align-items:flex-start;}
.bm-panel{padding:24px;position:relative;}
.bm-panel-left{flex:0 0 300px;}
.bm-panel-right{flex:1;}
.bm-ptitle{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:var(--px-border-light);margin-bottom:18px;padding-bottom:10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.bm-label{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;margin-bottom:8px;}
.bm-input{width:100%;font-size:10px;letter-spacing:1px;margin-bottom:20px;}
.bm-mode-grid{display:flex;flex-direction:column;gap:8px;margin-bottom:20px;}
.bm-mode{display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:'Press Start 2P',monospace;font-size:10px;letter-spacing:0.5px;padding:11px 14px;text-align:left;}
.bm-mode.active{background:#3a3f4b;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.bm-mode.locked{opacity:0.4;cursor:not-allowed;position:relative;}
.bm-mode.locked::after{content:'Soon';position:absolute;top:3px;right:4px;font-size:7px;color:var(--px-border-light);letter-spacing:0.5px;}
.bm-mode-label{font-size:10px;flex-shrink:0;}
.bm-mode-desc{font-family:'VT323',monospace;font-size:16px;opacity:0.75;letter-spacing:0.5px;text-transform:none;white-space:nowrap;}
.bm-btn-red{width:100%;margin-bottom:10px;}
.bm-sep{display:flex;align-items:center;gap:10px;margin:16px 0;}
.bm-sep-line{flex:1;height:1px;background:var(--px-border-dark);}
.bm-sep-text{color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;}
.bm-code-row{display:flex;gap:8px;}
.bm-code-input{flex:1;font-size:10px;letter-spacing:1px;min-width:0;}
.bm-btn-blue{font-size:8px;letter-spacing:1px;}
.bm-lobby-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.bm-lobby-label{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;}
.bm-pulse{width:6px;height:6px;border-radius:0;background:var(--px-success);box-shadow:0 0 6px rgba(111,206,126,0.6);animation:bm-pulse 2s ease-in-out infinite;}
@keyframes bm-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.bm-room-row{display:flex;align-items:center;padding:12px 14px;margin-bottom:8px;background:var(--px-border-dark);box-shadow:0 0 0 1px var(--px-border-light),-3px 0 0 0 #3a3f4b;transition:all 0.15s;cursor:pointer;}
.bm-room-row:hover{background:#15161c;box-shadow:0 0 0 1px var(--px-border-light),-3px 0 0 0 var(--px-accent);}
.bm-room-info{flex:1;}
.bm-room-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);}
.bm-room-meta{font-size:16px;color:var(--px-border-light);margin-top:1px;font-family:'VT323',monospace;}
.bm-tag{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.5px;padding:4px 9px;margin-right:14px;text-transform:uppercase;background:var(--px-border-dark);box-shadow:0 0 0 2px #3a3f4b;color:var(--px-accent);}
.bm-players{font-size:16px;color:var(--px-border-light);margin-right:12px;white-space:nowrap;font-family:'VT323',monospace;}
.bm-players b{color:var(--px-text);}
.bm-btn-green-sm{font-size:8px;letter-spacing:1px;padding:10px 14px;}
.bm-empty{padding:40px 20px;text-align:center;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.5px;line-height:2.2;outline:2px dashed var(--px-border-light);}
.bm-code-block{background:var(--px-border-dark);padding:12px 14px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 0 0 1px var(--px-border-light);}
.bm-code-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;margin-bottom:4px;}
.bm-code-value{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:2px;}
.bm-copy-btn{font-size:8px;letter-spacing:0.5px;padding:10px 12px;}
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
.bm-waiting-text{text-align:center;margin-top:12px;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;color:var(--px-border-light);text-transform:uppercase;}
.bm-chat-msgs{background:var(--px-border-dark);padding:12px;height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:10px;box-shadow:0 0 0 1px var(--px-border-light);}
.bm-msg{display:flex;gap:8px;align-items:flex-start;}
.bm-msg-sender{font-family:'Press Start 2P',monospace;font-size:8px;white-space:nowrap;flex-shrink:0;margin-top:2px;}
.bm-msg-sender-0{color:#ff8844;}
.bm-msg-sender-1{color:#4488ff;}
.bm-msg-sender-sys{color:var(--px-border-light);font-style:italic;}
.bm-msg-text{font-size:16px;color:var(--px-text);line-height:1.4;font-family:'VT323',monospace;}
.bm-msg-sys{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-border-light);letter-spacing:0.5px;font-style:italic;}
.bm-chat-row{display:flex;gap:8px;}
.bm-chat-input{flex:1;min-width:0;}
.bm-btn-send{font-size:8px;letter-spacing:1px;}
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
.bm-result-xp-label{font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;opacity:0;animation:bm-rise 0.5s ease-out 0.9s forwards;color:var(--px-border-light);}
.bm-result-levelup{font-family:'Press Start 2P',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--px-success);margin-bottom:24px;opacity:0;animation:bm-lvlpop 0.7s cubic-bezier(0.16,1,0.3,1) 1.1s forwards;text-shadow:0 0 20px rgba(111,206,126,0.5);}
.bm-result-levelup-num{font-size:16px;color:var(--px-success);}
.bm-result-gold{font-family:'Press Start 2P',monospace;font-size:12px;letter-spacing:1px;margin-bottom:16px;opacity:0;animation:bm-rise 0.5s ease-out forwards;color:var(--px-accent);display:flex;align-items:center;justify-content:center;gap:8px;}
.bm-result-spoils{max-width:280px;margin:0 auto 20px;padding:12px 16px;background:var(--px-border-dark);opacity:0;animation:bm-rise 0.5s ease-out forwards;}
.bm-result-spoils-label{font-family:'Press Start 2P',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--px-border-light);margin-bottom:8px;}
.bm-result-spoils-item{display:flex;align-items:center;justify-content:center;gap:8px;font-family:'Press Start 2P',monospace;font-size:10px;letter-spacing:0.5px;}
.bm-result-spoils-icon{width:14px;height:14px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;}
.bm-result-buttons{display:flex;flex-direction:column;gap:8px;opacity:0;animation:bm-rise 0.5s ease-out forwards;}
.bm-btn-rematch{width:100%;padding:13px 40px;font-size:9px;letter-spacing:1px;}
.bm-btn-return{width:100%;padding:12px 40px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-return:hover{color:var(--px-accent);}
.bm-disc-panel{text-align:center;max-width:360px;}
.bm-disc-title{font-family:'Press Start 2P',monospace;font-size:16px;color:var(--px-danger);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;}
.bm-disc-sub{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-border-light);letter-spacing:1px;}
.bm-layout-home{max-width:1060px;}
.bm-panel-lobbies{flex:0 0 340px;}
.bm-panel-translucent{background:rgba(30,32,38,0.92);}
.bm-hero{flex:1;align-self:stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;}
.bm-hero-plate{background:rgba(10,11,15,0.85);box-shadow:0 0 0 1px var(--px-border-light);padding:10px 18px;text-align:center;margin-bottom:16px;}
.bm-hero-name{font-family:'Press Start 2P',monospace;font-size:11px;color:var(--px-accent);letter-spacing:1px;}
.bm-hero-meta{font-family:'VT323',monospace;font-size:17px;color:var(--px-border-light);margin-top:5px;}
.bm-hero-meta b{color:var(--px-text);}
.bm-hero-canvas{width:192px;height:192px;image-rendering:pixelated;filter:drop-shadow(0 6px 10px rgba(0,0,0,0.6));margin-bottom:14px;}
.bm-hero-empty{width:170px;min-height:180px;outline:2px dashed var(--px-border-light);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:1px;line-height:1.8;text-align:center;padding:14px;}
.bm-hero-empty .px-btn{font-size:8px;}
.bm-hero-switch{margin-top:0;font-size:8px;letter-spacing:1px;padding:10px 16px;}
.bm-pause-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Press Start 2P',monospace;}
.bm-pause-title{font-size:20px;color:var(--px-danger);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;text-shadow:0 0 20px rgba(224,91,91,0.6);}
.bm-pause-countdown{font-size:48px;color:var(--px-accent);letter-spacing:2px;margin-bottom:24px;text-shadow:0 0 30px rgba(255,179,71,0.4);}
.bm-pause-sub{font-size:8px;color:var(--px-border-light);letter-spacing:1px;margin-bottom:32px;}
.bm-btn-leave{padding:12px 32px;background:transparent;font-size:8px;letter-spacing:1px;}
.bm-btn-leave:hover{color:var(--px-danger);}
.bm-btn-rematch.waiting{opacity:0.6;cursor:default;pointer-events:none;}
.bm-rematch-countdown{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);letter-spacing:1px;margin-top:8px;text-align:center;animation:bm-pulse 1s ease-in-out infinite;}
`;class sc{constructor(e,t){c(this,"el");c(this,"ui");c(this,"bg");c(this,"pollTimer",null);c(this,"heroPreview",null);c(this,"navTeardown",null);c(this,"resultSoundTimers",[]);c(this,"pauseOverlay",null);c(this,"pauseCountdownTimer",null);c(this,"isAdminFlag",!1);c(this,"goldAmount",null);c(this,"heroAppearance",null);c(this,"heroGear",{});c(this,"rematchInterval",null);this.cb=t;const i=document.createElement("style");i.textContent=ic,document.head.appendChild(i),this.el=document.createElement("div"),this.el.className="bm-overlay",Le(),Ct(),this.bg=document.createElement("div"),this.bg.className="bm-bg",this.bg.innerHTML=he(),this.el.appendChild(this.bg),this.ui=document.createElement("div"),this.ui.className="bm-ui",this.el.appendChild(this.ui),e.appendChild(this.el),this.showHome()}setAdmin(e){this.isAdminFlag=e}setGold(e){this.goldAmount=e,_l(this.ui,e)}updateHeroGear(e){this.heroGear=e,this.heroPreview&&this.heroAppearance&&this.heroPreview.setAppearance(this.heroAppearance,e)}teardownHome(){for(const e of this.resultSoundTimers)window.clearTimeout(e);this.resultSoundTimers=[],this.heroPreview&&(this.heroPreview.dispose(),this.heroPreview=null),this.navTeardown&&(this.navTeardown(),this.navTeardown=null)}showHome(e,t,i,a,r,o={}){this.teardownHome(),this.heroAppearance=r??null,this.heroGear=o,this.setBackdrop("hall"),this.stopPolling();const n=new URLSearchParams(window.location.search).get("room")??"",l=i!==void 0,d=l&&r!=null,h=e?J(e):"",p=d?`<canvas id="bm-hero-canvas" class="bm-hero-canvas"></canvas>
         <div class="bm-hero-plate">
           <div class="bm-hero-name">${h}</div>
           <div class="bm-hero-meta">${Us(i,a,t)}</div>
         </div>
         <button id="bm-choose-champion" class="bm-hero-switch px-btn">⇄ Switch Character</button>`:`<div class="bm-hero-plate">
           <div class="bm-hero-name">${h||"Wanderer"}</div>
           ${l?`<div class="bm-hero-meta">${Us(i,a,t)}</div>`:""}
         </div>
         <div class="bm-hero-empty">No champion chosen
           <button id="bm-choose-champion" class="px-btn">Choose your champion</button>
         </div>`;this.ui.innerHTML=`
      ${Ee({active:"arena",username:h,gold:this.goldAmount,skillPoints:t,isAdmin:this.isAdminFlag,tabsEnabled:l})}
      <div class="bm-layout bm-layout-home">
        <div class="bm-panel px-panel bm-panel-left bm-panel-translucent">
          <div class="bm-ptitle">Challenger</div>
          <input id="bm-name" type="hidden" value="${h}">
          <div class="bm-label">Game Mode</div>
          <div class="bm-mode-grid" id="mode-grid">
            <div class="bm-mode px-btn active" data-mode="1v1"><span class="bm-mode-label">1v1</span><span class="bm-mode-desc">Duel · 2 players</span></div>
            <div class="bm-mode px-btn" data-mode="ffa"><span class="bm-mode-label">FFA</span><span class="bm-mode-desc">Free-for-all · 4 players</span></div>
            <div class="bm-mode px-btn" data-mode="2v2"><span class="bm-mode-label">2v2</span><span class="bm-mode-desc">Teams · 4 players</span></div>
          </div>
          <button id="bm-create" class="bm-btn-red px-btn px-btn-primary">⚔ Create Lobby</button>
          <div class="bm-sep"><div class="bm-sep-line"></div><div class="bm-sep-text">or</div><div class="bm-sep-line"></div></div>
          <div class="bm-label">Join by Code</div>
          <div class="bm-code-row">
            <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${J(n)}" maxlength="12">
            <button id="bm-join-code" class="bm-btn-blue px-btn">Join</button>
          </div>
        </div>
        <div class="bm-hero">${p}</div>
        <div class="bm-panel px-panel bm-panel-lobbies bm-panel-translucent">
          <div class="bm-lobby-header">
            <div class="bm-lobby-label">Open Lobbies</div>
            <div class="bm-pulse"></div>
          </div>
          <div id="bm-rooms"></div>
        </div>
      </div>`,this.navTeardown=Ae(this.ui,{onNavigate:f=>{f==="skills"?this.cb.onOpenSkills():f==="gear"?this.cb.onOpenGear():f==="shop"?this.cb.onOpenShop():f==="admin"&&this.cb.onOpenAdmin()},onCredits:()=>this.cb.onShowCredits(),onLogout:()=>this.cb.onLogout(),onSettings:()=>this.cb.onOpenSettings()});const u=this.ui.querySelector("#bm-choose-champion");if(u&&u.addEventListener("click",()=>this.cb.onSwitchCharacter()),d){const f=this.ui.querySelector("#bm-hero-canvas"),g=new Hi(f,2,"idle");this.heroPreview=g,g.setAppearance(r,o).then(b=>{if(!b&&this.heroPreview===g){this.heroPreview.dispose(),this.heroPreview=null;const y=this.ui.querySelector(".bm-hero"),w=this.ui.querySelector("#bm-hero-canvas");if(y&&w){w.remove();const x=document.createElement("div");x.className="bm-hero-empty",x.textContent="The torchlight hides your champion",y.appendChild(x)}}})}const m=this.ui.querySelector("#mode-grid");let v="1v1";m.querySelectorAll(".bm-mode").forEach(f=>{f.addEventListener("click",()=>{m.querySelectorAll(".bm-mode").forEach(g=>g.classList.remove("active")),f.classList.add("active"),v=f.dataset.mode})}),this.ui.querySelector("#bm-create").addEventListener("click",()=>{const f=this.ui.querySelector("#bm-name").value.trim();f&&this.cb.onCreateRoom(f,v)}),this.ui.querySelector("#bm-join-code").addEventListener("click",()=>{const f=this.ui.querySelector("#bm-name").value.trim(),g=this.ui.querySelector("#bm-code").value.trim();f&&g&&this.cb.onJoinRoom(g,f)}),this.ui.querySelector("#bm-code").addEventListener("keydown",f=>{f.key==="Enter"&&this.ui.querySelector("#bm-join-code").click()}),this.pollLobbies(),this.pollTimer=window.setInterval(()=>this.pollLobbies(),3e3),n&&this.ui.querySelector("#bm-name").focus()}showWaiting(e,t,i){this.setBackdrop("dim"),this.stopPolling(),this.renderLobby(e,[{name:t,index:0,ready:!1}],i)}showReady(e,t,i,a,r){this.setBackdrop("dim"),this.stopPolling();const o=Object.entries(t).map(([n,l],d)=>({name:l,index:d,ready:(r==null?void 0:r.has(n))??!1}));this.renderLobby(e,o,a)}showResult(e,t,i,a){this.teardownHome(),this.setBackdrop("dim"),this.stopPolling();let r,o;t==="2v2"?(r=e?"Your Team Wins":"Your Team Loses",o=e?"Your team dominated the arena":"Your team has fallen"):t==="ffa"?(r=e?"Victory":"Defeated",e?o="You are the last one standing":i?o=`Defeated — ${i===2?"2nd":i===3?"3rd":`${i}th`} place`:o="You have been eliminated"):(r=e?"Victory":"Defeat",o=e?"You are victorious":"You have been slain");const n=e?"bm-win":"bm-lose",l=a&&a.levelsGained>0,d=a?`<div class="bm-result-divider">
           <div class="bm-result-divider-line"></div>
           <div class="bm-result-divider-dot"></div>
           <div class="bm-result-divider-line"></div>
         </div>
         <div class="bm-result-xp">+<span id="bm-xp-count">0</span> XP</div>
         <div class="bm-result-xp-label">Experience Gained</div>
         ${l?`<div class="bm-result-levelup">Level Up <span class="bm-result-levelup-num">${a.newLevel}</span></div>`:""}`:"";let h=l?1.1:.8,p="",u=0;a&&a.goldGained>0&&(u=h,p=`<div class="bm-result-gold" style="animation-delay:${h}s">+${a.goldGained} <i class="fa fa-coins"></i> Gold</div>`,h+=.3);let m="",v=0;const f=a==null?void 0:a.droppedItem,g=f?pt(f):void 0;if(f&&g){v=h;const y=Ce[f.rarity],w=ft(f,g);m=`<div class="bm-result-spoils" style="animation-delay:${h}s;box-shadow:inset 0 0 0 2px ${y}">
        <div class="bm-result-spoils-label">War Spoils</div>
        <div class="bm-result-spoils-item"><span class="bm-result-spoils-icon"${Me(g)} style="color:${y}"><i class="fa ${g.icon}"></i></span><span style="color:${y}">${J(w)}</span></div>
      </div>`,h+=.3}const b=a?`${Math.max(h,l?1.4:1.1)}s`:"0.8s";if(this.ui.innerHTML=`
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
        ${p}
        ${m}
        <div class="bm-result-buttons" style="animation-delay:${b}">
          <button id="bm-rematch" class="bm-btn-rematch px-btn">⚔ Rematch</button>
          <button id="bm-return-lobby" class="bm-btn-return px-btn">Return to Lobby</button>
        </div>
      </div>`,xt(this.ui),qn(e),l&&this.resultSoundTimers.push(window.setTimeout(()=>On(),900)),u>0&&this.resultSoundTimers.push(window.setTimeout(()=>Nn(),u*1e3)),f&&v>0){const y=f.rarity;this.resultSoundTimers.push(window.setTimeout(()=>Ba(y),v*1e3))}if(a&&a.xpGained>0){const y=this.ui.querySelector("#bm-xp-count");if(y){const w=a.xpGained,x=1200,k=performance.now()+800,A=O=>{const D=O-k;if(D<0){requestAnimationFrame(A);return}const F=Math.min(D/x,1),ae=1-Math.pow(1-F,3);y.textContent=String(Math.round(w*ae)),F<1&&requestAnimationFrame(A)};requestAnimationFrame(A)}}this.ui.querySelector("#bm-rematch").addEventListener("click",()=>this.cb.onRematch()),this.ui.querySelector("#bm-return-lobby").addEventListener("click",()=>this.cb.onReturnToLobby())}disableRematch(){this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null);const e=this.ui.querySelector("#bm-rematch");e&&(e.disabled=!0,e.classList.add("waiting"),e.style.opacity="0.4",e.style.cursor="default",e.textContent="Opponent left");const t=this.ui.querySelector(".bm-rematch-countdown");t&&t.remove()}showRematchCountdown(e,t){this.setBackdrop("dim"),this.rematchInterval&&clearInterval(this.rematchInterval);const i=this.ui.querySelector("#bm-rematch");if(!i)return;let a=e;As(),t?(i.classList.add("waiting"),i.textContent=`Waiting... (${a}s)`):i.textContent=`⚔ Rematch (${a}s)`;let r=this.ui.querySelector(".bm-rematch-countdown");if(!r){r=document.createElement("div"),r.className="bm-rematch-countdown";const o=this.ui.querySelector(".bm-result-buttons");o&&o.appendChild(r)}r.textContent=t?"Waiting for opponent...":"Opponent wants a rematch!",this.rematchInterval=setInterval(()=>{if(a--,a<=0){this.rematchInterval&&clearInterval(this.rematchInterval),this.rematchInterval=null,t&&this.disableRematch();return}As(),i&&(t?i.textContent=`Waiting... (${a}s)`:i.textContent=`⚔ Rematch (${a}s)`)},1e3)}showDisconnected(){this.teardownHome(),this.setBackdrop("dim"),this.stopPolling(),this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-disc-panel">
        <div class="bm-disc-title">Opponent Fled</div>
        <div class="bm-disc-sub">The coward has left the arena.<br>Refresh to seek new prey.</div>
      </div>`}appendChatMessage(e,t,i){const a=this.ui.querySelector("#bm-chat-msgs");if(!a)return;const r=this.getSenderColorClass(e),o=document.createElement("div");o.className="bm-msg",o.innerHTML=`<span class="bm-msg-sender ${r}">${J(t)}</span><span class="bm-msg-text">${J(i)}</span>`,a.appendChild(o),a.scrollTop=a.scrollHeight}appendSystemMessage(e){const t=this.ui.querySelector("#bm-chat-msgs");if(!t)return;const i=document.createElement("div");i.className="bm-msg",i.innerHTML=`<span class="bm-msg-sender bm-msg-sender-sys">—</span><span class="bm-msg-sys">${J(e)}</span>`,t.appendChild(i),t.scrollTop=t.scrollHeight}hide(){this.teardownHome(),this.stopPolling(),this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null),this.el.style.display="none"}show(){this.el.style.display=""}showPauseOverlay(e,t){this.hidePauseOverlay(),this.pauseOverlay=document.createElement("div"),this.pauseOverlay.className="bm-pause-overlay",this.pauseOverlay.innerHTML=`
      <div class="bm-pause-title">Opponent Disconnected</div>
      <div class="bm-pause-countdown" id="bm-pause-timer">${e}</div>
      <div class="bm-pause-sub">Waiting for opponent to rejoin...</div>
      <button class="bm-btn-leave px-btn" id="bm-pause-leave">Leave Match</button>`,this.el.parentElement.appendChild(this.pauseOverlay),this.pauseOverlay.querySelector("#bm-pause-leave").addEventListener("click",t);let i=e;const a=this.pauseOverlay.querySelector("#bm-pause-timer");this.pauseCountdownTimer=window.setInterval(()=>{i--,a.textContent=String(Math.max(0,i)),i<=0&&this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null)},1e3)}hidePauseOverlay(){this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null),this.pauseOverlay&&(this.pauseOverlay.remove(),this.pauseOverlay=null)}setBackdrop(e){this.bg.classList.toggle("bm-bg-dim",e==="dim")}stopPolling(){this.pollTimer!==null&&(clearInterval(this.pollTimer),this.pollTimer=null)}async pollLobbies(){try{const e=await fetch("/rooms"),{rooms:t}=await e.json();this.renderRoomRows(t)}catch{}}renderRoomRows(e){const t=this.ui.querySelector("#bm-rooms");if(t){if(e.length===0){t.innerHTML='<div class="bm-empty">No open lobbies<br>Be the first to enter the arena</div>';return}t.innerHTML=e.map(i=>{const a=i.mode==="2v2"?`<button class="bm-btn-green-sm px-btn" data-team="team1">Join T1</button>
           <button class="bm-btn-green-sm px-btn" data-team="team2" style="margin-left:6px">Join T2</button>`:'<button class="bm-btn-green-sm px-btn">Join</button>';return`
      <div class="bm-room-row" data-room-id="${J(i.roomId)}" data-mode="${J(i.mode)}">
        <div class="bm-room-info">
          <div class="bm-room-name">${J(i.creatorName)}</div>
          <div class="bm-room-meta">Waiting for players</div>
        </div>
        <span class="bm-tag">${J(i.mode)}</span>
        <div class="bm-players"><b>${i.playerCount}</b> / ${i.maxPlayers}</div>
        ${a}
      </div>`}).join(""),t.querySelectorAll(".bm-room-row").forEach(i=>{i.querySelectorAll(".bm-btn-green-sm").forEach(a=>{a.addEventListener("click",()=>{var l;const r=i.dataset.roomId,o=((l=this.ui.querySelector("#bm-name"))==null?void 0:l.value.trim())??"",n=a.dataset.team;o&&this.cb.onJoinRoom(r,o,n)})})})}}renderLobby(e,t,i){this.teardownHome();const a=`${location.origin}?room=${e}`,r=i==="ffa"||i==="2v2"?4:2,o=i==="2v2"?4:2,n=t.length>=o,d={"1v1":"1v1 Duel",ffa:"Free-for-All","2v2":"2v2 Teams"}[i??"1v1"]??"1v1 Duel",h=(f,g)=>f?`<div class="bm-slot" style="${f.ready?"box-shadow:0 0 0 2px var(--px-success),0 0 6px rgba(111,206,126,0.3);":""}">
             <div class="bm-avatar bm-avatar-${f.index%4}">${J((f.name[0]??"?").toUpperCase())}</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name">${J(f.name)}</div>
               <div class="bm-slot-status ${f.ready?"bm-status-ready":"bm-status-waiting"}">${f.ready?"✓ Ready":"Waiting..."}</div>
             </div>
           </div>`:`<div class="bm-slot">
             <div class="bm-avatar bm-avatar-empty">?</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name" style="color:var(--px-border-light)">${g}</div>
               <div class="bm-slot-status bm-status-empty">Waiting for challenger...</div>
             </div>
           </div>`;let p="";for(let f=0;f<r;f++)p+=h(t[f],`Slot ${f+1}`);const u=n?'<button id="bm-ready" class="bm-btn-green px-btn px-btn-primary">⚔ Ready</button>':`<button class="bm-btn-green px-btn px-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>⚔ Ready</button>
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
              <div class="bm-code-value">${J(e.toUpperCase())}</div>
            </div>
            <button id="bm-copy" class="bm-copy-btn px-btn">⎘ Copy Link</button>
          </div>
          ${p}
          ${u}
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
      </div>`,this.ui.querySelector("#bm-copy").addEventListener("click",()=>{navigator.clipboard.writeText(a)}),this.ui.querySelector("#bm-leave").addEventListener("click",()=>{this.cb.onReturnToLobby()});const m=this.ui.querySelector("#bm-ready");m&&m.addEventListener("click",()=>{m.replaceWith(Object.assign(document.createElement("button"),{className:"bm-btn-green-done px-btn",textContent:"✓ Ready"})),this.cb.onReady()});const v=()=>{const f=this.ui.querySelector("#bm-chat-input"),g=f.value.trim();g&&(this.cb.onSendChatMessage(g),f.value="")};this.ui.querySelector("#bm-chat-send").addEventListener("click",v),this.ui.querySelector("#bm-chat-input").addEventListener("keydown",f=>{f.key==="Enter"&&v()})}getSenderColorClass(e){return e.split("").reduce((i,a)=>i+a.charCodeAt(0),0)%2===0?"bm-msg-sender-0":"bm-msg-sender-1"}}function js(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}class ac{constructor(e,t){c(this,"el");this.cb=t,Le(),this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#12141b;z-index:200;font-family:"VT323",monospace;color:var(--px-text)',e.appendChild(this.el),this.checkSession()}async checkSession(){const{data:{session:e}}=await C.auth.getSession();if(e){const{data:t}=await C.from("profiles").select("username").eq("user_id",e.user.id).single();if(t){this.cb.onAuthed(t.username,e.access_token);return}}this.showLogin()}showLogin(e=""){var t,i;this.el.innerHTML=`
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${he("au")}</div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:28px;margin-bottom:8px">BLOODMOOR</h1>
        <p class="px-label" style="margin-bottom:6px">Arena PvP</p>
        <p style="font-family:'VT323',monospace;font-style:italic;color:#9aa0ae;font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:36px">Enter the blood-soaked arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 28px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${js(e)}</p>`:""}
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
    `,this.el.querySelector("#auth-signin").addEventListener("click",()=>this.handleSignIn()),this.el.querySelector("#auth-register").addEventListener("click",()=>this.showRegister()),(i=(t=this.cb).onShowLogin)==null||i.call(t)}showRegister(e=""){this.el.innerHTML=`
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${he("au")}</div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:22px;margin-bottom:8px">CREATE ACCOUNT</h1>
        <p style="font-family:'VT323',monospace;font-style:italic;color:#9aa0ae;font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:28px">Join the arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 24px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${js(e)}</p>`:""}
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
    `,this.el.querySelector("#auth-submit").addEventListener("click",()=>this.handleRegister()),this.el.querySelector("#auth-back").addEventListener("click",()=>this.showLogin())}async handleSignIn(){const e=this.el.querySelector("#auth-email").value.trim(),t=this.el.querySelector("#auth-password").value,{data:i,error:a}=await C.auth.signInWithPassword({email:e,password:t});if(a||!i.session){this.showLogin((a==null?void 0:a.message)??"Sign in failed");return}const{data:r}=await C.from("profiles").select("username").eq("user_id",i.user.id).single();this.cb.onAuthed((r==null?void 0:r.username)??e,i.session.access_token)}async handleRegister(){const e=this.el.querySelector("#auth-username").value.trim(),t=this.el.querySelector("#auth-email").value.trim(),i=this.el.querySelector("#auth-password").value;if(!e){this.showRegister("Username is required");return}const{data:a,error:r}=await C.auth.signUp({email:t,password:i,options:{data:{username:e}}});if(r||!a.session){this.showRegister((r==null?void 0:r.message)??"Registration failed");return}this.cb.onAuthed(e,a.session.access_token)}hide(){this.el.style.display="none"}show(){this.el.style.display="flex"}}const ci={"fire.fireball":"fa-fire","fire.volatile_ember":"fa-circle-dot","fire.seeking_flame":"fa-crosshairs","fire.hellfire":"fa-skull","fire.pyroclasm":"fa-code-fork","fire.fire_wall":"fa-fire-flame-simple","fire.enduring_flames":"fa-hourglass-half","fire.searing_heat":"fa-temperature-high","fire.inferno_expanse":"fa-expand","fire.meteor":"fa-meteor","fire.molten_impact":"fa-burst","fire.blind_strike":"fa-eye-slash","fire.cataclysm":"fa-up-right-and-down-left-from-center","utility.teleport":"fa-wand-magic","utility.phase_shift":"fa-maximize","utility.ethereal_form":"fa-ghost","utility.phantom_step":"fa-person-running","archer.power_shot":"fa-bullseye","archer.guided":"fa-location-arrow","archer.multishot":"fa-arrows-split-up-and-left","archer.homing":"fa-crosshairs","archer.barrage":"fa-burst","archer.rain_of_arrows":"fa-cloud-rain","archer.sustained_rain":"fa-hourglass-half","archer.piercing_rain":"fa-bolt","archer.wide_rain":"fa-up-right-and-down-left-from-center","archer.burn":"fa-fire","archer.freeze":"fa-snowflake","archer.poison":"fa-skull-crossbones","archer_utility.evade":"fa-person-running","archer_utility.combat_roll":"fa-person-falling","archer_utility.shadowstep":"fa-ghost","archer_utility.acrobatics":"fa-tornado"};function Q(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Gs(s){return $e.find(e=>e.spell===s).node}function Pt(s,e){return s<1?`${Math.round(e*100)}%`:e.toFixed(1).replace(/\.0$/,"")}const P=74,rc={"fire.fireball":{x:50,y:0},"fire.volatile_ember":{x:30,y:P},"fire.seeking_flame":{x:70,y:P},"fire.hellfire":{x:30,y:P*2},"fire.pyroclasm":{x:70,y:P*2},"fire.fire_wall":{x:50,y:P*3},"fire.enduring_flames":{x:20,y:P*4},"fire.searing_heat":{x:50,y:P*4},"fire.inferno_expanse":{x:80,y:P*4},"fire.meteor":{x:50,y:P*5},"fire.molten_impact":{x:20,y:P*6},"fire.blind_strike":{x:50,y:P*6},"fire.cataclysm":{x:80,y:P*6}},oc={"utility.teleport":{x:50,y:0},"utility.phase_shift":{x:28,y:P},"utility.ethereal_form":{x:72,y:P},"utility.phantom_step":{x:50,y:P*2}},nc={"archer.power_shot":{x:50,y:0},"archer.guided":{x:30,y:P},"archer.multishot":{x:70,y:P},"archer.homing":{x:30,y:P*2},"archer.barrage":{x:70,y:P*2},"archer.rain_of_arrows":{x:50,y:P*3},"archer.sustained_rain":{x:20,y:P*4},"archer.piercing_rain":{x:50,y:P*4},"archer.wide_rain":{x:80,y:P*4},"archer.burn":{x:25,y:P*5},"archer.freeze":{x:50,y:P*5},"archer.poison":{x:75,y:P*5}},lc={"archer_utility.evade":{x:50,y:0},"archer_utility.combat_roll":{x:28,y:P},"archer_utility.shadowstep":{x:72,y:P},"archer_utility.acrobatics":{x:50,y:P*2}},tr=7,cc=6,dc=3,hc=66,Si=s=>(s-1)*P+hc,Vs=Si(tr)+24,pc=`
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.st-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
/* ── header bar ─────────────────────────────────────────────────────── */
.st-title{font-size:11px;letter-spacing:0.05em;}
.st-points-pill{display:flex;align-items:center;gap:10px;background:#101117;padding:8px 16px;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
.st-points-gem{width:10px;height:10px;background:var(--px-success);transform:rotate(45deg);box-shadow:0 0 8px rgba(111,206,126,0.7);}
.st-points-num{font-family:'Press Start 2P',monospace;font-size:14px;color:var(--px-success);}
.st-points-label{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-border-light);letter-spacing:0.1em;}
.st-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
/* ── two-column workspace ───────────────────────────────────────────── */
.st-columns{display:flex;gap:24px;width:100%;max-width:1060px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.st-col-main{flex:1 1 560px;min-width:480px;max-width:640px;}
/* Both columns are pinned to the same workspace height (set inline) so the
   page height never depends on which class is open or how much the details
   panel has to say — the panel absorbs the difference by scrolling itself. */
.st-col-side{flex:0 0 340px;display:flex;flex-direction:column;gap:16px;}
.st-tree-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:#d86030;text-align:center;margin-bottom:8px;}
.st-util-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;color:var(--px-border-light);text-transform:uppercase;text-align:center;margin-bottom:8px;}
.st-tree-container{position:relative;width:100%;}
.st-util-block{flex:0 0 auto;}
.st-util-container{position:relative;width:100%;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
/* ── nodes ──────────────────────────────────────────────────────────── */
.st-node{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;position:relative;}
.st-node-circle:hover{transform:scale(1.08);}
.st-node[data-state="locked"] .st-node-circle{cursor:not-allowed;}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
.st-node-spell{width:52px;height:52px;}
.st-node-mod{width:38px;height:38px;}
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
.st-keystone{margin-top:8px;padding:8px;background:rgba(221,184,74,0.06);box-shadow:0 0 0 1px rgba(221,184,74,0.3);font-size:11px}
.st-keystone-name{color:#ddb84a;margin-bottom:4px}
.st-keystone-active{background:rgba(221,184,74,0.14)}
.st-node-selected .st-node-circle{outline:2px solid #fff;outline-offset:3px;}
/* Wide enough that the longest name ("Rain of Arrows") stays on one line —
   a wrapped spell name is what used to collide with the badge below it. */
.st-node-name{font-family:'Press Start 2P',monospace;font-size:7px;text-align:center;max-width:120px;margin-top:4px;line-height:1.35;}
/* corner badges replace the old cost/rank text rows */
.st-badge{position:absolute;right:-10px;top:-5px;font-family:'Press Start 2P',monospace;font-size:7px;padding:3px 4px;background:var(--px-border-dark);box-shadow:0 0 0 1px #000;pointer-events:none;z-index:2;}
.st-badge-cost{color:var(--px-accent);}
.st-badge-rank{color:#e87040;}
.st-badge-rank.st-past-cap{color:#ddb84a;}
.st-badge-lock{color:#666;}
.st-flash .st-node-circle{animation:st-buy-flash 0.45s ease-out;}
@keyframes st-buy-flash{0%{filter:brightness(3) saturate(2);}100%{filter:none;}}
/* ── details panel ──────────────────────────────────────────────────── */
.st-details{padding:12px 16px;flex:1 1 auto;min-height:0;overflow-y:auto;box-sizing:border-box;}
.st-details-empty{color:var(--px-border-light);font-size:16px;line-height:1.6;text-align:center;padding-top:12px;}
.st-details-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.st-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.st-details-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);line-height:1.5;}
.st-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.08em;text-transform:uppercase;}
.st-details-desc{font-size:17px;line-height:1.4;color:var(--px-text);margin:7px 0;}
.st-rank-track{display:flex;gap:3px;margin:6px 0;}
.st-rank-seg{height:8px;flex:1;background:#1a1b21;box-shadow:inset 0 0 0 1px var(--px-border-dark);}
.st-rank-seg.filled{background:#e86020;}
.st-rank-seg.past-cap{background:#ddb84a;}
.st-rank-line{font-size:15px;color:var(--px-border-light);margin-bottom:4px;}
.st-details-row{font-size:16px;line-height:1.5;}
.st-req{font-size:15px;line-height:1.6;}
.st-req .met{color:var(--px-success);}
.st-req .unmet{color:var(--px-danger);}
.st-details-status{margin-top:6px;font-size:16px;}
.st-status-ok{color:var(--px-success);}
.st-status-warn{color:var(--px-accent);}
.st-status-bad{color:var(--px-danger);}
.st-super-note{margin-top:8px;padding:8px 10px;background:#1a1400;box-shadow:inset 0 0 0 2px #6a5416;font-size:15px;line-height:1.45;color:#ddb84a;}
.st-super-note b{color:#f0d060;}
.st-refund-hint{margin-top:6px;font-size:14px;color:var(--px-border-light);}
.st-refund-hint.st-refund-blocked{color:var(--px-danger);opacity:0.85;}
.st-legend{margin-top:12px;padding-top:10px;border-top:1px solid var(--px-border-dark);display:flex;flex-direction:column;gap:5px;font-size:14px;color:var(--px-border-light);}
.st-legend-row{display:flex;align-items:center;gap:8px;}
.st-legend-swatch{width:12px;height:12px;flex:0 0 12px;}
/* ── confirm modal (kept for reset + past-cap ranks) ─────────────────── */
.st-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:400;}
.st-confirm-panel{padding:28px 32px;max-width:340px;text-align:center;}
.st-confirm-title{margin-bottom:8px;}
.st-confirm-text{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);margin-bottom:24px;line-height:1.5;white-space:pre-line;}
.st-confirm-buttons{display:flex;gap:12px;justify-content:center;}
.st-confirm-yes,.st-confirm-no{padding:9px 24px;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;}
/* ── hotbar slot assignment ─────────────────────────────────────────── */
.st-slots{display:flex;gap:8px;justify-content:center;margin-top:14px}
.st-slot{width:46px;height:46px;background:#23252c;box-shadow:0 0 0 2px var(--px-border-dark);position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer}
.st-slot.picking{box-shadow:0 0 0 2px var(--px-accent)}
.st-slot .st-slot-key{position:absolute;right:2px;bottom:2px;font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-text)}
.st-picker{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}
.st-picker-item{padding:6px 10px;background:#23252c;box-shadow:0 0 0 2px var(--px-border-dark);cursor:pointer;font-family:'VT323',monospace;font-size:15px;color:var(--px-text)}
.st-picker-item:hover{box-shadow:0 0 0 2px var(--px-accent)}
.st-picker-item.st-picker-item-current{box-shadow:0 0 0 2px var(--px-success)}
`;class fc{constructor(e,t,i){c(this,"el");c(this,"ranks",new Map);c(this,"slotRows",[]);c(this,"characterId",null);c(this,"skillPoints",0);c(this,"charName","");c(this,"charClass","");c(this,"selectedId",null);c(this,"flashId",null);c(this,"pickingSlot",null);c(this,"closeResolver",null);c(this,"navTeardown",null);this.navCtx=t,this.navHandlers=i,Le(),Ct();const a=document.createElement("style");a.textContent=pc,document.head.appendChild(a),this.el=document.createElement("div"),this.el.className="st-overlay",e.appendChild(this.el)}async show(e){return this.characterId=e??null,this.selectedId=null,this.el.style.display="block",this.renderLoading(),await this.reload(),await new Promise(t=>{this.closeResolver=t})}hide(e="arena"){var i;this.el.style.display="none",(i=this.navTeardown)==null||i.call(this),this.navTeardown=null;const t=this.closeResolver;this.closeResolver=null,t==null||t(e)}renderLoading(){var e;this.el.innerHTML=`
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${he("st")}</div>
      <div class="st-ui">
        ${Ee({active:"skills",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="st-title px-title">Skills</div>
        </div>
        <div class="bm-loading">Loading skills…</div>
      </div>
    `,(e=this.navTeardown)==null||e.call(this),this.navTeardown=Ae(this.el,{onNavigate:t=>this.hide(t),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()})}async reload(){if(!this.characterId)return;const[{data:e},{data:t},{data:i}]=await Promise.all([C.from("characters").select("skill_points_available, name, class").eq("id",this.characterId).single(),C.from("skill_unlocks").select("node_id, rank").eq("character_id",this.characterId),C.from("character_spell_slots").select("slot, spell").eq("character_id",this.characterId)]);this.skillPoints=(e==null?void 0:e.skill_points_available)??0,this.charName=(e==null?void 0:e.name)??"Unknown",this.charClass=Ut(e==null?void 0:e.class),this.ranks=new Map((t??[]).map(a=>[a.node_id,a.rank??1])),this.charClass==="ranger"?this.ranks.has("archer.power_shot")||(await C.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"archer.power_shot",p_cost:0}),this.ranks.set("archer.power_shot",1)):this.ranks.has("fire.fireball")||(await C.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:"fire.fireball",p_cost:0}),this.ranks.set("fire.fireball",1)),this.slotRows=i??[],this.render()}ownedSpells(){return new Set($e.filter(e=>this.ranks.has(e.node)).map(e=>e.spell))}currentSlots(){return zi(this.ownedSpells(),this.slotRows)}render(){var h,p;const e=this.skillPoints,t=this.charClass==="ranger",i=se.filter(u=>u.tree===(t?"archer":"fire")),a=se.filter(u=>u.tree===(t?"archer_utility":"utility")),r=t?nc:rc,o=t?lc:oc,n=t?"Archer":"Fire",l=`${Si(t?cc:tr)}px`,d=`${Si(dc)}px`;this.el.innerHTML=`
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${he("st")}</div>
      <div class="st-ui">
        ${Ee({active:"skills",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="st-title px-title">${Q(this.charName)} — ${Q(this.charClass)} Skills</div>
          <div class="bm-subhead-actions">
            <div class="st-points-pill">
              <div class="st-points-gem"></div>
              <span class="st-points-num">${e}</span>
              <span class="st-points-label">Points<br>Available</span>
            </div>
            <button id="st-respec" class="st-btn px-btn">Reset Skills</button>
          </div>
        </div>

        <div class="st-columns">
          <div class="st-col-main" style="height:${Vs}px">
            <div class="st-tree-label">${n}</div>
            <div class="st-tree-container" style="height:${l}">
              <svg id="st-main-svg" class="st-tree-svg"></svg>
              ${i.map(u=>this.renderNode(u,e,r[u.id])).join("")}
            </div>
          </div>
          <div class="st-col-side" style="height:${Vs}px">
            <div id="st-details" class="st-details px-panel"></div>
            <div class="st-util-block">
              <div class="st-util-label">${t?"Evasion":"Shared Utility"}</div>
              <div class="st-util-container" style="height:${d}">
                <svg id="st-util-svg" class="st-tree-svg" overflow="visible"></svg>
                ${a.map(u=>this.renderNode(u,e,o[u.id])).join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="st-slots" id="st-slots">${this.renderSlotBar()}</div>
        <div class="st-picker" id="st-picker"></div>
      </div>
    `,(h=this.navTeardown)==null||h.call(this),this.navTeardown=Ae(this.el,{onNavigate:u=>this.hide(u),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.el.querySelector("#st-respec").addEventListener("click",()=>this.handleRespec()),this.el.querySelectorAll(".st-slot").forEach(u=>{u.addEventListener("click",()=>{this.openPicker(Number(u.dataset.slot))})}),this.el.querySelector("#st-picker").addEventListener("click",u=>{const m=u.target.closest(".st-picker-item");if(!m||this.pickingSlot===null)return;const v=m.dataset.spell;this.assignSlot(this.pickingSlot,v==="clear"?null:Number(v))}),this.drawConnections("st-main-svg",r,i,e),this.drawConnections("st-util-svg",o,a,e),this.attachNodeListeners(e),this.renderDetails(this.selectedId,e),this.flashId&&((p=this.el.querySelector(`.st-node[data-id="${this.flashId}"]`))==null||p.classList.add("st-flash"),this.flashId=null)}renderNode(e,t,i){if(!i)return"";const a=this.ranks.get(e.id)??0,r=a>0,o=!r&&Je(e.id,this.ranks)&&t>=e.cost,l=r&&Pe(e)&&a>e.stackable.softCap?"st-node-owned st-node-supercharged":r?"st-node-owned":o?"st-node-purchasable":"st-node-locked",d=e.isSpell?"st-node-is-spell":"",h=e.isSpell?"st-node-spell":"st-node-mod",p=e.id===this.selectedId?"st-node-selected":"",u=ci[e.id]??"fa-star",m=r?"owned":o?"purchasable":"locked";let v="";if(r&&Pe(e)){const f=e.stackable.softCap;v=`<span class="st-badge st-badge-rank${a>f?" st-past-cap":""}">${a}/${f}</span>`}else!r&&o?v=`<span class="st-badge st-badge-cost">${e.cost}pt</span>`:r||(v='<span class="st-badge st-badge-lock"><i class="fa fa-lock"></i></span>');return`<div class="st-node ${l} ${d} ${p}" data-id="${e.id}" data-state="${m}"
      style="left:${i.x}%;top:${i.y}px;">
      <div class="st-node-circle ${h}">
        <i class="fa ${u} fa-fw st-node-icon" style="font-size:${e.isSpell?"1.25rem":"1.05rem"}"></i>
        ${v}
      </div>
      <div class="st-node-name">${Q(e.name)}</div>
    </div>`}renderSlotBar(){return this.currentSlots().map((t,i)=>{const a=t===null?"fa-minus":ci[Gs(t)]??"fa-star";return`<div class="st-slot" data-slot="${i+1}">
        <i class="fa ${a} fa-fw"${t===null?' style="opacity:0.3"':""}></i>
        <span class="st-slot-key">${i+1}</span>
      </div>`}).join("")}drawConnections(e,t,i,a){const r=this.el.querySelector(`#${e}`);if(!r)return;const o=24;let n="";for(const l of i){const d=bi[l.id];if(!d)continue;const h=t[l.id];if(!h)continue;const p=this.ranks.has(l.id),u=!p&&Je(l.id,this.ranks)&&a>=l.cost,m=p?"#e86020":u?"#c8860a":"#333",v=p?.75:u?.5:.3,f=p?2.5:2;if(d.requiresAll)for(const g of d.requiresAll){const b=t[g];b&&(n+=`<line x1="${b.x}%" y1="${b.y+o}" x2="${h.x}%" y2="${h.y}" stroke="${m}" stroke-opacity="${v}" stroke-width="${f}"/>`)}if(d.requiresAny)for(const g of d.requiresAny){const b=t[g];b&&(n+=`<line x1="${b.x}%" y1="${b.y+o}" x2="${h.x}%" y2="${h.y}" stroke="${m}" stroke-opacity="${v*.8}" stroke-width="1.5" stroke-dasharray="4,3"/>`)}}r.innerHTML=n}renderDetails(e,t){var g,b,y,w;const i=this.el.querySelector("#st-details");if(!i)return;if(!e){i.innerHTML=`
        <div class="st-details-empty">
          Hover a skill to inspect it.<br>Click to learn or rank up.
        </div>
        <div class="st-legend">
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #e86020;background:#2a0c00;"></span>Owned</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-accent);background:#201200;"></span>Can learn — click it</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 1.5px #444;background:#151515;"></span>Locked</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="background:repeating-linear-gradient(90deg,#c8860a 0 4px,transparent 4px 7px);"></span>Dashed line: needs any one parent</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-border-light);background:#101117;"></span>Right-click a skill: refund 1 rank</div>
        </div>
      `;return}const a=se.find(x=>x.id===e),r=bi[e],o=this.ranks.get(e)??0,n=o>0,l=ci[e]??"fa-star",d=a.isSpell?"Active Spell":"Passive";let h="";if(a.keystone&&Pe(a)){const x=a.stackable.softCap,k=o>x;h=`
        <div class="st-keystone${k?" st-keystone-active":""}">
          <div class="st-keystone-name">⚡ ${Q(a.keystone.name)}${k?" — ACTIVE":` — unlocks at rank ${x+1}`}</div>
          <div>${Q(a.keystone.description)}</div>
        </div>`}let p="",u="";if(Pe(a)){const x=a.stackable.softCap,k=a.stackable.baseEffect,A=Math.max(x,o),O=Array.from({length:A},(F,ae)=>`<div class="st-rank-seg ${ae<o?ae<x?"filled":"filled past-cap":""}"></div>`).join(""),D=o>x?' <span style="color:#ddb84a">⚡ Supercharged</span>':"";if(p=`
        <div class="st-rank-line">Rank ${o} / ${x}${D}</div>
        <div class="st-rank-track">${O}</div>
      `,o>=x){const F=$t=>Pt(k,$t),ae=Be(k,o),me=Be(k,o+1);u=`
          <div class="st-super-note">
            ⚡ ${o>x?`Supercharging is boosting this talent's total effect to <b>${F(ae)}</b> (base cap is ${F(Be(k,x))}).`:`This talent is at its cap: total effect <b>${F(ae)}</b>.`}<br>
            Next rank raises it to <b>${F(me)}</b> (+${F(me-ae)}) — each rank past the cap gives less and costs 1 pt more.
          </div>
        `}}let m="";if(r&&!n){const x=[];for(const k of r.requiresAll??[]){const A=this.ranks.has(k),O=((g=se.find(D=>D.id===k))==null?void 0:g.name)??k;x.push(`<div class="${A?"met":"unmet"}"><i class="fa ${A?"fa-check":"fa-xmark"}"></i> ${Q(O)}</div>`)}if((b=r.requiresAny)!=null&&b.length){const k=r.requiresAny.some(O=>this.ranks.has(O)),A=r.requiresAny.map(O=>{var D;return((D=se.find(F=>F.id===O))==null?void 0:D.name)??O});x.push(`<div class="${k?"met":"unmet"}"><i class="fa ${k?"fa-check":"fa-xmark"}"></i> Any of: ${Q(A.join(", "))}</div>`)}if((y=r.mutuallyExclusive)!=null&&y.length){const k=r.mutuallyExclusive.find(A=>this.ranks.has(A));if(k){const A=((w=se.find(O=>O.id===k))==null?void 0:w.name)??k;x.push(`<div class="unmet"><i class="fa fa-ban"></i> Excluded by ${Q(A)} (respec to change)</div>`)}}x.length&&(m=`<div class="st-req">${x.join("")}</div>`)}let v="";if(n){const x=this.refundBlockReason(e),k=Et(a,o-1);v=x===null?`<div class="st-refund-hint">Right-click: refund 1 rank (+${k} pt${k>1?"s":""})</div>`:`<div class="st-refund-hint st-refund-blocked">Refund blocked: ${Q(x)}</div>`}let f="";if(n&&Pe(a)){const x=Et(a,o),k=o>=a.stackable.softCap?"Supercharge":"Next rank";f=t>=x?`<span class="st-status-warn">${k} costs ${x} pt${x>1?"s":""} — click to buy</span>`:`<span class="st-status-bad">${k} costs ${x} pt${x>1?"s":""} — not enough points</span>`}else n?f='<span class="st-status-ok"><i class="fa fa-check"></i> Owned</span>':Je(e,this.ranks)?f=t>=a.cost?`<span class="st-status-ok">Costs ${a.cost} pt${a.cost>1?"s":""} — click to learn</span>`:`<span class="st-status-bad">Costs ${a.cost} pt${a.cost>1?"s":""} — not enough points</span>`:f='<span class="st-status-bad">Locked — requirements not met</span>';i.innerHTML=`
      <div class="st-details-head">
        <div class="st-details-icon"><i class="fa ${l}" style="color:var(--px-accent)"></i></div>
        <div>
          <div class="st-details-name">${Q(a.name)}</div>
          <div class="st-details-kind">${d}${n?"":` · ${a.cost} pt${a.cost>1?"s":""}`}</div>
        </div>
      </div>
      <div class="st-details-desc">${Q(a.description)}</div>
      ${h}
      ${p}
      ${m}
      <div class="st-details-status">${f}</div>
      ${u}
      ${v}
    `}attachNodeListeners(e){this.el.querySelectorAll(".st-node").forEach(t=>{const i=t.getAttribute("data-id"),a=se.find(r=>r.id===i);t.addEventListener("mouseenter",()=>this.renderDetails(i,e)),t.addEventListener("click",()=>{this.selectedId=i;const r=this.ranks.get(i)??0;if(r>0){if(Pe(a)){const n=Et(a,r);if(e>=n){r>=a.stackable.softCap?this.confirmSupercharge(i,a,r,n):this.buyNode(i,n,r+1);return}Vt()}}else{if(Je(i,this.ranks)&&e>=a.cost){this.handleUnlock(i,a.cost);return}Vt()}this.el.querySelectorAll(".st-node-selected").forEach(n=>n.classList.remove("st-node-selected")),t.classList.add("st-node-selected"),this.renderDetails(i,e)}),t.addEventListener("contextmenu",r=>{r.preventDefault(),this.refundNode(i,a)})})}confirmSupercharge(e,t,i,a){const r=t.stackable.baseEffect,o=Be(r,i),n=Be(r,i+1),l=[`${t.name} — rank ${i+1}`,`Costs ${a} pt${a>1?"s":""}. You have ${this.skillPoints}.`,`Total effect ${Pt(r,o)} → ${Pt(r,n)} (+${Pt(r,n-o)}).`,"Each rank past the cap costs 1 pt more and gives less.",...t.keystone&&i===t.stackable.softCap?[`Unlocks keystone: ${t.keystone.name} — ${t.keystone.description}`]:[]].join(`

`);this.showConfirm("Supercharge",l,()=>this.buyNode(e,a,i+1))}buyNode(e,t,i){this.characterId&&(Gn(),this.ranks.set(e,i),this.skillPoints-=t,this.flashId=e,this.selectedId=e,this.render(),C.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:t}).then(({error:a})=>{a&&console.error("Purchase failed, reverting:",a.message),this.reload()}))}handleUnlock(e,t){this.buyNode(e,t,1)}openPicker(e){this.pickingSlot=e,this.el.querySelectorAll(".st-slot").forEach(o=>{o.classList.toggle("picking",Number(o.dataset.slot)===e)});const t=this.el.querySelector("#st-picker"),i=this.currentSlots()[e-1],a=[...this.ownedSpells()].map(o=>{const n=se.find(d=>d.id===Gs(o));return`<div class="st-picker-item${o===i?" st-picker-item-current":""}" data-spell="${o}">${Q((n==null?void 0:n.name)??String(o))}</div>`}),r=i===null?" st-picker-item-current":"";a.push(`<div class="st-picker-item${r}" data-spell="clear">— Clear —</div>`),t.innerHTML=a.join("")}async assignSlot(e,t){if(!this.characterId)return;const i=this.currentSlots(),a=t===null?-1:i.indexOf(t);a!==-1&&(i[a]=i[e-1]),i[e-1]=t,this.slotRows=i.map((o,n)=>({slot:n+1,spell:o})).filter(o=>o.spell!==null),this.pickingSlot=null,this.render();const{error:r}=await C.rpc("set_spell_slots",{p_character_id:this.characterId,p_slots:i});r&&console.error("Slot assignment failed, reverting:",r.message),await this.reload()}refundBlockReason(e){var r;const t=this.ranks.get(e)??0;if(t===0)return"Not owned";if(t>1)return null;const i=qi[Ut(this.charClass)];if(e===i)return"Class starter skill — cannot be removed";const a=new Map(this.ranks);a.delete(e);for(const o of a.keys())if(!Je(o,a))return`${((r=se.find(l=>l.id===o))==null?void 0:r.name)??o} depends on it`;return null}refundNode(e,t){if(!this.characterId)return;const i=this.ranks.get(e)??0;if(i===0||this.refundBlockReason(e)!==null)return;wi();const a=Et(t,i-1);i>1?this.ranks.set(e,i-1):this.ranks.delete(e),this.skillPoints+=a,this.flashId=e,this.selectedId=this.ranks.has(e)?e:null,this.render(),C.rpc("refund_skill_node",{p_character_id:this.characterId,p_node_id:e,p_refund:a}).then(({error:r})=>{r&&console.error("Refund failed, reverting:",r.message),this.reload()})}handleRespec(){this.showConfirm("Reset Skills","All unlocked skills will be removed and points refunded. Are you sure?",async()=>{if(!this.characterId)return;wi();const{error:e}=await C.rpc("respec_skills",{p_character_id:this.characterId});if(e){console.error("Respec failed:",e.message);return}await this.reload()})}showConfirm(e,t,i){const a=document.createElement("div");a.className="st-confirm-overlay",a.innerHTML=`
      <div class="st-confirm-panel px-panel">
        <div class="st-confirm-title px-title">${Q(e)}</div>
        <div class="st-confirm-text">${Q(t)}</div>
        <div class="st-confirm-buttons">
          <button class="st-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="st-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(a),a.querySelector(".st-confirm-yes").addEventListener("click",()=>{a.remove(),i()}),a.querySelector(".st-confirm-no").addEventListener("click",()=>a.remove())}}function re(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const uc={max_health:s=>`+${s} Max Health`,max_mana:s=>`+${s} Max Mana`,damage_pct:s=>`+${s}% Damage`,cast_speed_pct:s=>`+${s}% Cast Speed`,move_speed_pct:s=>`+${s}% Move Speed`,mana_regen_pct:s=>`+${s}% Mana Regen`};function Ws(s){return s.id==="talent"?`+${s.value} Talent Rank`:uc[s.id](s.value)}function _i(s,e){return s!==null&&s>=e}function Ys(s,e){return s.purchased?"sold":_i(e,s.price)?"available":"unaffordable"}function Xs(s,e){return s===402?"Not enough gold.":e}function mc(s=new Date){return s.toISOString().slice(0,10)}function gc(s,e){return s!==e}const xc=`
.sh-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.sh-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
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
.sh-buy-btn:disabled,.sh-buy-btn-blocked{opacity:0.5;cursor:not-allowed;}
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
.sh-vslot-icon,.sh-reveal-icon{width:36px;height:36px;display:flex;align-items:center;justify-content:center;}
`;class bc{constructor(e,t,i){c(this,"el");c(this,"closeResolver",null);c(this,"navTeardown",null);c(this,"vendor",null);c(this,"gold",null);c(this,"loading",!1);c(this,"selectedSlotIndex",null);c(this,"pending",new Set);c(this,"noticeBySlot",new Map);c(this,"lootboxNotice",new Map);c(this,"reveal",null);c(this,"staleNotice",null);this.navCtx=t,this.navHandlers=i,Le(),Ct();const a=document.createElement("style");a.textContent=xc,document.head.appendChild(a),this.el=document.createElement("div"),this.el.className="sh-overlay",e.appendChild(this.el)}async show(){return this.selectedSlotIndex=null,this.pending.clear(),this.noticeBySlot.clear(),this.lootboxNotice.clear(),this.reveal=null,this.staleNotice=null,this.el.style.display="block",this.gold=null,this.loading=this.vendor===null,this.render(),await this.reload(),await new Promise(e=>{this.closeResolver=e})}hide(e="arena"){var i;this.el.style.display="none",(i=this.navTeardown)==null||i.call(this),this.navTeardown=null;const t=this.closeResolver;this.closeResolver=null,t==null||t(e)}reset(){this.vendor=null,this.gold=null,this.selectedSlotIndex=null}async reload(){const[e,t]=await Promise.all([Bl(),ji()]);this.vendor=e,this.gold=t,this.loading=!1,this.render()}render(){const e=this.vendor?this.vendor.slots.map(i=>this.renderVendorCard(i)).join(""):'<div class="sh-empty">Unable to load the vendor right now.</div>',t=["basic","premium"].map(i=>this.renderLootboxCard(i)).join("");this.el.innerHTML=`
      <div class="sh-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${he("sh")}</div>
      <div class="sh-ui">
        ${Ee({active:"shop",...this.navCtx(),gold:this.gold})}
        <div class="bm-subhead">
          <div class="sh-title px-title">Shop</div>
        </div>
        ${this.loading?'<div class="bm-loading">Loading shop…</div>':`
        <div class="sh-columns">
          <div class="sh-col-vendor">
            <div class="sh-col-label">Vendor<span class="sh-countdown">new stock at midnight UTC</span></div>
            ${this.staleNotice?`<div class="sh-stale-notice">${re(this.staleNotice)}</div>`:""}
            <div id="sh-details" class="sh-details px-panel"></div>
            <div class="sh-vendor-grid">${e}</div>
          </div>
          <div class="sh-col-lootbox">
            <div class="sh-col-label">Loot Boxes</div>
            ${t}
          </div>
        </div>`}
      </div>
    `,this.attachListeners(),xt(this.el),this.renderDetails(this.selectedSlotIndex)}renderVendorCard(e){const t=Ce[e.rarity],i=Ys(e,this.gold),a=`vendor:${e.slotIndex}`,r=this.pending.has(a),o=i!=="available"||r,n=i==="sold"?"Sold":r?"Buying…":i==="unaffordable"?"Can't Afford":"Buy",l=this.noticeBySlot.get(e.slotIndex);return`
      <div class="${`sh-vslot${i==="sold"?" sh-sold":""}${e.crossClass?" sh-crossclass-dim":""}`}" data-slot="${e.slotIndex}" style="box-shadow:inset 0 0 0 2px ${t}">
        ${i==="sold"?'<div class="sh-sold-badge">SOLD</div>':""}
        <div class="sh-vslot-icon"${Me(e.base)} style="color:${t}"><i class="fa ${e.base.icon}"></i></div>
        <div class="sh-vslot-name" style="color:${t}">${re(e.base.name)}</div>
        <div class="sh-vslot-price"><i class="fa fa-coins"></i> ${e.price}</div>
        ${e.crossClass?'<div class="sh-crossclass">⚠ No current class can use this</div>':""}
        ${l?`<div class="sh-notice">${re(l)}</div>`:""}
        <button class="sh-buy-btn px-btn px-btn-primary${o?" sh-buy-btn-blocked":""}" data-buy-slot="${e.slotIndex}" aria-disabled="${o}">${re(n)}</button>
      </div>`}renderLootboxCard(e){const t=ai[e],i=`lootbox:${e}`,a=this.pending.has(i),r=_i(this.gold,t),o=a||!r,n=a?"Opening…":r?"Open":"Can't Afford",l=this.lootboxNotice.get(e),d=this.reveal&&this.reveal.tier===e?this.renderReveal(this.reveal.item):"";return`
      <div class="sh-lootbox px-panel">
        <div class="sh-lootbox-icon"><i class="fa fa-box"></i></div>
        <div class="sh-lootbox-name">${e==="basic"?"Basic":"Premium"} Loot Box</div>
        <div class="sh-lootbox-price"><i class="fa fa-coins"></i> ${t}</div>
        ${l?`<div class="sh-notice">${re(l)}</div>`:""}
        <button class="sh-open-btn px-btn px-btn-primary${o?" sh-buy-btn-blocked":""}" data-open-lootbox="${e}" aria-disabled="${o}">${re(n)}</button>
        ${d}
      </div>`}renderReveal(e){const t=pt(e);if(!t)return"";const i=Ce[e.rarity],a=ft(e,t);return`
      <div class="sh-reveal" style="box-shadow:inset 0 0 0 2px ${i}">
        <div class="sh-reveal-icon"${Me(t)} style="color:${i}"><i class="fa ${t.icon}"></i></div>
        <div class="sh-reveal-name" style="color:${i}">${re(a)}</div>
        <div class="sh-reveal-note">Sent to stash</div>
      </div>`}renderDetails(e){var l;this.selectedSlotIndex=e;const t=this.el.querySelector("#sh-details");if(!t)return;const i=e!==null?(l=this.vendor)==null?void 0:l.slots.find(d=>d.slotIndex===e):void 0;if(!i){t.innerHTML='<div class="sh-details-empty">Hover a vendor slot to inspect it.</div>';return}const a=Ce[i.rarity],r=`<div class="sh-details-row">${re(Ws(i.base.implicit))} <span class="sh-dim">(implicit)</span></div>`,o=i.affixes.map(d=>`<div class="sh-details-row">${re(Ws(d))}</div>`).join(""),n=i.base.classRestriction?`<div class="sh-details-row${i.crossClass?" sh-bad":""}">Class: ${re(i.base.classRestriction)}${i.crossClass?" — no current class can use this":""}</div>`:"";t.innerHTML=`
      <div class="sh-details-head">
        <div class="sh-details-icon"${Me(i.base)} style="color:${a}"><i class="fa ${i.base.icon}"></i></div>
        <div>
          <div class="sh-details-name" style="color:${a}">${re(i.base.name)}</div>
          <div class="sh-details-kind">${re(i.rarity)} · Lvl ${i.base.itemLevel}+</div>
        </div>
      </div>
      ${r}
      ${o}
      ${n}
    `,xt(t)}attachListeners(){var e;(e=this.navTeardown)==null||e.call(this),this.navTeardown=Ae(this.el,{onNavigate:t=>this.hide(t),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.el.querySelectorAll("[data-slot]").forEach(t=>{const i=Number(t.dataset.slot);t.addEventListener("mouseenter",()=>this.renderDetails(i))}),this.el.querySelectorAll("[data-buy-slot]").forEach(t=>{const i=t,a=Number(i.dataset.buySlot);i.addEventListener("click",()=>{var l;const r=`vendor:${a}`;if(this.pending.has(r))return;const o=(l=this.vendor)==null?void 0:l.slots.find(d=>d.slotIndex===a);if((o?Ys(o,this.gold):"unaffordable")!=="available"){Vt();return}this.handleBuySlot(a)})}),this.el.querySelectorAll("[data-open-lootbox]").forEach(t=>{const i=t,a=i.dataset.openLootbox;i.addEventListener("click",()=>{const r=`lootbox:${a}`;if(this.pending.has(r)||!_i(this.gold,ai[a])){Vt();return}this.handleOpenLootbox(a)})})}async handleBuySlot(e){var r;const t=`vendor:${e}`;if(this.pending.has(t))return;if(!this.vendor||gc(this.vendor.utcDay,mc())){this.staleNotice="New stock has arrived — refreshed.",await this.reload();return}this.staleNotice=null,this.pending.add(t),this.noticeBySlot.delete(e);const i=(r=this.vendor)==null?void 0:r.slots.find(o=>o.slotIndex===e);i&&this.gold!==null&&(i.purchased=!0,this.gold-=i.price),this.render(),Ls();const a=await Dl(e);this.pending.delete(t),a.ok||this.noticeBySlot.set(e,Xs(a.status,a.error)),await this.reload()}async handleOpenLootbox(e){const t=`lootbox:${e}`;if(this.pending.has(t))return;this.pending.add(t),this.lootboxNotice.delete(e),this.reveal=null,this.gold!==null&&(this.gold-=ai[e]),this.render(),Ls();const i=await Hl(e);this.pending.delete(t),i.ok?(this.reveal={tier:e,item:i.item},Ba(i.item.rarity)):this.lootboxNotice.set(e,Xs(i.status,i.error)),await this.reload()}}function T(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const tt={basic:"#e2e2e6",magic:"#4a6fc4",rare:"#ddb84a",unique:"#ffb347"},Rt={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring:"Ring",amulet:"Amulet"},vc={max_health:s=>`+${s} Max Health`,max_mana:s=>`+${s} Max Mana`,damage_pct:s=>`+${s}% Damage`,cast_speed_pct:s=>`+${s}% Cast Speed`,move_speed_pct:s=>`+${s}% Move Speed`,mana_regen_pct:s=>`+${s}% Mana Regen`};function Oe(s){return s.id==="talent"?`+${s.value} Talent Rank${s.node?` (${s.node})`:""}`:vc[s.id](s.value)}const It={match_drop:{basic:70,magic:24,rare:5.5,unique:.5},lootbox_basic:{basic:60,magic:32,rare:7.5,unique:.5},lootbox_premium:{basic:25,magic:50,rare:21,unique:4}},yc=[{key:"match_drop",label:"Match Drop"},{key:"lootbox_basic",label:"Lootbox — Basic"},{key:"lootbox_premium",label:"Lootbox — Premium"}];function Zs(s){const e=s.basic+s.magic+s.rare+s.unique;if(e<=0)return{basic:0,magic:0,rare:0,unique:0};const t=i=>Math.round(i/e*1e3)/10;return{basic:t(s.basic),magic:t(s.magic),rare:t(s.rare),unique:t(s.unique)}}function wc(s){const{basic:e,magic:t,rare:i,unique:a}=s;return e<0||t<0||i<0||a<0?"Weights must be non-negative.":e+t+i+a<=0?"At least one weight must be positive.":null}const Ne=200,Ks={items:"Items",manifests:"Manifests",grant:"Grant",droprates:"Drop Rates"},kc=`
.ad-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.ad-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.ad-title{font-size:11px;letter-spacing:0.05em;}
.ad-tabs{display:flex;gap:6px;flex-wrap:wrap;}
.ad-tab{font-size:8px;letter-spacing:0.05em;padding:10px 16px;}
.ad-tab-active{background:#3a3f4b;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.ad-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
.ad-body{width:100%;max-width:1100px;}
.ad-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.ad-search{flex:1 1 220px;font-size:14px;padding:8px 10px;}
.ad-filters select{font-size:13px;padding:8px 10px;min-width:130px;}
.ad-cap-note{font-size:14px;color:var(--px-border-light);margin-bottom:8px;font-style:italic;min-height:1.2em;}
.ad-table-wrap{max-height:520px;overflow-y:auto;background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);margin-bottom:20px;}
.ad-table{width:100%;border-collapse:collapse;font-size:15px;}
.ad-table th{position:sticky;top:0;background:#1e2026;font-family:'Press Start 2P',monospace;font-size:8px;letter-spacing:0.05em;text-transform:uppercase;color:var(--px-border-light);text-align:left;padding:9px 10px;box-shadow:0 2px 0 0 var(--px-border-dark);}
.ad-table td{padding:7px 10px;border-bottom:1px solid var(--px-border-dark);vertical-align:top;}
.ad-table tr:hover td{background:rgba(255,255,255,0.03);}
.ad-empty{text-align:center;color:var(--px-border-light);padding:20px 0 !important;font-style:italic;}
.ad-del-btn{font-size:8px;padding:8px 12px;}
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
.ad-preview{background:#15161c;box-shadow:inset 0 0 0 2px var(--px-border-dark);padding:14px 16px;min-height:80px;}
.ad-preview-empty{color:var(--px-border-light);font-style:italic;text-align:center;padding:20px 0;}
.ad-preview-name{font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:8px;}
.ad-preview-row{font-size:16px;line-height:1.5;}
.ad-preview-flavor{font-style:italic;color:var(--px-border-light);margin-bottom:8px;font-size:14px;}
.ad-dim{color:var(--px-border-light);opacity:0.7;}
.ad-reroll-btn{margin-top:10px;font-size:8px;}
.ad-grant-status{margin-top:10px;font-size:15px;}
.ad-ok{color:var(--px-success);}
.ad-bad{color:var(--px-danger);}
.ad-drop-card{margin-bottom:18px;max-width:640px;}
.ad-drop-title{font-family:'Press Start 2P',monospace;font-size:10px;margin-bottom:14px;}
.ad-drop-key{color:var(--px-border-light);font-size:8px;text-transform:none;}
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
`;class Sc{constructor(e,t,i){c(this,"el");c(this,"closeResolver",null);c(this,"navTeardown",null);c(this,"tab","items");c(this,"items",[]);c(this,"usernames",new Map);c(this,"charNames",new Map);c(this,"filterRarity","");c(this,"filterSlot","");c(this,"filterSource","");c(this,"search","");c(this,"grantTargetQuery","");c(this,"grantTargetUserId",null);c(this,"grantTargetUsername",null);c(this,"grantTargetError",null);c(this,"grantRarity","basic");c(this,"grantBaseId",null);c(this,"grantUniqueId",null);c(this,"grantPreviewAffixes",[]);c(this,"grantStatus",null);c(this,"dropWeights",new Map);c(this,"dropStatus",new Map);c(this,"dropErrors",new Map);this.navCtx=t,this.navHandlers=i,Le(),Ct();const a=document.createElement("style");a.textContent=kc,document.head.appendChild(a),this.el=document.createElement("div"),this.el.className="ad-overlay",e.appendChild(this.el)}async show(){return this.tab="items",this.el.style.display="block",this.renderLoading(),await this.reloadAll(),await new Promise(e=>{this.closeResolver=e})}hide(e="arena"){var i;this.el.style.display="none",(i=this.navTeardown)==null||i.call(this),this.navTeardown=null;const t=this.closeResolver;this.closeResolver=null,t==null||t(e)}renderLoading(){var e;this.el.innerHTML=`
      <div class="ad-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${he("ad")}</div>
      <div class="ad-ui">
        ${Ee({active:"admin",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="ad-title px-title">Admin</div>
        </div>
        <div class="bm-loading">Loading admin…</div>
      </div>
    `,(e=this.navTeardown)==null||e.call(this),this.navTeardown=Ae(this.el,{onNavigate:t=>this.hide(t),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()})}async reloadAll(){await Promise.all([this.reloadItems(),this.reloadDropTables()]),this.render()}async reloadItems(){this.items=await Pl();const e=this.items.map(r=>r.user_id),t=this.items.map(r=>r.equipped_by).filter(r=>r!==null),[i,a]=await Promise.all([ql(e),Nl(t)]);this.usernames=i,this.charNames=a}async reloadDropTables(){const e=await zl();for(const t of e)this.dropWeights.set(t.context,{...t.weights});for(const t of Object.keys(It))this.dropWeights.has(t)||this.dropWeights.set(t,{...It[t]})}render(){var i;const e=Object.keys(Ks).map(a=>`<button class="ad-tab px-btn${a===this.tab?" ad-tab-active":""}" data-tab="${a}">${Ks[a]}</button>`).join("");let t;this.tab==="items"?t=this.renderItemsTab():this.tab==="manifests"?t=this.renderManifestsTab():this.tab==="grant"?t=this.renderGrantTab():t=this.renderDropRatesTab(),this.el.innerHTML=`
      <div class="ad-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${he("ad")}</div>
      <div class="ad-ui">
        ${Ee({active:"admin",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="ad-title px-title">Admin</div>
          <div class="ad-tabs">${e}</div>
        </div>
        <div class="ad-body">${t}</div>
      </div>
    `,(i=this.navTeardown)==null||i.call(this),this.navTeardown=Ae(this.el,{onNavigate:a=>this.hide(a),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.el.querySelectorAll("[data-tab]").forEach(a=>{a.addEventListener("click",()=>{this.tab=a.dataset.tab,this.render()})}),this.tab==="items"?this.attachItemsListeners():this.tab==="grant"?this.attachGrantListeners():this.tab==="droprates"&&this.attachDropRatesListeners()}filteredItems(){const e=this.search.trim().toLowerCase();return this.items.filter(t=>{if(this.filterRarity&&t.rarity!==this.filterRarity||this.filterSlot&&t.slot!==this.filterSlot||this.filterSource&&t.source!==this.filterSource)return!1;if(e){const i=N.find(o=>o.id===t.base_id),a=((i==null?void 0:i.name)??t.base_id).toLowerCase(),r=(this.usernames.get(t.user_id)??t.user_id).toLowerCase();if(!a.includes(e)&&!r.includes(e))return!1}return!0})}renderItemsTab(){const e=this.filteredItems(),t=e.slice(0,Ne),i=e.length>Ne?`Showing ${Ne} of ${e.length}`:"",a=t.length?t.map(l=>this.renderItemRow(l)).join(""):'<tr><td colspan="7" class="ad-empty">No items match.</td></tr>',r=["basic","magic","rare","unique"].map(l=>`<option value="${l}" ${this.filterRarity===l?"selected":""}>${l}</option>`).join(""),o=Object.keys(Rt).map(l=>`<option value="${l}" ${this.filterSlot===l?"selected":""}>${Rt[l]}</option>`).join(""),n=["starter","drop","vendor","lootbox","admin"].map(l=>`<option value="${l}" ${this.filterSource===l?"selected":""}>${l}</option>`).join("");return`
      <div class="ad-filters">
        <input id="ad-search" class="px-input ad-search" type="text" placeholder="Search owner or item name..." value="${T(this.search)}">
        <select id="ad-filter-rarity" class="px-input"><option value="">All Rarities</option>${r}</select>
        <select id="ad-filter-slot" class="px-input"><option value="">All Slots</option>${o}</select>
        <select id="ad-filter-source" class="px-input"><option value="">All Sources</option>${n}</select>
      </div>
      <div id="ad-cap-note" class="ad-cap-note">${i}</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>Owner</th><th>Item</th><th>Rarity</th><th>Slot</th><th>Source</th><th>Equipped By</th><th></th></tr></thead>
          <tbody id="ad-table-body">${a}</tbody>
        </table>
      </div>
    `}renderItemRow(e){const t=N.find(n=>n.id===e.base_id),i=(t==null?void 0:t.name)??e.base_id,a=tt[e.rarity]??"#e2e2e6",r=this.usernames.get(e.user_id)??e.user_id,o=e.equipped_by?this.charNames.get(e.equipped_by)??e.equipped_by:"—";return`<tr>
      <td>${T(r)}</td>
      <td style="color:${a}">${T(i)}</td>
      <td style="color:${a}">${T(e.rarity)}</td>
      <td>${T(e.slot)}</td>
      <td>${T(e.source)}</td>
      <td>${T(o)}</td>
      <td><button class="ad-del-btn px-btn" data-del="${T(e.id)}">Delete</button></td>
    </tr>`}attachItemsListeners(){var t,i,a;const e=this.el.querySelector("#ad-search");e==null||e.addEventListener("input",()=>{this.search=e.value,this.refreshItemsTable()}),(t=this.el.querySelector("#ad-filter-rarity"))==null||t.addEventListener("change",r=>{this.filterRarity=r.target.value,this.refreshItemsTable()}),(i=this.el.querySelector("#ad-filter-slot"))==null||i.addEventListener("change",r=>{this.filterSlot=r.target.value,this.refreshItemsTable()}),(a=this.el.querySelector("#ad-filter-source"))==null||a.addEventListener("change",r=>{this.filterSource=r.target.value,this.refreshItemsTable()}),this.attachDeleteButtons()}refreshItemsTable(){const e=this.filteredItems(),t=e.slice(0,Ne),i=this.el.querySelector("#ad-table-body"),a=this.el.querySelector("#ad-cap-note");i&&(i.innerHTML=t.length?t.map(r=>this.renderItemRow(r)).join(""):'<tr><td colspan="7" class="ad-empty">No items match.</td></tr>'),a&&(a.textContent=e.length>Ne?`Showing ${Ne} of ${e.length}`:""),this.attachDeleteButtons()}attachDeleteButtons(){this.el.querySelectorAll("[data-del]").forEach(e=>{const t=e.dataset.del;e.addEventListener("click",()=>this.confirmDelete(t))})}confirmDelete(e){const t=this.items.find(n=>n.id===e);if(!t)return;const i=N.find(n=>n.id===t.base_id),a=(i==null?void 0:i.name)??t.base_id,r=this.usernames.get(t.user_id)??t.user_id;let o=`Delete ${a} (${t.rarity}) owned by ${r}?`;if(t.equipped_by){const n=this.charNames.get(t.equipped_by)??t.equipped_by;o+=`

Warning: this item is currently equipped by ${n}. Deleting it will simply vanish next time that character's loadout loads.`}this.showConfirm("Delete Item",o,async()=>{await Il(e)||console.error("admin_delete_item failed"),await this.reloadItems(),this.render()})}renderManifestsTab(){const e=N.map(i=>`
      <tr>
        <td>${T(i.id)}</td>
        <td>${T(Rt[i.slot])}</td>
        <td>${T(i.name)}</td>
        <td>${i.itemLevel}</td>
        <td>${i.classRestriction?T(i.classRestriction):"—"}</td>
        <td>${T(Oe(i.implicit))}</td>
      </tr>`).join(""),t=De.map(i=>{const a=N.find(r=>r.id===i.baseId);return`
      <tr>
        <td>${T(i.id)}</td>
        <td style="color:${tt.unique}">${T(i.name)}</td>
        <td>${T((a==null?void 0:a.name)??i.baseId)}</td>
        <td>${i.levelReq}</td>
        <td>${i.affixes.map(r=>T(Oe(r))).join("<br>")}</td>
        <td class="ad-flavor">${T(i.flavor)}</td>
      </tr>`}).join("");return`
      <div class="ad-manifest-label">Item Bases (${N.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Slot</th><th>Name</th><th>ILvl</th><th>Class</th><th>Implicit</th></tr></thead>
          <tbody>${e}</tbody>
        </table>
      </div>
      <div class="ad-manifest-label">Unique Items (${De.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Name</th><th>Base</th><th>Lvl Req</th><th>Affixes</th><th>Flavor</th></tr></thead>
          <tbody>${t}</tbody>
        </table>
      </div>
    `}renderGrantTab(){const e=this.grantTargetUserId?`<span class="ad-ok">Found: ${T(this.grantTargetUsername??"")}</span>`:this.grantTargetError?`<span class="ad-bad">${T(this.grantTargetError)}</span>`:"",t=["basic","magic","rare","unique"].map(n=>`<button class="ad-rarity-btn px-btn${n===this.grantRarity?" ad-rarity-active":""}" data-rarity="${n}" style="color:${tt[n]}">${n}</button>`).join("");let i,a;if(this.grantRarity==="unique"){i=`
        <div class="ad-label px-label">Unique Item</div>
        <select id="ad-unique-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${De.map(d=>{const h=N.find(p=>p.id===d.baseId);return`<option value="${T(d.id)}" ${d.id===this.grantUniqueId?"selected":""}>${T(d.name)} (${T((h==null?void 0:h.name)??d.baseId)})</option>`}).join("")}
        </select>`;const l=De.find(d=>d.id===this.grantUniqueId);if(l){const d=N.find(h=>h.id===l.baseId);a=d?`
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${tt.unique}">${T(l.name)}</div>
            <div class="ad-preview-flavor">${T(l.flavor)}</div>
            <div class="ad-preview-row">${T(Oe(d.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${l.affixes.map(h=>`<div class="ad-preview-row">${T(Oe(h))}</div>`).join("")}
            <div class="ad-preview-row">Level Req: ${l.levelReq}</div>
          </div>`:'<div class="ad-preview-empty">Unknown base for this unique.</div>'}else a='<div class="ad-preview-empty">Select a unique item.</div>'}else{i=`
        <div class="ad-label px-label">Base Item</div>
        <select id="ad-base-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${["weapon","helmet","armor","leggings","ring","amulet"].map(h=>{const p=N.filter(m=>m.slot===h);if(!p.length)return"";const u=p.map(m=>`<option value="${T(m.id)}" ${m.id===this.grantBaseId?"selected":""}>${T(m.name)} (ilvl ${m.itemLevel}${m.classRestriction?`, ${T(m.classRestriction)}`:""})</option>`).join("");return`<optgroup label="${T(Rt[h])}">${u}</optgroup>`}).join("")}
        </select>`;const d=N.find(h=>h.id===this.grantBaseId);if(d){const h=this.grantPreviewAffixes.map(u=>`<div class="ad-preview-row">${T(Oe(u))}</div>`).join(""),p=this.grantRarity!=="basic"?'<button id="ad-reroll" class="px-btn ad-reroll-btn">🎲 Reroll</button>':"";a=`
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${tt[this.grantRarity]}">${T(d.name)}</div>
            <div class="ad-preview-row">${T(Oe(d.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${h||`<div class="ad-dim">No rolled affixes${this.grantRarity==="basic"?" (basic)":""}</div>`}
            <div class="ad-preview-row">Level Req: ${d.itemLevel}</div>
            ${p}
          </div>`}else a='<div class="ad-preview-empty">Select a base item.</div>'}const r=this.grantTargetUserId!==null&&(this.grantRarity==="unique"?this.grantUniqueId!==null:this.grantBaseId!==null),o=this.grantStatus?`<div class="ad-grant-status ${this.grantStatus.ok?"ad-ok":"ad-bad"}">${T(this.grantStatus.text)}</div>`:"";return`
      <div class="ad-grant-columns">
        <div class="ad-grant-col">
          <div class="ad-label px-label">Target Account</div>
          <div class="ad-target-row">
            <input id="ad-target-input" class="px-input ad-full" type="text" placeholder="Username" value="${T(this.grantTargetQuery)}">
            <button id="ad-target-find" class="px-btn">Find</button>
          </div>
          <div class="ad-target-status">${e}</div>

          <div class="ad-label px-label" style="margin-top:16px">Rarity</div>
          <div class="ad-rarity-row">${t}</div>

          ${i}
        </div>
        <div class="ad-grant-col">
          <div class="ad-label px-label">Preview</div>
          ${a}
          <button id="ad-grant-btn" class="px-btn px-btn-primary ad-full" ${r?"":"disabled"} style="margin-top:16px">Grant Item</button>
          ${o}
        </div>
      </div>
    `}attachGrantListeners(){var i,a,r,o;const e=this.el.querySelector("#ad-target-input");e==null||e.addEventListener("input",()=>{this.grantTargetQuery=e.value}),e==null||e.addEventListener("keydown",n=>{n.key==="Enter"&&this.handleFindTarget()}),(i=this.el.querySelector("#ad-target-find"))==null||i.addEventListener("click",()=>void this.handleFindTarget()),this.el.querySelectorAll("[data-rarity]").forEach(n=>{n.addEventListener("click",()=>{this.grantRarity=n.dataset.rarity,this.grantRarity!=="unique"&&this.regeneratePreview(),this.render()})}),(a=this.el.querySelector("#ad-unique-select"))==null||a.addEventListener("change",n=>{this.grantUniqueId=n.target.value||null,this.render()}),(r=this.el.querySelector("#ad-base-select"))==null||r.addEventListener("change",n=>{this.grantBaseId=n.target.value||null,this.regeneratePreview(),this.render()}),(o=this.el.querySelector("#ad-reroll"))==null||o.addEventListener("click",()=>{this.regeneratePreview(),this.render()});const t=this.el.querySelector("#ad-grant-btn");t==null||t.addEventListener("click",()=>{t.disabled||(t.disabled=!0,this.handleGrant())})}async handleFindTarget(){const e=this.grantTargetQuery.trim();if(!e)return;const t=await Ol(e);t?(this.grantTargetUserId=t,this.grantTargetUsername=e,this.grantTargetError=null):(this.grantTargetUserId=null,this.grantTargetUsername=null,this.grantTargetError="No account found with that username."),this.grantStatus=null,this.render()}regeneratePreview(){const e=N.find(t=>t.id===this.grantBaseId);this.grantPreviewAffixes=e?vo(e,this.grantRarity,Math.random):[]}async handleGrant(){if(!this.grantTargetUserId)return;let e,t,i,a,r,o,n;if(this.grantRarity==="unique"){const d=De.find(p=>p.id===this.grantUniqueId);if(!d)return;const h=N.find(p=>p.id===d.baseId);if(!h)return;e=d.baseId,t="unique",i=d.affixes,a=d.levelReq,r=h.slot,o=h.classRestriction,n=d.name}else{const d=N.find(h=>h.id===this.grantBaseId);if(!d)return;e=d.id,t=this.grantRarity,i=this.grantPreviewAffixes,a=d.itemLevel,r=d.slot,o=d.classRestriction,n=d.name}const l=await Rl(this.grantTargetUserId,e,t,i,a,r,o);this.grantStatus=l?{ok:!0,text:`Granted ${n} to ${this.grantTargetUsername??this.grantTargetUserId}.`}:{ok:!1,text:"Grant failed — see console."},l&&this.reloadItems(),this.render()}renderDropRatesTab(){return yc.map(e=>this.renderDropContext(e.key,e.label)).join("")}renderDropContext(e,t){const i=this.dropWeights.get(e)??It[e],a=Zs(i),r=this.dropStatus.get(e),o=this.dropErrors.get(e),n=["basic","magic","rare","unique"].map(l=>`
      <div class="ad-drop-field">
        <label class="ad-label px-label">${l}</label>
        <input class="px-input ad-drop-input" type="number" min="0" step="0.1" data-context="${e}" data-rarity="${l}" value="${i[l]}">
        <div class="ad-drop-pct">${a[l].toFixed(1)}%</div>
      </div>`).join("");return`
      <div class="ad-drop-card px-panel">
        <div class="ad-drop-title">${T(t)} <span class="ad-drop-key">(${T(e)})</span></div>
        <div class="ad-drop-grid">${n}</div>
        ${o?`<div class="ad-drop-error ad-bad">${T(o)}</div>`:""}
        <div class="ad-drop-buttons">
          <button class="px-btn px-btn-primary" data-save="${e}">Save</button>
          <button class="px-btn" data-reset="${e}">Reset to Seed</button>
          ${r?`<span class="ad-drop-status">${T(r)}</span>`:""}
        </div>
      </div>
    `}attachDropRatesListeners(){this.el.querySelectorAll(".ad-drop-input").forEach(e=>{e.addEventListener("input",()=>{const t=e,i=t.dataset.context,a=t.dataset.rarity,r=this.dropWeights.get(i)??{basic:0,magic:0,rare:0,unique:0};r[a]=parseFloat(t.value)||0,this.dropWeights.set(i,r);const o=Zs(r),n=t.closest(".ad-drop-card");n==null||n.querySelectorAll(".ad-drop-field").forEach(l=>{const h=l.querySelector("input").dataset.rarity,p=l.querySelector(".ad-drop-pct");p&&(p.textContent=`${o[h].toFixed(1)}%`)})})}),this.el.querySelectorAll("[data-save]").forEach(e=>{const t=e;t.addEventListener("click",()=>{t.disabled||(t.disabled=!0,this.handleDropSave(t.dataset.save))})}),this.el.querySelectorAll("[data-reset]").forEach(e=>{const t=e;t.addEventListener("click",()=>{t.disabled||(t.disabled=!0,this.handleDropReset(t.dataset.reset))})})}async handleDropSave(e){const t=this.dropWeights.get(e);if(!t)return;const i=wc(t);if(i){this.dropErrors.set(e,i),this.dropStatus.delete(e),this.render();return}this.dropErrors.delete(e);const a=await Ns(e,t);this.dropStatus.set(e,a?"Saved.":"Save failed — see console."),this.render()}async handleDropReset(e){const t=It[e];if(!t)return;this.dropWeights.set(e,{...t}),this.dropErrors.delete(e);const i=await Ns(e,t);this.dropStatus.set(e,i?"Reset to seed.":"Reset failed — see console."),this.render()}showConfirm(e,t,i){const a=document.createElement("div");a.className="ad-confirm-overlay",a.innerHTML=`
      <div class="ad-confirm-panel px-panel">
        <div class="ad-confirm-title px-title">${T(e)}</div>
        <div class="ad-confirm-text">${T(t)}</div>
        <div class="ad-confirm-buttons">
          <button class="ad-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="ad-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(a),a.querySelector(".ad-confirm-yes").addEventListener("click",()=>{a.remove(),i()}),a.querySelector(".ad-confirm-no").addEventListener("click",()=>a.remove())}}const di=[{key:"body",label:"Body",options:B.body},{key:"skin",label:"Skin",options:B.skin},{key:"hairStyle",label:"Hair Style",options:B.hairStyle},{key:"hairColor",label:"Hair Color",options:B.hairColor},{key:"torsoColor",label:"Shirt Color",options:B.torsoColor},{key:"legsColor",label:"Pants Color",options:B.legsColor}],_c=2;function Mc(s,e,t){return(e+t+s)%s}function Cc(s){return s===null?"None":s.split("_").map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}function hi(s,e,t){return s==="skin"?`Tone ${t.indexOf(e)+1}`:Cc(e)}const Tc=`
.ap-picker{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;}
.ap-left{flex:1;display:flex;flex-direction:column;gap:10px;min-width:0;}
.ap-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.ap-row-label{flex:0 0 auto;white-space:nowrap;}
.ap-row-control{display:flex;align-items:center;gap:6px;}
.ap-btn{padding:4px 8px;font-size:10px;}
.ap-value{font-family:'VT323',monospace;font-size:16px;color:var(--px-text);min-width:96px;text-align:center;}
.ap-randomize{margin-top:4px;}
.ap-right{flex:0 0 auto;display:flex;align-items:center;justify-content:center;margin:0 auto;}
.ap-canvas{width:128px;height:128px;image-rendering:pixelated;background:#101117;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);}
`;let Qs=!1;function $c(){if(Qs)return;Qs=!0;const s=document.createElement("style");s.textContent=Tc,document.head.appendChild(s)}class pi{constructor(e,t,i){c(this,"onChange");c(this,"appearance");c(this,"el");c(this,"canvas");c(this,"preview");c(this,"valueEls",new Map);this.charClass=t,$c(),this.appearance=i?{...i}:{...Mt[t]},this.el=document.createElement("div"),this.el.className="ap-picker",e.appendChild(this.el);const a=document.createElement("div");a.className="ap-left",this.el.appendChild(a);for(const n of di){const l=document.createElement("div");l.className="ap-row",l.innerHTML=`
        <div class="ap-row-label px-label">${n.label}</div>
        <div class="ap-row-control">
          <button type="button" class="ap-btn px-btn ap-prev">◀</button>
          <span class="ap-value">${hi(n.key,this.appearance[n.key],n.options)}</span>
          <button type="button" class="ap-btn px-btn ap-next">▶</button>
        </div>`;const d=l.querySelector(".ap-prev"),h=l.querySelector(".ap-next"),p=l.querySelector(".ap-value");this.valueEls.set(n.key,p),d.addEventListener("click",()=>this.cycle(n.key,-1)),h.addEventListener("click",()=>this.cycle(n.key,1)),a.appendChild(l)}const r=document.createElement("button");r.type="button",r.className="ap-randomize px-btn",r.textContent="⚄ Randomize",r.addEventListener("click",()=>this.randomize()),a.appendChild(r);const o=document.createElement("div");o.className="ap-right",this.canvas=document.createElement("canvas"),this.canvas.className="ap-canvas",o.appendChild(this.canvas),this.el.appendChild(o),this.preview=new Hi(this.canvas,_c),this.preview.setAppearance(this.appearance)}getAppearance(){return{...this.appearance}}dispose(){this.preview.dispose(),this.el.remove()}cycle(e,t){var n;const i=di.find(l=>l.key===e),a=i.options.indexOf(this.appearance[e]),r=Mc(i.options.length,a===-1?0:a,t),o=i.options[r];this.appearance={...this.appearance,[e]:o},this.valueEls.get(e).textContent=hi(e,o,i.options),this.preview.setAppearance(this.appearance),(n=this.onChange)==null||n.call(this,this.getAppearance())}randomize(){var e;this.appearance=po(this.charClass);for(const t of di)this.valueEls.get(t.key).textContent=hi(t.key,this.appearance[t.key],t.options);this.preview.setAppearance(this.appearance),(e=this.onChange)==null||e.call(this,this.getAppearance())}}function Fe(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Js={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',ranger:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>'},Ec=`
.cs-overlay{position:fixed;inset:0;z-index:100;background:#12141b;}
.cs-ui{position:relative;z-index:1;min-height:calc(100vh / var(--ui-zoom, 1));display:flex;flex-direction:column;align-items:center;padding:32px 24px;font-family:'VT323',monospace;color:var(--px-text);}
.cs-title{font-size:28px;letter-spacing:2px;margin-bottom:4px;}
.cs-subtitle{font-size:9px;margin-bottom:36px;}
.cs-divider{display:flex;align-items:center;gap:12px;width:100%;max-width:820px;margin-bottom:28px;}
.cs-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);}
.cs-divider-gem{width:10px;height:10px;background:var(--px-accent);transform:rotate(45deg);box-shadow:0 0 8px rgba(255,179,71,0.6);}
.cs-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;width:100%;max-width:820px;margin-bottom:24px;}
.cs-grid>.cs-slot{flex:0 0 calc((100% - 34px)/3);}
.cs-slot{padding:20px;cursor:pointer;transition:all 0.15s;min-height:140px;display:flex;flex-direction:column;position:relative;}
.cs-slot:hover{box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent),inset 0 2px 0 0 rgba(255,255,255,0.06),0 0 24px rgba(255,122,30,0.35),inset 0 -14px 26px -14px rgba(255,122,30,0.28);}
.cs-embers{position:absolute;inset:0;pointer-events:none;}
.cs-embers i{position:absolute;bottom:8px;width:4px;height:4px;background:var(--px-accent);opacity:0;box-shadow:0 0 6px rgba(255,122,30,0.8);}
.cs-embers i:nth-child(1){left:12%;--dx:10px;}
.cs-embers i:nth-child(2){left:30%;--dx:-8px;width:3px;height:3px;background:#ff7a1e;}
.cs-embers i:nth-child(3){left:47%;--dx:6px;width:5px;height:5px;}
.cs-embers i:nth-child(4){left:62%;--dx:-12px;background:#ffcf6e;}
.cs-embers i:nth-child(5){left:78%;--dx:8px;width:3px;height:3px;background:#ff7a1e;}
.cs-embers i:nth-child(6){left:90%;--dx:-6px;}
.cs-slot:hover .cs-embers i{animation:cs-ember-rise 1.5s linear infinite;}
.cs-slot:hover .cs-embers i:nth-child(2){animation-duration:1.2s;animation-delay:0.3s;}
.cs-slot:hover .cs-embers i:nth-child(3){animation-delay:0.55s;}
.cs-slot:hover .cs-embers i:nth-child(4){animation-duration:1.8s;animation-delay:0.15s;}
.cs-slot:hover .cs-embers i:nth-child(5){animation-duration:1.3s;animation-delay:0.7s;}
.cs-slot:hover .cs-embers i:nth-child(6){animation-duration:1.65s;animation-delay:0.4s;}
@keyframes cs-ember-rise{0%{transform:translate(0,0);opacity:0;}12%{opacity:1;}55%{opacity:0.9;}100%{transform:translate(var(--dx,8px),-130px);opacity:0;}}
@media (prefers-reduced-motion: reduce){.cs-slot:hover .cs-embers i{animation:none;}}
.cs-slot-empty{align-items:center;justify-content:center;box-shadow:none;outline:2px dashed var(--px-border-light);}
.cs-slot-empty:hover{background:#23252c;box-shadow:none;outline:2px dashed var(--px-accent);}
.cs-char-name{margin-bottom:4px;}
.cs-char-class{margin-bottom:12px;display:flex;align-items:center;gap:6px;}
.cs-char-class svg{flex-shrink:0;}
.cs-char-level{font-size:16px;color:var(--px-text);margin-bottom:8px;}
.cs-xp-bar{width:100%;height:8px;background:var(--px-border-dark);border-radius:0;overflow:hidden;margin-bottom:8px;box-shadow:0 0 0 2px var(--px-border-dark);}
.cs-xp-fill{height:100%;background:repeating-linear-gradient(90deg,var(--px-accent) 0 6px,#c98a3a 6px 12px);border-radius:0;transition:width 0.3s;}
.cs-xp-text{font-size:16px;color:var(--px-border-light);margin-bottom:auto;}
.cs-slot-actions{display:flex;gap:8px;margin-top:12px;}
.cs-slot-actions .px-btn{font-size:9px;padding:10px 8px;}
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
.cs-class-option{padding:12px;background:#2a2d36;color:var(--px-border-light);font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;border:0;border-radius:0;box-shadow:0 -2px 0 0 var(--px-border-light),0 2px 0 0 var(--px-border-dark),-2px 0 0 0 var(--px-border-light),2px 0 0 0 var(--px-border-dark);text-align:center;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.cs-class-option svg{flex-shrink:0;}
.cs-class-option.active{background:#3a3f4b;color:var(--px-accent);box-shadow:0 -2px 0 0 var(--px-accent),0 2px 0 0 var(--px-accent),-2px 0 0 0 var(--px-accent),2px 0 0 0 var(--px-accent);}
.cs-class-option.disabled{opacity:0.4;cursor:not-allowed;position:relative;}
.cs-class-option.disabled::after{content:'Coming Soon';position:absolute;top:50%;right:12px;transform:translateY(-50%);font-size:8px;color:var(--px-border-light);}
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
`;class Ac{constructor(e,t){c(this,"el");c(this,"ui");c(this,"characters",[]);c(this,"showingCreate",!1);c(this,"activePicker",null);this.cb=t,Le();const i=document.createElement("style");i.textContent=Ec,document.head.appendChild(i),this.el=document.createElement("div"),this.el.className="cs-overlay",this.el.innerHTML=`<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${he("cs")}</div>`,this.ui=document.createElement("div"),this.ui.className="cs-ui",this.el.appendChild(this.ui),e.appendChild(this.el)}async show(){this.el.style.display="block",this.showingCreate=!1,this.characters=await Nt(),this.render()}hide(){this.el.style.display="none"}render(){var a;if(this.showingCreate){this.renderCreateForm();return}(a=this.activePicker)==null||a.dispose(),this.activePicker=null;const e=this.characters.map((r,o)=>{const n=no(r.level),l=n>0?Math.min(100,r.xp/n*100):0;return`
        <div class="cs-slot px-panel" data-index="${o}"><div class="cs-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="cs-char-name px-title" style="font-size:12px">${Fe(r.name)}</div>
          <div class="cs-char-class px-label">${Js[r.class]??""} ${Fe(r.class)}</div>
          <div class="cs-char-level">Level ${r.level}</div>
          <div class="cs-xp-bar"><div class="cs-xp-fill" style="width:${l}%"></div></div>
          <div class="cs-xp-text">${r.xp} / ${n} XP</div>
          <div class="cs-slot-actions">
            <button class="cs-btn-select px-btn px-btn-primary" data-index="${o}">Select</button>
            <button class="cs-btn-look px-btn" data-index="${o}">Edit Look</button>
            <button class="cs-btn-delete px-btn" data-index="${o}">Delete</button>
          </div>
        </div>`}).join(""),t=Math.max(0,oo-this.characters.length),i=t===0?"":`
      <div class="cs-slot cs-slot-empty px-panel" data-action="create"><div class="cs-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="cs-empty-plus">+</div>
        <div class="cs-empty-text px-label">Create Character</div>
        <div class="cs-empty-text px-label" style="opacity:0.6">${t} slot${t===1?"":"s"} left</div>
      </div>`;this.ui.innerHTML=`
      <button class="cs-btn-logout px-btn" id="cs-logout">Sign Out</button>
      <div class="cs-title px-title">Blood Moor</div>
      <div class="cs-subtitle px-label">Choose Your Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-grid">
        ${e}
        ${i}
      </div>`,this.ui.querySelector("#cs-logout").addEventListener("click",()=>this.cb.onLogout()),this.ui.querySelectorAll(".cs-btn-select").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.cb.onSelectCharacter(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-look").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.showEditLook(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-delete").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.showDeleteConfirm(this.characters[n])})}),this.ui.querySelectorAll('[data-action="create"]').forEach(r=>{r.addEventListener("click",()=>{this.showingCreate=!0,this.render()})})}renderCreateForm(e="",t){var o;(o=this.activePicker)==null||o.dispose(),this.activePicker=null;const i=(t==null?void 0:t.selectedClass)??"mage",a=os.map(n=>{const l=n.id===i?"active":"",d=n.enabled?"":"disabled";return`<div class="cs-class-option ${l} ${d}" data-class="${n.id}">${Js[n.id]??""} ${Fe(n.label)}</div>`}).join("");this.ui.innerHTML=`
      <div class="cs-title px-title" style="font-size:24px">Blood Moor</div>
      <div class="cs-subtitle px-label">Create a New Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-create-panel px-panel">
        ${e?`<div class="cs-error">${Fe(e)}</div>`:""}
        <div class="cs-label px-label">Character Name</div>
        <input id="cs-name" class="cs-input px-input" type="text" placeholder="Name your champion..." maxlength="20">
        <div class="cs-label px-label">Class</div>
        <div class="cs-class-grid">${a}</div>
        <div class="cs-label px-label">Appearance</div>
        <div id="cs-appearance" class="cs-appearance-wrap"></div>
        <button id="cs-create-btn" class="cs-btn-create px-btn px-btn-primary">Forge Champion</button>
        <button id="cs-cancel-btn" class="cs-btn-cancel px-btn">Cancel</button>
      </div>`;let r=i;this.activePicker=new pi(this.ui.querySelector("#cs-appearance"),r,t==null?void 0:t.appearance),this.ui.querySelectorAll(".cs-class-option").forEach(n=>{n.addEventListener("click",()=>{var h;const l=n.dataset.class,d=os.find(p=>p.id===l);!(d!=null&&d.enabled)||l===r||(this.ui.querySelectorAll(".cs-class-option").forEach(p=>p.classList.remove("active")),n.classList.add("active"),r=l,(h=this.activePicker)==null||h.dispose(),this.activePicker=new pi(this.ui.querySelector("#cs-appearance"),r))})}),this.ui.querySelector("#cs-create-btn").addEventListener("click",async()=>{const n=this.ui.querySelector("#cs-name").value.trim(),l={selectedClass:r,appearance:this.activePicker.getAppearance()};if(!n){this.renderCreateForm("Name is required",l);return}if(n.length>20){this.renderCreateForm("Name must be 20 characters or less",l);return}const d=ls(l.appearance);if(!await $l(n,r,d)){this.renderCreateForm("Failed to create character. Name may already be taken.",l);return}this.showingCreate=!1,this.characters=await Nt(),this.render()}),this.ui.querySelector("#cs-cancel-btn").addEventListener("click",()=>{this.showingCreate=!1,this.render()})}showDeleteConfirm(e){const t=document.createElement("div");t.className="cs-confirm-overlay",t.innerHTML=`
      <div class="cs-confirm-panel px-panel">
        <div class="cs-confirm-title px-title">Delete Character</div>
        <div class="cs-confirm-text">
          This will permanently delete <strong style="color:var(--px-accent)">${Fe(e.name)}</strong>
          and all their progress.<br><br>
          Type the character's name to confirm:
        </div>
        <input class="cs-confirm-input px-input" id="cs-delete-input" type="text" placeholder="${Fe(e.name)}">
        <div class="cs-confirm-buttons">
          <button class="cs-confirm-delete px-btn" id="cs-delete-confirm">Delete Forever</button>
          <button class="cs-confirm-cancel px-btn" id="cs-delete-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(t);const i=t.querySelector("#cs-delete-input"),a=t.querySelector("#cs-delete-confirm"),r=t.querySelector("#cs-delete-cancel");i.addEventListener("input",()=>{i.value===e.name?a.classList.add("enabled"):a.classList.remove("enabled")}),a.addEventListener("click",async()=>{if(i.value!==e.name)return;const o=await El(e.id);t.remove(),o&&(this.characters=await Nt(),this.render())}),r.addEventListener("click",()=>t.remove())}showEditLook(e){const t=document.createElement("div");t.className="cs-confirm-overlay",t.innerHTML=`
      <div class="cs-edit-look-panel px-panel">
        <div class="cs-confirm-title px-title">Edit Look</div>
        <div class="cs-error" hidden></div>
        <div id="cs-edit-look-picker"></div>
        <div class="cs-confirm-buttons" style="margin-top:16px">
          <button class="px-btn px-btn-primary" id="cs-look-save">Save</button>
          <button class="px-btn" id="cs-look-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(t);const i=new pi(t.querySelector("#cs-edit-look-picker"),e.class,Xt(e.appearance,e.class)),a=t.querySelector(".cs-error"),r=t.querySelector("#cs-look-save"),o=t.querySelector("#cs-look-cancel"),n=()=>{i.dispose(),t.remove()};o.addEventListener("click",n),r.addEventListener("click",async()=>{a.hidden=!0,r.disabled=!0,o.disabled=!0;const l=ls(i.getAppearance());try{await Qa(e.id,l),e.appearance=l,n(),this.render()}catch(d){console.error("update_appearance failed:",d instanceof Error?d.message:d),a.textContent="Failed to save look. Please try again.",a.hidden=!1,r.disabled=!1,o.disabled=!1}})}}function ea(s,e=64,t=8){const i=s.image,a=document.createElement("canvas");a.width=e,a.height=e;const r=a.getContext("2d");r.imageSmoothingEnabled=!0,r.drawImage(i,0,0,e,e);const o=r.getImageData(0,0,e,e);Vr(o.data,t),r.putImageData(o,0,0);const n=new Li(a);return n.colorSpace=s.colorSpace,n.wrapS=n.wrapT=xa,n.magFilter=be,n.minFilter=va,s.dispose(),n}function ta(s){return s.magFilter=be,s.minFilter=va,s}class Lc{static async load(){const e=new Rr,t=(d,h)=>new Promise((p,u)=>e.load(d,m=>{m.colorSpace=h,p(m)},void 0,u)),i=Yt,a=Ir,[r,o,n,l]=await Promise.all([t("/assets/textures/cobblestone/diffuse.jpg",i),t("/assets/textures/castle_stone/diffuse.jpg",i),t("/assets/textures/castle_stone/normal.jpg",a),t("/assets/textures/castle_stone/roughness.jpg",a)]);return{textures:{floor:{map:ea(r,64,12)},stone:{map:ea(o),normalMap:ta(n),roughnessMap:ta(l)}}}}}class Pc{constructor(e){c(this,"el");c(this,"hidden",!1);this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#181a21 0%,#0a0b0f 60%,#0a0b0f 100%);z-index:300;font-family:"VT323",monospace;transition:opacity 0.6s ease;',this.el.innerHTML=`
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
    `,e.appendChild(this.el)}hide(){return this.hidden?Promise.resolve():(this.hidden=!0,new Promise(e=>{this.el.addEventListener("transitionend",()=>{this.el.remove(),e()},{once:!0}),this.el.style.opacity="0"}))}}const Rc=`
/* Global UI scale: every screen mounts under #ui-overlay. Overlay roots
   using viewport units divide by --ui-zoom (zoom does not scale vh/vw). */
#ui-overlay { zoom: var(--ui-zoom); }

:root {
  --ui-zoom: 1.18;
  --px-bg: #12141b;
  --px-panel: #1e2026;
  --px-border-light: #4e5462;
  --px-border-dark: #0a0b0f;
  --px-text: #e2e2e6;
  --px-accent: #ffa03c;
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
  color: #9aa0ae;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.px-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  text-transform: uppercase;
  color: var(--px-text);
  background: #2a2d36;
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
.px-btn:hover { background: #3a3f4b; }
.px-btn:active { transform: translateY(2px); box-shadow:
    0 -2px 0 0 var(--px-border-dark),
    0 2px 0 0 var(--px-border-light),
    -2px 0 0 0 var(--px-border-dark),
    2px 0 0 0 var(--px-border-light); }
.px-btn-primary { background: #8f5a1e; color: #ffe9c9; }
.px-btn-primary:hover { background: #c98a3a; }

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
`;function Ic(){if(document.getElementById("px-theme"))return;const s=document.createElement("style");s.id="px-theme",s.textContent=Rc,document.head.appendChild(s)}class zc{constructor(e){c(this,"el");this.el=document.createElement("div"),this.el.style.cssText="position:fixed;inset:0;z-index:500;display:none;background:rgba(8,9,13,0.9);overflow-y:auto;",this.el.innerHTML=`
      <div class="px-panel" style="max-width:640px;margin:48px auto;padding:24px">
        <div class="px-title" style="margin-bottom:12px">Art Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Character sprites are from the <b>Liberated Pixel Cup</b> collection
          (lpc.opengameart.org), licensed CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0.
        </div>
        <pre id="credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <div class="px-title" style="margin:20px 0 12px">Audio Credits</div>
        <div style="font-family:'VT323',monospace;font-size:18px;line-height:1.5;margin-bottom:12px">
          Sound effects and ambience are sourced samples (Kenney, OpenGameArt,
          Freesound contributors), licensed CC0 / CC-BY 3.0.
        </div>
        <pre id="audio-credits-body" style="font-family:'VT323',monospace;font-size:16px;white-space:pre-wrap;max-height:50vh;overflow-y:auto"></pre>
        <button id="credits-close" class="px-btn" style="margin-top:16px">Close</button>
      </div>`,e.appendChild(this.el),this.el.querySelector("#credits-close").addEventListener("click",()=>this.hide())}async show(){this.el.style.display="block";const e=this.el.querySelector("#credits-body");if(!e.textContent)try{const i=await fetch("/assets/lpc/CREDITS.filtered.csv");if(!i.ok)throw new Error(`credits fetch failed: ${i.status}`);e.textContent=qc(await i.text())}catch{e.textContent="Credits file missing — see client/public/assets/lpc/CREDITS.csv"}const t=this.el.querySelector("#audio-credits-body");if(!t.textContent)try{const i=await fetch("/assets/audio/CREDITS.csv");if(!i.ok)throw new Error(`audio credits fetch failed: ${i.status}`);t.textContent=Oc(await i.text())}catch{t.textContent="Credits file missing — see client/public/assets/audio/CREDITS.csv"}}hide(){this.el.style.display="none"}}function ir(s){const e=[];let t="",i=!1;for(let a=0;a<s.length;a++){const r=s[a];i?r==='"'?s[a+1]==='"'?(t+='"',a++):i=!1:t+=r:r==='"'?i=!0:r===","?(e.push(t),t=""):t+=r}return e.push(t),e}function qc(s){return s.split(`
`).filter(t=>t.trim().length>0).slice(1).map(ir).map(([t,,i,a])=>`${t} — ${i==null?void 0:i.trim()} (${a==null?void 0:a.trim()})`).join(`

`)}function Oc(s){return s.split(`
`).filter(t=>t.trim().length>0).slice(1).map(ir).map(([t,i,a,,r])=>`${t} — ${a==null?void 0:a.trim()}, ${i==null?void 0:i.trim()} (${r==null?void 0:r.trim()})`).join(`

`)}const Nc=`
.au-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:500;}
.au-panel{background:var(--px-panel);padding:24px 28px;min-width:320px;box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 12px 32px rgba(0,0,0,0.7);}
.au-title{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:1px;margin-bottom:18px;}
.au-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-text);letter-spacing:1px;}
.au-row label{width:70px;text-transform:uppercase;}
.au-row input[type=range]{flex:1;accent-color:var(--px-accent);}
.au-actions{display:flex;justify-content:flex-end;margin-top:18px;}
`;function Fc(s){return`
    <div class="au-panel">
      <div class="au-title">Settings</div>
      <div class="au-row"><label>Music</label><input type="range" min="0" max="100" value="${s.musicVol}" data-audio-music></div>
      <div class="au-row"><label>SFX</label><input type="range" min="0" max="100" value="${s.sfxVol}" data-audio-sfx></div>
      <div class="au-row"><label>Mute</label><input type="checkbox" ${s.muted?"checked":""} data-audio-mute></div>
      <div class="au-actions"><button class="px-btn" data-audio-close>Done</button></div>
    </div>`}class Bc{constructor(e){c(this,"el");Di("au-settings-css",Nc),this.el=document.createElement("div"),this.el.className="au-overlay",this.el.style.display="none",this.el.addEventListener("click",t=>{t.target===this.el&&this.hide()}),e.appendChild(this.el)}show(){this.el.innerHTML=Fc(Y.settings);const e=this.el.querySelector("[data-audio-music]"),t=this.el.querySelector("[data-audio-sfx]"),i=this.el.querySelector("[data-audio-mute]");e.addEventListener("input",()=>Y.setMusicVol(Number(e.value))),t.addEventListener("input",()=>Y.setSfxVol(Number(t.value))),i.addEventListener("change",()=>Y.setMuted(i.checked)),this.el.querySelector("[data-audio-close]").addEventListener("click",()=>this.hide()),this.el.style.display=""}hide(){this.el.style.display="none"}}const ia=1.5;function Dc(s,e){switch(s){case"hall":return{base:.9,torch:.6,wind:0,pulse:0};case"arena":return{base:0,torch:0,wind:.8,pulse:e?.5:0};case"off":return{base:0,torch:0,wind:0,pulse:0}}}let sr="off",ar=!1;const it=new Map,fi=new Map;let sa=!1;const Hc=new Set(["hall_base","hall_torch","arena_wind"]);let aa=!1;function Tt(s){sr=s,sa||(sa=!0,Y.onUnlock(()=>Ft())),aa||(aa=!0,qa(e=>{Hc.has(e)&&Ft()})),Ft()}function rr(s){ar=s,Ft()}function Ft(){const s=Y.ctx,e=Y.musicBus;if(!s||!e)return;const t=Dc(sr,ar);for(const i of Object.keys(t)){const a=t[i],r=(fi.get(i)??0)+1;if(fi.set(i,r),a>0&&!it.has(i)){const n=Uc(i);n&&it.set(i,n)}const o=it.get(i);o&&(o.gain.gain.cancelScheduledValues(s.currentTime),o.gain.gain.setValueAtTime(o.gain.gain.value,s.currentTime),o.gain.gain.linearRampToValueAtTime(a,s.currentTime+ia),a===0&&window.setTimeout(()=>{var n;fi.get(i)===r&&((n=it.get(i))==null||n.stop(),it.delete(i))},ia*1e3+100))}}function Uc(s){switch(s){case"base":return at("hall_base","music",0);case"torch":return at("hall_torch","music",0);case"wind":return at("arena_wind","music",0);case"pulse":return at("hall_base","music",0,.55)}}Ic();Y.installUnlockListener();Tt("hall");gn();const or=document.getElementById("canvas-container"),X=document.getElementById("ui-overlay");X.addEventListener("click",s=>{var i,a;const e=(a=(i=s.target)==null?void 0:i.closest)==null?void 0:a.call(i,".px-btn, .bm-acct-item");if(!e)return;const t=xn(e.className);t==="tab"?vn():t==="click"&&bn()},!0);const ra=new Pc(X),nr=new zc(X),lr=new Bc(X),le=new Zr(or);function Gi(s){or.style.display=s?"":"none"}Gi(!1);const pe=new cl(X);pe.hide();const xe=new Kn,bt=new Set,$=new al;let E="",ee="",V={},ue=new Map,W=null,U=null,ce={},Z="1v1",Ge,vt=!1,Se=null,Wt=[],de=new Set,te=null,ye="",S=null,Te={},Xe=new Set,Bt=new Array(mt).fill(null),cr="none";function jc(s){const e=new Set;for(const t of $e)s.has(t.node)&&e.add(t.spell);return e}let dr=0;async function Vi(s,e){const[{data:t},{data:i}]=await Promise.all([C.from("skill_unlocks").select("node_id, rank").eq("character_id",s),C.from("character_spell_slots").select("slot, spell").eq("character_id",s)]),a=i??[],r=t??[],o=new Set(r.map(p=>p.node_id)),n=qi[e];n&&o.add(n);const l=new Map;for(const p of r)l.set(p.node_id,p.rank??0);const d=(await Ja()).filter(p=>p.equipped_by===s),{talentRanks:h}=yo(d,e);for(const[p,u]of h)o.add(p),l.set(p,(l.get(p)??0)+u);(S==null?void 0:S.id)===s&&(Te=La(d),_.updateHeroGear(Te),Xe=jc(o),cr=ro(l),dr=l.get("utility.phase_shift")??0,Bt=zi(Xe,a),pe.buildSpellSlots(Bt),U==null||U.setSlots(Bt))}let Ze=Promise.resolve(),Mi=!1;function Gc(){const s=S;s&&(Ze=Vi(s.id,s.class).catch(e=>{console.error("loadout sync failed:",e)}))}function Vc(){const s=S;s&&(Ze=(async()=>{const e=await Nt();if((S==null?void 0:S.id)!==s.id)return;const t=e.find(a=>a.id===s.id);if(!t)return;const i=t.skill_points_available!==s.skill_points_available;S=t,await Vi(t.id,t.class),i&&!Mi&&Jt()})().catch(e=>{console.error("character sync failed:",e)}))}async function Ke(){if(!ye){Ci=null,_.setGold(null);return}const s=await ji();Ci=s,_.setGold(s)}function Kt(){return{username:(S==null?void 0:S.name)??yt,gold:Ci,skillPoints:S==null?void 0:S.skill_points_available,isAdmin:wt}}const Qt={onCredits:()=>{nr.show()},onLogout:()=>{hr()},onSettings:()=>{lr.show()}};async function hr(){try{await C.auth.signOut()}catch{}Ve(),Tt("hall"),ye="",S=null,Te={},vt=!1,E="",ee="",V={},ce={},Z="1v1",Ge=void 0,Xe=new Set,Se=null,Wi.reset(),Yi.reset(),Ze=Promise.resolve(),$.disconnect(),_.hide(),wt=!1,_.setAdmin(!1),Xi.show()}function Jt(){S?_.showHome(S.name,S.skill_points_available,S.class,S.level,Xt(S.appearance,S.class),Te):_.showHome(yt)}async function Wc(s){if(s==="skills"){if(!S)return"arena";const e=await Yc.show(S.id);return Vc(),e}if(s==="gear"){if(!S)return"arena";const e=await Wi.show(S.id,S.class,S.level,Xt(S.appearance,S.class));return Gc(),e}return s==="shop"?S?await Yi.show():"arena":await Xc.show()}async function zt(s){if(s==="arena")return;Mi=!0,_.hide();let e=s;for(;e!=="arena";)e=await Wc(e),Ke();_.show(),Jt(),Mi=!1}const oa={0:13148160,1:12582960,2:32960,3:41024};let na,yt="",Ci=null,wt=!1;const Yc=new fc(X,Kt,Qt),Wi=new tc(X,Kt,Qt),Yi=new bc(X,Kt,Qt),Xc=new Sc(X,Kt,Qt),kt=new Ac(X,{onSelectCharacter:async s=>{S=s,Te={},await Vi(s.id,s.class),kt.hide(),_.show(),_.showHome(s.name,s.skill_points_available,s.class,s.level,Xt(s.appearance,s.class),Te),Ke()},onLogout:async()=>{try{await C.auth.signOut()}catch{}Ve(),ye="",S=null,Te={},vt=!1,E="",ee="",V={},ce={},Z="1v1",Ge=void 0,Xe=new Set,Se=null,Wi.reset(),Yi.reset(),Ze=Promise.resolve(),$.disconnect(),_.hide(),wt=!1,_.setAdmin(!1),kt.hide(),Xi.show()}});kt.hide();const Xi=new ac(X,{onAuthed:async(s,e)=>{ye=e,Xi.hide(),await Ei,ra.hide();const t=await Tl();wt=(t==null?void 0:t.is_admin)??!1,_.setAdmin(wt);const i=await Zc(e);if(i){await Kc(i,s,void 0);return}await kt.show()},onShowLogin:async()=>{await Ei,ra.hide()}});async function Zc(s){try{const e=await fetch("/paused-match",{method:"POST",headers:{Authorization:`Bearer ${s}`}});if(!e.ok)return null;const{roomId:t}=await e.json();return t}catch{return null}}async function Kc(s,e,t){try{await Ei}catch{return}yt=e,ee=s,Ti(),$.connect(),$.onRejoinAccepted(i=>{E=i.yourId,i.colorIndex,V=i.players,ce={...i.players},pe.init(E),_.hide()}),$.onRejoinFailed(()=>{ee="",E="",_.show(),_.showHome(e,t),Ke()}),$.rejoinRoom(s,ye)}const _=new sc(X,{onCreateRoom:async(s,e)=>{await Ze,yt=s,Z=e;const t=await fetch("/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:e})}),{roomId:i}=await t.json();$.connect(),$.joinRoom(i,s,ye,void 0,S==null?void 0:S.id),$.onRoomJoined(({yourId:a,mode:r,teams:o,readyPlayerIds:n})=>{E=a,ee=i,V={[a]:s},Z=r??e,Ge=o==null?void 0:o[a],de=new Set(n??[]),pe.init(E),_.showReady(i,V,E,Z,de),_.appendSystemMessage("You have entered the lobby")}),Ti()},onJoinRoom:async(s,e,t)=>{await Ze,yt=e,$.connect(),$.joinRoom(s,e,ye,t,S==null?void 0:S.id),$.onRoomJoined(({yourId:i,players:a,mode:r,teams:o,readyPlayerIds:n})=>{E=i,ee=s,V=a,Z=r??"1v1",Ge=o==null?void 0:o[i],de=new Set(n??[]),Object.keys(a).indexOf(i),pe.init(E),ce={...a},_.showReady(s,a,i,Z,de),_.appendSystemMessage("You have entered the lobby")}),Ti()},onReady:()=>$.ready(),onRematch:()=>$.rematch(),onReturnToLobby:()=>{Tt("hall"),Ve(),$.disconnect(),vt=!1,ee="",V={},ce={},Z="1v1",Ge=void 0,Jt(),Ke()},onSendChatMessage:s=>$.sendChatMessage(s),onLogout:()=>{hr()},onOpenSkills:()=>{zt("skills")},onOpenGear:()=>{zt("gear")},onOpenShop:()=>{zt("shop")},onSwitchCharacter:async()=>{_.hide(),await kt.show()},onShowCredits:()=>{nr.show()},onOpenAdmin:()=>{zt("admin")},onOpenSettings:()=>{lr.show()}});_.hide();function Ti(s){if(vt)return;vt=!0,$.onChatMessage(({senderId:t,displayName:i,text:a})=>{t!==E&&Dn(),_.appendChatMessage(t,i,a)}),$.onPlayerJoined(({id:t,displayName:i})=>{Hn(),ce[t]=i,V[t]=i,_.showReady(ee,V,E,Z,de),_.appendSystemMessage(`${i} has entered the lobby`)}),$.onGameReady(()=>_.showReady(ee,V,E,Z,de)),$.onPlayerReadyAck(({playerId:t})=>{de.add(t),_.showReady(ee,V,E,Z,de)}),$.onRematchRequested(({requesterId:t,countdown:i})=>{const a=t===E;_.showRematchCountdown(i,a)}),$.onGameState(t=>{W||(xe.clear(),bt.clear(),la(),_.hide());const i=performance.now();xe.push(t,i);for(const[a,r]of Object.entries(t.players))r.castingSpell!==null&&(bt.add(a),wn(r.castingSpell));if(!te&&t.players[E]&&(te=new sl(t.players[E].position)),te&&t.players[E]&&t.ack){const a=t.ack[E];a!==void 0&&te.reconcile(t.players[E].position,a)}});let e=!1;$.onDuelEnded(({winnerId:t,gameMode:i,matchResults:a})=>{e=!0;const r=i??Z;let o;r==="2v2"?o=t===Ge:o=t===E,_.hidePauseOverlay(),Ve();const n=a==null?void 0:a[E];if(r==="ffa"&&!o){const l=Wt.indexOf(E),h=l>=0?4-l:1;_.showResult(o,r,h,n)}else _.showResult(o,r,void 0,n);_.show(),S&&n&&(S={...S,level:n.newLevel||S.level,xp:n.newXp??S.xp}),Ke()}),$.onRematchReady(()=>{e=!1,xe.clear(),la(),_.hide()}),$.onOpponentDisconnected(()=>{e?_.disableRematch():Z==="1v1"?(Ve(),_.showDisconnected(),_.show()):_.appendSystemMessage("A player disconnected")}),$.onPlayerDisconnected(({playerId:t})=>{const i=ce[t]??"A player";_.appendSystemMessage(`${i} disconnected`),delete V[t],_.showReady(ee,V,E,Z,de)}),$.onPlayerLeft(({playerId:t})=>{const i=ce[t]??"A player";_.appendSystemMessage(`${i} left the lobby`),delete V[t],delete ce[t],_.showReady(ee,V,E,Z,de)}),$.onMatchPaused(({countdown:t})=>{_.showPauseOverlay(t,()=>{$.leavePausedMatch()})}),$.onGameResumed(()=>{_.hidePauseOverlay()}),$.onDisconnect(()=>{W&&ee&&(Se={roomId:ee})}),$.onReconnect(()=>{Se&&($.onRejoinAccepted(t=>{Se=null,E=t.yourId,t.colorIndex,V=t.players,ce={...ce,...t.players},pe.init(E),W==null||W.setMyId(E),te=null}),$.onRejoinFailed(()=>{Se=null,Ve(),_.showDisconnected(),_.show()}),$.rejoinRoom(Se.roomId,ye))}),$.onRoomNotFound(()=>{Tt("hall"),Jt(),Ke()})}function la(){Gi(!0);for(const e of ue.values())e.dispose(X);ue.clear(),W==null||W.dispose(),U==null||U.dispose(),W=new Xn(le.scene,E),W.setArrowElement(cr),U=new rl(le,le.renderer.domElement),S&&U.setCharacterClass(S.class);const s=Xe.size>0?Bt:zi(new Set($e.filter(e=>e.charClass===((S==null?void 0:S.class)??"mage")).map(e=>e.spell)),[]);pe.buildSpellSlots(s),U.setSlots(s),pe.show(),Tt("arena"),rr(!0),Bn(),_.hide()}function Ve(){Gi(!1),U==null||U.dispose(),U=null,W==null||W.dispose(),W=null;for(const s of ue.values())s.dispose(X);ue.clear(),pe.hide(),rr(!1),xe.clear(),bt.clear(),te=null,$i=0,Wt=[],de=new Set}let ca=performance.now();const ui=1e3/60;let st=0,$i=0;le.startRenderLoop(()=>{var a,r;const s=performance.now(),e=Math.min((s-ca)/1e3,.1);if(ca=s,!U||!W)return;for(st=Math.min(st+e*1e3,100);st>=ui;){st-=ui;const o=U.buildInputFrame();if(o.castSpell){const n=(a=xe.getLatest())==null?void 0:a.players[E];n&&n.hp>0&&(n.cooldowns[o.castSpell]??0)<=0&&n.mana<ct[o.castSpell].manaCost&&zn()}if(te){const n=xe.getLatest(),l=n==null?void 0:n.players[E],d={};if(n&&l){const h=(l.rootUntil??0)>n.tick?0:(l.slowUntil??0)>n.tick?l.slowFactor??1:1;if(d.speedMult=h*(((r=l.statMults)==null?void 0:r.moveSpeed)??1),o.castSpell===4&&Xe.has(4)&&s>=$i){const p=(l.phantomStepUntil??0)>n.tick,u=p||l.mana>=ct[4].manaCost;(l.cooldowns[4]??0)<=0&&u&&l.hp>0&&(d.teleportTarget={...o.aimTarget},d.teleportRange=so(dr),p||($i=s+ct[4].cooldownTicks/_t*1e3))}}o.seq=te.applyInput(o.move,s,d)}$.sendInput(o)}const t=st/ui,i=xe.getInterpolated(s);if(i){for(const[o,n]of ue)o in i.players||(n.dispose(X),ue.delete(o));for(const[o,n]of Object.entries(i.players)){if(n.hp<=0&&!Wt.includes(o)&&Wt.push(o),!ue.has(o)){const p=Object.keys(i.players).indexOf(o)%Object.keys(oa).length,u=new Xo(n.charClass,n.appearance,n.gear,oa[p],n.displayName,X);le.scene.add(u.group),ue.set(o,u)}const l=ue.get(o);if(o===E&&te){const h=te.getRenderPosition(t,s),p=U.getCurrentMouseWorld(),u=Math.atan2(p.y-h.y,p.x-h.x);l.setPosition(h.x,h.y,u)}else l.setPosition(n.position.x,n.position.y,n.facing);l.update(e,bt.has(o)),n.hp<=0&&l.die();const d=(n.invisibleUntil??0)>i.tick&&o!==E;l.setVisible(!d),l.updateLabel(le.camera,le.getCanvasRect())}if(bt.clear(),te&&i.players[E]){const o=te.getRenderPosition(t,s);le.updateCamera(o.x,o.y,e)}else{const o=i.players[E];o&&le.updateCamera(o.position.x,o.position.y,e)}U.refreshMouseWorld(),W.update(i),pe.update(i,U.getActiveSpell())}});const Ei=(async()=>{na=await Lc.load(),new Ro(na.textures).addToScene(le.scene),le.initPostProcessing()})().catch(s=>{throw console.error("Asset load failed:",s),s});document.addEventListener("visibilitychange",()=>{if(document.hidden&&te){const s=xe.getLatest();s!=null&&s.players[E]&&te.reset(s.players[E].position)}});
