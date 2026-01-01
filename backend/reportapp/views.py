from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse, HttpResponse
from django.template.loader import get_template
from weasyprint import HTML
from django.conf import settings
from django.core.files.base import ContentFile
from urllib.parse import urljoin
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

        # If a report already exists for this image, by default regenerate the PDF from the record
        # (preserving any attached suspicious/heatmap images and verification metadata).
        # If the client explicitly passes `force=true`, perform the old behavior of deleting
        # the record and recreating a fresh report.
        existing_report = Report.objects.filter(image=image).first()
        force = False
        try:
            force = bool(request.data.get('force', False))
        except Exception:
            force = False

        if existing_report and not force:
            # Regenerate PDF using existing report data (preserves heatmap/suspicious images)
            try:
                report = self._create_report_from_record(existing_report, request)
                return self._return_pdf_response(report, request, "regenerated")
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({"detail": "PDF regeneration failed: " + str(e)}, status=500)

        if existing_report and force:
            try:
                # Remove files associated with the old report safely
                if existing_report.pdf and hasattr(existing_report.pdf, 'path') and os.path.exists(existing_report.pdf.path):
                    try:
                        os.remove(existing_report.pdf.path)
                    except Exception:
                        try:
                            existing_report.pdf.delete(save=False)
                        except Exception:
                            pass

                try:
                    if existing_report.suspicious_image:
                        existing_report.suspicious_image.delete(save=False)
                except Exception:
                    pass

                try:
                    if existing_report.heatmap_image:
                        existing_report.heatmap_image.delete(save=False)
                except Exception:
                    pass

                existing_report.delete()
            except Exception:
                pass

        # No existing report or force was requested: create a fresh report
        try:
            report = self._create_single_report(image, request)
            return self._return_pdf_response(report, request, "new")
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"detail": "PDF generation failed: " + str(e)}, status=500)

    def _create_report_from_record(self, report, request=None):
        """Generate PDF for an existing Report record and save the PDF file"""
        # Use existing report data to build PDF
        template = get_template("index.html")
        base_url = request.build_absolute_uri('/') if request else 'http://127.0.0.1:8000/'

        original_img_url = report.image.image.url if hasattr(report.image, 'image') else ''
        tampered_img_url = report.suspicious_image.url if report.suspicious_image else ''
        heatmap_img_url = report.heatmap_image.url if report.heatmap_image else ''

        # Normalize to absolute URLs using base_url when necessary
        try:
            if original_img_url and not original_img_url.startswith('http'):
                original_img_url = urljoin(base_url, original_img_url.lstrip('/'))
        except Exception:
            pass
        try:
            if tampered_img_url and not tampered_img_url.startswith('http'):
                tampered_img_url = urljoin(base_url, tampered_img_url.lstrip('/'))
        except Exception:
            pass
        try:
            if heatmap_img_url and not heatmap_img_url.startswith('http'):
                heatmap_img_url = urljoin(base_url, heatmap_img_url.lstrip('/'))
        except Exception:
            pass

        # Collect all watermarked images for this original image (may be multiple)
        watermarked_images = []
        try:
            for wm in report.image.watermarks.all():
                if getattr(wm, 'watermarked_image', None):
                    url = wm.watermarked_image.url
                    if url and not url.startswith('http'):
                        url = base_url.rstrip('/') + url
                    watermarked_images.append(url)
        except Exception:
            watermarked_images = []

        # If a comparison overlay URL was saved in verification metrics, include it
        comparison_img_url = ''
        try:
            if report.verification_metrics and isinstance(report.verification_metrics, dict):
                comparison_img_url = report.verification_metrics.get('comparison_url') or ''
        except Exception:
            comparison_img_url = ''

        # Ensure heatmap_img_url points to an existing file; prefer reports/heatmap then fall back to tamper_overlays
        if not heatmap_img_url:
            try:
                preferred_dirs = [os.path.join(settings.MEDIA_ROOT, 'reports', 'heatmap'), os.path.join(settings.MEDIA_ROOT, 'tamper_overlays')]
                found = False
                for overlay_dir in preferred_dirs:
                    if not os.path.isdir(overlay_dir):
                        continue
                    overlays = [f for f in os.listdir(overlay_dir) if f.startswith('overlay_') and f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                    if overlays:
                        overlays.sort(key=lambda fn: os.path.getmtime(os.path.join(overlay_dir, fn)), reverse=True)
                        heatmap_file = overlays[0]
                        rel_path = os.path.relpath(os.path.join(overlay_dir, heatmap_file), settings.MEDIA_ROOT)
                        heatmap_img_url = urljoin(base_url, os.path.join(settings.MEDIA_URL.lstrip('/'), rel_path))

                        # Attach heatmap file to the report.heatmap_image if not already set
                        try:
                            if not report.heatmap_image:
                                dst_rel = os.path.relpath(os.path.join(overlay_dir, heatmap_file), settings.MEDIA_ROOT).replace(os.sep, '/')
                                report.heatmap_image = dst_rel
                                report.save()
                        except Exception:
                            pass
                        found = True
                        break
                if not found:
                    # nothing found
                    pass
            except Exception:
                pass

        # Provide structured metadata and comparison stats for the template
        original_metadata = report.image.metadata if hasattr(report.image, 'metadata') else {}
        suspicious_metadata = report.suspicious_metadata or {}
        comparison_stats = None
        if report.verification_metrics and isinstance(report.verification_metrics, dict):
            comparison_stats = report.verification_metrics.get('visual_statistics') or report.verification_metrics

        context = {
            "report_id": f"PSF-{str(report.report_id)[:8].upper()}",
            "date": report.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "user": report.user.get_full_name() or report.user.username,
            "score": report.score,
            "watermark_status": report.watermark_status,
            "status": report.status,
            "notes": report.notes,
            "metadata": report.metadata,
            "original_metadata": original_metadata,
            "suspicious_metadata": suspicious_metadata,
            "file_hash": report.file_hash,
            "file_path": report.file_path,
            "original_img_url": original_img_url,
            "tampered_img_url": tampered_img_url,
            "heatmap_img_url": heatmap_img_url,
            "comparison_img_url": comparison_img_url,
            "watermarked_images": watermarked_images,
            "verification_metrics": report.verification_metrics or {},
            "verification_status": report.verification_status,
            "comparison_stats": comparison_stats,
        }

        pdf_name = f"report-{report.report_id}.pdf"
        pdf_path = os.path.join(settings.MEDIA_ROOT, "reports", "pdf", pdf_name)
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

        html = template.render(context)
        HTML(string=html, base_url=base_url).write_pdf(pdf_path)

        # Update report.pdf field and save
        report.pdf = f"reports/pdf/{pdf_name}"
        report.save()

        return report

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
    
        # Ensure metadata dicts are available for template rendering
        try:
            original_metadata = metadata if isinstance(metadata, dict) else {}
        except Exception:
            original_metadata = {}

        context = {
            "report_id": display_id,  # Display ID in PDF
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user": image.user.get_full_name() or image.user.username,
            "score": score,
            "watermark_status": watermark_status,
            "status": status_final,
            "notes": notes,
            "metadata": metadata,
            "original_metadata": original_metadata,
            "file_hash": file_hash,
            "file_path": image.image.url if hasattr(image.image, 'url') else "",
            "original_img_url": image_url,
            # The following three may be replaced when a suspicious image was provided
            "tampered_img_url": image_url,
            "heatmap_img_url": None,
            "comparison_img_url": None,
            # collect watermarked versions if any exist for this original image
            "watermarked_images": [
                (base_url.rstrip('/') + wm.watermarked_image.url) if (hasattr(wm, 'watermarked_image') and wm.watermarked_image.url and not wm.watermarked_image.url.startswith('http')) else (wm.watermarked_image.url if hasattr(wm, 'watermarked_image') and wm.watermarked_image.url else None)
                for wm in (image.watermarks.all() if hasattr(image, 'watermarks') else [])
            ],
            "suspicious_metadata": None,
            # Additional metadata fields to display in PDF
            "file_name": getattr(image, 'fileName', None),
            "format": getattr(image, 'format', None),
            "image_size": getattr(image, 'ImageSize', None),
            "image_id": str(getattr(image, 'ImageID', '')),
            "verification_metrics": None,
            "verification_status": None,
            "comparison_stats": None,
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
    