#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import os
import sys
from dotenv import load_dotenv

# .env.testファイルを読み込み（テスト専用設定）
load_dotenv(os.path.join(os.path.dirname(__file__), '.env.test'))

# 環境変数からAPIベースURLを取得
API_BASE = os.getenv('API_LOCAL_URL')

def test_narrators():
    """利用可能な音声一覧を取得"""
    print("1. 利用可能な音声一覧を取得...")
    try:
        response = requests.get(f"{API_BASE}/narrators")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 音声一覧取得成功: {len(data.get('narrators', []))}個の音声")
            return data.get('narrators', [])
        else:
            print(f"✗ 音声一覧取得失敗: {response.status_code}")
            return []
    except Exception as e:
        print(f"✗ エラー: {e}")
        return []

def test_emotions():
    """利用可能な感情一覧を取得"""
    print("\n2. 利用可能な感情一覧を取得...")
    try:
        response = requests.get(f"{API_BASE}/emotions")
        if response.status_code == 200:
            data = response.json()
            emotions = data.get('emotions', [])
            print(f"✓ 感情一覧取得成功: {len(emotions)}個の感情")
            if emotions:
                print("  利用可能な感情:")
                for emotion in emotions[:5]:  # 最初の5個を表示
                    print(f"    - {emotion}")
                if len(emotions) > 5:
                    print(f"    ... 他{len(emotions) - 5}個")
            return emotions
        else:
            print(f"✗ 感情一覧取得失敗: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  エラー詳細: {error_data}")
            except:
                print(f"  レスポンス: {response.text}")
            return []
    except Exception as e:
        print(f"✗ エラー: {e}")
        return []

