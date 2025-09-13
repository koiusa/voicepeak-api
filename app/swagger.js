import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Voicepeak API with VoiceVox Compatibility',
      version: '2.0.0',
      description: 'VoicepeakエンジンのためのREST API。音声合成、ナレーター管理、感情パラメータの制御機能を提供します。VoiceVox互換API（port 10101）も含まれています。\\n\\n**レート制限:**\\n- GET リクエスト: 50回/分\\n- POST リクエスト: 20回/分',
      contact: {
        name: 'API Support',
        email: 'support@voicepeak.example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: '開発サーバー（Voicepeak API + VoiceVox互換）'
      },
      {
        url: 'http://localhost:10101',
        description: 'VoiceVox互換サーバー（標準ポート）'
      }
    ],
    components: {
      schemas: {

        VoiceVoxErrorResponse: {
          type: 'object',
          properties: {
            detail: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  loc: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'エラー発生場所'
                  },
                  msg: {
                    type: 'string',
                    description: 'エラーメッセージ'
                  },
                  type: {
                    type: 'string',
                    description: 'エラータイプ'
                  }
                },
                required: ['loc', 'msg', 'type']
              },
              description: 'VoiceVox形式のエラー詳細'
            }
          },
          required: ['detail']
        },
        NarratorListResponse: {
          type: 'object',
          properties: {
            narrators: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '利用可能なナレーター名の配列'
            }
          },
          required: ['narrators']
        },
        EmotionListResponse: {
          type: 'object',
          properties: {
            emotions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '利用可能な感情パラメータの配列'
            },
            narrator: {
              type: 'string',
              description: 'ナレーター名（デフォルト感情一覧の場合のみ）'
            }
          },
          required: ['emotions']
        },
        SynthesizeRequest: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: '音声化するテキスト',
              maxLength: 1000,
              example: 'こんにちは、これはテストです'
            },
            narrator: {
              type: 'string',
              description: 'ナレーター名',
              default: 'Miyamai Moca',
              example: 'Miyamai Moca'
            },
            emotion: {
              type: 'string',
              description: '感情パラメータ',
              default: 'honwaka',
              example: 'honwaka'
            },
            speed: {
              type: 'integer',
              description: '音声速度（50-200）',
              minimum: 50,
              maximum: 200,
              default: 100,
              example: 100
            },
            pitch: {
              type: 'integer',
              description: '音声ピッチ（-50〜50）',
              minimum: -50,
              maximum: 50,
              default: 0,
              example: 0
            }
          },
          required: ['text']
        },
        Speaker: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'スピーカー名',
              example: 'Miyamai Moca'
            },
            speaker_uuid: {
              type: 'string',
              description: 'スピーカー固有ID',
              example: 'voicepeak-miyamai-moca'
            },
            styles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'スタイル名（感情）',
                    example: 'honwaka'
                  },
                  id: {
                    type: 'integer',
                    description: 'スタイルID',
                    example: 2041348162
                  },
                  type: {
                    type: 'string',
                    description: 'スタイルタイプ',
                    example: 'talk'
                  }
                }
              },
              description: '利用可能なスタイル（感情）一覧'
            },
            version: {
              type: 'string',
              description: 'スピーカーバージョン',
              example: '1.0.0'
            },
            supported_features: {
              type: 'object',
              properties: {
                permitted_synthesis_morphing: {
                  type: 'string',
                  description: '音声合成モーフィング許可設定',
                  example: 'ALL'
                }
              },
              description: 'サポートされている機能'
            }
          },
          required: ['name', 'speaker_uuid', 'styles']
        },
        AudioQuery: {
          type: 'object',
          properties: {
            accent_phrases: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'アクセント句情報'
            },
            speedScale: {
              type: 'number',
              description: '話速',
              default: 1.0
            },
            pitchScale: {
              type: 'number',
              description: 'ピッチ',
              default: 0.0
            },
            intonationScale: {
              type: 'number',
              description: 'イントネーション',
              default: 1.0
            },
            volumeScale: {
              type: 'number',
              description: '音量',
              default: 1.0
            },
            prePhonemeLength: {
              type: 'number',
              description: '開始無音時間',
              default: 0.1
            },
            postPhonemeLength: {
              type: 'number',
              description: '終了無音時間',
              default: 0.1
            },
            outputSamplingRate: {
              type: 'integer',
              description: 'サンプリングレート',
              default: 24000
            },
            outputStereo: {
              type: 'boolean',
              description: 'ステレオ出力',
              default: false
            },
            kana: {
              type: 'string',
              description: 'カナ読み',
              example: 'コンニチワ、コレワテストデス'
            }
          }
        },
        AudioQueryRequest: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: '音声化するテキスト',
              example: 'こんにちは、これはテストです'
            }
          },
          required: ['text']
        },
        SynthesisRequest: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: '音声化するテキスト',
              example: 'こんにちは、これはテストです'
            },
            speed: {
              type: 'integer',
              description: '音声速度（50-200）',
              minimum: 50,
              maximum: 200,
              default: 100
            },
            pitch: {
              type: 'integer',
              description: '音声ピッチ（-50〜50）',
              minimum: -50,
              maximum: 50,
              default: 0
            }
          },
          required: ['text']
        }
      }
    },
    paths: {
      '/api/narrators': {
        get: {
          tags: ['ナレーター管理'],
          summary: 'ナレーター一覧取得',
          description: '利用可能なナレーター一覧を取得します。',
          responses: {
            200: {
              description: 'ナレーター一覧',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/NarratorListResponse'
                  },
                  example: {
                    narrators: ['Miyamai Moca', 'Himari Akami', 'Jun Mizuki']
                  }
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    error: 'リクエスト制限に達しました。しばらく時間をおいてから再試行してください。',
                    keyword: 'rate_limit'
                  }
                }
              }
            },
            500: {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    error: 'ナレーター一覧の取得に失敗しました',
                    keyword: 'narrator_list_failed'
                  }
                }
              }
            }
          }
        }
      },
      '/api/emotions': {
        get: {
          tags: ['感情パラメータ管理'],
          summary: 'デフォルト感情一覧取得',
          description: 'デフォルトナレーター（Miyamai Moca）の感情パラメータ一覧を取得します。',
          responses: {
            200: {
              description: '感情パラメータ一覧',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/EmotionListResponse'
                  },
                  example: {
                    emotions: ['honwaka', 'fun', 'sad', 'angry', 'serious'],
                    narrator: 'Miyamai Moca'
                  }
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  }
                }
              }
            },
            500: {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    error: '感情一覧の取得に失敗しました',
                    keyword: 'emotion_list_failed'
                  }
                }
              }
            }
          }
        }
      },
      '/api/emotions/{narrator}': {
        get: {
          tags: ['感情パラメータ管理'],
          summary: '指定ナレーター感情一覧取得',
          description: '指定されたナレーターの感情パラメータ一覧を取得します。',
          parameters: [
            {
              in: 'path',
              name: 'narrator',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'ナレーター名',
              example: 'Miyamai Moca'
            }
          ],
          responses: {
            200: {
              description: '感情パラメータ一覧',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/EmotionListResponse'
                  },
                  example: {
                    emotions: ['honwaka', 'fun', 'sad', 'angry', 'serious']
                  }
                }
              }
            },
            400: {
              description: 'リクエストエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  examples: {
                    'invalid-narrator': {
                      summary: '無効なナレーター名',
                      value: {
                        error: 'ナレーター名が無効です',
                        keyword: 'invalid_narrator'
                      }
                    },
                    'invalid-character': {
                      summary: '不正な文字',
                      value: {
                        error: '許可されていない文字が含まれています',
                        keyword: 'invalid_character'
                      }
                    }
                  }
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  }
                }
              }
            },
            500: {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/synthesize': {
        post: {
          tags: ['音声合成'],
          summary: 'テキスト音声変換',
          description: 'テキストを音声ファイル（WAV形式）に変換します。生成されたファイルはバイナリデータとして返却されます。',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SynthesizeRequest'
                },
                example: {
                  text: 'こんにちは、これはテストです',
                  narrator: 'Miyamai Moca',
                  emotion: 'honwaka',
                  speed: 100,
                  pitch: 0
                }
              }
            }
          },
          responses: {
            200: {
              description: '音声ファイル（WAV形式）',
              content: {
                'audio/wav': {
                  schema: {
                    type: 'string',
                    format: 'binary'
                  }
                }
              },
              headers: {
                'Content-Type': {
                  description: 'MIMEタイプ',
                  schema: {
                    type: 'string',
                    example: 'audio/wav'
                  }
                },
                'Content-Disposition': {
                  description: 'ファイルダウンロード用ヘッダー',
                  schema: {
                    type: 'string',
                    example: 'attachment; filename="voice_12345.wav"'
                  }
                },
                'Cache-Control': {
                  description: 'キャッシュ制御',
                  schema: {
                    type: 'string',
                    example: 'no-cache, no-store, must-revalidate'
                  }
                }
              }
            },
            400: {
              description: 'リクエストエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  examples: {
                    'invalid-text': {
                      summary: 'テキストエラー',
                      value: {
                        error: 'テキストが必要です',
                        keyword: 'invalid_text'
                      }
                    },
                    'invalid-narrator': {
                      summary: 'ナレーターエラー',
                      value: {
                        error: 'ナレーター名が無効です',
                        keyword: 'invalid_narrator'
                      }
                    },
                    'invalid-emotion': {
                      summary: '感情エラー',
                      value: {
                        error: '感情パラメータが無効です',
                        keyword: 'invalid_emotion'
                      }
                    },
                    'invalid-number': {
                      summary: '数値パラメータエラー',
                      value: {
                        error: 'スピードは50-200の範囲で指定してください',
                        keyword: 'invalid_number'
                      }
                    },
                    'invalid-character': {
                      summary: '不正な文字',
                      value: {
                        error: '許可されていない文字が含まれています',
                        keyword: 'invalid_character'
                      }
                    }
                  }
                }
              }
            },
            422: {
              description: '音声ファイル生成エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    error: 'Voicepeakが音声ファイルを生成できませんでした。パラメータを確認してください。',
                    keyword: 'file_not_generated'
                  }
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    error: 'リクエスト制限に達しました。しばらく時間をおいてから再試行してください。',
                    keyword: 'rate_limit'
                  }
                }
              }
            },
            500: {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    error: '音声合成中にエラーが発生しました',
                    keyword: 'synthesis_failed'
                  }
                }
              }
            }
          }
        }
      },
      '/speakers': {
        get: {
          tags: ['VoiceVox互換'],
          summary: 'スピーカー一覧取得 (VoiceVox互換)',
          description: 'VoiceVoxと互換性のあるスピーカー情報一覧を取得します。',
          responses: {
            200: {
              description: 'スピーカー一覧',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Speaker'
                    }
                  },
                  example: [
                    {
                      name: 'Miyamai Moca',
                      speaker_uuid: 'voicepeak-miyamai-moca',
                      styles: [
                        { name: 'bosoboso', id: 2041348160, type: 'talk' },
                        { name: 'doyaru', id: 2041348161, type: 'talk' },
                        { name: 'honwaka', id: 2041348162, type: 'talk' },
                        { name: 'angry', id: 2041348163, type: 'talk' },
                        { name: 'teary', id: 2041348164, type: 'talk' }
                      ],
                      version: '1.0.0',
                      supported_features: {
                        permitted_synthesis_morphing: 'ALL'
                      }
                    }
                  ]
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    detail: [
                      {
                        loc: ['query'],
                        msg: 'リクエスト制限に達しました',
                        type: 'rate_limit_error'
                      }
                    ]
                  }
                }
              }
            },
            500: {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    detail: [
                      {
                        loc: ['server'],
                        msg: 'スピーカー一覧の取得に失敗しました',
                        type: 'internal_server_error'
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      '/audio_query': {
        post: {
          tags: ['VoiceVox互換'],
          summary: 'オーディオクエリ作成 (VoiceVox互換)',
          description: 'VoiceVoxと互換性のある音声合成用クエリを作成します。',
          parameters: [
            {
              in: 'query',
              name: 'text',
              required: true,
              schema: {
                type: 'string'
              },
              description: '音声合成するテキスト',
              example: 'こんにちは、これはテストです'
            },
            {
              in: 'query',
              name: 'speaker',
              required: true,
              schema: {
                type: 'integer'
              },
              description: 'スピーカー（スタイル）ID',
              example: 2041348162
            }
          ],
          responses: {
            200: {
              description: 'オーディオクエリ',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AudioQuery'
                  },
                  example: {
                    accent_phrases: [],
                    speedScale: 1.0,
                    pitchScale: 0.0,
                    intonationScale: 1.0,
                    volumeScale: 1.0,
                    prePhonemeLength: 0.1,
                    postPhonemeLength: 0.1,
                    outputSamplingRate: 24000,
                    outputStereo: false,
                    kana: 'コンニチワ、コレワテストデス'
                  }
                }
              }
            },
            400: {
              description: 'リクエストエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    detail: [
                      {
                        loc: ['query', 'text'],
                        msg: 'テキストが必要です',
                        type: 'missing'
                      }
                    ]
                  }
                }
              }
            },
            422: {
              description: 'バリデーションエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    detail: [
                      {
                        loc: ['query', 'speaker'],
                        msg: '無効なスピーカーIDです',
                        type: 'value_error'
                      }
                    ]
                  }
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/synthesis': {
        post: {
          tags: ['VoiceVox互換'],
          summary: '音声合成実行 (VoiceVox互換)',
          description: 'VoiceVoxと互換性のある音声合成を実行します。2つの形式をサポート: 1) 標準VoiceVoxワークフロー（オーディオクエリオブジェクト使用）、2) シンプルリクエスト（textパラメータ直接指定）',
          parameters: [
            {
              in: 'query',
              name: 'speaker',
              required: true,
              schema: {
                type: 'integer'
              },
              description: 'スピーカー（スタイル）ID',
              example: 2041348162
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/AudioQuery' },
                    { $ref: '#/components/schemas/SynthesisRequest' }
                  ]
                },
                examples: {
                  'audio-query': {
                    summary: 'オーディオクエリオブジェクト',
                    value: {
                      accent_phrases: [],
                      speedScale: 1.0,
                      pitchScale: 0.0,
                      intonationScale: 1.0,
                      volumeScale: 1.0,
                      outputSamplingRate: 24000,
                      outputStereo: false,
                      kana: 'コンニチワ、コレワテストデス'
                    }
                  },
                  'simple-request': {
                    summary: 'シンプルリクエスト',
                    value: {
                      text: 'こんにちは、これはテストです',
                      speed: 120,
                      pitch: -30
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: '音声ファイル（WAV形式）',
              content: {
                'audio/wav': {
                  schema: {
                    type: 'string',
                    format: 'binary'
                  }
                }
              },
              headers: {
                'Content-Type': {
                  description: 'MIMEタイプ',
                  schema: {
                    type: 'string',
                    example: 'audio/wav'
                  }
                }
              }
            },
            400: {
              description: 'リクエストエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    detail: [
                      {
                        loc: ['query', 'speaker'],
                        msg: 'スピーカーIDが必要です',
                        type: 'missing'
                      }
                    ]
                  }
                }
              }
            },
            422: {
              description: 'バリデーションエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  examples: {
                    'invalid-speed': {
                      summary: 'スピード範囲エラー',
                      value: {
                        detail: [
                          {
                            loc: ['body', 'speed'],
                            msg: 'スピードは50から200の間である必要があります',
                            type: 'value_error'
                          }
                        ]
                      }
                    },
                    'invalid-pitch': {
                      summary: 'ピッチ範囲エラー',
                      value: {
                        detail: [
                          {
                            loc: ['body', 'pitch'],
                            msg: 'ピッチは-50から50の間である必要があります',
                            type: 'value_error'
                          }
                        ]
                      }
                    }
                  }
                }
              }
            },
            429: {
              description: 'レート制限エラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  }
                }
              }
            },
            500: {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/VoiceVoxErrorResponse'
                  },
                  example: {
                    detail: [
                      {
                        loc: ['synthesis'],
                        msg: '音声合成中にエラーが発生しました',
                        type: 'internal_server_error'
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'ナレーター管理',
        description: 'ナレーター情報の取得'
      },
      {
        name: '感情パラメータ管理',
        description: '感情パラメータ情報の取得'
      },
      {
        name: '音声合成',
        description: 'テキストから音声への変換'
      },
      {
        name: 'VoiceVox互換',
        description: 'VoiceVoxとの互換性機能（port 10101）'
      }
    ]
  },
  apis: []
};

export const specs = swaggerJSDoc(options);
