var mo=Object.defineProperty;var go=(a,e,s)=>e in a?mo(a,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):a[e]=s;var c=(a,e,s)=>go(a,typeof e!="symbol"?e+"":e,s);import{M as H,O as Wa,B as pt,F as Ri,S as Ee,U as ds,V as he,W as St,H as Ct,N as xo,C as Ya,a as we,b as se,A as ys,c as U,R as bo,d as vo,e as yo,L as wo,f as ko,g as _o,h as Xa,i as So,j as Co,k as Mo,P as To,l as Eo,m as Ao,n as ws,o as Ro,p as $o,q as Io,D as Lo,G as ye,r as Za,s as Fe,t as Ka,u as pi,v as Qa,w as Ja,x as ks,y as He,z as ss,E as Ut,I as Se,J as Mt,K as Tt,Q as er,T as Po,X as fi,Y as Ks,Z as zo,_ as ui,$ as qo,a0 as Oo,a1 as Fo,a2 as No,a3 as tr}from"./three-CB_OlHYH.js";import{l as Bo,c as Ho}from"./vendor-k1XoXMcf.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&t(o)}).observe(document,{childList:!0,subtree:!0});function s(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function t(i){if(i.ep)return;i.ep=!0;const r=s(i);fetch(i.href,r)}})();const sr={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

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


		}`};class ft{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const Do=new Wa(-1,1,1,-1,0,1);class Uo extends pt{constructor(){super(),this.setAttribute("position",new Ri([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ri([0,2,0,0,2,0],2))}}const jo=new Uo;class mi{constructor(e){this._mesh=new H(jo,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Do)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class ir extends ft{constructor(e,s){super(),this.textureID=s!==void 0?s:"tDiffuse",e instanceof Ee?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ds.clone(e.uniforms),this.material=new Ee({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new mi(this.material)}render(e,s,t){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=t.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class $i extends ft{constructor(e,s){super(),this.scene=e,this.camera=s,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,s,t){const i=e.getContext(),r=e.state;r.buffers.color.setMask(!1),r.buffers.depth.setMask(!1),r.buffers.color.setLocked(!0),r.buffers.depth.setLocked(!0);let o,n;this.inverse?(o=0,n=1):(o=1,n=0),r.buffers.stencil.setTest(!0),r.buffers.stencil.setOp(i.REPLACE,i.REPLACE,i.REPLACE),r.buffers.stencil.setFunc(i.ALWAYS,o,4294967295),r.buffers.stencil.setClear(n),r.buffers.stencil.setLocked(!0),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),r.buffers.color.setLocked(!1),r.buffers.depth.setLocked(!1),r.buffers.color.setMask(!0),r.buffers.depth.setMask(!0),r.buffers.stencil.setLocked(!1),r.buffers.stencil.setFunc(i.EQUAL,1,4294967295),r.buffers.stencil.setOp(i.KEEP,i.KEEP,i.KEEP),r.buffers.stencil.setLocked(!0)}}class Go extends ft{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class Vo{constructor(e,s){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),s===void 0){const t=e.getSize(new he);this._width=t.width,this._height=t.height,s=new St(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Ct}),s.texture.name="EffectComposer.rt1"}else this._width=s.width,this._height=s.height;this.renderTarget1=s,this.renderTarget2=s.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ir(sr),this.copyPass.material.blending=xo,this.clock=new Ya}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,s){this.passes.splice(s,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const s=this.passes.indexOf(e);s!==-1&&this.passes.splice(s,1)}isLastEnabledPass(e){for(let s=e+1;s<this.passes.length;s++)if(this.passes[s].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const s=this.renderer.getRenderTarget();let t=!1;for(let i=0,r=this.passes.length;i<r;i++){const o=this.passes[i];if(o.enabled!==!1){if(o.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(i),o.render(this.renderer,this.writeBuffer,this.readBuffer,e,t),o.needsSwap){if(t){const n=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}$i!==void 0&&(o instanceof $i?t=!0:o instanceof Go&&(t=!1))}}this.renderer.setRenderTarget(s)}reset(e){if(e===void 0){const s=this.renderer.getSize(new he);this._pixelRatio=this.renderer.getPixelRatio(),this._width=s.width,this._height=s.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,s){this._width=e,this._height=s;const t=this._width*this._pixelRatio,i=this._height*this._pixelRatio;this.renderTarget1.setSize(t,i),this.renderTarget2.setSize(t,i);for(let r=0;r<this.passes.length;r++)this.passes[r].setSize(t,i)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class Wo extends ft{constructor(e,s,t=null,i=null,r=null){super(),this.scene=e,this.camera=s,this.overrideMaterial=t,this.clearColor=i,this.clearAlpha=r,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new we}render(e,s,t){const i=e.autoClear;e.autoClear=!1;let r,o;this.overrideMaterial!==null&&(o=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(r=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:t),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(r),this.overrideMaterial!==null&&(this.scene.overrideMaterial=o),e.autoClear=i}}const Yo={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new we(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class ot extends ft{constructor(e,s,t,i){super(),this.strength=s!==void 0?s:1,this.radius=t,this.threshold=i,this.resolution=e!==void 0?new he(e.x,e.y):new he(256,256),this.clearColor=new we(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new St(r,o,{type:Ct}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let p=0;p<this.nMips;p++){const f=new St(r,o,{type:Ct});f.texture.name="UnrealBloomPass.h"+p,f.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(f);const m=new St(r,o,{type:Ct});m.texture.name="UnrealBloomPass.v"+p,m.texture.generateMipmaps=!1,this.renderTargetsVertical.push(m),r=Math.round(r/2),o=Math.round(o/2)}const n=Yo;this.highPassUniforms=ds.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=i,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ee({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];r=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let p=0;p<this.nMips;p++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[p])),this.separableBlurMaterials[p].uniforms.invSize.value=new he(1/r,1/o),r=Math.round(r/2),o=Math.round(o/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=s,this.compositeMaterial.uniforms.bloomRadius.value=.1;const d=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=d,this.bloomTintColors=[new se(1,1,1),new se(1,1,1),new se(1,1,1),new se(1,1,1),new se(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const h=sr;this.copyUniforms=ds.clone(h.uniforms),this.blendMaterial=new Ee({uniforms:this.copyUniforms,vertexShader:h.vertexShader,fragmentShader:h.fragmentShader,blending:ys,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new we,this.oldClearAlpha=1,this.basic=new U,this.fsQuad=new mi(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,s){let t=Math.round(e/2),i=Math.round(s/2);this.renderTargetBright.setSize(t,i);for(let r=0;r<this.nMips;r++)this.renderTargetsHorizontal[r].setSize(t,i),this.renderTargetsVertical[r].setSize(t,i),this.separableBlurMaterials[r].uniforms.invSize.value=new he(1/t,1/i),t=Math.round(t/2),i=Math.round(i/2)}render(e,s,t,i,r){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const o=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),r&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=t.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=t.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let n=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[l].uniforms.direction.value=ot.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=ot.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),n=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,r&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=o}getSeperableBlurMaterial(e){const s=[];for(let t=0;t<e;t++)s.push(.39894*Math.exp(-.5*t*t/(e*e))/e);return new Ee({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new he(.5,.5)},direction:{value:new he(.5,.5)},gaussianCoefficients:{value:s}},vertexShader:`varying vec2 vUv;
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
				}`})}getCompositeMaterial(e){return new Ee({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
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
				}`})}}ot.BlurDirectionX=new he(1,0);ot.BlurDirectionY=new he(0,1);const Xo={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class Zo extends ft{constructor(){super();const e=Xo;this.uniforms=ds.clone(e.uniforms),this.material=new bo({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new mi(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,s,t){this.uniforms.tDiffuse.value=t.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},vo.getTransfer(this._outputColorSpace)===yo&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===wo?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===ko?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===_o?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Xa?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===So?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Co&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(s),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const Ko=8;class Qo{constructor(e,s,t){c(this,"currentX");c(this,"currentZ");this.camera=e,this.currentX=s,this.currentZ=t}update(e,s,t){const i=Math.min(1,Ko*t);this.currentX+=(e-this.currentX)*i,this.currentZ+=(s-this.currentZ)*i,this.camera.position.set(this.currentX+200,600,this.currentZ+200),this.camera.lookAt(this.currentX,0,this.currentZ)}}const De=360,_e=330,hs=2;function Jo(a=De){return 2*_e/a}function en(a,e){e=Math.max(2,Math.floor(e));const s=255/(e-1);for(let t=0;t<a.length;t+=4)a[t]=Math.round(a[t]/s)*s,a[t+1]=Math.round(a[t+1]/s)*s,a[t+2]=Math.round(a[t+2]/s)*s}class tn extends ot{setSize(e,s){super.setSize(Math.round(De*(e/Math.max(1,s))),De)}}const Ii=200,Li=1e3,sn={uniforms:{tDiffuse:{value:null},intensity:{value:.2}},vertexShader:`
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
  `};class an{constructor(e){c(this,"renderer");c(this,"scene");c(this,"camera");c(this,"cameraController");c(this,"composer");c(this,"animFrameId",0);c(this,"renderingEnabled",!1);c(this,"_raycaster",new Mo);c(this,"_groundPlane",new To(new se(0,1,0),0));c(this,"_worldTarget",new se);c(this,"_ndc",new he);c(this,"_canvasRect",null);c(this,"onResize",()=>{var i,r;const e=window.innerWidth,s=window.innerHeight,t=e/s;this.camera.left=-_e*t,this.camera.right=_e*t,this.camera.top=_e,this.camera.bottom=-_e,this.camera.updateProjectionMatrix(),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,hs)),this.renderer.setSize(e,s),(i=this.composer)==null||i.setPixelRatio(this.renderer.getPixelRatio()),(r=this.composer)==null||r.setSize(e,s),this._canvasRect=null});this.renderer=new Eo({antialias:!1}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,hs)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Ao,this.renderer.outputColorSpace=ws,this.renderer.toneMapping=Xa,e.appendChild(this.renderer.domElement),this.scene=new Ro,this.scene.background=new we(657938);const s=window.innerWidth/window.innerHeight;this.camera=new Wa(-_e*s,_e*s,_e,-_e,.1,3e3),this.cameraController=new Qo(this.camera,Ii,Li),this.cameraController.update(Ii,Li,1),this.buildLighting(),window.addEventListener("resize",this.onResize),this.onResize()}buildLighting(){this.scene.add(new $o(6706500,2.2)),this.scene.add(new Io(3359846,4465169,1.1));const e=new Lo(7833804,1.25);e.position.set(1500,800,1200),e.target.position.set(1e3,0,1e3),e.castShadow=!0,e.shadow.mapSize.set(2048,2048),e.shadow.camera.near=.5,e.shadow.camera.far=4e3,e.shadow.camera.left=-1500,e.shadow.camera.right=1500,e.shadow.camera.top=1500,e.shadow.camera.bottom=-1500,this.scene.add(e),this.scene.add(e.target)}initPostProcessing(){const e=window.innerWidth,s=window.innerHeight,t=this.renderer.getPixelRatio(),i=new St(e*t,s*t,{type:Ct});this.composer=new Vo(this.renderer,i),this.composer.setSize(e,s),this.composer.setPixelRatio(t),this.composer.addPass(new Wo(this.scene,this.camera)),this.composer.addPass(new tn(new he(Math.round(De*(e/Math.max(1,s))),De),.5,.4,.3)),this.composer.addPass(new ir(sn)),this.composer.addPass(new Zo),this.composer.render()}updateCamera(e,s,t){this.cameraController.update(e,s,t)}getCanvasRect(){return this._canvasRect||(this._canvasRect=this.renderer.domElement.getBoundingClientRect()),this._canvasRect}setRenderingEnabled(e){this.renderingEnabled=e}startRenderLoop(e){if(this.animFrameId!==0)return;const s=()=>{this.animFrameId=requestAnimationFrame(s),e(),this.renderingEnabled&&(this.composer?this.composer.render():this.renderer.render(this.scene,this.camera))};s()}stopRenderLoop(){cancelAnimationFrame(this.animFrameId),this.animFrameId=0}screenToWorld(e,s){const t=this.getCanvasRect();return this._ndc.set((e-t.left)/t.width*2-1,-((s-t.top)/t.height)*2+1),this._raycaster.setFromCamera(this._ndc,this.camera),this._raycaster.ray.intersectPlane(this._groundPlane,this._worldTarget),{x:this._worldTarget.x,y:this._worldTarget.z}}dispose(){var e;this.stopRenderLoop(),window.removeEventListener("resize",this.onResize),this.renderer.dispose(),(e=this.composer)==null||e.dispose()}}function st(a){return a==="gladiator"?"gladiator":a==="ranger"||a==="amazon"?"ranger":"mage"}const j=2e3,Ae=16,Pi=200,be=60,zi=1/be,Qs=750,ar=500,Pt=6,rn=2*be,on=3*be,Et=[{x:350,y:300,halfSize:28},{x:1e3,y:250,halfSize:28},{x:1650,y:300,halfSize:28},{x:400,y:750,halfSize:28},{x:1600,y:750,halfSize:28},{x:1e3,y:1e3,halfSize:28},{x:350,y:1450,halfSize:28},{x:750,y:1700,halfSize:28},{x:1250,y:1700,halfSize:28},{x:1650,y:1450,halfSize:28}],nn=Math.round(1.5*be),ln=60,cn=Math.round(.75*be),dn=2,zt=.5,hn=1*be,pn=2*be,fn=45,un=130,mn=18,gn=55,Js=6,rr=20,At={1:{manaCost:25,cooldownTicks:30},2:{manaCost:60,cooldownTicks:180},3:{manaCost:100,cooldownTicks:300},4:{manaCost:40,cooldownTicks:120},5:{manaCost:20,cooldownTicks:24},6:{manaCost:50,cooldownTicks:24},7:{manaCost:80,cooldownTicks:240},8:{manaCost:30,cooldownTicks:90},9:{manaCost:20,cooldownTicks:24},10:{manaCost:65,cooldownTicks:180},11:{manaCost:100,cooldownTicks:300},12:{manaCost:0,cooldownTicks:0},13:{manaCost:10,cooldownTicks:30},14:{manaCost:40,cooldownTicks:360},15:{manaCost:40,cooldownTicks:480},16:{manaCost:30,cooldownTicks:180},17:{manaCost:30,cooldownTicks:150},18:{manaCost:50,cooldownTicks:300},19:{manaCost:100,cooldownTicks:480}},or=600,et={"fire.volatile_ember":{requiresAll:["fire.fireball"]},"fire.seeking_flame":{requiresAll:["fire.fireball"]},"fire.hellfire":{requiresAll:["fire.fireball"]},"fire.pyroclasm":{requiresAll:["fire.fireball"]},"fire.fire_wall":{requiresAll:["fire.fireball"],requiresAny:["fire.volatile_ember","fire.seeking_flame"]},"fire.enduring_flames":{requiresAll:["fire.fire_wall"]},"fire.searing_heat":{requiresAll:["fire.fire_wall"]},"fire.inferno_expanse":{requiresAll:["fire.fire_wall"]},"fire.meteor":{requiresAll:["fire.fire_wall"],requiresAny:["fire.enduring_flames","fire.searing_heat","fire.inferno_expanse"]},"fire.molten_impact":{requiresAll:["fire.meteor"]},"fire.blind_strike":{requiresAll:["fire.meteor"]},"fire.cataclysm":{requiresAll:["fire.meteor"]},"utility.phase_shift":{requiresAll:["utility.teleport"]},"utility.ethereal_form":{requiresAll:["utility.teleport"]},"utility.phantom_step":{requiresAll:["utility.teleport"],requiresAny:["utility.phase_shift","utility.ethereal_form"]},"archer.guided":{requiresAll:["archer.power_shot"]},"archer.multishot":{requiresAll:["archer.power_shot"]},"archer.homing":{requiresAll:["archer.guided"]},"archer.barrage":{requiresAll:["archer.multishot"]},"archer.rain_of_arrows":{requiresAll:["archer.power_shot"],requiresAny:["archer.homing","archer.barrage"]},"archer.sustained_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.piercing_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.wide_rain":{requiresAll:["archer.rain_of_arrows"]},"archer.burn":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.freeze","archer.poison"]},"archer.freeze":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.poison"]},"archer.poison":{requiresAll:["archer.rain_of_arrows"],requiresAny:["archer.sustained_rain","archer.piercing_rain","archer.wide_rain"],mutuallyExclusive:["archer.burn","archer.freeze"]},"archer_utility.combat_roll":{requiresAll:["archer_utility.evade"]},"archer_utility.shadowstep":{requiresAll:["archer_utility.evade"]},"archer_utility.acrobatics":{requiresAll:["archer_utility.evade"],requiresAny:["archer_utility.combat_roll","archer_utility.shadowstep"]},"arms.heavy_thrust":{requiresAll:["arms.jab"]},"arms.spear_throw":{requiresAll:["arms.jab"]},"arms.stunning_blow":{requiresAll:["arms.spear_throw"]},"arms.leap":{requiresAll:["arms.spear_throw"],requiresAny:["arms.heavy_thrust","arms.stunning_blow"]},"arms.crushing_landing":{requiresAll:["arms.leap"]},"bulwark.mobile_guard":{requiresAll:["bulwark.bracing"]},"bulwark.reflect":{requiresAll:["bulwark.bracing"]},"bulwark.perfect_guard":{requiresAll:["bulwark.reflect"]},"frost.bitter_chill":{requiresAll:["frost.ice_bolt"]},"frost.ice_lance":{requiresAll:["frost.ice_bolt"]},"frost.ice_ray":{requiresAll:["frost.ice_bolt"]},"frost.frostbite":{requiresAll:["frost.ice_bolt"]},"frost.splintering_ice":{requiresAll:["frost.ice_bolt"]},"frost.blizzard":{requiresAll:["frost.ice_bolt"],requiresAny:["frost.bitter_chill","frost.ice_lance","frost.ice_ray"]},"frost.lingering_winter":{requiresAll:["frost.blizzard"]},"frost.deepening_cold":{requiresAll:["frost.blizzard"]},"frost.whiteout":{requiresAll:["frost.blizzard"]},"frost.frozen_orb":{requiresAll:["frost.blizzard"],requiresAny:["frost.lingering_winter","frost.deepening_cold","frost.whiteout"]},"frost.shard_storm":{requiresAll:["frost.frozen_orb"]},"frost.glacial_drift":{requiresAll:["frost.frozen_orb"]},"frost.cold_mastery":{requiresAll:["frost.frozen_orb"]},"hunter.serrated_spikes":{requiresAll:["hunter.spike_trap"]},"hunter.trap_cache":{requiresAll:["hunter.spike_trap"]},"hunter.tripwire":{requiresAll:["hunter.spike_trap"]},"hunter.shrapnel":{requiresAll:["hunter.spike_trap"]},"hunter.caltrops":{requiresAll:["hunter.spike_trap"],requiresAny:["hunter.serrated_spikes","hunter.trap_cache","hunter.tripwire","hunter.shrapnel"]},"hunter.rusted_barbs":{requiresAll:["hunter.caltrops"]},"hunter.wide_scatter":{requiresAll:["hunter.caltrops"]},"hunter.barbed_wire":{requiresAll:["hunter.caltrops"]},"hunter.deadfall":{requiresAll:["hunter.caltrops"],requiresAny:["hunter.rusted_barbs","hunter.wide_scatter","hunter.barbed_wire"]},"hunter.heavy_jaws":{requiresAll:["hunter.deadfall"]},"hunter.cascade":{requiresAll:["hunter.deadfall"]},"hunter.field_kit":{requiresAll:["hunter.deadfall"]}};function ut(a,e){const s=et[a];return s?!(s.requiresAll&&!s.requiresAll.every(t=>e.has(t))||s.requiresAny&&!s.requiresAny.some(t=>e.has(t))||s.mutuallyExclusive&&s.mutuallyExclusive.some(t=>e.has(t))):!0}const Z=[{id:"fire.fireball",name:"Fireball",tree:"fire",tier:1,cost:1,isSpell:!0,description:"Fast projectile. 80–120 damage."},{id:"fire.volatile_ember",name:"Volatile Ember",tree:"fire",tier:2,cost:1,isSpell:!1,description:"The blast bursts into homing embers. +1 ember per rank.",stackable:{softCap:5,baseEffect:1},keystone:{name:"Chain Reaction",description:"An ember that hits bursts into 2 more."}},{id:"fire.seeking_flame",name:"Seeking Flame",tree:"fire",tier:2,cost:1,isSpell:!1,description:"Homing toward enemy. Stronger per rank.",stackable:{softCap:5,baseEffect:12},keystone:{name:"Hunter's Ember",description:"A fireball that would die against a wall curls around for one more pass."}},{id:"fire.hellfire",name:"Hellfire",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Larger, slower, harder-hitting fireball per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Rolling Doom",description:"Too massive to stop — plows through players and detonates at the end of its flight."}},{id:"fire.pyroclasm",name:"Ricochet",tree:"fire",tier:3,cost:2,isSpell:!1,description:"Fireballs bounce off pillars and walls. +1 bounce per rank, +12% damage each.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Perpetual Flame",description:"Unlimited bounces. Dies only on a player hit or after 4s."}},{id:"fire.fire_wall",name:"Fire Wall",tree:"fire",tier:4,cost:2,isSpell:!0,description:"Persistent fire barrier. 40 dmg/s."},{id:"fire.enduring_flames",name:"Enduring Flames",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+10% Fire Wall duration per rank. The wall burns hotter as it ages, 25→55 dmg/s.",stackable:{softCap:5,baseEffect:.1},keystone:{name:"Eternal Pyre",description:"Duration only ticks down while nobody is touching the wall."}},{id:"fire.searing_heat",name:"Searing Heat",tree:"fire",tier:5,cost:2,isSpell:!1,description:"+8% Fire Wall damage per rank. Your fireballs crossing your own wall gain +25% damage and +50% blast.",stackable:{softCap:5,baseEffect:.08},keystone:{name:"Blastfurnace",description:"A fireball crossing your wall also gains a free bounce and a free ember burst."}},{id:"fire.inferno_expanse",name:"Inferno Expanse",tree:"fire",tier:5,cost:1,isSpell:!1,description:"+25% Fire Wall length and width per rank. The wall grows outward over its lifetime.",stackable:{softCap:5,baseEffect:.25},keystone:{name:"Firestorm",description:"The wall rotates around its midpoint, sweeping the area."}},{id:"fire.meteor",name:"Meteor",tree:"fire",tier:6,cost:3,isSpell:!0,description:"Delayed AoE strike. 200–280 damage. The impact smolders briefly."},{id:"fire.molten_impact",name:"Molten Impact",tree:"fire",tier:7,cost:2,isSpell:!1,description:"The impact shatters into flaming chunks. +1 chunk per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Ejecta",description:"Chunks leave burning craters."}},{id:"fire.blind_strike",name:"Guided Descent",tree:"fire",tier:7,cost:2,isSpell:!1,description:"Steer the Meteor mid-fall. Wider steering radius per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Falling Star",description:"For its last 0.5s the meteor steers itself toward the nearest enemy."}},{id:"fire.cataclysm",name:"Cataclysm",tree:"fire",tier:7,cost:2,isSpell:!1,description:"The meteor comes as a shower. +1 extra meteor per rank at 60% size.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Extinction",description:"The shower falls in a converging spiral and the final impact is full-size."}},{id:"utility.teleport",name:"Teleport",tree:"utility",tier:1,cost:1,isSpell:!0,description:"Instant displacement."},{id:"utility.phase_shift",name:"Phase Shift",tree:"utility",tier:2,cost:2,isSpell:!1,description:"+8% teleport range per rank.",stackable:{softCap:5,baseEffect:.08}},{id:"utility.ethereal_form",name:"Ethereal Form",tree:"utility",tier:2,cost:2,isSpell:!1,description:"0.5s invulnerability after teleporting."},{id:"utility.phantom_step",name:"Phantom Step",tree:"utility",tier:3,cost:3,isSpell:!1,description:"Next cast is instant within 2s of teleporting."},{id:"archer.power_shot",name:"Power Shot",tree:"archer",tier:1,cost:1,isSpell:!0,description:"Fast arrow projectile. 60–90 damage."},{id:"archer.guided",name:"Guided",tree:"archer",tier:2,cost:2,isSpell:!1,description:"Power Shot snaps toward the nearest enemy after 0.5s. Extra ranks add more redirects (max 4). Each completed redirect adds +5% damage.",stackable:{softCap:4,baseEffect:1},keystone:{name:"Relentless",description:"Redirects never run out — the arrow re-acquires until it hits something."}},{id:"archer.multishot",name:"Multi-shot",tree:"archer",tier:2,cost:2,isSpell:!0,description:"Fire 3 arrows in a spread. 40–60 damage each."},{id:"archer.homing",name:"Homing",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Guided redirects happen sooner per rank.",stackable:{softCap:3,baseEffect:6},keystone:{name:"Predator",description:"Redirects lead the target, aiming where they are moving."}},{id:"archer.barrage",name:"Barrage",tree:"archer",tier:3,cost:2,isSpell:!1,description:"Multi-shot gains extra arrows per rank.",stackable:{softCap:5,baseEffect:2},keystone:{name:"Echo Volley",description:"0.25s after Multi-shot, a second volley fires at the same angles for 35% damage."}},{id:"archer.rain_of_arrows",name:"Rain of Arrows",tree:"archer",tier:4,cost:2,isSpell:!0,description:"Mark a zone. Arrows rain after 1.5s. 150–220 AoE damage."},{id:"archer.sustained_rain",name:"Sustained Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"Rain zone lasts longer per rank.",stackable:{softCap:5,baseEffect:.35},keystone:{name:"Stormcall",description:"The rain zone slowly drifts toward the nearest enemy."}},{id:"archer.piercing_rain",name:"Piercing Rain",tree:"archer",tier:5,cost:2,isSpell:!1,description:"Rain damage increases per rank.",stackable:{softCap:3,baseEffect:.25},keystone:{name:"Exposed",description:"Enemies inside your rain zone take +15% damage from all your attacks."}},{id:"archer.wide_rain",name:"Wide Rain",tree:"archer",tier:5,cost:1,isSpell:!1,description:"+15% Rain of Arrows radius per rank.",stackable:{softCap:5,baseEffect:.15},keystone:{name:"Twin Storm",description:"Casting also marks a half-size zone on the enemy's position."}},{id:"archer.burn",name:"Burn",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows burn. More damage per rank.",stackable:{softCap:3,baseEffect:12},keystone:{name:"Ignite",description:"Hitting a burning enemy detonates the burn for 40 burst damage."}},{id:"archer.freeze",name:"Freeze",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows freeze. Stronger slow per rank.",stackable:{softCap:3,baseEffect:.09},keystone:{name:"Deep Freeze",description:"The first freeze roots the target for 0.4s (once per 6s per target)."}},{id:"archer.poison",name:"Poison",tree:"archer",tier:6,cost:3,isSpell:!1,description:"Arrows poison. More damage and mana drain per rank.",stackable:{softCap:3,baseEffect:7},keystone:{name:"Withering Venom",description:"Poison also drains 10 mana per second."}},{id:"archer_utility.evade",name:"Evade",tree:"archer_utility",tier:1,cost:1,isSpell:!0,description:"Short dash with invulnerability frames (~0.3s)."},{id:"archer_utility.combat_roll",name:"Combat Roll",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Fire an arrow at the nearest enemy during evade."},{id:"archer_utility.shadowstep",name:"Shadowstep",tree:"archer_utility",tier:2,cost:2,isSpell:!1,description:"Become invisible for 0.5s after evading."},{id:"archer_utility.acrobatics",name:"Acrobatics",tree:"archer_utility",tier:3,cost:3,isSpell:!1,description:"Evade cooldown reduced per rank.",stackable:{softCap:3,baseEffect:.1},keystone:{name:"Second Wind",description:"Evade holds 2 charges."}},{id:"arms.jab",name:"Jab",tree:"arms",tier:1,cost:1,isSpell:!0,description:"Short spear thrust. 75–100 damage."},{id:"arms.heavy_thrust",name:"Heavy Thrust",tree:"arms",tier:2,cost:1,isSpell:!1,description:"+8% Jab damage per rank.",stackable:{softCap:5,baseEffect:.08},keystone:{name:"Executioner's Thrust",description:"Jab deals +50% damage to stunned or slowed targets."}},{id:"arms.spear_throw",name:"Spear Throw",tree:"arms",tier:2,cost:2,isSpell:!0,description:"Thrown spear. 70–100 damage, stuns for 1s."},{id:"arms.stunning_blow",name:"Stunning Blow",tree:"arms",tier:3,cost:2,isSpell:!1,description:"+15% Spear Throw stun duration per rank.",stackable:{softCap:3,baseEffect:.15}},{id:"arms.leap",name:"Leap",tree:"arms",tier:4,cost:2,isSpell:!0,description:"Leap to a point. Enemies at the landing are slowed."},{id:"arms.crushing_landing",name:"Crushing Landing",tree:"arms",tier:5,cost:1,isSpell:!1,description:"Stronger landing slow per rank.",stackable:{softCap:3,baseEffect:.1}},{id:"bulwark.bracing",name:"Bracing",tree:"bulwark",tier:1,cost:1,isSpell:!1,description:"+2% Block damage reduction per rank.",stackable:{softCap:5,baseEffect:.02},keystone:{name:"Riposte",description:"Blocked hits build stacks; at 3 your next Jab within 3s is free, ignores cooldown, and stuns for 0.5s."}},{id:"bulwark.mobile_guard",name:"Mobile Guard",tree:"bulwark",tier:2,cost:1,isSpell:!1,description:"Move faster while blocking per rank.",stackable:{softCap:3,baseEffect:.08}},{id:"bulwark.reflect",name:"Reflect",tree:"bulwark",tier:2,cost:2,isSpell:!0,description:"For 1s, incoming projectiles fly back at their owner."},{id:"bulwark.perfect_guard",name:"Perfect Guard",tree:"bulwark",tier:3,cost:2,isSpell:!1,description:"+15% Reflect window per rank.",stackable:{softCap:3,baseEffect:.15}},{id:"frost.ice_bolt",name:"Ice Bolt",tree:"frost",tier:1,cost:1,isSpell:!0,description:"Fast projectile that chills on hit. 60–85 damage."},{id:"frost.bitter_chill",name:"Bitter Chill",tree:"frost",tier:2,cost:1,isSpell:!1,description:"Ice Bolt's chill is stronger and lasts longer per rank.",stackable:{softCap:5,baseEffect:.05},keystone:{name:"Flash Freeze",description:"An Ice Bolt hitting an unchilled target roots them for 0.4s (once per 6s per target)."}},{id:"frost.ice_lance",name:"Ice Lance",tree:"frost",tier:2,cost:1,isSpell:!1,description:"Ice Bolt pierces one additional enemy per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Impaler",description:"Pierce is unlimited, and each enemy pierced adds +8% damage to later hits."}},{id:"frost.ice_ray",name:"Ice Ray",tree:"frost",tier:2,cost:2,isSpell:!0,description:"Hold to channel a beam. Damage, mana cost and width all grow the longer you hold. You move at 35% speed while channelling."},{id:"frost.frostbite",name:"Frostbite",tree:"frost",tier:3,cost:2,isSpell:!1,description:"Ice Bolt deals more damage the more slowed the target is.",stackable:{softCap:3,baseEffect:.1},keystone:{name:"Rimeheart",description:"The bonus applies to all your frost damage against that target, not just Ice Bolt."}},{id:"frost.splintering_ice",name:"Splintering Ice",tree:"frost",tier:3,cost:2,isSpell:!1,description:"Ice Bolt shatters into shards on impact. One more shard per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Flechette",description:"Shards home toward the nearest enemy instead of scattering."}},{id:"frost.blizzard",name:"Blizzard",tree:"frost",tier:4,cost:2,isSpell:!0,description:"Persistent field. 45 dmg/s, chills anyone inside."},{id:"frost.lingering_winter",name:"Lingering Winter",tree:"frost",tier:5,cost:1,isSpell:!1,description:"+10% Blizzard duration per rank.",stackable:{softCap:5,baseEffect:.1},keystone:{name:"Permafrost",description:"An expiring Blizzard leaves chilled ground for 2s — no damage, but the chill continues."}},{id:"frost.deepening_cold",name:"Deepening Cold",tree:"frost",tier:5,cost:2,isSpell:!1,description:"+8% Blizzard damage per rank.",stackable:{softCap:5,baseEffect:.08},keystone:{name:"Absolute Zero",description:"Standing in your Blizzard for 1.5s roots for 0.4s (once per 6s per target)."}},{id:"frost.whiteout",name:"Whiteout",tree:"frost",tier:5,cost:1,isSpell:!1,description:"+20% Blizzard radius per rank.",stackable:{softCap:5,baseEffect:.2},keystone:{name:"Blinding Squall",description:"Enemies inside your Blizzard cannot see your spell impact indicators."}},{id:"frost.frozen_orb",name:"Frozen Orb",tree:"frost",tier:6,cost:3,isSpell:!0,description:"Drifts forward spraying ice shards, then expires. 25–40 per shard."},{id:"frost.shard_storm",name:"Shard Storm",tree:"frost",tier:7,cost:2,isSpell:!1,description:"Frozen Orb fires more shards per volley per rank.",stackable:{softCap:3,baseEffect:2},keystone:{name:"Cataclysmic Orb",description:"The orb detonates when it expires: 120 damage in a 100-unit radius."}},{id:"frost.glacial_drift",name:"Glacial Drift",tree:"frost",tier:7,cost:1,isSpell:!1,description:"Frozen Orb travels slower and lives longer per rank.",stackable:{softCap:5,baseEffect:.12}},{id:"frost.cold_mastery",name:"Cold Mastery",tree:"frost",tier:7,cost:2,isSpell:!1,description:"+6% damage to all frost spells per rank.",stackable:{softCap:5,baseEffect:.06},keystone:{name:"Absolute Cold",description:"Your chill lasts 50% longer."}},{id:"hunter.spike_trap",name:"Spike Trap",tree:"hunter",tier:1,cost:1,isSpell:!0,description:"Plant a dormant trap. Arms in 0.5s and fires once when an enemy comes near. 80–110 damage."},{id:"hunter.serrated_spikes",name:"Serrated Spikes",tree:"hunter",tier:2,cost:1,isSpell:!1,description:"+8% Spike Trap damage per rank.",stackable:{softCap:5,baseEffect:.08},keystone:{name:"Hamstring",description:"A triggered trap also slows 40% for 2s."}},{id:"hunter.trap_cache",name:"Trap Cache",tree:"hunter",tier:2,cost:1,isSpell:!1,description:"Keep one more trap armed at once per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Quick Hands",description:"Traps arm instantly."}},{id:"hunter.tripwire",name:"Tripwire",tree:"hunter",tier:3,cost:2,isSpell:!1,description:"+15% trap trigger radius per rank.",stackable:{softCap:5,baseEffect:.15},keystone:{name:"Countermeasure",description:"Traps also trigger when an enemy dash, leap or teleport ends nearby."}},{id:"hunter.shrapnel",name:"Shrapnel",tree:"hunter",tier:3,cost:2,isSpell:!1,description:"A triggered trap throws arrow shards outward. One more shard per rank.",stackable:{softCap:3,baseEffect:1},keystone:{name:"Scattershot",description:"Shards home toward the nearest enemy."}},{id:"hunter.caltrops",name:"Caltrops",tree:"hunter",tier:4,cost:2,isSpell:!0,description:"Scatter a wide field. Little damage, but anyone inside is badly slowed."},{id:"hunter.rusted_barbs",name:"Rusted Barbs",tree:"hunter",tier:5,cost:2,isSpell:!1,description:"Caltrops slow harder per rank.",stackable:{softCap:5,baseEffect:.1},keystone:{name:"Mire",description:"The slow lingers 1.5s after leaving the field."}},{id:"hunter.wide_scatter",name:"Wide Scatter",tree:"hunter",tier:5,cost:1,isSpell:!1,description:"+20% Caltrops radius per rank.",stackable:{softCap:5,baseEffect:.2},keystone:{name:"Second Handful",description:"Casting also scatters a half-size patch at your own feet."}},{id:"hunter.barbed_wire",name:"Barbed Wire",tree:"hunter",tier:5,cost:2,isSpell:!1,description:"+8% Caltrops damage per rank.",stackable:{softCap:5,baseEffect:.08},keystone:{name:"Bleeding Ground",description:"Leaving the field carries a 3s bleed."}},{id:"hunter.deadfall",name:"Deadfall",tree:"hunter",tier:6,cost:3,isSpell:!0,description:"A heavy trap. 180–240 damage, and it sets off your nearby armed traps where they stand."},{id:"hunter.heavy_jaws",name:"Heavy Jaws",tree:"hunter",tier:7,cost:2,isSpell:!1,description:"+10% Deadfall damage per rank.",stackable:{softCap:3,baseEffect:.1},keystone:{name:"Maimed",description:"Deadfall roots for 0.4s."}},{id:"hunter.cascade",name:"Cascade",tree:"hunter",tier:7,cost:2,isSpell:!1,description:"Traps set off by Deadfall deal +15% damage per rank.",stackable:{softCap:3,baseEffect:.15},keystone:{name:"Daisy Chain",description:"Deadfall sets off every armed trap you own, at any range."}},{id:"hunter.field_kit",name:"Field Kit",tree:"hunter",tier:7,cost:1,isSpell:!1,description:"−8% cooldown on all Hunter spells per rank.",stackable:{softCap:5,baseEffect:.08},keystone:{name:"Rearm",description:"A trap that triggers refunds half its cooldown."}}];new Map(Z.map(a=>[a.id,a]));const Ue=[{spell:1,node:"fire.fireball",defaultSlot:1,charClass:"mage"},{spell:2,node:"fire.fire_wall",defaultSlot:2,charClass:"mage"},{spell:3,node:"fire.meteor",defaultSlot:3,charClass:"mage"},{spell:4,node:"utility.teleport",defaultSlot:4,charClass:"mage"},{spell:9,node:"frost.ice_bolt",charClass:"mage"},{spell:10,node:"frost.blizzard",charClass:"mage"},{spell:11,node:"frost.frozen_orb",charClass:"mage"},{spell:12,node:"frost.ice_ray",charClass:"mage"},{spell:5,node:"archer.power_shot",defaultSlot:1,charClass:"ranger"},{spell:6,node:"archer.multishot",defaultSlot:2,charClass:"ranger"},{spell:7,node:"archer.rain_of_arrows",defaultSlot:3,charClass:"ranger"},{spell:8,node:"archer_utility.evade",defaultSlot:4,charClass:"ranger"},{spell:13,node:"arms.jab",defaultSlot:1,charClass:"gladiator"},{spell:14,node:"arms.spear_throw",defaultSlot:2,charClass:"gladiator"},{spell:15,node:"bulwark.reflect",defaultSlot:3,charClass:"gladiator"},{spell:16,node:"arms.leap",defaultSlot:4,charClass:"gladiator"},{spell:17,node:"hunter.spike_trap",charClass:"ranger"},{spell:18,node:"hunter.caltrops",charClass:"ranger"},{spell:19,node:"hunter.deadfall",charClass:"ranger"}],xn={mage:4,ranger:8,gladiator:16},bn=new Set(Ue.map(a=>a.spell));function gi(a,e){const s=new Array(Pt).fill(null),t=new Set,i=(r,o)=>{s[r]=o,t.add(o)};for(const r of e){if(!Number.isInteger(r.slot)||r.slot<1||r.slot>Pt||!bn.has(r.spell))continue;const o=r.spell;a.has(o)&&(t.has(o)||s[r.slot-1]===null&&i(r.slot-1,o))}if(t.size>0)return s;for(const r of Ue){if(!a.has(r.spell)||t.has(r.spell)||r.defaultSlot===void 0)continue;const o=r.defaultSlot-1;s[o]===null&&i(o,r.spell)}for(const r of Ue){if(!a.has(r.spell)||t.has(r.spell))continue;const o=s.indexOf(null);if(o===-1)break;i(o,r.spell)}return s}const ps={mage:"fire.fireball",ranger:"archer.power_shot",gladiator:"arms.jab"};function vn(a){return or*(a>0?1+qe(.08,a):1)}const yn=.7;function qe(a,e){return e<=0?0:a*Math.pow(e,yn)}function wn(a){const e=a.get("archer.burn")??0,s=a.get("archer.freeze")??0,t=a.get("archer.poison")??0,i=Math.max(e,s,t);return i<=0?"none":e===i?"burn":s===i?"freeze":"poison"}function We(a){return a.stackable!==void 0}function tt(a,e){if(!a.stackable)return e===0?a.cost:1/0;const s=e+1,t=Math.max(0,s-a.stackable.softCap);return a.cost+t}function kn(a,e){let s=0;for(let t=0;t<e;t++)s+=tt(a,t);return s}function nr(a){return{x:Math.max(Ae,Math.min(j-Ae,a.x)),y:Math.max(Ae,Math.min(j-Ae,a.y))}}function lr(a){let e={...a};for(const s of Et){const t=s.x-s.halfSize-Ae,i=s.x+s.halfSize+Ae,r=s.y-s.halfSize-Ae,o=s.y+s.halfSize+Ae;if(e.x>t&&e.x<i&&e.y>r&&e.y<o){const n=e.x-t,l=i-e.x,d=e.y-r,h=o-e.y,p=Math.min(n,l,d,h);p===n?e.x=t:p===l?e.x=i:p===d?e.y=r:e.y=o}}return e}function qi(a,e,s=or){const t=e.x-a.x,i=e.y-a.y,r=Math.sqrt(t*t+i*i),o=r>s?{x:a.x+t/r*s,y:a.y+i/r*s}:{x:e.x,y:e.y};return lr(nr(o))}function Oi(a,e,s=1){const t=Math.sqrt(e.x*e.x+e.y*e.y);if(t===0)return a;const i=e.x/t,r=e.y/t,o={x:a.x+i*Pi*zi*s,y:a.y+r*Pi*zi*s};return lr(nr(o))}const _n=6,Fi=[{id:"mage",label:"Mage",enabled:!0},{id:"ranger",label:"Ranger",enabled:!0},{id:"gladiator",label:"Gladiator",enabled:!0}];function Sn(a){return Math.floor(100*Math.pow(a,1.5))}const Le={walk:{frames:9,singleRow:!1,fps:12},run:{frames:8,singleRow:!1,fps:12},idle:{frames:2,singleRow:!1,fps:2},spellcast:{frames:7,singleRow:!1,fps:12},shoot:{frames:13,singleRow:!1,fps:14},hurt:{frames:6,singleRow:!0,fps:8},slash:{frames:6,singleRow:!1,fps:14},thrust:{frames:8,singleRow:!1,fps:14}},Ls={purple:"#8a5fc4",green:"#4d8f4d",black:"#4a4a52",brown:"#7d5a38",red:"#c0503a",blue:"#4a6fc4",white:"#f0f0f0",blonde:"#d9b256",gray:"#9a9aa2"},Cn={olive:"#ae6b3f",bronze:"#7f4c31",brown:"#76513a",black:"#442725"},jt={mage:{body:"male",skin:"light",hairStyle:null,hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"purple",legsColor:"black",hat:"wizard",hatColor:"base_black"},ranger:{body:"female",skin:"light",hairStyle:"ponytail",hairColor:"red",eyes:null,torso:"longsleeve",torsoColor:"green",legsColor:"brown",hat:null,hatColor:"base_black"},gladiator:{body:"male",skin:"bronze",hairStyle:"plain",hairColor:"black",eyes:null,torso:"longsleeve",torsoColor:"red",legsColor:"brown",hat:null,hatColor:"base_black"}},Y={body:["male","female"],skin:["light","olive","bronze","brown","black"],hairStyle:[null,"ponytail","plain","long","curly_short","bangs"],hairColor:["red","blonde","brown","black","gray","blue","green","purple","white"],eyes:[null,"blue","brown","green","gray"],torsoColor:["purple","green","red","blue","brown","black","white"],legsColor:["black","brown","blue","green","red","white"]},Mn=new Set(["ponytail"]);function Tn(a){const e=[],s=Cn[a.skin],t=Ls[a.hairColor],i=a.hairStyle!=null&&Mn.has(a.hairStyle);return a.hairStyle&&i&&e.push({path:`hair/${a.hairStyle}/adult/bg`,z:0,tint:t,tintMode:"fabric"}),e.push({path:`body/bodies/${a.body}`,z:10,tint:s,tintMode:"skin"}),e.push({path:`head/heads/human/${a.body==="female"?"female_small":"male"}`,z:20,tint:s,tintMode:"skin"}),a.eyes&&e.push({path:`eyes/human/adult/default/${a.eyes}`,z:25}),a.hairStyle&&(i?e.push({path:`hair/${a.hairStyle}/adult/fg`,z:30,tint:t,tintMode:"fabric"}):e.push({path:`hair/${a.hairStyle}/adult`,z:30,tint:t,tintMode:"fabric"})),e.push({path:`torso/clothes/${a.torso}/${a.torso}/${a.body}`,z:40,tint:Ls[a.torsoColor],tintMode:"fabric"}),e.push({path:`legs/pants/${a.body==="female"?"thin":"male"}`,z:50,tint:Ls[a.legsColor],tintMode:"fabric"}),a.hat&&e.push({path:`hat/magic/${a.hat}/base/adult/${a.hatColor}`,z:60}),e.sort((r,o)=>r.z-o.z)}function ze(a,e){return e.includes(a)}function Ni(a,e){const s=jt[e];if(typeof a!="object"||a===null)return{...s};const t=a;return{body:ze(t.body,Y.body)?t.body:s.body,skin:ze(t.skin,Y.skin)?t.skin:s.skin,hairStyle:ze(t.hairStyle,Y.hairStyle)?t.hairStyle:s.hairStyle,hairColor:ze(t.hairColor,Y.hairColor)?t.hairColor:s.hairColor,eyes:ze(t.eyes,Y.eyes)?t.eyes:s.eyes,torso:s.torso,torsoColor:ze(t.torsoColor,Y.torsoColor)?t.torsoColor:s.torsoColor,legsColor:ze(t.legsColor,Y.legsColor)?t.legsColor:s.legsColor,hat:s.hat,hatColor:s.hatColor}}function En(a,e=Math.random){const s=jt[a],t=i=>i[Math.floor(e()*i.length)];return{body:t(Y.body),skin:t(Y.skin),hairStyle:t(Y.hairStyle),hairColor:t(Y.hairColor),eyes:null,torso:s.torso,torsoColor:t(Y.torsoColor),legsColor:t(Y.legsColor),hat:s.hat,hatColor:s.hatColor}}function Bi(a){return{body:a.body,skin:a.skin,hair_style:a.hairStyle,hair_color:a.hairColor,eyes:a.eyes,torso_color:a.torsoColor,legs_color:a.legsColor}}function _s(a,e){if(typeof a!="object"||a===null)return Ni(a,e);const s=a;return Ni({body:s.body,skin:s.skin,hairStyle:s.hair_style,hairColor:s.hair_color,eyes:s.eyes,torso:s.torso,torsoColor:s.torso_color,legsColor:s.legs_color,hat:s.hat,hatColor:s.hat_color},e)}const An=new Set(["damage_pct","cast_speed_pct","move_speed_pct","mana_regen_pct"]),cr={max_health:"Max Health",max_mana:"Max Mana",damage_pct:"Damage",cast_speed_pct:"Cast Speed",move_speed_pct:"Move Speed",mana_regen_pct:"Mana Regen"};function fs(a,e){return`${e<0?"-":"+"}${Math.abs(e)}${An.has(a)?"%":""}`}function nt(a){return a.id==="talent"?`+${a.value} Talent Rank`:`${fs(a.id,a.value)} ${cr[a.id]}`}function Rn(a){return a.id!=="talent"&&a.value<0}function dr(a){if(a.min===a.max)return null;const e=fs(a.id,a.min),s=fs(a.id,a.max);return a.max<0?`${e} → ${s}`:`${e}–${s}`}function $n(a){return cr[a]}const Ye={maxHp:Qs,maxMana:ar,damageMult:1,cooldownMult:1,moveSpeedMult:1,manaRegenMult:1},Hi={max_health:[[20,40],[40,70],[70,110],[110,160]],max_mana:[[15,30],[30,50],[50,80],[80,120]],damage_pct:[[2,4],[4,7],[7,11],[11,15]],cast_speed_pct:[[2,3],[3,5],[5,8],[8,10]],move_speed_pct:[[2,3],[3,4],[4,6],[6,8]],mana_regen_pct:[[5,10],[10,15],[15,25],[25,35]],talent:[[1,1],[1,1],[1,2],[1,3]]},ei=[1,4,7,10],hr=["max_health","max_mana","damage_pct","cast_speed_pct","move_speed_pct","mana_regen_pct"],In={move_speed_pct:["leggings"]};function Ln(a){return hr.filter(e=>{const s=In[e];return!s||s.includes(a.slot)})}const G=[{id:"leather_cap",slot:"helmet",name:"Leather Cap",icon:"fa-helmet-safety",itemLevel:1,implicit:{id:"max_health",value:15},lpc:{layers:[{path:"hat/cloth/leather_cap/adult/leather",z:60}]}},{id:"iron_helm",slot:"helmet",name:"Iron Helm",icon:"fa-helmet-safety",itemLevel:7,implicit:{id:"max_health",value:60},lpc:{layers:[{path:"hat/helmet/barbuta/{body}",z:60}],hidesHair:!0}},{id:"padded_tunic",slot:"armor",name:"Padded Tunic",icon:"fa-shirt",itemLevel:1,implicit:{id:"max_health",value:25},lpc:{layers:[{path:"torso/armour/leather/{body}",z:40}]}},{id:"scale_mail",slot:"armor",name:"Scale Mail",icon:"fa-shirt",itemLevel:7,implicit:{id:"max_health",value:90},lpc:{layers:[{path:"torso/chainmail/{body}",z:40}]}},{id:"cloth_pants",slot:"leggings",name:"Cloth Pants",icon:"fa-socks",itemLevel:1,implicit:{id:"max_health",value:10},lpc:{layers:[{path:"legs/pants/{legs}",z:50,tint:"#c9a86a",tintMode:"fabric"}]}},{id:"mail_leggings",slot:"leggings",name:"Mail Leggings",icon:"fa-socks",itemLevel:7,implicit:{id:"max_health",value:45},lpc:{layers:[{path:"legs/leggings/{legs}",z:50,tint:"#9a9aa2",tintMode:"fabric"}]}},{id:"bone_ring",slot:"ring",name:"Bone Ring",icon:"fa-ring",itemLevel:1,implicit:{id:"max_mana",value:10}},{id:"silver_ring",slot:"ring",name:"Silver Ring",icon:"fa-ring",itemLevel:4,implicit:{id:"max_mana",value:18}},{id:"carved_amulet",slot:"amulet",name:"Carved Amulet",icon:"fa-gem",itemLevel:4,implicit:{id:"max_mana",value:25}},{id:"moon_amulet",slot:"amulet",name:"Moon Amulet",icon:"fa-gem",itemLevel:7,implicit:{id:"max_mana",value:25}},{id:"apprentice_staff",slot:"weapon",name:"Apprentice Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:1,implicit:{id:"damage_pct",value:2},lpc:{layers:[{path:"weapon/magic/simple/background/simple",z:5,weaponRole:"behind"},{path:"weapon/magic/simple/foreground/simple",z:70,weaponRole:"front"}]}},{id:"gnarled_staff",slot:"weapon",name:"Gnarled Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:7,implicit:{id:"damage_pct",value:6},lpc:{layers:[{path:"weapon/magic/gnarled/universal/background/gnarled",z:5,weaponRole:"behind"},{path:"weapon/magic/gnarled/universal/foreground/gnarled",z:70,weaponRole:"front"}]}},{id:"archmage_staff",slot:"weapon",name:"Archmage Staff",icon:"fa-staff-snake",classRestriction:"mage",itemLevel:10,implicit:{id:"damage_pct",value:9},lpc:{layers:[{path:"weapon/magic/crystal/universal/background/purple",z:5,weaponRole:"behind"},{path:"weapon/magic/crystal/universal/foreground/purple",z:70,weaponRole:"front"}]}},{id:"short_bow",slot:"weapon",name:"Short Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:1,implicit:{id:"damage_pct",value:2},lpc:{layers:[{path:"weapon/ranged/bow/normal/universal/background/normal",z:5,weaponRole:"behind"},{path:"weapon/ranged/bow/normal/universal/foreground/normal",z:70,weaponRole:"front"}],nativeAnims:["shoot"]}},{id:"war_bow",slot:"weapon",name:"War Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:7,implicit:{id:"damage_pct",value:6},lpc:{layers:[{path:"weapon/ranged/bow/recurve/universal/background/recurve",z:5,weaponRole:"behind"},{path:"weapon/ranged/bow/recurve/universal/foreground/recurve",z:70,weaponRole:"front"}],nativeAnims:["shoot"]}},{id:"great_bow",slot:"weapon",name:"Great Bow",icon:"fa-crosshairs",classRestriction:"ranger",itemLevel:10,implicit:{id:"damage_pct",value:9},lpc:{layers:[{path:"weapon/ranged/bow/great/universal/background/great",z:5,weaponRole:"behind"},{path:"weapon/ranged/bow/great/universal/foreground/great",z:70,weaponRole:"front"}],nativeAnims:["shoot"]}},{id:"iron_spear",slot:"weapon",name:"Iron Spear",icon:"fa-location-arrow",classRestriction:"gladiator",itemLevel:1,implicit:{id:"damage_pct",value:2},lpc:{layers:[{path:"weapon/polearm/spear/background/iron",z:5,weaponRole:"behind"},{path:"weapon/polearm/spear/foreground/iron",z:70,weaponRole:"front"}],nativeAnims:["thrust"]}},{id:"war_spear",slot:"weapon",name:"War Spear",icon:"fa-location-arrow",classRestriction:"gladiator",itemLevel:7,implicit:{id:"damage_pct",value:6},lpc:{layers:[{path:"weapon/polearm/spear/background/steel",z:5,weaponRole:"behind"},{path:"weapon/polearm/spear/foreground/steel",z:70,weaponRole:"front"}],nativeAnims:["thrust"]}},{id:"champion_spear",slot:"weapon",name:"Champion Spear",icon:"fa-location-arrow",classRestriction:"gladiator",itemLevel:10,implicit:{id:"damage_pct",value:9},lpc:{layers:[{path:"weapon/polearm/spear/background/gold",z:5,weaponRole:"behind"},{path:"weapon/polearm/spear/foreground/gold",z:70,weaponRole:"front"}],nativeAnims:["thrust"]}}],oe=[{id:"kindling",baseId:"apprentice_staff",name:"Kindling",flavor:"Every apprentice is told not to feed it. Every apprentice does.",affixes:[{id:"damage_pct",min:4,max:6},{id:"talent",min:1,max:2,node:"fire.volatile_ember"},{id:"max_health",min:-45,max:-25}],levelReq:1,lpcTint:{color:"#ff8a3d"},aura:{style:"embers",color:[1,.45,.1],anchor:"chest",intensity:.6}},{id:"threefold_draw",baseId:"short_bow",name:"Threefold Draw",flavor:"One string. It has never agreed with itself.",affixes:[{id:"talent",min:1,max:1,node:"archer.multishot"},{id:"cast_speed_pct",min:2,max:4},{id:"max_mana",min:-33,max:-18}],levelReq:1,lpcTint:{color:"#e8e2cf",mode:"fabric"},aura:{style:"orbit",color:[.88,.9,.82],anchor:"chest",intensity:.8,motes:3}},{id:"hunters_eye",baseId:"bone_ring",name:"Hunter's Eye",flavor:"It always knows where you meant to look.",affixes:[{id:"talent",min:1,max:2,node:"fire.seeking_flame"},{id:"talent",min:1,max:2,node:"archer.guided"},{id:"max_mana",min:15,max:26},{id:"damage_pct",min:-7,max:-3}],levelReq:1,aura:{style:"orbit",color:[1,.72,.25],anchor:"chest",intensity:.5,motes:1}},{id:"widows_vow",baseId:"carved_amulet",name:"Widow's Vow",flavor:"She traded her heart's warmth for one more word with him.",affixes:[{id:"max_mana",min:60,max:90},{id:"mana_regen_pct",min:14,max:22},{id:"cast_speed_pct",min:3,max:5},{id:"max_health",min:-115,max:-75}],levelReq:4,aura:{style:"drip",color:[.7,.85,1],anchor:"chest",intensity:.7}},{id:"marshstrider_breeches",baseId:"cloth_pants",name:"Marshstrider Breeches",flavor:"Peat-stained to the knee. They remember every path out of the moor.",affixes:[{id:"move_speed_pct",min:5,max:7},{id:"max_health",min:40,max:55},{id:"cast_speed_pct",min:-6,max:-4}],levelReq:4,lpcTint:{color:"#6f8f4a",mode:"fabric"},aura:{style:"wisp",color:[.45,.7,.35],anchor:"feet",intensity:.9}},{id:"hollowhide_jerkin",baseId:"padded_tunic",name:"Hollowhide Jerkin",flavor:"Cut from something that had already learned to vanish.",affixes:[{id:"talent",min:1,max:1,node:"utility.ethereal_form"},{id:"talent",min:1,max:1,node:"archer_utility.shadowstep"},{id:"max_health",min:40,max:60},{id:"mana_regen_pct",min:-45,max:-25},{id:"damage_pct",min:-8,max:-4}],levelReq:4,lpcTint:{color:"#7d5f96",mode:"fabric"},aura:{style:"drip",color:[.55,.35,.7],anchor:"chest",intensity:.7}},{id:"cinderfall",baseId:"gnarled_staff",name:"Cinderfall",flavor:"The sky owes it a favour.",affixes:[{id:"talent",min:1,max:1,node:"fire.meteor"},{id:"damage_pct",min:4,max:8},{id:"max_mana",min:-135,max:-85},{id:"cast_speed_pct",min:-11,max:-5}],levelReq:7,lpcTint:{color:"#6b4a3a"},aura:{style:"embers",color:[1,.35,.05],anchor:"chest",intensity:1.4}},{id:"quiverfrost",baseId:"war_bow",name:"Quiverfrost",flavor:"The string does not thaw.",affixes:[{id:"talent",min:1,max:3,node:"archer.freeze"},{id:"damage_pct",min:6,max:11},{id:"max_health",min:-95,max:-55},{id:"mana_regen_pct",min:-28,max:-12}],levelReq:7,lpcTint:{color:"#9fd8f0",mode:"fabric"},aura:{style:"frost",color:[.6,.9,1],anchor:"chest",intensity:1}},{id:"doomsayers_barbute",baseId:"iron_helm",name:"Doomsayer's Barbute",flavor:"The visor is welded shut. Whoever wore it last had stopped looking.",affixes:[{id:"talent",min:1,max:3,node:"fire.cataclysm"},{id:"talent",min:1,max:3,node:"archer.wide_rain"},{id:"max_health",min:70,max:100},{id:"move_speed_pct",min:-8,max:-4}],levelReq:7,lpcTint:{color:"#b06a4a"},aura:{style:"drip",color:[.7,.3,.18],anchor:"head",intensity:.8}},{id:"emberheart",baseId:"moon_amulet",name:"Emberheart",flavor:"A cinder that never cools, warm to the touch even in the dead of winter.",affixes:[{id:"max_mana",min:48,max:72},{id:"damage_pct",min:6,max:10},{id:"talent",min:1,max:3,node:"fire.volatile_ember"},{id:"talent",min:1,max:2,node:"fire.searing_heat"}],levelReq:7,aura:{style:"orbit",color:[1,.55,.15],anchor:"chest",intensity:.8,motes:2}},{id:"windrunner_band",baseId:"bone_ring",name:"Windrunner Band",flavor:"Fletched with feathers that never touched a bird.",affixes:[{id:"move_speed_pct",min:5,max:8},{id:"cast_speed_pct",min:4,max:7},{id:"talent",min:1,max:3,node:"archer.barrage"}],levelReq:7,aura:{style:"wisp",color:[.75,.95,.8],anchor:"feet",intensity:.8}},{id:"ninefold_ember",baseId:"archmage_staff",name:"Ninefold Ember",flavor:"Nine splinters of the same falling star, bound with wire.",affixes:[{id:"talent",min:2,max:3,node:"fire.pyroclasm"},{id:"damage_pct",min:9,max:15},{id:"max_health",min:-185,max:-115},{id:"cast_speed_pct",min:-11,max:-5}],levelReq:10,lpcTint:{color:"#ffd9a0",mode:"fabric"},aura:{style:"embers",color:[1,.9,.75],anchor:"chest",intensity:1.8}},{id:"stormcallers_yew",baseId:"great_bow",name:"Stormcaller's Yew",flavor:"It bends toward weather that has not arrived yet.",affixes:[{id:"talent",min:1,max:3,node:"archer.sustained_rain"},{id:"talent",min:1,max:3,node:"archer.piercing_rain"},{id:"cast_speed_pct",min:4,max:8},{id:"max_mana",min:-150,max:-90},{id:"move_speed_pct",min:-7,max:-3}],levelReq:10,lpcTint:{color:"#9a86d6",mode:"fabric"},aura:{style:"wisp",color:[.65,.5,.95],anchor:"feet",intensity:1.2}},{id:"the_quiet_hour",baseId:"moon_amulet",name:"The Quiet Hour",flavor:"Between the last bell and the first, nothing is owed to anyone.",affixes:[{id:"talent",min:1,max:1,node:"utility.phantom_step"},{id:"talent",min:1,max:1,node:"archer_utility.combat_roll"},{id:"cast_speed_pct",min:7,max:12},{id:"max_health",min:-135,max:-85},{id:"max_mana",min:-90,max:-50}],levelReq:10,aura:{style:"orbit",color:[.85,.87,.95],anchor:"chest",intensity:.5,motes:2}}],pr=new Map(oe.map(a=>[a.id,a]));function Re(a){if(a.unique_id){const e=pr.get(a.unique_id);return e&&e.baseId===a.base_id?e:void 0}return oe.find(e=>e.baseId===a.base_id)}const Pn=.25,fr={mage:["fire","utility"],ranger:["archer","archer_utility","hunter"],gladiator:["arms","bulwark"]};function ti([a,e],s){return a+Math.floor(s()*(e-a+1))}function zn(a,e,s){const t=[...a],i=[];for(let r=0;r<e&&t.length>0;r++){const o=Math.floor(s()*t.length);i.push(t.splice(o,1)[0])}return i}function qn(a){return a.classRestriction?[a.classRestriction]:["mage","ranger","gladiator"]}function On(a,e){const s=new Set(qn(a).flatMap(o=>fr[o])),t=Z.map(o=>({node:o.id,weight:s.has(o.tree)?2:1})),i=t.reduce((o,n)=>o+n.weight,0);let r=e()*i;for(const o of t)if(r-=o.weight,r<0)return o.node;return t[t.length-1].node}function Fn(a,e,s=Math.random){if(e==="basic")return[];const t=ei.indexOf(a.itemLevel),i=e==="magic"?1+Math.floor(s()*2):3+Math.floor(s()*3),r=e!=="magic"&&s()<Pn,o=r?i-1:i,n=zn(Ln(a),o,s).map(l=>({id:l,value:ti(Hi[l][t],s)}));return r&&n.push({id:"talent",value:ti(Hi.talent[t],s),node:On(a,s)}),n}function Nn(a,e=Math.random){return a.affixes.map(s=>({id:s.id,value:ti([s.min,s.max],e),...s.node===void 0?{}:{node:s.node}}))}function Bn(a,e){let s=0,t=0;for(const i of a.affixes){if(i.max===i.min)continue;const r=e.find(o=>o.id===i.id&&o.node===i.node);r&&(s+=(r.value-i.min)/(i.max-i.min),t++)}return t===0?null:Math.min(1,Math.max(0,s/t))}function ur(a,e){const s=e.slice(0,e.indexOf("."));return fr[a].includes(s)}const Yt={maxHp:100,maxMana:50,moveSpeedMult:.75,manaRegenMult:0};function mr(a,e){let s=Ye.maxHp,t=Ye.maxMana,i=Ye.damageMult,r=Ye.cooldownMult,o=Ye.moveSpeedMult,n=Ye.manaRegenMult;const l=new Map;for(const d of a){const h=G.find(f=>f.id===d.base_id),p=h?[h.implicit,...d.affixes]:d.affixes;for(const f of p)switch(f.id){case"max_health":s+=f.value;break;case"max_mana":t+=f.value;break;case"damage_pct":i*=1+f.value/100;break;case"cast_speed_pct":r*=1-f.value/100;break;case"move_speed_pct":o*=1+f.value/100;break;case"mana_regen_pct":n*=1+f.value/100;break;case"talent":f.node&&ur(e,f.node)&&l.set(f.node,(l.get(f.node)??0)+f.value);break}}return{statBlock:{maxHp:Math.max(Yt.maxHp,s),maxMana:Math.max(Yt.maxMana,t),damageMult:i,cooldownMult:Math.max(.5,r),moveSpeedMult:Math.min(1.15,Math.max(Yt.moveSpeedMult,o)),manaRegenMult:Math.max(Yt.manaRegenMult,n)},talentRanks:l}}const Hn=["basic","magic","rare","unique"],Dn=[...hr,"talent"],Un=["weapon","helmet","armor","leggings","ring1","ring2","amulet"],jn=["starter","drop","vendor","lootbox","admin"];function Gn(a){if(typeof a!="object"||a===null)return!1;const e=a;return!(typeof e.id!="string"||!Dn.includes(e.id)||typeof e.value!="number"||e.id==="talent"&&(typeof e.node!="string"||!Z.some(s=>s.id===e.node)))}function xi(a){if(typeof a!="object"||a===null)return null;const e=a;if(typeof e.id!="string"||typeof e.base_id!="string")return null;const s=G.find(t=>t.id===e.base_id);if(!s||typeof e.rarity!="string"||!Hn.includes(e.rarity)||!Array.isArray(e.affixes)||!e.affixes.every(Gn)||typeof e.level_req!="number"||e.equipped_by!==null&&typeof e.equipped_by!="string"||e.equipped_slot!==null&&(typeof e.equipped_slot!="string"||!Un.includes(e.equipped_slot))||typeof e.slot!="string"||e.slot!==s.slot||e.source!==void 0&&(typeof e.source!="string"||!jn.includes(e.source)))return null;if(e.unique_id!==void 0&&e.unique_id!==null){if(typeof e.unique_id!="string")return null;const t=pr.get(e.unique_id);if(!t||t.baseId!==e.base_id)return null}return{id:e.id,base_id:e.base_id,rarity:e.rarity,affixes:e.affixes,level_req:e.level_req,equipped_by:e.equipped_by,equipped_slot:e.equipped_slot,slot:e.slot,unique_id:e.unique_id,source:e.source}}const Vn=["helmet","armor","leggings","weapon"],Wn={helmet:60,armor:40,leggings:50,weapon:null},Yn=30;function gr(a){const e={};for(const s of a){const t=s.equipped_slot;if(s.equipped_by===null||t===null)continue;const i=G.find(o=>o.id===s.base_id);if(!i)continue;const r=s.rarity==="unique"?Re(s):void 0;!i.lpc&&!r||(e[t]=r?{base:i.id,unique:r.id}:{base:i.id})}return e}function Xn(a,e){return a.replace("{body}",e.body).replace("{legs}",e.body==="female"?"thin":"male")}function Zn(a,e){var t;let s=Tn(a);for(const i of Vn){const r=e[i];if(!r)continue;const o=G.find(d=>d.id===r.base);if(!(o!=null&&o.lpc)||i!=="weapon"&&o.slot!==i||i==="weapon"&&o.slot!=="weapon")continue;const n=r.unique?(t=oe.find(d=>d.id===r.unique))==null?void 0:t.lpcTint:void 0,l=Wn[i];l!==null&&(s=s.filter(d=>d.z!==l)),i==="helmet"&&o.lpc.hidesHair&&(s=s.filter(d=>d.z!==Yn));for(const d of o.lpc.layers)s.push({path:Xn(d.path,a),z:d.z,tint:(n==null?void 0:n.color)??d.tint,tintMode:n?n.mode:d.tintMode,...i==="weapon"?{weapon:o.id,weaponRole:d.weaponRole,weaponNativeAnims:o.lpc.nativeAnims??[]}:{}})}return s.sort((i,r)=>i.z-r.z)}const Kn=2;function Qn(a,e=Kn){const s=[];for(const t of Object.values(a)){if(!(t!=null&&t.unique))continue;const i=oe.find(r=>r.id===t.unique);i!=null&&i.aura&&!s.includes(i)&&s.push(i)}return s.sort((t,i)=>i.levelReq-t.levelReq||oe.indexOf(t)-oe.indexOf(i)),s.slice(0,e).map(t=>({unique:t,aura:t.aura}))}const Ps={basic:150,premium:500},Jn={basic:[5,10,15,25],magic:[25,40,60,90],rare:[100,150,220,320],unique:[400,550,750,1e3]};function el(a){let e=0;for(let s=0;s<ei.length;s++)ei[s]<=a&&(e=s);return e}function tl(a,e){return Jn[a][el(e)]}const sl=6;function il(a){const e=Math.min(Math.max(a,0)/pn,1),s=(t,i)=>t+(i-t)*e;return{damagePerTick:s(fn,un)/be,manaPerTick:s(mn,gn)/be,halfWidth:s(Js,rr)}}const Xe=80;function Xt(a,e,s){const t=r=>{const o=r.clone();return o.wrapS=o.wrapT=Ja,o.repeat.set(e,s),o.needsUpdate=!0,o},i=new Ka({map:t(a.map),normalMap:a.normalMap?t(a.normalMap):null,roughnessMap:a.roughnessMap?t(a.roughnessMap):null,roughness:1,metalness:0});return i.normalScale.set(.4,.4),i}class al{constructor(e){c(this,"group",new ye);this.buildFloor(e.floor),this.buildBoundaryWalls(e.stone),this.buildPillars(e.stone)}addToScene(e){e.add(this.group)}buildFloor(e){const s=j/200,t=Xt(e,s,s),i=new H(new Za(j,j),t);i.rotation.x=-Math.PI/2,i.position.set(j/2,0,j/2),i.receiveShadow=!0,this.group.add(i)}buildBoundaryWalls(e){const t=[[j/2,-10,j+40,20],[j/2,j+10,j+40,20],[-10,j/2,20,j],[j+10,j/2,20,j]],i=new Fe(t[0][2],60,t[0][3]),r=new Fe(t[2][2],60,t[2][3]),o=Xt(e,t[0][2]/200,60/200),n=Xt(e,t[2][2]/200,60/200);t.forEach(([l,d],h)=>{const p=new H(h<2?i:r,h<2?o:n);p.position.set(l,60/2,d),p.castShadow=!0,this.group.add(p)})}buildPillars(e){const s=new Ka({color:6974122,roughness:.7,metalness:.1}),t=Et[0].halfSize*2,i=Xt(e,t/200,Xe/200),r=new Fe(t,Xe,t),o=new Fe(t+6,8,t+6),n=new pi(5,8,6),l=new U({color:16753984}),d=[{x:0,y:0},{x:j,y:0},{x:0,y:j},{x:j,y:j}],h=new Set(d.map(p=>Et.reduce((f,m)=>(m.x-p.x)**2+(m.y-p.y)**2<(f.x-p.x)**2+(f.y-p.y)**2?m:f)));Et.forEach(p=>{const f=new H(r,i);f.position.set(p.x,Xe/2,p.y),f.castShadow=!0,f.receiveShadow=!0,this.group.add(f);const m=new H(o,s);m.position.set(p.x,Xe+4,p.y),this.group.add(m);const b=new H(n,l);if(b.position.set(p.x,Xe+14,p.y),this.group.add(b),h.has(p)){const u=new Qa(16737792,3,450,2);u.position.set(p.x,Xe+60,p.y),this.group.add(u)}})}}const T=64;function is(a,e,s){const i=Le[a].singleRow?0:e;return{sx:s*T,sy:i*T}}const Di=[3,2,1,0],rl=Math.PI/12;function ol(a,e){const s=2*Math.PI,i=((a+Math.PI/4)%s+s)%s,r=Math.round(i/(Math.PI/2))%4,o=Di[r];if(e===void 0||o===e)return o;const n=Di[e]*(Math.PI/2);let l=i-n;return l>Math.PI&&(l-=s),l<-Math.PI&&(l+=s),Math.abs(l)<=Math.PI/4+rl?e:o}function as(a,e,s){const t=Le[a],i=Math.floor(e*t.fps);return s?i%t.frames:Math.min(i,t.frames-1)}function xr(a,e,s,t,i){const r=document.createElement("canvas");r.width=e,r.height=s;const o=r.getContext("2d");return o.drawImage(a,0,0),o.globalCompositeOperation="multiply",o.fillStyle=t,o.fillRect(0,0,r.width,r.height),i==="fabric"&&(o.globalCompositeOperation="screen",o.fillStyle="#464646",o.fillRect(0,0,r.width,r.height)),o.globalCompositeOperation="destination-in",o.drawImage(a,0,0),r}const Ui={male:{walk:[[[42.8,46.1],[42.9,46],[42.9,44.3],[42.3,43.8],[42.9,44.4],[42.7,46.2],[42.7,47.2],[40.2,51.7],[42.7,47.2]],[[32.9,48.1],[32.9,48.1],[34.9,48.4],[40.9,48.3],[42,48.2],[43.9,48.3],[41.9,48.3],[41.9,48.3],[36.5,47.6]],[[42.8,47.2],[42.8,47.2],[42.9,45.4],[42.9,45.1],[43,45.3],[42.8,47.3],[42.8,48.3],[42.1,49.9],[42.8,48.3]],[[30.1,48.1],[30.1,48.1],[28.1,48.4],[22.1,48.3],[21,48.2],[19.1,48.3],[21.1,48.3],[21.1,48.3],[26.5,47.6]]],run:[[[38,39.5],[39.4,41.7],[39.4,41.7],[39.4,41.7],[39.4,41.7],[39.4,41.7],[38.8,41.9],[39,38.5]],[[21.2,39.8],[25.3,42.9],[30.9,45.7],[36.6,40.5],[34.4,42.7],[31.4,45.4],[29.3,45.8],[22.7,40.8]],[[34.4,44.4],[37.3,46.8],[38.6,45.6],[39.8,42.7],[41.1,43.6],[41,45.9],[40.7,44.9],[35.8,43.5]],[[41.8,39.8],[37.7,42.9],[32.1,45.7],[26.4,40.5],[28.6,42.7],[31.6,45.4],[33.7,45.8],[40.3,40.8]]],idle:[[[42.8,47.2],[42.8,46.7]],[[23.6,45.8],[23.6,45.5]],[[42.8,47.2],[42.6,47]],[[39.2,45.7],[39.4,45.5]]],spellcast:[[[42.8,47.1],[42,45.2],[42,45.2],[47.7,40.6],[53.4,34.5],[51.9,27.9],[47.7,40.6]],[[23.6,45.5],[22.7,44.9],[27.2,44.3],[21.8,40.9],[19.8,36.8],[20.2,29.1],[21.8,40.9]],[[42.8,47],[42.6,44],[34.9,42.2],[45.6,42.5],[53.2,33.8],[51.8,27.3],[44.6,44.5]],[[39.4,45.5],[40.3,44.9],[35.8,44.3],[41.2,40.9],[43.2,36.8],[42.8,29.1],[41.2,40.9]]],shoot:[[[41.9,47],[41.7,50.9],[41.7,50.9],[39.8,39],[38.6,36.1],[38.6,36.1],[38.6,36.1],[38.6,36.1],[39.8,32.6],[39,36.9],[39.8,39],[39.8,39],[39.9,39.3]],[[24.6,45.5],[22.7,45.9],[18.3,44],[16.3,42.1],[15.7,35.1],[15,33.1],[14.9,31.1],[15.8,32.1],[15.7,34.2],[15.7,35.1],[15.7,35.1],[15.7,35.1],[15.7,35.1]],[[41.8,47],[35.9,45.6],[34.9,45.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6],[32.8,46.6]],[[38.4,45.5],[40.3,45.9],[44.7,44],[46.7,42.1],[47.3,35.1],[48.1,33.1],[48.1,31.1],[47.2,32.1],[47.3,34.2],[47.3,35.1],[47.3,35.1],[47.3,35.1],[47.3,35.1]]],hurt:[[[42.8,47.2],[44.9,48.3],[44.9,48.3],[44.9,48.3],[46.5,44.9],[46.5,44.9]]],slash:[[[42.8,47.2],[42.8,47.2],[42.8,47.2],[42.8,47.2],[50.1,31.3],[53.1,35.7]],[[23.6,45.8],[19.7,48.1],[22.7,46.5],[14.5,44],[10.9,33],[13.8,32.2]],[[42.8,47.2],[37.1,46],[37.1,46],[39.9,46.5],[50.9,43],[54,40.1]],[[39.2,45.7],[43.3,48.1],[40.3,46.5],[48.5,44],[52.1,33],[49.2,32.2]]],thrust:[[[42.9,47],[42.5,50.7],[40.3,49.9],[40.3,49.9],[40.3,49.9],[40.3,49.9],[40.3,49.9],[40.3,49.9]],[[23.9,45.8],[21.8,46.2],[21.7,45.3],[25.5,43],[18.7,43.8],[15.7,43.9],[18.7,43.8],[25.5,43]],[[42.8,47.2],[34.9,46.3],[34.9,46.3],[34.9,46.3],[34.9,46.3],[34.9,46.3],[34.9,46.3],[34.9,46.3]],[[39.2,45.7],[41.2,46.2],[41.3,45.3],[37.5,43],[44.3,43.8],[47.3,43.9],[44.3,43.8],[37.5,42.9]]]},female:{walk:[[[41.9,46.7],[42,47.6],[41.3,47.3],[40.9,46.8],[41.9,46.7],[41.8,47.8],[40.9,48.6],[40.9,48.6],[40.9,48.6]],[[31.8,48.3],[31.8,48.3],[34.8,48.3],[40.1,48.1],[41.9,47.3],[42.9,47.7],[41.9,47.3],[39.9,48.5],[35.8,48.5]],[[41.9,47.3],[41.9,47.3],[41.8,46.8],[41.3,47.3],[41.8,46.9],[41.9,47.4],[40.9,48.3],[39.8,48.4],[41.9,47.7]],[[31.2,48.3],[31.2,48.3],[28.2,48.3],[22.9,48.1],[21.1,47.3],[20.1,47.7],[21.1,47.3],[23.1,48.5],[27.2,48.5]]],run:[[[31.8,33],[32.1,34],[31.5,33],[31.5,31.2],[31.2,33],[30.9,34],[31.5,33],[31.5,31.2]],[[21.6,39.5],[25.6,42.5],[24.6,44.8],[21.6,38.5],[19.6,39.5],[23.4,43.2],[28.2,45.1],[22.6,40.5]],[[32.7,45.8],[34.9,49],[37,46.2],[39.4,42.3],[39.5,43.5],[39.9,45.9],[39,45.9],[35.3,43.3]],[[41.4,39.5],[37.4,42.5],[38.4,44.8],[41.4,38.5],[43.4,39.5],[39.6,43.2],[34.8,44.9],[40.4,40.5]]],idle:[[[41.9,47.7],[41.5,47.3]],[[24,47.5],[24,47.5]],[[41.9,47.3],[41.9,46.8]],[[39,47.5],[39,47.5]]],spellcast:[[[41.9,47.7],[41.9,47.7],[41.9,47.7],[46.8,40.1],[50.4,35.3],[50,28.8],[46.6,40]],[[24,47.5],[23.2,46.7],[24.1,45.4],[22.1,43.6],[20.1,37.8],[19.9,30.8],[22.1,43.6]],[[41.9,47.3],[41.9,44.2],[35,42.3],[43.8,43.3],[50.4,35.6],[49.9,28.8],[43.8,43.3]],[[39,47.5],[39.8,46.7],[39.4,45.6],[40.9,43.6],[42.9,37.8],[43.1,30.8],[40.9,43.6]]],shoot:[[[40.9,47.7],[40.9,50.7],[40.9,50.7],[40.9,50.7],[38.7,36.2],[38.7,36.2],[38.7,36.2],[38.7,36.2],[40.1,32.5],[39.1,36.9],[39.1,36.9],[39.1,36.9],[39.1,36.9]],[[25,47.5],[22.7,45.9],[18.1,44.1],[16.2,42],[15.7,35.1],[14.7,33.2],[14.7,31.1],[15.8,32.1],[15.7,34.2],[15.7,35.1],[15.7,35.1],[15.7,35.1],[15.7,35.1]],[[40.9,47.3],[35.9,45.6],[34.9,45.6],[33.1,46.8],[33.1,46.8],[33.1,46.8],[33.1,46.8],[32.2,41.2],[32.2,41.2],[32.2,41.2],[32.2,41.2],[32.2,41.2],[32.2,41.2]],[[38,47.5],[40.3,45.9],[44.9,44.1],[46.8,42],[47.3,35.1],[48.3,33.2],[48.3,31.1],[47.2,32.1],[47.3,34.2],[47.3,35.1],[47.3,35.1],[47.3,35.1],[47.3,35.1]]],hurt:[[[41.9,47.3],[42.8,48.6],[42.8,48.6],[42.8,48.6],[46,45],[46,45]]],slash:[[[41.9,47.7],[41.9,47.7],[41.9,47.7],[41.9,47.7],[50.1,31.4],[53,35.7]],[[24,47.5],[19.6,48.3],[23.7,48.5],[15.4,44.1],[10.8,32.9],[14.3,31.7]],[[41.9,47.3],[37.2,45.9],[37.2,45.9],[39.2,48.4],[51.5,43.4],[54.3,39.2]],[[39,47.5],[43.4,48.3],[39.3,48.5],[47.6,44.1],[52.2,32.9],[48.7,31.7]]],thrust:[[[41.9,47.7],[40.9,50.7],[40.5,50.9],[40.5,50.9],[40.5,50.9],[40.5,50.9],[40.5,50.9],[40.5,50.9]],[[24,47.5],[21.7,45.9],[21.7,45.2],[25.5,43],[19.6,43.9],[16.8,43.9],[19.6,43.9],[25.5,43]],[[41.9,47.3],[35.3,46.1],[35.3,46.1],[35.3,46.1],[35.3,46.1],[35.3,46.1],[35.3,46.1],[35.3,46.1]],[[39,47.5],[41.3,45.9],[41.3,45.2],[37.5,43],[43.4,43.9],[46.2,43.9],[43.4,43.9],[37.5,43]]]}},bi={apprentice_staff:{source:["weapon/magic/simple/background/simple","weapon/magic/simple/foreground/simple"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[42,24,4,18],offset:[-.8,-22.1]},front:{rect:[42,46,3,10],offset:[-.8,-.1]}},left:{frame:0,behind:{rect:[18,27,9,36],offset:[-14.9,-21.1]},front:null},down:{frame:0,behind:null,front:{rect:[36,26,9,36],offset:[-6.8,-21.2]}},right:{frame:0,behind:{rect:[37,27,9,36],offset:[6.9,-21.1]},front:null}}},gnarled_staff:{source:["weapon/magic/gnarled/universal/background/gnarled","weapon/magic/gnarled/universal/foreground/gnarled"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[37,24,12,19],offset:[-5.8,-22.1]},front:{rect:[41,46,6,10],offset:[-1.8,-.1]}},left:{frame:0,behind:{rect:[18,28,12,32],offset:[-14.9,-20.1]},front:null},down:{frame:0,behind:null,front:{rect:[37,28,12,32],offset:[-5.8,-19.2]}},right:{frame:0,behind:{rect:[34,28,12,32],offset:[3.9,-20.1]},front:null}}},archmage_staff:{source:["weapon/magic/crystal/universal/background/purple","weapon/magic/crystal/universal/foreground/purple"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[40,25,5,10],offset:[-2.8,-21.1]},front:null},left:{frame:0,behind:{rect:[21,26,5,10],offset:[-11.9,-22.1]},front:null},down:{frame:0,behind:null,front:{rect:[41,26,5,10],offset:[-1.8,-21.2]}},right:{frame:0,behind:{rect:[38,26,5,10],offset:[7.9,-22.1]},front:null}}},short_bow:{source:["weapon/ranged/bow/normal/universal/background/normal","weapon/ranged/bow/normal/universal/foreground/normal"],oversize:!1,anim:"shoot",byDir:{up:{frame:9,behind:null,front:{rect:[25,4,7,13],offset:[-14.1,-32.9]}},left:{frame:9,behind:null,front:{rect:[14,11,16,44],offset:[-1.7,-24.1]}},down:{frame:9,behind:null,front:{rect:[27,20,7,44],offset:[-5.2,-21.2]}},right:{frame:9,behind:null,front:{rect:[34,11,16,44],offset:[-13.3,-24.1]}}}},war_bow:{source:["weapon/ranged/bow/recurve/universal/background/recurve","weapon/ranged/bow/recurve/universal/foreground/recurve"],oversize:!1,anim:"shoot",byDir:{up:{frame:9,behind:null,front:{rect:[24,5,7,12],offset:[-15.1,-31.9]}},left:{frame:9,behind:null,front:{rect:[12,10,17,48],offset:[-3.7,-25.1]}},down:{frame:9,behind:null,front:{rect:[26,19,9,44],offset:[-6.2,-22.2]}},right:{frame:9,behind:null,front:{rect:[35,10,17,48],offset:[-12.3,-25.1]}}}},great_bow:{source:["weapon/ranged/bow/great/universal/background/great","weapon/ranged/bow/great/universal/foreground/great"],oversize:!1,anim:"shoot",byDir:{up:{frame:9,behind:null,front:{rect:[25,2,7,15],offset:[-14.1,-34.9]}},left:{frame:9,behind:null,front:{rect:[13,9,17,52],offset:[-2.7,-26.1]}},down:{frame:9,behind:null,front:{rect:[25,12,10,52],offset:[-7.2,-29.2]}},right:{frame:9,behind:null,front:{rect:[34,9,17,52],offset:[-13.3,-26.1]}}}},iron_spear:{source:["weapon/polearm/spear/background/iron","weapon/polearm/spear/foreground/iron"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[7,34,51,19],offset:[-35.8,-12.1]},front:null},left:{frame:0,behind:{rect:[3,36,51,19],offset:[-29.9,-12.1]},front:null},down:{frame:0,behind:{rect:[46,40,17,8],offset:[3.2,-7.2]},front:{rect:[12,47,30,12],offset:[-30.8,-.2]}},right:{frame:0,behind:{rect:[10,36,51,19],offset:[-20.1,-12.1]},front:null}}},war_spear:{source:["weapon/polearm/spear/background/steel","weapon/polearm/spear/foreground/steel"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[7,34,51,19],offset:[-35.8,-12.1]},front:null},left:{frame:0,behind:{rect:[3,36,51,19],offset:[-29.9,-12.1]},front:null},down:{frame:0,behind:{rect:[46,40,17,8],offset:[3.2,-7.2]},front:{rect:[12,47,30,12],offset:[-30.8,-.2]}},right:{frame:0,behind:{rect:[10,36,51,19],offset:[-20.1,-12.1]},front:null}}},champion_spear:{source:["weapon/polearm/spear/background/gold","weapon/polearm/spear/foreground/gold"],oversize:!1,anim:"walk",byDir:{up:{frame:0,behind:{rect:[7,34,51,19],offset:[-35.8,-12.1]},front:null},left:{frame:0,behind:{rect:[3,36,51,19],offset:[-29.9,-12.1]},front:null},down:{frame:0,behind:{rect:[46,40,17,8],offset:[3.2,-7.2]},front:{rect:[12,47,30,12],offset:[-30.8,-.2]}},right:{frame:0,behind:{rect:[10,36,51,19],offset:[-20.1,-12.1]},front:null}}}},ji=["up","left","down","right"],nl=32,ll=new Set(["slash"]),cl=13,Gi=150,dl=(a,e,s)=>Math.min(s,Math.max(e,a));function hl(a){return!!a&&!!bi[a]}function pl(a){const e=bi[a];return e?e.source.map(s=>`${s}/${e.anim}`):[]}function fl(a,e){var l;const s=bi[e.weaponId],t=Ui[e.body]??Ui.male,i=t==null?void 0:t[e.anim];if(!s||!i)return!1;const r=Le[e.anim],o=r.singleRow?1:4;if(e.sources.every(d=>d===null))return!1;let n=!1;for(let d=0;d<o;d++){const h=ji[r.singleRow?2:d],p=s.byDir[h]??null;if(!p||e.role!=="front")continue;const f=[[p.behind,e.sources[0]],[p.front,e.sources[1]]].filter(u=>!!u[0]&&!!u[1]);if(!f.length)continue;const m=s.oversize?nl:0,b=s.oversize?T*2:T;for(let u=0;u<r.frames;u++){const g=(l=i[d])==null?void 0:l[u];if(g){a.save(),a.beginPath(),a.rect(u*T,d*T,T,T),a.clip();for(const[_,E]of f){const[x,C,k,y]=_.rect,M=x-_.offset[0],q=Math.round(u*T+g[0]+_.offset[0]),v=Math.round(d*T+g[1]+_.offset[1]),w=p.frame*b+m+x,I=ji.indexOf(h)*b+m+C,z=ll.has(e.anim)?dl((g[0]-M)*cl,-Gi,Gi):0;if(Math.abs(z)<1)a.drawImage(E,w,I,k,y,q,v,k,y);else{const W=-_.offset[0],ie=-_.offset[1];a.save(),a.translate(q+W,v+ie),a.rotate(z*Math.PI/180),a.imageSmoothingEnabled=!1,a.drawImage(E,w,I,k,y,-W,-ie,k,y),a.restore()}n=!0}a.restore()}}}return n}const Vi=new Map;function Wi(a){let e=Vi.get(a);return e||(e=new Promise(s=>{const t=new Image;t.onload=()=>s(t),t.onerror=()=>s(null),t.src=a}),Vi.set(a,e)),e}async function br(a,e={}){const s=Zn(a,e),t={};for(const i of Object.keys(Le)){const r=Le[i],o=await Promise.all(s.map(u=>{var g;return u.weapon&&!((g=u.weaponNativeAnims)!=null&&g.includes(i))?Promise.resolve(null):Wi(`/assets/lpc/${u.path}/${i}.png`)})),n=s.map((u,g)=>{var _;return o[g]===null&&!((_=u.weaponNativeAnims)!=null&&_.includes(i))&&hl(u.weapon)?u:null}),l=await Promise.all(n.map(u=>u?Promise.all(pl(u.weapon).map(g=>Wi(`/assets/lpc/${g}.png`))):Promise.resolve([]))),d=o.filter(u=>u!==null),h=l.some(u=>u.some(Boolean));if(d.length===0&&!h){t[i]=null;continue}const p=r.singleRow?1:4,f=document.createElement("canvas");f.width=r.frames*T,f.height=p*T;const m=f.getContext("2d");o.forEach((u,g)=>{const _=s[g];let E=u;if(!E&&n[g]){const k=document.createElement("canvas");k.width=f.width,k.height=f.height,fl(k.getContext("2d"),{weaponId:_.weapon,role:_.weaponRole==="front"?"front":"behind",body:a.body,anim:i,sources:l[g]})&&(E=k)}if(!E)return;const{tint:x,tintMode:C}=_;if(!x){m.drawImage(E,0,0);return}m.drawImage(xr(E,f.width,f.height,x,C),0,0)});const b=new ks(f);b.magFilter=He,b.minFilter=He,b.generateMipmaps=!1,b.colorSpace=ws,t[i]=b}return t}function Rt(a){for(const e of Object.values(a))e==null||e.dispose()}const ul=.5,Ze=42,ml=new ss(11,16),gl=new U({color:0,transparent:!0,opacity:.35});function vr(){return T*Jo()*ul}class xl{constructor(e,s,t={}){c(this,"group",new ye);c(this,"plane");c(this,"material");c(this,"textures",null);c(this,"direction",2);c(this,"dead",!1);c(this,"castAnim");c(this,"moveAnim","idle");c(this,"moveElapsed",0);c(this,"casting",!1);c(this,"castElapsed",0);c(this,"lastFrameKey","");c(this,"scratch",null);c(this,"scratchTex",null);c(this,"disposed",!1);this.castAnim=s==="ranger"?"shoot":s==="gladiator"?"thrust":"slash";const i=vr();this.material=new U({transparent:!0,alphaTest:.01}),this.material.visible=!1,this.plane=new H(new Za(i,i),this.material),this.plane.rotation.order="YXZ",this.plane.rotation.y=Math.PI/4,this.plane.rotation.x=-Math.atan(600/Math.hypot(200,200)),this.plane.position.y=i/2,this.group.add(this.plane);const r=new H(ml,gl);r.rotation.x=-Math.PI/2,r.position.y=.5,this.group.add(r),br(e,t).then(o=>{if(this.disposed){Rt(o);return}this.textures=o,this.material.visible=!0,this.applyFrame(!0)})}setFacing(e){this.dead||(this.direction=ol(e,this.direction))}die(){this.dead||(this.dead=!0,this.casting=!1,this.moveElapsed=0)}update(e,s,t){if(this.moveElapsed+=e,this.castElapsed+=e,!this.dead){const i=s>220?"run":s>1.5?"walk":"idle";i!==this.moveAnim&&(this.moveAnim=i,this.moveElapsed=0),t&&(this.casting=!0,this.castElapsed=0);const r=Le[this.castAnim];this.casting&&this.castElapsed>=r.frames/r.fps&&(this.casting=!1)}this.applyFrame(!1)}applyFrame(e){if(this.textures){if(this.dead){this.applyFullFrame("hurt",this.moveElapsed,e);return}if(this.casting&&this.textures[this.castAnim]){this.moveAnim==="idle"||!this.textures[this.moveAnim]?this.applyFullFrame(this.castAnim,this.castElapsed,e):this.applySplitFrame(e);return}this.applyFullFrame(this.moveAnim,this.moveElapsed,e)}}applyFullFrame(e,s,t){const i=this.textures[e]?e:this.textures.idle?"idle":"walk",r=this.textures[i];if(!r)return;const o=Le[i],n=i!=="hurt"&&i!==this.castAnim,l=as(i,s,n),d=`${i}:${this.direction}:${l}`;if(!t&&d===this.lastFrameKey)return;this.lastFrameKey=d,this.material.map!==r&&(this.material.map=r,this.material.needsUpdate=!0);const{sx:h,sy:p}=is(i,this.direction,l),f=o.singleRow?1:4;r.repeat.set(T/(o.frames*T),T/(f*T)),r.offset.set(h/(o.frames*T),1-(p+T)/(f*T))}applySplitFrame(e){const s=this.textures[this.castAnim],t=this.textures[this.moveAnim],i=as(this.castAnim,this.castElapsed,!1),r=as(this.moveAnim,this.moveElapsed,!0),o=`split:${this.castAnim}:${i}:${this.moveAnim}:${r}:${this.direction}`;if(!e&&o===this.lastFrameKey)return;this.lastFrameKey=o,this.scratch||(this.scratch=document.createElement("canvas"),this.scratch.width=T,this.scratch.height=T,this.scratchTex=new ks(this.scratch),this.scratchTex.magFilter=He,this.scratchTex.minFilter=He,this.scratchTex.generateMipmaps=!1,this.scratchTex.colorSpace=ws);const n=is(this.castAnim,this.direction,i),l=is(this.moveAnim,this.direction,r),d=this.scratch.getContext("2d");d.clearRect(0,0,T,T),d.drawImage(t.image,l.sx,l.sy+Ze,T,T-Ze,0,Ze,T,T-Ze),d.drawImage(s.image,n.sx,n.sy,T,Ze,0,0,T,Ze),this.scratchTex.needsUpdate=!0,this.material.map!==this.scratchTex&&(this.material.map=this.scratchTex,this.material.needsUpdate=!0)}dispose(){var e;this.disposed=!0,this.plane.geometry.dispose(),this.material.dispose(),(e=this.scratchTex)==null||e.dispose(),this.textures&&Rt(this.textures)}}const bl=50,vl=new Ut(14,18,32),mt=new se;class yl{constructor(e,s,t,i,r,o){c(this,"group",new ye);c(this,"sprite");c(this,"nameLabel");c(this,"ownedMaterials",[]);c(this,"prevX",0);c(this,"prevZ",0);c(this,"velocityMag",0);c(this,"smoothVel",0);this.sprite=new xl(s??jt[e],e,t??{}),this.group.add(this.sprite.group);const n=new U({color:i,transparent:!0,opacity:.5,side:Se});this.ownedMaterials.push(n);const l=new H(vl,n);l.rotation.x=-Math.PI/2,l.position.y=1,this.group.add(l),this.nameLabel=document.createElement("div"),this.nameLabel.style.cssText=`
      position:absolute; left:0; top:0; pointer-events:none; font-size:12px; color:#fff;
      text-shadow:0 0 4px #000; white-space:nowrap; transform:translateX(-50%);
    `,this.nameLabel.textContent=r,o.appendChild(this.nameLabel)}setPosition(e,s,t){const i=e-this.prevX,r=s-this.prevZ,o=Math.min(Math.sqrt(i*i+r*r)*60,1e3);this.smoothVel=this.smoothVel*.85+o*.15,this.velocityMag=this.smoothVel,t!==void 0&&this.sprite.setFacing(t),this.prevX=e,this.prevZ=s,this.group.position.set(e,0,s)}update(e,s){this.sprite.update(e,this.velocityMag,s)}setVisible(e){this.group.visible=e,this.nameLabel.style.display=e?"":"none"}die(){this.sprite.die()}updateLabel(e,s){this.group.getWorldPosition(mt),mt.y+=bl+10,mt.project(e);const t=(mt.x*.5+.5)*s.width+s.left,i=(-mt.y*.5+.5)*s.height+s.top-18;this.nameLabel.style.transform=`translate(${t}px, ${i}px) translateX(-50%)`}dispose(e){e.removeChild(this.nameLabel),this.group.removeFromParent();for(const s of this.ownedMaterials)s.dispose();this.ownedMaterials=[],this.sprite.dispose()}}const D=4096,Te=Math.floor(D*.9),wl=Math.floor(D*.5),kl=1.05,_l=.4,Sl=.05,Yi=111/255,Xi=211/255,Zi=242/255;class Cl{constructor(e){c(this,"posX",new Float32Array(D));c(this,"posY",new Float32Array(D));c(this,"posZ",new Float32Array(D));c(this,"velX",new Float32Array(D));c(this,"velY",new Float32Array(D));c(this,"velZ",new Float32Array(D));c(this,"life",new Float32Array(D));c(this,"maxLife",new Float32Array(D));c(this,"particleSize",new Float32Array(D));c(this,"gravityScale",new Float32Array(D));c(this,"colorR",new Float32Array(D));c(this,"colorG",new Float32Array(D));c(this,"colorB",new Float32Array(D));c(this,"activeCount",0);c(this,"positionBuffer");c(this,"sizeBuffer");c(this,"colorBuffer");c(this,"posAttr");c(this,"sizeAttr");c(this,"colorAttr");c(this,"geometry");c(this,"points");c(this,"material");c(this,"onResize",()=>{typeof window>"u"||(this.material.uniforms.uSizeScale.value=window.innerHeight*Math.min(window.devicePixelRatio||1,hs)/De)});this.scene=e,this.positionBuffer=new Float32Array(D*3),this.sizeBuffer=new Float32Array(D),this.colorBuffer=new Float32Array(D*3),this.geometry=new pt,this.posAttr=new Mt(this.positionBuffer,3),this.posAttr.setUsage(Tt),this.geometry.setAttribute("position",this.posAttr),this.sizeAttr=new Mt(this.sizeBuffer,1),this.sizeAttr.setUsage(Tt),this.geometry.setAttribute("size",this.sizeAttr),this.colorAttr=new Mt(this.colorBuffer,3),this.colorAttr.setUsage(Tt),this.geometry.setAttribute("particleColor",this.colorAttr),this.geometry.setDrawRange(0,0);const s=new Ee({uniforms:{uSizeScale:{value:1}},vertexShader:`
        uniform float uSizeScale;
        attribute float size;
        attribute vec3 particleColor;
        varying vec3 vColor;
        void main() {
          vColor = particleColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uSizeScale;
        }
      `,fragmentShader:`
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          // Additive blending sums overlapping embers, so a dense trail
          // saturates to white regardless of per-particle color — the 0.4
          // scale caps the stacked energy while keeping the plume's size.
          float alpha = (1.0 - dist * 2.0) * 0.4;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,transparent:!0,depthWrite:!1,blending:ys});this.material=s,this.points=new er(this.geometry,s),this.points.frustumCulled=!1,e.add(this.points),this.onResize(),typeof window<"u"&&window.addEventListener("resize",this.onResize)}emitTrail(e,s,t,i,r,o=10){if(this.activeCount>=Te)return;const n=o/10,l=Math.min(14,Math.floor((4+Math.floor(Math.random()*3))*n)),d=8*n;for(let h=0;h<l;h++){if(this.activeCount>=D)return;this.spawn(e+(Math.random()-.5)*d,s+(Math.random()-.5)*d,t+(Math.random()-.5)*d,-i*(40+Math.random()*30)*n+(Math.random()-.5)*30,(10+Math.random()*20)*n,-r*(40+Math.random()*30)*n+(Math.random()-.5)*30,.4+Math.random()*.2,(16+Math.random()*7)*n)}}emitIceRayTrail(e,s,t,i,r,o=10,n=0){if(this.activeCount>=Te)return;const l=o/10,d=Math.min(12,Math.floor((3+Math.floor(Math.random()*3))*l)),h=4*l,p=Math.min(1,Math.max(0,n));for(let f=0;f<d;f++){if(this.activeCount>=D)return;const m=this.activeCount;this.spawn(e+(Math.random()-.5)*h,s+(Math.random()-.5)*h,t+(Math.random()-.5)*h,-i*(40+Math.random()*30)*l+(Math.random()-.5)*30,(10+Math.random()*20)*l,-r*(40+Math.random()*30)*l+(Math.random()-.5)*30,.35+Math.random()*.15,(12+Math.random()*4)*l);const b=p*.5+Math.random()*.5;this.colorR[m]=Yi+(1-Yi)*b,this.colorG[m]=Xi+(1-Xi)*b,this.colorB[m]=Zi+(1-Zi)*b}}emitExplosion(e,s,t,i=10){const r=i/10,o=Math.min(200,Math.floor((40+Math.floor(Math.random()*21))*r)),n=6*r;for(let l=0;l<o;l++){if(this.activeCount>=D)return;const d=Math.random()*Math.PI*2,h=(60+Math.random()*120)*r;this.spawn(e+(Math.random()-.5)*n,s+(Math.random()-.5)*n,t+(Math.random()-.5)*n,Math.cos(d)*h,(20+Math.random()*80)*r,Math.sin(d)*h,.5+Math.random()*.3,(Math.random()>.5?16:10)*Math.min(r,3))}}emitWall(e){if(!(this.activeCount>=Te))for(const s of e)for(let t=0;t<3;t++){if(this.activeCount>=D)return;const i=Math.random();this.spawn(s.x1+(s.x2-s.x1)*i+(Math.random()-.5)*4,1,s.y1+(s.y2-s.y1)*i+(Math.random()-.5)*4,(Math.random()-.5)*15,40+Math.random()*40,(Math.random()-.5)*15,.4+Math.random()*.3,14+Math.random()*10)}}emitMeteorTrail(e,s,t){if(this.activeCount>=Te)return;const i=2+Math.floor(Math.random()*2);for(let r=0;r<i;r++){if(this.activeCount>=D)return;const o=Math.random()*Math.PI*2,n=8+Math.random()*8;this.spawn(e+(Math.random()-.5)*6,s+(Math.random()-.5)*6,t+(Math.random()-.5)*6,Math.cos(o)*n,20+Math.random()*20,Math.sin(o)*n,.2+Math.random()*.1,8+Math.random()*6)}}emitCrater(e,s,t){if(this.activeCount>=Te)return;const i=Math.max(4,Math.round(t/10));for(let r=0;r<i;r++){if(this.activeCount>=D)return;const o=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*t;this.spawn(e+Math.cos(o)*n,1,s+Math.sin(o)*n,(Math.random()-.5)*10,30+Math.random()*30,(Math.random()-.5)*10,.3+Math.random()*.3,10+Math.random()*8)}}emitMeteorImpact(e,s,t){if(this.activeCount>=Te)return;const i=50+Math.floor(Math.random()*21);for(let r=0;r<i;r++){if(this.activeCount>=D)return;const o=Math.random()*Math.PI*2,n=80+Math.random()*120;this.spawn(e+(Math.random()-.5)*10,s+(Math.random()-.5)*10,t+(Math.random()-.5)*10,Math.cos(o)*n,30+Math.random()*100,Math.sin(o)*n,.5+Math.random()*.3,Math.random()>.5?18:12)}}emitRainImpact(e,s,t,i){if(this.activeCount>=Te)return;const r=30+Math.floor(Math.random()*15);for(let o=0;o<r;o++){if(this.activeCount>=D)return;const n=Math.random()*Math.PI*2,l=Math.sqrt(Math.random())*i,d=15+Math.random()*30,h=this.activeCount;this.spawn(e+Math.cos(n)*l,s+2,t+Math.sin(n)*l,Math.cos(n)*d,30+Math.random()*50,Math.sin(n)*d,.3+Math.random()*.2,6+Math.random()*4),this.colorR[h]=.7,this.colorG[h]=.6,this.colorB[h]=.45}}emitRainZone(e,s,t){if(this.activeCount>=Te)return;const i=Math.max(2,Math.round(t/20));for(let r=0;r<i;r++){if(this.activeCount>=D)return;const o=Math.random()*Math.PI*2,n=Math.sqrt(Math.random())*t,l=this.activeCount;this.spawn(e+Math.cos(o)*n,1,s+Math.sin(o)*n,(Math.random()-.5)*8,15+Math.random()*15,(Math.random()-.5)*8,.25+Math.random()*.15,5+Math.random()*4),this.colorR[l]=.7,this.colorG[l]=.6,this.colorB[l]=.45}}emitTeleportSparks(e,s,t){const i=10+Math.floor(Math.random()*6);for(let r=0;r<i;r++){if(this.activeCount>=D)return;const o=Math.random()*Math.PI*2,n=Math.random()*Math.PI*.5,l=40+Math.random()*60,d=this.activeCount;this.spawn(e+(Math.random()-.5)*4,s+(Math.random()-.5)*4,t+(Math.random()-.5)*4,Math.cos(o)*Math.sin(n)*l,Math.cos(n)*l*.4+10,Math.sin(o)*Math.sin(n)*l,.12+Math.random()*.04,7+Math.random()*4),this.colorR[d]=1,this.colorG[d]=.84+Math.random()*.16,this.colorB[d]=.4+Math.random()*.6}}spawn(e,s,t,i,r,o,n,l,d=1){const h=this.activeCount++;this.posX[h]=e,this.posY[h]=s,this.posZ[h]=t,this.velX[h]=i,this.velY[h]=r,this.velZ[h]=o,this.life[h]=n,this.maxLife[h]=n,this.particleSize[h]=l,this.gravityScale[h]=d,this.colorR[h]=kl,this.colorG[h]=_l,this.colorB[h]=Sl}update(e){let s=0;for(;s<this.activeCount;){if(this.life[s]-=e,this.life[s]<=0){const i=this.activeCount-1;this.posX[s]=this.posX[i],this.posY[s]=this.posY[i],this.posZ[s]=this.posZ[i],this.velX[s]=this.velX[i],this.velY[s]=this.velY[i],this.velZ[s]=this.velZ[i],this.life[s]=this.life[i],this.maxLife[s]=this.maxLife[i],this.particleSize[s]=this.particleSize[i],this.gravityScale[s]=this.gravityScale[i],this.colorR[s]=this.colorR[i],this.colorG[s]=this.colorG[i],this.colorB[s]=this.colorB[i],this.activeCount--;continue}this.velY[s]-=80*this.gravityScale[s]*e,this.posX[s]+=this.velX[s]*e,this.posY[s]+=this.velY[s]*e,this.posZ[s]+=this.velZ[s]*e;const t=s*3;this.positionBuffer[t]=this.posX[s],this.positionBuffer[t+1]=this.posY[s],this.positionBuffer[t+2]=this.posZ[s],this.colorBuffer[t]=this.colorR[s],this.colorBuffer[t+1]=this.colorG[s],this.colorBuffer[t+2]=this.colorB[s],this.sizeBuffer[s]=this.particleSize[s]*(this.life[s]/this.maxLife[s]),s++}this.geometry.setDrawRange(0,this.activeCount),this.activeCount>0&&(this.posAttr.addUpdateRange(0,this.activeCount*3),this.colorAttr.addUpdateRange(0,this.activeCount*3),this.sizeAttr.addUpdateRange(0,this.activeCount),this.posAttr.needsUpdate=!0,this.sizeAttr.needsUpdate=!0,this.colorAttr.needsUpdate=!0)}activeParticles(){return this.activeCount}emitAura(e,s,t,i,r,o={}){if(this.activeCount>=wl)return;const n=o.intensity??1,l=o.phase??0,d=(h,p,f,m,b,u,g,_,E)=>{if(this.activeCount>=D)return;const x=this.activeCount;this.spawn(h,p,f,m,b,u,g,_,E),this.colorR[x]=s[0],this.colorG[x]=s[1],this.colorB[x]=s[2]};switch(e){case"embers":{const h=n>=1.3?2:1;for(let p=0;p<h;p++)d(t+(Math.random()-.5)*10,i+(Math.random()-.5)*8,r+(Math.random()-.5)*10,(Math.random()-.5)*6,10+Math.random()*10,(Math.random()-.5)*6,.8+Math.random()*.4,(4+Math.random()*3)*n,-.05);break}case"frost":d(t+(Math.random()-.5)*12,i+(Math.random()-.5)*10,r+(Math.random()-.5)*12,(Math.random()-.5)*10,-3,(Math.random()-.5)*10,.9+Math.random()*.3,(3+Math.random()*3)*n,.08);break;case"orbit":{const h=o.motes??1,p=14;for(let f=0;f<h;f++){const m=l*1.6+f*Math.PI*2/h;d(t+Math.cos(m)*p,i,r+Math.sin(m)*p,0,2,0,.25,(4+Math.random()*2)*n,0)}break}case"drip":d(t+(Math.random()-.5)*8,i,r+(Math.random()-.5)*8,(Math.random()-.5)*4,0,(Math.random()-.5)*4,.5+Math.random()*.2,(3+Math.random()*3)*n,1);break;case"wisp":if(!o.moving)return;d(t+(Math.random()-.5)*8,i+Math.random()*4,r+(Math.random()-.5)*8,(Math.random()-.5)*4,4+Math.random()*4,(Math.random()-.5)*4,.45+Math.random()*.2,(4+Math.random()*3)*n,.1);break}}dispose(){typeof window<"u"&&window.removeEventListener("resize",this.onResize),this.scene.remove(this.points),this.geometry.dispose(),this.points.material.dispose()}}const Ml=.08,Ki=.12,Qi=.15,Tl=.2,El=35,Ji=4,Al=6,Rl=new Po(1,.3,4,32),$l=2,$t=[];function Il(a){for(const e of $t)e.light.parent!==a&&a.add(e.light);for(;$t.length<$l;){const e=new Qa(16772795,0,120);a.add(e),$t.push({light:e,inUse:!1})}}function Ll(){const a=$t.find(e=>!e.inUse);return a?(a.inUse=!0,a.light):null}function ea(a){a.intensity=0;const e=$t.find(s=>s.light===a);e&&(e.inUse=!1)}class ta{constructor(e,s,t,i){c(this,"done",!1);c(this,"elapsed",0);c(this,"lightningLines",[]);c(this,"ringMesh");c(this,"pointLight");c(this,"lightningDisposed",!1);c(this,"lightDisposed",!1);c(this,"ringDisposed",!1);this.scene=e;const r=2;i.emitTeleportSparks(s,r,t);const o=Ji+Math.floor(Math.random()*(Al-Ji+1));for(let l=0;l<o;l++){const d=Math.random()*Math.PI*2,h=15+Math.random()*25,p=h*(.3+Math.random()*.4),f=(Math.random()-.5)*12,m=[new se(s,r+Math.random()*6,t),new se(s+Math.cos(d)*p+f,r+3+Math.random()*8,t+Math.sin(d)*p+f),new se(s+Math.cos(d)*h,r+Math.random()*5,t+Math.sin(d)*h)],b=new pt().setFromPoints(m),u=new fi({color:16766720,transparent:!0,opacity:.6}),g=new Ks(b,u);this.scene.add(g),this.lightningLines.push(g)}const n=new U({color:16766720,transparent:!0,opacity:.4,side:Se});this.ringMesh=new H(Rl,n),this.ringMesh.rotation.x=-Math.PI/2,this.ringMesh.position.set(s,1,t),this.ringMesh.scale.setScalar(.01),this.scene.add(this.ringMesh),Il(e),this.pointLight=Ll(),this.pointLight&&(this.pointLight.position.set(s,20,t),this.pointLight.intensity=1)}update(e){if(!this.done){if(this.elapsed+=e,!this.lightningDisposed&&this.elapsed>=Ml){for(const s of this.lightningLines)this.scene.remove(s),s.geometry.dispose(),s.material.dispose();this.lightningLines.length=0,this.lightningDisposed=!0}if(!this.lightDisposed&&this.pointLight&&(this.elapsed>=Ki?(ea(this.pointLight),this.pointLight=null,this.lightDisposed=!0):this.pointLight.intensity=1*(1-this.elapsed/Ki)),!this.ringDisposed)if(this.elapsed>=Qi)this.scene.remove(this.ringMesh),this.ringMesh.material.dispose(),this.ringDisposed=!0;else{const s=this.elapsed/Qi;this.ringMesh.scale.setScalar(El*s),this.ringMesh.material.opacity=.4*(1-s)}this.elapsed>=Tl&&(this.done=!0)}}dispose(){if(!this.lightningDisposed){for(const e of this.lightningLines)this.scene.remove(e),e.geometry.dispose(),e.material.dispose();this.lightningLines.length=0}!this.lightDisposed&&this.pointLight&&(ea(this.pointLight),this.pointLight=null),this.ringDisposed||(this.scene.remove(this.ringMesh),this.ringMesh.material.dispose()),this.done=!0}}const sa="bloodmoor.audio.v1",it={musicVol:60,sfxVol:80,muted:!1};function us(a,e){return typeof a!="number"||Number.isNaN(a)?e:Math.max(0,Math.min(100,Math.floor(a)))}function Pl(a){if(a===null)return{...it};try{const e=JSON.parse(a);return{musicVol:us(e.musicVol,it.musicVol),sfxVol:us(e.sfxVol,it.sfxVol),muted:!!e.muted}}catch{return{...it}}}function zl(a){try{return localStorage.getItem(a)}catch{return null}}function ql(a,e){try{localStorage.setItem(a,e)}catch{}}function ia(a){return(a/100)**2}const Ol=.05;class Fl{constructor(){c(this,"settings");c(this,"ctx_",null);c(this,"failed",!1);c(this,"master",null);c(this,"music_",null);c(this,"sfx_",null);c(this,"unlockCbs",[]);this.settings=Pl(zl(sa))}get ctx(){return this.ctx_}get sfxBus(){return this.sfx_}get musicBus(){return this.music_}get ready(){return this.ctx_!==null}onUnlock(e){if(this.ctx_){e();return}this.unlockCbs.push(e)}installUnlockListener(){const e=()=>{window.removeEventListener("pointerdown",e,!0),window.removeEventListener("keydown",e,!0),this.init()};window.addEventListener("pointerdown",e,!0),window.addEventListener("keydown",e,!0)}init(){if(!(this.ctx_||this.failed))try{this.ctx_=new AudioContext,this.master=this.ctx_.createGain(),this.master.connect(this.ctx_.destination),this.music_=this.ctx_.createGain(),this.music_.connect(this.master),this.sfx_=this.ctx_.createGain(),this.sfx_.connect(this.master),this.applyVolumes(),this.ctx_.state==="suspended"&&this.ctx_.resume(),window.addEventListener("pointerdown",()=>{this.ctx_&&this.ctx_.state==="suspended"&&this.ctx_.resume()},!0);const e=this.unlockCbs;this.unlockCbs=[];for(const s of e)s()}catch(e){this.failed=!0,this.ctx_=null,console.warn("Audio unavailable, continuing silent:",e)}}applyVolumes(){if(!this.ctx_||!this.master||!this.music_||!this.sfx_)return;const e=this.ctx_.currentTime,s=e+Ol;this.master.gain.setValueAtTime(this.master.gain.value,e),this.master.gain.linearRampToValueAtTime(this.settings.muted?0:1,s),this.music_.gain.setValueAtTime(this.music_.gain.value,e),this.music_.gain.linearRampToValueAtTime(ia(this.settings.musicVol),s),this.sfx_.gain.setValueAtTime(this.sfx_.gain.value,e),this.sfx_.gain.linearRampToValueAtTime(ia(this.settings.sfxVol),s)}save(){ql(sa,JSON.stringify(this.settings))}setMusicVol(e){this.settings.musicVol=us(e,it.musicVol),this.applyVolumes(),this.save()}setSfxVol(e){this.settings.sfxVol=us(e,it.sfxVol),this.applyVolumes(),this.save()}setMuted(e){this.settings.muted=e,this.applyVolumes(),this.save()}}const ee=new Fl,vi={ui_click:{path:"/assets/audio/sfx/ui_click.mp3"},ui_tab:{path:"/assets/audio/sfx/ui_tab.mp3"},denied:{path:"/assets/audio/sfx/denied.mp3"},player_join:{path:"/assets/audio/sfx/player_join.mp3"},cooldown_ready:{path:"/assets/audio/sfx/cooldown_ready.mp3"},no_mana:{path:"/assets/audio/sfx/no_mana.mp3"},chat:{path:"/assets/audio/sfx/chat.mp3"},purchase:{path:"/assets/audio/sfx/purchase.mp3"},sell:{path:"/assets/audio/sfx/sell.mp3"},gold_gain:{path:"/assets/audio/sfx/gold_gain.mp3"},equip:{path:"/assets/audio/sfx/equip.mp3"},unequip:{path:"/assets/audio/sfx/unequip.mp3"},skill_spend:{path:"/assets/audio/sfx/skill_spend.mp3"},drop_sting:{path:"/assets/audio/sfx/drop_sting.mp3"},cast_fire:{path:"/assets/audio/sfx/cast_fire.mp3"},cast_firewall:{path:"/assets/audio/sfx/cast_firewall.mp3"},cast_meteor:{path:"/assets/audio/sfx/cast_meteor.mp3"},cast_rain:{path:"/assets/audio/sfx/cast_rain.mp3"},cast_bow:{path:"/assets/audio/sfx/cast_bow.mp3"},fireball_whoosh:{path:"/assets/audio/sfx/fireball_whoosh.mp3"},fireball_explode:{path:"/assets/audio/sfx/fireball_explode.mp3"},meteor_fall:{path:"/assets/audio/sfx/meteor_fall.mp3"},meteor_impact:{path:"/assets/audio/sfx/meteor_impact.mp3"},arrow_shot:{path:"/assets/audio/sfx/arrow_shot.mp3"},rain_volley:{path:"/assets/audio/sfx/rain_volley.mp3"},rain_impact:{path:"/assets/audio/sfx/rain_impact.mp3"},evade:{path:"/assets/audio/sfx/evade.mp3"},teleport:{path:"/assets/audio/sfx/teleport.mp3"},hit_taken:{path:"/assets/audio/sfx/hit_taken.mp3"},hit_dealt:{path:"/assets/audio/sfx/hit_dealt.mp3"},death:{path:"/assets/audio/sfx/death.mp3"},countdown:{path:"/assets/audio/sfx/countdown.mp3"},duel_begin:{path:"/assets/audio/sfx/duel_begin.mp3"},victory:{path:"/assets/audio/sfx/victory.mp3"},defeat:{path:"/assets/audio/sfx/defeat.mp3"},level_up:{path:"/assets/audio/sfx/level_up.mp3"},firewall_loop:{path:"/assets/audio/sfx/firewall_loop.mp3",loop:!0},hall_base:{path:"/assets/audio/amb/hall_base.mp3",loop:!0},hall_torch:{path:"/assets/audio/amb/hall_torch.mp3",loop:!0},arena_wind:{path:"/assets/audio/amb/arena_wind.mp3",loop:!0}},si=new Map,ms=new Map,zs=new Set,aa=new Set;let ra=!1;function Nl(a){fetch(vi[a].path).then(e=>{if(!e.ok)throw new Error(String(e.status));return e.arrayBuffer()}).then(e=>{si.set(a,e),_r(a)}).catch(()=>{yr(a)})}function yr(a){aa.has(a)||(aa.add(a),console.warn(`sampleBank: missing/undecoded sample "${a}"`))}const wr=[];function kr(a){wr.push(a)}function Bl(a){for(const e of wr)e(a)}function _r(a){const e=ee.ctx,s=si.get(a);!e||!s||ms.has(a)||zs.has(a)||(zs.add(a),e.decodeAudioData(s.slice(0)).then(t=>{ms.set(a,t),si.delete(a),Bl(a)}).catch(()=>{yr(a)}).finally(()=>{zs.delete(a)}))}function Hl(){if(ra)return;ra=!0;const a=Object.keys(vi);for(const e of a)Nl(e);ee.onUnlock(()=>{for(const e of a)_r(e)})}function Sr(a){return a==="music"?ee.musicBus:ee.sfxBus}function N(a,e={}){const s=ee.ctx,t=Sr(e.bus??"sfx");if(!s||!t)return;const i=ms.get(a);if(!i)return;const r=vi[a],o=s.createBufferSource();o.buffer=i;const n=e.rateJitter??.04,l=e.rate??1;o.playbackRate.value=l*(1+(Math.random()*2-1)*n);const d=s.createGain();d.gain.value=e.gain??r.gain??1,o.connect(d),d.connect(t),o.start(s.currentTime+(e.delayS??0)),o.onended=()=>{o.disconnect(),d.disconnect()}}function wt(a,e,s,t=1){const i=ee.ctx,r=Sr(e);if(!i||!r)return null;const o=ms.get(a);if(!o)return null;const n=i.createGain();n.gain.value=s,n.connect(r);const l=i.createBufferSource();l.buffer=o,l.loop=!0,l.playbackRate.value=t,l.connect(n),l.start(i.currentTime);let d=!1;return{gain:n,stop:()=>{if(d)return;d=!0;const h=i.currentTime;n.gain.cancelScheduledValues(h),n.gain.setValueAtTime(n.gain.value,h),n.gain.linearRampToValueAtTime(1e-4,h+.25),window.setTimeout(()=>{try{l.stop()}catch{}l.disconnect(),n.disconnect()},300)}}}function O(){return ee.ctx!==null&&ee.sfxBus!==null}const oa=new Map;function B(a,e){const s=performance.now();return s-(oa.get(a)??-1e9)<e?!0:(oa.set(a,s),!1)}function Dl(a){const e=a.split(/\s+/);return e.includes("bm-nav-tab")?"tab":e.includes("px-btn")||e.includes("bm-acct-item")?"click":null}function Ul(){!O()||B("uiClick",40)||N("ui_click")}function jl(){!O()||B("uiTab",60)||N("ui_tab")}function gs(){!O()||B("denied",150)||N("denied")}const Gl={1:"cast_fire",2:"cast_firewall",3:"cast_meteor",4:"teleport",5:"cast_bow",6:"cast_bow",7:"cast_rain",8:"evade",9:"cast_fire",10:"cast_firewall",11:"cast_meteor",12:"cast_firewall",13:"cast_bow",14:"cast_bow",15:"teleport",16:"evade",17:"cast_firewall",18:"cast_rain",19:"cast_meteor"};function Vl(a){!O()||B(`cast${a}`,120)||N(Gl[a]??"cast_fire")}function Wl(){!O()||B("trapTrigger",60)||N("fireball_explode")}function Yl(){!O()||B("fbWhoosh",90)||N("fireball_whoosh")}function Xl(){!O()||B("fbBoom",90)||N("fireball_explode")}function Zl(){!O()||B("arrow",70)||N("arrow_shot")}function Kl(){!O()||B("meteorFall",200)||N("meteor_fall")}function Ql(){!O()||B("meteorHit",150)||N("meteor_impact")}function Jl(){!O()||B("rainVolley",200)||N("rain_volley")}function ec(){if(!(!O()||B("rainHit",200)))for(let a=0;a<4;a++)N("rain_impact",{delayS:a/4*.25+Math.random()*.03})}function tc(){!O()||B("teleport",100)||N("teleport")}const lt=new Map,qt=new Set;let na=!1;function la(a){if(lt.has(a))return;const e=wt("firewall_loop","sfx",.25);e?(lt.set(a,e),qt.delete(a)):qt.add(a)}function sc(a){!O()||lt.has(a)||(na||(na=!0,kr(e=>{if(e==="firewall_loop")for(const s of[...qt])la(s)})),la(a))}function Cr(a){var e;qt.delete(a),(e=lt.get(a))==null||e.stop(),lt.delete(a)}function ic(){for(const a of new Set([...lt.keys(),...qt]))Cr(a)}function ac(){!O()||B("hitTaken",150)||N("hit_taken")}function rc(){!O()||B("hitDealt",150)||N("hit_dealt")}function ca(){!O()||B("death",300)||N("death")}function oc(){!O()||B("cdReady",120)||N("cooldown_ready",{gain:.4})}function nc(){!O()||B("noMana",400)||N("no_mana")}function lc(a){!O()||B("result",500)||N(a?"victory":"defeat")}function cc(){!O()||B("levelUp",300)||N("level_up")}function dc(){!O()||B("gold",200)||N("gold_gain")}function hc(a){switch(a){case"magic":return 3;case"rare":return 7;case"unique":return 12;default:return 0}}function Mr(a){!O()||B("drop",300)||N("drop_sting",{rate:Math.pow(2,hc(a)/12)})}function pc(){!O()||B("duelBegin",500)||N("duel_begin")}function da(){!O()||B("cdTick",300)||N("countdown")}function fc(){!O()||B("chat",150)||N("chat")}function uc(){!O()||B("join",200)||N("player_join")}function mc(){!O()||B("equip",100)||N("equip")}function ii(){!O()||B("unequip",100)||N("unequip")}function gc(){!O()||B("sell",150)||N("sell")}function ha(){!O()||B("purchase",150)||N("purchase")}function xc(){!O()||B("skillSpend",150)||N("skill_spend")}const gt={none:16777215,burn:16737792,freeze:6737151,poison:4513092},kt=new pi(1,8,8),Tr=new Fe(18,4,4),Er=new pt().setFromPoints([new se(-9,0,0),new se(-15,0,0)]),Ar=new Fe(2,14,2),Rr=new Ut(50,58,32),$r=new pi(25,6,6),Ir=new zo(1.2,1.2,26,6).rotateZ(-Math.PI/2),Lr=new ui(2.2,5,6).rotateZ(-Math.PI/2),Pr=new Ut(20,26,12,1,-Math.PI/2,Math.PI),zr=new Ut(22,25,24),qr=new ui(5,22,6).rotateZ(-Math.PI/2),Or=new ui(1.5,10,4),ai=new Fe(1,1,1),Fr=new U({color:new we(1.7,.8,.2)}),Nr=new U({color:new we(1.1,.3,.09),transparent:!0,opacity:.25}),Br=new U({color:16729088}),Hr=new fi({color:16729088,transparent:!0,opacity:.4}),Dr=new U({color:10127462}),Ur=new U({color:13619160}),jr=new U({color:9218559,transparent:!0,opacity:.55,side:Se}),ri=new U({color:14283007,transparent:!0,opacity:.5,side:Se,blending:ys,depthWrite:!1}),Gr=new U({color:12577279}),Vr=new U({color:11463167}),Wr=new U({color:6737151,transparent:!0,opacity:.3}),bc=16,vc=10,Yr=7328754,yc=new we(Yr),wc=new we(16777215),kc=15400959,Xr=.4,Zr=.55,_c=1.7,Sc=1.6,Cc=_c/Xr,Mc=Sc/Zr,pa=1.5,Tc=9,qs=.45,Ec=.7,Os=.18,Ac=.38,Rc=.35,$c=.5,Ic=new Set([kt,Tr,Er,Ar,Rr,$r,Ir,Lr,Pr,zr,qr,Or,ai]),Ss=new Set([Fr,Nr,Br,Hr,Dr,Ur,jr,ri,Gr,Vr,Wr]);let Zt=null;function Lc(){if(!Zt){const e=document.createElement("canvas");e.width=16,e.height=16;const s=e.getContext("2d");s.translate(16/2,16/2),s.fillStyle="#ffffff",s.beginPath();const t=4,i=16/2,r=16/5;for(let n=0;n<t*2;n++){const l=n%2===0?i:r,d=Math.PI/t*n-Math.PI/2;s.lineTo(Math.cos(d)*l,Math.sin(d)*l)}s.closePath(),s.fill();const o=new ks(e);o.magFilter=He,Zt=new Oo({map:o,color:16772693,transparent:!0,depthWrite:!1}),Ss.add(Zt)}return Zt}const fa=new Map,ua=new Map;function Pc(a){let e=fa.get(a);return e||(e=new U({color:a}),fa.set(a,e),Ss.add(e)),e}function zc(a){let e=ua.get(a);return e||(e=new fi({color:a,transparent:!0,opacity:.5}),ua.set(a,e),Ss.add(e)),e}function F(a){a.traverse(e=>{const s=e;if(s.geometry&&!Ic.has(s.geometry)&&s.geometry.dispose(),s.material){const t=Array.isArray(s.material)?s.material:[s.material];for(const i of t)Ss.has(i)||i.dispose()}})}function ma(a){return a.segments.map(e=>`${e.x1.toFixed(1)},${e.y1.toFixed(1)},${e.x2.toFixed(1)},${e.y2.toFixed(1)}`).join("|")}function qc(a,e){return e*(a==="feet"?.08:a==="chest"?.5:.82)}const Oc=.5;function Fc(a,e){return a?Math.hypot(e.x-a.x,e.y-a.y)>Oc:!1}function rs(a,e,s){return a.id!==e&&(a.invisibleUntil??0)>s}class Nc{constructor(e,s){c(this,"fireballs",new Map);c(this,"wallSignatures",new Map);c(this,"arrows",new Map);c(this,"spears",new Map);c(this,"blockShields",new Map);c(this,"reflectShimmers",new Map);c(this,"stunStars",new Map);c(this,"fireWalls",new Map);c(this,"meteors",new Map);c(this,"rainOfArrows",new Map);c(this,"rainZoneArrows",new Map);c(this,"iceBolts",new Map);c(this,"frozenOrbs",new Map);c(this,"iceRays",new Map);c(this,"traps",new Map);c(this,"particles");c(this,"prevFireballPositions",new Map);c(this,"clock",new Ya);c(this,"elapsedTime",0);c(this,"teleportEffects",[]);c(this,"arrowElement","none");c(this,"emitAccumulator",0);c(this,"shouldEmitContinuous",!0);c(this,"auraAccumulator",0);c(this,"shouldEmitAura",!1);c(this,"prevAuraPositions",new Map);this.scene=e,this.myId=s,this.particles=new Cl(e)}setArrowElement(e){this.arrowElement=e}setMyId(e){this.myId=e}createFallingArrows(e,s,t,i=16){const r=gt[this.arrowElement],o=new ye,n=new U({color:r,transparent:!0,opacity:.7}),l=[];for(let d=0;d<i;d++){const h=Math.random()*Math.PI*2,p=Math.sqrt(Math.random())*t,f=new H(Ar,n);f.position.set(Math.cos(h)*p,0,Math.sin(h)*p),f.rotation.x=(Math.random()-.5)*.3,f.rotation.z=(Math.random()-.5)*.3,o.add(f),l.push(Math.random())}return o.position.set(e,0,s),this.scene.add(o),{arrowGroup:o,arrowMaterial:n,arrowPhases:l,spawnTime:this.elapsedTime}}createFallingShards(e,s,t,i=16){const r=new ye,o=new U({color:11463167,transparent:!0,opacity:.7}),n=[];for(let l=0;l<i;l++){const d=Math.random()*Math.PI*2,h=Math.sqrt(Math.random())*t,p=new H(Or,o);p.position.set(Math.cos(d)*h,0,Math.sin(d)*h),p.rotation.x=(Math.random()-.5)*.3,p.rotation.z=(Math.random()-.5)*.3,r.add(p),n.push(Math.random())}return r.position.set(e,0,s),this.scene.add(r),{arrowGroup:r,arrowMaterial:o,arrowPhases:n,spawnTime:this.elapsedTime}}updateFallingArrows(e){const s=this.elapsedTime-e.spawnTime,t=250,i=.35,r=e.arrowGroup.children;for(let o=0;o<e.arrowPhases.length;o++){const n=(s/i+e.arrowPhases[o])%1;r[o].position.y=t*(1-n)}}detectTeleports(e){for(const s of Object.values(e.players))s.teleported&&(tc(),this.teleportEffects.push(new ta(this.scene,s.teleported.x,s.teleported.y,this.particles)),this.teleportEffects.push(new ta(this.scene,s.position.x,s.position.y,this.particles)))}update(e,s){const t=this.clock.getDelta();this.elapsedTime+=t,this.emitAccumulator+=t,this.shouldEmitContinuous=this.emitAccumulator>=1/60,this.shouldEmitContinuous&&(this.emitAccumulator%=1/60),this.auraAccumulator+=t,this.shouldEmitAura=this.auraAccumulator>=1/30,this.shouldEmitAura&&(this.auraAccumulator%=1/30),this.detectTeleports(e),this.syncFireballs(e),this.syncArrows(e),this.syncSpears(e),this.syncIceBolts(e),this.syncFireWalls(e),this.syncMeteors(e),this.syncRainOfArrows(e),this.syncFrozenOrbs(e),this.syncIceRays(e,t),this.syncTraps(e),this.syncGladiatorStatus(e),this.syncUniqueAuras(e,s),this.particles.update(t);for(let i=this.teleportEffects.length-1;i>=0;i--)this.teleportEffects[i].update(t),this.teleportEffects[i].done&&this.teleportEffects.splice(i,1)}syncFireballs(e){const s=new Set(e.projectiles.filter(t=>t.type==="fireball").map(t=>t.id));for(const[t,i]of this.fireballs)if(!s.has(t)){const r=this.prevFireballPositions.get(t);r&&this.particles.emitExplosion(r.x,r.y,r.z,r.radius),Xl(),this.scene.remove(i),F(i),this.fireballs.delete(t),this.prevFireballPositions.delete(t)}for(const t of e.projectiles){if(t.type!=="fireball")continue;if(!this.fireballs.has(t.id)){Yl();const p=t.radius??10,f=new H(kt,Fr);f.scale.setScalar(p*.8);const m=new H(kt,Nr);m.scale.setScalar(1.4/.8),f.add(m),this.scene.add(f),this.fireballs.set(t.id,f)}const i=this.fireballs.get(t.id),r=t.position.x,o=30,n=t.position.y;i.position.set(r,o,n);const l=this.prevFireballPositions.get(t.id);let d=0,h=0;if(l){const p=r-l.x,f=n-l.z,m=Math.sqrt(p*p+f*f);m>0&&(d=p/m,h=f/m)}this.shouldEmitContinuous&&this.particles.emitTrail(r,o,n,d,h,t.radius??10),this.prevFireballPositions.set(t.id,{x:r,y:o,z:n,radius:t.blastRadius??t.radius??10})}}syncArrows(e){const s=new Set(e.projectiles.filter(t=>t.type==="arrow").map(t=>t.id));for(const[t,i]of this.arrows)s.has(t)||(this.scene.remove(i.mesh),F(i.mesh),this.arrows.delete(t));for(const t of e.projectiles){if(t.type!=="arrow")continue;if(!this.arrows.has(t.id)){Zl();const p=new ye,f=t.ownerId===this.myId?gt[this.arrowElement]:16777215,m=new H(Tr,Pc(f));p.add(m);const b=new Ks(Er,zc(f));p.add(b),this.scene.add(p),this.arrows.set(t.id,{mesh:p})}const i=this.arrows.get(t.id),r=t.position.x,o=30,n=t.position.y;i.mesh.position.set(r,o,n);const l=t.velocity.x,d=t.velocity.y,h=Math.atan2(d,l);i.mesh.rotation.set(-Math.PI/2,0,-h)}}syncSpears(e){const s=new Set(e.projectiles.filter(t=>t.type==="spear").map(t=>t.id));for(const[t,i]of this.spears)s.has(t)||(this.scene.remove(i.mesh),F(i.mesh),this.spears.delete(t));for(const t of e.projectiles){if(t.type!=="spear")continue;if(!this.spears.has(t.id)){const p=new ye,f=new H(Ir,Dr);p.add(f);const m=new H(Lr,Ur);m.position.x=13,p.add(m),this.scene.add(p),this.spears.set(t.id,{mesh:p})}const i=this.spears.get(t.id),r=t.position.x,o=30,n=t.position.y;i.mesh.position.set(r,o,n);const l=t.velocity.x,d=t.velocity.y,h=Math.atan2(d,l);i.mesh.rotation.set(-Math.PI/2,0,-h)}}syncIceBolts(e){const s=new Set(e.projectiles.filter(t=>t.type==="icebolt"||t.type==="iceshard").map(t=>t.id));for(const[t,i]of this.iceBolts)s.has(t)||(this.scene.remove(i.mesh),F(i.mesh),this.iceBolts.delete(t));for(const t of e.projectiles){if(t.type!=="icebolt"&&t.type!=="iceshard")continue;if(!this.iceBolts.has(t.id)){const p=new ye,f=new H(qr,Gr);t.type==="iceshard"&&f.scale.setScalar(.45),p.add(f),this.scene.add(p),this.iceBolts.set(t.id,{mesh:p})}const i=this.iceBolts.get(t.id),r=t.position.x,o=30,n=t.position.y;i.mesh.position.set(r,o,n);const l=t.velocity.x,d=t.velocity.y,h=Math.atan2(d,l);i.mesh.rotation.set(-Math.PI/2,0,-h)}}syncFireWalls(e){const s=new Set(e.fireWalls.map(t=>t.id));for(const[t,i]of this.fireWalls)if(!s.has(t)){this.scene.remove(i),F(i),this.fireWalls.delete(t),this.wallSignatures.delete(t),Cr(t);const r=this.rainZoneArrows.get(t);r&&(this.scene.remove(r.arrowGroup),F(r.arrowGroup),this.rainZoneArrows.delete(t))}for(const t of e.fireWalls){const i=t.kind==="rain",r=t.kind==="blizzard",o=t.kind==="caltrops";if(!this.fireWalls.has(t.id)){!i&&!r&&!o&&sc(t.id);const n=new ye;if(t.shape==="circle"&&t.center&&t.radius){const l=new H(new ss(t.radius,32),new U({color:r?gt.freeze:i?gt[this.arrowElement]:o?9075292:16720384,transparent:!0,opacity:r?.18:i?.15:o?.13:.2,side:Se}));l.rotation.x=-Math.PI/2,l.position.set(t.center.x,1,t.center.y),n.add(l),i?this.rainZoneArrows.set(t.id,this.createFallingArrows(t.center.x,t.center.y,t.radius,12)):r&&this.rainZoneArrows.set(t.id,this.createFallingShards(t.center.x,t.center.y,t.radius,20))}else this.rebuildWallSegments(n,t),this.wallSignatures.set(t.id,ma(t));this.scene.add(n),this.fireWalls.set(t.id,n)}if(t.shape!=="circle"&&this.shouldEmitContinuous){const n=ma(t);n!==this.wallSignatures.get(t.id)&&(this.wallSignatures.set(t.id,n),this.rebuildWallSegments(this.fireWalls.get(t.id),t))}if(t.shape==="circle"&&t.center&&t.radius){const n=this.fireWalls.get(t.id),l=n==null?void 0:n.children[0];if(l&&l.position.set(t.center.x,1,t.center.y),i||r){const d=this.rainZoneArrows.get(t.id);d&&(d.arrowGroup.position.set(t.center.x,0,t.center.y),this.updateFallingArrows(d))}else this.shouldEmitContinuous&&this.particles.emitCrater(t.center.x,t.center.y,t.radius)}else this.shouldEmitContinuous&&this.particles.emitWall(t.segments)}}rebuildWallSegments(e,s){for(const t of[...e.children])e.remove(t),F(t);for(const t of s.segments){const i=[new se(t.x1,1,t.y1),new se(t.x2,1,t.y2)];e.add(new Ks(new pt().setFromPoints(i),Hr))}}syncMeteors(e){const s=new Set(e.meteors.map(t=>t.id));for(const[t,i]of this.meteors)s.has(t)||(this.scene.remove(i.ring),this.scene.remove(i.rock),F(i.ring),F(i.rock),this.particles.emitMeteorImpact(i.target.x,0,i.target.y),Ql(),this.meteors.delete(t));for(const t of e.meteors){if(!this.meteors.has(t.id)){Kl();const p=t.aoeRadius/ln,f=new H(Rr,new U({color:16720384,transparent:!0,opacity:.6,side:Se}));f.rotation.x=-Math.PI/2,f.position.set(t.target.x,2,t.target.y);const m=new H($r,Br);this.scene.add(f),this.scene.add(m),this.meteors.set(t.id,{ring:f,rock:m,target:{...t.target},spawnTime:this.elapsedTime,sizeScale:p})}const i=this.meteors.get(t.id);i.target.x=t.target.x,i.target.y=t.target.y,i.ring.position.set(t.target.x,2,t.target.y),i.ring.visible=!0,i.rock.visible=!0;const r=Math.max(0,Math.min(1,1-(t.strikeAt-e.tick)/nn)),o=1-r*.4;i.ring.scale.setScalar(o*i.sizeScale);const n=this.elapsedTime-i.spawnTime,l=.5+r*2;i.ring.material.opacity=Math.sin(n*l*Math.PI*2)*.3+.5;const d=500*(1-r);i.rock.position.set(t.target.x,d,t.target.y);const h=.4+r*.6;i.rock.scale.setScalar(h*i.sizeScale),this.shouldEmitContinuous&&this.particles.emitMeteorTrail(t.target.x,d,t.target.y)}}syncRainOfArrows(e){const s=new Set(e.rainOfArrows.map(t=>t.id));for(const[t,i]of this.rainOfArrows)s.has(t)||(this.scene.remove(i.circle),this.scene.remove(i.arrowGroup),F(i.circle),F(i.arrowGroup),this.particles.emitRainImpact(i.target.x,0,i.target.y,i.radius),ec(),this.rainOfArrows.delete(t));for(const t of e.rainOfArrows){if(!this.rainOfArrows.has(t.id)){Jl();const o=gt[this.arrowElement],n=new H(new ss(t.radius,48),new U({color:o,transparent:!0,opacity:.12,side:Se}));n.rotation.x=-Math.PI/2,n.position.set(t.target.x,1,t.target.y),this.scene.add(n);const l=this.createFallingArrows(t.target.x,t.target.y,t.radius);l.arrowMaterial.opacity=0,this.rainOfArrows.set(t.id,{circle:n,target:{...t.target},radius:t.radius,...l})}const i=this.rainOfArrows.get(t.id),r=Math.max(0,Math.min(1,1-(t.strikeAt-e.tick)/cn));i.circle.material.opacity=.12+r*.23,i.arrowMaterial.opacity=Math.min(1,r*2),this.updateFallingArrows(i)}}syncTraps(e){const s=new Set(e.traps.map(t=>t.id));for(const[t,i]of this.traps)s.has(t)||(this.scene.remove(i.group),F(i.group),i.expired||(this.particles.emitRainImpact(i.position.x,0,i.position.y,i.blastRadius),Wl()),this.traps.delete(t));for(const t of e.traps){if(!this.traps.has(t.id)){const r=new ye,o=t.kind==="deadfall",n=new H(new ss(o?16:10,12),new U({color:o?9071162:7307090,transparent:!0,opacity:.9,side:Se}));n.rotation.x=-Math.PI/2,n.position.set(t.position.x,1.5,t.position.y),r.add(n);const l=new U({color:o?13208378:10473578,transparent:!0,opacity:.35,side:Se}),d=new H(new Ut(t.triggerRadius-2,t.triggerRadius,40),l);d.rotation.x=-Math.PI/2,d.position.set(t.position.x,1,t.position.y),r.add(d),this.scene.add(r),this.traps.set(t.id,{group:r,ring:d,ringMaterial:l,position:{...t.position},blastRadius:t.blastRadius,expired:!1})}const i=this.traps.get(t.id);i.expired=e.tick>=t.expiresAt,e.tick<t.armedAt?i.ringMaterial.opacity=.15+.25*(.5+.5*Math.sin(this.elapsedTime*12)):i.ringMaterial.opacity=.4}}syncGladiatorStatus(e){const s=t=>!t||t.hp<=0||rs(t,this.myId,e.tick);for(const[t,i]of this.blockShields){const r=e.players[t];(s(r)||!r.blocking)&&(this.scene.remove(i.mesh),F(i.mesh),this.blockShields.delete(t))}for(const[t,i]of this.reflectShimmers){const r=e.players[t];(s(r)||!((r.reflectUntil??0)>e.tick))&&(this.scene.remove(i.mesh),F(i.mesh),this.reflectShimmers.delete(t))}for(const[t,i]of this.stunStars){const r=e.players[t];if(s(r)||!((r.stunUntil??0)>e.tick)){for(const o of i.sprites)this.scene.remove(o);this.stunStars.delete(t)}}for(const t of Object.values(e.players))if(!(t.hp<=0||rs(t,this.myId,e.tick))){if(t.blocking){if(!this.blockShields.has(t.id)){const r=new H(Pr,jr);this.scene.add(r),this.blockShields.set(t.id,{mesh:r})}const i=this.blockShields.get(t.id);i.mesh.position.set(t.position.x,2,t.position.y),i.mesh.rotation.set(-Math.PI/2,0,-t.facing)}if((t.reflectUntil??0)>e.tick){if(!this.reflectShimmers.has(t.id)){const r=new H(zr,ri);r.rotation.x=-Math.PI/2,this.scene.add(r),this.reflectShimmers.set(t.id,{mesh:r})}this.reflectShimmers.get(t.id).mesh.position.set(t.position.x,2,t.position.y),ri.opacity=Math.sin(this.elapsedTime*4)*.25+.5}if((t.stunUntil??0)>e.tick){if(!this.stunStars.has(t.id)){const o=[];for(let n=0;n<3;n++){const l=new qo(Lc());l.scale.set(8,8,1),this.scene.add(l),o.push(l)}this.stunStars.set(t.id,{sprites:o})}const i=this.stunStars.get(t.id),r=12;for(let o=0;o<i.sprites.length;o++){const n=this.elapsedTime*4+o*(Math.PI*2/3);i.sprites[o].position.set(t.position.x+Math.cos(n)*r,30,t.position.y+Math.sin(n)*r)}}}}syncFrozenOrbs(e){const s=e.frozenOrbs??[],t=new Set(s.map(i=>i.id));for(const[i,r]of this.frozenOrbs)t.has(i)||(this.scene.remove(r.mesh),F(r.mesh),this.frozenOrbs.delete(i));for(const i of s){if(!this.frozenOrbs.has(i.id)){const o=new H(kt,Vr);o.scale.setScalar(bc*.8);const n=new H(kt,Wr);n.scale.setScalar(1.4/.8),o.add(n),this.scene.add(o),this.frozenOrbs.set(i.id,{mesh:o})}this.frozenOrbs.get(i.id).mesh.position.set(i.position.x,30,i.position.y)}}syncIceRays(e,s){const t=new Set(Object.entries(e.players).filter(([,i])=>i.channelSpell===12&&i.channelEnd).map(([i])=>i));for(const[i,r]of this.iceRays)t.has(i)||(this.scene.remove(r.mesh),F(r.mesh),this.iceRays.delete(i));for(const[i,r]of Object.entries(e.players)){if(r.channelSpell!==12||!r.channelEnd)continue;if(!this.iceRays.has(i)){const C=new U({color:kc,transparent:!0,opacity:qs}),k=new H(ai,C),y=new U({color:Yr,transparent:!0,opacity:Os,depthWrite:!1}),M=new H(ai,y);M.scale.set(1,Cc,Mc),k.add(M),this.scene.add(k),this.iceRays.set(i,{mesh:k,glow:M,spinAngle:0})}const o=this.iceRays.get(i),n=o.mesh,l=o.glow,d=il(r.channelTicks??0),h=r.channelEnd.x-r.position.x,p=r.channelEnd.y-r.position.y,f=Math.sqrt(h*h+p*p),m=Math.atan2(p,h),b=d.halfWidth*2;n.position.set((r.position.x+r.channelEnd.x)/2,30,(r.position.y+r.channelEnd.y)/2);const u=(d.halfWidth-Js)/(rr-Js);n.rotation.set(-Math.PI/2,0,-m);const g=pa+u*(Tc-pa);o.spinAngle+=s*g,n.rotateX(o.spinAngle),n.scale.set(Math.max(f,.001),b*Xr,vc*Zr);const _=1-(1-u)*(1-u),E=n.material;E.opacity=qs+_*(Ec-qs);const x=l.material;if(x.opacity=Os+_*(Ac-Os),x.color.copy(yc).lerp(wc,_*Rc),this.shouldEmitContinuous&&f>0){const C=h/f,k=p/f,y=-k,M=C,q=3+Math.round(u*7),v=_*$c;for(let w=0;w<q;w++){const I=(w+Math.random())/q,z=(Math.random()-.5)*d.halfWidth*1.6;this.particles.emitIceRayTrail(r.position.x+h*I+y*z,28+Math.random()*6,r.position.y+p*I+M*z,C,k,d.halfWidth*.6,v)}this.particles.emitIceRayTrail(r.channelEnd.x,28,r.channelEnd.y,-C,-k,d.halfWidth*(1.2+u*.8),v)}}}syncUniqueAuras(e,s){if(!this.shouldEmitAura)return;const t=vr(),i=new Set;for(const r of Object.values(e.players)){if(i.add(r.id),r.hp<=0||rs(r,this.myId,e.tick))continue;const o=r.id===this.myId&&s?s:r.position,n=Qn(r.gear??{}),l=this.prevAuraPositions.get(r.id),d=Fc(l,o);this.prevAuraPositions.set(r.id,{...o});for(const{aura:h}of n)this.particles.emitAura(h.style,h.color,o.x,qc(h.anchor,t),o.y,{intensity:h.intensity,motes:h.motes,phase:this.elapsedTime,moving:d})}for(const r of this.prevAuraPositions.keys())i.has(r)||this.prevAuraPositions.delete(r)}dispose(){ic();for(const e of this.fireballs.values())this.scene.remove(e),F(e);for(const e of this.arrows.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.spears.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.blockShields.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.reflectShimmers.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.stunStars.values())for(const s of e.sprites)this.scene.remove(s);for(const e of this.iceBolts.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.fireWalls.values())this.scene.remove(e),F(e);for(const e of this.rainZoneArrows.values())this.scene.remove(e.arrowGroup),F(e.arrowGroup);this.rainZoneArrows.clear();for(const e of this.meteors.values())this.scene.remove(e.ring),this.scene.remove(e.rock),F(e.ring),F(e.rock);for(const e of this.rainOfArrows.values())this.scene.remove(e.circle),this.scene.remove(e.arrowGroup),F(e.circle),F(e.arrowGroup);for(const e of this.frozenOrbs.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.iceRays.values())this.scene.remove(e.mesh),F(e.mesh);for(const e of this.traps.values())this.scene.remove(e.group),F(e.group);for(const e of this.teleportEffects)e.dispose();this.fireballs.clear(),this.arrows.clear(),this.spears.clear(),this.blockShields.clear(),this.reflectShimmers.clear(),this.stunStars.clear(),this.iceBolts.clear(),this.fireWalls.clear(),this.meteors.clear(),this.rainOfArrows.clear(),this.frozenOrbs.clear(),this.iceRays.clear(),this.traps.clear(),this.teleportEffects.length=0,this.particles.dispose()}}const de=256,Bc=Math.floor(de*.9),Hc=20,Dc=12,Uc=new we(8051066);function jc(a,e){return a.hp<=0||(a.invisibleUntil??0)>e?null:a.restCastEndTick!==void 0&&a.restCastEndTick>e?"windup":a.resting?"resting":null}class Gc{constructor(e){c(this,"posX",new Float32Array(de));c(this,"posY",new Float32Array(de));c(this,"posZ",new Float32Array(de));c(this,"velX",new Float32Array(de));c(this,"velY",new Float32Array(de));c(this,"velZ",new Float32Array(de));c(this,"life",new Float32Array(de));c(this,"maxLife",new Float32Array(de));c(this,"particleSize",new Float32Array(de));c(this,"activeCount",0);c(this,"carry",new Map);c(this,"positionBuffer",new Float32Array(de*3));c(this,"sizeBuffer",new Float32Array(de));c(this,"posAttr");c(this,"sizeAttr");c(this,"geometry");c(this,"points");c(this,"material");c(this,"onResize",()=>{typeof window>"u"||(this.material.uniforms.uSizeScale.value=window.innerHeight*Math.min(window.devicePixelRatio||1,hs)/De)});this.scene=e,this.geometry=new pt,this.posAttr=new Mt(this.positionBuffer,3),this.posAttr.setUsage(Tt),this.geometry.setAttribute("position",this.posAttr),this.sizeAttr=new Mt(this.sizeBuffer,1),this.sizeAttr.setUsage(Tt),this.geometry.setAttribute("size",this.sizeAttr),this.geometry.setDrawRange(0,0);const s=new Ee({uniforms:{uColor:{value:Uc},uSizeScale:{value:1}},vertexShader:`
        uniform float uSizeScale;
        attribute float size;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uSizeScale;
        }
      `,fragmentShader:`
        uniform vec3 uColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,transparent:!0,depthWrite:!1,blending:ys});this.material=s,this.points=new er(this.geometry,s),this.points.frustumCulled=!1,e.add(this.points),this.onResize(),typeof window<"u"&&window.addEventListener("resize",this.onResize)}update(e,s){const t=e.tick;for(const r of Object.values(e.players)){const o=jc(r,t);if(!o){this.carry.delete(r.id);continue}const n=o==="resting"?Hc:Dc;let l=Math.min((this.carry.get(r.id)??0)+n*s,6);for(;l>=1;)l-=1,o==="resting"?this.spawnRising(r.position.x,r.position.y):this.spawnConverging(r.position.x,r.position.y);this.carry.set(r.id,l)}for(const r of this.carry.keys())r in e.players||this.carry.delete(r);let i=0;for(;i<this.activeCount;){if(this.life[i]-=s,this.life[i]<=0){const o=this.activeCount-1;this.posX[i]=this.posX[o],this.posY[i]=this.posY[o],this.posZ[i]=this.posZ[o],this.velX[i]=this.velX[o],this.velY[i]=this.velY[o],this.velZ[i]=this.velZ[o],this.life[i]=this.life[o],this.maxLife[i]=this.maxLife[o],this.particleSize[i]=this.particleSize[o],this.activeCount--;continue}this.posX[i]+=this.velX[i]*s,this.posY[i]+=this.velY[i]*s,this.posZ[i]+=this.velZ[i]*s;const r=i*3;this.positionBuffer[r]=this.posX[i],this.positionBuffer[r+1]=this.posY[i],this.positionBuffer[r+2]=this.posZ[i],this.sizeBuffer[i]=this.particleSize[i]*(this.life[i]/this.maxLife[i]),i++}this.geometry.setDrawRange(0,this.activeCount),this.activeCount>0&&(this.posAttr.addUpdateRange(0,this.activeCount*3),this.sizeAttr.addUpdateRange(0,this.activeCount),this.posAttr.needsUpdate=!0,this.sizeAttr.needsUpdate=!0)}spawnRising(e,s){const t=Math.random()*Math.PI*2,i=Math.random()*16;this.spawn(e+Math.cos(t)*i,2+Math.random()*4,s+Math.sin(t)*i,(Math.random()-.5)*12,20+Math.random()*15,(Math.random()-.5)*12,1+Math.random()*.4,13+Math.random()*4)}spawnConverging(e,s){const t=Math.random()*Math.PI*2,i=28,r=35;this.spawn(e+Math.cos(t)*i,14+Math.random()*6,s+Math.sin(t)*i,-Math.cos(t)*r,(Math.random()-.5)*6,-Math.sin(t)*r,.8,11+Math.random()*3)}spawn(e,s,t,i,r,o,n,l){if(this.activeCount>=Bc)return;const d=this.activeCount++;this.posX[d]=e,this.posY[d]=s,this.posZ[d]=t,this.velX[d]=i,this.velY[d]=r,this.velZ[d]=o,this.life[d]=n,this.maxLife[d]=n,this.particleSize[d]=l}dispose(){typeof window<"u"&&window.removeEventListener("resize",this.onResize),this.scene.remove(this.points),this.geometry.dispose(),this.points.material.dispose()}}const Kr=1e3/be,Fs=2*Kr,Vc=250;class Wc{constructor(){c(this,"snapshots",[]);c(this,"maxSnapshots",32);c(this,"clockOffset",null);c(this,"jitter",0);c(this,"renderDelayMs",Fs);c(this,"outOfBandCount",0)}push(e,s=performance.now()){const t=e.tick*Kr,i=s-t;this.clockOffset===null?this.clockOffset=i:Math.abs(i-this.clockOffset)>Vc?(this.outOfBandCount++,this.outOfBandCount>=2&&(this.clockOffset=i,this.jitter=0,this.outOfBandCount=0)):(this.outOfBandCount=0,this.jitter=this.jitter*.9+Math.abs(i-this.clockOffset)*.1,this.clockOffset=this.clockOffset*.95+i*.05),this.renderDelayMs=Fs+this.jitter*2,this.snapshots.push({state:e,tickTime:t}),this.snapshots.length>this.maxSnapshots&&this.snapshots.shift()}getInterpolated(e=performance.now()){if(this.snapshots.length<2||this.clockOffset===null)return null;const s=e-this.clockOffset-this.renderDelayMs;let t=0;for(;t<this.snapshots.length-1&&!(this.snapshots[t+1].tickTime>=s);t++);t=Math.max(0,Math.min(t,this.snapshots.length-2));const i=this.snapshots[t],r=this.snapshots[t+1],o=r.tickTime-i.tickTime,n=o>0?Math.max(0,Math.min(1,(s-i.tickTime)/o)):1,l={};for(const d of Object.keys(r.state.players)){const h=i.state.players[d],p=r.state.players[d];if(!h){l[d]=p;continue}l[d]={...p,position:Yc(h.position,p.position,n),facing:Xc(h.facing,p.facing,n)}}return{...r.state,players:l}}getLatest(){return this.snapshots.length===0?null:this.snapshots[this.snapshots.length-1].state}clear(){this.snapshots=[],this.clockOffset=null,this.jitter=0,this.renderDelayMs=Fs,this.outOfBandCount=0}}function Yc(a,e,s){return{x:a.x+(e.x-a.x)*s,y:a.y+(e.y-a.y)*s}}function Xc(a,e,s){let t=e-a;for(;t>Math.PI;)t-=2*Math.PI;for(;t<-Math.PI;)t+=2*Math.PI;return a+t*s}const Zc=30,Kc=.5,Qc=100;class Jc{constructor(e){c(this,"position");c(this,"prevPosition");c(this,"seq",0);c(this,"buffer",[]);c(this,"correctionOffset",{x:0,y:0});c(this,"correctionStartTime",0);c(this,"correctionDurationMs",Qc);this.position={...e},this.prevPosition={...e}}applyInput(e,s,t={}){this.seq++,this.prevPosition={...this.position};const i=t.speedMult??1;return this.position=Oi(this.position,e,i),t.teleportTarget&&(this.position=qi(this.position,t.teleportTarget,t.teleportRange),this.prevPosition={...this.position}),this.buffer.push({seq:this.seq,move:e,speedMult:i,teleportTarget:t.teleportTarget,teleportRange:t.teleportRange}),this.seq}reconcile(e,s){if(this.buffer=this.buffer.filter(n=>n.seq>s),this.buffer.length>Zc){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0};return}let t={...e};for(const n of this.buffer)t=Oi(t,n.move,n.speedMult),n.teleportTarget&&(t=qi(t,n.teleportTarget,n.teleportRange));const i=t.x-this.position.x,r=t.y-this.position.y;if(Math.sqrt(i*i+r*r)>Kc){const n=performance.now(),l=this.getRenderPosition(1,n),d=this.position.x-this.prevPosition.x,h=this.position.y-this.prevPosition.y;this.correctionOffset={x:l.x-t.x,y:l.y-t.y},this.correctionStartTime=n,this.prevPosition={x:t.x-d,y:t.y-h},this.position=t}}getPosition(e=performance.now()){return this.getRenderPosition(1,e)}getRenderPosition(e,s=performance.now()){const t=Math.max(0,Math.min(1,e)),i={x:this.prevPosition.x+(this.position.x-this.prevPosition.x)*t,y:this.prevPosition.y+(this.position.y-this.prevPosition.y)*t};if(this.correctionOffset.x===0&&this.correctionOffset.y===0)return i;const r=s-this.correctionStartTime,n=1-Math.min(1,r/this.correctionDurationMs);return{x:i.x+this.correctionOffset.x*n,y:i.y+this.correctionOffset.y*n}}reset(e){this.position={...e},this.prevPosition={...e},this.buffer=[],this.correctionOffset={x:0,y:0}}getSeq(){return this.seq}}class ed{constructor(){c(this,"socket");const e="http://localhost:3001";this.socket=Bo(e,{autoConnect:!1,transports:["websocket"]})}connect(){this.socket.connect()}disconnect(){this.socket.removeAllListeners(),this.socket.disconnect()}joinRoom(e,s,t,i,r){this.socket.emit("join-room",{roomId:e,displayName:s,accessToken:t,teamId:i,characterId:r})}ready(){this.socket.emit("player-ready")}sendInput(e){this.socket.emit("input",e)}rematch(){this.socket.emit("rematch")}sendChatMessage(e){this.socket.emit("chat-message",{text:e})}rejoinRoom(e,s){this.socket.emit("rejoin-room",{roomId:e,accessToken:s})}leavePausedMatch(){this.socket.emit("leave-paused-match")}onRoomJoined(e){this.socket.once("room-joined",e)}onPlayerJoined(e){this.socket.on("player-joined",e)}onGameReady(e){this.socket.once("game-ready",e)}onGameState(e){this.socket.off("game-state"),this.socket.on("game-state",e)}onDuelEnded(e){this.socket.off("duel-ended"),this.socket.on("duel-ended",e)}onRematchReady(e){this.socket.off("rematch-ready"),this.socket.on("rematch-ready",e)}onRematchRequested(e){this.socket.off("rematch-requested"),this.socket.on("rematch-requested",e)}onOpponentDisconnected(e){this.socket.off("opponent-disconnected"),this.socket.on("opponent-disconnected",e)}onTeamFull(e){this.socket.once("team-full",e)}onPlayerDisconnected(e){this.socket.on("player-disconnected",e)}onPlayerLeft(e){this.socket.on("player-left",e)}onRoomNotFound(e){this.socket.off("room-not-found"),this.socket.on("room-not-found",e)}onLoadoutLoadFailed(e){this.socket.off("loadout-load-failed"),this.socket.on("loadout-load-failed",e)}onChatMessage(e){this.socket.off("chat-message"),this.socket.on("chat-message",e)}onPlayerReadyAck(e){this.socket.off("player-ready-ack"),this.socket.on("player-ready-ack",e)}onMatchPaused(e){this.socket.off("match-paused"),this.socket.on("match-paused",e)}onGameResumed(e){this.socket.off("game-resumed"),this.socket.on("game-resumed",e)}onRejoinAccepted(e){this.socket.off("rejoin-accepted"),this.socket.once("rejoin-accepted",e)}onRejoinFailed(e){this.socket.off("rejoin-failed"),this.socket.once("rejoin-failed",e)}onReconnect(e){this.socket.on("connect",e)}onDisconnect(e){this.socket.on("disconnect",e)}get id(){return this.socket.id??""}}const Qr=-Math.PI/4,ga=Math.cos(Qr),xa=Math.sin(Qr);class td{constructor(e,s){c(this,"keys",new Set);c(this,"activeSpell",null);c(this,"slots",new Array(Pt).fill(null));c(this,"charClass","mage");c(this,"mouseScreen",{x:0,y:0});c(this,"mouseWorld",{x:1e3,y:1e3});c(this,"pendingCast",null);c(this,"leftHeld",!1);c(this,"channelSpells",new Set);c(this,"pendingRest",!1);c(this,"blockHeld",!1);c(this,"onKeyDown",e=>{this.keys.add(e.code);const s=/^Digit([1-6])$/.exec(e.code);if(s){const t=this.spellForSlot(Number(s[1]));t&&(this.activeSpell=t)}if(e.code==="Space"){e.preventDefault();const t=xn[this.charClass];this.slots.includes(t)&&(this.pendingCast={spell:t,aimTarget:this.mouseWorld})}e.code==="KeyR"&&(this.pendingRest=!0)});c(this,"onKeyUp",e=>{this.keys.delete(e.code)});c(this,"onBlur",()=>{this.keys.clear(),this.leftHeld=!1,this.blockHeld=!1});c(this,"onContextMenu",e=>{e.preventDefault()});c(this,"onMouseMove",e=>{this.mouseScreen={x:e.clientX,y:e.clientY},this.mouseWorld=this.scene.screenToWorld(e.clientX,e.clientY),(e.buttons&2)===0&&(this.blockHeld=!1),(e.buttons&1)===0&&(this.leftHeld=!1)});c(this,"onMouseDown",e=>{if(e.button===2){e.preventDefault(),this.blockHeld=!0;return}e.button===0&&(this.leftHeld=!0)});c(this,"onMouseUp",e=>{if(e.button===2){this.blockHeld=!1;return}e.button===0&&(this.leftHeld=!1,this.activeSpell!==null&&(this.activeIsChannel||(this.pendingCast={spell:this.activeSpell,aimTarget:this.mouseWorld})))});this.scene=e,this.canvas=s,window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur),window.addEventListener("contextmenu",this.onContextMenu),s.addEventListener("mousemove",this.onMouseMove),s.addEventListener("mousedown",this.onMouseDown),s.addEventListener("mouseup",this.onMouseUp)}spellForSlot(e){return this.slots[e-1]??null}get activeIsChannel(){return this.activeSpell!==null&&this.channelSpells.has(this.activeSpell)}buildInputFrame(){const e={x:0,y:0};(this.keys.has("KeyW")||this.keys.has("ArrowUp"))&&(e.y-=1),(this.keys.has("KeyS")||this.keys.has("ArrowDown"))&&(e.y+=1),(this.keys.has("KeyA")||this.keys.has("ArrowLeft"))&&(e.x-=1),(this.keys.has("KeyD")||this.keys.has("ArrowRight"))&&(e.x+=1);const s=e.x*ga-e.y*xa,t=e.x*xa+e.y*ga;e.x=s,e.y=t;const i={move:e,castSpell:null,channel:this.leftHeld&&this.activeIsChannel?this.activeSpell:null,aimTarget:this.mouseWorld};return this.pendingCast&&(i.castSpell=this.pendingCast.spell,i.aimTarget=this.pendingCast.aimTarget,this.pendingCast=null),this.pendingRest&&(i.rest=!0,this.pendingRest=!1),this.blockHeld&&this.charClass==="gladiator"&&(i.blocking=!0),i}refreshMouseWorld(){this.mouseWorld=this.scene.screenToWorld(this.mouseScreen.x,this.mouseScreen.y)}setSlots(e){this.slots=e,(this.activeSpell===null||!e.includes(this.activeSpell))&&(this.activeSpell=e.find(s=>s!==null)??null)}setCharacterClass(e){this.charClass=e==="ranger"||e==="gladiator"?e:"mage"}setChannelSpells(e){this.channelSpells=e}getActiveSpell(){return this.activeSpell}getCurrentMouseWorld(){return this.mouseWorld}isBlockHeld(){return this.blockHeld}dispose(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),window.removeEventListener("contextmenu",this.onContextMenu),this.canvas.removeEventListener("mousemove",this.onMouseMove),this.canvas.removeEventListener("mousedown",this.onMouseDown),this.canvas.removeEventListener("mouseup",this.onMouseUp)}}const ue=120;function Ns(a,e){const s=ue/2+(a-e)*ue/(2*j),t=(a+e)*ue/(2*j);return[s,t]}class sd{constructor(e){c(this,"canvas");c(this,"ctx");this.canvas=document.createElement("canvas"),this.canvas.width=ue,this.canvas.height=ue,Object.assign(this.canvas.style,{position:"fixed",top:"12px",right:"12px",opacity:"0.85",border:"none",borderRadius:"0",boxShadow:"0 0 0 2px var(--px-border-dark),0 0 0 4px var(--px-border-light)",imageRendering:"pixelated",zIndex:"100",display:"none"}),e.appendChild(this.canvas),this.ctx=this.canvas.getContext("2d")}update(e,s){const t=this.ctx;t.clearRect(0,0,ue,ue),t.fillStyle="#0a0a1a",t.fillRect(0,0,ue,ue),t.strokeStyle="#333",t.lineWidth=1,t.strokeRect(0,0,ue,ue),t.fillStyle="#6c63ff";for(const n of Et){const[l,d]=Ns(n.x,n.y);t.fillRect(l-2,d-2,4,4)}const i=["#ff5252","#ff9800","#ab47bc"];for(let n=0;n<s.length;n++){const l=s[n];if(l.hp<=0)continue;const[d,h]=Ns(l.position.x,l.position.y);t.fillStyle=i[n%i.length],t.beginPath(),t.arc(d,h,3,0,Math.PI*2),t.fill()}const[r,o]=Ns(e.position.x,e.position.y);t.fillStyle="#00e676",t.beginPath(),t.arc(r,o,3,0,Math.PI*2),t.fill()}show(){this.canvas.style.display=""}hide(){this.canvas.style.display="none"}}const id={1:"fa-fire",2:"fa-fire-flame-simple",3:"fa-meteor",4:"fa-wand-magic",5:"fa-bullseye",6:"fa-arrows-split-up-and-left",7:"fa-cloud-rain",8:"fa-person-running",9:"fa-icicles",10:"fa-snowflake",11:"fa-circle-nodes",12:"fa-bolt",13:"fa-hand-fist",14:"fa-location-arrow",15:"fa-shield-halved",16:"fa-shoe-prints",17:"fa-bomb",18:"fa-splotch",19:"fa-skull-crossbones"},ad={1:"#ff8c42",2:"#ff8c42",3:"#ff8c42",4:"#b48cff",5:"#8cd97a",6:"#8cd97a",7:"#8cd97a",8:"#b48cff",9:"#6fd3f2",10:"#6fd3f2",11:"#6fd3f2",12:"#6fd3f2",13:"#d9a45b",14:"#d9a45b",15:"#8ca9ff",16:"#b48cff",17:"#7fae5c",18:"#7fae5c",19:"#7fae5c"},Bs="polygon(37.5% 0%,62.5% 0%,75% 6.25%,87.5% 12.5%,93.75% 25%,100% 37.5%,100% 62.5%,93.75% 75%,87.5% 87.5%,75% 93.75%,62.5% 100%,37.5% 100%,25% 93.75%,12.5% 87.5%,6.25% 75%,0% 62.5%,0% 37.5%,6.25% 25%,12.5% 12.5%,25% 6.25%)";class rd{constructor(e){c(this,"el");c(this,"minimap");c(this,"myId","");c(this,"prevHp",{});c(this,"hpFill");c(this,"mpFill");c(this,"hpOrb");c(this,"hpNum");c(this,"mpNum");c(this,"spellsEl");c(this,"enemiesEl");c(this,"slotEls",[]);c(this,"enemyRows",new Map);c(this,"lastHpPct",-1);c(this,"lastMpPct",-1);c(this,"lastHpText","");c(this,"lastMpText","");c(this,"lastLowPulse",!1);c(this,"restSlot");c(this,"restCd");c(this,"restCdTime");c(this,"lastRestPct",-1);c(this,"lastRestState","");c(this,"lastRestCdText","");c(this,"blockSlot");c(this,"blockCd");c(this,"blockCdTime");c(this,"lastBlockPct",-1);c(this,"lastBlockState","");c(this,"lastBlockCdText","");this.minimap=new sd(e),this.el=document.createElement("div"),this.el.innerHTML=`
      <style>
        .hud-dock{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:18px;pointer-events:none}
        /* --- orbs --- */
        .orb-wrap{display:flex;flex-direction:column;align-items:center;gap:5px}
        .orb{width:88px;height:88px;position:relative;clip-path:${Bs};background:var(--px-border-dark);}
        .orb-inner{position:absolute;inset:5px;clip-path:${Bs};background:#101117;overflow:hidden}
        .orb-fill{position:absolute;inset:0;transition:transform .12s}
        .orb-fill::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.35)}
        .orb-hp .orb-fill{background:linear-gradient(180deg,#e0524a 0%,#b32e2e 45%,#7d1c22 100%)}
        .orb-mp .orb-fill{background:linear-gradient(180deg,#4a7ce0 0%,#2e50b3 45%,#1c2f7d 100%)}
        .orb-shine{position:absolute;top:12%;left:18%;width:26%;height:16%;background:rgba(255,255,255,0.22);clip-path:${Bs};pointer-events:none}
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
        .spell-slot.channeling .cd-overlay{background:rgba(46,92,46,0.65)}
        .spell-slot.channeling .cd-time{display:flex}
        .spell-slot.resting{box-shadow:inset 0 2px 0 0 rgba(255,255,255,0.08),inset 0 -2px 0 0 rgba(0,0,0,0.45),0 0 0 2px #7ad97a,0 0 10px rgba(122,217,122,0.55)}
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
        <div class="spells">
          <div class="spell-slot" id="hud-rest">
            <i class="fa fa-campground fa-fw slot-icon" style="color:#ddb84a"></i>
            <span class="slot-key">R</span>
            <div class="cd-overlay" style="height:0%"></div>
            <span class="cd-time"></span>
          </div>
          <div class="spell-slot" id="hud-block" style="display:none">
            <i class="fa fa-shield-halved fa-fw slot-icon" style="color:#8ca9ff"></i>
            <span class="slot-key">RMB</span>
            <div class="cd-overlay" style="height:0%"></div>
            <span class="cd-time"></span>
          </div>
        </div>
        <div class="orb-wrap">
          <div class="orb orb-mp">
            <div class="orb-inner"><div class="orb-fill" id="hud-mp" style="transform:translateY(0%)"></div></div>
            <div class="orb-shine"></div>
            <div class="orb-num" id="hud-mp-num"></div>
          </div>
          <div class="orb-label">MANA</div>
        </div>
      </div>
    `,e.appendChild(this.el),this.hpFill=this.el.querySelector("#hud-hp"),this.mpFill=this.el.querySelector("#hud-mp"),this.hpOrb=this.el.querySelector("#hud-hp-orb"),this.hpNum=this.el.querySelector("#hud-hp-num"),this.mpNum=this.el.querySelector("#hud-mp-num"),this.spellsEl=this.el.querySelector("#hud-spells"),this.enemiesEl=this.el.querySelector("#hud-enemies"),this.restSlot=this.el.querySelector("#hud-rest"),this.restCd=this.restSlot.querySelector(".cd-overlay"),this.restCdTime=this.restSlot.querySelector(".cd-time"),this.blockSlot=this.el.querySelector("#hud-block"),this.blockCd=this.blockSlot.querySelector(".cd-overlay"),this.blockCdTime=this.blockSlot.querySelector(".cd-time")}init(e){this.myId=e,this.prevHp={},this.enemiesEl.textContent="",this.enemyRows.clear(),this.lastHpPct=-1,this.lastMpPct=-1}buildSpellSlots(e){this.spellsEl.textContent="",this.slotEls=[];for(let s=0;s<Pt;s++){const t=e[s]??null,i=document.createElement("div");i.className=t===null?"spell-slot empty":"spell-slot";const r=t===null?"fa-minus":id[t]??"fa-star",o=t===null?"var(--px-text)":ad[t]??"var(--px-text)";if(i.innerHTML=`
        <i class="fa ${r} fa-fw slot-icon" style="color:${o}"></i>
        <span class="slot-key">${s+1}</span>
        <div class="cd-overlay" style="height:0%"></div>
        <span class="cd-time"></span>
        <div class="charge-pips"></div>`,this.spellsEl.appendChild(i),t===null){this.slotEls.push(null);continue}this.slotEls.push({spell:t,slot:i,cd:i.querySelector(".cd-overlay"),cdTime:i.querySelector(".cd-time"),pips:i.querySelector(".charge-pips"),lastPct:0,lastActive:!1,lastNoMana:!1,lastCooling:!1,lastCdText:""})}}update(e,s){const t=e.players[this.myId];if(!t)return;const i=t.maxHp??Qs,r=t.maxMana??ar,o=Math.round((1-t.hp/i)*1e3)/10;o!==this.lastHpPct&&(this.hpFill.style.transform=`translateY(${o}%)`,this.lastHpPct=o);const n=Math.round((1-t.mana/r)*1e3)/10;n!==this.lastMpPct&&(this.mpFill.style.transform=`translateY(${n}%)`,this.lastMpPct=n);const l=String(Math.max(0,Math.ceil(t.hp)));l!==this.lastHpText&&(this.hpNum.textContent=l,this.lastHpText=l);const d=String(Math.max(0,Math.floor(t.mana)));d!==this.lastMpText&&(this.mpNum.textContent=d,this.lastMpText=d);const h=t.hp>0&&t.hp/i<.3;h!==this.lastLowPulse&&(this.hpOrb.classList.toggle("low-pulse",h),this.lastLowPulse=h);const p=this.prevHp[this.myId];p!==void 0&&t.hp<p&&(p>0&&t.hp<=0?ca():ac());for(const w of this.slotEls){if(!w)continue;const I=w.spell,z=I===s;z!==w.lastActive&&(w.slot.classList.toggle("active",z),w.lastActive=z);const W=t.cooldowns[I]??0,ie=At[I].cooldownTicks,ve=ie>0?Math.round(W/ie*1e3)/10:0;ve!==w.lastPct&&(w.lastPct>0&&ve===0&&oc(),w.cd.style.height=`${ve}%`,w.lastPct=ve);const Me=I===8?t.evadeCharges:void 0,Pe=Me!==void 0?Me===0:ve>0;Pe!==w.lastCooling&&(w.slot.classList.toggle("cooling",Pe),w.lastCooling=Pe);const $s=W>0?(W/60).toFixed(1):"";$s!==w.lastCdText&&(w.cdTime.textContent=$s,w.lastCdText=$s);const Is=t.mana<At[I].manaCost;if(Is!==w.lastNoMana&&(w.slot.classList.toggle("nomana",Is),w.lastNoMana=Is),I===8){const Wt=t.evadeCharges;Wt!==w.lastCharges&&(w.lastCharges=Wt,w.pips.innerHTML=Wt===void 0?"":Array.from({length:dn},(tp,uo)=>`<span class="pip${uo<Wt?" full":""}"></span>`).join(""))}}const f=e.tick,m=Math.max(0,(t.restCastEndTick??0)-f),b=Math.max(0,(t.restCooldownUntil??0)-f),g=t.restCastEndTick!==void 0&&m>0?"channeling":t.resting?"resting":b>0?"cooling":"",_=g==="channeling"?Math.round(m/rn*1e3)/10:g==="cooling"?Math.round(b/on*1e3)/10:0;_!==this.lastRestPct&&(this.restCd.style.height=`${_}%`,this.lastRestPct=_),g!==this.lastRestState&&(this.restSlot.classList.toggle("channeling",g==="channeling"),this.restSlot.classList.toggle("resting",g==="resting"),this.restSlot.classList.toggle("cooling",g==="cooling"),this.lastRestState=g);const E=g==="channeling"?(m/60).toFixed(1):g==="cooling"?(b/60).toFixed(1):"";E!==this.lastRestCdText&&(this.restCdTime.textContent=E,this.lastRestCdText=E);const x=Math.max(0,(t.blockCooldownUntil??0)-f),C=t.blocking?"resting":x>0?"cooling":"",k=C==="cooling"?Math.round(x/hn*1e3)/10:0;k!==this.lastBlockPct&&(this.blockCd.style.height=`${k}%`,this.lastBlockPct=k),C!==this.lastBlockState&&(this.blockSlot.classList.toggle("resting",C==="resting"),this.blockSlot.classList.toggle("cooling",C==="cooling"),this.lastBlockState=C);const y=C==="cooling"?(x/60).toFixed(1):"";y!==this.lastBlockCdText&&(this.blockCdTime.textContent=y,this.lastBlockCdText=y);const M=[],q=new Set;for(const[w,I]of Object.entries(e.players)){if(w===this.myId)continue;q.add(w),M.push(I);let z=this.enemyRows.get(w);if(!z){const ie=document.createElement("div");ie.className="hud-enemy-entry";const ve=document.createElement("div");ve.className="enemy-name";const Me=document.createElement("div");Me.className="enemy-hp-track";const Pe=document.createElement("div");Pe.className="enemy-hp-fill",Me.appendChild(Pe),ie.append(ve,Me),this.enemiesEl.appendChild(ie),z={row:ie,name:ve,fill:Pe,lastHp:-1,lastName:"",flashTimer:0},this.enemyRows.set(w,z)}I.displayName!==z.lastName&&(z.name.textContent=I.displayName,z.lastName=I.displayName),I.hp!==z.lastHp&&(z.lastHp>=0&&I.hp<z.lastHp&&(rc(),z.row.classList.add("hit"),clearTimeout(z.flashTimer),z.flashTimer=window.setTimeout(()=>z.row.classList.remove("hit"),140)),z.fill.style.width=`${I.hp/(I.maxHp??Qs)*100}%`,z.row.style.opacity=I.hp<=0?"0.3":"1",z.lastHp=I.hp);const W=this.prevHp[w];W!==void 0&&W>0&&I.hp<=0&&(ca(),this.showElimination(I.displayName))}for(const[w,I]of this.enemyRows)q.has(w)||(I.row.remove(),this.enemyRows.delete(w));const v={};for(const[w,I]of Object.entries(e.players))v[w]=I.hp;this.prevHp=v,this.minimap.update(t,M)}setBlockSlotVisible(e){this.blockSlot.style.display=e?"":"none"}showElimination(e){const s=document.createElement("div");s.className="hud-elim",s.textContent=`${e} eliminated`,this.el.appendChild(s),setTimeout(()=>s.remove(),2e3)}show(){this.el.style.display="",this.minimap.show()}hide(){this.el.style.display="none",this.minimap.hide()}}function yi(a,e){if(document.getElementById(a))return;const s=document.createElement("style");s.id=a,s.textContent=e,document.head.appendChild(s)}const od=`
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
`;function Ve(){yi("ct-scene",od)}const nd=a=>`
<g id="${a}-rowA">
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
<g id="${a}-rowB">
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
<g id="${a}-rowC">
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
</g>`,ld=a=>`
<g id="${a}-mossA">
  <rect x="0" y="0" width="6" height="2" fill="#3f5c2c"/><rect x="1" y="-1" width="3" height="1" fill="#557a39"/>
  <rect x="2" y="2" width="2" height="2" fill="#2f4720"/><rect x="5" y="1" width="2" height="1" fill="#557a39"/>
</g>
<g id="${a}-mossB">
  <rect x="0" y="0" width="9" height="2" fill="#3a5629"/><rect x="2" y="-1" width="4" height="1" fill="#557a39"/>
  <rect x="6" y="-1" width="2" height="1" fill="#6b9147"/><rect x="1" y="2" width="2" height="3" fill="#2f4720"/>
  <rect x="6" y="2" width="2" height="2" fill="#3a5629"/>
</g>
<g id="${a}-mossC">
  <rect x="0" y="0" width="4" height="1" fill="#557a39"/><rect x="1" y="1" width="2" height="2" fill="#3f5c2c"/>
</g>`,cd=a=>`
<radialGradient id="${a}-glowgrad">
  <stop offset="0" stop-color="#ff9a38" stop-opacity="0.55"/>
  <stop offset="0.45" stop-color="#ff8226" stop-opacity="0.2"/>
  <stop offset="1" stop-color="#ff8226" stop-opacity="0"/>
</radialGradient>
<g id="${a}-torch">
  <circle class="ct-glow" cx="63" cy="52" r="54" fill="url(#${a}-glowgrad)"/>
  <circle class="ct-glow ct-glow-hot" cx="63" cy="58" r="22" fill="url(#${a}-glowgrad)"/>
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
</g>`,dd=["A","B","C","B","A","C","B","A","C","A","B","C","A","C","B","A","C"],ba=[0,-30,-14,-22,-8,-27,-18,-6,-26,-12,-3,-20,-9,-29,-15,-4,-23],hd=a=>dd.map((e,s)=>`<use href="#${a}-row${e}" x="${ba[s]}" y="${s*11}"/><use href="#${a}-row${e}" x="${ba[s]+160}" y="${s*11}"/>`).join(`
`),pd=`
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
<rect x="76" y="152" width="2" height="1" fill="#262c38"/><rect x="246" y="64" width="2" height="1" fill="#2a3040"/>`,fd=a=>`
<use href="#${a}-mossB" x="8" y="150"/><use href="#${a}-mossA" x="60" y="172"/><use href="#${a}-mossB" x="140" y="174"/>
<use href="#${a}-mossA" x="224" y="162"/><use href="#${a}-mossB" x="280" y="140"/><use href="#${a}-mossA" x="296" y="174"/>
<use href="#${a}-mossC" x="104" y="130"/><use href="#${a}-mossC" x="192" y="118"/><use href="#${a}-mossA" x="4" y="86"/>
<use href="#${a}-mossC" x="300" y="76"/><use href="#${a}-mossC" x="128" y="42"/><use href="#${a}-mossA" x="236" y="64"/>
<use href="#${a}-mossC" x="40" y="118"/><use href="#${a}-mossC" x="68" y="40"/><use href="#${a}-mossC" x="152" y="128"/>
<use href="#${a}-mossC" x="28" y="106"/><use href="#${a}-mossB" x="184" y="170"/><use href="#${a}-mossA" x="110" y="166"/>
<use href="#${a}-mossC" x="252" y="150"/><use href="#${a}-mossC" x="90" y="94"/><use href="#${a}-mossC" x="210" y="90"/>
<use href="#${a}-mossC" x="308" y="120"/>`,ud=a=>`
<use href="#${a}-mossA" x="8" y="150"/><use href="#${a}-mossC" x="300" y="84"/><use href="#${a}-mossA" x="260" y="172"/>
<use href="#${a}-mossC" x="48" y="108"/><use href="#${a}-mossC" x="180" y="130"/><use href="#${a}-mossB" x="120" y="172"/>
<use href="#${a}-mossC" x="228" y="116"/>`;function md(a={}){const e=a.idPrefix??"ct",s=a.mossDensity==="sparse"?ud(e):fd(e);return`<svg class="ct-wall" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">
<rect x="0" y="0" width="320" height="180" fill="#12141b"/>
<defs>${nd(e)}${ld(e)}${cd(e)}</defs>
${hd(e)}${pd}${s}
<!--TORCHES-->
</svg>`}function va(a,e){return e==="left"?`<use href="#${a}-torch" x="-30" y="0"/>`:`<g transform="translate(320,0) scale(-1,1)" class="ct-slow"><use href="#${a}-torch" x="-30" y="0"/></g>`}function ke(a="cth"){return`${md({idPrefix:a}).replace("<!--TORCHES-->",va(a,"left")+va(a,"right"))}
<div class="ct-floor"></div>
<div class="ct-vig"></div>`}function gd(a){const e=[{id:"credits",label:"Credits"}];return a&&e.push({id:"admin",label:"⚙ Admin"}),e.push({id:"settings",label:"Settings"}),e.push({id:"logout",label:"Sign Out"}),e}function xd(a){return a&&a>0?`✦${a}`:""}const bd=[{key:"arena",label:"Arena"},{key:"skills",label:"Skills"},{key:"gear",label:"Gear"},{key:"shop",label:"Shop"}],vd=`
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
`;function Gt(){yi("bm-nav-css",vd)}function je(a){const e=a.tabsEnabled!==!1,s=xd(a.skillPoints),t=bd.map(o=>{const n=o.key==="skills"&&s?`<span class="bm-nav-badge">${s}</span>`:"";if(o.key===a.active)return`<button class="bm-nav-tab px-btn active" data-nav="${o.key}">${o.label}${n}</button>`;const l=e?"bm-nav-tab px-btn":"bm-nav-tab px-btn locked",d=e?"":" disabled";return`<button class="${l}" data-nav="${o.key}"${d}>${o.label}${n}</button>`}).join(""),i=gd(a.isAdmin===!0).map(o=>`<button class="bm-acct-item" data-item="${o.id}">${o.label}</button>`).join(""),r=a.gold===null||a.gold===void 0;return`
      <div class="bm-nav">
        <div class="bm-nav-crest">⚔ Blood Moor</div>
        ${t}
        <div class="bm-nav-spacer"></div>
        <div class="bm-gold-pill" data-nav-gold style="display:${r?"none":""}">
          <i class="fa fa-coins"></i><span data-nav-gold-amount>${a.gold??0}</span>
        </div>
        <div class="bm-acct">
          <button class="bm-acct-btn px-btn" data-nav-acct>${a.username||"Account"} ▾</button>
          <div class="bm-acct-menu" data-nav-acct-menu>${i}</div>
        </div>
      </div>`}function Ge(a,e){a.querySelectorAll("[data-nav]").forEach(o=>{const n=o.dataset.nav;o.classList.contains("active")||o.disabled||o.addEventListener("click",()=>e.onNavigate(n))});const s=a.querySelector("[data-nav-acct]"),t=a.querySelector("[data-nav-acct-menu]");if(!s||!t)return()=>{};s.addEventListener("click",o=>{o.stopPropagation(),t.classList.toggle("open")});const i=()=>t.classList.remove("open");document.addEventListener("click",i);const r={credits:()=>e.onCredits(),admin:()=>e.onNavigate("admin"),settings:()=>e.onSettings(),logout:()=>e.onLogout()};return t.querySelectorAll(".bm-acct-item").forEach(o=>{o.addEventListener("click",()=>{var n;t.classList.remove("open"),(n=r[o.dataset.item])==null||n.call(r)})}),()=>document.removeEventListener("click",i)}function yd(a,e){const s=a.querySelector("[data-nav-gold]");if(!s)return;if(e===null){s.style.display="none";return}s.style.display="";const t=s.querySelector("[data-nav-gold-amount]");t&&(t.textContent=String(e))}class wi{constructor(e,s=2,t="walk"){c(this,"ctx");c(this,"composite",null);c(this,"requestId",0);c(this,"rafId",null);c(this,"animStart",null);c(this,"disposed",!1);c(this,"loop",e=>{var n;this.rafId=requestAnimationFrame(this.loop);const s=(n=this.composite)==null?void 0:n[this.anim];if(!s)return;this.animStart===null&&(this.animStart=e);const t=(e-this.animStart)/1e3,i=as(this.anim,t,!0),{sx:r,sy:o}=is(this.anim,this.dir,i);this.ctx.clearRect(0,0,T,T),this.ctx.drawImage(s.image,r,o,T,T,0,0,T,T)});this.dir=s,this.anim=t,e.width=T,e.height=T,this.ctx=e.getContext("2d"),this.rafId=requestAnimationFrame(this.loop)}setAppearance(e,s={}){const t=++this.requestId;return this.composite&&(Rt(this.composite),this.composite=null),this.animStart=null,br(e,s).then(i=>this.disposed||t!==this.requestId?(Rt(i),!0):(this.composite=i,this.animStart=null,!0),i=>(console.warn("SpritePreview: composite failed",i),!1))}dispose(){this.disposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.composite&&(Rt(this.composite),this.composite=null)}}const wd="https://ulekuozamvhluojthxrh.supabase.co",kd="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZWt1b3phbXZobHVvanRoeHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjYxMzgsImV4cCI6MjA5MjE0MjEzOH0.lkYBXt9xjNrPFXg8vOMDntT1Qdw98NHjSH8-fi2BavU",$=Ho(wd,kd),ki="http://localhost:3001";async function Cs(){var e;const{data:{session:a}}=await $.auth.getSession();return((e=a==null?void 0:a.user)==null?void 0:e.id)??null}async function xs(){const{data:{session:a}}=await $.auth.getSession();return(a==null?void 0:a.access_token)??""}async function _d(){const a=await Cs();if(!a)return null;const{data:e}=await $.from("profiles").select("username, matches_played, matches_won, is_admin").eq("user_id",a).single();return e??null}async function os(){const a=await Cs();if(!a)return[];const{data:e}=await $.from("characters").select("*").eq("user_id",a).order("created_at",{ascending:!0});return(e??[]).map(s=>({...s,class:st(s.class)}))}async function Sd(a,e,s){const{data:{user:t}}=await $.auth.getUser();if(!t)return null;const{data:i,error:r}=await $.rpc("create_character",{p_user_id:t.id,p_name:a,p_class:e});if(r)return console.error("create_character failed:",r.message),null;const o=i;if(s)try{await Jr(o,s)}catch(l){console.warn("set initial appearance failed:",l instanceof Error?l.message:l)}const n=ps[st(e)];for(const l of n?[n]:[]){const{error:d}=await $.rpc("unlock_skill_node",{p_character_id:o,p_node_id:l,p_cost:0});d&&console.error(`starter skill ${l} failed:`,d.message)}return o}async function Cd(a){const{data:{user:e}}=await $.auth.getUser();if(!e)return!1;const{error:s}=await $.rpc("delete_character",{p_user_id:e.id,p_character_id:a});return s?(console.error("delete_character failed:",s.message),!1):!0}async function Jr(a,e){const{error:s}=await $.rpc("update_appearance",{p_character_id:a,p_appearance:e});if(s)throw s}async function _i(){const a=await Cs();if(!a)return[];const{data:e,error:s}=await $.from("items").select("id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, unique_id").eq("user_id",a).order("created_at",{ascending:!1});if(s)return console.error("fetchItems failed:",s.message),[];const t=[];for(const i of e??[]){const r=xi(i);r?t.push(r):console.warn("fetchItems: dropped invalid item row",i)}return t}async function Md(a,e,s){const{error:t}=await $.rpc("equip_item",{p_item_id:a,p_character_id:e,p_slot:s});return t?(console.error("equip_item failed:",t.message),!1):!0}async function Td(a){const{error:e}=await $.rpc("unequip_item",{p_item_id:a});return e?(console.error("unequip_item failed:",e.message),!1):!0}async function Ed(){const{data:a,error:e}=await $.from("items").select("id, user_id, base_id, rarity, affixes, level_req, equipped_by, equipped_slot, slot, source, created_at, unique_id");return e?(console.error("adminFetchAllItems failed:",e.message),[]):a??[]}async function Ad(a,e,s,t,i,r,o,n){const{data:l,error:d}=await $.rpc("admin_grant_item",{p_user_id:a,p_base_id:e,p_rarity:s,p_affixes:t,p_level_req:i,p_slot:r,p_class_restriction:o??null,p_unique_id:n??null});return d?(console.error("admin_grant_item failed:",d.message),null):l}async function Rd(a){const{error:e}=await $.rpc("admin_delete_item",{p_item_id:a});return e?(console.error("admin_delete_item failed:",e.message),!1):!0}async function $d(){const{data:a,error:e}=await $.from("drop_tables").select("context, weights");return e?(console.error("fetchDropTables failed:",e.message),[]):a??[]}async function ya(a,e){const{error:s}=await $.rpc("admin_update_drop_table",{p_context:a,p_weights:e});return s?(console.error("admin_update_drop_table failed:",s.message),!1):!0}async function Id(a){const e=[...new Set(a)];if(e.length===0)return new Map;const{data:s,error:t}=await $.from("profiles").select("user_id, username").in("user_id",e);return t?(console.error("adminFetchUsernames failed:",t.message),new Map):new Map((s??[]).map(i=>[i.user_id,i.username]))}async function Ld(a){const{data:e,error:s}=await $.from("profiles").select("user_id").eq("username",a).maybeSingle();return s?(console.error("adminFindUserByUsername failed:",s.message),null):(e==null?void 0:e.user_id)??null}async function Pd(a){const e=[...new Set(a)];if(e.length===0)return new Map;const{data:s,error:t}=await $.from("characters").select("id, name").in("id",e);return t?(console.error("adminFetchCharacterNames failed:",t.message),new Map):new Map((s??[]).map(i=>[i.id,i.name]))}async function Si(){const a=await Cs();if(!a)return 0;const{data:e,error:s}=await $.from("profiles").select("gold").eq("user_id",a).single();return s?(console.error("fetchGold failed:",s.message),0):(e==null?void 0:e.gold)??0}async function zd(a){const{data:e,error:s}=await $.rpc("sell_item",{p_item_id:a});return s?(console.error("sell_item failed:",s.message),null):e}async function qd(){const{data:{session:a}}=await $.auth.getSession();if(!a)return null;try{const e=await fetch(`${ki}/economy/vendor`,{headers:{Authorization:`Bearer ${a.access_token}`}});return e.ok?await e.json():(console.error("fetchVendorView failed:",e.status),null)}catch(e){return console.error("fetchVendorView failed:",e),null}}async function Od(a,e){const{data:{session:s}}=await $.auth.getSession();if(!s)return{ok:!1,status:401,error:"not signed in"};try{const t=await fetch(`${ki}/economy/vendor/buy`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.access_token}`},body:JSON.stringify({slotIndex:a,instanceKey:e})}),i=await t.json().catch(()=>({}));if(!t.ok){const o=typeof(i==null?void 0:i.error)=="string"?i.error:"purchase failed";return console.error("buyVendorSlot failed:",t.status,o),{ok:!1,status:t.status,error:o}}const r=xi(i.item);return r?{ok:!0,item:r}:(console.error("buyVendorSlot: server item failed validation",i.item),{ok:!1,status:500,error:"invalid item from server"})}catch(t){return console.error("buyVendorSlot failed:",t),{ok:!1,status:0,error:"network error"}}}async function Fd(a){const{data:{session:e}}=await $.auth.getSession();if(!e)return{ok:!1,status:401,error:"not signed in"};try{const s=await fetch(`${ki}/economy/lootbox/open`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e.access_token}`},body:JSON.stringify({tier:a})}),t=await s.json().catch(()=>({}));if(!s.ok){const r=typeof(t==null?void 0:t.error)=="string"?t.error:"lootbox open failed";return console.error("openLootbox failed:",s.status,r),{ok:!1,status:s.status,error:r}}const i=xi(t.item);return i?{ok:!0,item:i}:(console.error("openLootbox: server item failed validation",t.item),{ok:!1,status:500,error:"invalid item from server"})}catch(s){return console.error("openLootbox failed:",s),{ok:!1,status:0,error:"network error"}}}const Ke=40,Nd=["idle","walk","shoot","spellcast","hurt"],wa=new Map;function Bd(a){return new Promise(e=>{const s=new Image;s.onload=()=>e(s),s.onerror=()=>e(null),s.src=a})}function Hd(a){return a.replace("{body}","male").replace("{legs}","male")}async function Dd(a,e){if(!a.lpc)return null;try{let s=null,t=[];for(const x of Nd)if(t=await Promise.all(a.lpc.layers.map(C=>Bd(`/assets/lpc/${Hd(C.path)}/${x}.png`))),t.some(C=>C!==null)){s=x;break}if(!s)return null;const i=Le[s].singleRow?0:2,r=document.createElement("canvas");r.width=T,r.height=T;const o=r.getContext("2d");if(!o)return null;a.lpc.layers.forEach((x,C)=>{var v;const k=t[C];if(!k)return;const y=((v=e==null?void 0:e.lpcTint)==null?void 0:v.color)??x.tint,M=e!=null&&e.lpcTint?e.lpcTint.mode:x.tintMode,q=y?xr(k,k.width,k.height,y,M):k;o.drawImage(q,0,i*T,T,T,0,0,T,T)});const n=o.getImageData(0,0,T,T).data;let l=T,d=T,h=-1,p=-1;for(let x=0;x<T;x++)for(let C=0;C<T;C++)n[(x*T+C)*4+3]>8&&(C<l&&(l=C),C>h&&(h=C),x<d&&(d=x),x>p&&(p=x));if(h<0)return null;const f=h-l+1,m=p-d+1,b=document.createElement("canvas");b.width=Ke,b.height=Ke;const u=b.getContext("2d");if(!u)return null;u.imageSmoothingEnabled=!1;const g=Math.min(Ke/f,Ke/m),_=Math.max(1,Math.floor(f*g)),E=Math.max(1,Math.floor(m*g));return u.drawImage(r,l,d,f,m,Math.floor((Ke-_)/2),Math.floor((Ke-E)/2),_,E),b}catch{return null}}function Ud(a,e){const s=e?`${a.id}:${e.id}`:a.id;let t=wa.get(s);return t||(t=Dd(a,e),wa.set(s,t)),t}function Ne(a,e){return a.lpc?` data-icon-base="${a.id}"${e?` data-icon-unique="${e.id}"`:""}`:""}function Ot(a){a.querySelectorAll("[data-icon-base]").forEach(e=>{const s=G.find(i=>i.id===e.dataset.iconBase);if(!s)return;const t=e.dataset.iconUnique?oe.find(i=>i.id===e.dataset.iconUnique):void 0;Ud(s,t).then(i=>{var o;if(!i||!e.isConnected)return;const r=document.createElement("canvas");r.width=i.width,r.height=i.height,(o=r.getContext("2d"))==null||o.drawImage(i,0,0),r.style.cssText="width:100%;height:100%;image-rendering:pixelated;",e.replaceChildren(r)})})}function X(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const $e={basic:"#e2e2e6",magic:"#4a6fc4",rare:"#ddb84a",unique:"#ffb347"},jd=["ring1","helmet","ring2","weapon","armor","amulet","leggings"],Gd={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring1:"Ring 1",ring2:"Ring 2",amulet:"Amulet"},Vd={weapon:"fa-khanda",helmet:"fa-helmet-safety",armor:"fa-shirt",leggings:"fa-socks",ring1:"fa-ring",ring2:"fa-ring",amulet:"fa-gem"},Wd={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring:"Ring",amulet:"Amulet"};function It(a){return G.find(e=>e.id===a.base_id)}function Lt(a,e){var s;return a.rarity==="unique"?((s=Re(a))==null?void 0:s.name)??e.name:e.name}function eo(a){return a.includes("ring1")?(a.includes("ring2"),"ring2"):"ring1"}function ka(a,e,s,t){if(e<a.level_req)return{ok:!1,reason:`Requires level ${a.level_req}`};const i=G.find(r=>r.id===a.base_id);if(i!=null&&i.classRestriction&&i.classRestriction!==s)return{ok:!1,reason:`Restricted to ${i.classRestriction}`};if(a.unique_id){const r=a.slot==="ring"?eo(t.filter(n=>n.equipped_slot!==null).map(n=>n.equipped_slot)):a.slot;if(t.some(n=>n.id!==a.id&&n.unique_id===a.unique_id&&n.equipped_slot!==r))return{ok:!1,reason:"Already equipped"}}return{ok:!0}}function _a(a){var o;const e=(o=Re(a))==null?void 0:o.aura;if(!e)return`box-shadow:inset 0 0 0 2px ${$e.unique};`;const[s,t,i]=e.color,r=`${Math.round(s*255)}, ${Math.round(t*255)}, ${Math.round(i*255)}`;return`box-shadow:inset 0 0 0 2px rgba(${r}, 1), 0 0 12px rgba(${r}, 0.35);`}function Sa(a){return a.source==="starter"?{sellable:!1,reason:"Starter gear — cannot be sold"}:{sellable:!0,price:tl(a.rarity,a.level_req)}}const Yd=`
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
.gr-range{color:var(--px-text-dim,#8a8f9c);font-size:14px;}
.gr-quality{color:var(--px-text-dim,#8a8f9c);letter-spacing:1px;}
.gr-perfect{color:var(--px-accent);letter-spacing:1px;}
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
`;class Xd{constructor(e,s,t){c(this,"el");c(this,"items",[]);c(this,"characterId",null);c(this,"charClass","mage");c(this,"charLevel",1);c(this,"selectedId",null);c(this,"closeResolver",null);c(this,"navTeardown",null);c(this,"gold",null);c(this,"loading",!1);c(this,"sellPending",new Set);c(this,"sellErrorById",new Map);c(this,"paperdoll",null);c(this,"appearance",jt.mage);this.navCtx=s,this.navHandlers=t,Ve(),Gt();const i=document.createElement("style");i.textContent=Yd,document.head.appendChild(i),this.el=document.createElement("div"),this.el.className="gr-overlay",e.appendChild(this.el)}async show(e,s,t,i){return this.characterId=e,this.charClass=s,this.charLevel=t,this.appearance=i,this.selectedId=null,this.sellPending.clear(),this.sellErrorById.clear(),this.el.style.display="block",this.gold=null,this.loading=this.items.length===0,this.render(),await this.reload(),await new Promise(r=>{this.closeResolver=r})}hide(e="arena"){var t,i;this.el.style.display="none",(t=this.navTeardown)==null||t.call(this),this.navTeardown=null,(i=this.paperdoll)==null||i.dispose(),this.paperdoll=null;const s=this.closeResolver;this.closeResolver=null,s==null||s(e)}reset(){this.items=[],this.gold=null,this.selectedId=null}async reload(){const[e,s]=await Promise.all([_i(),Si()]);this.items=e,this.gold=s,this.loading=!1,this.render()}equippedSlots(){return this.items.filter(e=>e.equipped_by===this.characterId&&e.equipped_slot!==null).map(e=>e.equipped_slot)}equippedItems(){return this.items.filter(e=>e.equipped_by===this.characterId)}render(){var r,o;const e=jd.map(n=>this.renderDollSlot(n)).join(""),s=this.items.filter(n=>n.equipped_by===null),t=s.length?s.map(n=>this.renderCard(n)).join(""):'<div class="gr-empty">Stash is empty.</div>';this.el.innerHTML=`
      <div class="gr-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${ke("gr")}</div>
      <div class="gr-ui">
        ${je({active:"gear",...this.navCtx(),gold:this.gold})}
        <div class="bm-subhead">
          <div class="gr-title px-title">${X(this.charClass)} Lvl ${this.charLevel} — Gear</div>
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
            <div class="gr-stash-label">Stash (${s.length})</div>
            <div class="gr-stash-grid">${t}</div>
          </div>
        </div>`}
      </div>
    `,(r=this.navTeardown)==null||r.call(this),this.navTeardown=Ge(this.el,{onNavigate:n=>this.hide(n),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.attachItemListeners(),Ot(this.el),this.renderDetails(this.selectedId),(o=this.paperdoll)==null||o.dispose(),this.paperdoll=null;const i=this.el.querySelector("#gr-paperdoll-canvas");if(i){this.paperdoll=new wi(i,2,"walk");const n=this.items.filter(l=>l.equipped_by===this.characterId);this.paperdoll.setAppearance(this.appearance,gr(n))}}renderDollSlot(e){const s=this.items.find(h=>h.equipped_by===this.characterId&&h.equipped_slot===e);if(!s)return`<div class="gr-slot gr-slot-empty" style="grid-area:${e}">
        <div class="gr-slot-icon"><i class="fa ${Vd[e]}"></i></div>
        <div class="gr-slot-label">${X(Gd[e])}</div>
      </div>`;const t=It(s);if(!t)return"";const i=$e[s.rarity],r=Lt(s,t),o=s.id===this.selectedId?" gr-selected":"",n=s.rarity==="unique",l=n?" gr-card-unique":"",d=n?_a(s):`box-shadow:inset 0 0 0 2px ${i};`;return`<div class="gr-slot${o}${l}" style="grid-area:${e};${d}" data-item="${s.id}" data-equipped="1">
      <div class="gr-slot-icon"${Ne(t,n?Re(s):void 0)} style="color:${i}"><i class="fa ${t.icon}"></i></div>
      <div class="gr-slot-name" style="color:${i}">${X(r)}</div>
    </div>`}renderCard(e){const s=It(e);if(!s)return"";const t=$e[e.rarity],i=Lt(e,s),r=e.id===this.selectedId?" gr-selected":"",o=e.rarity==="unique",n=o?" gr-card-unique":"",l=o?_a(e):`box-shadow:inset 0 0 0 2px ${t};`;return`<div class="gr-card${r}${n}" style="${l}" data-item="${e.id}">
      <div class="gr-slot-icon"${Ne(s,o?Re(e):void 0)} style="color:${t}"><i class="fa ${s.icon}"></i></div>
      <div class="gr-slot-name" style="color:${t}">${X(i)}</div>
    </div>`}attachItemListeners(){this.el.querySelectorAll("[data-item]").forEach(e=>{const s=e.getAttribute("data-item"),t=e.getAttribute("data-equipped")==="1";e.addEventListener("mouseenter",()=>this.renderDetails(s)),e.addEventListener("click",()=>{const i=this.items.find(n=>n.id===s);if(!i)return;if(t){this.handleUnequip(i);return}if(!ka(i,this.charLevel,this.charClass,this.equippedItems()).ok){this.selectItem(s);return}const o=i.slot==="ring"?eo(this.equippedSlots()):i.slot;this.equipOptimistic(i,o)})})}selectItem(e){var s;this.selectedId=e,this.el.querySelectorAll(".gr-selected").forEach(t=>t.classList.remove("gr-selected")),(s=this.el.querySelector(`[data-item="${e}"]`))==null||s.classList.add("gr-selected"),this.renderDetails(e)}equipOptimistic(e,s){if(!this.characterId)return;mc();const t=this.characterId;for(const i of this.items)i.id!==e.id&&i.equipped_by===t&&i.equipped_slot===s&&(i.equipped_by=null,i.equipped_slot=null);e.equipped_by=t,e.equipped_slot=s,this.selectedId=e.id,this.render(),Md(e.id,t,s).then(i=>{i||console.error("equip_item failed, reverting"),this.reload()})}handleUnequip(e){ii(),e.equipped_by=null,e.equipped_slot=null,this.selectedId=e.id,this.render(),Td(e.id).then(s=>{s||console.error("unequip_item failed, reverting"),this.reload()})}renderDetails(e){const s=this.el.querySelector("#gr-details");if(!s)return;if(!e){s.innerHTML='<div class="gr-details-empty">Hover an item to inspect it.<br>Click a stash item to equip, or an equipped item to unequip.</div>';return}const t=this.items.find(k=>k.id===e),i=t?It(t):void 0;if(!t||!i){s.innerHTML='<div class="gr-details-empty">Item no longer available.</div>';return}const r=$e[t.rarity],o=Lt(t,i),n=t.rarity==="unique"?Re(t):void 0,l=t.equipped_by===this.characterId,d=n?`<div class="gr-flavor">${X(n.flavor)}</div>`:"",h=`<div class="gr-details-row">${X(nt(i.implicit))} <span class="gr-dim">(implicit)</span></div>`,p=t.affixes.map(k=>{const y=n==null?void 0:n.affixes.find(v=>v.id===k.id&&v.node===k.node),M=y?dr(y):null,q=M?` <span class="gr-range">(${X(M)})</span>`:"";if(k.id==="talent"&&k.node){const v=Z.find(W=>W.id===k.node),w=(v==null?void 0:v.name)??k.node,I=ur(this.charClass,k.node),z=`+${k.value} ${w}${I?"":" (inert for this class)"}`;return`<div class="gr-details-row${I?"":" gr-dim"}">${X(z)}${q}</div>`}return`<div class="gr-details-row${Rn(k)?" gr-bad":""}">${X(nt(k))}${q}</div>`}).join(""),f=n?Bn(n,t.affixes):null,m=f===null?"":f===1?'<div class="gr-details-row gr-perfect">PERFECT ROLL</div>':`<div class="gr-details-row gr-quality">Roll quality ${Math.min(99,Math.round(f*100))}%</div>`,u=`<div class="gr-details-row ${this.charLevel<t.level_req?"gr-bad":"gr-ok"}">Requires Level ${t.level_req}</div>`;let g="";i.classRestriction&&(g=`<div class="gr-details-row ${i.classRestriction!==this.charClass?"gr-bad":"gr-ok"}">Class: ${X(i.classRestriction)}</div>`);const _=ka(t,this.charLevel,this.charClass,this.equippedItems()),E=l?'<div class="gr-details-status gr-ok">Equipped — click to unequip</div>':_.ok?'<div class="gr-details-status gr-ok">Click to equip</div>':`<div class="gr-details-status gr-bad">${X(_.reason??"Cannot equip")}</div>`;let x="";if(t.equipped_by===null){const k=this.sellErrorById.get(t.id),y=k?`<div class="gr-details-row gr-bad">${X(k)}</div>`:"",M=Sa(t);if(M.sellable){const q=this.sellPending.has(t.id);x=`
          <div class="gr-details-row gr-sell-price">Sell: ${M.price} gold</div>
          ${y}
          <button class="gr-sell-btn px-btn px-btn-primary" data-sell="${t.id}" ${q?"disabled":""}>${q?"Selling…":"Sell"}</button>
        `}else x=`<div class="gr-details-row gr-dim">${X(M.reason)}</div>${y}`}s.innerHTML=`
      <div class="gr-details-head">
        <div class="gr-details-icon"${Ne(i,n)} style="color:${r}"><i class="fa ${i.icon}"></i></div>
        <div>
          <div class="gr-details-name" style="color:${r}">${X(o)}</div>
          <div class="gr-details-kind">${X(i.name)} · ${X(Wd[i.slot])}</div>
        </div>
      </div>
      ${d}
      ${m}
      ${h}
      ${p}
      ${u}
      ${g}
      ${E}
      ${x}
    `;const C=s.querySelector("[data-sell]");C==null||C.addEventListener("click",()=>{C.disabled||this.handleSell(t)}),Ot(s)}handleSell(e){if(this.sellPending.has(e.id))return;const s=Sa(e);if(!s.sellable)return;const t=s.price,i=async()=>{gc(),this.sellPending.add(e.id),this.sellErrorById.delete(e.id);const r=this.items;this.items=this.items.filter(n=>n.id!==e.id),this.selectedId=null,this.gold!==null&&(this.gold+=t),this.render();const o=await zd(e.id);this.sellPending.delete(e.id),o===null&&(this.items=r,this.selectedId=e.id,this.sellErrorById.set(e.id,"Sell failed — please try again.")),await this.reload()};if(e.rarity==="unique"){this.showConfirm("Sell Unique Item",`Sell this unique item for ${t} gold? This cannot be undone.`,()=>{i()});return}i()}showConfirm(e,s,t){const i=document.createElement("div");i.className="gr-confirm-overlay",i.innerHTML=`
      <div class="gr-confirm-panel px-panel">
        <div class="gr-confirm-title px-title">${X(e)}</div>
        <div class="gr-confirm-text">${X(s)}</div>
        <div class="gr-confirm-buttons">
          <button class="gr-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="gr-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".gr-confirm-yes").addEventListener("click",()=>{i.remove(),t()}),i.querySelector(".gr-confirm-no").addEventListener("click",()=>i.remove())}}function ae(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ca(a,e,s){const t=[];return a&&t.push(ae(a.charAt(0).toUpperCase()+a.slice(1))),e!==void 0&&t.push(`Lv <b>${e}</b>`),s&&s>0&&t.push(`<b>✦${s}</b> skill pts`),t.join(" · ")}const Zd=`
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
`;class Kd{constructor(e,s){c(this,"el");c(this,"ui");c(this,"bg");c(this,"pollTimer",null);c(this,"heroPreview",null);c(this,"navTeardown",null);c(this,"resultSoundTimers",[]);c(this,"pauseOverlay",null);c(this,"pauseCountdownTimer",null);c(this,"isAdminFlag",!1);c(this,"goldAmount",null);c(this,"heroAppearance",null);c(this,"heroGear",{});c(this,"rematchInterval",null);this.cb=s;const t=document.createElement("style");t.textContent=Zd,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="bm-overlay",Ve(),Gt(),this.bg=document.createElement("div"),this.bg.className="bm-bg",this.bg.innerHTML=ke(),this.el.appendChild(this.bg),this.ui=document.createElement("div"),this.ui.className="bm-ui",this.el.appendChild(this.ui),e.appendChild(this.el),this.showHome()}setAdmin(e){this.isAdminFlag=e}setGold(e){this.goldAmount=e,yd(this.ui,e)}updateHeroGear(e){this.heroGear=e,this.heroPreview&&this.heroAppearance&&this.heroPreview.setAppearance(this.heroAppearance,e)}teardownHome(){for(const e of this.resultSoundTimers)window.clearTimeout(e);this.resultSoundTimers=[],this.heroPreview&&(this.heroPreview.dispose(),this.heroPreview=null),this.navTeardown&&(this.navTeardown(),this.navTeardown=null)}showHome(e,s,t,i,r,o={}){this.teardownHome(),this.heroAppearance=r??null,this.heroGear=o,this.setBackdrop("hall"),this.stopPolling();const n=new URLSearchParams(window.location.search).get("room")??"",l=t!==void 0,d=l&&r!=null,h=e?ae(e):"",p=d?`<canvas id="bm-hero-canvas" class="bm-hero-canvas"></canvas>
         <div class="bm-hero-plate">
           <div class="bm-hero-name">${h}</div>
           <div class="bm-hero-meta">${Ca(t,i,s)}</div>
         </div>
         <button id="bm-choose-champion" class="bm-hero-switch px-btn">⇄ Switch Character</button>`:`<div class="bm-hero-plate">
           <div class="bm-hero-name">${h||"Wanderer"}</div>
           ${l?`<div class="bm-hero-meta">${Ca(t,i,s)}</div>`:""}
         </div>
         <div class="bm-hero-empty">No champion chosen
           <button id="bm-choose-champion" class="px-btn">Choose your champion</button>
         </div>`;this.ui.innerHTML=`
      ${je({active:"arena",username:h,gold:this.goldAmount,skillPoints:s,isAdmin:this.isAdminFlag,tabsEnabled:l})}
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
            <input id="bm-code" class="bm-code-input px-input" type="text" placeholder="ROOM CODE" value="${ae(n)}" maxlength="12">
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
      </div>`,this.navTeardown=Ge(this.ui,{onNavigate:u=>{u==="skills"?this.cb.onOpenSkills():u==="gear"?this.cb.onOpenGear():u==="shop"?this.cb.onOpenShop():u==="admin"&&this.cb.onOpenAdmin()},onCredits:()=>this.cb.onShowCredits(),onLogout:()=>this.cb.onLogout(),onSettings:()=>this.cb.onOpenSettings()});const f=this.ui.querySelector("#bm-choose-champion");if(f&&f.addEventListener("click",()=>this.cb.onSwitchCharacter()),d){const u=this.ui.querySelector("#bm-hero-canvas"),g=new wi(u,2,"idle");this.heroPreview=g,g.setAppearance(r,o).then(_=>{if(!_&&this.heroPreview===g){this.heroPreview.dispose(),this.heroPreview=null;const E=this.ui.querySelector(".bm-hero"),x=this.ui.querySelector("#bm-hero-canvas");if(E&&x){x.remove();const C=document.createElement("div");C.className="bm-hero-empty",C.textContent="The torchlight hides your champion",E.appendChild(C)}}})}const m=this.ui.querySelector("#mode-grid");let b="1v1";m.querySelectorAll(".bm-mode").forEach(u=>{u.addEventListener("click",()=>{m.querySelectorAll(".bm-mode").forEach(g=>g.classList.remove("active")),u.classList.add("active"),b=u.dataset.mode})}),this.ui.querySelector("#bm-create").addEventListener("click",()=>{const u=this.ui.querySelector("#bm-name").value.trim();u&&this.cb.onCreateRoom(u,b)}),this.ui.querySelector("#bm-join-code").addEventListener("click",()=>{const u=this.ui.querySelector("#bm-name").value.trim(),g=this.ui.querySelector("#bm-code").value.trim();u&&g&&this.cb.onJoinRoom(g,u)}),this.ui.querySelector("#bm-code").addEventListener("keydown",u=>{u.key==="Enter"&&this.ui.querySelector("#bm-join-code").click()}),this.pollLobbies(),this.pollTimer=window.setInterval(()=>this.pollLobbies(),3e3),n&&this.ui.querySelector("#bm-name").focus()}showWaiting(e,s,t){this.setBackdrop("dim"),this.stopPolling(),this.renderLobby(e,[{name:s,index:0,ready:!1}],t)}showReady(e,s,t,i,r){this.setBackdrop("dim"),this.stopPolling();const o=Object.entries(s).map(([n,l],d)=>({name:l,index:d,ready:(r==null?void 0:r.has(n))??!1}));this.renderLobby(e,o,i)}showResult(e,s,t,i){this.teardownHome(),this.setBackdrop("dim"),this.stopPolling();let r,o;s==="2v2"?(r=e?"Your Team Wins":"Your Team Loses",o=e?"Your team dominated the arena":"Your team has fallen"):s==="ffa"?(r=e?"Victory":"Defeated",e?o="You are the last one standing":t?o=`Defeated — ${t===2?"2nd":t===3?"3rd":`${t}th`} place`:o="You have been eliminated"):(r=e?"Victory":"Defeat",o=e?"You are victorious":"You have been slain");const n=e?"bm-win":"bm-lose",l=i&&i.levelsGained>0,d=i?`<div class="bm-result-divider">
           <div class="bm-result-divider-line"></div>
           <div class="bm-result-divider-dot"></div>
           <div class="bm-result-divider-line"></div>
         </div>
         <div class="bm-result-xp">+<span id="bm-xp-count">0</span> XP</div>
         <div class="bm-result-xp-label">Experience Gained</div>
         ${l?`<div class="bm-result-levelup">Level Up <span class="bm-result-levelup-num">${i.newLevel}</span></div>`:""}`:"";let h=l?1.1:.8,p="",f=0;i&&i.goldGained>0&&(f=h,p=`<div class="bm-result-gold" style="animation-delay:${h}s">+${i.goldGained} <i class="fa fa-coins"></i> Gold</div>`,h+=.3);let m="",b=0;const u=i==null?void 0:i.droppedItem,g=u?It(u):void 0;if(u&&g){b=h;const E=$e[u.rarity],x=Lt(u,g),C=u.rarity==="unique"?Re(u):void 0;m=`<div class="bm-result-spoils" style="animation-delay:${h}s;box-shadow:inset 0 0 0 2px ${E}">
        <div class="bm-result-spoils-label">War Spoils</div>
        <div class="bm-result-spoils-item"><span class="bm-result-spoils-icon"${Ne(g,C)} style="color:${E}"><i class="fa ${g.icon}"></i></span><span style="color:${E}">${ae(x)}</span></div>
      </div>`,h+=.3}const _=i?`${Math.max(h,l?1.4:1.1)}s`:"0.8s";if(this.ui.innerHTML=`
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
        <div class="bm-result-buttons" style="animation-delay:${_}">
          <button id="bm-rematch" class="bm-btn-rematch px-btn">⚔ Rematch</button>
          <button id="bm-return-lobby" class="bm-btn-return px-btn">Return to Lobby</button>
        </div>
      </div>`,Ot(this.ui),lc(e),l&&this.resultSoundTimers.push(window.setTimeout(()=>cc(),900)),f>0&&this.resultSoundTimers.push(window.setTimeout(()=>dc(),f*1e3)),u&&b>0){const E=u.rarity;this.resultSoundTimers.push(window.setTimeout(()=>Mr(E),b*1e3))}if(i&&i.xpGained>0){const E=this.ui.querySelector("#bm-xp-count");if(E){const x=i.xpGained,C=1200,k=performance.now()+800,y=M=>{const q=M-k;if(q<0){requestAnimationFrame(y);return}const v=Math.min(q/C,1),w=1-Math.pow(1-v,3);E.textContent=String(Math.round(x*w)),v<1&&requestAnimationFrame(y)};requestAnimationFrame(y)}}this.ui.querySelector("#bm-rematch").addEventListener("click",()=>this.cb.onRematch()),this.ui.querySelector("#bm-return-lobby").addEventListener("click",()=>this.cb.onReturnToLobby())}disableRematch(){this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null);const e=this.ui.querySelector("#bm-rematch");e&&(e.disabled=!0,e.classList.add("waiting"),e.style.opacity="0.4",e.style.cursor="default",e.textContent="Opponent left");const s=this.ui.querySelector(".bm-rematch-countdown");s&&s.remove()}showRematchCountdown(e,s){this.setBackdrop("dim"),this.rematchInterval&&clearInterval(this.rematchInterval);const t=this.ui.querySelector("#bm-rematch");if(!t)return;let i=e;da(),s?(t.classList.add("waiting"),t.textContent=`Waiting... (${i}s)`):t.textContent=`⚔ Rematch (${i}s)`;let r=this.ui.querySelector(".bm-rematch-countdown");if(!r){r=document.createElement("div"),r.className="bm-rematch-countdown";const o=this.ui.querySelector(".bm-result-buttons");o&&o.appendChild(r)}r.textContent=s?"Waiting for opponent...":"Opponent wants a rematch!",this.rematchInterval=setInterval(()=>{if(i--,i<=0){this.rematchInterval&&clearInterval(this.rematchInterval),this.rematchInterval=null,s&&this.disableRematch();return}da(),t&&(s?t.textContent=`Waiting... (${i}s)`:t.textContent=`⚔ Rematch (${i}s)`)},1e3)}showDisconnected(){this.teardownHome(),this.setBackdrop("dim"),this.stopPolling(),this.ui.innerHTML=`
      <div class="bm-title px-title" style="font-size:22px;letter-spacing:3px">Blood Moor</div>
      <div class="bm-divider" style="max-width:500px"><div class="bm-divider-line"></div><div class="bm-divider-gem"></div><div class="bm-divider-line"></div></div>
      <div class="bm-panel px-panel bm-disc-panel">
        <div class="bm-disc-title">Opponent Fled</div>
        <div class="bm-disc-sub">The coward has left the arena.<br>Refresh to seek new prey.</div>
      </div>`}appendChatMessage(e,s,t){const i=this.ui.querySelector("#bm-chat-msgs");if(!i)return;const r=this.getSenderColorClass(e),o=document.createElement("div");o.className="bm-msg",o.innerHTML=`<span class="bm-msg-sender ${r}">${ae(s)}</span><span class="bm-msg-text">${ae(t)}</span>`,i.appendChild(o),i.scrollTop=i.scrollHeight}appendSystemMessage(e){const s=this.ui.querySelector("#bm-chat-msgs");if(!s)return;const t=document.createElement("div");t.className="bm-msg",t.innerHTML=`<span class="bm-msg-sender bm-msg-sender-sys">—</span><span class="bm-msg-sys">${ae(e)}</span>`,s.appendChild(t),s.scrollTop=s.scrollHeight}hide(){this.teardownHome(),this.stopPolling(),this.rematchInterval&&(clearInterval(this.rematchInterval),this.rematchInterval=null),this.el.style.display="none"}show(){this.el.style.display=""}showPauseOverlay(e,s){this.hidePauseOverlay(),this.pauseOverlay=document.createElement("div"),this.pauseOverlay.className="bm-pause-overlay",this.pauseOverlay.innerHTML=`
      <div class="bm-pause-title">Opponent Disconnected</div>
      <div class="bm-pause-countdown" id="bm-pause-timer">${e}</div>
      <div class="bm-pause-sub">Waiting for opponent to rejoin...</div>
      <button class="bm-btn-leave px-btn" id="bm-pause-leave">Leave Match</button>`,this.el.parentElement.appendChild(this.pauseOverlay),this.pauseOverlay.querySelector("#bm-pause-leave").addEventListener("click",s);let t=e;const i=this.pauseOverlay.querySelector("#bm-pause-timer");this.pauseCountdownTimer=window.setInterval(()=>{t--,i.textContent=String(Math.max(0,t)),t<=0&&this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null)},1e3)}hidePauseOverlay(){this.pauseCountdownTimer!==null&&(clearInterval(this.pauseCountdownTimer),this.pauseCountdownTimer=null),this.pauseOverlay&&(this.pauseOverlay.remove(),this.pauseOverlay=null)}setBackdrop(e){this.bg.classList.toggle("bm-bg-dim",e==="dim")}stopPolling(){this.pollTimer!==null&&(clearInterval(this.pollTimer),this.pollTimer=null)}async pollLobbies(){try{const e=await fetch("http://localhost:3001/rooms"),{rooms:s}=await e.json();this.renderRoomRows(s)}catch{}}renderRoomRows(e){const s=this.ui.querySelector("#bm-rooms");if(s){if(e.length===0){s.innerHTML='<div class="bm-empty">No open lobbies<br>Be the first to enter the arena</div>';return}s.innerHTML=e.map(t=>{const i=t.mode==="2v2"?`<button class="bm-btn-green-sm px-btn" data-team="team1">Join T1</button>
           <button class="bm-btn-green-sm px-btn" data-team="team2" style="margin-left:6px">Join T2</button>`:'<button class="bm-btn-green-sm px-btn">Join</button>';return`
      <div class="bm-room-row" data-room-id="${ae(t.roomId)}" data-mode="${ae(t.mode)}">
        <div class="bm-room-info">
          <div class="bm-room-name">${ae(t.creatorName)}</div>
          <div class="bm-room-meta">Waiting for players</div>
        </div>
        <span class="bm-tag">${ae(t.mode)}</span>
        <div class="bm-players"><b>${t.playerCount}</b> / ${t.maxPlayers}</div>
        ${i}
      </div>`}).join(""),s.querySelectorAll(".bm-room-row").forEach(t=>{t.querySelectorAll(".bm-btn-green-sm").forEach(i=>{i.addEventListener("click",()=>{var l;const r=t.dataset.roomId,o=((l=this.ui.querySelector("#bm-name"))==null?void 0:l.value.trim())??"",n=i.dataset.team;o&&this.cb.onJoinRoom(r,o,n)})})})}}renderLobby(e,s,t){this.teardownHome();const i=`${location.origin}?room=${e}`,r=t==="ffa"||t==="2v2"?4:2,o=t==="2v2"?4:2,n=s.length>=o,d={"1v1":"1v1 Duel",ffa:"Free-for-All","2v2":"2v2 Teams"}[t??"1v1"]??"1v1 Duel",h=(u,g)=>u?`<div class="bm-slot" style="${u.ready?"box-shadow:0 0 0 2px var(--px-success),0 0 6px rgba(111,206,126,0.3);":""}">
             <div class="bm-avatar bm-avatar-${u.index%4}">${ae((u.name[0]??"?").toUpperCase())}</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name">${ae(u.name)}</div>
               <div class="bm-slot-status ${u.ready?"bm-status-ready":"bm-status-waiting"}">${u.ready?"✓ Ready":"Waiting..."}</div>
             </div>
           </div>`:`<div class="bm-slot">
             <div class="bm-avatar bm-avatar-empty">?</div>
             <div class="bm-slot-info">
               <div class="bm-slot-name" style="color:var(--px-border-light)">${g}</div>
               <div class="bm-slot-status bm-status-empty">Waiting for challenger...</div>
             </div>
           </div>`;let p="";for(let u=0;u<r;u++)p+=h(s[u],`Slot ${u+1}`);const f=n?'<button id="bm-ready" class="bm-btn-green px-btn px-btn-primary">⚔ Ready</button>':`<button class="bm-btn-green px-btn px-btn-primary" style="opacity:0.4;cursor:not-allowed" disabled>⚔ Ready</button>
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
              <div class="bm-code-value">${ae(e.toUpperCase())}</div>
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
      </div>`,this.ui.querySelector("#bm-copy").addEventListener("click",()=>{navigator.clipboard.writeText(i)}),this.ui.querySelector("#bm-leave").addEventListener("click",()=>{this.cb.onReturnToLobby()});const m=this.ui.querySelector("#bm-ready");m&&m.addEventListener("click",()=>{m.replaceWith(Object.assign(document.createElement("button"),{className:"bm-btn-green-done px-btn",textContent:"✓ Ready"})),this.cb.onReady()});const b=()=>{const u=this.ui.querySelector("#bm-chat-input"),g=u.value.trim();g&&(this.cb.onSendChatMessage(g),u.value="")};this.ui.querySelector("#bm-chat-send").addEventListener("click",b),this.ui.querySelector("#bm-chat-input").addEventListener("keydown",u=>{u.key==="Enter"&&b()})}getSenderColorClass(e){return e.split("").reduce((t,i)=>t+i.charCodeAt(0),0)%2===0?"bm-msg-sender-0":"bm-msg-sender-1"}}function Ma(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}class Qd{constructor(e,s){c(this,"el");this.cb=s,Ve(),this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#12141b;z-index:200;font-family:"VT323",monospace;color:var(--px-text)',e.appendChild(this.el),this.checkSession()}async checkSession(){const{data:{session:e}}=await $.auth.getSession();if(e){const{data:s}=await $.from("profiles").select("username").eq("user_id",e.user.id).single();if(s){this.cb.onAuthed(s.username,e.access_token);return}}this.showLogin()}showLogin(e=""){var s,t;this.el.innerHTML=`
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${ke("au")}</div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:28px;margin-bottom:8px">BLOODMOOR</h1>
        <p class="px-label" style="margin-bottom:6px">Arena PvP</p>
        <p style="font-family:'VT323',monospace;font-style:italic;color:#9aa0ae;font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:36px">Enter the blood-soaked arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 28px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${Ma(e)}</p>`:""}
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
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${ke("au")}</div>
      <div style="text-align:center;position:relative;z-index:1">
        <h1 class="px-title" style="font-size:22px;margin-bottom:8px">CREATE ACCOUNT</h1>
        <p style="font-family:'VT323',monospace;font-style:italic;color:#9aa0ae;font-size:16px;letter-spacing:0.1em;padding-left:0.1em;margin-bottom:28px">Join the arena</p>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,var(--px-border-dark),transparent);margin:0 auto 24px;position:relative">
          <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.5rem;color:var(--px-accent);background:var(--px-bg);padding:0 8px">◆</span>
        </div>
      </div>
      <div style="text-align:center;max-width:300px;width:100%;padding:0 24px;position:relative;z-index:1">
        ${e?`<p style="color:var(--px-danger);font-size:16px;margin-bottom:16px">${Ma(e)}</p>`:""}
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
    `,this.el.querySelector("#auth-submit").addEventListener("click",()=>this.handleRegister()),this.el.querySelector("#auth-back").addEventListener("click",()=>this.showLogin())}async handleSignIn(){const e=this.el.querySelector("#auth-email").value.trim(),s=this.el.querySelector("#auth-password").value,{data:t,error:i}=await $.auth.signInWithPassword({email:e,password:s});if(i||!t.session){this.showLogin((i==null?void 0:i.message)??"Sign in failed");return}const{data:r}=await $.from("profiles").select("username").eq("user_id",t.user.id).single();this.cb.onAuthed((r==null?void 0:r.username)??e,t.session.access_token)}async handleRegister(){const e=this.el.querySelector("#auth-username").value.trim(),s=this.el.querySelector("#auth-email").value.trim(),t=this.el.querySelector("#auth-password").value;if(!e){this.showRegister("Username is required");return}const{data:i,error:r}=await $.auth.signUp({email:s,password:t,options:{data:{username:e}}});if(r||!i.session){this.showRegister((r==null?void 0:r.message)??"Registration failed");return}this.cb.onAuthed(e,i.session.access_token)}hide(){this.el.style.display="none"}show(){this.el.style.display="flex"}}const Hs={"fire.fireball":"fa-fire","fire.volatile_ember":"fa-circle-dot","fire.seeking_flame":"fa-crosshairs","fire.hellfire":"fa-skull","fire.pyroclasm":"fa-arrows-turn-to-dots","fire.fire_wall":"fa-fire-flame-simple","fire.enduring_flames":"fa-hourglass-half","fire.searing_heat":"fa-temperature-high","fire.inferno_expanse":"fa-expand","fire.meteor":"fa-meteor","fire.molten_impact":"fa-burst","fire.blind_strike":"fa-hand-pointer","fire.cataclysm":"fa-cloud-meatball","utility.teleport":"fa-wand-magic","utility.phase_shift":"fa-maximize","utility.ethereal_form":"fa-ghost","utility.phantom_step":"fa-person-running","archer.power_shot":"fa-bullseye","archer.guided":"fa-location-arrow","archer.multishot":"fa-arrows-split-up-and-left","archer.homing":"fa-crosshairs","archer.barrage":"fa-burst","archer.rain_of_arrows":"fa-cloud-rain","archer.sustained_rain":"fa-hourglass-half","archer.piercing_rain":"fa-bolt","archer.wide_rain":"fa-up-right-and-down-left-from-center","archer.burn":"fa-fire","archer.freeze":"fa-snowflake","archer.poison":"fa-skull-crossbones","archer_utility.evade":"fa-person-running","archer_utility.combat_roll":"fa-person-falling","archer_utility.shadowstep":"fa-ghost","archer_utility.acrobatics":"fa-tornado","arms.jab":"fa-fist-raised","arms.heavy_thrust":"fa-hammer","arms.spear_throw":"fa-spoon","arms.stunning_blow":"fa-star","arms.leap":"fa-person-hiking","arms.crushing_landing":"fa-arrow-down","bulwark.bracing":"fa-shield","bulwark.mobile_guard":"fa-person-hiking","bulwark.reflect":"fa-repeat","bulwark.perfect_guard":"fa-shield-heart","frost.ice_bolt":"fa-icicles","frost.bitter_chill":"fa-temperature-low","frost.ice_lance":"fa-arrow-right-long","frost.ice_ray":"fa-bolt","frost.frostbite":"fa-tooth","frost.splintering_ice":"fa-shapes","frost.blizzard":"fa-snowflake","frost.lingering_winter":"fa-hourglass-half","frost.deepening_cold":"fa-temperature-arrow-down","frost.whiteout":"fa-expand","frost.frozen_orb":"fa-circle-nodes","frost.shard_storm":"fa-burst","frost.glacial_drift":"fa-gauge-simple-low","frost.cold_mastery":"fa-award","hunter.spike_trap":"fa-bomb","hunter.serrated_spikes":"fa-khanda","hunter.trap_cache":"fa-boxes-stacked","hunter.tripwire":"fa-grip-lines","hunter.shrapnel":"fa-burst","hunter.caltrops":"fa-splotch","hunter.rusted_barbs":"fa-bacteria","hunter.wide_scatter":"fa-maximize","hunter.barbed_wire":"fa-diagram-project","hunter.deadfall":"fa-skull-crossbones","hunter.heavy_jaws":"fa-weight-hanging","hunter.cascade":"fa-share-nodes","hunter.field_kit":"fa-toolbox"};function K(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Ds(){const a=getComputedStyle(document.documentElement).getPropertyValue("--ui-zoom"),e=parseFloat(a);return Number.isFinite(e)&&e>0?e:1}function Ta(a){return Ue.find(e=>e.spell===a).node}function Kt(a,e){return a<1?`${Math.round(e*100)}%`:e.toFixed(1).replace(/\.0$/,"")}const Jd={"fire.fireball":{x:50,row:0},"fire.volatile_ember":{x:30,row:1},"fire.seeking_flame":{x:70,row:1},"fire.hellfire":{x:30,row:2},"fire.pyroclasm":{x:70,row:2},"fire.fire_wall":{x:50,row:3},"fire.enduring_flames":{x:20,row:4},"fire.searing_heat":{x:50,row:4},"fire.inferno_expanse":{x:80,row:4},"fire.meteor":{x:50,row:5},"fire.molten_impact":{x:20,row:6},"fire.blind_strike":{x:50,row:6},"fire.cataclysm":{x:80,row:6}},eh={"frost.ice_bolt":{x:50,row:0},"frost.bitter_chill":{x:20,row:1},"frost.ice_ray":{x:50,row:1},"frost.ice_lance":{x:80,row:1},"frost.frostbite":{x:30,row:2},"frost.splintering_ice":{x:70,row:2},"frost.blizzard":{x:50,row:3},"frost.lingering_winter":{x:20,row:4},"frost.deepening_cold":{x:50,row:4},"frost.whiteout":{x:80,row:4},"frost.frozen_orb":{x:50,row:5},"frost.shard_storm":{x:20,row:6},"frost.glacial_drift":{x:50,row:6},"frost.cold_mastery":{x:80,row:6}},th={"hunter.spike_trap":{x:50,row:0},"hunter.serrated_spikes":{x:20,row:1},"hunter.trap_cache":{x:80,row:1},"hunter.tripwire":{x:30,row:2},"hunter.shrapnel":{x:70,row:2},"hunter.caltrops":{x:50,row:3},"hunter.rusted_barbs":{x:20,row:4},"hunter.wide_scatter":{x:50,row:4},"hunter.barbed_wire":{x:80,row:4},"hunter.deadfall":{x:50,row:5},"hunter.heavy_jaws":{x:20,row:6},"hunter.cascade":{x:50,row:6},"hunter.field_kit":{x:80,row:6}},sh={"utility.teleport":{x:50,row:0},"utility.phase_shift":{x:28,row:1},"utility.ethereal_form":{x:72,row:1},"utility.phantom_step":{x:50,row:2}},ih={"archer.power_shot":{x:50,row:0},"archer.guided":{x:30,row:1},"archer.multishot":{x:70,row:1},"archer.homing":{x:30,row:2},"archer.barrage":{x:70,row:2},"archer.rain_of_arrows":{x:50,row:3},"archer.sustained_rain":{x:20,row:4},"archer.piercing_rain":{x:50,row:4},"archer.wide_rain":{x:80,row:4},"archer.burn":{x:25,row:5},"archer.freeze":{x:50,row:5},"archer.poison":{x:75,row:5}},ah={"archer_utility.evade":{x:50,row:0},"archer_utility.combat_roll":{x:28,row:1},"archer_utility.shadowstep":{x:72,row:1},"archer_utility.acrobatics":{x:50,row:2}},rh={"arms.jab":{x:50,row:0},"arms.heavy_thrust":{x:30,row:1},"arms.spear_throw":{x:70,row:1},"arms.stunning_blow":{x:70,row:2},"arms.leap":{x:50,row:3},"arms.crushing_landing":{x:50,row:4}},oh={"bulwark.bracing":{x:50,row:0},"bulwark.mobile_guard":{x:28,row:1},"bulwark.reflect":{x:72,row:1},"bulwark.perfect_guard":{x:50,row:2}},to=7,nh=6,lh=3,ch=7,dh=5,hh=7,Us=16,_t=[{row:28+Us,spell:28,mod:20,block:28,icon:.7,modIcon:.55},{row:62+Us,spell:62,mod:46,block:62,icon:1.5,modIcon:1.25},{row:72+Us,spell:72,mod:54,block:72,icon:1.75,modIcon:1.45}],ns=(a,e)=>(a-1)*e.row+e.block,ph=56,so=a=>ns(to,a)+ph,fh=238;function Ea(a){const e=a-fh;for(let s=_t.length-1;s>0;s--)if(so(_t[s])<=e)return _t[s];return _t[0]}const Qt={fire:"#e86020",lightning:"#e86020",archer:"#e86020",frost:"#6fd3f2",utility:"#b48cff",archer_utility:"#b48cff",arms:"#d9a45b",bulwark:"#8ca9ff",hunter:"#7fae5c"},js={fire:"ember",lightning:"ember",archer:"ember",frost:"frost",utility:"arcane",archer_utility:"arcane",arms:"ember",bulwark:"arcane",hunter:"ember"},Gs={fire:"fa-fire",lightning:"fa-bolt",archer:"fa-bullseye",frost:"fa-snowflake",utility:"fa-wand-magic",archer_utility:"fa-person-running",arms:"fa-hand-fist",bulwark:"fa-shield-halved",hunter:"fa-bomb"},uh={mage:{main:"fire",util:"utility",mainLabel:"Fire",utilLabel:"Shared Utility",mainPositions:Jd,utilPositions:sh,mainRows:to,third:{tree:"frost",label:"Frost",positions:eh,rows:ch}},ranger:{main:"archer",util:"archer_utility",mainLabel:"Archer",utilLabel:"Evasion",mainPositions:ih,utilPositions:ah,mainRows:nh,third:{tree:"hunter",label:"Hunter",positions:th,rows:hh}},gladiator:{main:"arms",util:"bulwark",mainLabel:"Arms",utilLabel:"Bulwark",mainPositions:rh,utilPositions:oh,mainRows:dh}},mh=`
.st-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.st-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px 16px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
/* ── header bar ─────────────────────────────────────────────────────── */
.st-title{font-size:11px;letter-spacing:0.05em;}
.st-points-pill{display:flex;align-items:center;gap:10px;background:#101117;padding:8px 16px;box-shadow:inset 0 0 0 2px var(--px-border-dark);}
.st-points-gem{width:10px;height:10px;background:var(--px-success);transform:rotate(45deg);box-shadow:0 0 8px rgba(111,206,126,0.7);}
.st-points-num{font-family:'Press Start 2P',monospace;font-size:14px;color:var(--px-success);}
.st-points-label{font-family:'Press Start 2P',monospace;font-size:7px;color:var(--px-border-light);letter-spacing:0.1em;}
.st-btn{padding:10px 16px;font-size:8px;letter-spacing:0.05em;}
/* ── three-column workspace ─────────────────────────────────────────── */
.st-columns{display:flex;gap:24px;width:100%;max-width:1400px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.st-col-main{flex:1 1 480px;min-width:380px;max-width:560px;}
.st-columns.has-third .st-col-main{flex-basis:400px;max-width:480px;}
.st-col-side{flex:1 1 340px;min-width:340px;max-width:400px;}
.st-col-third{flex:1 1 380px;min-width:380px;max-width:480px;}
/* Every column is pinned to the same workspace height (set inline) so the
   panels line up in a clean row regardless of how many rows the tree inside
   actually uses. */
.st-tree-panel{height:100%;display:flex;flex-direction:column;box-sizing:border-box;background:#15161b;box-shadow:inset 0 2px 0 0 var(--px-border-dark),inset 0 -2px 0 0 var(--px-border-light),0 0 0 2px var(--st-tree-accent,var(--px-accent));}
.st-tree-panel-header{flex:0 0 auto;padding:7px 10px;background:#101117;box-shadow:inset 0 -2px 0 0 var(--st-tree-accent,var(--px-accent));font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--st-tree-accent,var(--px-accent));display:flex;align-items:center;justify-content:space-between;gap:10px;}
.st-tree-header-name{display:flex;align-items:center;gap:8px;min-width:0;}
.st-tree-header-pts{font-size:12px;letter-spacing:0.06em;opacity:0.85;white-space:nowrap;flex:0 0 auto;}
/* Per-tree elemental backdrop: no art asset, so each element is built purely
   from layered gradients, a repeating-pattern texture and a box-shadow
   vignette, kept dark enough that it never competes with the node icons —
   atmosphere, not saturation. The data-motif attribute (set from JS, see
   TREE_MOTIF) picks the element; the shared base rule supplies the vignette
   and fallback every motif builds on. */
.st-tree-panel-body{flex:1 1 auto;min-height:0;padding:16px 10px 10px;box-sizing:border-box;position:relative;
  background:radial-gradient(85% 85% at 50% 50%,transparent 40%,rgba(0,0,0,0.6) 100%),#101116;
  box-shadow:inset 0 0 46px 10px rgba(0,0,0,0.55);}
/* Fire / Archer: an ember glow rising from the panel's base, with two faint
   diagonal streak layers standing in for rising sparks. */
.st-tree-panel-body[data-motif="ember"]{background:
    radial-gradient(65% 42% at 50% 102%,rgba(232,96,32,0.32) 0%,rgba(232,96,32,0.12) 45%,transparent 78%),
    repeating-linear-gradient(76deg,rgba(255,150,64,0.055) 0 2px,transparent 2px 27px),
    repeating-linear-gradient(104deg,rgba(255,150,64,0.045) 0 2px,transparent 2px 36px),
    radial-gradient(90% 55% at 50% 0%,rgba(232,96,32,0.08) 0%,transparent 60%),
    radial-gradient(85% 85% at 50% 50%,transparent 38%,rgba(0,0,0,0.62) 100%),
    #0d0a08;}
/* Frost: a cold top-down wash with faint crystalline banding cut by two
   opposed repeating-linear-gradients (facets, not brick). */
.st-tree-panel-body[data-motif="frost"]{background:
    radial-gradient(95% 50% at 50% 0%,rgba(111,211,242,0.24) 0%,rgba(111,211,242,0.07) 48%,transparent 78%),
    repeating-linear-gradient(118deg,rgba(190,235,250,0.05) 0 1px,transparent 1px 23px),
    repeating-linear-gradient(62deg,rgba(190,235,250,0.04) 0 1px,transparent 1px 31px),
    radial-gradient(85% 85% at 50% 50%,transparent 38%,rgba(0,0,0,0.62) 100%),
    #090d10;}
/* Utility / Evasion: a dim, low-contrast arcane haze — soft radial bloom plus
   a faint scattered-mote texture from a repeating-radial-gradient. */
.st-tree-panel-body[data-motif="arcane"]{background:
    radial-gradient(120% 55% at 50% 38%,rgba(180,140,255,0.16) 0%,transparent 72%),
    repeating-radial-gradient(circle at 30% 20%,rgba(180,140,255,0.05) 0 2px,transparent 2px 38px),
    repeating-radial-gradient(circle at 70% 65%,rgba(180,140,255,0.04) 0 2px,transparent 2px 46px),
    radial-gradient(85% 85% at 50% 50%,transparent 38%,rgba(0,0,0,0.62) 100%),
    #0b0a10;}
.st-tree-container{position:relative;width:100%;}
.st-util-container{position:relative;width:100%;}
.st-tree-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;}
/* ── nodes: no name label any more (moved to the hover tooltip), so the node
   is just its icon plate plus badges — a raised, beveled square rather than a
   flat tile. ── */
.st-node{position:absolute;cursor:pointer;transform:translateX(-50%);}
.st-node-circle{border-radius:0;display:flex;align-items:center;justify-content:center;transition:filter 0.14s,transform 0.14s;position:relative;}
/* Inner bevel: a hard-edged highlight/shadow pair (no blur, so it stays
   pixel-art rather than painterly) that reads the plate as an inset object.
   Lives on its own layer so every state below only has to declare its ring
   colour, not repeat the bevel. */
.st-node-circle::before{content:'';position:absolute;inset:0;pointer-events:none;
  box-shadow:inset 2px 2px 0 rgba(255,255,255,0.12),inset -2px -2px 0 rgba(0,0,0,0.6);}
.st-node-circle:hover{transform:scale(1.08);}
/* The hover tooltip already shows a locked node's requirements the instant
   the cursor lands on it — there is nothing left for a click to reveal, so
   unlike the old pinned-panel layout this stays not-allowed. */
.st-node[data-state="locked"] .st-node-circle{cursor:not-allowed;}
.st-node[data-state="locked"] .st-node-circle:hover{transform:none;}
/* Sizes come from the picked Scale, set as custom properties on .st-ui. */
.st-node-spell{width:var(--st-spell);height:var(--st-spell);}
.st-node-mod{width:var(--st-mod);height:var(--st-mod);}
/* Every state ring leads with a 1px solid black frame before its colour —
   the crisp edge the reference's beveled plate has against the backdrop,
   independent of whatever's glowing behind it. */
.st-node-owned .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #e86020;background:radial-gradient(circle at 38% 38%,#2a0c00,#0e0400);}
.st-node-owned.st-node-is-spell .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #e86020,0 0 12px rgba(232,96,32,0.25);}
.st-node-owned .st-node-icon{color:#e87040;}
.st-node-purchasable .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 3px var(--px-accent);background:radial-gradient(circle at 38% 38%,#201200,#0a0400);animation:st-pulse 1.6s ease-in-out infinite;}
.st-node-purchasable .st-node-icon{color:var(--px-accent);}
@keyframes st-pulse{0%,100%{box-shadow:0 0 0 1px #000,0 0 0 3px var(--px-accent);}50%{box-shadow:0 0 0 1px #000,0 0 0 3px var(--px-accent),0 0 14px rgba(255,179,71,0.55);}}
/* Locked is dim, not invisible: the unbought half of the tree is what the
   player plans against, and #555 on the lit brick backdrop read as empty
   space. Kept clearly below owned/purchasable in weight, still legible. */
.st-node-locked .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 2.5px #5b6270;background:#0e1015;}
.st-node-locked .st-node-icon{color:#8d94a4;}
/* Unavailable icons desaturate to greyscale (the reference's tell for "not
   yet available"), same as the excluded-by-choice state below already reads
   in muted red — exclusion keeps its own hue and is carved out below so the
   two locked variants stay visually distinct from each other. */
.st-node-locked:not(.st-node-excluded) .st-node-icon{filter:grayscale(1);}
/* Excluded by a mutually-exclusive sibling — locked by a choice already made,
   not by a missing requirement, so it reads red rather than grey. */
.st-node-excluded .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 2.5px #6b3a3a;background:#150c0c;}
.st-node-excluded .st-node-icon{color:#9a6a6a;}
/* Gear-granted ranks. Deliberately cool: owned, purchasable and supercharged
   are three warm hues on a torchlit backdrop already, and "this came from your
   gear, not your points" is the one distinction that must never be mistaken
   for one of them. Declared before the gold rules so a gear node pushed past
   its cap still reads as supercharged — the keystone matters more than where
   the ranks came from, and the cyan badge still says. */
.st-node-gear .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #3f9fbd;background:radial-gradient(circle at 38% 38%,#04222c,#020c10);}
.st-node-gear .st-node-icon{color:#6fc9e4;}
.st-badge-gear,.st-badge-gearonly{color:#6fc9e4;}
/* supercharged: ranks pushed past the soft cap — gold treatment */
.st-node-supercharged .st-node-circle{box-shadow:0 0 0 1px #000,0 0 0 4px #ddb84a,0 0 14px rgba(221,184,74,0.45);background:radial-gradient(circle at 38% 38%,#2a2000,#0e0a00);}
.st-node-supercharged .st-node-icon{color:#ddb84a;}
.st-keystone{margin-top:8px;padding:8px;background:rgba(221,184,74,0.06);box-shadow:0 0 0 1px rgba(221,184,74,0.3);font-size:11px}
.st-keystone-name{color:#ddb84a;margin-bottom:4px}
.st-keystone-active{background:rgba(221,184,74,0.14)}
.st-node-selected .st-node-circle{outline:2px solid #fff;outline-offset:3px;}
/* Corner plate, bottom-right of the icon. Owned/gear/supercharged nodes (any
   effective rank > 0) show current/max, WoW-style, for tracking progress;
   everything still at rank 0 — locked, purchasable, or excluded — shows its
   point cost instead, so a route through the tree can be planned without
   hovering every node along it. The bare-number vs. fraction shape is itself
   the tell between the two, on top of the colour. Opposite corner from the
   keystone marker (top-left) so the two never collide. */
.st-badge{position:absolute;right:-9px;bottom:-4px;font-family:'Press Start 2P',monospace;font-size:7px;padding:3px 4px;background:var(--px-border-dark);box-shadow:0 0 0 1px #000;pointer-events:none;z-index:2;}
.st-badge-rank{color:#e87040;}
.st-badge-rank.st-past-cap{color:#ddb84a;}
.st-badge-lock{color:#98a0b0;}
.st-badge-buyable{color:var(--px-accent);}
.st-badge-excl{color:#c06a6a;}
.st-badge-excl .fa{margin-right:3px;}
/* Keystone marker, opposite corner from the cost/rank badge: dim while the
   keystone is dormant, lit gold once ranks pass the soft cap. Deliberately
   plateless — on a 38px mod circle a second badge box crowds the cost badge
   across from it, so this is a bare glyph with a black outline instead. */
.st-keymark{position:absolute;left:-6px;top:-6px;font-size:9px;line-height:1;color:#8a7838;pointer-events:none;z-index:3;
  text-shadow:1px 0 0 #05060a,-1px 0 0 #05060a,0 1px 0 #05060a,0 -1px 0 #05060a;}
.st-keymark.st-keymark-on{color:#ffd75e;text-shadow:1px 0 0 #05060a,-1px 0 0 #05060a,0 1px 0 #05060a,0 -1px 0 #05060a,0 0 7px rgba(255,215,94,0.9);}
.st-node-locked .st-keymark{color:#6b6242;}
.st-flash .st-node-circle{animation:st-buy-flash 0.45s ease-out;}
@keyframes st-buy-flash{0%{filter:brightness(3) saturate(2);}100%{filter:none;}}
/* ── hover tooltip (WoW-style: cursor-anchored, instant, never intercepts
   clicks) — content markup mirrors the old pinned details panel exactly,
   gear/exclusion info included. ── */
.st-tooltip{position:fixed;display:none;z-index:200;max-width:320px;padding:10px 14px;box-sizing:border-box;background:var(--px-panel);box-shadow:inset 0 0 0 2px var(--px-border-dark),0 0 0 2px var(--st-tt-accent,var(--px-accent)),0 6px 16px rgba(0,0,0,0.55);pointer-events:none;font-family:'VT323',monospace;color:var(--px-text);}
.st-details-head{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.st-details-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;background:#101117;box-shadow:inset 0 0 0 2px var(--px-border-dark);font-size:18px;}
.st-details-name{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--px-accent);line-height:1.5;}
.st-details-kind{font-size:14px;color:var(--px-border-light);letter-spacing:0.08em;text-transform:uppercase;}
.st-details-desc{font-size:17px;line-height:1.4;color:var(--px-text);margin:7px 0;}
.st-rank-track{display:flex;gap:3px;margin:6px 0;}
.st-rank-seg{height:8px;flex:1;background:#1a1b21;box-shadow:inset 0 0 0 1px var(--px-border-dark);}
.st-rank-seg.filled{background:#e86020;}
.st-rank-seg.past-cap{background:#ddb84a;}
.st-rank-seg.from-gear{background:#3f9fbd;}
.st-gear-line{font-size:15px;line-height:1.5;color:#6fc9e4;margin:4px 0;}
.st-gear-line .fa{margin-right:5px;font-size:12px;}
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
/* Slim horizontal strip beneath the tree row — quiet, not a second focal
   point, so it wraps on narrow widths rather than forcing a scrollbar. */
.st-legend{margin-top:14px;padding-top:10px;border-top:1px solid var(--px-border-dark);display:flex;flex-wrap:wrap;justify-content:center;gap:8px 20px;font-size:13px;color:var(--px-border-light);width:100%;max-width:1400px;box-sizing:border-box;}
.st-legend-row{display:flex;align-items:center;gap:6px;white-space:nowrap;}
.st-legend-swatch{width:11px;height:11px;flex:0 0 11px;}
.st-legend-mark{flex:0 0 auto;font-size:11px;color:#ffd75e;}
/* ── selected-node action bar ──────────────────────────────────────────
   The details panel used to host a visible refund button; it can't live in
   the tooltip above (pointer-events:none, and it tracks the cursor rather
   than staying put), so it's rehomed here, anchored to whichever node was
   last clicked (selectedId) rather than last hovered. Empty/hidden unless
   the selected node is owned. */
.st-selection-bar{display:none;align-items:center;gap:14px;margin-top:14px;padding:10px 16px;background:#15161b;box-shadow:inset 0 0 0 2px var(--px-border-dark);width:100%;max-width:1400px;box-sizing:border-box;font-family:'VT323',monospace;font-size:15px;color:var(--px-border-light);}
.st-selection-name{font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-accent);flex:0 0 auto;}
.st-refund-btn{padding:8px 12px;font-size:7px;letter-spacing:0.05em;}
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
`;class gh{constructor(e,s,t){c(this,"el");c(this,"ranks",new Map);c(this,"gearRanks",new Map);c(this,"slotRows",[]);c(this,"characterId",null);c(this,"skillPoints",0);c(this,"charName","");c(this,"charClass","");c(this,"selectedId",null);c(this,"flashId",null);c(this,"pickingSlot",null);c(this,"scale",_t[0]);c(this,"hasRendered",!1);c(this,"resizeTimer",null);c(this,"tooltipEl");c(this,"hoveredId",null);c(this,"lastPointer",{x:0,y:0});c(this,"onResize",()=>{this.resizeTimer!==null&&window.clearTimeout(this.resizeTimer),this.resizeTimer=window.setTimeout(()=>{this.resizeTimer=null,this.hasRendered&&Ea(window.innerHeight/Ds())!==this.scale&&this.render()},150)});c(this,"closeResolver",null);c(this,"navTeardown",null);this.navCtx=s,this.navHandlers=t,Ve(),Gt();const i=document.createElement("style");i.textContent=mh,document.head.appendChild(i),this.el=document.createElement("div"),this.el.className="st-overlay",e.appendChild(this.el),this.tooltipEl=document.createElement("div"),this.tooltipEl.className="st-tooltip",e.appendChild(this.tooltipEl)}yOf(e){return e.row*this.scale.row}async show(e){return this.characterId=e??null,this.selectedId=null,this.el.style.display="block",window.addEventListener("resize",this.onResize),this.renderLoading(),await this.reload(),await new Promise(s=>{this.closeResolver=s})}hide(e="arena"){var t;this.el.style.display="none",this.hideTooltip(),window.removeEventListener("resize",this.onResize),this.resizeTimer!==null&&(window.clearTimeout(this.resizeTimer),this.resizeTimer=null),this.hasRendered=!1,(t=this.navTeardown)==null||t.call(this),this.navTeardown=null;const s=this.closeResolver;this.closeResolver=null,s==null||s(e)}renderLoading(){var e;this.el.innerHTML=`
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${ke("st")}</div>
      <div class="st-ui">
        ${je({active:"skills",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="st-title px-title">Skills</div>
        </div>
        <div class="bm-loading">Loading skills…</div>
      </div>
    `,(e=this.navTeardown)==null||e.call(this),this.navTeardown=Ge(this.el,{onNavigate:s=>this.hide(s),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()})}async reload(){if(!this.characterId)return;const[{data:e},{data:s},t,{data:i}]=await Promise.all([$.from("characters").select("skill_points_available, name, class").eq("id",this.characterId).single(),$.from("skill_unlocks").select("node_id, rank").eq("character_id",this.characterId),_i(),$.from("character_spell_slots").select("slot, spell").eq("character_id",this.characterId)]);this.skillPoints=(e==null?void 0:e.skill_points_available)??0,this.charName=(e==null?void 0:e.name)??"Unknown",this.charClass=st(e==null?void 0:e.class),this.ranks=new Map((s??[]).map(o=>[o.node_id,o.rank??1])),this.gearRanks=mr(t.filter(o=>o.equipped_by===this.characterId),this.charClass).talentRanks;const r=ps[st(this.charClass)];this.ranks.has(r)||(await $.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:r,p_cost:0}),this.ranks.set(r,1)),this.slotRows=i??[],this.render()}ownedSpells(){return new Set(Ue.filter(e=>this.ranks.has(e.node)||this.gearRanks.has(e.node)).map(e=>e.spell))}currentSlots(){return gi(this.ownedSpells(),this.slotRows)}pointsSpent(e){return e.reduce((s,t)=>s+kn(t,this.ranks.get(t.id)??0),0)}render(){var M,q;const e=this.skillPoints,s=st(this.charClass),t=uh[s],i=Z.filter(v=>v.tree===t.main),r=Z.filter(v=>v.tree===t.util),o=t.mainPositions,n=t.utilPositions,l=t.mainLabel,d=t.main,h=t.util,p=t.third,f=p?Z.filter(v=>v.tree===p.tree):[];this.scale=Ea(window.innerHeight/Ds());const m=this.scale,b=`${ns(t.mainRows,m)}px`,u=`${ns(lh,m)}px`,g=p?`${ns(p.rows,m)}px`:"0px",_=so(m),E=`--st-spell:${m.spell}px;--st-mod:${m.mod}px`,x=[...i,...f,...r],C=x.some(v=>v.keystone),k=x.some(v=>{var w,I;return(I=(w=et[v.id])==null?void 0:w.mutuallyExclusive)==null?void 0:I.length}),y=this.gearRanks.size>0;this.el.innerHTML=`
      <div class="st-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${ke("st")}</div>
      <div class="st-ui" style="${E}">
        ${je({active:"skills",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="st-title px-title">${K(this.charName)} — ${K(this.charClass)} Skills</div>
          <div class="bm-subhead-actions">
            <div class="st-points-pill">
              <div class="st-points-gem"></div>
              <span class="st-points-num">${e}</span>
              <span class="st-points-label">Points<br>Available</span>
            </div>
            <button id="st-respec" class="st-btn px-btn">Reset Skills</button>
          </div>
        </div>

        <svg width="0" height="0" style="position:absolute" aria-hidden="true">
          <defs>
            ${["owned","buyable","locked"].map(v=>`<marker id="st-arrow-${v}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${v==="owned"?"#e86020":v==="buyable"?"#c8860a":"#333"}"/></marker>`).join("")}
          </defs>
        </svg>

        <div class="st-columns${p?" has-third":""}">
          <div class="st-col-main" style="height:${_}px">
            <div class="st-tree-panel" style="--st-tree-accent:${Qt[d]}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${Gs[d]}"></i>${l}</span>
                <span class="st-tree-header-pts">${this.pointsSpent(i)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${js[d]}">
                <div class="st-tree-container" style="height:${b}">
                  <svg id="st-main-svg" class="st-tree-svg"></svg>
                  ${i.map(v=>this.renderNode(v,e,o[v.id])).join("")}
                </div>
              </div>
            </div>
          </div>
          ${p?`
          <div class="st-col-third" style="height:${_}px">
            <div class="st-tree-panel" style="--st-tree-accent:${Qt[p.tree]}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${Gs[p.tree]}"></i>${p.label}</span>
                <span class="st-tree-header-pts">${this.pointsSpent(f)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${js[p.tree]}">
                <div class="st-tree-container" style="height:${g}">
                  <svg id="st-third-svg" class="st-tree-svg"></svg>
                  ${f.map(v=>this.renderNode(v,e,p.positions[v.id])).join("")}
                </div>
              </div>
            </div>
          </div>`:""}
          <div class="st-col-side" style="height:${_}px">
            <div class="st-tree-panel" style="--st-tree-accent:${Qt[h]}">
              <div class="st-tree-panel-header">
                <span class="st-tree-header-name"><i class="fa ${Gs[h]}"></i>${t.utilLabel}</span>
                <span class="st-tree-header-pts">${this.pointsSpent(r)} pts</span>
              </div>
              <div class="st-tree-panel-body" data-motif="${js[h]}">
                <div class="st-util-container" style="height:${u}">
                  <svg id="st-util-svg" class="st-tree-svg" overflow="visible"></svg>
                  ${r.map(v=>this.renderNode(v,e,n[v.id])).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="st-legend">
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #e86020;background:#2a0c00;"></span>Owned</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-accent);background:#201200;"></span>Can learn — click it</div>
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 1.5px #5b6270;background:#0e1015;"></span>Locked — badge shows cost</div>
          ${y?'<div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px #3f9fbd;background:#04222c;"></span>Rank from gear</div>':""}
          ${C?'<div class="st-legend-row"><span class="st-legend-mark"><i class="fa fa-bolt"></i></span>Keystone (past cap)</div>':""}
          <div class="st-legend-row"><span class="st-legend-swatch" style="background:repeating-linear-gradient(90deg,#c8860a 0 4px,transparent 4px 7px);"></span>Dashed line: needs any one parent</div>
          ${k?'<div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 2px 0 0 var(--px-accent);"></span>Choose one</div>':""}
          <div class="st-legend-row"><span class="st-legend-swatch" style="box-shadow:0 0 0 2px var(--px-border-light);background:#101117;"></span>Right-click a skill: refund 1 rank</div>
        </div>

        <div class="st-selection-bar" id="st-selection-bar"></div>

        <div class="st-slots" id="st-slots">${this.renderSlotBar()}</div>
        <div class="st-picker" id="st-picker"></div>
      </div>
    `,(M=this.navTeardown)==null||M.call(this),this.navTeardown=Ge(this.el,{onNavigate:v=>this.hide(v),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.el.querySelector("#st-respec").addEventListener("click",()=>this.handleRespec()),this.el.querySelectorAll(".st-slot").forEach(v=>{v.addEventListener("click",()=>{this.openPicker(Number(v.dataset.slot))})}),this.el.querySelector("#st-picker").addEventListener("click",v=>{const w=v.target.closest(".st-picker-item");if(!w||this.pickingSlot===null)return;const I=w.dataset.spell;this.assignSlot(this.pickingSlot,I==="clear"?null:Number(I))}),this.drawConnections("st-main-svg",o,i,e),this.drawConnections("st-util-svg",n,r,e),p&&this.drawConnections("st-third-svg",p.positions,f,e),this.attachNodeListeners(e),this.renderSelectionBar(),this.hoveredId&&this.showTooltipFor(this.hoveredId,e),this.flashId&&((q=this.el.querySelector(`.st-node[data-id="${this.flashId}"]`))==null||q.classList.add("st-flash"),this.flashId=null),this.hasRendered=!0}gearRank(e){return this.gearRanks.get(e)??0}effRank(e){return(this.ranks.get(e)??0)+this.gearRank(e)}renderNode(e,s,t){if(!t)return"";const i=this.ranks.get(e.id)??0,r=this.gearRank(e.id),o=i+r,n=i>0,l=!n&&r>0,d=!n&&ut(e.id,this.ranks)&&s>=e.cost,h=We(e)&&o>e.stackable.softCap,p=!n&&this.exclusionOwner(e.id)!==null,m=h?`${l?"st-node-gear":"st-node-owned"} st-node-supercharged`:n?"st-node-owned":l?"st-node-gear":d?"st-node-purchasable":p?"st-node-locked st-node-excluded":"st-node-locked",b=e.isSpell?"st-node-is-spell":"",u=e.isSpell?"st-node-spell":"st-node-mod",g=e.id===this.selectedId?"st-node-selected":"",_=Hs[e.id]??"fa-star",E=n||l?"owned":d?"purchasable":"locked",x=We(e)?e.stackable.softCap:1,C=p?'<i class="fa fa-ban"></i> ':"";let k;if(o>0){const M=r>0?`<span class="st-badge-gear">+${r}</span>`:"";k=`<span class="st-badge ${h?"st-badge-rank st-past-cap":l?"st-badge-gearonly":"st-badge-rank"}">${i}${M}/${x}</span>`}else k=`<span class="st-badge ${p?"st-badge-excl":d?"st-badge-buyable":"st-badge-lock"}">${C}${e.cost}</span>`;const y=e.keystone?`<span class="st-keymark${h?" st-keymark-on":""}"><i class="fa fa-bolt"></i></span>`:"";return`<div class="st-node ${m} ${b} ${g}" data-id="${e.id}" data-state="${E}"
      style="left:${t.x}%;top:${this.yOf(t)}px;">
      <div class="st-node-circle ${u}">
        <i class="fa ${_} fa-fw st-node-icon" style="font-size:${e.isSpell?this.scale.icon:this.scale.modIcon}rem"></i>
        ${k}
        ${y}
      </div>
    </div>`}exclusionOwner(e){var s,t;return((t=(s=et[e])==null?void 0:s.mutuallyExclusive)==null?void 0:t.find(i=>this.ranks.has(i)))??null}exclusiveBrackets(e,s){var r;const t=new Set;let i="";for(const o of s){if(t.has(o.id))continue;const n=(r=et[o.id])==null?void 0:r.mutuallyExclusive;if(!(n!=null&&n.length))continue;const l=[o.id,...n].filter(x=>e[x]);if(l.length<2)continue;l.forEach(x=>t.add(x));const d=e[l[0]].row;if(l.some(x=>e[x].row!==d))continue;const h=this.yOf(e[l[0]]),p=l.map(x=>e[x].x).sort((x,C)=>x-C),[f,m]=[p[0],p[p.length-1]],b=h+this.scale.block+8,u=l.some(x=>this.ranks.has(x)),g=u?"#5b6270":"var(--px-accent)",_=u?.5:.7,E=p.map(x=>`<line x1="${x}%" y1="${b}" x2="${x}%" y2="${b-5}" stroke="${g}" stroke-opacity="${_}" stroke-width="1.5"/>`).join("");i+=`<line x1="${f}%" y1="${b}" x2="${m}%" y2="${b}" stroke="${g}" stroke-opacity="${_}" stroke-width="1.5"/>${E}<text x="${(f+m)/2}%" y="${b+15}" text-anchor="middle" fill="${g}" fill-opacity="${_}" font-family="'Press Start 2P',monospace" font-size="7" letter-spacing="1">CHOOSE ONE</text>`}return i}renderSlotBar(){return this.currentSlots().map((s,t)=>{const i=s===null?"fa-minus":Hs[Ta(s)]??"fa-star";return`<div class="st-slot" data-slot="${t+1}">
        <i class="fa ${i} fa-fw"${s===null?' style="opacity:0.3"':""}></i>
        <span class="st-slot-key">${t+1}</span>
      </div>`}).join("")}drawConnections(e,s,t,i){const r=this.el.querySelector(`#${e}`);if(!r)return;const o=24;let n="";for(const l of t){const d=et[l.id];if(!d)continue;const h=s[l.id];if(!h)continue;const p=this.ranks.has(l.id),f=!p&&ut(l.id,this.ranks)&&i>=l.cost,m=p?"#e86020":f?"#c8860a":"#333",b=p?.75:f?.5:.3,u=p?2.5:2,g=p?"st-arrow-owned":f?"st-arrow-buyable":"st-arrow-locked";if(d.requiresAll)for(const _ of d.requiresAll){const E=s[_];E&&(n+=`<line x1="${E.x}%" y1="${this.yOf(E)+o}" x2="${h.x}%" y2="${this.yOf(h)}" stroke="${m}" stroke-opacity="${b}" stroke-width="${u}" marker-end="url(#${g})"/>`)}if(d.requiresAny)for(const _ of d.requiresAny){const E=s[_];E&&(n+=`<line x1="${E.x}%" y1="${this.yOf(E)+o}" x2="${h.x}%" y2="${this.yOf(h)}" stroke="${m}" stroke-opacity="${b*.8}" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#${g})"/>`)}}r.innerHTML=n+this.exclusiveBrackets(s,t)}buildTooltipContent(e,s){var E,x,C,k;const t=Z.find(y=>y.id===e),i=et[e],r=this.ranks.get(e)??0,o=this.gearRank(e),n=r+o,l=r>0,d=Hs[e]??"fa-star",h=t.isSpell?"Active Spell":"Passive",p=o>0?`<div class="st-gear-line"><i class="fa fa-shield-halved"></i> +${o} rank${o>1?"s":""} from equipped gear${l?"":" — active without buying it"}</div>`:"";let f="";if(t.keystone&&We(t)){const y=t.stackable.softCap,M=n>y;f=`
        <div class="st-keystone${M?" st-keystone-active":""}">
          <div class="st-keystone-name">⚡ ${K(t.keystone.name)}${M?" — ACTIVE":` — unlocks at rank ${y+1}`}</div>
          <div>${K(t.keystone.description)}</div>
        </div>`}let m="",b="";if(We(t)){const y=t.stackable.softCap,M=t.stackable.baseEffect,q=Math.max(y,n),v=Array.from({length:q},(z,W)=>W>=n?'<div class="st-rank-seg"></div>':`<div class="st-rank-seg ${W<r?W<y?"filled":"filled past-cap":"filled from-gear"}"></div>`).join(""),w=n>y?' <span style="color:#ddb84a">⚡ Supercharged</span>':"";if(m=`
        <div class="st-rank-line">${o>0?`Rank ${r} +${o} gear = ${n} / ${y}`:`Rank ${r} / ${y}`}${w}</div>
        <div class="st-rank-track">${v}</div>
      `,n>=y){const z=Me=>Kt(M,Me),W=qe(M,n),ie=qe(M,n+1);b=`
          <div class="st-super-note">
            ⚡ ${n>y?`Supercharging is boosting this talent's total effect to <b>${z(W)}</b> (base cap is ${z(qe(M,y))}).`:`This talent is at its cap: total effect <b>${z(W)}</b>.`}<br>
            Next rank raises it to <b>${z(ie)}</b> (+${z(ie-W)}) — each rank past the cap gives less and costs 1 pt more.
          </div>
        `}}let u="";if(i&&!l){const y=[];for(const M of i.requiresAll??[]){const q=this.ranks.has(M),v=((E=Z.find(w=>w.id===M))==null?void 0:E.name)??M;y.push(`<div class="${q?"met":"unmet"}"><i class="fa ${q?"fa-check":"fa-xmark"}"></i> ${K(v)}</div>`)}if((x=i.requiresAny)!=null&&x.length){const M=i.requiresAny.some(v=>this.ranks.has(v)),q=i.requiresAny.map(v=>{var w;return((w=Z.find(I=>I.id===v))==null?void 0:w.name)??v});y.push(`<div class="${M?"met":"unmet"}"><i class="fa ${M?"fa-check":"fa-xmark"}"></i> Any of: ${K(q.join(", "))}</div>`)}if((C=i.mutuallyExclusive)!=null&&C.length){const M=i.mutuallyExclusive.find(q=>this.ranks.has(q));if(M){const q=((k=Z.find(v=>v.id===M))==null?void 0:k.name)??M;y.push(`<div class="unmet"><i class="fa fa-ban"></i> Excluded by ${K(q)} (respec to change)</div>`)}}y.length&&(u=`<div class="st-req">${y.join("")}</div>`)}let g="";if(l){const y=this.refundBlockReason(e),M=tt(t,r-1);g=y===null?`<div class="st-refund-hint">Right-click: refund 1 rank (+${M} pt${M>1?"s":""}) — or click to select it for the refund button below the tree.</div>`:`<div class="st-refund-hint st-refund-blocked">Refund blocked: ${K(y)}</div>`}let _="";if(l&&We(t)){const y=tt(t,r),M=n>=t.stackable.softCap?"Supercharge":"Next rank";_=s>=y?`<span class="st-status-warn">${M} costs ${y} pt${y>1?"s":""} — click to buy</span>`:`<span class="st-status-bad">${M} costs ${y} pt${y>1?"s":""} — not enough points</span>`}else l?_='<span class="st-status-ok"><i class="fa fa-check"></i> Owned</span>':ut(e,this.ranks)?_=s>=t.cost?`<span class="st-status-ok">Costs ${t.cost} pt${t.cost>1?"s":""} — click to learn</span>`:`<span class="st-status-bad">Costs ${t.cost} pt${t.cost>1?"s":""} — not enough points</span>`:_='<span class="st-status-bad">Locked — requirements not met</span>';return`
      <div class="st-details-head">
        <div class="st-details-icon"><i class="fa ${d}" style="color:var(--px-accent)"></i></div>
        <div>
          <div class="st-details-name">${K(t.name)}</div>
          <div class="st-details-kind">${h}${l?"":` · ${t.cost} pt${t.cost>1?"s":""}`}</div>
        </div>
      </div>
      <div class="st-details-desc">${K(t.description)}</div>
      ${p}
      ${f}
      ${m}
      ${u}
      <div class="st-details-status">${_}</div>
      ${b}
      ${g}
    `}showTooltipFor(e,s){const t=Z.find(i=>i.id===e);t&&(this.hoveredId=e,this.tooltipEl.style.setProperty("--st-tt-accent",Qt[t.tree]),this.tooltipEl.innerHTML=this.buildTooltipContent(e,s),this.tooltipEl.style.display="block",this.positionTooltip(this.lastPointer.x,this.lastPointer.y))}positionTooltip(e,s){const i=this.tooltipEl.getBoundingClientRect();let r=e+18,o=s+18;r+i.width>window.innerWidth&&(r=e-18-i.width),o+i.height>window.innerHeight&&(o=s-18-i.height),r=Math.max(4,r),o=Math.max(4,o);const n=Ds();this.tooltipEl.style.left=`${r/n}px`,this.tooltipEl.style.top=`${o/n}px`}hideTooltip(){this.hoveredId=null,this.tooltipEl.style.display="none"}renderSelectionBar(){var n;const e=this.el.querySelector("#st-selection-bar");if(!e)return;const s=this.selectedId,t=s?Z.find(l=>l.id===s):void 0,i=s?this.ranks.get(s)??0:0;if(!s||!t||i===0){e.style.display="none",e.innerHTML="";return}const r=this.refundBlockReason(s),o=tt(t,i-1);e.style.display="flex",e.innerHTML=r===null?`<span class="st-selection-name">${K(t.name)}</span>
         <button id="st-refund-btn" class="px-btn st-refund-btn">− Refund 1 rank (+${o} pt${o>1?"s":""})</button>
         <span class="st-refund-hint">…or right-click the skill</span>`:`<span class="st-selection-name">${K(t.name)}</span>
         <span class="st-refund-hint st-refund-blocked">Refund blocked: ${K(r)}</span>`,(n=e.querySelector("#st-refund-btn"))==null||n.addEventListener("click",()=>this.refundNode(s,t))}attachNodeListeners(e){this.el.querySelectorAll(".st-node").forEach(s=>{const t=s.getAttribute("data-id"),i=Z.find(r=>r.id===t);s.addEventListener("mouseenter",r=>{this.lastPointer={x:r.clientX,y:r.clientY},this.showTooltipFor(t,e)}),s.addEventListener("mousemove",r=>{this.lastPointer={x:r.clientX,y:r.clientY},this.positionTooltip(this.lastPointer.x,this.lastPointer.y)}),s.addEventListener("mouseleave",()=>this.hideTooltip()),s.addEventListener("click",()=>{this.selectedId=t;const r=this.ranks.get(t)??0;if(r>0){if(We(i)){const n=tt(i,r);if(e>=n){const l=this.effRank(t);l>=i.stackable.softCap?this.confirmSupercharge(t,i,r,l,n):this.buyNode(t,n,r+1);return}gs()}}else{if(ut(t,this.ranks)&&e>=i.cost){this.handleUnlock(t,i.cost);return}gs()}this.el.querySelectorAll(".st-node-selected").forEach(n=>n.classList.remove("st-node-selected")),s.classList.add("st-node-selected"),this.renderSelectionBar()}),s.addEventListener("contextmenu",r=>{r.preventDefault(),this.refundNode(t,i)})})}confirmSupercharge(e,s,t,i,r){const o=s.stackable.baseEffect,n=qe(o,i),l=qe(o,i+1),d=i-t,h=[`${s.name} — rank ${i} → ${i+1}${d>0?` (${t+1} bought +${d} gear)`:""}`,`Costs ${r} pt${r>1?"s":""}. You have ${this.skillPoints}.`,`Total effect ${Kt(o,n)} → ${Kt(o,l)} (+${Kt(o,l-n)}).`,"Each rank past the cap costs 1 pt more and gives less.",...s.keystone&&i===s.stackable.softCap?[`Unlocks keystone: ${s.keystone.name} — ${s.keystone.description}`]:[]].join(`

`);this.showConfirm("Supercharge",h,()=>this.buyNode(e,r,t+1))}buyNode(e,s,t){this.characterId&&(xc(),this.ranks.set(e,t),this.skillPoints-=s,this.flashId=e,this.selectedId=e,this.render(),$.rpc("unlock_skill_node",{p_character_id:this.characterId,p_node_id:e,p_cost:s}).then(({error:i})=>{i&&console.error("Purchase failed, reverting:",i.message),this.reload()}))}handleUnlock(e,s){this.buyNode(e,s,1)}openPicker(e){this.pickingSlot=e,this.el.querySelectorAll(".st-slot").forEach(o=>{o.classList.toggle("picking",Number(o.dataset.slot)===e)});const s=this.el.querySelector("#st-picker"),t=this.currentSlots()[e-1],i=[...this.ownedSpells()].map(o=>{const n=Z.find(d=>d.id===Ta(o));return`<div class="st-picker-item${o===t?" st-picker-item-current":""}" data-spell="${o}">${K((n==null?void 0:n.name)??String(o))}</div>`}),r=t===null?" st-picker-item-current":"";i.push(`<div class="st-picker-item${r}" data-spell="clear">— Clear —</div>`),s.innerHTML=i.join("")}async assignSlot(e,s){if(!this.characterId)return;const t=this.currentSlots(),i=s===null?-1:t.indexOf(s);i!==-1&&(t[i]=t[e-1]),t[e-1]=s,this.slotRows=t.map((o,n)=>({slot:n+1,spell:o})).filter(o=>o.spell!==null),this.pickingSlot=null,this.render();const{error:r}=await $.rpc("set_spell_slots",{p_character_id:this.characterId,p_slots:t});r&&console.error("Slot assignment failed, reverting:",r.message),await this.reload()}refundBlockReason(e){var r;const s=this.ranks.get(e)??0;if(s===0)return"Not owned";if(s>1)return null;const t=ps[st(this.charClass)];if(e===t)return"Class starter skill — cannot be removed";const i=new Map(this.ranks);i.delete(e);for(const o of i.keys())if(!ut(o,i))return`${((r=Z.find(l=>l.id===o))==null?void 0:r.name)??o} depends on it`;return null}refundNode(e,s){if(!this.characterId)return;const t=this.ranks.get(e)??0;if(t===0||this.refundBlockReason(e)!==null)return;ii();const i=tt(s,t-1);t>1?this.ranks.set(e,t-1):this.ranks.delete(e),this.skillPoints+=i,this.flashId=e,this.selectedId=this.ranks.has(e)?e:null,this.render(),$.rpc("refund_skill_node",{p_character_id:this.characterId,p_node_id:e,p_refund:i}).then(({error:r})=>{r&&console.error("Refund failed, reverting:",r.message),this.reload()})}handleRespec(){this.showConfirm("Reset Skills","All unlocked skills will be removed and points refunded. Are you sure?",async()=>{if(!this.characterId)return;ii();const{error:e}=await $.rpc("respec_skills",{p_character_id:this.characterId});if(e){console.error("Respec failed:",e.message);return}await this.reload()})}showConfirm(e,s,t){const i=document.createElement("div");i.className="st-confirm-overlay",i.innerHTML=`
      <div class="st-confirm-panel px-panel">
        <div class="st-confirm-title px-title">${K(e)}</div>
        <div class="st-confirm-text">${K(s)}</div>
        <div class="st-confirm-buttons">
          <button class="st-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="st-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".st-confirm-yes").addEventListener("click",()=>{i.remove(),t()}),i.querySelector(".st-confirm-no").addEventListener("click",()=>i.remove())}}function le(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function oi(a,e){return a!==null&&a>=e}function Aa(a,e,s){return a.purchased?"sold":s!==null&&s<=0?"limit-reached":oi(e,a.price)?"available":"unaffordable"}function xh(a,e){return e>=a}function Ra(a){if(a<=0)return"rotating…";const e=Math.floor(a/6e4);if(e<1)return"<1m";const s=Math.floor(e/60),t=e%60;return s>0?`${s}h ${String(t).padStart(2,"0")}m`:`${t}m`}function bh(a,e){return Math.max(6e4,a-e+1e3)}const vh=6e4;function $a(a,e){return a===402?"Not enough gold.":a===409?"That item just rotated out.":a===429?"Daily purchase limit reached.":e}const yh=`
.sh-overlay{position:fixed;inset:0;background:var(--px-bg);overflow-y:auto;z-index:150;display:none;}
.sh-ui{position:relative;z-index:152;display:flex;flex-direction:column;align-items:center;padding:20px 24px;font-family:'VT323',monospace;color:var(--px-text);min-height:100%;box-sizing:border-box;}
.sh-title{font-size:11px;letter-spacing:0.05em;}
.sh-btn{padding:7px 14px;font-size:6px;letter-spacing:0.05em;}
.sh-columns{display:flex;gap:24px;width:100%;max-width:900px;align-items:flex-start;flex-wrap:wrap;justify-content:center;}
.sh-col-vendor{flex:1 1 480px;min-width:320px;max-width:560px;}
.sh-col-lootbox{flex:0 0 280px;min-width:260px;display:flex;flex-direction:column;gap:14px;}
.sh-col-label{font-family:'VT323',monospace;font-size:16px;letter-spacing:0.1em;text-transform:uppercase;color:var(--px-border-light);text-align:center;margin-bottom:8px;display:flex;flex-direction:column;gap:2px;}
.sh-allowance{font-size:12px;letter-spacing:0.05em;text-transform:none;font-style:italic;opacity:0.75;}
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
.sh-vslot-timer{font-size:11px;color:var(--px-border-light);opacity:0.7;letter-spacing:0.04em;}
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
`;class wh{constructor(e,s,t){c(this,"el");c(this,"closeResolver",null);c(this,"navTeardown",null);c(this,"vendor",null);c(this,"gold",null);c(this,"loading",!1);c(this,"selectedSlotIndex",null);c(this,"pending",new Set);c(this,"noticeBySlot",new Map);c(this,"lootboxNotice",new Map);c(this,"reveal",null);c(this,"staleNotice",null);c(this,"rotationTimer",null);c(this,"countdownTimer",null);c(this,"generation",0);this.navCtx=s,this.navHandlers=t,Ve(),Gt();const i=document.createElement("style");i.textContent=yh,document.head.appendChild(i),this.el=document.createElement("div"),this.el.className="sh-overlay",e.appendChild(this.el)}async show(){return this.selectedSlotIndex=null,this.pending.clear(),this.noticeBySlot.clear(),this.lootboxNotice.clear(),this.reveal=null,this.staleNotice=null,this.el.style.display="block",this.gold=null,this.loading=this.vendor===null,this.render(),await this.reload(),await new Promise(e=>{this.closeResolver=e})}hide(e="arena"){var t;this.el.style.display="none",(t=this.navTeardown)==null||t.call(this),this.navTeardown=null,this.generation++,this.clearTimers();const s=this.closeResolver;this.closeResolver=null,s==null||s(e)}reset(){this.vendor=null,this.gold=null,this.selectedSlotIndex=null,this.generation++,this.clearTimers()}async reload(){const e=this.generation,[s,t]=await Promise.all([qd(),Si()]);e===this.generation&&(this.vendor=s,this.gold=t,this.loading=!1,this.render(),this.armTimers())}clearTimers(){this.rotationTimer!==null&&(clearTimeout(this.rotationTimer),this.rotationTimer=null),this.countdownTimer!==null&&(clearInterval(this.countdownTimer),this.countdownTimer=null)}armTimers(){this.clearTimers();const e=this.generation;if(!this.vendor||this.vendor.slots.length===0){this.rotationTimer=window.setTimeout(()=>{e===this.generation&&this.reload()},vh);return}const s=Math.min(...this.vendor.slots.map(i=>i.expiresAt)),t=bh(s,Date.now());this.rotationTimer=window.setTimeout(()=>{e===this.generation&&this.reload()},t),this.countdownTimer=window.setInterval(()=>{if(e!==this.generation){this.clearTimers();return}this.tickCountdowns()},6e4)}tickCountdowns(){if(!this.vendor)return;const e=Date.now();for(const s of this.vendor.slots){const t=this.el.querySelector(`[data-slot="${s.slotIndex}"] .sh-vslot-timer`);t&&(t.textContent=Ra(s.expiresAt-e))}}render(){var t;const e=this.vendor?this.vendor.slots.map(i=>this.renderVendorCard(i)).join(""):'<div class="sh-empty">Unable to load the vendor right now.</div>',s=["basic","premium"].map(i=>this.renderLootboxCard(i)).join("");this.el.innerHTML=`
      <div class="sh-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${ke("sh")}</div>
      <div class="sh-ui">
        ${je({active:"shop",...this.navCtx(),gold:this.gold})}
        <div class="bm-subhead">
          <div class="sh-title px-title">Shop</div>
        </div>
        ${this.loading?'<div class="bm-loading">Loading shop…</div>':`
        <div class="sh-columns">
          <div class="sh-col-vendor">
            <div class="sh-col-label">Vendor<span class="sh-allowance">${(((t=this.vendor)==null?void 0:t.purchasesRemaining)??null)!==null?`${this.vendor.purchasesRemaining} / ${sl} purchases left today`:"stock rotates hourly"}</span></div>
            ${this.staleNotice?`<div class="sh-stale-notice">${le(this.staleNotice)}</div>`:""}
            <div id="sh-details" class="sh-details px-panel"></div>
            <div class="sh-vendor-grid">${e}</div>
          </div>
          <div class="sh-col-lootbox">
            <div class="sh-col-label">Loot Boxes</div>
            ${s}
          </div>
        </div>`}
      </div>
    `,this.attachListeners(),Ot(this.el),this.renderDetails(this.selectedSlotIndex)}renderVendorCard(e){var h;const s=$e[e.rarity],t=Aa(e,this.gold,((h=this.vendor)==null?void 0:h.purchasesRemaining)??null),i=`vendor:${e.slotIndex}`,r=this.pending.has(i),o=t!=="available"||r,n=t==="sold"?"Sold":r?"Buying…":t==="limit-reached"?"Daily Limit":t==="unaffordable"?"Can't Afford":"Buy",l=this.noticeBySlot.get(e.slotIndex);return`
      <div class="${`sh-vslot${t==="sold"?" sh-sold":""}${e.crossClass?" sh-crossclass-dim":""}`}" data-slot="${e.slotIndex}" style="box-shadow:inset 0 0 0 2px ${s}">
        ${t==="sold"?'<div class="sh-sold-badge">SOLD</div>':""}
        <div class="sh-vslot-icon"${Ne(e.base)} style="color:${s}"><i class="fa ${e.base.icon}"></i></div>
        <div class="sh-vslot-name" style="color:${s}">${le(e.base.name)}</div>
        <div class="sh-vslot-price"><i class="fa fa-coins"></i> ${e.price}</div>
        <div class="sh-vslot-timer">${le(Ra(e.expiresAt-Date.now()))}</div>
        ${e.crossClass?'<div class="sh-crossclass">⚠ No current class can use this</div>':""}
        ${l?`<div class="sh-notice">${le(l)}</div>`:""}
        <button class="sh-buy-btn px-btn px-btn-primary${o?" sh-buy-btn-blocked":""}" data-buy-slot="${e.slotIndex}" aria-disabled="${o}">${le(n)}</button>
      </div>`}renderLootboxCard(e){const s=Ps[e],t=`lootbox:${e}`,i=this.pending.has(t),r=oi(this.gold,s),o=i||!r,n=i?"Opening…":r?"Open":"Can't Afford",l=this.lootboxNotice.get(e),d=this.reveal&&this.reveal.tier===e?this.renderReveal(this.reveal.item):"";return`
      <div class="sh-lootbox px-panel">
        <div class="sh-lootbox-icon"><i class="fa fa-box"></i></div>
        <div class="sh-lootbox-name">${e==="basic"?"Basic":"Premium"} Loot Box</div>
        <div class="sh-lootbox-price"><i class="fa fa-coins"></i> ${s}</div>
        ${l?`<div class="sh-notice">${le(l)}</div>`:""}
        <button class="sh-open-btn px-btn px-btn-primary${o?" sh-buy-btn-blocked":""}" data-open-lootbox="${e}" aria-disabled="${o}">${le(n)}</button>
        ${d}
      </div>`}renderReveal(e){const s=It(e);if(!s)return"";const t=$e[e.rarity],i=Lt(e,s),r=e.rarity==="unique"?Re(e):void 0;return`
      <div class="sh-reveal" style="box-shadow:inset 0 0 0 2px ${t}">
        <div class="sh-reveal-icon"${Ne(s,r)} style="color:${t}"><i class="fa ${s.icon}"></i></div>
        <div class="sh-reveal-name" style="color:${t}">${le(i)}</div>
        <div class="sh-reveal-note">Sent to stash</div>
      </div>`}renderDetails(e){var l;this.selectedSlotIndex=e;const s=this.el.querySelector("#sh-details");if(!s)return;const t=e!==null?(l=this.vendor)==null?void 0:l.slots.find(d=>d.slotIndex===e):void 0;if(!t){s.innerHTML='<div class="sh-details-empty">Hover a vendor slot to inspect it.</div>';return}const i=$e[t.rarity],r=`<div class="sh-details-row">${le(nt(t.base.implicit))} <span class="sh-dim">(implicit)</span></div>`,o=t.affixes.map(d=>`<div class="sh-details-row">${le(nt(d))}</div>`).join(""),n=t.base.classRestriction?`<div class="sh-details-row${t.crossClass?" sh-bad":""}">Class: ${le(t.base.classRestriction)}${t.crossClass?" — no current class can use this":""}</div>`:"";s.innerHTML=`
      <div class="sh-details-head">
        <div class="sh-details-icon"${Ne(t.base)} style="color:${i}"><i class="fa ${t.base.icon}"></i></div>
        <div>
          <div class="sh-details-name" style="color:${i}">${le(t.base.name)}</div>
          <div class="sh-details-kind">${le(t.rarity)} · Lvl ${t.base.itemLevel}+</div>
        </div>
      </div>
      ${r}
      ${o}
      ${n}
    `,Ot(s)}attachListeners(){var e;(e=this.navTeardown)==null||e.call(this),this.navTeardown=Ge(this.el,{onNavigate:s=>this.hide(s),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.el.querySelectorAll("[data-slot]").forEach(s=>{const t=Number(s.dataset.slot);s.addEventListener("mouseenter",()=>this.renderDetails(t))}),this.el.querySelectorAll("[data-buy-slot]").forEach(s=>{const t=s,i=Number(t.dataset.buySlot);t.addEventListener("click",()=>{var l,d;const r=`vendor:${i}`;if(this.pending.has(r))return;const o=(l=this.vendor)==null?void 0:l.slots.find(h=>h.slotIndex===i);if((o?Aa(o,this.gold,((d=this.vendor)==null?void 0:d.purchasesRemaining)??null):"unaffordable")!=="available"){gs();return}this.handleBuySlot(i)})}),this.el.querySelectorAll("[data-open-lootbox]").forEach(s=>{const t=s,i=t.dataset.openLootbox;t.addEventListener("click",()=>{const r=`lootbox:${i}`;if(this.pending.has(r)||!oi(this.gold,Ps[i])){gs();return}this.handleOpenLootbox(i)})})}async handleBuySlot(e){var r;const s=`vendor:${e}`;if(this.pending.has(s))return;const t=(r=this.vendor)==null?void 0:r.slots.find(o=>o.slotIndex===e);if(!t||xh(t.expiresAt,Date.now())){this.staleNotice="New stock has arrived — refreshed.",await this.reload();return}this.staleNotice=null,this.pending.add(s),this.noticeBySlot.delete(e),this.gold!==null&&(t.purchased=!0,this.gold-=t.price),this.vendor&&(this.vendor.purchasesRemaining??null)!==null&&(this.vendor.purchasesRemaining=Math.max(0,this.vendor.purchasesRemaining-1)),this.render(),ha();const i=await Od(e,t.instanceKey);this.pending.delete(s),i.ok||this.noticeBySlot.set(e,$a(i.status,i.error)),await this.reload()}async handleOpenLootbox(e){const s=`lootbox:${e}`;if(this.pending.has(s))return;this.pending.add(s),this.lootboxNotice.delete(e),this.reveal=null,this.gold!==null&&(this.gold-=Ps[e]),this.render(),ha();const t=await Fd(e);this.pending.delete(s),t.ok?(this.reveal={tier:e,item:t.item},Mr(t.item.rarity)):this.lootboxNotice.set(e,$a(t.status,t.error)),await this.reload()}}function R(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const xt={basic:"#e2e2e6",magic:"#4a6fc4",rare:"#ddb84a",unique:"#ffb347"},Jt={weapon:"Weapon",helmet:"Helmet",armor:"Armor",leggings:"Leggings",ring:"Ring",amulet:"Amulet"};function bt(a){return a.id==="talent"&&a.node?`${nt(a)} (${a.node})`:nt(a)}function kh(a){var s;const e=dr(a)??fs(a.id,a.min);if(a.id==="talent"){const t=((s=Z.find(i=>i.id===a.node))==null?void 0:s.name)??a.node??"Talent";return`${e} ${t}`}return`${e} ${$n(a.id)}`}function Ia(a){var e;return a.unique_id?((e=oe.find(s=>s.id===a.unique_id))==null?void 0:e.name)??a.unique_id:null}const es={match_drop:{basic:70,magic:24,rare:5.5,unique:.5},lootbox_basic:{basic:60,magic:32,rare:7.5,unique:.5},lootbox_premium:{basic:25,magic:50,rare:21,unique:4}},_h=[{key:"match_drop",label:"Match Drop"},{key:"lootbox_basic",label:"Lootbox — Basic"},{key:"lootbox_premium",label:"Lootbox — Premium"}];function La(a){const e=a.basic+a.magic+a.rare+a.unique;if(e<=0)return{basic:0,magic:0,rare:0,unique:0};const s=t=>Math.round(t/e*1e3)/10;return{basic:s(a.basic),magic:s(a.magic),rare:s(a.rare),unique:s(a.unique)}}function Sh(a){const{basic:e,magic:s,rare:t,unique:i}=a;return e<0||s<0||t<0||i<0?"Weights must be non-negative.":e+s+t+i<=0?"At least one weight must be positive.":null}const Qe=200,Pa={items:"Items",manifests:"Manifests",grant:"Grant",droprates:"Drop Rates"},Ch=`
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
`;class Mh{constructor(e,s,t){c(this,"el");c(this,"closeResolver",null);c(this,"navTeardown",null);c(this,"tab","items");c(this,"items",[]);c(this,"usernames",new Map);c(this,"charNames",new Map);c(this,"filterRarity","");c(this,"filterSlot","");c(this,"filterSource","");c(this,"search","");c(this,"grantTargetQuery","");c(this,"grantTargetUserId",null);c(this,"grantTargetUsername",null);c(this,"grantTargetError",null);c(this,"grantRarity","basic");c(this,"grantBaseId",null);c(this,"grantUniqueId",null);c(this,"grantPreviewAffixes",[]);c(this,"grantStatus",null);c(this,"dropWeights",new Map);c(this,"dropStatus",new Map);c(this,"dropErrors",new Map);this.navCtx=s,this.navHandlers=t,Ve(),Gt();const i=document.createElement("style");i.textContent=Ch,document.head.appendChild(i),this.el=document.createElement("div"),this.el.className="ad-overlay",e.appendChild(this.el)}async show(){return this.tab="items",this.el.style.display="block",this.renderLoading(),await this.reloadAll(),await new Promise(e=>{this.closeResolver=e})}hide(e="arena"){var t;this.el.style.display="none",(t=this.navTeardown)==null||t.call(this),this.navTeardown=null;const s=this.closeResolver;this.closeResolver=null,s==null||s(e)}renderLoading(){var e;this.el.innerHTML=`
      <div class="ad-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${ke("ad")}</div>
      <div class="ad-ui">
        ${je({active:"admin",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="ad-title px-title">Admin</div>
        </div>
        <div class="bm-loading">Loading admin…</div>
      </div>
    `,(e=this.navTeardown)==null||e.call(this),this.navTeardown=Ge(this.el,{onNavigate:s=>this.hide(s),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()})}async reloadAll(){await Promise.all([this.reloadItems(),this.reloadDropTables()]),this.render()}async reloadItems(){this.items=await Ed();const e=this.items.map(r=>r.user_id),s=this.items.map(r=>r.equipped_by).filter(r=>r!==null),[t,i]=await Promise.all([Id(e),Pd(s)]);this.usernames=t,this.charNames=i}async reloadDropTables(){const e=await $d();for(const s of e)this.dropWeights.set(s.context,{...s.weights});for(const s of Object.keys(es))this.dropWeights.has(s)||this.dropWeights.set(s,{...es[s]})}render(){var t;const e=Object.keys(Pa).map(i=>`<button class="ad-tab px-btn${i===this.tab?" ad-tab-active":""}" data-tab="${i}">${Pa[i]}</button>`).join("");let s;this.tab==="items"?s=this.renderItemsTab():this.tab==="manifests"?s=this.renderManifestsTab():this.tab==="grant"?s=this.renderGrantTab():s=this.renderDropRatesTab(),this.el.innerHTML=`
      <div class="ad-backdrop" style="position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:0">${ke("ad")}</div>
      <div class="ad-ui">
        ${je({active:"admin",...this.navCtx()})}
        <div class="bm-subhead">
          <div class="ad-title px-title">Admin</div>
          <div class="ad-tabs">${e}</div>
        </div>
        <div class="ad-body">${s}</div>
      </div>
    `,(t=this.navTeardown)==null||t.call(this),this.navTeardown=Ge(this.el,{onNavigate:i=>this.hide(i),onCredits:()=>this.navHandlers.onCredits(),onLogout:()=>this.navHandlers.onLogout(),onSettings:()=>this.navHandlers.onSettings()}),this.el.querySelectorAll("[data-tab]").forEach(i=>{i.addEventListener("click",()=>{this.tab=i.dataset.tab,this.render()})}),this.tab==="items"?this.attachItemsListeners():this.tab==="grant"?this.attachGrantListeners():this.tab==="droprates"&&this.attachDropRatesListeners()}filteredItems(){const e=this.search.trim().toLowerCase();return this.items.filter(s=>{if(this.filterRarity&&s.rarity!==this.filterRarity||this.filterSlot&&s.slot!==this.filterSlot||this.filterSource&&s.source!==this.filterSource)return!1;if(e){const t=G.find(n=>n.id===s.base_id),i=((t==null?void 0:t.name)??s.base_id).toLowerCase(),r=(Ia(s)??"").toLowerCase(),o=(this.usernames.get(s.user_id)??s.user_id).toLowerCase();if(!i.includes(e)&&!r.includes(e)&&!o.includes(e))return!1}return!0})}renderItemsTab(){const e=this.filteredItems(),s=e.slice(0,Qe),t=e.length>Qe?`Showing ${Qe} of ${e.length}`:"",i=s.length?s.map(l=>this.renderItemRow(l)).join(""):'<tr><td colspan="8" class="ad-empty">No items match.</td></tr>',r=["basic","magic","rare","unique"].map(l=>`<option value="${l}" ${this.filterRarity===l?"selected":""}>${l}</option>`).join(""),o=Object.keys(Jt).map(l=>`<option value="${l}" ${this.filterSlot===l?"selected":""}>${Jt[l]}</option>`).join(""),n=["starter","drop","vendor","lootbox","admin"].map(l=>`<option value="${l}" ${this.filterSource===l?"selected":""}>${l}</option>`).join("");return`
      <div class="ad-filters">
        <input id="ad-search" class="px-input ad-search" type="text" placeholder="Search owner or item name..." value="${R(this.search)}">
        <select id="ad-filter-rarity" class="px-input"><option value="">All Rarities</option>${r}</select>
        <select id="ad-filter-slot" class="px-input"><option value="">All Slots</option>${o}</select>
        <select id="ad-filter-source" class="px-input"><option value="">All Sources</option>${n}</select>
      </div>
      <div id="ad-cap-note" class="ad-cap-note">${t}</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>Owner</th><th>Item</th><th>Unique</th><th>Rarity</th><th>Slot</th><th>Source</th><th>Equipped By</th><th></th></tr></thead>
          <tbody id="ad-table-body">${i}</tbody>
        </table>
      </div>
    `}renderItemRow(e){const s=G.find(l=>l.id===e.base_id),t=(s==null?void 0:s.name)??e.base_id,i=Ia(e),r=xt[e.rarity]??"#e2e2e6",o=this.usernames.get(e.user_id)??e.user_id,n=e.equipped_by?this.charNames.get(e.equipped_by)??e.equipped_by:"—";return`<tr>
      <td>${R(o)}</td>
      <td style="color:${r}">${R(t)}</td>
      <td style="color:${r}">${i?R(i):"—"}</td>
      <td style="color:${r}">${R(e.rarity)}</td>
      <td>${R(e.slot)}</td>
      <td>${R(e.source)}</td>
      <td>${R(n)}</td>
      <td><button class="ad-del-btn px-btn" data-del="${R(e.id)}">Delete</button></td>
    </tr>`}attachItemsListeners(){var s,t,i;const e=this.el.querySelector("#ad-search");e==null||e.addEventListener("input",()=>{this.search=e.value,this.refreshItemsTable()}),(s=this.el.querySelector("#ad-filter-rarity"))==null||s.addEventListener("change",r=>{this.filterRarity=r.target.value,this.refreshItemsTable()}),(t=this.el.querySelector("#ad-filter-slot"))==null||t.addEventListener("change",r=>{this.filterSlot=r.target.value,this.refreshItemsTable()}),(i=this.el.querySelector("#ad-filter-source"))==null||i.addEventListener("change",r=>{this.filterSource=r.target.value,this.refreshItemsTable()}),this.attachDeleteButtons()}refreshItemsTable(){const e=this.filteredItems(),s=e.slice(0,Qe),t=this.el.querySelector("#ad-table-body"),i=this.el.querySelector("#ad-cap-note");t&&(t.innerHTML=s.length?s.map(r=>this.renderItemRow(r)).join(""):'<tr><td colspan="8" class="ad-empty">No items match.</td></tr>'),i&&(i.textContent=e.length>Qe?`Showing ${Qe} of ${e.length}`:""),this.attachDeleteButtons()}attachDeleteButtons(){this.el.querySelectorAll("[data-del]").forEach(e=>{const s=e.dataset.del;e.addEventListener("click",()=>this.confirmDelete(s))})}confirmDelete(e){const s=this.items.find(n=>n.id===e);if(!s)return;const t=G.find(n=>n.id===s.base_id),i=(t==null?void 0:t.name)??s.base_id,r=this.usernames.get(s.user_id)??s.user_id;let o=`Delete ${i} (${s.rarity}) owned by ${r}?`;if(s.equipped_by){const n=this.charNames.get(s.equipped_by)??s.equipped_by;o+=`

Warning: this item is currently equipped by ${n}. Deleting it will simply vanish next time that character's loadout loads.`}this.showConfirm("Delete Item",o,async()=>{await Rd(e)||console.error("admin_delete_item failed"),await this.reloadItems(),this.render()})}renderManifestsTab(){const e=G.map(t=>`
      <tr>
        <td>${R(t.id)}</td>
        <td>${R(Jt[t.slot])}</td>
        <td>${R(t.name)}</td>
        <td>${t.itemLevel}</td>
        <td>${t.classRestriction?R(t.classRestriction):"—"}</td>
        <td>${R(bt(t.implicit))}</td>
      </tr>`).join(""),s=oe.map(t=>{const i=G.find(r=>r.id===t.baseId);return`
      <tr>
        <td>${R(t.id)}</td>
        <td style="color:${xt.unique}">${R(t.name)}</td>
        <td>${R((i==null?void 0:i.name)??t.baseId)}</td>
        <td>${t.levelReq}</td>
        <td>${t.affixes.map(r=>R(kh(r))).join("<br>")}</td>
        <td class="ad-flavor">${R(t.flavor)}</td>
        <td>${t.aura?R(t.aura.style):"—"}</td>
        <td>${t.lpcTint?R(t.lpcTint.color):"—"}</td>
      </tr>`}).join("");return`
      <div class="ad-manifest-label">Item Bases (${G.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Slot</th><th>Name</th><th>ILvl</th><th>Class</th><th>Implicit</th></tr></thead>
          <tbody>${e}</tbody>
        </table>
      </div>
      <div class="ad-manifest-label">Unique Items (${oe.length})</div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>ID</th><th>Name</th><th>Base</th><th>Lvl Req</th><th>Affixes</th><th>Flavor</th><th>Aura</th><th>Tint</th></tr></thead>
          <tbody>${s}</tbody>
        </table>
      </div>
    `}renderGrantTab(){const e=this.grantTargetUserId?`<span class="ad-ok">Found: ${R(this.grantTargetUsername??"")}</span>`:this.grantTargetError?`<span class="ad-bad">${R(this.grantTargetError)}</span>`:"",s=["basic","magic","rare","unique"].map(n=>`<button class="ad-rarity-btn px-btn${n===this.grantRarity?" ad-rarity-active":""}" data-rarity="${n}" style="color:${xt[n]}">${n}</button>`).join("");let t,i;if(this.grantRarity==="unique"){t=`
        <div class="ad-label px-label">Unique Item</div>
        <select id="ad-unique-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${oe.map(d=>{const h=G.find(p=>p.id===d.baseId);return`<option value="${R(d.id)}" ${d.id===this.grantUniqueId?"selected":""}>${R(d.name)} (${R((h==null?void 0:h.name)??d.baseId)})</option>`}).join("")}
        </select>`;const l=oe.find(d=>d.id===this.grantUniqueId);if(l){const d=G.find(h=>h.id===l.baseId);i=d?`
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${xt.unique}">${R(l.name)}</div>
            <div class="ad-preview-flavor">${R(l.flavor)}</div>
            <div class="ad-preview-row">${R(bt(d.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${this.grantPreviewAffixes.map(h=>`<div class="ad-preview-row">${R(bt(h))}</div>`).join("")}
            <div class="ad-preview-row">Level Req: ${l.levelReq}</div>
            <button id="ad-reroll" class="px-btn ad-reroll-btn">🎲 Reroll</button>
          </div>`:'<div class="ad-preview-empty">Unknown base for this unique.</div>'}else i='<div class="ad-preview-empty">Select a unique item.</div>'}else{t=`
        <div class="ad-label px-label">Base Item</div>
        <select id="ad-base-select" class="px-input ad-full">
          <option value="">— Select —</option>
          ${["weapon","helmet","armor","leggings","ring","amulet"].map(h=>{const p=G.filter(m=>m.slot===h);if(!p.length)return"";const f=p.map(m=>`<option value="${R(m.id)}" ${m.id===this.grantBaseId?"selected":""}>${R(m.name)} (ilvl ${m.itemLevel}${m.classRestriction?`, ${R(m.classRestriction)}`:""})</option>`).join("");return`<optgroup label="${R(Jt[h])}">${f}</optgroup>`}).join("")}
        </select>`;const d=G.find(h=>h.id===this.grantBaseId);if(d){const h=this.grantPreviewAffixes.map(f=>`<div class="ad-preview-row">${R(bt(f))}</div>`).join(""),p=this.grantRarity!=="basic"?'<button id="ad-reroll" class="px-btn ad-reroll-btn">🎲 Reroll</button>':"";i=`
          <div class="ad-preview">
            <div class="ad-preview-name" style="color:${xt[this.grantRarity]}">${R(d.name)}</div>
            <div class="ad-preview-row">${R(bt(d.implicit))} <span class="ad-dim">(implicit)</span></div>
            ${h||`<div class="ad-dim">No rolled affixes${this.grantRarity==="basic"?" (basic)":""}</div>`}
            <div class="ad-preview-row">Level Req: ${d.itemLevel}</div>
            ${p}
          </div>`}else i='<div class="ad-preview-empty">Select a base item.</div>'}const r=this.grantTargetUserId!==null&&(this.grantRarity==="unique"?this.grantUniqueId!==null:this.grantBaseId!==null),o=this.grantStatus?`<div class="ad-grant-status ${this.grantStatus.ok?"ad-ok":"ad-bad"}">${R(this.grantStatus.text)}</div>`:"";return`
      <div class="ad-grant-columns">
        <div class="ad-grant-col">
          <div class="ad-label px-label">Target Account</div>
          <div class="ad-target-row">
            <input id="ad-target-input" class="px-input ad-full" type="text" placeholder="Username" value="${R(this.grantTargetQuery)}">
            <button id="ad-target-find" class="px-btn">Find</button>
          </div>
          <div class="ad-target-status">${e}</div>

          <div class="ad-label px-label" style="margin-top:16px">Rarity</div>
          <div class="ad-rarity-row">${s}</div>

          ${t}
        </div>
        <div class="ad-grant-col">
          <div class="ad-label px-label">Preview</div>
          ${i}
          <button id="ad-grant-btn" class="px-btn px-btn-primary ad-full" ${r?"":"disabled"} style="margin-top:16px">Grant Item</button>
          ${o}
        </div>
      </div>
    `}attachGrantListeners(){var t,i,r,o;const e=this.el.querySelector("#ad-target-input");e==null||e.addEventListener("input",()=>{this.grantTargetQuery=e.value}),e==null||e.addEventListener("keydown",n=>{n.key==="Enter"&&this.handleFindTarget()}),(t=this.el.querySelector("#ad-target-find"))==null||t.addEventListener("click",()=>void this.handleFindTarget()),this.el.querySelectorAll("[data-rarity]").forEach(n=>{n.addEventListener("click",()=>{this.grantRarity=n.dataset.rarity,this.regeneratePreview(),this.render()})}),(i=this.el.querySelector("#ad-unique-select"))==null||i.addEventListener("change",n=>{this.grantUniqueId=n.target.value||null,this.regeneratePreview(),this.render()}),(r=this.el.querySelector("#ad-base-select"))==null||r.addEventListener("change",n=>{this.grantBaseId=n.target.value||null,this.regeneratePreview(),this.render()}),(o=this.el.querySelector("#ad-reroll"))==null||o.addEventListener("click",()=>{this.regeneratePreview(),this.render()});const s=this.el.querySelector("#ad-grant-btn");s==null||s.addEventListener("click",()=>{s.disabled||(s.disabled=!0,this.handleGrant())})}async handleFindTarget(){const e=this.grantTargetQuery.trim();if(!e)return;const s=await Ld(e);s?(this.grantTargetUserId=s,this.grantTargetUsername=e,this.grantTargetError=null):(this.grantTargetUserId=null,this.grantTargetUsername=null,this.grantTargetError="No account found with that username."),this.grantStatus=null,this.render()}regeneratePreview(){if(this.grantRarity==="unique"){const s=oe.find(t=>t.id===this.grantUniqueId);this.grantPreviewAffixes=s?Nn(s,Math.random):[];return}const e=G.find(s=>s.id===this.grantBaseId);this.grantPreviewAffixes=e?Fn(e,this.grantRarity,Math.random):[]}async handleGrant(){if(!this.grantTargetUserId)return;let e,s,t,i,r,o,n=null,l;if(this.grantRarity==="unique"){const h=oe.find(f=>f.id===this.grantUniqueId);if(!h)return;const p=G.find(f=>f.id===h.baseId);if(!p)return;e=h.baseId,s="unique",t=this.grantPreviewAffixes,i=h.levelReq,r=p.slot,o=p.classRestriction,n=h.id,l=h.name}else{const h=G.find(p=>p.id===this.grantBaseId);if(!h)return;e=h.id,s=this.grantRarity,t=this.grantPreviewAffixes,i=h.itemLevel,r=h.slot,o=h.classRestriction,l=h.name}const d=await Ad(this.grantTargetUserId,e,s,t,i,r,o,n);this.grantStatus=d?{ok:!0,text:`Granted ${l} to ${this.grantTargetUsername??this.grantTargetUserId}.`}:{ok:!1,text:"Grant failed — see console."},d&&this.reloadItems(),this.render()}renderDropRatesTab(){return _h.map(e=>this.renderDropContext(e.key,e.label)).join("")}renderDropContext(e,s){const t=this.dropWeights.get(e)??es[e],i=La(t),r=this.dropStatus.get(e),o=this.dropErrors.get(e),n=["basic","magic","rare","unique"].map(l=>`
      <div class="ad-drop-field">
        <label class="ad-label px-label">${l}</label>
        <input class="px-input ad-drop-input" type="number" min="0" step="0.1" data-context="${e}" data-rarity="${l}" value="${t[l]}">
        <div class="ad-drop-pct">${i[l].toFixed(1)}%</div>
      </div>`).join("");return`
      <div class="ad-drop-card px-panel">
        <div class="ad-drop-title">${R(s)} <span class="ad-drop-key">(${R(e)})</span></div>
        <div class="ad-drop-grid">${n}</div>
        ${o?`<div class="ad-drop-error ad-bad">${R(o)}</div>`:""}
        <div class="ad-drop-buttons">
          <button class="px-btn px-btn-primary" data-save="${e}">Save</button>
          <button class="px-btn" data-reset="${e}">Reset to Seed</button>
          ${r?`<span class="ad-drop-status">${R(r)}</span>`:""}
        </div>
      </div>
    `}attachDropRatesListeners(){this.el.querySelectorAll(".ad-drop-input").forEach(e=>{e.addEventListener("input",()=>{const s=e,t=s.dataset.context,i=s.dataset.rarity,r=this.dropWeights.get(t)??{basic:0,magic:0,rare:0,unique:0};r[i]=parseFloat(s.value)||0,this.dropWeights.set(t,r);const o=La(r),n=s.closest(".ad-drop-card");n==null||n.querySelectorAll(".ad-drop-field").forEach(l=>{const h=l.querySelector("input").dataset.rarity,p=l.querySelector(".ad-drop-pct");p&&(p.textContent=`${o[h].toFixed(1)}%`)})})}),this.el.querySelectorAll("[data-save]").forEach(e=>{const s=e;s.addEventListener("click",()=>{s.disabled||(s.disabled=!0,this.handleDropSave(s.dataset.save))})}),this.el.querySelectorAll("[data-reset]").forEach(e=>{const s=e;s.addEventListener("click",()=>{s.disabled||(s.disabled=!0,this.handleDropReset(s.dataset.reset))})})}async handleDropSave(e){const s=this.dropWeights.get(e);if(!s)return;const t=Sh(s);if(t){this.dropErrors.set(e,t),this.dropStatus.delete(e),this.render();return}this.dropErrors.delete(e);const i=await ya(e,s);this.dropStatus.set(e,i?"Saved.":"Save failed — see console."),this.render()}async handleDropReset(e){const s=es[e];if(!s)return;this.dropWeights.set(e,{...s}),this.dropErrors.delete(e);const t=await ya(e,s);this.dropStatus.set(e,t?"Reset to seed.":"Reset failed — see console."),this.render()}showConfirm(e,s,t){const i=document.createElement("div");i.className="ad-confirm-overlay",i.innerHTML=`
      <div class="ad-confirm-panel px-panel">
        <div class="ad-confirm-title px-title">${R(e)}</div>
        <div class="ad-confirm-text">${R(s)}</div>
        <div class="ad-confirm-buttons">
          <button class="ad-confirm-yes px-btn px-btn-primary">Confirm</button>
          <button class="ad-confirm-no px-btn">Cancel</button>
        </div>
      </div>
    `,this.el.appendChild(i),i.querySelector(".ad-confirm-yes").addEventListener("click",()=>{i.remove(),t()}),i.querySelector(".ad-confirm-no").addEventListener("click",()=>i.remove())}}const Vs=[{key:"body",label:"Body",options:Y.body},{key:"skin",label:"Skin",options:Y.skin},{key:"hairStyle",label:"Hair Style",options:Y.hairStyle},{key:"hairColor",label:"Hair Color",options:Y.hairColor},{key:"torsoColor",label:"Shirt Color",options:Y.torsoColor},{key:"legsColor",label:"Pants Color",options:Y.legsColor}],Th=2;function Eh(a,e,s){return(e+s+a)%a}function Ah(a){return a===null?"None":a.split("_").map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" ")}function Ws(a,e,s){return a==="skin"?`Tone ${s.indexOf(e)+1}`:Ah(e)}const Rh=`
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
`;let za=!1;function $h(){if(za)return;za=!0;const a=document.createElement("style");a.textContent=Rh,document.head.appendChild(a)}class Ys{constructor(e,s,t){c(this,"onChange");c(this,"appearance");c(this,"el");c(this,"canvas");c(this,"preview");c(this,"valueEls",new Map);this.charClass=s,$h(),this.appearance=t?{...t}:{...jt[s]},this.el=document.createElement("div"),this.el.className="ap-picker",e.appendChild(this.el);const i=document.createElement("div");i.className="ap-left",this.el.appendChild(i);for(const n of Vs){const l=document.createElement("div");l.className="ap-row",l.innerHTML=`
        <div class="ap-row-label px-label">${n.label}</div>
        <div class="ap-row-control">
          <button type="button" class="ap-btn px-btn ap-prev">◀</button>
          <span class="ap-value">${Ws(n.key,this.appearance[n.key],n.options)}</span>
          <button type="button" class="ap-btn px-btn ap-next">▶</button>
        </div>`;const d=l.querySelector(".ap-prev"),h=l.querySelector(".ap-next"),p=l.querySelector(".ap-value");this.valueEls.set(n.key,p),d.addEventListener("click",()=>this.cycle(n.key,-1)),h.addEventListener("click",()=>this.cycle(n.key,1)),i.appendChild(l)}const r=document.createElement("button");r.type="button",r.className="ap-randomize px-btn",r.textContent="⚄ Randomize",r.addEventListener("click",()=>this.randomize()),i.appendChild(r);const o=document.createElement("div");o.className="ap-right",this.canvas=document.createElement("canvas"),this.canvas.className="ap-canvas",o.appendChild(this.canvas),this.el.appendChild(o),this.preview=new wi(this.canvas,Th),this.preview.setAppearance(this.appearance)}getAppearance(){return{...this.appearance}}dispose(){this.preview.dispose(),this.el.remove()}cycle(e,s){var n;const t=Vs.find(l=>l.key===e),i=t.options.indexOf(this.appearance[e]),r=Eh(t.options.length,i===-1?0:i,s),o=t.options[r];this.appearance={...this.appearance,[e]:o},this.valueEls.get(e).textContent=Ws(e,o,t.options),this.preview.setAppearance(this.appearance),(n=this.onChange)==null||n.call(this,this.getAppearance())}randomize(){var e;this.appearance=En(this.charClass);for(const s of Vs)this.valueEls.get(s.key).textContent=Ws(s.key,this.appearance[s.key],s.options);this.preview.setAppearance(this.appearance),(e=this.onChange)==null||e.call(this,this.getAppearance())}}function Je(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const qa={mage:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M335.656 19.53c-24.51.093-48.993 5.235-71.062 15.626-22.46 10.577-43.112 34.202-58.375 62.563-15.264 28.36-25.182 61.262-27.69 88.75-7.487 82.112-51.926 155.352-159.78 252.56l-.188 21.44C89.216 403.443 139.915 346.632 176.313 290l.063.03c-9.293 32.473-22.623 63.18-43.594 87.97-31.47 35.584-69.222 71.1-114.468 106.53l-.062 8.25 25 .064h.47l1.28-1.156c24.405-16.498 48.607-31.488 72.594-41.5l.187.187-46.436 42.5 28.937.063c48.372-41.685 94.714-90.58 129.626-137 33.587-44.658 56.02-87.312 60.688-116.844-1.268-2.32-2.552-4.628-3.656-7.094-18.833-42.06-4.273-96.424 40.218-116.063 32.73-14.45 74.854-3.165 90.438 31.344.15.333.324.634.47.97 13.302 24.062 6.175 49.48-9.345 61.97-7.866 6.328-18.442 9.528-28.75 6.56-10.31-2.966-19.043-11.772-24.5-25.124l17.28-7.062c3.992 9.764 8.667 13.15 12.375 14.22 3.708 1.066 7.767.148 11.875-3.158 8.216-6.61 14.282-21.91 4.406-39.03l-.28-.47-.22-.5c-10.7-24.82-41.96-33.333-66.22-22.625-34.063 15.037-45.594 58.052-30.686 91.345 20.527 45.846 77.97 61.177 122.375 40.875 60.157-27.5 80.13-103.328 53.094-161.813-24.737-53.503-81.41-82.484-138.908-83.843-1.633-.04-3.272-.07-4.906-.063zm-25.75 26.72c3.238.035 6.363.348 9.406.906 10.343 1.898 19.946 6.753 29.032 13.25-30.623-5.437-58.324 4.612-80.78 24.782-22.44 20.152-39.16 50.59-45.783 84.718-4.655-11.358-7.166-21.462-6.686-31.72.296-6.343 1.715-12.956 4.78-20.217 9.094-18.016 21.032-33.946 35.22-46.69 7.824-7.026 16.39-13.07 25.53-17.905 10.932-5.212 20.522-7.22 29.282-7.125zm122.938 62.313c22.583 13.167 34.365 41.86 32.937 70.656-.564 11.395-3.466 22.975-8.905 33.624-12.48 18.937-35.53 25.51-49.97 20.875l-.092-.25c27.943-10.365 39.18-32.377 40.312-55.19.124-2.5.115-4.994-.03-7.468 1.447-13.31-.412-28.793-5.47-43.437-2.244-6.496-5.15-12.89-8.844-18.72l.064-.093zm-135.563 1.312c-20.97 19.342-29.406 35.252-33.25 51.25-3.848 16.023-2.788 32.84-2.905 52.875-.14 23.79-2.56 51.542-18.438 85.688-.005.012-.025.018-.03.03-21.095 26.753-45.276 52.25-68.907 67.376l-.063-.03c64.195-71.545 68.527-114.792 68.75-153.19.112-19.197-1.253-37.594 3.438-57.124a98.095 98.095 0 0 1 2-7.125h.03c8.098-17.036 16.572-26.058 25.47-31.563 7.18-4.44 15.035-6.697 23.906-8.187z" fill="#a478e8"/></svg>',ranger:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="m257.313 15.688-50.375 87.53 28.156-8.53 22.28-38.72 22.407 38.782 28.126 8.47-50.594-87.532zm-138.938 77.75 18.5 99.28 14.156-22.093L141.595 120l48.97 17.313 23.124-10.157-95.313-33.72zm278.72 0-95.314 33.718 23.876 10.5L375.562 120l-9.812 52.688 12.844 20.03 18.5-99.28zm-139.72 2.03-9.344 2.844v104.47l9.69 11.343 9-10.5V98.28l-9.345-2.81zm81.22 52.032-54.345 63.688.344.28-14.563 17 12.033 14.063 71.093-83.343-4.75-7.375-9.812-4.312zm-161.25.53-8.595 3.782-5.47 8.532 255.5 299.469L433 447.688l-8.094-9.47 22.688-10.03 11.47-5.063-8.158-9.53-44.125-51.783-2.31-2.718-3.564-.47-49.562-6.655-174-203.94zm56.06 123.22-62.218 72.688-.125-.094-6.625 7.75-49.718 6.687-3.564.47-2.312 2.72-44.28 51.936-8.158 9.563 11.5 5.06 22.75 10.064-8.187 9.594 14.218 12.156L245.594 285.28l-12.188-14.03zm24.376 28.125-9.75 11.28v178.75h18.69v-15.092l24.874 7.437 12.03 3.594v-87l-2.374-2.656-34.53-38.47v-47.5l-8.94-10.343zm-111.5 73.5-42.936 50.375L86.906 416l33.844-39.688 25.53-3.437zm223.22.375 25.406 3.438 33.656 39.468-16.312 7.22-42.75-50.126zm-140.03 4.375-16.064 18.094-2.344 2.655v87.031l12.063-3.656 6.344-1.906v-102.22zm37.25 7.563 18.217 20.312v54.75l-18.218-5.438v-69.625zm-87.75 5.406-64.564 74.687 3.5 5.44 6.813 10.592 8.155-9.593 44.28-51.94 2.314-2.686-.064-3.563-.437-22.936zm157.905.156-.438 22.97-.093 3.53 2.312 2.72 44.125 51.75 8.19 9.592 6.78-10.625 3.53-5.5-64.405-74.437z" fill="#c8a870"/></svg>',gladiator:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18"><path d="M482 30 302 210l-22-8-8-22L452 0l30 30zM270 242 60 452l-30-30L240 212l8 22 22 8zM256 96c-88 0-160 40-160 40v120c0 106 69 197 160 224 91-27 160-118 160-224V136s-72-40-160-40zm120 160c0 84-52 158-120 184-68-26-120-100-120-184v-96c22-10 68-28 120-28s98 18 120 28v96z" fill="#d9a45b"/></svg>'},Ih=`
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
`;class Lh{constructor(e,s){c(this,"el");c(this,"ui");c(this,"characters",[]);c(this,"showingCreate",!1);c(this,"activePicker",null);this.cb=s,Ve();const t=document.createElement("style");t.textContent=Ih,document.head.appendChild(t),this.el=document.createElement("div"),this.el.className="cs-overlay",this.el.innerHTML=`<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">${ke("cs")}</div>`,this.ui=document.createElement("div"),this.ui.className="cs-ui",this.el.appendChild(this.ui),e.appendChild(this.el)}async show(){this.el.style.display="block",this.showingCreate=!1,this.characters=await os(),this.render()}hide(){this.el.style.display="none"}render(){var i;if(this.showingCreate){this.renderCreateForm();return}(i=this.activePicker)==null||i.dispose(),this.activePicker=null;const e=this.characters.map((r,o)=>{const n=Sn(r.level),l=n>0?Math.min(100,r.xp/n*100):0;return`
        <div class="cs-slot px-panel" data-index="${o}"><div class="cs-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="cs-char-name px-title" style="font-size:12px">${Je(r.name)}</div>
          <div class="cs-char-class px-label">${qa[r.class]??""} ${Je(r.class)}</div>
          <div class="cs-char-level">Level ${r.level}</div>
          <div class="cs-xp-bar"><div class="cs-xp-fill" style="width:${l}%"></div></div>
          <div class="cs-xp-text">${r.xp} / ${n} XP</div>
          <div class="cs-slot-actions">
            <button class="cs-btn-select px-btn px-btn-primary" data-index="${o}">Select</button>
            <button class="cs-btn-look px-btn" data-index="${o}">Edit Look</button>
            <button class="cs-btn-delete px-btn" data-index="${o}">Delete</button>
          </div>
        </div>`}).join(""),s=Math.max(0,_n-this.characters.length),t=s===0?"":`
      <div class="cs-slot cs-slot-empty px-panel" data-action="create"><div class="cs-embers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="cs-empty-plus">+</div>
        <div class="cs-empty-text px-label">Create Character</div>
        <div class="cs-empty-text px-label" style="opacity:0.6">${s} slot${s===1?"":"s"} left</div>
      </div>`;this.ui.innerHTML=`
      <button class="cs-btn-logout px-btn" id="cs-logout">Sign Out</button>
      <div class="cs-title px-title">Blood Moor</div>
      <div class="cs-subtitle px-label">Choose Your Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-grid">
        ${e}
        ${t}
      </div>`,this.ui.querySelector("#cs-logout").addEventListener("click",()=>this.cb.onLogout()),this.ui.querySelectorAll(".cs-btn-select").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.cb.onSelectCharacter(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-look").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.showEditLook(this.characters[n])})}),this.ui.querySelectorAll(".cs-btn-delete").forEach(r=>{r.addEventListener("click",o=>{o.stopPropagation();const n=parseInt(r.dataset.index);this.showDeleteConfirm(this.characters[n])})}),this.ui.querySelectorAll('[data-action="create"]').forEach(r=>{r.addEventListener("click",()=>{this.showingCreate=!0,this.render()})})}renderCreateForm(e="",s){var o;(o=this.activePicker)==null||o.dispose(),this.activePicker=null;const t=(s==null?void 0:s.selectedClass)??"mage",i=Fi.map(n=>{const l=n.id===t?"active":"",d=n.enabled?"":"disabled";return`<div class="cs-class-option ${l} ${d}" data-class="${n.id}">${qa[n.id]??""} ${Je(n.label)}</div>`}).join("");this.ui.innerHTML=`
      <div class="cs-title px-title" style="font-size:24px">Blood Moor</div>
      <div class="cs-subtitle px-label">Create a New Champion</div>
      <div class="cs-divider"><div class="cs-divider-line"></div><div class="cs-divider-gem"></div><div class="cs-divider-line"></div></div>
      <div class="cs-create-panel px-panel">
        ${e?`<div class="cs-error">${Je(e)}</div>`:""}
        <div class="cs-label px-label">Character Name</div>
        <input id="cs-name" class="cs-input px-input" type="text" placeholder="Name your champion..." maxlength="20">
        <div class="cs-label px-label">Class</div>
        <div class="cs-class-grid">${i}</div>
        <div class="cs-label px-label">Appearance</div>
        <div id="cs-appearance" class="cs-appearance-wrap"></div>
        <button id="cs-create-btn" class="cs-btn-create px-btn px-btn-primary">Forge Champion</button>
        <button id="cs-cancel-btn" class="cs-btn-cancel px-btn">Cancel</button>
      </div>`;let r=t;this.activePicker=new Ys(this.ui.querySelector("#cs-appearance"),r,s==null?void 0:s.appearance),this.ui.querySelectorAll(".cs-class-option").forEach(n=>{n.addEventListener("click",()=>{var h;const l=n.dataset.class,d=Fi.find(p=>p.id===l);!(d!=null&&d.enabled)||l===r||(this.ui.querySelectorAll(".cs-class-option").forEach(p=>p.classList.remove("active")),n.classList.add("active"),r=l,(h=this.activePicker)==null||h.dispose(),this.activePicker=new Ys(this.ui.querySelector("#cs-appearance"),r))})}),this.ui.querySelector("#cs-create-btn").addEventListener("click",async()=>{const n=this.ui.querySelector("#cs-name").value.trim(),l={selectedClass:r,appearance:this.activePicker.getAppearance()};if(!n){this.renderCreateForm("Name is required",l);return}if(n.length>20){this.renderCreateForm("Name must be 20 characters or less",l);return}const d=Bi(l.appearance);if(!await Sd(n,r,d)){this.renderCreateForm("Failed to create character. Name may already be taken.",l);return}this.showingCreate=!1,this.characters=await os(),this.render()}),this.ui.querySelector("#cs-cancel-btn").addEventListener("click",()=>{this.showingCreate=!1,this.render()})}showDeleteConfirm(e){const s=document.createElement("div");s.className="cs-confirm-overlay",s.innerHTML=`
      <div class="cs-confirm-panel px-panel">
        <div class="cs-confirm-title px-title">Delete Character</div>
        <div class="cs-confirm-text">
          This will permanently delete <strong style="color:var(--px-accent)">${Je(e.name)}</strong>
          and all their progress.<br><br>
          Type the character's name to confirm:
        </div>
        <input class="cs-confirm-input px-input" id="cs-delete-input" type="text" placeholder="${Je(e.name)}">
        <div class="cs-confirm-buttons">
          <button class="cs-confirm-delete px-btn" id="cs-delete-confirm">Delete Forever</button>
          <button class="cs-confirm-cancel px-btn" id="cs-delete-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(s);const t=s.querySelector("#cs-delete-input"),i=s.querySelector("#cs-delete-confirm"),r=s.querySelector("#cs-delete-cancel");t.addEventListener("input",()=>{t.value===e.name?i.classList.add("enabled"):i.classList.remove("enabled")}),i.addEventListener("click",async()=>{if(t.value!==e.name)return;const o=await Cd(e.id);s.remove(),o&&(this.characters=await os(),this.render())}),r.addEventListener("click",()=>s.remove())}showEditLook(e){const s=document.createElement("div");s.className="cs-confirm-overlay",s.innerHTML=`
      <div class="cs-edit-look-panel px-panel">
        <div class="cs-confirm-title px-title">Edit Look</div>
        <div class="cs-error" hidden></div>
        <div id="cs-edit-look-picker"></div>
        <div class="cs-confirm-buttons" style="margin-top:16px">
          <button class="px-btn px-btn-primary" id="cs-look-save">Save</button>
          <button class="px-btn" id="cs-look-cancel">Cancel</button>
        </div>
      </div>`,this.el.appendChild(s);const t=new Ys(s.querySelector("#cs-edit-look-picker"),e.class,_s(e.appearance,e.class)),i=s.querySelector(".cs-error"),r=s.querySelector("#cs-look-save"),o=s.querySelector("#cs-look-cancel"),n=()=>{t.dispose(),s.remove()};o.addEventListener("click",n),r.addEventListener("click",async()=>{i.hidden=!0,r.disabled=!0,o.disabled=!0;const l=Bi(t.getAppearance());try{await Jr(e.id,l),e.appearance=l,n(),this.render()}catch(d){console.error("update_appearance failed:",d instanceof Error?d.message:d),i.textContent="Failed to save look. Please try again.",i.hidden=!1,r.disabled=!1,o.disabled=!1}})}}function Oa(a,e=64,s=8){const t=a.image,i=document.createElement("canvas");i.width=e,i.height=e;const r=i.getContext("2d");r.imageSmoothingEnabled=!0,r.drawImage(t,0,0,e,e);const o=r.getImageData(0,0,e,e);en(o.data,s),r.putImageData(o,0,0);const n=new ks(i);return n.colorSpace=a.colorSpace,n.wrapS=n.wrapT=Ja,n.magFilter=He,n.minFilter=tr,a.dispose(),n}function Fa(a){return a.magFilter=He,a.minFilter=tr,a}class Ph{static async load(){const e=new Fo,s=(d,h)=>new Promise((p,f)=>e.load(d,m=>{m.colorSpace=h,p(m)},void 0,f)),t=ws,i=No,[r,o,n,l]=await Promise.all([s("/assets/textures/cobblestone/diffuse.jpg",t),s("/assets/textures/castle_stone/diffuse.jpg",t),s("/assets/textures/castle_stone/normal.jpg",i),s("/assets/textures/castle_stone/roughness.jpg",i)]);return{textures:{floor:{map:Oa(r,64,12)},stone:{map:Oa(o),normalMap:Fa(n),roughnessMap:Fa(l)}}}}}class zh{constructor(e){c(this,"el");c(this,"hidden",!1);this.el=document.createElement("div"),this.el.style.cssText='position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#181a21 0%,#0a0b0f 60%,#0a0b0f 100%);z-index:300;font-family:"VT323",monospace;transition:opacity 0.6s ease;',this.el.innerHTML=`
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
    `,e.appendChild(this.el)}hide(){return this.hidden?Promise.resolve():(this.hidden=!0,new Promise(e=>{this.el.addEventListener("transitionend",()=>{this.el.remove(),e()},{once:!0}),this.el.style.opacity="0"}))}}const qh=`
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
`;function Oh(){if(document.getElementById("px-theme"))return;const a=document.createElement("style");a.id="px-theme",a.textContent=qh,document.head.appendChild(a)}class Fh{constructor(e){c(this,"el");this.el=document.createElement("div"),this.el.style.cssText="position:fixed;inset:0;z-index:500;display:none;background:rgba(8,9,13,0.9);overflow-y:auto;",this.el.innerHTML=`
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
      </div>`,e.appendChild(this.el),this.el.querySelector("#credits-close").addEventListener("click",()=>this.hide())}async show(){this.el.style.display="block";const e=this.el.querySelector("#credits-body");if(!e.textContent)try{const t=await fetch("/assets/lpc/CREDITS.filtered.csv");if(!t.ok)throw new Error(`credits fetch failed: ${t.status}`);e.textContent=Nh(await t.text())}catch{e.textContent="Credits file missing — see client/public/assets/lpc/CREDITS.csv"}const s=this.el.querySelector("#audio-credits-body");if(!s.textContent)try{const t=await fetch("/assets/audio/CREDITS.csv");if(!t.ok)throw new Error(`audio credits fetch failed: ${t.status}`);s.textContent=Bh(await t.text())}catch{s.textContent="Credits file missing — see client/public/assets/audio/CREDITS.csv"}}hide(){this.el.style.display="none"}}function io(a){const e=[];let s="",t=!1;for(let i=0;i<a.length;i++){const r=a[i];t?r==='"'?a[i+1]==='"'?(s+='"',i++):t=!1:s+=r:r==='"'?t=!0:r===","?(e.push(s),s=""):s+=r}return e.push(s),e}function Nh(a){return a.split(`
`).filter(s=>s.trim().length>0).slice(1).map(io).map(([s,,t,i])=>`${s} — ${t==null?void 0:t.trim()} (${i==null?void 0:i.trim()})`).join(`

`)}function Bh(a){return a.split(`
`).filter(s=>s.trim().length>0).slice(1).map(io).map(([s,t,i,,r])=>`${s} — ${i==null?void 0:i.trim()}, ${t==null?void 0:t.trim()} (${r==null?void 0:r.trim()})`).join(`

`)}const Hh=`
.au-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:500;}
.au-panel{background:var(--px-panel);padding:24px 28px;min-width:320px;box-shadow:0 -3px 0 0 var(--px-border-light),0 3px 0 0 var(--px-border-dark),-3px 0 0 0 var(--px-border-light),3px 0 0 0 var(--px-border-dark),0 12px 32px rgba(0,0,0,0.7);}
.au-title{font-family:'Press Start 2P',monospace;font-size:12px;color:var(--px-accent);letter-spacing:1px;margin-bottom:18px;}
.au-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-family:'Press Start 2P',monospace;font-size:8px;color:var(--px-text);letter-spacing:1px;}
.au-row label{width:70px;text-transform:uppercase;}
.au-row input[type=range]{flex:1;accent-color:var(--px-accent);}
.au-actions{display:flex;justify-content:flex-end;margin-top:18px;}
`;function Dh(a){return`
    <div class="au-panel">
      <div class="au-title">Settings</div>
      <div class="au-row"><label>Music</label><input type="range" min="0" max="100" value="${a.musicVol}" data-audio-music></div>
      <div class="au-row"><label>SFX</label><input type="range" min="0" max="100" value="${a.sfxVol}" data-audio-sfx></div>
      <div class="au-row"><label>Mute</label><input type="checkbox" ${a.muted?"checked":""} data-audio-mute></div>
      <div class="au-actions"><button class="px-btn" data-audio-close>Done</button></div>
    </div>`}class Uh{constructor(e){c(this,"el");yi("au-settings-css",Hh),this.el=document.createElement("div"),this.el.className="au-overlay",this.el.style.display="none",this.el.addEventListener("click",s=>{s.target===this.el&&this.hide()}),e.appendChild(this.el)}show(){this.el.innerHTML=Dh(ee.settings);const e=this.el.querySelector("[data-audio-music]"),s=this.el.querySelector("[data-audio-sfx]"),t=this.el.querySelector("[data-audio-mute]");e.addEventListener("input",()=>ee.setMusicVol(Number(e.value))),s.addEventListener("input",()=>ee.setSfxVol(Number(s.value))),t.addEventListener("change",()=>ee.setMuted(t.checked)),this.el.querySelector("[data-audio-close]").addEventListener("click",()=>this.hide()),this.el.style.display=""}hide(){this.el.style.display="none"}}const Na=1.5;function jh(a,e){switch(a){case"hall":return{base:.9,torch:.6,wind:0,pulse:0};case"arena":return{base:0,torch:0,wind:.8,pulse:e?.5:0};case"off":return{base:0,torch:0,wind:0,pulse:0}}}let ao="off",ro=!1;const vt=new Map,Xs=new Map;let Ba=!1;const Gh=new Set(["hall_base","hall_torch","arena_wind"]);let Ha=!1;function Vt(a){ao=a,Ba||(Ba=!0,ee.onUnlock(()=>ls())),Ha||(Ha=!0,kr(e=>{Gh.has(e)&&ls()})),ls()}function oo(a){ro=a,ls()}function ls(){const a=ee.ctx,e=ee.musicBus;if(!a||!e)return;const s=jh(ao,ro);for(const t of Object.keys(s)){const i=s[t],r=(Xs.get(t)??0)+1;if(Xs.set(t,r),i>0&&!vt.has(t)){const n=Vh(t);n&&vt.set(t,n)}const o=vt.get(t);o&&(o.gain.gain.cancelScheduledValues(a.currentTime),o.gain.gain.setValueAtTime(o.gain.gain.value,a.currentTime),o.gain.gain.linearRampToValueAtTime(i,a.currentTime+Na),i===0&&window.setTimeout(()=>{var n;Xs.get(t)===r&&((n=vt.get(t))==null||n.stop(),vt.delete(t))},Na*1e3+100))}}function Vh(a){switch(a){case"base":return wt("hall_base","music",0);case"torch":return wt("hall_torch","music",0);case"wind":return wt("arena_wind","music",0);case"pulse":return wt("hall_base","music",0,.55)}}Oh();ee.installUnlockListener();Vt("hall");Hl();const no=document.getElementById("canvas-container"),fe=document.getElementById("ui-overlay"),bs=document.getElementById("world-labels");fe.addEventListener("click",a=>{var t,i;const e=(i=(t=a.target)==null?void 0:t.closest)==null?void 0:i.call(t,".px-btn, .bm-acct-item");if(!e)return;const s=Dl(e.className);s==="tab"?jl():s==="click"&&Ul()},!0);const Da=new zh(fe),lo=new Fh(fe),co=new Uh(fe),ce=new an(no);function Ci(a){no.style.display=a?"":"none",ce.setRenderingEnabled(a)}Ci(!1);const pe=new rd(fe);pe.hide();const Ie=new Wc,Ft=new Set,L=new ed;let P="",re="",Q={},Ce=new Map,J=null,xe=null,V=null,me={},te="1v1",at,Nt=!1,Oe=null,vs=[],ge=new Set,ne=null,Ms="",S=null,Be={},ct=new Set,cs=new Array(Pt).fill(null),ho="none";function Wh(a){const e=new Set;for(const s of Ue)a.has(s.node)&&e.add(s.spell);return e}let po=0,Ts=zt;async function Mi(a,e){const[{data:s},{data:t}]=await Promise.all([$.from("skill_unlocks").select("node_id, rank").eq("character_id",a),$.from("character_spell_slots").select("slot, spell").eq("character_id",a)]),i=t??[],r=s??[],o=new Set(r.map(f=>f.node_id)),n=ps[e];n&&o.add(n);const l=new Map;for(const f of r)l.set(f.node_id,f.rank??0);const d=(await _i()).filter(f=>f.equipped_by===a),{talentRanks:h}=mr(d,e);for(const[f,m]of h)o.add(f),l.set(f,(l.get(f)??0)+m);if((S==null?void 0:S.id)!==a)return;Be=gr(d),A.updateHeroGear(Be),ct=Wh(o),ho=wn(l),po=l.get("utility.phase_shift")??0;const p=l.get("bulwark.mobile_guard")??0;Ts=e==="gladiator"?Math.min(.85,zt*(1+qe(.08,p))):zt,cs=gi(ct,i),pe.buildSpellSlots(cs),pe.setBlockSlotVisible(e==="gladiator"),V==null||V.setSlots(cs)}let dt=Promise.resolve(),ni=!1;function Yh(){const a=S;a&&(dt=Mi(a.id,a.class).catch(e=>{console.error("loadout sync failed:",e)}))}function Xh(){const a=S;a&&(dt=(async()=>{const e=await os();if((S==null?void 0:S.id)!==a.id)return;const s=e.find(i=>i.id===a.id);if(!s)return;const t=s.skill_points_available!==a.skill_points_available;S=s,await Mi(s.id,s.class),t&&!ni&&Rs()})().catch(e=>{console.error("character sync failed:",e)}))}async function ht(){if(!Ms){li=null,A.setGold(null);return}const a=await Si();li=a,A.setGold(a)}function Es(){return{username:(S==null?void 0:S.name)??Bt,gold:li,skillPoints:S==null?void 0:S.skill_points_available,isAdmin:Ht}}const As={onCredits:()=>{lo.show()},onLogout:()=>{fo()},onSettings:()=>{co.show()}};async function fo(){try{await $.auth.signOut()}catch{}rt(),Vt("hall"),Ms="",S=null,Be={},Nt=!1,P="",re="",Q={},me={},te="1v1",at=void 0,ct=new Set,Ts=zt,Oe=null,Ti.reset(),Ei.reset(),dt=Promise.resolve(),L.disconnect(),A.hide(),Ht=!1,A.setAdmin(!1),Ai.show()}function Rs(){S?A.showHome(S.name,S.skill_points_available,S.class,S.level,_s(S.appearance,S.class),Be):A.showHome(Bt)}async function Zh(a){if(a==="skills"){if(!S)return"arena";const e=await Kh.show(S.id);return Xh(),e}if(a==="gear"){if(!S)return"arena";const e=await Ti.show(S.id,S.class,S.level,_s(S.appearance,S.class));return Yh(),e}return a==="shop"?S?await Ei.show():"arena":await Qh.show()}async function ts(a){if(a==="arena")return;ni=!0,A.hide();let e=a;for(;e!=="arena";)e=await Zh(e),ht();A.show(),Rs(),ni=!1}const Ua={0:13148160,1:12582960,2:32960,3:41024};let ja,Bt="",li=null,Ht=!1;const Kh=new gh(fe,Es,As),Ti=new Xd(fe,Es,As),Ei=new wh(fe,Es,As),Qh=new Mh(fe,Es,As),Dt=new Lh(fe,{onSelectCharacter:async a=>{S=a,Be={},await Mi(a.id,a.class),Dt.hide(),A.show(),A.showHome(a.name,a.skill_points_available,a.class,a.level,_s(a.appearance,a.class),Be),ht()},onLogout:async()=>{try{await $.auth.signOut()}catch{}rt(),Ms="",S=null,Be={},Nt=!1,P="",re="",Q={},me={},te="1v1",at=void 0,ct=new Set,Ts=zt,Oe=null,Ti.reset(),Ei.reset(),dt=Promise.resolve(),L.disconnect(),A.hide(),Ht=!1,A.setAdmin(!1),Dt.hide(),Ai.show()}});Dt.hide();const Ai=new Qd(fe,{onAuthed:async(a,e)=>{Ms=e,Ai.hide(),await hi,Da.hide();const s=await _d();Ht=(s==null?void 0:s.is_admin)??!1,A.setAdmin(Ht);const t=await Jh(e);if(t){await ep(t,a,void 0);return}await Dt.show()},onShowLogin:async()=>{await hi,Da.hide()}});async function Jh(a){try{const e=await fetch("http://localhost:3001/paused-match",{method:"POST",headers:{Authorization:`Bearer ${a}`}});if(!e.ok)return null;const{roomId:s}=await e.json();return s}catch{return null}}async function ep(a,e,s){try{await hi}catch{return}Bt=e,re=a,ci(),L.connect(),L.onRejoinAccepted(t=>{P=t.yourId,t.colorIndex,Q=t.players,me={...t.players},pe.init(P),A.hide()}),L.onRejoinFailed(()=>{re="",P="",A.show(),A.showHome(e,s),ht()}),L.rejoinRoom(a,await xs())}const A=new Kd(fe,{onCreateRoom:async(a,e)=>{await dt,Bt=a,te=e;const s=await fetch("http://localhost:3001/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:e})}),{roomId:t}=await s.json();L.connect(),L.joinRoom(t,a,await xs(),void 0,S==null?void 0:S.id),L.onRoomJoined(({yourId:i,mode:r,teams:o,readyPlayerIds:n})=>{P=i,re=t,Q={[i]:a},te=r??e,at=o==null?void 0:o[i],ge=new Set(n??[]),pe.init(P),A.showReady(t,Q,P,te,ge),A.appendSystemMessage("You have entered the lobby")}),ci()},onJoinRoom:async(a,e,s)=>{await dt,Bt=e,L.connect(),L.joinRoom(a,e,await xs(),s,S==null?void 0:S.id),L.onRoomJoined(({yourId:t,players:i,mode:r,teams:o,readyPlayerIds:n})=>{P=t,re=a,Q=i,te=r??"1v1",at=o==null?void 0:o[t],ge=new Set(n??[]),Object.keys(i).indexOf(t),pe.init(P),me={...i},A.showReady(a,i,t,te,ge),A.appendSystemMessage("You have entered the lobby")}),ci()},onReady:()=>L.ready(),onRematch:()=>L.rematch(),onReturnToLobby:()=>{Vt("hall"),rt(),L.disconnect(),Nt=!1,re="",Q={},me={},te="1v1",at=void 0,Rs(),ht()},onSendChatMessage:a=>L.sendChatMessage(a),onLogout:()=>{fo()},onOpenSkills:()=>{ts("skills")},onOpenGear:()=>{ts("gear")},onOpenShop:()=>{ts("shop")},onSwitchCharacter:async()=>{A.hide(),await Dt.show()},onShowCredits:()=>{lo.show()},onOpenAdmin:()=>{ts("admin")},onOpenSettings:()=>{co.show()}});A.hide();function ci(a){if(Nt)return;Nt=!0,L.onChatMessage(({senderId:s,displayName:t,text:i})=>{s!==P&&fc(),A.appendChatMessage(s,t,i)}),L.onPlayerJoined(({id:s,displayName:t})=>{uc(),me[s]=t,Q[s]=t,A.showReady(re,Q,P,te,ge),A.appendSystemMessage(`${t} has entered the lobby`)}),L.onGameReady(()=>A.showReady(re,Q,P,te,ge)),L.onPlayerReadyAck(({playerId:s})=>{ge.add(s),A.showReady(re,Q,P,te,ge)}),L.onRematchRequested(({requesterId:s,countdown:t})=>{const i=s===P;A.showRematchCountdown(t,i)}),L.onGameState(s=>{J||(Ie.clear(),Ft.clear(),Ga(),A.hide());const t=performance.now();Ie.push(s,t);for(const[i,r]of Object.entries(s.players))r.castingSpell!==null&&(Ft.add(i),Vl(r.castingSpell));if(!ne&&s.players[P]&&(ne=new Jc(s.players[P].position)),ne&&s.players[P]&&s.ack){const i=s.ack[P];i!==void 0&&ne.reconcile(s.players[P].position,i)}});let e=!1;L.onDuelEnded(({winnerId:s,gameMode:t,matchResults:i})=>{e=!0;const r=t??te;let o;r==="2v2"?o=s===at:o=s===P,A.hidePauseOverlay(),rt();const n=i==null?void 0:i[P];if(r==="ffa"&&!o){const l=vs.indexOf(P),h=l>=0?4-l:1;A.showResult(o,r,h,n)}else A.showResult(o,r,void 0,n);A.show(),S&&n&&(S={...S,level:n.newLevel||S.level,xp:n.newXp??S.xp}),ht()}),L.onRematchReady(()=>{e=!1,Ie.clear(),Ga(),A.hide()}),L.onOpponentDisconnected(()=>{e?A.disableRematch():te==="1v1"?(rt(),A.showDisconnected(),A.show()):A.appendSystemMessage("A player disconnected")}),L.onPlayerDisconnected(({playerId:s})=>{const t=me[s]??"A player";A.appendSystemMessage(`${t} disconnected`),delete Q[s],A.showReady(re,Q,P,te,ge)}),L.onPlayerLeft(({playerId:s})=>{const t=me[s]??"A player";A.appendSystemMessage(`${t} left the lobby`),delete Q[s],delete me[s],A.showReady(re,Q,P,te,ge)}),L.onMatchPaused(({countdown:s})=>{A.showPauseOverlay(s,()=>{L.leavePausedMatch()})}),L.onGameResumed(()=>{A.hidePauseOverlay()}),L.onDisconnect(()=>{J&&re&&(Oe={roomId:re})}),L.onReconnect(()=>{if(!Oe)return;L.onRejoinAccepted(t=>{Oe=null,P=t.yourId,t.colorIndex,Q=t.players,me={...me,...t.players},pe.init(P),J==null||J.setMyId(P),ne=null}),L.onRejoinFailed(()=>{Oe=null,rt(),A.showDisconnected(),A.show()});const s=Oe.roomId;xs().then(t=>L.rejoinRoom(s,t))}),L.onLoadoutLoadFailed(({reason:s})=>{console.error("loadout load failed:",s),A.appendSystemMessage("Your gear and skills failed to load — leave the room and re-enter to retry.")}),L.onRoomNotFound(()=>{Vt("hall"),Rs(),ht()})}function Ga(){Ci(!0);for(const e of Ce.values())e.dispose(bs);Ce.clear(),J==null||J.dispose(),xe==null||xe.dispose(),V==null||V.dispose(),J=new Nc(ce.scene,P),xe=new Gc(ce.scene),J.setArrowElement(ho),V=new td(ce,ce.renderer.domElement),S&&V.setCharacterClass(S.class);const a=ct.size>0?cs:gi(new Set(Ue.filter(e=>e.charClass===((S==null?void 0:S.class)??"mage")).map(e=>e.spell)),[]);pe.buildSpellSlots(a),pe.setBlockSlotVisible((S==null?void 0:S.class)==="gladiator"),V.setSlots(a),V.setChannelSpells(new Set([12])),pe.show(),Vt("arena"),oo(!0),pc(),A.hide()}function rt(){Ci(!1),V==null||V.dispose(),V=null,J==null||J.dispose(),J=null,xe==null||xe.dispose(),xe=null;for(const a of Ce.values())a.dispose(bs);Ce.clear(),pe.hide(),oo(!1),Ie.clear(),Ft.clear(),ne=null,di=0,vs=[],ge=new Set}let Va=performance.now();const Zs=1e3/60;let yt=0,di=0;ce.startRenderLoop(()=>{var r,o;const a=performance.now(),e=Math.min((a-Va)/1e3,.1);if(Va=a,!V||!J)return;for(yt=Math.min(yt+e*1e3,100);yt>=Zs;){yt-=Zs;const n=V.buildInputFrame();if(n.castSpell){const l=(r=Ie.getLatest())==null?void 0:r.players[P];l&&l.hp>0&&(l.cooldowns[n.castSpell]??0)<=0&&l.mana<At[n.castSpell].manaCost&&nc()}if(ne){const l=Ie.getLatest(),d=l==null?void 0:l.players[P],h={};if(l&&d){const p=(d.stunUntil??0)>l.tick,f=p||(d.rootUntil??0)>l.tick?0:(d.slowUntil??0)>l.tick?d.slowFactor??1:1,m=V.isBlockHeld()&&d.charClass==="gladiator"&&!p&&(d.blockCooldownUntil??0)<=l.tick;if(h.speedMult=f*(m?Ts:1)*(((o=d.statMults)==null?void 0:o.moveSpeed)??1),n.castSpell===4&&ct.has(4)&&a>=di){const b=(d.phantomStepUntil??0)>l.tick,u=b||d.mana>=At[4].manaCost;(d.cooldowns[4]??0)<=0&&u&&d.hp>0&&(h.teleportTarget={...n.aimTarget},h.teleportRange=vn(po),b||(di=a+At[4].cooldownTicks/be*1e3))}}n.seq=ne.applyInput(n.move,a,h)}L.sendInput(n)}const s=yt/Zs,t=Ie.getInterpolated(a);if(!t)return;for(const[n,l]of Ce)n in t.players||(l.dispose(bs),Ce.delete(n));for(const[n,l]of Object.entries(t.players)){if(l.hp<=0&&!vs.includes(n)&&vs.push(n),!Ce.has(n)){const f=Object.keys(t.players).indexOf(n)%Object.keys(Ua).length,m=new yl(l.charClass,l.appearance,l.gear,Ua[f],l.displayName,bs);ce.scene.add(m.group),Ce.set(n,m)}const d=Ce.get(n);if(n===P&&ne){const p=ne.getRenderPosition(s,a),f=V.getCurrentMouseWorld(),m=Math.atan2(f.y-p.y,f.x-p.x);d.setPosition(p.x,p.y,m)}else d.setPosition(l.position.x,l.position.y,l.facing);d.update(e,Ft.has(n)),l.hp<=0&&d.die();const h=rs(l,P,t.tick);d.setVisible(!h),d.updateLabel(ce.camera,ce.getCanvasRect())}Ft.clear();const i=ne&&t.players[P]?ne.getRenderPosition(s,a):void 0;if(i)ce.updateCamera(i.x,i.y,e);else{const n=t.players[P];n&&ce.updateCamera(n.position.x,n.position.y,e)}V.refreshMouseWorld(),J.update(t,i),xe==null||xe.update(t,e),pe.update(t,V.getActiveSpell())});const hi=(async()=>{ja=await Ph.load(),new al(ja.textures).addToScene(ce.scene),ce.initPostProcessing()})().catch(a=>{throw console.error("Asset load failed:",a),a});document.addEventListener("visibilitychange",()=>{if(document.hidden&&ne){const a=Ie.getLatest();a!=null&&a.players[P]&&ne.reset(a.players[P].position)}});
