const audio = new Audio();
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const title = document.getElementById('title');
const progress = document.getElementById('progress');
const progressContainer = document.getElementById('progress-container');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const songSelect = document.getElementById('song-select');
const uploadForm = document.getElementById('uploadForm');
const songUploadForm = document.getElementById('songUploadForm');

let songs = [];
let currentSongIndex = 0;
let isPlaying = false;
let originalSongs = [];

// Kiểm tra quyền admin
function checkAdmin() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1') {
        uploadForm.style.display = 'block';
    }
}

// Xử lý upload bài hát
songUploadForm.addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(songUploadForm);
    
    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
            songUploadForm.reset();
        } else {
            alert('Lỗi: ' + (data.error || 'Không xác định'));
        }
    })
    .catch(() => alert('Lỗi kết nối server'));
});

// Lấy danh sách bài hát từ thư mục songs
async function fetchSongs() {
  try {
    const response = await fetch('songs/');
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const links = doc.getElementsByTagName('a');
    
    songs = Array.from(links)
      .filter(link => link.href.endsWith('.mp3'))
      .map(link => ({
        title: link.textContent.split('.')[0],
        url: link.href
      }));

    // Lưu danh sách gốc cho chức năng tìm kiếm
    originalSongs = [...songs];

    populateSongMenu();
    if(songs.length > 0) {
      loadSong(0);
    } else {
      title.textContent = 'Chưa có bài hát nào';
    }
  } catch (error) {
    title.textContent = 'Lỗi tải danh sách bài hát';
    console.error('Error fetching songs:', error);
  }
}

// Thêm options cho menu bài hát
function populateSongMenu() {
  songSelect.innerHTML = '';
  songs.forEach((song, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = song.title;
    songSelect.appendChild(option);
  });
}

// Load bài hát theo index
function loadSong(index) {
  if (songs.length === 0) return;
  if(index < 0) index = songs.length - 1;
  else if(index >= songs.length) index = 0;
  currentSongIndex = index;
  audio.src = songs[currentSongIndex].url;
  title.textContent = songs[currentSongIndex].title;
  songSelect.value = currentSongIndex;
}

// Phát nhạc
function playSong() {
  audio.play();
  isPlaying = true;
  playBtn.textContent = '⏸';
  playBtn.title = 'Tạm dừng';
}

// Dừng nhạc
function pauseSong() {
  audio.pause();
  isPlaying = false;
  playBtn.textContent = '▶';
  playBtn.title = 'Phát';
}

// Next bài
function nextSong() {
  loadSong(currentSongIndex + 1);
  playSong();
}

// Prev bài
function prevSong() {
  loadSong(currentSongIndex - 1);
  playSong();
}

// Cập nhật thanh tiến trình
function updateProgress() {
  if(audio.duration) {
    const percent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = percent + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  }
}

