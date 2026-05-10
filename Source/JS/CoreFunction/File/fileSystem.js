/* =========================================
   File System
   ========================================= */

export class FileSystem {
    constructor() {
        console.log('FileSystem initialized');
    }

    newFile() {
        console.log('FileSystem: Creating new file...');
        
        if (window.dialogSystem) {
            window.dialogSystem.showNewFileDialog(
                (data) => {
                    console.log('New File Confirmed', data);
                    // Create new project
                    if (window.projectModel) {
                        const projectId = window.projectModel.createProject(data);
                        console.log(`Project created: ${data.name} (${data.width}x${data.height}) ID: ${projectId}`);

                        // Handle Save Immediately
                        if (data.saveImmediately && data.saveHandle) {
                             (async () => {
                                 try {
                                     // Construct filename
                                     // Ensure .vif extension
                                     let filename = data.name || 'Untitled';
                                     if (!filename.toLowerCase().endsWith('.vif')) filename += '.vif';

                                     const fileHandle = await data.saveHandle.getFileHandle(filename, { create: true });
                                     
                                     // Set on project
                                     if (window.projectModel.data && window.projectModel.data.id === projectId) {
                                         window.projectModel.data.fileHandle = fileHandle;
                                         // Save initial state
                                         await this.saveFile();
                                     }
                                 } catch (err) {
                                     console.error('Failed to create file immediately:', err);
                                     if (window.infoSystem) window.infoSystem.showInfo('error', 'Failed to save file immediately: ' + err.message);
                                 }
                             })();
                        }
                    }
                },
                () => {
                    console.log('New File Cancelled');
                }
            );
        } else {
            console.warn('DialogSystem not initialized');
        }
    }

