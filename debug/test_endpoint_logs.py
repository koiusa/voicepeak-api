#!/usr/bin/env python3
"""
エンドポイント実行時のログテスト
"""
import requests
import json
import time

def test_speakers_endpoint():
    """スピーカー一覧エンドポイントをテスト"""
    url = "http://localhost:3000/speakers"
    
    try:
        print("=== /speakers エンドポイントテスト ===")
        response = requests.get(url)
        print(f"ステータスコード: {response.status_code}")
        
        if response.status_code == 200:
            speakers = response.json()
            print(f"スピーカー数: {len(speakers)}")
            if speakers:
                print(f"最初のスピーカー: {speakers[0]['name']}")
                print(f"スタイル数: {len(speakers[0]['styles'])}")
        else:
            print(f"エラーレスポンス: {response.text}")
        
    except Exception as e:
        print(f"エラー: {e}")

def test_audio_query_endpoint():
    """オーディオクエリエンドポイントをテスト"""
    url = "http://localhost:3000/audio_query"
    params = {
        "text": "こんにちは",
        "speaker": "2041348160"
    }
    
    try:
        print("\n=== /audio_query エンドポイントテスト ===")
        response = requests.post(url, params=params)
        print(f"ステータスコード: {response.status_code}")
        
        if response.status_code == 200:
            audio_query = response.json()
            print(f"サンプリング周波数: {audio_query.get('outputSamplingRate')}Hz")
            print(f"アクセント句数: {len(audio_query.get('accent_phrases', []))}")
        else:
            print(f"エラーレスポンス: {response.text}")
        
    except Exception as e:
        print(f"エラー: {e}")

def test_api_narrators_endpoint():
    """ナレーター一覧エンドポイントをテスト"""
    url = "http://localhost:3000/api/narrators"
    
    try:
        print("\n=== /api/narrators エンドポイントテスト ===")
        response = requests.get(url)
        print(f"ステータスコード: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            narrators = data.get('narrators', [])
            print(f"ナレーター数: {len(narrators)}")
            if narrators:
                print(f"ナレーター一覧: {', '.join(narrators[:3])}")
        else:
            print(f"エラーレスポンス: {response.text}")
        
    except Exception as e:
        print(f"エラー: {e}")

def test_synthesis_endpoint():
    """音声合成エンドポイントをテスト（ヘッダーのみ確認）"""
    url = "http://localhost:3000/synthesis"
    query_params = {
        "speaker": "2041348160"
    }
    audio_query = {
        "text": "テスト",
        "speed": 100,
        "pitch": 0
    }
    
    try:
        print("\n=== /synthesis エンドポイントテスト ===")
        response = requests.post(url, params=query_params, json=audio_query)
        print(f"ステータスコード: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type')}")
        
        if response.status_code == 200:
            print(f"レスポンスサイズ: {len(response.content)} bytes")
            print("音声ファイル生成成功")
        else:
            print(f"エラーレスポンス: {response.text}")
        
    except Exception as e:
        print(f"エラー: {e}")

if __name__ == "__main__":
    print("=== エンドポイント実行ログテスト開始 ===")
    print("サーバーログを確認してください...")
    
    # 各エンドポイントを順次テスト
    test_speakers_endpoint()
    time.sleep(1)
    
    test_audio_query_endpoint()
    time.sleep(1)
    
    test_api_narrators_endpoint()
    time.sleep(1)
    
    test_synthesis_endpoint()
    
    print("\n=== テスト完了 ===")