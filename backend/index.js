import express from 'express';
import cors from 'cors';
import { exec, spawn } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/getVideoInfo', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  // yt-dlp must be installed globally or in your backend folder
  exec(`yt-dlp --dump-json "${url}"`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch video info', details: stderr });
    }
    try {
      const info = JSON.parse(stdout);
      res.json({
        title: info.title,
        thumbnail: info.thumbnail
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse video info' });
    }
  });
});

app.post('/api/download', async (req, res) => {
  const { url, resolution } = req.body;
  if (!url || !resolution) return res.status(400).json({ error: 'Missing url or resolution' });

  try {
    // First get video info to get the title
    const videoInfo = await new Promise((resolve, reject) => {
      exec(`yt-dlp --dump-json "${url}"`, (err, stdout, stderr) => {
        if (err) reject(err);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(e);
        }
      });
    });

    // Clean filename to be safe
    const safeTitle = videoInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}-${resolution}.mp4`;

    // Map resolution to yt-dlp format string (force exact resolution, fallback to next lower, then best)
    const formatMap = {
      '360p': 'bestvideo[height=360][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=360][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=360]+bestaudio/best[height=360]/best',
      '480p': 'bestvideo[height=480][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=480][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=480]+bestaudio/best[height=480]/best',
      '720p': 'bestvideo[height=720][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=720][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=720]+bestaudio/best[height=720]/best',
      '1080p': 'bestvideo[height=1080][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=1080][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=1080]+bestaudio/best[height=1080]/best',
      '1440p': 'bestvideo[height=1440][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=1440][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=1440]+bestaudio/best[height=1440]/best',
      '2160p': 'bestvideo[height=2160][vcodec=avc1][ext=mp4]+bestaudio[acodec=m4a][ext=m4a]/bestvideo[height=2160][vcodec=vp09][ext=webm]+bestaudio[acodec=opus][ext=webm]/bestvideo[height=2160]+bestaudio/best[height=2160]/best',
    };
    const format = formatMap[resolution] || 'bestvideo+bestaudio/best';

    // Set headers for proper download handling
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');

    const ytdlp = spawn('yt-dlp', [
      '-f', format,
      '--recode-video', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--no-progress',
      '--newline',
      '-o', '-',
      url,
    ]);

    ytdlp.stdout.pipe(res);
    
    ytdlp.stderr.on('data', (data) => {
      console.error('yt-dlp error:', data.toString());
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        res.status(500).end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      ytdlp.kill();
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
