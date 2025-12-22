import subprocess
import json

def extract_metadata(image_path):
    """
    Extract all metadata from an image using exiftool.
    Returns a Python dictionary with all fields.
    """
    try:
        result = subprocess.run(
            ["exiftool", "-json", image_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        metadata = json.loads(result.stdout)[0]  # exiftool returns a list of dicts
        return metadata
    except Exception as e:
        print("Metadata extraction failed:", e)
        return {}
