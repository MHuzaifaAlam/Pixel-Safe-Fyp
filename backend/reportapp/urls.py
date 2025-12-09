from django.urls import path
from .views import report_pdf,download_report_pdf

urlpatterns = [
    path("", report_pdf, name="report_html"),
    path("pdf/", download_report_pdf, name="report-pdf")
]
