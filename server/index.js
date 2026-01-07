import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const SAVES_DIR = path.join(__dirname, 'saves');
const MAX_SAVES = 100;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Ensure saves directory exists
if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// Helper function to get all saves
function getAllSaves() {
  try {
    const files = fs.readdirSync(SAVES_DIR);
    const saves = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const content = fs.readFileSync(path.join(SAVES_DIR, file), 'utf-8');
          const save = JSON.parse(content);
          return {
            id: save.id,
            name: save.name,
            createdAt: save.createdAt,
            updatedAt: save.updatedAt,
            metadata: save.metadata
          };
        } catch (err) {
          console.error(`Error reading save file ${file}:`, err);
          return null;
        }
      })
      .filter(save => save !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    
    return saves;
  } catch (err) {
    console.error('Error reading saves directory:', err);
    return [];
  }
}

// Helper function to delete oldest saves if limit exceeded
function enforceMaxSaves() {
  const saves = getAllSaves();
  if (saves.length >= MAX_SAVES) {
    // Sort by updatedAt and delete the oldest
    const toDelete = saves.slice(MAX_SAVES - 1);
    toDelete.forEach(save => {
      try {
        fs.unlinkSync(path.join(SAVES_DIR, `${save.id}.json`));
        console.log(`Deleted old save: ${save.name} (${save.id})`);
      } catch (err) {
        console.error(`Error deleting save ${save.id}:`, err);
      }
    });
  }
}

// GET /api/saves - List all saves
app.get('/api/saves', (req, res) => {
  try {
    const saves = getAllSaves();
    res.json({
      saves,
      total: saves.length,
      maxSaves: MAX_SAVES
    });
  } catch (err) {
    console.error('Error listing saves:', err);
    res.status(500).json({ error: 'Failed to list saves' });
  }
});

// GET /api/saves/:id - Get a specific save
app.get('/api/saves/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SAVES_DIR, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Save not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const save = JSON.parse(content);
    res.json(save);
  } catch (err) {
    console.error('Error reading save:', err);
    res.status(500).json({ error: 'Failed to read save' });
  }
});

// POST /api/saves - Create a new save
app.post('/api/saves', (req, res) => {
  try {
    const { name, data, metadata } = req.body;
    
    if (!name || !data) {
      return res.status(400).json({ error: 'Name and data are required' });
    }
    
    // Enforce max saves before creating new one
    enforceMaxSaves();
    
    const id = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const save = {
      id,
      name,
      data,
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now
    };
    
    const filePath = path.join(SAVES_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(save, null, 2));
    
    res.json({
      id,
      name,
      createdAt: now,
      updatedAt: now,
      metadata: metadata || {}
    });
  } catch (err) {
    console.error('Error creating save:', err);
    res.status(500).json({ error: 'Failed to create save' });
  }
});

// PUT /api/saves/:id - Update an existing save
app.put('/api/saves/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { data, metadata } = req.body;
    
    const filePath = path.join(SAVES_DIR, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Save not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const save = JSON.parse(content);
    
    const now = Date.now();
    const updatedSave = {
      ...save,
      data: data || save.data,
      metadata: metadata || save.metadata,
      updatedAt: now
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedSave, null, 2));
    
    res.json({
      id: updatedSave.id,
      name: updatedSave.name,
      createdAt: updatedSave.createdAt,
      updatedAt: now,
      metadata: updatedSave.metadata
    });
  } catch (err) {
    console.error('Error updating save:', err);
    res.status(500).json({ error: 'Failed to update save' });
  }
});

// DELETE /api/saves/:id - Delete a save
app.delete('/api/saves/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(SAVES_DIR, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Save not found' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Save deleted' });
  } catch (err) {
    console.error('Error deleting save:', err);
    res.status(500).json({ error: 'Failed to delete save' });
  }
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🥋 WRS Dojo Server running on http://localhost:${PORT}`);
  console.log(`📁 Saves directory: ${SAVES_DIR}`);
  console.log(`💾 Max saves: ${MAX_SAVES}`);
});
