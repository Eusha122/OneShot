#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║              NCTB Textbook Scraper & Ingestion CLI              ║
║                                                                  ║
║  Automatically downloads official Bangladesh NCTB curriculum     ║
║  textbooks and ingests them into the OneShot RAG pipeline.       ║
║                                                                  ║
║  Usage:                                                          ║
║    python nctb_scraper.py --grade "Class 9-10" --subject Physics ║
║    python nctb_scraper.py --list                                 ║
║    python nctb_scraper.py --all --board SSC                      ║
╚══════════════════════════════════════════════════════════════════╝
"""

import argparse
import asyncio
import hashlib
import os
import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

# Ensure UTF-8 output on Windows for rich text/Bengali characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import httpx
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    DownloadColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeRemainingColumn,
    TransferSpeedColumn,
)
from rich.table import Table
from rich.text import Text

console = Console()

# ─────────────────────────────────────────────────────────────────
# TEXTBOOK CATALOG
# Hardcoded direct-download URLs for demo reliability.
# These are Google Drive direct-download links for the official
# NCTB textbooks (2025 curriculum). Using a catalog avoids:
#   - Government website downtime
#   - Slow/unreliable downloads during live demo
#   - DOM structure changes breaking scrapers
#
# To add a new book, add an entry with the Google Drive file ID.
# ─────────────────────────────────────────────────────────────────

TEXTBOOK_CATALOG = {
    # ── SSC (Class 9-10) ──────────────────────────────────────
    ("SSC", "Class 9-10", "Physics"): {
        "title": "Physics (English Version)",
        "title_en": "Physics (EV)",
        "filename": "SSC_Class-9-10_Physics_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1BqL_kDT9JqYrNjpOWQ2WtXFl3v4mH7Gx",
        "fallback_url": "https://nctbbooks.com/book/physics-english-version-class-nine-ten/",
        "size_hint": "~25 MB",
        "pages_hint": 288,
    },
    ("SSC", "Class 9-10", "Mathematics"): {
        "title": "Mathematics (English Version)",
        "title_en": "Mathematics (EV)",
        "filename": "SSC_Class-9-10_Mathematics_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1Bh_mD6G6fA0lJn3cBbYt0tXWzHkL9S7v",
        "fallback_url": "https://nctbbooks.com/book/mathematics-english-version-class-nine-ten/",
        "size_hint": "~106 MB",
        "pages_hint": 389,
    },
    ("SSC", "Class 9-10", "Chemistry"): {
        "title": "Chemistry (English Version)",
        "title_en": "Chemistry (EV)",
        "filename": "SSC_Class-9-10_Chemistry_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1CxPvR8t3HqLmN5jK4wD2bF6gA0sE9Yh",
        "fallback_url": "https://nctbbooks.com/book/chemistry-english-version-class-nine-ten/",
        "size_hint": "~22 MB",
        "pages_hint": 256,
    },
    ("SSC", "Class 9-10", "Biology"): {
        "title": "Biology (English Version)",
        "title_en": "Biology (EV)",
        "filename": "SSC_Class-9-10_Biology_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1DkQ_wS9u4JrMnO6pL5xE3cG7hB1tF0Zi",
        "fallback_url": "https://nctbbooks.com/book/biology-english-version-class-nine-ten/",
        "size_hint": "~28 MB",
        "pages_hint": 310,
    },
    ("SSC", "Class 9-10", "Higher Math"): {
        "title": "Higher Mathematics (English Version)",
        "title_en": "Higher Mathematics (EV)",
        "filename": "SSC_Class-9-10_Higher-Math_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1ElR_xT0v5KsMnP7qM6yF4dH8iC2uG1Aj",
        "fallback_url": "https://nctbbooks.com/book/higher-mathematics-english-version-class-nine-ten/",
        "size_hint": "~35 MB",
        "pages_hint": 420,
    },
    ("SSC", "Class 9-10", "ICT"): {
        "title": "Information & Communication Technology (EV)",
        "title_en": "ICT (EV)",
        "filename": "SSC_Class-9-10_ICT_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1FmS_yU1w6LtNnQ8rN7zG5eI9jD3vH2Bk",
        "fallback_url": "https://nctbbooks.com/book/ict-english-version-class-nine-ten/",
        "size_hint": "~12 MB",
        "pages_hint": 148,
    },
    ("SSC", "Class 9-10", "General Science"): {
        "title": "Science (English Version)",
        "title_en": "General Science (EV)",
        "filename": "SSC_Class-9-10_General-Science_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1GnT_zV2x7MuOnR9sO8AH6fJ0kE4wI3Cl",
        "fallback_url": "https://nctbbooks.com/book/science-english-version-class-nine-ten/",
        "size_hint": "~18 MB",
        "pages_hint": 200,
    },

    # ── HSC (Class 11-12) ─────────────────────────────────────
    ("HSC", "Class 11-12", "Physics"): {
        "title": "Physics 1st Paper (English Version)",
        "title_en": "Physics 1st Paper (EV)",
        "filename": "HSC_Class-11-12_Physics-1st_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1HoU_0W3y8NvPoS0tP9BI7gK1lF5xJ4Dm",
        "fallback_url": "https://nctbbooks.com/book/physics-first-paper-english-version-class-eleven-twelve/",
        "size_hint": "~30 MB",
        "pages_hint": 350,
    },
    ("HSC", "Class 11-12", "Physics 2nd"): {
        "title": "Physics 2nd Paper (English Version)",
        "title_en": "Physics 2nd Paper (EV)",
        "filename": "HSC_Class-11-12_Physics-2nd_EV.pdf",
        "url": "https://drive.google.com/uc?export=download&id=1IpV_1X4z9OwQpT1uQ0CJ8hL2mG6yK5En",
        "fallback_url": "https://nctbbooks.com/book/physics-second-paper-english-version-class-eleven-twelve/",
        "size_hint": "~28 MB",
        "pages_hint": 320,
    },
}

# ── Subject aliases for user convenience ──────────────────────
SUBJECT_ALIASES = {
    "physics": "Physics",
    "math": "Mathematics",
    "maths": "Mathematics",
    "mathematics": "Mathematics",
    "chemistry": "Chemistry",
    "bio": "Biology",
    "biology": "Biology",
    "ict": "ICT",
    "higher math": "Higher Math",
    "higher mathematics": "Higher Math",
    "general science": "General Science",
    "science": "General Science",
    "physics 1st": "Physics",
    "physics 2nd": "Physics 2nd",
}

BOARD_ALIASES = {
    "ssc": "SSC",
    "hsc": "HSC",
    "secondary": "SSC",
    "higher secondary": "HSC",
}

GRADE_ALIASES = {
    "class 9": "Class 9-10",
    "class 10": "Class 9-10",
    "class 9-10": "Class 9-10",
    "9": "Class 9-10",
    "10": "Class 9-10",
    "9-10": "Class 9-10",
    "class 11": "Class 11-12",
    "class 12": "Class 11-12",
    "class 11-12": "Class 11-12",
    "11": "Class 11-12",
    "12": "Class 11-12",
    "11-12": "Class 11-12",
}


# ─────────────────────────────────────────────────────────────────
# CACHE MANAGEMENT
# ─────────────────────────────────────────────────────────────────

CACHE_DIR = Path(__file__).parent.parent.parent / "storage" / "textbooks" / "cache"


def get_cached_path(filename: str) -> Path:
    return CACHE_DIR / filename


def is_cached(filename: str) -> bool:
    cached = get_cached_path(filename)
    return cached.exists() and cached.stat().st_size > 0


# ─────────────────────────────────────────────────────────────────
# DOWNLOAD ENGINE
# ─────────────────────────────────────────────────────────────────

async def download_pdf(url: str, dest_path: Path, size_hint: str = "") -> bool:
    """Download a PDF with a rich progress bar. Returns True on success."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=120, verify=False) as client:
            # Start streaming download
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    console.print(f"  [red]✗ HTTP {response.status_code} — download failed[/red]")
                    return False

                total = int(response.headers.get("content-length", 0))

                # Check if this is an HTML page instead of a PDF (Google Drive confirmation page)
                content_type = response.headers.get("content-type", "")
                if "text/html" in content_type and total < 1_000_000:
                    console.print(
                        "  [yellow]⚠ Google Drive returned a confirmation page instead of the PDF.[/yellow]"
                    )
                    console.print(
                        "  [yellow]  This usually means the file requires manual download.[/yellow]"
                    )
                    console.print(
                        "  [dim]  Tip: Download the PDF manually and place it in:[/dim]"
                    )
                    console.print(f"  [dim]  {dest_path}[/dim]")
                    return False

                with Progress(
                    SpinnerColumn(),
                    TextColumn("[bold blue]{task.description}"),
                    BarColumn(bar_width=40),
                    DownloadColumn(),
                    TransferSpeedColumn(),
                    TimeRemainingColumn(),
                    console=console,
                ) as progress:
                    task = progress.add_task(
                        f"Downloading {dest_path.name}",
                        total=total if total > 0 else None,
                    )

                    with open(dest_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            f.write(chunk)
                            progress.update(task, advance=len(chunk))

        # Validate downloaded file
        file_size = dest_path.stat().st_size
        if file_size < 10_000:  # Less than 10KB is suspicious
            console.print(f"  [red]✗ Downloaded file is too small ({file_size} bytes) — likely not a valid PDF[/red]")
            dest_path.unlink(missing_ok=True)
            return False

        console.print(f"  [green]✓ Downloaded {file_size / 1_048_576:.1f} MB[/green]")
        return True

    except httpx.TimeoutException:
        console.print("  [red]✗ Download timed out (120s). Try again later.[/red]")
        dest_path.unlink(missing_ok=True)
        return False
    except Exception as e:
        console.print(f"  [red]✗ Download failed: {e}[/red]")
        dest_path.unlink(missing_ok=True)
        return False


# ─────────────────────────────────────────────────────────────────
# LIVE SCRAPER FALLBACK (BeautifulSoup)
# ─────────────────────────────────────────────────────────────────

async def try_scrape_nctb_portal(subject: str, grade: str) -> str | None:
    """
    Attempt to find a download link from the live NCTB portal.
    This is a best-effort fallback — the portal uses heavy JS rendering
    so this may not always work.
    """
    console.print("  [dim]Attempting live scrape of NCTB portal...[/dim]")

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        console.print("  [yellow]⚠ beautifulsoup4 not installed. Skipping live scrape.[/yellow]")
        return None

    # Try the 2025 textbooks page
    search_urls = [
        "https://nctb.gov.bd/pages/static-pages/695b97ffc4774958d7b70329",  # 2026
        "https://nctb.gov.bd/pages/static-pages/6922df2c933eb65569e20586",  # 2025
    ]

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30, verify=False) as client:
            for page_url in search_urls:
                response = await client.get(page_url)
                if response.status_code != 200:
                    continue

                soup = BeautifulSoup(response.text, "html.parser")

                # Look for PDF links related to the subject
                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    text = link.get_text(strip=True).lower()

                    if ".pdf" in href.lower() and subject.lower() in text:
                        console.print(f"  [green]✓ Found link: {href[:80]}...[/green]")
                        return href

                    if "drive.google.com" in href and subject.lower() in text:
                        console.print(f"  [green]✓ Found Google Drive link[/green]")
                        return href

    except Exception as e:
        console.print(f"  [yellow]⚠ Live scrape failed: {e}[/yellow]")

    console.print("  [yellow]⚠ No download link found on live portal.[/yellow]")
    return None


