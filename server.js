// server.js (DEBUG VERSION)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- DEBUGGING: Check if .env loaded correctly ---
console.log('--- Checking Environment Variables ---');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'Found' : 'MISSING!');
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Found' : 'MISSING!');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Found' : 'MISSING!');
console.log('--------------------------------------');

// Create uploads folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Data Path
const dataPath = path.join(__dirname, 'data.json');
const getProducts = () => fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];
const saveProducts = (products) => fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));

// Routes
app.post('/api/login', (req, res) => {
    res.json({ success: req.body.password === process.env.ADMIN_PASSWORD });
});

app.get('/api/products', (req, res) => res.json(getProducts()));

app.post('/api/products', (req, res) => {
    const products = getProducts();
    products.push({ id: Date.now(), ...req.body });
    saveProducts(products);
    res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
    saveProducts(getProducts().filter(p => p.id !== parseInt(req.params.id)));
    res.json({ success: true });
});

// --- IMAGE UPLOAD ROUTE (DEBUGGED) ---
app.post('/api/upload', upload.single('image'), async (req, res) => {
    console.log('1. Upload request received.');
    
    if (!req.file) {
        console.log('ERROR: No file found in request.');
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('2. File saved temporarily at:', req.file.path);

    try {
        console.log('3. Sending to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'exprezz_products'
        });
        
        console.log('4. SUCCESS! URL:', result.secure_url);
        
        // Delete temp file
        fs.unlinkSync(req.file.path);
        
        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('!!! CLOUDINARY ERROR !!!');
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));