"""
Audio processing utilities.
"""

import numpy as np
import soundfile as sf
import librosa
from typing import Tuple, Optional


def normalize_audio(
    audio: np.ndarray,
    target_db: float = -20.0,
    peak_limit: float = 0.85,
) -> np.ndarray:
    """
    Normalize audio to target loudness with peak limiting.
    
    Args:
        audio: Input audio array
        target_db: Target RMS level in dB
        peak_limit: Peak limit (0.0-1.0)
        
    Returns:
        Normalized audio array
    """
    # Convert to float32
    audio = audio.astype(np.float32)
    
    # Calculate current RMS
    rms = np.sqrt(np.mean(audio**2))
    
    # Calculate target RMS
    target_rms = 10**(target_db / 20)
    
    # Apply gain
    if rms > 0:
        gain = target_rms / rms
        audio = audio * gain
    
    # Peak limiting
    audio = np.clip(audio, -peak_limit, peak_limit)
    
    return audio


def load_audio(
    path: str,
    sample_rate: int = 24000,
    mono: bool = True,
) -> Tuple[np.ndarray, int]:
    """
    Load audio file with normalization.
    
    Args:
        path: Path to audio file
        sample_rate: Target sample rate
        mono: Convert to mono
        
    Returns:
        Tuple of (audio_array, sample_rate)
    """
    audio, sr = librosa.load(path, sr=sample_rate, mono=mono)
    return audio, sr


def save_audio(
    audio: np.ndarray,
    path: str,
    sample_rate: int = 24000,
) -> None:
    """
    Save audio file.
    
    Args:
        audio: Audio array
        path: Output path
        sample_rate: Sample rate
    """
    sf.write(path, audio, sample_rate)


def blend_audio_tracks(
    primary_audio: np.ndarray,
    secondary_audio: np.ndarray,
    secondary_weight: float = 0.5,
) -> np.ndarray:
    """
    Blend two audio signals with a weighted mix.

    Args:
        primary_audio: Audio from primary profile
        secondary_audio: Audio from secondary profile
        secondary_weight: Secondary blend weight (0.0 to 1.0)

    Returns:
        Blended mono audio
    """
    primary = np.asarray(primary_audio, dtype=np.float32).flatten()
    secondary = np.asarray(secondary_audio, dtype=np.float32).flatten()

    if primary.size == 0 and secondary.size == 0:
        return np.array([], dtype=np.float32)
    if primary.size == 0:
        return normalize_audio(secondary)
    if secondary.size == 0:
        return normalize_audio(primary)

    weight_secondary = float(np.clip(secondary_weight, 0.0, 1.0))
    weight_primary = 1.0 - weight_secondary

    max_len = max(len(primary), len(secondary))
    primary_padded = np.pad(primary, (0, max_len - len(primary)))
    secondary_padded = np.pad(secondary, (0, max_len - len(secondary)))

    mixed = (weight_primary * primary_padded) + (weight_secondary * secondary_padded)
    return normalize_audio(mixed)


def _smooth_log_spectral_envelope(
    log_magnitude: np.ndarray,
    window_size: int = 31,
) -> np.ndarray:
    """
    Smooth log magnitude across frequency bins to approximate a formant envelope.
    """
    if window_size < 3:
        return log_magnitude

    if window_size % 2 == 0:
        window_size += 1

    kernel = np.ones(window_size, dtype=np.float32) / float(window_size)
    return np.apply_along_axis(
        lambda frame: np.convolve(frame, kernel, mode="same"),
        axis=0,
        arr=log_magnitude,
    )