def ensure_tmp_dir():
    tmp_dir = os.path.join(os.path.dirname(__file__), "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)
    return tmp_dir

def test_basic_synthesis():
    """基本的なテキスト音声変換"""
    print("\n3. 基本的なテキスト音声変換...")
    try:
        data = {
            "text": "こんにちは、これはPythonからのテストです"
        }
        response = requests.post(f"{API_BASE}/synthesize", json=data)
        tmp_dir = ensure_tmp_dir()
        if response.status_code == 200:
            filename = os.path.join(tmp_dir, "test_python_basic.wav")
            with open(filename, "wb") as f:
                f.write(response.content)
            file_size = os.path.getsize(filename)
            print(f"✓ 音声ファイル生成成功: {filename} ({file_size} バイト)")
            return True
        else:
            print(f"✗ 音声生成失敗: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  エラー詳細: {error_data}")
            except:
                print(f"  レスポンス: {response.text}")
            return False
    except Exception as e:
        print(f"✗ エラー: {e}")
        return False

def test_emotion_synthesis(emotions):
    """感情を指定した音声合成のテスト"""
    print("\n4. 感情指定音声合成...")
    if not emotions:
        print("  スキップ: 感情一覧が取得できていません")
        return False
    # 最初の感情を使ってテスト
    emotion = emotions[0]
    print(f"  感情「{emotion}」を使用してテスト...")
    try:
        data = {
            "text": f"今度は{emotion}の感情でテストします",
            "emotion": emotion
        }
        response = requests.post(f"{API_BASE}/synthesize", json=data)
        tmp_dir = ensure_tmp_dir()
        if response.status_code == 200:
            filename = os.path.join(tmp_dir, f"test_python_emotion_{emotion}.wav")
            with open(filename, "wb") as f:
                f.write(response.content)
            file_size = os.path.getsize(filename)
            print(f"✓ 感情指定音声ファイル生成成功: {filename} ({file_size} バイト)")
            return True
        else:
            print(f"✗ 感情指定音声生成失敗: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  エラー詳細: {error_data}")
            except:
                print(f"  レスポンス: {response.text}")
            return False
    except Exception as e:
        print(f"✗ エラー: {e}")
        return False

def test_options_synthesis():
    """オプション付きテキスト音声変換"""
    print("\n5. オプション付きテキスト音声変換...")
    try:
        data = {
            "text": "今度は音声オプションを指定してテストします",
            "speed": 120,
            "pitch": -30
        }
        response = requests.post(f"{API_BASE}/synthesize", json=data)
        tmp_dir = ensure_tmp_dir()
        if response.status_code == 200:
            filename = os.path.join(tmp_dir, "test_python_options.wav")
            with open(filename, "wb") as f:
                f.write(response.content)
            file_size = os.path.getsize(filename)
            print(f"✓ オプション付き音声ファイル生成成功: {filename} ({file_size} バイト)")
            return True
        else:
            print(f"✗ オプション付き音声生成失敗: {response.status_code}")
            try:
                error_data = response.json()
                print(f"  エラー詳細: {error_data}")
            except:
                print(f"  レスポンス: {response.text}")
            return False
    except Exception as e:
        print(f"✗ エラー: {e}")
        return False

def test_error_cases():
    """エラーケースのテスト"""
    print("\n6. エラーケースのテスト...")
    
    # 空のテキスト
    print("  6.1 空のテキストテスト...")
    try:
        data = {"text": ""}
        response = requests.post(f"{API_BASE}/synthesize", json=data)
        if response.status_code == 400:
            print("  ✓ 空のテキストで適切にエラーが返されました")
        else:
            print(f"  ✗ 予期しないレスポンス: {response.status_code}")
    except Exception as e:
        print(f"  ✗ エラー: {e}")
    
    # 長すぎるテキスト
    print("  6.2 長すぎるテキストテスト...")
    try:
        data = {"text": "あ" * 1001}
        response = requests.post(f"{API_BASE}/synthesize", json=data)
        if response.status_code == 400:
            print("  ✓ 長すぎるテキストで適切にエラーが返されました")
        else:
            print(f"  ✗ 予期しないレスポンス: {response.status_code}")
    except Exception as e:
        print(f"  ✗ エラー: {e}")
    
    # 無効な感情
    print("  6.3 無効な感情テスト...")
    try:
        data = {
            "text": "無効な感情でテストします",
            "emotion": "invalid_emotion_name"
        }
        response = requests.post(f"{API_BASE}/synthesize", json=data)
        if response.status_code == 400:
            print("  ✓ 無効な感情で適切にエラーが返されました")
        else:
            print(f"  ✗ 予期しないレスポンス: {response.status_code}")
    except Exception as e:
        print(f"  ✗ エラー: {e}")

def main():
    print("=== Voicepeak API Python テスト ===\n")
    
    # サーバーが起動しているかチェック
    try:
        response = requests.get(f"{API_BASE}/narrators", timeout=5)
    except requests.exceptions.ConnectionError:
        print("✗ APIサーバーに接続できません。")
        print("  サーバーが起動していることを確認してください:")
        print("  npm start")
        sys.exit(1)
    except Exception as e:
        print(f"✗ 接続エラー: {e}")
        sys.exit(1)
    
    # テスト実行
    narrators = test_narrators()
    emotions = test_emotions()
    basic_success = test_basic_synthesis()
    emotion_success = test_emotion_synthesis(emotions)
    options_success = test_options_synthesis()
    test_error_cases()
    
    print("\n=== テスト結果まとめ ===")
    print(f"音声一覧取得: {'✓' if narrators else '✗'}")
    print(f"感情一覧取得: {'✓' if emotions else '✗'}")
    print(f"基本音声変換: {'✓' if basic_success else '✗'}")
    print(f"感情指定音声変換: {'✓' if emotion_success else '✗'}")
    print(f"オプション付き音声変換: {'✓' if options_success else '✗'}")
    
    print("\n生成されたファイル:")
    tmp_dir = os.path.join(os.path.dirname(__file__), "tmp")
    test_files = [
        os.path.join(tmp_dir, "test_python_basic.wav"),
        os.path.join(tmp_dir, "test_python_options.wav")
    ]
    if emotions:
        test_files.append(os.path.join(tmp_dir, f"test_python_emotion_{emotions[0]}.wav"))
    for filename in test_files:
        if os.path.exists(filename):
            size = os.path.getsize(filename)
            print(f"  {filename} ({size} バイト)")

if __name__ == "__main__":
    main()