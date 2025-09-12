#!/usr/bin/env python3
"""
AivisSpeech-Engine互換性テストスイート
"""

import requests
import json
import sys
import argparse

class VoicepeakCompatibilityTester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Voicepeak-Compatibility-Tester/1.0'
        })
        
    def test_voicepeak_endpoints(self):
        """従来のVoicepeak APIエンドポイントをテスト"""
        print("=== Voicepeak API テスト ===")
        
        # ナレーター一覧テスト
        print("1. ナレーター一覧取得:")
        try:
            response = self.session.get(f"{self.base_url}/api/narrators")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ 成功: {data}")
            else:
                print(f"   ✗ 失敗: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ✗ エラー: {e}")
            
        # 感情一覧テスト
        print("2. 感情一覧取得:")
        try:
            response = self.session.get(f"{self.base_url}/api/emotions")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ 成功: {data}")
            else:
                print(f"   ✗ 失敗: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ✗ エラー: {e}")
            
        # 音声合成テスト（小さなサンプル）
        print("3. 音声合成テスト:")
        try:
            payload = {
                "text": "こんにちは",
                "narrator": "Miyamai Moca",
                "emotion": "honwaka",
                "speed": 100,
                "pitch": 0
            }
            response = self.session.post(f"{self.base_url}/api/synthesize", json=payload)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'audio/wav' in content_type:
                    print(f"   ✓ 成功: WAVファイル生成 ({len(response.content)} bytes)")
                else:
                    print(f"   ✗ 失敗: 期待されるコンテンツタイプではありません ({content_type})")
            else:
                print(f"   ✗ 失敗: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ✗ エラー: {e}")
    
    def test_aivisspeech_endpoints(self):
        """AivisSpeech-Engine互換エンドポイントをテスト"""
        print("\n=== AivisSpeech-Engine互換 API テスト ===")
        
        # スピーカー一覧テスト
        print("1. スピーカー一覧取得 (/speakers):")
        try:
            response = self.session.get(f"{self.base_url}/speakers")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ 成功: スピーカー数 {len(data) if isinstance(data, list) else 'N/A'}")
                if isinstance(data, list) and len(data) > 0:
                    print(f"   　サンプル: {data[0].get('name', 'Unknown')} (UUID: {data[0].get('speaker_uuid', 'N/A')})")
            elif response.status_code == 503:
                data = response.json()
                print(f"   ⚠ AivisSpeech-Engine無効: {data.get('error', 'Unknown')}")
                return False
            else:
                print(f"   ✗ 失敗: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"   ✗ エラー: {e}")
            return False
            
        # オーディオクエリテスト
        print("2. オーディオクエリ作成 (/audio_query):")
        try:
            params = {
                "text": "テストです",
                "speaker": 0  # 最初のスピーカーIDを使用
            }
            response = self.session.post(f"{self.base_url}/audio_query", params=params)
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ 成功: オーディオクエリ作成")
                print(f"   　サンプリング周波数: {data.get('outputSamplingRate', 'N/A')}")
                print(f"   　話速: {data.get('speedScale', 'N/A')}")
                return data  # 次のテストで使用
            else:
                print(f"   ✗ 失敗: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ✗ エラー: {e}")
            return None
    
    def test_synthesis_compatibility(self, audio_query):
        """音声合成互換性テスト"""
        if not audio_query:
            print("3. 音声合成テスト: スキップ（オーディオクエリ作成失敗）")
            return
            
        print("3. 音声合成実行 (/synthesis):")
        try:
            params = {"speaker": 0}
            response = self.session.post(f"{self.base_url}/synthesis", 
                                       json=audio_query, 
                                       params=params)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'audio/wav' in content_type:
                    print(f"   ✓ 成功: WAVファイル生成 ({len(response.content)} bytes)")
                else:
                    print(f"   ✗ 失敗: 期待されるコンテンツタイプではありません ({content_type})")
            else:
                print(f"   ✗ 失敗: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ✗ エラー: {e}")
    
    def test_swagger_docs(self):
        """Swagger ドキュメントのテスト"""
        print("\n=== Swagger ドキュメントテスト ===")
        try:
            response = self.session.get(f"{self.base_url}/docs")
            if response.status_code == 200:
                print("   ✓ Swagger UI アクセス可能")
            else:
                print(f"   ✗ 失敗: {response.status_code}")
        except Exception as e:
            print(f"   ✗ エラー: {e}")
    
    def run_all_tests(self):
        """全テストを実行"""
        print(f"Voicepeak API互換性テスト開始: {self.base_url}")
        print("=" * 50)
        
        # 基本APIテスト
        self.test_voicepeak_endpoints()
        
        # AivisSpeech互換テスト
        audio_query = self.test_aivisspeech_endpoints()
        if audio_query:
            self.test_synthesis_compatibility(audio_query)
        
        # ドキュメントテスト
        self.test_swagger_docs()
        
        print("\n" + "=" * 50)
        print("テスト完了")

def main():
    parser = argparse.ArgumentParser(description='Voicepeak API互換性テスト')
    parser.add_argument('--url', default='http://localhost:3000', 
                       help='APIサーバーのベースURL (デフォルト: http://localhost:3000)')
    parser.add_argument('--aivisspeech-only', action='store_true',
                       help='AivisSpeech-Engine互換テストのみ実行')
    parser.add_argument('--voicepeak-only', action='store_true',
                       help='Voicepeak APIテストのみ実行')
    
    args = parser.parse_args()
    
    tester = VoicepeakCompatibilityTester(args.url)
    
    if args.aivisspeech_only:
        audio_query = tester.test_aivisspeech_endpoints()
        if audio_query:
            tester.test_synthesis_compatibility(audio_query)
    elif args.voicepeak_only:
        tester.test_voicepeak_endpoints()
    else:
        tester.run_all_tests()

if __name__ == "__main__":
    main()