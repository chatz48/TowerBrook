from functools import lru_cache
from os import getenv


class Settings:
    supabase_url: str | None = getenv("SUPABASE_URL")
    supabase_service_role_key: str | None = getenv("SUPABASE_SERVICE_ROLE_KEY")
    deepseek_api_key: str | None = getenv("DEEPSEEK_API_KEY")
    deepseek_model: str = getenv("DEEPSEEK_MODEL", "deepseek-chat")
    keirolabs_api_key: str | None = getenv("KEIROLABS_API_KEY")
    keirolabs_base_url: str = getenv("KEIROLABS_BASE_URL", "https://kierolabs.space")
    keirolabs_search_results: int = int(getenv("KEIROLABS_SEARCH_RESULTS", "5"))
    keirolabs_fetches_per_query: int = int(getenv("KEIROLABS_FETCHES_PER_QUERY", "1"))
    keirolabs_max_requests_per_job: int = int(getenv("KEIROLABS_MAX_REQUESTS_PER_JOB", "12"))
    bge_model: str = getenv("BGE_MODEL", "BAAI/bge-small-en-v1.5")
    bge_vector_dimensions: int = int(getenv("BGE_VECTOR_DIMENSIONS", "384"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
