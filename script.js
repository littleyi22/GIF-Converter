document.addEventListener('DOMContentLoaded', () => {
    // State
    let selectedImages = []; // Stores { id, file, originalDataUrl, dataUrl }
    let cropper = null;
    let currentCropId = null;

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

    // Drag and Drop Events
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
        // Reset input so the same files can be selected again if removed
        fileInput.value = '';
    }

    function handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) return;

        // Process each file
        let loadedCount = 0;
        
        imageFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
                selectedImages.push({
                    id: id,
                    file: file,
                    originalDataUrl: e.target.result,
                    dataUrl: e.target.result
                });
                
                loadedCount++;
                if (loadedCount === imageFiles.length) {
                    updateUI();
                }
            };
            reader.readAsDataURL(file);
        });
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
        // Clear preview
        previewContainer.innerHTML = '';
        
        // Render thumbnails
        selectedImages.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'thumbnail-wrapper';
            
            const imageEl = document.createElement('img');
            imageEl.src = img.dataUrl;
            
            const numBadge = document.createElement('div');
            numBadge.className = 'thumbnail-index';
            numBadge.textContent = index + 1;
            
            const rmBtn = document.createElement('button');
            rmBtn.className = 'thumbnail-remove';
            rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            rmBtn.onclick = () => removeImage(img.id);

            const cropBtn = document.createElement('button');
            cropBtn.className = 'thumbnail-crop';
            cropBtn.innerHTML = '<i class="fa-solid fa-crop"></i>';
            cropBtn.onclick = () => openCropper(img.id);
            
            wrapper.appendChild(imageEl);
            wrapper.appendChild(numBadge);
            wrapper.appendChild(cropBtn);
            wrapper.appendChild(rmBtn);
            
            previewContainer.appendChild(wrapper);
        });

        // Toggle buttons
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
        
        // Show modal
        cropModal.classList.remove('hidden');
        
        // Initialize image
        cropImage.src = imgObj.originalDataUrl;
        
        // Calculate aspect ratio
        const ratioStr = aspectRatioSelect.value;
        const [rW, rH] = ratioStr.split(':').map(Number);
        const targetRatio = rW / rH;

        // Destroy previous cropper if exists
        if (cropper) {
            cropper.destroy();
        }

        // Initialize Cropper
        cropper = new Cropper(cropImage, {
            aspectRatio: targetRatio,
            viewMode: 1, // Restrict crop box to not exceed size of canvas
            background: false,
            zoomable: true,
            rotatable: false,
            guides: true,
        });
    }

    function closeCropper() {
        cropModal.classList.add('hidden');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        currentCropId = null;
    }

    closeCropBtn.addEventListener('click', closeCropper);
    cancelCropBtn.addEventListener('click', closeCropper);

    saveCropBtn.addEventListener('click', () => {
        if (!cropper || !currentCropId) return;
        
        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        
        if (canvas) {
            const croppedUrl = canvas.toDataURL('image/png');
            
            // Update image data
            const imgIndex = selectedImages.findIndex(img => img.id === currentCropId);
            if (imgIndex !== -1) {
                selectedImages[imgIndex].dataUrl = croppedUrl;
                updateUI();
            }
        }
        closeCropper();
    });

    // Generate GIF
    generateBtn.addEventListener('click', () => {
        if (selectedImages.length === 0) return;

        // Get settings
        const durationSec = parseFloat(frameDurationInput.value) || 2;
        const width = parseInt(outputWidthInput.value) || 800;
        
        // Calculate height based on aspect ratio
        const ratioStr = aspectRatioSelect.value; // e.g., "8:9"
        const [rW, rH] = ratioStr.split(':').map(Number);
        const height = Math.round(width * (rH / rW));

        // Prepare image array for gifshot (it takes Data URLs, image elements, or URLs)
        const imagesToProcess = selectedImages.map(img => img.dataUrl);

        // Show loading
        loadingOverlay.classList.remove('hidden');
        progressBar.style.width = '0%';
        resultPanel.classList.add('hidden');

        // Create GIF
        gifshot.createGIF({
            images: imagesToProcess,
            interval: durationSec, 
            gifWidth: width,
            gifHeight: height,
            sampleInterval: 10, // Quality setting (lower is better but slower, 10 is default)
            numWorkers: 2,
            progressCallback: function(captureProgress) {
                // Progress is a float from 0 to 1
                progressBar.style.width = Math.round(captureProgress * 100) + '%';
            }
        }, function(obj) {
            loadingOverlay.classList.add('hidden');
            
            if(!obj.error) {
                const finalGifUrl = obj.image;
                
                // Show result
                resultGif.src = finalGifUrl;
                downloadLink.href = finalGifUrl;
                
                resultPanel.classList.remove('hidden');
                
                // Scroll to result
                resultPanel.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('生成 GIF 時發生錯誤，請稍後再試！\n錯誤: ' + obj.errorCode);
            }
        });
    });
});
