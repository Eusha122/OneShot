import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class SearxNGAdapter:
    def __init__(self, base_url: str = settings.searxng_base_url):
        self.base_url = base_url

    async def search(self, query: str, num_results: int = 5) -> str:
        """
        Search SearxNG and return concatenated text from the top results.
        Returns a single string of context.
        """
        print(f"[SearXNG] Query: {query}")
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "application/json"
                }
                response = await client.get(
                    f"{self.base_url}/search",
                    params={
                        "q": query,
                        "format": "json",
                        "engines": "duckduckgo,wikipedia",
                        "language": "en"
                    },
                    headers=headers
                )
                print(f"[SearXNG] Status: {response.status_code}")
                response.raise_for_status()
                data = response.json()
                
                results = data.get("results", [])[:num_results]
                print(f"[SearXNG] Results: {len(results)}")
                
                if not results:
                    return ""
                    
                context_parts = []
                for res in results:
                    title = res.get("title", "")
                    content = res.get("content", "")
                    url = res.get("url", "")
                    if content:
                        context_parts.append(f"Title: {title}\nSnippet: {content}\nSource: {url}")
                
                return "\n\n---\n\n".join(context_parts)
                
        except Exception as e:
            print(f"[SearXNG] Failed: {e}")
            return ""

searxng_adapter = SearxNGAdapter()
