import logging
import math
from typing import List

from scipy.stats import beta as beta_dist

from app.core.config import settings
from app.pipeline.models import DocumentEnrichedAsset, DocumentScoredAsset


def _safe_float(value, default: float = 0.5) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(f) or math.isinf(f):
        return default
    return max(0.0, min(1.0, f))

logger = logging.getLogger(__name__)

SIGNALS_WEIGHTS_DOC = {
    "evidence_strength": 0.30,
    "address_specificity": 0.20,
    "coordinate_source": 0.20,
    "name_quality": 0.15,
    "llm_confidence": 0.15,
}


def _evidence_strength(asset: DocumentEnrichedAsset) -> float:
    if asset.evidence_count >= 3:
        return 1.0
    if asset.evidence_count == 2:
        return 0.8
    if asset.evidence_quote:
        return 0.6
    return 0.3


def _address_specificity(asset: DocumentEnrichedAsset) -> float:
    value = (asset.address or "").strip()
    if not value:
        return 0.2
    score = 0.4
    if any(ch.isdigit() for ch in value):
        score += 0.2
    if "," in value:
        score += 0.2
    if len(value) > 30:
        score += 0.2
    return min(score, 1.0)


def _coordinate_source(asset: DocumentEnrichedAsset) -> float:
    if asset.coordinate_source == "reported":
        return 1.0
    if asset.coordinate_source == "google_geocoding":
        return 0.8
    if asset.coordinate_source == "llm":
        return 0.65
    if asset.coordinate_source == "default":
        return 0.2
    return 0.4


def _name_quality(asset: DocumentEnrichedAsset) -> float:
    name = asset.name.strip()
    if not name:
        return 0.2
    if len(name) < 4:
        return 0.3
    generic = {"instalacion", "planta", "oficina", "almacen", "centro"}
    tokens = {token.lower() for token in name.split()}
    overlap = len(tokens & generic)
    return max(0.35, min(1.0, 0.9 - overlap * 0.1))


def _confidence_tier(score: float) -> str:
    if score >= settings.CONFIDENCE_THRESHOLD_HIGH:
        return "HIGH"
    if score >= settings.CONFIDENCE_THRESHOLD_MEDIUM:
        return "MEDIUM"
    return "LOW"


def _compute_confidence(asset: DocumentEnrichedAsset) -> tuple[float, dict]:
    signals = {
        "evidence_strength": _safe_float(_evidence_strength(asset)),
        "address_specificity": _safe_float(_address_specificity(asset)),
        "coordinate_source": _safe_float(_coordinate_source(asset)),
        "name_quality": _safe_float(_name_quality(asset)),
        "llm_confidence": _safe_float(asset.llm_confidence),
    }

    raw = sum(SIGNALS_WEIGHTS_DOC[key] * signals[key] for key in SIGNALS_WEIGHTS_DOC)
    raw = _safe_float(raw)
    alpha = 1 + raw * 10
    beta_param = 1 + (1 - raw) * 10
    score = float(beta_dist.mean(alpha, beta_param))
    score = _safe_float(score)
    return round(score, 3), {k: round(v, 3) for k, v in signals.items()}


async def score_document_assets(
    assets: List[DocumentEnrichedAsset],
    source_override: str | None = None,
) -> List[DocumentScoredAsset]:
    scored: List[DocumentScoredAsset] = []

    data_sources = (
        [source_override, "llm_inference"]
        if source_override
        else ["document_upload", "llm_inference"]
    )
    for asset in assets:
        score, signals = _compute_confidence(asset)
        scored.append(
            DocumentScoredAsset(
                **asset.model_dump(),
                confidence_score=score,
                confidence_tier=_confidence_tier(score),
                confidence_signals=signals,
                data_sources=data_sources,
            )
        )

    scored.sort(key=lambda item: item.confidence_score, reverse=True)
    logger.info("Doc Step D5: scored %s assets", len(scored))
    return scored
