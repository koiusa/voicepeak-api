#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import sys
import os
from datetime import datetime

def test_voicevox_compatibility():
    """VoiceVox互換性テスト"""
    base_url = "http://localhost:3000"
    
    # tmpディレクトリを作成
    tmp_dir = "tmp"
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)
    
    print("VoiceVox API互換性テスト開始:", base_url)
    print("=" * 50)
    
    # 1. 統合API テスト
    print("=== Voicepeak API テスト ===")
    
    # ナレーター一覧
    try:
        response = requests.get(f"{base_url}/api/narrators")
        if response.status_code == 200:
            data = response.json()
            print(f"1. ナレーター一覧取得:")
            print(f"   ✓ 成功: {data}")
        else:
            print(f"   ✗ 失敗: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ✗ エラー: {e}")
    
    # 感情一覧
    try:
        response = requests.get(f"{base_url}/api/emotions")
        if response.status_code == 200:
            data = response.json()
            print(f"2. 感情一覧取得:")
            print(f"   ✓ 成功: {data}")
        else:
            print(f"   ✗ 失敗: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ✗ エラー: {e}")
    
    # 2. VoiceVox互換API テスト
    print("\n=== VoiceVox互換 API テスト ===")
    
    # スピーカー一覧
    try:
        response = requests.get(f"{base_url}/speakers")
        if response.status_code == 200:
            data = response.json()
            print(f"1. スピーカー一覧取得 (/speakers):")
            print(f"   ✓ 成功: スピーカー数 {len(data)}")
            if data:
                speaker = data[0]
                print(f"   　サンプル: {speaker['name']} (UUID: {speaker['speaker_uuid']})")
                speaker_id = speaker['styles'][0]['id']
                style_name = speaker['styles'][0]['name']
                print(f"   　スタイルID: {speaker_id} ({style_name})")
        else:
            print(f"   ✗ 失敗: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"   ✗ エラー: {e}")
        return
    
    # オーディオクエリ作成
    try:
        response = requests.post(f"{base_url}/audio_query", 
                               json={"text": "VoiceVox互換テストです", "speaker": str(speaker_id)})
        if response.status_code == 200:
            audio_query = response.json()
            print(f"2. オーディオクエリ作成 (/audio_query):")
            print(f"   ✓ 成功: オーディオクエリ作成")
            print(f"   　サンプリング周波数: {audio_query.get('outputSamplingRate', 'N/A')}")
            print(f"   　話速: {audio_query.get('speedScale', 'N/A')}")
        else:
            print(f"   ✗ 失敗: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"   ✗ エラー: {e}")
        return
    
    # 音声合成実行
    try:
        response = requests.post(f"{base_url}/synthesis?speaker={speaker_id}", 
                               json=audio_query)
        if response.status_code == 200:
            print(f"3. 音声合成実行 (/synthesis):")
            print(f"   ✓ 成功: WAVファイル生成 ({len(response.content)} bytes)")
            
            # 音声ファイルをtmpディレクトリに保存
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            wav_filename = f"voicevox_synthesis_{timestamp}.wav"
            wav_path = os.path.join(tmp_dir, wav_filename)
            
            with open(wav_path, 'wb') as f:
                f.write(response.content)
            print(f"   　保存先: {wav_path}")
        else:
            print(f"   ✗ 失敗: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ✗ 失敗: {e}")
    
    # 3. Swagger ドキュメント
    try:
        response = requests.get(f"{base_url}/docs")
        if response.status_code == 200:
            print(f"\n=== Swagger ドキュメントテスト ===")
            print(f"   ✓ Swagger UI アクセス可能")
        else:
            print(f"   ✗ Swagger UI アクセス失敗: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Swagger UI エラー: {e}")
    
    print("\n" + "=" * 50)
    print("テスト完了")

if __name__ == "__main__":
    test_voicevox_compatibility()