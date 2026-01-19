"""
Maya1 TTS Integration for LiveKit Agents
Based on: https://huggingface.co/maya-research/maya1

Maya1 is a free, open-source TTS model with emotional voice support.
Apache 2.0 license - fully commercial use allowed.
"""

import asyncio
import io
import logging
from typing import AsyncIterable, Optional
from dataclasses import dataclass

import torch
import numpy as np
import soundfile as sf
from transformers import AutoModelForCausalLM, AutoTokenizer
from snac import SNAC

from livekit.agents import tts

logger = logging.getLogger("maya-tts")

# Maya1 special tokens
CODE_START_TOKEN_ID = 128257
CODE_END_TOKEN_ID = 128258
CODE_TOKEN_OFFSET = 128266
SNAC_MIN_ID = 128266
SNAC_MAX_ID = 156937
SNAC_TOKENS_PER_FRAME = 7
SOH_ID = 128259
EOH_ID = 128260
SOA_ID = 128261
BOS_ID = 128000
TEXT_EOT_ID = 128009


@dataclass
class MayaVoice:
    """Voice description for Maya1."""
    description: str
    
    # Preset voices
    ARIA = "Female, late 20s with an American accent, warm and friendly, conversational tone, medium pace"
    ARIA_EXCITED = "Female, late 20s with an American accent, energetic and enthusiastic, faster pace"
    MALE_PROFESSIONAL = "Male, early 30s with a neutral American accent, professional and calm"
    MALE_FRIENDLY = "Male, late 20s, warm baritone, friendly and approachable"


