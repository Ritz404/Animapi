const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

const allowedOrigins = [
    'http://localhost:5173',
    'https://animedaily.vercel.app',
];

const API_KEY = process.env.API_KEY;
console.log(`API_KEY: ${API_KEY}`);

const corsOptions = {
    origin: function (origin, callback) {
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        if (!origin) return callback(null, true);
        if (!allowedOrigins.includes(origin)) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const checkApiKey = (req, res, next) => {
    const apiKey = req.query.apikey;
    console.log(`Received API Key: ${apiKey}`);

    if (!apiKey || apiKey !== API_KEY) {
        return res.status(403).json({ error: 'Invalid or missing API key' });
    }
    next();
};

app.get('/', (req, res) => {
    res.redirect(`/data/anime?apikey=${API_KEY}`);
});

app.get('/data/anime', checkApiKey, (req, res) => {
    const jsonFilePath = path.join(process.cwd(), 'public/data/anime.json');

    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read anime data' });
        }
        res.json(JSON.parse(data));
    });
});

app.put('/data/anime/:title', checkApiKey, (req, res) => {
    const titleToUpdate = req.params.title;
    const updatedAnime = req.body;
    const jsonFilePath = path.join(process.cwd(), 'public/data/anime.json');

    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read anime data' });
        }

        let animes = JSON.parse(data);
        const animeIndex = animes.findIndex(anime => anime.title === titleToUpdate);

        if (animeIndex === -1) {
            return res.status(404).json({ error: 'Anime not found' });
        }

        animes[animeIndex] = updatedAnime;

        fs.writeFile(jsonFilePath, JSON.stringify(animes, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to write anime data' });
            }
            res.status(200).json(updatedAnime);
        });
    });
});

app.delete('/data/anime/:title', checkApiKey, (req, res) => {
    const titleToDelete = req.params.title;
    const jsonFilePath = path.join(process.cwd(), 'public/data/anime.json');

    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read anime data' });
        }

        let animes = JSON.parse(data);
        animes = animes.filter(anime => {
            const hasJudul = anime.infoItems.some(item =>
                item.startsWith("Judul:") && item.split(": ")[1] === titleToDelete
            );
            return anime.title !== titleToDelete && !hasJudul;
        });

        fs.writeFile(jsonFilePath, JSON.stringify(animes, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to write anime data' });
            }
            res.status(204).send();
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;
