import json

from pydantic import HttpUrl

from app.schemas.domain import ExtractionResult
from app.services.deepseek_extractor import DeepSeekExtractor


def test_extract_prompt_serializes_pydantic_http_url():
    extractor = DeepSeekExtractor()
    url = HttpUrl("https://smartwatermagazine.com/news/private-equity-water")
    prompt = {
        "source_url": extractor._coerce_url(url),
        "text": "Sample source text.",
    }
    serialized = json.dumps(prompt, default=str)
    assert "smartwatermagazine.com" in serialized


def test_ensure_grounded_facts_creates_company_facts_when_model_omits_them():
    extractor = DeepSeekExtractor()
    result = ExtractionResult(
        companies=[
            {
                "name": "KKR",
                "category": "sponsor",
                "theme_ids": ["smart-water"],
                "description": "Dominant force in water infrastructure investment.",
                "confidence": 0.82,
            }
        ],
        people=[
            {
                "name": "Saurabh Singh",
                "expert_type": "advisor",
                "theme_ids": ["smart-water"],
                "summary": "VP of Advisory Services at BlueTech Research.",
                "confidence": 0.7,
            }
        ],
    )
    enriched = extractor._ensure_grounded_facts(
        result,
        "KKR remains a dominant force in water infrastructure investment.",
        "Private equity water",
        "https://example.com/article",
        "smart-water",
    )
    assert enriched.facts
    assert any(fact.fact_type == "company_mentioned" and fact.subject_name == "KKR" for fact in enriched.facts)
    assert any(fact.fact_type == "person_mentioned" and fact.subject_name == "Saurabh Singh" for fact in enriched.facts)


def test_deepseek_extraction_normalizes_loose_model_json():
    extractor = DeepSeekExtractor()

    normalized = extractor._normalize_extraction_payload(
        {
            "people": [
                {
                    "person": "Jane Advisor",
                    "firm": "Canaccord Genuity",
                    "role": "M&A advisor",
                    "evidence": "Jane Advisor advised on the JSM transaction.",
                }
            ],
            "companies": ["JSM Group"],
            "relationships": [
                {
                    "from": "Canaccord Genuity",
                    "to": "JSM Group",
                    "role": "financial advisor",
                    "evidence": "Canaccord Genuity advised JSM Group.",
                }
            ],
            "facts": ["Canaccord Genuity was connected to the JSM transaction."],
            "citations": ["https://example.com/jsm"],
        },
        title="JSM transaction source",
        url="https://example.com/jsm",
        theme_id="grid-infrastructure",
    )

    assert normalized["people"][0]["name"] == "Jane Advisor"
    assert normalized["people"][0]["current_organization"] == "Canaccord Genuity"
    assert normalized["companies"][0]["name"] == "JSM Group"
    assert normalized["relationships"][0]["from_name"] == "Canaccord Genuity"
    assert normalized["relationships"][0]["to_name"] == "JSM Group"
    assert normalized["facts"][0]["fact_value"] == "Canaccord Genuity was connected to the JSM transaction."
    assert normalized["citations"][0]["url"] == "https://example.com/jsm"


def test_deepseek_extraction_normalizes_company_relationship_aliases():
    extractor = DeepSeekExtractor()

    normalized = extractor._normalize_extraction_payload(
        {
            "relationships": [
                {
                    "type": "acquired",
                    "from_company": "Badger Meter",
                    "to_company": "SmartCover Systems",
                },
                {
                    "type": "owner",
                    "from_company": "XPV Water Partners",
                    "to_company": "SmartCover Systems",
                },
                {
                    "type": "advised_on",
                    "from_company": "Houlihan Lokey",
                    "to_company": "SmartCover Systems",
                },
            ],
            "citations": [
                {
                    "source_title": "Submitted source",
                    "content": "Badger Meter acquired SmartCover Systems from XPV Water Partners for $185m in 2025.",
                }
            ],
        },
        title="Submitted source",
        url=None,
        theme_id="smart-water",
    )

    assert normalized["relationships"][0]["from_name"] == "Badger Meter"
    assert normalized["relationships"][0]["to_name"] == "SmartCover Systems"
    assert normalized["relationships"][0]["relationship_type"] == "acquired"
    assert normalized["relationships"][2]["from_name"] == "Houlihan Lokey"
    assert normalized["citations"][0]["title"] == "Submitted source"
    assert "Badger Meter acquired SmartCover Systems" in normalized["citations"][0]["evidence"]


def test_deepseek_extraction_normalizes_nested_source_target_relationships():
    extractor = DeepSeekExtractor()

    normalized = extractor._normalize_extraction_payload(
        {
            "relationships": [
                {
                    "type": "acquired",
                    "source": {"name": "Badger Meter", "type": "company"},
                    "target": {"name": "SmartCover Systems", "type": "company"},
                    "evidence": "Badger Meter acquired SmartCover Systems.",
                    "source_url": None,
                },
                {
                    "type": "owner",
                    "source": {"name": "XPV Water Partners"},
                    "target": {"name": "SmartCover Systems"},
                    "source_url": None,
                },
                {
                    "type": "advised_on",
                    "source": {"name": "Houlihan Lokey"},
                    "target": {"name": "SmartCover Systems"},
                    "source_url": None,
                },
            ],
            "citations": [
                {
                    "id": 1,
                    "source_title": "Submitted source",
                    "source_url": None,
                }
            ],
        },
        title="Submitted source",
        url=None,
        theme_id="smart-water",
    )

    assert len(normalized["relationships"]) == 3
    assert normalized["relationships"][0]["from_name"] == "Badger Meter"
    assert normalized["relationships"][0]["to_name"] == "SmartCover Systems"
    assert normalized["citations"][0]["title"] == "Submitted source"
    assert normalized["citations"][0]["evidence"] == "Submitted source"

    result = ExtractionResult.model_validate(normalized)
    assert len(result.relationships) == 3
    assert len(result.citations) == 1


def test_heuristic_extract_identifies_acquisition_target():
    extractor = DeepSeekExtractor()
    text = (
        "Badger Meter acquired SmartCover Systems from XPV Water Partners for $185m in 2025. "
        "Houlihan Lokey advised SmartCover Systems on the transaction."
    )
    result = extractor._heuristic_extract(text, title="SmartCover acquisition", url=None, theme_id="smart-water")
    company_names = [company.name for company in result.companies]
    assert "SmartCover Systems" in company_names
    target_facts = [fact for fact in result.facts if fact.fact_type == "target_company"]
    assert target_facts
    assert target_facts[0].fact_value == "SmartCover Systems"
