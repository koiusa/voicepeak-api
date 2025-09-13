#!/usr/bin/env python3
"""
Next.js クライアントのnullボディリクエストをテスト
"""
import requests
import json

def test_null_body_request():
    """nullボディのリクエストをテスト"""
    url = "http://localhost:3000/audio_query"
    params = {
        "text": "こんにちは",
        "speaker": "2041348160"
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    # "null"文字列をボディとして送信（Next.jsクライアントの問題を再現）
    try:
        print("=== null文字列ボディでのリクエストテスト ===")
        response = requests.post(url, params=params, headers=headers, data="null")
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンス: {response.text}")
        
        if response.status_code == 200:
            audio_query = response.json()
            print(f"音声クエリ作成成功: サンプリング周波数 {audio_query.get('outputSamplingRate', 'unknown')}Hz")
        
    except Exception as e:
        print(f"エラー: {e}")

def test_empty_body_request():
    """空ボディのリクエストをテスト"""
    url = "http://localhost:3000/audio_query"
    params = {
        "text": "こんにちは",
        "speaker": "2041348160"
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("\n=== 空ボディでのリクエストテスト ===")
        response = requests.post(url, params=params, headers=headers, data="")
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンス: {response.text}")
        
        if response.status_code == 200:
            audio_query = response.json()
            print(f"音声クエリ作成成功: サンプリング周波数 {audio_query.get('outputSamplingRate', 'unknown')}Hz")
        
    except Exception as e:
        print(f"エラー: {e}")

def test_no_body_request():
    """ボディなしのリクエストをテスト"""
    url = "http://localhost:3000/audio_query"
    params = {
        "text": "こんにちは",
        "speaker": "2041348160"
    }
    
    try:
        print("\n=== ボディなしでのリクエストテスト ===")
        response = requests.post(url, params=params)
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンス: {response.text}")
        
        if response.status_code == 200:
            audio_query = response.json()
            print(f"音声クエリ作成成功: サンプリング周波数 {audio_query.get('outputSamplingRate', 'unknown')}Hz")
        
    except Exception as e:
        print(f"エラー: {e}")

if __name__ == "__main__":
    test_null_body_request()
    test_empty_body_request()
    test_no_body_request()