import os
import re
import sys
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import yt_dlp
from urllib.parse import quote

# Cấu hình Spotify API
SPOTIFY_CLIENT_ID = "YOUR_CLIENT_ID"  # Thay thế bằng Client ID của bạn
SPOTIFY_CLIENT_SECRET = "YOUR_CLIENT_SECRET"  # Thay thế bằng Client Secret của bạn

# Tạo thư mục downloads nếu chưa tồn tại
if not os.path.exists('downloads'):
    os.makedirs('downloads')

def setup_spotify():
    """Thiết lập kết nối với Spotify API"""
    try:
        client_credentials_manager = SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        )
        return spotipy.Spotify(client_credentials_manager=client_credentials_manager)
    except Exception as e:
        print(f"Lỗi khi kết nối với Spotify API: {e}")
        sys.exit(1)

def extract_spotify_id(url):
    """Trích xuất ID từ URL Spotify"""
    pattern = r'track/([a-zA-Z0-9]+)'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    return None

def get_track_info(sp, track_id):
    """Lấy thông tin bài hát từ Spotify"""
    try:
        track = sp.track(track_id)
        return {
            'name': track['name'],
            'artist': track['artists'][0]['name'],
            'album': track['album']['name']
        }
    except Exception as e:
        print(f"Lỗi khi lấy thông tin bài hát: {e}")
        return None

def download_from_youtube(query, output_path, format='mp3'):
    """Tải nhạc từ YouTube"""
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': format,
            'preferredquality': '320',
        }],
        'outtmpl': output_path,
        'quiet': True,
        'no_warnings': True
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f"ytsearch:{query}"])
        return True
    except Exception as e:
        print(f"Lỗi khi tải nhạc: {e}")
        return False

def sanitize_filename(filename):
    """Làm sạch tên file"""
    return re.sub(r'[<>:"/\\|?*]', '', filename)

def download_spotify_track(url, format='mp3'):
    """Tải bài hát từ URL Spotify"""
    # Khởi tạo Spotify client
    sp = setup_spotify()
    
    # Lấy track ID
    track_id = extract_spotify_id(url)
    if not track_id:
        print("Không tìm thấy ID bài hát trong URL")
        return
    
    # Lấy thông tin bài hát
    track_info = get_track_info(sp, track_id)
    if not track_info:
        return
    
    # Tạo tên file
    filename = f"{track_info['artist']} - {track_info['name']}"
    filename = sanitize_filename(filename)
    output_path = os.path.join('downloads', filename)
    
    # Tạo query tìm kiếm
    search_query = f"{track_info['name']} {track_info['artist']} audio"
    
    print(f"\nĐang tải: {track_info['name']} - {track_info['artist']}")
    print(f"Album: {track_info['album']}")
    print(f"Định dạng: {format.upper()}")
    
    # Tải nhạc
    if download_from_youtube(search_query, output_path, format):
        print(f"Đã tải xong: {filename}.{format}")
    else:
        print("Tải thất bại!")

def print_usage():
    """In hướng dẫn sử dụng"""
    print("\nSử dụng:")
    print("python spotify_downloader.py <spotify_url> [format]")
    print("\nĐịnh dạng có sẵn:")
    print("- mp3 (mặc định)")
    print("- m4a")
    print("\nVí dụ:")
    print("python spotify_downloader.py https://open.spotify.com/track/... m4a")

def main():
    if len(sys.argv) < 2:
        print_usage()
        return
    
    url = sys.argv[1]
    format = 'mp3'  # Mặc định là MP3
    
    if len(sys.argv) > 2:
        format = sys.argv[2].lower()
        if format not in ['mp3', 'm4a']:
            print("Định dạng không hợp lệ! Chỉ hỗ trợ mp3 và m4a")
            return
    
    download_spotify_track(url, format)

if __name__ == "__main__":
    main() 