from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Image
from .serializers import ImageSerializer

class UserImageView(viewsets.ModelViewSet):
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]  # only logged-in users

    def get_queryset(self):
        # Return only images uploaded by the logged-in user
        return Image.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        # Save the user automatically when creating
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Handle multiple image uploads
        files = request.FILES.getlist('images')  # 'images' is the form-data key
        images = []
        for file in files:
            image = Image.objects.create(user=request.user, image=file)
            images.append(image)
        serializer = ImageSerializer(images, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
