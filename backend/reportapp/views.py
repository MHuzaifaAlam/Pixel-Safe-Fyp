from django.http import HttpResponse
from django.template.loader import get_template
from weasyprint import HTML
from django.shortcuts import render
from django.template.loader import render_to_string
import os

def report_pdf(request):
    template = get_template("index.html")

    # Example context (dummy values)
    context = {
        "report_id": "PSF-1001",
        "date": "2025-01-01",
        "user": "Ahmad",
        "score": 85,
        "watermark_status": "Valid",
        "status": "Authentic",
        "notes": "Image shows high authenticity confidence.",
        "metadata": "{camera: Nikon, size: 2MB}",
        "file_hash": "abc123xyz",
        "file_path": "/uploads/xyz.png",

        # IMPORTANT: Absolute URLs for images
        "original_img_url": request.build_absolute_uri("/media/original.png"),
        "tampered_img_url": request.build_absolute_uri("/media/tampered.png"),
        "heatmap_img_url": request.build_absolute_uri("/media/heatmap.png"),
    }

    html = template.render(context)

    pdf = HTML(string=html, base_url=request.build_absolute_uri()).write_pdf()

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="forensic-report.pdf"'

    return response


def download_report_pdf(request):
    """Force download of PDF"""
    template = get_template("index.html")
    
    context = {
        "report_id": "PSF-1001",
        "date": "2025-01-01",
        "user": "Ahmad",
        "score": 85,
        "watermark_status": "Valid",
        "status": "Authentic",
        "notes": "Image shows high authenticity confidence.",
        "metadata": "{camera: Nikon, size: 2MB}",
        "file_hash": "abc123xyz",
        "file_path": "/uploads/xyz.png",

        # IMPORTANT: Absolute URLs for images
        "original_img_url": request.build_absolute_uri("/media/original.png"),
        "tampered_img_url": request.build_absolute_uri("/media/tampered.png"),
        "heatmap_img_url": request.build_absolute_uri("/media/heatmap.png"),
    }

    html = template.render(context)
    pdf = HTML(string=html, base_url=request.build_absolute_uri()).write_pdf()

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = "attachment; filename=forensic-report.pdf"
    return response