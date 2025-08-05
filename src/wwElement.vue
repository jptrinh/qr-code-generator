<template>
    <div class="qr-code-container" :style="containerStyle">
        <div v-if="error" class="error-message">
            {{ error }}
        </div>
        <div v-show="!error" ref="qrContainer" :style="qrContainerStyle" class="qr-wrapper"></div>
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
            minHeight: '200px'
        }));

        const qrContainerStyle = computed(() => ({
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }));

        // Map error correction levels (per documentation)
        const getErrorCorrectionLevel = (level) => {
            const levels = {
                'L': 'L',     // Low ~7%
                'M': 'M',     // Medium ~15% 
                'Q': 'Q',     // Quartile ~25%
                'H': 'H'      // High ~30%
            };
            return levels[level] || 'M';
        };

        const getContainerSize = () => {
            if (!qrContainer.value) return 200;
            
            const containerRect = qrContainer.value.getBoundingClientRect();
            const parentRect = qrContainer.value.parentElement?.getBoundingClientRect();
            
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
                error.value = null;
                qrContainer.value.innerHTML = '';

                const text = props.content?.text || 'https://www.weweb.io';
                const size = getContainerSize();

                // QR code options (following official API)
                const options = {
                    width: size,
                    margin: 1,
                    color: {
                        dark: props.content?.foregroundColor || '#000000',
                        light: props.content?.backgroundColor || '#FFFFFF'
                    },
                    errorCorrectionLevel: getErrorCorrectionLevel(props.content?.errorCorrection || 'M'),
                    type: 'svg'
                };

                // Generate SVG string using official API
                const svgString = await QRCode.toString(text, options);

                // Create SVG element
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;

                if (!svgElement || svgElement.tagName !== 'svg') {
                    throw new Error('Failed to generate valid SVG');
                }

                // Make SVG responsive
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('viewBox', `0 0 ${size} ${size}`);
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                
                // Apply styles to prevent flickering
                svgElement.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100% !important;
                    max-height: 100% !important;
                    display: block !important;
                    transition: none !important;
                `;

                // Clear container and add SVG
                qrContainer.value.innerHTML = '';
                qrContainer.value.appendChild(svgElement);

                // Store data URL for download
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                setQrDataUrl(dataUrl);

            } catch (err) {
                console.error('Error generating QR code:', err);
                error.value = err.message.includes('too long') 
                    ? 'Text is too long for QR code' 
                    : 'Failed to generate QR code';
            }
        };

        const handleResize = () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            resizeTimeout = setTimeout(() => {
                generateQR();
            }, 250);
        };

        const downloadQR = async () => {
            if (!props.content?.text) {
                console.error('No text content to generate QR code');
                return;
            }

            try {
                const text = props.content.text;
                const size = Math.max(getContainerSize(), 512); // Minimum 512px for download

                const options = {
                    width: size,
                    margin: 2,
                    color: {
                        dark: props.content?.foregroundColor || '#000000',
                        light: props.content?.backgroundColor || '#FFFFFF'
                    },
                    errorCorrectionLevel: getErrorCorrectionLevel(props.content?.errorCorrection || 'M'),
                    type: 'image/png'
                };

                // Generate high-quality PNG for download using official API
                const pngDataUrl = await QRCode.toDataURL(text, options);

                const link = document.createElement('a');
                link.download = 'qrcode.png';
                link.href = pngDataUrl;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                
                setTimeout(() => {
                    if (document.body.contains(link)) {
                        document.body.removeChild(link);
                    }
                }, 100);

            } catch (err) {
                console.error('Error downloading QR code:', err);
                
                // Fallback to SVG download
                if (qrDataUrl.value) {
                    try {
                        const link = document.createElement('a');
                        link.download = 'qrcode.svg';
                        link.href = qrDataUrl.value;
                        link.style.display = 'none';
                        
                        document.body.appendChild(link);
                        link.click();
                        
                        setTimeout(() => {
                            if (document.body.contains(link)) {
                                document.body.removeChild(link);
                            }
                        }, 100);
                    } catch (fallbackErr) {
                        console.error('Both PNG and SVG download failed:', fallbackErr);
                    }
                }
            }
        };

        // Watch for property changes
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
            
            // Small delay to ensure container is properly sized
            setTimeout(() => {
                generateQR();
            }, 10);
            
            // Set up ResizeObserver
            if (window.ResizeObserver && qrContainer.value) {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(qrContainer.value);
                
                if (qrContainer.value.parentElement) {
                    resizeObserver.observe(qrContainer.value.parentElement);
                }
            } else {
                window.addEventListener('resize', handleResize);
            }
        });

        onBeforeUnmount(() => {
            // Cleanup
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
                resizeTimeout = null;
            }
            
            window.removeEventListener('resize', handleResize);
        });

        return {
            qrContainer,
            error,
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

    .qr-wrapper {
        width: 100%;
        height: 100%;
        padding: 4px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100px;

        svg {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            display: block !important;
            transition: none !important;
            transform: none !important;
            
            // Crisp rendering
            shape-rendering: crispEdges;
            image-rendering: pixelated;
        }
    }
}

// Responsive improvements
@media (max-width: 768px) {
    .qr-code-container {
        .error-message {
            font-size: 12px;
            padding: 0.75rem;
            max-width: 250px;
        }
        
        .qr-wrapper {
            padding: 2px;
        }
    }
}
</style>