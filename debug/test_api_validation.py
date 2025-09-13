
import requests
import json

def test_speakers():
    url = 'http://localhost:3000/speakers'
    response = requests.get(url)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_audio_query_missing_text():
    url = 'http://localhost:3000/audio_query?speaker=0'
    response = requests.post(url, data={})
    assert response.status_code == 422
    error_data = response.json()
    assert 'detail' in error_data
    assert isinstance(error_data['detail'], list)
    first = error_data['detail'][0]
    for field in ['loc', 'msg', 'type']:
        assert field in first

def test_audio_query_invalid_speaker():
    url = 'http://localhost:3000/audio_query?speaker=99999'
    response = requests.post(url, data={'text': 'test'})
    assert response.status_code == 422
    error_data = response.json()
    assert 'detail' in error_data
    assert isinstance(error_data['detail'], list)
    first = error_data['detail'][0]
    for field in ['loc', 'msg', 'type']:
        assert field in first

def test_synthesis_invalid_speaker():
    url = 'http://localhost:3000/synthesis?speaker=99999'
    response = requests.post(url, json={'accent_phrases': 'invalid'})
    assert response.status_code == 422
    error_data = response.json()
    assert 'detail' in error_data
    assert isinstance(error_data['detail'], list)
    first = error_data['detail'][0]
    for field in ['loc', 'msg', 'type']:
        assert field in first

def test_swagger_ui():
    url = 'http://localhost:3000/docs/'
    response = requests.get(url)
    assert response.status_code == 200