def apply_formant_shift(
    audio: np.ndarray,
    sample_rate: int,
    shift_factor: float = 1.0,
) -> np.ndarray:
    """
    Apply an approximate formant shift by warping the smoothed spectral envelope.

    Args:
        audio: Input audio
        sample_rate: Audio sample rate
        shift_factor: Formant shift factor (1.0 = unchanged)

    Returns:
        Audio with shifted formants (pitch preserved as much as possible)
    """
    source = np.asarray(audio, dtype=np.float32).flatten()
    if source.size == 0:
        return source

    factor = float(np.clip(shift_factor, 0.7, 1.4))
    if abs(factor - 1.0) < 1e-3:
        return source

    n_fft = 1024
    hop_length = 256

    stft_matrix = librosa.stft(source, n_fft=n_fft, hop_length=hop_length)
    magnitude = np.abs(stft_matrix)
    if magnitude.size == 0 or not np.any(magnitude):
        return source

    phase = np.angle(stft_matrix)
    log_magnitude = np.log(np.maximum(magnitude, 1e-7))
    envelope = _smooth_log_spectral_envelope(log_magnitude)
    residual = log_magnitude - envelope

    freq_bins = envelope.shape[0]
    source_bins = np.arange(freq_bins, dtype=np.float32)
    warped_bins = source_bins / factor

    shifted_envelope = np.empty_like(envelope)
    for frame_idx in range(envelope.shape[1]):
        shifted_envelope[:, frame_idx] = np.interp(
            warped_bins,
            source_bins,
            envelope[:, frame_idx],
            left=envelope[0, frame_idx],
            right=envelope[-1, frame_idx],
        )

    shifted_log_magnitude = shifted_envelope + residual
    shifted_magnitude = np.exp(shifted_log_magnitude)
    shifted_stft = shifted_magnitude * np.exp(1j * phase)

    shifted_audio = librosa.istft(
        shifted_stft,
        hop_length=hop_length,
        length=len(source),
    )

    return shifted_audio.astype(np.float32)


def apply_voice_effects(
    audio: np.ndarray,
    sample_rate: int,
    pitch_shift_semitones: float = 0.0,
    formant_shift: float = 1.0,
) -> np.ndarray:
    """
    Apply post-generation voice effects.

    Args:
        audio: Input audio
        sample_rate: Audio sample rate
        pitch_shift_semitones: Pitch shift in semitones
        formant_shift: Formant shift factor

    Returns:
        Processed audio
    """
    processed = np.asarray(audio, dtype=np.float32).flatten()
    if processed.size == 0:
        return processed

    has_formant_shift = abs(float(formant_shift) - 1.0) > 1e-3
    has_pitch_shift = abs(float(pitch_shift_semitones)) > 1e-3

    if not has_formant_shift and not has_pitch_shift:
        return processed

    if has_formant_shift:
        processed = apply_formant_shift(
            processed,
            sample_rate=sample_rate,
            shift_factor=float(formant_shift),
        )

    if has_pitch_shift:
        processed = librosa.effects.pitch_shift(
            processed,
            sr=sample_rate,
            n_steps=float(pitch_shift_semitones),
        ).astype(np.float32)

    processed = np.nan_to_num(processed, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)
    return normalize_audio(processed)


def validate_reference_audio(
    audio_path: str,
    min_duration: float = 2.0,
    max_duration: float = 30.0,
    min_rms: float = 0.01,
) -> Tuple[bool, Optional[str]]:
    """
    Validate reference audio for voice cloning.
    
    Args:
        audio_path: Path to audio file
        min_duration: Minimum duration in seconds
        max_duration: Maximum duration in seconds
        min_rms: Minimum RMS level
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        audio, sr = load_audio(audio_path)
        duration = len(audio) / sr
        
        if duration < min_duration:
            return False, f"Audio too short (minimum {min_duration} seconds)"
        if duration > max_duration:
            return False, f"Audio too long (maximum {max_duration} seconds)"
        
        rms = np.sqrt(np.mean(audio**2))
        if rms < min_rms:
            return False, "Audio is too quiet or silent"
        
        if np.abs(audio).max() > 0.99:
            return False, "Audio is clipping (reduce input gain)"
        
        return True, None
    except Exception as e:
        return False, f"Error validating audio: {str(e)}"
