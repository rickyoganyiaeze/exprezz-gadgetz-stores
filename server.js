// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
// Render sets the PORT environment variable automatically
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files (HTML, CSS, Images) from 'public' folder
app.use(express.static('public'));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer Setup (Temp storage for image uploads)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Data Path (Simple JSON database)
const dataPath = path.join(__dirname, 'data.json');

const getProducts = () => {
    if (!fs.existsSync(dataPath)) return [];
    const data = fs.readFileSync(dataPath);
    return JSON.parse(data);
};

const saveProducts = (products) => {
    fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
};

// --- ROUTES ---

// 1. Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// 2. Image Upload (Secure Server-Side Upload)
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'exprezz_products'
        });

        // Delete temp file after upload
        fs.unlinkSync(req.file.path);

        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

// 3. Get Products
app.get('/api/products', (req, res) => {
    res.json(getProducts());
});

// 4. Add Product
app.post('/api/products', (req, res) => {
    try {
        const products = getProducts();
        const newProduct = {
            id: Date.now(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        saveProducts(products);
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save product' });
    }
});

// 5. Delete Product
app.delete('/api/products/:id', (req, res) => {
    let products = getProducts();
    products = products.filter(p => p.id !== parseInt(req.params.id));
    saveProducts(products);
    res.json({ message: 'Deleted' });
});

// Start Server
// We use '0.0.0.0' so Render can see the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});