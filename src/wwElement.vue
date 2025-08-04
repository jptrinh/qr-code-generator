<template>
    <div class="qr-code-container" :style="containerStyle">
        <div v-if="error" class="error-message">
            {{ error }}
        </div>
        <div v-show="!error" ref="qrContainer" :style="qrContainerStyle" class="qr-wrapper"></div>
    </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import qrcode from 'davidshimjs-qrcodejs';
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
        let qrCode = null;

        // Internal state for the generated QR code
        const { value: qrDataUrl, setValue: setQrDataUrl } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'qrDataUrl',
            defaultValue: '',
        });

        const containerStyle = computed(() => ({
            width: '100%',
            height: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: props.content?.backgroundColor || '#FFFFFF'
        }));

        const qrContainerStyle = computed(() => ({
            width: '100%',
            height: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }));

        const postProcessSVG = (svgElement) => {
            if (!svgElement) return;

            const whitePixels = Array.from(svgElement.querySelectorAll('use[xlink\\:href="#template"]'));
            const overlapAmount = 0.04;
            const expandedSize = 1 + 2 * overlapAmount; // Original size + overlap on both sides

            whitePixels.forEach(pixel => {
                const x = parseFloat(pixel.getAttribute('x')) || 0;
                const y = parseFloat(pixel.getAttribute('y')) || 0;

                pixel.setAttribute('x', (x - overlapAmount).toFixed(2));
                pixel.setAttribute('y', (y - overlapAmount).toFixed(2));
                pixel.setAttribute('width', expandedSize.toFixed(2));
                pixel.setAttribute('height', expandedSize.toFixed(2));
            });
        };

        const generateQR = async () => {
            if (!qrContainer.value) return;

            try {
                error.value = null;

                //await loadQRCodeScript();

                if (qrCode) {
                    qrContainer.value.innerHTML = '';
                }

                const size = parseInt(props.content?.size) || 200;

                qrCode = new qrcode(qrContainer.value, {
                    text: props.content?.text || 'https://www.weweb.io',
                    width: size,
                    height: size,
                    colorDark: props.content?.foregroundColor || '#000000',
                    colorLight: props.content?.backgroundColor || '#FFFFFF',
                    correctLevel: qrcode.CorrectLevel[props.content?.errorCorrection || 'M'],
                    useSVG: true
                });

                setTimeout(() => {
                    const svgElement = qrContainer.value.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.width = '100%';
                        svgElement.style.height = 'auto';

                        // Post-process the SVG to add overlap
                        postProcessSVG(svgElement);

                        // Serialize the SVG to a data URL
                        const svgString = new XMLSerializer().serializeToString(svgElement);
                        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
                        setQrDataUrl(dataUrl);
                    }
                }, 100);

            } catch (err) {
                console.error('Error generating QR code:', err);
                error.value = 'Failed to generate QR code';
            }
        };

        const downloadQR = () => {
            if (!qrDataUrl.value) return;

            const link = document.createElement('a');
            link.download = 'qrcode.svg'; // Suggest .svg as the default download for SVG
            link.href = qrDataUrl.value;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
        });

        onBeforeUnmount(() => {
            if (qrCode) {
                qrCode = null;
            }
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

    .error-message {
        color: #dc3545;
        text-align: center;
        padding: 1rem;
        font-size: 14px;
    }

    .qr-wrapper {
        padding: 4px;

        img,
        canvas {
            width: 100% !important;
            height: auto !important;
        }
    }
}
</style>