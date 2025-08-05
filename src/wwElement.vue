<template>
    <div class="qr-code-container" :style="containerStyle">
        <div v-if="error" class="error-message">
            {{ error }}
        </div>
        <div v-if="loading && !error" class="loading-message">
            Generating QR code...
        </div>
        <div v-show="!error && !loading" ref="qrContainer" :style="qrContainerStyle" class="qr-wrapper"></div>
    </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import QRCode from 'qrcode';

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },

    setup(props, { emit }) {
        const qrContainer = ref(null);
        const error = ref(null);
        const loading = ref(false);
        let resizeObserver = null;
        let resizeTimeout = null;

        // Internal state for the generated QR code
        const { value: qrDataUrl, setValue: setQrDataUrl } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'qrDataUrl',
            defaultValue: '',
        });

        const containerStyle = computed(() => ({
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: props.content?.backgroundColor || '#FFFFFF',
            minHeight: '200px' // Fallback minimum height
        }));

        const qrContainerStyle = computed(() => ({
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }));

        // Validate input text
        const validateInput = (text) => {
            if (!text || typeof text !== 'string') {
                throw new Error('Invalid input: text must be a non-empty string');
            }
            
            if (text.length > 2953) { // Max capacity for QR codes
                throw new Error('Text too long: maximum 2953 characters supported');
            }
            
            return text;
        };

        // Get error correction level mapping
        const getErrorCorrectionLevel = (level) => {
            const levels = {
                'L': 'low',     // ~7% damage recovery
                'M': 'medium',  // ~15% damage recovery  
                'Q': 'quartile',// ~25% damage recovery
                'H': 'high'     // ~30% damage recovery
            };
            return levels[level] || 'medium';
        };

        const getContainerSize = () => {
            if (!qrContainer.value) return 200;
            
            const containerRect = qrContainer.value.getBoundingClientRect();
            const parentRect = qrContainer.value.parentElement?.getBoundingClientRect();
            
            // Use the smaller dimension to ensure QR code fits properly
            const availableWidth = containerRect.width || parentRect?.width || 200;
            const availableHeight = containerRect.height || parentRect?.height || 200;
            
            // Use custom size if provided, otherwise use container size
            const customSize = parseInt(props.content?.size);
            if (customSize && customSize > 0) {
                return Math.min(customSize, Math.min(availableWidth, availableHeight));
            }
            
            return Math.min(availableWidth, availableHeight) || 200;
        };

        const generateQR = async () => {
            if (!qrContainer.value) return;

            try {
                loading.value = true;
                error.value = null;
                qrContainer.value.innerHTML = '';

                // Validate input
                const text = validateInput(props.content?.text || 'https://www.weweb.io');
                const size = getContainerSize();

                // Prepare QR code options
                const options = {
                    width: size,
                    margin: 1,
                    color: {
                        dark: props.content?.foregroundColor || '#000000',
                        light: props.content?.backgroundColor || '#FFFFFF'
                    },
                    errorCorrectionLevel: getErrorCorrectionLevel(props.content?.errorCorrection || 'M')
                };

                // Generate SVG string
                const svgString = await QRCode.toString(text, {
                    ...options,
                    type: 'svg'
                });

                // Parse SVG and make it responsive
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;
                
                if (!svgElement || svgElement.tagName !== 'svg') {
                    throw new Error('Invalid SVG generated');
                }

                // Configure SVG for responsiveness
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('viewBox', `0 0 ${size} ${size}`);
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgElement.style.maxWidth = '100%';
                svgElement.style.maxHeight = '100%';

                // Append to container
                qrContainer.value.appendChild(svgElement);

                // Store data URL for download/workflow usage
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                setQrDataUrl(dataUrl);

                loading.value = false;

            } catch (err) {
                loading.value = false;
                console.error('Error generating QR code:', err);
                
                // Provide user-friendly error messages
                if (err.message.includes('Invalid input')) {
                    error.value = 'Please provide valid text or URL';
                } else if (err.message.includes('Text too long')) {
                    error.value = 'Text is too long for QR code (max 2953 characters)';
                } else if (err.message.includes('network') || err.message.includes('fetch')) {
                    error.value = 'Network error - please try again';
                } else {
                    error.value = 'Failed to generate QR code';
                }
            }
        };

        const handleResize = () => {
            // Debounce resize events to avoid excessive regeneration
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            resizeTimeout = setTimeout(() => {
                generateQR();
            }, 250);
        };

        const downloadQR = async () => {
            if (!qrDataUrl.value) {
                console.error('No QR code data URL available for download');
                return;
            }

            try {
                // Check if we can also generate PNG for better compatibility
                const text = props.content?.text || 'https://www.weweb.io';
                const size = Math.max(getContainerSize(), 512); // Ensure minimum download size

                const options = {
                    width: size,
                    margin: 1,
                    color: {
                        dark: props.content?.foregroundColor || '#000000',
                        light: props.content?.backgroundColor || '#FFFFFF'
                    },
                    errorCorrectionLevel: getErrorCorrectionLevel(props.content?.errorCorrection || 'M')
                };

                // Generate high-quality PNG for download
                const pngDataUrl = await QRCode.toDataURL(text, options);

                const link = document.createElement('a');
                link.download = 'qrcode.png';
                link.href = pngDataUrl;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(link);
                }, 100);

            } catch (err) {
                console.error('Error downloading QR code:', err);
                
                // Fallback to SVG download if PNG fails
                try {
                    const link = document.createElement('a');
                    link.download = 'qrcode.svg';
                    link.href = qrDataUrl.value;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(link);
                    }, 100);
                } catch (fallbackErr) {
                    console.error('Both PNG and SVG download failed:', fallbackErr);
                }
            }
        };

        // Watch for property changes and regenerate QR code
        watch(
            () => [
                props.content?.text,
                props.content?.size,
                props.content?.foregroundColor,
                props.content?.backgroundColor,
                props.content?.errorCorrection
            ],
            () => {
                generateQR();
            },
            { deep: true }
        );

        onMounted(async () => {
            // Wait for DOM to be ready
            await nextTick();
            generateQR();
            
            // Set up ResizeObserver for responsive behavior
            if (window.ResizeObserver && qrContainer.value) {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(qrContainer.value);
                
                // Also observe parent element changes
                if (qrContainer.value.parentElement) {
                    resizeObserver.observe(qrContainer.value.parentElement);
                }
            } else {
                // Fallback to window resize for older browsers
                window.addEventListener('resize', handleResize);
            }
        });

        onBeforeUnmount(() => {
            // Clean up ResizeObserver
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            
            // Clean up resize timeout
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
                resizeTimeout = null;
            }
            
            // Clean up window resize listener
            window.removeEventListener('resize', handleResize);
        });

        return {
            qrContainer,
            error,
            loading,
            containerStyle,
            qrContainerStyle,
            downloadQR,
            qrDataUrl
        };
    }
};
</script>

