from django.db.models import Count
from django.http import Http404
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status  # ✅ Crucial Import
from rest_framework.response import Response
from rest_framework.decorators import action
import time

from .models import Image, Batch
from .serializers import ImageSerializer, BatchSerializer

# ============ BATCH VIEWSET ============
class BatchViewSet(viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Batch.objects.filter(user=self.request.user)
    
    def get_object(self):
        try:
            pk = self.kwargs.get('pk')
            queryset = self.filter_queryset(self.get_queryset())
            obj = queryset.get(BatchID=pk)
            self.check_object_permissions(self.request, obj)
            return obj
        except (Batch.DoesNotExist, ValueError):
            raise Http404
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        batches = self.get_queryset()
        batch_images = Image.objects.filter(user=request.user, batch__isnull=False)
        
        largest_batch = 0
        if batches.exists():
            largest_batch = batches.annotate(
                image_count=Count('images')
            ).order_by('-image_count').first().image_count
        
        return Response({
            'total_batches': batches.count(),
            'total_batch_images': batch_images.count(),
            'largest_batch': largest_batch,
            'recent_batches': BatchSerializer(
                batches.order_by('-created_at')[:5], 
                many=True
            ).data

        
        })
    @action(detail=True, methods=['get'])
    def images(self, request, pk=None):
        batch = self.get_object()
        images = batch.images.all()
        
        # ✅ CRITICAL: Pass context={'request': request} 
        # This tells the serializer to generate FULL URLs (http://...)
        serializer = ImageSerializer(images, many=True, context={'request': request})
        
        return Response({
            'batch_name': batch.name,
            'images': serializer.data
        })
# ============ IMAGE VIEWSET ============
class UserImageView(viewsets.ModelViewSet):
    serializer_class = ImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Image.objects.filter(user=self.request.user)
    
    def get_object(self):
        try:
            pk = self.kwargs.get('pk')
            queryset = self.filter_queryset(self.get_queryset())
            obj = queryset.get(ImageID=pk)
            self.check_object_permissions(self.request, obj)
            return obj
        except (Image.DoesNotExist, ValueError):
            raise Http404

    def create(self, request, *args, **kwargs):
        files = request.FILES.getlist('image')
        batch_name = request.data.get('batch_name', '').strip()
        
        # ✅ Capture action_mode (gan, watermark, heatmap)
        action_mode = request.data.get('action_mode', 'analysis')
        
        if not files:
            return Response({'error': 'No images provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        images_created = []
        batch = None
        is_batch = len(files) > 1
        
        try:
            if is_batch:
                if not batch_name:
                    batch_name = f"Batch {timezone.now().strftime('%b %d, %I:%M %p')}"
                batch = Batch.objects.create(user=request.user, name=batch_name)
            
            for i, file in enumerate(files):
                # ✅ Metadata populated with action_mode for the React Dashboard
                image = Image.objects.create(
                    user=request.user,
                    image=file,
                    fileName=file.name,
                    format=file.name.split('.')[-1].lower() if '.' in file.name else '',
                    ImageSize=file.size,
                    batch=batch if is_batch else None,
                    batch_position=i if is_batch else None,
                    Status='uploaded',
                    metadata={
                        'action_mode': action_mode,
                        'detection_result': 'Pending...'
                    }
                )
                images_created.append(image)
                self.process_image_async(image, action_mode)
            
            if batch:
                batch.status = 'completed'
                batch.save()
            
            serializer = ImageSerializer(images_created, many=True)
            return Response({'count': len(images_created), 'images': serializer.data}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            if batch: batch.delete()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def process_image_async(self, image, action_mode):
        """Simulates processing and saves results to metadata."""
        try:
            image.Status = 'processing'
            image.save()
            
            time.sleep(1)  
            
            # Map action_mode to a friendly result string
            results_map = {
                'gan': 'AI Detection Complete',
                'watermark': 'Watermark Applied',
                'heatmap': 'Heatmap Generated'
            }
            
            image.metadata.update({
                'detection_result': results_map.get(action_mode, 'Analysis Complete'),
                'action_mode': action_mode
            })
            
            image.Status = 'Completed' # Matches the green check in React
            image.save()
        except Exception:
            image.Status = 'failed'
            image.save()