from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from django.core.files.base import ContentFile
from imageapp.models import Image
from .models import WatermarkRecord


class WatermarkAuthTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username='u1', password='pass')
		self.other = User.objects.create_user(username='u2', password='pass')
		self.client = APIClient()

		# Create an image for user
		img = ContentFile(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00", name='orig.png')
		self.image = Image.objects.create(user=self.user, image=img, fileName='orig.png', format='png', ImageSize=123, Status='uploaded')

	def test_apply_requires_auth(self):
		res = self.client.post('/api/watermark/apply/', {'image_id': str(self.image.ImageID)}, format='json')
		self.assertEqual(res.status_code, 401)

	def test_apply_owned_image(self):
		self.client.force_authenticate(self.user)
		res = self.client.post('/api/watermark/apply/', {'image_id': str(self.image.ImageID)}, format='json')
		# Should process (200 or 200-like JSON), but main check is not 401
		self.assertNotEqual(res.status_code, 401)

	def test_verify_requires_auth(self):
		res = self.client.post('/api/watermark/verify/', {}, format='multipart')
		self.assertEqual(res.status_code, 401)

	def test_auto_verify_requires_auth(self):
		res = self.client.post('/api/watermark/auto-verify/', {}, format='multipart')
		self.assertEqual(res.status_code, 401)

	def test_cannot_access_other_users_watermark(self):
		# Create a watermark record for self.user
		wr = WatermarkRecord.objects.create(original_image=self.image, perceptual_hash='abc', encrypted_hash=b'', aes_key_encrypted=b'', aes_iv_encrypted=b'')
		self.client.force_authenticate(self.other)
		# other user tries to verify by watermark id but should be forbidden
		# need to upload a minimal file to hit the branch
		from io import BytesIO
		b = BytesIO(b"\x89PNG\r\n\x1a\n")
		b.name = 'susp.png'
		res = self.client.post('/api/watermark/verify/', {'image': b, 'watermark_id': str(wr.id)})
		self.assertIn(res.status_code, (403, 404))