// Chuyển đổi thời gian dạng 0:00
function formatTime(sec) {
  const minutes = Math.floor(sec / 60) || 0;
  const seconds = Math.floor(sec % 60) || 0;
  return minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

// Click vào thanh progress để tua nhạc
progressContainer.addEventListener('click', e => {
  const width = progressContainer.clientWidth;
  const clickX = e.offsetX;
  if(audio.duration) {
    audio.currentTime = (clickX / width) * audio.duration;
  }
});

// Event listeners
playBtn.addEventListener('click', () => {
  isPlaying ? pauseSong() : playSong();
});

nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', prevSong);

audio.addEventListener('timeupdate', updateProgress);

audio.addEventListener('ended', nextSong);

songSelect.addEventListener('change', e => {
  loadSong(Number(e.target.value));
  playSong();
});

// Rain effect
function createRaindrop() {
  const rain = document.getElementById('rain');
  const drop = document.createElement('div');
  drop.classList.add('raindrop');
  const size = Math.random() * 2 + 1;
  drop.style.width = size + 'px';
  drop.style.height = size * 10 + 'px';
  drop.style.left = Math.random() * window.innerWidth + 'px';
  drop.style.animationDuration = (Math.random() * 1 + 0.5) + 's';
  rain.appendChild(drop);

  setTimeout(() => {
    drop.remove();
  }, 2000);
}
setInterval(createRaindrop, 50);

// Khởi tạo
checkAdmin();
fetchSongs();

// Hàm tìm kiếm nhạc trên YouTube Music
async function searchYouTubeMusic(query) {
  try {
    console.log('Đang tìm kiếm YouTube Music:', query);
    const response = await fetch(`http://localhost:3000/api/search?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Kết quả từ YouTube Music:', data);
    
    if (data.content) {
      return data.content.map(item => ({
        id: item.videoId,
        title: item.name,
        artist: item.artist ? item.artist[0].name : 'Unknown Artist',
        duration: item.duration,
        thumbnail: item.thumbnails[0].url,
        isYouTube: true
      }));
    }
    return [];
  } catch (error) {
    console.error('Lỗi tìm kiếm YouTube Music:', error);
    showError('Không thể tìm kiếm nhạc. Vui lòng thử lại sau.');
    return [];
  }
}

// Hàm hiển thị lỗi
function showError(message) {
  const searchResults = document.getElementById('search-results');
  searchResults.innerHTML = `<span class="error-message">${message}</span>`;
}

// Cập nhật hàm filterSongs để hiển thị thông tin chi tiết hơn
async function filterSongs(searchTerm) {
  const searchResults = document.getElementById('search-results');
  const searchResultsList = document.getElementById('search-results-list');
  
  if (!searchTerm.trim()) {
    songs = [...originalSongs];
    searchResults.textContent = '';
    searchResultsList.style.display = 'none';
    return;
  }

  try {
    // Hiển thị đang tìm kiếm
    searchResults.textContent = 'Đang tìm kiếm...';
    searchResultsList.style.display = 'none';

    // Tìm kiếm cả trong danh sách local và YouTube
    const localResults = originalSongs.filter(song => 
      song.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const youtubeResults = await searchYouTubeMusic(searchTerm);
    
    // Kết hợp kết quả
    songs = [
      ...localResults,
      ...youtubeResults
    ];
    
    if (songs.length === 0) {
      searchResults.innerHTML = '<span class="no-results">Không tìm thấy bài hát nào</span>';
      searchResultsList.style.display = 'none';
    } else {
      searchResults.textContent = `Tìm thấy ${songs.length} bài hát`;
      searchResultsList.innerHTML = songs.map((song, index) => `
        <div class="search-result-item" data-index="${index}">
          <div class="song-info">
            <img src="${song.isYouTube ? song.thumbnail : 'default-thumbnail.jpg'}" alt="${song.title}" class="song-thumbnail">
            <div class="song-details">
              <div class="song-title">${song.title}</div>
              <div class="song-artist">${song.isYouTube ? song.artist : 'Local'}</div>
            </div>
          </div>
          <div class="song-duration">${formatDuration(song.isYouTube ? song.duration : 0)}</div>
        </div>
      `).join('');
      searchResultsList.style.display = 'block';
    }
  } catch (error) {
    console.error('Lỗi trong quá trình tìm kiếm:', error);
    showError('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.');
  }
}

// Hàm format thời gian
function formatDuration(ms) {
  if (!ms) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Thêm event listener cho danh sách kết quả tìm kiếm
document.getElementById('search-results-list').addEventListener('click', (e) => {
  const item = e.target.closest('.search-result-item');
  if (item) {
    const index = parseInt(item.dataset.index);
    loadSong(index);
    playSong();
    // Ẩn danh sách kết quả sau khi chọn
    document.getElementById('search-results-list').style.display = 'none';
    // Xóa nội dung ô tìm kiếm
    document.getElementById('search-input').value = '';
  }
});

// Thêm event listener để ẩn danh sách khi click ra ngoài
document.addEventListener('click', (e) => {
  const searchContainer = document.querySelector('.search-input-wrapper');
  const searchResultsList = document.getElementById('search-results-list');
  if (!searchContainer.contains(e.target)) {
    searchResultsList.style.display = 'none';
  }
});

// Thêm event listener cho ô tìm kiếm
document.getElementById('search-input').addEventListener('input', (e) => {
  filterSongs(e.target.value);
}); 