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

        // Map error correction levels to qrcode package format
        const getErrorCorrectionLevel = (level) => {
            const levels = {
                'L': 'low',
                'M': 'medium',
                'Q': 'quartile',
                'H': 'high'
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
                error.value = null;
                qrContainer.value.innerHTML = '';

                const size = getContainerSize();
                const text = props.content?.text || 'https://www.weweb.io';

                // Prepare options for qrcode package
                const options = {
                    width: size,
                    margin: 1,
                    color: {
                        dark: props.content?.foregroundColor || '#000000',
                        light: props.content?.backgroundColor || '#FFFFFF'
                    },
                    errorCorrectionLevel: getErrorCorrectionLevel(props.content?.errorCorrection || 'M')
                };

                // Generate SVG using qrcode package
                const svgString = await QRCode.toString(text, {
                    ...options,
                    type: 'svg'
                });

                // Parse and configure SVG
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;

                // Make SVG responsive and fill container
                svgElement.setAttribute('width', '100%');
                svgElement.setAttribute('height', '100%');
                svgElement.setAttribute('viewBox', `0 0 ${size} ${size}`);
                svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgElement.style.maxWidth = '100%';
                svgElement.style.maxHeight = '100%';

                qrContainer.value.appendChild(svgElement);

                // Store data URL
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                setQrDataUrl(dataUrl);

            } catch (err) {
                console.error('Error generating QR code:', err);
                error.value = 'Failed to generate QR code';
            }
        };

        const handleResize = () => {
            // Debounce resize events
            clearTimeout(window.qrResizeTimeout);
            window.qrResizeTimeout = setTimeout(() => {
                generateQR();
            }, 250);
        };

        const downloadQR = () => {
            if (!qrDataUrl.value) {
                console.error('No QR code data URL available for download');
                return;
            }

            try {
                const link = document.createElement('a');
                const isDataUrlSVG = qrDataUrl.value.startsWith('data:image/svg+xml');

                link.download = isDataUrlSVG ? 'qrcode.svg' : 'qrcode.png';
                link.href = qrDataUrl.value;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                }, 100);
            } catch (err) {
                console.error('Error downloading QR code:', err);
            }
        };

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

        onMounted(() => {
            generateQR();
            
            // Set up ResizeObserver to handle container size changes
            if (window.ResizeObserver && qrContainer.value) {
                resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(qrContainer.value);
                // Also observe parent element if available
                if (qrContainer.value.parentElement) {
                    resizeObserver.observe(qrContainer.value.parentElement);
                }
            } else {
                // Fallback to window resize
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
            if (window.qrResizeTimeout) {
                clearTimeout(window.qrResizeTimeout);
            }
            
            // Clean up window resize listener
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
    }

    .qr-wrapper {
        width: 100%;
        height: 100%;
        padding: 4px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;

        img,
        canvas,
        svg {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain;
            display: block;
        }
    }
}
</style>