class MayaTTS(tts.TTS):
    """Maya1 Text-to-Speech for LiveKit Agents."""
    
    def __init__(
        self,
        voice_description: str = MayaVoice.ARIA,
        model_id: str = "maya-research/maya1",
        device: str = "auto",
    ):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=24000,
            num_channels=1,
        )
        self._voice_description = voice_description
        self._model_id = model_id
        self._device = device
        self._model = None
        self._tokenizer = None
        self._snac = None
        self._initialized = False
    
    async def _ensure_initialized(self):
        """Lazy load model on first use."""
        if self._initialized:
            return
        
        logger.info(f"Loading Maya1 model: {self._model_id}")
        
        # Determine device
        if self._device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
            elif torch.backends.mps.is_available():
                device = "mps"  # Apple Silicon
            else:
                device = "cpu"
        else:
            device = self._device
        
        logger.info(f"Using device: {device}")
        
        # Load model and tokenizer
        self._tokenizer = await asyncio.to_thread(
            AutoTokenizer.from_pretrained, self._model_id
        )
        
        self._model = await asyncio.to_thread(
            lambda: AutoModelForCausalLM.from_pretrained(
                self._model_id,
                torch_dtype=torch.bfloat16 if device != "cpu" else torch.float32,
                device_map=device,
            )
        )
        
        # Load SNAC codec
        self._snac = await asyncio.to_thread(
            lambda: SNAC.from_pretrained("hubertsiuzdak/snac_24khz").to(device)
        )
        
        self._initialized = True
        logger.info("✅ Maya1 model loaded successfully")
    
    def _build_prompt(self, text: str) -> str:
        """Build formatted prompt for Maya1."""
        soh_token = self._tokenizer.decode([SOH_ID])
        eoh_token = self._tokenizer.decode([EOH_ID])
        soa_token = self._tokenizer.decode([SOA_ID])
        sos_token = self._tokenizer.decode([CODE_START_TOKEN_ID])
        eot_token = self._tokenizer.decode([TEXT_EOT_ID])
        bos_token = self._tokenizer.bos_token
        
        formatted_text = f'<description="{self._voice_description}"> {text}'
        
        prompt = (
            soh_token + bos_token + formatted_text + eot_token +
            eoh_token + soa_token + sos_token
        )
        
        return prompt
    
    def _extract_snac_codes(self, token_ids: list) -> list:
        """Extract SNAC codes from generated tokens."""
        try:
            eos_idx = token_ids.index(CODE_END_TOKEN_ID)
        except ValueError:
            eos_idx = len(token_ids)
        
        snac_codes = [
            token_id for token_id in token_ids[:eos_idx]
            if SNAC_MIN_ID <= token_id <= SNAC_MAX_ID
        ]
        
        return snac_codes
    
    def _unpack_snac(self, snac_tokens: list) -> list:
        """Unpack 7-token SNAC frames to 3 hierarchical levels."""
        if snac_tokens and snac_tokens[-1] == CODE_END_TOKEN_ID:
            snac_tokens = snac_tokens[:-1]
        
        frames = len(snac_tokens) // SNAC_TOKENS_PER_FRAME
        snac_tokens = snac_tokens[:frames * SNAC_TOKENS_PER_FRAME]
        
        if frames == 0:
            return [[], [], []]
        
        l1, l2, l3 = [], [], []
        
        for i in range(frames):
            slots = snac_tokens[i*7:(i+1)*7]
            l1.append((slots[0] - CODE_TOKEN_OFFSET) % 4096)
            l2.extend([
                (slots[1] - CODE_TOKEN_OFFSET) % 4096,
                (slots[4] - CODE_TOKEN_OFFSET) % 4096,
            ])
            l3.extend([
                (slots[2] - CODE_TOKEN_OFFSET) % 4096,
                (slots[3] - CODE_TOKEN_OFFSET) % 4096,
                (slots[5] - CODE_TOKEN_OFFSET) % 4096,
                (slots[6] - CODE_TOKEN_OFFSET) % 4096,
            ])
        
        return [l1, l2, l3]
    
    def _decode_audio(self, snac_codes: list) -> np.ndarray:
        """Decode SNAC codes to audio waveform."""
        unpacked = self._unpack_snac(snac_codes)
        
        if not unpacked[0]:
            return np.zeros(0, dtype=np.float32)
        
        device = next(self._snac.parameters()).device
        
        codes = [
            torch.tensor(unpacked[0], device=device).unsqueeze(0),
            torch.tensor(unpacked[1], device=device).unsqueeze(0),
            torch.tensor(unpacked[2], device=device).unsqueeze(0),
        ]
        
        with torch.no_grad():
            audio = self._snac.decode(codes)
        
        return audio.squeeze().cpu().numpy()
    
    async def synthesize(self, text: str) -> AsyncIterable[tts.SynthesizedAudio]:
        """Synthesize speech from text."""
        await self._ensure_initialized()
        
        prompt = self._build_prompt(text)
        
        # Tokenize
        inputs = self._tokenizer(prompt, return_tensors="pt")
        input_ids = inputs.input_ids.to(self._model.device)
        attention_mask = inputs.attention_mask.to(self._model.device)
        
        # Generate
        def generate():
            with torch.no_grad():
                outputs = self._model.generate(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    max_new_tokens=4096,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.95,
                    pad_token_id=self._tokenizer.eos_token_id,
                )
            return outputs[0].tolist()
        
        generated = await asyncio.to_thread(generate)
        
        # Extract audio tokens (skip input tokens)
        audio_tokens = generated[len(input_ids[0]):]
        snac_codes = self._extract_snac_codes(audio_tokens)
        
        if not snac_codes:
            logger.warning("No audio generated")
            return
        
        # Decode to audio
        audio = await asyncio.to_thread(self._decode_audio, snac_codes)
        
        # Convert to bytes
        buffer = io.BytesIO()
        sf.write(buffer, audio, 24000, format='WAV', subtype='PCM_16')
        buffer.seek(0)
        audio_bytes = buffer.read()
        
        yield tts.SynthesizedAudio(
            request_id="maya-tts",
            frame=tts.AudioFrame(
                data=audio_bytes,
                sample_rate=24000,
                num_channels=1,
            ),
        )


# Convenience function for creating common voices
def create_maya_tts(voice: str = "aria") -> MayaTTS:
    """Create Maya TTS with preset voice."""
    voices = {
        "aria": MayaVoice.ARIA,
        "aria_excited": MayaVoice.ARIA_EXCITED,
        "male": MayaVoice.MALE_PROFESSIONAL,
        "male_friendly": MayaVoice.MALE_FRIENDLY,
    }
    
    description = voices.get(voice.lower(), MayaVoice.ARIA)
    return MayaTTS(voice_description=description)
