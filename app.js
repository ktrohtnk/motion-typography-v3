// Motion Typography Studio v3 - Core Engine

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Offscreen canvas for particle generation (Sand Crumble)
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
offCanvas.width = 1080;
offCanvas.height = 1920;

// --- State & Config ---
const state = {
    text: "MOTION\nTYPOGRAPHY",
    fontFamily: '900 "Inter", sans-serif',
    color: "#FFFFFF",
    bgColor: "#000000",
    size: 140,
    kerning: 0,
    lineHeight: 1.1,
    outlineOnly: false,
    mergeOverlap: false,
    outlineWidth: 5,
    
    globalSpin: 0,
    charSpin: 0,
    jitter: 0,
    jitterAmount: 5,
    slideAnimation: 'none',
    moveSec: 0.8,
    pauseSec: 1.5,
    inertiaEnabled: true,
    inertia: 1.5,
    
    fluxusEnabled: false,
    fluxusMode: 'char',
    
    glitchEnabled: false,
    glitchIntensity: 50,
    
    rgbSplitEnabled: false,
    rgbSplitDistance: 6,
    
    chaosEnabled: false,
    chaosMode: 'char',
    chaosIntensity: 50,
    chaosMix: 30,
    chaosStyle: 'normal', // legacy, kept for compat
    glitchPopEnabled: false,
    
    glitchPopIntensity: 50, // Slider value for intensity (1-100)
    glitchPopPixelSize: 4,
    
    glitchPopBEnabled: false,
    glitchPopBIntensity: 50,
    glitchPopBPixelSize: 10,
    
    glitchPopCEnabled: false,
    glitchPopCIntensity: 70,
    glitchPopBPixelSize: 10,
    
    dustEnabled: false,
    dustDensity: 20,
    dustSize: 1.0,
    
    depthEnabled: false,
    
    fps: 5,
    psdLayers: [], // Array of canvases for each layer
    psdX: 0,
    psdY: 0,
    psdScale: 1.0,

    // Transition State
    isDissolving: false,
    dissolveProgress: 0,
    dissolveType: 'water', // 'water', 'sand', 'pop_burst', 'pop_center'
    dissolveParticles: [] // For sand and smoke
};

// --- Particles & Effects ---
let dustParticles = [];

// Glitch Pop tracker: { charKey, scale, framesLeft }
let glitchPopActive = [];
// Glitch Pop state: pixelation and font are independent of size pops
let glitchPixelActive = false;
let glitchPopBActive = [];
let glitchPopCActive = [];

// Reusable offscreen canvases for Glitch Pop pixelation (created once, reused)
const gpCanvas = document.createElement('canvas');
const gpCtx = gpCanvas.getContext('2d');
const gpSmall = document.createElement('canvas');
const gpSmallCtx = gpSmall.getContext('2d');

const charMosaicCanvas = document.createElement('canvas');
const charMosaicCtx = charMosaicCanvas.getContext('2d');
const charTinyCanvas = document.createElement('canvas');
const charTinyCtx = charTinyCanvas.getContext('2d');

const rgbBaseCanvas = document.createElement('canvas');
const rgbBaseCtx = rgbBaseCanvas.getContext('2d', { willReadFrequently: true });

const chaosGothicFonts = [
    '900 "Inter", sans-serif',
    '900 "Montserrat", sans-serif',
    '400 "Anton", sans-serif',
    '400 "Bebas Neue", sans-serif',
    '900 "Barlow Condensed", sans-serif',
    '700 "Oswald", sans-serif'
];

const chaosAccentFonts = [
    '400 "Pacifico", cursive', 
    '400 "Lobster", cursive', 
    '400 "Rock Salt", cursive', 
    '400 "Righteous", cursive',
    '400 "Rubik Glitch", cursive',
    '400 "Abril Fatface", serif',
    '400 "Playfair Display", serif'
];

// Glitch Pop fonts (different from Fluxus)
let glitchPopFonts = [
    '400 "Press Start 2P", cursive',
    '400 "VT323", monospace',
    '400 "Silkscreen", cursive',
    '400 "DotGothic16", sans-serif',
    '400 "Pixelify Sans", cursive',
    '400 "Bungee", cursive'
];
let fluxusFonts = [
    // Bubble / Balloon
    '400 "Fredoka One", cursive',
    '400 "Paytone One", sans-serif',
    '400 "Lilita One", cursive',
    '400 "Luckiest Guy", cursive',
    // Condensed / Tall
    '700 "Oswald", sans-serif',
    '900 "Barlow Condensed", sans-serif',
    '400 "Fjalla One", sans-serif',
    '400 "Six Caps", sans-serif',
    // Brush / Paint / Rough
    '400 "Permanent Marker", cursive',
    '400 "Finger Paint", cursive',
    '400 "Rock Salt", cursive',
    // Script / Display
    '400 "Lobster", cursive',
    '400 "Boogaloo", cursive',
    // Serif / Classic
    '400 "Playfair Display", serif',
    '400 "Ultra", serif',
    '400 "Alfa Slab One", cursive',
    // Western / Ornate
    '400 "Rye", cursive',
    '400 "Ewert", cursive',
    '400 "Sancreek", cursive',
    // 3D / Shadow / Inline
];

