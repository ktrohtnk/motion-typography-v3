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
    document.getElementById('transparentBgToggle').addEventListener('change', e => state.transparentBg = e.target.checked);
    document.getElementById('greenScreenBtn').addEventListener('click', () => {
        state.bgColor = '#00FF00';
        document.getElementById('bgColorInput').value = '#00FF00';
        state.transparentBg = false;
        document.getElementById('transparentBgToggle').checked = false;
    });
    
    bindUI('sizeSlider', 'size', parseInt, 'sizeBox');
    bindUI('kerningSlider', 'kerning', parseInt, 'kerningBox');
    bindUI('lineHeightSlider', 'lineHeight', parseFloat, 'lineHeightBox');
    bindUI('outlineWidthSlider', 'outlineWidth', parseInt, 'outlineWidthBox');
    
    const outlineBtn = document.getElementById('outlineOnlyBtn');
    outlineBtn.addEventListener('click', () => { 
        state.outlineOnly = !state.outlineOnly; 
        outlineBtn.classList.toggle('active', state.outlineOnly); 
    });
    
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
    document.getElementById('applyPsdBtn').addEventListener('click', () => {
        const fileInput = document.getElementById('psdInput');
        const file = fileInput.files[0];
        const btn = document.getElementById('applyPsdBtn');
        if (!file) {
            alert('PSDファイルが選択されていません。先にファイルを選んでください！');
            return;
        }
        
        btn.textContent = 'LOADING...';
        btn.disabled = true;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const psd = window.agPsd.readPsd(event.target.result);
                state.psdLayers = [];
                
                const extractCanvases = (layers) => {
                    layers.forEach(layer => {
                        if (layer.canvas && layer.canvas.width > 0 && layer.canvas.height > 0) {
                            state.psdLayers.push(layer.canvas);
                        }
                        if (layer.children && layer.children.length > 0) {
                            extractCanvases(layer.children);
                        }
                    });
                };
                
                if (psd.children && psd.children.length > 0) {
                    extractCanvases(psd.children);
                }
                
                if (state.psdLayers.length === 0 && psd.canvas && psd.canvas.width > 0 && psd.canvas.height > 0) {
                    state.psdLayers.push(psd.canvas);
                }
                
                if (state.psdLayers.length === 0) {
                    alert('PSDから有効なレイヤー（画像データ）を見つけられませんでした。');
                    btn.textContent = 'ERROR';
                    setTimeout(() => { btn.textContent = 'APPLY'; btn.disabled = false; }, 2000);
                    return;
                }
                
                alert(`PSDを読み込みました！ ${state.psdLayers.length} 枚のレイヤー（コマ）としてアニメーションします。`);
                
                btn.textContent = 'LOADED';
                setTimeout(() => { btn.textContent = 'APPLY'; btn.disabled = false; }, 2000);
            } catch (err) {
                console.error("PSD Error:", err);
                alert("PSDファイルの読み込みに失敗しました: " + err.message);
                btn.textContent = 'ERROR';
                setTimeout(() => { btn.textContent = 'APPLY'; btn.disabled = false; }, 2000);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // PSD & Object Drag (Mouse & Touch)
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const dragStart = (e) => {
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        lastX = clientX;
        lastY = clientY;
    };

    const dragEnd = () => { isDragging = false; };

    const dragMove = (e) => {
        if (!isDragging || state.psdLayers.length === 0) return;
        
        // Prevent default scrolling when dragging on canvas on mobile
        if (e.touches) {
            e.preventDefault();
        }
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const movementX = clientX - lastX;
        const movementY = clientY - lastY;
        lastX = clientX;
        lastY = clientY;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        state.psdX += movementX * scaleX;
        state.psdY += movementY * scaleY;
        document.getElementById('psdX').value = state.psdX;
        document.getElementById('psdY').value = state.psdY;
    };

    canvas.addEventListener('mousedown', dragStart);
    window.addEventListener('mouseup', dragEnd);
    canvas.addEventListener('mousemove', dragMove);

    canvas.addEventListener('touchstart', dragStart, { passive: false });
    window.addEventListener('touchend', dragEnd);
    canvas.addEventListener('touchmove', dragMove, { passive: false });
    
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
        
        // If Sand Crumble, Ash Blow, or Detergent Whirlpool, generate particles
        if (state.dissolveType === 'sand' || state.dissolveType === 'ash' || state.dissolveType === 'water') {
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
    let options = {};
    let ext = 'webm';
    let mime = 'video/webm';

    if (MediaRecorder.isTypeSupported('video/mp4')) {
        // Safari supports mp4, which is required for saving to iOS Camera Roll
        options = { mimeType: 'video/mp4' };
        ext = 'mp4';
        mime = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        options = { mimeType: 'video/webm;codecs=vp9' };
        ext = 'webm';
        mime = 'video/webm';
    } else {
        options = { mimeType: 'video/webm' };
        ext = 'webm';
        mime = 'video/webm';
    }
    
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
        console.error('Exception while creating MediaRecorder:', e);
        try {
            mediaRecorder = new MediaRecorder(stream);
        } catch (e3) {
            console.error('Failed to create MediaRecorder:', e3);
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
        const blob = new Blob(recordedChunks, { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = `motion_typography_export.${ext}`;
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

// --- Cinematic Easing Functions ---
// Smooth deceleration (sliding in) without overshoot
function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
// Smooth acceleration (sliding out) without anticipation
function easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}
// Realistic momentum/inertia (sliding in with overshoot)
function easeOutBack(x, overshoot) {
    const c3 = overshoot + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2);
}
// Realistic momentum/inertia (sliding out with anticipation)
function easeInBack(x, overshoot) {
    const c3 = overshoot + 1;
    return c3 * x * x * x - overshoot * x * x;
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

        // Apply extremely smooth cinematic easings instead of rigid linear movement
        if (phase === 0) {
            if (state.inertiaEnabled && state.inertia > 0) {
                progress = easeOutBack(progress, state.inertia * 1.2);
            } else {
                progress = easeOutExpo(progress);
            }
        } else if (phase === 2) {
            if (state.inertiaEnabled && state.inertia > 0) {
                progress = easeInBack(progress, state.inertia * 1.2);
            } else {
                progress = easeInExpo(progress);
            }
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
                
                // Collect all valid, visible character keys
                let visibleChars = [];
                words.forEach((word, lineIdx) => {
                    for (let charIdx = 0; charIdx < word.length; charIdx++) {
                        if (word[charIdx] !== ' ') {
                            visibleChars.push({ lineIdx, charIdx, key: `${lineIdx}_${charIdx}` });
                        }
                    }
                });

                if (visibleChars.length > 0) {
                    const numPops = Math.random() < 0.5 ? 1 : 2;
                    for (let p = 0; p < numPops; p++) {
                        if (!state.recentlyBugged) state.recentlyBugged = [];
                        
                        let candidates = visibleChars.filter(c => !glitchPopBActive.find(x => x.charKey === c.key));
                        let freshCandidates = candidates.filter(c => !state.recentlyBugged.includes(c.key));
                        
                        let chosen = null;
                        if (freshCandidates.length > 0) {
                            chosen = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
                        } else if (candidates.length > 0) {
                            chosen = candidates[Math.floor(Math.random() * candidates.length)];
                        }
                        
                        if (chosen) {
                            const scale = Math.random() < 0.85
                                ? 1.5 + Math.random() * 2.0
                                : 0.15 + Math.random() * 0.25;
                            
                            const font = glitchPopFonts[Math.floor(Math.random() * glitchPopFonts.length)];
                            
                            glitchPopBActive.push({
                                charKey: chosen.key, scale, font,
                                framesLeft: 2 // Exactly 2 frames!
                            });
                            
                            state.recentlyBugged.push(chosen.key);
                            if (state.recentlyBugged.length > 4) {
                                state.recentlyBugged.shift();
                            }
                        }
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
    if (state.transparentBg) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.backgroundColor = 'transparent';
    } else {
        ctx.fillStyle = state.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvas.style.backgroundColor = state.bgColor;
    }

    if (state.dissolveType === 'water' && state.isDissolving) {
        // Mist Dissolve (Crumble from bottom up, heavy initial drop, upward draft, fog dissipation)
        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        renderCore(offCtx, true); // Draw core text
        
        // Find the actual height of the text so it starts crumbling immediately from the bottom
        if (!state.waterMaxDist && state.dissolveParticles.length > 0) {
            let maxY = -Infinity;
            let minY = Infinity;
            state.dissolveParticles.forEach(p => {
                if (p.y > maxY) maxY = p.y;
                if (p.y < minY) minY = p.y;
            });
            state.waterMaxY = maxY + 10;
            state.waterMinY = minY - 10;
            state.waterHeight = state.waterMaxY - state.waterMinY;
        }
        
        // The mask shrinks vertically from bottom to top.
        const maskProg = Math.min(1, state.dissolveProgress / 1.2);
        // currentY represents the boundary line. Everything BELOW this line is erased.
        const currentY = state.waterMaxY - (state.waterHeight * maskProg);
        
        // Erase the bottom of the text smoothly
        offCtx.save();
        offCtx.globalCompositeOperation = 'destination-in';
        offCtx.filter = 'blur(15px)';
        
        if (maskProg < 1.0) {
            // Draw a rectangle from the top of the canvas down to currentY
            // Since currentY is relative to center, we map it to offCanvas coordinates
            offCtx.fillRect(
                0, 
                0, 
                offCanvas.width, 
                (offCanvas.height/2) + currentY
            );
        } else {
            // Guarantee all text is erased when mask finishes
            offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        }
        offCtx.restore();
        
        ctx.drawImage(offCanvas, 0, 0); // Draw the partially melted text
        
        // Draw the particles that broke off
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        
        state.dissolveParticles.forEach(p => {
            // Particle activates when the crumbling boundary passes its Y position
            if (p.y > currentY - 15) {
                if (!p.active) {
                    p.active = true;
                    // "もっと重力を感じる" - Initial heavy drop down
                    p.vy = 1.0 + Math.random() * 1.5; 
                    p.vx = (Math.random() - 0.5) * 1.5;
                    p.life = 0;
                    p.swayOffset = Math.random() * Math.PI * 2;
                }
                
                p.life += 0.012; // Fade over time
                
                // Sway gently left and right
                p.vx += Math.sin(p.life * 15 + p.swayOffset) * 0.04; 
                
                // "舞い上がって空気に溶け込んでいく" - Strong updraft catches the heavy particles
                p.vy -= 0.15; 
                
                // Fluid resistance
                p.vx *= 0.97;
                p.vy *= 0.97;
                
                p.x += p.vx;
                p.y += p.vy;
                
                const alpha = Math.max(0, 1 - p.life);
                if (alpha > 0) {
                    // "霧散して消えて欲しい" - Soft, highly transparent misty blob
                    ctx.globalAlpha = Math.pow(alpha, 1.5) * 0.6; 
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    // Expands significantly from 2px to ~15px to look like dissipating fog
                    ctx.arc(p.x, p.y, 2 + p.life * 15, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        });
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
        
    } else if (state.dissolveType === 'ash' && state.isDissolving) {
        // Ash Blow (Upward Wind)
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        
        state.dissolveParticles.forEach(p => {
            // Wind acceleration upwards and slightly to the right
            p.vy -= (0.5 + Math.random() * 0.8); 
            p.vx += (Math.random() - 0.4) * 0.6;
            
            p.x += p.vx;
            p.y += p.vy;
            
            // Optional: gradually shrink or fade
            const alpha = Math.max(0, 1.0 - (state.dissolveProgress / 1.5));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 3, 3);
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
        // Cycle layer every 5 frames for hand-drawn jitter feel (12fps style playback at 60fps)
        const layerIndex = Math.floor(frameCount / 5) % state.psdLayers.length;
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
                } else if ((currentSize / state.size) > 1.2) {
                    // "大きくなった文字が必ずピクセル化"
                    isMosaicPop = true;
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
        
        // The block size uses Glitch Pop B's pixel slider
        const pSize = Math.max(2, state.glitchPopBPixelSize); 

        const tinyW = Math.max(1, Math.floor(boxW / pSize));
        const tinyH = Math.max(1, Math.floor(boxH / pSize));
        // Reduce blur amount significantly so we get a tight glitch edge instead of a massive cloud of noise pixels
        const blurAmount = Math.max(pSize, intensity * 0.3);
        const cx = boxW / 2; const cy = boxH / 2;

        // Threshold function to ensure NO semi-transparent dots exist (全てベタ).
        // Converts soft blurred alpha into a solid, noisy dithered edge (zaza noise),
        // while guaranteeing the core skeletal structure remains perfectly solid.
        const makeSolidDots = (tinyCanvas) => {
            const ctx = tinyCanvas.getContext('2d');
            const imgData = ctx.getImageData(0, 0, tinyW, tinyH);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const a = d[i + 3];
                if (a === 255) {
                    d[i + 3] = 255;
                } else if (a > 0) {
                    d[i + 3] = (Math.random() * 255 < a) ? 255 : 0;
                }
            }
            ctx.putImageData(imgData, 0, 0);
        };

        // 1. Generate Mosaic Stroke
        if (state.outlineWidth > 0 || state.outlineOnly) {
            const tempStroke = document.createElement('canvas');
            tempStroke.width = boxW; tempStroke.height = boxH;
            const tsCtx = tempStroke.getContext('2d');
            tsCtx.font = data.fontString;
            tsCtx.textAlign = 'center'; tsCtx.textBaseline = 'middle'; tsCtx.lineJoin = 'round';
            tsCtx.strokeStyle = state.color;
            
            // Guarantee the stroke extends outward by at least pSize (1 pixel block), otherwise it vanishes when subtracted!
            const glitchLineWidth = Math.max(state.outlineWidth, state.outlineWidth * Math.sqrt(cSize / state.size), pSize * 2);
            
            // Step 1: Draw the heavily blurred halo (using the glitch line width)
            tsCtx.lineWidth = glitchLineWidth;
            tsCtx.filter = `blur(${blurAmount}px)`;
            tsCtx.strokeText(data.char, cx, cy);
            
            // Step 2: Draw the unblurred core exactly on top (using the exact same glitch line width!)
            tsCtx.lineWidth = glitchLineWidth;
            tsCtx.filter = 'none';
            tsCtx.strokeText(data.char, cx, cy);

            const tinyStroke = document.createElement('canvas');
            tinyStroke.width = tinyW; tinyStroke.height = tinyH;
            tinyStroke.getContext('2d').drawImage(tempStroke, 0, 0, tinyW, tinyH);
            makeSolidDots(tinyStroke); // Force all dots to be 100% solid (ベタ)
            data.mosaicStroke = tinyStroke;
        }

        // 2. Generate Mosaic Fill
        const tempFill = document.createElement('canvas');
        tempFill.width = boxW; tempFill.height = boxH;
        const tfCtx = tempFill.getContext('2d');
        tfCtx.font = data.fontString;
        tfCtx.textAlign = 'center'; tfCtx.textBaseline = 'middle'; tfCtx.lineJoin = 'round';
        tfCtx.fillStyle = state.color;

        // Step 1: Draw the heavily blurred halo
        tfCtx.filter = `blur(${blurAmount}px)`;
        tfCtx.fillText(data.char, cx, cy);

        // Step 2: Draw the unblurred core exactly on top
        tfCtx.filter = 'none';
        tfCtx.fillText(data.char, cx, cy);

        const tinyFill = document.createElement('canvas');
        tinyFill.width = tinyW; tinyFill.height = tinyH;
        tinyFill.getContext('2d').drawImage(tempFill, 0, 0, tinyW, tinyH);
        makeSolidDots(tinyFill); // Force all dots to be 100% solid (ベタ)
        data.mosaicFill = tinyFill;

        data.mosaicBox = { w: boxW, h: boxH, tw: tinyW, th: tinyH };
    });

    // Step 2: Render All Passes
    const drawGlobalPass = (isFillPass, targetCtx) => {
        charLayout.forEach(data => {
            
            targetCtx.save();
            
            targetCtx.translate(Math.round(data.x), Math.round(data.y));
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
                if (data.mosaicStroke) {
                    targetCtx.imageSmoothingEnabled = false;
                    const mw = Math.round(data.mosaicBox.w);
                    const mh = Math.round(data.mosaicBox.h);
                    targetCtx.drawImage(data.mosaicStroke, 0, 0, data.mosaicBox.tw, data.mosaicBox.th, Math.round(-mw/2), Math.round(-mh/2), mw, mh);
                    targetCtx.imageSmoothingEnabled = true;
                } else if (state.outlineWidth > 0 || state.outlineOnly) {
                    targetCtx.strokeText(data.char, 0, 0);
                }
            } else if (isFillPass) {
                if (state.outlineOnly) {
                    targetCtx.globalCompositeOperation = 'destination-out';
                    if (data.mosaicFill) {
                        targetCtx.imageSmoothingEnabled = false;
                        const mw = Math.round(data.mosaicBox.w);
                        const mh = Math.round(data.mosaicBox.h);
                        targetCtx.drawImage(data.mosaicFill, 0, 0, data.mosaicBox.tw, data.mosaicBox.th, Math.round(-mw/2), Math.round(-mh/2), mw, mh);
                        targetCtx.imageSmoothingEnabled = true;
                    } else {
                        targetCtx.fillText(data.char, 0, 0);
                    }
                    targetCtx.globalCompositeOperation = 'source-over';
                } else {
                    if (data.mosaicFill) {
                        targetCtx.imageSmoothingEnabled = false;
                        const mw = Math.round(data.mosaicBox.w);
                        const mh = Math.round(data.mosaicBox.h);
                        targetCtx.drawImage(data.mosaicFill, 0, 0, data.mosaicBox.tw, data.mosaicBox.th, Math.round(-mw/2), Math.round(-mh/2), mw, mh);
                        targetCtx.imageSmoothingEnabled = true;
                    } else {
                        targetCtx.fillText(data.char, 0, 0);
                    }
                }
            }

            targetCtx.restore();
        });
    };

    // When outlineOnly is true, we want transparent fills that punch out the overlapping strokes.
    // To prevent punching a hole in the canvas background, we must draw to a temporary canvas first.
    let targetCtxPass = context;
    let tempTextCanvas = null;
    let tempTextCtx = null;
    
    if (state.outlineOnly) {
        tempTextCanvas = document.createElement('canvas');
        tempTextCanvas.width = canvas.width;
        tempTextCanvas.height = canvas.height;
        tempTextCtx = tempTextCanvas.getContext('2d');
        // Inherit all transforms (slide, spin, jitter, etc.) from the main context
        tempTextCtx.setTransform(context.getTransform());
        
        targetCtxPass = tempTextCtx;
    }

    if (state.rgbSplitEnabled) {
        rgbBaseCanvas.width = canvas.width;
        rgbBaseCanvas.height = canvas.height;
        rgbBaseCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Inherit all transforms (slide, spin, jitter, etc.) from the main context
        rgbBaseCtx.setTransform(context.getTransform());
        
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
        // Reset transform to draw tempCanvas at 0,0 relative to the shifted coordinate system
        context.setTransform(1, 0, 0, 1, 0, 0); 
        
        // We MUST apply the slide here, so the already-tinted full canvas shifts off-screen smoothly 
        // without its internal pixels being clipped by the rgbBaseCanvas boundaries!
        context.translate(slide.x, slide.y);
        
        context.globalCompositeOperation = 'screen';
        tintAndDraw('blue', -dist);
        tintAndDraw('#00ff00', 0);
        tintAndDraw('red', dist);
        context.restore();
        
    } else {
        drawGlobalPass(false, targetCtxPass); // Pass 1
        drawGlobalPass(true, targetCtxPass);  // Pass 2
        
        if (state.outlineOnly) {
            // Draw the composited text layer back to main context
            // We must reset transform on context because tempTextCanvas is full size and already transformed
            context.save();
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.drawImage(tempTextCanvas, 0, 0);
            context.restore();
        }
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