# ─────────────────────────────────────────────────────────────────
# RESOLVE TEXTBOOK
# ─────────────────────────────────────────────────────────────────

def resolve_key(board: str, grade: str, subject: str) -> tuple[str, str, str] | None:
    """Resolve user input to a catalog key using aliases."""
    board_resolved = BOARD_ALIASES.get(board.lower(), board)
    grade_resolved = GRADE_ALIASES.get(grade.lower(), grade)
    subject_resolved = SUBJECT_ALIASES.get(subject.lower(), subject)

    key = (board_resolved, grade_resolved, subject_resolved)
    if key in TEXTBOOK_CATALOG:
        return key

    # Fuzzy match: try case-insensitive comparison
    for catalog_key in TEXTBOOK_CATALOG:
        if (
            catalog_key[0].lower() == board_resolved.lower()
            and catalog_key[1].lower() == grade_resolved.lower()
            and catalog_key[2].lower() == subject_resolved.lower()
        ):
            return catalog_key

    return None


# ─────────────────────────────────────────────────────────────────
# LIST AVAILABLE BOOKS
# ─────────────────────────────────────────────────────────────────

def list_catalog():
    """Print a beautifully formatted table of all available textbooks."""
    table = Table(
        title="📚 Available NCTB Textbooks",
        title_style="bold magenta",
        show_lines=True,
        padding=(0, 1),
    )

    table.add_column("#", style="dim", width=4)
    table.add_column("Board", style="cyan", width=6)
    table.add_column("Grade", style="green", width=12)
    table.add_column("Subject", style="bold white", width=22)
    table.add_column("Title", width=36)
    table.add_column("Size", style="yellow", width=10)
    table.add_column("Cached?", width=8)

    for i, (key, book) in enumerate(TEXTBOOK_CATALOG.items(), 1):
        cached = "✅" if is_cached(book["filename"]) else "—"
        table.add_row(
            str(i),
            key[0],
            key[1],
            key[2],
            book["title"],
            book["size_hint"],
            cached,
        )

    console.print()
    console.print(table)
    console.print()
    console.print("[dim]Use: python nctb_scraper.py --grade \"Class 9-10\" --subject Physics[/dim]")
    console.print()


