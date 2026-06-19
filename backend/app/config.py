from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    DATABASE_URL is the single source of truth for the DB connection so the
    same image runs locally (docker-compose) and on hosted platforms (Render,
    Railway, Fly.io) without code changes.
    """

    database_url: str = "postgresql://postgres:postgres@db:5432/inventory"
    # Comma-separated list of origins allowed by CORS, e.g. the deployed frontend URL.
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