    async openFile() {
        console.log('FileSystem: Opening file...');
        
        // Try File System Access API first
        if (window.showOpenFilePicker) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [
                        
                        {
                            description: 'Images',
                            accept: {
                                'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp', '.svg']
                            }
                        },
                        {
                            description: 'Visual Vigor Projects',
                            accept: {
                                'application/x-visual-vigor': ['.vif']
                            }
                        }
                    ],
                    multiple: false
                });

                if (handle) {
                    const file = await handle.getFile();
                    // Pass handle to specific opener methods
                    if (file.name.endsWith('.vif')) {
                        this._openProjectFile(file, handle);
                    } else if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
                        this._openSvgAsProject(file); // SVG Import doesn't strictly keep handle as Project File yet
                    } else if (file.type.startsWith('image/')) {
                        this._openImageAsProject(file); // Image import -> New Project
                    }
                    return;
                }
            } catch (err) {
                 if (err.name !== 'AbortError') {
                     console.error('File Open Error:', err);
                 }
                 // Fallback to input if error (or user cancelled, though usually we stop)
                 // But strictly if user cancels picker, they probably don't want input.
                 // However, if API is not supported or fails, we fall through.
                 if (err.name === 'AbortError') return;
            }
        }

        // Fallback: Legacy Input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*, .vif, .svg'; // Support image and project files
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
                    this._openSvgAsProject(file);
                } else if (file.type.startsWith('image/')) {
                    this._openImageAsProject(file);
                } else if (file.name.endsWith('.vif')) {
                    this._openProjectFile(file);
                } else if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
                    this._openTiffAsProject(file);
                }
            }
            document.body.removeChild(input);
        };

        input.click();
    }


    _openProjectFile(file, fileHandle = null) {
        if (window.infoSystem) window.infoSystem.showInfo('info', 'Opening Project...', 2000);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = e.target.result;
                const projectData = JSON.parse(jsonContent);

                // Basic validation
                if (!projectData.meta || !projectData.settings || !projectData.timeline) {
                    throw new Error('Invalid VIF file structure');
                }

                if (window.projectModel) {
                     // 1. Create Base Project (this initializes default layers which we'll overwrite or update)
                    const config = {
                        name: projectData.meta.name,
                        width: projectData.settings.artboard.width,
                        height: projectData.settings.artboard.height,
                        fps: projectData.settings.fps,
                        duration: projectData.settings.duration
                    };
                    
                    const projectId = window.projectModel.createProject(config);
                    const newProject = window.projectModel.projects.get(projectId);

                    // 2. Apply Settings
                    // Merge saved settings into the new project settings
                    Object.assign(newProject.settings, projectData.settings);
                    
                    // 3. Reconstruct Layers
                    // Clear default layers created by createProject if we are fully restoring
                    newProject.timeline.bitmapLayers = [];
                    
                    // Restore Background Layer
                    if (projectData.timeline.backgroundLayer) {
                         const bgLayer = await this._deserializeLayer(projectData.timeline.backgroundLayer);

                         // If optimized save skipped frames for solid bg, reconstruct from artboard color
                         if (!bgLayer.frames || Object.keys(bgLayer.frames).length === 0) {
                             const bgCanvas = document.createElement('canvas');
                             bgCanvas.width = projectData.settings.artboard.width;
                             bgCanvas.height = projectData.settings.artboard.height;
                             const ctx = bgCanvas.getContext('2d', { willReadFrequently: true });

                             const bgColor = projectData.settings.artboard.backgroundColor;
                             if (bgColor && bgColor !== 'transparent') {
                                 ctx.fillStyle = bgColor;
                                 ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
                             }
                             bgLayer.frames = { 0: bgCanvas };
                         }

                         // Ensure ID matches what system expects or update system
                         newProject.timeline.backgroundLayer = bgLayer;
                    }

                    // Restore Bitmap Layers
                    if (projectData.timeline.bitmapLayers) {
                        for (const layerData of projectData.timeline.bitmapLayers) {
                            const layer = await this._deserializeLayer(layerData);
                            newProject.timeline.bitmapLayers.push(layer);
                        }
                    }

                    // Restore Vector Layer (TODO: Deep vector reconstruction if needed)
                    if (projectData.timeline.vectorLayer) {
                        // Handle Chunked Format
                        const loadedVec = projectData.timeline.vectorLayer;
                        const vectorLayer = newProject.timeline.vectorLayer;

                        if (loadedVec.chunks && loadedVec.spatialIndex) {
                            // Rehydrate chunked data
                            let allChildren = [];
                            
                            // 1. Orphans
                            if (loadedVec.children && Array.isArray(loadedVec.children)) {
                                allChildren = allChildren.concat(loadedVec.children);
                            }
                            
                            // 2. Chunks
                            if (loadedVec.chunks) {
                                Object.values(loadedVec.chunks).forEach(chunkStr => {
                                    try {
                                        const items = JSON.parse(chunkStr);
                                        if (Array.isArray(items)) allChildren = allChildren.concat(items);
                                    } catch (e) {
                                        console.warn('Failed to parse chunk', e);
                                    }
                                });
                            }
                            // Reassign flattened children for immediate use
                            // In a lazy-load system, we would store chunks and index instead
                            loadedVec.children = allChildren;
                            
                            // Remove helper props to avoid duplication in memory? 
                            // Or keep them if we want to support incremental saving later.
                            // For now, flatten to children so VectorSystem.importData works as usual.
                        }
                        
                        Object.assign(newProject.timeline.vectorLayer, loadedVec);
                    }
                    
                    // 4. Update Project Meta
                    newProject.meta = projectData.meta;

                    // 5. Build Final State & Activate
                    window.projectModel.activeProjectId = projectId;
                    window.projectModel.selectedLayerId = null; // Or restore last selection?

                    // Store File Handle
                    if (fileHandle) {
                        newProject.fileHandle = fileHandle;
                    }
                    
                    window.projectModel._dispatchLayersChanged();
                    window.dispatchEvent(new CustomEvent('projectFrameChanged', { detail: 0 }));
                    
                    console.log('Project loaded successfully:', projectData.meta.name);
                    if (window.infoSystem) window.infoSystem.showInfo('success', 'Project loaded successfully', 2000);
                }
            } catch (err) {
                console.error('Failed to open project file:', err);
                alert('Invalid project file.');
                if (window.infoSystem) window.infoSystem.showInfo('error', 'Failed to open project file', 3000);
            }
        };
        reader.readAsText(file);
    }

    async _deserializeLayer(layerData) {
        const layer = { ...layerData };
        layer.frames = {}; // Reset frames container
        const frameMeta = layerData.frameMeta || layerData.frameOffsets || null;

        // Restore Frames (Base64 -> Canvas)
        if (layerData.frames) {
            const framePromises = Object.entries(layerData.frames).map(async ([frameIndex, dataURL]) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const meta = frameMeta && frameMeta[frameIndex] ? frameMeta[frameIndex] : null;

                        // If we stored cropped data, reconstruct into full canvas using offsets
                        if (meta && (meta.canvasWidth && meta.canvasHeight)) {
                            const canvas = document.createElement('canvas');
                            canvas.width = meta.canvasWidth;
                            canvas.height = meta.canvasHeight;
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            const x = meta.x || 0;
                            const y = meta.y || 0;
                            ctx.drawImage(img, x, y, img.width, img.height);
                            resolve({ frameIndex, canvas });
                        } else {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            ctx.drawImage(img, 0, 0);
                            resolve({ frameIndex, canvas });
                        }
                    };
                    img.onerror = () => {
                        console.warn('Failed to load frame image for layer', layerData.name);
                        resolve(null);
                    };
                    img.src = dataURL;
                });
            });

            const loadedFrames = await Promise.all(framePromises);
            loadedFrames.forEach(item => {
                if (item) {
                    layer.frames[item.frameIndex] = item.canvas;
                }
            });
        }
        
        return layer;
    }

    _openImageAsProject(file) {
        if (window.infoSystem) window.infoSystem.showInfo('info', 'Importing Image...', 2000);
        if (file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff')) {
            this._openTiffAsProject(file);
            return;
        }
        if (file.name.toLowerCase().endsWith('.gif')) {
            this._openGifAsProject(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                if (window.projectModel) {
                    // 1. Create New Project based on Image
                    const config = {
                        name: file.name.split('.')[0],
                        width: img.width,
                        height: img.height,
                        duration: 1
                    };
                    
                    // Creates project and activates it
                    const projectId = window.projectModel.createProject(config);
                    
                    // 2. Create Bitmap Layer for the Image
                    const layer = window.projectModel.addBitmapLayer(file.name);
                    
                    // 3. Draw Image to Layer Frame [0]
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0);
                    
                    layer.frames[0] = canvas;
                    
                    // Always set layer duration to project duration (1 frame)
                    layer.startFrame = 0;
                    layer.duration = 1;

                    // 4. Set Selection and Notify
                    window.projectModel.selectedLayerId = layer.id;
                    window.projectModel._dispatchLayersChanged();
                    
                    // Notify content change to trigger render
                    window.dispatchEvent(new CustomEvent('projectFrameChanged', { 
                        detail: 0
                    }));
                    
                    console.log('Image opened as new project layer:', file.name);
                    if (window.infoSystem) window.infoSystem.showInfo('success', 'Image Imported Successfully', 2000);
                }
            };
            img.onerror = () => {
                if (window.infoSystem) window.infoSystem.showInfo('error', 'Failed to load image', 3000);
            }
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    _openSvgAsProject(file) {
        if (window.infoSystem) window.infoSystem.showInfo('info', 'Importing SVG...', 2000);
        if (!window.vectorSystem || !window.vectorSystem.scope) {
            alert('Vector System not initialized.');
            if (window.infoSystem) window.infoSystem.showInfo('error', 'Vector System Warning', 3000);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const svgContent = e.target.result;
            
            // Import into Paper.js project temporarily to parse
            // We use importSVG with insert: false to keep it in memory only
            // Paper.js must be active for this scope
            const item = window.vectorSystem.scope.project.importSVG(svgContent, { insert: false });
            
            if (!item) {
                alert('Failed to parse SVG.');
                return;
            }
            
            // Determine dimensions from SVG item
            const width = item.bounds.width || 800;
            const height = item.bounds.height || 600;
            // Handle viewbox if present in item data? Paper.js usually fits it.
            // But item.bounds is the reliable content size.
            
            if (window.projectModel) {
                 // 1. Create Project
                 const config = {
                    name: file.name.split('.')[0],
                    width: Math.ceil(width),
                    height: Math.ceil(height),
                    duration: 1
                };
                const projectId = window.projectModel.createProject(config);
                
                // 2. Convert Paper Items to internal Vector Structure
                const childrenData = this._convertPaperItemsToData(item);
                
                // 3. Populate Vector Layer
                const vectorLayer = window.projectModel.data.timeline.vectorLayer;
                
                // importSVG usually returns a Group containing the SVG content or a Layer
                if (childrenData && childrenData.type === 'group' && childrenData.children) {
                     vectorLayer.children = childrenData.children;
                } else if (childrenData) {
                     vectorLayer.children = [childrenData];
                }

                 // 4. Notify & Update
                 // Need to clean up the temporary item? It was not inserted, so GC should handle it
                 // except if it stuck to project.
                 item.remove();

                 window.projectModel.activeProjectId = projectId; 
                 
                 // Force VectorSystem to re-import from the new model data
                 window.vectorSystem.importData(vectorLayer);
                 
                 window.projectModel._dispatchLayersChanged();
                 console.log('SVG opened as editable vector project:', file.name);
                 if (window.infoSystem) window.infoSystem.showInfo('success', 'SVG Imported Successfully', 2000);
            }
        };
        reader.readAsText(file);
    }

    _convertPaperItemsToData(item) {
        if (!item) return null;

        // Skip Definitions/Defs usually found in SVG
        if (item.name === 'defs') return null;

        const id = 'elem_vec_' + Math.random().toString(36).substr(2, 9);
        const data = {
            id: id,
            type: 'path', // Default
            name: item.name || item.className,
            visible: item.visible,
            locked: item.locked,
            properties: {},
            children: []
        };
        
        // Extract Styles
        // Note: Paper.js handles inheritance, so item.strokeColor should be the computed value
        if (item.strokeColor) data.properties.stroke = item.strokeColor.toCSS(true);
        if (item.strokeWidth) data.properties.strokeWidth = item.strokeWidth;
        if (item.fillColor) data.properties.fill = item.fillColor.toCSS(true);
        if (item.opacity !== 1 && item.opacity !== undefined) data.properties.opacity = item.opacity;
        
        if (item.className === 'Group' || item.className === 'Layer') {
            data.type = 'group';
            if (item.children) {
                data.children = item.children
                    .map(child => this._convertPaperItemsToData(child))
                    .filter(c => c !== null); // Filter out unsupported
            }
        } 
        else if (item.className === 'PointText') {
            data.type = 'text';
            data.properties.text = item.content;
            data.properties.x = item.point.x;
            data.properties.y = item.point.y;
            data.properties.fontSize = item.fontSize;
            data.properties.fontFamily = item.fontFamily;
            if (item.fillColor) data.properties.fill = item.fillColor.toCSS(true);
        }
        else if (item.className === 'Path' || item.className === 'CompoundPath' || item.className === 'Shape') { 
             data.type = 'path';
             data.properties.d = item.pathData;
        } else if (item.className === 'Raster') {
            // SVG can contain images. Not supported in vector layer yet.
            return null; 
        } else {
            // Fallback
            if (item.pathData) {
                data.type = 'path';
                data.properties.d = item.pathData;
            } else {
                return null; 
            }
        }
        
        return data;
    }

    _openTiffAsProject(file) {
        if (window.infoSystem) window.infoSystem.showInfo('info', 'Importing TIFF...', 2000);
        if (!window.UTIF) {
            console.error('UTIF.js not loaded. Cannot open TIFF files.');
            alert('TIFF support requires UTIF.js library.');
            if (window.infoSystem) window.infoSystem.showInfo('error', 'TIFF library missing', 3000);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target.result;
            const ifds = window.UTIF.decode(buffer);
            if (!ifds || ifds.length === 0) {
                console.error('Failed to decode TIFF');
                return;
            }
            
            // Process Multi-Page TIFF
            const totalFrames = ifds.length;
            const firstPage = ifds[0];
            
            // Use dimensions from first page for the project
            // (Assuming all pages have same dimensions or will be drawn on this size)
            // Note: decodeImage must be called to populate parsed properties fully if not already?
            // Actually UTIF parses tags in .decode(), so width/height are available.
            // But let's decode the first page to be sure we have the data for it.
            window.UTIF.decodeImage(buffer, firstPage);
            
            const width = firstPage.width;
            const height = firstPage.height;
            
            if (window.projectModel) {
                 // 1. Create Project with Correct Duration
                 const config = {
                    name: file.name.split('.')[0],
                    width: width,
                    height: height,
                    duration: totalFrames
                };
                const projectId = window.projectModel.createProject(config);
                
                // 2. Create Layer
                const layer = window.projectModel.addBitmapLayer(file.name);
                layer.startFrame = 0;
                layer.duration = totalFrames;

                // 3. Loop through all frames
                for (let i = 0; i < totalFrames; i++) {
                     const page = ifds[i];
                     // Decode if not already (first page might be dual-decoded but it's safe)
                     window.UTIF.decodeImage(buffer, page);
                     const rgba = window.UTIF.toRGBA8(page);
                     
                     const canvas = document.createElement('canvas');
                     canvas.width = width;
                     canvas.height = height;
                     const ctx = canvas.getContext('2d', { willReadFrequently: true });
                     
                     // Convert to ImageData
                     // Handle size mismatch if any (simple centering or top-left)
                     if (page.width === width && page.height === height) {
                         const imageData = new ImageData(new Uint8ClampedArray(rgba.buffer), width, height);
                         ctx.putImageData(imageData, 0, 0);
                     } else {
                         // Draw varied size image onto project canvas
                         const tempCanvas = document.createElement('canvas');
                         tempCanvas.width = page.width;
                         tempCanvas.height = page.height;
                         const tempCtx = tempCanvas.getContext('2d');
                         const tempImgData = new ImageData(new Uint8ClampedArray(rgba.buffer), page.width, page.height);
                         tempCtx.putImageData(tempImgData, 0, 0);
                         
                         ctx.drawImage(tempCanvas, 0, 0);
                     }
                     
                     layer.frames[i] = canvas;
                }

                 // 4. Notify
                 window.projectModel.activeProjectId = projectId; 
                 window.projectModel.selectedLayerId = layer.id;
                 window.projectModel._dispatchLayersChanged();
                 
                 window.dispatchEvent(new CustomEvent('projectFrameChanged', { 
                    detail: 0
                }));
                if (window.infoSystem) window.infoSystem.showInfo('success', 'TIFF Imported Successfully', 2000);
            }
        };
        reader.readAsArrayBuffer(file);
    }


    _openGifAsProject(file) {
        if (window.infoSystem) window.infoSystem.showInfo('info', 'Importing GIF...', 2000);
        if (!window.GifReader) {
            console.error('omggif.js not loaded. Cannot open GIF files.');
            alert('GIF support requires omggif.js library.');
            if (window.infoSystem) window.infoSystem.showInfo('error', 'GIF support missing', 3000);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = new Uint8Array(e.target.result);
            let gif;
            try {
                // GifReader expects a standard array or Uint8Array
                gif = new window.GifReader(buffer);
            } catch (err) {
                console.error('Failed to parse GIF:', err);
                alert('Failed to parse GIF file.');
                if (window.infoSystem) window.infoSystem.showInfo('error', 'Failed to parse GIF', 3000);
                return;
            }

            const width = gif.width;
            const height = gif.height;
            const numFrames = gif.numFrames();

            if (window.projectModel) {
                 // 1. Create Project
                 const config = {
                    name: file.name.split('.')[0],
                    width: width,
                    height: height,
                    duration: numFrames,
                    fps: 12 // Default assumption or try to calc from delay?
                };
                
                // Average delay calculation to set FPS?
                let totalDelay = 0;
                for(let i=0; i<numFrames; i++) totalDelay += gif.frameInfo(i).delay;
                // delay is in 1/100th of a second
                const avgDelay = totalDelay / numFrames; 
                if (avgDelay > 0) {
                    config.fps = Math.round(100 / avgDelay);
                }

                const projectId = window.projectModel.createProject(config);
                
                // 2. Create Bitmap Layer
                const layer = window.projectModel.addBitmapLayer(file.name);
                // layer.duration should match project settings usually, but here we have specific frames.
                // If project model supports frame content, we just fill layer.frames[i]
                
                // 3. Process Frames
                const compositionData = new Uint8ClampedArray(width * height * 4);
                const backupData = new Uint8ClampedArray(width * height * 4);

                for (let i = 0; i < numFrames; i++) {
                    // --- Handle Previous Frame Disposal ---
                    if (i > 0) {
                        const prevInfo = gif.frameInfo(i - 1);
                        if (prevInfo.disposal === 2) {
                            // Restore to background (clear)
                            // We must clear the rectangle defined by prevInfo
                            // Note: omggif provides x, y, width, height in frameInfo
                            const xStart = prevInfo.x;
                            const yStart = prevInfo.y;
                            const xEnd = xStart + prevInfo.width;
                            const yEnd = yStart + prevInfo.height;

                            for (let y = yStart; y < yEnd; y++) {
                                for (let x = xStart; x < xEnd; x++) {
                                    if (x >= 0 && x < width && y >= 0 && y < height) {
                                        const idx = (y * width + x) * 4;
                                        compositionData[idx] = 0;
                                        compositionData[idx + 1] = 0;
                                        compositionData[idx + 2] = 0;
                                        compositionData[idx + 3] = 0;
                                    }
                                }
                            }
                        } else if (prevInfo.disposal === 3) {
                            // Restore to previous (backup)
                            compositionData.set(backupData);
                        }
                    }

                    // --- Handle Current Frame Prep (Backup for next if needed) ---
                    const info = gif.frameInfo(i);
                    if (info.disposal === 3) {
                        // Save current state before drawing this frame
                        backupData.set(compositionData);
                    }

                    // --- Render Current Frame ---
                    // decodeAndBlitFrameRGBA(frame_num, pixels_array)
                    // Note: pixels_array must be the full buffer size
                    try {
                        gif.decodeAndBlitFrameRGBA(i, compositionData);
                    } catch (decodeErr) {
                        console.warn(`Error decoding GIF frame ${i}`, decodeErr);
                    }

                    // --- Create Canvas for Frame ---
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    
                    const imgData = new ImageData( new Uint8ClampedArray(compositionData), width, height);
                    ctx.putImageData(imgData, 0, 0);
                    
                    layer.frames[i] = canvas;
                }

                // Update layer duration to match content if possible, or just frames count
                layer.duration = numFrames;

                 // 4. Notify
                 window.projectModel.activeProjectId = projectId; 
                 window.projectModel.selectedLayerId = layer.id;
                 window.projectModel._dispatchLayersChanged();
                 
                 // Show first frame
                 window.dispatchEvent(new CustomEvent('projectFrameChanged', { 
                    detail: 0
                }));
                
                console.log(`GIF opened. ${numFrames} frames extracted.`);
                if (window.infoSystem) window.infoSystem.showInfo('success', `GIF Imported (${numFrames} frames)`, 2000);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async saveFile() {
        if (!window.projectModel || !window.projectModel.data) return;
        
        const project = window.projectModel.data;
        
        // 1. Try to save to existing handle
        if (project.fileHandle) {
             try {
                // Check permission if needed, but createWritable usually prompts if needed
                const writable = await project.fileHandle.createWritable();
                
                // Show info
                if (window.infoSystem) window.infoSystem.showInfo('info', 'Saving...', 1000);

                const jsonData = await this._serializeProject(project);
                const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
                
                await writable.write(blob);
                await writable.close();
                
                // Mark Clean
                window.projectModel.setDirty(false);
                if (window.infoSystem) window.infoSystem.showInfo('success', 'Project saved.', 2000);
             } catch (err) {
                 console.error('Save failed:', err);
                 // If permission denied or other error, fallback might be desired, 
                 // but usually we just report error if handle exists but fails.
                 if (window.infoSystem) window.infoSystem.showInfo('error', 'Save failed: ' + err.message, 3000);
             }
        } else {
            // 2. No handle -> Save As
            this.saveAsFile();
        }
    }

    async saveAsFile() {
        if (!window.projectModel || !window.projectModel.data) return;
        const project = window.projectModel.data;

        // Try File System Access API
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    types: [{
                        description: 'Visual Vigor Project',
                        accept: {'application/x-visual-vigor': ['.vif']}
                    }],
                    suggestedName: (project.meta.name || 'Untitled') + '.vif'
                });
                
                if (handle) {
                    project.fileHandle = handle;
                    if (handle.name) {
                        project.meta.name = handle.name.replace(/\.(vif)$/i, '');
                    }
                    this.saveFile();
                    return;
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn('Save Picker failed, using fallback download.', err);
            }
        }
        
        // Fallback: Download VIF Blob directly
        this._saveAsVif();
    }

    exportFile() {
        if (!window.projectModel || !window.projectModel.data) {
            console.warn('No active project to save.');
            return;
        }

        if (window.dialogSystem && window.dialogSystem.factory && window.dialogSystem.show) {
            const factory = window.dialogSystem.factory;
            const container = document.createElement('div');
            Object.assign(container.style, {
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px 0'
            });

            const t = (key) => window.languageManager ? (window.languageManager.t(key) !== key ? window.languageManager.t(key) : key) : key;

            const header = document.createElement('div');
            header.className = 'text text--muted';
            header.textContent = t('Layout.Panel.Export.SelectFormats') || 'Select formats to export:';
            container.appendChild(header);

            const formats = [
                { id: 'vif', label: t('Layout.Panel.Export.vif'), checked: true },
                { id: 'png', label: t('Layout.Panel.Export.png'), checked: false },
                { id: 'jpg', label: t('Layout.Panel.Export.jpg'), checked: false },
                { id: 'bmp', label: t('Layout.Panel.Export.bmp'), checked: false },
                { id: 'tif', label: t('Layout.Panel.Export.tif'), checked: false },
                { id: 'gif', label: t('Layout.Panel.Export.gif'), checked: false },
                { id: 'svg', label: t('Layout.Panel.Export.svg'), checked: false }
            ];

            const toggles = {};
            const progressBars = {};

            formats.forEach(fmt => {
                // Wrapper for toggle + progress
                const itemContainer = document.createElement('div');
                Object.assign(itemContainer.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                });

                const toggle = factory._createToggle(fmt.label, fmt.checked);
                itemContainer.appendChild(toggle.group);
                
                // Progress Bar
                const progressTrack = document.createElement('div');
                Object.assign(progressTrack.style, {
                    height: '4px',
                    background: 'var(--color-bg-gray2)', // Corrected theme variable
                    borderRadius: '2px',
                    width: '100%',
                    marginTop: '4px',
                    overflow: 'hidden',
                    display: 'none' // Hidden by default
                });

                const progressFill = document.createElement('div');
                Object.assign(progressFill.style, {
                    height: '100%',
                    width: '0%',
                    background: 'var(--color-accent-100)', // Corrected theme variable
                    transition: 'width 0.1s linear'
                });
                
                progressTrack.appendChild(progressFill);
                itemContainer.appendChild(progressTrack);

                container.appendChild(itemContainer);
                
                toggles[fmt.id] = toggle.input;
                progressBars[fmt.id] = { track: progressTrack, fill: progressFill };
            });

            const config = factory.createCustom(
                t('Layout.Panel.Export.Title') || 'Save / Export',
                container,
                [
                    {
                        text: t('Layout.Panel.Export.Cancel') || 'Cancel',
                        type: 'normal',
                        onClick: () => {} 
                    },
                    {
                        text: t('Layout.Panel.Export.Confirm') || 'Confirm',
                        type: 'recommend',
                        onClick: () => this._processSave(toggles, progressBars)
                    }
                ]
            );
            window.dialogSystem.show(config);
        } else {
            this._saveAsVif();
        }
    }

    async _processSave(toggles, progressBars) {
        // Helper to update progress
        const setProgress = async (id, percent) => {
            const bar = progressBars[id];
            if (bar) {
                bar.track.style.display = 'block';
                // Force reflow
                void bar.track.offsetHeight;
                
                // Allow browser to paint
                await new Promise(r => requestAnimationFrame(r));
                
                bar.fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            }
        };

        const finish = async (id) => {
            await setProgress(id, 100);
            // Small delay to let user see 100%
            await new Promise(r => setTimeout(r, 100));
        };

        try {
            if (toggles.vif && toggles.vif.checked) {
                await setProgress('vif', 10);
                await this._saveAsVif();
                await finish('vif');
            }
            if (toggles.png && toggles.png.checked) {
                await setProgress('png', 10);
                await new Promise(r => setTimeout(r, 50)); // Visual delay
                this._exportAsImage('image/png');
                await finish('png');
            }
            if (toggles.jpg && toggles.jpg.checked) {
                await setProgress('jpg', 10);
                await new Promise(r => setTimeout(r, 50));
                this._exportAsImage('image/jpeg');
                await finish('jpg');
            }
            if (toggles.bmp && toggles.bmp.checked) {
                await setProgress('bmp', 10);
                await new Promise(r => setTimeout(r, 50));
                this._exportAsBmp();
                await finish('bmp');
            }
            if (toggles.tif && toggles.tif.checked) {
                await setProgress('tif', 10);
                await new Promise(r => setTimeout(r, 50));
                this._exportAsTiff();
                await finish('tif');
            }
            if (toggles.svg && toggles.svg.checked) {
                await setProgress('svg', 10);
                await new Promise(r => setTimeout(r, 50));
                this._exportAsSvg();
                await finish('svg');
            }
            if (toggles.gif && toggles.gif.checked) {
                await setProgress('gif', 1);
                await new Promise(r => setTimeout(r, 50));
                
                await this._exportAsGif((p) => {
                    const bar = progressBars['gif'];
                    if (bar) bar.fill.style.width = `${p * 100}%`;
                });
                await finish('gif');
            }
        } catch (err) {
            console.error('Export chain failed', err);
        }

        // Close dialog manually after all done
        await new Promise(r => setTimeout(r, 600));
        window.dialogSystem.close();
        
        return false; // Prevent auto-close
    }

    async _saveAsVif() {
        if (!window.projectModel || !window.projectModel.data) {
            return;
        }

        console.log('FileSystem: Saving VIF...');
        const project = window.projectModel.data;
        
        try {
            // 1. Serialize Project Data
            const jsonData = await this._serializeProject(project);
            const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/x-visual-vigor' });
            
            // 2. Trigger Download
            this._triggerDownload(blob, (project.meta.name || 'Untitled') + '.vif');
            
            console.log('Project saved successfully.');

            // Mark project as clean
            if (window.projectModel) {
                 window.projectModel.setDirty(false);
            }
        } catch (err) {
            console.error('Failed to save project:', err);
            alert('Failed to save project.');
        }
    }

    _triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    _exportAsImage(mimeType) {
        if (!window.projectModel) return;
        const project = window.projectModel.data;
        const currentFrame = project.timeline.currentFrame;

        // 1. Get Composite Canvas
        const canvas = this._getCompositeCanvas(currentFrame);
        if (!canvas) return;

        // 2. Convert to Blob and Download
        canvas.toBlob((blob) => {
            const ext = mimeType.split('/')[1];
            this._triggerDownload(blob, `${project.meta.name}_frame${currentFrame}.${ext}`);
        }, mimeType, 0.9);
    }

    _exportAsBmp() {
        const canvas = this._getCompositeCanvas(window.projectModel.data.timeline.currentFrame);
        if (!canvas) return;
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0,0, width, height);
        const data = imgData.data;

        // BMP Header Construction (32-bit BGRA)
        const fileSize = 54 + (width * height * 4);
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);

        // File Header
        view.setUint16(0, 0x424D, false); // BM
        view.setUint32(2, fileSize, true);
        view.setUint32(10, 54, true); // Offset

        // DIB Header
        view.setUint32(14, 40, true); // Header Size
        view.setInt32(18, width, true);
        view.setInt32(22, -height, true); // Negative height = top-down
        view.setUint16(26, 1, true); // Planes
        view.setUint16(28, 32, true); // BPP
        view.setUint32(34, width * height * 4, true); // Image Size

        // Data (RGBA to BGRA)
        let pos = 54;
        for (let i = 0; i < data.length; i += 4) {
            view.setUint8(pos++, data[i+2]); // B
            view.setUint8(pos++, data[i+1]); // G
            view.setUint8(pos++, data[i]);   // R
            view.setUint8(pos++, data[i+3]); // A
        }

        const blob = new Blob([buffer], { type: 'image/bmp' });
        this._triggerDownload(blob, `${window.projectModel.data.meta.name}.bmp`);
    }

    _exportAsTiff() {
        const canvas = this._getCompositeCanvas(window.projectModel.data.timeline.currentFrame);
        if (!canvas) return;
        
        if (window.UTIF && window.UTIF.encodeImage) {
            const width = canvas.width;
            const height = canvas.height;
            const ctx = canvas.getContext('2d');
            const rgba = new Uint8Array(ctx.getImageData(0,0, width, height).data.buffer);
            const tiffData = window.UTIF.encodeImage(rgba, width, height);
            const blob = new Blob([tiffData], {type: 'image/tiff'});
            this._triggerDownload(blob, `${window.projectModel.data.meta.name}.tif`);
            return;
        }

        alert('TIFF Export requires UTIF.js library.');
    }

    async _exportAsGif(onProgress) {
        if (!window.GifWriter) {
            alert('GIF Export requires omggif.js library.');
            return;
        }

        const project = window.projectModel.data;
        const width = project.settings.artboard.width;
        const height = project.settings.artboard.height;
        const fps = project.settings.fps;
        const duration = project.settings.duration; // frames
        
        // Prepare buffer (rough estimate: width * height * frames / 2 for compression?)
        // GifWriter needs a pre-allocated buffer. 
        // Max size: width * height * frames + overhead.
        const bufSize = width * height * duration + 1024 * 1024; 
        const buffer = new Uint8Array(bufSize);
        
        let gifWriter;
        try {
            // Global options. Loop = 0 (infinite)
            gifWriter = new window.GifWriter(buffer, width, height, { loop: 0 });
        } catch (e) {
            console.error('Failed to init GifWriter', e);
            return;
        }

        const delay = Math.round(100 / fps); // delay in 1/100th sec

        console.log('Exporting GIF...');
        
        // Helper: Optimized Quantizer (Map + Linear Search)
        const quantize = (data, count) => {
            const pixels = new Uint8Array(count);
            // Palette storage: r,g,b, r,g,b ...
            const paletteData = []; 
            // Color Map: (r<<16 | g<<8 | b) -> index
            const colorMap = new Map();
            let palCount = 0;

            for (let i = 0; i < count; i++) {
                const r = data[i*4];
                const g = data[i*4+1];
                const b = data[i*4+2];
                // Ignore alpha for now (or threshold) check data[i*4+3]
                
                // Color Int Key
                const key = (r << 16) | (g << 8) | b;
                
                let idx = colorMap.get(key);
                
                if (idx === undefined) {
                    if (palCount < 256) {
                        // Add new color
                        idx = palCount;
                        colorMap.set(key, idx);
                        paletteData.push(key);
                        palCount++;
                    } else {
                        // Find nearest in existing palette
                        let minDist = Infinity;
                        let bestIdx = 0;
                        
                        // Linear search through palette 
                        // Performance note: with max 256 colors, this is 256 checks per unique new color pixel.
                        // Common colors hit cache (Map) instantly.
                        for (let j = 0; j < palCount; j++) {
                            const pKey = paletteData[j];
                            const pr = (pKey >> 16) & 0xFF;
                            const pg = (pKey >> 8) & 0xFF;
                            const pb = pKey & 0xFF;
                            
                            const dist = (r-pr)*(r-pr) + (g-pg)*(g-pg) + (b-pb)*(b-pb);
                            if (dist < minDist) {
                                minDist = dist;
                                bestIdx = j;
                                if (dist === 0) break; 
                            }
                        }
                        idx = bestIdx;
                        // Determine if we should cache this result to avoid re-searching for this specific color?
                        // Yes, otherwise large areas of same "off-palette" color will recalc repeatedly.
                        // Limit map size if memory concern, but 1920x1080 unique colors max 2M entries is acceptable for export.
                        colorMap.set(key, idx);
                    }
                }
                pixels[i] = idx;
            }

            // Ensure palette size is power of 2 (min 2, max 256)
            // omggif requirement: 2, 4, 8, 16, 32, 64, 128, 256
            if (paletteData.length < 2) {
                 paletteData.push(0x000000); // Pad if empty or single color
                 if (paletteData.length < 2) paletteData.push(0x000000);
            }

            let p = 1;
            while (p < paletteData.length) p <<= 1;
            
            while (paletteData.length < p) {
                paletteData.push(0x000000); // Padding with black
            }

            return { pixels, palette: paletteData };
        };

        // Render Loop
        // Note: This operation effectively blocks the main thread. 
        // For large GIFs, this should be done in a Web Worker.
        // Doing it here might freeze UI. 
        
        for (let i = 0; i < duration; i++) {
            const canvas = this._getCompositeCanvas(i); 
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, width, height);
            
            const { pixels, palette } = quantize(imageData.data, width * height);
            
            gifWriter.addFrame(0, 0, width, height, pixels, { palette: palette, delay: delay });

            if (onProgress) {
                // Yield to UI thread occasionally
                if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
                onProgress((i + 1) / duration);
            }
        }

        // Finish
        // buf contains the GIF. Need to slice to actual end?
        // GifWriter.end() yields the end position in buffer
        const end = gifWriter.end();
        const finalBuffer = buffer.slice(0, end);
        
        const blob = new Blob([finalBuffer], { type: 'image/gif' });
        this._triggerDownload(blob, `${project.meta.name}.gif`);
        
        console.log('GIF Export complete.');
    }

    _exportAsSvg() {
        if (!window.projectModel) return;
        const project = window.projectModel.data;
        const width = project.settings.artboard.width;
        const height = project.settings.artboard.height;
        const currentFrame = project.timeline.currentFrame;

        // 1. Start SVG
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
        
        // 2. Background
        // Get background composite (Project Bg color + Bitmap Layers)
        // Since SVG doesn't support "canvas" directly, we embed the raster part as an image
        
        // Render all bitmap layers + background color to a single canvas
        const rasterCanvas = this._getCompositeCanvas(currentFrame, true); // true = exclude vector
        const rasterDataUrl = rasterCanvas.toDataURL('image/png');
        svgContent += `  <image width="${width}" height="${height}" xlink:href="${rasterDataUrl}" />\n`;

        // 3. Vector Layers (Paper.js)
        if (window.vectorSystem && window.vectorSystem.project) {
            const vectorSvg = window.vectorSystem.project.exportSVG({ asString: true, bounds: 'content' });
            // Hacky parsing: remove <svg...> and </svg>
            const innerVector = vectorSvg.replace(/<svg[^>]*>|<\/svg>/g, '');
            svgContent += innerVector;
        }

        svgContent += '</svg>';

        // 4. Download
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        this._triggerDownload(blob, `${project.meta.name}.svg`);
    }

    _getCompositeCanvas(frameIndex, excludeVector = false) {
        const project = window.projectModel.data;
        const width = project.settings.artboard.width;
        const height = project.settings.artboard.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. Background Color
        if (project.settings.artboard.backgroundColor) {
            ctx.fillStyle = project.settings.artboard.backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Background Layer
        const bgLayer = project.timeline.backgroundLayer;
        if (bgLayer && bgLayer.visible) {
             const frame = bgLayer.frames[frameIndex] || bgLayer.frames[0];
             if (frame) ctx.drawImage(frame, 0, 0);
        }

        // 3. Bitmap Layers
        project.timeline.bitmapLayers.forEach(layer => {
            if (layer.visible) {
                // Check layer frame range
                const start = layer.startFrame || 0;
                let len = layer.duration;
                if (len === undefined) len = project.settings.duration;
                
                if (frameIndex >= start && frameIndex < start + len) {
                    const frame = layer.frames[frameIndex];
                    if (frame) {
                        ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1.0;
                        ctx.globalCompositeOperation = layer.blendingMode || 'source-over';
                        ctx.drawImage(frame, 0, 0);
                    }
                }
            }
        });
        
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        // 4. Vector Layer (from Paper.js View)
        const vecLayer = project.timeline.vectorLayer;
        if (!excludeVector && vecLayer && vecLayer.visible && window.vectorSystem && window.vectorSystem.views.length > 0) {
            // Find the active view canvas
            const vectorCanvas = window.vectorSystem.views[0].element; 
            if (vectorCanvas) {
                ctx.drawImage(vectorCanvas, 0, 0);
            }
        }

        return canvas;
    }

    /**
     * Serializes the project data into a JSON object.
     * Converts Canvas frames to Base64 data URLs.
     * Implements Spatial Indexing for Vector Layers and Chunking.
     */
    async _serializeProject(project) {
        // Deep clone the structure first to avoid modifying the live project
        // But simple JSON.parse/stringify fails on circular refs or DOM nodes (canvas)
        // So we construct the export object manually or selectively.

        // 1. Process Vector Layer with Spatial Indexing
        let vectorLayerData = project.timeline.vectorLayer;
        
        // If VectorSystem is active, we can get accurate bounds for indexing
        if (window.vectorSystem && window.vectorSystem.project && window.vectorSystem.project.activeLayer) {
             // Create a map of ID -> Bounds from Paper.js items
             const boundsMap = new Map();
             const traverse = (item) => {
                 if (item.data && item.data.id) {
                     boundsMap.set(item.data.id, item.bounds);
                 }
                 if (item.children) {
                     item.children.forEach(traverse);
                 }
             };
             traverse(window.vectorSystem.project.activeLayer);
             
             // Chunking Logic
             const CHUNK_SIZE = 1000; // 1000px grid
             const chunks = {}; // "x_y": [items]
             const index = [];  // [{ id, bbox, count }]
             const orphanItems = []; // Items without bounds or ID
             
             // Process only top-level items of the layer for now (simplification)
             // or flatten? For now, we chunk the children of the root vector layer.
             // If children are Groups, the Group is the unit.
             
             if (vectorLayerData && vectorLayerData.children) {
                 vectorLayerData.children.forEach(itemData => {
                     const bounds = boundsMap.get(itemData.id);
                     if (bounds) {
                         const cx = bounds.x + bounds.width / 2;
                         const cy = bounds.y + bounds.height / 2;
                         const gridX = Math.floor(cx / CHUNK_SIZE);
                         const gridY = Math.floor(cy / CHUNK_SIZE);
                         const chunkId = `${gridX}_${gridY}`;
                         
                         if (!chunks[chunkId]) chunks[chunkId] = [];
                         
                         // Precision Trimming (Optimization 1)
                         const optimizedItem = this._trimPrecision(itemData);
                         chunks[chunkId].push(optimizedItem);
                         
                         // Update Index
                         let idxEntry = index.find(i => i.id === chunkId);
                         if (!idxEntry) {
                             idxEntry = { 
                                 id: chunkId, 
                                 bbox: { x: gridX * CHUNK_SIZE, y: gridY * CHUNK_SIZE, width: CHUNK_SIZE, height: CHUNK_SIZE },
                                 count: 0
                             };
                             index.push(idxEntry);
                         }
                         idxEntry.count++;
                         // Expand bbox if needed? No, chunk defines the region.
                     } else {
                         // Fallback for items without bounds (e.g. definitions, hidden)
                         const optimizedItem = this._trimPrecision(itemData);
                         orphanItems.push(optimizedItem);
                     }
                 });
             }
             
             // Serialize Chunks to Strings
             const serializedChunks = {};
             for (const [key, items] of Object.entries(chunks)) {
                 serializedChunks[key] = JSON.stringify(items);
             }
             
             // Construct the new vector layer object
             // We return a Modified Object, NOT strictly the original structure users expect?
             // No, file format can differ from runtime model.
             vectorLayerData = {
                 ...vectorLayerData,
                 children: orphanItems, // Any non-indexed items
                 spatialIndex: index,
                 chunks: serializedChunks
             };
        }

        const exportData = {
            meta: { ...project.meta, saved: Date.now() },
            settings: { ...project.settings },
            timeline: {
                currentFrame: project.timeline.currentFrame,
                backgroundLayer: this._serializeLayer(project.timeline.backgroundLayer),
                bitmapLayers: project.timeline.bitmapLayers.map(l => this._serializeLayer(l)),
                vectorLayer: vectorLayerData 
            }
        };

        return exportData;
    }

    /**
     * Helper to recursively trim number precision in objects
     */
    _trimPrecision(obj) {
        if (typeof obj === 'number') {
            // Keep 2 decimal places. 
            // Math.round(num * 100) / 100 is fast.
            return Math.round(obj * 100) / 100;
        }
        if (Array.isArray(obj)) {
            return obj.map(v => this._trimPrecision(v));
        }
        if (obj !== null && typeof obj === 'object') {
            const newObj = {};
            for (const key in obj) {
                newObj[key] = this._trimPrecision(obj[key]);
            }
            return newObj;
        }
        return obj;
    }

    _serializeLayer(layer) {
        const serialized = {
            id: layer.id,
            type: layer.type,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            blendingMode: layer.blendingMode,
            opacity: layer.opacity,
            frames: {} // Will be frameIndex -> dataURL
        };

        if (layer.startFrame !== undefined) serialized.startFrame = layer.startFrame;
        if (layer.duration !== undefined) serialized.duration = layer.duration;
        // Keep other properties
        if (layer.undeletable) serialized.undeletable = true;
        if (layer.uncopyable) serialized.uncopyable = true;

        // Serialize Frames
        if (layer.frames) {
            const isBgLike = layer.type === 'background' || layer.id === 'layer_bg';
            const frameMeta = {};

            // If background is invisible or every frame is pure black / pure white / fully transparent, skip storing pixels.
            // This keeps "空白背景" from bloating the .vif while preserving metadata.
            const shouldSkipFrames = isBgLike && (
                layer.visible === false ||
                this._areAllFramesSolidBg(layer.frames)
            );

            if (!shouldSkipFrames) {
                for (const [frameIndex, canvas] of Object.entries(layer.frames)) {
                    if (!(canvas instanceof HTMLCanvasElement)) continue;
                    // Skip blank frames to avoid bloating multi-frame files with empty layers
                    if (this._isCanvasFullyTransparent(canvas)) continue;

                    const bbox = this._getOpaqueBoundingBox(canvas);
                    if (bbox) {
                        // Crop to minimal bounding box to shrink dataURL
                        const cropCanvas = document.createElement('canvas');
                        cropCanvas.width = bbox.width;
                        cropCanvas.height = bbox.height;
                        const ctx = cropCanvas.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(
                            canvas,
                            bbox.x, bbox.y, bbox.width, bbox.height,
                            0, 0, bbox.width, bbox.height
                        );
                        serialized.frames[frameIndex] = cropCanvas.toDataURL('image/png');
                        frameMeta[frameIndex] = {
                            x: bbox.x,
                            y: bbox.y,
                            width: bbox.width,
                            height: bbox.height,
                            canvasWidth: canvas.width,
                            canvasHeight: canvas.height
                        };
                    } else {
                        serialized.frames[frameIndex] = canvas.toDataURL('image/png');
                    }
                }
            }

            if (Object.keys(frameMeta).length > 0) {
                serialized.frameMeta = frameMeta;
            }
        }

        return serialized;
    }

    _areAllFramesSolidBg(frames) {
        const entries = Object.entries(frames);
        if (entries.length === 0) return false;

        return entries.every(([_, canvas]) => this._isSolidBgColor(canvas));
    }

    _isSolidBgColor(canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) return false;
        const { width, height } = canvas;
        if (!width || !height) return false;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return false;

        const data = ctx.getImageData(0, 0, width, height).data;
        if (data.length < 4) return false;

        const r0 = data[0];
        const g0 = data[1];
        const b0 = data[2];
        const a0 = data[3];

        const isAllowed = (
            (r0 === 0 && g0 === 0 && b0 === 0 && (a0 === 0 || a0 === 255)) || // black or transparent
            (r0 === 255 && g0 === 255 && b0 === 255 && a0 === 255) // white
        );
        if (!isAllowed) return false;

        for (let i = 4; i < data.length; i += 4) {
            if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0 || data[i + 3] !== a0) {
                return false;
            }
        }
        return true;
    }

    _isCanvasFullyTransparent(canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) return false;
        const { width, height } = canvas;
        if (!width || !height) return true;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return false;

        const data = ctx.getImageData(0, 0, width, height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] !== 0) {
                return false;
            }
        }
        return true;
    }

    _getOpaqueBoundingBox(canvas) {
        if (!(canvas instanceof HTMLCanvasElement)) return null;
        const { width, height } = canvas;
        if (!width || !height) return null;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        const data = ctx.getImageData(0, 0, width, height).data;
        let minX = width, minY = height, maxX = -1, maxY = -1;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const a = data[idx + 3];
                if (a !== 0) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX === -1 || maxY === -1) return null; // fully transparent

        return {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }
}
