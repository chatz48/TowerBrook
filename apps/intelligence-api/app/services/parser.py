from fastapi import UploadFile


async def parse_upload(file: UploadFile | None, text: str | None) -> tuple[str, str | None]:
    parts = [text or ""]
    title = None
    if file:
        title = file.filename
        raw = await file.read()
        if file.filename.lower().endswith(".pdf"):
            parts.append("[PDF parsing requires the deployed parser dependency. Raw bytes were received.]")
        else:
            parts.append(raw.decode("utf-8", errors="ignore"))
    return "\n\n".join(part for part in parts if part), title
