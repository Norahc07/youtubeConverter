import express from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

// Map resolution to yt-dlp format string
const formatMap = {
  '360p': 'bestvideo[height=360][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=360][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=360]+bestaudio/best[height=360]/best',
  '480p': 'bestvideo[height=480][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=480][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=480]+bestaudio/best[height=480]/best',
  '720p': 'bestvideo[height=720][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=720][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=720]+bestaudio/best[height=720]/best',
  '1080p': 'bestvideo[height=1080][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=1080][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=1080]+bestaudio/best[height=1080]/best',
  '1440p': 'bestvideo[height=1440][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=1440][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=1440]+bestaudio/best[height=1440]/best',
  '2160p': 'bestvideo[height=2160][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=2160][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=2160]+bestaudio/best[height=2160]/best'
};

app.post('/api/getVideoInfo', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Fetching video info for:', url);
    
    const result = await new Promise((resolve, reject) => {
      exec(`yt-dlp --dump-json "${url}"`, (error, stdout, stderr) => {
        if (error) {
          console.error('yt-dlp error:', error);
          console.error('yt-dlp stderr:', stderr);
          reject(error);
          return;
        }
        try {
          const info = JSON.parse(stdout);
          resolve(info);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          reject(parseError);
        }
      });
    });

    console.log('Successfully fetched video info');
    res.json(result);
  } catch (error) {
    console.error('Error in /api/getVideoInfo:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video info',
      details: error.message 
    });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, resolution } = req.body;
    if (!url || !resolution) {
      return res.status(400).json({ error: 'URL and resolution are required' });
    }

    console.log('Starting download for:', url, 'at resolution:', resolution);
    
    const format = formatMap[resolution];
    if (!format) {
      return res.status(400).json({ error: 'Invalid resolution' });
    }

    const result = await new Promise((resolve, reject) => {
      exec(`yt-dlp -f "${format}" "${url}" -o "downloads/%(title)s.%(ext)s"`, (error, stdout, stderr) => {
        if (error) {
          console.error('yt-dlp download error:', error);
          console.error('yt-dlp download stderr:', stderr);
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });

    console.log('Download completed successfully');
    res.json({ message: 'Download completed', output: result });
  } catch (error) {
    console.error('Error in /api/download:', error);
    res.status(500).json({ 
      error: 'Download failed',
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