// --- Loop Timing ---
let lastFrameTime = 0;
let animationStartTime = Date.now();
let frameCount = 0;

// --- DOM Bindings ---
function bindUI(id, stateKey, parser = parseInt, displayId = null) {
    const el = document.getElementById(id);
    if(!el) return;
    
    if (el.type === 'checkbox') el.checked = state[stateKey];
    else el.value = state[stateKey];
    
    el.addEventListener('input', (e) => {
        let val;
        if (el.type === 'checkbox') {
            val = el.checked;
        } else {
            val = parser ? parser(e.target.value) : e.target.value;
        }
        state[stateKey] = val;
        if (displayId) {
            const d = document.getElementById(displayId);
            if(d) d.textContent = val;
        }
        if (['moveSec', 'pauseSec', 'slideAnimation'].includes(stateKey)) {
            animationStartTime = Date.now();
        }
    });
}

function initUI() {
    document.getElementById('textInput').addEventListener('input', e => state.text = e.target.value);
    document.getElementById('fontSelect').addEventListener('change', e => state.fontFamily = e.target.value);
    document.getElementById('colorInput').addEventListener('input', e => state.color = e.target.value);
    document.getElementById('bgColorInput').addEventListener('input', e => state.bgColor = e.target.value);
    
    bindUI('sizeSlider', 'size', parseInt, 'sizeBox');
    bindUI('kerningSlider', 'kerning', parseInt, 'kerningBox');
    bindUI('lineHeightSlider', 'lineHeight', parseFloat, 'lineHeightBox');
    bindUI('outlineWidthSlider', 'outlineWidth', parseInt, 'outlineWidthBox');
    
    const outBtn = document.getElementById('outlineOnlyBtn');
    outBtn.addEventListener('click', () => { state.outlineOnly = !state.outlineOnly; outBtn.classList.toggle('active', state.outlineOnly); });
    const mergeBtn = document.getElementById('mergeOverlapBtn');
    mergeBtn.addEventListener('click', () => { state.mergeOverlap = !state.mergeOverlap; mergeBtn.classList.toggle('active', state.mergeOverlap); });
    
    bindUI('globalSpin', 'globalSpin', parseInt, 'globalSpinVal');
    bindUI('charSpin', 'charSpin', parseInt, 'charSpinVal');
    bindUI('jitterSlider', 'jitter', parseInt, 'jitterVal');
    bindUI('jitterAmountSlider', 'jitterAmount', parseInt, 'jitterAmountVal');
    bindUI('slideAnimationSelect', 'slideAnimation', null);
    bindUI('moveSlider', 'moveSec', parseFloat, 'moveVal');
    bindUI('pauseSlider', 'pauseSec', parseFloat, 'pauseVal');
    bindUI('inertiaToggle', 'inertiaEnabled', null);
    bindUI('inertiaSlider', 'inertia', parseFloat, null);
    
    bindUI('psdX', 'psdX', parseInt);
    bindUI('psdY', 'psdY', parseInt);
    bindUI('psdScale', 'psdScale', parseFloat);
    
    // PSD Layer Parsing
    document.getElementById('psdInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const psd = window.agPsd.readPsd(event.target.result);
                state.psdLayers = [];
                // If it has children, extract layers. Otherwise use the main composite.
                if (psd.children && psd.children.length > 0) {
                    psd.children.forEach(layer => {
                        if (layer.canvas) {
                            state.psdLayers.push(layer.canvas);
                        }
                    });
                }
                // Fallback to composite if no individual canvases found
                if (state.psdLayers.length === 0 && psd.canvas) {
                    state.psdLayers.push(psd.canvas);
                }
            } catch (err) {
                console.error("PSD Error:", err);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // PSD Drag
    let isDragging = false;
    canvas.addEventListener('mousedown', () => isDragging = true);
    window.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || state.psdLayers.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        state.psdX += e.movementX * scaleX;
        state.psdY += e.movementY * scaleY;
        document.getElementById('psdX').value = state.psdX;
        document.getElementById('psdY').value = state.psdY;
    });
    
    bindUI('fluxusToggle', 'fluxusEnabled', null);
    bindUI('fluxusMode', 'fluxusMode', null);
    bindUI('glitchToggle', 'glitchEnabled', null);
    bindUI('glitchIntensity', 'glitchIntensity', parseInt, 'glitchIntensityVal');
    bindUI('rgbSplitToggle', 'rgbSplitEnabled', null);
    bindUI('rgbSplitDistanceSlider', 'rgbSplitDistance', parseInt, 'rgbSplitDistVal');
    bindUI('chaosToggle', 'chaosEnabled', null);
    bindUI('chaosMode', 'chaosMode', null);
    bindUI('chaosIntensity', 'chaosIntensity', parseInt, 'chaosIntensityVal');
    bindUI('chaosMix', 'chaosMix', parseInt, 'chaosMixVal');
    
    // SIZE CHAOS main toggle
    const chaosToggle = document.getElementById('chaosToggle');
    const chaosControls = document.getElementById('chaosControls');
    chaosToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            chaosControls.style.opacity = '1';
            chaosControls.style.pointerEvents = 'auto';
        } else {
            chaosControls.style.opacity = '0.5';
            chaosControls.style.pointerEvents = 'none';
        }
    });

    // GLITCH POP B
    bindUI('glitchPopBIntensitySlider', 'glitchPopBIntensity', parseInt, 'glitchPopBIntensityVal');
    bindUI('glitchPopBPixelSlider', 'glitchPopBPixelSize', parseInt, 'glitchPopBPixelVal');
    const glitchPopBToggle = document.getElementById('glitchPopBToggle');
    const panelChaosGlitchB = document.getElementById('panelChaosGlitchB');
    if (glitchPopBToggle) {
        glitchPopBToggle.addEventListener('change', (e) => {
            state.glitchPopBEnabled = e.target.checked;
            panelChaosGlitchB.style.display = e.target.checked ? 'flex' : 'none';
        });
    }
    bindUI('dustToggle', 'dustEnabled', null);
    bindUI('dustDensitySlider', 'dustDensity', parseInt, 'dustDensityVal');
    bindUI('dustSizeSlider', 'dustSize', parseFloat, 'dustSizeVal');
    bindUI('depthToggle', 'depthEnabled', null);
    bindUI('fpsSelect', 'fps', parseInt);
    
    document.getElementById('resetAllBtn').addEventListener('click', () => location.reload());

    // Dissolve Trigger
    document.getElementById('triggerSmokeBtn').addEventListener('click', () => {
        state.isDissolving = true;
        state.dissolveProgress = 0;
        state.dissolveType = document.getElementById('smokeTypeSelect').value;
        state.dissolveParticles = [];
        
        // If Sand Crumble, generate particles from current text frame
        if (state.dissolveType === 'sand') {
            generateSandParticles();
        }
    });

    document.getElementById('recordBtn').addEventListener('click', startRecording);
    document.getElementById('stopRecordBtn').addEventListener('click', stopRecording);
}

