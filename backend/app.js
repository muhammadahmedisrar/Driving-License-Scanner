const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const {
    MultiFormatReader,
    BinaryBitmap,
    HybridBinarizer,
    RGBLuminanceSource,
} = require('@zxing/library');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(cors());

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Decode barcode
async function decodeBarcode(imagePath) {
    try {
        // Convert the image to raw pixel data (grayscale)
        const { data, info } = await sharp(imagePath)
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;

        // Prepare the ZXing reader
        const luminanceSource = new RGBLuminanceSource(data, width, height);
        const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        const reader = new MultiFormatReader();

        // Decode the barcode
        const result = reader.decode(binaryBitmap);
        return result.getText();
    } catch (error) {
        console.error('Decode Error:', error.message);
        throw new Error('Failed to decode barcode.');
    }
}

// Parse barcode text according to AAMVA DL/ID format
function parseBarcodeText(barcodeText) {
    const lines = barcodeText.split('\n'); // Split by line breaks
    const data = {};

    // Mapping based on AAMVA codes
    const fieldMappings = {
        DAQ: 'licenseNumber',  // Driver's License Number
        DCS: 'lastName',       // Last Name
        DAC: 'firstName',      // First Name
        DAD: 'middleName',     // Middle Name
        DAG: 'address',        // Street Address
        DAI: 'city',           // City
        DAJ: 'state',          // State
        DAK: 'zipCode',        // ZIP Code
        DBB: 'dateOfBirth',    // Date of Birth
        DBA: 'expirationDate', // Expiration Date
        DBC: 'gender',         // Gender (1=Male, 2=Female)
        DAU: 'height',         // Height in inches
        DAY: 'eyeColor',       // Eye Color
    };

    lines.forEach((line) => {
        const code = line.substring(0, 3); // First three characters are the code
        const value = line.substring(3).trim(); // The rest is the value

        if (fieldMappings[code]) {
            data[fieldMappings[code]] = value;
        }
    });

    // Format fields if necessary
    if (data.dateOfBirth) {
        data.dateOfBirth = formatDate(data.dateOfBirth); // MMDDYYYY -> MM/DD/YYYY
    }
    if (data.expirationDate) {
        data.expirationDate = formatDate(data.expirationDate); // MMDDYYYY -> MM/DD/YYYY
    }
    if (data.gender) {
        data.gender = data.gender === '1' ? 'Male' : 'Female';
    }
    if (data.height) {
        data.height = `${parseInt(data.height)} inches`; // Convert to readable height
    }

    return data;
}

// Helper function to format dates (MMDDYYYY -> MM/DD/YYYY)
function formatDate(date) {
    const month = date.substring(0, 2);
    const day = date.substring(2, 4);
    const year = date.substring(4, 8);
    return `${month}/${day}/${year}`;
}

app.post('/scan', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;

    try {
        // Decode barcode data from image
        const decodedData = await decodeBarcode(filePath);
        // Parse the decoded barcode text to structured data
        const parsedData = parseBarcodeText(decodedData);

        // Clean up the uploaded file
        fs.unlinkSync(filePath);

        // Send the structured data as response
        res.json({ data: parsedData });
    } catch (error) {
        // Clean up the uploaded file in case of error
        fs.unlinkSync(filePath);
        res.status(400).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
