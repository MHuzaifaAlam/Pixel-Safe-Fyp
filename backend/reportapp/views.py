from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse, HttpResponse
from django.template.loader import get_template
from weasyprint import HTML
from django.conf import settings
import uuid, os, hashlib, zipfile
from datetime import datetime
from io import BytesIO

from imageapp.models import Image, Batch
from .models import Report
from .serializers import ReportSerializer


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(user=self.request.user)

    # ======================
    # SINGLE IMAGE REPORT
    # ======================
    @action(detail=False, methods=["post"])
    def generate(self, request):
        """
        Generate report for single image and OPEN PDF IN BROWSER
        Returns PDF file directly (not JSON)
        """
        image_id = request.data.get("image_id")

        if not image_id:
            return Response({"error": "image_id is required"}, status=400)

        try:
            image = Image.objects.get(ImageID=image_id, user=request.user)
        except Image.DoesNotExist:
            return Response({"error": "Image not found or access denied"}, status=404)

        # Check if report exists
        existing_report = Report.objects.filter(image=image).first()
        if existing_report:
            return self._return_pdf_response(existing_report, request, "existing")
        
        # Create new report
        report = self._create_single_report(image, request)
        return self._return_pdf_response(report, request, "new")

    # ======================
    # BATCH REPORTS
    # ======================
    @action(detail=False, methods=["post"])
    def generate_batch(self, request):
        """
        Generate reports for all images in a batch
        Returns ZIP file containing all PDFs
        """
        batch_id = request.data.get("batch_id")
        
        if not batch_id:
            return Response({"error": "batch_id is required"}, status=400)
        
        try:
            batch = Batch.objects.get(BatchID=batch_id, user=request.user)
        except Batch.DoesNotExist:
            return Response({"error": "Batch not found or access denied"}, status=404)
        
        # Get all images in batch
        images = batch.images.all()
        
        if not images.exists():
            return Response({"error": "No images found in this batch"}, status=404)
        
        # Create reports for all images (or get existing ones)
        reports = []
        for image in images:
            existing_report = Report.objects.filter(image=image).first()
            if existing_report:
                reports.append(existing_report)
            else:
                report = self._create_single_report(image, request)
                reports.append(report)
        
        # Create ZIP file
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for report in reports:
                # Add PDF to ZIP
                pdf_path = report.pdf.path
                filename = f"report_{report.report_id or report.id}.pdf"
                zip_file.write(pdf_path, filename)
        
        zip_buffer.seek(0)
        
        # Return ZIP file
        response = HttpResponse(
            zip_buffer.getvalue(),
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'inline; filename="batch_reports_{batch.name or batch_id}.zip"'
        return response

    @action(detail=False, methods=["post"])
    def download_batch(self, request):
        """
        Download ZIP of all batch reports
        """
        batch_id = request.data.get("batch_id")
        
        if not batch_id:
            return Response({"error": "batch_id is required"}, status=400)
        
        try:
            batch = Batch.objects.get(BatchID=batch_id, user=request.user)
        except Batch.DoesNotExist:
            return Response({"error": "Batch not found or access denied"}, status=404)
        
        # Get all reports for images in batch
        reports = Report.objects.filter(image__batch=batch, user=request.user)
        
        if not reports.exists():
            return Response({"error": "No reports found for this batch"}, status=404)
        
        # Create ZIP file
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for report in reports:
                if os.path.exists(report.pdf.path):
                    filename = f"report_{report.report_id or report.id}.pdf"
                    zip_file.write(report.pdf.path, filename)
        
        zip_buffer.seek(0)
        
        # Return ZIP for download
        response = HttpResponse(
            zip_buffer.getvalue(),
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'attachment; filename="batch_reports_{batch.name or batch_id}.zip"'
        return response


    # ======================
    # HELPER METHODS
    # ======================
    def _create_single_report(self, image, request=None, save_to_db=True):
        """Create a single report for an image"""
        # Prepare forensic data
        score = 85
        watermark_status = "Valid"
        status_final = "Authentic"
        notes = "Image shows high authenticity confidence."
        # metadata = '{"camera": "Nikon", "size": "2MB"}' replace from below
        metadata = image.metadata if image.metadata else {}

    
        # Calculate file hash
        file_hash = "hash_calculation_failed"
        if hasattr(image.image, 'path'):
            file_hash = self._calculate_file_hash(image.image.path)
    
        # Generate IDs and PDF path
        report_uuid = uuid.uuid4()  # Real UUID for database
        display_id = f"PSF-{str(report_uuid)[:8].upper()}"  # For displaying in PDF
        pdf_name = f"report-{report_uuid}.pdf"
        pdf_path = os.path.join(settings.MEDIA_ROOT, "reports", "pdf", pdf_name)
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
        # Generate PDF
        template = get_template("index.html")
        
        # Get base URL
        base_url = request.build_absolute_uri('/') if request else 'http://127.0.0.1:8000/'
    
        # Build image URLs
        image_url = image.image.url if hasattr(image.image, 'url') else ""
        if image_url and not image_url.startswith('http'):
            image_url = base_url.rstrip('/') + image_url
    
        context = {
            "report_id": display_id,  # Display ID in PDF
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user": image.user.get_full_name() or image.user.username,
            "score": score,
            "watermark_status": watermark_status,
            "status": status_final,
            "notes": notes,
            "metadata": metadata,
            "file_hash": file_hash,
            "file_path": image.image.url if hasattr(image.image, 'url') else "",
            "original_img_url": image_url,
            "tampered_img_url": image_url,
            "heatmap_img_url": image_url,
        }
    
        html = template.render(context)
        HTML(string=html, base_url=base_url).write_pdf(pdf_path)
    
        if save_to_db:
            report = Report.objects.create(
                report_id=report_uuid,  # Real UUID in DB
                user=image.user,
                image=image,
                score=score,
                watermark_status=watermark_status,
                status=status_final,
                notes=notes,
                metadata=metadata,
                file_hash=file_hash,
                file_path=image.image.url if hasattr(image.image, 'url') else "",
                pdf=f"reports/pdf/{pdf_name}",
            )
            return report
        else:
            # Return report data without saving to DB
            return type('ReportData', (), {
                'report_id': display_id,
                'pdf': type('PDF', (), {'path': pdf_path})(),
                'score': score,
                'watermark_status': watermark_status,
                'status': status_final,
                'notes': notes,
                'metadata': metadata,
                'file_hash': file_hash,
            })()
    

    def _calculate_file_hash(self, file_path):
        """Calculate SHA-256 hash"""
        hash_sha = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha.update(chunk)
            return hash_sha.hexdigest()
        except Exception:
            return "hash_calculation_failed"

    def _return_pdf_response(self, report, request, report_type="new", download=False):
        """
        Return PDF response
        """
        response = FileResponse(
            open(report.pdf.path, "rb"),
            content_type='application/pdf'
        )
        
        # Use report_id if available, otherwise use id
        filename_id = report.report_id if hasattr(report, 'report_id') else report.id
        
        if download:
            response['Content-Disposition'] = f'attachment; filename="forensic-report-{filename_id}.pdf"'
        else:
            response['Content-Disposition'] = f'inline; filename="forensic-report-{filename_id}.pdf"'
        
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        if hasattr(report, 'report_id'):
            response['X-Report-ID'] = report.report_id
        
        return response

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Force download single report"""
        report = self.get_object()
        return self._return_pdf_response(report, request, "existing", download=True)
    