let mediaRecorder;
let recordedChunks = [];

function startRecording() {
    const stream = canvas.captureStream(state.fps);
    const options = { mimeType: 'video/webm;codecs=vp9' };
    
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        console.error('Exception while creating MediaRecorder:', e);
        try {
            mediaRecorder = new MediaRecorder(stream);
        } catch (e) {
            console.error('Failed to create MediaRecorder:', e);
            alert('Your browser does not support MediaRecorder API.');
            return;
        }
    }

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'motion_typography_export.webm';
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        recordedChunks = [];
        
        document.getElementById('recordBtn').textContent = 'START RECORDING';
    };

    recordedChunks = [];
    mediaRecorder.start();
    
    document.getElementById('recordBtn').textContent = 'RECORDING...';
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function easeOutBounce(x) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    else if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    else if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    else return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

function calculateSlideOffset(timeMs) {
    if (state.slideAnimation === 'none') return { x: 0, y: 0 };
    const moveMs = state.moveSec * 1000;
    const pauseMs = state.pauseSec * 1000;
    if (moveMs === 0) return { x: 0, y: 0 };

    let xOffset = 0;
    const screenW = canvas.width * 1.5;
    
    if (state.slideAnimation === 'continuous') {
        const cycle = moveMs;
        const p = (timeMs % cycle) / cycle;
        xOffset = -screenW + (p * screenW * 2);
    } else {
        const cycle = moveMs * 2 + pauseMs;
        const t = timeMs % cycle;
        let startX = 0, endX = 0, phase = 0, progress = 0;
        
        if (t < moveMs) { phase = 0; progress = t / moveMs; }
        else if (t < moveMs + pauseMs) { phase = 1; progress = 1; }
        else { phase = 2; progress = (t - moveMs - pauseMs) / moveMs; }

        if (state.inertiaEnabled && state.inertia > 0 && phase === 0) {
            const bounceWeight = Math.min(1, state.inertia / 3);
            progress = progress * (1 - bounceWeight) + easeOutBounce(progress) * bounceWeight;
        }
        if (state.inertiaEnabled && state.inertia > 0 && phase === 2) {
            progress = Math.pow(progress, 1 + state.inertia);
        }

        const mode = state.slideAnimation;
        if (mode === 'left-center-right') {
            if(phase===0){startX=-screenW;endX=0;} if(phase===1){startX=0;endX=0;} if(phase===2){startX=0;endX=screenW;}
        } else if (mode === 'right-center-left') {
            if(phase===0){startX=screenW;endX=0;} if(phase===1){startX=0;endX=0;} if(phase===2){startX=0;endX=-screenW;}
        } else if (mode === 'left-center-left') {
            if(phase===0){startX=-screenW;endX=0;} if(phase===1){startX=0;endX=0;} if(phase===2){startX=0;endX=-screenW;}
        } else if (mode === 'right-center-right') {
            if(phase===0){startX=screenW;endX=0;} if(phase===1){startX=0;endX=0;} if(phase===2){startX=0;endX=screenW;}
        }
        xOffset = startX + (endX - startX) * progress;
    }
    return { x: xOffset, y: 0 };
}

