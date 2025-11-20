export function generateVideoArtifactHtml(
  videoUrl: string,
  thumbnailUrl: string,
  artifactName: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${artifactName} - AI Generated Video</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 30px;
            max-width: 1200px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .subtitle {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .video-wrapper {
            position: relative;
            width: 100%;
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        video {
            width: 100%;
            height: auto;
            display: block;
        }
        
        .video-controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: #f8f9fa;
            color: #333;
        }
        
        .btn-secondary:hover {
            background: #e9ecef;
        }
        
        .metadata {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            font-size: 13px;
            color: #666;
        }
        
        .metadata-item {
            margin-bottom: 8px;
        }
        
        .metadata-label {
            font-weight: 600;
            color: #333;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            h1 {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 ${artifactName}</h1>
        
        <div class="video-wrapper">
            <video 
                id="videoPlayer" 
                controls 
                poster="${thumbnailUrl}"
                preload="metadata"
            >
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
        
        <div class="video-controls">
            <button class="btn btn-primary" onclick="playVideo()">▶️ Play</button>
            <button class="btn btn-secondary" onclick="pauseVideo()">⏸️ Pause</button>
            <button class="btn btn-secondary" onclick="restartVideo()">⏮️ Restart</button>
            <button class="btn btn-secondary" onclick="downloadVideo()">⬇️ Download</button>
            <button class="btn btn-secondary" onclick="fullscreenVideo()">⛶ Fullscreen</button>
        </div>
    </div>
    
    <script>
        const video = document.getElementById('videoPlayer');
        
        function playVideo() {
            video.play();
        }
        
        function pauseVideo() {
            video.pause();
        }
        
        function restartVideo() {
            video.currentTime = 0;
            video.play();
        }
        
        function downloadVideo() {
            const link = document.createElement('a');
            link.href = '${videoUrl}';
            link.download = '${artifactName.replace(/[^a-zA-Z0-9.-]/g, "_")}.mp4';
            link.click();
        }
        
        function fullscreenVideo() {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen();
            } else if (video.msRequestFullscreen) {
                video.msRequestFullscreen();
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                video.paused ? playVideo() : pauseVideo();
            } else if (e.code === 'KeyF') {
                fullscreenVideo();
            } else if (e.code === 'KeyR') {
                restartVideo();
            }
        });
    </script>
</body>
</html>`
}

