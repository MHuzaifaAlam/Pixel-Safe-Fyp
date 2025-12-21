from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from django.core.files.base import ContentFile
from imageapp.models import Image
from .models import Report
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

		# Call generate endpoint
		res = self.client.post('/api/reports/generate/', {'image_id': str(self.image.ImageID)}, format='json')
		self.assertEqual(res.status_code, 200)
		# Response should be PDF
		self.assertIn('application/pdf', res['Content-Type'])

		# Make sure PDF file was saved on disk (path is under MEDIA_ROOT)
		report.refresh_from_db()
		self.assertTrue(report.pdf)
		expected_path = os.path.join(tempfile.gettempdir(), report.pdf.name)
		self.assertTrue(os.path.exists(expected_path), msg=f"Expected PDF at {expected_path}")

# Create your tests here.
