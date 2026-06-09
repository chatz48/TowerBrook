from app.services.keiro_search import KeiroSearchService


def test_extract_html_text_strips_scripts_and_keeps_article_copy():
    service = KeiroSearchService()
    html = """
    <html><head><title>Private equity water</title></head>
    <body>
      <script>window.track()</script>
      <h1>KKR remains a dominant force</h1>
      <p>Bain Capital is actively consolidating water technology providers.</p>
    </body></html>
    """
    text = service._extract_html_text(html)
    assert "KKR remains a dominant force" in text
    assert "Bain Capital is actively consolidating" in text
    assert "window.track" not in text
    assert service._extract_html_title(html) == "Private equity water"


def test_content_from_keiro_item_prefers_markdown_content():
    service = KeiroSearchService()
    content = service._content_from_keiro_item(
        {"title": "Article", "markdown_content": "Full markdown body", "snippet": "short"}
    )
    assert content == "Full markdown body"


def test_normalizes_keiro_search_result_with_extracted_content():
    service = KeiroSearchService()
    result = service._normalize_result(
        {"title": "Grid advisor", "url": "https://example.com/grid", "snippet": "Short result"},
        "grid connection advisor",
        {"url": "https://example.com/grid", "content": "Full extracted source"},
    )

    assert result["url"] == "https://example.com/grid"
    assert result["content"] == "Full extracted source"