<style lang="scss" scoped>
.qr-code-container {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;

    .error-message {
        color: #dc3545;
        text-align: center;
        padding: 1rem;
        font-size: 14px;
        background-color: rgba(220, 53, 69, 0.1);
        border-radius: 4px;
        border: 1px solid rgba(220, 53, 69, 0.2);
        max-width: 300px;
    }

    .loading-message {
        color: #6c757d;
        text-align: center;
        padding: 1rem;
        font-size: 14px;
        background-color: rgba(108, 117, 125, 0.1);
        border-radius: 4px;
        border: 1px solid rgba(108, 117, 125, 0.2);
        max-width: 300px;
        
        &::after {
            content: '';
            display: inline-block;
            width: 12px;
            height: 12px;
            margin-left: 8px;
            border: 2px solid #6c757d;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
    }

    .qr-wrapper {
        width: 100%;
        height: 100%;
        padding: 4px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            display: block;
            
            // Ensure crisp rendering
            shape-rendering: crispEdges;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: -moz-crisp-edges;
            image-rendering: crisp-edges;
        }
    }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

// Responsive improvements
@media (max-width: 768px) {
    .qr-code-container {
        .error-message,
        .loading-message {
            font-size: 12px;
            padding: 0.75rem;
            max-width: 250px;
        }
        
        .qr-wrapper {
            padding: 2px;
        }
    }
}

// High DPI displays
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .qr-wrapper svg {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
    }
}
</style>