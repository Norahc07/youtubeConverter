import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import './index.css';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function isValidYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/gi.test(url);
}

function getVideoId(url) {
  const match = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^&#]+)/);
  return match ? match[1] : '';
}

function Loader() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

export default function App() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [inputTouched, setInputTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const isValid = isValidYouTubeUrl(youtubeUrl);
  const videoId = getVideoId(youtubeUrl);
  const resolutions = ['360p', '480p', '720p', '1080p', '1440p', '2160p'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInputTouched(true);
    if (!isValid) return;
    setLoading(true);
    setError('');
    setSubmitted(false);
    try {
      const res = await fetch(`${apiUrl}/api/getVideoInfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVideoInfo(data);
      setSubmitted(true);
    } catch (err) {
      setError('Failed to fetch video info. Please check the link.');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!videoInfo || !selectedResolution) return;
    
    setIsDownloading(true);
    setDownloadProgress(1);
    setError('');

    // Animate progress bar (fake, since we can't get real progress)
    let progress = 1;
    const progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 3) + 1; // Random step for more natural feel
      if (progress >= 95) progress = 95; // Cap at 95% until download finishes
      setDownloadProgress(progress);
    }, 200);

    try {
      const response = await fetch(`${apiUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, resolution: selectedResolution }),
      });

      if (!response.ok) throw new Error('Download failed');

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${videoInfo.title}-${selectedResolution}.mp4`;

      // Create a download link
      const reader = response.body.getReader();
      const chunks = [];

      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      clearInterval(progressInterval);
      setDownloadProgress(100);

      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      
      // Create and click download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Download error:', error);
      setError('Download failed. Please try again.');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="page-container">
      {/* Header Section */}
      <header className="header-section">
        <h1 className="header-title">Michigi</h1>
        <h2 className="header-subtitle">Youtube Converter</h2>
      </header>
      {/* Form Section */}
      <form onSubmit={handleSubmit} className="form-container card-width">
        <label htmlFor="youtube-url" className="youtube-label">Paste your YouTube video link:</label>
        <input
          id="youtube-url"
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          onBlur={() => setInputTouched(true)}
          placeholder="Paste your YouTube video link:"
          className="youtube-input"
        />
        {inputTouched && !isValid && (
          <p className="input-error">Please enter a valid YouTube URL.</p>
        )}
        <button
          type="submit"
          className="convert-button"
          disabled={!isValid || loading}
        >
          {loading ? 'Loading...' : 'Convert'}
        </button>
      </form>
      {/* Video Card Section - Only show after Convert */}
      <AnimatePresence>
        {submitted && videoInfo && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="video-card card-width"
          >
            <div className="video-thumbnail">
              {videoId ? (
                <img
                  src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                  alt="thumbnail"
                />
              ) : (
                <span className="video-title">No Thumbnail</span>
              )}
            </div>
            <p className="video-title">{videoInfo.title}</p>
            <div className="select-resolution-label">Select Resolution:</div>
            <div className="resolution-buttons">
              {resolutions.map((res) => (
                <button
                  key={res}
                  type="button"
                  value={selectedResolution}
                  onClick={() => setSelectedResolution(res)}
                  className={`resolution-button${selectedResolution === res ? ' selected' : ''}`}
                >
                  {res}
                </button>
              ))}
            </div>
            <button
              className="download-button"
              disabled={!selectedResolution || isDownloading}
              onClick={handleDownload}
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Downloading... {downloadProgress}%
                </>
              ) : downloadProgress === 100 ? (
                <>
                  <span className="text-green-500 font-bold mr-2">&#10003;</span>
                  Download Complete!
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="inline-block align-middle mr-2 h-5 w-5" />
                  Download
                </>
              )}
            </button>
            {(isDownloading || downloadProgress === 100) && (
              <div className="w-full h-2 bg-gray-200 rounded mt-2 overflow-hidden">
                <div
                  className={`h-full ${downloadProgress === 100 ? 'bg-green-400' : 'bg-pink-400'} transition-all duration-300`}
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Error Message */}
      {error && <p className="input-error">{error}</p>}
      {/* Footer Section */}
      <footer className="footer">
        &copy; {new Date().getFullYear()} Michigi – YouTube Converter. All rights reserved.
      </footer>
    </div>
  );
}