// --- Sand Particles Generator ---
function generateSandParticles() {
    offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
    // Draw current text/psd to offscreen
    renderCore(offCtx, true); // true = no background, just text
    
    const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
    const step = 4; // Particle resolution
    
    for(let y=0; y<offCanvas.height; y+=step) {
        for(let x=0; x<offCanvas.width; x+=step) {
            const idx = (y * offCanvas.width + x) * 4;
            if (imgData[idx+3] > 50) { // If visible
                state.dissolveParticles.push({
                    x: x - offCanvas.width/2, // relative to center
                    y: y - offCanvas.height/2,
                    vx: (Math.random() - 0.5) * 5,
                    vy: Math.random() * -5, // initial slight upward burst
                    color: `rgba(${imgData[idx]}, ${imgData[idx+1]}, ${imgData[idx+2]}, 1)`
                });
            }
        }
    }
}

function loop(timestamp) {
    requestAnimationFrame(loop);
    const frameInterval = 1000 / state.fps;
    const deltaTime = timestamp - lastFrameTime;

    if (deltaTime >= frameInterval) {
        lastFrameTime = timestamp - (deltaTime % frameInterval);
        frameCount++;
        
        if (state.isDissolving) {
            state.dissolveProgress += 0.05;
            if (state.dissolveProgress > 1.5) {
                state.isDissolving = false;
            }
        }
        
        // Glitch Pop B (Per-Char Mosaic)
        const isGlitchPopBActive = state.chaosEnabled && state.glitchPopBEnabled;
        if (isGlitchPopBActive) {
            const baseProb = state.glitchPopBIntensity / 100;
            glitchPopBActive = glitchPopBActive.filter(p => {
                p.framesLeft--;
                return p.framesLeft > 0;
            });
            if (Math.random() < (0.3 * baseProb)) {
                const words = state.text.split('\n');
                const numPops = Math.random() < 0.5 ? 1 : 2;
                for (let p = 0; p < numPops; p++) {
                    const lineIdx = Math.floor(Math.random() * words.length);
                    const charIdx = Math.floor(Math.random() * words[lineIdx].length);
                    const charKey = `${lineIdx}_${charIdx}`;
                    if (!glitchPopBActive.find(x => x.charKey === charKey)) {
                        const scale = Math.random() < 0.85
                            ? 1.5 + Math.random() * 2.0
                            : 0.15 + Math.random() * 0.25;
                        
                        // Force a pixel font
                        const font = glitchPopFonts[Math.floor(Math.random() * glitchPopFonts.length)];
                        
                        glitchPopBActive.push({
                            charKey, scale, font,
                            framesLeft: 2 + Math.floor(Math.random() * 3)
                        });
                    }
                }
            }
        } else {
            glitchPopBActive = [];
        }
        
        render();
    }
}

