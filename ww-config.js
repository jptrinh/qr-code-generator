export default {
    editor: {
        label: {
            en: 'QR Code Generator',
        },
        icon: 'qr-code',
    },
    properties: {
        text: {
            label: { en: 'QR Code Content' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'https://www.weweb.io',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Bind to any text or URL that should be encoded in the QR code',
            },
            propertyHelp: {
                tooltip: 'The text or URL to encode in the QR code',
            },
            /* wwEditor:end */
        },
        size: {
            label: { en: 'Size' },
            type: 'Number',
            section: 'settings',
            bindable: true,
            defaultValue: '200',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Bind to a length value (px, %, etc)',
            },
            propertyHelp: {
                tooltip: 'The size of the QR code',
            },
            /* wwEditor:end */
        },
        foregroundColor: {
            label: { en: 'Foreground Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            defaultValue: '#000000',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Bind to a color value',
            },
            propertyHelp: {
                tooltip: 'The color of the QR code pattern',
            },
            /* wwEditor:end */
        },
        backgroundColor: {
            label: { en: 'Background Color' },
            type: 'Color',
            section: 'style',
            bindable: true,
            defaultValue: '#FFFFFF',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Bind to a color value',
            },
            propertyHelp: {
                tooltip: 'The background color of the QR code',
            },
            /* wwEditor:end */
        },
        errorCorrection: {
            label: { en: 'Error Correction' },
            type: 'TextSelect',
            section: 'settings',
            bindable: true,
            defaultValue: 'M',
            options: {
                options: [
                    { value: 'L', label: 'Low (7%)' },
                    { value: 'M', label: 'Medium (15%)' },
                    { value: 'Q', label: 'Quartile (25%)' },
                    { value: 'H', label: 'High (30%)' },
                ],
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Bind to error correction level (L, M, Q, H)',
            },
            propertyHelp: {
                tooltip: 'The error correction level determines how much damage the QR code can sustain while remaining scannable',
            },
            /* wwEditor:end */
        },
    },
    actions: [
        {
            name: 'downloadQR',
            label: { en: 'Download QR Code' },
            action: 'downloadQR',
        },
    ],
};