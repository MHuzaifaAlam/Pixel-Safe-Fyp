from django.shortcuts import render

# Create your views here.
# imageapp/views.py
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from .models import Image
from .serializers import ImageSerializer

class UserImageView(generics.ListCreateAPIView):
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return the images of the logged-in user
        return Image.objects.filter(user=self.request.user)

    def post(self, request, *args, **kwargs):
        files = request.FILES.getlist('images')  # multiple files
        images = []
        for file in files:
            image = Image.objects.create(user=request.user, image=file)
            images.append(image)
        serializer = ImageSerializer(images, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