function render() {
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.dissolveType === 'water' && state.isDissolving) {
        // Water Grid: draw to offscreen, then draw back with sine distortion
        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        renderCore(offCtx, true);
        
        const prog = Math.min(1, state.dissolveProgress);
        const waveAmp = prog * 100;
        const waveFreq = 0.02 + (prog * 0.05);
        
        ctx.save();
        ctx.globalAlpha = 1 - prog;
        for(let y=0; y<canvas.height; y+=4) {
            const xOffset = Math.sin(y * waveFreq + (frameCount * 0.5)) * waveAmp;
            ctx.drawImage(offCanvas, 0, y, canvas.width, 4, xOffset, y, canvas.width, 4);
        }
        ctx.restore();
        
    } else if (state.dissolveType === 'sand' && state.isDissolving) {
        // Sand Crumble
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        state.dissolveParticles.forEach(p => {
            p.vy += 2; // Gravity
            p.x += p.vx;
            p.y += p.vy;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.restore();
        
    } else {
        renderCore(ctx, false);
    }

    applyPostEffects();
}

function renderCore(context, transparentBg) {
    if (!transparentBg && !(state.dissolveType === 'water' && state.isDissolving)) {
        // Background is already black in render()
    }

    const t = Date.now() - animationStartTime;
    const slide = calculateSlideOffset(t);

    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);

    // Global Slide
    context.translate(slide.x, slide.y);

    // Global Spin
    if (state.globalSpin !== 0) {
        context.rotate(state.globalSpin * Math.PI / 180);
    }

    // Jitter
    if (state.jitterAmount > 0) {
        const jx = (Math.random() - 0.5) * state.jitterAmount;
        const jy = (Math.random() - 0.5) * state.jitterAmount;
        context.translate(jx, jy);
    }
    
    // Pop Smoke Center Dissolve Physics
    if (state.isDissolving && state.dissolveType === 'pop_center') {
        const prog = Math.min(1, state.dissolveProgress);
        context.rotate(prog * Math.PI * 4); // Fast spin
        context.scale(1 - prog, 1 - prog);  // Shrink to center
    }

    // --- Render PSD Layer (Jitter) ---
    if (state.psdLayers.length > 0) {
        // Cycle layer every 3 frames for hand-drawn jitter feel
        const layerIndex = Math.floor(frameCount / 3) % state.psdLayers.length;
        const currentLayer = state.psdLayers[layerIndex];
        
        context.save();
        context.translate(state.psdX, state.psdY);
        context.scale(state.psdScale, state.psdScale);
        context.drawImage(currentLayer, -currentLayer.width / 2, -currentLayer.height / 2);
        context.restore();
    }

    // --- Render Text ---
    const isGlobalChaos = state.chaosEnabled && state.chaosMode === 'fontswap';
    
    // Global Chaos: decide ONE scale for the whole frame (occasionally huge)
    let globalChaosScale = 1.0;
    let globalChaosFont = null;
    if (isGlobalChaos) {
        if (Math.random() * 100 < state.chaosIntensity) {
            // Pop! entire text goes big
            globalChaosScale = 1.5 + Math.random() * 1.5; // 1.5x to 3x
            if (Math.random() * 100 < state.chaosMix) {
                globalChaosFont = chaosAccentFonts[Math.floor(Math.random() * chaosAccentFonts.length)];
            } else {
                globalChaosFont = chaosGothicFonts[Math.floor(Math.random() * chaosGothicFonts.length)];
            }
        }
    }

    let words = state.text.split('\n');
    let totalHeight = (words.length - 1) * (state.size * state.lineHeight);
    let startY = -totalHeight / 2;
    
    // Apply global scale to the entire text block this frame
    if (isGlobalChaos && globalChaosScale !== 1.0) {
        context.scale(globalChaosScale, globalChaosScale);
    }

    let wordFonts = [];
    let globalFont = null;
    if (state.fluxusEnabled) {
        if (state.fluxusMode === 'word') {
            for(let i=0; i<words.length; i++) {
                const seed = frameCount + i;
                wordFonts[i] = fluxusFonts[seed % fluxusFonts.length];
            }
        } else if (state.fluxusMode === 'global') {
            globalFont = fluxusFonts[frameCount % fluxusFonts.length];
        }
    }

    // (isAllChaos logic moved to top)
    
    // Font Swap mode: pick one font for ALL characters this frame
    let frameFontSwap = null;
    if (state.chaosEnabled && state.chaosMode === 'fontswap') {
        // Use MIX to decide whether to pick an accent font or gothic font for this frame
        if (Math.random() * 100 < state.chaosMix) {
            frameFontSwap = chaosAccentFonts[frameCount % chaosAccentFonts.length];
        } else {
            frameFontSwap = chaosGothicFonts[frameCount % chaosGothicFonts.length];
        }
    }

    // Step 1: Calculate Layout
    let charLayout = [];

    words.forEach((word, lineIndex) => {
        let chars = word.split('');
        let lineY = startY + (lineIndex * (state.size * state.lineHeight));
        
        let lineWidth = 0;
        let lineCharData = [];

        chars.forEach((c, i) => {
            let currentSize = state.size;
            let currentFont = state.fontFamily;
            
            // Fluxus Font Swap (Independent of chaos)
            if (state.fluxusEnabled) {
                if (state.fluxusMode === 'char') {
                    const seed = frameCount + i * 7 + lineIndex * 13;
                    currentFont = fluxusFonts[seed % fluxusFonts.length];
                } else if (state.fluxusMode === 'word') {
                    currentFont = wordFonts[lineIndex];
                } else if (state.fluxusMode === 'global') {
                    currentFont = globalFont;
                }
            }
            
            // Normal Size Chaos logic (Per Character)
            // Scale intensity so INT=100 means ~15% chance per char (about 1-2 chars in a typical word)
            const popChance = state.chaosIntensity * 0.15; 
            if (state.chaosEnabled && state.chaosMode === 'char' && Math.random() * 100 < popChance) {
                
                // Occasionally become tiny (20% chance of the pops)
                if (Math.random() < 0.2) {
                    currentSize = state.size * (0.2 + Math.random() * 0.3); // 0.2x ~ 0.5x
                } else {
                    // Otherwise become huge (up to 3.5x)
                    currentSize = state.size * (1.5 + Math.random() * 2.0); // 1.5x ~ 3.5x
                }
                
                // When Size Chaos triggers on a character, also swap its font
                if (Math.random() * 100 < state.chaosMix) {
                    currentFont = chaosAccentFonts[Math.floor(Math.random() * chaosAccentFonts.length)];
                } else {
                    currentFont = chaosGothicFonts[Math.floor(Math.random() * chaosGothicFonts.length)];
                }
            }
            
            // Font Swap mode: font changes EVERY frame, AND scales globally when popping
            if (frameFontSwap) {
                currentFont = frameFontSwap; // Overrides with the frame's uniform font
            }
            
            // Glitch Pop B (Per-Char Mosaic): check if this char is popping
            let isMosaicPop = false;
            let popObj = null;
            const isGlitchPopBActive = state.chaosEnabled && state.glitchPopBEnabled;
            if (isGlitchPopBActive) {
                const charKey = `${lineIndex}_${i}`;
                const pop = glitchPopBActive.find(p => p.charKey === charKey);
                if (pop) {
                    currentSize = state.size * pop.scale;
                    if (pop.font) {
                        currentFont = pop.font;
                    }
                    isMosaicPop = true;
                    popObj = pop;
                } else if (state.chaosMode === 'size' && (currentSize / state.size) > 1.2) {
                    // "なるべく、大きくなった文字がグリッチかかって欲しい"
                    const r = getRandom(`popb_size_${state.seed}_${lineIndex}_${i}_${Math.floor(Date.now() / 100)}`);
                    if (r < (state.glitchPopBIntensity / 100) * 5.0) { // Much higher chance for large characters
                        isMosaicPop = true;
                    }
                }
            }

            const fontParts = currentFont.split(' ');
            const fontWeight = fontParts[0];
            const fontFamilyStr = fontParts.slice(1).join(' ');
            const fontString = `${fontWeight} ${currentSize}px ${fontFamilyStr}`;
            
            context.font = fontString;
            const w = context.measureText(c).width + state.kerning;
            
            lineCharData.push({
                char: c,
                width: w,
                fontString: fontString,
                indexInWord: i,
                wordLength: chars.length,
                isMosaicPop: isMosaicPop,
                popObj: popObj
            });
            lineWidth += w;
        });
        
        let passCx = -lineWidth / 2;
        lineCharData.forEach(data => {
            let charX = passCx + data.width / 2;
            let charY = lineY;
            
            // Jitter
            if (state.chaosEnabled && state.jitterEnabled) {
                charX += (Math.random() - 0.5) * state.jitterIntensity;
                charY += (Math.random() - 0.5) * state.jitterIntensity;
            }
            
            // Pop Smoke Burst L/R Physics
            if (state.isDissolving && state.dissolveType === 'pop_burst') {
                const prog = Math.min(1, state.dissolveProgress);
                if (data.indexInWord < data.wordLength / 2) {
                    charX -= Math.pow(prog * 50, 2);
                } else {
                    charX += Math.pow(prog * 50, 2);
                }
            }
            
            charLayout.push({
                ...data,
                x: charX,
                y: charY
            });
            passCx += data.width;
        });
    });

    // Pre-pass: Generate mosaic images for glitch characters
    charLayout.forEach(data => {
        if (!data.isMosaicPop) return;
        
        // "intensity" controls the zaza shift amount and padding
        let intensity = state.glitchPopBIntensity;
        // If it's a specific pop object, scale intensity down as it fades out to reduce shift
        if (data.popObj && data.popObj.maxFrames) {
            const progress = 1.0 - (data.popObj.framesLeft / data.popObj.maxFrames);
            intensity = Math.max(2, Math.floor(state.glitchPopBIntensity - ((state.glitchPopBIntensity * 0.9) * progress)));
        }
        
        const sizeMatch = data.fontString.match(/(\d+(?:\.\d+)?)px/);
        const cSize = sizeMatch ? parseFloat(sizeMatch[1]) : state.size;
        
        const boxW = data.width + intensity * 4;
        const boxH = cSize * 2.5 + intensity * 4;
        
        // 1. Create blurred stroke and fill
        const tempStroke = document.createElement('canvas');
        tempStroke.width = boxW; tempStroke.height = boxH;
        const tsCtx = tempStroke.getContext('2d');
        tsCtx.font = data.fontString;
        tsCtx.textAlign = 'center'; tsCtx.textBaseline = 'middle'; tsCtx.lineJoin = 'round';
        // The block size uses Glitch Pop B's pixel slider
        const pSize = Math.max(2, state.glitchPopBPixelSize); 

        // Use a blur proportional to pSize to spread the alpha for stochastic dithering of the edges
        const strokeBlurAmount = Math.max(1, Math.floor(pSize / 3)); 
        tsCtx.filter = `blur(${strokeBlurAmount}px)`;
        const cx = boxW / 2; const cy = boxH / 2;
        if (state.outlineWidth > 0 || state.outlineOnly) {
            // Scale the outline width proportionally to the character's enlarged size
            // Scale the outline width proportionally, but ensure it is at least thick enough to survive downsampling
            tsCtx.lineWidth = Math.max(state.outlineWidth * (cSize / state.size), pSize * 0.4);
            tsCtx.strokeStyle = state.color;
            tsCtx.strokeText(data.char, cx, cy);
        }
        // If mergeOverlap is off, the final letter should be solid (not hollow). 
        // Thus, the stroke canvas must ALSO contain the fill!
        if (!state.outlineOnly && !state.mergeOverlap) {
            tsCtx.fillStyle = state.color;
            tsCtx.fillText(data.char, cx, cy);
        }

        // 2. Downscale into tiny canvas
        const tinyW = Math.max(1, Math.floor(boxW / pSize));
        const tinyH = Math.max(1, Math.floor(boxH / pSize));
        
        const tinyStroke = document.createElement('canvas');
        tinyStroke.width = tinyW; tinyStroke.height = tinyH;
        const tinyStrokeCtx = tinyStroke.getContext('2d');
        tinyStrokeCtx.drawImage(tempStroke, 0, 0, tinyW, tinyH);

        // 3. THRESHOLD PASS
        // For the stroke/final display, use STOCHASTIC DITHERING.
        // This converts anti-aliased edge pixels into scattered square dots ("チリチリ" effect)
        const applyStrokeThreshold = (ctx) => {
            const imgData = ctx.getImageData(0, 0, tinyW, tinyH);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const a = d[i + 3];
                if (a > 5) {
                    // Use alpha-based probability with a 1.5x boost.
                    // This ensures the solid interior remains 100% solid blocks,
                    // while the blurred edges become uniformly scattered dots without disappearing.
                    if (Math.random() * 255 < a * 1.5) {
                        d[i + 3] = 255;
                    } else {
                        d[i + 3] = 0;
                    }
                } else {
                    d[i + 3] = 0;
                }
            }
            ctx.putImageData(imgData, 0, 0);
        };
        
        applyStrokeThreshold(tinyStrokeCtx);

        // 4. Upscale back to final canvas with ZAZA horizontal shifting ("ザザっザザって")
        const finalStroke = document.createElement('canvas');
        finalStroke.width = boxW; finalStroke.height = boxH;
        const fsCtx = finalStroke.getContext('2d');
        fsCtx.imageSmoothingEnabled = false;

        // Shift height matches the pixel size, so we shift row by row of pixels!
        for (let tinyY = 0; tinyY < tinyH; tinyY++) {
            let shiftX = 0;
            // 70% chance to shift this row of pixels horizontally (breaks vertical lines)
            if (Math.random() < 0.7) { 
                // Random shift between -intensity and +intensity
                shiftX = (Math.random() - 0.5) * intensity * 2.0; 
            }

            const drawY = tinyY * pSize;
            
            // Draw this 1-pixel high row from the tiny canvas, stretched horizontally to boxW, vertically to pSize
            fsCtx.drawImage(tinyStroke, 0, tinyY, tinyW, 1, shiftX, drawY, boxW, pSize);
        }

        data.mosaicCanvas = finalStroke;
        data.mosaicBox = { w: boxW, h: boxH, tw: boxW, th: boxH };
    });

    // Step 2: Render All Passes
    const drawGlobalPass = (isFillPass, targetCtx) => {
        charLayout.forEach(data => {
            
            targetCtx.save();
            
            if (state.isDissolving && state.dissolveType === 'pop_burst') {
                targetCtx.globalAlpha = 1 - Math.min(1, state.dissolveProgress);
            }
            
            targetCtx.translate(data.x, data.y);
            if (state.charSpin !== 0) targetCtx.rotate(state.charSpin * Math.PI / 180);

            targetCtx.font = data.fontString;
            targetCtx.textAlign = 'center';
            targetCtx.textBaseline = 'middle';
            
            if (!isFillPass && state.depthEnabled) {
                targetCtx.fillStyle = '#333333';
                for(let d=1; d<=10; d++) targetCtx.fillText(data.char, d * 2, d * 2);
            }

            targetCtx.lineWidth = state.outlineWidth;
            targetCtx.strokeStyle = state.color;
            targetCtx.lineJoin = 'round';
            targetCtx.fillStyle = state.color;

            if (!isFillPass) {
                if (data.mosaicCanvas) {
                    targetCtx.imageSmoothingEnabled = false;
                    targetCtx.drawImage(data.mosaicCanvas, 0, 0, data.mosaicBox.tw, data.mosaicBox.th, -data.mosaicBox.w/2, -data.mosaicBox.h/2, data.mosaicBox.w, data.mosaicBox.h);
                    targetCtx.imageSmoothingEnabled = true;
                } else if (state.outlineWidth > 0 || state.outlineOnly) {
                    targetCtx.strokeText(data.char, 0, 0);
                }
            } else if (isFillPass && !state.outlineOnly) {
                if (state.mergeOverlap && state.outlineWidth > 0) {
                    targetCtx.globalCompositeOperation = 'destination-out';
                    // Always use the smooth text as the eraser to precisely hollow out the inside,
                    // allowing the scattered pixel dots on the outer boundary to survive unharmed.
                    targetCtx.fillText(data.char, 0, 0);
                    targetCtx.globalCompositeOperation = 'source-over';
                } else {
                    if (!data.mosaicCanvas) {
                        targetCtx.fillText(data.char, 0, 0);
                    } else if (!state.outlineOnly && !(state.mergeOverlap && state.outlineWidth > 0)) {
                        // If it's solid mosaic, it was already drawn entirely in the stroke pass!
                    }
                }
            }

            targetCtx.restore();
        });
    };

    if (state.rgbSplitEnabled) {
        rgbBaseCanvas.width = canvas.width;
        rgbBaseCanvas.height = canvas.height;
        rgbBaseCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Translate to match main context
        rgbBaseCtx.translate(canvas.width / 2, canvas.height / 2);
        
        drawGlobalPass(false, rgbBaseCtx); // Pass 1: Strokes
        drawGlobalPass(true, rgbBaseCtx);  // Pass 2: Fills / Cutouts
        
        rgbBaseCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        
        // Draw the cleanly merged base canvas to main context 3 times
        const dist = state.rgbSplitDistance;
        
        // Turn the base image into a solid color for each channel
        // Since the base is whatever `state.color` is (or transparent), we need to tint it!
        // The easiest way to tint an image is to draw a solid color rectangle with 'source-in'
        
        const tintAndDraw = (color, offsetX) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(rgbBaseCanvas, 0, 0);
            tempCtx.globalCompositeOperation = 'source-in';
            tempCtx.fillStyle = color;
            tempCtx.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(tempCanvas, offsetX, 0);
        };
        
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for direct drawing
        context.globalCompositeOperation = 'screen';
        tintAndDraw('blue', -dist);
        tintAndDraw('#00ff00', 0);
        tintAndDraw('red', dist);
        context.restore();
        
    } else {
        drawGlobalPass(false, context); // Pass 1
        drawGlobalPass(true, context);  // Pass 2
    }

    context.restore();
}

