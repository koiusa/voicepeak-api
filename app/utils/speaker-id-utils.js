/**
 * Speaker ID management utilities
 * Centralizes logic for mapping between VoiceVox speaker IDs and Voicepeak narrator/emotion combinations
 */
import { SecurityUtils } from '../security.js';
import { Logger } from './logger.js';
import { CONFIG } from '../config/constants.js';

/**
 * Speaker ID utilities for VoiceVox compatibility
 */
export class SpeakerIdUtils {
    
    /**
     * Find narrator and emotion by VoiceVox style ID
     * Optimized version with caching support
     * @param {number} styleId - VoiceVox style ID
     * @param {string} voicepeakPath - Path to Voicepeak binary
     * @param {string} voicepeakDir - Voicepeak directory
     * @returns {Promise<object|null>} Narrator info object or null if not found
     */
    static async findNarratorByStyleId(styleId, voicepeakPath, voicepeakDir) {
        try {
            Logger.debug(`Looking up narrator for style ID: ${styleId}`);
            
            // Get narrator list
            const narratorResult = await SecurityUtils.safeExec(voicepeakPath, [
                '--list-narrator'
            ], { cwd: voicepeakDir });
            
            const narrators = narratorResult
                .split('\n')
                .filter(line => line.trim() && !line.includes('UserApplication'));
            
            let currentId = CONFIG.VOICEVOX.BASE_SPEAKER_ID;
            
            for (const narrator of narrators) {
                try {
                    // Get emotions for each narrator
                    const emotionResult = await SecurityUtils.safeExec(voicepeakPath, [
                        '--list-emotion',
                        narrator
                    ], { cwd: voicepeakDir });
                    
                    const emotions = emotionResult
                        .split('\n')
                        .filter(line => line.trim() && !line.includes('UserApplication'));
                    
                    for (const emotion of emotions) {
                        if (currentId === styleId) {
                            Logger.debug(`Found match: ${narrator} - ${emotion} (ID: ${styleId})`);
                            return {
                                narrator: narrator,
                                emotion: emotion
                            };
                        }
                        currentId++;
                    }
                } catch (emotionError) {
                    Logger.error(`Error getting emotions for narrator ${narrator}:`, emotionError.message);
                    // Use default emotion on error
                    if (currentId === styleId) {
                        return {
                            narrator: narrator,
                            emotion: CONFIG.DEFAULTS.EMOTION
                        };
                    }
                    currentId++;
                }
            }
            
            Logger.warn(`No narrator found for style ID: ${styleId}`);
            return null;
            
        } catch (error) {
            Logger.error('Narrator reverse lookup error:', error.message);
            return null;
        }
    }

    /**
     * Get VoiceVox compatible speakers list from Voicepeak narrators
     * @param {string} voicepeakPath - Path to Voicepeak binary
     * @param {string} voicepeakDir - Voicepeak directory
     * @returns {Promise<Array>} VoiceVox compatible speakers array
     */
    static async generateVoiceVoxSpeakersList(voicepeakPath, voicepeakDir) {
        try {
            Logger.debug('Generating VoiceVox compatible speakers list');
            
            // Get narrator list
            const result = await SecurityUtils.safeExec(voicepeakPath, [
                '--list-narrator'
            ], { cwd: voicepeakDir });
            
            const narrators = result
                .split('\n')
                .filter(line => line.trim() && !line.includes('UserApplication'));
            
            Logger.debug(`Found ${narrators.length} narrators: ${narrators.join(', ')}`);
            
            const speakers = [];
            let baseId = CONFIG.VOICEVOX.BASE_SPEAKER_ID;
            
            for (const narrator of narrators) {
                try {
                    // Get emotions for each narrator
                    const emotionResult = await SecurityUtils.safeExec(voicepeakPath, [
                        '--list-emotion',
                        narrator
                    ], { cwd: voicepeakDir });
                    
                    const emotions = emotionResult
                        .split('\n')
                        .filter(line => line.trim() && !line.includes('UserApplication'));
                    
                    Logger.debug(`Narrator ${narrator} emotions: ${emotions.join(', ')}`);
                    
                    // Convert emotions to VoiceVox styles format
                    const styles = emotions.map((emotion, index) => ({
                        name: emotion,
                        id: baseId + index,
                        type: "talk"
                    }));
                    
                    // Create VoiceVox compatible speaker object
                    speakers.push({
                        name: narrator,
                        speaker_uuid: CONFIG.VOICEVOX.DEFAULT_SPEAKER_UUID,
                        styles: styles,
                        version: "1.0.0",
                        supported_features: {
                            permitted_synthesis_morphing: "ALL"
                        }
                    });
                    
                    baseId += emotions.length;
                    
                } catch (emotionError) {
                    Logger.error(`Error getting emotions for narrator ${narrator}:`, emotionError.message);
                    
                    // Create speaker with default style on error
                    speakers.push({
                        name: narrator,
                        speaker_uuid: CONFIG.VOICEVOX.DEFAULT_SPEAKER_UUID,
                        styles: [{
                            name: "通常",
                            id: baseId,
                            type: "talk"
                        }],
                        version: "1.0.0",
                        supported_features: {
                            permitted_synthesis_morphing: "ALL"
                        }
                    });
                    baseId += 1;
                }
            }
            
            Logger.debug(`Generated ${speakers.length} VoiceVox compatible speakers`);
            return speakers;
            
        } catch (error) {
            Logger.error('Error generating VoiceVox speakers list:', error.message);
            throw error;
        }
    }

    /**
     * Validate speaker ID format
     * @param {any} speakerId - Speaker ID to validate
     * @returns {number} Validated speaker ID
     * @throws {Error} If speaker ID is invalid
     */
    static validateSpeakerId(speakerId) {
        const numericId = parseInt(speakerId);
        
        if (isNaN(numericId) || numericId < 0) {
            throw new Error('有効なスピーカーIDを指定してください');
        }
        
        return numericId;
    }

    /**
     * Extract emotion parameter with fallback
     * @param {string} emotion - Emotion string
     * @param {number} defaultValue - Default emotion value (0-100)
     * @returns {string} Formatted emotion parameter
     */
    static formatEmotionParameter(emotion, defaultValue = CONFIG.AUDIO_PARAMS.EMOTION_DEFAULT_VALUE) {
        if (!emotion) {
            return `${CONFIG.DEFAULTS.EMOTION}=${defaultValue}`;
        }
        
        return emotion.includes('=') ? emotion : `${emotion}=${defaultValue}`;
    }
}