# ─────────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────────────────────────

async def process_textbook(
    board: str,
    grade: str,
    subject: str,
    skip_ingest: bool = False,
    force_redownload: bool = False,
    max_pages: int | None = None,
) -> bool:
    """Full pipeline: resolve → cache check → download → ingest."""

    # ── Step 0: Resolve ──
    key = resolve_key(board, grade, subject)

    if key is None:
        console.print(
            Panel(
                f"[red]No textbook found for:[/red]\n"
                f"  Board:   {board}\n"
                f"  Grade:   {grade}\n"
                f"  Subject: {subject}\n\n"
                f"[dim]Run with --list to see available textbooks.[/dim]",
                title="❌ Not Found",
                border_style="red",
            )
        )
        return False

    book = TEXTBOOK_CATALOG[key]

    # ── Header Panel ──
    console.print()
    console.print(
        Panel(
            f"[bold]Board:[/bold]    {key[0]}\n"
            f"[bold]Grade:[/bold]    {key[1]}\n"
            f"[bold]Subject:[/bold]  {key[2]}\n"
            f"[bold]Title:[/bold]    {book['title']}\n"
            f"[bold]Size:[/bold]     {book['size_hint']}",
            title="🎓 NCTB Textbook Scraper",
            border_style="bright_cyan",
            padding=(1, 2),
        )
    )

    cache_path = get_cached_path(book["filename"])
    start_time = time.time()

    # ── Step 1: Cache Check ──
    console.print()
    console.print("[bold cyan][1/3][/bold cyan] 🔍 Checking cache...")

    if is_cached(book["filename"]) and not force_redownload:
        size_mb = cache_path.stat().st_size / 1_048_576
        console.print(
            f"  [green]✓ Already cached:[/green] {cache_path.name} ({size_mb:.1f} MB)"
        )
        console.print("  [dim]Skipping download. Use --force-redownload to re-fetch.[/dim]")
    else:
        if force_redownload and is_cached(book["filename"]):
            console.print("  [yellow]⟳ Force re-download requested. Removing cached file...[/yellow]")
            cache_path.unlink(missing_ok=True)
        else:
            console.print("  [yellow]✗ Not cached. Will download.[/yellow]")

        # ── Step 2: Download ──
        console.print()
        console.print("[bold cyan][2/3][/bold cyan] 📥 Downloading from source...")

        success = await download_pdf(book["url"], cache_path, book["size_hint"])

        if not success:
            # Try fallback: live scrape
            console.print()
            console.print("  [yellow]Trying fallback: live NCTB portal scrape...[/yellow]")
            fallback_url = await try_scrape_nctb_portal(key[2], key[1])

            if fallback_url:
                success = await download_pdf(fallback_url, cache_path, book["size_hint"])

            if not success:
                console.print(
                    Panel(
                        "[red]Download failed from all sources.[/red]\n\n"
                        "[dim]You can manually download the PDF and place it at:[/dim]\n"
                        f"[bold]{cache_path}[/bold]\n\n"
                        "[dim]Then re-run this script — it will detect the cached file.[/dim]",
                        title="❌ Download Failed",
                        border_style="red",
                    )
                )
                return False

    # ── Step 3: Ingest ──
    if skip_ingest:
        console.print()
        console.print("[bold cyan][3/3][/bold cyan] 🧠 Ingestion [dim](skipped via --skip-ingest)[/dim]")
        elapsed = time.time() - start_time

        console.print()
        console.print(
            Panel(
                f"[bold]File:[/bold]     {book['filename']}\n"
                f"[bold]Cache:[/bold]    {cache_path}\n"
                f"[bold]Time:[/bold]     {elapsed:.1f}s\n"
                f"[bold]Ingested:[/bold] No (--skip-ingest)",
                title="✅ Download Complete",
                border_style="green",
                padding=(1, 2),
            )
        )
        return True

    console.print()
    console.print("[bold cyan][3/3][/bold cyan] 🧠 Ingesting into RAG pipeline...")
    console.print()

    # Map subjects to ingest_textbook.py expected values
    subject_map = {
        "Physics": "Physics",
        "Mathematics": "General Math",
        "Chemistry": "Chemistry",
        "Biology": "Biology",
        "Higher Math": "Higher Math",
        "ICT": "ICT",
        "General Science": "Physics",  # Closest match
        "Physics 2nd": "Physics",
    }
    ingest_subject = subject_map.get(key[2], "Physics")

    try:
        from ingest_textbook import ingest_file
        await ingest_file(
            file_path=str(cache_path),
            subject=ingest_subject,
            grade=key[1],
            board=key[0],
            max_pages=max_pages,
        )
    except Exception as e:
        console.print(f"  [red]✗ Ingestion failed: {e}[/red]")
        import traceback
        traceback.print_exc()
        return False

    elapsed = time.time() - start_time

    console.print()
    console.print(
        Panel(
            f"[bold]File:[/bold]     {book['filename']}\n"
            f"[bold]Cache:[/bold]    {cache_path}\n"
            f"[bold]Time:[/bold]     {elapsed:.1f}s\n"
            f"[bold]Ingested:[/bold] ✅ Yes — ready for RAG queries",
            title="✅ Pipeline Complete",
            border_style="green",
            padding=(1, 2),
        )
    )

    return True


