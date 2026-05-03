document.addEventListener('DOMContentLoaded', () => {
    // State
    let selectedImages = []; // Stores { id, file, originalDataUrl, dataUrl, width, height, text, showBg, bgGradientIdx, bgOpacity, fontFamily, fontSize, vAlign, hAlign, showSettings }
    let cropper = null;
    let currentCropId = null;

    // Constants
    const fontOptions = ['Inter', 'Noto Sans TC', 'Arial', 'Verdana', 'Georgia', 'Courier New'];
    const gradientPresets = [
        { name: '晨曦紫', v1: '#6366f1', v2: '#a855f7' },
        { name: '深海藍', v1: '#1e3a8a', v2: '#3b82f6' },
        { name: '夕陽紅', v1: '#f43f5e', v2: '#fb923c' },
        { name: '森林綠', v1: '#065f46', v2: '#10b981' },
        { name: '金屬灰', v1: '#374151', v2: '#9ca3af' }
    ];

    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-images-btn');
    const resultPanel = document.getElementById('result-panel');
    const resultGif = document.getElementById('result-gif');
    const downloadLink = document.getElementById('download-link');
    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    
    // Crop elements
    const cropModal = document.getElementById('crop-modal');
    const cropImage = document.getElementById('crop-image');
    const closeCropBtn = document.getElementById('close-crop-btn');
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    const saveCropBtn = document.getElementById('save-crop-btn');
    
    // Settings elements
    const frameDurationInput = document.getElementById('frame-duration');
    const aspectRatioSelect = document.getElementById('aspect-ratio');
    const outputWidthInput = document.getElementById('output-width');

    // Drag and Drop Events for landing zone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
        fileInput.value = '';
    }

    function handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        let loadedCount = 0;
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const tempImg = new Image();
                tempImg.onload = () => {
                    const id = 'img_' + Math.random().toString(36).substr(2, 9);
                    selectedImages.push({
                        id: id,
                        file: file,
                        originalDataUrl: dataUrl,
                        dataUrl: dataUrl,
                        width: tempImg.naturalWidth,
                        height: tempImg.naturalHeight,
                        text: '',
                        showBg: true,
                        bgGradientIdx: 0,
                        bgOpacity: 0.8,
                        fontFamily: 'Inter',
                        fontSize: 40,
                        vAlign: 'bottom',
                        hAlign: 'center',
                        showSettings: false
                    });
                    
                    loadedCount++;
                    if (loadedCount === imageFiles.length) {
                        const maxWidth = Math.max(...selectedImages.map(img => img.width));
                        if (maxWidth > 0) outputWidthInput.value = maxWidth;
                        updateUI();
                    }
                };
                tempImg.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });
    }

    // Drag and Drop Reordering Handlers
    let draggedId = null;

    function handleImgDragStart(e) {
        draggedId = this.dataset.id;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleImgDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleImgDrop(e) {
        e.preventDefault();
        const targetId = this.dataset.id;
        if (draggedId && draggedId !== targetId) {
            const fromIndex = selectedImages.findIndex(img => img.id === draggedId);
            const toIndex = selectedImages.findIndex(img => img.id === targetId);
            
            const [movedItem] = selectedImages.splice(fromIndex, 1);
            selectedImages.splice(toIndex, 0, movedItem);
            updateUI();
        }
    }

    function handleImgDragEnd() {
        this.classList.remove('dragging');
        draggedId = null;
    }

    function removeImage(id) {
        selectedImages = selectedImages.filter(img => img.id !== id);
        updateUI();
    }

    clearBtn.addEventListener('click', () => {
        selectedImages = [];
        updateUI();
    });

    function updateUI() {
        previewContainer.innerHTML = '';
        
        selectedImages.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'thumbnail-item';
            item.draggable = true;
            item.dataset.id = img.id;
            
            // Drag listeners
            item.addEventListener('dragstart', handleImgDragStart);
            item.addEventListener('dragover', handleImgDragOver);
            item.addEventListener('drop', handleImgDrop);
            item.addEventListener('dragend', handleImgDragEnd);

            const wrapper = document.createElement('div');
            wrapper.className = 'thumbnail-wrapper';
            
            const imageEl = document.createElement('img');
            imageEl.src = img.dataUrl;
            
            const numBadge = document.createElement('div');
            numBadge.className = 'thumbnail-index';
            numBadge.textContent = index + 1;

            const sizeBadge = document.createElement('div');
            sizeBadge.className = 'thumbnail-size';
            sizeBadge.textContent = `${img.width} x ${img.height}`;
            
            const rmBtn = document.createElement('button');
            rmBtn.className = 'thumbnail-remove';
            rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            rmBtn.onclick = (e) => { e.stopPropagation(); removeImage(img.id); };

            const cropBtn = document.createElement('button');
            cropBtn.className = 'thumbnail-crop';
            cropBtn.innerHTML = '<i class="fa-solid fa-crop"></i>';
            cropBtn.onclick = (e) => { e.stopPropagation(); openCropper(img.id); };
            
            wrapper.appendChild(imageEl);
            wrapper.appendChild(numBadge);
            wrapper.appendChild(sizeBadge);
            wrapper.appendChild(cropBtn);
            wrapper.appendChild(rmBtn);

            // Frame Controls
            const controls = document.createElement('div');
            controls.className = 'frame-controls';

            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'frame-text-input';
            textInput.placeholder = '輸入文字...';
            textInput.value = img.text;
            textInput.oninput = (e) => { img.text = e.target.value; };

            const settingsToggle = document.createElement('button');
            settingsToggle.className = 'frame-settings-toggle';
            settingsToggle.innerHTML = `<i class="fa-solid fa-palette"></i> 文字樣式設定`;
            settingsToggle.onclick = () => {
                img.showSettings = !img.showSettings;
                updateUI();
            };

            controls.appendChild(textInput);
            controls.appendChild(settingsToggle);

            if (img.showSettings) {
                const sPanel = document.createElement('div');
                sPanel.className = 'frame-settings-panel';

                // Font Family
                const gFont = document.createElement('div');
                gFont.className = 'settings-group';
                gFont.innerHTML = '<label>字體</label>';
                const fontSel = document.createElement('select');
                fontOptions.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = opt.textContent = f;
                    if (f === img.fontFamily) opt.selected = true;
                    fontSel.appendChild(opt);
                });
                fontSel.onchange = (e) => { img.fontFamily = e.target.value; };
                gFont.appendChild(fontSel);

                // Font Size
                const gSize = document.createElement('div');
                gSize.className = 'settings-group';
                gSize.innerHTML = '<label>大小 (px)</label>';
                const sizeInp = document.createElement('input');
                sizeInp.type = 'number';
                sizeInp.value = img.fontSize;
                sizeInp.oninput = (e) => { img.fontSize = parseInt(e.target.value) || 20; };
                gSize.appendChild(sizeInp);

                // Alignment
                const gAlign = document.createElement('div');
                gAlign.className = 'settings-group';
                gAlign.innerHTML = '<label>對齊位置</label>';
                const alignGrid = document.createElement('div');
                alignGrid.className = 'alignment-grid';
                const vSel = document.createElement('select');
                [['top','上方'],['middle','中央'],['bottom','下方']].forEach(([v,l]) => {
                    const opt = document.createElement('option'); opt.value = v; opt.textContent = l;
                    if (v === img.vAlign) opt.selected = true; vSel.appendChild(opt);
                });
                vSel.onchange = (e) => { img.vAlign = e.target.value; };
                const hSel = document.createElement('select');
                [['left','靠左'],['center','置中'],['right','靠右']].forEach(([h,l]) => {
                    const opt = document.createElement('option'); opt.value = h; opt.textContent = l;
                    if (h === img.hAlign) opt.selected = true; hSel.appendChild(opt);
                });
                hSel.onchange = (e) => { img.hAlign = e.target.value; };
                alignGrid.appendChild(vSel); alignGrid.appendChild(hSel);
                gAlign.appendChild(alignGrid);

                // Gradient Preset
                const gGrad = document.createElement('div');
                gGrad.className = 'settings-group';
                gGrad.innerHTML = '<label>背景漸層</label>';
                const gradSel = document.createElement('select');
                gradientPresets.forEach((g, i) => {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = g.name;
                    if (i === img.bgGradientIdx) opt.selected = true;
                    gradSel.appendChild(opt);
                });
                gradSel.onchange = (e) => { img.bgGradientIdx = parseInt(e.target.value); };
                gGrad.appendChild(gradSel);

                // Opacity
                const gAlpha = document.createElement('div');
                gAlpha.className = 'settings-group';
                gAlpha.innerHTML = `<label>透明度 (${img.bgOpacity})</label>`;
                const alphaInp = document.createElement('input');
                alphaInp.type = 'range';
                alphaInp.min = 0; alphaInp.max = 1; alphaInp.step = 0.1;
                alphaInp.value = img.bgOpacity;
                alphaInp.oninput = (e) => { 
                    img.bgOpacity = parseFloat(e.target.value); 
                    gAlpha.querySelector('label').textContent = `透明度 (${img.bgOpacity})`;
                };
                gAlpha.appendChild(alphaInp);

                // Toggle BG
                const gShowBg = document.createElement('div');
                gShowBg.className = 'settings-group';
                gShowBg.style.flexDirection = 'row';
                gShowBg.style.alignItems = 'center';
                gShowBg.style.justifyContent = 'space-between';
                gShowBg.innerHTML = '<label>顯示背景</label>';
                const bgToggle = document.createElement('input');
                bgToggle.type = 'checkbox';
                bgToggle.checked = img.showBg;
                bgToggle.onchange = (e) => { img.showBg = e.target.checked; };
                gShowBg.appendChild(bgToggle);

                // Apply to All
                const applyAllBtn = document.createElement('button');
                applyAllBtn.className = 'btn-apply-all';
                applyAllBtn.innerHTML = '<i class="fa-solid fa-copy"></i> 此樣式套用全體';
                applyAllBtn.onclick = () => {
                    selectedImages.forEach(t => {
                        t.showBg = img.showBg; t.bgGradientIdx = img.bgGradientIdx;
                        t.bgOpacity = img.bgOpacity; t.fontFamily = img.fontFamily;
                        t.fontSize = img.fontSize; t.vAlign = img.vAlign; t.hAlign = img.hAlign;
                    });
                    updateUI();
                };

                sPanel.appendChild(gFont);
                sPanel.appendChild(gSize);
                sPanel.appendChild(gAlign);
                sPanel.appendChild(gGrad);
                sPanel.appendChild(gAlpha);
                sPanel.appendChild(gShowBg);
                sPanel.appendChild(applyAllBtn);
                controls.appendChild(sPanel);
            }

            item.appendChild(wrapper);
            item.appendChild(controls);
            previewContainer.appendChild(item);
        });

        if (selectedImages.length > 0) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `<i class="fa-solid fa-film"></i> 產生 GIF (${selectedImages.length} 張圖片)`;
            clearBtn.style.display = 'inline-flex';
        } else {
            generateBtn.disabled = true;
            generateBtn.innerHTML = `<i class="fa-solid fa-film"></i> 產生 GIF`;
            clearBtn.style.display = 'none';
        }
    }

    // Cropper Logic
    function openCropper(id) {
        const imgObj = selectedImages.find(img => img.id === id);
        if (!imgObj) return;
        
        currentCropId = id;
        cropModal.classList.remove('hidden');
        cropImage.src = imgObj.originalDataUrl;
        
        const ratioStr = aspectRatioSelect.value;
        const [rW, rH] = ratioStr.split(':').map(Number);
        if (cropper) cropper.destroy();

        cropper = new Cropper(cropImage, {
            aspectRatio: rW / rH,
            viewMode: 1,
            background: false,
            zoomable: true,
            rotatable: true,
            guides: true,
        });
    }

    function closeCropper() {
        cropModal.classList.add('hidden');
        if (cropper) { cropper.destroy(); cropper = null; }
        currentCropId = null;
    }

    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');

    rotateLeftBtn.addEventListener('click', () => {
        if (cropper) cropper.rotate(-90);
    });

    rotateRightBtn.addEventListener('click', () => {
        if (cropper) cropper.rotate(90);
    });

    closeCropBtn.addEventListener('click', closeCropper);
    cancelCropBtn.addEventListener('click', closeCropper);

    saveCropBtn.addEventListener('click', () => {
        if (!cropper || !currentCropId) return;
        const canvas = cropper.getCroppedCanvas({ imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
        if (canvas) {
            const croppedUrl = canvas.toDataURL('image/png');
            const imgIndex = selectedImages.findIndex(img => img.id === currentCropId);
            if (imgIndex !== -1) {
                selectedImages[imgIndex].dataUrl = croppedUrl;
                selectedImages[imgIndex].width = canvas.width;
                selectedImages[imgIndex].height = canvas.height;
                updateUI();
            }
        }
        closeCropper();
    });

    // Drawing helper
    function drawStyledText(ctx, text, style, canvasWidth, canvasHeight) {
        if (!text) return;
        ctx.font = `${style.fontSize}px "${style.fontFamily}", sans-serif`;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = style.fontSize;
        
        const px = 24; const py = 12;
        const bgW = textWidth + px * 2;
        const bgH = textHeight + py * 2;
        
        // Horizontal
        let bgX;
        if (style.hAlign === 'left') bgX = 20;
        else if (style.hAlign === 'right') bgX = canvasWidth - bgW - 20;
        else bgX = (canvasWidth - bgW) / 2;

        // Vertical
        let bgY;
        if (style.vAlign === 'top') bgY = 20;
        else if (style.vAlign === 'middle') bgY = (canvasHeight - bgH) / 2;
        else bgY = canvasHeight - bgH - 40;

        if (style.showBg) {
            ctx.save();
            ctx.globalAlpha = style.bgOpacity;
            const radius = 15;
            ctx.beginPath();
            ctx.moveTo(bgX + radius, bgY);
            ctx.lineTo(bgX + bgW - radius, bgY);
            ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + radius);
            ctx.lineTo(bgX + bgW, bgY + bgH - radius);
            ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - radius, bgY + bgH);
            ctx.lineTo(bgX + radius, bgY + bgH);
            ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - radius);
            ctx.lineTo(bgX, bgY + radius);
            ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
            ctx.closePath();

            const preset = gradientPresets[style.bgGradientIdx];
            const gradient = ctx.createLinearGradient(bgX, bgY, bgX + bgW, bgY + bgH);
            gradient.addColorStop(0, preset.v1);
            gradient.addColorStop(1, preset.v2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();
        }

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(text, bgX + bgW/2, bgY + bgH/2);
    }

    async function preprocessFrame(imgObj, targetWidth, targetHeight) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                const imgRatio = img.width / img.height;
                const targetRatio = targetWidth / targetHeight;
                let dW, dH, dX, dY;
                if (imgRatio > targetRatio) {
                    dH = targetHeight; dW = targetHeight * imgRatio;
                    dX = (targetWidth - dW) / 2; dY = 0;
                } else {
                    dW = targetWidth; dH = targetWidth / imgRatio;
                    dX = 0; dY = (targetHeight - dH) / 2;
                }
                ctx.drawImage(img, dX, dY, dW, dH);
                if (imgObj.text) drawStyledText(ctx, imgObj.text, imgObj, targetWidth, targetHeight);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = imgObj.dataUrl;
        });
    }

    // Generate GIF
    generateBtn.addEventListener('click', async () => {
        if (selectedImages.length === 0) return;
        const durationSec = parseFloat(frameDurationInput.value) || 2;
        const width = parseInt(outputWidthInput.value) || 800;
        const ratioStr = aspectRatioSelect.value;
        const [rW, rH] = ratioStr.split(':').map(Number);
        const height = Math.round(width * (rH / rW));

        loadingOverlay.classList.remove('hidden');
        progressBar.style.width = '0%';
        resultPanel.classList.add('hidden');

        const processedImages = [];
        for (let i = 0; i < selectedImages.length; i++) {
            const dataUrl = await preprocessFrame(selectedImages[i], width, height);
            processedImages.push(dataUrl);
            progressBar.style.width = Math.round(((i + 1) / selectedImages.length) * 30) + '%';
        }

        gifshot.createGIF({
            images: processedImages,
            interval: durationSec, 
            gifWidth: width,
            gifHeight: height,
            sampleInterval: 10,
            numWorkers: 2,
            progressCallback: (p) => {
                progressBar.style.width = (30 + Math.round(p * 70)) + '%';
            }
        }, (obj) => {
            loadingOverlay.classList.add('hidden');
            if(!obj.error) {
                resultGif.src = obj.image;
                downloadLink.href = obj.image;
                resultPanel.classList.remove('hidden');
                resultPanel.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('生成錯誤: ' + obj.errorCode);
            }
        });
    });
});
