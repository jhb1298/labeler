// server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// MongoDB connection with Mongoose
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1); // Exit if connection fails
    });

// Define Schema for labels
const labelSchema = new mongoose.Schema({
    imageIndex: {
        type: Number,
        required: true,
        unique: true // Ensure no duplicate image indices
    },
    label: {
        type: String,
        default: "" // Default to empty string if not provided
    },
    notes: {
        type: String,
        default: "" // Default to empty string if not provided
    },
    modifiedBy: {
        type: String,
        required: true // Password/signature is mandatory
    },
    lastModified: {
        type: Date,
        default: Date.now // Automatically set to current date/time
    }
});

const Label = mongoose.model('Label', labelSchema);

// Middleware for CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*'); // For development, use '*' or specific origin in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Get all labels
app.get('/api/labels', async (req, res) => {
    try {
        const labels = await Label.find();
        res.json(labels);
    } catch (error) {
        console.error("Error fetching labels:", error);
        res.status(500).json({ error: 'Failed to fetch labels' });
    }
});

// Save or update label
app.post('/api/labels', async (req, res) => {
    try {
        const { imageIndex, label, notes, modifiedBy } = req.body;

        // Validate required fields
        if (!imageIndex || !modifiedBy) {
            return res.status(400).json({ error: 'imageIndex and modifiedBy are required' });
        }

        // Check if imageIndex already exists (upsert handles this, but we log for clarity)
        const existingLabel = await Label.findOne({ imageIndex });
        if (existingLabel && existingLabel.modifiedBy !== modifiedBy) {
            return res.status(403).json({ error: 'This imageIndex is already labeled by another user' });
        }

        // Update or create new label
        const labelDoc = await Label.findOneAndUpdate(
            { imageIndex },
            { label, notes, modifiedBy, lastModified: Date.now() },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, data: labelDoc });
    } catch (error) {
        console.error("Error saving data:", error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});