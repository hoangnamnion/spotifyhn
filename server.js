const express = require('express');
const cors = require('cors');
const YoutubeMusicApi = require('youtube-music-api');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Khởi tạo YouTube Music API
const api = new YoutubeMusicApi();

// Khởi tạo API và xử lý lỗi
async function initializeAPI() {
  try {
    await api.initalize();
    console.log('YouTube Music API đã được khởi tạo thành công');
  } catch (error) {
    console.error('Lỗi khởi tạo YouTube Music API:', error);
  }
}

initializeAPI();

// API endpoint để tìm kiếm nhạc
app.get('/api/search', async (req, res) => {
  try {
    const { query, type } = req.query;
    console.log('Đang tìm kiếm:', query, 'loại:', type || 'song');
    
    const result = await api.search(query, type || 'song');
    console.log('Kết quả tìm kiếm:', result);
    
    res.json(result);
  } catch (error) {
    console.error('Lỗi tìm kiếm:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// API endpoint để lấy thông tin album
app.get('/api/album/:id', async (req, res) => {
  try {
    const result = await api.getAlbum(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint để lấy thông tin nghệ sĩ
app.get('/api/artist/:id', async (req, res) => {
  try {
    const result = await api.getArtist(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint để lấy thông tin playlist
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const result = await api.getPlaylist(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
}); 