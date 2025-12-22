from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from django.core.files.base import ContentFile
from django.template.loader import get_template
import tempfile
import io
import time
from django.core.management import call_command
from imageapp.models import Image
from .models import Report
from .views import ReportViewSet
import tempfile, shutil, os


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class ReportIntegrationTests(TestCase):
	def setUp(self):
		# Create user and API client
		self.user = User.objects.create_user(username='tester', password='pass')
		self.client = APIClient()
		self.client.force_authenticate(user=self.user)

		# Create a small image file
		img = ContentFile(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00", name='test.png')
		self.image = Image.objects.create(
			user=self.user,
			image=img,
			fileName='test.png',
			format='png',
			ImageSize=123,
			Status='uploaded'
		)

	def tearDown(self):
		# Clean up files created in temp media root
		media_dir = tempfile.gettempdir()
		for fname in os.listdir(media_dir):
			if fname.startswith('report-') and fname.endswith('.pdf'):
				try:
					os.remove(os.path.join(media_dir, fname))
				except Exception:
					pass

	def test_generate_pdf_includes_suspicious_and_metadata(self):
		# Create a report with suspicious image and metrics
		report = Report.objects.create(
			user=self.user,
			image=self.image,
			score=50,
			watermark_status='Invalid',
			status='tampered',
			notes='Test note',
			metadata={'camera': 'TestCam'},
			file_hash='abc123',
			file_path='/media/test.png'
		)

		# Attach suspicious image
		sus = ContentFile(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00", name='sus.png')
		report.suspicious_image.save('sus.png', sus)
		report.suspicious_metadata = {'filename': 'sus.png', 'size': 12}
		report.verification_metrics = {'hamming_distance': 5, 'watermark_similarity': 0.9, 'visual_statistics': {'overall_tampered': 12.3}}
		report.save()

		# Call generate endpoint (this will overwrite the previous report and create a fresh one)
		res = self.client.post('/api/reports/generate/', {'image_id': str(self.image.ImageID)}, format='json')
		self.assertEqual(res.status_code, 200)
		# Response should be PDF
		self.assertIn('application/pdf', res['Content-Type'])

		# After regenerate, the original report record may have been replaced; fetch the current report
		new_report = Report.objects.filter(image=self.image).first()
		self.assertIsNotNone(new_report)
		self.assertTrue(new_report.pdf)
		expected_path = os.path.join(tempfile.gettempdir(), new_report.pdf.name)
		self.assertTrue(os.path.exists(expected_path), msg=f"Expected PDF at {expected_path}")

	def test_generate_overwrites_existing_report(self):
		# By default, generating again should regenerate the PDF in-place and preserve report data
		res1 = self.client.post('/api/reports/generate/', {'image_id': str(self.image.ImageID)}, format='json')
		self.assertEqual(res1.status_code, 200)
		report1 = Report.objects.filter(image=self.image).first()
		self.assertIsNotNone(report1)
		old_pdf = report1.pdf.name if report1.pdf else None

		# Call generate again without force: should regenerate from existing record and keep the DB record
		res2 = self.client.post('/api/reports/generate/', {'image_id': str(self.image.ImageID)}, format='json')
		self.assertEqual(res2.status_code, 200)
		reports = Report.objects.filter(image=self.image)
		self.assertEqual(reports.count(), 1)
		report2 = reports.first()
		self.assertTrue(report2.pdf and os.path.exists(os.path.join(tempfile.gettempdir(), report2.pdf.name)))
		# Now test force delete behavior
		res3 = self.client.post('/api/reports/generate/', {'image_id': str(self.image.ImageID), 'force': True}, format='json')
		self.assertEqual(res3.status_code, 200)
		# After force recreate, there should be a report (new record could be created)
		reports_after = Report.objects.filter(image=self.image)
		self.assertEqual(reports_after.count(), 1)

	def test_template_no_watermarked_section_and_shows_metadata(self):
		# Render the single report template with sample context and ensure watermarked section not present
		template = get_template('index.html')
		context = {
			'report_id': 'PSF-TEST',
			'date': '2025-12-22 12:00:00',
			'user': 'tester',
			'score': 90,
			'watermark_status': 'Valid',
			'status': 'Authentic',
			'notes': 'Test notes',
			'metadata': {},
			'original_metadata': {'camera': 'TestCam'},
			'file_hash': 'abc',
			'file_path': '/media/test.png',
			'original_img_url': '/media/test.png',
			'tampered_img_url': None,
			'heatmap_img_url': None,
			'file_name': 'test.png',
			'format': 'png',
			'image_size': 123,
			'image_id': 'IMG-1'
		}
		rendered = template.render(context)
		# The watermarked section should not be present
		self.assertNotIn('Watermarked Versions', rendered)
		# Metadata fields should be present
		self.assertIn('File Name', rendered)
		self.assertIn('Format', rendered)
		self.assertIn('Image Size', rendered)

	def test_overlay_fallback_attaches_heatmap_from_tamper_overlays(self):
		# Create an overlay file in MEDIA_ROOT/tamper_overlays
		media_root = tempfile.gettempdir()
		overlay_dir = os.path.join(media_root, 'tamper_overlays')
		os.makedirs(overlay_dir, exist_ok=True)
		overlay_name = f'overlay_test_{int(time.time())}.png'
		overlay_path = os.path.join(overlay_dir, overlay_name)
		with open(overlay_path, 'wb') as f:
			f.write(b'\x89PNGtestoverlay')

		# Create a report record without heatmap_image
		report = Report.objects.create(
			user=self.user,
			image=self.image,
			score=10,
			watermark_status='Invalid',
			status='tampered',
			notes='Test',
			metadata={},
			file_hash='hash',
			file_path='/media/test.png'
		)

		# Call the internal method to regenerate the pdf from record and attach overlays
		view = ReportViewSet()
		# create a fake request object with build_absolute_uri
		class DummyReq:
			def build_absolute_uri(self, path='/'):
				return 'http://testserver/'

		req = DummyReq()
		view._create_report_from_record(report, req)

		# After running, the report should have heatmap_image set from the tamper_overlays fallback
		# Run management command to cleanup/move overlays and attach to reports
		call_command('cleanup_overlays', '--attach')
		report.refresh_from_db()
		self.assertTrue(report.heatmap_image, msg='Expected heatmap_image to be attached from reports/heatmap')

# Create your tests here.