function drawTextWithGlitch(context, text, x, y) {
    const doOutline = state.outlineWidth > 0 || state.outlineOnly;
    const doFill = !state.outlineOnly;
    
    context.lineWidth = state.outlineWidth;
    context.strokeStyle = state.color;
    context.lineJoin = 'round';
    context.fillStyle = state.color;

    if (state.rgbSplitEnabled) {
        context.globalCompositeOperation = 'screen';
        context.fillStyle = 'red'; context.strokeStyle = 'red';
        if (doOutline) context.strokeText(text, x - 6, y);
        if (doFill) context.fillText(text, x - 6, y);
        
        context.fillStyle = 'cyan'; context.strokeStyle = 'cyan';
        if (doOutline) context.strokeText(text, x + 6, y);
        if (doFill) context.fillText(text, x + 6, y);
        context.globalCompositeOperation = 'source-over';
    } else {
        if (doOutline) context.strokeText(text, x, y);
        if (doFill) {
            if (state.mergeOverlap && state.outlineWidth > 0) {
                context.globalCompositeOperation = 'destination-out';
                context.fillText(text, x, y);
                context.globalCompositeOperation = 'source-over';
            } else {
                context.fillText(text, x, y);
            }
        }
    }
}

function applyPostEffects() {
    if (state.glitchEnabled) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const prob = state.glitchIntensity / 1000;
        const blockSize = Math.max(1, Math.floor(state.glitchIntensity / 2));
        
        for(let y=0; y<canvas.height; y+=blockSize) {
            if(Math.random() < prob) {
                const shift = Math.floor((Math.random() - 0.5) * 80);
                for(let by=0; by<blockSize; by++) {
                    if (y+by >= canvas.height) break;
                    let rowData = ctx.getImageData(0, y+by, canvas.width, 1);
                    ctx.putImageData(rowData, shift, y+by);
                }
            }
        }
    }

    if (state.dustEnabled) {
        for(let i=0; i<state.dustDensity; i++) {
            if (Math.random() < 0.1) {
                dustParticles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    s: Math.random() * state.dustSize * 4,
                    life: Math.random() * 5
                });
            }
        }
        
        ctx.fillStyle = '#FFFFFF';
        for(let i=dustParticles.length-1; i>=0; i--) {
            let p = dustParticles[i];
            ctx.beginPath();
            if (Math.random() > 0.5) {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + (Math.random()-0.5)*15*p.s, p.y + (Math.random()-0.5)*15*p.s);
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = p.s;
                ctx.stroke();
            } else {
                ctx.arc(p.x, p.y, p.s, 0, Math.PI*2);
                ctx.fill();
            }
            p.life--;
            if(p.life <= 0) dustParticles.splice(i, 1);
        }
    }
    
    // Add smoke particles if dissolving
    if (state.isDissolving && (state.dissolveType === 'pop_center' || state.dissolveType === 'pop_burst')) {
        for(let i=0; i<10; i++) {
            const px = canvas.width/2 + (Math.random()-0.5)*canvas.width;
            state.dissolveParticles.push({
                x: px,
                y: canvas.height/2 + (Math.random()-0.5)*canvas.height,
                s: Math.random() * 20 + 10,
                vx: state.dissolveType === 'pop_center' ? (canvas.width/2 - px)*0.1 : (Math.random()-0.5)*20,
                life: 1.0
            });
        }
        state.dissolveParticles.forEach(p => {
            if (state.dissolveType === 'pop_center') {
                p.x += (canvas.width/2 - p.x) * 0.1;
                p.y += (canvas.height/2 - p.y) * 0.1;
            } else {
                p.x += p.vx;
            }
            p.s *= 0.9;
            p.life -= 0.05;
            if (p.life > 0) {
                ctx.fillStyle = `rgba(255,255,255,${p.life})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.s, 0, Math.PI*2);
                ctx.fill();
            }
        });
    }
}

// Start app
initUI();
requestAnimationFrame(loop);
