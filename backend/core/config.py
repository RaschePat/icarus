from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SLACK_WEBHOOK_URL: str = ""
    SECRET_KEY: str = "icarus-dev-secret-change-in-production"
    INTERNAL_API_BASE: str = "http://localhost:8000"

    model_config = {"env_file": ".env"}


settings = Settings()