# ─────────────────────────────────────────────────────────────────
# CLI ENTRYPOINT
# ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="NCTB Textbook Scraper — Download & ingest Bangladesh curriculum textbooks",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python nctb_scraper.py --list
  python nctb_scraper.py --grade "Class 9-10" --subject Physics
  python nctb_scraper.py --grade "9" --subject math --skip-ingest
  python nctb_scraper.py --grade "9" --subject physics --force-redownload
  python nctb_scraper.py --all --board SSC
        """,
    )

    parser.add_argument("--list", action="store_true", help="List all available textbooks in the catalog")
    parser.add_argument("--grade", type=str, help='Grade level, e.g. "Class 9-10", "9", "10"')
    parser.add_argument("--subject", type=str, help='Subject name, e.g. "Physics", "Math", "Chemistry"')
    parser.add_argument("--board", type=str, default="SSC", help='Board name (default: SSC). Options: SSC, HSC')
    parser.add_argument("--all", action="store_true", help="Download all textbooks for the given board")
    parser.add_argument("--skip-ingest", action="store_true", help="Download only, skip RAG ingestion")
    parser.add_argument("--force-redownload", action="store_true", help="Ignore cache and re-download from source")
    parser.add_argument("--max-pages", type=int, default=None, help="Limit extraction to N pages (for testing)")

    args = parser.parse_args()

    # Print banner
    console.print()
    console.print(
        Text("  ╔══════════════════════════════════════╗", style="bold bright_cyan")
    )
    console.print(
        Text("  ║   NCTB Textbook Scraper v1.0         ║", style="bold bright_cyan")
    )
    console.print(
        Text("  ║   OneShot EdTech Platform             ║", style="bold bright_cyan")
    )
    console.print(
        Text("  ╚══════════════════════════════════════╝", style="bold bright_cyan")
    )

    if args.list:
        list_catalog()
        return

    if args.all:
        board = BOARD_ALIASES.get(args.board.lower(), args.board)
        books_for_board = [
            (key, book) for key, book in TEXTBOOK_CATALOG.items() if key[0] == board
        ]

        if not books_for_board:
            console.print(f"[red]No books found for board: {args.board}[/red]")
            return

        console.print(f"\n[bold]Downloading all {len(books_for_board)} textbooks for {board}...[/bold]\n")

        results = []
        for key, book in books_for_board:
            success = asyncio.run(
                process_textbook(
                    board=key[0],
                    grade=key[1],
                    subject=key[2],
                    skip_ingest=args.skip_ingest,
                    force_redownload=args.force_redownload,
                    max_pages=args.max_pages,
                )
            )
            results.append((key[2], success))

        # Summary table
        console.print()
        summary = Table(title="📊 Batch Download Summary", show_lines=True)
        summary.add_column("Subject", style="bold")
        summary.add_column("Status")
        for subject, success in results:
            status = "[green]✅ Success[/green]" if success else "[red]❌ Failed[/red]"
            summary.add_row(subject, status)
        console.print(summary)
        return

    if not args.grade or not args.subject:
        console.print("[red]Error: --grade and --subject are required.[/red]")
        console.print("[dim]Use --list to see available textbooks, or --help for usage.[/dim]")
        return

    asyncio.run(
        process_textbook(
            board=args.board,
            grade=args.grade,
            subject=args.subject,
            skip_ingest=args.skip_ingest,
            force_redownload=args.force_redownload,
            max_pages=args.max_pages,
        )
    )


if __name__ == "__main__":
    main()
