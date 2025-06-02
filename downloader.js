const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');

// Tạo thư mục songs nếu chưa tồn tại
const songsDir = path.join(__dirname, 'songs');
fs.ensureDirSync(songsDir);

// Hàm trích xuất thông tin từ Spotify URL
function extractSpotifyInfo(url) {
  try {
    // Lấy track ID từ URL
    const trackId = url.match(/track\/([a-zA-Z0-9]+)/)?.[1];
    if (!trackId) {
      throw new Error('Không tìm thấy track ID trong URL Spotify');
    }
    return trackId;
  } catch (error) {
    console.error('Lỗi khi xử lý URL Spotify:', error);
    return null;
  }
}

// Hàm tải một bài hát
async function downloadSong(videoId, title, artist = '') {
  try {
    // Tạo tên file an toàn
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeArtist = artist.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = artist ? `${safeArtist}_${safeTitle}` : safeTitle;
    const outputPath = path.join(songsDir, `${fileName}.mp3`);

    // Kiểm tra nếu file đã tồn tại
    if (fs.existsSync(outputPath)) {
      console.log(`Bài hát "${title}" đã tồn tại, bỏ qua...`);
      return;
    }

    console.log(`Đang tải "${title}"${artist ? ` - ${artist}` : ''}...`);

    // Tải audio stream
    const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    // Chuyển đổi sang MP3
    await new Promise((resolve, reject) => {
      ffmpeg(audioStream)
        .audioBitrate(320)
        .save(outputPath)
        .on('end', () => {
          console.log(`Đã tải xong "${title}"${artist ? ` - ${artist}` : ''}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Lỗi khi tải "${title}":`, err);
          reject(err);
        });
    });

    return outputPath;
  } catch (error) {
    console.error(`Lỗi khi tải "${title}":`, error);
    throw error;
  }
}

// Hàm tải nhiều bài hát
async function downloadSongs(songs) {
  console.log(`Bắt đầu tải ${songs.length} bài hát...`);
  
  for (const song of songs) {
    try {
      await downloadSong(song.videoId, song.title, song.artist);
    } catch (error) {
      console.error(`Không thể tải "${song.title}":`, error);
    }
  }
  
  console.log('Hoàn thành tải nhạc!');
}

// Hàm tìm kiếm và tải nhạc
async function searchAndDownload(query, limit = 50) {
  try {
    const YoutubeMusicApi = require('youtube-music-api');
    const api = new YoutubeMusicApi();
    await api.initalize();

    console.log(`Đang tìm kiếm "${query}"...`);
    const result = await api.search(query, 'song');
    
    if (!result.content || result.content.length === 0) {
      console.log('Không tìm thấy bài hát nào!');
      return;
    }

    const songs = result.content
      .filter(item => item.type === 'song')
      .slice(0, limit)
      .map(item => ({
        videoId: item.videoId,
        title: item.name,
        artist: item.artist?.name || ''
      }));

    console.log(`Tìm thấy ${songs.length} bài hát, bắt đầu tải...`);
    await downloadSongs(songs);
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

// Hàm tải nhạc từ Spotify URL
async function downloadFromSpotify(url) {
  try {
    const trackId = extractSpotifyInfo(url);
    if (!trackId) {
      console.log('Không thể xử lý URL Spotify');
      return;
    }

    // Tìm kiếm bài hát trên YouTube Music
    const YoutubeMusicApi = require('youtube-music-api');
    const api = new YoutubeMusicApi();
    await api.initalize();

    // Lấy thông tin bài hát từ Spotify
    const response = await fetch(`https://open.spotify.com/track/${trackId}`);
    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' | Spotify', '') : null;

    if (!title) {
      console.log('Không thể lấy thông tin bài hát từ Spotify');
      return;
    }

    console.log(`Đang tìm kiếm "${title}"...`);
    const result = await api.search(title, 'song');
    
    if (!result.content || result.content.length === 0) {
      console.log('Không tìm thấy bài hát trên YouTube Music!');
      return;
    }

    const song = result.content[0];
    await downloadSong(song.videoId, song.name, song.artist?.name || '');
  } catch (error) {
    console.error('Lỗi khi tải từ Spotify:', error);
  }
}

// Xử lý tham số dòng lệnh
const args = process.argv.slice(2);
if (args[0]?.includes('spotify.com')) {
  downloadFromSpotify(args[0]);
} else {
  const searchQuery = args[0] || 'nhạc trẻ';
  const limit = parseInt(args[1]) || 50; // Tăng giới hạn mặc định lên 50 bài
  searchAndDownload(searchQuery, limit);
} 